<?php

namespace App\Services\Im;

use App\Models\Im\Timesheet;
use App\Models\User;
use App\Support\TlsCaBundle;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use PhpOffice\PhpSpreadsheet\IOFactory;
use RuntimeException;

class GoogleTimesheetSyncService
{
    public const SOURCE = 'google_sheet';

    public const CACHE_KEY = 'im.timesheet.google_sync';

    /**
     * @return array{imported:int,updated:int,skipped:int,pruned:int,source:string,tabs:list<string>}
     */
    public function sync(bool $prune = false, ?string $file = null): array
    {
        try {
            $tabs = $file
                ? $this->loadFromFile($file)
                : $this->fetchRemoteTabs();
        } catch (RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            if ($this->isSslError($e)) {
                throw new RuntimeException('PHP ตรวจใบรับรอง SSL ไม่ได้ — ตั้ง IM_TIMESHEET_VERIFY_SSL=false ใน .env', 0, $e);
            }
            throw new RuntimeException($e->getMessage(), 0, $e);
        }

        $users = User::query()->get(['id', 'name']);
        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $seen = [];

        foreach ($tabs as $tabName => $matrix) {
            if ($tabName === 'Master' || $this->isMasterSheet($matrix)) {
                continue;
            }
            foreach ($this->rowsFromMatrix($matrix, $tabName) as $row) {
                if ($row === null) {
                    $skipped++;
                    continue;
                }
                $seen[] = $row['external_id'];
                $existing = Timesheet::query()
                    ->where('source', self::SOURCE)
                    ->where('external_id', $row['external_id'])
                    ->first();

                $row['user_id'] = $this->matchUserId($row['staff_name'], $users);

                if ($existing) {
                    $existing->fill($row);
                    if ($existing->isDirty()) {
                        $existing->save();
                        $updated++;
                    } else {
                        $skipped++;
                    }
                    continue;
                }

                Timesheet::create($row);
                $imported++;
            }
        }

        $pruned = 0;
        if ($prune && $seen !== []) {
            $pruned = Timesheet::query()
                ->where('source', self::SOURCE)
                ->whereNotIn('external_id', array_values(array_unique($seen)))
                ->delete();
        }

        $result = [
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'pruned' => $pruned,
            'source' => $file ? 'file' : (string) Cache::get(self::CACHE_KEY.'.via', 'google'),
            'tabs' => array_keys($tabs),
        ];

        Cache::put(self::CACHE_KEY, [
            'synced_at' => now()->toIso8601String(),
            'error' => null,
            ...$result,
        ], now()->addDays(30));

        return $result;
    }

    /**
     * @return array{synced_at:?string,error:?string,imported?:int,updated?:int,skipped?:int,pruned?:int,source?:string,tabs?:list<string>}
     */
    public function lastSync(): array
    {
        $cached = Cache::get(self::CACHE_KEY);

        return is_array($cached) ? $cached : ['synced_at' => null, 'error' => null];
    }

    public function rememberError(string $message): void
    {
        Cache::put(self::CACHE_KEY, [
            'synced_at' => $this->lastSync()['synced_at'] ?? null,
            'error' => $message,
        ], now()->addDays(30));
    }

    /**
     * @return array<string, list<list<string>>>
     */
    public function fetchRemoteTabs(): array
    {
        try {
            return $this->fetchRemoteTabsOnce();
        } catch (\Throwable $e) {
            if ($this->isSslError($e) && config('im_timesheet.google.verify_ssl', true)) {
                config(['im_timesheet.google.verify_ssl' => false]);

                return $this->fetchRemoteTabsOnce();
            }
            throw $e;
        }
    }

    /**
     * @return array<string, list<list<string>>>
     */
    private function fetchRemoteTabsOnce(): array
    {
        $gasUrl = trim((string) config('im_timesheet.google.gas_url'));
        if ($gasUrl !== '') {
            Cache::put(self::CACHE_KEY.'.via', 'apps_script', now()->addDays(30));

            return $this->fetchViaAppsScript($gasUrl);
        }

        $serviceAccount = (string) config('im_timesheet.google.service_account_json');
        if ($serviceAccount !== '' && is_file($serviceAccount)) {
            Cache::put(self::CACHE_KEY.'.via', 'service_account', now()->addDays(30));

            return $this->fetchViaServiceAccount($serviceAccount);
        }

        Cache::put(self::CACHE_KEY.'.via', 'csv', now()->addDays(30));

        return $this->fetchViaPublicCsv();
    }

