import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

interface Lesson {
    id: number;
    title: string;
    type: 'video' | 'document' | 'text' | 'quiz';
    content: string;
    video_url: string;
    file_path: string;
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

export default function CourseLearn({ course, lesson, prevLesson, nextLesson }: Props) {
    
    const handleComplete = () => {
        router.post(route('km.learn.courses.complete-lesson', [course.id, lesson.id]), {}, {
            onSuccess: () => {
                if (nextLesson) {
                    router.visit(route('km.learn.courses.learn', [course.id, nextLesson.id]));
                } else {
                    router.visit(route('km.learn.courses.show', course.id));
                }
            }
        });
    };

    const isCompleted = lesson.progress && lesson.progress.length > 0 && lesson.progress[0].status === 'completed';

    return (
        <AppLayout breadcrumbs={[...breadcrumbs, { title: course.title, href: route('km.learn.courses.show', course.id) }, { title: lesson.title, href: '#' }]}>
            <Head title={`${lesson.title} - ${course.title}`} />

            <div className="container mx-auto p-6 h-[calc(100vh-4rem)] flex flex-col">
                <div className="flex items-center justify-between mb-4">
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

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3 space-y-6">
                        <Card className="h-full flex flex-col">
                            <CardContent className="p-0 flex-1 bg-black flex items-center justify-center overflow-hidden rounded-t-lg">
                                {lesson.type === 'video' && lesson.video_url ? (
                                    <div className="w-full h-full aspect-video">
                                        <iframe 
                                            width="100%" 
                                            height="100%" 
                                            src={lesson.video_url.replace('watch?v=', 'embed/')} 
                                            title={lesson.title}
                                            frameBorder="0" 
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                ) : (
                                    <div className="p-10 text-white">
                                        {lesson.type === 'quiz' ? (
                                            <div className="text-center">
                                                <h2 className="text-xl mb-4">แบบทดสอบ</h2>
                                                <Button asChild variant="secondary">
                                                    <Link href={route('km.learn.courses.quiz', [course.id, lesson.quiz?.id])}>
                                                        ทำแบบทดสอบ
                                                    </Link>
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="prose dark:prose-invert max-w-none p-6 bg-background text-foreground h-full overflow-auto">
                                                <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                            <div className="p-6 border-t flex justify-between items-center bg-card">
                                <div>
                                    {isCompleted && <span className="text-green-500 flex items-center gap-2"><CheckCircle className="h-4 w-4" /> เรียนจบแล้ว</span>}
                                </div>
                                <Button onClick={handleComplete} disabled={isCompleted && !nextLesson}>
                                    {isCompleted ? (nextLesson ? 'บทเรียนถัดไป' : 'กลับสู่หน้าหลักสูตร') : 'ทำเครื่องหมายว่าเรียนจบ'}
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
                                    {lesson.description || "ไม่มีรายละเอียดเพิ่มเติม"}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
