import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calendar, Clock, MapPin, User, Car, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function List({ bookings, stats, filters }) {
    const { auth } = usePage().props as any;

    const handleFilter = (filter) => {
        router.get(route('vehicles.bookings.index'), { filter }, { preserveState: true });
    };

    const getStatusBadge = (booking) => {
        switch (booking.status) {
            case 'approved': return <Badge className="bg-green-500">อนุมัติแล้ว</Badge>;
            case 'pending': 
                return booking.vehicle_id 
                    ? <Badge className="bg-yellow-500">รออนุมัติ</Badge>
                    : <Badge className="bg-orange-500">รอจัดรถ</Badge>;
            case 'rejected': return <Badge className="bg-red-500">ไม่อนุมัติ</Badge>;
            case 'cancelled': return <Badge className="bg-gray-500">ยกเลิก</Badge>;
            case 'completed': return <Badge className="bg-blue-500">เสร็จสิ้น</Badge>;
            default: return <Badge>{booking.status}</Badge>;
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'รายการขอใช้รถ', href: route('vehicles.bookings.index') }]}>
            <Head title="รายการขอใช้รถ" />
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">รายการขอใช้รถ</h1>
                    <div className="space-x-2">
                        <Link href={route('vehicles.bookings.my')}>
                            <Button variant="outline"><FileText className="mr-2 h-4 w-4" /> รายการของฉัน</Button>
                        </Link>
                        <Link href={route('vehicles.calendar')}>
                            <Button variant="outline"><Calendar className="mr-2 h-4 w-4" /> ปฏิทิน</Button>
                        </Link>
                        <Link href={route('vehicles.bookings.create')}>
                            <Button><Plus className="mr-2 h-4 w-4" /> ขอใช้รถใหม่</Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="cursor-pointer hover:bg-gray-50" onClick={() => handleFilter('all')}>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">ทั้งหมด</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
                    </Card>
                    <Card className={`cursor-pointer hover:bg-yellow-50 ${filters.filter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`} onClick={() => handleFilter('pending')}>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-yellow-600">รออนุมัติ</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-yellow-600">{stats.pending}</div></CardContent>
                    </Card>
                    <Card className={`cursor-pointer hover:bg-blue-50 ${filters.filter === 'today' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => handleFilter('today')}>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-600">วันนี้</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-blue-600">{stats.today}</div></CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:bg-green-50" onClick={() => handleFilter('approved')}>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-600">อนุมัติแล้ว</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-green-600">{stats.approved}</div></CardContent>
                    </Card>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Booking No.</TableHead>
                                    <TableHead>รถ</TableHead>
                                    <TableHead>ผู้จอง</TableHead>
                                    <TableHead>จุดหมาย</TableHead>
                                    <TableHead>วันที่ใช้รถ</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead>จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bookings.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                            ไม่พบข้อมูลการจอง
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    bookings.data.map((booking) => (
                                        <TableRow key={booking.id}>
                                            <TableCell className="font-medium">{booking.booking_number}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <Car className="mr-2 h-4 w-4 text-gray-500" />
                                                    <div>
                                                        {booking.vehicle ? (
                                                            <>
                                                                <div className="font-bold">{booking.vehicle.license_plate}</div>
                                                                <div className="text-xs text-gray-500">{booking.vehicle.brand} {booking.vehicle.model}</div>
                                                            </>
                                                        ) : (
                                                            <span className="text-yellow-600 italic">รอจัดรถ</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <User className="mr-2 h-4 w-4 text-gray-500" />
                                                    {booking.user?.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <MapPin className="mr-2 h-4 w-4 text-gray-500" />
                                                    {booking.destination}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">
                                                        {format(new Date(booking.start_datetime), 'd MMM yyyy HH:mm', { locale: th })}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        ถึง {format(new Date(booking.end_datetime), 'd MMM yyyy HH:mm', { locale: th })}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(booking)}</TableCell>
                                            <TableCell>
                                                <Link href={route('vehicles.bookings.show', booking.id)}>
                                                    <Button variant="ghost" size="sm">รายละเอียด</Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
