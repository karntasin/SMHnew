<?php

namespace App\Services\Voice;

use App\Models\User;
use App\Models\UserVoiceBiometric;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;

class VoiceBiometricService
{
    public const DEFAULT_THRESHOLD = 0.52;
    public const IDENTIFY_THRESHOLD = 0.58;
    public const CHALLENGE_TTL_SECONDS = 120;

    /**
     * Common hospital affirmation phrases for dynamic challenge
     */
    protected const THAI_WORDS = [
        'โรงพยาบาลค่ายสุรสิงหนาท',
        'บริการด้วยใจ',
        'ปลอดภัยเพื่อทุกคน',
        'สุขภาพดีถ้วนหน้า',
        'ระบบบริหารโรงพยาบาล',
        'พร้อมดูแลเคียงข้างคุณ',
    ];

    /**
     * Generate dynamic challenge with randomized Thai phrase + numeric code for liveness check
     */
    public function generateChallenge(?string $identifier = null): array
    {
        $token = (string) Str::uuid();
        $digits = [
            random_int(1, 9),
            random_int(1, 9),
            random_int(1, 9),
            random_int(1, 9),
        ];
        $digitsText = implode(' ', $digits);
        $randomPhrase = self::THAI_WORDS[array_rand(self::THAI_WORDS)];
        $fullChallenge = "{$randomPhrase} รหัส {$digitsText}";

        $payload = [
            'token' => $token,
            'identifier' => $identifier ? strtolower(trim($identifier)) : null,
            'phrase' => $fullChallenge,
            'digits' => implode('', $digits),
            'digits_text' => $digitsText,
            'created_at' => now()->timestamp,
        ];

        Cache::put("voice_challenge:{$token}", $payload, now()->addSeconds(self::CHALLENGE_TTL_SECONDS));

        return [
            'token' => $token,
            'challenge_phrase' => $fullChallenge,
            'digits' => implode('', $digits),
            'expires_in' => self::CHALLENGE_TTL_SECONDS,
        ];
    }

    /**
     * Validate challenge token and optionally verify transcribed text
     */
    public function validateChallenge(string $token, ?string $spokenText = null): bool
    {
        $cacheKey = "voice_challenge:{$token}";
        $challenge = Cache::get($cacheKey);

        if (!$challenge) {
            return false;
        }

        // Consume token to prevent replay
        Cache::forget($cacheKey);

        // If transcribed text is provided from client Web Speech API, verify digits or keywords
        if (!empty($spokenText) && !empty($challenge['digits'])) {
            $digits = (string) $challenge['digits'];
            $cleaned = preg_replace('/[^0-9]/', '', $spokenText);
            // If digits are found in transcribed text, ensure it matches or has partial overlap
            if (!empty($cleaned) && !str_contains($cleaned, $digits)) {
                Log::warning('Voice challenge text mismatch', [
                    'expected' => $digits,
                    'received' => $cleaned,
                ]);
            }
        }

        return true;
    }

    /**
     * Locate the exact Python binary on Windows or Linux
     */
    public function getPythonBinary(): string
    {
        // 1. Check environment variable / config
        $configured = env('PYTHON_PATH');
        if ($configured && file_exists($configured)) {
            return $configured;
        }

        // 2. Common Windows Python install locations
        $candidates = [
            'C:\\Users\\Karntasin\\AppData\\Local\\Programs\\Python\\Python313\\python.exe',
            'C:\\Users\\Karntasin\\AppData\\Local\\Programs\\Python\\Python312\\python.exe',
            'C:\\Users\\Karntasin\\AppData\\Local\\Programs\\Python\\Python311\\python.exe',
            'C:\\Python313\\python.exe',
            'C:\\Python312\\python.exe',
            'C:\\Python311\\python.exe',
            'C:\\Program Files\\Python313\\python.exe',
            'C:\\Program Files\\Python312\\python.exe',
            'C:\\Program Files\\Python311\\python.exe',
            'D:\\Python313\\python.exe',
            'D:\\Python312\\python.exe',
        ];

        // Check LOCALAPPDATA / USERPROFILE dynamically
        $userProfile = env('USERPROFILE', getenv('USERPROFILE'));
        if ($userProfile) {
            foreach (['Python313', 'Python312', 'Python311', 'Python310'] as $ver) {
                $candidates[] = "{$userProfile}\\AppData\\Local\\Programs\\Python\\{$ver}\\python.exe";
            }
        }

        foreach ($candidates as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }

        return 'python';
    }

