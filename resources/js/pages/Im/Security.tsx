import React, { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { ImPage, StatCard, Panel, Modal, Field, StatusPill, EmptyState } from '@/pages/Im/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { imInput, imSelect, fmtDate, fmtDuration, STATUS_STYLE, STATUS_LABEL } from '@/pages/Im/shared';
import { Lock, Plus, Trash2, FileText, ShieldCheck, Timer, HardDriveDownload, Download, GraduationCap } from 'lucide-react';

interface Policy { id: number; title: string; type: string; version: string; summary?: string; file_url?: string | null; effective_date?: string; status: string; }
interface Awareness { id: number; staff_name: string; department?: string; policy?: { id: number; title: string } | null; score: number; max_score: number; passed: boolean; tested_at?: string; }
interface Drill { id: number; system_name: string; type: string; scope?: string; drill_date: string; duration_seconds: number; rto_target_minutes?: number; result: string; report?: string; improvements?: string; }
interface Backup { id: number; backup_date: string; type: string; scope?: string; status: string; size_gb?: number; notes?: string; performed_by?: string; }

interface Props {
    policies: Policy[]; awareness: Awareness[]; drills: Drill[]; backups: Backup[];
    summary: { policies: number; pdpa: number; awareness_rate: number; awareness_total: number; drills: number; drill_pass: number; backup_success: number; backup_total: number; };
}

type Tab = 'policies' | 'awareness' | 'drills' | 'backups';

function formatBackupSize(sizeGb?: number | null): string {
    if (sizeGb == null || Number.isNaN(Number(sizeGb))) return '-';
    const gb = Number(sizeGb);
    if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 1 : 2)} GB`;
    const mb = gb * 1024;
    if (mb >= 1) return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
    const kb = mb * 1024;
    return `${kb.toFixed(0)} KB`;
}

export default function Security({ policies, awareness, drills, backups, summary }: Props) {
    const [tab, setTab] = useState<Tab>('policies');
    const [modal, setModal] = useState<Tab | null>(null);

    const policyForm = useForm<any>({ title: '', type: 'security', version: '1.0', summary: '', effective_date: '', status: 'published', file: null as File | null });
    const awForm = useForm({ staff_name: '', department: '', policy_id: '' as number | string, score: 80, max_score: 100, tested_at: '' });
    const drillForm = useForm({ system_name: '', type: 'BCP', scope: '', drill_date: '', duration_seconds: 0, rto_target_minutes: '' as number | string, result: 'pass', report: '', improvements: '' });
    const backupForm = useForm({ backup_date: '', type: 'offline', scope: '', status: 'success', size_gb: '' as number | string, notes: '', performed_by: '' });

    const submitPolicy = (e: React.FormEvent) => { e.preventDefault(); policyForm.post(route('im.security.policies.store'), { forceFormData: true, onSuccess: () => { setModal(null); policyForm.reset(); } }); };
    const submitAw = (e: React.FormEvent) => { e.preventDefault(); awForm.post(route('im.security.awareness.store'), { onSuccess: () => { setModal(null); awForm.reset(); } }); };
    const submitDrill = (e: React.FormEvent) => { e.preventDefault(); drillForm.post(route('im.security.drills.store'), { onSuccess: () => { setModal(null); drillForm.reset(); } }); };
    const submitBackup = (e: React.FormEvent) => { e.preventDefault(); backupForm.post(route('im.security.backups.store'), { onSuccess: () => { setModal(null); backupForm.reset(); } }); };

    const tabs: { key: Tab; label: string }[] = [
        { key: 'policies', label: 'นโยบาย & PDPA' },
        { key: 'awareness', label: 'ประเมินความเข้าใจ' },
        { key: 'drills', label: 'ซ้อมแผน BCP/DRP' },
        { key: 'backups', label: 'บันทึก Backup' },
    ];

    return (
        <ImPage active="im.security" icon={Lock} badge="หมวดที่ 3" title="Security, PDPA & Business Continuity" subtitle="นโยบายความมั่นคงปลอดภัยและการสำรอง/กู้คืนระบบ"
            actions={<Button onClick={() => setModal(tab)} className="rounded-xl bg-sky-600 hover:bg-sky-700"><Plus className="mr-1 h-4 w-4" /> เพิ่มรายการ</Button>}>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="นโยบายทั้งหมด" value={summary.policies} sub={`PDPA ${summary.pdpa} ฉบับ`} icon={FileText} tone="violet" />
                <StatCard label="ความเข้าใจบุคลากร" value={`${summary.awareness_rate}%`} sub={`${summary.awareness_total} คนที่ประเมิน`} icon={GraduationCap} tone={summary.awareness_rate >= 100 ? 'emerald' : 'amber'} />
                <StatCard label="ซ้อมแผน BCP/DRP" value={summary.drills} sub={`ผ่าน ${summary.drill_pass} ครั้ง`} icon={Timer} tone="sky" />
                <StatCard label="สำรองข้อมูลสำเร็จ" value={`${summary.backup_success}/${summary.backup_total}`} sub="ครั้งล่าสุด" icon={HardDriveDownload} tone="emerald" />
            </div>

            <div className="flex flex-wrap gap-2">
                {tabs.map((t) => (
                    <button key={t.key} onClick={() => setTab(t.key)} className={cn('rounded-xl border px-4 py-2 text-sm font-semibold transition', tab === t.key ? 'border-sky-400 bg-sky-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200')}>{t.label}</button>
                ))}
            </div>

            {tab === 'policies' && (
                <Panel title="Policy & PDPA Document Center" description="แหล่งรวมนโยบายความปลอดภัยและ PDPA พร้อมควบคุมเวอร์ชัน"
                    action={<Button size="sm" className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={() => setModal('policies')}><Plus className="mr-1 h-4 w-4" /> เพิ่มนโยบาย</Button>}>
                    {policies.length === 0 ? <EmptyState text="ยังไม่มีนโยบาย" /> : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {policies.map((p) => (
                                <div key={p.id} className="rounded-2xl border border-slate-200 p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <StatusPill label={p.type === 'pdpa' ? 'PDPA' : p.type === 'security' ? 'Security' : 'อื่นๆ'} className={p.type === 'pdpa' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-sky-200 bg-sky-50 text-sky-700'} />
                                            <StatusPill label={`v${p.version}`} className="border-slate-200 bg-slate-50 text-slate-500" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <StatusPill label={STATUS_LABEL[p.status] ?? p.status} className={STATUS_STYLE[p.status] ?? STATUS_STYLE.published} />
                                            <button onClick={() => router.delete(route('im.security.policies.destroy', p.id))} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </div>
                                    <div className="mt-2 font-semibold text-slate-800">{p.title}</div>
                                    {p.summary && <p className="mt-1 text-xs text-slate-500">{p.summary}</p>}
                                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                                        <span>มีผล {fmtDate(p.effective_date)}</span>
                                        {p.file_url && <a href={p.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-600 hover:underline"><Download className="h-3 w-3" /> เอกสาร</a>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            )}

            {tab === 'awareness' && (
                <Panel title="Staff Awareness & Testing Portal" description="ประเมินการรับรู้และความเข้าใจระเบียบความปลอดภัย (เป้าหมาย 100%)"
                    action={<Button size="sm" className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={() => setModal('awareness')}><Plus className="mr-1 h-4 w-4" /> บันทึกผล</Button>}>
                    {awareness.length === 0 ? <EmptyState text="ยังไม่มีผลการประเมิน" /> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400"><th className="py-2 pr-3">บุคลากร</th><th className="py-2 pr-3">หน่วยงาน</th><th className="py-2 pr-3">นโยบาย</th><th className="py-2 pr-3">คะแนน</th><th className="py-2 pr-3">ผล</th><th className="py-2 pr-3">วันที่</th><th className="py-2"></th></tr></thead>
                                <tbody>
                                    {awareness.map((a) => (
                                        <tr key={a.id} className="border-b border-slate-50">
                                            <td className="py-2.5 pr-3 font-medium text-slate-700">{a.staff_name}</td>
                                            <td className="py-2.5 pr-3 text-slate-500">{a.department || '-'}</td>
                                            <td className="py-2.5 pr-3 text-slate-500">{a.policy?.title || '-'}</td>
                                            <td className="py-2.5 pr-3 text-slate-600">{a.score}/{a.max_score}</td>
                                            <td className="py-2.5 pr-3"><StatusPill label={a.passed ? 'ผ่าน' : 'ไม่ผ่าน'} className={a.passed ? STATUS_STYLE.pass : STATUS_STYLE.fail} /></td>
                                            <td className="py-2.5 pr-3 text-slate-400">{fmtDate(a.tested_at)}</td>
                                            <td className="py-2.5 text-right"><button onClick={() => router.delete(route('im.security.awareness.destroy', a.id))} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
            )}

            {tab === 'drills' && (
                <Panel title="BCP & DRP Drill Manager" description="จับเวลาขั้นตอนซ้อมแผน บันทึกรายงานและ PDCA"
                    action={<Button size="sm" className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={() => setModal('drills')}><Plus className="mr-1 h-4 w-4" /> บันทึกการซ้อม</Button>}>
                    {drills.length === 0 ? <EmptyState text="ยังไม่มีบันทึกการซ้อมแผน" /> : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {drills.map((d) => (
                                <div key={d.id} className="rounded-2xl border border-slate-200 p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2"><StatusPill label={d.type} className={d.type === 'DRP' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-sky-200 bg-sky-50 text-sky-700'} /><span className="font-semibold text-slate-800">{d.system_name}</span></div>
                                        <div className="flex items-center gap-2"><StatusPill label={STATUS_LABEL[d.result] ?? d.result} className={STATUS_STYLE[d.result] ?? STATUS_STYLE.pass} /><button onClick={() => router.delete(route('im.security.drills.destroy', d.id))} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></div>
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                                        <div>วันซ้อม: {fmtDate(d.drill_date)}</div>
                                        <div className="inline-flex items-center gap-1"><Timer className="h-3 w-3" /> ใช้เวลา {fmtDuration(d.duration_seconds)}</div>
                                        {d.rto_target_minutes != null && <div>RTO เป้าหมาย: {d.rto_target_minutes} นาที</div>}
                                    </div>
                                    {d.improvements && <div className="mt-2 rounded-xl bg-slate-50 p-2 text-xs text-slate-600"><span className="font-semibold">ปรับปรุง (PDCA):</span> {d.improvements}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            )}

            {tab === 'backups' && (
                <Panel title="Backup Logs & Checklist" description="บันทึกการสำรองข้อมูลแบบ Offline ประจำวัน"
                    action={<Button size="sm" className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={() => setModal('backups')}><Plus className="mr-1 h-4 w-4" /> บันทึก Backup</Button>}>
                    {backups.length === 0 ? <EmptyState text="ยังไม่มีบันทึกการสำรองข้อมูล" /> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400"><th className="py-2 pr-3">วันที่</th><th className="py-2 pr-3">ประเภท</th><th className="py-2 pr-3">ขอบเขต</th><th className="py-2 pr-3">ขนาด</th><th className="py-2 pr-3">สถานะ</th><th className="py-2 pr-3">ผู้ปฏิบัติ</th><th className="py-2 pr-3">รายละเอียด</th><th className="py-2"></th></tr></thead>
                                <tbody>
                                    {backups.map((b) => (
                                        <tr key={b.id} className="border-b border-slate-50">
                                            <td className="py-2.5 pr-3 text-slate-600">{fmtDate(b.backup_date)}</td>
                                            <td className="py-2.5 pr-3"><StatusPill label={b.type === 'offline' ? 'Offline' : 'Online'} className="border-slate-200 bg-slate-50 text-slate-600" /></td>
                                            <td className="py-2.5 pr-3 text-slate-500">{b.scope || '-'}</td>
                                            <td className="py-2.5 pr-3 text-slate-500">{formatBackupSize(b.size_gb)}</td>
                                            <td className="py-2.5 pr-3"><StatusPill label={STATUS_LABEL[b.status] ?? b.status} className={STATUS_STYLE[b.status] ?? STATUS_STYLE.success} /></td>
                                            <td className="py-2.5 pr-3 text-slate-500">{b.performed_by || '-'}</td>
                                            <td className="max-w-xs truncate py-2.5 pr-3 text-xs text-slate-400" title={b.notes || ''}>{b.notes || '-'}</td>
                                            <td className="py-2.5 text-right"><button onClick={() => router.delete(route('im.security.backups.destroy', b.id))} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
            )}

            {/* Modals */}
            <Modal open={modal === 'policies'} onClose={() => setModal(null)} title="เพิ่มนโยบาย / เอกสาร PDPA"
                footer={<><Button variant="outline" className="rounded-xl" onClick={() => setModal(null)}>ยกเลิก</Button><Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={submitPolicy} disabled={policyForm.processing}>บันทึก</Button></>}>
                <Field label="ชื่อนโยบาย" required error={policyForm.errors.title}><Input value={policyForm.data.title} onChange={(e) => policyForm.setData('title', e.target.value)} className="rounded-xl" /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ประเภท"><select value={policyForm.data.type} onChange={(e) => policyForm.setData('type', e.target.value)} className={imSelect}><option value="security">Security</option><option value="pdpa">PDPA</option><option value="other">อื่นๆ</option></select></Field>
                    <Field label="เวอร์ชัน" required><Input value={policyForm.data.version} onChange={(e) => policyForm.setData('version', e.target.value)} className="rounded-xl" /></Field>
                </div>
                <Field label="สาระสำคัญ"><textarea value={policyForm.data.summary} onChange={(e) => policyForm.setData('summary', e.target.value)} className={imInput} rows={2} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="วันที่มีผลบังคับ"><Input type="date" value={policyForm.data.effective_date} onChange={(e) => policyForm.setData('effective_date', e.target.value)} className="rounded-xl" /></Field>
                    <Field label="สถานะ"><select value={policyForm.data.status} onChange={(e) => policyForm.setData('status', e.target.value)} className={imSelect}><option value="draft">ร่าง</option><option value="published">เผยแพร่</option><option value="archived">จัดเก็บ</option></select></Field>
                </div>
                <Field label="ไฟล์เอกสาร (PDF/DOC)"><input type="file" onChange={(e) => policyForm.setData('file', e.target.files?.[0] ?? null)} className={imInput} /></Field>
            </Modal>

            <Modal open={modal === 'awareness'} onClose={() => setModal(null)} title="บันทึกผลประเมินความเข้าใจ"
                footer={<><Button variant="outline" className="rounded-xl" onClick={() => setModal(null)}>ยกเลิก</Button><Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={submitAw} disabled={awForm.processing}>บันทึก</Button></>}>
                <Field label="ชื่อบุคลากร" required error={awForm.errors.staff_name}><Input value={awForm.data.staff_name} onChange={(e) => awForm.setData('staff_name', e.target.value)} className="rounded-xl" /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="หน่วยงาน"><Input value={awForm.data.department} onChange={(e) => awForm.setData('department', e.target.value)} className="rounded-xl" /></Field>
                    <Field label="นโยบายที่ประเมิน"><select value={awForm.data.policy_id} onChange={(e) => awForm.setData('policy_id', e.target.value)} className={imSelect}><option value="">-</option>{policies.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="คะแนนที่ได้" required><Input type="number" value={awForm.data.score} onChange={(e) => awForm.setData('score', Number(e.target.value))} className="rounded-xl" /></Field>
                    <Field label="คะแนนเต็ม" required><Input type="number" value={awForm.data.max_score} onChange={(e) => awForm.setData('max_score', Number(e.target.value))} className="rounded-xl" /></Field>
                </div>
                <Field label="วันที่ประเมิน"><Input type="date" value={awForm.data.tested_at} onChange={(e) => awForm.setData('tested_at', e.target.value)} className="rounded-xl" /></Field>
            </Modal>

            <Modal open={modal === 'drills'} onClose={() => setModal(null)} title="บันทึกการซ้อมแผน BCP/DRP" wide
                footer={<><Button variant="outline" className="rounded-xl" onClick={() => setModal(null)}>ยกเลิก</Button><Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={submitDrill} disabled={drillForm.processing}>บันทึก</Button></>}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ระบบ/หน่วยงาน" required error={drillForm.errors.system_name}><Input value={drillForm.data.system_name} onChange={(e) => drillForm.setData('system_name', e.target.value)} className="rounded-xl" placeholder="เช่น HIS, Server หลัก" /></Field>
                    <Field label="ประเภทแผน"><select value={drillForm.data.type} onChange={(e) => drillForm.setData('type', e.target.value)} className={imSelect}><option value="BCP">BCP (ความต่อเนื่องธุรกิจ)</option><option value="DRP">DRP (กู้คืนระบบ)</option></select></Field>
                </div>
                <Field label="ขอบเขต/สถานการณ์"><textarea value={drillForm.data.scope} onChange={(e) => drillForm.setData('scope', e.target.value)} className={imInput} rows={2} /></Field>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="วันที่ซ้อม" required><Input type="date" value={drillForm.data.drill_date} onChange={(e) => drillForm.setData('drill_date', e.target.value)} className="rounded-xl" /></Field>
                    <Field label="เวลาที่ใช้ (วินาที)"><Input type="number" value={drillForm.data.duration_seconds} onChange={(e) => drillForm.setData('duration_seconds', Number(e.target.value))} className="rounded-xl" /></Field>
                    <Field label="RTO เป้าหมาย (นาที)"><Input type="number" value={drillForm.data.rto_target_minutes} onChange={(e) => drillForm.setData('rto_target_minutes', e.target.value)} className="rounded-xl" /></Field>
                </div>
                <Field label="ผลการซ้อม"><select value={drillForm.data.result} onChange={(e) => drillForm.setData('result', e.target.value)} className={imSelect}><option value="pass">ผ่าน</option><option value="partial">ผ่านบางส่วน</option><option value="fail">ไม่ผ่าน</option></select></Field>
                <Field label="รายงานการซ้อม"><textarea value={drillForm.data.report} onChange={(e) => drillForm.setData('report', e.target.value)} className={imInput} rows={2} /></Field>
                <Field label="ผลการปรับปรุง (PDCA)"><textarea value={drillForm.data.improvements} onChange={(e) => drillForm.setData('improvements', e.target.value)} className={imInput} rows={2} /></Field>
            </Modal>

            <Modal open={modal === 'backups'} onClose={() => setModal(null)} title="บันทึกการสำรองข้อมูล"
                footer={<><Button variant="outline" className="rounded-xl" onClick={() => setModal(null)}>ยกเลิก</Button><Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={submitBackup} disabled={backupForm.processing}>บันทึก</Button></>}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="วันที่สำรอง" required><Input type="date" value={backupForm.data.backup_date} onChange={(e) => backupForm.setData('backup_date', e.target.value)} className="rounded-xl" /></Field>
                    <Field label="ประเภท"><select value={backupForm.data.type} onChange={(e) => backupForm.setData('type', e.target.value)} className={imSelect}><option value="offline">Offline</option><option value="online">Online</option></select></Field>
                </div>
                <Field label="ขอบเขตข้อมูล"><Input value={backupForm.data.scope} onChange={(e) => backupForm.setData('scope', e.target.value)} className="rounded-xl" placeholder="เช่น HOSxP DB, ไฟล์เอกสาร" /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="สถานะ"><select value={backupForm.data.status} onChange={(e) => backupForm.setData('status', e.target.value)} className={imSelect}><option value="success">สำเร็จ</option><option value="partial">ผ่านบางส่วน</option><option value="failed">ล้มเหลว</option></select></Field>
                    <Field label="ขนาด (GB)"><Input type="number" step="0.01" value={backupForm.data.size_gb} onChange={(e) => backupForm.setData('size_gb', e.target.value)} className="rounded-xl" /></Field>
                </div>
                <Field label="ผู้ปฏิบัติงาน"><Input value={backupForm.data.performed_by} onChange={(e) => backupForm.setData('performed_by', e.target.value)} className="rounded-xl" /></Field>
                <Field label="หมายเหตุ"><textarea value={backupForm.data.notes} onChange={(e) => backupForm.setData('notes', e.target.value)} className={imInput} rows={2} /></Field>
            </Modal>
        </ImPage>
    );
}
