import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, ArrowLeft, HelpCircle, Award, ArrowRight } from 'lucide-react';

interface Answer {
    id: number;
    answer_text: string;
    matching_pair?: string;
}

interface Question {
    id: number;
    question_text: string;
    type: 'multiple_choice' | 'true_false' | 'matching' | 'fill_blank';
    answers: Answer[];
    matching_options?: string[];
}

interface Quiz {
    id: number;
    title: string;
    description: string;
    questions: Question[];
    passing_score: number;
    randomize_questions?: boolean;
}

interface Course {
    id: number;
    title: string;
}

interface Props {
    course: Course;
    quiz: Quiz;
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

export default function CourseQuiz({ course, quiz }: Props) {
    const { flash } = usePage().props as any;
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [submitted, setSubmitted] = useState(false);

    const handleAnswerChange = (questionId: number, value: any) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    const handleMatchingChange = (questionId: number, answerId: number, value: string) => {
        setAnswers(prev => {
            const current = prev[questionId] || {};
            return {
                ...prev,
                [questionId]: { ...current, [answerId]: value }
            };
        });
    };

    const handleSubmit = () => {
        if (Object.keys(answers).length < quiz.questions.length) {
            alert("กรุณาตอบคำถามให้ครบทุกข้อ");
            return;
        }

        router.post(route('km.learn.courses.quiz.submit', [course.id, quiz.id]), {
            answers: answers
        }, {
            onSuccess: () => {
                setSubmitted(true);
            }
        });
    };

    // Helper to get matching options (already shuffled independently on server when randomize is on)
    const getMatchingOptions = (question: Question) => {
        if (question.matching_options && question.matching_options.length > 0) {
            return question.matching_options;
        }
        return question.answers.map(a => a.matching_pair).filter(Boolean) as string[];
    };

    if (submitted || flash.success) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title={`ผลการทดสอบ - ${quiz.title}`} />
                <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-white dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-background p-6 flex items-center justify-center">
                    <Card className="w-full max-w-2xl border-none shadow-2xl bg-white/90 backdrop-blur-sm">
                        <CardContent className="pt-10 pb-10 text-center space-y-6">
                            <div className="mx-auto h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                                <Award className="h-12 w-12 text-emerald-600" />
                            </div>
                            
                            <h2 className="text-3xl font-bold text-emerald-800">ส่งแบบทดสอบเรียบร้อยแล้ว!</h2>
                            <p className="text-lg text-muted-foreground max-w-md mx-auto">
                                ระบบได้บันทึกคำตอบของคุณแล้ว คุณสามารถตรวจสอบคะแนนได้ที่หน้าหลักสูตร
                            </p>
                            
                            <div className="pt-6 flex justify-center gap-4">
                                <Button asChild variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                    <Link href={route('km.learn.courses.index')}>กลับหน้ารวมหลักสูตร</Link>
                                </Button>
                                <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-emerald-500/30 transition-all">
                                    <Link href={route('km.learn.courses.show', course.id)}>
                                        ดูผลคะแนนที่หน้าหลักสูตร <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={[...breadcrumbs, { title: quiz.title, href: '#' }]}>
            <Head title={quiz.title} />

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-white dark:from-slate-950 dark:via-gray-900 dark:to-background p-6">
                <div className="max-w-4xl mx-auto space-y-8">
                    
                    {/* Header */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border-l-8 border-emerald-500">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{quiz.title}</h1>
                                <p className="text-muted-foreground text-lg">{quiz.description}</p>
                            </div>
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-full">
                                <HelpCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                                {quiz.questions.length} ข้อ
                            </span>
                            <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                                เกณฑ์ผ่าน {quiz.passing_score}%
                            </span>
                            {quiz.randomize_questions !== false && (
                                <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-3 py-1 rounded-full">
                                    สุ่มลำดับคำถามและตัวเลือก
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Questions */}
                    <div className="space-y-6">
                        {quiz.questions.map((question, index) => (
                            <Card key={question.id} className="border-none shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                                <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b flex items-center gap-3">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white shadow-sm">
                                        {index + 1}
                                    </span>
                                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                                        {question.question_text}
                                    </h3>
                                </div>
                                
                                <CardContent className="p-6">
                                    {question.type === 'multiple_choice' && (
                                        <RadioGroup 
                                            onValueChange={(val) => handleAnswerChange(question.id, val)}
                                            value={answers[question.id] ?? ""}
                                            className="space-y-3"
                                        >
                                            {question.answers.map((answer) => (
                                                <div key={answer.id} className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                                                    answers[question.id] === answer.id.toString() 
                                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                                                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                                                }`}>
                                                    <RadioGroupItem value={answer.id.toString()} id={`q${question.id}-a${answer.id}`} className="text-emerald-600 border-gray-400" />
                                                    <Label htmlFor={`q${question.id}-a${answer.id}`} className="flex-grow cursor-pointer font-normal text-base">
                                                        {answer.answer_text}
                                                    </Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    )}

                                    {question.type === 'true_false' && (
                                        <RadioGroup 
                                            onValueChange={(val) => handleAnswerChange(question.id, val)}
                                            value={answers[question.id] ?? ""}
                                            className="grid grid-cols-2 gap-4"
                                        >
                                            {question.answers.map((answer) => {
                                                const isTrue = answer.answer_text === 'ถูก' || answer.answer_text.toLowerCase() === 'true';
                                                const selected = answers[question.id] === answer.id.toString();
                                                return (
                                                    <div
                                                        key={answer.id}
                                                        className={`flex items-center justify-center space-x-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                            selected
                                                                ? isTrue
                                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                                    : 'border-red-500 bg-red-50 text-red-700'
                                                                : isTrue
                                                                    ? 'border-gray-200 hover:border-emerald-200'
                                                                    : 'border-gray-200 hover:border-red-200'
                                                        }`}
                                                    >
                                                        <RadioGroupItem value={answer.id.toString()} id={`q${question.id}-a${answer.id}`} />
                                                        <Label htmlFor={`q${question.id}-a${answer.id}`} className="cursor-pointer font-bold">
                                                            {answer.answer_text}
                                                        </Label>
                                                    </div>
                                                );
                                            })}
                                        </RadioGroup>
                                    )}

                                    {question.type === 'fill_blank' && (
                                        <div className="max-w-md">
                                            <Input 
                                                placeholder="พิมพ์คำตอบของคุณที่นี่..." 
                                                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                className="h-12 text-lg border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                                            />
                                        </div>
                                    )}

                                    {question.type === 'matching' && (
                                        <div className="grid gap-4">
                                            {question.answers.map((answer) => (
                                                <div key={answer.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-gray-50 p-4 rounded-lg">
                                                    <div className="font-medium text-gray-700">{answer.answer_text}</div>
                                                    <Select onValueChange={(val) => handleMatchingChange(question.id, answer.id, val)}>
                                                        <SelectTrigger className="bg-white border-gray-300">
                                                            <SelectValue placeholder="เลือกคู่ที่ถูกต้อง" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {getMatchingOptions(question).map((opt, idx) => (
                                                                <SelectItem key={idx} value={opt}>{opt}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-between items-center pt-8 pb-20">
                        <Button variant="outline" size="lg" asChild className="text-gray-600 hover:text-gray-900">
                            <Link href={route('km.learn.courses.show', course.id)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> ยกเลิก
                            </Link>
                        </Button>
                        
                        <Button 
                            size="lg" 
                            onClick={handleSubmit}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 text-lg shadow-lg hover:shadow-emerald-500/30 transition-all transform hover:-translate-y-1"
                        >
                            ส่งคำตอบ <CheckCircle className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
