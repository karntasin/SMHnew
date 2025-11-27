import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, GripVertical, Save, Video, FileText, HelpCircle, Settings, BookOpen } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QuizBuilder from './QuizBuilder';

interface Lesson {
    id?: number;
    title: string;
    type: 'video' | 'text' | 'quiz';
    content?: string;
    video_url?: string;
    quiz?: any;
}

interface Module {
    id?: number;
    title: string;
    lessons: Lesson[];
}

interface Props {
    course: any;
}

const breadcrumbs = [
    { title: 'KM', href: '/km/dashboard' },
    { title: 'ระบบการเรียนรู้ (E-Learning)', href: '/km/learn/dashboard' },
    { title: 'จัดการเนื้อหาหลักสูตร', href: '#' },
];

export default function CourseBuilder({ course, errors }: Props & { errors: any }) {
    const [modules, setModules] = useState<Module[]>(course.modules || []);
    const [isDirty, setIsDirty] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Form for Course Info
    const { data: infoData, setData: setInfoData, put: putInfo, processing: infoProcessing, errors: infoErrors } = useForm({
        title: course.title || '',
        description: course.description || '',
        type: course.type || 'internal',
        start_date: course.start_date ? course.start_date.split('T')[0] : '',
        end_date: course.end_date ? course.end_date.split('T')[0] : '',
        hours: course.hours || 0,
        location: course.location || '',
    });

    const handleInfoSave = (e: React.FormEvent) => {
        e.preventDefault();
        putInfo(route('km.learn.courses.update', course.id), {
            onSuccess: () => {
                // Optional: Show success message
            }
        });
    };

    const addModule = () => {
        setModules([...modules, { title: 'บทเรียนใหม่', lessons: [] }]);
        setIsDirty(true);
    };

    const updateModule = (index: number, field: string, value: any) => {
        const newModules = [...modules];
        newModules[index] = { ...newModules[index], [field]: value };
        setModules(newModules);
        setIsDirty(true);
    };

    const removeModule = (index: number) => {
        if (confirm('คุณแน่ใจหรือไม่?')) {
            const newModules = [...modules];
            newModules.splice(index, 1);
            setModules(newModules);
            setIsDirty(true);
        }
    };

    const addLesson = (moduleIndex: number) => {
        const newModules = [...modules];
        newModules[moduleIndex].lessons.push({
            title: 'หัวข้อใหม่',
            type: 'text',
            content: ''
        });
        setModules(newModules);
        setIsDirty(true);
    };

    const updateLesson = (moduleIndex: number, lessonIndex: number, field: string, value: any) => {
        const newModules = [...modules];
        newModules[moduleIndex].lessons[lessonIndex] = { 
            ...newModules[moduleIndex].lessons[lessonIndex], 
            [field]: value 
        };
        setModules(newModules);
        setIsDirty(true);
    };

    const removeLesson = (moduleIndex: number, lessonIndex: number) => {
        const newModules = [...modules];
        newModules[moduleIndex].lessons.splice(lessonIndex, 1);
        setModules(newModules);
        setIsDirty(true);
    };

    const handleSave = () => {
        setProcessing(true);
        router.put(route('km.learn.courses.builder.update', course.id), {
            modules: modules
        }, {
            onSuccess: () => setIsDirty(false),
            onFinish: () => setProcessing(false)
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Builder: ${course.title}`} />

            <div className="container mx-auto p-6 space-y-6">
                {Object.keys(errors).length > 0 && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline"> Please check the form for errors.</span>
                        <ul className="list-disc list-inside mt-2">
                            {Object.values(errors).map((error: any, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">จัดการหลักสูตร: {course.title}</h1>
                        <p className="text-muted-foreground">แก้ไขข้อมูลหลักสูตรและเนื้อหาบทเรียน</p>
                    </div>
                </div>

                <Tabs defaultValue="content" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                        <TabsTrigger value="content" className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" /> เนื้อหาบทเรียน
                        </TabsTrigger>
                        <TabsTrigger value="info" className="flex items-center gap-2">
                            <Settings className="h-4 w-4" /> ข้อมูลหลักสูตร
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="content" className="space-y-6 mt-6">
                        <div className="flex justify-end">
                            <Button onClick={handleSave} disabled={!isDirty || processing}>
                                {processing ? (
                                    <>
                                        <span className="animate-spin mr-2">⏳</span> Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" /> บันทึกเนื้อหา
                                    </>
                                )}
                            </Button>
                        </div>

                        {modules.map((module, mIndex) => (
                            <Card key={mIndex} className="border-l-4 border-l-primary">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-4">
                                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                                        <div className="flex-1">
                                            <Label>ชื่อบทเรียน</Label>
                                            <Input 
                                                value={module.title} 
                                                onChange={(e) => updateModule(mIndex, 'title', e.target.value)}
                                                className="font-bold text-lg"
                                            />
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => removeModule(mIndex)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 pl-12">
                                    {module.lessons.map((lesson, lIndex) => (
                                        <div key={lIndex} className="flex flex-col gap-2 p-4 border rounded-md bg-muted/30">
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="md:col-span-2">
                                                        <Label>ชื่อหัวข้อ</Label>
                                                        <Input 
                                                            value={lesson.title} 
                                                            onChange={(e) => updateLesson(mIndex, lIndex, 'title', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>ประเภท</Label>
                                                        <Select 
                                                            value={lesson.type} 
                                                            onValueChange={(val) => updateLesson(mIndex, lIndex, 'type', val)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="video"><div className="flex items-center"><Video className="mr-2 h-4 w-4"/> วิดีโอ</div></SelectItem>
                                                                <SelectItem value="text"><div className="flex items-center"><FileText className="mr-2 h-4 w-4"/> เอกสาร</div></SelectItem>
                                                                <SelectItem value="quiz"><div className="flex items-center"><HelpCircle className="mr-2 h-4 w-4"/> แบบทดสอบ</div></SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => removeLesson(mIndex, lIndex)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>

                                            {/* Content Editors based on type */}
                                            {lesson.type === 'video' && (
                                                <div>
                                                    <Label>ลิงก์วิดีโอ (YouTube)</Label>
                                                    <Input 
                                                        value={lesson.video_url || ''} 
                                                        onChange={(e) => updateLesson(mIndex, lIndex, 'video_url', e.target.value)}
                                                        placeholder="https://youtube.com/watch?v=..."
                                                    />
                                                </div>
                                            )}
                                            {lesson.type === 'text' && (
                                                <div>
                                                    <Label>เนื้อหา (HTML/ข้อความ)</Label>
                                                    <Textarea 
                                                        value={lesson.content || ''} 
                                                        onChange={(e) => updateLesson(mIndex, lIndex, 'content', e.target.value)}
                                                        rows={3}
                                                    />
                                                </div>
                                            )}
                                            {lesson.type === 'quiz' && (
                                                <QuizBuilder 
                                                    quiz={lesson.quiz || { title: lesson.title, questions: [] }} 
                                                    onChange={(newQuiz) => updateLesson(mIndex, lIndex, 'quiz', newQuiz)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={() => addLesson(mIndex)} className="w-full border-dashed">
                                        <Plus className="mr-2 h-4 w-4" /> เพิ่มหัวข้อ
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}

                        <Button onClick={addModule} className="w-full py-8 border-dashed" variant="outline">
                            <Plus className="mr-2 h-6 w-6" /> เพิ่มบทเรียน
                        </Button>
                    </TabsContent>

                    <TabsContent value="info" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>แก้ไขข้อมูลหลักสูตร</CardTitle>
                                <CardDescription>ปรับปรุงรายละเอียดของหลักสูตร</CardDescription>
                            </CardHeader>
                            <form onSubmit={handleInfoSave}>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">ชื่อหลักสูตร</Label>
                                        <Input 
                                            id="title" 
                                            value={infoData.title} 
                                            onChange={e => setInfoData('title', e.target.value)}
                                            required 
                                        />
                                        {infoErrors.title && <p className="text-sm text-destructive">{infoErrors.title}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">รายละเอียด</Label>
                                        <Textarea 
                                            id="description" 
                                            value={infoData.description} 
                                            onChange={e => setInfoData('description', e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="type">ประเภทหลักสูตร</Label>
                                            <Select value={infoData.type} onValueChange={val => setInfoData('type', val)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="internal">อบรมภายใน (Internal)</SelectItem>
                                                    <SelectItem value="external">อบรมภายนอก (External)</SelectItem>
                                                    <SelectItem value="online">หลักสูตรออนไลน์ (Online)</SelectItem>
                                                    <SelectItem value="ojt">การสอนงาน (OJT)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="hours">จำนวนชั่วโมง</Label>
                                            <Input 
                                                id="hours" 
                                                type="number" 
                                                step="0.5"
                                                value={infoData.hours} 
                                                onChange={e => setInfoData('hours', parseFloat(e.target.value))}
                                                required 
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="start_date">วันที่เริ่ม</Label>
                                            <Input 
                                                id="start_date" 
                                                type="date"
                                                value={infoData.start_date} 
                                                onChange={e => setInfoData('start_date', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="end_date">วันที่สิ้นสุด</Label>
                                            <Input 
                                                id="end_date" 
                                                type="date"
                                                value={infoData.end_date} 
                                                onChange={e => setInfoData('end_date', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="location">สถานที่</Label>
                                        <Input 
                                            id="location" 
                                            value={infoData.location} 
                                            onChange={e => setInfoData('location', e.target.value)}
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" disabled={infoProcessing}>
                                        {infoProcessing ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