    /**
     * @return array<string, list<list<string>>>
     */
    public function loadFromFile(string $path): array
    {
        if (is_dir($path)) {
            $tabs = [];
            $files = array_merge(
                glob($path.DIRECTORY_SEPARATOR.'*.csv') ?: [],
                glob($path.DIRECTORY_SEPARATOR.'*.xlsx') ?: [],
                glob($path.DIRECTORY_SEPARATOR.'*.xls') ?: [],
            );
            foreach ($files as $file) {
                foreach ($this->loadFromFile($file) as $name => $matrix) {
                    $tabs[$name] = $matrix;
                }
            }
            if ($tabs === []) {
                throw new RuntimeException('ไม่พบไฟล์ CSV/XLSX ในโฟลเดอร์: '.$path);
            }

            return $tabs;
        }

        if (! is_file($path)) {
            throw new RuntimeException('ไม่พบไฟล์: '.$path);
        }

        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        if (in_array($ext, ['xlsx', 'xls', 'ods'], true)) {
            $spreadsheet = IOFactory::load($path);
            $tabs = [];
            foreach ($spreadsheet->getWorksheetIterator() as $sheet) {
                $tabs[$sheet->getTitle()] = $this->stringifyMatrix($sheet->toArray(null, true, true, false));
            }
            $spreadsheet->disconnectWorksheets();

            return $tabs;
        }

        $csv = file_get_contents($path);
        if ($csv === false) {
            throw new RuntimeException('อ่านไฟล์ไม่สำเร็จ: '.$path);
        }

        return [pathinfo($path, PATHINFO_FILENAME) => $this->parseCsv($csv)];
    }

    /**
     * @return array<string, list<list<string>>>
     */
    private function fetchViaAppsScript(string $url): array
    {
        $token = trim((string) config('im_timesheet.google.gas_token'));
        $query = ['action' => 'im_timesheet'];
        if ($token !== '') {
            $query['token'] = $token;
        }

        $response = $this->http()->get($url, $query);
        if (! $response->successful()) {
            throw new RuntimeException('Apps Script ตอบกลับ HTTP '.$response->status());
        }

        $body = (string) $response->body();
        if ($this->looksLikeHtml($body)) {
            throw new RuntimeException(
                'IM_TIMESHEET_GAS_URL ชี้ไปหน้าเว็บลงเวลา ไม่ใช่ API JSON — เปิดโปรเจกต์ Apps Script เดิม แล้วเพิ่มเงื่อนไข action=im_timesheet ใน doGet ตาม scripts/google-apps/im-timesheet-api.gs จากนั้น Deploy → New version'
            );
        }

        $json = $response->json();
        if (! is_array($json) || ($json['ok'] ?? false) !== true || ! isset($json['sheets']) || ! is_array($json['sheets'])) {
            $error = is_array($json) ? (string) ($json['error'] ?? 'รูปแบบ JSON ไม่ถูกต้อง') : 'Apps Script ไม่ได้ส่ง JSON';
            throw new RuntimeException($error);
        }

        $tabs = [];
        foreach ($json['sheets'] as $name => $matrix) {
            if (! is_array($matrix)) {
                continue;
            }
            $tabs[(string) $name] = $this->stringifyMatrix($matrix);
        }

        if ($tabs === []) {
            throw new RuntimeException('Apps Script ไม่มีชีต WorkLogs / รายงานการทำงาน');
        }

        return $tabs;
    }

    /**
     * @return array<string, list<list<string>>>
     */
    private function fetchViaServiceAccount(string $jsonPath): array
    {
        $token = $this->googleAccessToken($jsonPath);
        $sheetId = (string) config('im_timesheet.google.sheet_id');
        $wanted = config('im_timesheet.google.tabs', []);
        $tabs = [];

        foreach ($wanted as $tabName) {
            $response = $this->http()
                ->withToken($token)
                ->get('https://sheets.googleapis.com/v4/spreadsheets/'.$sheetId.'/values/'.rawurlencode($tabName), [
                    'valueRenderOption' => 'FORMATTED_VALUE',
                ]);
            if ($response->status() === 400 || $response->status() === 404) {
                continue;
            }
            if (! $response->successful()) {
                throw new RuntimeException('Google Sheets API HTTP '.$response->status());
            }
            $values = $response->json('values');
            if (! is_array($values)) {
                continue;
            }
            $tabs[$tabName] = $this->stringifyMatrix($values);
        }

        if ($tabs === []) {
            throw new RuntimeException('Service Account อ่านชีต Timesheet ไม่ได้ — แชร์สเปรดชีตให้บัญชีบริการ');
        }

        return $tabs;
    }

