<?php

namespace App\Support\Auth;

use InvalidArgumentException;

/**
 * ถอดรหัส Google Authenticator Migration URI (otpauth-migration://offline?data=...)
 * สกัด Protobuf Payload ออกมาเป็น Base32 Secret Key และข้อมูลบัญชี
 */
class GoogleAuthMigration
{
    private const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * ถอดรหัส URL Migration ให้เป็นรายการบัญชี OTP ทั้งหมด
     *
     * @return array<int, array{name: string, issuer: string, secret_base32: string, secret_raw: string, type: string, digits: int}>
     */
    public static function parse(string $migrationUrl): array
    {
        $parts = parse_url(trim($migrationUrl));
        if (($parts['scheme'] ?? '') !== 'otpauth-migration' || empty($parts['query'])) {
            throw new InvalidArgumentException('URL ต้องขึ้นต้นด้วย otpauth-migration://');
        }

        parse_str($parts['query'], $query);
        if (empty($query['data'])) {
            throw new InvalidArgumentException('ไม่พบพารามิเตอร์ data ใน URL ถ่ายโอนบัญชี');
        }

        $raw = base64_decode(urldecode($query['data']));
        if ($raw === false) {
            throw new InvalidArgumentException('ข้อมูล Payload Base64 ไม่ถูกต้อง');
        }

        return self::parseProtobufPayload($raw);
    }

    /**
     * ถอดรหัส Protobuf Wire Format ของ MigrationPayload
     *
     * @return array<int, array{name: string, issuer: string, secret_base32: string, secret_raw: string, type: string, digits: int}>
     */
    public static function parseProtobufPayload(string $raw): array
    {
        $accounts = [];
        $offset = 0;
        $len = strlen($raw);

        while ($offset < $len) {
            $tag = ord($raw[$offset++]);
            $fieldNumber = $tag >> 3;
            $wireType = $tag & 0x07;

            if ($wireType === 2) {
                $length = self::readVarint($raw, $offset);
                $data = substr($raw, $offset, $length);
                $offset += $length;

                if ($fieldNumber === 1) { // 1 = repeated OtpParameters
                    $accounts[] = self::parseOtpParameter($data);
                }
            } elseif ($wireType === 0) {
                self::readVarint($raw, $offset);
            } elseif ($wireType === 1) {
                $offset += 8;
            } elseif ($wireType === 5) {
                $offset += 4;
            }
        }

        return $accounts;
    }

    /**
     * @return array{name: string, issuer: string, secret_base32: string, secret_raw: string, type: string, digits: int}
     */
    private static function parseOtpParameter(string $raw): array
    {
        $offset = 0;
        $len = strlen($raw);
        $param = [
            'name' => '',
            'issuer' => '',
            'secret_base32' => '',
            'secret_raw' => '',
            'type' => 'totp',
            'digits' => 6,
        ];

        while ($offset < $len) {
            $tag = ord($raw[$offset++]);
            $fieldNumber = $tag >> 3;
            $wireType = $tag & 0x07;

            if ($wireType === 2) {
                $length = self::readVarint($raw, $offset);
                $data = substr($raw, $offset, $length);
                $offset += $length;

                if ($fieldNumber === 1) { // secret
                    $param['secret_raw'] = $data;
                    $param['secret_base32'] = self::base32Encode($data);
                } elseif ($fieldNumber === 2) { // name
                    $param['name'] = $data;
                } elseif ($fieldNumber === 3) { // issuer
                    $param['issuer'] = $data;
                }
            } elseif ($wireType === 0) {
                $val = self::readVarint($raw, $offset);
                if ($fieldNumber === 5) { // digits (1 = 6 digits, 2 = 8 digits)
                    $param['digits'] = $val === 2 ? 8 : 6;
                } elseif ($fieldNumber === 6) { // type (1 = hotp, 2 = totp)
                    $param['type'] = $val === 1 ? 'hotp' : 'totp';
                }
            } elseif ($wireType === 1) {
                $offset += 8;
            } elseif ($wireType === 5) {
                $offset += 4;
            }
        }

        return $param;
    }

    private static function readVarint(string $raw, int &$offset): int
    {
        $result = 0;
        $shift = 0;
        $len = strlen($raw);

        while ($offset < $len) {
            $byte = ord($raw[$offset++]);
            $result |= ($byte & 0x7F) << $shift;
            if (! ($byte & 0x80)) {
                break;
            }
            $shift += 7;
        }

        return $result;
    }

    /**
     * แปลง Raw Binary ให้เป็น Base32 String (RFC 4648)
     */
    public static function base32Encode(string $binary): string
    {
        $len = strlen($binary);
        if ($len === 0) {
            return '';
        }

        $binaryStr = '';
        for ($i = 0; $i < $len; $i++) {
            $binaryStr .= str_pad(decbin(ord($binary[$i])), 8, '0', STR_PAD_LEFT);
        }

        $padding = (5 - (strlen($binaryStr) % 5)) % 5;
        $binaryStr .= str_repeat('0', $padding);

        $out = '';
        for ($i = 0, $bitLen = strlen($binaryStr); $i < $bitLen; $i += 5) {
            $chunk = substr($binaryStr, $i, 5);
            $out .= self::BASE32_ALPHABET[bindec($chunk)];
        }

        return $out;
    }
}
