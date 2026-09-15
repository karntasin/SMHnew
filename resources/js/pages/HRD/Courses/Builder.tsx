import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Plus, Trash2, Save, Video, FileText, HelpCircle, Settings, BookOpen,
    Eye, ChevronRight, Layers, FileUp, Type, Loader2, ExternalLink,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { resolveAppUrl } from '@/lib/asset';
import QuizBuilder from './QuizBuilder';

interface Lesson {
    id?: number;
    title: string;
    type: 'video' | 'text' | 'file' | 'quiz';
    content?: string;
    video_url?: string;
    file_path?: string | null;
    file_name?: string | null;
    quiz?: any;
}

interface Module {
    id?: number;
    title: string;
    lessons: Lesson[];
}

type Selection =
    | { kind: 'settings' }
    | { kind: 'module'; moduleIndex: number }
    | { kind: 'lesson'; moduleIndex: number; lessonIndex: number };

interface Props {
    course: any;
    errors?: Record<string, string>;
}

const breadcrumbs = [
    { title: 'KM', href: '/km/dashboard' },
    { title: 'ระบบการเรียนรู้ (E-Learning)', href: '/km/learn/dashboard' },
    { title: 'จัดการเนื้อหาหลักสูตร', href: '#' },
];

const LESSON_ICON: Record<string, typeof FileText> = {
    text: Type,
    file: FileUp,
    video: Video,
    quiz: HelpCircle,
};

const emptyQuiz = (title: string) => ({
    title: title || 'แบบทดสอบ',
    description: '',
    passing_score: 70,
    questions: [],
});

function initialSelection(modules: Module[]): Selection {
    if (modules.length === 0) return { kind: 'settings' };
    if (modules[0].lessons?.length) return { kind: 'lesson', moduleIndex: 0, lessonIndex: 0 };
    return { kind: 'module', moduleIndex: 0 };
}

