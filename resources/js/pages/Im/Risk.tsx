import React, { useMemo, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { ImPage, StatCard, Panel, Modal, Field, StatusPill, EmptyState } from '@/pages/Im/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { imInput, imSelect, riskColor, riskLabel, STATUS_STYLE, STATUS_LABEL } from '@/pages/Im/shared';
import { ShieldAlert, Plus, Trash2, Pencil, TrendingDown, AlertTriangle, ShieldCheck } from 'lucide-react';

interface Risk {
    id: number; code: string; year: number; category?: string; description: string; is_incident: boolean;
    likelihood: number; impact: number; score: number; strategy?: string; mitigation?: string;
    residual_likelihood?: number; residual_impact?: number; residual_score?: number; pdca_round: number;
    previous_risk_id?: number; previous?: { id: number; code: string } | null; owner?: string; status: string;
}
interface Props {
    year: number; years: number[]; risks: Risk[];
    matrix: Record<string, Risk[]>;
    summary: { total: number; high: number; medium: number; low: number; avg_before: number; avg_after: number; improved: number; };
    comparison: { code: string; description: string; before: number; after: number }[];
}

const STRATEGY: Record<string, { label: string; desc: string; color: string }> = {
    avoid: { label: 'Avoid (หลีกเลี่ยง)', desc: 'ยกเลิก/เปลี่ยนกิจกรรมที่ก่อความเสี่ยง', color: 'from-rose-500 to-red-600' },
    reduce: { label: 'Reduce (ลด)', desc: 'ควบคุมเพื่อลดโอกาส/ผลกระทบ', color: 'from-amber-500 to-orange-600' },
    share: { label: 'Share (ถ่ายโอน)', desc: 'ประกัน/จ้างภายนอกรับความเสี่ยง', color: 'from-sky-500 to-blue-600' },
    accept: { label: 'Accept (ยอมรับ)', desc: 'ยอมรับความเสี่ยงระดับต่ำ', color: 'from-emerald-500 to-teal-600' },
};

export default function RiskPage({ year, years, risks, matrix, summary, comparison }: Props) {
    const [modal, setModal] = useState<{ open: boolean; edit?: Risk }>({ open: false });
    const thaiYear = new Date().getFullYear() + 543;

    const form = useForm({
        code: '', year, category: '', description: '', is_incident: false as boolean,
        likelihood: 3, impact: 3, strategy: 'reduce', mitigation: '',
        residual_likelihood: '' as number | string, residual_impact: '' as number | string,
        pdca_round: 1, previous_risk_id: '' as number | string, owner: '', status: 'open',
    });

    const score = useMemo(() => Number(form.data.likelihood) * Number(form.data.impact), [form.data.likelihood, form.data.impact]);
    const residual = useMemo(() => (form.data.residual_likelihood && form.data.residual_impact) ? Number(form.data.residual_likelihood) * Number(form.data.residual_impact) : null, [form.data.residual_likelihood, form.data.residual_impact]);

    const openCreate = () => { form.reset(); form.setData('year', year); setModal({ open: true }); };
    const openEdit = (r: Risk) => {
        form.setData({
            code: r.code, year: r.year, category: r.category ?? '', description: r.description, is_incident: r.is_incident,
            likelihood: r.likelihood, impact: r.impact, strategy: r.strategy ?? 'reduce', mitigation: r.mitigation ?? '',
            residual_likelihood: r.residual_likelihood ?? '', residual_impact: r.residual_impact ?? '',
            pdca_round: r.pdca_round, previous_risk_id: r.previous_risk_id ?? '', owner: r.owner ?? '', status: r.status,
        } as any);
        setModal({ open: true, edit: r });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modal.edit) form.put(route('im.risk.update', modal.edit.id), { onSuccess: () => setModal({ open: false }) });
        else form.post(route('im.risk.store'), { onSuccess: () => { setModal({ open: false }); form.reset(); } });
    };

    return (
        <ImPage active="im.risk" icon={ShieldAlert} badge="หมวดที่ 2" title="IT Risk Management" subtitle="บริหารจัดการความเสี่ยงด้านสารสนเทศโรงพยาบาล"
            actions={<div className="flex items-center gap-2">
                <select value={year} onChange={(e) => router.get(route('im.risk'), { year: e.target.value }, { preserveState: false })} className={cn(imSelect, 'w-auto')}>
                    {[thaiYear, thaiYear - 1, thaiYear - 2, ...years].filter((v, i, a) => a.indexOf(v) === i).map((y) => <option key={y} value={y}>ปี {y}</option>)}
                </select>
                <Button onClick={openCreate} className="rounded-xl bg-sky-600 hover:bg-sky-700"><Plus className="mr-1 h-4 w-4" /> ประเมินความเสี่ยง</Button>
            </div>}>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                <StatCard label="ความเสี่ยงทั้งหมด" value={summary.total} icon={ShieldAlert} tone="sky" />
                <StatCard label="ระดับสูง" value={summary.high} sub="score ≥ 15" icon={AlertTriangle} tone="rose" />
                <StatCard label="ระดับปานกลาง" value={summary.medium} sub="score 8-14" icon={AlertTriangle} tone="amber" />
                <StatCard label="ระดับต่ำ" value={summary.low} sub="score < 8" icon={ShieldCheck} tone="emerald" />
                <StatCard label="คะแนนเฉลี่ยก่อน" value={summary.avg_before} icon={TrendingDown} tone="slate" />
                <StatCard label="คะแนนเฉลี่ยหลัง" value={summary.avg_after} sub={`ดีขึ้น ${summary.improved} รายการ`} icon={TrendingDown} tone="emerald" />
            </div>

            {/* 4 Matrix */}
            <Panel title="Risk Mitigation Strategy (4 Matrix)" description="แยกกลยุทธ์จัดการความเสี่ยง 4 ด้าน">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {Object.entries(STRATEGY).map(([key, s]) => (
                        <div key={key} className="rounded-2xl border border-slate-200 bg-white">
                            <div className={cn('rounded-t-2xl bg-gradient-to-r px-4 py-3 text-white', s.color)}>
                                <div className="font-bold">{s.label}</div>
                                <div className="text-[11px] text-white/80">{s.desc}</div>
                            </div>
                            <div className="space-y-2 p-3">
                                {(matrix[key] ?? []).length === 0 ? <div className="py-4 text-center text-xs text-slate-400">ไม่มีรายการ</div> :
                                    (matrix[key] ?? []).map((r) => (
                                        <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-2 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-slate-700">{r.code}</span>
                                                <StatusPill label={String(r.score)} className={riskColor(r.score)} />
                                            </div>
                                            <div className="mt-1 line-clamp-2 text-slate-500">{r.description}</div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Panel>

            {/* Pre-Post comparison */}
            <Panel title="Pre-Post Risk Score Comparison" description="เปรียบเทียบคะแนนความเสี่ยงก่อนและหลังการจัดการ">
                {comparison.length === 0 ? <EmptyState text="ยังไม่มีข้อมูลคะแนนหลังการจัดการ (residual)" /> : (
                    <div className="space-y-3">
                        {comparison.map((c) => (
                            <div key={c.code} className="grid grid-cols-[80px_1fr] items-center gap-3">
                                <span className="text-xs font-semibold text-slate-600">{c.code}</span>
                                <div>
                                    <div className="mb-1 flex items-center gap-3 text-[11px] text-slate-400">
                                        <span>ก่อน {c.before}</span><span className="text-emerald-600">หลัง {c.after}</span>
                                        {c.after < c.before && <span className="text-emerald-600">↓ ลดลง {c.before - c.after}</span>}
                                    </div>
                                    <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
                                        <div className="absolute inset-y-0 left-0 rounded-full bg-rose-300" style={{ width: `${(c.before / 25) * 100}%` }} />
                                        <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500" style={{ width: `${(c.after / 25) * 100}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>

            {/* History table */}
            <Panel title="Risk History & PDCA Logs" description="ทะเบียนความเสี่ยงรายปี เชื่อมโยงรหัสและรอบ PDCA">
                {risks.length === 0 ? <EmptyState text="ยังไม่มีรายการความเสี่ยงในปีนี้" /> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                <th className="py-2 pr-3">รหัส</th><th className="py-2 pr-3">ความเสี่ยง</th><th className="py-2 pr-3">P×I</th><th className="py-2 pr-3">กลยุทธ์</th><th className="py-2 pr-3">หลังจัดการ</th><th className="py-2 pr-3">PDCA</th><th className="py-2 pr-3">สถานะ</th><th className="py-2"></th>
                            </tr></thead>
                            <tbody>
                                {risks.map((r) => (
                                    <tr key={r.id} className="border-b border-slate-50 align-top">
                                        <td className="py-3 pr-3">
                                            <div className="font-semibold text-slate-700">{r.code}</div>
                                            {r.previous && <div className="text-[10px] text-slate-400">← {r.previous.code}</div>}
                                        </td>
                                        <td className="py-3 pr-3 max-w-xs text-slate-600">{r.description}{r.category && <div className="text-[10px] text-slate-400">{r.category}</div>}</td>
                                        <td className="py-3 pr-3"><StatusPill label={`${r.score} (${riskLabel(r.score)})`} className={riskColor(r.score)} /><div className="mt-0.5 text-[10px] text-slate-400">P{r.likelihood}×I{r.impact}</div></td>
                                        <td className="py-3 pr-3 text-slate-600">{r.strategy ? STRATEGY[r.strategy]?.label.split(' ')[0] : '-'}</td>
                                        <td className="py-3 pr-3">{r.residual_score != null ? <StatusPill label={String(r.residual_score)} className={riskColor(r.residual_score)} /> : <span className="text-slate-300">-</span>}</td>
                                        <td className="py-3 pr-3 text-slate-600">รอบ {r.pdca_round}</td>
                                        <td className="py-3 pr-3"><StatusPill label={STATUS_LABEL[r.status] ?? r.status} className={STATUS_STYLE[r.status] ?? STATUS_STYLE.open} /></td>
                                        <td className="py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => openEdit(r)} className="text-slate-400 hover:text-sky-600"><Pencil className="h-4 w-4" /></button>
                                                <button onClick={() => router.delete(route('im.risk.destroy', r.id))} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>

            <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.edit ? 'แก้ไขความเสี่ยง' : 'ประเมินความเสี่ยง IT'} wide
                footer={<><Button variant="outline" className="rounded-xl" onClick={() => setModal({ open: false })}>ยกเลิก</Button><Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={submit} disabled={form.processing}>บันทึก</Button></>}>
                <label className={cn('flex items-start gap-2 rounded-xl border p-3 text-sm', form.data.is_incident ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50')}>
                    <input type="checkbox" checked={form.data.is_incident} onChange={(e) => form.setData('is_incident', e.target.checked)} className="mt-0.5" />
                    <span><span className="font-semibold text-slate-700">เป็นอุบัติการณ์ที่เกิดขึ้นแล้ว</span><br /><span className="text-xs text-slate-500">ระบบจะบล็อกไม่ให้บันทึก — การประเมินนี้ใช้วิเคราะห์โอกาสเกิดในอนาคตเท่านั้น</span></span>
                </label>
                {form.errors.is_incident && <p className="text-xs text-rose-500">{form.errors.is_incident}</p>}

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="รหัส (เว้นว่างให้ระบบสร้าง)"><Input value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} className="rounded-xl" placeholder="RISK-2569-001" /></Field>
                    <Field label="ปี (พ.ศ.)" required><Input type="number" value={form.data.year} onChange={(e) => form.setData('year', Number(e.target.value))} className="rounded-xl" /></Field>
                </div>
                <Field label="ประเภท/หมวดความเสี่ยง"><Input value={form.data.category} onChange={(e) => form.setData('category', e.target.value)} className="rounded-xl" placeholder="เช่น ความปลอดภัยข้อมูล, ระบบล่ม" /></Field>
                <Field label="รายละเอียดความเสี่ยง" required error={form.errors.description}><textarea value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} className={imInput} rows={2} /></Field>

                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="โอกาสเกิด (P) 1-5" required><select value={form.data.likelihood} onChange={(e) => form.setData('likelihood', Number(e.target.value))} className={imSelect}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
                    <Field label="ผลกระทบ (I) 1-5" required><select value={form.data.impact} onChange={(e) => form.setData('impact', Number(e.target.value))} className={imSelect}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
                    <Field label="คะแนนความเสี่ยง"><div className={cn('rounded-xl border px-3 py-2 text-center font-bold', riskColor(score))}>{score} ({riskLabel(score)})</div></Field>
                </div>

                <Field label="กลยุทธ์จัดการ (4 Matrix)"><select value={form.data.strategy} onChange={(e) => form.setData('strategy', e.target.value)} className={imSelect}>{Object.entries(STRATEGY).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select></Field>
                <Field label="มาตรการควบคุม/จัดการ"><textarea value={form.data.mitigation} onChange={(e) => form.setData('mitigation', e.target.value)} className={imInput} rows={2} /></Field>

                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="P หลังจัดการ"><select value={form.data.residual_likelihood} onChange={(e) => form.setData('residual_likelihood', e.target.value)} className={imSelect}><option value="">-</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
                    <Field label="I หลังจัดการ"><select value={form.data.residual_impact} onChange={(e) => form.setData('residual_impact', e.target.value)} className={imSelect}><option value="">-</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
                    <Field label="คะแนนหลังจัดการ"><div className={cn('rounded-xl border px-3 py-2 text-center font-bold', residual != null ? riskColor(residual) : 'border-slate-200 text-slate-400')}>{residual ?? '-'}</div></Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="รอบ PDCA"><Input type="number" min={1} value={form.data.pdca_round} onChange={(e) => form.setData('pdca_round', Number(e.target.value))} className="rounded-xl" /></Field>
                    <Field label="ผู้รับผิดชอบ"><Input value={form.data.owner} onChange={(e) => form.setData('owner', e.target.value)} className="rounded-xl" /></Field>
                    <Field label="สถานะ"><select value={form.data.status} onChange={(e) => form.setData('status', e.target.value)} className={imSelect}><option value="open">เปิด</option><option value="mitigating">กำลังจัดการ</option><option value="closed">ปิด</option></select></Field>
                </div>
            </Modal>
        </ImPage>
    );
}
