import React, { useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Car, Save } from 'lucide-react';
import { storageUrl } from '@/lib/asset';
import VehicleSubNav from '../VehicleSubNav';

interface Vehicle {
    id: number;
    license_plate: string;
    brand: string;
    model: string;
    category_id?: number;
    category?: { name: string };
    image_url?: string | null;
    image?: string | null;
}

interface Props {
    vehicles: Vehicle[];
    categories: { id: number; name: string }[];
    preselectVehicleId?: number | null;
}

export default function Create({ vehicles, categories, preselectVehicleId = null }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        vehicle_category_id: '',
        vehicle_id: preselectVehicleId ? String(preselectVehicleId) : '',
        purpose: '',
        destination: '',
        passenger_count: 1,
        start_datetime: '',
        end_datetime: '',
        note: '',
    });

    useEffect(() => {
        if (preselectVehicleId) {
            const selected = vehicles.find((v) => v.id === preselectVehicleId);
            if (selected) {
                setData((prev) => ({
                    ...prev,
                    vehicle_id: String(preselectVehicleId),
                    vehicle_category_id: selected.category_id?.toString() || '',
                }));
            }
        }
    }, [preselectVehicleId, vehicles]);

    const selectedVehicle = vehicles.find((v) => v.id.toString() === data.vehicle_id);
    const previewUrl = selectedVehicle?.image_url || (selectedVehicle?.image ? storageUrl(selectedVehicle.image) : null);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('vehicles.bookings.store'));
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบจองรถ', href: route('vehicles.index') },
            { title: 'ขอใช้รถใหม่', href: '#' },
        ]}>
            <Head title="ขอใช้รถใหม่" />

            <div className="relative min-h-screen overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_55%)]" />

                <div className="relative container mx-auto max-w-3xl space-y-6 px-4 py-6">
                    <VehicleSubNav active="vehicles.index" />

                    <Card className="rounded-[1.5rem] border-slate-200/80 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <Link href={route('vehicles.index')}>
                                    <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                                </Link>
                                <CardTitle>แบบฟอร์มขอใช้รถ</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {previewUrl && (
                                <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/50">
                                    <img
                                        src={previewUrl}
                                        alt={selectedVehicle?.license_plate}
                                        className="h-44 w-full object-cover"
                                    />
                                    {selectedVehicle && (
                                        <div className="flex items-center gap-2 px-4 py-3 text-sm">
                                            <Car className="h-4 w-4 text-emerald-600" />
                                            <span className="font-semibold text-slate-800">
                                                {selectedVehicle.brand} {selectedVehicle.model} ({selectedVehicle.license_plate})
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <form onSubmit={submit} className="space-y-6">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="vehicle_id">เลือกรถที่ต้องการ (จำเป็น)</Label>
                                        <Select
                                            onValueChange={(val) => {
                                                const selectedVehicleItem = vehicles.find((v) => v.id.toString() === val);
                                                setData((prev) => ({
                                                    ...prev,
                                                    vehicle_id: val,
                                                    vehicle_category_id: selectedVehicleItem?.category_id?.toString() || '',
                                                }));
                                            }}
                                            value={data.vehicle_id}
                                        >
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue placeholder="เลือกรถที่ต้องการ" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {vehicles.map((vehicle) => (
                                                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                                        {vehicle.brand} {vehicle.model} ({vehicle.license_plate})
                                                        {vehicle.category ? ` - ${vehicle.category.name}` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.vehicle_id && <p className="text-sm text-red-500">{errors.vehicle_id}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="passenger_count">จำนวนผู้โดยสาร</Label>
                                        <Input
                                            id="passenger_count"
                                            type="number"
                                            min="1"
                                            className="rounded-xl"
                                            value={data.passenger_count}
                                            onChange={(e) => setData('passenger_count', e.target.value)}
                                        />
                                        {errors.passenger_count && <p className="text-sm text-red-500">{errors.passenger_count}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="start_datetime">วัน-เวลา เริ่มต้น</Label>
                                        <Input
                                            id="start_datetime"
                                            type="datetime-local"
                                            className="rounded-xl"
                                            value={data.start_datetime}
                                            onChange={(e) => setData('start_datetime', e.target.value)}
                                        />
                                        {errors.start_datetime && <p className="text-sm text-red-500">{errors.start_datetime}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="end_datetime">วัน-เวลา สิ้นสุด</Label>
                                        <Input
                                            id="end_datetime"
                                            type="datetime-local"
                                            className="rounded-xl"
                                            value={data.end_datetime}
                                            onChange={(e) => setData('end_datetime', e.target.value)}
                                        />
                                        {errors.end_datetime && <p className="text-sm text-red-500">{errors.end_datetime}</p>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="purpose">วัตถุประสงค์การใช้รถ</Label>
                                    <Input
                                        id="purpose"
                                        className="rounded-xl"
                                        value={data.purpose}
                                        onChange={(e) => setData('purpose', e.target.value)}
                                        placeholder="เช่น ไปราชการ, รับส่งผู้ป่วย"
                                    />
                                    {errors.purpose && <p className="text-sm text-red-500">{errors.purpose}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="destination">สถานที่ไป (ปลายทาง)</Label>
                                    <Input
                                        id="destination"
                                        className="rounded-xl"
                                        value={data.destination}
                                        onChange={(e) => setData('destination', e.target.value)}
                                        placeholder="ระบุสถานที่"
                                    />
                                    {errors.destination && <p className="text-sm text-red-500">{errors.destination}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="note">หมายเหตุ (ถ้ามี)</Label>
                                    <Textarea
                                        id="note"
                                        className="rounded-xl"
                                        value={data.note}
                                        onChange={(e) => setData('note', e.target.value)}
                                        placeholder="รายละเอียดเพิ่มเติม"
                                    />
                                    {errors.note && <p className="text-sm text-red-500">{errors.note}</p>}
                                </div>

                                <div className="flex justify-end gap-4">
                                    <Link href={route('vehicles.index')}>
                                        <Button variant="outline" type="button" className="rounded-xl">ยกเลิก</Button>
                                    </Link>
                                    <Button type="submit" disabled={processing} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                                        <Save className="mr-2 h-4 w-4" /> บันทึกคำขอ
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
