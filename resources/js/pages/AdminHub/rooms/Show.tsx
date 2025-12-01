import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Users, MapPin, CheckCircle, XCircle, ArrowLeft, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface Booking {
    id: number;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    status: string;
    attendees_count: number;
    created_at: string;
    room: {
        id: number;
        name: string;
        location: string;
        color: string;
    };
    user: {
        id: number;
        name: string;
        email: string;
        department: string;
    };
}

interface Props {
    booking: Booking;
}

export default function Show({ booking }: Props) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> อนุมัติแล้ว</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Clock className="w-3 h-3 mr-1" /> รออนุมัติ</Badge>;
            case 'rejected':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> ไม่อนุมัติ</Badge>;
            case 'completed':
                return <Badge variant="secondary">เสร็จสิ้น</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'ระบบจองห้องประชุม', href: '/administration/rooms' },
                { title: booking.title, href: '#' },
            ]}
        >
            <Head title={booking.title} />

            <div className="container mx-auto py-6 max-w-5xl">
                <div className="mb-6">
                    <Link href={route('rooms.index')}>
                        <Button variant="ghost" className="pl-0 hover:pl-0 hover:bg-transparent">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            กลับไปหน้ารายการ
                        </Button>
                    </Link>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left Column - Main Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            {getStatusBadge(booking.status)}
                                            <span className="text-sm text-muted-foreground">
                                                จองเมื่อ {format(new Date(booking.created_at), 'd MMM yyyy HH:mm', { locale: th })}
                                            </span>
                                        </div>
                                        <CardTitle className="text-2xl mb-2">{booking.title}</CardTitle>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: booking.room.color }}></div>
                                            <span className="font-medium text-foreground">{booking.room.name}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {booking.room.location}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <Separator />
                                
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> รายละเอียดการประชุม
                                    </h3>
                                    <div className="bg-muted/30 p-4 rounded-lg text-sm whitespace-pre-wrap leading-relaxed border">
                                        {booking.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                            <User className="w-4 h-4" /> ผู้จอง
                                        </h3>
                                        <div className="p-3 border rounded-md bg-white dark:bg-gray-950">
                                            <p className="font-medium">{booking.user.name}</p>
                                            <p className="text-sm text-muted-foreground">{booking.user.department}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{booking.user.email}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                            <Users className="w-4 h-4" /> ผู้เข้าร่วม
                                        </h3>
                                        <div className="p-3 border rounded-md bg-white dark:bg-gray-950 flex items-center gap-3">
                                            <div className="bg-blue-100 text-blue-700 p-2 rounded-full">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold">{booking.attendees_count}</p>
                                                <p className="text-xs text-muted-foreground">คน</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Time & Actions */}
                    <div className="space-y-6">
                        <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                    วันและเวลา
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">วันที่</p>
                                    <p className="text-lg font-semibold">
                                        {format(new Date(booking.start_time), 'EEEEที่ d MMMM yyyy', { locale: th })}
                                    </p>
                                </div>
                                <Separator className="bg-blue-200 dark:bg-blue-800" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">เวลาเริ่ม</p>
                                        <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                                            {format(new Date(booking.start_time), 'HH:mm')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">เวลาสิ้นสุด</p>
                                        <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                                            {format(new Date(booking.end_time), 'HH:mm')}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">การจัดการ</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {booking.status === 'pending' && (
                                    <>
                                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => router.post(route('rooms.bookings.approve', booking.id))}>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            อนุมัติการจอง
                                        </Button>
                                        <Button variant="destructive" className="w-full" onClick={() => router.delete(route('rooms.bookings.destroy', booking.id))}>
                                            <XCircle className="mr-2 h-4 w-4" />
                                            ไม่อนุมัติ / ยกเลิก
                                        </Button>
                                    </>
                                )}
                                {booking.status === 'approved' && (
                                    <Button variant="outline" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => router.delete(route('rooms.bookings.destroy', booking.id))}>
                                        <XCircle className="mr-2 h-4 w-4" />
                                        ยกเลิกการจอง
                                    </Button>
                                )}
                                <Button variant="ghost" className="w-full">
                                    แก้ไขข้อมูล
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
