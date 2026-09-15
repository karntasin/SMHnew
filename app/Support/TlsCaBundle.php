<?php

namespace App\Support;

class TlsCaBundle
{
    public static function path(): ?string
    {
        $candidates = [
            env('CURL_CA_BUNDLE'),
            env('SSL_CERT_FILE'),
            ini_get('curl.cainfo') ?: null,
            ini_get('openssl.cafile') ?: null,
            storage_path('app/certs/cacert.pem'),
            base_path('.php82/extras/ssl/cacert.pem'),
            dirname(PHP_BINARY).DIRECTORY_SEPARATOR.'extras'.DIRECTORY_SEPARATOR.'ssl'.DIRECTORY_SEPARATOR.'cacert.pem',
            dirname(PHP_BINARY, 2).DIRECTORY_SEPARATOR.'apache'.DIRECTORY_SEPARATOR.'bin'.DIRECTORY_SEPARATOR.'curl-ca-bundle.crt',
        ];

        $dir = base_path();
        for ($i = 0; $i < 6; $i++) {
            $candidates[] = $dir.DIRECTORY_SEPARATOR.'apache'.DIRECTORY_SEPARATOR.'bin'.DIRECTORY_SEPARATOR.'curl-ca-bundle.crt';
            $parent = dirname($dir);
            if ($parent === $dir) {
                break;
            }
            $dir = $parent;
        }

        foreach ($candidates as $path) {
            $path = is_string($path) ? trim($path) : '';
            if ($path !== '' && is_file($path) && is_readable($path)) {
                return $path;
            }
        }

        return null;
    }

    public static function apply(): void
    {
        $path = self::path();
        if ($path === null) {
            return;
        }

        if (! ini_get('curl.cainfo')) {
            ini_set('curl.cainfo', $path);
        }
        if (! ini_get('openssl.cafile')) {
            ini_set('openssl.cafile', $path);
        }
    }
}
