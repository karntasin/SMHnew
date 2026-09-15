import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash } from 'lucide-react';
import { format } from 'date-fns';
import { Modal, Field, EmptyState, qualityInput } from '@/components/quality/quality-ui';

export default function Audits({ audits }: { audits: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    const { data, setData, post, put, delete: destroy, processing, reset } = useForm({
        audit_topic: '',
        audit_date: '',
        auditor: '',
        department: '',
        score: '',
        result_summary: '',
    });

    const handleCreate = () => {
        setEditingItem(null);
        reset();
        setIsOpen(true);
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setData({
            audit_topic: item.audit_topic,
            audit_date: item.audit_date,
            auditor: item.auditor,
            department: item.department || '',
            score: item.score || '',
            result_summary: item.result_summary || '',
        });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            put(route('quality-assurance.audits.update', editingItem.id), {
                onSuccess: () => setIsOpen(false),
            });
        } else {
            post(route('quality-assurance.audits.store'), {
                onSuccess: () => setIsOpen(false),
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure?')) {
            destroy(route('quality-assurance.audits.destroy', { audit: id }));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleCreate} className="rounded-xl bg-violet-600 hover:bg-violet-700">
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่มการตรวจสอบ (Audit)
                </Button>
            </div>

            {audits.length === 0 ? (
                <EmptyState text="ยังไม่มีการตรวจสอบ" />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                <th className="py-2 pr-3">หัวข้อ</th>
                                <th className="py-2 pr-3">วันที่</th>
                                <th className="py-2 pr-3">ผู้ตรวจสอบ</th>
                                <th className="py-2 pr-3">แผนก</th>
                                <th className="py-2 pr-3">คะแนน</th>
                                <th className="py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {audits.map((audit) => (
                                <tr key={audit.id} className="border-b border-slate-50">
                                    <td className="py-2.5 pr-3 font-medium text-slate-800">{audit.audit_topic}</td>
                                    <td className="py-2.5 pr-3 text-slate-600">{format(new Date(audit.audit_date), 'dd MMM yyyy')}</td>
                                    <td className="py-2.5 pr-3 text-slate-600">{audit.auditor}</td>
                                    <td className="py-2.5 pr-3 text-slate-600">{audit.department}</td>
                                    <td className="py-2.5 pr-3 text-slate-600">{audit.score ? `${audit.score}%` : '-'}</td>
                                    <td className="py-2.5 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button type="button" onClick={() => handleEdit(audit)} className="text-slate-400 hover:text-violet-600">
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button type="button" onClick={() => handleDelete(audit.id)} className="text-slate-400 hover:text-rose-500">
                                                <Trash className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal
                open={isOpen}
                onClose={() => setIsOpen(false)}
                title={editingItem ? 'แก้ไขการตรวจสอบ' : 'เพิ่มการตรวจสอบใหม่'}
                footer={
                    <Button type="submit" form="qa-audit-form" disabled={processing} className="rounded-xl bg-violet-600 hover:bg-violet-700">
                        บันทึก
                    </Button>
                }
            >
                <form id="qa-audit-form" onSubmit={handleSubmit} className="space-y-4">
                    <Field label="หัวข้อการตรวจสอบ" required>
                        <Input value={data.audit_topic} onChange={(e) => setData('audit_topic', e.target.value)} required className={qualityInput} />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="วันที่ตรวจสอบ" required>
                            <Input type="date" value={data.audit_date} onChange={(e) => setData('audit_date', e.target.value)} required className={qualityInput} />
                        </Field>
                        <Field label="ผู้ตรวจสอบ" required>
                            <Input value={data.auditor} onChange={(e) => setData('auditor', e.target.value)} required className={qualityInput} />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="แผนก/หน่วยงาน">
                            <Input value={data.department} onChange={(e) => setData('department', e.target.value)} className={qualityInput} />
                        </Field>
                        <Field label="คะแนน (%)">
                            <Input type="number" step="0.01" value={data.score} onChange={(e) => setData('score', e.target.value)} className={qualityInput} />
                        </Field>
                    </div>
                    <Field label="สรุปผล/ข้อเสนอแนะ">
                        <Textarea value={data.result_summary} onChange={(e) => setData('result_summary', e.target.value)} className={qualityInput} />
                    </Field>
                </form>
            </Modal>
        </div>
    );
}
