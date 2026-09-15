import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Plus, Trash2, XCircle, CheckCircle2, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Answer {
    id?: number;
    answer_text: string;
    matching_pair?: string;
    is_correct: boolean;
}

interface Question {
    id?: number;
    question_text: string;
    type: 'multiple_choice' | 'true_false' | 'matching' | 'fill_blank';
    points: number;
    answers: Answer[];
}

interface Quiz {
    id?: number;
    title: string;
    description: string;
    passing_score: number;
    randomize_questions?: boolean;
    questions: Question[];
}

interface Props {
    quiz: Quiz;
    onChange: (quiz: Quiz) => void;
    courseId: number;
}

const TYPE_LABEL: Record<Question['type'], string> = {
    multiple_choice: 'ปรนัย',
    true_false: 'ถูก/ผิด',
    fill_blank: 'เติมคำ',
    matching: 'จับคู่',
};

function defaultAnswers(type: Question['type']): Answer[] {
    if (type === 'true_false') {
        return [
            { answer_text: 'ถูก', is_correct: true },
            { answer_text: 'ผิด', is_correct: false },
        ];
    }
    if (type === 'matching') {
        return [
            { answer_text: 'รายการ 1', matching_pair: 'คู่ 1', is_correct: true },
            { answer_text: 'รายการ 2', matching_pair: 'คู่ 2', is_correct: true },
        ];
    }
    if (type === 'fill_blank') {
        return [{ answer_text: 'คำตอบที่ถูกต้อง', is_correct: true }];
    }
    return [
        { answer_text: 'ตัวเลือก 1', is_correct: true },
        { answer_text: 'ตัวเลือก 2', is_correct: false },
        { answer_text: 'ตัวเลือก 3', is_correct: false },
        { answer_text: 'ตัวเลือก 4', is_correct: false },
    ];
}

function makeQuestion(type: Question['type']): Question {
    return {
        question_text: type === 'true_false' ? 'ข้อความนี้ถูกต้องหรือไม่?' : 'คำถามใหม่',
        type,
        points: 1,
        answers: defaultAnswers(type),
    };
}

