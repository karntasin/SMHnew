import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Check, X, Car, User, MapPin, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function Show({ booking, availableVehicles }) {
    const { auth } = usePage().props as any;
    const [reason, setReason] = useState('');
    const [mileage, setMileage] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState(booking.vehicle_id ? booking.vehicle_id.toString() : '');
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [isCompleteOpen, setIsCompleteOpen] = useState(false);
    const [isApproveOpen, setIsApproveOpen] = useState(false);

    const handleApprove = () => {
        if (!selectedVehicle) {
            alert('กรุณาเลือกรถก่อนอนุมัติ');
            return;
        }
        router.put(route('vehicles.bookings.update', booking.id), { 
            status: 'approved', 
            vehicle_id: selectedVehicle 
        });
        setIsApproveOpen(false);
    };

    const handleReject = () => {
        router.put(route('vehicles.bookings.update', booking.id), { status: 'rejected', reason });
        setIsRejectOpen(false);
    };

    const handleComplete = () => {
        router.put(route('vehicles.bookings.update', booking.id), { status: 'completed', end_mileage: mileage });
        setIsCompleteOpen(false);
    };

    const handleCancel = () => {
        if (confirm('ยืนยันการยกเลิกการจองนี้?')) {
            router.delete(route('vehicles.bookings.destroy', booking.id));
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved': return <Badge className="bg-green-500">อนุมัติแล้ว</Badge>;
            case 'pending': return <Badge className="bg-yellow-500">รออนุมัติ</Badge>;
            case 'rejected': return <Badge className="bg-red-500">ไม่อนุมัติ</Badge>;
            case 'cancelled': return <Badge className="bg-gray-500">ยกเลิก</Badge>;
            case 'completed': return <Badge className="bg-blue-500">เสร็จสิ้น</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'รายการขอใช้รถ', href: route('vehicles.bookings.index') },
            { title: booking.booking_number, href: '#' }
        ]}>
            <Head title={`รายละเอียดคำขอ ${booking.booking_number}`} />
            <div className="max-w-4xl mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={route('vehicles.bookings.index')}>
                            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                        </Link>
                        <h1 className="text-2xl font-bold">รายละเอียดคำขอ {booking.booking_number}</h1>
                    </div>
                    <div>{getStatusBadge(booking.status)}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2">
                        <CardHeader><CardTitle>ข้อมูลการเดินทาง</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-500">วัตถุประสงค์</Label>
                                    <div className="font-medium text-lg">{booking.purpose}</div>
                                </div>
                                <div>
                                    <Label className="text-gray-500">สถานที่ไป</Label>
                                    <div className="flex items-center font-medium text-lg">
                                        <MapPin className="mr-2 h-4 w-4 text-gray-500" />
                                        {booking.destination}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                <div>
                                    <Label className="text-gray-500">วัน-เวลา เริ่มต้น</Label>
                                    <div className="flex items-center font-medium">
                                        <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                                        {format(new Date(booking.start_datetime), 'd MMM yyyy HH:mm', { locale: th })}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-gray-500">วัน-เวลา สิ้นสุด</Label>
                                    <div className="flex items-center font-medium">
                                        <Clock className="mr-2 h-4 w-4 text-gray-500" />
                                        {format(new Date(booking.end_datetime), 'd MMM yyyy HH:mm', { locale: th })}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <Label className="text-gray-500">หมายเหตุ</Label>
                                <div className="mt-1">{booking.note || '-'}</div>
                            </div>

                            {booking.rejection_reason && (
                                <div className="pt-4 border-t">
                                    <Label className="text-red-500">เหตุผลที่ไม่อนุมัติ</Label>
                                    <div className="mt-1 text-red-600">{booking.rejection_reason}</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle>ข้อมูลรถและผู้จอง</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label className="text-gray-500">รถที่ขอใช้</Label>
                                    <div className="flex items-center mt-1">
                                        <Car className="mr-2 h-4 w-4 text-gray-500" />
                                        <div>
                                            {booking.vehicle ? (
                                                <>
                                                    <div className="font-bold">{booking.vehicle.license_plate}</div>
                                                    <div className="text-sm text-gray-500">{booking.vehicle.brand} {booking.vehicle.model}</div>
                                                </>
                                            ) : (
                                                <div className="text-yellow-600 italic">รอการจัดรถ ({booking.category?.name || 'ไม่ระบุประเภท'})</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-gray-500">ผู้จอง</Label>
                                    <div className="flex items-center mt-1">
                                        <User className="mr-2 h-4 w-4 text-gray-500" />
                                        <div>
                                            <div className="font-medium">{booking.user?.name}</div>
                                            <div className="text-sm text-gray-500">{booking.user?.department?.name}</div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-gray-500">จำนวนผู้โดยสาร</Label>
                                    <div className="font-medium mt-1">{booking.passenger_count} คน</div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        {booking.status === 'pending' && (
                            <Card>
                                <CardHeader><CardTitle>การจัดการ</CardTitle></CardHeader>
                                <CardContent className="space-y-2">
                                    <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="w-full bg-green-600 hover:bg-green-700">
                                                <Check className="mr-2 h-4 w-4" /> อนุมัติ / จัดรถ
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>อนุมัติและจัดรถ</DialogTitle></DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label>เลือกรถที่ว่างในช่วงเวลาที่ขอ</Label>
                                                    <Select onValueChange={setSelectedVehicle} value={selectedVehicle}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="เลือกรถ" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableVehicles && availableVehicles.map((v) => (
                                                                <SelectItem key={v.id} value={v.id.toString()}>
                                                                    {v.brand} {v.model} ({v.license_plate})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsApproveOpen(false)}>ยกเลิก</Button>
                                                <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>ยืนยันอนุมัติ</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                    
                                    <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="destructive" className="w-full">
                                                <X className="mr-2 h-4 w-4" /> ไม่อนุมัติ
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>ระบุเหตุผลที่ไม่อนุมัติ</DialogTitle></DialogHeader>
                                            <Textarea 
                                                value={reason} 
                                                onChange={(e) => setReason(e.target.value)} 
                                                placeholder="เหตุผล..." 
                                            />
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsRejectOpen(false)}>ยกเลิก</Button>
                                                <Button variant="destructive" onClick={handleReject}>ยืนยัน</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    {booking.user_id === auth.user.id && (
                                        <Button variant="outline" className="w-full text-red-600 hover:text-red-700" onClick={handleCancel}>
                                            ยกเลิกการจอง
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {booking.status === 'approved' && (
                            <Card>
                                <CardHeader><CardTitle>การจัดการ</CardTitle></CardHeader>
                                <CardContent>
                                    <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                                <Check className="mr-2 h-4 w-4" /> จบงาน / บันทึกเลขไมล์
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>บันทึกการจบงาน</DialogTitle></DialogHeader>
                                            <div className="space-y-2">
                                                <Label>เลขไมล์เมื่อถึงที่หมาย (End Mileage)</Label>
                                                <Input 
                                                    type="number" 
                                                    value={mileage} 
                                                    onChange={(e) => setMileage(e.target.value)} 
                                                    placeholder="ระบุเลขไมล์" 
                                                />
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsCompleteOpen(false)}>ยกเลิก</Button>
                                                <Button onClick={handleComplete}>บันทึก</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
