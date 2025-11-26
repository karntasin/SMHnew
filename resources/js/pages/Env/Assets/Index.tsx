import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
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
import { Plus, Pencil, Trash, Box } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function Index({ assets }: { assets: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    const { data, setData, post, put, delete: destroy, processing, reset } = useForm({
        name: '',
        model: '',
        serial_number: '',
        price: '',
        location: '',
        owner: '',
        risk_level: 'C',
        status: 'Active',
        purchase_date: '',
        warranty_expiry: '',
        frequency_type: 'month',
        frequency_value: '12',
        next_pm_date: '',
    });

    const handleCreate = () => {
        setEditingItem(null);
        reset();
        setIsOpen(true);
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setData({
            name: item.name,
            model: item.model || '',
            serial_number: item.serial_number || '',
            price: item.price || '',
            location: item.location || '',
            owner: item.owner || '',
            risk_level: item.risk_level,
            status: item.status,
            purchase_date: item.purchase_date || '',
            warranty_expiry: item.warranty_expiry || '',
            frequency_type: item.schedule?.frequency_type || 'month',
            frequency_value: item.schedule?.frequency_value?.toString() || '12',
            next_pm_date: item.schedule?.next_pm_date || '',
        });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            put(route('env.assets.update', editingItem.id), {
                onSuccess: () => setIsOpen(false),
            });
        } else {
            post(route('env.assets.store'), {
                onSuccess: () => setIsOpen(false),
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure?')) {
            destroy(route('env.assets.destroy', id));
        }
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ENV', href: route('env.index') },
            { title: 'จัดการครุภัณฑ์', href: route('env.assets.index') }
        ]}>
            <Head title="Asset Management" />

            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Box className="h-6 w-6" />
                            ทะเบียนครุภัณฑ์ (Asset Registry)
                        </h2>
                        <p className="text-muted-foreground">จัดการข้อมูลเครื่องมือแพทย์และอุปกรณ์สำคัญ</p>
                    </div>
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        เพิ่มครุภัณฑ์
                    </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground uppercase">
                            <tr>
                                <th className="px-4 py-3">ชื่อเครื่องมือ</th>
                                <th className="px-4 py-3">Model/SN</th>
                                <th className="px-4 py-3">สถานที่/ผู้รับผิดชอบ</th>
                                <th className="px-4 py-3">ความเสี่ยง</th>
                                <th className="px-4 py-3">สถานะ</th>
                                <th className="px-4 py-3">Next PM</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {assets.map((asset) => (
                                <tr key={asset.id} className="bg-card hover:bg-accent/50">
                                    <td className="px-4 py-3 font-medium">{asset.name}</td>
                                    <td className="px-4 py-3">
                                        <div className="text-xs">{asset.model}</div>
                                        <div className="text-xs text-muted-foreground">{asset.serial_number}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-xs">{asset.location}</div>
                                        <div className="text-xs text-muted-foreground">{asset.owner}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant={asset.risk_level === 'A' ? 'destructive' : asset.risk_level === 'B' ? 'default' : 'secondary'}>
                                            {asset.risk_level}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline" className={
                                            asset.status === 'Active' ? 'text-green-600 border-green-600' : 
                                            asset.status === 'Maintenance' ? 'text-yellow-600 border-yellow-600' : ''
                                        }>
                                            {asset.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        {asset.schedule?.next_pm_date ? format(new Date(asset.schedule.next_pm_date), 'dd MMM yyyy') : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(asset)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(asset.id)}>
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'แก้ไขครุภัณฑ์' : 'เพิ่มครุภัณฑ์ใหม่'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>ชื่อเครื่องมือ</Label>
                                    <Input value={data.name} onChange={e => setData('name', e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>รุ่น (Model)</Label>
                                    <Input value={data.model} onChange={e => setData('model', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Serial Number</Label>
                                    <Input value={data.serial_number} onChange={e => setData('serial_number', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>ราคา</Label>
                                    <Input type="number" value={data.price} onChange={e => setData('price', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>สถานที่ตั้ง</Label>
                                    <Input value={data.location} onChange={e => setData('location', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>ผู้รับผิดชอบ</Label>
                                    <Input value={data.owner} onChange={e => setData('owner', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>ระดับความเสี่ยง</Label>
                                    <Select value={data.risk_level} onValueChange={v => setData('risk_level', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="A">A (High Risk)</SelectItem>
                                            <SelectItem value="B">B (Medium Risk)</SelectItem>
                                            <SelectItem value="C">C (Low Risk)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>สถานะ</Label>
                                    <Select value={data.status} onValueChange={v => setData('status', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Inactive">Inactive</SelectItem>
                                            <SelectItem value="Maintenance">Maintenance</SelectItem>
                                            <SelectItem value="Retired">Retired</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>วันที่ซื้อ</Label>
                                    <Input type="date" value={data.purchase_date} onChange={e => setData('purchase_date', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>วันหมดประกัน</Label>
                                    <Input type="date" value={data.warranty_expiry} onChange={e => setData('warranty_expiry', e.target.value)} />
                                </div>
                            </div>
                            
                            {!editingItem && (
                                <div className="border-t pt-4 mt-4">
                                    <h4 className="font-medium mb-2">แผนการบำรุงรักษา (PM Plan)</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>ความถี่</Label>
                                            <div className="flex gap-2">
                                                <Input type="number" className="w-20" value={data.frequency_value} onChange={e => setData('frequency_value', e.target.value)} required />
                                                <Select value={data.frequency_type} onValueChange={v => setData('frequency_type', v)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="month">เดือน</SelectItem>
                                                        <SelectItem value="year">ปี</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>เริ่มทำ PM ครั้งถัดไป</Label>
                                            <Input type="date" value={data.next_pm_date} onChange={e => setData('next_pm_date', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>บันทึก</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