    /**
     * @return array<string, list<list<string>>>
     */
    private function fetchViaPublicCsv(): array
    {
        $sheetId = (string) config('im_timesheet.google.sheet_id');
        $wanted = config('im_timesheet.google.tabs', []);
        $tabs = [];
        $lastError = null;

        foreach ($wanted as $tabName) {
            $url = sprintf(
                'https://docs.google.com/spreadsheets/d/%s/gviz/tq?tqx=out:csv&sheet=%s',
                $sheetId,
                rawurlencode($tabName)
            );
            try {
                $csv = $this->downloadCsv($url);
                $tabs[$tabName] = $this->parseCsv($csv);
            } catch (\Throwable $e) {
                $lastError = $e instanceof RuntimeException
                    ? $e
                    : new RuntimeException($e->getMessage(), 0, $e);
            }
        }

        if ($tabs === []) {
            $gid = (string) config('im_timesheet.google.sheet_gid');
            $url = sprintf(
                'https://docs.google.com/spreadsheets/d/%s/export?format=csv&gid=%s',
                $sheetId,
                $gid
            );
            try {
                $csv = $this->downloadCsv($url);
                $tabs['gid-'.$gid] = $this->parseCsv($csv);
            } catch (\Throwable $e) {
                $lastError = $e instanceof RuntimeException
                    ? $e
                    : new RuntimeException($e->getMessage(), 0, $e);
            }
        }

        if ($tabs === []) {
            throw new RuntimeException(
                $lastError?->getMessage()
                ?? 'อ่าน Google Sheet ไม่ได้ เพราะชีตเป็นแบบส่วนตัว — ตั้งค่า IM_TIMESHEET_GAS_URL หรือแชร์เป็น Anyone with the link (Viewer)'
            );
        }

        return $tabs;
    }

    private function downloadCsv(string $url): string
    {
        try {
            $response = $this->requestCsv($url);
        } catch (\Throwable $e) {
            if (! $this->isSslError($e)) {
                throw $e instanceof RuntimeException ? $e : new RuntimeException($e->getMessage(), 0, $e);
            }
            $response = $this->requestCsv($url, insecure: true);
        }

        $body = (string) $response->body();
        if (! $response->successful() || $this->looksLikeHtml($body)) {
            throw new RuntimeException(
                'อ่าน Google Sheet ไม่ได้ เพราะชีตเป็นแบบส่วนตัว — Deploy Apps Script (scripts/google-apps/im-timesheet-api.gs) แล้วใส่ IM_TIMESHEET_GAS_URL หรือแชร์ชีตเป็น Anyone with the link (Viewer)'
            );
        }

        return $body;
    }

    private function requestCsv(string $url, bool $insecure = false)
    {
        return $this->http($insecure)
            ->withHeaders(['Accept' => 'text/csv,text/plain,*/*'])
            ->get($url);
    }

