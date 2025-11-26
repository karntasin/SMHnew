import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, CheckCircle, XCircle, GripVertical } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

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
    questions: Question[];
}

interface Props {
    quiz: Quiz;
    onChange: (quiz: Quiz) => void;
}

export default function QuizBuilder({ quiz, onChange }: Props) {
    const addQuestion = () => {
        const newQuestions = [...(quiz.questions || [])];
        newQuestions.push({
            question_text: 'คำถามใหม่',
            type: 'multiple_choice',
            points: 1,
            answers: [
                { answer_text: 'ตัวเลือก 1', is_correct: true },
                { answer_text: 'ตัวเลือก 2', is_correct: false }
            ]
        });
        onChange({ ...quiz, questions: newQuestions });
    };

    const updateQuestion = (index: number, field: string, value: any) => {
        const newQuestions = [...(quiz.questions || [])];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        
        // Reset answers if type changes
        if (field === 'type') {
            if (value === 'multiple_choice') {
                newQuestions[index].answers = [
                    { answer_text: 'ตัวเลือก 1', is_correct: true },
                    { answer_text: 'ตัวเลือก 2', is_correct: false }
                ];
            } else if (value === 'matching') {
                newQuestions[index].answers = [
                    { answer_text: 'รายการ 1', matching_pair: 'คู่ 1', is_correct: true },
                    { answer_text: 'รายการ 2', matching_pair: 'คู่ 2', is_correct: true }
                ];
            } else if (value === 'fill_blank') {
                newQuestions[index].answers = [
                    { answer_text: 'คำตอบที่ถูกต้อง', is_correct: true }
                ];
            }
        }
        
        onChange({ ...quiz, questions: newQuestions });
    };

    const removeQuestion = (index: number) => {
        const newQuestions = [...(quiz.questions || [])];
        newQuestions.splice(index, 1);
        onChange({ ...quiz, questions: newQuestions });
    };

    const updateAnswer = (qIndex: number, aIndex: number, field: string, value: any) => {
        const newQuestions = [...(quiz.questions || [])];
        newQuestions[qIndex].answers[aIndex] = { 
            ...newQuestions[qIndex].answers[aIndex], 
            [field]: value 
        };
        onChange({ ...quiz, questions: newQuestions });
    };

    const addAnswer = (qIndex: number) => {
        const newQuestions = [...(quiz.questions || [])];
        const type = newQuestions[qIndex].type;
        
        if (type === 'matching') {
            newQuestions[qIndex].answers.push({ answer_text: '', matching_pair: '', is_correct: true });
        } else {
            newQuestions[qIndex].answers.push({ answer_text: '', is_correct: false });
        }
        
        onChange({ ...quiz, questions: newQuestions });
    };

    const removeAnswer = (qIndex: number, aIndex: number) => {
        const newQuestions = [...(quiz.questions || [])];
        newQuestions[qIndex].answers.splice(aIndex, 1);
        onChange({ ...quiz, questions: newQuestions });
    };

    return (
        <div className="space-y-6 border rounded-lg p-4 bg-background">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>ชื่อแบบทดสอบ</Label>
                    <Input 
                        value={quiz.title || ''} 
                        onChange={(e) => onChange({ ...quiz, title: e.target.value })}
                    />
                </div>
                <div>
                    <Label>คะแนนผ่าน (%)</Label>
                    <Input 
                        type="number" 
                        min="0" 
                        max="100"
                        value={quiz.passing_score || 80} 
                        onChange={(e) => onChange({ ...quiz, passing_score: parseInt(e.target.value) })}
                    />
                </div>
                <div className="md:col-span-2">
                    <Label>คำอธิบาย</Label>
                    <Textarea 
                        value={quiz.description || ''} 
                        onChange={(e) => onChange({ ...quiz, description: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">คำถาม</h3>
                    <Button size="sm" onClick={addQuestion} variant="secondary">
                        <Plus className="mr-2 h-4 w-4" /> เพิ่มคำถาม
                    </Button>
                </div>

                {(quiz.questions || []).map((question, qIndex) => (
                    <Card key={qIndex} className="border border-muted">
                        <CardHeader className="pb-2 bg-muted/20">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 space-y-2">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <Label>โจทย์คำถาม</Label>
                                            <Input 
                                                value={question.question_text} 
                                                onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-40">
                                            <Label>ประเภท</Label>
                                            <Select 
                                                value={question.type} 
                                                onValueChange={(val) => updateQuestion(qIndex, 'type', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="multiple_choice">ปรนัย (เลือกตอบ)</SelectItem>
                                                    <SelectItem value="matching">จับคู่</SelectItem>
                                                    <SelectItem value="fill_blank">เติมคำในช่องว่าง</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="w-24">
                                            <Label>คะแนน</Label>
                                            <Input 
                                                type="number" 
                                                min="1"
                                                value={question.points} 
                                                onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)} className="ml-2">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="space-y-2">
                                <Label>คำตอบ</Label>
                                {question.answers.map((answer, aIndex) => (
                                    <div key={aIndex} className="flex items-center gap-2">
                                        {question.type === 'multiple_choice' && (
                                            <>
                                                <Switch 
                                                    checked={answer.is_correct}
                                                    onCheckedChange={(checked) => {
                                                        // Uncheck others if single choice (optional logic, but good UX)
                                                        const newQuestions = [...(quiz.questions || [])];
                                                        newQuestions[qIndex].answers.forEach((a, i) => {
                                                            if (i !== aIndex) a.is_correct = false;
                                                        });
                                                        newQuestions[qIndex].answers[aIndex].is_correct = checked;
                                                        onChange({ ...quiz, questions: newQuestions });
                                                    }}
                                                />
                                                <Input 
                                                    value={answer.answer_text} 
                                                    onChange={(e) => updateAnswer(qIndex, aIndex, 'answer_text', e.target.value)}
                                                    placeholder="ตัวเลือก"
                                                />
                                            </>
                                        )}

                                        {question.type === 'matching' && (
                                            <>
                                                <Input 
                                                    value={answer.answer_text} 
                                                    onChange={(e) => updateAnswer(qIndex, aIndex, 'answer_text', e.target.value)}
                                                    placeholder="ฝั่งซ้าย (คำถาม)"
                                                    className="flex-1"
                                                />
                                                <span className="text-muted-foreground">คู่กับ</span>
                                                <Input 
                                                    value={answer.matching_pair || ''} 
                                                    onChange={(e) => updateAnswer(qIndex, aIndex, 'matching_pair', e.target.value)}
                                                    placeholder="ฝั่งขวา (คำตอบ)"
                                                    className="flex-1"
                                                />
                                            </>
                                        )}

                                        {question.type === 'fill_blank' && (
                                            <Input 
                                                value={answer.answer_text} 
                                                onChange={(e) => updateAnswer(qIndex, aIndex, 'answer_text', e.target.value)}
                                                placeholder="คำตอบที่ถูกต้อง"
                                                className="flex-1"
                                            />
                                        )}

                                        <Button variant="ghost" size="icon" onClick={() => removeAnswer(qIndex, aIndex)}>
                                            <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={() => addAnswer(qIndex)} className="mt-2">
                                    <Plus className="mr-2 h-3 w-3" /> เพิ่มคำตอบ
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
