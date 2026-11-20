import React, { useState, useRef, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { BreadcrumbItem, SharedData } from '@/types';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
    Camera,
    CheckCircle2,
    ShieldCheck,
    AlertCircle,
    Loader2,
    RefreshCw,
    Trash2,
    Sparkles,
    Smartphone,
    Fingerprint,
    ScanFace,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { isPlatformBiometricAvailable, registerNativePasskey } from '@/lib/webauthn-client';
import { detectFace, loadFaceApiModels, captureFaceSnapshot } from '@/lib/face-detector';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'ยืนยันตัวตนด้วยใบหน้า / สแกนนิ้ว',
        href: '/settings/face',
    },
];

interface FaceData {
    is_enrolled: boolean;
    auth_mode?: string;
    device_name?: string;
    sample_count: number;
    similarity_baseline: number | null;
    face_image_url: string | null;
    last_authenticated_at: string | null;
    updated_at: string | null;
}

interface FaceSettingsProps {
    faceData: FaceData;
}

export default function FaceSettings({ faceData: initialFaceData }: FaceSettingsProps) {
    const { auth } = usePage<SharedData>().props;
    const [faceData, setFaceData] = useState<FaceData>(initialFaceData);

    // Platform biometrics detection
    const [platformSupport, setPlatformSupport] = useState<{
        supported: boolean;
        deviceType: string;
        label: string;
    }>({ supported: false, deviceType: 'generic', label: 'ชีวมิติ' });

    // Active enrollment mode: 'passkey' or 'camera'
    const [enrollMode, setEnrollMode] = useState<'passkey' | 'camera'>('passkey');

    // Camera enrollment wizard (3 steps: Front, Left, Right)
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0); // 0 = หน้าตรง, 1 = หันซ้ายเล็กน้อย, 2 = หันขวาเล็กน้อย
    const [capturedVectors, setCapturedVectors] = useState<number[][]>([]);
    const [capturedSnapshots, setCapturedSnapshots] = useState<string[]>([]);
    const [isCapturing, setIsCapturing] = useState(false);
    const [saving, setSaving] = useState(false);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const stepTitles = [
        'ขั้นตอนที่ 1: สแกนใบหน้าตรง (Front Face)',
        'ขั้นตอนที่ 2: เอียงศีรษะไปทางซ้ายเล็กน้อย (Slight Left)',
        'ขั้นตอนที่ 3: เอียงศีรษะไปทางขวาเล็กน้อย (Slight Right)',
    ];

    useEffect(() => {
        isPlatformBiometricAvailable().then((res) => {
            setPlatformSupport(res);
            if (res.supported) {
                setEnrollMode('passkey');
            } else {
                setEnrollMode('camera');
            }
        });

        return () => {
            stopCamera();
        };
    }, []);

    // Enroll with Apple Face ID / Android Passkey
    const handleRegisterPasskey = async () => {
        setSaving(true);
        try {
            // Get challenge
            const challengeRes = await fetch('/auth/face/challenge');
            const challengeData = await challengeRes.json();
            if (!challengeData.success || !challengeData.challenge) {
                throw new Error('ไม่สามารถรับ Challenge จากเซิร์ฟเวอร์ได้');
            }

            const registration = await registerNativePasskey({
                challenge: challengeData.challenge.challenge,
                user: {
                    id: auth.user.id,
                    name: auth.user.email || auth.user.username || auth.user.name,
                    displayName: auth.user.name,
                },
                rp: challengeData.challenge.rp,
            });

            const tokenMeta = document.querySelector('meta[name="csrf-token"]');
            const csrf = tokenMeta ? tokenMeta.getAttribute('content') : '';

            const res = await fetch('/settings/face/enroll-passkey', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf || '',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(registration),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setFaceData(data.faceData);
                toast.success(data.message);
            } else {
                toast.error(data.message || 'ลงทะเบียนไม่สำเร็จ');
            }
        } catch (err: any) {
            console.error('Passkey register error:', err);
            toast.error(err.message || 'การลงทะเบียนถูกยกเลิกหรือไม่สำเร็จ');
        } finally {
            setSaving(false);
        }
    };

    // Camera Wizard functions
    const startCamera = async () => {
        setIsCameraActive(true);
        setCurrentStep(0);
        setCapturedVectors([]);
        setCapturedSnapshots([]);

        try {
            toast.info('กำลังเปิดกล้อง...');
            await loadFaceApiModels();
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch (err: any) {
            console.error('Camera open error:', err);
            setIsCameraActive(false);
            toast.error('ไม่สามารถเปิดกล้องได้: ' + (err.message || ''));
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    };

    const captureCurrentAngle = async () => {
        if (!videoRef.current || isCapturing) return;

        setIsCapturing(true);
        try {
            const result = await detectFace(videoRef.current, true);
            if (!result.detected || !result.descriptor) {
                toast.error('ไม่พบใบหน้าหรือแสงสว่างไม่เพียงพอ กรุณาปรับมุมกล้อง');
                return;
            }

            const snapshot = captureFaceSnapshot(videoRef.current, result.box);

            const nextVectors = [...capturedVectors, result.descriptor];
            const nextSnapshots = [...capturedSnapshots, snapshot];

            setCapturedVectors(nextVectors);
            setCapturedSnapshots(nextSnapshots);

            if (currentStep < 2) {
                setCurrentStep((prev) => prev + 1);
                toast.success(`บันทึกมุมที่ ${currentStep + 1} สำเร็จ กรุณาเปลี่ยนท่าทาง`);
            } else {
                // All 3 angles captured, save to server
                stopCamera();
                saveCameraEnrollment(nextVectors, nextSnapshots[0]);
            }
        } catch (err: any) {
            console.error('Capture error:', err);
            toast.error('เกิดข้อผิดพลาดในการถ่ายภาพ: ' + err.message);
        } finally {
            setIsCapturing(false);
        }
    };

    const saveCameraEnrollment = async (vectors: number[][], mainImage: string) => {
        setSaving(true);
        try {
            const tokenMeta = document.querySelector('meta[name="csrf-token"]');
            const csrf = tokenMeta ? tokenMeta.getAttribute('content') : '';

            const res = await fetch('/settings/face/enroll-camera', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf || '',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    vectors,
                    image: mainImage,
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setFaceData(data.faceData);
                toast.success(data.message);
            } else {
                toast.error(data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลใบหน้า');
            }
        } catch (err: any) {
            console.error('Save camera error:', err);
            toast.error('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Delete Biometric Data
    const handleDelete = async () => {
        if (!confirm('คุณต้องการลบข้อมูลชีวมิติใบหน้านี้ออกจากระบบใช่หรือไม่?')) return;

        try {
            const tokenMeta = document.querySelector('meta[name="csrf-token"]');
            const csrf = tokenMeta ? tokenMeta.getAttribute('content') : '';

            const res = await fetch('/settings/face', {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': csrf || '',
                    'Accept': 'application/json',
                },
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setFaceData({
                    is_enrolled: false,
                    sample_count: 0,
                    similarity_baseline: null,
                    face_image_url: null,
                    last_authenticated_at: null,
                    updated_at: null,
                });
                toast.success(data.message);
            } else {
                toast.error('ลบข้อมูลไม่สำเร็จ');
            }
        } catch (err: any) {
            toast.error('เกิดข้อผิดพลาด: ' + err.message);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="ยืนยันตัวตนด้วยใบหน้าและลายนิ้วมือ" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="ระบบยืนยันตัวตนด้วยใบหน้าและลายนิ้วมือ (Biometrics)"
                        description="ลงทะเบียนสแกนลายนิ้วมือบนมือถือ Android, Apple Face ID / Touch ID หรือสแกนใบหน้าผ่านกล้องเว็บแคมเพื่อความสะดวกรวดเร็วในการเข้าสู่ระบบ"
                    />

                    {/* Current Status Card */}
                    <Card className="rounded-2xl border-2 dark:border-gray-800 shadow-sm overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-blue-50/60 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 border-b border-blue-100 dark:border-blue-900/40">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                            faceData.is_enrolled
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                        }`}
                                    >
                                        <ScanFace className="size-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-bold">
                                            สถานะการลงทะเบียนชีวมิติ
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            {faceData.is_enrolled
                                                ? `ลงทะเบียนแล้ว (${faceData.device_name || (faceData.auth_mode === 'ai_camera' ? 'กล้องเว็บแคม 3 มุม' : 'Apple Face ID / Android')})`
                                                : 'ยังไม่มีข้อมูลใบหน้าในระบบ'}
                                        </CardDescription>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                            faceData.is_enrolled
                                                ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300'
                                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                        }`}
                                    >
                                        {faceData.is_enrolled ? (
                                            <>
                                                <CheckCircle2 className="size-3.5" /> พร้อมใช้งาน 1:1
                                            </>
                                        ) : (
                                            'ยังไม่ลงทะเบียน'
                                        )}
                                    </span>

                                    {faceData.is_enrolled && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleDelete}
                                            className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/40"
                                        >
                                            <Trash2 className="size-3.5 mr-1" /> ลบข้อมูล
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>

                        {faceData.is_enrolled && (
                            <CardContent className="pt-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                        <span className="text-gray-400">โหมดการยืนยัน:</span>
                                        <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                                            {faceData.device_name || (faceData.auth_mode === 'ai_camera' ? 'AI Camera Vector' : 'Apple Face ID / Passkey')}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                        <span className="text-gray-400">เข้าสู่ระบบล่าสุดด้วยชีวมิติ:</span>
                                        <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                                            {faceData.last_authenticated_at
                                                ? new Date(faceData.last_authenticated_at).toLocaleString('th-TH')
                                                : 'ยังไม่เคยเข้าสู่ระบบ'}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                        <span className="text-gray-400">อัปเดตข้อมูลล่าสุด:</span>
                                        <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                                            {faceData.updated_at
                                                ? new Date(faceData.updated_at).toLocaleString('th-TH')
                                                : '-'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* Enrollment Section */}
                    <Card className="rounded-2xl border-2 dark:border-gray-800 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Sparkles className="size-5 text-blue-500" />
                                {faceData.is_enrolled ? 'ลงทะเบียนใหม่หรืออัปเดตอุปกรณ์' : 'เริ่มลงทะเบียนข้อมูลชีวมิติ'}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                เลือกวิธีการลงทะเบียนที่เหมาะสมกับอุปกรณ์ที่คุณกำลังใช้งาน
                            </CardDescription>

                            {/* Mode Tabs */}
                            {platformSupport.supported && (
                                <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs gap-1 mt-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            stopCamera();
                                            setEnrollMode('passkey');
                                        }}
                                        className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                                            enrollMode === 'passkey'
                                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <Smartphone className="size-4" />
                                        {platformSupport.label} (แนะนำสำหรับเครื่องนี้)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEnrollMode('camera')}
                                        className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                                            enrollMode === 'camera'
                                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <Camera className="size-4" />
                                        กล้องเว็บแคม (AI Face 3 มุม)
                                    </button>
                                </div>
                            )}
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {/* Option 1: Native Passkey */}
                            {enrollMode === 'passkey' && platformSupport.supported && (
                                <div className="p-6 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-center flex flex-col items-center space-y-4">
                                    <div className="size-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                                        <Fingerprint className="size-8" />
                                    </div>
                                    <div className="max-w-md">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            เชื่อมต่อกับ {platformSupport.label}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            บันทึกลายนิ้วมือหรือใบหน้าลงใน Secure Enclave / Keystore ของอุปกรณ์เครื่องนี้
                                            รองรับทั้งเซนเซอร์สแกนลายนิ้วมือที่หน้าจอ/ปุ่ม Power และสแกนใบหน้า
                                        </p>
                                    </div>

                                    <Button
                                        type="button"
                                        onClick={handleRegisterPasskey}
                                        disabled={saving}
                                        className="h-11 px-6 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-md shadow-blue-500/20"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="size-4 animate-spin mr-2" />
                                                กำลังรอการยืนยันจากระบบ...
                                            </>
                                        ) : (
                                            <>
                                                <Fingerprint className="size-4 mr-2" />
                                                ลงทะเบียนสแกนลายนิ้วมือ / Face ID บนอุปกรณ์นี้
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}

                            {/* Option 2: AI Camera Wizard */}
                            {enrollMode === 'camera' && (
                                <div className="space-y-4">
                                    {isCameraActive ? (
                                        <div className="space-y-4">
                                            <div className="relative w-full aspect-[4/3] max-w-md mx-auto rounded-2xl overflow-hidden bg-black shadow-lg flex items-center justify-center">
                                                <video
                                                    ref={videoRef}
                                                    playsInline
                                                    muted
                                                    className="w-full h-full object-cover transform -scale-x-100"
                                                />

                                                {/* Oval Guide */}
                                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                                    <div className="w-48 h-60 rounded-[50%] border-4 border-blue-400/90 shadow-[0_0_20px_rgba(96,165,250,0.6)] animate-pulse" />
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={stopCamera}
                                                    className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                                                >
                                                    <X className="size-4" />
                                                </button>
                                            </div>

                                            {/* Step Guidance */}
                                            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-center text-xs">
                                                <p className="font-bold text-blue-700 dark:text-blue-300">
                                                    {stepTitles[currentStep]}
                                                </p>
                                                <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                                                    จัดใบหน้าให้อยู่ในกรอบวงรี แล้วกดปุ่มถ่ายภาพ
                                                </p>
                                            </div>

                                            <div className="flex justify-center gap-3">
                                                <Button
                                                    type="button"
                                                    onClick={captureCurrentAngle}
                                                    disabled={isCapturing}
                                                    className="h-11 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-500/20"
                                                >
                                                    {isCapturing ? (
                                                        <>
                                                            <Loader2 className="size-4 animate-spin mr-2" />
                                                            กำลังวิเคราะห์ใบหน้า...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Camera className="size-4 mr-2" />
                                                            ถ่ายภาพมุมที่ {currentStep + 1}/3
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 text-center flex flex-col items-center space-y-4">
                                            <div className="size-16 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                                <Camera className="size-8" />
                                            </div>
                                            <div className="max-w-md">
                                                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                    สแกนใบหน้า 3 มุมด้วยกล้องเว็บแคม
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    ระบบจะถ่ายภาพ 3 มุม (หน้าตรง, เอียงซ้ายเล็กน้อย, เอียงขวาเล็กน้อย)
                                                    เพื่อคำนวณเวกเตอร์ใบหน้า 128 มิติที่แม่นยำสูง
                                                </p>
                                            </div>

                                            <Button
                                                type="button"
                                                onClick={startCamera}
                                                className="h-11 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-500/20"
                                            >
                                                <Camera className="size-4 mr-2" />
                                                เปิดกล้องเพื่อเริ่มสแกน 3 มุม
                                            </Button>
                                        </div>
                                    )}

                                    {/* Preview of captured angles */}
                                    {capturedSnapshots.length > 0 && (
                                        <div className="pt-2">
                                            <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                                ตัวอย่างมุมที่บันทึกแล้ว ({capturedSnapshots.length}/3):
                                            </h5>
                                            <div className="flex gap-3">
                                                {capturedSnapshots.map((snap, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="size-20 rounded-xl overflow-hidden border-2 border-blue-400 shadow-sm relative"
                                                    >
                                                        <img
                                                            src={snap}
                                                            alt={`มุมที่ ${idx + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
                                                            #{idx + 1}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
