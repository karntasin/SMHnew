import React, { useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import { ImPage, StatCard, Panel, Modal, Field, StatusPill, EmptyState } from '@/pages/Im/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { imInput, imSelect, fmtDate, fmtDateTime, STATUS_STYLE, STATUS_LABEL, PRIORITY_STYLE, PRIORITY_LABEL } from '@/pages/Im/shared';
import { Headset, Plus, Trash2, Pencil, Ticket, AlertOctagon, Clock, Timer, ClipboardCheck, RefreshCw, ExternalLink } from 'lucide-react';

interface Staff { id: number; name: string; }
interface TicketT { id: number; ticket_no: string; title: string; description?: string; requester?: string; department?: string; category?: string; priority: string; sla_hours: number; status: string; assignee?: Staff | null; assigned_to?: number; opened_at?: string; resolved_at?: string; sla_breached: boolean; resolution_hours?: number | null; }
interface IncidentT { id: number; incident_no: string; title: string; hait_category?: string; occurred_at?: string; downtime_minutes: number; severity: string; impact?: string; root_cause?: string; problem_action?: string; status: string; }
interface TimesheetT {
    id: number; user?: Staff | null; staff_name?: string; work_date: string; hours: number;
    category?: string; activity: string; note?: string; source?: string; sheet_tab?: string | null;
    start_time?: string | null; end_time?: string | null;
}

interface Props {
    tickets: TicketT[]; incidents: IncidentT[]; timesheets: TimesheetT[]; staff: Staff[];
    timesheetStaff?: string[];
    filters?: { tab?: string | null; ts_year?: number | null; ts_staff?: string | null; ts_source?: string | null };
    timesheetSync?: { synced_at?: string | null; error?: string | null; imported?: number; updated?: number; source?: string };
    googleSheet?: { url?: string; configured?: boolean };
    summary: { open_tickets: number; resolved_tickets: number; sla_rate: number; incidents: number; downtime: number; timesheet_hours: number; };
}

type Tab = 'tickets' | 'incidents' | 'timesheets';
const SEVERITY: Record<string, string> = { minor: 'border-slate-200 bg-slate-50 text-slate-600', major: 'border-amber-200 bg-amber-50 text-amber-700', critical: 'border-red-200 bg-red-50 text-red-700' };
const SEVERITY_LABEL: Record<string, string> = { minor: 'เล็กน้อย', major: 'รุนแรง', critical: 'วิกฤต' };

export default function ServiceDesk({ tickets, incidents, timesheets, staff, timesheetStaff = [], filters, timesheetSync, googleSheet, summary }: Props) {
    const [tab, setTab] = useState<Tab>(filters?.tab === 'timesheets' || filters?.tab === 'incidents' ? (filters.tab as Tab) : 'tickets');
    const [ticketModal, setTicketModal] = useState<{ open: boolean; edit?: TicketT }>({ open: false });
    const [incModal, setIncModal] = useState<{ open: boolean; edit?: IncidentT }>({ open: false });
    const [tsModal, setTsModal] = useState(false);

    const ticketForm = useForm<any>({ title: '', description: '', requester: '', department: '', category: '', priority: 'medium', sla_hours: 24, status: 'open', assigned_to: '' });
    const incForm = useForm<any>({ title: '', hait_category: '', occurred_at: '', downtime_minutes: 0, severity: 'minor', impact: '', root_cause: '', problem_action: '', status: 'open' });
    const tsForm = useForm<any>({ user_id: '', staff_name: '', work_date: '', hours: 1, category: '', activity: '', note: '' });

    const openCreateTicket = () => { ticketForm.reset(); setTicketModal({ open: true }); };
    const openEditTicket = (t: TicketT) => { ticketForm.setData({ title: t.title, description: t.description ?? '', requester: t.requester ?? '', department: t.department ?? '', category: t.category ?? '', priority: t.priority, sla_hours: t.sla_hours, status: t.status, assigned_to: t.assigned_to ?? '' }); setTicketModal({ open: true, edit: t }); };
    const submitTicket = (e: React.FormEvent) => { e.preventDefault(); if (ticketModal.edit) ticketForm.put(route('im.service-desk.tickets.update', ticketModal.edit.id), { onSuccess: () => setTicketModal({ open: false }) }); else ticketForm.post(route('im.service-desk.tickets.store'), { onSuccess: () => { setTicketModal({ open: false }); ticketForm.reset(); } }); };

    const openCreateInc = () => { incForm.reset(); setIncModal({ open: true }); };
    const openEditInc = (i: IncidentT) => { incForm.setData({ title: i.title, hait_category: i.hait_category ?? '', occurred_at: i.occurred_at?.slice(0, 16) ?? '', downtime_minutes: i.downtime_minutes, severity: i.severity, impact: i.impact ?? '', root_cause: i.root_cause ?? '', problem_action: i.problem_action ?? '', status: i.status }); setIncModal({ open: true, edit: i }); };
    const submitInc = (e: React.FormEvent) => { e.preventDefault(); if (incModal.edit) incForm.put(route('im.service-desk.incidents.update', incModal.edit.id), { onSuccess: () => setIncModal({ open: false }) }); else incForm.post(route('im.service-desk.incidents.store'), { onSuccess: () => { setIncModal({ open: false }); incForm.reset(); } }); };

    const submitTs = (e: React.FormEvent) => { e.preventDefault(); tsForm.post(route('im.service-desk.timesheets.store'), { onSuccess: () => { setTsModal(false); tsForm.reset(); } }); };

    const tabs: { key: Tab; label: string }[] = [{ key: 'tickets', label: 'Service Desk (SLA)' }, { key: 'incidents', label: 'Incident/Problem' }, { key: 'timesheets', label: 'Timesheet IT' }];
    const tsYearOptions = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - i);
    const applyTimesheetFilters = (patch: { ts_year?: number | null; ts_staff?: string | null; ts_source?: string | null }) => {
        const year = patch.ts_year === undefined ? filters?.ts_year : patch.ts_year;
        const staffName = patch.ts_staff === undefined ? filters?.ts_staff : patch.ts_staff;
        const source = patch.ts_source === undefined ? filters?.ts_source : patch.ts_source;
        router.get(
            route('im.service-desk'),
            {
                tab: 'timesheets',
                ts_year: year || undefined,
                ts_staff: staffName || undefined,
                ts_source: source || undefined,
            },
            { preserveState: true, replace: true },
        );
    };
    const syncGoogleTimesheet = () => {
        router.post(route('im.service-desk.timesheets.sync-google'), {}, { preserveScroll: true });
    };

    return (
        <ImPage active="im.service-desk" icon={Headset} badge="หมวดที่ 4" title="IT Service Desk & Incident Management" subtitle="รับเรื่อง บันทึกอุบัติการณ์ และประเมินภาระงาน IT">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                <StatCard label="Ticket เปิดอยู่" value={summary.open_tickets} icon={Ticket} tone="sky" />
                <StatCard label="แก้ไขแล้ว" value={summary.resolved_tickets} icon={Ticket} tone="emerald" />
                <StatCard label="ตรงตาม SLA" value={`${summary.sla_rate}%`} icon={Clock} tone={summary.sla_rate >= 90 ? 'emerald' : 'amber'} />
                <StatCard label="อุบัติการณ์" value={summary.incidents} icon={AlertOctagon} tone="rose" />
                <StatCard label="Downtime รวม" value={`${summary.downtime}`} sub="นาที" icon={Timer} tone="amber" />
                <StatCard label={filters?.ts_year ? `ชม.งาน IT ปี ${filters.ts_year + 543}` : 'ชม.งาน IT (30 วัน)'} value={summary.timesheet_hours} icon={Clock} tone="violet" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                    {tabs.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className={cn('rounded-xl border px-4 py-2 text-sm font-semibold transition', tab === t.key ? 'border-sky-400 bg-sky-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200')}>{t.label}</button>)}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="rounded-xl">
                        <Link href={route('im.service-desk.evaluation')}>
                            <ClipboardCheck className="mr-1 h-4 w-4" /> ประเมินเจ้าหน้าที่ IT
                        </Link>
                    </Button>
                    <Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={() => tab === 'tickets' ? openCreateTicket() : tab === 'incidents' ? openCreateInc() : setTsModal(true)}><Plus className="mr-1 h-4 w-4" /> เพิ่ม</Button>
                </div>
            </div>

            {tab === 'tickets' && (
                <Panel title="Service Desk & SLA Monitor" description="ช่องทางรับแจ้งปัญหาและติดตามสถานะตาม SLA">
                    {tickets.length === 0 ? <EmptyState text="ยังไม่มี Ticket" /> : (
                        <div className="grid gap-3 lg:grid-cols-2">
                            {tickets.map((t) => (
                                <div key={t.id} className="rounded-2xl border border-slate-200 p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-400">{t.ticket_no}</span>
                                            <StatusPill label={PRIORITY_LABEL[t.priority] ?? t.priority} className={PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.medium} />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => openEditTicket(t)} className="text-slate-400 hover:text-sky-600"><Pencil className="h-4 w-4" /></button>
                                            <button onClick={() => router.delete(route('im.service-desk.tickets.destroy', t.id))} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </div>
                                    <div className="mt-1 font-semibold text-slate-800">{t.title}</div>
                                    {t.description && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{t.description}</p>}
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                        <StatusPill label={STATUS_LABEL[t.status] ?? t.status} className={STATUS_STYLE[t.status] ?? STATUS_STYLE.open} />
                                        <span className="text-slate-400">SLA {t.sla_hours} ชม.</span>
                                        {t.sla_breached ? <StatusPill label="เกิน SLA" className={STATUS_STYLE.fail} /> : <StatusPill label="ภายใน SLA" className={STATUS_STYLE.pass} />}
                                        {t.assignee && <span className="text-slate-500">· {t.assignee.name}</span>}
                                    </div>
                                    <div className="mt-1 text-[11px] text-slate-400">แจ้ง {fmtDateTime(t.opened_at)}{t.resolution_hours != null && ` · ใช้เวลา ${t.resolution_hours} ชม.`}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            )}

            {tab === 'incidents' && (
                <Panel title="Incident & Problem Management" description="บันทึกเหตุระบบล่ม/ขัดข้องตามมาตรฐาน HAIT และวิเคราะห์ป้องกันการเกิดซ้ำ">
                    {incidents.length === 0 ? <EmptyState text="ยังไม่มีอุบัติการณ์" /> : (
                        <div className="space-y-3">
                            {incidents.map((i) => (
                                <div key={i.id} className="rounded-2xl border border-slate-200 p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-400">{i.incident_no}</span><StatusPill label={SEVERITY_LABEL[i.severity]} className={SEVERITY[i.severity]} /><StatusPill label={STATUS_LABEL[i.status] ?? i.status} className={STATUS_STYLE[i.status] ?? STATUS_STYLE.open} /></div>
                                        <div className="flex items-center gap-1"><button onClick={() => openEditInc(i)} className="text-slate-400 hover:text-sky-600"><Pencil className="h-4 w-4" /></button><button onClick={() => router.delete(route('im.service-desk.incidents.destroy', i.id))} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></div>
                                    </div>
                                    <div className="mt-1 font-semibold text-slate-800">{i.title}</div>
                                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                                        {i.hait_category && <span>หมวด HAIT: {i.hait_category}</span>}
                                        <span>เกิดเมื่อ {fmtDateTime(i.occurred_at)}</span>
                                        <span>Downtime {i.downtime_minutes} นาที</span>
                                    </div>
                                    {(i.root_cause || i.problem_action) && (
                                        <div className="mt-2 grid gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-2">
                                            {i.root_cause && <div><span className="font-semibold">Root Cause:</span> {i.root_cause}</div>}
                                            {i.problem_action && <div><span className="font-semibold">Problem Mgmt:</span> {i.problem_action}</div>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            )}

            {tab === 'timesheets' && (
                <Panel title="IT Timesheet & Activity Logs" description={filters?.ts_year ? `บันทึกกิจกรรมปี ${filters.ts_year + 543} · เชื่อมกับ Google Sheet ลงเวลาปฎิบัติงาน` : 'บันทึกจาก Google Sheet และรายการที่บันทึกในระบบ (30 วันล่าสุด)'}
                    action={
                        <div className="flex flex-wrap gap-2">
                            <select className={imSelect + ' w-auto'} value={filters?.ts_year ?? ''} onChange={(e) => applyTimesheetFilters({ ts_year: e.target.value ? Number(e.target.value) : null })}>
                                <option value="">30 วันล่าสุด</option>
                                {tsYearOptions.map((y) => (
                                    <option key={y} value={y}>ปี {y + 543}</option>
                                ))}
                            </select>
                            <select className={imSelect + ' w-auto'} value={filters?.ts_staff ?? ''} onChange={(e) => applyTimesheetFilters({ ts_staff: e.target.value || null })}>
                                <option value="">ทุกคน</option>
                                {timesheetStaff.map((name) => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                            <select className={imSelect + ' w-auto'} value={filters?.ts_source ?? ''} onChange={(e) => applyTimesheetFilters({ ts_source: e.target.value || null })}>
                                <option value="">ทุกแหล่ง</option>
                                <option value="google_sheet">จาก Google Sheet</option>
                                <option value="manual">บันทึกในระบบ</option>
                            </select>
                            {googleSheet?.url && (
                                <a href={googleSheet.url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-200">
                                    <ExternalLink className="mr-1 h-3.5 w-3.5" /> เปิดชีต
                                </a>
                            )}
                            <Button type="button" variant="outline" className="rounded-xl" onClick={syncGoogleTimesheet}>
                                <RefreshCw className="mr-1 h-4 w-4" /> ซิงก์ชีต
                            </Button>
                        </div>
                    }>
                    <div className="mb-3 text-xs text-slate-500">
                        {timesheetSync?.error
                            ? <span className="text-amber-700">{timesheetSync.error}</span>
                            : timesheetSync?.synced_at
                                ? `ซิงก์ล่าสุด ${fmtDateTime(timesheetSync.synced_at)}${timesheetSync.imported != null ? ` · นำเข้า ${timesheetSync.imported} อัปเดต ${timesheetSync.updated ?? 0}` : ''}`
                                : 'กด “ซิงก์ชีต” เพื่อดึง WorkLogs และรายงานการทำงานจาก Google Sheet'}
                    </div>
                    {timesheets.length === 0 ? <EmptyState text="ยังไม่มีบันทึกกิจกรรมในช่วงที่เลือก" /> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400"><th className="py-2 pr-3">วันที่</th><th className="py-2 pr-3">เจ้าหน้าที่</th><th className="py-2 pr-3">กิจกรรม</th><th className="py-2 pr-3">หมวด</th><th className="py-2 pr-3">เวลา</th><th className="py-2 pr-3">ชม.</th><th className="py-2"></th></tr></thead>
                                <tbody>
                                    {timesheets.map((ts) => (
                                        <tr key={ts.id} className="border-b border-slate-50">
                                            <td className="py-2.5 pr-3 text-slate-600">{fmtDate(ts.work_date)}</td>
                                            <td className="py-2.5 pr-3 text-slate-700">{ts.user?.name || ts.staff_name || '-'}</td>
                                            <td className="py-2.5 pr-3 text-slate-600">
                                                {ts.activity}
                                                {ts.source === 'google_sheet' && <span className="ml-2 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Sheet</span>}
                                            </td>
                                            <td className="py-2.5 pr-3 text-slate-500">{ts.category || '-'}</td>
                                            <td className="py-2.5 pr-3 text-slate-500">{ts.start_time && ts.end_time ? `${ts.start_time}–${ts.end_time}` : '-'}</td>
                                            <td className="py-2.5 pr-3 font-semibold text-slate-700">{ts.hours}</td>
                                            <td className="py-2.5 text-right">
                                                {ts.source === 'google_sheet' ? null : (
                                                    <button onClick={() => router.delete(route('im.service-desk.timesheets.destroy', ts.id))} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
            )}

            {/* Ticket Modal */}
            <Modal open={ticketModal.open} onClose={() => setTicketModal({ open: false })} title={ticketModal.edit ? `แก้ไข ${ticketModal.edit.ticket_no}` : 'เปิด Ticket ใหม่'} wide
                footer={<><Button variant="outline" className="rounded-xl" onClick={() => setTicketModal({ open: false })}>ยกเลิก</Button><Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={submitTicket} disabled={ticketForm.processing}>บันทึก</Button></>}>
                <Field label="หัวข้อปัญหา" required error={ticketForm.errors.title}><Input value={ticketForm.data.title} onChange={(e) => ticketForm.setData('title', e.target.value)} className="rounded-xl" /></Field>
                <Field label="รายละเอียด"><textarea value={ticketForm.data.description} onChange={(e) => ticketForm.setData('description', e.target.value)} className={imInput} rows={2} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ผู้แจ้ง"><Input value={ticketForm.data.requester} onChange={(e) => ticketForm.setData('requester', e.target.value)} className="rounded-xl" /></Field>
                    <Field label="หน่วยงาน"><Input value={ticketForm.data.department} onChange={(e) => ticketForm.setData('department', e.target.value)} className="rounded-xl" /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="หมวดหมู่"><Input value={ticketForm.data.category} onChange={(e) => ticketForm.setData('category', e.target.value)} className="rounded-xl" /></Field>
                    <Field label="ความสำคัญ"><select value={ticketForm.data.priority} onChange={(e) => ticketForm.setData('priority', e.target.value)} className={imSelect}><option value="low">ต่ำ</option><option value="medium">ปานกลาง</option><option value="high">สูง</option><option value="critical">วิกฤต</option></select></Field>
                    <Field label="SLA (ชั่วโมง)" required><Input type="number" value={ticketForm.data.sla_hours} onChange={(e) => ticketForm.setData('sla_hours', Number(e.target.value))} className="rounded-xl" /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ผู้รับผิดชอบ"><select value={ticketForm.data.assigned_to} onChange={(e) => ticketForm.setData('assigned_to', e.target.value)} className={imSelect}><option value="">-</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
                    {ticketModal.edit && <Field label="สถานะ"><select value={ticketForm.data.status} onChange={(e) => ticketForm.setData('status', e.target.value)} className={imSelect}><option value="open">เปิด</option><option value="in_progress">กำลังทำ</option><option value="resolved">แก้ไขแล้ว</option><option value="closed">ปิดงาน</option></select></Field>}
                </div>
            </Modal>

            {/* Incident Modal */}
            <Modal open={incModal.open} onClose={() => setIncModal({ open: false })} title={incModal.edit ? `แก้ไข ${incModal.edit.incident_no}` : 'บันทึกอุบัติการณ์'} wide
                footer={<><Button variant="outline" className="rounded-xl" onClick={() => setIncModal({ open: false })}>ยกเลิก</Button><Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={submitInc} disabled={incForm.processing}>บันทึก</Button></>}>
                <Field label="หัวข้อ" required error={incForm.errors.title}><Input value={incForm.data.title} onChange={(e) => incForm.setData('title', e.target.value)} className="rounded-xl" /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="หมวดตามมาตรฐาน HAIT"><Input value={incForm.data.hait_category} onChange={(e) => incForm.setData('hait_category', e.target.value)} className="rounded-xl" placeholder="เช่น ระบบเครือข่าย, ฮาร์ดแวร์" /></Field>
                    <Field label="เวลาที่เกิด" required><Input type="datetime-local" value={incForm.data.occurred_at} onChange={(e) => incForm.setData('occurred_at', e.target.value)} className="rounded-xl" /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Downtime (นาที)"><Input type="number" value={incForm.data.downtime_minutes} onChange={(e) => incForm.setData('downtime_minutes', Number(e.target.value))} className="rounded-xl" /></Field>
                    <Field label="ความรุนแรง"><select value={incForm.data.severity} onChange={(e) => incForm.setData('severity', e.target.value)} className={imSelect}><option value="minor">เล็กน้อย</option><option value="major">รุนแรง</option><option value="critical">วิกฤต</option></select></Field>
                    <Field label="สถานะ"><select value={incForm.data.status} onChange={(e) => incForm.setData('status', e.target.value)} className={imSelect}><option value="open">เปิด</option><option value="investigating">กำลังสอบสวน</option><option value="resolved">แก้ไขแล้ว</option></select></Field>
                </div>
                <Field label="ผลกระทบ"><textarea value={incForm.data.impact} onChange={(e) => incForm.setData('impact', e.target.value)} className={imInput} rows={2} /></Field>
                <Field label="สาเหตุ (Root Cause)"><textarea value={incForm.data.root_cause} onChange={(e) => incForm.setData('root_cause', e.target.value)} className={imInput} rows={2} /></Field>
                <Field label="การจัดการเชิงป้องกัน (Problem Management)"><textarea value={incForm.data.problem_action} onChange={(e) => incForm.setData('problem_action', e.target.value)} className={imInput} rows={2} /></Field>
            </Modal>

            {/* Timesheet Modal */}
            <Modal open={tsModal} onClose={() => setTsModal(false)} title="บันทึกกิจกรรม IT"
                footer={<><Button variant="outline" className="rounded-xl" onClick={() => setTsModal(false)}>ยกเลิก</Button><Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={submitTs} disabled={tsForm.processing}>บันทึก</Button></>}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="เจ้าหน้าที่"><select value={tsForm.data.user_id} onChange={(e) => tsForm.setData('user_id', e.target.value)} className={imSelect}><option value="">(ตัวเอง)</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
                    <Field label="วันที่" required><Input type="date" value={tsForm.data.work_date} onChange={(e) => tsForm.setData('work_date', e.target.value)} className="rounded-xl" /></Field>
                </div>
                <Field label="กิจกรรม" required error={tsForm.errors.activity}><Input value={tsForm.data.activity} onChange={(e) => tsForm.setData('activity', e.target.value)} className="rounded-xl" /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="หมวดงาน"><Input value={tsForm.data.category} onChange={(e) => tsForm.setData('category', e.target.value)} className="rounded-xl" placeholder="เช่น ซ่อมบำรุง, พัฒนา, ดูแลระบบ" /></Field>
                    <Field label="จำนวนชั่วโมง" required><Input type="number" step="0.5" value={tsForm.data.hours} onChange={(e) => tsForm.setData('hours', Number(e.target.value))} className="rounded-xl" /></Field>
                </div>
                <Field label="หมายเหตุ"><textarea value={tsForm.data.note} onChange={(e) => tsForm.setData('note', e.target.value)} className={imInput} rows={2} /></Field>
            </Modal>
        </ImPage>
    );
}
