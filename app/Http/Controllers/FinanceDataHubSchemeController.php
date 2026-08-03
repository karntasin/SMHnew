<?php

namespace App\Http\Controllers;

use App\Support\Finance\DataHubSchemes;
use Inertia\Inertia;
use Inertia\Response;

class FinanceDataHubSchemeController extends Controller
{
    public function dashboard(string $scheme): Response
    {
        $meta = DataHubSchemes::get($scheme);

        return Inertia::render('Finance/DataHub/SchemePlaceholder', [
            'scheme' => $this->serialize($meta),
            'page' => 'dashboard',
        ]);
    }

    public function import(string $scheme): Response
    {
        $meta = DataHubSchemes::get($scheme);

        return Inertia::render('Finance/DataHub/SchemePlaceholder', [
            'scheme' => $this->serialize($meta),
            'page' => 'import',
        ]);
    }

    /**
     * @param  array<string, mixed>  $meta
     * @return array<string, mixed>
     */
    private function serialize(array $meta): array
    {
        return [
            'key' => $meta['key'],
            'title' => $meta['title'],
            'short' => $meta['short'],
            'subtitle' => $meta['subtitle'],
            'description' => $meta['description'],
            'import_label' => $meta['import_label'],
            'import_hint' => $meta['import_hint'],
            'icon' => $meta['icon'],
            'tone' => $meta['tone'],
            'status' => $meta['status'],
            'dashboard_route' => $meta['dashboard_route'],
            'import_route' => $meta['import_route'],
            'dashboard_url' => route($meta['dashboard_route']),
            'import_url' => route($meta['import_route']),
        ];
    }
}
