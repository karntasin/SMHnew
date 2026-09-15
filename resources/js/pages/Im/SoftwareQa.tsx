import React, { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { ImPage, StatCard, Panel, Modal, Field, StatusPill, EmptyState } from '@/pages/Im/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { imInput, imSelect, fmtDate } from '@/pages/Im/shared';
import { Code2, Plus, Trash2, FileText, GitBranch, Download, FolderGit2, ClipboardCheck } from 'lucide-react';

interface DocT { id: number; project: string; doc_type: string; title: string; version: string; file_url?: string | null; repo_url?: string; note?: string; created_at: string; }
interface Review { id: number; project: string; repo_url?: string; reviewer?: string; is_external: boolean; comment_score: number; findings?: string; recommendation?: string; reviewed_at?: string; }
interface Props {
    documents: DocT[]; reviews: Review[]; projects: string[]; docTypes: Record<string, string>;
    summary: { projects: number; documents: number; reviews: number; avg_comment: number; repos: number; };
}

type Tab = 'documents' | 'reviews';

export default function SoftwareQa({ documents, reviews, projects, docTypes, summary }: Props) {
    const [tab, setTab] = useState<Tab>('documents');
    const [modal, setModal] = useState<Tab | null>(null);

    const docForm = useForm<any>({ project: '', doc_type: 'sa', title: '', version: '1.0', repo_url: '', note: '', file: null as File | null });
    const reviewForm = useForm<any>({ project: '', repo_url: '', reviewer: '', is_external: true, comment_score: 80, findings: '', recommendation: '', reviewed_at: '' });

    const submitDoc = (e: React.FormEvent) => { e.preventDefault(); docForm.post(route('im.software-qa.documents.store'), { forceFormData: true, onSuccess: () => { setModal(null); docForm.reset(); } }); };
    const submitReview = (e: React.FormEvent) => { e.preventDefault(); reviewForm.post(route('im.software-qa.reviews.store'), { onSuccess: () => { setModal(null); reviewForm.reset(); } }); };

    return (
        <ImPage active="im.software-qa" icon={Code2} badge="หมวดที่ 6" title="Software Development Quality Assurance" subtitle="ควบคุมคุณภาพการพัฒนาโปรแกรมภายในโรงพยาบาล"
            actions={<Button onClick={() => setModal(tab)} className="rounded-xl bg-sky-600 hover:bg-sky-700"><Plus className="mr-1 h-4 w-4" /> เพิ่มรายการ</Button>}>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <StatCard label="โครงการ" value={summary.projects} icon={FolderGit2} tone="sky" />
                <StatCard label="เอกสาร SDLC" value={summary.documents} icon={FileText} tone="violet" />
                <StatCard label="Git Repositories" value={summary.repos} icon={GitBranch} tone="indigo" />
                <StatCard label="Code Review" value={summary.reviews} icon={ClipboardCheck} tone="amber" />
                <StatCard label="คะแนน Comment เฉลี่ย" value={`${summary.avg_comment}%`} icon={ClipboardCheck} tone="emerald" />
            </div>

            <div className="flex flex-wrap gap-2">
                {([['documents', 'คลังเอกสาร SDLC'], ['reviews', 'Code Review & SQA']] as [Tab, string][]).map(([k, l]) => (
                    <button key={k} onClick={() => setTab(k)} className={cn('rounded-xl border px-4 py-2 text-sm font-semibold transition', tab === k ? 'border-sky-400 bg-sky-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200')}>{l}</button>
                ))}
            </div>

            {tab === 'documents' && (
                <Panel title="SDLC Document Repository" description="System Analysis, Context Diagram, DFD, ER, Sequence, Data Dictionary และ User Manual"
                    action={<Button size="sm" className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={() => setModal('documents')}><Plus className="mr-1 h-4 w-4" /> เพิ่มเอกสาร</Button>}>
                    {documents.length === 0 ? <EmptyState text="ยังไม่มีเอกสาร" /> : (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {documents.map((d) => (
                                <div key={d.id} className="rounded-2xl border border-slate-200 p-4">
                                    <div className="flex items-start justify-between">
                                        <StatusPill label={docTypes[d.doc_type] ?? d.doc_type} className="border-indigo-200 bg-indigo-50 text-indigo-700" />
                                        <button onClick={() => router.delete(route('im.software-qa.documents.destroy', d.id))} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                    <div className="mt-2 font-semibold text-slate-800">{d.title}</div>
                                    <div className="text-xs text-slate-500">{d.project} · v{d.version}</div>
                                    <div className="mt-2 flex items-center gap-3 text-xs">
                                        {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-600 hover:underline"><Download className="h-3 w-3" /> ดาวน์โหลด</a>}
                                        {d.repo_url && <a href={d.repo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-slate-500 hover:underline"><GitBranch className="h-3 w-3" /> Repo</a>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            )}

            {tab === 'reviews' && (
                <Panel title="Code Review & Comment Evaluation" description="บันทึกผลการตรวจ Source Code Comment โดยบุคคลภายนอก และ SQA"
                    action={<Button size="sm" className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={() => setModal('reviews')}><Plus className="mr-1 h-4 w-4" /> เพิ่มผลตรวจ</Button>}>
                    {reviews.length === 0 ? <EmptyState text="ยังไม่มีผล Code Review" /> : (
                        <div className="space-y-3">
                            {reviews.map((r) => (
                                <div key={r.id} className="rounded-2xl border border-slate-200 p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2"><span className="font-semibold text-slate-800">{r.project}</span><StatusPill label={r.is_external ? 'ภายนอก' : 'ภายใน'} className={r.is_external ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'} /></div>
                                        <div className="flex items-center gap-2"><span className={cn('text-sm font-bold', r.comment_score >= 80 ? 'text-emerald-600' : r.comment_score >= 50 ? 'text-amber-600' : 'text-rose-600')}>{r.comment_score}%</span><button onClick={() => router.delete(route('im.software-qa.reviews.destroy', r.id))} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></div>
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500">ผู้ตรวจ: {r.reviewer || '-'} · {fmtDate(r.reviewed_at)}</div>
                                    {(r.findings || r.recommendation) && (
                                        <div className="mt-2 grid gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-2">
                                            {r.findings && <div><span className="font-semibold">ข้อค้นพบ:</span> {r.findings}</div>}
                                            {r.recommendation && <div><span className="font-semibold">ข้อเสนอแนะ:</span> {r.recommendation}</div>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            )}

            <Modal open={modal === 'documents'} onClose={() => setModal(null)} title="เพิ่มเอกสาร SDLC" wide
                footer={<><Button variant="outline" className="rounded-xl" onClick={() => setModal(null)}>ยกเลิก</Button><Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={submitDoc} disabled={docForm.processing}>บันทึก</Button></>}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="โครงการ/ระบบ" required error={docForm.errors.project}><Input list="im-projects" value={docForm.data.project} onChange={(e) => docForm.setData('project', e.target.value)} className="rounded-xl" /><datalist id="im-projects">{projects.map((p) => <option key={p} value={p} />)}</datalist></Field>
                    <Field label="ประเภทเอกสาร"><select value={docForm.data.doc_type} onChange={(e) => docForm.setData('doc_type', e.target.value)} className={imSelect}>{Object.entries(docTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ชื่อเอกสาร" required error={docForm.errors.title}><Input value={docForm.data.title} onChange={(e) => docForm.setData('title', e.target.value)} className="rounded-xl" /></Field>
                    <Field label="เวอร์ชัน" required><Input value={docForm.data.version} onChange={(e) => docForm.setData('version', e.target.value)} className="rounded-xl" /></Field>
                </div>
                <Field label="Git Repository URL" error={docForm.errors.repo_url}><Input value={docForm.data.repo_url} onChange={(e) => docForm.setData('repo_url', e.target.value)} className="rounded-xl" placeholder="https://github.com/..." /></Field>
                <Field label="ไฟล์เอกสาร"><input type="file" onChange={(e) => docForm.setData('file', e.target.files?.[0] ?? null)} className={imInput} /></Field>
                <Field label="หมายเหตุ"><textarea value={docForm.data.note} onChange={(e) => docForm.setData('note', e.target.value)} className={imInput} rows={2} /></Field>
            </Modal>

            <Modal open={modal === 'reviews'} onClose={() => setModal(null)} title="บันทึกผล Code Review" wide
                footer={<><Button variant="outline" className="rounded-xl" onClick={() => setModal(null)}>ยกเลิก</Button><Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={submitReview} disabled={reviewForm.processing}>บันทึก</Button></>}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="โครงการ/ระบบ" required error={reviewForm.errors.project}><Input list="im-projects" value={reviewForm.data.project} onChange={(e) => reviewForm.setData('project', e.target.value)} className="rounded-xl" /></Field>
                    <Field label="Git Repository URL"><Input value={reviewForm.data.repo_url} onChange={(e) => reviewForm.setData('repo_url', e.target.value)} className="rounded-xl" /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="ผู้ตรวจ"><Input value={reviewForm.data.reviewer} onChange={(e) => reviewForm.setData('reviewer', e.target.value)} className="rounded-xl" /></Field>
                    <Field label="คะแนน Comment (%)" required><Input type="number" min={0} max={100} value={reviewForm.data.comment_score} onChange={(e) => reviewForm.setData('comment_score', Number(e.target.value))} className="rounded-xl" /></Field>
                    <Field label="วันที่ตรวจ"><Input type="date" value={reviewForm.data.reviewed_at} onChange={(e) => reviewForm.setData('reviewed_at', e.target.value)} className="rounded-xl" /></Field>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={reviewForm.data.is_external} onChange={(e) => reviewForm.setData('is_external', e.target.checked)} /> ตรวจโดยบุคคลภายนอก</label>
                <Field label="ข้อค้นพบ"><textarea value={reviewForm.data.findings} onChange={(e) => reviewForm.setData('findings', e.target.value)} className={imInput} rows={2} /></Field>
                <Field label="ข้อเสนอแนะ"><textarea value={reviewForm.data.recommendation} onChange={(e) => reviewForm.setData('recommendation', e.target.value)} className={imInput} rows={2} /></Field>
            </Modal>
        </ImPage>
    );
}
