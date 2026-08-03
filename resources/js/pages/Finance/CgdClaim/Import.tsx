import React, { useState } from 'react';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { FileSpreadsheet, Upload, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import DataHubSubNav, { dataHubBreadcrumbs } from '../DataHub/DataHubSubNav';
import ClaimModuleSubNav from '../DataHub/ClaimModuleSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';
import DeleteBatchButton from './DeleteBatchButton';

interface BatchRow {
    id: number;
    filename: string;
    document_no: string | null;
    row_count: number;
    total_claim: number;
    total_approved: number;
    visit_date_min: string | null;
    visit_date_max: string | null;
    status: string;
    created_at: string;
    imported_by?: string | null;
    latest_reconciliation: { total_shortfall: number } | null;
}

interface Props {
    hosxpReady: boolean;
    batches: {
        data: BatchRow[];
        links: { url: string | null; label: string; active: boolean }[];
    };
}

const money = (n: number) =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export default function CgdClaimImport({ hosxpReady, batches }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string } };
    const [dragOver, setDragOver] = useState(false);
    const form = useForm<{
        file: File | null;
        notes: string;
        auto_reconcile: boolean;
        start_date: string;
        end_date: string;
    }>({
        file: null,
        notes: '',
        auto_reconcile: true,
        start_date: '',
        end_date: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('finance.cgd.import.store'), {
            forceFormData: true,
        });
    };

    return (
        <QualityPage
            tone="emerald"
            icon={Upload}
            badge="Financial Data Hub"
            title="นำเข้าไฟล์ STM"
            subtitle="อัปโหลด Statement จาก e-Claim เช่น STM_14689_OP202607_01.xls"
            breadcrumbs={dataHubBreadcrumbs({ title: 'นำเข้า STM', href: route('finance.cgd.import') })}
            headTitle="นำเข้า STM"
            subNav={<DataHubSubNav active="finance.cgd.dashboard" />}
        >
            <ClaimModuleSubNav
                dashboardUrl={route('finance.cgd.dashboard')}
                importUrl={route('finance.cgd.import')}
                importLabel="นำเข้า STM"
                active="import"
            />

            {flash?.success && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {flash.success}
                </div>
            )}

            {!hosxpReady && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    HOSxP ยังไม่พร้อม — แนะนำให้เปิด auto-reconcile หลังเชื่อมต่อได้แล้ว
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Panel title="อัปโหลดไฟล์" description="รองรับ .xls .xlsx .csv จากระบบ e-Claim">
                    <form onSubmit={submit} className="space-y-4">
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragOver(true);
                            }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setDragOver(false);
                                const file = e.dataTransfer.files?.[0];
                                if (file) form.setData('file', file);
                            }}
                            className={`rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
                                dragOver ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50/50'
                            }`}
                        >
                            <FileSpreadsheet className="mx-auto h-10 w-10 text-emerald-600" />
                            <div className="mt-3 text-sm font-semibold text-slate-800">ลากไฟล์มาวางที่นี่ หรือเลือกไฟล์</div>
                            <div className="mt-1 text-xs text-slate-500">ตัวอย่างชื่อไฟล์ STM_14689_OP202607_01.xls</div>
                            <div className="mt-4">
                                <Input
                                    type="file"
                                    accept=".xls,.xlsx,.csv"
                                    onChange={(e) => form.setData('file', e.target.files?.[0] || null)}
                                />
                            </div>
                            {form.data.file && (
                                <div className="mt-3 text-sm font-medium text-emerald-700">{form.data.file.name}</div>
                            )}
                            {form.errors.file && <div className="mt-2 text-sm text-rose-600">{form.errors.file}</div>}
                        </div>

                        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-sky-900">
                            <div className="flex items-start gap-2">
                                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                <div className="space-y-1">
                                    <div>เลือกช่วงวันที่เพื่อดึง Visit จาก HOSxP — รายการ STM นอกช่วงจะยังแสดงในรายงาน</div>
                                    <div>ถ้าไม่เลือกช่วง ระบบใช้วันเข้ารักษาต่ำสุด–สูงสุดจากไฟล์ STM</div>
                                    <div>ถ้าเลขเอกสาร STM ซ้ำกับที่มีอยู่แล้ว จะอัปเดตข้อมูลชุดเดิมแทนการสร้างใหม่</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <Label>วันเริ่มต้น HOSxP (ไม่บังคับ)</Label>
                                <ThaiDatePicker
                                    value={form.data.start_date}
                                    onChange={(v) => form.setData('start_date', v)}
                                    placeholder="ค่าเริ่มต้นจากไฟล์"
                                    className="mt-1 w-full max-w-none"
                                />
                                {form.errors.start_date && (
                                    <div className="mt-1 text-sm text-rose-600">{form.errors.start_date}</div>
                                )}
                            </div>
                            <div>
                                <Label>วันสิ้นสุด HOSxP (ไม่บังคับ)</Label>
                                <ThaiDatePicker
                                    value={form.data.end_date}
                                    onChange={(v) => form.setData('end_date', v)}
                                    placeholder="ค่าเริ่มต้นจากไฟล์"
                                    className="mt-1 w-full max-w-none"
                                />
                                {form.errors.end_date && (
                                    <div className="mt-1 text-sm text-rose-600">{form.errors.end_date}</div>
                                )}
                            </div>
                        </div>

                        <div>
                            <Label>หมายเหตุ</Label>
                            <Input
                                className="mt-1"
                                value={form.data.notes}
                                onChange={(e) => form.setData('notes', e.target.value)}
                                placeholder="เช่น งวด ก.ค. 69 รอบ 1"
                            />
                        </div>

                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={form.data.auto_reconcile}
                                onChange={(e) => form.setData('auto_reconcile', e.target.checked)}
                                className="rounded border-slate-300"
                            />
                            เปรียบเทียบกับ HOSxP ทันทีหลังนำเข้า
                        </label>

                        <Button
                            type="submit"
                            disabled={!form.data.file || form.processing}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {form.processing ? 'กำลังนำเข้า...' : 'นำเข้าและตรวจสอบ'}
                        </Button>
                    </form>
                </Panel>

                <Panel title="คอลัมน์ที่ระบบอ่านจาก STM" description="ตรงกับไฟล์ Statement ของ e-Claim">
                    <ul className="space-y-2 text-sm text-slate-600">
                        {[
                            'เลขเอกสาร STM — ใช้ตรวจซ้ำ ถ้าซ้ำจะอัปเดตชุดเดิม',
                            'วันเข้ารักษา — อ้างอิงช่วงจากไฟล์ และแสดงรายการนอกช่วง HOSxP ที่เลือกได้',
                            'HN / PID / SEQ NO — ใช้จับคู่กับ Visit HOSxP',
                            'เรียกเก็บ — ยอดที่ส่งเบิก',
                            'พึงรับทั้งหมด — ยอดที่อนุมัติ (ใช้คิดยอดขาด)',
                            'ค่ายา / ค่าอวัยวะฯ / ค่ารักษา — เทียบรายหมวด',
                        ].map((item) => (
                            <li key={item} className="rounded-2xl border border-slate-100 bg-white px-3 py-2.5">
                                {item}
                            </li>
                        ))}
                    </ul>
                </Panel>
            </div>

            <div className="mt-6">
                <Panel title="ประวัติการนำเข้า" description="จัดการไฟล์และรันเปรียบเทียบใหม่ได้">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="px-3 py-2">ไฟล์</th>
                                    <th className="px-3 py-2">ช่วงจากไฟล์</th>
                                    <th className="px-3 py-2 text-right">รายการ</th>
                                    <th className="px-3 py-2 text-right">เรียกเก็บ</th>
                                    <th className="px-3 py-2 text-right">พึงรับ</th>
                                    <th className="px-3 py-2">สถานะ</th>
                                    <th className="px-3 py-2 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {batches.data.map((batch) => (
                                    <tr key={batch.id} className="border-b border-slate-50">
                                        <td className="px-3 py-3">
                                            <div className="font-semibold text-slate-800">{batch.document_no || batch.filename}</div>
                                            <div className="text-xs text-slate-400">
                                                {batch.created_at}
                                                {batch.imported_by ? ` · ${batch.imported_by}` : ''}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-slate-600">
                                            {batch.visit_date_min || '-'} → {batch.visit_date_max || '-'}
                                        </td>
                                        <td className="px-3 py-3 text-right">{batch.row_count.toLocaleString()}</td>
                                        <td className="px-3 py-3 text-right">{money(batch.total_claim)}</td>
                                        <td className="px-3 py-3 text-right">{money(batch.total_approved)}</td>
                                        <td className="px-3 py-3">
                                            <StatusPill
                                                label={batch.status === 'reconciled' ? 'เปรียบเทียบแล้ว' : 'นำเข้าแล้ว'}
                                                className="border-emerald-200 bg-emerald-50 text-emerald-700"
                                            />
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex justify-end gap-2">
                                                <Button asChild size="sm" variant="outline" className="rounded-xl">
                                                    <Link href={route('finance.cgd.show', batch.id)}>เปิด</Link>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="rounded-xl"
                                                    onClick={() => router.post(route('finance.cgd.reconcile', batch.id))}
                                                >
                                                    <RefreshCw className="h-3.5 w-3.5" />
                                                </Button>
                                                <DeleteBatchButton
                                                    batchId={batch.id}
                                                    documentNo={batch.document_no}
                                                    filename={batch.filename}
                                                    rowCount={batch.row_count}
                                                    label="ลบ"
                                                />
                                            </div>
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