export default function QuizBuilder({ quiz, onChange, courseId }: Props) {
    const passingScore = quiz.passing_score ?? 70;
    const fileRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);
    const [importMessage, setImportMessage] = useState<string | null>(null);

    const addQuestionOfType = (type: Question['type']) => {
        onChange({
            ...quiz,
            passing_score: passingScore,
            questions: [...(quiz.questions || []), makeQuestion(type)],
        });
    };

    const handleImportExcel = async (files: FileList | null) => {
        const file = files?.[0];
        if (!file) return;

        let finalMode: 'append' | 'replace' = 'replace';
        if ((quiz.questions || []).length > 0) {
            const append = confirm(
                `ขณะนี้มี ${(quiz.questions || []).length} คำถาม\n\nตกลง = เพิ่มคำถามจากไฟล์ต่อท้าย\nยกเลิก = ยกเลิกการนำเข้า`,
            );
            if (!append) {
                if (fileRef.current) fileRef.current.value = '';
                return;
            }
            finalMode = 'append';
        }

        setImporting(true);
        setImportMessage(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('mode', finalMode);
            const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const response = await fetch(route('km.learn.courses.builder.quiz-import', courseId), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrf,
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: formData,
                credentials: 'same-origin',
            });

            const data = await response.json().catch(() => null);
            if (!response.ok) {
                const msg =
                    data?.errors?.join?.('\n') ||
                    data?.message ||
                    'นำเข้าไฟล์ไม่สำเร็จ';
                setImportMessage(msg);
                alert(msg);
                return;
            }

            const imported: Question[] = (data?.questions || []).map((q: Question) => ({
                question_text: q.question_text,
                type: q.type,
                points: q.points || 1,
                answers: q.answers || [],
            }));

            if (imported.length === 0) {
                setImportMessage('ไม่พบคำถามในไฟล์');
                alert('ไม่พบคำถามในไฟล์');
                return;
            }

            const nextQuestions =
                finalMode === 'replace' ? imported : [...(quiz.questions || []), ...imported];

            onChange({
                ...quiz,
                passing_score: passingScore,
                questions: nextQuestions,
            });

            const warn =
                data?.errors?.length > 0
                    ? ` (มีคำเตือน ${data.errors.length} แถว: ${data.errors.slice(0, 3).join('; ')})`
                    : '';
            setImportMessage(`นำเข้าแล้ว ${imported.length} คำถาม${warn}`);
        } catch {
            setImportMessage('นำเข้าไฟล์ไม่สำเร็จ');
            alert('นำเข้าไฟล์ไม่สำเร็จ');
        } finally {
            setImporting(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const updateQuestion = (index: number, field: string, value: any) => {
        const newQuestions = [...(quiz.questions || [])];
        const prev = newQuestions[index];

        if (field === 'type' && value !== prev.type) {
            if (!confirm('เปลี่ยนประเภทจะรีเซ็ตตัวเลือกคำตอบ ดำเนินการต่อหรือไม่?')) {
                return;
            }
            newQuestions[index] = {
                ...prev,
                type: value,
                answers: defaultAnswers(value),
            };
        } else {
            newQuestions[index] = { ...prev, [field]: value };
        }

        onChange({ ...quiz, passing_score: passingScore, questions: newQuestions });
    };

    const removeQuestion = (index: number) => {
        const newQuestions = [...(quiz.questions || [])];
        newQuestions.splice(index, 1);
        onChange({ ...quiz, passing_score: passingScore, questions: newQuestions });
    };

    const updateAnswer = (qIndex: number, aIndex: number, field: string, value: any) => {
        const newQuestions = [...(quiz.questions || [])];
        newQuestions[qIndex].answers[aIndex] = {
            ...newQuestions[qIndex].answers[aIndex],
            [field]: value,
        };
        onChange({ ...quiz, passing_score: passingScore, questions: newQuestions });
    };

    const setCorrectAnswer = (qIndex: number, aIndex: number) => {
        const newQuestions = [...(quiz.questions || [])];
        newQuestions[qIndex].answers = newQuestions[qIndex].answers.map((a, i) => ({
            ...a,
            is_correct: i === aIndex,
        }));
        onChange({ ...quiz, passing_score: passingScore, questions: newQuestions });
    };

    const addAnswer = (qIndex: number) => {
        const newQuestions = [...(quiz.questions || [])];
        const type = newQuestions[qIndex].type;
        if (type === 'true_false') return;

        if (type === 'matching') {
            newQuestions[qIndex].answers.push({ answer_text: '', matching_pair: '', is_correct: true });
        } else {
            newQuestions[qIndex].answers.push({ answer_text: '', is_correct: false });
        }
        onChange({ ...quiz, passing_score: passingScore, questions: newQuestions });
    };

    const removeAnswer = (qIndex: number, aIndex: number) => {
        const newQuestions = [...(quiz.questions || [])];
        if (newQuestions[qIndex].type === 'true_false') return;
        newQuestions[qIndex].answers.splice(aIndex, 1);
        onChange({ ...quiz, passing_score: passingScore, questions: newQuestions });
    };

    return (
        <div className="space-y-5">
            <div className="grid gap-4 rounded-xl border bg-slate-50/60 p-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label>ชื่อแบบทดสอบ</Label>
                    <Input
                        value={quiz.title || ''}
                        onChange={(e) => onChange({ ...quiz, title: e.target.value, passing_score: passingScore })}
                        placeholder="เช่น แบบทดสอบท้ายบท"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>คะแนนผ่าน (%)</Label>
                    <Input
                        type="number"
                        min={0}
                        max={100}
                        value={passingScore}
                        onChange={(e) =>
                            onChange({ ...quiz, passing_score: parseInt(e.target.value, 10) || 70 })
                        }
                    />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                    <Label>คำอธิบายสั้นๆ</Label>
                    <Textarea
                        value={quiz.description || ''}
                        onChange={(e) =>
                            onChange({ ...quiz, description: e.target.value, passing_score: passingScore })
                        }
                        rows={2}
                        placeholder="คำแนะนำก่อนทำข้อสอบ (ถ้ามี)"
                    />
                </div>
                <div className="flex items-start gap-3 sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5">
                    <input
                        id="quiz-randomize"
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                        checked={quiz.randomize_questions !== false}
                        onChange={(e) =>
                            onChange({
                                ...quiz,
                                passing_score: passingScore,
                                randomize_questions: e.target.checked,
                            })
                        }
                    />
                    <div>
                        <Label htmlFor="quiz-randomize" className="cursor-pointer font-medium">
                            สุ่มลำดับคำถามและตัวเลือกทุกครั้งที่สอบ
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            แต่ละคน / แต่ละครั้งที่เข้าสอบ จะได้ลำดับข้อและตำแหน่งคำตอบไม่เหมือนกัน
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-900">
                    <FileSpreadsheet className="h-4 w-4" /> นำเข้าจาก Excel
                </div>
                <p className="mb-3 text-xs text-emerald-800/80">
                    ดาวน์โหลดต้นแบบ แล้วกรอกคำถามใน Excel จากนั้นอัปโหลดกลับมาที่นี่
                </p>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                        <a href={route('km.learn.courses.builder.quiz-template')}>
                            <Download className="mr-1 h-3.5 w-3.5" /> ดาวน์โหลดต้นแบบ
                        </a>
                    </Button>
                    <Label
                        htmlFor="quiz-excel-import"
                        className={cn(
                            'inline-flex h-8 cursor-pointer items-center rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700',
                            importing && 'pointer-events-none opacity-70',
                        )}
                    >
                        {importing ? (
                            <>
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> กำลังนำเข้า...
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> เลือกไฟล์ Excel
                            </>
                        )}
                    </Label>
                    <Input
                        id="quiz-excel-import"
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        accept=".xlsx,.xls,.csv"
                        disabled={importing}
                        onChange={(e) => handleImportExcel(e.target.files)}
                    />
                </div>
                {importMessage && (
                    <p className="mt-2 text-xs text-emerald-900 whitespace-pre-wrap">{importMessage}</p>
                )}
            </div>

            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold">คำถาม ({(quiz.questions || []).length})</h3>
                    <div className="flex flex-wrap gap-1.5">
                        {(Object.keys(TYPE_LABEL) as Question['type'][]).map((type) => (
                            <Button
                                key={type}
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => addQuestionOfType(type)}
                            >
                                <Plus className="mr-1 h-3 w-3" /> {TYPE_LABEL[type]}
                            </Button>
                        ))}
                    </div>
                </div>

                {(quiz.questions || []).length === 0 && (
                    <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                        ยังไม่มีคำถาม — กดปุ่มด้านบนเพื่อเพิ่มปรนัย / ถูก-ผิด / เติมคำ / จับคู่
                    </div>
                )}

                {(quiz.questions || []).map((question, qIndex) => (
                    <Card key={qIndex} className="overflow-hidden border-slate-200">
                        <CardHeader className="space-y-3 bg-muted/30 py-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    ข้อ {qIndex + 1} · {TYPE_LABEL[question.type]}
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeQuestion(qIndex)}
                                    className="h-8 w-8"
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                            <div className="grid gap-3 md:grid-cols-[1fr_140px_88px]">
                                <div className="space-y-1.5">
                                    <Label>โจทย์คำถาม</Label>
                                    <Input
                                        value={question.question_text}
                                        onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>ประเภท</Label>
                                    <Select
                                        value={question.type}
                                        onValueChange={(val) => updateQuestion(qIndex, 'type', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="multiple_choice">ปรนัย</SelectItem>
                                            <SelectItem value="true_false">ถูก/ผิด</SelectItem>
                                            <SelectItem value="fill_blank">เติมคำ</SelectItem>
                                            <SelectItem value="matching">จับคู่</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>คะแนน</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={question.points}
                                        onChange={(e) =>
                                            updateQuestion(qIndex, 'points', parseInt(e.target.value, 10) || 1)
                                        }
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-4">
                            <Label className="text-slate-600">
                                {question.type === 'fill_blank'
                                    ? 'คำตอบที่ถูกต้อง'
                                    : question.type === 'matching'
                                      ? 'คู่คำถาม–คำตอบ'
                                      : 'ตัวเลือก (กดเพื่อเลือกคำตอบที่ถูก)'}
                            </Label>

                            {question.answers.map((answer, aIndex) => (
                                <div key={aIndex} className="flex items-center gap-2">
                                    {(question.type === 'multiple_choice' || question.type === 'true_false') && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setCorrectAnswer(qIndex, aIndex)}
                                                className={cn(
                                                    'inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition',
                                                    answer.is_correct
                                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                        : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200',
                                                )}
                                                title="ตั้งเป็นคำตอบที่ถูก"
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                {answer.is_correct ? 'คำตอบถูก' : 'ตั้งเป็นถูก'}
                                            </button>
                                            <Input
                                                value={answer.answer_text}
                                                onChange={(e) => updateAnswer(qIndex, aIndex, 'answer_text', e.target.value)}
                                                placeholder="ตัวเลือก"
                                                disabled={question.type === 'true_false'}
                                                className={cn(answer.is_correct && 'border-emerald-300')}
                                            />
                                        </>
                                    )}

                                    {question.type === 'matching' && (
                                        <>
                                            <Input
                                                value={answer.answer_text}
                                                onChange={(e) => updateAnswer(qIndex, aIndex, 'answer_text', e.target.value)}
                                                placeholder="ฝั่งซ้าย"
                                                className="flex-1"
                                            />
                                            <span className="text-xs text-muted-foreground">คู่กับ</span>
                                            <Input
                                                value={answer.matching_pair || ''}
                                                onChange={(e) =>
                                                    updateAnswer(qIndex, aIndex, 'matching_pair', e.target.value)
                                                }
                                                placeholder="ฝั่งขวา"
                                                className="flex-1"
                                            />
                                        </>
                                    )}

                                    {question.type === 'fill_blank' && (
                                        <Input
                                            value={answer.answer_text}
                                            onChange={(e) => updateAnswer(qIndex, aIndex, 'answer_text', e.target.value)}
                                            placeholder="คำตอบที่ถูกต้อง"
                                            className="flex-1 border-emerald-300"
                                        />
                                    )}

                                    {question.type !== 'true_false' && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeAnswer(qIndex, aIndex)}
                                        >
                                            <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                        </Button>
                                    )}
                                </div>
                            ))}

                            {question.type !== 'true_false' && (
                                <Button type="button" variant="outline" size="sm" onClick={() => addAnswer(qIndex)} className="mt-1">
                                    <Plus className="mr-1 h-3 w-3" /> เพิ่มตัวเลือก
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
