<?php

namespace App\Services\FshhChat;

use App\Data\SystemsCatalogAliases;
use App\Models\Document;
use App\Models\Menu;
use App\Models\QualityDocument;
use App\Models\User;
use App\Support\PublicHost;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class SystemsCatalogSearchService
{
    private const MAX_RESULTS = 1;

    private const MAX_DOC_SYSTEMS = 5;

    private const MAX_DOC_RECORDS = 5;

    private const MAX_DOC_TOTAL = 8;

    /**
     * @return array{
     *     success: bool,
     *     query: string,
     *     help?: bool,
     *     message?: string,
     *     results?: list<array<string, mixed>>,
     *     error?: string
     * }
     */
    public function search(int $laravelUserId, string $query): array
    {
        $normalized = $this->normalizeQuery($query);

        if ($normalized === '' || $this->isHelpQuery($normalized)) {
            return [
                'success' => true,
                'query' => $normalized,
                'help' => true,
                'message' => $this->helpMessage(),
                'results' => [],
            ];
        }

        if ($laravelUserId <= 0) {
            return [
                'success' => false,
                'query' => $normalized,
                'error' => 'เชื่อมบัญชีเว็บแอปก่อนจึงจะค้นหาระบบตามสิทธิ์ได้',
            ];
        }

        $user = User::query()->find($laravelUserId);
        if (! $user) {
            return [
                'success' => false,
                'query' => $normalized,
                'error' => 'ไม่พบบัญชีผู้ใช้ในระบบ',
            ];
        }

        if ($this->isDocumentCategoryQuery($normalized)) {
            return $this->searchDocumentCategory($user, $normalized);
        }

        return $this->searchSingleSystem($user, $normalized);
    }

    public function helpMessage(): string
    {
        $examples = implode(', ', SystemsCatalogAliases::helpExamples());

        return "สวัสดี ฉันคือบอทค้นหาระบบ SMH\n".
            "พิมพ์ชื่อระบบหรือคำใกล้เคียง เช่น ".$examples."\n".
            "พิมพ์ «เอกสาร» หรือ «หนังสือ» เพื่อหาทั้งระบบและรายการเอกสารที่เกี่ยวข้อง\n".
            "ระบบ/เอกสารที่มีสิทธิ์จะได้ลิงก์เปิดเข้าใช้งาน\n".
            'ถ้าไม่มีสิทธิ์ ฉันจะแจ้งให้ทราบ';
    }

    /**
     * @return array{success: bool, query: string, results: list<array<string, mixed>>, message?: string}
     */
    private function searchSingleSystem(User $user, string $normalized): array
    {
        $catalog = $this->catalog();
        if ($catalog === []) {
            return [
                'success' => true,
                'query' => $normalized,
                'message' => 'ยังไม่มีรายการระบบในเมนู',
                'results' => [],
            ];
        }

        $scored = $this->scoreMatches($normalized, $catalog);
        if ($scored === []) {
            return [
                'success' => true,
                'query' => $normalized,
                'message' => 'ไม่พบระบบที่ตรงกับ «'.$normalized.'»\nลองพิมพ์คำใกล้เคียง หรือพิมพ์ «ช่วยเหลือ»',
                'results' => [],
            ];
        }

        $results = [];
        foreach (array_slice($scored, 0, self::MAX_RESULTS) as $item) {
            $results[] = $this->systemResult($user, $item);
        }

        return [
            'success' => true,
            'query' => $normalized,
            'results' => $results,
        ];
    }

    /**
     * @return array{success: bool, query: string, results: list<array<string, mixed>>, message?: string}
     */
    private function searchDocumentCategory(User $user, string $normalized): array
    {
        $catalog = $this->catalog();
        $scored = $this->scoreMatches($normalized, $catalog);
        $systemResults = [];
        foreach (array_slice($scored, 0, self::MAX_DOC_SYSTEMS) as $item) {
            $systemResults[] = $this->systemResult($user, $item);
        }

        $docResults = $this->searchDocumentRecords($user, $normalized, self::MAX_DOC_RECORDS);
        $results = array_slice(array_merge($systemResults, $docResults), 0, self::MAX_DOC_TOTAL);

        if ($results === []) {
            return [
                'success' => true,
                'query' => $normalized,
                'message' => 'ไม่พบระบบหรือเอกสารที่ตรงกับ «'.$normalized.'»\nลองพิมพ์ชื่อเอกสารให้ชัดขึ้น หรือพิมพ์ «ช่วยเหลือ»',
                'results' => [],
            ];
        }

        return [
            'success' => true,
            'query' => $normalized,
            'results' => $results,
        ];
    }

    /**
     * @param  array{title: string, route: string, url: string, permission_name: string, blurb: string, search_text: string, score: float}  $item
     * @return array<string, mixed>
     */
    private function systemResult(User $user, array $item): array
    {
        $allowed = $this->userCanAccess($user, $item['permission_name'], $item['route']);
        $entry = [
            'kind' => 'system',
            'title' => $item['title'],
            'route' => $item['route'],
            'url' => $item['url'],
            'blurb' => $item['blurb'],
            'status' => $allowed ? 'allowed' : 'denied',
            'score' => $item['score'],
            'priority' => 'ระบบ',
            'actionLabel' => 'เปิดระบบ',
        ];
        if (! $allowed) {
            $entry['deniedMessage'] =
                'ไม่มีสิทธิ์เข้า «'.$item['title']."»\n".
                'เฉพาะผู้มีสิทธิ์ถึงเข้าระบบนี้ได้';
        }

        return $entry;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function searchDocumentRecords(User $user, string $query, int $limit): array
    {
        $candidates = [];

        if (Schema::hasTable('quality_documents')) {
            $canQuality = $this->userCanAccess($user, 'quality-docs.index', 'quality-docs.index');
            QualityDocument::query()
                ->where(function ($q) use ($query) {
                    $q->where('title', 'like', '%'.$query.'%')
                        ->orWhere('document_number', 'like', '%'.$query.'%');
                })
                ->orderByDesc('updated_at')
                ->limit(40)
                ->get(['id', 'title', 'document_number'])
                ->each(function (QualityDocument $doc) use (&$candidates, $query, $canQuality) {
                    $title = trim((string) $doc->title);
                    $number = trim((string) ($doc->document_number ?? ''));
                    $score = $this->scoreDocumentTitle($query, $title, $number);
                    if ($score < 50.0) {
                        return;
                    }
                    $path = '/quality-docs/'.$doc->id;
                    try {
                        $path = route('quality-docs.show', $doc, false);
                    } catch (\Throwable) {
                        // keep fallback path
                    }
                    $candidates[] = [
                        'kind' => 'document',
                        'doc_type' => 'quality',
                        'title' => $title !== '' ? $title : ('เอกสาร #'.$doc->id),
                        'url' => $this->absoluteUrl($path),
                        'blurb' => $number !== '' ? 'เลขที่ '.$number : 'เอกสารควบคุมคุณภาพ',
                        'status' => $canQuality ? 'allowed' : 'denied',
                        'score' => $score,
                        'priority' => 'เอกสารควบคุม',
                        'actionLabel' => 'เปิดเอกสาร',
                        'deniedMessage' => $canQuality ? null : (
                            'ไม่มีสิทธิ์เข้า «'.($title !== '' ? $title : 'เอกสารควบคุม')."»\n".
                            'เฉพาะผู้มีสิทธิ์ถึงเข้าระบบนี้ได้'
                        ),
                    ];
                });
        }

        if (Schema::hasTable('documents')) {
            $canMail = $this->userCanAccess($user, 'documents.index', 'documents.index')
                || $this->userCanAccess($user, 'documents.inbox', 'documents.inbox')
                || $this->userCanAccess($user, 'documents.dashboard', 'documents.dashboard');
            Document::query()
                ->where(function ($q) use ($query) {
                    $q->where('title', 'like', '%'.$query.'%');
                    if (Schema::hasColumn('documents', 'document_number')) {
                        $q->orWhere('document_number', 'like', '%'.$query.'%');
                    }
                })
                ->orderByDesc('updated_at')
                ->limit(40)
                ->get(['id', 'title', 'document_number'])
                ->each(function (Document $doc) use (&$candidates, $query, $canMail) {
                    $title = trim((string) $doc->title);
                    $number = trim((string) ($doc->document_number ?? ''));
                    $score = $this->scoreDocumentTitle($query, $title, $number);
                    if ($score < 50.0) {
                        return;
                    }
                    $path = '/documents/'.$doc->id;
                    try {
                        $path = route('documents.show', $doc, false);
                    } catch (\Throwable) {
                        // keep fallback path
                    }
                    $candidates[] = [
                        'kind' => 'document',
                        'doc_type' => 'mail',
                        'title' => $title !== '' ? $title : ('หนังสือ #'.$doc->id),
                        'url' => $this->absoluteUrl($path),
                        'blurb' => $number !== '' ? 'เลขที่ '.$number : 'หนังสือราชการ',
                        'status' => $canMail ? 'allowed' : 'denied',
                        'score' => $score,
                        'priority' => 'หนังสือ',
                        'actionLabel' => 'เปิดเอกสาร',
                        'deniedMessage' => $canMail ? null : (
                            'ไม่มีสิทธิ์เข้า «'.($title !== '' ? $title : 'หนังสือ')."»\n".
                            'เฉพาะผู้มีสิทธิ์ถึงเข้าระบบนี้ได้'
                        ),
                    ];
                });
        }

        usort($candidates, fn (array $a, array $b) => $b['score'] <=> $a['score']);

        $out = [];
        foreach (array_slice($candidates, 0, $limit) as $row) {
            if ($row['deniedMessage'] === null) {
                unset($row['deniedMessage']);
            }
            $out[] = $row;
        }

        return $out;
    }

    private function scoreDocumentTitle(string $query, string $title, string $number): float
    {
        $titleNorm = $this->normalizeQuery($title);
        $numberNorm = $this->normalizeQuery($number);
        $score = 0.0;

        if ($titleNorm === $query || ($numberNorm !== '' && $numberNorm === $query)) {
            $score = 95.0;
        } elseif ($titleNorm !== '' && (str_contains($titleNorm, $query) || str_contains($query, $titleNorm))) {
            $score = 85.0;
        } elseif ($numberNorm !== '' && str_contains($numberNorm, $query)) {
            $score = 80.0;
        } else {
            $sim = $this->similarity($query, $titleNorm);
            if ($sim >= 0.45) {
                $score = 50.0 + ($sim * 40.0);
            }
        }

        return round($score, 2);
    }

    private function isDocumentCategoryQuery(string $normalized): bool
    {
        foreach (SystemsCatalogAliases::documentCategoryQueries() as $alias) {
            $aliasNorm = $this->normalizeQuery($alias);
            if ($aliasNorm === '') {
                continue;
            }
            if ($normalized === $aliasNorm || str_contains($normalized, $aliasNorm) || str_contains($aliasNorm, $normalized)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<array{title: string, route: string, url: string, permission_name: string, blurb: string, search_text: string}>
     */
    private function catalog(): array
    {
        if (! Schema::hasTable('menus')) {
            return [];
        }

        $items = [];
        $seen = [];

        Menu::query()
            ->orderBy('order')
            ->get(['id', 'title', 'route', 'permission_name', 'parent_id'])
            ->each(function (Menu $menu) use (&$items, &$seen) {
                $route = trim((string) ($menu->route ?? ''));
                if ($route === '' || $route === '#') {
                    return;
                }

                $path = app_route_url($route);
                if (! $path || $path === '#') {
                    return;
                }

                $key = $route.'|'.$path;
                if (isset($seen[$key])) {
                    return;
                }
                $seen[$key] = true;

                $absolute = $this->absoluteUrl($path);
                $permission = trim((string) ($menu->permission_name ?: $route));
                $title = trim((string) $menu->title);
                $items[] = [
                    'title' => $title,
                    'route' => $route,
                    'url' => $absolute,
                    'permission_name' => $permission,
                    'blurb' => $title,
                    'search_text' => $this->normalizeQuery($title.' '.$route),
                ];
            });

        return $items;
    }

    /**
     * @param  list<array{title: string, route: string, url: string, permission_name: string, blurb: string, search_text: string}>  $catalog
     * @return list<array{title: string, route: string, url: string, permission_name: string, blurb: string, search_text: string, score: float}>
     */
    private function scoreMatches(string $query, array $catalog): array
    {
        $aliasRoutes = $this->aliasRoutesFor($query);
        $scored = [];

        foreach ($catalog as $item) {
            $score = 0.0;

            if (in_array($item['route'], $aliasRoutes, true)) {
                $score = max($score, 100.0 - (array_search($item['route'], $aliasRoutes, true) ?: 0));
            }

            $titleNorm = $this->normalizeQuery($item['title']);
            $search = $item['search_text'];

            if ($titleNorm === $query || $search === $query) {
                $score = max($score, 95.0);
            } elseif ($titleNorm !== '' && (str_contains($titleNorm, $query) || str_contains($query, $titleNorm))) {
                $score = max($score, 80.0);
            } elseif ($search !== '' && str_contains($search, $query)) {
                $score = max($score, 70.0);
            } else {
                $sim = $this->similarity($query, $titleNorm);
                if ($sim >= 0.55) {
                    $score = max($score, 50.0 + ($sim * 40.0));
                }
            }

            if ($score < 50.0) {
                continue;
            }

            $scored[] = array_merge($item, ['score' => round($score, 2)]);
        }

        usort($scored, fn (array $a, array $b) => $b['score'] <=> $a['score']);

        return $scored;
    }

    /**
     * @return list<string>
     */
    private function aliasRoutesFor(string $query): array
    {
        $routes = [];
        foreach (SystemsCatalogAliases::map() as $alias => $routeNames) {
            $aliasNorm = $this->normalizeQuery($alias);
            if ($aliasNorm === '') {
                continue;
            }
            if ($aliasNorm === $query || str_contains($query, $aliasNorm) || str_contains($aliasNorm, $query)) {
                foreach ($routeNames as $route) {
                    $routes[] = $route;
                }
            }
        }

        return array_values(array_unique($routes));
    }

    private function userCanAccess(User $user, string $permissionName, string $route): bool
    {
        if (in_array($route, ['dashboard', '/dashboard'], true) || $permissionName === 'dashboard-view') {
            return true;
        }

        if ($permissionName === '') {
            return true;
        }

        if ($user->can($permissionName)) {
            return true;
        }

        if (method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['admin', 'superUser'])) {
            return true;
        }

        if ($user->can('km.learn.dashboard') || $user->can('km.learn.hub')) {
            if (str_starts_with($permissionName, 'km.learn.')) {
                return true;
            }
        }

        foreach ($this->legacyPermissionFallbacks($permissionName) as $fallback) {
            if ($user->can($fallback)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<string>
     */
    private function legacyPermissionFallbacks(string $permissionName): array
    {
        $map = [
            'settings.positions.index' => ['settings-view', 'positions-view'],
            'settings.teamha.index' => ['settings-view', 'teamha-view'],
            'settings.departments.index' => ['settings-view', 'departments-view'],
            'settings.staff.index' => ['settings-view', 'users-view'],
            'setting.edit' => ['settings-view', 'app-settings-view'],
            'setting.database' => ['settings-view', 'app-settings-view'],
            'users.index' => ['access-view', 'users-view'],
            'roles.index' => ['access-view', 'roles-view'],
            'permissions.index' => ['access-view', 'permission-view'],
            'menus.index' => ['settings-view', 'menu-view'],
            'audit-logs.index' => ['utilities-view', 'log-view'],
            'backup.index' => ['settings-view', 'backup-view'],
            'files.index' => ['utilities-view', 'filemanager-view'],
            'finance.cgd.precheck' => ['finance.cgd.dashboard'],
        ];

        return $map[$permissionName] ?? [];
    }

    private function absoluteUrl(string $path): string
    {
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        $relative = str_starts_with($path, '/') ? $path : '/'.$path;

        $appBasePath = rtrim((string) (parse_url((string) config('app.url'), PHP_URL_PATH) ?: ''), '/');
        if ($appBasePath !== '' && $appBasePath !== '/') {
            if ($relative === $appBasePath) {
                $relative = '/';
            } elseif (str_starts_with($relative, $appBasePath.'/')) {
                $relative = substr($relative, strlen($appBasePath)) ?: '/';
            }
        }

        $publicBase = PublicHost::publicHttpsBase();
        if ($publicBase) {
            return rtrim($publicBase, '/').($relative === '/' ? '' : $relative);
        }

        $appUrl = rtrim((string) config('app.url'), '/');

        return $appUrl.($relative === '/' ? '' : $relative);
    }

    private function normalizeQuery(string $input): string
    {
        $text = trim(preg_replace('/\s+/u', ' ', $input) ?? $input);
        $text = preg_replace('/(ค่ะ|ครับ|คะ|นะ|นะคะ|นะครับ|หน่อย|ที)+$/u', '', $text) ?? $text;
        $text = Str::lower($text);

        return trim($text);
    }

    private function isHelpQuery(string $normalized): bool
    {
        return in_array($normalized, ['ช่วยเหลือ', 'help', '?', 'start', 'เริ่มต้น', 'เมนูช่วยเหลือ'], true);
    }

    private function similarity(string $a, string $b): float
    {
        if ($a === '' || $b === '') {
            return 0.0;
        }
        similar_text($a, $b, $percent);

        return $percent / 100.0;
    }
}
