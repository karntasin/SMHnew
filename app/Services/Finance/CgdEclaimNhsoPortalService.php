<?php

namespace App\Services\Finance;

use GuzzleHttp\Client;
use GuzzleHttp\Cookie\CookieJar;
use GuzzleHttp\Cookie\SetCookie;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * ดาวน์โหลดไฟล์ REP จากเว็บ e-Claim NHSO (OFC)
 * Flow: login → OTP (Google Authenticator) → เลือกเดือน → ดาวน์โหลด → นำเข้า
 *
 * หมายเหตุ: หน้าเว็บ NHSO เป็น Struts และอาจเปลี่ยน HTML ได้
 * ถ้า selector ไม่ตรง ระบบจะคืนข้อความ error ชัดเจนให้ปรับ config/path
 */
class CgdEclaimNhsoPortalService
{
    private string $scheme = 'cgd';

    public function forScheme(string $scheme): self
    {
        $clone = clone $this;
        $clone->scheme = $scheme;

        return $clone;
    }

    public function isConfigured(): bool
    {
        return filled(config('cgd_eclaim.username')) && filled(config('cgd_eclaim.password'));
    }

    private function maininscl(): string
    {
        return \App\Support\Finance\ClaimScheme::exists($this->scheme)
            ? \App\Support\Finance\ClaimScheme::maininscl($this->scheme)
            : 'ofc';
    }

    /**
     * @return array{status:string,message:string,session?:array<string,mixed>}
     */
    public function startLogin(int $year, int $month): array
    {
        $this->assertConfigured();
        $this->assertPeriod($year, $month);

        $jar = new CookieJar();
        $client = $this->client($jar);

        // e-Claim ปัจจุบันบังคับ SSO → NHSO IAM (Keycloak)
        $ssoUrl = $this->url((string) config('cgd_eclaim.login_path'));
        $loginPage = $this->request($client, 'GET', $ssoUrl);
        $form = $this->extractFormById($loginPage['body'], 'kc-form-login', $loginPage['url'])
            ?? $this->extractLoginForm($loginPage['body'], $loginPage['url']);

        if ($form === null) {
            throw new RuntimeException(
                'ไม่พบฟอร์มเข้าสู่ระบบ NHSO IAM — ตรวจเครือข่ายถึง eclaim.nhso.go.th / iam.nhso.go.th หรือ CGD_ECLAIM_LOGIN_PATH'
            );
        }

        $payload = $form['fields'];
        $userKey = $this->guessField($payload, ['username', 'user', 'userid', 'login', 'userName', 'usr']);
        $passKey = $this->guessField($payload, ['password', 'pass', 'pwd', 'userPassword']);
        if (! $userKey || ! $passKey) {
            throw new RuntimeException('ไม่พบช่อง username/password ในหน้า NHSO IAM');
        }

        $payload[$userKey] = (string) config('cgd_eclaim.username');
        $payload[$passKey] = (string) config('cgd_eclaim.password');
        $payload['login'] = $payload['login'] ?? 'เข้าสู่ระบบ';
        $payload['credentialId'] = $payload['credentialId'] ?? '';

        $postUrl = $form['action'] ?: $loginPage['url'];
        $loginRes = $this->request($client, 'POST', $postUrl, [
            'form_params' => $payload,
            'headers' => ['Referer' => $loginPage['url']],
        ]);

        $state = [
            'year' => $year,
            'month' => $month,
            'cookies' => $this->exportCookies($jar),
            'started_at' => now()->toIso8601String(),
            'last_url' => $loginRes['url'],
        ];
        // เริ่ม login ใหม่ = เคลียร์คิวดาวน์โหลดชุดเก่า
        unset($state['pending_excel_links'], $state['download_dir'], $state['download_done'], $state['download_total']);

        return $this->resolveAuthStep($client, $jar, $state, $loginRes);
    }

    /**
     * @return array{status:string,message:string,session?:array<string,mixed>}
     */
    public function submitOtp(string $otp, ?string $deviceLabel = null): array
    {
        $otp = trim($otp);
        if (! preg_match('/^\d{6}$/', $otp)) {
            throw new RuntimeException('รหัส Authenticator ต้องเป็นตัวเลข 6 หลัก');
        }

        $state = $this->loadSession();
        $phase = $state['phase'] ?? null;
        if (! in_array($phase, ['awaiting_otp', 'configure_totp'], true)) {
            throw new RuntimeException('ยังไม่ได้เริ่ม login หรือ session หมดอายุ — กดเริ่มเข้าสู่ระบบใหม่');
        }

        $jar = $this->importCookies($state['cookies'] ?? []);
        $client = $this->client($jar);

        $fields = $state['otp_fields'] ?? [];
        if ($phase === 'configure_totp') {
            $fields['totp'] = $otp;
            if (! isset($fields['totpSecret']) && ! empty($state['totp_secret'])) {
                $fields['totpSecret'] = (string) $state['totp_secret'];
            }
            $fields['userLabel'] = $deviceLabel ?: ($fields['userLabel'] ?: 'Hospital App');
            if (! isset($fields['logout-sessions'])) {
                $fields['logout-sessions'] = 'on';
            }
        } else {
            $otpKey = $this->guessField($fields, [
                'otp', 'totp', 'token', 'gcode', 'google', 'authcode', 'authCode',
                'oneTimePassword', 'securityCode', 'code', 'pin',
            ]) ?: $this->firstEmptyTextField($fields);

            if (! $otpKey) {
                $fields['otp'] = $otp;
            } else {
                $fields[$otpKey] = $otp;
            }
            $fields['login'] = $fields['login'] ?? 'เข้าสู่ระบบ';
        }

        $action = (string) ($state['otp_action'] ?? $state['last_url'] ?? '');
        if ($action === '') {
            throw new RuntimeException('ไม่พบ URL สำหรับส่ง OTP — เริ่มเข้าสู่ระบบใหม่');
        }

        $res = $this->request($client, 'POST', $action, [
            'form_params' => $fields,
            'headers' => ['Referer' => $action],
        ]);

        $state['cookies'] = $this->exportCookies($jar);
        $state['last_url'] = $res['url'];

        try {
            return $this->resolveAuthStep($client, $jar, $state, $res, true);
        } catch (RuntimeException $e) {
            if ($this->looksLikeConfigureTotp($res['body'], $res['url']) || $this->looksLikeOtpChallenge($res['body'], $res['url'])) {
                $this->captureOtpFormState($state, $res);
                $this->storeSession($state);
            }
            throw $e;
        }
    }

    /**
     * @param  array<string,mixed>  $state
     * @param  array{body:string,url:string,status:int}  $res
     * @return array{status:string,message:string,session?:array<string,mixed>}
     */
    private function resolveAuthStep(Client $client, CookieJar $jar, array $state, array $res, bool $fromOtpSubmit = false): array
    {
        $state['cookies'] = $this->exportCookies($jar);
        $state['last_url'] = $res['url'];

        if ($this->looksLikeConfigureTotp($res['body'], $res['url'])) {
            $this->captureOtpFormState($state, $res);
            $state['phase'] = 'configure_totp';
            $this->storeSession($state);

            if ($fromOtpSubmit) {
                throw new RuntimeException(
                    $this->extractErrorHint($res['body'])
                        ?: 'รหัส Authenticator ไม่ถูกต้องหรือยังไม่ได้เพิ่มรหัสลับในแอป — ลองใหม่'
                );
            }

            return [
                'status' => 'configure_totp',
                'message' => 'บัญชี SSO ต้องตั้งค่า Google Authenticator ครั้งแรก — เพิ่มรหัสลับในแอป แล้วกรอก OTP 6 หลัก',
                'session' => $this->publicSession($state),
            ];
        }

        if ($this->looksLikeOtpChallenge($res['body'], $res['url'])) {
            $this->captureOtpFormState($state, $res);
            $state['phase'] = 'awaiting_otp';
            unset($state['totp_secret']);
            $this->storeSession($state);

            if ($fromOtpSubmit) {
                throw new RuntimeException(
                    $this->extractErrorHint($res['body'])
                        ?: 'รหัส Authenticator ไม่ถูกต้องหรือหมดอายุ — ลองรหัสชุดใหม่'
                );
            }

            return [
                'status' => 'awaiting_otp',
                'message' => 'ระบบถามรหัส Google Authenticator — กรอกรหัส 6 หลักแล้วกดยืนยัน',
                'session' => $this->publicSession($state),
            ];
        }

        if ($this->looksLoggedIn($res['body'], $res['url']) || $this->canOpenValidation($client)) {
            // ยืนยันอีกครั้งว่าเข้าหน้า Validation OFC ได้จริงหลัง login
            try {
                $validationPage = $this->openValidationOfcPage($client);
                $state['validation_url'] = $validationPage['url'];
                $state['cookies'] = $this->exportCookies($jar);
            } catch (RuntimeException $e) {
                throw new RuntimeException(
                    'Login ผ่านแล้ว แต่ยังเปิดหน้า Validation OFC ไม่ได้: '.$e->getMessage()
                );
            }

            $state['phase'] = 'authenticated';
            unset($state['otp_action'], $state['otp_fields'], $state['totp_secret']);
            $this->storeSession($state);

            return [
                'status' => 'authenticated',
                'message' => 'เข้าสู่ระบบสำเร็จ และเปิดหน้า Validation OFC ได้แล้ว — กดดาวน์โหลด REP ของเดือนที่เลือกได้',
                'session' => $this->publicSession($state),
            ];
        }

        $hint = $this->extractErrorHint($res['body'])
            ?: 'เข้าสู่ระบบไม่สำเร็จ — ตรวจ username/password หรือ OTP';
        throw new RuntimeException($hint);
    }