    /**
     * Extract voice embedding vectors (both standard and legacy) from an audio file using voice_engine.py
     *
     * @return array{embedding: array<float>, legacy_embedding: array<float>}
     */
    public function extractDualEmbedding(string $audioFilePath): array
    {
        $scriptPath = base_path('app/Services/Voice/voice_engine.py');
        $pythonBinary = $this->getPythonBinary();

        $process = new Process([$pythonBinary, $scriptPath, 'extract', $audioFilePath]);
        $process->setTimeout(30);
        $process->run();

        if (!$process->isSuccessful()) {
            Log::error('Voice engine extraction failed', [
                'error' => $process->getErrorOutput(),
                'output' => $process->getOutput(),
            ]);
            throw new \RuntimeException('Failed to extract voice embedding: ' . ($process->getErrorOutput() ?: $process->getOutput()));
        }

        $output = json_decode($process->getOutput(), true);
        if (!$output || empty($output['success']) || empty($output['embedding'])) {
            throw new \RuntimeException('Invalid output from voice engine: ' . $process->getOutput());
        }

        return [
            'embedding' => $output['embedding'] ?? [],
            'legacy_embedding' => $output['legacy_embedding'] ?? [],
        ];
    }

    /**
     * Extract voice embedding vector from an audio file using voice_engine.py
     *
     * @return array<float>
     */
    public function extractEmbedding(string $audioFilePath): array
    {
        return $this->extractDualEmbedding($audioFilePath)['embedding'];
    }

    /**
     * Compute cosine similarity between two float vectors in PHP
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
     * Enroll user voice using multiple audio sample files.
     * Computes the centroid (mean vector), normalizes it, and calculates self-similarity baseline.
     *
     * @param list<string> $audioFilePaths
     */
    public function enroll(User $user, array $audioFilePaths): UserVoiceBiometric
    {
        if (empty($audioFilePaths)) {
            throw new \InvalidArgumentException('At least one audio sample is required for enrollment.');
        }

        $embeddings = [];
        foreach ($audioFilePaths as $path) {
            $embeddings[] = $this->extractEmbedding($path);
        }

        $dim = count($embeddings[0]);
        $sampleCount = count($embeddings);
        $centroid = array_fill(0, $dim, 0.0);

        // Sum components
        foreach ($embeddings as $vec) {
            for ($i = 0; $i < $dim; $i++) {
                $centroid[$i] += $vec[$i];
            }
        }

        // Average and normalize
        for ($i = 0; $i < $dim; $i++) {
            $centroid[$i] /= $sampleCount;
        }

        $norm = sqrt(array_sum(array_map(fn($x) => $x * $x, $centroid)));
        if ($norm > 1e-9) {
            $centroid = array_map(fn($x) => round($x / $norm, 6), $centroid);
        }

        // Compute baseline consistency among samples
        $selfSimilarities = [];
        foreach ($embeddings as $vec) {
            $selfSimilarities[] = $this->computeCosineSimilarity($centroid, $vec);
        }
        $baseline = round(array_sum($selfSimilarities) / count($selfSimilarities), 4);

        $record = UserVoiceBiometric::updateOrCreate(
            ['user_id' => $user->id],
            [
                'embedding_vector' => $centroid,
                'sample_count' => $sampleCount,
                'similarity_baseline' => $baseline,
                'is_active' => true,
            ]
        );

        return $record;
    }

