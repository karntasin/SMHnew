import React, { useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import { ImPage, StatCard, Panel, Modal, Field, StatusPill, EmptyState } from '@/pages/Im/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { imInput, imSelect, fmtDate, STATUS_STYLE } from '@/pages/Im/shared';
import {
    FileCheck,
    Plus,
    Trash2,
    Star,
    Target,
    Printer,
    AlertTriangle,
    Stethoscope,
    ExternalLink,
    ClipboardList,
    FileDown,
} from 'lucide-react';

interface Item { name: string; score: number; max: number; percent?: number; }
interface Audit { id: number; record_type: string; patient_ref?: string; doctor?: string; audit_date: string; auditor?: string; items?: Item[]; total_score: number; max_score: number; percent: number; star_level: number; note?: string; print_checked: boolean; discrepancy?: string; }
interface MraAuditRow {
    id: number;
    audit_type: string;
    hn?: string | null;
    an?: string | null;
    patient_name?: string | null;
    doctor?: string | null;
    visit_date?: string | null;
    audited_at?: string | null;
    status: string;
    percent: number;
    total_score: number;
    max_score: number;
    star_level: number;
    auditor?: string | null;
}
interface MraReport {
    summary: {
        total: number;
        completed: number;
        pending: number;
        avg: number;
        opd_avg: number;
        ipd_avg: number;
        above_80: number;
        above_95: number;
    };
    monthly: { month: string; total: number; avg: number }[];
    by_category: { id: number; code: string; name: string; audit_type: string; total: number; passed: number; avg: number }[];
    by_doctor: { doctor: string; avg: number; count: number }[];
    top_errors: { criteria_code: string; criteria_name: string; category_name: string; fail_count: number }[];
    audits: MraAuditRow[];
}
interface Props {
    type: string | null;
    audits: Audit[];
    byItem: { name: string; avg: number; count: number }[];
    byDoctor: { doctor: string; avg: number; count: number }[];
    summary: { total: number; opd_avg: number; ipd_avg: number; above_80: number; above_95: number; discrepancies: number; };
    mra: MraReport;
}

const MRA_STATUS_LABEL: Record<string, string> = {
    pending: 'รอตรวจ',
    in_progress: 'กำลังตรวจ',
    audited: 'เสร็จสิ้น',
    corrected: 'แก้ไขแล้ว',
};
const MRA_STATUS_STYLE: Record<string, string> = {
    pending: STATUS_STYLE.pending,
    in_progress: STATUS_STYLE.in_progress,
    audited: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    corrected: 'border-sky-200 bg-sky-50 text-sky-700',
};

const DEFAULT_ITEMS: Item[] = [
    { name: 'ข้อมูลระบุตัวผู้ป่วย', score: 0, max: 10 },
    { name: 'ประวัติการเจ็บป่วย (History)', score: 0, max: 20 },
    { name: 'การตรวจร่างกาย (Physical Exam)', score: 0, max: 20 },
    { name: 'การวินิจฉัย (Diagnosis)', score: 0, max: 20 },
    { name: 'การรักษา/สั่งการรักษา', score: 0, max: 20 },
    { name: 'ลายมือชื่อผู้บันทึก', score: 0, max: 10 },
];

const StarRow = ({ level }: { level: number }) => (
    <span className="inline-flex">{[1, 2, 3].map((n) => <Star key={n} className={cn('h-3.5 w-3.5', n <= level ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />)}</span>
);

export default function MedicalRecord({ type, audits, byItem, byDoctor, summary, mra }: Props) {
    const [modal, setModal] = useState(false);
    const [items, setItems] = useState<Item[]>(DEFAULT_ITEMS);
    const form = useForm<any>({ record_type: 'OPD', patient_ref: '', doctor: '', audit_date: '', auditor: '', note: '', print_checked: false, discrepancy: '', items: DEFAULT_ITEMS });

    const openCreate = () => { setItems(DEFAULT_ITEMS.map((i) => ({ ...i }))); form.reset(); form.setData('items', DEFAULT_ITEMS.map((i) => ({ ...i }))); setModal(true); };

    const updateItem = (idx: number, key: keyof Item, val: any) => {
        const next = items.map((it, i) => i === idx ? { ...it, [key]: key === 'name' ? val : Number(val) } : it);
        setItems(next); form.setData('items', next);
    };
    const addItem = () => { const next = [...items, { name: '', score: 0, max: 10 }]; setItems(next); form.setData('items', next); };
    const removeItem = (idx: number) => { const next = items.filter((_, i) => i !== idx); setItems(next); form.setData('items', next); };

    const totalScore = items.reduce((s, i) => s + Number(i.score || 0), 0);
    const totalMax = items.reduce((s, i) => s + Number(i.max || 0), 0);
    const percent = totalMax ? Math.round((totalScore / totalMax) * 1000) / 10 : 0;
    const star = percent >= 95 ? 3 : percent >= 80 ? 2 : 1;

    const submit = (e: React.FormEvent) => { e.preventDefault(); form.post(route('im.medical-record.store'), { onSuccess: () => { setModal(false); form.reset(); } }); };

    return (
        <ImPage active="im.medical-record" icon={FileCheck} badge="หมวดที่ 5" title="Medical Record Quality Control" subtitle="ควบคุมคุณภาพเวชระเบียน (OPD / IPD Audit) · เชื่อมโยงผลการตรวจจากระบบ MRA"
            actions={<div className="flex flex-wrap items-center gap-2">
                <select value={type ?? ''} onChange={(e) => router.get(route('im.medical-record'), e.target.value ? { type: e.target.value } : {}, { preserveState: false })} className={cn(imSelect, 'w-auto')}><option value="">ทั้งหมด</option><option value="OPD">OPD</option><option value="IPD">IPD</option></select>
                <Button variant="outline" className="rounded-xl" asChild>
                    <Link href={route('mra.reports')}><ClipboardList className="mr-1 h-4 w-4" /> รายงาน MRA</Link>
                </Button>
                <Button variant="outline" className="rounded-xl" asChild>
                    <Link href={route('mra.create')}><ExternalLink className="mr-1 h-4 w-4" /> ตรวจในระบบ MRA</Link>
                </Button>
                <Button onClick={openCreate} className="rounded-xl bg-sky-600 hover:bg-sky-700"><Plus className="mr-1 h-4 w-4" /> บันทึกตรวจ IM</Button>
            </div>}>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 px-4 py-3 text-sm text-indigo-800">
                ผลการตรวจด้านล่างดึงจาก <span className="font-semibold">ระบบ MRA</span> ตามเกณฑ์ สรพ. 2563 (OPD / IPD) สามารถเปิดรายละเอียดหรือรายงานฉบับเต็มในระบบ MRA ได้
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                <StatCard label="รายการ MRA ทั้งหมด" value={mra.summary.total} sub={`เสร็จ ${mra.summary.completed} · รอ ${mra.summary.pending}`} icon={FileCheck} tone="sky" />
                <StatCard label="คะแนนเฉลี่ยรวม" value={`${mra.summary.avg}%`} icon={Target} tone={mra.summary.avg >= 80 ? 'emerald' : 'amber'} />
                <StatCard label="คะแนนเฉลี่ย OPD" value={`${mra.summary.opd_avg}%`} icon={Target} tone="emerald" />
                <StatCard label="คะแนนเฉลี่ย IPD" value={`${mra.summary.ipd_avg}%`} icon={Target} tone="violet" />
                <StatCard label="ผ่าน ≥80%" value={mra.summary.above_80} icon={Star} tone="amber" />
                <StatCard label="ผ่าน ≥95%" value={mra.summary.above_95} icon={Star} tone="emerald" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="แนวโน้ม 6 เดือน (MRA)" description="จำนวนที่ตรวจเสร็จและคะแนนเฉลี่ยรายเดือน">
                    {mra.monthly.every((row) => row.total === 0) ? <EmptyState text="ยังไม่มีผลการตรวจ MRA ใน 6 เดือนนี้" /> : (
                        <div className="grid grid-cols-6 gap-2">
                            {mra.monthly.map((row) => (
                                <div key={row.month} className="rounded-xl border border-slate-100 bg-slate-50/70 px-2 py-3 text-center">
                                    <div className="text-[11px] text-slate-500">{row.month}</div>
                                    <div className={cn('mt-1 text-lg font-bold', row.avg >= 95 ? 'text-emerald-600' : row.avg >= 80 ? 'text-amber-600' : row.total ? 'text-rose-600' : 'text-slate-400')}>{row.avg}%</div>
                                    <div className="text-[10px] text-slate-400">{row.total} ฉบับ</div>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
                <Panel title="จุดที่ไม่ผ่านบ่อย (MRA)" description="หัวข้อที่ fail บ่อยจากเกณฑ์ สรพ. 2563">
                    {mra.top_errors.length === 0 ? <EmptyState text="ยังไม่มีรายการที่ไม่ผ่าน" /> : (
                        <div className="space-y-2">
                            {mra.top_errors.map((err) => (
                                <div key={`${err.criteria_code}-${err.criteria_name}`} className="flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-slate-800">{err.criteria_code} · {err.criteria_name}</div>
                                        <div className="text-[11px] text-slate-500">{err.category_name}</div>
                                    </div>
                                    <span className="shrink-0 text-sm font-bold text-rose-600">{err.fail_count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="คุณภาพรายหมวดจาก MRA" description="อัตราผ่านรายหมวดเกณฑ์ สรพ. 2563 (เป้า ≥80%)">
                    {mra.by_category.length === 0 ? <EmptyState text="ยังไม่มีคะแนนรายหมวดจาก MRA" /> : (
                        <div className="space-y-3">
                            {mra.by_category.map((it) => (
                                <div key={it.id}>
                                    <div className="mb-1 flex justify-between gap-2 text-xs">
                                        <span className="text-slate-600"><span className="mr-1 font-semibold text-slate-400">{it.audit_type}</span>{it.code} {it.name}</span>
                                        <span className={cn('shrink-0 font-semibold', it.avg >= 95 ? 'text-emerald-600' : it.avg >= 80 ? 'text-amber-600' : 'text-rose-600')}>{it.avg}% · {it.passed}/{it.total}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', it.avg >= 95 ? 'bg-emerald-500' : it.avg >= 80 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${Math.min(100, it.avg)}%` }} /></div>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
                <Panel title="คะแนนคุณภาพรายแพทย์ (MRA)" description="เฉลี่ยจากฉบับที่ตรวจเสร็จในระบบ MRA">
                    {mra.by_doctor.length === 0 ? <EmptyState text="ยังไม่มีข้อมูลแพทย์จาก MRA" /> : (
                        <div className="space-y-2">
                            {mra.by_doctor.map((d) => (
                                <div key={d.doctor} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm">
                                    <span className="inline-flex items-center gap-2 text-slate-700"><Stethoscope className="h-4 w-4 text-slate-400" /> {d.doctor}</span>
                                    <span className="flex items-center gap-2"><span className="text-xs text-slate-400">{d.count} เคส</span><span className={cn('font-semibold', d.avg >= 95 ? 'text-emerald-600' : d.avg >= 80 ? 'text-amber-600' : 'text-rose-600')}>{d.avg}%</span></span>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            </div>

            <Panel
                title="ผลการตรวจจากระบบ MRA"
                description="รายการล่าสุดจากระบบตรวจสอบเวชระเบียน (กดเปิดเพื่อดูรายละเอียดตามเกณฑ์ สรพ. 2563)"
                action={<Button size="sm" variant="outline" className="rounded-xl" asChild><Link href={route('mra.index')}>ดูทั้งหมดใน MRA</Link></Button>}
            >
                {mra.audits.length === 0 ? (
                    <EmptyState text="ยังไม่มีรายการในระบบ MRA — กด “ตรวจในระบบ MRA” เพื่อเริ่มตรวจ" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                <th className="py-2 pr-3">วันที่ตรวจ</th><th className="py-2 pr-3">ประเภท</th><th className="py-2 pr-3">HN / ผู้ป่วย</th><th className="py-2 pr-3">แพทย์</th><th className="py-2 pr-3">สถานะ</th><th className="py-2 pr-3">คะแนน</th><th className="py-2 pr-3">ระดับ</th><th className="py-2"></th>
                            </tr></thead>
                            <tbody>
                                {mra.audits.map((a) => (
                                    <tr key={a.id} className="border-b border-slate-50">
                                        <td className="py-2.5 pr-3 text-slate-600">{fmtDate(a.audited_at || a.visit_date)}</td>
                                        <td className="py-2.5 pr-3"><StatusPill label={a.audit_type} className={a.audit_type === 'IPD' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-sky-200 bg-sky-50 text-sky-700'} /></td>
                                        <td className="py-2.5 pr-3">
                                            <div className="font-medium text-slate-700">{a.hn || '-'}</div>
                                            <div className="text-[11px] text-slate-400">{a.patient_name || (a.an ? `AN ${a.an}` : '-')}</div>
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-600">{a.doctor || '-'}</td>
                                        <td className="py-2.5 pr-3"><StatusPill label={MRA_STATUS_LABEL[a.status] ?? a.status} className={MRA_STATUS_STYLE[a.status] ?? 'border-slate-200 bg-slate-50 text-slate-600'} /></td>
                                        <td className="py-2.5 pr-3"><span className={cn('font-semibold', a.percent >= 95 ? 'text-emerald-600' : a.percent >= 80 ? 'text-amber-600' : 'text-rose-600')}>{a.percent}%</span> <span className="text-xs text-slate-400">({a.total_score}/{a.max_score})</span></td>
                                        <td className="py-2.5 pr-3"><StarRow level={a.star_level} /></td>
                                        <td className="py-2.5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <a href={route('mra.export-pdf', a.id)} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-sky-600" title="PDF"><FileDown className="h-4 w-4" /></a>
                                                <Link href={route('mra.show', a.id)} className="text-sky-600 hover:text-sky-800" title="เปิดใน MRA"><ExternalLink className="h-4 w-4" /></Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                <StatCard label="บันทึก IM ทั้งหมด" value={summary.total} icon={FileCheck} tone="slate" />
                <StatCard label="เฉลี่ย OPD (IM)" value={`${summary.opd_avg}%`} icon={Target} tone="emerald" />
                <StatCard label="เฉลี่ย IPD (IM)" value={`${summary.ipd_avg}%`} icon={Target} tone="violet" />
                <StatCard label="ผ่าน ≥80% (IM)" value={summary.above_80} icon={Star} tone="amber" />
                <StatCard label="ผ่าน ≥95% (IM)" value={summary.above_95} icon={Star} tone="emerald" />
                <StatCard label="พบความขัดแย้ง (IM)" value={summary.discrepancies} icon={AlertTriangle} tone={summary.discrepancies ? 'rose' : 'slate'} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Quality Development Plan (บันทึก IM)" description="คะแนนเฉลี่ยรายหัวข้อจากการบันทึกในหน้านี้ (เป้า ≥80% ระดับ 1⭐, ≥95% ระดับ 2⭐)">
                    {byItem.length === 0 ? <EmptyState text="ยังไม่มีข้อมูล" /> : (
                        <div className="space-y-3">
                            {byItem.map((it) => (
                                <div key={it.name}>
                                    <div className="mb-1 flex justify-between text-xs"><span className="text-slate-600">{it.name}</span><span className={cn('font-semibold', it.avg >= 95 ? 'text-emerald-600' : it.avg >= 80 ? 'text-amber-600' : 'text-rose-600')}>{it.avg}%</span></div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', it.avg >= 95 ? 'bg-emerald-500' : it.avg >= 80 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${Math.min(100, it.avg)}%` }} /></div>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
                <Panel title="คะแนนคุณภาพรายแพทย์ (บันทึก IM)" description="ประเมินคะแนนของแพทย์แต่ละคนจากการบันทึกในหน้านี้">
                    {byDoctor.length === 0 ? <EmptyState text="ยังไม่มีข้อมูล" /> : (
                        <div className="space-y-2">
                            {byDoctor.map((d) => (
                                <div key={d.doctor} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm">
                                    <span className="inline-flex items-center gap-2 text-slate-700"><Stethoscope className="h-4 w-4 text-slate-400" /> {d.doctor}</span>
                                    <span className="flex items-center gap-2"><span className="text-xs text-slate-400">{d.count} เคส</span><span className={cn('font-semibold', d.avg >= 95 ? 'text-emerald-600' : d.avg >= 80 ? 'text-amber-600' : 'text-rose-600')}>{d.avg}%</span></span>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            </div>

            <Panel title="บันทึกตรวจภายในงานสารสนเทศ (IM)" description="รายการที่บันทึกในหน้านี้โดยตรง ไม่ใช่จากระบบ MRA">
                {audits.length === 0 ? <EmptyState text="ยังไม่มีการตรวจ" /> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400"><th className="py-2 pr-3">วันที่</th><th className="py-2 pr-3">ประเภท</th><th className="py-2 pr-3">HN/AN</th><th className="py-2 pr-3">แพทย์</th><th className="py-2 pr-3">คะแนน</th><th className="py-2 pr-3">ระดับ</th><th className="py-2 pr-3">พิมพ์/ขัดแย้ง</th><th className="py-2"></th></tr></thead>
                            <tbody>
                                {audits.map((a) => (
                                    <tr key={a.id} className="border-b border-slate-50">
                                        <td className="py-2.5 pr-3 text-slate-600">{fmtDate(a.audit_date)}</td>
                                        <td className="py-2.5 pr-3"><StatusPill label={a.record_type} className={a.record_type === 'IPD' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-sky-200 bg-sky-50 text-sky-700'} /></td>
                                        <td className="py-2.5 pr-3 text-slate-500">{a.patient_ref || '-'}</td>
                                        <td className="py-2.5 pr-3 text-slate-600">{a.doctor || '-'}</td>
                                        <td className="py-2.5 pr-3"><span className={cn('font-semibold', a.percent >= 95 ? 'text-emerald-600' : a.percent >= 80 ? 'text-amber-600' : 'text-rose-600')}>{a.percent}%</span> <span className="text-xs text-slate-400">({a.total_score}/{a.max_score})</span></td>
                                        <td className="py-2.5 pr-3"><StarRow level={a.star_level} /></td>
                                        <td className="py-2.5 pr-3">{a.print_checked ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Printer className="h-3 w-3" /> ตรวจแล้ว</span> : <span className="text-xs text-slate-300">-</span>}{a.discrepancy && <div className="text-[10px] text-rose-500">พบ: {a.discrepancy}</div>}</td>
                                        <td className="py-2.5 text-right"><button onClick={() => router.delete(route('im.medical-record.destroy', a.id))} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>

            <Modal open={modal} onClose={() => setModal(false)} title="ตรวจคุณภาพเวชระเบียน" wide
                footer={<><Button variant="outline" className="rounded-xl" onClick={() => setModal(false)}>ยกเลิก</Button><Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={submit} disabled={form.processing}>บันทึก</Button></>}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ประเภท"><select value={form.data.record_type} onChange={(e) => form.setData('record_type', e.target.value)} className={imSelect}><option value="OPD">OPD (ผู้ป่วยนอก)</option><option value="IPD">IPD (ผู้ป่วยใน)</option></select></Field>
                    <Field label="HN/AN"><Input value={form.data.patient_ref} onChange={(e) => form.setData('patient_ref', e.target.value)} className="rounded-xl" /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="แพทย์เจ้าของไข้"><Input value={form.data.doctor} onChange={(e) => form.setData('doctor', e.target.value)} className="rounded-xl" /></Field>
                    <Field label="วันที่ตรวจ" required><Input type="date" value={form.data.audit_date} onChange={(e) => form.setData('audit_date', e.target.value)} className="rounded-xl" /></Field>
                    <Field label="ผู้ตรวจ (กรรมการ)"><Input value={form.data.auditor} onChange={(e) => form.setData('auditor', e.target.value)} className="rounded-xl" /></Field>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold text-slate-700">หัวข้อการตรวจประเมิน</span><Button size="sm" variant="outline" className="rounded-lg" onClick={addItem}><Plus className="mr-1 h-3 w-3" /> เพิ่มหัวข้อ</Button></div>
                    <div className="space-y-2">
                        {items.map((it, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_70px_70px_30px] items-center gap-2">
                                <Input value={it.name} onChange={(e) => updateItem(idx, 'name', e.target.value)} className="rounded-lg text-sm" placeholder="หัวข้อ" />
                                <Input type="number" value={it.score} onChange={(e) => updateItem(idx, 'score', e.target.value)} className="rounded-lg text-sm" placeholder="ได้" />
                                <Input type="number" value={it.max} onChange={(e) => updateItem(idx, 'max', e.target.value)} className="rounded-lg text-sm" placeholder="เต็ม" />
                                <button onClick={() => removeItem(idx)} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="text-slate-600">รวม {totalScore}/{totalMax}</span>
                        <span className="flex items-center gap-2"><StarRow level={star} /><span className={cn('font-bold', percent >= 95 ? 'text-emerald-600' : percent >= 80 ? 'text-amber-600' : 'text-rose-600')}>{percent}%</span></span>
                    </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.data.print_checked} onChange={(e) => form.setData('print_checked', e.target.checked)} /> ตรวจสอบการพิมพ์เวชระเบียนลงกระดาษแล้ว</label>
                <Field label="ความผิดเพี้ยน/ขัดแย้งที่พบ (Print Discrepancy)"><textarea value={form.data.discrepancy} onChange={(e) => form.setData('discrepancy', e.target.value)} className={imInput} rows={2} /></Field>
                <Field label="หมายเหตุ"><textarea value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} className={imInput} rows={2} /></Field>
            </Modal>
        </ImPage>
    );
}
