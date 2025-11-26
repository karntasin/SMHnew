import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Clock, MapPin } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination'; // Assuming you have a pagination component or I'll make a simple one

interface Course {
    id: number;
    title: string;
    description: string;
    course_type: string;
    start_date: string;
    end_date: string;
    hours: number;
    location: string;
    is_enrolled: boolean; // Assuming we might add this later, or handle enrollment check
}

interface Props {
    courses: {
        data: Course[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: {
        search?: string;
    };
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
    {
        title: 'หลักสูตร',
        href: '/km/learn/courses',
    },
];

export default function CoursesIndex({ courses, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('km.learn.index'), { search }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="หลักสูตรฝึกอบรม" />

            <div className="flex flex-col gap-8 p-6 md:p-8">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-8 rounded-2xl border border-emerald-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold tracking-tight text-emerald-900">หลักสูตรฝึกอบรม</h1>
                            <p className="text-emerald-700 text-lg">
                                ค้นหาและลงทะเบียนหลักสูตรฝึกอบรมเพื่อพัฒนาทักษะของคุณ
                            </p>
                        </div>
                        <form onSubmit={handleSearch} className="flex w-full md:w-auto items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-emerald-100">
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="ค้นหาหลักสูตร..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 border-0 focus-visible:ring-0 bg-transparent"
                                />
                            </div>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-6">
                                ค้นหา
                            </Button>
                        </form>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {courses.data.length > 0 ? (
                        courses.data.map((course) => (
                            <Card key={course.id} className="flex flex-col border-0 shadow-md hover:shadow-xl transition-all duration-300 group overflow-hidden">
                                <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <Badge variant="outline" className={`
                                            ${course.course_type === 'internal' 
                                                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                                : 'bg-purple-50 text-purple-700 border-purple-200'}
                                        `}>
                                            {course.course_type === 'internal' ? 'ภายใน' : 'ภายนอก'}
                                        </Badge>
                                        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                            <Clock className="w-3 h-3 mr-1" /> {course.hours} ชม.
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-xl font-bold line-clamp-2 group-hover:text-emerald-700 transition-colors">
                                        {course.title}
                                    </CardTitle>
                                    <CardDescription className="line-clamp-2 mt-2 text-gray-500">
                                        {course.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-3 text-sm pt-0">
                                    <div className="flex items-center text-gray-600 bg-gray-50 p-2 rounded-lg">
                                        <Calendar className="mr-2 h-4 w-4 text-emerald-500" />
                                        <span>
                                            {new Date(course.start_date).toLocaleDateString('th-TH')} - {new Date(course.end_date).toLocaleDateString('th-TH')}
                                        </span>
                                    </div>
                                    <div className="flex items-center text-gray-600 px-2">
                                        <MapPin className="mr-2 h-4 w-4 text-emerald-500" />
                                        <span className="line-clamp-1">{course.location}</span>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-4 border-t bg-gray-50/50">
                                    <Link href={route('km.learn.courses.show', course.id)} className="w-full">
                                        <Button className="w-full bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all shadow-sm hover:shadow-md font-medium">
                                            ดูรายละเอียด
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                                <Search className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">ไม่พบหลักสูตร</h3>
                            <p className="text-muted-foreground">ลองเปลี่ยนคำค้นหาหรือตัวกรองของคุณ</p>
                        </div>
                    )}
                </div>

                {/* Simple Pagination */}
                {courses.last_page > 1 && (
                    <div className="flex justify-center mt-8 space-x-2">
                        {courses.links.map((link, i) => (
                            <Button
                                key={i}
                                variant={link.active ? "default" : "outline"}
                                size="sm"
                                className={link.active ? "bg-emerald-600 hover:bg-emerald-700" : "hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"}
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url)}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
