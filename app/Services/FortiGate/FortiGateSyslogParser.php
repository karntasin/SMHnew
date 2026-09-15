<?php

/**
 * FortiGate key=value syslog parser — robust for quoted and unquoted values.
 */

namespace App\Services\FortiGate;

class FortiGateSyslogParser
{
    /**
     * @return array{type:string,row:array<string,mixed>}|null
     */
    public function parse(string $raw): ?array
    {
        $line = trim($raw);
        if ($line === '') {
            return null;
        }

        if (preg_match('/\bdate=/i', $line, $m, PREG_OFFSET_CAPTURE)) {
            $line = substr($line, (int) $m[0][1]);
        } else {
            $line = preg_replace('/^<\d+>/', '', $line) ?? $line;
            $line = trim($line);
        }

        $fields = $this->parseKeyValues($line);
        if ($fields === []) {
            return null;
        }

        $type = $this->resolveLogType($fields);
        if ($type === null) {
            return null;
        }

        if (isset($fields['attackname']) && ! isset($fields['attack'])) {
            $fields['attack'] = $fields['attackname'];
        }
        if (isset($fields['dstport']) && empty($fields['service']) && is_numeric($fields['dstport'])) {
            $proto = strtoupper((string) ($fields['proto'] ?? $fields['protocol'] ?? ''));
            $fields['service'] = ($proto !== '' ? $proto.'/' : '').$fields['dstport'];
        }

        return [
            'type' => $type,
            'row' => $fields,
        ];
    }

    /**
     * @return array<string, string>
     */
    private function parseKeyValues(string $line): array
    {
        $out = [];
        $len = strlen($line);
        $i = 0;

        while ($i < $len) {
            while ($i < $len && ctype_space($line[$i])) {
                $i++;
            }
            if ($i >= $len) {
                break;
            }

            $keyStart = $i;
            while ($i < $len && (ctype_alnum($line[$i]) || $line[$i] === '_')) {
                $i++;
            }
            if ($i >= $len || $line[$i] !== '=') {
                // skip garbage until next space
                while ($i < $len && ! ctype_space($line[$i])) {
                    $i++;
                }
                continue;
            }
            $key = strtolower(substr($line, $keyStart, $i - $keyStart));
            $i++; // skip =

            if ($i < $len && $line[$i] === '"') {
                $i++;
                $val = '';
                while ($i < $len) {
                    if ($line[$i] === '\\' && $i + 1 < $len) {
                        $val .= $line[$i + 1];
                        $i += 2;
                        continue;
                    }
                    if ($line[$i] === '"') {
                        $i++;
                        break;
                    }
                    $val .= $line[$i];
                    $i++;
                }
            } else {
                $valStart = $i;
                while ($i < $len && ! ctype_space($line[$i])) {
                    $i++;
                }
                $val = substr($line, $valStart, $i - $valStart);
            }

            if ($key !== '') {
                $out[$key] = $val;
            }
        }

        return $out;
    }

    /** @param array<string, string> $fields */
    private function resolveLogType(array $fields): ?string
    {
        $type = strtolower((string) ($fields['type'] ?? ''));
        $subtype = strtolower((string) ($fields['subtype'] ?? ''));

        if ($type === 'traffic') {
            return 'traffic';
        }

        if ($type === 'utm' || $type === 'security') {
            return match ($subtype) {
                'webfilter', 'web-filter' => 'webfilter',
                'app-ctrl', 'appctrl', 'application' => 'app-ctrl',
                'virus', 'antivirus' => 'virus',
                'ips' => 'ips',
                'anomaly', 'dos' => 'anomaly',
                'dns', 'dnsfilter' => 'dns',
                'ssl', 'ssh' => 'ssl',
                default => $subtype !== '' ? $subtype : 'utm',
            };
        }

        if (in_array($type, ['webfilter', 'virus', 'ips', 'anomaly', 'dns', 'ssl', 'event', 'app-ctrl'], true)) {
            return $type;
        }

        if ($type === 'event') {
            return 'event';
        }

        if (isset($fields['srcip']) && isset($fields['dstip'])) {
            return $type !== '' ? $type : 'traffic';
        }

        return null;
    }
}
