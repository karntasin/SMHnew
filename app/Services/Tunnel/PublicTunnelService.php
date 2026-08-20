<?php

namespace App\Services\Tunnel;

use App\Services\Ngrok\NgrokTunnelService;
use App\Support\TunnelEnv;

class PublicTunnelService
{
    public function __construct(
        private NgrokTunnelService $ngrok,
        private CloudflareTunnelService $cloudflare,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function status(): array
    {
        if ($this->cloudflare->isRunning()) {
            return $this->cloudflare->status();
        }

        $ngrok = $this->ngrok->status();
        if (! empty($ngrok['running'])) {
            return $ngrok + ['driver' => 'ngrok', 'skips_interstitial' => false];
        }

        $public = (string) config('ngrok.public_url');
        if (str_contains($public, 'trycloudflare.com')) {
            return $this->cloudflare->status();
        }

        return $ngrok + ['driver' => (string) config('ngrok.driver', 'cloudflare'), 'skips_interstitial' => false];
    }

    /**
     * @return array<string, mixed>
     */
    public function start(string $driver = 'cloudflare'): array
    {
        if ($driver === 'ngrok') {
            $this->cloudflare->killProcess();

            return $this->ngrok->start() + ['driver' => 'ngrok', 'skips_interstitial' => false];
        }

        $this->ngrok->killProcess();

        return $this->cloudflare->start();
    }

    /**
     * @return array<string, mixed>
     */
    public function stop(): array
    {
        $this->cloudflare->killProcess();
        $this->ngrok->killProcess();
        TunnelEnv::clear();

        return $this->status() + ['message' => 'ปิดอุโมงค์แล้ว', 'success' => true];
    }
}