    /**
     * @param  array<string,mixed>  $state
     * @param  array{body:string,url:string,status:int}  $res
     */
    private function captureOtpFormState(array &$state, array $res): void
    {
        $form = $this->extractFormById($res['body'], 'kc-totp-settings-form', $res['url'])
            ?? $this->extractFormById($res['body'], 'kc-otp-login-form', $res['url'])
            ?? $this->extractForm($res['body'], $res['url']);

        $state['otp_action'] = $form['action'] ?? $res['url'];
        $state['otp_fields'] = $form['fields'] ?? [];
        if (! empty($state['otp_fields']['totpSecret'])) {
            $state['totp_secret'] = $state['otp_fields']['totpSecret'];
        } elseif ($secret = $this->extractTotpSecretFromHtml($res['body'])) {
            $state['totp_secret'] = $secret;
            $state['otp_fields']['totpSecret'] = $secret;
        }
    }

    /**
     * @return array{
     *   downloaded:list<array{filename:string,path:string}>,
     *   imported:list<array{filename:string,document_no:?string,updated:bool,batch_id:int}>,
     *   failures:list<string>,
     *   pending:int,
     *   message:string
     * }
     */
    public function downloadAndImport(CgdStmImportService $importer, ?string $notes = null, int $batchSize = 5): array
    {
        // batchSize = 0 หมายถึงดาวน์โหลดทุกไฟล์ที่เหลือในครั้งเดียว
        $downloadAll = $batchSize <= 0;
        $timeLimit = $downloadAll ? 1800 : 600;
        if (function_exists('set_time_limit')) {
            @set_time_limit($timeLimit);
        }
        @ini_set('max_execution_time', (string) $timeLimit);
        @ini_set('memory_limit', '1024M');
        if (! $downloadAll) {
            $batchSize = max(1, min(50, $batchSize));
        }

        $state = $this->loadSession();
        if (($state['phase'] ?? null) !== 'authenticated') {
            throw new RuntimeException('ยังไม่ได้ login สำเร็จ — เริ่มเข้าสู่ระบบและกรอก OTP ก่อน');
        }

        $year = (int) $state['year'];
        $month = (int) $state['month'];
        $jar = $this->importCookies($state['cookies'] ?? []);
        $client = $this->client($jar);

        $pending = $state['pending_excel_links'] ?? null;
        $baseUrl = (string) ($state['validation_url'] ?? $this->validationUrl());
        $dir = (string) ($state['download_dir'] ?? '');
        $skippedWrongName = (int) ($state['download_skipped_name'] ?? 0);

        // ถ้ายังไม่มีคิวไฟล์ — เปิดหน้า Validation แล้วเก็บเฉพาะลิงก์ Excel File
        if (! is_array($pending) || $pending === []) {
            $page = $this->openValidationOfcPage($client, $year, $month);
            $html = $page['body'];
            $baseUrl = $page['url'];

            $this->storeDebugHtml('validation_after_show_'.sprintf('%04d%02d', $year, $month), $html);
            $this->storeDebugMeta('validation_after_show_'.sprintf('%04d%02d', $year, $month), [
                'url' => $baseUrl,
                'year' => $year,
                'month' => $month,
                'excel_links' => $this->extractExcelExportLinks($html, $baseUrl),
            ]);

            $allLinks = $this->extractExcelExportLinks($html, $baseUrl);
            [$pending, $skippedNow] = $this->partitionAllowedRepLinks($allLinks);
            $skippedWrongName = $skippedNow;

            if ($pending === []) {
                if ($allLinks !== []) {
                    throw new RuntimeException(
                        'พบไฟล์ Excel '.$skippedWrongName.' รายการ แต่ไม่มีชื่อขึ้นต้นด้วย '
                        .CgdClaimFilenameGuard::repPrefixHint($this->scheme).' — ข้ามทั้งหมด'
                    );
                }
                if ($this->validationResultTableEmpty($html)) {
                    throw new RuntimeException(
                        'แสดงข้อมูลเดือน '.sprintf('%02d/%d', $month, $year)
                        .' สำเร็จ แต่ยังไม่มีรายการในตาราง (เดือนนี้อาจยังไม่มีไฟล์บน e-Claim)'
                    );
                }
                throw new RuntimeException(
                    'พบตารางผลลัพธ์แล้ว แต่ไม่พบลิงก์คอลัมน์ Excel File (InvoiceReportExcelAction) — ดู debug ที่ storage/app/private/finance/cgd-stm/debug/'
                );
            }

            $storageBase = \App\Support\Finance\ClaimScheme::storageDir($this->scheme);
            $dir = $storageBase.'/nhso/'.$year.sprintf('%02d', $month).'/'.now()->format('Ymd_His');
            Storage::disk('local')->makeDirectory($dir);
            $state['download_dir'] = $dir;
            $state['pending_excel_links'] = $pending;
            $state['download_total'] = count($pending);
            $state['download_done'] = 0;
            $state['download_skipped_name'] = $skippedWrongName;
        } else {
            // กรองซ้ำกรณีคิวเก่าที่ยังไม่ได้เช็คชื่อไฟล์
            [$pending, $extraSkipped] = $this->partitionAllowedRepLinks($pending);
            $skippedWrongName += $extraSkipped;
            $state['download_skipped_name'] = $skippedWrongName;
            if ($extraSkipped > 0) {
                $state['pending_excel_links'] = $pending;
                $state['download_total'] = max(0, (int) ($state['download_total'] ?? 0) - $extraSkipped);
            }
        }

        if ($dir === '') {
            $storageBase = \App\Support\Finance\ClaimScheme::storageDir($this->scheme);
            $dir = $storageBase.'/nhso/'.$year.sprintf('%02d', $month).'/'.now()->format('Ymd_His');
            Storage::disk('local')->makeDirectory($dir);
            $state['download_dir'] = $dir;
        }

        $take = $downloadAll ? count($pending) : $batchSize;
        $chunk = array_splice($pending, 0, $take);
        $downloaded = [];
        $imported = [];
        $failures = [];

        foreach ($chunk as $link) {
            $filename = $link['filename'];

            // ข้ามดาวน์โหลดถ้าชื่อไม่ตรง prefix (กันคิวเก่า / ชื่อเปลี่ยนตอนดาวน์โหลด)
            if (! CgdClaimFilenameGuard::isAllowedRep($filename, $this->scheme)) {
                $skippedWrongName++;
                continue;
            }

            try {
                $bin = $this->request($client, 'GET', $link['url'], [
                    'raw' => true,
                    'headers' => ['Referer' => $baseUrl],
                ]);
                $body = $bin['body'];
                if ($body === '' || ! $this->looksLikeSpreadsheetBinary($body)) {
                    throw new RuntimeException('ได้หน้าเว็บแทนไฟล์ Excel — ข้ามรายการนี้');
                }

                // บังคับนามสกุล .xls ถ้าเป็น OLE จริง
                if (! preg_match('/\.(xls|xlsx|csv)$/i', $filename)) {
                    $filename = preg_replace('/\.ecd$/i', '', $filename).'.xls';
                }

                if (! CgdClaimFilenameGuard::isAllowedRep($filename, $this->scheme)) {
                    $skippedWrongName++;
                    continue;
                }

                $storedRel = $dir.'/'.$filename;
                Storage::disk('local')->put($storedRel, $body);
                $absolute = Storage::disk('local')->path($storedRel);
                $downloaded[] = ['filename' => $filename, 'path' => $storedRel];

                $result = $importer->importFromAbsolutePath(
                    $absolute,
                    $filename,
                    $storedRel,
                    $notes ?: 'ดาวน์โหลดจาก e-Claim NHSO '.strtoupper($this->maininscl()).' '.sprintf('%02d/%d', $month, $year),
                    $this->scheme,
                );

                $imported[] = [
                    'filename' => $filename,
                    'document_no' => $result['batch']->document_no,
                    'updated' => (bool) $result['updated'],
                    'batch_id' => (int) $result['batch']->id,
                ];
            } catch (\Throwable $e) {
                $failures[] = $filename.' — '.$e->getMessage();
                Log::warning('CGD NHSO download/import failed', [
                    'file' => $filename,
                    'url' => $link['url'],
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $state['cookies'] = $this->exportCookies($jar);
        $state['phase'] = 'authenticated';
        $state['validation_url'] = $baseUrl;
        $state['pending_excel_links'] = array_values($pending);
        $state['download_done'] = (int) ($state['download_done'] ?? 0) + count($chunk);
        $state['download_skipped_name'] = $skippedWrongName;
        $total = (int) ($state['download_total'] ?? ($state['download_done'] + count($pending)));
        $state['download_total'] = $total;
        $this->storeSession($state);

        $remaining = count($pending);
        $msg = 'นำเข้า Excel จากคอลัมน์ Excel File · ชุดนี้ '.count($imported).'/'.count($chunk).' ไฟล์';
        $msg .= ' · รวมแล้ว '.$state['download_done'].'/'.$total;
        if ($skippedWrongName > 0) {
            $msg .= ' · ข้ามชื่อไม่ตรง '.CgdClaimFilenameGuard::repPrefixHint($this->scheme).' '.$skippedWrongName.' ไฟล์';
        }
        if ($remaining > 0) {
            $msg .= " · เหลือ {$remaining} ไฟล์ กดดาวน์โหลดอีกครั้งเพื่อทำต่อ";
        } else {
            $msg .= ' · ครบทุกไฟล์แล้ว';
            unset($state['pending_excel_links'], $state['download_dir'], $state['download_skipped_name']);
            $this->storeSession($state);
        }
        if ($failures !== []) {
            $msg .= ' · ไม่สำเร็จ '.count($failures).' ไฟล์';
        }

        return [
            'downloaded' => $downloaded,
            'imported' => $imported,
            'failures' => $failures,
            'pending' => $remaining,
            'skipped_name' => $skippedWrongName,
            'message' => $msg,
        ];
    }

    public function validationUrl(): string
    {
        if (\App\Support\Finance\ClaimScheme::exists($this->scheme)) {
            return $this->url(\App\Support\Finance\ClaimScheme::validationPath($this->scheme));
        }

        return $this->url((string) config('cgd_eclaim.validation_path'));
    }

    /**
     * เปิดหน้า ValidationMainAction ตาม maininscl ของ scheme (ofc / lgo)
     *
     * @return array{body:string,url:string,status:int}
     */
    private function openValidationOfcPage(Client $client, ?int $year = null, ?int $month = null): array
    {
        $maininscl = $this->maininscl();
        $validationUrl = $this->validationUrl();
        // บังคับ maininscl ตาม scheme
        if (! str_contains(strtolower($validationUrl), 'maininscl=')) {
            $validationUrl .= (str_contains($validationUrl, '?') ? '&' : '?').'maininscl='.$maininscl;
        } else {
            $validationUrl = preg_replace('/maininscl=[^&]*/i', 'maininscl='.$maininscl, $validationUrl) ?: $validationUrl;
        }

        $page = $this->request($client, 'GET', $validationUrl, [
            'headers' => ['Referer' => $this->url('/webComponent/')],
        ]);

        if ($this->looksLikeValidationErrorPage($page['body'])
            || $this->looksLikeLoginGate($page['body'], $page['url'])
            || ! $this->looksLikeValidationContent($page['body'], $page['url'])) {
            $this->storeDebugHtml('validation_unauthorized', $page['body']);
            throw new RuntimeException(
                'ยังเข้าหน้า Validation OFC ไม่ได้ (session หมดหรือยัง login ไม่สำเร็จ) — เริ่มเข้าสู่ระบบใหม่แล้วกรอก OTP อีกครั้ง'
            );
        }

        if ($year && $month) {
            $page = $this->filterValidationByPeriod($client, $page, $year, $month);
            if ($this->looksLikeValidationErrorPage($page['body'])
                || $this->looksLikeLoginGate($page['body'], $page['url'])
                || ! $this->looksLikeValidationContent($page['body'], $page['url'])) {
                $this->storeDebugHtml('validation_after_period', $page['body']);
                throw new RuntimeException('เลือกเดือนบนหน้า Validation OFC ไม่สำเร็จ — session อาจหลุด');
            }
        }

        return $page;
    }

    /**
     * จำลองการเลือกเดือนแล้วกด "แสดงข้อมูล"
     * บนเว็บจริงจะไปที่ ValidationMainAction.do?...
     *
     * @param  array{body:string,url:string,status:int}  $page
     * @return array{body:string,url:string,status:int}
     */
    private function filterValidationByPeriod(Client $client, array $page, int $year, int $month): array
    {
        $this->storeDebugHtml('validation_before_show_'.sprintf('%04d%02d', $year, $month), $page['body']);
        $this->storeDebugMeta('validation_before_show_'.sprintf('%04d%02d', $year, $month), [
            'url' => $page['url'],
            'forms' => $this->summarizeForms($page['body'], $page['url']),
        ]);

        $periodForm = $this->extractPeriodForm($page['body'], $page['url']);
        if (! $periodForm) {
            // fallback: GET ตรง ๆ แบบที่ browser แสดงหลังกดแสดงข้อมูล
            return $this->request($client, 'GET', $this->buildShowDataUrl($page['url'] ?: $this->validationUrl(), $year, $month), [
                'headers' => ['Referer' => $page['url']],
            ]);
        }

        $fields = $periodForm['fields'];
        $this->applyPeriodFields($fields, $year, $month, $periodForm['select_options'] ?? []);

        // สำคัญ: Struts มักใช้ name ของปุ่ม submit เป็นตัวเลือก action เช่น method=แสดงข้อมูล
        $submit = $this->pickShowDataSubmit($periodForm['submits'] ?? []);
        if ($submit) {
            $fields[$submit['name']] = $submit['value'];
        } elseif (! isset($fields['method'])) {
            $fields['method'] = 'แสดงข้อมูล';
        }

        if (! isset($fields['maininscl']) || $fields['maininscl'] === '') {
            $fields['maininscl'] = $this->maininscl();
        }

        // form action="?" บนเว็บ = submit กลับ ValidationMainAction.do ปัจจุบัน
        $action = $periodForm['action'] ?: $page['url'];
        if (
            ! $action
            || str_ends_with($action, '/?')
            || str_ends_with($action, '/validation/?')
            || ! str_contains(strtolower($action), 'validationmainaction.do')
        ) {
            $action = $this->url('/webComponent/validation/ValidationMainAction.do');
        }

        $httpMethod = strtoupper($periodForm['method'] ?? 'GET');
        if (! in_array($httpMethod, ['GET', 'POST'], true)) {
            $httpMethod = 'GET';
        }

        $this->storeDebugMeta('validation_show_payload_'.sprintf('%04d%02d', $year, $month), [
            'http_method' => $httpMethod,
            'action' => $action,
            'fields' => $fields,
            'submit' => $submit,
        ]);

        if ($httpMethod === 'GET') {
            $url = $this->mergeQuery($action, $fields);

            return $this->request($client, 'GET', $url, [
                'headers' => ['Referer' => $page['url']],
            ]);
        }

        // POST พร้อมคง maininscl บน query ด้วย
        $postUrl = $action;
        if (! str_contains(strtolower($postUrl), 'maininscl=')) {
            $postUrl = $this->mergeQuery($postUrl, ['maininscl' => $this->maininscl()]);
        }

        return $this->request($client, 'POST', $postUrl, [
            'form_params' => $fields,
            'headers' => ['Referer' => $page['url']],
        ]);
    }

    /**
     * @return array{name:string,value:string}|null
     */
    private function pickShowDataSubmit(array $submits): ?array
    {
        $preferred = ['แสดงข้อมูล', 'ค้นหา', 'search', 'query', 'list', 'แสดง', 'ตกลง', 'ok'];
        foreach ($preferred as $want) {
            foreach ($submits as $submit) {
                $name = (string) ($submit['name'] ?? '');
                $value = (string) ($submit['value'] ?? '');
                if ($name === '' && $value === '') {
                    continue;
                }
                if (strcasecmp($value, $want) === 0 || str_contains(mb_strtolower($value), mb_strtolower($want))) {
                    return [
                        'name' => $name !== '' ? $name : 'method',
                        'value' => $value !== '' ? $value : $want,
                    ];
                }
                if (strcasecmp($name, $want) === 0) {
                    return [
                        'name' => $name,
                        'value' => $value !== '' ? $value : 'แสดงข้อมูล',
                    ];
                }
            }
        }

        // ถ้ามี submit เดียวที่มี name ให้ใช้ตัวนั้น
        foreach ($submits as $submit) {
            if (! empty($submit['name'])) {
                return [
                    'name' => (string) $submit['name'],
                    'value' => (string) ($submit['value'] ?: 'แสดงข้อมูล'),
                ];
            }
        }

        return null;
    }

    private function buildShowDataUrl(string $url, int $year, int $month): string
    {
        $buddhist = $year + 543;
        $mm = sprintf('%02d', $month);

        return $this->mergeQuery($url, [
            'maininscl' => $this->maininscl(),
            'month' => $mm,
            'year' => (string) $buddhist,
            'yyyy' => (string) $buddhist,
            'mm' => $mm,
            'method' => 'แสดงข้อมูล',
        ]);
    }

    /**
     * @param  array<string,scalar|null>  $params
     */
    private function mergeQuery(string $url, array $params): string
    {
        $parts = parse_url($url) ?: [];
        parse_str($parts['query'] ?? '', $query);
        foreach ($params as $k => $v) {
            if ($v === null) {
                continue;
            }
            $query[$k] = $v;
        }
        $base = ($parts['scheme'] ?? 'https').'://'.($parts['host'] ?? 'eclaim.nhso.go.th')
            .(isset($parts['port']) ? ':'.$parts['port'] : '')
            .($parts['path'] ?? '/webComponent/validation/ValidationMainAction.do');

        return $base.'?'.http_build_query($query);
    }

    /**
     * @return array{
     *   action:?string,
     *   method:string,
     *   fields:array<string,string>,
     *   submits:list<array{name:?string,value:string}>,
     *   select_options:array<string,list<string>>
     * }|null
     */
    private function extractPeriodForm(string $html, string $baseUrl): ?array
    {
        if (! preg_match_all('/<form\b[^>]*>.*?<\/form>/is', $html, $formMatches)) {
            return null;
        }

        $best = null;
        $bestScore = -1;
        foreach ($formMatches[0] as $formHtml) {
            if (str_contains($formHtml, 'name="frmErr"') || str_contains($formHtml, "name='frmErr'")) {
                continue;
            }
            $parsed = $this->parseFormHtmlDetailed($formHtml, $baseUrl);
            if ($parsed === null || ($parsed['fields'] === [] && $parsed['submits'] === [])) {
                continue;
            }

            $score = 0;
            foreach (array_keys($parsed['fields']) as $key) {
                $lk = strtolower((string) $key);
                if (str_contains($lk, 'month') || $lk === 'mm') {
                    $score += 40;
                }
                if (str_contains($lk, 'year') || $lk === 'yyyy' || $lk === 'yy') {
                    $score += 40;
                }
                if (str_contains($lk, 'period') || str_contains($lk, 'yyyymm')) {
                    $score += 50;
                }
                if (str_contains($lk, 'maininscl')) {
                    $score += 25;
                }
            }
            foreach ($parsed['submits'] as $submit) {
                $blob = mb_strtolower(($submit['name'] ?? '').' '.($submit['value'] ?? ''));
                if (str_contains($blob, 'แสดงข้อมูล') || str_contains($blob, 'search') || str_contains($blob, 'ค้นหา')) {
                    $score += 80;
                }
            }
            if (str_contains(mb_strtolower($formHtml), 'แสดงข้อมูล')) {
                $score += 60;
            }
            if (str_contains(strtolower($parsed['action'] ?? ''), 'validationmainaction')) {
                $score += 30;
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $parsed;
            }
        }

        return $bestScore >= 40 ? $best : null;
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function summarizeForms(string $html, string $baseUrl): array
    {
        if (! preg_match_all('/<form\b[^>]*>.*?<\/form>/is', $html, $formMatches)) {
            return [];
        }

        $out = [];
        foreach ($formMatches[0] as $i => $formHtml) {
            $parsed = $this->parseFormHtmlDetailed($formHtml, $baseUrl);
            if (! $parsed) {
                continue;
            }
            $out[] = [
                'index' => $i,
                'action' => $parsed['action'],
                'method' => $parsed['method'],
                'fields' => $parsed['fields'],
                'submits' => $parsed['submits'],
                'select_options' => $parsed['select_options'],
            ];
        }

        return $out;
    }

    private function storeDebugMeta(string $label, array $meta): void
    {
        try {
            $rel = 'finance/cgd-stm/debug/'.$label.'_'.now()->format('Ymd_His').'.json';
            Storage::disk('local')->put($rel, json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        } catch (\Throwable) {
            // ignore
        }
    }

    private function validationResultTableEmpty(string $html): bool
    {
        if (! preg_match('/<table[^>]*id=["\']content2["\'][^>]*>(.*?)<\/table>/is', $html, $m)) {
            return true;
        }

        return ! preg_match('/<tbody\b[^>]*>\s*<tr\b/is', $m[1]);
    }

    /**
     * @param  list<array{url:string,filename:string}>  $links
     * @return array{0:list<array{url:string,filename:string}>,1:int}
     */
    private function partitionAllowedRepLinks(array $links): array
    {
        $allowed = [];
        $skipped = 0;
        foreach ($links as $link) {
            $name = (string) ($link['filename'] ?? '');
            if (CgdClaimFilenameGuard::isAllowedRep($name, $this->scheme)) {
                $allowed[] = $link;
            } else {
                $skipped++;
                Log::info('CGD NHSO skip Excel (filename prefix)', [
                    'filename' => $name,
                    'required_prefix' => CgdClaimFilenameGuard::repPrefixHint($this->scheme),
                    'scheme' => $this->scheme,
                ]);
            }
        }

        return [$allowed, $skipped];
    }

    /**
     * ดึงเฉพาะคอลัมน์ Excel File:
     * /webComponent/invoice/InvoiceReportExcelAction.do?status=excel&filename=...
     * (ข้ามตัวเลขผ่าน/ไม่ผ่าน และไฟล์ .ecd จาก GetFileAction)
     *
     * @return list<array{url:string,filename:string}>
     */
    private function extractExcelExportLinks(string $html, string $baseUrl): array
    {
        $scope = $html;
        if (preg_match('/<table[^>]*id=["\']content2["\'][^>]*>(.*?)<\/table>/is', $html, $table)) {
            $scope = $table[1];
        }

        $links = [];
        if (! preg_match_all('/<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)<\/a>/is', $scope, $matches, PREG_SET_ORDER)) {
            return [];
        }

        foreach ($matches as $m) {
            $href = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $text = trim(html_entity_decode(strip_tags($m[2]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            $abs = $this->absolutize($href, $baseUrl);
            $hay = mb_strtolower($abs.' '.$text);

            if (! str_contains($hay, 'invoicereportexcelaction.do')) {
                continue;
            }
            if (! str_contains($hay, 'status=excel') && ! str_contains($hay, 'download excel')) {
                // ยังรับถ้าเป็น InvoiceReportExcelAction ชัดเจน
                if (! str_contains($hay, 'invoicereportexcelaction')) {
                    continue;
                }
            }

            $query = [];
            parse_str(parse_url($abs, PHP_URL_QUERY) ?: '', $query);
            $baseName = (string) ($query['filename'] ?? $query['fileName'] ?? '');
            $baseName = $baseName !== '' ? basename($baseName) : '';
            $baseName = preg_replace('/\.ecd$/i', '', $baseName) ?: ('invoice_'.substr(sha1($abs), 0, 10));
            $filename = $baseName.'.xls';

            $links[$abs] = [
                'url' => $abs,
                'filename' => $filename,
            ];
        }

        return array_values($links);
    }

    private function looksLikeValidationErrorPage(string $html): bool
    {
        $hay = mb_strtolower($html);

        return str_contains($hay, 'error page')
            || str_contains($hay, 'name="frmerr"')
            || str_contains($hay, "name='frmerr'")
            || (str_contains($hay, 'ไม่สามารถ') && str_contains($hay, 'เข้าสู่ระบบ'));
    }

    private function looksLikeLoginGate(string $html, string $url): bool
    {
        $hay = mb_strtolower($html.' '.$url);
        if (str_contains($hay, 'kc-form-login') || str_contains($hay, 'loginssaction') || str_contains($hay, 'openid-connect/auth')) {
            return true;
        }

        return str_contains($hay, 'iam.nhso.go.th') && str_contains($hay, 'login');
    }

    private function storeDebugHtml(string $label, string $html): void
    {
        try {
            $rel = 'finance/cgd-stm/debug/'.$label.'_'.now()->format('Ymd_His').'.html';
            Storage::disk('local')->put($rel, $html);
        } catch (\Throwable) {
            // ignore
        }
    }

    public function currentSession(): ?array
    {
        $state = Cache::get($this->cacheKey());
        if (! is_array($state)) {
            return null;
        }

        return $this->publicSession($state);
    }

    public function clearSession(): void
    {
        Cache::forget($this->cacheKey());
    }

    private function assertConfigured(): void
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException(
                'ยังไม่ได้ตั้งค่า CGD_ECLAIM_USERNAME / CGD_ECLAIM_PASSWORD ในไฟล์ .env'
            );
        }
    }

    private function assertPeriod(int $year, int $month): void
    {
        if ($year < 2000 || $year > 2100 || $month < 1 || $month > 12) {
            throw new RuntimeException('เดือน/ปี ไม่ถูกต้อง');
        }
    }

    private function client(CookieJar $jar): Client
    {
        return new Client([
            'cookies' => $jar,
            'timeout' => (int) config('cgd_eclaim.timeout', 90),
            'connect_timeout' => 20,
            'http_errors' => false,
            'allow_redirects' => [
                'max' => 8,
                'track_redirects' => true,
            ],
            'headers' => [
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language' => 'th-TH,th;q=0.9,en;q=0.8',
            ],
            'verify' => (bool) config('cgd_eclaim.verify_ssl', false),
        ]);
    }

    /**
     * @param  array<string,mixed>  $options
     * @return array{body:string,url:string,status:int}
     */
    private function request(Client $client, string $method, string $url, array $options = []): array
    {
        $raw = (bool) ($options['raw'] ?? false);
        unset($options['raw']);

        $res = $client->request($method, $url, $options);
        $effective = $url;
        $hist = $res->getHeader('X-Guzzle-Redirect-History');
        if ($hist !== []) {
            $effective = (string) end($hist);
        }

        return [
            'body' => (string) $res->getBody(),
            'url' => $effective,
            'status' => $res->getStatusCode(),
        ];
    }

    private function url(string $path): string
    {
        if (Str::startsWith($path, ['http://', 'https://'])) {
            return $path;
        }

        return rtrim((string) config('cgd_eclaim.base_url'), '/').'/'.ltrim($path, '/');
    }

    /**
     * @return array{action:?string,fields:array<string,string>}|null
     */
    private function extractFormById(string $html, string $formId, string $baseUrl): ?array
    {
        $id = preg_quote($formId, '/');
        if (! preg_match('/<form\b[^>]*\bid=["\']'.$id.'["\'][^>]*>.*?<\/form>/is', $html, $m)
            && ! preg_match('/<form\b[^>]*\bid=["\']'.$id.'["\'][^>]*>.*$/is', $html, $m)) {
            return null;
        }

        return $this->parseFormHtml($m[0], $baseUrl);
    }

    /**
     * @return array{action:?string,fields:array<string,string>}|null
     */
    private function extractLoginForm(string $html, string $baseUrl): ?array
    {
        return $this->extractFormById($html, 'kc-form-login', $baseUrl)
            ?? $this->extractForm($html, $baseUrl);
    }

    /**
     * @return array{action:?string,fields:array<string,string>}|null
     */
    private function extractForm(string $html, string $baseUrl): ?array
    {
        if (! preg_match_all('/<form\b[^>]*>.*?<\/form>/is', $html, $formMatches)) {
            return null;
        }

        $best = null;
        $bestScore = -1;

        foreach ($formMatches[0] as $formHtml) {
            $parsed = $this->parseFormHtml($formHtml, $baseUrl);
            if ($parsed === null || $parsed['fields'] === []) {
                continue;
            }

            $fields = $parsed['fields'];
            $score = count($fields);
            $blob = strtolower(implode(' ', array_keys($fields)).' '.($parsed['action'] ?? ''));
            if ($this->guessField($fields, ['password', 'pass', 'pwd'])) {
                $score += 50;
            }
            if ($this->guessField($fields, ['username', 'user', 'userid'])) {
                $score += 30;
            }
            if ($this->guessField($fields, ['otp', 'totp', 'token', 'authcode', 'code'])) {
                $score += 40;
            }
            if (str_contains($blob, 'login') || str_contains($blob, 'authenticate')) {
                $score += 10;
            }
            // ข้ามฟอร์ม error ของ e-Claim
            if (str_contains($formHtml, 'name="frmErr"') || str_contains($formHtml, "name='frmErr'")) {
                $score -= 100;
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $parsed;
            }
        }

        return $bestScore >= 0 ? $best : null;
    }

    /**
     * @return array{action:?string,fields:array<string,string>}|null
     */
    private function parseFormHtml(string $formHtml, string $baseUrl): ?array
    {
        $detailed = $this->parseFormHtmlDetailed($formHtml, $baseUrl);
        if ($detailed === null) {
            return null;
        }

        return [
            'action' => $detailed['action'],
            'fields' => $detailed['fields'],
        ];
    }

    /**
     * @return array{
     *   action:?string,
     *   method:string,
     *   fields:array<string,string>,
     *   submits:list<array{name:?string,value:string}>,
     *   select_options:array<string,list<string>>
     * }|null
     */
    private function parseFormHtmlDetailed(string $formHtml, string $baseUrl): ?array
    {
        $action = null;
        if (preg_match('/<form\b[^>]*\baction=["\']([^"\']*)["\']/i', $formHtml, $m)) {
            $action = $this->absolutize(html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'), $baseUrl);
        } elseif (preg_match('/<form\b[^>]*>/i', $formHtml)) {
            // action ว่าง = submit ไป path ปัจจุบัน (ตามที่เว็บไป ValidationMainAction.do?)
            $action = $this->url('/webComponent/validation/ValidationMainAction.do');
        }

        $method = 'GET';
        if (preg_match('/<form\b[^>]*\bmethod=["\']([^"\']+)["\']/i', $formHtml, $mm)) {
            $method = strtoupper($mm[1]);
        }

        $fields = [];
        $submits = [];
        if (preg_match_all('/<input\b[^>]*>/i', $formHtml, $inputs)) {
            foreach ($inputs[0] as $input) {
                $type = 'text';
                if (preg_match('/\btype=["\']([^"\']+)["\']/i', $input, $typeM)) {
                    $type = strtolower($typeM[1]);
                }
                $name = null;
                if (preg_match('/\bname=["\']([^"\']+)["\']/i', $input, $nameM)) {
                    $name = $nameM[1];
                }
                $value = '';
                if (preg_match('/\bvalue=["\']([^"\']*)["\']/i', $input, $valM)) {
                    $value = html_entity_decode($valM[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                }

                if (in_array($type, ['submit', 'image'], true)) {
                    $submits[] = ['name' => $name, 'value' => $value !== '' ? $value : 'Submit'];
                    continue;
                }
                if (in_array($type, ['button', 'file', 'reset'], true)) {
                    continue;
                }
                if ($name === null) {
                    continue;
                }
                $fields[$name] = $value;
            }
        }

        // <button type="submit">แสดงข้อมูล</button>
        if (preg_match_all('/<button\b([^>]*)>(.*?)<\/button>/is', $formHtml, $buttons, PREG_SET_ORDER)) {
            foreach ($buttons as $btn) {
                $attrs = $btn[1];
                $label = trim(html_entity_decode(strip_tags($btn[2]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
                $type = 'submit';
                if (preg_match('/\btype=["\']([^"\']+)["\']/i', $attrs, $tm)) {
                    $type = strtolower($tm[1]);
                }
                if ($type !== 'submit') {
                    continue;
                }
                $name = null;
                if (preg_match('/\bname=["\']([^"\']+)["\']/i', $attrs, $nm)) {
                    $name = $nm[1];
                }
                $value = $label;
                if (preg_match('/\bvalue=["\']([^"\']*)["\']/i', $attrs, $vm)) {
                    $value = html_entity_decode($vm[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                }
                $submits[] = ['name' => $name, 'value' => $value !== '' ? $value : 'แสดงข้อมูล'];
            }
        }

        $selectOptions = [];
        if (preg_match_all('/<select\b[^>]*name=["\']([^"\']+)["\'][^>]*>.*?<\/select>/is', $formHtml, $selects, PREG_SET_ORDER)) {
            foreach ($selects as $sel) {
                $name = $sel[1];
                $options = [];
                if (preg_match_all('/<option\b[^>]*value=["\']([^"\']*)["\'][^>]*>/i', $sel[0], $opts)) {
                    foreach ($opts[1] as $optVal) {
                        $options[] = html_entity_decode($optVal, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                    }
                }
                $selectOptions[$name] = $options;

                $selected = '';
                if (preg_match('/<option\b[^>]*selected\b[^>]*value=["\']([^"\']*)["\']/i', $sel[0], $opt)
                    || preg_match('/<option\b[^>]*value=["\']([^"\']*)["\'][^>]*selected\b/i', $sel[0], $opt)
                    || preg_match('/<option\b[^>]*value=["\']([^"\']*)["\']/i', $sel[0], $opt)) {
                    $selected = html_entity_decode($opt[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                }
                $fields[$name] = $selected;
            }
        }

        return [
            'action' => $action,
            'method' => $method,
            'fields' => $fields,
            'submits' => $submits,
            'select_options' => $selectOptions,
        ];
    }

    private function looksLikeConfigureTotp(string $html, string $url): bool
    {
        $hay = mb_strtolower($html.' '.$url);

        return str_contains($hay, 'configure_totp')
            || str_contains($hay, 'kc-totp-settings-form')
            || str_contains($hay, 'ตั้งค่า mobile authenticator')
            || str_contains($hay, 'totpsecret');
    }

    private function extractTotpSecretFromHtml(string $html): ?string
    {
        if (preg_match('/name=["\']totpSecret["\'][^>]*value=["\']([^"\']+)["\']/i', $html, $m)
            || preg_match('/value=["\']([^"\']+)["\'][^>]*name=["\']totpSecret["\']/i', $html, $m)) {
            return html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        return null;
    }

    /**
     * @param  array<string,string>  $fields
     */
    private function guessField(array $fields, array $candidates): ?string
    {
        $keys = array_keys($fields);
        foreach ($candidates as $cand) {
            foreach ($keys as $key) {
                if (strcasecmp($key, $cand) === 0) {
                    return $key;
                }
            }
        }
        foreach ($candidates as $cand) {
            foreach ($keys as $key) {
                if (str_contains(strtolower($key), strtolower($cand))) {
                    return $key;
                }
            }
        }

        return null;
    }

    /**
     * @param  array<string,string>  $fields
     */
    private function firstEmptyTextField(array $fields): ?string
    {
        foreach ($fields as $key => $value) {
            if ($value === '' && ! preg_match('/pass|token|csrf|javax/i', $key)) {
                return $key;
            }
        }

        return null;
    }

    private function looksLikeOtpChallenge(string $html, string $url): bool
    {
        if ($this->looksLikeConfigureTotp($html, $url)) {
            return false;
        }

        $hay = mb_strtolower($html.' '.$url);
        if (str_contains($hay, 'kc-otp-login-form') || str_contains($hay, 'name="otp"') || str_contains($hay, "name='otp'")) {
            return true;
        }

        $needles = [
            'one-time', 'onetime', 'google auth',
            'รหัสยืนยัน', 'รหัส otp', 'รหัสผ่านครั้งเดียว', '2fa', 'two factor',
            'กรอกรหัสจากแอป', 'mobile authenticator',
        ];
        foreach ($needles as $n) {
            if (str_contains($hay, $n)) {
                return true;
            }
        }

        return false;
    }

    private function looksLoggedIn(string $html, string $url): bool
    {
        $hay = mb_strtolower($html.' '.$url);
        $iamHost = strtolower((string) config('cgd_eclaim.iam_host', 'iam.nhso.go.th'));
        if (str_contains($hay, $iamHost) && (str_contains($hay, 'login-actions') || str_contains($hay, 'openid-connect'))) {
            return false;
        }
        if (str_contains($hay, 'logout') || str_contains($hay, 'ออกจากระบบ')) {
            return true;
        }
        if (str_contains($hay, 'validationmainaction') || str_contains($hay, 'maininscl='.$this->maininscl())) {
            return true;
        }
        if (str_contains($hay, 'ผลการตอบกลับ') || str_contains($hay, 'ตรวจสอบ rep')) {
            return true;
        }
        // OAuth callback กลับ e-Claim (มี authorization code)
        if (str_contains(strtolower($url), 'eclaim.nhso.go.th')
            && (str_contains($url, 'code=') || str_contains($url, 'LoginAction.do'))) {
            return true;
        }

        return false;
    }

    private function canOpenValidation(Client $client): bool
    {
        try {
            $res = $this->request($client, 'GET', $this->validationUrl());
            if ($res['status'] >= 400) {
                return false;
            }
            if ($this->looksLikeValidationErrorPage($res['body']) || $this->looksLikeLoginGate($res['body'], $res['url'])) {
                return false;
            }
            if ($this->looksLikeOtpChallenge($res['body'], $res['url']) || $this->looksLikeConfigureTotp($res['body'], $res['url'])) {
                return false;
            }

            return $this->looksLikeValidationContent($res['body'], $res['url']);
        } catch (\Throwable) {
            return false;
        }
    }

    private function looksLikeValidationContent(string $html, string $url): bool
    {
        if ($this->looksLikeValidationErrorPage($html)) {
            return false;
        }

        $hay = mb_strtolower($html.' '.$url);
        $signals = [
            'ผลการตอบกลับ',
            'ข้อมูลผลการ',
            're-download',
            'redownload',
            'statement',
            'validationmainaction',
            'maininscl='.$this->maininscl(),
            'maininscl=lgo',
            'maininscl=ofc',
        ];
        $hits = 0;
        foreach ($signals as $s) {
            if (str_contains($hay, $s)) {
                $hits++;
            }
        }

        // ต้องมีสัญญาณของหน้า validation จริง ไม่ใช่แค่เมนูด้านข้างของ Error Page
        return $hits >= 2 && ! str_contains($hay, 'error page');
    }

    private function extractErrorHint(string $html): ?string
    {
        if (preg_match('/kc-feedback-text[^>]*>(.*?)<\//is', $html, $m)
            || preg_match('/<(?:div|span|p|font|li)[^>]*(?:error|alert|danger|msg|warning)[^>]*>(.*?)<\//is', $html, $m)) {
            $text = trim(html_entity_decode(strip_tags($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            if ($text !== '') {
                return mb_substr($text, 0, 240);
            }
        }

        return null;
    }

    /**
     * @param  array<string,string>  $fields
     * @param  array<string,list<string>>  $selectOptions
     */
    private function applyPeriodFields(array &$fields, int $year, int $month, array $selectOptions = []): void
    {
        $ym = sprintf('%04d%02d', $year, $month);
        $ymBuddhist = sprintf('%04d%02d', $year + 543, $month);
        $y = (string) $year;
        $m = sprintf('%02d', $month);
        $mInt = (string) (int) $month; // e-Claim ใช้ 1-12 ไม่มี leading zero
        $buddhist = (string) ($year + 543);

        foreach ($fields as $key => $value) {
            $lk = strtolower($key);
            $options = $selectOptions[$key] ?? [];

            if (str_contains($lk, 'period') || str_contains($lk, 'yyyymm') || str_contains($lk, 'monthyear')) {
                $fields[$key] = $this->pickOptionValue($options, [$ymBuddhist, $ym, $buddhist.$m]) ?? $ymBuddhist;
                continue;
            }

            // e-Claim Validation ใช้ชื่อสั้น: ye = ปี พ.ศ., mo = เดือน
            if ($lk === 'ye' || str_contains($lk, 'year') || str_contains($lk, 'yyyy') || $lk === 'yy') {
                $useBuddhist = $lk === 'ye'
                    || ((int) $value > 2400)
                    || str_contains($lk, 'buddh')
                    || str_contains($lk, 'thai')
                    || $this->optionsLookBuddhist($options);
                $candidate = $useBuddhist ? $buddhist : $y;
                $fields[$key] = $this->pickOptionValue($options, [$candidate, $buddhist, $y]) ?? $candidate;
                continue;
            }

            if ($lk === 'mo' || str_contains($lk, 'month') || $lk === 'mm') {
                // options ของ mo เป็น "1".."12"
                $fields[$key] = $this->pickOptionValue($options, [$mInt, $m, (string) $month]) ?? $mInt;
            }
        }

        // บังคับตั้ง mo/ye ถ้ามีในฟอร์ม (กันพลาดชื่อสั้น)
        if (array_key_exists('mo', $fields)) {
            $fields['mo'] = $this->pickOptionValue($selectOptions['mo'] ?? [], [$mInt, $m]) ?? $mInt;
        }
        if (array_key_exists('ye', $fields)) {
            $fields['ye'] = $this->pickOptionValue($selectOptions['ye'] ?? [], [$buddhist, $y]) ?? $buddhist;
        }

        // อย่าเติม month/year ปลอมถ้าฟอร์มใช้ mo/ye อยู่แล้ว
        $hasMonth = array_key_exists('mo', $fields);
        $hasYear = array_key_exists('ye', $fields);
        foreach (array_keys($fields) as $key) {
            $lk = strtolower((string) $key);
            $hasMonth = $hasMonth || str_contains($lk, 'month') || $lk === 'mm';
            $hasYear = $hasYear || str_contains($lk, 'year') || $lk === 'yyyy' || $lk === 'yy';
        }
        if (! $hasMonth) {
            $fields['mo'] = $mInt;
        }
        if (! $hasYear) {
            $fields['ye'] = $buddhist;
        }

        // ลบ field ปลอมที่ server ไม่รู้จัก
        unset($fields['month'], $fields['year'], $fields['yyyy'], $fields['mm'], $fields['buddhaYear']);
    }

    /**
     * @param  list<string>  $options
     * @param  list<string>  $candidates
     */
    private function pickOptionValue(array $options, array $candidates): ?string
    {
        if ($options === []) {
            return $candidates[0] ?? null;
        }
        foreach ($candidates as $cand) {
            foreach ($options as $opt) {
                if ((string) $opt === (string) $cand) {
                    return (string) $opt;
                }
            }
        }
        // เทียบแบบไม่เอา leading zero
        foreach ($candidates as $cand) {
            foreach ($options as $opt) {
                if ((string) ((int) $opt) === (string) ((int) $cand) && is_numeric($opt) && is_numeric($cand)) {
                    return (string) $opt;
                }
            }
        }

        return null;
    }

    /**
     * @param  list<string>  $options
     */
    private function optionsLookBuddhist(array $options): bool
    {
        foreach ($options as $opt) {
            if (is_numeric($opt) && (int) $opt > 2400) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<array{url:string,filename:string}>
     */
    private function extractDownloadLinks(string $html, string $baseUrl, ?int $year, ?int $month): array
    {
        $candidates = [];

        if (preg_match_all('/<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)<\/a>/is', $html, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $m) {
                $candidates[] = [
                    'href' => html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                    'text' => trim(html_entity_decode(strip_tags($m[2]), ENT_QUOTES | ENT_HTML5, 'UTF-8')),
                ];
            }
        }

        if (preg_match_all('/(?:location\.href|window\.open|downloadFile)\s*\(\s*["\']([^"\']+)["\']/i', $html, $js)) {
            foreach ($js[1] as $href) {
                $candidates[] = [
                    'href' => html_entity_decode($href, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                    'text' => 'js-download',
                ];
            }
        }

        $ym = $year && $month ? sprintf('%04d%02d', $year, $month) : null;
        $ymDash = $year && $month ? sprintf('%04d-%02d', $year, $month) : null;
        $ymBuddhist = $year && $month ? sprintf('%04d%02d', $year + 543, $month) : null;

        $links = [];
        foreach ($candidates as $c) {
            $href = trim($c['href']);
            $text = $c['text'];
            if ($href === '' || str_starts_with(strtolower($href), 'javascript:void')) {
                continue;
            }
            if (preg_match('/javascript:\s*(?:location\.href|window\.open|downloadFile)\s*\(\s*[\'"]([^\'"]+)[\'"]/i', $href, $jm)) {
                $href = $jm[1];
            }

            $abs = $this->absolutize($href, $baseUrl);
            if ($this->isNavigationMenuUrl($abs, $text)) {
                continue;
            }

            $hay = mb_strtolower($href.' '.$text.' '.$abs);
            $hasExt = (bool) preg_match('/\.(xls|xlsx|csv|zip|rep|txt)(\?|$)/i', $href);
            $hasDownloadMethod = str_contains($hay, 'method=download')
                || str_contains($hay, 'reqcode=download')
                || str_contains($hay, 're-download')
                || str_contains($hay, 'redownload')
                || str_contains($hay, 'downloadfile')
                || str_contains($hay, 'downloadrep')
                || str_contains($hay, 'getfile');
            $hasFileParam = (bool) preg_match('/[?&](filename|file|fileName|attach|repno|rep_no|tid)=/i', $href);
            // คอลัมน์ Rep File / Excel File ในตาราง #content2
            $inResultTable = str_contains($hay, 'validation')
                && (str_contains($hay, 'download') || str_contains($hay, 'excel') || str_contains($hay, 'rep'));

            // รับเฉพาะลิงก์ที่น่าจะเป็นไฟล์จริง ไม่ใช่แค่ข้อความ "ดาวน์โหลด" ในเมนู
            if (! $hasExt && ! $hasDownloadMethod && ! $hasFileParam && ! $inResultTable) {
                continue;
            }

            $filename = $this->guessDownloadFilename($abs, $text);
            $score = 1;
            if ($ym && (str_contains($hay, strtolower($ym)) || str_contains($hay, strtolower((string) $ymDash)) || ($ymBuddhist && str_contains($hay, strtolower($ymBuddhist))))) {
                $score = 3;
            } elseif ($hasExt || $hasFileParam) {
                $score = 2;
            }

            $links[] = [
                'url' => $abs,
                'filename' => $filename,
                'score' => $score,
            ];
        }

        $matched = array_values(array_filter($links, fn ($l) => ($l['score'] ?? 0) >= 3));
        $strong = array_values(array_filter($links, fn ($l) => ($l['score'] ?? 0) >= 2));
        // ห้าม fallback ไปลิงก์เมนู score ต่ำ — ถ้าไม่มีไฟล์จริงให้คืนว่าง
        $use = $matched !== [] ? $matched : $strong;

        $unique = [];
        foreach ($use as $item) {
            $unique[$item['url']] = [
                'url' => $item['url'],
                'filename' => $item['filename'],
            ];
        }

        return array_values($unique);
    }

    private function isNavigationMenuUrl(string $url, string $text): bool
    {
        $hay = mb_strtolower($url.' '.$text);
        $blocked = [
            '/download/downloadaction.do',
            '/misreport/',
            '/faq/',
            '/webboard/',
            '/loginssaction',
            '/loginssoaction',
            'filemanagementwebaction',
            'ipdmanagementwebaction',
            'opdmanagementwebaction',
            'reportvalidatewebaction',
            'รายงานการส่งข้อมูล',
            'รายงานข้อมูลผู้ป่วย',
            'รายงานการตรวจสอบข้อมูล',
        ];
        foreach ($blocked as $b) {
            if (str_contains($hay, $b)) {
                return true;
            }
        }

        // ข้อความเมนูล้วน ๆ
        $menuTexts = ['ดาวน์โหลด', 'download', 'home', 'หน้าหลัก'];
        foreach ($menuTexts as $t) {
            if (mb_strtolower(trim($text)) === $t && ! preg_match('/\.(xls|xlsx|csv|zip)/i', $url)) {
                return true;
            }
        }

        return false;
    }

    private function looksLikeSpreadsheetBinary(string $body): bool
    {
        if ($body === '' || $this->looksLikeHtml($body) || $this->looksLikeValidationErrorPage($body)) {
            return false;
        }

        $start = substr($body, 0, 8);
        // XLSX/ZIP
        if (str_starts_with($start, 'PK')) {
            return true;
        }
        // OLE Compound File (legacy .xls) — ไฟล์จาก InvoiceReportExcelAction
        if (str_starts_with($start, "\xD0\xCF\x11\xE0")) {
            return true;
        }
        // CSV ข้อความจริงเท่านั้น (กันไฟล์ .ecd ที่ข้างในมี byte คล้าย comma)
        $probe = substr($body, 0, 400);
        if (! preg_match('/^[\x09\x0A\x0D\x20-\x7E\x80-\xFF]{20,}/', $probe)) {
            return false;
        }
        if (str_starts_with(ltrim($probe), '<')) {
            return false;
        }
        $lines = preg_split('/\r\n|\n|\r/', $probe) ?: [];
        $first = $lines[0] ?? '';

        return substr_count($first, ',') >= 2 || substr_count($first, "\t") >= 2 || substr_count($first, ';') >= 2;
    }

    private function guessDownloadFilename(string $url, string $text): string
    {
        $query = [];
        parse_str(parse_url($url, PHP_URL_QUERY) ?: '', $query);
        foreach (['filename', 'fileName', 'file', 'name', 'attach'] as $key) {
            if (! empty($query[$key])) {
                $name = basename((string) $query[$key]);
                if ($name !== '') {
                    return preg_match('/\.(xls|xlsx|csv|zip)$/i', $name) ? $name : $name.'.xls';
                }
            }
        }

        $pathName = basename(parse_url($url, PHP_URL_PATH) ?: '');
        if ($pathName && preg_match('/\.(xls|xlsx|csv|zip)$/i', $pathName)) {
            return $pathName;
        }

        $fromText = preg_replace('/\s+/', '_', $text) ?: '';
        if ($fromText !== '' && ! in_array($fromText, ['js-download', 'button-download', 'ดาวน์โหลด', 'Download', 'Re-Download'], true)) {
            return preg_match('/\.(xls|xlsx|csv|zip)$/i', $fromText) ? $fromText : $fromText.'.xls';
        }

        return 'rep_'.substr(sha1($url), 0, 10).'.xls';
    }

    private function absolutize(string $href, string $baseUrl): string
    {
        $href = trim($href);
        if ($href === '' || str_starts_with($href, 'javascript:')) {
            return $baseUrl;
        }
        if (Str::startsWith($href, ['http://', 'https://'])) {
            return $href;
        }

        $parts = parse_url($baseUrl);
        $scheme = $parts['scheme'] ?? 'https';
        $host = $parts['host'] ?? 'eclaim.nhso.go.th';
        $port = isset($parts['port']) ? ':'.$parts['port'] : '';
        $path = $parts['path'] ?? '/';

        // action="?" ของ e-Claim = อยู่ที่ไฟล์ปัจจุบัน แค่เปลี่ยน query
        if ($href === '?' || str_starts_with($href, '?')) {
            return "{$scheme}://{$host}{$port}{$path}".$href;
        }

        if (str_starts_with($href, '/')) {
            return "{$scheme}://{$host}{$port}{$href}";
        }
        $dir = rtrim(str_replace('\\', '/', dirname($path)), '/');

        return "{$scheme}://{$host}{$port}{$dir}/{$href}";
    }

    private function looksLikeHtml(string $body): bool
    {
        $start = ltrim(substr($body, 0, 200));

        return str_starts_with($start, '<!DOCTYPE') || str_starts_with($start, '<html') || str_starts_with($start, '<HTML');
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function exportCookies(CookieJar $jar): array
    {
        // CookieJar::toArray() คืน array ของ cookie data อยู่แล้ว (ไม่ใช่ SetCookie)
        $exported = $jar->toArray();
        if ($exported === []) {
            return [];
        }
        // รองรับทั้งกรณีได้ SetCookie object หรือ array
        return array_map(static function ($cookie) {
            if ($cookie instanceof SetCookie) {
                return $cookie->toArray();
            }

            return is_array($cookie) ? $cookie : [];
        }, $exported);
    }

    /**
     * @param  list<array<string,mixed>>  $cookies
     */
    private function importCookies(array $cookies): CookieJar
    {
        $jar = new CookieJar();
        foreach ($cookies as $cookie) {
            try {
                $jar->setCookie(new SetCookie($cookie));
            } catch (\Throwable) {
                // skip bad cookie
            }
        }

        return $jar;
    }

    /**
     * @param  array<string,mixed>  $state
     */
    private function storeSession(array $state): void
    {
        Cache::put(
            $this->cacheKey(),
            $state,
            now()->addMinutes((int) config('cgd_eclaim.session_ttl_minutes', 25))
        );
    }

    /**
     * @return array<string,mixed>
     */
    private function loadSession(): array
    {
        $state = Cache::get($this->cacheKey());
        if (! is_array($state)) {
            throw new RuntimeException('ไม่พบ session การเชื่อมต่อ e-Claim — กรุณาเริ่มเข้าสู่ระบบใหม่');
        }

        return $state;
    }

    /**
     * @param  array<string,mixed>  $state
     * @return array<string,mixed>
     */
    private function publicSession(array $state): array
    {
        $pending = is_array($state['pending_excel_links'] ?? null)
            ? count($state['pending_excel_links'])
            : 0;

        $public = [
            'phase' => $state['phase'] ?? 'unknown',
            'year' => $state['year'] ?? null,
            'month' => $state['month'] ?? null,
            'started_at' => $state['started_at'] ?? null,
            'pending_downloads' => $pending,
            'download_done' => (int) ($state['download_done'] ?? 0),
            'download_total' => (int) ($state['download_total'] ?? 0),
        ];

        if (($state['phase'] ?? null) === 'configure_totp' && ! empty($state['totp_secret'])) {
            $public['totp_secret'] = $state['totp_secret'];
        }

        return $public;
    }

    private function cacheKey(): string
    {
        return 'cgd_eclaim_nhso_session_'.$this->scheme.'_'.(Auth::id() ?: 'guest');
    }
}
