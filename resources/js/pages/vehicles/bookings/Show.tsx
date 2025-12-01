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
import { ArrowLeft, Check, X, Car, User, MapPin, Calendar, Clock, UserCheck, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Driver {
    id: number;
    name: string;
    email: string;
}

export default function Show({ booking, availableVehicles, drivers = [], canApprove = false }) {
    const { auth } = usePage().props as any;
    const [reason, setReason] = useState('');
    const [mileage, setMileage] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState(booking.vehicle_id ? booking.vehicle_id.toString() : '');
    const [selectedDriver, setSelectedDriver] = useState(booking.driver_id ? booking.driver_id.toString() : '');
    const [declineReason, setDeclineReason] = useState('');
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [isCompleteOpen, setIsCompleteOpen] = useState(false);
    const [isApproveOpen, setIsApproveOpen] = useState(false);
    const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false);
    const [isDeclineOpen, setIsDeclineOpen] = useState(false);
    const [isEditApprovalOpen, setIsEditApprovalOpen] = useState(false);
    const [isRevokeOpen, setIsRevokeOpen] = useState(false);
    const [revokeReason, setRevokeReason] = useState('');

    const isDriver = booking.driver_id === auth.user?.id;
    const isRequester = booking.user_id === auth.user?.id;

    const handleApprove = () => {
        if (!selectedVehicle) {
            alert('กรุณาเลือกรถก่อนอนุมัติ');
            return;
        }
        router.put(route('vehicles.bookings.update', booking.id), { 
            status: 'approved', 
            vehicle_id: selectedVehicle,
            driver_id: selectedDriver || null,
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

    const handleAssignDriver = () => {
        if (!selectedDriver) {
            alert('กรุณาเลือกคนขับ');
            return;
        }
        router.post(route('vehicles.bookings.assignDriver', booking.id), { 
            driver_id: selectedDriver 
        });
        setIsAssignDriverOpen(false);
    };

    const handleDriverConfirm = () => {
        router.post(route('vehicles.bookings.confirmDriver', booking.id), { 
            action: 'confirm' 
        });
    };

    const handleDriverDecline = () => {
        if (!declineReason) {
            alert('กรุณาระบุเหตุผลที่ไม่รับงาน');
            return;
        }
        router.post(route('vehicles.bookings.confirmDriver', booking.id), { 
            action: 'decline',
            reason: declineReason,
        });
        setIsDeclineOpen(false);
    };

    const handleEditApproval = () => {
        router.put(route('vehicles.bookings.update', booking.id), { 
            action: 'edit_approval',
            vehicle_id: selectedVehicle,
            driver_id: selectedDriver === 'none' ? null : selectedDriver,
        });
        setIsEditApprovalOpen(false);
    };

    const handleRevokeApproval = () => {
        router.put(route('vehicles.bookings.update', booking.id), { 
            action: 'revoke_approval',
            reason: revokeReason,
        });
        setIsRevokeOpen(false);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return <Badge className="bg-green-500">อนุมัติแล้ว</Badge>;
            case 'pending': return <Badge className="bg-yellow-500">รออนุมัติ</Badge>;
            case 'rejected': return <Badge className="bg-red-500">ไม่อนุมัติ</Badge>;
            case 'cancelled': return <Badge className="bg-gray-500">ยกเลิก</Badge>;
            case 'completed': return <Badge className="bg-blue-500">เสร็จสิ้น</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    const getDriverStatus = () => {
        if (!booking.driver_id) {
            return <Badge variant="outline" className="text-gray-500">ยังไม่มอบหมาย</Badge>;
        }
        if (booking.driver_confirmed_at) {
            return <Badge className="bg-green-500">ยืนยันรับงานแล้ว</Badge>;
        }
        return <Badge className="bg-yellow-500">รอยืนยันรับงาน</Badge>;
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

                {/* Driver notification for assigned job */}
                {isDriver && booking.status === 'approved' && !booking.driver_confirmed_at && (
                    <Alert className="bg-yellow-50 border-yellow-300">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <span>คุณได้รับมอบหมายงานขับรถนี้ กรุณายืนยันรับงาน</span>
                                <div className="flex gap-2">
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleDriverConfirm}>
                                        <Check className="mr-1 h-4 w-4" /> รับงาน
                                    </Button>
                                    <Dialog open={isDeclineOpen} onOpenChange={setIsDeclineOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm" variant="destructive">
                                                <X className="mr-1 h-4 w-4" /> ไม่รับงาน
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>ระบุเหตุผลที่ไม่รับงาน</DialogTitle></DialogHeader>
                                            <Textarea 
                                                value={declineReason} 
                                                onChange={(e) => setDeclineReason(e.target.value)} 
                                                placeholder="เหตุผล..." 
                                            />
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsDeclineOpen(false)}>ยกเลิก</Button>
                                                <Button variant="destructive" onClick={handleDriverDecline}>ยืนยัน</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Previous driver declined notice */}
                {booking.driver_rejection_reason && (
                    <Alert className="bg-red-50 border-red-300">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                            คนขับก่อนหน้าปฏิเสธงาน: {booking.driver_rejection_reason}
                        </AlertDescription>
                    </Alert>
                )}

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

                                {/* Driver info */}
                                <div className="pt-4 border-t">
                                    <Label className="text-gray-500">คนขับรถ</Label>
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="flex items-center">
                                            <UserCheck className="mr-2 h-4 w-4 text-gray-500" />
                                            <div>
                                                {booking.driver ? (
                                                    <div className="font-medium">{booking.driver.name}</div>
                                                ) : (
                                                    <div className="text-gray-500 italic">ยังไม่มอบหมาย</div>
                                                )}
                                            </div>
                                        </div>
                                        {getDriverStatus()}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions for pending - only for admin/hdriver */}
                        {booking.status === 'pending' && canApprove && (
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
                                                    <Label>เลือกรถที่ว่างในช่วงเวลาที่ขอ *</Label>
                                                    <Select onValueChange={setSelectedVehicle} value={selectedVehicle}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="เลือกรถ" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableVehicles && availableVehicles.map((v: any) => (
                                                                <SelectItem key={v.id} value={v.id.toString()}>
                                                                    {v.brand} {v.model} ({v.license_plate})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>เลือกคนขับ (ถ้ามี)</Label>
                                                    <Select onValueChange={(val) => setSelectedDriver(val === 'none' ? '' : val)} value={selectedDriver || 'none'}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="เลือกคนขับ" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">-- ไม่ระบุ --</SelectItem>
                                                            {drivers && drivers.map((d: Driver) => (
                                                                <SelectItem key={d.id} value={d.id.toString()}>
                                                                    {d.name}
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

                                    {isRequester && (
                                        <Button variant="outline" className="w-full text-red-600 hover:text-red-700" onClick={handleCancel}>
                                            ยกเลิกการจอง
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Requester cancel for pending booking if not admin */}
                        {booking.status === 'pending' && isRequester && !canApprove && (
                            <Card>
                                <CardContent className="pt-6">
                                    <Button variant="outline" className="w-full text-red-600 hover:text-red-700" onClick={handleCancel}>
                                        ยกเลิกการจอง
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Assign driver for approved booking */}
                        {booking.status === 'approved' && canApprove && (!booking.driver_id || booking.driver_rejection_reason) && (
                            <Card>
                                <CardHeader><CardTitle>มอบหมายคนขับ</CardTitle></CardHeader>
                                <CardContent>
                                    <Dialog open={isAssignDriverOpen} onOpenChange={setIsAssignDriverOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                                <UserCheck className="mr-2 h-4 w-4" /> มอบหมายคนขับ
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>เลือกคนขับ</DialogTitle></DialogHeader>
                                            <div className="space-y-2 py-4">
                                                <Label>เลือกคนขับ</Label>
                                                <Select onValueChange={setSelectedDriver} value={selectedDriver}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="เลือกคนขับ" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {drivers && drivers.map((d: Driver) => (
                                                            <SelectItem key={d.id} value={d.id.toString()}>
                                                                {d.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsAssignDriverOpen(false)}>ยกเลิก</Button>
                                                <Button onClick={handleAssignDriver}>มอบหมาย</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>
                        )}

                        {/* Edit Approval - for admin/hdriver to fix mistakes */}
                        {booking.status === 'approved' && canApprove && (
                            <Card>
                                <CardHeader><CardTitle>แก้ไขการอนุมัติ</CardTitle></CardHeader>
                                <CardContent className="space-y-2">
                                    <Dialog open={isEditApprovalOpen} onOpenChange={setIsEditApprovalOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full">
                                                <Car className="mr-2 h-4 w-4" /> แก้ไขรถ/คนขับ
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>แก้ไขข้อมูลการอนุมัติ</DialogTitle></DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label>เปลี่ยนรถ</Label>
                                                    <Select onValueChange={setSelectedVehicle} value={selectedVehicle}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="เลือกรถ" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableVehicles && availableVehicles.map((v: any) => (
                                                                <SelectItem key={v.id} value={v.id.toString()}>
                                                                    {v.brand} {v.model} ({v.license_plate})
                                                                </SelectItem>
                                                            ))}
                                                            {booking.vehicle && !availableVehicles?.find((v: any) => v.id === booking.vehicle.id) && (
                                                                <SelectItem value={booking.vehicle.id.toString()}>
                                                                    {booking.vehicle.brand} {booking.vehicle.model} ({booking.vehicle.license_plate}) - ปัจจุบัน
                                                                </SelectItem>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>เปลี่ยนคนขับ</Label>
                                                    <Select onValueChange={(val) => setSelectedDriver(val === 'none' ? '' : val)} value={selectedDriver || 'none'}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="เลือกคนขับ" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">-- ไม่ระบุ --</SelectItem>
                                                            {drivers && drivers.map((d: Driver) => (
                                                                <SelectItem key={d.id} value={d.id.toString()}>
                                                                    {d.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsEditApprovalOpen(false)}>ยกเลิก</Button>
                                                <Button onClick={handleEditApproval}>บันทึกการแก้ไข</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
                                                <X className="mr-2 h-4 w-4" /> ยกเลิกการอนุมัติ
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>ยกเลิกการอนุมัติ</DialogTitle></DialogHeader>
                                            <div className="space-y-2 py-4">
                                                <Label>เหตุผลในการยกเลิกการอนุมัติ</Label>
                                                <Textarea 
                                                    value={revokeReason} 
                                                    onChange={(e) => setRevokeReason(e.target.value)} 
                                                    placeholder="เช่น อนุมัติผิดรถ, ต้องการเปลี่ยนเงื่อนไข..." 
                                                />
                                                <p className="text-sm text-gray-500">
                                                    การยกเลิกการอนุมัติจะทำให้สถานะกลับเป็น "รออนุมัติ"
                                                </p>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsRevokeOpen(false)}>ยกเลิก</Button>
                                                <Button variant="destructive" onClick={handleRevokeApproval}>ยืนยันยกเลิกการอนุมัติ</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>
                        )}

                        {/* Complete booking - only driver who confirmed can complete */}
                        {booking.status === 'approved' && isDriver && booking.driver_confirmed_at && (
                            <Card>
                                <CardHeader><CardTitle>จบงาน</CardTitle></CardHeader>
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
