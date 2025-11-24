import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash } from 'lucide-react';
import { format } from 'date-fns';

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
            destroy(route('quality-assurance.audits.destroy', id));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่มการตรวจสอบ (Audit)
                </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground uppercase">
                        <tr>
                            <th className="px-4 py-3">หัวข้อ</th>
                            <th className="px-4 py-3">วันที่</th>
                            <th className="px-4 py-3">ผู้ตรวจสอบ</th>
                            <th className="px-4 py-3">แผนก</th>
                            <th className="px-4 py-3">คะแนน</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {audits.map((audit) => (
                            <tr key={audit.id} className="bg-card hover:bg-accent/50">
                                <td className="px-4 py-3 font-medium">{audit.audit_topic}</td>
                                <td className="px-4 py-3">{format(new Date(audit.audit_date), 'dd MMM yyyy')}</td>
                                <td className="px-4 py-3">{audit.auditor}</td>
                                <td className="px-4 py-3">{audit.department}</td>
                                <td className="px-4 py-3">{audit.score ? `${audit.score}%` : '-'}</td>
                                <td className="px-4 py-3 text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(audit)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(audit.id)}>
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'แก้ไขการตรวจสอบ' : 'เพิ่มการตรวจสอบใหม่'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>หัวข้อการตรวจสอบ</Label>
                            <Input value={data.audit_topic} onChange={e => setData('audit_topic', e.target.value)} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>วันที่ตรวจสอบ</Label>
                                <Input type="date" value={data.audit_date} onChange={e => setData('audit_date', e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>ผู้ตรวจสอบ</Label>
                                <Input value={data.auditor} onChange={e => setData('auditor', e.target.value)} required />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>แผนก/หน่วยงาน</Label>
                                <Input value={data.department} onChange={e => setData('department', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>คะแนน (%)</Label>
                                <Input type="number" step="0.01" value={data.score} onChange={e => setData('score', e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>สรุปผล/ข้อเสนอแนะ</Label>
                            <Textarea value={data.result_summary} onChange={e => setData('result_summary', e.target.value)} />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={processing}>บันทึก</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