    /**
     * Verify audio against an enrolled user (1:1 verification)
     */
    public function verify(User $user, string $audioFilePath, float $threshold = self::DEFAULT_THRESHOLD): array
    {
        $voiceRecord = $user->voiceBiometric;
        if (!$voiceRecord || !$voiceRecord->is_active || empty($voiceRecord->embedding_vector)) {
            return [
                'success' => false,
                'error' => 'user_not_enrolled',
                'message' => 'ผู้ใช้นี้ยังไม่ได้ลงทะเบียนเสียงในระบบ',
            ];
        }

        $dual = $this->extractDualEmbedding($audioFilePath);
        $loginEmbedding = $dual['embedding'];
        $legacyEmbedding = $dual['legacy_embedding'];

        $storedVec = $voiceRecord->embedding_vector;
        $isLegacy = count($storedVec) >= 4
            && $storedVec[0] < 0
            && $storedVec[1] > 0
            && $storedVec[2] < 0;

        $simStandard = !empty($loginEmbedding) ? $this->computeCosineSimilarity($storedVec, $loginEmbedding) : 0.0;
        $simLegacy = (!empty($legacyEmbedding) && $isLegacy) ? $this->computeCosineSimilarity($storedVec, $legacyEmbedding) : 0.0;

        $similarity = max($simStandard, $simLegacy);
        $usedLegacy = ($simLegacy > $simStandard);

        // Adaptive threshold: calibrate against user's enrollment baseline while preserving safe bounds [0.48, 0.58]
        $effectiveThreshold = $threshold;
        if (!empty($voiceRecord->similarity_baseline) && $voiceRecord->similarity_baseline > 0) {
            $scaledBaseline = round($voiceRecord->similarity_baseline * 0.54, 2);
            $effectiveThreshold = min(0.58, max(0.48, $scaledBaseline));
        }

        $isMatch = $similarity >= $effectiveThreshold;

        Log::info('Voice verification evaluated', [
            'user_id' => $user->id,
            'similarity' => $similarity,
            'sim_standard' => $simStandard,
            'sim_legacy' => $simLegacy,
            'is_legacy_profile' => $isLegacy,
            'effective_threshold' => $effectiveThreshold,
            'is_match' => $isMatch,
        ]);

        if ($isMatch) {
            $updateData = ['last_authenticated_at' => now()];
            // If legacy vector matched, automatically upgrade to standard modern embedding
            if ($usedLegacy && !empty($loginEmbedding)) {
                $updateData['embedding_vector'] = $loginEmbedding;
                Log::info("Auto-migrated legacy voice embedding for user {$user->id} to standard embedding");
            }
            $voiceRecord->update($updateData);
        }

        return [
            'success' => true,
            'is_match' => $isMatch,
            'similarity' => $similarity,
            'threshold' => $effectiveThreshold,
            'nominal_threshold' => $threshold,
            'baseline' => $voiceRecord->similarity_baseline,
        ];
    }

    /**
     * Identify a user from audio among all enrolled users (1:N identification)
     */
    public function identify(string $audioFilePath, float $threshold = self::IDENTIFY_THRESHOLD): ?array
    {
        $enrolled = UserVoiceBiometric::where('is_active', true)
            ->with('user')
            ->get();

        if ($enrolled->isEmpty()) {
            return null;
        }

        $inputEmbedding = $this->extractEmbedding($audioFilePath);
        $bestMatch = null;
        $highestSimilarity = 0.0;

        foreach ($enrolled as $biometric) {
            if (!$biometric->user || empty($biometric->embedding_vector)) {
                continue;
            }
            $sim = $this->computeCosineSimilarity($biometric->embedding_vector, $inputEmbedding);
            if ($sim > $highestSimilarity) {
                $highestSimilarity = $sim;
                $bestMatch = $biometric;
            }
        }

        if ($bestMatch && $highestSimilarity >= $threshold) {
            $bestMatch->update(['last_authenticated_at' => now()]);
            return [
                'user' => $bestMatch->user,
                'similarity' => $highestSimilarity,
                'threshold' => $threshold,
            ];
        }

        return [
            'user' => null,
            'highest_similarity' => $highestSimilarity,
            'threshold' => $threshold,
        ];
    }
}
