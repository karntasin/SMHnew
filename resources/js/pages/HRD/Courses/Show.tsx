import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PlayCircle, FileText, CheckCircle, Lock, Clock, Calendar, BookOpen, GraduationCap, ArrowRight, Star, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Lesson {
    id: number;
    title: string;
    type: 'video' | 'document' | 'text' | 'quiz';
    duration_minutes: number;
    progress: any[]; // User progress
}

interface Module {
    id: number;
    title: string;
    lessons: Lesson[];
}

interface Course {
    id: number;
    title: string;
    description: string;
    cover_image: string;
    modules: Module[];
    start_date: string;
    end_date: string;
    hours: number;
}

interface Props {
    course: Course;
    isEnrolled: boolean;
    canEdit: boolean;
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

export default function CourseShow({ course, isEnrolled, canEdit }: Props) {
    
    const handleEnroll = () => {
        router.post(route('km.learn.courses.enroll', course.id));
    };

    const calculateProgress = () => {
        let totalLessons = 0;
        let completedLessons = 0;
        
        course.modules.forEach(module => {
            module.lessons.forEach(lesson => {
                totalLessons++;
                if (lesson.progress && lesson.progress.length > 0 && lesson.progress[0].status === 'completed') {
                    completedLessons++;
                }
            });
        });

        return totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    };

    const progress = calculateProgress();

    return (
        <AppLayout breadcrumbs={[...breadcrumbs, { title: course.title, href: '#' }]}>
            <Head title={course.title} />

            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-white dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-background p-6">
                <div className="max-w-7xl mx-auto space-y-8">
                    
                    {/* Hero Section */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl">
                        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-96 w-96 rounded-full bg-white/10 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-96 w-96 rounded-full bg-teal-900/20 blur-3xl"></div>
                        
                        <div className="relative z-10 p-8 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                            <div className="md:col-span-2 space-y-6">
                                <div className="flex items-center gap-2 text-emerald-100">
                                    <Badge variant="outline" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                                        Course
                                    </Badge>
                                    <span className="flex items-center gap-1 text-sm">
                                        <Clock className="h-4 w-4" /> {course.hours} ชั่วโมง
                                    </span>
                                    {canEdit && (
                                        <div className="flex gap-2 ml-2">
                                            <Link href={route('km.learn.courses.builder', course.id)}>
                                                <Badge className="bg-yellow-500/80 hover:bg-yellow-500 cursor-pointer text-white border-none">
                                                    แก้ไขหลักสูตร
                                                </Badge>
                                            </Link>
                                            <Badge 
                                                className="bg-red-500/80 hover:bg-red-500 cursor-pointer text-white border-none flex items-center gap-1"
                                                onClick={() => {
                                                    if(confirm('Are you sure you want to delete this course?')) {
                                                        router.delete(route('km.learn.courses.destroy', course.id));
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-3 w-3" /> ลบหลักสูตร
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                                
                                <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                                    {course.title}
                                </h1>
                                
                                <p className="text-lg text-emerald-50 max-w-2xl leading-relaxed">
                                    {course.description}
                                </p>

                                <div className="flex flex-wrap gap-4 pt-4">
                                    {isEnrolled ? (
                                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 w-full max-w-md">
                                            <div className="flex justify-between text-sm mb-2 font-medium">
                                                <span>ความคืบหน้าของคุณ</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <Progress value={progress} className="h-3 bg-white/20" indicatorClassName="bg-emerald-300" />
                                        </div>
                                    ) : (
                                        <Button 
                                            size="lg" 
                                            onClick={handleEnroll}
                                            className="bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-bold text-lg px-8 shadow-lg transition-all hover:scale-105"
                                        >
                                            ลงทะเบียนเรียน <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="hidden md:flex justify-center">
                                <div className="bg-white/20 backdrop-blur-md p-6 rounded-2xl border border-white/30 shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-500">
                                    <BookOpen className="h-32 w-32 text-white drop-shadow-lg" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content - Modules */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    <GraduationCap className="h-6 w-6 text-emerald-600" />
                                    เนื้อหาหลักสูตร
                                </h2>
                                <span className="text-sm text-muted-foreground">
                                    {course.modules.length} บทเรียน
                                </span>
                            </div>

                            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
                                <CardContent className="p-0">
                                    <Accordion type="single" collapsible className="w-full">
                                        {course.modules.map((module, index) => (
                                            <AccordionItem key={module.id} value={`item-${index}`} className="border-b last:border-0 px-6">
                                                <AccordionTrigger className="hover:no-underline py-6 group">
                                                    <div className="flex items-center gap-4 text-left">
                                                        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                                            {index + 1}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-lg group-hover:text-emerald-700 transition-colors">{module.title}</div>
                                                            <div className="text-sm text-muted-foreground font-normal">
                                                                {module.lessons.length} บทเรียน
                                                            </div>
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="pb-6 pt-2">
                                                    <div className="space-y-3 pl-14">
                                                        {module.lessons.map((lesson) => {
                                                            const isCompleted = lesson.progress && lesson.progress.length > 0 && lesson.progress[0].status === 'completed';
                                                            const isLocked = !isEnrolled; // Simple logic, can be more complex

                                                            return (
                                                                <div 
                                                                    key={lesson.id} 
                                                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                                                        isCompleted 
                                                                            ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' 
                                                                            : 'bg-gray-50 border-gray-100 hover:bg-white hover:shadow-md dark:bg-gray-800/50 dark:border-gray-700'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        {lesson.type === 'video' && <PlayCircle className={`h-5 w-5 ${isCompleted ? 'text-emerald-500' : 'text-blue-500'}`} />}
                                                                        {(lesson.type === 'text' || lesson.type === 'document') && <FileText className={`h-5 w-5 ${isCompleted ? 'text-emerald-500' : 'text-sky-500'}`} />}
                                                                        {lesson.type === 'file' && <FileText className={`h-5 w-5 ${isCompleted ? 'text-emerald-500' : 'text-orange-500'}`} />}
                                                                        {lesson.type === 'quiz' && <CheckCircle className={`h-5 w-5 ${isCompleted ? 'text-emerald-500' : 'text-purple-500'}`} />}
                                                                        
                                                                        <span className={`font-medium ${isCompleted ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
                                                                            {lesson.title}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                            <Clock className="h-3 w-3" /> {lesson.duration_minutes}m
                                                                        </span>
                                                                        
                                                                        {isLocked ? (
                                                                            <Lock className="h-4 w-4 text-gray-400" />
                                                                        ) : (
                                                                            isCompleted ? (
                                                                                <div className="flex items-center gap-2">
                                                                                    <Badge className="bg-emerald-500 hover:bg-emerald-600">สำเร็จ</Badge>
                                                                                    <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-emerald-600" asChild>
                                                                                        <Link href={route('km.learn.courses.learn', [course.id, lesson.id])}>
                                                                                            เรียนซ้ำ
                                                                                        </Link>
                                                                                    </Button>
                                                                                </div>
                                                                            ) : (
                                                                                <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                                                                                    <Link href={route('km.learn.courses.learn', [course.id, lesson.id])}>
                                                                                        เริ่มเรียน
                                                                                    </Link>
                                                                                </Button>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar Info */}
                        <div className="space-y-6">
                            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 sticky top-6">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Star className="h-5 w-5 text-yellow-500" />
                                        ข้อมูลหลักสูตร
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">วันที่เริ่มเรียน</div>
                                            <div className="font-medium text-sm">{course.start_date}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                            <Clock className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">ระยะเวลาเรียน</div>
                                            <div className="font-medium text-sm">{course.end_date}</div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <h4 className="font-medium mb-2 text-sm">สิ่งที่ได้รับ</h4>
                                        <ul className="space-y-2 text-sm text-muted-foreground">
                                            <li className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-emerald-500" /> เข้าถึงบทเรียนตลอดชีพ
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-emerald-500" /> ใบประกาศนียบัตร
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-emerald-500" /> แบบทดสอบวัดผล
                                            </li>
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
