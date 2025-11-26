import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, GripVertical, Save, Video, FileText, HelpCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export default function CourseBuilder({ course }: Props) {
    const [modules, setModules] = useState<Module[]>(course.modules || []);
    const [isDirty, setIsDirty] = useState(false);

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
        router.put(route('km.learn.courses.builder.update', course.id), {
            modules: modules
        }, {
            onSuccess: () => setIsDirty(false)
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Builder: ${course.title}`} />

            <div className="container mx-auto p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">เครื่องมือสร้างหลักสูตร: {course.title}</h1>
                        <p className="text-muted-foreground">จัดการบทเรียนและเนื้อหา</p>
                    </div>
                    <Button onClick={handleSave} disabled={!isDirty}>
                        <Save className="mr-2 h-4 w-4" /> บันทึกการเปลี่ยนแปลง
                    </Button>
                </div>

                <div className="space-y-6">
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
                </div>
            </div>
        </AppLayout>
    );
}
