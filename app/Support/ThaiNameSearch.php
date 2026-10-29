<?php

namespace App\Support;

/**
 * Thai name search variants for speech ASR errors (e.g. กานต์ → การ).
 * Keep in sync with resources/js/pages/AdminDocs/Memos/thaiSpeechName.ts
 */
class ThaiNameSearch
{
    /**
     * @return list<string>
     */
    public static function variants(string $input): array
    {
        $base = self::normalize($input);
        if ($base === '') {
            return [];
        }

        $set = [];
        $set[$base] = true;
        $set[self::correctSpeech($base)] = true;

        $prefixMap = [
            'การ' => ['กาน', 'กานต์', 'การ'],
            'กานต์' => ['กานต์', 'กาน', 'การ'],
            'กาน' => ['กาน', 'กานต์', 'การ'],
        ];

        foreach ($prefixMap as $prefix => $replacements) {
            if (! str_starts_with($base, $prefix)) {
                continue;
            }
            // Prefer longer prefixes first (กานต์ before กาน) — already ordered in map iteration for PHP 8+
            if ($prefix === 'กาน' && str_starts_with($base, 'กานต์')) {
                continue;
            }
            $rest = mb_substr($base, mb_strlen($prefix));
            foreach ($replacements as $alt) {
                $set[$alt.$rest] = true;
            }
        }

        foreach (array_keys($set) as $item) {
            $stripped = str_replace('์', '', $item);
            if ($stripped !== '') {
                $set[$stripped] = true;
            }
        }

        return array_values(array_filter(array_keys($set), fn (string $item) => $item !== ''));
    }

    public static function normalize(string $input): string
    {
        $text = trim(preg_replace('/\s+/u', ' ', $input) ?? $input);
        $text = preg_replace('/(ค่ะ|ครับ|คะ|นะ|นะคะ|นะครับ)+$/u', '', $text) ?? $text;

        return trim($text);
    }

    public static function correctSpeech(string $spoken): string
    {
        $text = self::normalize($spoken);
        if ($text === '') {
            return '';
        }

        if (str_starts_with($text, 'การ') && ! str_starts_with($text, 'กาน')) {
            return 'กานต์'.mb_substr($text, mb_strlen('การ'));
        }

        if (str_starts_with($text, 'กาน') && ! str_starts_with($text, 'กานต์')) {
            $rest = mb_substr($text, mb_strlen('กาน'));
            if ($rest !== '' && ! str_starts_with($rest, 'ต์')) {
                return 'กานต์'.$rest;
            }
        }

        return $text;
    }
}
