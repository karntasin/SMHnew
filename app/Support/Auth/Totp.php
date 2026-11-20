<?php

namespace App\Support\Auth;

/**
 * RFC 6238 Time-Based One-Time Password (TOTP)
 * คำนวณรหัส OTP 6 หลักจาก Base32 Secret Key รองรับการเข้าสู่ระบบ e-Claim สปสช. อัตโนมัติ
 */
class Totp
{
    private const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * คำนวณรหัส TOTP 6 หลัก ณ เวลาปัจจุบัน (หรือตาม timestamp ที่ระบุ)
     */
    public static function generate(?string $secret, ?int $timestamp = null, int $digits = 6, int $period = 30): string
    {
        if (empty($secret)) {
            return '';
        }

        $secretBinary = self::base32Decode($secret);
        if ($secretBinary === '') {
            return '';
        }

        $timestamp = $timestamp ?? time();
        $counter = (int) floor($timestamp / $period);

        // Pack 64-bit integer into big-endian binary
        $binCounter = pack('N*', 0, $counter);
        $hash = hash_hmac('sha1', $binCounter, $secretBinary, true);

        $offset = ord(substr($hash, -1)) & 0x0F;
        $hashPart = substr($hash, $offset, 4);
        $value = unpack('N', $hashPart)[1] & 0x7FFFFFFF;

        $modulo = 10 ** $digits;

        return str_pad((string) ($value % $modulo), $digits, '0', STR_PAD_LEFT);
    }

    /**
     * คืนค่าจำนวนวินาทีที่เหลือก่อนรหัสชุดปัจจุบันจะหมดอายุ (0-30 วินาที)
     */
    public static function timeRemaining(?int $timestamp = null, int $period = 30): int
    {
        $timestamp = $timestamp ?? time();

        return (int) ($period - ($timestamp % $period));
    }

    /**
     * ถอดรหัสสตริง Base32 เป็น Binary
     */
    public static function base32Decode(string $b32): string
    {
        $b32 = strtoupper(trim(str_replace([' ', '-', '='], '', $b32)));
        if ($b32 === '') {
            return '';
        }

        $buffer = 0;
        $bitsLeft = 0;
        $binary = '';

        for ($i = 0, $len = strlen($b32); $i < $len; $i++) {
            $char = $b32[$i];
            $val = strpos(self::BASE32_CHARS, $char);
            if ($val === false) {
                continue;
            }
            $buffer = ($buffer << 5) | $val;
            $bitsLeft += 5;
            if ($bitsLeft >= 8) {
                $bitsLeft -= 8;
                $binary .= chr(($buffer >> $bitsLeft) & 0xFF);
            }
        }

        return $binary;
    }

    /**
     * ตรวจสอบความถูกต้องของรหัส OTP (ตรวจสอบช่วงเวลาปัจจุบัน, ย้อนหลัง 1 สเต็ป, ล่วงหน้า 1 สเต็ป เพื่อชดเชย Clock Drift)
     */
    public static function verify(string $otp, ?string $secret, int $driftWindow = 1, int $period = 30): bool
    {
        $otp = trim($otp);
        if ($otp === '' || empty($secret)) {
            return false;
        }

        $now = time();
        for ($i = -$driftWindow; $i <= $driftWindow; $i++) {
            $testTime = $now + ($i * $period);
            if (hash_equals(self::generate($secret, $testTime), $otp)) {
                return true;
            }
        }

        return false;
    }
}
