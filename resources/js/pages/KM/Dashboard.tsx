import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, FileText, GraduationCap, Search, Upload, TrendingUp, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Asset {
    id: number;
    title: string;
    file_type: string;
    views: number;
    created_at: string;
    uploader: { name: string };
}

interface Course {
    id: number;
    title: string;
    cover_image: string;
}

interface Props {
    recentAssets: Asset[];
    popularAssets: Asset[];
    featuredCourses: Course[];
}

const breadcrumbs = [
    { title: 'Knowledge Management', href: '/km/dashboard' },
];

export default function KmDashboard({ recentAssets, popularAssets, featuredCourses }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="KM Dashboard" />

            <div className="container mx-auto p-6 space-y-8">
                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 md:p-12 text-white shadow-xl">
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-6 max-w-2xl">
                            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Knowledge Management</h1>
                            <p className="text-blue-100 text-lg md:text-xl leading-relaxed">
                                ศูนย์รวมองค์ความรู้และระบบการเรียนรู้ออนไลน์ เพื่อพัฒนาศักยภาพบุคลากรอย่างต่อเนื่อง
                                ยกระดับทักษะของคุณได้ทุกที่ ทุกเวลา
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-blue-50 border-0 font-semibold shadow-lg hover:shadow-xl transition-all">
                                    <Link href={route('km.assets.index')}>
                                        <FileText className="mr-2 h-5 w-5" /> คลังความรู้
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" size="lg" className="bg-blue-700/50 text-white border-blue-400 hover:bg-blue-700 hover:text-white backdrop-blur-sm">
                                    <Link href={route('km.learn.index')}>
                                        <GraduationCap className="mr-2 h-5 w-5" /> E-Learning
                                    </Link>
                                </Button>
                            </div>
                        </div>
                        <div className="hidden md:block relative">
                            <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-30 rounded-full"></div>
                            <BookOpen className="h-48 w-48 text-white/90 relative z-10 drop-shadow-2xl" />
                        </div>
                    </div>
                    
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-indigo-500/30 rounded-full blur-3xl"></div>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-3xl mx-auto -mt-8 z-20 px-4">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-white rounded-lg shadow-lg flex items-center">
                            <Search className="ml-4 h-6 w-6 text-gray-400" />
                            <Input 
                                placeholder="ค้นหาเอกสาร, หลักสูตร, หรือองค์ความรู้..." 
                                className="border-0 h-14 text-lg shadow-none focus-visible:ring-0 rounded-lg"
                            />
                            <Button className="m-2 bg-indigo-600 hover:bg-indigo-700">ค้นหา</Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    {/* Recent Documents */}
                    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-blue-800">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Clock className="h-5 w-5 text-blue-600" />
                                    </div>
                                    เอกสารมาใหม่
                                </CardTitle>
                                <Link href={route('km.assets.index')} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">ดูทั้งหมด</Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-gray-100">
                                {recentAssets.map(asset => (
                                    <div key={asset.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-white border-2 border-gray-100 rounded-xl flex items-center justify-center font-bold text-sm uppercase text-gray-600 shadow-sm group-hover:border-blue-200 group-hover:text-blue-600 transition-colors">
                                                {asset.file_type}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-800 group-hover:text-blue-700 transition-colors line-clamp-1">{asset.title}</h4>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <span>โดย {asset.uploader.name}</span>
                                                    <span>•</span>
                                                    <span>{new Date(asset.created_at).toLocaleDateString('th-TH')}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-gray-400 group-hover:text-blue-600" asChild>
                                            <Link href={route('km.assets.show', asset.id)}>เปิดดู</Link>
                                        </Button>
                                    </div>
                                ))}
                                {recentAssets.length === 0 && <div className="p-8 text-center text-muted-foreground">ยังไม่มีเอกสารใหม่</div>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Popular Documents */}
                    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-orange-800">
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                        <TrendingUp className="h-5 w-5 text-orange-600" />
                                    </div>
                                    เอกสารยอดนิยม
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-gray-100">
                                {popularAssets.map((asset, index) => (
                                    <div key={asset.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${index < 3 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {index + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-800 group-hover:text-orange-700 transition-colors line-clamp-1">{asset.title}</h4>
                                                <p className="text-xs text-muted-foreground">{asset.views} การเข้าชม</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-gray-400 group-hover:text-orange-600" asChild>
                                            <Link href={route('km.assets.show', asset.id)}>เปิดดู</Link>
                                        </Button>
                                    </div>
                                ))}
                                {popularAssets.length === 0 && <div className="p-8 text-center text-muted-foreground">ไม่มีข้อมูล</div>}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* E-Learning Highlight */}
                <div className="space-y-6 pt-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <GraduationCap className="h-6 w-6 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">หลักสูตรแนะนำ</h2>
                        </div>
                        <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" asChild>
                            <Link href={route('km.learn.index')}>ดูหลักสูตรทั้งหมด</Link>
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {featuredCourses.map(course => (
                            <Link key={course.id} href={route('km.learn.courses.show', course.id)} className="group">
                                <Card className="h-full border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
                                    <div className="h-48 bg-gray-100 relative overflow-hidden">
                                        {course.cover_image ? (
                                            <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 text-green-300">
                                                <GraduationCap className="h-16 w-16" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                                    </div>
                                    <CardContent className="p-6 flex-1 flex flex-col">
                                        <h3 className="font-bold text-lg mb-3 line-clamp-2 group-hover:text-green-700 transition-colors">{course.title}</h3>
                                        <div className="mt-auto pt-4 flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">เรียนรู้ออนไลน์</span>
                                            <span className="text-green-600 font-medium group-hover:translate-x-1 transition-transform flex items-center">
                                                เริ่มเรียน <span className="ml-1">&rarr;</span>
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                        {featuredCourses.length === 0 && (
                            <div className="col-span-3 text-center py-16 bg-green-50/50 rounded-2xl border-2 border-dashed border-green-100">
                                <GraduationCap className="h-12 w-12 text-green-200 mx-auto mb-4" />
                                <p className="text-muted-foreground text-lg">ยังไม่มีหลักสูตรแนะนำในขณะนี้</p>
                                <Button className="mt-6 bg-green-600 hover:bg-green-700" asChild>
                                    <Link href={route('km.learn.index')}>ไปที่ระบบ E-Learning</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