    private function googleAccessToken(string $jsonPath): string
    {
        $json = json_decode((string) file_get_contents($jsonPath), true);
        if (! is_array($json) || empty($json['client_email']) || empty($json['private_key'])) {
            throw new RuntimeException('ไฟล์ Service Account ไม่ถูกต้อง');
        }

        $now = time();
        $header = $this->base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
        $claims = $this->base64UrlEncode(json_encode([
            'iss' => $json['client_email'],
            'scope' => 'https://www.googleapis.com/auth/spreadsheets.readonly',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ], JSON_THROW_ON_ERROR));
        $unsigned = $header.'.'.$claims;
        $ok = openssl_sign($unsigned, $signature, $json['private_key'], OPENSSL_ALGO_SHA256);
        if (! $ok) {
            throw new RuntimeException('ลงลายเซ็น Service Account ไม่สำเร็จ');
        }

        $jwt = $unsigned.'.'.$this->base64UrlEncode($signature);
        $response = $this->http()->asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]);
        $token = $response->json('access_token');
        if (! is_string($token) || $token === '') {
            throw new RuntimeException('ขอ access token จาก Google ไม่สำเร็จ');
        }

        return $token;
    }

    /**
     * @param  list<list<mixed>>  $matrix
     * @return list<array<string, mixed>|null>
     */
    private function rowsFromMatrix(array $matrix, string $tabName): array
    {
        if ($matrix === []) {
            return [];
        }
        $header = array_map(fn ($v) => $this->normalizeHeader((string) $v), $matrix[0]);
        $map = [];
        foreach ($header as $index => $key) {
            if ($key !== '') {
                $map[$key] = $index;
            }
        }
        if (! isset($map['date']) && ! isset($map['activity']) && ! isset($map['staff'])) {
            return [];
        }

        $rows = [];
        for ($i = 1; $i < count($matrix); $i++) {
            $line = $matrix[$i];
            $get = function (string $key) use ($map, $line): string {
                $index = $map[$key] ?? null;
                if ($index === null) {
                    return '';
                }

                return trim((string) ($line[$index] ?? ''));
            };

            $staff = $get('staff');
            $activity = $get('activity');
            $date = $this->parseDate($get('date'));
            if ($staff === '' || $activity === '' || $date === null) {
                $rows[] = null;
                continue;
            }

            $start = $this->parseClock($get('start'));
            $end = $this->parseClock($get('end'));
            $hours = $this->parseHours($get('hours'), $start, $end);
            $externalId = $this->externalId($tabName, $get('id'), [
                $get('timestamp'), $get('date'), $staff, $activity, $start, $end, $get('hours'),
            ]);
            $noteParts = array_filter([
                $start && $end ? 'เวลา '.$start.'–'.$end : null,
                $get('recorded_at') !== '' ? 'บันทึกเมื่อ '.$get('recorded_at') : null,
                $get('timestamp') !== '' && $get('recorded_at') === '' ? 'Timestamp '.$get('timestamp') : null,
            ]);

            $rows[] = [
                'source' => self::SOURCE,
                'external_id' => $externalId,
                'sheet_tab' => $tabName,
                'staff_name' => $staff,
                'work_date' => $date,
                'hours' => $hours,
                'category' => $get('category') !== '' ? $get('category') : null,
                'activity' => $activity,
                'note' => $noteParts !== [] ? implode(' · ', $noteParts) : null,
                'start_time' => $start,
                'end_time' => $end,
            ];
        }

        return $rows;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, User>  $users
     */
    private function matchUserId(string $staffName, $users): ?int
    {
        $compact = $this->compactName($staffName);
        foreach ($users as $user) {
            if ($this->compactName((string) $user->name) === $compact) {
                return (int) $user->id;
            }
        }
        $needle = $this->nameNeedle($staffName);
        if ($needle === '') {
            return null;
        }
        foreach ($users as $user) {
            if (str_contains($this->compactName((string) $user->name), $needle)) {
                return (int) $user->id;
            }
        }

        return null;
    }

    private function compactName(string $name): string
    {
        return preg_replace('/\s+/u', '', $name) ?? $name;
    }

    private function nameNeedle(string $name): string
    {
        $stripped = preg_replace('/^(จ\.ส\.อ\.|ร\.ต\.|ร\.อ\.|ร\.ท\.|นาย|นางสาว|นาง)\s*/u', '', $name) ?? $name;

        return $this->compactName($stripped);
    }

    private function externalId(string $tab, string $id, array $parts): string
    {
        if ($id !== '') {
            return mb_substr($id, 0, 80);
        }
        $hash = sha1($tab.'|'.implode('|', $parts));

        return mb_substr('wl-'.$hash, 0, 80);
    }

    private function parseDate(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        if (is_numeric($value)) {
            try {
                return Carbon::instance(\PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float) $value))
                    ->toDateString();
            } catch (\Throwable) {
                // continue
            }
        }
        $value = str_replace(['.', '-'], '/', $value);
        $value = preg_replace('/\s+.*$/', '', $value) ?? $value;
        foreach (['d/m/Y', 'j/n/Y', 'Y/m/d'] as $format) {
            try {
                $date = Carbon::createFromFormat($format, $value);
                if ($date !== false) {
                    return $date->toDateString();
                }
            } catch (\Throwable) {
                // continue
            }
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    private function parseClock(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        if (preg_match('/^(\d{1,2})[:\.](\d{2})/', $value, $m)) {
            return sprintf('%02d:%02d', (int) $m[1], (int) $m[2]);
        }

        return null;
    }

    private function parseHours(string $hours, ?string $start, ?string $end): float
    {
        $hours = str_replace(',', '.', trim($hours));
        if (is_numeric($hours) && (float) $hours > 0) {
            return round((float) $hours, 2);
        }
        if ($start && $end) {
            try {
                $from = Carbon::createFromFormat('H:i', $start);
                $to = Carbon::createFromFormat('H:i', $end);
                if ($from && $to) {
                    if ($to->lessThan($from)) {
                        $to->addDay();
                    }

                    return round($from->diffInMinutes($to) / 60, 2);
                }
            } catch (\Throwable) {
                // fall through
            }
        }

        return 0.0;
    }

    private function normalizeHeader(string $header): string
    {
        $header = trim(preg_replace('/^\xEF\xBB\xBF/', '', $header) ?? $header);
        $aliases = [
            'timestamp' => 'timestamp',
            'วันที่' => 'date',
            'date' => 'date',
            'work_date' => 'date',
            'เจ้าหน้าที่' => 'staff',
            'ชื่อเจ้าหน้าที่' => 'staff',
            'staff' => 'staff',
            'หมวดงาน' => 'category',
            'category' => 'category',
            'กิจกรรมที่ทำ' => 'activity',
            'กิจกรรม' => 'activity',
            'activity' => 'activity',
            'เวลาเริ่ม' => 'start',
            'start' => 'start',
            'เวลาสิ้นสุด' => 'end',
            'end' => 'end',
            'จำนวนชั่วโมง' => 'hours',
            'hours' => 'hours',
            'id' => 'id',
            'วันที่บันทึก' => 'recorded_at',
        ];

        return $aliases[$header] ?? $aliases[mb_strtolower($header)] ?? mb_strtolower($header);
    }

    /**
     * @param  list<list<mixed>>  $matrix
     */
    private function isMasterSheet(array $matrix): bool
    {
        $header = implode(' ', array_map(fn ($v) => (string) $v, $matrix[0] ?? []));

        return str_contains($header, 'รหัสเจ้าหน้าที่') && str_contains($header, 'รหัสหมวด');
    }

    /**
     * @param  list<list<mixed>>  $matrix
     * @return list<list<string>>
     */
    private function stringifyMatrix(array $matrix): array
    {
        return array_map(function ($row) {
            if (! is_array($row)) {
                return [trim((string) $row)];
            }

            return array_map(fn ($v) => trim((string) ($v ?? '')), $row);
        }, $matrix);
    }

    /**
     * @return list<list<string>>
     */
    private function parseCsv(string $csv): array
    {
        $csv = preg_replace('/^\xEF\xBB\xBF/', '', $csv) ?? $csv;
        $lines = preg_split('/\r\n|\n|\r/', trim($csv)) ?: [];
        $rows = [];
        foreach ($lines as $line) {
            if (trim($line) === '') {
                continue;
            }
            $rows[] = array_map(fn ($v) => trim((string) $v), str_getcsv($line));
        }

        return $rows;
    }

    private function looksLikeHtml(string $body): bool
    {
        $start = ltrim($body);

        return str_starts_with($start, '<!DOCTYPE') || str_starts_with($start, '<html') || str_contains($start, 'Sign in');
    }

    private function isSslError(\Throwable $e): bool
    {
        $message = $e->getMessage();
        if (str_contains($message, 'SSL certificate')
            || str_contains($message, 'cURL error 60')
            || str_contains($message, 'unable to get local issuer certificate')) {
            return true;
        }

        $previous = $e->getPrevious();

        return $previous instanceof \Throwable && $this->isSslError($previous);
    }

    private function http(bool $insecure = false)
    {
        $options = ['allow_redirects' => true];
        $verifySsl = (bool) config('im_timesheet.google.verify_ssl', true);

        if ($insecure || ! $verifySsl) {
            $options['verify'] = false;
            $options['curl'] = [
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => 0,
            ];
        } else {
            $ca = TlsCaBundle::path();
            if ($ca) {
                $options['verify'] = $ca;
            }
        }

        return Http::timeout((int) config('im_timesheet.google.timeout', 30))
            ->withOptions($options);
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
