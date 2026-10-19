<?php

namespace App\Http\Controllers;

use App\Models\UserHubLayout;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MenusHubController extends Controller
{
    private const TONE_MAX = 11;

    public function index(Request $request): Response
    {
        $row = UserHubLayout::query()
            ->where('user_id', $request->user()->id)
            ->first();

        return Inertia::render('MenusHub/Index', [
            'hubLayout' => $this->normalize($row?->layout),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'order' => ['present', 'array', 'max:500'],
            'order.*' => ['string', 'regex:/^(child|root)-\d+$/', 'max:64'],
            'collapsed' => ['present', 'array', 'max:500'],
            'collapsed.*' => ['string', 'regex:/^(child|root)-\d+$/', 'max:64'],
            'tones' => ['present', 'array', 'max:500'],
        ]);

        $layout = [
            'order' => array_values(array_unique($data['order'])),
            'collapsed' => array_values(array_unique($data['collapsed'])),
            'tones' => $this->tones($data['tones']),
        ];

        UserHubLayout::query()->updateOrCreate(
            ['user_id' => $request->user()->id],
            ['layout' => $layout],
        );

        return back();
    }

    public function destroy(Request $request)
    {
        UserHubLayout::query()
            ->where('user_id', $request->user()->id)
            ->delete();

        return back();
    }

    /**
     * @return array{order: list<string>, collapsed: list<string>, tones: array<string, int>}
     */
    private function normalize(mixed $layout): array
    {
        $layout = is_array($layout) ? $layout : [];

        return [
            'order' => $this->cardKeys($layout['order'] ?? []),
            'collapsed' => $this->cardKeys($layout['collapsed'] ?? []),
            'tones' => $this->tones($layout['tones'] ?? []),
        ];
    }

    /**
     * @return list<string>
     */
    private function cardKeys(mixed $keys): array
    {
        if (! is_array($keys)) {
            return [];
        }

        $clean = [];
        foreach ($keys as $key) {
            if (is_string($key) && preg_match('/^(child|root)-\d+$/', $key)) {
                $clean[] = $key;
            }
        }

        return array_values(array_unique($clean));
    }

    /**
     * @return array<string, int>
     */
    private function tones(mixed $tones): array
    {
        if (! is_array($tones)) {
            return [];
        }

        $clean = [];
        foreach ($tones as $key => $tone) {
            if (! is_string($key) || ! preg_match('/^(child|root)-\d+$/', $key)) {
                continue;
            }
            if (! is_numeric($tone)) {
                continue;
            }
            $index = (int) $tone;
            if ($index < 0 || $index > self::TONE_MAX) {
                continue;
            }
            $clean[$key] = $index;
        }

        return $clean;
    }
}
