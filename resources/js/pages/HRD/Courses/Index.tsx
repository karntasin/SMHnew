import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Clock, MapPin, Edit, Trash2, Plus } from 'lucide-react';

interface Course {
    id: number;
    title: string;
    description: string;
    type: string;
    course_type?: string;
    status?: string;
    start_date: string | null;
    end_date: string | null;
    hours: number;
    location: string | null;
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
    canEdit: boolean;
}

const breadcrumbs = [
    { title: 'KM', href: '/km/dashboard' },
    { title: 'ระบบการเรียนรู้ (E-Learning)', href: '/km/learn/dashboard' },
    { title: 'หลักสูตร', href: '/km/learn/courses' },
];

const TYPE_LABEL: Record<string, string> = {
    internal: 'ภายใน',
    external: 'ภายนอก',
    online: 'ออนไลน์',
    ojt: 'OJT',
    conference: 'ประชุม',
};

const STATUS_LABEL: Record<string, string> = {
    draft: 'ร่าง',
    published: 'เผยแพร่',
    archived: 'เก็บถาวร',
};

const formatDate = (value?: string | null) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('th-TH');
};

export default function CoursesIndex({ courses, filters, canEdit }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('km.learn.index'), { search }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="หลักสูตรฝึกอบรม" />

            <div className="flex flex-col gap-8 p-6 md:p-8">
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-8">
                    <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold tracking-tight text-emerald-900">หลักสูตรฝึกอบรม</h1>
                            <p className="text-lg text-emerald-700">ค้นหาและลงทะเบียนหลักสูตรเพื่อพัฒนาทักษะของคุณ</p>
                        </div>
                        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                            {canEdit && (
                                <Link href={route('km.learn.courses.create')}>
                                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 md:w-auto">
                                        <Plus className="mr-2 h-4 w-4" /> สร้างหลักสูตรใหม่
                                    </Button>
                                </Link>
                            )}
                            <form
                                onSubmit={handleSearch}
                                className="flex w-full items-center gap-2 rounded-xl border border-emerald-100 bg-white p-2 shadow-sm md:w-auto"
                            >
                                <div className="relative w-full md:w-72">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <Input
                                        placeholder="ค้นหาหลักสูตร..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="border-0 bg-transparent pl-10 focus-visible:ring-0"
                                    />
                                </div>
                                <Button type="submit" className="rounded-lg bg-emerald-600 px-6 text-white hover:bg-emerald-700">
                                    ค้นหา
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {courses.data.length > 0 ? (
                        courses.data.map((course) => {
                            const typeKey = course.type || course.course_type || 'online';
                            const start = formatDate(course.start_date);
                            const end = formatDate(course.end_date);

                            return (
                                <Card
                                    key={course.id}
                                    className="group flex flex-col overflow-hidden border-0 shadow-md transition-all duration-300 hover:shadow-xl"
                                >
                                    <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
                                    <CardHeader className="pb-4">
                                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                                            <div className="flex flex-wrap gap-1.5">
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                    {TYPE_LABEL[typeKey] || typeKey}
                                                </Badge>
                                                {canEdit && course.status && (
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            course.status === 'published'
                                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                : course.status === 'draft'
                                                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                                  : 'border-slate-200 bg-slate-50 text-slate-600'
                                                        }
                                                    >
                                                        {STATUS_LABEL[course.status] || course.status}
                                                    </Badge>
                                                )}
                                            </div>
                                            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                                <Clock className="mr-1 h-3 w-3" /> {course.hours} ชม.
                                            </Badge>
                                        </div>
                                        <CardTitle className="line-clamp-2 text-xl font-bold transition-colors group-hover:text-emerald-700">
                                            {course.title}
                                        </CardTitle>
                                        <CardDescription className="mt-2 line-clamp-2 text-gray-500">
                                            {course.description || 'ไม่มีรายละเอียด'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 space-y-3 pt-0 text-sm">
                                        {(start || end) && (
                                            <div className="flex items-center rounded-lg bg-gray-50 p-2 text-gray-600">
                                                <Calendar className="mr-2 h-4 w-4 text-emerald-500" />
                                                <span>
                                                    {start || '-'} – {end || '-'}
                                                </span>
                                            </div>
                                        )}
                                        {course.location && (
                                            <div className="flex items-center px-2 text-gray-600">
                                                <MapPin className="mr-2 h-4 w-4 text-emerald-500" />
                                                <span className="line-clamp-1">{course.location}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="flex gap-2 border-t bg-gray-50/50 pt-4">
                                        <Link href={route('km.learn.courses.show', course.id)} className="flex-1">
                                            <Button className="w-full border border-emerald-200 bg-white font-medium text-emerald-600 shadow-sm transition-all hover:bg-emerald-600 hover:text-white hover:shadow-md">
                                                ดูรายละเอียด
                                            </Button>
                                        </Link>
                                        {canEdit && (
                                            <>
                                                <Link href={route('km.learn.courses.builder', course.id)}>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="border-yellow-200 text-yellow-600 hover:bg-yellow-50"
                                                        title="แก้ไขเนื้อหา"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="border-red-200 text-red-600 hover:bg-red-50"
                                                    onClick={() => {
                                                        if (confirm('ลบหลักสูตรนี้หรือไม่?')) {
                                                            router.delete(route('km.learn.courses.destroy', course.id));
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </CardFooter>
                                </Card>
                            );
                        })
                    ) : (
                        <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-16 text-center">
                            <div className="mb-4 rounded-full bg-white p-4 shadow-sm">
                                <Search className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">ไม่พบหลักสูตร</h3>
                            <p className="mb-4 text-muted-foreground">ลองเปลี่ยนคำค้นหา หรือสร้างหลักสูตรใหม่</p>
                            {canEdit && (
                                <Link href={route('km.learn.courses.create')}>
                                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                                        <Plus className="mr-2 h-4 w-4" /> สร้างหลักสูตรใหม่
                                    </Button>
                                </Link>
                            )}
                        </div>
                    )}
                </div>

                {courses.last_page > 1 && (
                    <div className="mt-8 flex justify-center space-x-2">
                        {courses.links.map((link, i) => (
                            <Button
                                key={i}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                className={
                                    link.active
                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                        : 'hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600'
                                }
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
