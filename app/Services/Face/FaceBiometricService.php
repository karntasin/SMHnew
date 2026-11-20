<?php

namespace App\Services\Face;

use App\Models\User;
use App\Models\UserFaceBiometric;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class FaceBiometricService
{
    public const DEFAULT_EUCLIDEAN_THRESHOLD = 0.50; // Max distance for match (lower is stricter, face-api default is 0.6)
    public const DEFAULT_COSINE_THRESHOLD = 0.86;    // Min similarity for match (higher is stricter)
    public const CHALLENGE_TTL_SECONDS = 120;

    /**
     * Generate dynamic challenge for anti-replay and liveness verification
     */
    public function generateChallenge(?string $identifier = null, string $mode = 'hybrid'): array
    {
        $token = (string) Str::uuid();
        $randomBytes = random_bytes(32);
        $challengeBase64 = rtrim(strtr(base64_encode($randomBytes), '+/', '-_'), '=');

        $host = request()->getHost();

        $payload = [
            'token' => $token,
            'challenge' => $challengeBase64,
            'identifier' => $identifier ? strtolower(trim($identifier)) : null,
            'mode' => $mode,
            'created_at' => now()->timestamp,
        ];

        Cache::put("face_challenge:{$token}", $payload, now()->addSeconds(self::CHALLENGE_TTL_SECONDS));

        return [
            'token' => $token,
            'challenge' => $challengeBase64,
            'rp' => [
                'name' => 'โรงพยาบาลค่ายสุรสิงหนาท',
                'id' => $host === 'localhost' || $host === '127.0.0.1' ? $host : $host,
            ],
            'expires_in' => self::CHALLENGE_TTL_SECONDS,
        ];
    }

    /**
     * Verify challenge token from cache
     */
    public function verifyChallengeToken(string $token, ?string $identifier = null): bool
    {
        $payload = Cache::get("face_challenge:{$token}");
        if (!$payload) {
            return false;
        }

        if ($identifier && !empty($payload['identifier'])) {
            if (strtolower(trim($identifier)) !== strtolower(trim($payload['identifier']))) {
                return false;
            }
        }

        // Single-use token
        Cache::forget("face_challenge:{$token}");
        return true;
    }

    /**
     * Compute Euclidean Distance between two float vectors (standard for Face-api.js 128-d vectors)
     * Lower distance = more similar. Distance < 0.48 is typically a match.
     */
    public function computeEuclideanDistance(array $vecA, array $vecB): float
    {
        $count = count($vecA);
        if ($count !== count($vecB) || $count === 0) {
            return 999.0;
        }

        $sumSq = 0.0;
        for ($i = 0; $i < $count; $i++) {
            $diff = (float) $vecA[$i] - (float) $vecB[$i];
            $sumSq += $diff * $diff;
        }

        return round(sqrt($sumSq), 4);
    }

    /**
     * Compute Cosine Similarity between two float vectors
     * Range: -1.0 to 1.0 (typically 0.0 to 1.0 for normalized face descriptors)
     */
    public function computeCosineSimilarity(array $vecA, array $vecB): float
    {
        $count = count($vecA);
        if ($count !== count($vecB) || $count === 0) {
            return 0.0;
        }

        $dotProduct = 0.0;
        $normA = 0.0;
        $normB = 0.0;

        for ($i = 0; $i < $count; $i++) {
            $a = (float) $vecA[$i];
            $b = (float) $vecB[$i];
            $dotProduct += $a * $b;
            $normA += $a * $a;
            $normB += $b * $b;
        }

        $denom = sqrt($normA) * sqrt($normB);
        if ($denom < 1e-9) {
            return 0.0;
        }

        return round($dotProduct / $denom, 4);
    }

    /**
     * Enroll AI camera face vector(s) into database.
     * Computes the mean vector (centroid), normalizes it, and calculates baseline consistency.
     *
     * @param list<array<float>> $vectors
     */
    public function enrollCameraVectors(User $user, array $vectors, ?string $imagePath = null): UserFaceBiometric
    {
        if (empty($vectors)) {
            throw new \InvalidArgumentException('ต้องระบุข้อมูลเวกเตอร์ใบหน้าอย่างน้อย 1 ตัวอย่าง');
        }

        $dim = count($vectors[0]);
        $sampleCount = count($vectors);
        $centroid = array_fill(0, $dim, 0.0);

        foreach ($vectors as $vec) {
            if (count($vec) !== $dim) {
                continue;
            }
            for ($i = 0; $i < $dim; $i++) {
                $centroid[$i] += (float) $vec[$i];
            }
        }

        // Average
        for ($i = 0; $i < $dim; $i++) {
            $centroid[$i] /= $sampleCount;
        }

        // L2-normalize centroid
        $norm = 0.0;
        for ($i = 0; $i < $dim; $i++) {
            $norm += $centroid[$i] * $centroid[$i];
        }
        $norm = sqrt($norm);
        if ($norm > 1e-9) {
            for ($i = 0; $i < $dim; $i++) {
                $centroid[$i] = round($centroid[$i] / $norm, 6);
            }
        }

        // Calculate baseline self-similarity (average Euclidean distance of samples to centroid)
        $distances = [];
        foreach ($vectors as $vec) {
            $distances[] = $this->computeEuclideanDistance($centroid, $vec);
        }
        $avgDist = count($distances) > 0 ? round(array_sum($distances) / count($distances), 4) : 0.20;

        $record = UserFaceBiometric::updateOrCreate(
            ['user_id' => $user->id],
            [
                'auth_mode' => 'ai_camera',
                'embedding_vector' => $centroid,
                'sample_count' => $sampleCount,
                'similarity_baseline' => $avgDist,
                'face_image_path' => $imagePath,
                'is_active' => true,
            ]
        );

        return $record;
    }

    /**
     * Enroll Apple Face ID / Android Biometric (WebAuthn Passkey)
     */
    public function enrollPasskey(
        User $user,
        string $credentialId,
        string $publicKeyPem,
        ?string $deviceName = null
    ): UserFaceBiometric {
        $record = UserFaceBiometric::updateOrCreate(
            ['user_id' => $user->id],
            [
                'auth_mode' => 'native_passkey',
                'credential_id' => $credentialId,
                'public_key' => $publicKeyPem,
                'device_name' => $deviceName ?: 'อุปกรณ์ชีวมิติ (Face ID / Android)',
                'is_active' => true,
            ]
        );

        return $record;
    }

    /**
     * Identify a user from camera face vector across all enrolled users (1:N Identification).
     * No username/identifier required.
     */
    public function identifyCameraVector(
        array $loginVector,
        float $maxDistance = self::DEFAULT_EUCLIDEAN_THRESHOLD
    ): array {
        $enrolled = UserFaceBiometric::query()
            ->where('is_active', true)
            ->whereNotNull('embedding_vector')
            ->with(['user' => function ($q) {
                $q->select('id', 'name', 'username', 'email', 'prefix');
            }])
            ->get();

        if ($enrolled->isEmpty()) {
            return [
                'success' => false,
                'error' => 'no_enrolled_users',
                'message' => 'ยังไม่มีเจ้าหน้าที่ลงทะเบียนข้อมูลใบหน้าในระบบ',
            ];
        }

        $bestMatch = null;
        $minDistance = 999.0;
        $bestSimilarity = 0.0;
        $secondMinDistance = 999.0;

        foreach ($enrolled as $biometric) {
            if (!$biometric->user) {
                continue;
            }
            $enrolledVector = $biometric->embedding_vector;
            if (!is_array($enrolledVector) || count($enrolledVector) < 128) {
                continue;
            }

            $dist = $this->computeEuclideanDistance($enrolledVector, $loginVector);
            $sim = $this->computeCosineSimilarity($enrolledVector, $loginVector);

            if ($dist < $minDistance) {
                $secondMinDistance = $minDistance;
                $minDistance = $dist;
                $bestSimilarity = $sim;
                $bestMatch = $biometric;
            } elseif ($dist < $secondMinDistance) {
                $secondMinDistance = $dist;
            }
        }

        if (!$bestMatch || !$bestMatch->user) {
            return [
                'success' => false,
                'error' => 'no_valid_vectors',
                'message' => 'ไม่พบข้อมูลใบหน้าที่สามารถเปรียบเทียบได้ในระบบ',
            ];
        }

        // Adaptive threshold: calibrate against user baseline if available
        $effectiveThreshold = $maxDistance;
        if (!empty($bestMatch->similarity_baseline) && $bestMatch->similarity_baseline > 0) {
            $scaled = round($bestMatch->similarity_baseline * 1.45, 3);
            $effectiveThreshold = min(0.52, max($maxDistance, $scaled));
        }

        $isMatch = $minDistance <= $effectiveThreshold;
        $confidenceMargin = round($secondMinDistance - $minDistance, 4);

        Log::info('Face biometric 1:N identification result', [
            'matched_user_id' => $bestMatch->user->id ?? null,
            'distance' => $minDistance,
            'similarity' => $bestSimilarity,
            'threshold' => $effectiveThreshold,
            'is_match' => $isMatch,
        ]);

        if ($isMatch) {
            $bestMatch->update(['last_authenticated_at' => now()]);

            return [
                'success' => true,
                'is_match' => true,
                'user' => $bestMatch->user,
                'distance' => $minDistance,
                'similarity' => $bestSimilarity,
                'threshold' => $effectiveThreshold,
                'confidence_margin' => $confidenceMargin,
                'message' => 'ยืนยันตัวตนสำเร็จ ตรวจพบใบหน้าตรงกับ ' . (($bestMatch->user->prefix ? $bestMatch->user->prefix . ' ' : '') . $bestMatch->user->name),
            ];
        }

        return [
            'success' => false,
            'is_match' => false,
            'error' => 'no_match_found',
            'message' => 'ไม่พบข้อมูลใบหน้าที่ตรงกับเจ้าหน้าที่ในระบบ (ระยะห่างใกล้เคียงที่สุด: ' . $minDistance . ' เกณฑ์ผ่าน: ≤ ' . $effectiveThreshold . ')',
            'distance' => $minDistance,
            'similarity' => $bestSimilarity,
            'threshold' => $effectiveThreshold,
            'confidence_margin' => $confidenceMargin,
        ];
    }

    /**
     * Verify 1:1 camera face vector against enrolled user profile
     */
    public function verifyCameraVector(
        User $user,
        array $loginVector,
        float $maxDistance = self::DEFAULT_EUCLIDEAN_THRESHOLD
    ): array {
        $faceRecord = $user->faceBiometric;
        if (!$faceRecord || !$faceRecord->is_active || empty($faceRecord->embedding_vector)) {
            return [
                'success' => false,
                'error' => 'user_not_enrolled',
                'message' => 'ผู้ใช้นี้ยังไม่ได้ลงทะเบียนใบหน้าในระบบ',
            ];
        }

        $distance = $this->computeEuclideanDistance($faceRecord->embedding_vector, $loginVector);
        $similarity = $this->computeCosineSimilarity($faceRecord->embedding_vector, $loginVector);

        // Adaptive threshold: calibrate against baseline if available
        $effectiveThreshold = $maxDistance;
        if (!empty($faceRecord->similarity_baseline) && $faceRecord->similarity_baseline > 0) {
            // E.g., allow up to 1.5x of enrollment baseline, capped safely at 0.52
            $scaled = round($faceRecord->similarity_baseline * 1.5, 3);
            $effectiveThreshold = min(0.52, max($maxDistance, $scaled));
        }

        $isMatch = $distance <= $effectiveThreshold;

        Log::info('Face biometric 1:1 verification result', [
            'user_id' => $user->id,
            'distance' => $distance,
            'similarity' => $similarity,
            'threshold' => $effectiveThreshold,
            'is_match' => $isMatch,
        ]);

        if ($isMatch) {
            $faceRecord->update(['last_authenticated_at' => now()]);
        }

        return [
            'success' => true,
            'is_match' => $isMatch,
            'distance' => $distance,
            'similarity' => $similarity,
            'threshold' => $effectiveThreshold,
            'baseline' => $faceRecord->similarity_baseline,
        ];
    }

    /**
     * Verify Apple Face ID / Android Passkey Signature (WebAuthn Assertion)
     */
    public function verifyPasskeyAssertion(
        User $user,
        string $credentialId,
        string $clientDataJSON,
        string $authenticatorData,
        string $signature
    ): array {
        $faceRecord = $user->faceBiometric;
        if (!$faceRecord || !$faceRecord->is_active || empty($faceRecord->public_key)) {
            return [
                'success' => false,
                'error' => 'passkey_not_enrolled',
                'message' => 'ไม่พบข้อมูล Face ID / Passkey ของผู้ใช้นี้ในระบบ',
            ];
        }

        if ($faceRecord->credential_id && $faceRecord->credential_id !== $credentialId) {
            return [
                'success' => false,
                'error' => 'credential_mismatch',
                'message' => 'อุปกรณ์ที่ใช้ไม่ตรงกับข้อมูลที่ลงทะเบียนไว้',
            ];
        }

        $clientDataRaw = base64_decode(strtr($clientDataJSON, '-_', '+/'));
        $authDataRaw = base64_decode(strtr($authenticatorData, '-_', '+/'));
        $sigRaw = base64_decode(strtr($signature, '-_', '+/'));

        // ClientData hash
        $clientDataHash = hash('sha256', $clientDataRaw, true);
        $signedData = $authDataRaw . $clientDataHash;

        $publicKeyPem = $faceRecord->public_key;

        // Verify with OpenSSL
        $verifyResult = openssl_verify($signedData, $sigRaw, $publicKeyPem, OPENSSL_ALGO_SHA256);

        if ($verifyResult === 1) {
            $faceRecord->update(['last_authenticated_at' => now()]);
            return [
                'success' => true,
                'is_match' => true,
                'message' => 'ยืนยันตัวตนด้วยฮาร์ดแวร์ชีวมิติสำเร็จ',
            ];
        }

        Log::warning('Passkey signature verification failed for user ' . $user->id, [
            'verifyResult' => $verifyResult,
            'openssl_error' => openssl_error_string(),
        ]);

        return [
            'success' => false,
            'is_match' => false,
            'error' => 'invalid_signature',
            'message' => 'ลายเซ็นดิจิทัลจากฮาร์ดแวร์ชีวมิติไม่ถูกต้อง',
        ];
    }

    /**
     * Verify Apple Face ID / Android Passkey Signature (WebAuthn Assertion) Usernameless
     * Matches user directly by unique credential_id.
     */
    public function verifyPasskeyAssertionUsernameless(
        string $credentialId,
        string $clientDataJSON,
        string $authenticatorData,
        string $signature
    ): array {
        $faceRecord = UserFaceBiometric::where('credential_id', $credentialId)
            ->where('is_active', true)
            ->with(['user' => function ($q) {
                $q->select('id', 'name', 'username', 'email', 'prefix');
            }])
            ->first();

        if (!$faceRecord || !$faceRecord->user || empty($faceRecord->public_key)) {
            return [
                'success' => false,
                'is_match' => false,
                'error' => 'credential_not_found',
                'message' => 'ไม่พบอุปกรณ์ชีวมิตินี้ในระบบ หรือยังไม่ได้ลงทะเบียนไว้กับบัญชีผู้ใช้',
            ];
        }

        $result = $this->verifyPasskeyAssertion(
            $faceRecord->user,
            $credentialId,
            $clientDataJSON,
            $authenticatorData,
            $signature
        );

        return array_merge($result, ['user' => $faceRecord->user]);
    }

    /**
     * Delete/deactivate face biometric for user
     */
    public function deleteBiometric(User $user): bool
    {
        $faceRecord = $user->faceBiometric;
        if ($faceRecord) {
            return (bool) $faceRecord->delete();
        }
        return true;
    }
}
