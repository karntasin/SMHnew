import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';
import { cn } from '@/lib/utils';
import EquipmentSubNav from '../EquipmentSubNav';

interface EquipmentOption {
    id: number;
    name: string;
    asset_code: string;
    unit?: string | null;
    quantity_available: number;
    image_url?: string | null;
    category?: { id?: number; name: string; color?: string } | null;
}

interface Props {
    equipment: EquipmentOption[];
    departments: any[];
    preselectEquipmentId?: number | null;
}

export default function Create({ equipment, preselectEquipmentId = null }: Props) {
    const [category, setCategory] = useState('all');
    const { data, setData, post, processing, errors } = useForm({
        equipment_id: '',
        quantity: 1,
        purpose: '',
        usage_detail: '',
        patient_hn: '',
        ward_location: '',
        borrow_date: new Date().toISOString().slice(0, 10),
        borrow_time: '08:30',
        expected_return_date: '',
        expected_return_time: '15:00',
        notes: '',
    });

    useEffect(() => {
        if (preselectEquipmentId) {
            setData('equipment_id', String(preselectEquipmentId));
        }
    }, [preselectEquipmentId]);

    const selected = equipment.find((e) => String(e.id) === data.equipment_id);
    const categories = useMemo(() => {
        const names = Array.from(new Set(equipment.map((e) => e.category?.name).filter(Boolean))) as string[];
        return names;
    }, [equipment]);

    const visible = useMemo(() => {
        if (category === 'all') return equipment;
        return equipment.filter((e) => e.category?.name === category);
    }, [equipment, category]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('equipment-borrowing.borrowings.store'));
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ยืมอุปกรณ์แพทย์', href: route('equipment-borrowing.dashboard') },
            { title: 'ขอยืมอุปกรณ์', href: '#' },
        ]}>
            <Head title="ขอยืมอุปกรณ์" />

            <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
                <EquipmentSubNav active="equipment-borrowing.dashboard" />

                <Card className="rounded-3xl border-slate-200/80 shadow-lg">
                    <CardHeader>
                        <CardTitle>แบบฟอร์มเบิกอุปกรณ์เครื่องมือแพทย์</CardTitle>
                        <p className="text-sm text-slate-500">เลือกรายการจากรูปตามแบบฟอร์มเบิก/คืน แล้วระบุภารกิจและวันเวลารับ-คืน</p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-5">
                            <div className="space-y-3">
                                <Label>เลือกรายการอุปกรณ์ *</Label>
                                <div className="flex flex-wrap gap-2">
                                    <Button type="button" size="sm" variant={category === 'all' ? 'default' : 'outline'} className="rounded-full" onClick={() => setCategory('all')}>
                                        ทั้งหมด
                                    </Button>
                                    {categories.map((name) => (
                                        <Button key={name} type="button" size="sm" variant={category === name ? 'default' : 'outline'} className="rounded-full" onClick={() => setCategory(name)}>
                                            {name}
                                        </Button>
                                    ))}
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {visible.map((eq) => {
                                        const active = String(eq.id) === data.equipment_id;
                                        const empty = eq.quantity_available <= 0;
                                        return (
                                            <button
                                                key={eq.id}
                                                type="button"
                                                disabled={empty}
                                                onClick={() => setData({
                                                    ...data,
                                                    equipment_id: String(eq.id),
                                                    quantity: Math.min(Number(data.quantity) || 1, eq.quantity_available || 1),
                                                })}
                                                className={cn(
                                                    'overflow-hidden rounded-2xl border text-left transition',
                                                    active ? 'border-teal-500 ring-2 ring-teal-200' : 'border-slate-200 hover:border-teal-200',
                                                    empty && 'cursor-not-allowed opacity-50',
                                                )}
                                            >
                                                <div className="aspect-[4/3] bg-slate-100">
                                                    {eq.image_url ? (
                                                        <img src={eq.image_url} alt={eq.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center text-xs text-slate-400">ไม่มีรูป</div>
                                                    )}
                                                </div>
                                                <div className="space-y-1 p-3">
                                                    <div className="line-clamp-2 text-sm font-semibold text-slate-800">{eq.name}</div>
                                                    <div className="text-xs text-slate-500">
                                                        {eq.asset_code} · เหลือ {eq.quantity_available} {eq.unit || 'ชิ้น'}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {errors.equipment_id && <p className="text-red-500 text-sm">{errors.equipment_id}</p>}
                            </div>

                            {selected && (
                                <div className="flex items-center gap-3 overflow-hidden rounded-2xl border border-teal-100 bg-teal-50/70 p-2">
                                    <div className="h-16 w-24 overflow-hidden rounded-xl bg-slate-100">
                                        {selected.image_url ? (
                                            <img src={selected.image_url} alt={selected.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-xs text-slate-400">ไม่มีรูป</div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-800">{selected.name}</div>
                                        <div className="text-xs text-slate-500">
                                            {selected.asset_code} · คงเหลือ {selected.quantity_available} {selected.unit || 'ชิ้น'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>จำนวน *</Label>
                                <Input type="number" min={1} max={selected?.quantity_available || 99} value={data.quantity}
                                    onChange={(e) => setData('quantity', Number(e.target.value))} />
                                <p className="text-xs text-slate-500">หน่วย: {selected?.unit || 'ชิ้น/ชุด'} · สต็อกเริ่มต้นอย่างละ 5</p>
                                {errors.quantity && <p className="text-red-500 text-sm">{errors.quantity}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>ภารกิจ *</Label>
                                <Input value={data.purpose} onChange={(e) => setData('purpose', e.target.value)} placeholder="เช่น ออกหน่วยแพทย์, ฝึกซ้อม CPR, ห้องผ่าตัด" />
                                {errors.purpose && <p className="text-red-500 text-sm">{errors.purpose}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>รายละเอียดการใช้งาน</Label>
                                <Textarea value={data.usage_detail} onChange={(e) => setData('usage_detail', e.target.value)} rows={2} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>HN ผู้ป่วย (ถ้ามี)</Label>
                                    <Input value={data.patient_hn} onChange={(e) => setData('patient_hn', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>หอผู้ป่วย/สถานที่ใช้</Label>
                                    <Input value={data.ward_location} onChange={(e) => setData('ward_location', e.target.value)} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>วันที่ปฏิบัติภารกิจ *</Label>
                                    <ThaiDatePicker value={data.borrow_date} onChange={(v) => setData('borrow_date', v)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>เวลารับ/ตรวจเช็ค *</Label>
                                    <Input type="time" min="08:30" max="15:00" value={data.borrow_time} onChange={(e) => setData('borrow_time', e.target.value)} />
                                    <p className="text-xs text-slate-500">ในเวลา 08.30-15.00 น. ตามแบบฟอร์มเดิม</p>
                                    {errors.borrow_time && <p className="text-red-500 text-sm">{errors.borrow_time}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>กำหนดวันคืน *</Label>
                                    <ThaiDatePicker value={data.expected_return_date} onChange={(v) => setData('expected_return_date', v)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>เวลาคืน *</Label>
                                    <Input type="time" value={data.expected_return_time} onChange={(e) => setData('expected_return_time', e.target.value)} />
                                    {errors.expected_return_time && <p className="text-red-500 text-sm">{errors.expected_return_time}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>หมายเหตุ</Label>
                                <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={2} />
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" disabled={processing}>ส่งคำขอเบิก</Button>
                                <Link href={route('equipment-borrowing.borrowings.my')}><Button type="button" variant="outline">ยกเลิก</Button></Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