export default function CourseBuilder({ course, errors = {} }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };
    const [modules, setModules] = useState<Module[]>(() =>
        (course.modules || []).map((m: any) => ({
            ...m,
            lessons: (m.lessons || []).map((l: any) => ({
                ...l,
                file_path: l.file_path || null,
                file_name: l.file_path ? String(l.file_path).split('/').pop() : null,
                quiz:
                    l.type === 'quiz'
                        ? {
                              title: l.quiz?.title || l.title,
                              description: l.quiz?.description || '',
                              passing_score: l.quiz?.passing_score ?? 70,
                              questions: l.quiz?.questions || [],
                              id: l.quiz?.id,
                          }
                        : l.quiz,
            })),
        })),
    );
    const [selection, setSelection] = useState<Selection>(() => initialSelection(modules));
    const [isDirty, setIsDirty] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [panel, setPanel] = useState<'content' | 'settings'>('content');

    const [infoDirty, setInfoDirty] = useState(false);
    const {
        data: infoData,
        setData: setInfoDataRaw,
        put: putInfo,
        processing: infoProcessing,
        errors: infoErrors,
    } = useForm({
        title: course.title || '',
        description: course.description || '',
        type: course.type || 'online',
        start_date: course.start_date ? String(course.start_date).split('T')[0] : '',
        end_date: course.end_date ? String(course.end_date).split('T')[0] : '',
        hours: course.hours || 0,
        location: course.location || '',
        status: course.status || 'draft',
    });

    const setInfoData = (key: any, value: any) => {
        setInfoDataRaw(key, value);
        setInfoDirty(true);
    };

    useEffect(() => {
        if (panel === 'settings') setSelection({ kind: 'settings' });
    }, [panel]);

    const markDirty = () => setIsDirty(true);

    const selectedLesson = useMemo(() => {
        if (selection.kind !== 'lesson') return null;
        return modules[selection.moduleIndex]?.lessons?.[selection.lessonIndex] ?? null;
    }, [modules, selection]);

    const selectedModule = useMemo(() => {
        if (selection.kind !== 'module') return null;
        return modules[selection.moduleIndex] ?? null;
    }, [modules, selection]);

    const addModule = () => {
        const next: Module = { title: `บทที่ ${modules.length + 1}`, lessons: [] };
        const nextModules = [...modules, next];
        setModules(nextModules);
        setSelection({ kind: 'module', moduleIndex: nextModules.length - 1 });
        setPanel('content');
        markDirty();
    };

    const updateModule = (index: number, field: string, value: any) => {
        const next = [...modules];
        next[index] = { ...next[index], [field]: value };
        setModules(next);
        markDirty();
    };

    const removeModule = (index: number) => {
        if (!confirm('ลบบทนี้และหัวข้อทั้งหมดในบทหรือไม่?')) return;
        const next = [...modules];
        next.splice(index, 1);
        setModules(next);
        setSelection(initialSelection(next));
        markDirty();
    };

    const addLesson = (moduleIndex: number, type: Lesson['type'] = 'text') => {
        const next = [...modules];
        const titles: Record<Lesson['type'], string> = {
            text: 'หัวข้อข้อความ',
            file: 'เอกสารแนบ',
            video: 'วิดีโอ',
            quiz: 'แบบทดสอบ',
        };
        const lesson: Lesson = {
            title: titles[type] || 'หัวข้อใหม่',
            type,
            content: '',
            video_url: '',
            file_path: null,
            file_name: null,
            quiz: type === 'quiz' ? emptyQuiz('แบบทดสอบ') : undefined,
        };
        next[moduleIndex] = {
            ...next[moduleIndex],
            lessons: [...next[moduleIndex].lessons, lesson],
        };
        setModules(next);
        setSelection({ kind: 'lesson', moduleIndex, lessonIndex: next[moduleIndex].lessons.length - 1 });
        setPanel('content');
        markDirty();
    };

    const updateLesson = (moduleIndex: number, lessonIndex: number, field: string, value: any) => {
        const next = [...modules];
        const lesson = { ...next[moduleIndex].lessons[lessonIndex], [field]: value };

        if (field === 'type') {
            if (value === 'quiz' && !lesson.quiz) {
                lesson.quiz = emptyQuiz(lesson.title);
            }
        }

        next[moduleIndex].lessons[lessonIndex] = lesson;
        setModules(next);
        markDirty();
    };

    const removeLesson = (moduleIndex: number, lessonIndex: number) => {
        if (!confirm('ลบหัวข้อนี้หรือไม่?')) return;
        const next = [...modules];
        next[moduleIndex].lessons.splice(lessonIndex, 1);
        setModules(next);
        setSelection({ kind: 'module', moduleIndex });
        markDirty();
    };

    const storageUrl = (path?: string | null) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return resolveAppUrl(`/storage/${path.replace(/^\//, '')}`);
    };

    const handleFileUpload = async (
        moduleIndex: number,
        lessonIndex: number,
        fileList: FileList | null,
    ) => {
        const file = fileList?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const response = await fetch(route('km.learn.courses.builder.upload', course.id), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrf,
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: formData,
                credentials: 'same-origin',
            });

            if (!response.ok) {
                const err = await response.json().catch(() => null);
                const message = err?.message || err?.errors?.file?.[0] || 'อัปโหลดไฟล์ไม่สำเร็จ';
                alert(message);
                return;
            }

            const data = await response.json();
            const next = [...modules];
            next[moduleIndex].lessons[lessonIndex] = {
                ...next[moduleIndex].lessons[lessonIndex],
                type: 'file',
                file_path: data.path,
                file_name: data.name,
            };
            setModules(next);
            markDirty();
        } catch {
            alert('อัปโหลดไฟล์ไม่สำเร็จ');
        } finally {
            setUploading(false);
        }
    };

    const clearLessonFile = (moduleIndex: number, lessonIndex: number) => {
        const next = [...modules];
        next[moduleIndex].lessons[lessonIndex] = {
            ...next[moduleIndex].lessons[lessonIndex],
            file_path: null,
            file_name: null,
        };
        setModules(next);
        markDirty();
    };

    const handleSaveContent = () => {
        setProcessing(true);
        router.put(
            route('km.learn.courses.builder.update', course.id),
            { modules },
            {
                preserveScroll: true,
                onSuccess: () => setIsDirty(false),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const handleInfoSave = (e: React.FormEvent) => {
        e.preventDefault();
        putInfo(route('km.learn.courses.update', course.id), {
            preserveScroll: true,
            onSuccess: () => setInfoDirty(false),
        });
    };

    const publishQuick = (status: 'draft' | 'published') => {
        setInfoDataRaw('status', status);
        router.put(
            route('km.learn.courses.update', course.id),
            { ...infoData, status },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setInfoDirty(false);
                },
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`จัดเนื้อหา: ${course.title}`} />

            <div className="flex min-h-[calc(100vh-4rem)] flex-col">
                {/* Top bar */}
                <div className="sticky top-0 z-20 border-b bg-white/95 px-4 py-3 backdrop-blur md:px-6">
                    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                            <div className="truncate text-lg font-bold text-slate-900">{infoData.title || course.title}</div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span
                                    className={cn(
                                        'rounded-full border px-2 py-0.5 font-semibold',
                                        infoData.status === 'published'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-amber-200 bg-amber-50 text-amber-700',
                                    )}
                                >
                                    {infoData.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
                                </span>
                                {(isDirty || infoDirty) && <span className="text-amber-600">มีการแก้ไขที่ยังไม่บันทึก</span>}
                                {flash?.success && <span className="text-emerald-600">{flash.success}</span>}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => publishQuick(infoData.status === 'published' ? 'draft' : 'published')}
                            >
                                {infoData.status === 'published' ? 'เปลี่ยนเป็นร่าง' : 'เผยแพร่'}
                            </Button>
                            <Link href={route('km.learn.courses.show', course.id)}>
                                <Button type="button" variant="outline" size="sm">
                                    <Eye className="mr-1 h-4 w-4" /> ดูหน้าผู้เรียน
                                </Button>
                            </Link>
                            <Button
                                type="button"
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={handleSaveContent}
                                disabled={!isDirty || processing}
                            >
                                <Save className="mr-1 h-4 w-4" />
                                {processing ? 'กำลังบันทึก...' : 'บันทึกเนื้อหา'}
                            </Button>
                        </div>
                    </div>
                </div>

                {Object.keys(errors || {}).length > 0 && (
                    <div className="mx-auto w-full max-w-7xl px-4 pt-4 md:px-6">
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            พบข้อผิดพลาดในการบันทึก กรุณาตรวจสอบข้อมูลอีกครั้ง
                        </div>
                    </div>
                )}

                <div className="mx-auto grid w-full max-w-7xl flex-1 gap-0 md:grid-cols-[280px_1fr]">
                    {/* Outline */}
                    <aside className="border-r bg-slate-50/80 p-3 md:min-h-[calc(100vh-8rem)]">
                        <div className="mb-3 flex gap-1 rounded-xl bg-white p-1 shadow-sm">
                            <button
                                type="button"
                                onClick={() => setPanel('content')}
                                className={cn(
                                    'flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold',
                                    panel === 'content' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                                )}
                            >
                                <BookOpen className="h-3.5 w-3.5" /> เนื้อหา
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setPanel('settings');
                                    setSelection({ kind: 'settings' });
                                }}
                                className={cn(
                                    'flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold',
                                    panel === 'settings' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                                )}
                            >
                                <Settings className="h-3.5 w-3.5" /> ตั้งค่า
                            </button>
                        </div>

                        {panel === 'content' && (
                            <div className="space-y-2">
                                <div className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    โครงหลักสูตร
                                </div>

                                {modules.length === 0 && (
                                    <div className="rounded-xl border border-dashed bg-white p-4 text-center text-xs text-slate-500">
                                        ยังไม่มีบท
                                        <Button type="button" size="sm" className="mt-3 w-full" onClick={addModule}>
                                            เริ่มด้วยบทแรก
                                        </Button>
                                    </div>
                                )}

                                {modules.map((module, mIndex) => {
                                    const moduleSelected =
                                        selection.kind === 'module' && selection.moduleIndex === mIndex;
                                    return (
                                        <div key={mIndex} className="rounded-xl border bg-white shadow-sm">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelection({ kind: 'module', moduleIndex: mIndex });
                                                    setPanel('content');
                                                }}
                                                className={cn(
                                                    'flex w-full items-center gap-2 rounded-t-xl px-2.5 py-2 text-left text-sm font-semibold',
                                                    moduleSelected ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50',
                                                )}
                                            >
                                                <Layers className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                <span className="truncate">{module.title || `บทที่ ${mIndex + 1}`}</span>
                                            </button>
                                            <div className="space-y-0.5 px-1.5 pb-1.5">
                                                {module.lessons.map((lesson, lIndex) => {
                                                    const Icon = LESSON_ICON[lesson.type] || FileText;
                                                    const active =
                                                        selection.kind === 'lesson' &&
                                                        selection.moduleIndex === mIndex &&
                                                        selection.lessonIndex === lIndex;
                                                    return (
                                                        <button
                                                            key={lIndex}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelection({
                                                                    kind: 'lesson',
                                                                    moduleIndex: mIndex,
                                                                    lessonIndex: lIndex,
                                                                });
                                                                setPanel('content');
                                                            }}
                                                            className={cn(
                                                                'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs',
                                                                active
                                                                    ? 'bg-emerald-600 text-white'
                                                                    : 'text-slate-600 hover:bg-slate-50',
                                                            )}
                                                        >
                                                            <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                                            <span className="truncate">{lesson.title || 'หัวข้อใหม่'}</span>
                                                        </button>
                                                    );
                                                })}
                                                <button
                                                    type="button"
                                                    onClick={() => addLesson(mIndex)}
                                                    className="flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-left text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
                                                >
                                                    <Plus className="h-3 w-3" /> เพิ่มหัวข้อ
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={addModule}>
                                    <Plus className="mr-1 h-4 w-4" /> เพิ่มบท
                                </Button>
                            </div>
                        )}

                        {panel === 'settings' && (
                            <div className="rounded-xl border bg-white p-3 text-xs text-slate-500">
                                แก้ชื่อหลักสูตร สถานะเผยแพร่ และข้อมูลทั่วไปทางด้านขวา
                            </div>
                        )}
                    </aside>

                    {/* Editor */}
                    <main className="p-4 md:p-6">
                        {panel === 'settings' || selection.kind === 'settings' ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>ตั้งค่าหลักสูตร</CardTitle>
                                    <CardDescription>ข้อมูลพื้นฐานและสถานะการเผยแพร่</CardDescription>
                                </CardHeader>
                                <form onSubmit={handleInfoSave}>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>สถานะ</Label>
                                            <Select
                                                value={infoData.status}
                                                onValueChange={(val) => setInfoData('status', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="draft">ร่าง (ยังไม่แสดงให้ผู้เรียน)</SelectItem>
                                                    <SelectItem value="published">เผยแพร่</SelectItem>
                                                    <SelectItem value="archived">เก็บถาวร</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="title">ชื่อหลักสูตร</Label>
                                            <Input
                                                id="title"
                                                value={infoData.title}
                                                onChange={(e) => setInfoData('title', e.target.value)}
                                                required
                                            />
                                            {infoErrors.title && (
                                                <p className="text-sm text-destructive">{infoErrors.title}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="description">รายละเอียด</Label>
                                            <Textarea
                                                id="description"
                                                value={infoData.description}
                                                onChange={(e) => setInfoData('description', e.target.value)}
                                                rows={4}
                                            />
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>ประเภท</Label>
                                                <Select
                                                    value={infoData.type}
                                                    onValueChange={(val) => setInfoData('type', val)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="online">หลักสูตรออนไลน์</SelectItem>
                                                        <SelectItem value="internal">อบรมภายใน</SelectItem>
                                                        <SelectItem value="external">อบรมภายนอก</SelectItem>
                                                        <SelectItem value="ojt">การสอนงาน (OJT)</SelectItem>
                                                        <SelectItem value="conference">ประชุม/สัมมนา</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>จำนวนชั่วโมง</Label>
                                                <Input
                                                    type="number"
                                                    step="0.5"
                                                    min={0}
                                                    value={infoData.hours}
                                                    onChange={(e) =>
                                                        setInfoData('hours', parseFloat(e.target.value) || 0)
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>วันที่เริ่ม</Label>
                                                <Input
                                                    type="date"
                                                    value={infoData.start_date}
                                                    onChange={(e) => setInfoData('start_date', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>วันที่สิ้นสุด</Label>
                                                <Input
                                                    type="date"
                                                    value={infoData.end_date}
                                                    onChange={(e) => setInfoData('end_date', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>สถานที่ / ลิงก์</Label>
                                            <Input
                                                value={infoData.location}
                                                onChange={(e) => setInfoData('location', e.target.value)}
                                            />
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button type="submit" disabled={infoProcessing} className="bg-emerald-600 hover:bg-emerald-700">
                                            {infoProcessing ? 'กำลังบันทึก...' : 'บันทึกตั้งค่า'}
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        ) : selection.kind === 'module' && selectedModule ? (
                            <Card>
                                <CardHeader>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        บท (Chapter)
                                    </div>
                                    <CardTitle>แก้ไขบท</CardTitle>
                                    <CardDescription>บทใช้จัดกลุ่มหัวข้อการเรียนรู้</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>ชื่อบท</Label>
                                        <Input
                                            value={selectedModule.title}
                                            onChange={(e) =>
                                                updateModule(selection.moduleIndex, 'title', e.target.value)
                                            }
                                            className="text-lg font-semibold"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => addLesson(selection.moduleIndex, 'text')}
                                        >
                                            <Type className="mr-1 h-4 w-4" /> เพิ่มข้อความ
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => addLesson(selection.moduleIndex, 'file')}
                                        >
                                            <FileUp className="mr-1 h-4 w-4" /> เพิ่มเอกสาร
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => addLesson(selection.moduleIndex, 'video')}
                                        >
                                            <Video className="mr-1 h-4 w-4" /> เพิ่มวิดีโอ
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => addLesson(selection.moduleIndex, 'quiz')}
                                        >
                                            <HelpCircle className="mr-1 h-4 w-4" /> เพิ่มแบบทดสอบ
                                        </Button>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                                        มีหัวข้อในบทนี้ {selectedModule.lessons.length} รายการ
                                        {selectedModule.lessons[0] && (
                                            <button
                                                type="button"
                                                className="mt-2 flex items-center text-emerald-700 hover:underline"
                                                onClick={() =>
                                                    setSelection({
                                                        kind: 'lesson',
                                                        moduleIndex: selection.moduleIndex,
                                                        lessonIndex: 0,
                                                    })
                                                }
                                            >
                                                เปิดหัวข้อแรก <ChevronRight className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="justify-between">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="border-rose-200 text-rose-600 hover:bg-rose-50"
                                        onClick={() => removeModule(selection.moduleIndex)}
                                    >
                                        <Trash2 className="mr-1 h-4 w-4" /> ลบบทนี้
                                    </Button>
                                </CardFooter>
                            </Card>
                        ) : selection.kind === 'lesson' && selectedLesson ? (
                            <Card>
                                <CardHeader>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        หัวข้อการเรียนรู้ (Lesson)
                                    </div>
                                    <CardTitle>แก้ไขหัวข้อ</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                                        <div className="space-y-2">
                                            <Label>ชื่อหัวข้อ</Label>
                                            <Input
                                                value={selectedLesson.title}
                                                onChange={(e) =>
                                                    updateLesson(
                                                        selection.moduleIndex,
                                                        selection.lessonIndex,
                                                        'title',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>ประเภทเนื้อหา</Label>
                                            <Select
                                                value={selectedLesson.type}
                                                onValueChange={(val) =>
                                                    updateLesson(
                                                        selection.moduleIndex,
                                                        selection.lessonIndex,
                                                        'type',
                                                        val,
                                                    )
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="text">ข้อความ</SelectItem>
                                                    <SelectItem value="file">เอกสาร (แนบไฟล์)</SelectItem>
                                                    <SelectItem value="video">วิดีโอ (YouTube)</SelectItem>
                                                    <SelectItem value="quiz">แบบทดสอบ</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {selectedLesson.type === 'text' && (
                                        <div className="space-y-2">
                                            <Label>เนื้อหาข้อความ</Label>
                                            <Textarea
                                                value={selectedLesson.content || ''}
                                                onChange={(e) =>
                                                    updateLesson(
                                                        selection.moduleIndex,
                                                        selection.lessonIndex,
                                                        'content',
                                                        e.target.value,
                                                    )
                                                }
                                                rows={12}
                                                placeholder="พิมพ์เนื้อหาบทเรียนที่นี่ (รองรับ HTML พื้นฐาน เช่น <b>, <p>, <ul>)"
                                                className="font-mono text-sm"
                                            />
                                        </div>
                                    )}

                                    {selectedLesson.type === 'file' && (
                                        <div className="space-y-3">
                                            <Label>แนบเอกสาร</Label>
                                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-5">
                                                {selectedLesson.file_path ? (
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 font-medium text-slate-800">
                                                                <FileText className="h-4 w-4 text-orange-500" />
                                                                <span className="truncate">
                                                                    {selectedLesson.file_name ||
                                                                        selectedLesson.file_path.split('/').pop()}
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-xs text-slate-500">
                                                                ไฟล์ถูกแนบแล้ว — กดบันทึกเนื้อหาเพื่อบันทึกลงหลักสูตร
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <a
                                                                href={storageUrl(selectedLesson.file_path)}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex"
                                                            >
                                                                <Button type="button" variant="outline" size="sm">
                                                                    <ExternalLink className="mr-1 h-3.5 w-3.5" /> เปิดดู
                                                                </Button>
                                                            </a>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="border-rose-200 text-rose-600"
                                                                onClick={() =>
                                                                    clearLessonFile(
                                                                        selection.moduleIndex,
                                                                        selection.lessonIndex,
                                                                    )
                                                                }
                                                            >
                                                                ลบไฟล์
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <FileUp className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                                                        <p className="mb-3 text-sm text-slate-600">
                                                            แนบ PDF, Word, PowerPoint, Excel หรือรูปภาพ (สูงสุด 20MB)
                                                        </p>
                                                        <Label
                                                            htmlFor="lesson-file-upload"
                                                            className={cn(
                                                                'inline-flex cursor-pointer items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700',
                                                                uploading && 'pointer-events-none opacity-70',
                                                            )}
                                                        >
                                                            {uploading ? (
                                                                <>
                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังอัปโหลด...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <FileUp className="mr-2 h-4 w-4" /> เลือกไฟล์
                                                                </>
                                                            )}
                                                        </Label>
                                                        <Input
                                                            id="lesson-file-upload"
                                                            type="file"
                                                            className="hidden"
                                                            disabled={uploading}
                                                            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.zip"
                                                            onChange={(e) =>
                                                                handleFileUpload(
                                                                    selection.moduleIndex,
                                                                    selection.lessonIndex,
                                                                    e.target.files,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label>คำอธิบายเอกสาร (ถ้ามี)</Label>
                                                <Textarea
                                                    value={selectedLesson.content || ''}
                                                    onChange={(e) =>
                                                        updateLesson(
                                                            selection.moduleIndex,
                                                            selection.lessonIndex,
                                                            'content',
                                                            e.target.value,
                                                        )
                                                    }
                                                    rows={3}
                                                    placeholder="อธิบายสั้นๆ เกี่ยวกับเอกสารที่แนบ"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {selectedLesson.type === 'video' && (
                                        <div className="space-y-2">
                                            <Label>ลิงก์วิดีโอ YouTube</Label>
                                            <Input
                                                value={selectedLesson.video_url || ''}
                                                onChange={(e) =>
                                                    updateLesson(
                                                        selection.moduleIndex,
                                                        selection.lessonIndex,
                                                        'video_url',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="https://www.youtube.com/watch?v=..."
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                วางลิงก์ YouTube เต็มๆ ได้ ระบบจะแสดงเป็นวิดีโอในหน้าเรียน
                                            </p>
                                        </div>
                                    )}

                                    {selectedLesson.type === 'quiz' && (
                                        <QuizBuilder
                                            courseId={course.id}
                                            quiz={
                                                selectedLesson.quiz ||
                                                emptyQuiz(selectedLesson.title || 'แบบทดสอบ')
                                            }
                                            onChange={(newQuiz) =>
                                                updateLesson(
                                                    selection.moduleIndex,
                                                    selection.lessonIndex,
                                                    'quiz',
                                                    newQuiz,
                                                )
                                            }
                                        />
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="border-rose-200 text-rose-600 hover:bg-rose-50"
                                        onClick={() =>
                                            removeLesson(selection.moduleIndex, selection.lessonIndex)
                                        }
                                    >
                                        <Trash2 className="mr-1 h-4 w-4" /> ลบหัวข้อนี้
                                    </Button>
                                </CardFooter>
                            </Card>
                        ) : (
                            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed text-slate-500">
                                <BookOpen className="mb-3 h-10 w-10 opacity-40" />
                                <p className="mb-3 text-sm">เลือกบทหรือหัวข้อจากด้านซ้ายเพื่อเริ่มแก้ไข</p>
                                <Button type="button" onClick={addModule}>
                                    เริ่มด้วยบทแรก
                                </Button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </AppLayout>
    );
}
