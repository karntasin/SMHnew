import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wrench, Clock, CheckCircle, AlertCircle, Plus, List, Settings, Briefcase } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardProps {
    stats: {
        total: number;
        pending: number;
        in_progress: number;
        completed: number;
    };
    recentRequests: any[];
    monthlyStats: { name: string; count: number }[];
    categoryStats: { name: string; count: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Dashboard({ stats, recentRequests, monthlyStats, categoryStats }: DashboardProps) {
    return (
        <AppLayout breadcrumbs={[{ title: 'แดชบอร์ดแจ้งซ่อม', href: '/maintenance/dashboard' }]}>
            <Head title="แดชบอร์ดแจ้งซ่อม" />
            
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">ภาพรวมการแจ้งซ่อม</h1>
                    <Link href={route('maintenance.requests.create')}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            แจ้งซ่อมใหม่
                        </Button>
                    </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Link href={route('maintenance.requests.index')}>
                        <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">รายการทั้งหมด</CardTitle>
                                <Wrench className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total}</div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href={route('maintenance.requests.index', { status: 'pending' })}>
                        <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">รอดำเนินการ</CardTitle>
                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.pending}</div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href={route('maintenance.requests.index', { status: 'in_progress' })}>
                        <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">กำลังดำเนินการ</CardTitle>
                                <Clock className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.in_progress}</div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href={route('maintenance.requests.index', { status: 'completed' })}>
                        <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">เสร็จสิ้น</CardTitle>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.completed}</div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Quick Access Menu */}
                <h2 className="text-lg font-semibold">เมนูลัด</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Link href={route('maintenance.requests.index')}>
                        <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                            <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
                                <div className="p-4 bg-primary/10 rounded-full">
                                    <List className="w-8 h-8 text-primary" />
                                </div>
                                <div className="text-center">
                                    <h3 className="font-semibold">รายการแจ้งซ่อม</h3>
                                    <p className="text-sm text-muted-foreground">ดูรายการแจ้งซ่อมทั้งหมด</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href={route('maintenance.requests.create')}>
                        <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                            <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
                                <div className="p-4 bg-green-100 rounded-full">
                                    <Plus className="w-8 h-8 text-green-600" />
                                </div>
                                <div className="text-center">
                                    <h3 className="font-semibold">แจ้งซ่อมใหม่</h3>
                                    <p className="text-sm text-muted-foreground">สร้างใบแจ้งซ่อมใหม่</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href={route('technician.work-orders.index')}>
                        <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                            <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
                                <div className="p-4 bg-orange-100 rounded-full">
                                    <Briefcase className="w-8 h-8 text-orange-600" />
                                </div>
                                <div className="text-center">
                                    <h3 className="font-semibold">ใบงานช่าง</h3>
                                    <p className="text-sm text-muted-foreground">สำหรับเจ้าหน้าที่ช่าง</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href={route('maintenance.settings.index')}>
                        <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                            <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
                                <div className="p-4 bg-gray-100 rounded-full">
                                    <Settings className="w-8 h-8 text-gray-600" />
                                </div>
                                <div className="text-center">
                                    <h3 className="font-semibold">ตั้งค่าระบบ</h3>
                                    <p className="text-sm text-muted-foreground">จัดการข้อมูลพื้นฐาน</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>สถิติการแจ้งซ่อมรายเดือน</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyStats}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="count" name="จำนวนแจ้งซ่อม" fill="#8884d8" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>สถิติแยกตามระบบ/หมวดหมู่</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryStats}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="count"
                                        >
                                            {categoryStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>รายการล่าสุด</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentRequests.length === 0 ? (
                                <p className="text-muted-foreground">ไม่มีรายการล่าสุด</p>
                            ) : (
                                recentRequests.map((request) => (
                                    <div key={request.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-medium">{request.title}</p>
                                            <p className="text-sm text-muted-foreground">{request.ticket_number} • {request.location}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                                ${request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                                  request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                                                  request.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {request.status === 'pending' ? 'รอดำเนินการ' : 
                                                 request.status === 'in_progress' ? 'กำลังดำเนินการ' : 
                                                 request.status === 'completed' ? 'เสร็จสิ้น' : request.status}
                                            </span>
                                            <Link href={route('maintenance.requests.show', request.id)}>
                                                <Button variant="ghost" size="sm">ดูรายละเอียด</Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
