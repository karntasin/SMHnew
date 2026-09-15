<?php

namespace App\Services\Risk;

/**
 * Thai CV Risk Score calculator for 10-year ASCVD risk in Thai adults.
 *
 * Formula source: official Ramathibodi Thai CV Risk Score 2.5 calculator
 * (EGAT pooled 20-year cohort). The official calculator uses total
 * cholesterol when available, otherwise waist-to-height ratio or waist.
 */
class ThaiAscvdCalculator
{
    private const SURVIVAL_ROOT = 0.964588;

    public function calculate(array $data): ?array
    {
        $sex = $data['sex'] ?? null;
        $age = isset($data['age']) ? (int) $data['age'] : null;
        $sbp = $this->numeric($data['sbp'] ?? null);
        $tc = $this->numeric($data['tc'] ?? null);
        $waist = $this->numeric($data['waist'] ?? null);
        $height = $this->numeric($data['height'] ?? null);
        $whRatio = $this->numeric($data['wh_ratio'] ?? null);
        $dm = (bool) ($data['dm'] ?? false);
        $smoker = (bool) ($data['smoker'] ?? false);

        if (! in_array($sex, ['male', 'female'], true) || $age === null || $sbp === null) {
            return null;
        }

        // The official public guidance says the estimator applies to Thai people age 35-70.
        if ($age < 35 || $age > 70) {
            return null;
        }

        if ($sbp < 70 || $sbp > 260) {
            return null;
        }

        $sexCode = $sex === 'male' ? 1 : 0;
        $smokeCode = $smoker ? 1 : 0;
        $dmCode = $dm ? 1 : 0;
        $sbpUsed = min(220, max(70, $sbp));
        $tcUsed = $tc !== null && $tc > 0 ? min(400, max(80, $tc)) : null;
        $waistUsed = $waist !== null && $waist > 0 ? min(200, $waist) : null;
        $heightUsed = $height !== null && $height > 0 ? min(230, $height) : null;

        if (($whRatio === null || $whRatio <= 0) && $waistUsed !== null && $heightUsed !== null) {
            $whRatio = $waistUsed / $heightUsed;
        }

        $method = null;
        $score = null;
        $risk = null;
        $compareScore = null;
        $compareRisk = null;

        [$compareSbp, $compareWhr, $compareWaist] = $this->comparisonInputs($sexCode, $age);

        if ($tcUsed !== null) {
            $method = 'lipid';
            $score = (0.08183 * $age)
                + (0.39499 * $sexCode)
                + (0.02084 * $sbpUsed)
                + (0.69974 * $dmCode)
                + (0.00212 * $tcUsed)
                + (0.41916 * $smokeCode);
            $risk = $this->riskFromScore($score, 7.04423);

            $compareScore = (0.08183 * $age)
                + (0.39499 * $sexCode)
                + (0.02084 * $compareSbp)
                + (0.00212 * 200);
            $compareRisk = $this->riskFromScore($compareScore, 7.04423);
        } elseif ($whRatio !== null && $whRatio > 0) {
            $method = 'waist_height';
            $whrUsed = min(1.2, max(0.3, $whRatio));
            $score = (0.079 * $age)
                + (0.128 * $sexCode)
                + (0.019350987 * $sbpUsed)
                + (0.58454 * $dmCode)
                + (3.512566 * $whrUsed)
                + (0.459 * $smokeCode);
            $risk = $this->riskFromScore($score, 7.712325);

            $compareScore = (0.079 * $age)
                + (0.128 * $sexCode)
                + (0.019350987 * $compareSbp)
                + (3.512566 * $compareWhr);
            $compareRisk = $this->riskFromScore($compareScore, 7.712325);
        } elseif ($waistUsed !== null) {
            $method = 'waist';
            $score = (0.08372 * $age)
                + (0.05988 * $sexCode)
                + (0.02034 * $sbpUsed)
                + (0.59953 * $dmCode)
                + (0.01283 * $waistUsed)
                + (0.459 * $smokeCode);
            $risk = $this->riskFromScore($score, 7.31047);

            $compareScore = (0.08372 * $age)
                + (0.05988 * $sexCode)
                + (0.02034 * $compareSbp)
                + (0.01283 * $compareWaist);
            $compareRisk = $this->riskFromScore($compareScore, 7.31047);
        }

        if ($risk === null) {
            return null;
        }

        return [
            'risk' => round($risk * 100, 2),
            'risk_ratio' => $compareRisk > 0 ? round($risk / $compareRisk, 2) : null,
            'compare_risk' => round($compareRisk * 100, 2),
            'score' => round($score, 5),
            'compare_score' => round($compareScore, 5),
            'method' => $method,
            'method_label' => $this->methodLabel($method),
            'category' => $this->category($risk * 100),
            'tc_used' => $tcUsed,
            'tc_estimated' => false,
            'hdl_used' => null,
            'hdl_estimated' => false,
            'waist_used' => $waistUsed,
            'height_used' => $heightUsed,
            'wh_ratio_used' => $whRatio !== null ? round($whRatio, 4) : null,
            'sbp_used' => $sbpUsed,
        ];
    }

    private function numeric(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    /** @return array{0: int, 1: float, 2: int} */
    private function comparisonInputs(int $sexCode, int $age): array
    {
        $compareSbp = 120;
        $compareWhr = 0.52667;
        $compareWaist = 79;

        if ($sexCode === 1) {
            $compareWhr = 0.58125;
            $compareWaist = 93;
            if ($age > 60) {
                $compareSbp = 132;
            }
        } else {
            if ($age <= 60) {
                $compareSbp = 115;
            } else {
                $compareSbp = 130;
            }
        }

        return [$compareSbp, $compareWhr, $compareWaist];
    }

    private function riskFromScore(float $score, float $constant): float
    {
        $risk = 1 - pow(self::SURVIVAL_ROOT, exp($score - $constant));

        return max(0, min(1, $risk));
    }

    private function methodLabel(string $method): string
    {
        return match ($method) {
            'lipid' => 'ใช้ผลเลือด Total Cholesterol',
            'waist_height' => 'ไม่มีผลเลือด ใช้รอบเอว/ส่วนสูง',
            'waist' => 'ไม่มีผลเลือด ใช้รอบเอว',
            default => 'ไม่ระบุวิธีคำนวณ',
        };
    }

    private function category(float $riskPercent): array
    {
        if ($riskPercent < 10) {
            return ['key' => 'low', 'label' => 'เสี่ยงต่ำ', 'color' => 'green'];
        }

        if ($riskPercent < 20) {
            return ['key' => 'moderate', 'label' => 'เสี่ยงปานกลาง', 'color' => 'yellow'];
        }

        if ($riskPercent <= 30) {
            return ['key' => 'high', 'label' => 'เสี่ยงสูง', 'color' => 'orange'];
        }

        return ['key' => 'very_high', 'label' => 'เสี่ยงสูงมาก', 'color' => 'red'];
    }
}
