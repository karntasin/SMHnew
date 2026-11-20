import React, { useState, useRef, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
    Mic,
    MicOff,
    CheckCircle2,
    ShieldCheck,
    AlertCircle,
    Loader2,
    RefreshCw,
    Trash2,
    Volume2,
    Sparkles,
    AlertTriangle,
} from 'lucide-react';
import AudioVisualizer from '@/components/voice/audio-visualizer';
import { WavRecorder, checkAudioSupport } from '@/lib/audio-recorder';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'ยืนยันตัวตนด้วยเสียง',
        href: '/settings/voice',
    },
];

interface VoiceData {
    is_enrolled: boolean;
    sample_count: number;
    similarity_baseline: number | null;
    last_authenticated_at: string | null;
    updated_at: string | null;
}

interface VoiceSettingsProps {
    status?: string;
    voiceData: VoiceData;
}

export default function VoiceSettings({ status, voiceData: initialVoiceData }: VoiceSettingsProps) {
    const [voiceData, setVoiceData] = useState<VoiceData>(initialVoiceData);

    // Wizard states
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [currentStep, setCurrentStep] = useState(0); // 0, 1, 2
    const [sampleBlobs, setSampleBlobs] = useState<Blob[]>([]);
    const [challengePhrases, setChallengePhrases] = useState<string[]>([
        'โรงพยาบาลค่ายสุรสิงหนาท บริการด้วยใจ ๑ ๒ ๓',
        'ข้าพเจ้ายืนยันตัวตนด้วยเสียง ปลอดภัยเพื่อทุกคน ๔ ๕ ๖',
        'ระบบบริหารโรงพยาบาล พร้อมดูแลเคียงข้างคุณ ๗ ๘ ๙',
    ]);

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [countdown, setCountdown] = useState(5);
    const [processing, setProcessing] = useState(false);

    // Test Voice state
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{
        is_match: boolean;
        similarity: number;
        threshold: number;
    } | null>(null);
    const [micSupportError, setMicSupportError] = useState<string | null>(null);

    const recorderRef = useRef<WavRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isRecordingRef = useRef(false);
    const sampleBlobsRef = useRef<Blob[]>([]);

    useEffect(() => {
        const support = checkAudioSupport();
        if (!support.supported) {
            setMicSupportError(support.reason || 'เบราว์เซอร์หรือการเชื่อมต่อนี้ไม่รองรับการใช้งานไมโครโฟน');
        }
    }, []);

    const startRecording = async (isForTest = false) => {
        try {
            setTestResult(null);
            setMicSupportError(null);

            const support = checkAudioSupport();
            if (!support.supported) {
                const msg = support.reason || 'เบราว์เซอร์ไม่รองรับการบันทึกเสียง';
                setMicSupportError(msg);
                toast.error(msg);
                return;
            }

            const recorder = new WavRecorder();
            recorderRef.current = recorder;
            const audioStream = await recorder.start();
            
            isRecordingRef.current = true;
            setStream(audioStream);
            setIsRecording(true);
            setCountdown(5);

            timerRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        stopRecording(isForTest);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err: any) {
            isRecordingRef.current = false;
            setIsRecording(false);
            const errorMsg = err.message || 'ไม่สามารถเปิดไมโครโฟนได้';
            setMicSupportError(errorMsg);
            toast.error(errorMsg);
        }
    };

    const stopRecording = async (isForTest = false) => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        const recorder = recorderRef.current;
        if (!recorder || !isRecordingRef.current) {
            isRecordingRef.current = false;
            setIsRecording(false);
            setStream(null);
            return;
        }

        isRecordingRef.current = false;
        setIsRecording(false);
        setStream(null);
        recorderRef.current = null;

        try {
            const blob = await recorder.stop();

            if (blob.size < 500) {
                toast.error('ไฟล์เสียงสั้นเกินไปหรือไม่มีสัญญาณเสียง กรุณากดพูดใหม่อีกครั้ง');
                return;
            }

            if (isForTest) {
                await executeTest(blob);
            } else {
                handleSampleRecorded(blob);
            }
        } catch (err: any) {
            console.error('Stop error:', err);
            toast.error('เกิดข้อผิดพลาดในการประมวลผลเสียง: ' + (err.message || ''));
        }
    };

    const handleSampleRecorded = (blob: Blob) => {
        const nextSamples = [...sampleBlobsRef.current, blob];
        sampleBlobsRef.current = nextSamples;
        setSampleBlobs(nextSamples);

        const currentCount = nextSamples.length;
        if (currentCount < 3) {
            setCurrentStep(currentCount);
            toast.success(`บันทึกตัวอย่างที่ ${currentCount} สำเร็จ! เตรียมตัวอย่างถัดไป`);
        } else {
            toast.success('บันทึกครบ 3 ตัวอย่างแล้ว! กำลังประมวลผลเอกลักษณ์เสียง...');
            submitEnrollment(nextSamples);
        }
    };

    const submitEnrollment = async (samples: Blob[]) => {
        setProcessing(true);
        const formData = new FormData();
        samples.forEach((blob, idx) => {
            formData.append(`samples[${idx}]`, blob, `sample_${idx + 1}.wav`);
        });

        try {
            const tokenMeta = document.querySelector('meta[name="csrf-token"]');
            const csrf = tokenMeta ? tokenMeta.getAttribute('content') : '';

            const res = await fetch('/settings/voice/enroll', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrf || '',
                    'Accept': 'application/json',
                },
                body: formData,
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success('ลงทะเบียนเอกลักษณ์เสียงเรียบร้อยแล้ว!');
                setVoiceData(data.data);
                setIsEnrolling(false);
                setSampleBlobs([]);
                setCurrentStep(0);
            } else {
                toast.error(data.message || 'การลงทะเบียนไม่สำเร็จ');
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setProcessing(false);
        }
    };

    const executeTest = async (testBlob: Blob) => {
        setProcessing(true);
        const formData = new FormData();
        formData.append('audio', testBlob, 'test_voice.wav');

        try {
            const tokenMeta = document.querySelector('meta[name="csrf-token"]');
            const csrf = tokenMeta ? tokenMeta.getAttribute('content') : '';

            const res = await fetch('/settings/voice/test', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrf || '',
                    'Accept': 'application/json',
                },
                body: formData,
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setTestResult({
                    is_match: data.is_match,
                    similarity: data.similarity,
                    threshold: data.threshold,
                });
                if (data.is_match) {
                    toast.success(`เสียงตรงกับเอกลักษณ์ของคุณ! (${(data.similarity * 100).toFixed(1)}%)`);
                } else {
                    toast.error(`เสียงไม่ผ่านเกณฑ์ (${(data.similarity * 100).toFixed(1)}% / เกณฑ์ ${data.threshold * 100}%)`);
                }
            } else {
                toast.error(data.message || 'ทดสอบเสียงไม่สำเร็จ');
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการส่งข้อมูล');
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteVoice = async () => {
        if (!confirm('คุณต้องการยกเลิกและลบข้อมูลเสียงที่ลงทะเบียนไว้หรือไม่?')) {
            return;
        }

        try {
            const tokenMeta = document.querySelector('meta[name="csrf-token"]');
            const csrf = tokenMeta ? tokenMeta.getAttribute('content') : '';

            const res = await fetch('/settings/voice', {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': csrf || '',
                    'Accept': 'application/json',
                },
            });

            const data = await res.json();
            if (data.success) {
                toast.success('ลบข้อมูลเอกลักษณ์เสียงเรียบร้อยแล้ว');
                setVoiceData({
                    is_enrolled: false,
                    sample_count: 0,
                    similarity_baseline: null,
                    last_authenticated_at: null,
                    updated_at: null,
                });
                setTestResult(null);
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="ตั้งค่ายืนยันตัวตนด้วยเสียง" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="ยืนยันตัวตนด้วยเสียง (Voice Biometrics)"
                        description="ลงทะเบียนและจัดการเอกลักษณ์ชีวมาตรเสียงของคุณ สำหรับใช้เข้าสู่ระบบอย่างสะดวกรวดเร็วและปลอดภัย"
                    />

                    {/* Microphone Error / Warning Banner */}
                    {micSupportError && (
                        <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-3 shadow-sm">
                            <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-bold text-sm">การแจ้งเตือนสิทธิ์หรืออุปกรณ์ไมโครโฟน:</p>
                                <p>{micSupportError}</p>
                                <p className="opacity-80">
                                    💡 คำแนะนำ: หากเข้าใช้งานผ่าน IP Address หรือเบราว์เซอร์แจ้งเตือนบล็อกไมโครโฟน กรุณาคลิกที่รูปแม่กุญแจที่แถบ URL ด้านบน เลือก "อนุญาตไมโครโฟน (Allow Microphone)" หรือเข้าใช้งานผ่าน <code>localhost</code>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Status Card */}
                    <Card className="border-2 dark:border-gray-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <ShieldCheck className="size-5 text-purple-600 dark:text-purple-400" />
                                    สถานะการลงทะเบียนเสียง
                                </CardTitle>
                                {voiceData.is_enrolled ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                        <CheckCircle2 className="size-3.5" />
                                        เปิดใช้งานแล้ว
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                        <AlertCircle className="size-3.5" />
                                        ยังไม่ได้ลงทะเบียน
                                    </span>
                                )}
                            </div>
                            <CardDescription>
                                เอกลักษณ์เสียงถูกเข้ารหัสเป็นเวกเตอร์ตัวเลข (Speaker Embedding) ตามมาตรฐานความปลอดภัย PDPA
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {voiceData.is_enrolled ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 text-xs">
                                        <div>
                                            <span className="text-gray-500 block">จำนวนตัวอย่างเสียง</span>
                                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                {voiceData.sample_count} ตัวอย่าง
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">ความสม่ำเสมอของเสียง (Baseline)</span>
                                            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                                {voiceData.similarity_baseline
                                                    ? `${(voiceData.similarity_baseline * 100).toFixed(1)}%`
                                                    : 'ปกติ'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">เข้าสู่ระบบด้วยเสียงล่าสุด</span>
                                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                {voiceData.last_authenticated_at || 'ยังไม่มีประวัติการ Login ด้วยเสียง'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-3 pt-2">
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setIsTesting(true);
                                                setIsEnrolling(false);
                                            }}
                                            className="bg-purple-600 hover:bg-purple-700 text-white"
                                        >
                                            <Volume2 className="size-4 mr-2" />
                                            ทดสอบเปรียบเทียบเสียงตนเอง
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setIsEnrolling(true);
                                                setIsTesting(false);
                                                setCurrentStep(0);
                                                sampleBlobsRef.current = [];
                                                setSampleBlobs([]);
                                            }}
                                            className="border-gray-300 dark:border-gray-700"
                                        >
                                            <RefreshCw className="size-4 mr-2" />
                                            บันทึกเสียงใหม่ทั้งหมด
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={handleDeleteVoice}
                                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                        >
                                            <Trash2 className="size-4 mr-1.5" />
                                            ลบข้อมูลเสียง
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        เมื่อลงทะเบียนเสียง คุณจะสามารถเข้าสู่ระบบโรงพยาบาลได้โดยการพูดรหัสคำสั่งเสียงที่สุ่มขึ้นมา แทนการพิมพ์รหัสผ่าน
                                    </p>
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setIsEnrolling(true);
                                            setIsTesting(false);
                                            setCurrentStep(0);
                                            sampleBlobsRef.current = [];
                                            setSampleBlobs([]);
                                        }}
                                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-600/20"
                                    >
                                        <Mic className="size-4 mr-2" />
                                        เริ่มลงทะเบียนเสียง (บันทึก 3 ตัวอย่าง)
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Enrollment Section */}
                    {isEnrolling && (
                        <Card className="border-2 border-purple-300 dark:border-purple-800 bg-purple-50/20 dark:bg-purple-950/10">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-bold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                                        <Sparkles className="size-5 text-purple-600" />
                                        ขั้นตอนการลงทะเบียน: ตัวอย่างเสียงที่ {currentStep + 1} จาก 3
                                    </CardTitle>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsEnrolling(false)}
                                        className="text-xs text-gray-500"
                                    >
                                        ยกเลิก
                                    </Button>
                                </div>
                                <CardDescription>
                                    กรุณากดปุ่มไมโครโฟนแล้วอ่านข้อความด้านล่างให้ชัดเจนด้วยน้ำเสียงปกติ
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Prompt Box */}
                                <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-900 text-center">
                                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 block mb-1">
                                        อ่านข้อความต่อไปนี้:
                                    </span>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                        "{challengePhrases[currentStep] || challengePhrases[0]}"
                                    </p>
                                </div>

                                {/* Visualizer */}
                                <AudioVisualizer stream={stream} isRecording={isRecording} className="w-full h-20" barColor="#9333ea" />

                                {/* Record Buttons */}
                                <div className="flex flex-col items-center justify-center space-y-2 pt-2">
                                    {isRecording ? (
                                        <>
                                            <Button
                                                type="button"
                                                onClick={() => stopRecording(false)}
                                                className="size-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 animate-pulse"
                                            >
                                                <MicOff className="size-7" />
                                            </Button>
                                            <span className="text-xs font-semibold text-red-600">
                                                กำลังบันทึกตัวอย่างที่ {currentStep + 1}... ({countdown}s) กดเพื่อบันทึกทันที
                                            </span>
                                        </>
                                    ) : processing ? (
                                        <div className="flex flex-col items-center space-y-2">
                                            <Loader2 className="size-8 animate-spin text-purple-600" />
                                            <span className="text-xs text-gray-500">
                                                กำลังสกัดเวกเตอร์เอกลักษณ์เสียงและคำนวณ Centroid...
                                            </span>
                                        </div>
                                    ) : (
                                        <>
                                            <Button
                                                type="button"
                                                onClick={() => startRecording(false)}
                                                className="h-12 px-6 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-md shadow-purple-600/30 transition-transform hover:scale-105"
                                            >
                                                <Mic className="size-5 mr-2" />
                                                กดเพื่อเริ่มอ่านตัวอย่างที่ {currentStep + 1}
                                            </Button>

                                            {/* Visual Step Badges */}
                                            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                                                {[1, 2, 3].map((num) => {
                                                    const isDone = sampleBlobs.length >= num;
                                                    const isCurrent = currentStep + 1 === num && !isDone;
                                                    return (
                                                        <div
                                                            key={num}
                                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                                                                isDone
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                                                    : isCurrent
                                                                    ? 'bg-purple-100 text-purple-800 border-purple-400 dark:bg-purple-900/50 dark:text-purple-300 ring-2 ring-purple-400/40'
                                                                    : 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500'
                                                            }`}
                                                        >
                                                            {isDone ? (
                                                                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                                                            ) : (
                                                                <span className="size-3.5 rounded-full border border-current flex items-center justify-center text-[10px] shrink-0">
                                                                    {num}
                                                                </span>
                                                            )}
                                                            ตัวอย่างที่ {num} {isDone ? '✓ บันทึกแล้ว' : isCurrent ? '(กำลังทำ)' : ''}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Test Voice Section */}
                    {isTesting && (
                        <Card className="border-2 border-blue-300 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-950/10">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                                        <Volume2 className="size-5 text-blue-600" />
                                        ทดสอบความแม่นยำของเสียงตนเอง
                                    </CardTitle>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsTesting(false)}
                                        className="text-xs text-gray-500"
                                    >
                                        ปิด
                                    </Button>
                                </div>
                                <CardDescription>
                                    พูดประโยคใดก็ได้ 3-5 วินาที เพื่อทดสอบว่าระบบจำแนกเสียงของคุณได้ถูกต้องหรือไม่
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <AudioVisualizer stream={stream} isRecording={isRecording} className="w-full h-20" barColor="#2563eb" />

                                <div className="flex flex-col items-center justify-center space-y-2 pt-2">
                                    {isRecording ? (
                                        <Button
                                            type="button"
                                            onClick={() => stopRecording(true)}
                                            className="size-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 animate-pulse"
                                        >
                                            <MicOff className="size-7" />
                                        </Button>
                                    ) : processing ? (
                                        <div className="flex flex-col items-center space-y-2">
                                            <Loader2 className="size-8 animate-spin text-blue-600" />
                                            <span className="text-xs text-gray-500">
                                                กำลังคำนวณ Cosine Similarity เทียบกับฐานข้อมูล...
                                            </span>
                                        </div>
                                    ) : (
                                        <Button
                                            type="button"
                                            onClick={() => startRecording(true)}
                                            className="h-12 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-600/30"
                                        >
                                            <Mic className="size-5 mr-2" />
                                            เริ่มพูดเพื่อทดสอบ
                                        </Button>
                                    )}
                                </div>

                                {testResult && (
                                    <div
                                        className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${
                                            testResult.is_match
                                                ? 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                                                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                                        }`}
                                    >
                                        {testResult.is_match ? (
                                            <CheckCircle2 className="size-6 text-green-600 shrink-0" />
                                        ) : (
                                            <AlertCircle className="size-6 text-red-600 shrink-0" />
                                        )}
                                        <div>
                                            <p className="font-bold">
                                                {testResult.is_match
                                                    ? 'ยืนยันตัวตนสำเร็จ! เอกลักษณ์เสียงตรงกับโปรไฟล์ของคุณ'
                                                    : 'ไม่ผ่านเกณฑ์การยืนยันตัวตน'}
                                            </p>
                                            <p className="text-xs opacity-85 mt-0.5">
                                                คะแนนความตรงกัน (Cosine Similarity):{' '}
                                                <span className="font-semibold">
                                                    {(testResult.similarity * 100).toFixed(1)}%
                                                </span>{' '}
                                                (เกณฑ์ความปลอดภัยขั้นต่ำ: {(testResult.threshold * 100).toFixed(1)}%)
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
