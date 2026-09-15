import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle, FileText, Download, ExternalLink } from 'lucide-react';
import { resolveAppUrl } from '@/lib/asset';

interface Lesson {
    id: number;
    title: string;
    type: 'video' | 'document' | 'text' | 'file' | 'quiz';
    content: string;
    video_url: string;
    file_path: string;
    description?: string;
    quiz?: any;
    progress: any[];
}

interface Course {
    id: number;
    title: string;
}

interface Props {
    course: Course;
    lesson: Lesson;
    prevLesson: Lesson | null;
    nextLesson: Lesson | null;
}

const breadcrumbs = [
    { title: 'KM', href: '/km/dashboard' },
    { title: 'ระบบการเรียนรู้ (E-Learning)', href: '/km/learn/dashboard' },
    { title: 'หลักสูตร', href: '/km/learn/courses' },
];

const storageUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return resolveAppUrl(`/storage/${path.replace(/^\//, '')}`);
};

const isPdf = (path?: string | null) => !!path && /\.pdf$/i.test(path);
const isImage = (path?: string | null) => !!path && /\.(png|jpe?g|gif|webp)$/i.test(path);

export default function CourseLearn({ course, lesson, prevLesson, nextLesson }: Props) {
    const handleComplete = () => {
        router.post(route('km.learn.courses.complete-lesson', [course.id, lesson.id]), {}, {
            onSuccess: () => {
                if (nextLesson) {
                    router.visit(route('km.learn.courses.learn', [course.id, nextLesson.id]));
                } else {
                    router.visit(route('km.learn.courses.show', course.id));
                }
            },
        });
    };

    const isCompleted = lesson.progress && lesson.progress.length > 0 && lesson.progress[0].status === 'completed';
    const fileUrl = storageUrl(lesson.file_path);
    const fileName = lesson.file_path ? lesson.file_path.split('/').pop() : '';

    return (
        <AppLayout
            breadcrumbs={[
                ...breadcrumbs,
                { title: course.title, href: route('km.learn.courses.show', course.id) },
                { title: lesson.title, href: '#' },
            ]}
        >
            <Head title={`${lesson.title} - ${course.title}`} />

            <div className="container mx-auto flex h-[calc(100vh-4rem)] flex-col p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{lesson.title}</h1>
                    <div className="flex gap-2">
                        {prevLesson && (
                            <Button variant="outline" asChild>
                                <Link href={route('km.learn.courses.learn', [course.id, prevLesson.id])}>
                                    <ChevronLeft className="mr-2 h-4 w-4" /> ก่อนหน้า
                                </Link>
                            </Button>
                        )}
                        {nextLesson && (
                            <Button variant="outline" asChild>
                                <Link href={route('km.learn.courses.learn', [course.id, nextLesson.id])}>
                                    ถัดไป <ChevronRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-4">
                    <div className="space-y-6 lg:col-span-3">
                        <Card className="flex h-full flex-col">
                            <CardContent className="flex flex-1 items-stretch justify-center overflow-hidden rounded-t-lg p-0">
                                {lesson.type === 'video' && lesson.video_url ? (
                                    <div className="aspect-video h-full w-full bg-black">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src={lesson.video_url.replace('watch?v=', 'embed/')}
                                            title={lesson.title}
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                ) : lesson.type === 'quiz' ? (
                                    <div className="flex w-full items-center justify-center bg-slate-900 p-10 text-white">
                                        <div className="text-center">
                                            <h2 className="mb-4 text-xl">แบบทดสอบ</h2>
                                            <Button asChild variant="secondary">
                                                <Link href={route('km.learn.courses.quiz', [course.id, lesson.quiz?.id])}>
                                                    ทำแบบทดสอบ
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                ) : lesson.type === 'file' || lesson.type === 'document' ? (
                                    <div className="flex w-full flex-col bg-white">
                                        {lesson.content && (
                                            <div
                                                className="border-b px-6 py-4 text-sm text-slate-700 prose max-w-none"
                                                dangerouslySetInnerHTML={{ __html: lesson.content }}
                                            />
                                        )}
                                        {lesson.file_path ? (
                                            <>
                                                {isPdf(lesson.file_path) ? (
                                                    <iframe
                                                        src={fileUrl}
                                                        title={lesson.title}
                                                        className="min-h-[60vh] w-full flex-1"
                                                    />
                                                ) : isImage(lesson.file_path) ? (
                                                    <div className="flex min-h-[40vh] items-center justify-center bg-slate-50 p-6">
                                                        <img
                                                            src={fileUrl}
                                                            alt={lesson.title}
                                                            className="max-h-[70vh] max-w-full rounded-lg object-contain shadow"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-10 text-center">
                                                        <FileText className="h-14 w-14 text-orange-500" />
                                                        <div>
                                                            <div className="font-semibold text-slate-800">{fileName}</div>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                เปิดหรือดาวน์โหลดเอกสารเพื่อศึกษา
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                                                                <a href={fileUrl} target="_blank" rel="noreferrer">
                                                                    <ExternalLink className="mr-2 h-4 w-4" /> เปิดเอกสาร
                                                                </a>
                                                            </Button>
                                                            <Button asChild variant="outline">
                                                                <a href={fileUrl} download>
                                                                    <Download className="mr-2 h-4 w-4" /> ดาวน์โหลด
                                                                </a>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                                {(isPdf(lesson.file_path) || isImage(lesson.file_path)) && (
                                                    <div className="flex justify-end gap-2 border-t px-4 py-3">
                                                        <Button asChild variant="outline" size="sm">
                                                            <a href={fileUrl} target="_blank" rel="noreferrer">
                                                                <ExternalLink className="mr-1 h-3.5 w-3.5" /> เปิดแท็บใหม่
                                                            </a>
                                                        </Button>
                                                        <Button asChild variant="outline" size="sm">
                                                            <a href={fileUrl} download>
                                                                <Download className="mr-1 h-3.5 w-3.5" /> ดาวน์โหลด
                                                            </a>
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex min-h-[40vh] items-center justify-center p-10 text-slate-500">
                                                ยังไม่มีไฟล์แนบในหัวข้อนี้
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="prose max-w-none overflow-auto bg-background p-6 text-foreground h-full w-full">
                                        <div dangerouslySetInnerHTML={{ __html: lesson.content || '<p>ไม่มีเนื้อหา</p>' }} />
                                    </div>
                                )}
                            </CardContent>
                            <div className="flex items-center justify-between border-t bg-card p-6">
                                <div>
                                    {isCompleted && (
                                        <span className="flex items-center gap-2 text-green-500">
                                            <CheckCircle className="h-4 w-4" /> เรียนจบแล้ว
                                        </span>
                                    )}
                                </div>
                                <Button onClick={handleComplete} disabled={isCompleted && !nextLesson}>
                                    {isCompleted
                                        ? nextLesson
                                            ? 'บทเรียนถัดไป'
                                            : 'กลับสู่หน้าหลักสูตร'
                                        : 'ทำเครื่องหมายว่าเรียนจบ'}
                                </Button>
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle>เนื้อหาในบทเรียนนี้</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="prose text-sm">
                                    {lesson.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
