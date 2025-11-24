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
import { Progress } from '@/components/ui/progress';

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
            destroy(route('quality-assurance.improvements.destroy', id));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่มโครงการ (CQI/AAR)
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {improvements.map((item) => (
                    <div key={item.id} className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm flex flex-col space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-xs font-bold px-2 py-1 rounded bg-primary/10 text-primary mr-2">
                                    {item.type}
                                </span>
                                <span className="text-xs text-muted-foreground">{item.status}</span>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(item)}>
                                    <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600" onClick={() => handleDelete(item.id)}>
                                    <Trash className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                        
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                        
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>Progress</span>
                                <span>{item.progress_percentage}%</span>
                            </div>
                            <Progress value={item.progress_percentage} className="h-2" />
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'แก้ไขโครงการ' : 'เพิ่มโครงการใหม่'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>ชื่อโครงการ/กิจกรรม</Label>
                            <Input value={data.title} onChange={e => setData('title', e.target.value)} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>ประเภท</Label>
                                <Select value={data.type} onValueChange={v => setData('type', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CQI">CQI</SelectItem>
                                        <SelectItem value="AAR">AAR</SelectItem>
                                        <SelectItem value="Innovation">Innovation</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>สถานะ</Label>
                                <Select value={data.status} onValueChange={v => setData('status', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Proposed">Proposed</SelectItem>
                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                        <SelectItem value="Monitoring">Monitoring</SelectItem>
                                        <SelectItem value="Completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>ความคืบหน้า (%)</Label>
                            <Input type="number" min="0" max="100" value={data.progress_percentage} onChange={e => setData('progress_percentage', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>รายละเอียด/ที่มาของปัญหา</Label>
                            <Textarea value={data.description} onChange={e => setData('description', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>แผนการดำเนินงาน (Action Plan)</Label>
                            <Textarea value={data.action_plan} onChange={e => setData('action_plan', e.target.value)} />
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
