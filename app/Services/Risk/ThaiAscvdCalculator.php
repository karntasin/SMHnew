<?php

namespace App\Services\Risk;

/**
 * Thai ASCVD Risk Calculator
 * Based on modified Framingham Risk Score for Thai population
 * 
 * References:
 * - Thai CVD Risk Score
 * - Framingham Heart Study adapted for Asian populations
 * 
 * Risk factors considered:
 * - Age (35-70 years)
 * - Sex (male/female)
 * - Systolic Blood Pressure (SBP)
 * - Total Cholesterol (TC)
 * - HDL Cholesterol
 * - Diabetes Mellitus (DM)
 * - Current Smoking
 * - Hypertension Treatment
 */
class ThaiAscvdCalculator
{
    // Age coefficients (log scale)
    private const AGE_MALE = 3.06117;
    private const AGE_FEMALE = 2.32888;
    
    // Total Cholesterol coefficients
    private const TC_MALE = 1.12370;
    private const TC_FEMALE = 1.20904;
    
    // HDL Cholesterol coefficients (inverse relationship)
    private const HDL_MALE = -0.93263;
    private const HDL_FEMALE = -0.70833;
    
    // Systolic BP coefficients (treated)
    private const SBP_TREATED_MALE = 1.93303;
    private const SBP_TREATED_FEMALE = 2.76157;
    
    // Systolic BP coefficients (untreated)
    private const SBP_UNTREATED_MALE = 1.99881;
    private const SBP_UNTREATED_FEMALE = 2.82263;
    
    // Smoking coefficients
    private const SMOKING_MALE = 0.65451;
    private const SMOKING_FEMALE = 0.52873;
    
    // Diabetes coefficients
    private const DM_MALE = 0.57367;
    private const DM_FEMALE = 0.69154;
    
    // Baseline survival (10-year)
    private const BASELINE_SURVIVAL_MALE = 0.88936;
    private const BASELINE_SURVIVAL_FEMALE = 0.94833;
    
    // Mean values for centering
    private const MEAN_MALE = 23.9802;
    private const MEAN_FEMALE = 26.1931;

    /**
     * Calculate 10-year cardiovascular disease risk using Thai ASCVD formula
     * 
     * @param array $data Patient data with keys: sex, age, sbp, tc, hdl, dm, smoker, on_treatment
     * @return array|null Returns ['risk' => float, 'tc_used' => float, 'tc_estimated' => bool, 'hdl_used' => float, 'hdl_estimated' => bool] or null if invalid
     */
    public function calculate(array $data): ?array
    {
        // Extract and validate input parameters
        $sex = $data['sex'] ?? null;
        $age = $data['age'] ?? null;
        $sbp = $data['sbp'] ?? null;
        $tc = $data['tc'] ?? null;
        $hdl = $data['hdl'] ?? null;
        $dm = $data['dm'] ?? false;
        $smoker = $data['smoker'] ?? false;
        $onTreatment = $data['on_treatment'] ?? false;

        // Validation: Required fields
        if (!$sex || !$age || !$sbp) {
            return null;
        }

        // Validation: Age must be between 35-70 for Thai ASCVD
        if ($age < 35 || $age > 70) {
            return null;
        }

        // Validation: Sex must be male or female
        if (!in_array($sex, ['male', 'female'])) {
            return null;
        }

        // Validation: SBP reasonable range (90-250 mmHg)
        if ($sbp < 90 || $sbp > 250) {
            return null;
        }

        // Track if values are estimated
        $tcEstimated = false;
        $hdlEstimated = false;
        $tcUsed = $tc;
        $hdlUsed = $hdl;

        // Optional: TC and HDL for more accurate calculation
        // If not available, use population averages
        if (!$tc || $tc < 100 || $tc > 400) {
            // Average TC for Thai population: 200 mg/dL
            $tcUsed = 200;
            $tcEstimated = true;
        }

        if (!$hdl || $hdl < 20 || $hdl > 100) {
            // Average HDL: 50 for male, 60 for female
            $hdlUsed = ($sex === 'male') ? 50 : 60;
            $hdlEstimated = true;
        }

        // Calculate risk score using Framingham-based formula
        $risk = $this->calculateFraminghamBasedRisk(
            $sex,
            $age,
            $sbp,
            $tcUsed,
            $hdlUsed,
            $dm,
            $smoker,
            $onTreatment
        );

        return [
            'risk' => $risk,
            'tc_used' => $tcUsed,
            'tc_estimated' => $tcEstimated,
            'hdl_used' => $hdlUsed,
            'hdl_estimated' => $hdlEstimated,
        ];
    }

    private function calculateFraminghamBasedRisk(
        string $sex,
        int $age,
        float $sbp,
        float $tc,
        float $hdl,
        bool $dm,
        bool $smoker,
        bool $onTreatment
    ): float {
        $isMale = ($sex === 'male');

        // Natural logarithms of continuous variables
        $lnAge = log($age);
        $lnTC = log($tc);
        $lnHDL = log($hdl);
        $lnSBP = log($sbp);

        // Select sex-specific coefficients
        $coefAge = $isMale ? self::AGE_MALE : self::AGE_FEMALE;
        $coefTC = $isMale ? self::TC_MALE : self::TC_FEMALE;
        $coefHDL = $isMale ? self::HDL_MALE : self::HDL_FEMALE;
        $coefSBP = $onTreatment 
            ? ($isMale ? self::SBP_TREATED_MALE : self::SBP_TREATED_FEMALE)
            : ($isMale ? self::SBP_UNTREATED_MALE : self::SBP_UNTREATED_FEMALE);
        $coefSmoking = $isMale ? self::SMOKING_MALE : self::SMOKING_FEMALE;
        $coefDM = $isMale ? self::DM_MALE : self::DM_FEMALE;
        
        $baselineSurvival = $isMale ? self::BASELINE_SURVIVAL_MALE : self::BASELINE_SURVIVAL_FEMALE;
        $mean = $isMale ? self::MEAN_MALE : self::MEAN_FEMALE;

        // Calculate individual risk sum
        $riskSum = 0;
        $riskSum += $coefAge * $lnAge;
        $riskSum += $coefTC * $lnTC;
        $riskSum += $coefHDL * $lnHDL;
        $riskSum += $coefSBP * $lnSBP;
        
        if ($smoker) {
            $riskSum += $coefSmoking;
        }
        
        if ($dm) {
            $riskSum += $coefDM;
        }

        // Calculate 10-year CVD risk
        $risk = 1 - pow($baselineSurvival, exp($riskSum - $mean));
        
        // Convert to percentage and round
        $riskPercent = $risk * 100;
        
        // Cap between 0-100%
        $riskPercent = max(0, min(100, $riskPercent));

        return round($riskPercent, 1);
    }
}
