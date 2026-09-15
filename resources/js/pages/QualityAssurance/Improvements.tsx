import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash } from 'lucide-react';
import { Modal, Field, StatusPill, EmptyState, qualityInput } from '@/components/quality/quality-ui';
import { cn } from '@/lib/utils';

export default function Improvements({ improvements }: { improvements: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    const { data, setData, post, put, delete: destroy, processing, reset } = useForm({
        title: '',
        type: 'CQI',
        description: '',
        status: 'Proposed',
        progress_percentage: '0',
        action_plan: '',
    });

    const handleCreate = () => {
        setEditingItem(null);
        reset();
        setIsOpen(true);
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setData({
            title: item.title,
            type: item.type,
            description: item.description || '',
            status: item.status,
            progress_percentage: item.progress_percentage.toString(),
            action_plan: item.action_plan || '',
        });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            put(route('quality-assurance.improvements.update', editingItem.id), {
                onSuccess: () => setIsOpen(false),
            });
        } else {
            post(route('quality-assurance.improvements.store'), {
                onSuccess: () => setIsOpen(false),
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure?')) {
            destroy(route('quality-assurance.improvements.destroy', { improvement: id }));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleCreate} className="rounded-xl bg-violet-600 hover:bg-violet-700">
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่มโครงการ (CQI/AAR)
                </Button>
            </div>

            {improvements.length === 0 ? (
                <EmptyState text="ยังไม่มีโครงการ CQI/AAR" />
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {improvements.map((item) => (
                        <div key={item.id} className="flex flex-col space-y-3 rounded-2xl border border-slate-200 p-4 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <StatusPill label={item.type} className="mr-2 border-violet-200 bg-violet-50 text-violet-700" />
                                    <span className="text-xs text-slate-500">{item.status}</span>
                                </div>
                                <div className="flex gap-1">
                                    <button type="button" onClick={() => handleEdit(item)} className="text-slate-400 hover:text-violet-600">
                                        <Pencil className="h-3 w-3" />
                                    </button>
                                    <button type="button" onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-rose-500">
                                        <Trash className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                            <p className="line-clamp-2 text-sm text-slate-500">{item.description}</p>

                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Progress</span>
                                    <span>{item.progress_percentage}%</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full bg-violet-500 transition-all"
                                        style={{ width: `${item.progress_percentage}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                open={isOpen}
                onClose={() => setIsOpen(false)}
                title={editingItem ? 'แก้ไขโครงการ' : 'เพิ่มโครงการใหม่'}
                wide
                footer={
                    <Button type="submit" form="qa-improvement-form" disabled={processing} className="rounded-xl bg-violet-600 hover:bg-violet-700">
                        บันทึก
                    </Button>
                }
            >
                <form id="qa-improvement-form" onSubmit={handleSubmit} className="space-y-4">
                    <Field label="ชื่อโครงการ/กิจกรรม" required>
                        <Input value={data.title} onChange={(e) => setData('title', e.target.value)} required className={qualityInput} />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="ประเภท">
                            <Select value={data.type} onValueChange={(v) => setData('type', v)}>
                                <SelectTrigger className={cn(qualityInput, 'h-auto py-2')}><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CQI">CQI</SelectItem>
                                    <SelectItem value="AAR">AAR</SelectItem>
                                    <SelectItem value="Innovation">Innovation</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="สถานะ">
                            <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                                <SelectTrigger className={cn(qualityInput, 'h-auto py-2')}><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Proposed">Proposed</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Monitoring">Monitoring</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>
                    <Field label="ความคืบหน้า (%)">
                        <Input type="number" min="0" max="100" value={data.progress_percentage} onChange={(e) => setData('progress_percentage', e.target.value)} className={qualityInput} />
                    </Field>
                    <Field label="รายละเอียด/ที่มาของปัญหา">
                        <Textarea value={data.description} onChange={(e) => setData('description', e.target.value)} className={qualityInput} />
                    </Field>
                    <Field label="แผนการดำเนินงาน (Action Plan)">
                        <Textarea value={data.action_plan} onChange={(e) => setData('action_plan', e.target.value)} className={qualityInput} />
                    </Field>
                </form>
            </Modal>
        </div>
    );
}
