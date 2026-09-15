import React, { useMemo, useRef, useState } from 'react';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, FileSpreadsheet, Trash2, Upload, X } from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import DataHubSubNav, { dataHubBreadcrumbs } from '../DataHub/DataHubSubNav';
import ClaimModuleSubNav from '../DataHub/ClaimModuleSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ImportRow {
    id: number;
    claim_submission_no: string;
    filename: string;
    hcode: string | null;
    hospital_name: string | null;
    channel: string | null;
    period_label: string | null;
    detail_count: number;
    summary_count: number;
    rep_count: number;
    total_claim: number;
    total_approved: number;
    visit_date_min: string | null;
    visit_date_max: string | null;
    sheet_names: string[];
    imported_by?: string | null;
    created_at: string;
}

interface Props {
    imports: {
        data: ImportRow[];
        links: { url: string | null; label: string; active: boolean }[];
    };
    filenamePrefix?: string;
}

const money = (n: number) =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const ALLOWED_EXT = ['.xls', '.xlsx'];
const DEFAULT_STM_PREFIX = 'STM_14689_OP';

export default function StmImportPage({ imports, filenamePrefix }: Props) {
    const stmPrefix = filenamePrefix || DEFAULT_STM_PREFIX;
    const { flash } = usePage().props as {
        flash?: { success?: string; error?: string; import_failures?: string[] };
    };
    const form = useForm<{ stm_files: File[]; notes: string }>({
        stm_files: [],
        notes: '',
    });
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [rejectedNames, setRejectedNames] = useState<string[]>([]);

    const totalSizeMb = useMemo(
        () => form.data.stm_files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024),
        [form.data.stm_files],
    );

    const setFiles = (list: FileList | File[] | null) => {
        if (!list) return;
        const rejected: string[] = [];
        const next = Array.from(list).filter((f) => {
            if (!ALLOWED_EXT.some((ext) => f.name.toLowerCase().endsWith(ext))) {
                return false;
            }
            if (!f.name.toLowerCase().startsWith(stmPrefix.toLowerCase())) {
                rejected.push(f.name);
                return false;
            }
            return true;
        });
        setRejectedNames(rejected);
        form.setData('stm_files', next.slice(0, 20));
    };

    const submit = () => {
        if (form.data.stm_files.length === 0) return;
        form.post(route('finance.cgd.stm.store'), { forceFormData: true });
    };

    return (
        <QualityPage
            tone="emerald"
            icon={FileSpreadsheet}
            badge="Financial Data Hub"
            title="นำเข้าข้อมูล STM"
            subtitle={`ชื่อไฟล์ต้องขึ้นต้นด้วย ${stmPrefix} · เก็บทุกแท็บ · แยกด้วยเลขที่นำเบิก`}
            breadcrumbs={dataHubBreadcrumbs({ title: 'นำเข้า STM', href: route('finance.cgd.stm.index') })}
            headTitle="นำเข้า STM"
            subNav={<DataHubSubNav active="finance.cgd.dashboard" />}
        >
            <ClaimModuleSubNav
                dashboardUrl={route('finance.cgd.dashboard')}
                importUrl={route('finance.cgd.import')}
                stmUrl={route('finance.cgd.stm.index')}
                precheckUrl={route('finance.cgd.precheck')}
                active="stm"
            />

            {flash?.success && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {flash.success}
                </div>
            )}
            {(flash?.import_failures || []).length > 0 && (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    <div className="mb-1 font-semibold">นำเข้าไม่สำเร็จ</div>
                    <ul className="list-disc space-y-1 pl-5">
                        {(flash?.import_failures || []).map((msg) => (
                            <li key={msg}>{msg}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Panel
                    title="อัปโหลดไฟล์ STM"
                    description={`ตัวอย่าง: ${stmPrefix}202607_01.xls · เก็บแท็บพึงรับ + สรุป(พึงรับ) · upsert ตามเลขที่นำเบิก`}
                >
                    <div
                        className={`rounded-2xl border border-dashed px-4 py-8 text-center transition ${
                            dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50/60'
                        }`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragOver(false);
                            setFiles(e.dataTransfer.files);
                        }}
                    >
                        <Upload className="mx-auto h-8 w-8 text-emerald-600" />
                        <div className="mt-2 text-sm font-semibold text-slate-800">ลากไฟล์มาวาง หรือเลือกจากเครื่อง</div>
                        <div className="mt-1 text-xs text-slate-500">ต้องขึ้นต้นด้วย {stmPrefix} · .xls / .xlsx · สูงสุด 20 ไฟล์</div>
                        <Button
                            type="button"
                            variant="outline"
                            className="mt-4 rounded-xl"
                            onClick={() => inputRef.current?.click()}
                        >
                            เลือกไฟล์
                        </Button>
                        <input
                            ref={inputRef}
                            type="file"
                            className="hidden"
                            accept=".xls,.xlsx"
                            multiple
                            onChange={(e) => setFiles(e.target.files)}
                        />
                    </div>

                    {rejectedNames.length > 0 && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            ข้าม {rejectedNames.length} ไฟล์ที่ชื่อไม่ขึ้นต้นด้วย {stmPrefix}
                            <ul className="mt-1 list-disc pl-5 text-xs">
                                {rejectedNames.slice(0, 5).map((name) => (
                                    <li key={name}>{name}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {form.data.stm_files.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <div className="text-xs text-slate-500">
                                เลือกแล้ว {form.data.stm_files.length} ไฟล์ · {totalSizeMb.toFixed(1)} MB
                            </div>
                            {form.data.stm_files.map((file, idx) => (
                                <div
                                    key={`${file.name}-${idx}`}
                                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm"
                                >
                                    <span className="truncate font-medium text-slate-800">{file.name}</span>
                                    <button
                                        type="button"
                                        className="ml-2 text-slate-400 hover:text-rose-600"
                                        onClick={() =>
                                            form.setData(
                                                'stm_files',
                                                form.data.stm_files.filter((_, i) => i !== idx),
                                            )
                                        }
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 space-y-2">
                        <Label htmlFor="stm-notes">หมายเหตุ (ถ้ามี)</Label>
                        <Input
                            id="stm-notes"
                            className="rounded-xl"
                            value={form.data.notes}
                            onChange={(e) => form.setData('notes', e.target.value)}
                            placeholder="เช่น นำเข้างวด ก.ค. 2569"
                        />
                    </div>

                    {form.errors.stm_files && (
                        <div className="mt-3 flex items-start gap-2 text-sm text-rose-700">
                            <AlertTriangle className="mt-0.5 h-4 w-4" />
                            {form.errors.stm_files}
                        </div>
                    )}

                    <Button
                        className="mt-4 rounded-xl bg-emerald-700 hover:bg-emerald-800"
                        disabled={form.processing || form.data.stm_files.length === 0}
                        onClick={submit}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        {form.processing ? 'กำลังนำเข้า...' : 'นำเข้า STM'}
                    </Button>
                </Panel>

                <Panel title="ข้อมูลที่เก็บ" description="ใช้เลขที่นำเบิกเป็นกุญแจหลัก · นำเข้าซ้ำจะอัปเดตชุดเดิม">
                    <ul className="space-y-2 text-sm text-slate-700">
                        <li>
                            <StatusPill label="เลขที่นำเบิก" className="mr-2 border-emerald-200 bg-emerald-50 text-emerald-800" />
                            จาก “เลขที่เอกสาร” เช่น 14689_OP202607_01
                        </li>
                        <li>
                            <StatusPill label="แท็บพึงรับ" className="mr-2 border-sky-200 bg-sky-50 text-sky-800" />
                            รายละเอียดราย visit / SEQ / เรียกเก็บ / พึงรับ
                        </li>
                        <li>
                            <StatusPill label="แท็บสรุป(พึงรับ)" className="mr-2 border-violet-200 bg-violet-50 text-violet-800" />
                            สรุปราย REP NO · จำนวนผ่าน/ไม่ผ่าน · จ่ายชดเชยทั้งสิ้น
                        </li>
                        <li>
                            <StatusPill label="เปรียบเทียบ" className="mr-2 border-amber-200 bg-amber-50 text-amber-800" />
                            ใช้เป็นหลักในหน้าตรวจเบิกจ่าย · จับคู่ HOSxP ด้วย SEQ
                        </li>
                    </ul>
                </Panel>
            </div>

            <div className="mt-6">
                <Panel title="ชุด STM ที่นำเข้าแล้ว" description="กดเลขที่นำเบิกเพื่อดูรายละเอียดทุกแท็บ">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="px-3 py-2">เลขที่นำเบิก</th>
                                    <th className="px-3 py-2">ไฟล์</th>
                                    <th className="px-3 py-2 text-right">รายการ</th>
                                    <th className="px-3 py-2 text-right">REP</th>
                                    <th className="px-3 py-2 text-right">เรียกเก็บ</th>
                                    <th className="px-3 py-2 text-right">พึงรับ</th>
                                    <th className="px-3 py-2">แท็บ</th>
                                    <th className="px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {imports.data.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-3 py-10 text-center text-slate-400">
                                            ยังไม่มีชุด STM — อัปโหลดไฟล์ด้านบน
                                        </td>
                                    </tr>
                                )}
                                {imports.data.map((row) => (
                                    <tr key={row.id} className="border-b border-slate-50 hover:bg-emerald-50/40">
                                        <td className="px-3 py-3">
                                            <Link
                                                href={route('finance.cgd.stm.compare', row.id)}
                                                className="font-semibold text-emerald-700 hover:underline"
                                            >
                                                {row.claim_submission_no}
                                            </Link>
                                            <div className="text-xs text-slate-400">{row.created_at}</div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="max-w-[220px] truncate text-slate-700">{row.filename}</div>
                                            <div className="text-xs text-slate-400">
                                                {row.hcode || '-'}
                                                {row.channel ? ` · ${row.channel}` : ''}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums">{row.detail_count.toLocaleString()}</td>
                                        <td className="px-3 py-3 text-right tabular-nums">{row.rep_count.toLocaleString()}</td>
                                        <td className="px-3 py-3 text-right">{money(row.total_claim)}</td>
                                        <td className="px-3 py-3 text-right">{money(row.total_approved)}</td>
                                        <td className="px-3 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {(row.sheet_names || []).map((name) => (
                                                    <StatusPill
                                                        key={name}
                                                        label={name}
                                                        className="border-slate-200 bg-slate-50 text-slate-600"
                                                    />
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                                onClick={() => {
                                                    if (confirm(`ลบชุด ${row.claim_submission_no}?`)) {
                                                        router.delete(route('finance.cgd.stm.destroy', row.id));
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            </div>
        </QualityPage>
    );
}
