<?php

namespace App\Http\Controllers\Rcm;

use App\Http\Controllers\Controller;
use App\Models\Rcm\RcmFilePatchBatch;
use App\Models\Rcm\RcmFilePatchItem;
use App\Services\Rcm\RcmFilePatchService;
use App\Support\PiiMask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class RcmFilePatchController extends Controller
{
    public function __construct(
        protected readonly RcmFilePatchService $patchService
    ) {}

    public function index(Request $request): Response
    {
        $availableFolders = $this->patchService->getAvailableFolders();
        $recentBatches = $this->patchService->getRecentBatches();

        // Default folder suggestion: E:\ec\ECLAIM_14689_20261106080727 if exists, otherwise first available folder
        $defaultFolder = 'E:\\ec\\ECLAIM_14689_20261106080727';
        if (! file_exists($defaultFolder) && ! empty($availableFolders)) {
            $defaultFolder = $availableFolders[0]['path'];
        }

        return Inertia::render('Rcm/FilePatch', [
            'availableFolders' => $availableFolders,
            'recentBatches' => $recentBatches,
            'defaultFolder' => $defaultFolder,
        ]);
    }

    public function scan(Request $request): JsonResponse
    {
        $request->validate([
            'folder_path' => ['required', 'string'],
            'target_value' => ['nullable', 'string'],
        ]);

        $folderPath = trim($request->input('folder_path'));
        $targetValue = (string) $request->input('target_value', '1');

        try {
            $result = $this->patchService->scanFolder($folderPath, $targetValue);
            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function execute(Request $request): JsonResponse
    {
        $request->validate([
            'folder_path' => ['required', 'string'],
            'target_value' => ['nullable', 'string'],
        ]);

        $folderPath = trim($request->input('folder_path'));
        $targetValue = (string) $request->input('target_value', '1');
        $userId = $request->user()?->id;

        try {
            $result = $this->patchService->executePatch($folderPath, $userId, $targetValue);
            return response()->json([
                'success' => true,
                'message' => 'ปรับปรุงแฟ้มและบันทึกประวัติเรียบร้อยแล้ว',
                'data' => $result,
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function logClientBatch(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'batch_name' => ['required', 'string'],
            'folder_path' => ['nullable', 'string'],
            'target_value' => ['nullable', 'string'],
            'total_files_modified' => ['nullable', 'integer'],
            'total_records_scanned' => ['nullable', 'integer'],
            'total_records_modified' => ['nullable', 'integer'],
            'backup_path' => ['nullable', 'string'],
            'items' => ['nullable', 'array'],
        ]);

        $userId = $request->user()?->id;
        $targetValue = (string) ($validated['target_value'] ?? '1');

        try {
            $batch = \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $userId, $targetValue) {
                $batch = RcmFilePatchBatch::create([
                    'batch_name' => $validated['batch_name'],
                    'folder_path' => $validated['folder_path'] ?? $validated['batch_name'],
                    'target_file' => 'ADP',
                    'total_files_modified' => $validated['total_files_modified'] ?? 1,
                    'total_records_scanned' => $validated['total_records_scanned'] ?? 0,
                    'total_records_modified' => $validated['total_records_modified'] ?? count($validated['items'] ?? []),
                    'backup_path' => $validated['backup_path'] ?? 'เครื่องคอมพิวเตอร์ผู้ใช้',
                    'status' => 'completed',
                    'created_by' => $userId,
                ]);

                foreach ($validated['items'] ?? [] as $item) {
                    RcmFilePatchItem::create([
                        'batch_id' => $batch->id,
                        'file_name' => $item['file_name'] ?? 'ADP.txt',
                        'line_number' => $item['line_number'] ?? 0,
                        'hn' => $item['hn'] ?? null,
                        'an' => $item['an'] ?? null,
                        'dateopd' => $item['dateopd'] ?? null,
                        'type' => $item['type'] ?? null,
                        'code' => $item['code'] ?? null,
                        'qty' => !empty($item['qty']) ? (float) str_replace(',', '', (string) $item['qty']) : null,
                        'rate' => !empty($item['rate']) ? (float) str_replace(',', '', (string) $item['rate']) : null,
                        'seq' => $item['seq'] ?? null,
                        'total' => !empty($item['total']) ? (float) str_replace(',', '', (string) $item['total']) : null,
                        'old_use_status' => $item['old_use_status'] ?? '2',
                        'new_use_status' => isset($item['new_use_status']) && $item['new_use_status'] !== '' ? $item['new_use_status'] : $targetValue,
                        'raw_line_before' => $item['raw_line'] ?? null,
                    ]);
                }

                return $batch;
            });

            return response()->json([
                'success' => true,
                'message' => 'บันทึกประวัติการปรับปรุงแฟ้มลงฐานข้อมูลเรียบร้อยแล้ว',
                'batch_id' => $batch->id,
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function getBatchItems(int $batchId): JsonResponse
    {
        try {
            $batch = RcmFilePatchBatch::findOrFail($batchId);
            $items = $this->patchService->getBatchItems($batchId);

            return response()->json([
                'success' => true,
                'batch' => $batch,
                'items' => $items,
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        }
    }

    public function exportCsv(int $batchId): StreamedResponse
    {
        $batch = RcmFilePatchBatch::findOrFail($batchId);
        $items = RcmFilePatchItem::where('batch_id', $batchId)->orderBy('id')->get();

        $fileName = "ADP_Patch_Report_{$batch->batch_name}_" . date('Ymd_His') . ".csv";

        return response()->streamDownload(function () use ($batch, $items) {
            $output = fopen('php://output', 'w');

            // UTF-8 BOM สำหรับ Excel ภาษาไทย
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

            // ข้อมูลสรุปหัวตาราง
            fputcsv($output, ['รายงานการปรับปรุงแฟ้ม ADP (New E-Claim)']);
            fputcsv($output, ['ชื่อโฟลเดอร์', $batch->batch_name]);
            fputcsv($output, ['ตำแหน่งโฟลเดอร์', $batch->folder_path]);
            fputcsv($output, ['วันที่ปรับปรุง', $batch->created_at?->format('Y-m-d H:i:s')]);
            fputcsv($output, ['จำนวนแฟ้มที่ปรับแก้', $batch->total_files_modified]);
            fputcsv($output, ['จำนวนรายการที่ปรับแก้', $batch->total_records_modified]);
            fputcsv($output, ['โฟลเดอร์สำรอง (Backup)', $batch->backup_path]);
            fputcsv($output, []); // ว่าง 1 บรรทัด

            // Column Header
            fputcsv($output, [
                'ลำดับ',
                'แฟ้มข้อมูล',
                'บรรทัดที่',
                'HN',
                'AN',
                'วันที่รับบริการ (DATEOPD)',
                'หมวด (TYPE)',
                'รหัสบริการ/ยา (CODE)',
                'จำนวน (QTY)',
                'ราคาต่อหน่วย (RATE)',
                'รวมเงิน (TOTAL)',
                'SEQ (ลำดับบริการ)',
                'use_status เดิม',
                'use_status ใหม่',
            ]);

            foreach ($items as $idx => $item) {
                fputcsv($output, [
                    $idx + 1,
                    $item->file_name,
                    $item->line_number,
                    PiiMask::hn($item->hn),
                    $item->an,
                    $item->dateopd,
                    $item->type,
                    $item->code,
                    (float) $item->qty,
                    (float) $item->rate,
                    (float) $item->total,
                    $item->seq,
                    $item->old_use_status,
                    ($item->new_use_status !== null && $item->new_use_status !== '') ? $item->new_use_status : '(ค่าว่าง)',
                ]);
            }

            fclose($output);
        }, $fileName, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
