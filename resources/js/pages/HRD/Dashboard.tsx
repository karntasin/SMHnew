import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BookOpen,
    Clock,
    CheckCircle,
    Hourglass,
    Calendar,
    Award,
    Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface DashboardProps {
    stats: {
        total_hours: number;
        completed_courses: number;
        pending_courses: number;
    };
    recent_activity: Array<{
        id: number;
        course: {
            title: string;
        };
        status: string;
        progress: number;
        completed_at: string | null;
        created_at: string;
    }>;
    upcoming_courses: Array<{
        id: number;
        title: string;
        start_date: string;
        location: string;
    }>;
    canEdit?: boolean;
}

const breadcrumbs = [
    {
        title: 'KM',
        href: '/km/dashboard',
    },
    {
        title: 'ระบบการเรียนรู้ (E-Learning)',
        href: '/km/learn/dashboard',
    },
];

export default function HrdDashboard({ stats, recent_activity, upcoming_courses, canEdit }: DashboardProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="แดชบอร์ด HRD" />

            <div className="flex flex-col gap-8 p-6 md:p-8">
                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-8 md:p-10 text-white shadow-xl">
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-4 max-w-2xl">
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">แดชบอร์ดระบบพัฒนาบุคลากร</h1>
                            <p className="text-emerald-100 text-lg leading-relaxed">
                                ติดตามความก้าวหน้าในการฝึกอบรมและพัฒนาศักยภาพของคุณ
                                เพื่อการเติบโตอย่างยั่งยืนในสายอาชีพ
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <Link href={route('km.learn.index')}>
                                    <Button variant="secondary" className="bg-white text-emerald-700 hover:bg-emerald-50">
                                        <BookOpen className="mr-2 h-4 w-4" /> ดูหลักสูตรทั้งหมด
                                    </Button>
                                </Link>
                                {canEdit && (
                                    <Link href={route('km.learn.courses.create')}>
                                        <Button className="border border-white/40 bg-emerald-500/40 text-white hover:bg-emerald-500/60">
                                            <Plus className="mr-2 h-4 w-4" /> สร้างหลักสูตรใหม่
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                        <div className="hidden md:block relative">
                            <div className="absolute inset-0 bg-emerald-400 blur-3xl opacity-30 rounded-full"></div>
                            <Award className="h-32 w-32 text-white/90 relative z-10 drop-shadow-2xl" />
                        </div>
                    </div>
                    
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-teal-500/30 rounded-full blur-3xl"></div>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="border-0 shadow-md hover:shadow-lg transition-all overflow-hidden group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-blue-50/50">
                            <CardTitle className="text-sm font-medium text-blue-700">
                                ชั่วโมงอบรมรวม
                            </CardTitle>
                            <div className="p-2 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                                <Clock className="h-4 w-4 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-3xl font-bold text-blue-700">{stats.total_hours}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                ชั่วโมงสะสมในปีนี้
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md hover:shadow-lg transition-all overflow-hidden group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-green-50/50">
                            <CardTitle className="text-sm font-medium text-green-700">
                                หลักสูตรที่สำเร็จ
                            </CardTitle>
                            <div className="p-2 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-3xl font-bold text-green-700">{stats.completed_courses}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                หลักสูตรที่ผ่านการอบรมแล้ว
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md hover:shadow-lg transition-all overflow-hidden group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-orange-50/50">
                            <CardTitle className="text-sm font-medium text-orange-700">
                                รอดำเนินการ / กำลังอบรม
                            </CardTitle>
                            <div className="p-2 bg-orange-100 rounded-full group-hover:bg-orange-200 transition-colors">
                                <Hourglass className="h-4 w-4 text-orange-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-3xl font-bold text-orange-700">{stats.pending_courses}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                หลักสูตรที่กำลังดำเนินการอยู่
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
                    {/* Recent Activity */}
                    <Card className="col-span-4 border-0 shadow-md">
                        <CardHeader className="border-b bg-gray-50/50">
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-emerald-600" /> กิจกรรมล่าสุด
                            </CardTitle>
                            <CardDescription>
                                กิจกรรมการฝึกอบรมและสถานะล่าสุดของคุณ
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {recent_activity.length > 0 ? (
                                    recent_activity.map((activity) => (
                                        <div key={activity.id} className="flex items-center gap-4 p-6 hover:bg-gray-50 transition-colors">
                                            <div className="space-y-1 flex-1">
                                                <p className="text-base font-semibold text-gray-800 leading-none mb-2">
                                                    {activity.course?.title || 'หลักสูตรถูกลบ'}
                                                </p>
                                                <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                                                    <Calendar className="h-3 w-3" />
                                                    {activity.status === 'completed' 
                                                        ? `เสร็จสิ้นเมื่อ ${new Date(activity.completed_at!).toLocaleDateString('th-TH')}`
                                                        : `ลงทะเบียนเมื่อ ${new Date(activity.created_at).toLocaleDateString('th-TH')}`
                                                    }
                                                </p>
                                                <div className="flex items-center gap-3 max-w-md">
                                                    <Progress value={activity.progress} className="h-2.5 bg-gray-100" indicatorClassName={activity.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'} />
                                                    <span className="text-xs font-medium text-muted-foreground w-10 text-right">{activity.progress}%</span>
                                                </div>
                                            </div>
                                            <div className="font-medium">
                                                <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'} className={activity.status === 'completed' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-0' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-0'}>
                                                    {activity.status === 'completed' ? 'สำเร็จ' : 'กำลังเรียน'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground">ไม่พบกิจกรรมล่าสุด</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upcoming Courses */}
                    <Card className="col-span-3 border-0 shadow-md">
                        <CardHeader className="border-b bg-gray-50/50">
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-purple-600" /> หลักสูตรที่กำลังจะมาถึง
                            </CardTitle>
                            <CardDescription>
                                หลักสูตรที่เปิดให้ลงทะเบียนเร็วๆ นี้
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {upcoming_courses.length > 0 ? (
                                    upcoming_courses.map((course) => (
                                        <div key={course.id} className="flex items-start gap-4 p-6 hover:bg-gray-50 transition-colors">
                                            <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-xl flex flex-col items-center justify-center text-purple-700 font-bold shadow-sm">
                                                <span className="text-xs uppercase">{new Date(course.start_date).toLocaleString('en-US', { month: 'short' })}</span>
                                                <span className="text-lg leading-none">{new Date(course.start_date).getDate()}</span>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold text-gray-800 leading-tight">
                                                    {course.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(course.start_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                                    <span className="mx-1">•</span>
                                                    <span>{course.location}</span>
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground">ไม่มีหลักสูตรที่กำลังจะมาถึง</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
