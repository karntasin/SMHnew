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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function Reviews({ reviews }: { reviews: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    const { data, setData, post, put, delete: destroy, processing, reset } = useForm({
        topic: '',
        review_type: 'Chart Review',
        schedule_date: '',
        reviewer: '',
        status: 'Pending',
        findings: '',
    });

    const handleCreate = () => {
        setEditingItem(null);
        reset();
        setIsOpen(true);
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setData({
            topic: item.topic,
            review_type: item.review_type,
            schedule_date: item.schedule_date,
            reviewer: item.reviewer || '',
            status: item.status,
            findings: item.findings || '',
        });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            put(route('quality-assurance.reviews.update', editingItem.id), {
                onSuccess: () => setIsOpen(false),
            });
        } else {
            post(route('quality-assurance.reviews.store'), {
                onSuccess: () => setIsOpen(false),
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure?')) {
            destroy(route('quality-assurance.reviews.destroy', id));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่มการทบทวน
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {reviews.map((review) => (
                    <div key={review.id} className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline">{review.review_type}</Badge>
                            <Badge className={
                                review.status === 'Completed' ? 'bg-green-500' :
                                review.status === 'In Progress' ? 'bg-blue-500' : 'bg-gray-500'
                            }>
                                {review.status}
                            </Badge>
                        </div>
                        <h3 className="font-semibold text-lg mb-1">{review.topic}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                            Due: {format(new Date(review.schedule_date), 'dd MMM yyyy')}
                        </p>
                        {review.reviewer && <p className="text-sm mb-2">Reviewer: {review.reviewer}</p>}
                        
                        <div className="mt-auto pt-4 border-t flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(review)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(review.id)}>
                                <Trash className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'แก้ไขการทบทวน' : 'เพิ่มการทบทวนใหม่'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>หัวข้อการทบทวน</Label>
                            <Input value={data.topic} onChange={e => setData('topic', e.target.value)} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>ประเภท</Label>
                                <Select value={data.review_type} onValueChange={v => setData('review_type', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Chart Review">Chart Review</SelectItem>
                                        <SelectItem value="Death Review">Death Review</SelectItem>
                                        <SelectItem value="KPI Review">KPI Review</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>วันที่กำหนด</Label>
                                <Input type="date" value={data.schedule_date} onChange={e => setData('schedule_date', e.target.value)} required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>ผู้รับผิดชอบ</Label>
                            <Input value={data.reviewer} onChange={e => setData('reviewer', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>สถานะ</Label>
                            <Select value={data.status} onValueChange={v => setData('status', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>ผลการทบทวน/ข้อค้นพบ</Label>
                            <Textarea value={data.findings} onChange={e => setData('findings', e.target.value)} />
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
