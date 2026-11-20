<?php

namespace App\Services\Finance;

use App\Models\Finance\NhsoSmtTransfer;
use GuzzleHttp\Client;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class NhsoSmtPortalService
{
    private const BASE_URL = 'https://smt.nhso.go.th/smtf/api';

    private Client $client;

    public function __construct()
    {
        $this->client = new Client([
            'verify' => false,
            'timeout' => 45,
            'connect_timeout' => 15,
            'headers' => [
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept' => 'application/json, text/plain, */*',
                'Content-Type' => 'application/json',
                'Origin' => 'https://smt.nhso.go.th',
                'Referer' => 'https://smt.nhso.go.th/smtf/',
            ],
        ]);
    }

    /**
     * ดึงข้อมูลรายงานการโอนเงินชดเชยจาก สปสช. SMT ผ่าน REST API
     *
     * @param array{
     *     zone_id?: string,
     *     province_id?: string,
     *     hcode?: string,
     *     budget_year?: string,
     *     start_date?: string,
     *     end_date?: string,
     *     budget_source?: string,
     *     hosp_type?: string
     * } $params
     * @return array{datas: list<array<string, mixed>>, count: int}
     */
    public function fetchTransfers(array $params = []): array
    {
        $hcode = trim((string) ($params['hcode'] ?? '14689'));
        $vendorId = str_pad($hcode, 10, '0', STR_PAD_LEFT);
        $budgetYear = (string) ($params['budget_year'] ?? '2570');
        $zoneId = (string) ($params['zone_id'] ?? '06'); // เขต 6 ระยอง
        $provinceId = (string) ($params['province_id'] ?? '27'); // สระแก้ว
        $budgetSource = (string) ($params['budget_source'] ?? ''); // ว่าง = ทั้งหมด

        $startDateFormatted = $this->formatToThaiDate($params['start_date'] ?? '2026-10-01');
        $endDateFormatted = $this->formatToThaiDate($params['end_date'] ?? '2026-11-02');

        $payload = [
            'vendorSearchConditionCode' => '1',
            'zoneId' => $zoneId,
            'provinceId' => $provinceId,
            'vendorId' => $vendorId,
            'vendorId5Digit' => $hcode,
            'budgetSource' => $budgetSource,
            'budgetYear' => $budgetYear,
            'transferStartDate' => $startDateFormatted,
            'transferEndDate' => $endDateFormatted,
            'hospType' => (string) ($params['hosp_type'] ?? ''),
            'isTest' => '',
        ];

        try {
            $url = self::BASE_URL.'/budgetreport/budgetSummaryByVendorReport/search';
            $response = $this->client->post($url, ['json' => $payload]);

            if ($response->getStatusCode() !== 200) {
                throw new RuntimeException("SMT API returned HTTP status {$response->getStatusCode()}");
            }

            $body = json_decode((string) $response->getBody(), true);
            $rawDatas = $body['datas'] ?? [];

            $normalized = [];
            foreach ($rawDatas as $row) {
                $normalized[] = $this->normalizeRow($row, $budgetYear, $hcode);
            }

            return [
                'datas' => $normalized,
                'count' => count($normalized),
            ];
        } catch (\Throwable $e) {
            Log::error('NhsoSmtPortalService::fetchTransfers error: '.$e->getMessage(), ['params' => $payload]);
            throw new RuntimeException('ไม่สามารถดึงข้อมูลจากเว็บ SMT สปสช. ได้: '.$e->getMessage(), 0, $e);
        }
    }

    /**
     * ดึงรายละเอียดรายการของงวด (Batch)
     */
    public function fetchTransferDetail(string $batchNo, string $postingDate, string $fiscalYear = '2570', string $hcode = '14689'): array
    {
        $vendorId = str_pad($hcode, 10, '0', STR_PAD_LEFT);
        $payload = [
            'fiscalYear' => $fiscalYear,
            'vendorId' => $vendorId,
            'postingDate' => $postingDate,
            'batchNo' => $batchNo,
            'offset' => 0,
            'count' => 100,
            'isTest' => '',
        ];

        try {
            $url = self::BASE_URL.'/budgetreport/budgetSummaryByVendorReportDetail';
            $response = $this->client->post($url, ['json' => $payload]);
            return json_decode((string) $response->getBody(), true) ?: [];
        } catch (\Throwable $e) {
            Log::warning('NhsoSmtPortalService::fetchTransferDetail error: '.$e->getMessage());
            return [];
        }
    }

    /**
     * ดึงข้อมูลและบันทึก (Sync) ลงตาราง finance_nhso_smt_transfers
     *
     * @param array $params
     * @param int|null $userId
     * @return array{
     *     synced_count: int,
     *     total_amount: float,
     *     summary: array<string, mixed>
     * }
     */
    public function syncTransfers(array $params = [], ?int $userId = null): array
    {
        $fetched = $this->fetchTransfers($params);
        $rows = $fetched['datas'];

        $syncedCount = 0;
        $totalAmount = 0.0;

        $summary = [
            'total_all' => 0.0,
            'total_lgo' => 0.0,
            'total_lgo_hd' => 0.0, // ไต อปท. (HD)
            'total_uc' => 0.0, // UC ปกติ (ไม่รวมไตวาย)
            'total_ckd' => 0.0, // ไตวายเรื้อรังแยกต่างหาก
            'total_dss' => 0.0,
            'total_covid' => 0.0,
            'total_other' => 0.0,
            'count_lgo' => 0,
            'count_lgo_hd' => 0,
            'count_uc' => 0,
            'count_ckd' => 0,
            'count_dss' => 0,
            'count_covid' => 0,
            'count_other' => 0,
        ];

        DB::transaction(function () use ($rows, $userId, &$syncedCount, &$totalAmount, &$summary) {
            // รวมยอดรายการที่อยู่ในงวดเดียวกัน วันที่โอนเดียวกัน เลขที่อ้างอิงเดียวกัน และกองทุนเดียวกัน
            // เช่น รายการจัดสรรยอดเงิน (+) รวมกับรายการหักเงินรอหักกลบ (-) เพื่อให้ได้ยอดเงินโอนจริงสุทธิ
            $aggregatedRows = [];
            foreach ($rows as $item) {
                $key = implode('|', [
                    (string) ($item['batch_no'] ?? ''),
                    (string) ($item['posting_date'] ?? ''),
                    (string) ($item['ref_doc_no'] ?? ''),
                    (string) ($item['fund_name'] ?? ''),
                ]);

                if (! isset($aggregatedRows[$key])) {
                    $aggregatedRows[$key] = $item;
                    $aggregatedRows[$key]['amount'] = (float) ($item['amount'] ?? 0);
                    $aggregatedRows[$key]['total'] = (float) ($item['total'] ?? 0);
                } else {
                    $aggregatedRows[$key]['amount'] = round((float) $aggregatedRows[$key]['amount'] + (float) ($item['amount'] ?? 0), 2);
                    $aggregatedRows[$key]['total'] = round((float) $aggregatedRows[$key]['total'] + (float) ($item['total'] ?? 0), 2);
                    if (! is_array($aggregatedRows[$key]['raw_data'])) {
                        $aggregatedRows[$key]['raw_data'] = (array) $aggregatedRows[$key]['raw_data'];
                    }
                    $aggregatedRows[$key]['raw_data']['multi_records'][] = $item['raw_data'] ?? $item;
                }
            }

            foreach ($aggregatedRows as $item) {
                $total = (float) ($item['total'] ?? 0);
                $source = $item['budget_source'];
                $isCkd = (bool) ($item['is_ckd'] ?? false);

                NhsoSmtTransfer::updateOrCreate(
                    [
                        'batch_no' => (string) $item['batch_no'],
                        'posting_date' => (string) $item['posting_date'],
                        'ref_doc_no' => (string) ($item['ref_doc_no'] ?? ''),
                        'fund_name' => (string) ($item['fund_name'] ?? ''),
                    ],
                    [
                        'budget_source' => $source,
                        'is_ckd' => $isCkd,
                        'budget_year' => (string) ($item['budget_year'] ?? '2570'),
                        'transfer_date' => $item['transfer_date'],
                        'hcode' => (string) ($item['hcode'] ?? '14689'),
                        'vendor_no' => (string) ($item['vendor_no'] ?? ''),
                        'fund_group_descr' => (string) ($item['fund_group_descr'] ?? ''),
                        'fund_descr' => (string) ($item['fund_descr'] ?? ''),
                        'mou_grp_code' => (string) ($item['mou_grp_code'] ?? ''),
                        'bank_name' => (string) ($item['bank_name'] ?? ''),
                        'bank_account_no' => (string) ($item['bank_account_no'] ?? ''),
                        'pmnt_stts' => (string) ($item['pmnt_stts'] ?? 'P'),
                        'amount' => (float) ($item['amount'] ?? 0),
                        'total' => $total,
                        'moph_id' => (string) ($item['moph_id'] ?? ''),
                        'moph_desc' => (string) ($item['moph_desc'] ?? ''),
                        'raw_data' => $item['raw_data'] ?? [],
                        'synced_by' => $userId,
                        'synced_at' => now(),
                    ]
                );

                $syncedCount++;
                $netAmt = max(0, $total);
                $totalAmount += $netAmt;
                $summary['total_all'] += $netAmt;

                $isLgoHd = $source === 'LGO_HD'
                    || (($source === 'LGO' || str_contains(strtoupper((string) ($item['ref_doc_no'] ?? '')), 'LGO'))
                        && str_contains(strtoupper((string) ($item['ref_doc_no'] ?? '')), 'HD'));

                if ($isLgoHd) {
                    $summary['total_lgo_hd'] += $netAmt;
                    $summary['count_lgo_hd']++;
                } elseif ($isCkd || $source === 'CKD') {
                    $summary['total_ckd'] += $netAmt;
                    $summary['count_ckd']++;
                } elseif ($source === 'LGO') {
                    $summary['total_lgo'] += $netAmt;
                    $summary['count_lgo']++;
                } elseif ($source === 'UC') {
                    $summary['total_uc'] += $netAmt;
                    $summary['count_uc']++;
                } elseif ($source === 'DSS') {
                    $summary['total_dss'] += $netAmt;
                    $summary['count_dss']++;
                } elseif ($source === 'COVID') {
                    $summary['total_covid'] += $netAmt;
                    $summary['count_covid']++;
                } else {
                    $summary['total_other'] += $netAmt;
                    $summary['count_other']++;
                }
            }
        });

        // 2. Auto-download and attach PAYM PDFs for synced transfers
        $pdfSyncedCount = 0;
        $uniquePaymMap = [];
        foreach ($rows as $item) {
            $paymFile = trim((string) ($item['raw_data']['downloadPAYMFileName'] ?? ''));
            if ($paymFile !== '' && ! isset($uniquePaymMap[$paymFile])) {
                $uniquePaymMap[$paymFile] = [
                    'batch_no' => (string) $item['batch_no'],
                    'posting_date' => (string) $item['posting_date'],
                    'budget_year' => (string) ($item['budget_year'] ?? '2570'),
                ];
            }
        }

        foreach ($uniquePaymMap as $paymFile => $info) {
            $res = $this->downloadPaymPdf($paymFile, $info['batch_no'], $info['posting_date'], $info['budget_year']);
            if ($res) {
                NhsoSmtTransfer::where('batch_no', $info['batch_no'])
                    ->where('posting_date', $info['posting_date'])
                    ->update([
                        'pdf_path' => $res['path'],
                        'pdf_filename' => $res['filename'],
                        'pdf_downloaded_at' => now(),
                    ]);
                $pdfSyncedCount++;
            }
        }

        return [
            'synced_count' => $syncedCount,
            'total_amount' => $totalAmount,
            'pdf_synced_count' => $pdfSyncedCount,
            'summary' => $summary,
        ];
    }

    /**
     * ดาวน์โหลดไฟล์ PDF แจ้งโอนเงินจากเว็บ SMT สปสช.
     *
     * @return array{path: string, filename: string}|null
     */
    public function downloadPaymPdf(string $paymFileName, string $batchNo, string $postingDate, string $budgetYear = '2570'): ?array
    {
        $paymFileName = trim($paymFileName);
        if ($paymFileName === '') {
            return null;
        }

        $dir = "smt_pdfs/{$budgetYear}";
        $safeBatch = preg_replace('/[^a-zA-Z0-9_-]/', '_', $batchNo);
        $safePosting = preg_replace('/[^0-9]/', '', $postingDate);
        $relativeFile = "{$dir}/{$safeBatch}_{$safePosting}.pdf";
        $displayFilename = "แจ้งโอนเงิน_งวด{$batchNo}_{$postingDate}.pdf";

        // หากมีไฟล์อยู่แล้วใน Storage และขนาด > 1KB ไม่จำเป็นต้องดาวน์โหลดซ้ำ
        if (Storage::disk('local')->exists($relativeFile) && Storage::disk('local')->size($relativeFile) > 1000) {
            return [
                'path' => $relativeFile,
                'filename' => $displayFilename,
            ];
        }

        try {
            $url = self::BASE_URL . '/budgetreport/budgetSummaryByVendorReportDetail/download?fileName=' . urlencode($paymFileName);
            $response = $this->client->get($url);

            if ($response->getStatusCode() !== 200) {
                Log::warning("SMT PDF download returned status {$response->getStatusCode()}", ['fileName' => $paymFileName]);
                return null;
            }

            $body = (string) $response->getBody();
            if (! str_starts_with($body, '%PDF')) {
                Log::warning("SMT PDF download returned non-PDF content", ['fileName' => $paymFileName, 'prefix' => substr($body, 0, 50)]);
                return null;
            }

            Storage::disk('local')->makeDirectory($dir);
            Storage::disk('local')->put($relativeFile, $body);

            return [
                'path' => $relativeFile,
                'filename' => $displayFilename,
            ];
        } catch (\Throwable $e) {
            Log::warning("Failed to download SMT PDF for batch {$batchNo}: " . $e->getMessage());
            return null;
        }
    }

    /**
     * สแกนหาและดาวน์โหลดไฟล์ PDF แจ้งโอนเงินที่ยังค้างอยู่ในฐานข้อมูล
     */
    public function syncMissingPdfs(?string $budgetYear = null): array
    {
        $query = NhsoSmtTransfer::query();
        if ($budgetYear) {
            $query->where('budget_year', $budgetYear);
        }

        $records = $query->get();
        $downloadedCount = 0;
        $failedCount = 0;

        // Deduplicate downloads by downloadPAYMFileName
        $grouped = [];
        foreach ($records as $r) {
            $paymFile = trim((string) ($r->raw_data['downloadPAYMFileName'] ?? ''));
            if ($paymFile !== '') {
                $grouped[$paymFile][] = $r;
            }
        }

        foreach ($grouped as $paymFile => $groupRecords) {
            $first = $groupRecords[0];
            $res = $this->downloadPaymPdf(
                $paymFile,
                (string) $first->batch_no,
                (string) $first->posting_date,
                (string) ($first->budget_year ?: '2570')
            );

            if ($res) {
                $ids = array_map(fn ($item) => $item->id, $groupRecords);
                NhsoSmtTransfer::whereIn('id', $ids)->update([
                    'pdf_path' => $res['path'],
                    'pdf_filename' => $res['filename'],
                    'pdf_downloaded_at' => now(),
                ]);
                $downloadedCount++;
            } else {
                $failedCount++;
            }
        }

        return [
            'total_unique_files' => count($grouped),
            'downloaded' => $downloadedCount,
            'failed' => $failedCount,
        ];
    }

    /**
     * ดึงยอดสรุปทางสถิติที่มีอยู่ในตารางฐานข้อมูลปัจจุบัน
     */
    public function getDatabaseSummary(?string $budgetYear = null): array
    {
        $query = NhsoSmtTransfer::query();
        if ($budgetYear) {
            $query->where('budget_year', $budgetYear);
        }

        $all = $query->get();

        $summary = [
            'total_all' => 0.0,
            'total_lgo' => 0.0, // อปท. ทั่วไป (ไม่รวมไต)
            'total_lgo_hd' => 0.0, // ไต อปท. (งวด HD เช่น APLGO-HD69-M12)
            'total_uc' => 0.0, // UC ไม่รวมไตวาย
            'total_ckd' => 0.0, // ไตวายเรื้อรังแยกต่างหาก
            'total_dss' => 0.0,
            'total_covid' => 0.0,
            'count_all' => $all->count(),
            'count_lgo' => 0,
            'count_lgo_hd' => 0,
            'count_uc' => 0,
            'count_ckd' => 0,
            'count_dss' => 0,
            'count_covid' => 0,
            'pdf_count' => $all->whereNotNull('pdf_path')->count(),
            'last_synced_at' => optional($all->max('synced_at'))->format('d/m/Y H:i:s'),
        ];

        foreach ($all as $item) {
            $amt = max(0, (float) $item->total);
            $summary['total_all'] += $amt;

            $isLgoHd = $item->budget_source === 'LGO_HD'
                || (($item->budget_source === 'LGO' || str_contains(strtoupper((string) $item->ref_doc_no), 'LGO'))
                    && str_contains(strtoupper((string) $item->ref_doc_no), 'HD'));

            if ($isLgoHd) {
                $summary['total_lgo_hd'] += $amt;
                $summary['count_lgo_hd']++;
            } elseif ($item->is_ckd || $item->budget_source === 'CKD') {
                $summary['total_ckd'] += $amt;
                $summary['count_ckd']++;
            } elseif ($item->budget_source === 'LGO') {
                $summary['total_lgo'] += $amt;
                $summary['count_lgo']++;
            } elseif ($item->budget_source === 'UC') {
                $summary['total_uc'] += $amt;
                $summary['count_uc']++;
            } elseif ($item->budget_source === 'DSS') {
                $summary['total_dss'] += $amt;
                $summary['count_dss']++;
            } elseif ($item->budget_source === 'COVID') {
                $summary['total_covid'] += $amt;
                $summary['count_covid']++;
            }
        }

        return $summary;
    }

    /**
     * แปลงแถวข้อมูลจาก API เป็นรูปแบบมาตรฐาน
     */
    private function normalizeRow(array $row, string $budgetYear, string $hcode): array
    {
        $fundName = trim((string) ($row['fundName'] ?? ''));
        $fundDescr = trim((string) ($row['fundDescr'] ?? ''));
        $refDocNo = trim((string) ($row['refDocNo'] ?? ''));
        $rawSource = strtoupper(trim((string) ($row['budgetSource'] ?? '')));

        // ตรวจสอบ ไต อปท. (งวด/เลขที่เบิกจ่าย มีคำว่า HD เช่น APLGO-HD69-M12)
        $isLgoHd = ($rawSource === 'LGO' || str_contains(strtoupper($refDocNo), 'LGO'))
            && str_contains(strtoupper($refDocNo), 'HD');

        // แยกกองทุนไตวายเรื้อรัง (CKD ของ UC) เป็นอีกส่วนต่างหาก
        $isCkd = ! $isLgoHd && (str_contains($fundName, 'ไตวาย')
            || str_contains($fundName, 'ไต')
            || str_contains($fundDescr, 'ไตวาย')
            || str_starts_with($refDocNo, 'DCKD'));

        if ($isLgoHd) {
            $budgetSource = 'LGO_HD';
        } elseif ($isCkd) {
            $budgetSource = 'CKD';
        } else {
            $budgetSource = $rawSource ?: 'OTHER';
        }

        // แปลง postingDate เช่น 25691014 -> transfer_date ค.ศ.
        $postingDate = trim((string) ($row['postingDate'] ?? ''));
        $transferDate = null;
        if (strlen($postingDate) === 8) {
            $beYear = (int) substr($postingDate, 0, 4);
            $ceYear = $beYear - 543;
            $month = substr($postingDate, 4, 2);
            $day = substr($postingDate, 6, 2);
            $transferDate = sprintf('%04d-%02d-%02d', $ceYear, $month, $day);
        }

        return [
            'budget_source' => $budgetSource,
            'is_ckd' => $isCkd,
            'budget_year' => $budgetYear,
            'batch_no' => trim((string) ($row['batchNo'] ?? '')),
            'posting_date' => $postingDate,
            'transfer_date' => $transferDate,
            'ref_doc_no' => $refDocNo,
            'hcode' => $hcode,
            'vendor_no' => trim((string) ($row['vndrNo'] ?? '')),
            'fund_name' => $fundName,
            'fund_group_descr' => trim((string) ($row['fundGroupDescr'] ?? '')),
            'fund_descr' => $fundDescr,
            'mou_grp_code' => trim((string) ($row['mouGrpCode'] ?? '')),
            'bank_name' => trim((string) ($row['bankNm'] ?? '')),
            'bank_account_no' => trim((string) ($row['bankAcctNo'] ?? '')),
            'pmnt_stts' => trim((string) ($row['pmntStts'] ?? 'P')),
            'amount' => (float) ($row['amount'] ?? 0),
            'total' => (float) ($row['total'] ?? 0),
            'moph_id' => trim((string) ($row['mophId'] ?? '')),
            'moph_desc' => trim((string) ($row['mophDesc'] ?? '')),
            'raw_data' => $row,
        ];
    }

    /**
     * แปลง Y-m-d หรือ d/m/Y เป็น DD/MM/YYYY ในรูปแบบปี พ.ศ. สำหรับเว็บ SMT
     */
    private function formatToThaiDate(string $dateStr): string
    {
        $dateStr = trim($dateStr);
        if (preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $dateStr)) {
            return $dateStr;
        }

        try {
            $dt = Carbon::parse($dateStr);
            $beYear = $dt->year + 543;
            return sprintf('%02d/%02d/%04d', $dt->day, $dt->month, $beYear);
        } catch (\Throwable) {
            return '01/10/2569';
        }
    }
}
