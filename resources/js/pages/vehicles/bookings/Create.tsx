import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';

export default function Create({ vehicles, categories }) {
    const { data, setData, post, processing, errors } = useForm({
        vehicle_category_id: '',
        vehicle_id: '',
        purpose: '',
        destination: '',
        passenger_count: 1,
        start_datetime: '',
        end_datetime: '',
        note: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('vehicles.bookings.store'));
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'รายการขอใช้รถ', href: route('vehicles.bookings.index') },
            { title: 'ขอใช้รถใหม่', href: '#' }
        ]}>
            <Head title="ขอใช้รถใหม่" />
            <div className="max-w-3xl mx-auto p-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Link href={route('vehicles.bookings.index')}>
                                <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                            </Link>
                            <CardTitle>แบบฟอร์มขอใช้รถ</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="vehicle_id">เลือกรถที่ต้องการ (จำเป็น)</Label>
                                    <Select onValueChange={(val) => {
                                        const selectedVehicle = vehicles.find(v => v.id.toString() === val);
                                        setData(data => ({ 
                                            ...data, 
                                            vehicle_id: val,
                                            vehicle_category_id: selectedVehicle?.category_id?.toString() || ''
                                        }));
                                    }} value={data.vehicle_id}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="เลือกรถที่ต้องการ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vehicles.map((vehicle) => (
                                                <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                                    {vehicle.brand} {vehicle.model} ({vehicle.license_plate}) {vehicle.category ? `- ${vehicle.category.name}` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.vehicle_id && <p className="text-red-500 text-sm">{errors.vehicle_id}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="passenger_count">จำนวนผู้โดยสาร</Label>
                                    <Input 
                                        id="passenger_count" 
                                        type="number" 
                                        min="1"
                                        value={data.passenger_count}
                                        onChange={(e) => setData('passenger_count', e.target.value)}
                                    />
                                    {errors.passenger_count && <p className="text-red-500 text-sm">{errors.passenger_count}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="start_datetime">วัน-เวลา เริ่มต้น</Label>
                                    <Input 
                                        id="start_datetime" 
                                        type="datetime-local" 
                                        value={data.start_datetime}
                                        onChange={(e) => setData('start_datetime', e.target.value)}
                                    />
                                    {errors.start_datetime && <p className="text-red-500 text-sm">{errors.start_datetime}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="end_datetime">วัน-เวลา สิ้นสุด</Label>
                                    <Input 
                                        id="end_datetime" 
                                        type="datetime-local" 
                                        value={data.end_datetime}
                                        onChange={(e) => setData('end_datetime', e.target.value)}
                                    />
                                    {errors.end_datetime && <p className="text-red-500 text-sm">{errors.end_datetime}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="purpose">วัตถุประสงค์การใช้รถ</Label>
                                <Input 
                                    id="purpose" 
                                    value={data.purpose}
                                    onChange={(e) => setData('purpose', e.target.value)}
                                    placeholder="เช่น ไปราชการ, รับส่งผู้ป่วย"
                                />
                                {errors.purpose && <p className="text-red-500 text-sm">{errors.purpose}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="destination">สถานที่ไป (ปลายทาง)</Label>
                                <Input 
                                    id="destination" 
                                    value={data.destination}
                                    onChange={(e) => setData('destination', e.target.value)}
                                    placeholder="ระบุสถานที่"
                                />
                                {errors.destination && <p className="text-red-500 text-sm">{errors.destination}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="note">หมายเหตุ (ถ้ามี)</Label>
                                <Textarea 
                                    id="note" 
                                    value={data.note}
                                    onChange={(e) => setData('note', e.target.value)}
                                    placeholder="รายละเอียดเพิ่มเติม"
                                />
                                {errors.note && <p className="text-red-500 text-sm">{errors.note}</p>}
                            </div>

                            <div className="flex justify-end gap-4">
                                <Link href={route('vehicles.bookings.index')}>
                                    <Button variant="outline" type="button">ยกเลิก</Button>
                                </Link>
                                <Button type="submit" disabled={processing}>
                                    <Save className="mr-2 h-4 w-4" /> บันทึกคำขอ
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
