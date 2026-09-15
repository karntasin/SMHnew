import React, { useMemo, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { ImPage, StatCard, Panel, Modal, Field, StatusPill, EmptyState } from '@/pages/Im/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { fmtMoney, fmtDate, imInput, imSelect, STATUS_STYLE, STATUS_LABEL } from '@/pages/Im/shared';
import {
    Target,
    Plus,
    Trash2,
    Pencil,
    Link2,
    CalendarRange,
    Wallet,
    Percent,
    AlertTriangle,
    History,
    Paperclip,
    Download,
} from 'lucide-react';

interface Attachment {
    id: number;
    name: string;
    original_name?: string;
    url: string;
    size: number;
    size_label: string;
    mime_type?: string | null;
}
interface Plan {
    id: number;
    year: number;
    title: string;
    vision?: string;
    status: string;
    mappings_count: number;
    action_plans_count: number;
    attachments_count?: number;
    attachments?: Attachment[];
}
interface Mapping { id: number; hospital_strategy: string; it_strategy: string; success_factor?: string; analysis_accuracy: number; note?: string; }
interface Action {
    id: number;
    project: string;
    objective?: string;
    budget: number;
    actual_budget?: number;
    owner?: string;
    start_date: string;
    end_date: string;
    status: string;
    progress: number;
    pdca_stage: string;
    problems?: string;
    lessons_learned?: string;
    attachments?: Attachment[];
}
interface MultiYear { year: number; title: string; projects: number; done: number; completion: number; budget: number; actual_budget: number; }

interface Props {
    plans: Plan[];
    activePlanId: number | null;
    mappings: Mapping[];
    actionPlans: Action[];
    multiYear: MultiYear[];
    summary: { avg_accuracy: number; accuracy_ok: boolean; total_budget: number; actual_budget: number; projects: number; full_year_projects: number; };
}

const FILE_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.zip,.txt';
const FILE_HINT = 'เลือกได้หลายไฟล์ · PDF, Word, Excel, PowerPoint, รูปภาพ, ZIP · สูงสุด 10 ไฟล์ ไฟล์ละไม่เกิน 20 MB';
const PDCA = ['plan', 'do', 'check', 'act'];
const PDCA_LABEL: Record<string, string> = { plan: 'Plan', do: 'Do', check: 'Check', act: 'Act' };

const fileFormError = (errors: Record<string, string | undefined>) =>
    errors.files ||
    Object.entries(errors)
        .filter(([key]) => key.startsWith('files.'))
        .map(([, value]) => value)
        .filter(Boolean)
        .join(' ');

function AttachmentList({ items, onDelete }: { items?: Attachment[]; onDelete?: (id: number) => void }) {
    if (!items?.length) return null;
    return (
        <ul className="space-y-1.5">
            {items.map((file) => (
                <li key={file.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                    <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1.5 font-medium text-sky-700 hover:underline">
                        <Download className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{file.name || file.original_name}</span>
                        <span className="shrink-0 text-slate-400">{file.size_label}</span>
                    </a>
                    {onDelete && (
                        <button type="button" onClick={() => onDelete(file.id)} className="text-slate-400 hover:text-rose-500" title="ลบไฟล์">
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </li>
            ))}
        </ul>
    );
}

function FilePicker({
    files,
    onChange,
    error,
}: {
    files: File[];
    onChange: (files: File[]) => void;
    error?: string;
}) {
    return (
        <Field label="แนบไฟล์ (ได้หลายไฟล์)" error={error}>
            <input
                type="file"
                multiple
                accept={FILE_ACCEPT}
                className={imInput}
                onChange={(e) => onChange(Array.from(e.target.files ?? []).slice(0, 10))}
            />
            <p className="text-[11px] text-slate-400">{FILE_HINT}</p>
            {files.length > 0 && (
                <div className="text-[11px] text-sky-700">เลือกแล้ว {files.length} ไฟล์: {files.map((f) => f.name).join(', ')}</div>
            )}
        </Field>
    );
}

const monthsBetween = (a: string, b: string) => {
    if (!a || !b) return 0;
    const d1 = new Date(a), d2 = new Date(b);
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 30)));
};

export default function MasterPlan({ plans, activePlanId, mappings, actionPlans, multiYear, summary }: Props) {
    const [planModal, setPlanModal] = useState(false);
    const [mapModal, setMapModal] = useState(false);
    const [actionModal, setActionModal] = useState<{ open: boolean; edit?: Action }>({ open: false });

    const activePlan = plans.find((p) => p.id === activePlanId);
    const thaiYear = new Date().getFullYear() + 543;

    const planForm = useForm({ year: thaiYear, title: '', vision: '', status: 'active', files: [] as File[] });
    const mapForm = useForm({ it_plan_id: activePlanId ?? 0, hospital_strategy: '', it_strategy: '', success_factor: '', analysis_accuracy: 80, note: '' });
    const actionForm = useForm({
        it_plan_id: activePlanId ?? 0, project: '', objective: '', budget: 0, actual_budget: '', owner: '',
        start_date: '', end_date: '', status: 'planned', progress: 0, pdca_stage: 'plan', problems: '', lessons_learned: '',
        files: [] as File[],
    });

    const actionDuration = useMemo(() => monthsBetween(actionForm.data.start_date, actionForm.data.end_date), [actionForm.data.start_date, actionForm.data.end_date]);

    const editingAction = actionModal.edit
        ? actionPlans.find((row) => row.id === actionModal.edit!.id) ?? actionModal.edit
        : undefined;

    const openCreateAction = () => {
        actionForm.reset();
        actionForm.setData('it_plan_id', activePlanId ?? 0);
        actionForm.setData('files', []);
        setActionModal({ open: true });
    };
    const openEditAction = (a: Action) => {
        actionForm.setData({
            it_plan_id: activePlanId ?? 0, project: a.project, objective: a.objective ?? '', budget: a.budget,
            actual_budget: a.actual_budget ?? '', owner: a.owner ?? '', start_date: a.start_date?.slice(0, 10) ?? '',
            end_date: a.end_date?.slice(0, 10) ?? '', status: a.status, progress: a.progress, pdca_stage: a.pdca_stage,
            problems: a.problems ?? '', lessons_learned: a.lessons_learned ?? '', files: [],
        } as any);
        setActionModal({ open: true, edit: a });
    };

    const uploadFiles = (url: string, list: FileList | null) => {
        if (!list?.length) return;
        const formData = new FormData();
        Array.from(list).slice(0, 10).forEach((file) => formData.append('files[]', file));
        router.post(url, formData, { forceFormData: true, preserveScroll: true });
    };
    const deleteAttachment = (id: number) => {
        router.delete(route('im.master-plan.attachments.destroy', id), { preserveScroll: true });
    };

    const submitPlan = (e: React.FormEvent) => {
        e.preventDefault();
        planForm.post(route('im.master-plan.plans.store'), {
            forceFormData: true,
            onSuccess: () => { setPlanModal(false); planForm.reset(); },
        });
    };
    const submitMap = (e: React.FormEvent) => { e.preventDefault(); mapForm.post(route('im.master-plan.mappings.store'), { onSuccess: () => { setMapModal(false); mapForm.reset(); } }); };
    const submitAction = (e: React.FormEvent) => {
        e.preventDefault();
        if (actionModal.edit) {
            actionForm.put(route('im.master-plan.actions.update', actionModal.edit.id), { onSuccess: () => setActionModal({ open: false }) });
        } else {
            actionForm.post(route('im.master-plan.actions.store'), {
                forceFormData: true,
                onSuccess: () => { setActionModal({ open: false }); actionForm.reset(); },
            });
        }
    };

    return (
        <ImPage active="im.master-plan" icon={Target} badge="หมวดที่ 1" title="IT Master Plan & Strategy" subtitle="แผนแม่บทเทคโนโลยีสารสนเทศและแผนปฏิบัติการประจำปี"
            actions={<Button onClick={() => setPlanModal(true)} className="rounded-xl bg-sky-600 hover:bg-sky-700"><Plus className="mr-1 h-4 w-4" /> สร้างแผนแม่บท</Button>}>

            {/* Plan selector */}
            <div className="flex flex-wrap gap-2">
                {plans.map((p) => (
                    <button key={p.id} onClick={() => router.get(route('im.master-plan'), { plan: p.id }, { preserveState: false })}
                        className={cn('rounded-2xl border px-4 py-2 text-sm font-semibold transition', p.id === activePlanId ? 'border-sky-400 bg-sky-600 text-white shadow' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200')}>
                        แผนปี {p.year}
                        <span className={cn('ml-2 text-[11px]', p.id === activePlanId ? 'text-sky-100' : 'text-slate-400')}>
                            {p.action_plans_count} โครงการ
                            {(p.attachments_count ?? p.attachments?.length ?? 0) > 0 ? ` · ${p.attachments_count ?? p.attachments?.length} ไฟล์` : ''}
                        </span>
                    </button>
                ))}
                {plans.length === 0 && <EmptyState text="ยังไม่มีแผนแม่บท กดปุ่ม “สร้างแผนแม่บท” เพื่อเริ่มต้น" />}
            </div>

            {activePlan && (
                <>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                        <StatCard label="ความถูกต้องการวิเคราะห์" value={`${summary.avg_accuracy}%`} sub={summary.accuracy_ok ? 'ผ่านเกณฑ์ (≥50%)' : 'ต่ำกว่าเกณฑ์!'} icon={Percent} tone={summary.accuracy_ok ? 'emerald' : 'rose'} />
                        <StatCard label="จำนวนโครงการ" value={summary.projects} sub="ในแผนปีนี้" icon={Target} tone="sky" />
                        <StatCard label="งบประมาณตั้งไว้" value={fmtMoney(summary.total_budget)} sub="บาท" icon={Wallet} tone="violet" />
                        <StatCard label="ใช้จริง" value={fmtMoney(summary.actual_budget)} sub="บาท" icon={Wallet} tone="amber" />
                        <StatCard label="โครงการยาว 12 เดือน" value={summary.full_year_projects} sub={summary.full_year_projects ? 'ควรกำหนดช่วงเวลาจริง' : 'ดี'} icon={AlertTriangle} tone={summary.full_year_projects ? 'rose' : 'emerald'} />
                    </div>

                    {!summary.accuracy_ok && (
                        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            <AlertTriangle className="h-4 w-4" /> อัตราความถูกต้องของการวิเคราะห์ปัจจัยแห่งความสำเร็จต่ำกว่าเกณฑ์ที่กำหนด (ต้องไม่ผิดพลาดเกินร้อยละ 50)
                        </div>
                    )}

                    <Panel
                        title="เอกสารแนบแผนแม่บท"
                        description="ไฟล์แผนแม่บท IT / แผนปฏิบัติการประจำปี และเอกสารประกอบ แนบได้หลายไฟล์"
                        action={
                            <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                                <Paperclip className="h-3.5 w-3.5" /> เลือกไฟล์
                                <input
                                    type="file"
                                    multiple
                                    accept={FILE_ACCEPT}
                                    className="hidden"
                                    onChange={(e) => {
                                        uploadFiles(route('im.master-plan.plans.attachments.store', activePlan.id), e.target.files);
                                        e.currentTarget.value = '';
                                    }}
                                />
                            </label>
                        }
                    >
                        {(activePlan.attachments?.length ?? 0) === 0 ? (
                            <EmptyState text="ยังไม่มีไฟล์แนบของแผนนี้ กด “เลือกไฟล์” เพื่ออัปโหลดได้หลายไฟล์" />
                        ) : (
                            <AttachmentList items={activePlan.attachments} onDelete={deleteAttachment} />
                        )}
                        <p className="mt-2 text-[11px] text-slate-400">{FILE_HINT}</p>
                    </Panel>

                    {/* Strategic Alignment */}
                    <Panel title="Strategic Alignment Mapping" description="เชื่อมโยงยุทธศาสตร์โรงพยาบาลกับยุทธศาสตร์ IT ผ่านปัจจัยแห่งความสำเร็จ"
                        action={<Button size="sm" variant="outline" className="rounded-xl" onClick={() => { mapForm.setData('it_plan_id', activePlan.id); setMapModal(true); }}><Link2 className="mr-1 h-4 w-4" /> เพิ่มการเชื่อมโยง</Button>}>
                        {mappings.length === 0 ? <EmptyState text="ยังไม่มีการเชื่อมโยงยุทธศาสตร์" /> : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                        <th className="py-2 pr-3">ยุทธศาสตร์โรงพยาบาล</th><th className="py-2 pr-3">ยุทธศาสตร์ IT</th><th className="py-2 pr-3">ปัจจัยความสำเร็จ</th><th className="py-2 pr-3">ความถูกต้อง</th><th className="py-2"></th>
                                    </tr></thead>
                                    <tbody>
                                        {mappings.map((m) => (
                                            <tr key={m.id} className="border-b border-slate-50 align-top">
                                                <td className="py-3 pr-3 text-slate-700">{m.hospital_strategy}</td>
                                                <td className="py-3 pr-3 text-slate-700">{m.it_strategy}</td>
                                                <td className="py-3 pr-3 text-slate-500">{m.success_factor || '-'}</td>
                                                <td className="py-3 pr-3"><StatusPill label={`${m.analysis_accuracy}%`} className={m.analysis_accuracy >= 50 ? STATUS_STYLE.approved : STATUS_STYLE.rejected} /></td>
                                                <td className="py-3 text-right"><button onClick={() => router.delete(route('im.master-plan.mappings.destroy', m.id))} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Panel>

                    {/* Action Plan Manager */}
                    <Panel title="Action Plan Manager & PDCA Tracking" description="โครงการ งบประมาณ ผู้รับผิดชอบ และช่วงเวลาดำเนินงานจริง"
                        action={<Button size="sm" className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={openCreateAction}><Plus className="mr-1 h-4 w-4" /> เพิ่มโครงการ</Button>}>
                        {actionPlans.length === 0 ? <EmptyState text="ยังไม่มีโครงการในแผนนี้" /> : (
                            <div className="grid gap-4 lg:grid-cols-2">
                                {actionPlans.map((a) => {
                                    const dur = monthsBetween(a.start_date, a.end_date);
                                    return (
                                        <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="font-semibold text-slate-900">{a.project}</div>
                                                    {a.objective && <div className="text-xs text-slate-500">{a.objective}</div>}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => openEditAction(a)} className="text-slate-400 hover:text-sky-600"><Pencil className="h-4 w-4" /></button>
                                                    <button onClick={() => router.delete(route('im.master-plan.actions.destroy', a.id))} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                                <StatusPill label={STATUS_LABEL[a.status] ?? a.status} className={STATUS_STYLE[a.status] ?? STATUS_STYLE.planned} />
                                                <StatusPill label={`PDCA: ${PDCA_LABEL[a.pdca_stage] ?? a.pdca_stage}`} className="border-slate-200 bg-slate-50 text-slate-600" />
                                                <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-semibold', dur >= 12 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-500')}>
                                                    <CalendarRange className="h-3 w-3" /> {dur} เดือน
                                                </span>
                                            </div>
                                            <div className="mt-3 space-y-1 text-xs text-slate-500">
                                                <div>ระยะเวลา: {fmtDate(a.start_date)} – {fmtDate(a.end_date)}</div>
                                                <div>ผู้รับผิดชอบ: {a.owner || '-'}</div>
                                                <div>งบ: {fmtMoney(a.budget)} / ใช้จริง: {a.actual_budget != null ? fmtMoney(a.actual_budget) : '-'} บาท</div>
                                            </div>
                                            <div className="mt-3">
                                                <div className="mb-1 flex justify-between text-[11px] text-slate-400"><span>ความคืบหน้า</span><span>{a.progress}%</span></div>
                                                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500" style={{ width: `${a.progress}%` }} /></div>
                                            </div>
                                            {(a.problems || a.lessons_learned) && (
                                                <div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                                                    {a.problems && <div><span className="font-semibold">ปัญหา/อุปสรรค:</span> {a.problems}</div>}
                                                    {a.lessons_learned && <div><span className="font-semibold">Lesson Learned:</span> {a.lessons_learned}</div>}
                                                </div>
                                            )}
                                            {(a.attachments?.length ?? 0) > 0 && (
                                                <div className="mt-3">
                                                    <div className="mb-1 text-[11px] font-semibold text-slate-500">ไฟล์แนบ ({a.attachments?.length})</div>
                                                    <AttachmentList items={a.attachments} onDelete={deleteAttachment} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Panel>
                </>
            )}

            {/* Multi-year */}
            <Panel title="Multi-year Strategy Evaluation" description="สรุปภาพรวมผลงานย้อนหลัง 2-3 ปี ว่าแผน IT ตอบสนองเป้าหมายโรงพยาบาลอย่างไร">
                {multiYear.length === 0 ? <EmptyState text="ยังไม่มีข้อมูลย้อนหลัง" /> : (
                    <div className="grid gap-4 md:grid-cols-3">
                        {multiYear.map((y) => (
                            <div key={y.year} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-sky-50/40 p-4">
                                <div className="flex items-center gap-2 text-sky-700"><History className="h-4 w-4" /><span className="font-bold">ปี {y.year}</span></div>
                                <div className="mt-1 text-xs text-slate-500">{y.title}</div>
                                <div className="mt-3 text-3xl font-bold text-slate-900">{y.completion}%</div>
                                <div className="text-xs text-slate-500">สำเร็จ {y.done}/{y.projects} โครงการ</div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${y.completion}%` }} /></div>
                                <div className="mt-3 text-xs text-slate-500">ใช้งบ {fmtMoney(y.actual_budget)} / {fmtMoney(y.budget)} บาท</div>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>

            {/* Plan Modal */}
            <Modal open={planModal} onClose={() => setPlanModal(false)} title="สร้างแผนแม่บท IT"
                footer={<><Button variant="outline" className="rounded-xl" onClick={() => setPlanModal(false)}>ยกเลิก</Button><Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={submitPlan} disabled={planForm.processing}>บันทึก</Button></>}>
                <Field label="ปี (พ.ศ.)" required error={planForm.errors.year}><Input type="number" value={planForm.data.year} onChange={(e) => planForm.setData('year', Number(e.target.value))} className="rounded-xl" /></Field>
                <Field label="ชื่อแผน" required error={planForm.errors.title}><Input value={planForm.data.title} onChange={(e) => planForm.setData('title', e.target.value)} className="rounded-xl" placeholder="แผนแม่บทเทคโนโลยีสารสนเทศ" /></Field>
                <Field label="วิสัยทัศน์ / เป้าหมาย"><textarea value={planForm.data.vision} onChange={(e) => planForm.setData('vision', e.target.value)} className={imInput} rows={3} /></Field>
                <Field label="สถานะ"><select value={planForm.data.status} onChange={(e) => planForm.setData('status', e.target.value)} className={imSelect}><option value="draft">ร่าง</option><option value="active">ใช้งาน</option><option value="closed">ปิด</option></select></Field>
                <FilePicker files={planForm.data.files} onChange={(files) => planForm.setData('files', files)} error={fileFormError(planForm.errors)} />
            </Modal>

            {/* Mapping Modal */}
            <Modal open={mapModal} onClose={() => setMapModal(false)} title="เชื่อมโยงยุทธศาสตร์" wide
                footer={<><Button variant="outline" className="rounded-xl" onClick={() => setMapModal(false)}>ยกเลิก</Button><Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={submitMap} disabled={mapForm.processing}>บันทึก</Button></>}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ยุทธศาสตร์โรงพยาบาล" required error={mapForm.errors.hospital_strategy}><textarea value={mapForm.data.hospital_strategy} onChange={(e) => mapForm.setData('hospital_strategy', e.target.value)} className={imInput} rows={2} /></Field>
                    <Field label="ยุทธศาสตร์ IT" required error={mapForm.errors.it_strategy}><textarea value={mapForm.data.it_strategy} onChange={(e) => mapForm.setData('it_strategy', e.target.value)} className={imInput} rows={2} /></Field>
                </div>
                <Field label="ปัจจัยแห่งความสำเร็จ (Success Factors)"><textarea value={mapForm.data.success_factor} onChange={(e) => mapForm.setData('success_factor', e.target.value)} className={imInput} rows={2} /></Field>
                <Field label="อัตราความถูกต้องการวิเคราะห์ (%)" required error={mapForm.errors.analysis_accuracy}><Input type="number" min={0} max={100} value={mapForm.data.analysis_accuracy} onChange={(e) => mapForm.setData('analysis_accuracy', Number(e.target.value))} className="rounded-xl" /></Field>
            </Modal>

            {/* Action Modal */}
            <Modal open={actionModal.open} onClose={() => setActionModal({ open: false })} title={actionModal.edit ? 'แก้ไขโครงการ' : 'เพิ่มโครงการในแผน'} wide
                footer={<><Button variant="outline" className="rounded-xl" onClick={() => setActionModal({ open: false })}>ยกเลิก</Button><Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={submitAction} disabled={actionForm.processing}>บันทึก</Button></>}>
                <Field label="ชื่อโครงการ" required error={actionForm.errors.project}><Input value={actionForm.data.project} onChange={(e) => actionForm.setData('project', e.target.value)} className="rounded-xl" /></Field>
                <Field label="วัตถุประสงค์"><textarea value={actionForm.data.objective} onChange={(e) => actionForm.setData('objective', e.target.value)} className={imInput} rows={2} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="วันเริ่มต้น" required error={actionForm.errors.start_date}><Input type="date" value={actionForm.data.start_date} onChange={(e) => actionForm.setData('start_date', e.target.value)} className="rounded-xl" /></Field>
                    <Field label="วันสิ้นสุด" required error={actionForm.errors.end_date}><Input type="date" value={actionForm.data.end_date} onChange={(e) => actionForm.setData('end_date', e.target.value)} className="rounded-xl" /></Field>
                </div>
                {actionForm.data.start_date && actionForm.data.end_date && (
                    <div className={cn('rounded-xl px-3 py-2 text-xs', actionDuration >= 12 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500')}>
                        ระยะเวลาโครงการ: {actionDuration} เดือน {actionDuration >= 12 && '— โปรดตรวจสอบว่ากำหนดช่วงเวลาจริง ไม่ใช่ 12 เดือนทุกโครงการ'}
                    </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="งบประมาณ (บาท)" required error={actionForm.errors.budget}><Input type="number" value={actionForm.data.budget} onChange={(e) => actionForm.setData('budget', Number(e.target.value))} className="rounded-xl" /></Field>
                    <Field label="งบที่ใช้จริง (บาท)"><Input type="number" value={actionForm.data.actual_budget} onChange={(e) => actionForm.setData('actual_budget', e.target.value)} className="rounded-xl" /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ผู้รับผิดชอบ"><Input value={actionForm.data.owner} onChange={(e) => actionForm.setData('owner', e.target.value)} className="rounded-xl" /></Field>
                    <Field label="ความคืบหน้า (%)"><Input type="number" min={0} max={100} value={actionForm.data.progress} onChange={(e) => actionForm.setData('progress', Number(e.target.value))} className="rounded-xl" /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="สถานะ"><select value={actionForm.data.status} onChange={(e) => actionForm.setData('status', e.target.value)} className={imSelect}><option value="planned">วางแผน</option><option value="in_progress">กำลังทำ</option><option value="done">เสร็จสิ้น</option><option value="cancelled">ยกเลิก</option></select></Field>
                    <Field label="ขั้น PDCA"><select value={actionForm.data.pdca_stage} onChange={(e) => actionForm.setData('pdca_stage', e.target.value)} className={imSelect}>{PDCA.map((s) => <option key={s} value={s}>{PDCA_LABEL[s]}</option>)}</select></Field>
                </div>
                <Field label="ปัญหา/อุปสรรค"><textarea value={actionForm.data.problems} onChange={(e) => actionForm.setData('problems', e.target.value)} className={imInput} rows={2} /></Field>
                <Field label="Lesson Learned (ส่งต่อปีถัดไป)"><textarea value={actionForm.data.lessons_learned} onChange={(e) => actionForm.setData('lessons_learned', e.target.value)} className={imInput} rows={2} /></Field>
                {editingAction ? (
                    <div className="space-y-2">
                        <div className="text-sm font-medium text-slate-700">ไฟล์แนบโครงการ</div>
                        {(editingAction.attachments?.length ?? 0) === 0 ? (
                            <p className="text-xs text-slate-400">ยังไม่มีไฟล์แนบ</p>
                        ) : (
                            <AttachmentList items={editingAction.attachments} onDelete={deleteAttachment} />
                        )}
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                            <Paperclip className="h-3.5 w-3.5" /> แนบไฟล์เพิ่ม
                            <input
                                type="file"
                                multiple
                                accept={FILE_ACCEPT}
                                className="hidden"
                                onChange={(e) => {
                                    uploadFiles(route('im.master-plan.actions.attachments.store', editingAction.id), e.target.files);
                                    e.currentTarget.value = '';
                                }}
                            />
                        </label>
                        <p className="text-[11px] text-slate-400">{FILE_HINT}</p>
                    </div>
                ) : (
                    <FilePicker files={actionForm.data.files} onChange={(files) => actionForm.setData('files', files)} error={fileFormError(actionForm.errors)} />
                )}
            </Modal>
        </ImPage>
    );
}
