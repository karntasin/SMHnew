import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Camera,
    Loader2,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    ShieldCheck,
    RefreshCw,
    Search,
    User as UserIcon,
    X,
    Fingerprint,
    Smartphone,
    Eye,
    ScanFace,
    ChevronDown,
    ChevronUp,
    ShieldAlert,
    HelpCircle,
    Sliders,
    Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { isPlatformBiometricAvailable, authenticateNativePasskey, formatBiometricError } from '@/lib/webauthn-client';
import { detectFace, loadFaceApiModels, captureFaceSnapshot, requestCameraStream } from '@/lib/face-detector';
import PermissionGuideDialog, { detectDeviceOS, DeviceOS } from '@/components/biometrics/permission-guide-dialog';
import { RunningMascotLoader } from '@/components/auth/running-mascot-loader';

interface FaceLoginModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultIdentifier?: string;
}

interface UserSuggestion {
    id: number;
    display_name: string;
    name: string;
    email: string;
    username: string | null;
    has_face: boolean;
    auth_mode?: string;
    device_name?: string;
    credential_id?: string;
}

export default function FaceLoginModal({
    open,
    onOpenChange,
    defaultIdentifier = '',
}: FaceLoginModalProps) {
    const [identifier, setIdentifier] = useState(defaultIdentifier);
    const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);
    const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
    const [searching, setSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showNameFilter, setShowNameFilter] = useState(Boolean(defaultIdentifier));
    const [isInsecureHttp, setIsInsecureHttp] = useState(false);

    // Platform Biometrics (Apple Face ID / Android)
    const [platformSupport, setPlatformSupport] = useState<{
        supported: boolean;
        deviceType: string;
        label: string;
    }>({ supported: false, deviceType: 'generic', label: 'ชีวมิติ' });

    // Active mode: 'camera' (AI Webcam) or 'native' (Face ID / Passkey)
    // Default to 'camera' for face scanning without asking for username
    const [activeMode, setActiveMode] = useState<'camera' | 'native'>('camera');

    // Camera states
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [permissionGuideOS, setPermissionGuideOS] = useState<DeviceOS>('android');
    const [modelsReady, setModelsReady] = useState(false);
    const [livenessStage, setLivenessStage] = useState<'waiting_face' | 'waiting_blink' | 'blink_detected' | 'verifying'>('waiting_face');
    const [blinkCount, setBlinkCount] = useState(0);

    // Processing & verification result
    const [processing, setProcessing] = useState(false);
    const [challengeToken, setChallengeToken] = useState<string | null>(null);
    const [challengeBase64, setChallengeBase64] = useState<string | null>(null);
    const [verificationResult, setVerificationResult] = useState<{
        success: boolean;
        message: string;
        distance?: number;
    } | null>(null);

    // Live AI Face Tracking Coordinates for Real-Time HUD
    const [detectedBox, setDetectedBox] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
        score: number;
    } | null>(null);

    const [mascotLoader, setMascotLoader] = useState<{
        open: boolean;
        title: string;
        subtitle: string;
        status: 'loading' | 'success' | 'error';
    }>({
        open: false,
        title: 'กำลังสแกนใบหน้า...',
        subtitle: 'ระบบกำลังดึงข้อมูลเวกเตอร์ชีวมิติและตรวจสอบความถูกต้อง กรุณารอสักครู่',
        status: 'loading',
    });

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const isBlinkingRef = useRef(false);
    const blinkHistoryRef = useRef<number[]>([]);
    const isVerifyingRef = useRef(false);

    // Detect device OS for tailored permission instructions
    useEffect(() => {
        setPermissionGuideOS(detectDeviceOS());
        if (typeof window !== 'undefined') {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (!window.isSecureContext && !isLocal) {
                setIsInsecureHttp(true);
            }
        }
    }, [open]);

    // Check platform biometrics support & prioritize Native Mobile Mode on mobile phones
    useEffect(() => {
        isPlatformBiometricAvailable().then((res) => {
            setPlatformSupport(res);
            const isMobileDevice = typeof navigator !== 'undefined' && /iphone|ipad|ipod|android/i.test(navigator.userAgent);
            if (res.supported && isMobileDevice) {
                setActiveMode('native');
            }
        });
    }, []);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initial load
    useEffect(() => {
        if (open) {
            const initialId = defaultIdentifier || identifier;
            if (initialId) {
                setIdentifier(initialId);
                setShowNameFilter(true);
                fetchChallenge(initialId);
            } else {
                fetchChallenge('');
            }
        } else {
            stopCamera();
            setVerificationResult(null);
            setCameraPermissionDenied(false);
        }
    }, [open]);

    // Live search users
    const handleIdentifierChange = (val: string) => {
        setIdentifier(val);
        setSelectedUser(null);
        setVerificationResult(null);

        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }

        const trimmed = val.trim();
        if (trimmed.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        searchDebounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/auth/face/search-users?q=${encodeURIComponent(trimmed)}`);
                const data = await res.json();
                setSuggestions(data.users || []);
                setShowSuggestions(true);
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setSearching(false);
            }
        }, 300);
    };

    const selectUserSuggestion = (u: UserSuggestion) => {
        setSelectedUser(u);
        setIdentifier(u.email || u.username || u.name);
        setShowSuggestions(false);
        fetchChallenge(u.email || u.username || u.name);

        if (u.auth_mode === 'native_passkey' && platformSupport.supported) {
            setActiveMode('native');
        } else if (u.auth_mode === 'ai_camera') {
            setActiveMode('camera');
        }
    };

    const clearSelectedUser = () => {
        setIdentifier('');
        setSelectedUser(null);
        setSuggestions([]);
        fetchChallenge('');
    };

    const fetchChallenge = async (id?: string) => {
        try {
            const queryId = id !== undefined ? id : identifier;
            const url = queryId ? `/auth/face/challenge?identifier=${encodeURIComponent(queryId.trim())}` : '/auth/face/challenge';
            const res = await fetch(url);
            const data = await res.json();

            if (data.success && data.challenge) {
                setChallengeToken(data.challenge.token);
                setChallengeBase64(data.challenge.challenge);

                if (data.matched_user && !selectedUser) {
                    setSelectedUser(data.matched_user);
                }
            }
        } catch (err) {
            console.error('Fetch challenge error:', err);
        }
    };

    // Native Apple Face ID / Android Passkey Login (Usernameless or 1:1)
    const handleNativeBiometricLogin = async () => {
        if (!challengeToken || !challengeBase64) {
            toast.error('ไม่พบรหัส Challenge กรุณารอสักครู่');
            fetchChallenge();
            return;
        }

        setProcessing(true);
        setVerificationResult(null);

        try {
            const assertion = await authenticateNativePasskey({
                challenge: challengeBase64,
                allowCredentialId: selectedUser?.credential_id,
            });

            const tokenMeta = document.querySelector('meta[name="csrf-token"]');
            const csrf = tokenMeta ? tokenMeta.getAttribute('content') : '';

            setMascotLoader({
                open: true,
                title: 'กำลังตรวจสอบสิทธิ์ชีวมิติ...',
                subtitle: 'ระบบกำลังตรวจสอบลายเซ็นดิจิทัลความปลอดภัยสูง กรุณารอสักครู่',
                status: 'loading',
            });

            const res = await fetch('/auth/face/passkey-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf || '',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    identifier: identifier.trim() || null,
                    challenge_token: challengeToken,
                    credential_id: assertion.credential_id,
                    client_data_json: assertion.client_data_json,
                    authenticator_data: assertion.authenticator_data,
                    signature: assertion.signature,
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setVerificationResult({
                    success: true,
                    message: data.message,
                });
                setMascotLoader({
                    open: true,
                    title: 'ยืนยันตัวตนสำเร็จ!',
                    subtitle: data.message || 'ตรวจพบข้อมูลชีวมิติถูกต้อง กำลังพาคุณเข้าสู่ระบบ...',
                    status: 'success',
                });
                toast.success(data.message);
                setTimeout(() => {
                    window.location.href = data.redirect_url || '/menus-hub';
                }, 1200);
            } else {
                setVerificationResult({
                    success: false,
                    message: data.message || 'ยืนยันตัวตนไม่สำเร็จ',
                });
                setMascotLoader({
                    open: true,
                    title: 'ยืนยันตัวตนไม่ผ่าน',
                    subtitle: data.message || 'การตรวจสอบลายเซ็นชีวมิติไม่ถูกต้อง',
                    status: 'error',
                });
                toast.error(data.message || 'การยืนยันตัวตนล้มเหลว');
                fetchChallenge();
                setTimeout(() => {
                    setMascotLoader((prev) => ({ ...prev, open: false }));
                }, 2200);
            }
        } catch (err: any) {
            console.error('Passkey login error:', err);
            const userMsg = formatBiometricError(err);
            setVerificationResult({
                success: false,
                message: userMsg,
            });
            setMascotLoader({
                open: true,
                title: 'เกิดข้อผิดพลาดในการตรวจสอบ',
                subtitle: userMsg,
                status: 'error',
            });
            toast.error(userMsg);
            fetchChallenge();
            setTimeout(() => {
                setMascotLoader((prev) => ({ ...prev, open: false }));
            }, 2200);
        } finally {
            setProcessing(false);
        }
    };

    // Start Webcam & Liveness loop (Auto Scan Face - No Name Required)
    const startCamera = async () => {
        isVerifyingRef.current = false;
        setIsCameraActive(true);
        setCameraPermissionDenied(false);
        setLivenessStage('waiting_face');
        setBlinkCount(0);
        blinkHistoryRef.current = [];

        try {
            // CRITICAL: Request camera stream immediately on user gesture to maintain transient user activation window
            // If we await model loading first, mobile browsers (iOS Safari & Android Chrome) expire user activation and block the permission prompt!
            const streamPromise = requestCameraStream('user');
            const modelsPromise = loadFaceApiModels();

            const stream = await streamPromise;
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }

            // Await AI models in parallel
            await modelsPromise;
            setModelsReady(true);
            runFaceDetectionLoop();
        } catch (err: any) {
            console.error('Webcam error:', err);
            setIsCameraActive(false);

            if (err.code === 'PERMISSION_DENIED') {
                setCameraPermissionDenied(true);
                setShowPermissionModal(true);
                toast.error('สิทธิ์การเข้าถึงกล้องถูกปฏิเสธ กรุณาอนุญาตการใช้งานกล้อง');
            } else if (err.code === 'INSECURE_CONTEXT' || err.code === 'UNSUPPORTED') {
                setCameraPermissionDenied(true);
                toast.error(err.message || 'จำเป็นต้องเข้าใช้งานผ่าน HTTPS');
            } else {
                toast.error(err.message || 'ไม่สามารถเปิดกล้องได้');
            }
        }
    };

    const stopCamera = () => {
        setDetectedBox(null);
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    };

    // Continuous Real-Time Liveness & Blink Detection
    const runFaceDetectionLoop = () => {
        let lastBlinkTime = 0;
        let centeredSince: number | null = null;

        const checkFrame = async () => {
            if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || isVerifyingRef.current) {
                return;
            }

            try {
                const res = await detectFace(videoRef.current, false);

                if (res.detected && res.box) {
                    setDetectedBox({
                        ...res.box,
                        score: res.score ?? 0.85,
                    });

                    if (livenessStage === 'waiting_face') {
                        setLivenessStage('waiting_blink');
                    }

                    if (!centeredSince) {
                        centeredSince = Date.now();
                    } else if (Date.now() - centeredSince > 800 && !isVerifyingRef.current) {
                        // User held face in frame for 0.8s -> trigger auto verification immediately!
                        setLivenessStage('blink_detected');
                        triggerCameraVerification();
                        return;
                    }

                    // Blink logic via Eye Aspect Ratio (EAR)
                    if (res.ear !== undefined) {
                        const ear = res.ear;
                        if (ear < 0.20 && !isBlinkingRef.current) {
                            isBlinkingRef.current = true;
                        } else if (ear > 0.25 && isBlinkingRef.current) {
                            isBlinkingRef.current = false;
                            const now = Date.now();
                            if (now - lastBlinkTime > 350 && !isVerifyingRef.current) {
                                lastBlinkTime = now;
                                setBlinkCount((prev) => {
                                    const next = prev + 1;
                                    if (next >= 1) {
                                        setLivenessStage('blink_detected');
                                        triggerCameraVerification();
                                    }
                                    return next;
                                });
                                return;
                            }
                        }
                    }
                } else {
                    setDetectedBox(null);
                    centeredSince = null;
                    if (livenessStage === 'waiting_blink' && !isVerifyingRef.current) {
                        setLivenessStage('waiting_face');
                    }
                }
            } catch (err) {
                console.error('Detection frame error:', err);
            }

            if (isCameraActive && !isVerifyingRef.current) {
                animFrameRef.current = requestAnimationFrame(checkFrame);
            }
        };

        animFrameRef.current = requestAnimationFrame(checkFrame);
    };

    // Extract descriptor and send to Laravel (1:N Auto-Identification or 1:1)
    const triggerCameraVerification = async () => {
        if (isVerifyingRef.current || !videoRef.current || !challengeToken) return;
        isVerifyingRef.current = true;

        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        setProcessing(true);
        setLivenessStage('verifying');
        setMascotLoader({
            open: true,
            title: 'กำลังสแกนใบหน้า...',
            subtitle: 'กำลังอ่านลักษณะเด่น 128 มิติจากกล้อง กรุณารอสักครู่',
            status: 'loading',
        });

        try {
            // CRITICAL FIX: Extract descriptor and snapshot while video stream is running!
            const detailed = await detectFace(videoRef.current, true);
            const snapshot = captureFaceSnapshot(videoRef.current, detailed?.box);

            // Now stop camera safely
            stopCamera();

            if (!detailed || !detailed.detected || !detailed.descriptor) {
                setMascotLoader({
                    open: true,
                    title: 'ตรวจจับใบหน้าไม่ชัดเจน',
                    subtitle: 'กรุณาจัดใบหน้าให้อยู่ตรงกลางกรอบแล้วลองใหม่อีกครั้ง',
                    status: 'error',
                });
                toast.error('ไม่สามารถตรวจจับใบหน้าได้ชัดเจน กรุณาลองใหม่อีกครั้ง');
                setTimeout(() => {
                    setMascotLoader((prev) => ({ ...prev, open: false }));
                    setProcessing(false);
                    isVerifyingRef.current = false;
                    startCamera();
                }, 2000);
                return;
            }

            setMascotLoader({
                open: true,
                title: 'กำลังตรวจสอบข้อมูลในระบบ...',
                subtitle: 'กำลังค้นหาและยืนยันตัวตนเจ้าหน้าที่ กรุณารอสักครู่',
                status: 'loading',
            });

            const tokenMeta = document.querySelector('meta[name="csrf-token"]');
            const csrf = tokenMeta ? tokenMeta.getAttribute('content') : '';

            const res = await fetch('/auth/face/camera-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf || '',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    identifier: identifier.trim() || null,
                    challenge_token: challengeToken,
                    vector: detailed.descriptor,
                    liveness_passed: true,
                    image: snapshot,
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setVerificationResult({
                    success: true,
                    message: data.message,
                    distance: data.distance,
                });
                setMascotLoader({
                    open: true,
                    title: 'ยืนยันตัวตนสำเร็จ!',
                    subtitle: data.message || 'ตรวจพบข้อมูลใบหน้าถูกต้อง กำลังนำทางเข้าสู่ระบบ...',
                    status: 'success',
                });
                toast.success(data.message);
                setTimeout(() => {
                    window.location.href = data.redirect_url || '/menus-hub';
                }, 1200);
            } else {
                setVerificationResult({
                    success: false,
                    message: data.message || 'ไม่พบข้อมูลใบหน้าที่ตรงกับเจ้าหน้าที่ในระบบ',
                    distance: data.distance,
                });
                setMascotLoader({
                    open: true,
                    title: 'ยืนยันตัวตนไม่ผ่าน',
                    subtitle: data.message || 'ไม่พบข้อมูลใบหน้าที่ตรงกับเจ้าหน้าที่ในระบบ',
                    status: 'error',
                });
                toast.error(data.message || 'การตรวจสอบใบหน้าไม่ผ่าน');
                fetchChallenge();
                setTimeout(() => {
                    setMascotLoader((prev) => ({ ...prev, open: false }));
                    setProcessing(false);
                    isVerifyingRef.current = false;
                    startCamera();
                }, 2500);
            }
        } catch (err: any) {
            console.error('Camera verify error:', err);
            setVerificationResult({
                success: false,
                message: 'เกิดข้อผิดพลาดในการตรวจสอบ: ' + (err.message || ''),
            });
            setMascotLoader({
                open: true,
                title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
                subtitle: err.message || 'กรุณาลองใหม่อีกครั้ง',
                status: 'error',
            });
            fetchChallenge();
            setTimeout(() => {
                setMascotLoader((prev) => ({ ...prev, open: false }));
                setProcessing(false);
                isVerifyingRef.current = false;
                startCamera();
            }, 2500);
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onOpenChange={(val) => {
                    if (!val) stopCamera();
                    onOpenChange(val);
                }}
            >
                <DialogContent className="sm:max-w-[520px] p-6 rounded-2xl border-2 dark:border-gray-800 shadow-2xl">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100">
                            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                                <ScanFace className="size-5" />
                            </div>
                            เข้าสู่ระบบด้วยใบหน้าและลายนิ้วมือ (Biometrics)
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
                            สแกนใบหน้าได้ทันทีโดยไม่ต้องระบุชื่อ หรือใช้ลายนิ้วมือบนโทรศัพท์มือถือ
                        </DialogDescription>
                    </DialogHeader>

                    {/* Mode Selector Tabs (Phone Native Biometrics vs AI Webcam) */}
                    <div className="flex items-center justify-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs gap-1 mt-1">
                        {platformSupport.supported && (
                            <button
                                type="button"
                                onClick={() => {
                                    stopCamera();
                                    setActiveMode('native');
                                }}
                                className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                                    activeMode === 'native'
                                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm font-semibold'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                <Smartphone className="size-3.5" />
                                <span>ระบบของโทรศัพท์ ({platformSupport.deviceType === 'apple' ? 'Face ID' : 'สแกนนิ้ว/หน้า'})</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setActiveMode('camera');
                            }}
                            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                                activeMode === 'camera'
                                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm font-semibold'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <Camera className="size-3.5" />
                            <span>กล้อง AI (Webcam)</span>
                        </button>
                    </div>

                    {/* Target Selected Banner if user selected a name */}
                    {identifier && (
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs">
                            <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                                <CheckCircle2 className="size-3.5 shrink-0" />
                                <span>กำลังยืนยันแบบเจาะจง: <strong>{identifier}</strong></span>
                            </div>
                            <button
                                type="button"
                                onClick={clearSelectedUser}
                                className="text-gray-400 hover:text-red-500 p-0.5"
                                title="สลับกลับเป็นโหมดสแกนอัตโนมัติ"
                            >
                                <X className="size-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Insecure HTTP Warning Banner */}
                    {isInsecureHttp && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-xs space-y-2">
                            <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200">
                                <ShieldAlert className="size-4 shrink-0 text-amber-600" />
                                ตรวจพบการเข้าใช้งานผ่าน HTTP (ไม่ใช่ HTTPS)
                            </div>
                            <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                เบราว์เซอร์บนมือถือและคอมพิวเตอร์จะเปิดให้ใช้กล้องและลายนิ้วมือเฉพาะบนการเชื่อมต่อที่ปลอดภัย (HTTPS) เท่านั้น
                            </p>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                    window.location.href = window.location.href.replace(/^http:/, 'https:');
                                }}
                                className="w-full h-8 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium shadow-sm"
                            >
                                <Lock className="size-3.5 mr-1.5" />
                                คลิกเพื่อสลับไปใช้งานผ่าน HTTPS ทันที
                            </Button>
                        </div>
                    )}

                    {/* AI Webcam Scanner Mode View */}
                    {activeMode === 'camera' && (
                        <div className="flex flex-col items-center justify-center space-y-3 pt-1">
                            {cameraPermissionDenied && (
                                <div className="w-full p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/60 text-left space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                                            <AlertCircle className="size-4 text-amber-600 shrink-0" />
                                            เบราว์เซอร์ยังไม่ได้รับอนุญาตให้ใช้กล้อง
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setShowPermissionModal(true)}
                                            className="text-[11px] h-7 text-amber-800 hover:text-amber-900 dark:text-amber-300 underline"
                                        >
                                            ดูวิธีเปิดสิทธิ์อย่างละเอียด
                                        </Button>
                                    </div>

                                    {/* Quick OS Switcher in alert */}
                                    <div className="flex items-center gap-1 bg-amber-100/60 dark:bg-amber-900/40 p-1 rounded-lg text-[11px]">
                                        <button
                                            type="button"
                                            onClick={() => setPermissionGuideOS('android')}
                                            className={`flex-1 py-1 rounded font-medium text-center transition-all ${
                                                permissionGuideOS === 'android'
                                                    ? 'bg-white dark:bg-gray-800 text-amber-900 dark:text-amber-200 shadow-sm'
                                                    : 'text-amber-700 dark:text-amber-400'
                                            }`}
                                        >
                                            บนมือถือ Android
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPermissionGuideOS('ios')}
                                            className={`flex-1 py-1 rounded font-medium text-center transition-all ${
                                                permissionGuideOS === 'ios'
                                                    ? 'bg-white dark:bg-gray-800 text-amber-900 dark:text-amber-200 shadow-sm'
                                                    : 'text-amber-700 dark:text-amber-400'
                                            }`}
                                        >
                                            บน iPhone / iPad
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPermissionGuideOS('desktop')}
                                            className={`flex-1 py-1 rounded font-medium text-center transition-all ${
                                                permissionGuideOS === 'desktop'
                                                    ? 'bg-white dark:bg-gray-800 text-amber-900 dark:text-amber-200 shadow-sm'
                                                    : 'text-amber-700 dark:text-amber-400'
                                            }`}
                                        >
                                            บนคอมพิวเตอร์
                                        </button>
                                    </div>

                                    <div className="text-[11px] text-gray-700 dark:text-gray-300 space-y-1 pl-1">
                                        {permissionGuideOS === 'android' && (
                                            <>
                                                <p>1. แตะไอคอน <strong>แม่กุญแจ 🔒</strong> ด้านบนช่อง URL</p>
                                                <p>2. แตะเมนู <strong>สิทธิ์ (Permissions)</strong></p>
                                                <p>3. เปิดสวิตช์อนุญาต <strong>กล้อง (Camera)</strong></p>
                                            </>
                                        )}
                                        {permissionGuideOS === 'ios' && (
                                            <>
                                                <p>1. แตะปุ่ม <strong>aA</strong> ข้างแถบ URL ด้านล่าง</p>
                                                <p>2. เลือก <strong>การตั้งค่าเว็บไซต์ (Website Settings)</strong></p>
                                                <p>3. เปลี่ยน <strong>กล้อง (Camera)</strong> เป็น <strong>อนุญาต (Allow)</strong></p>
                                            </>
                                        )}
                                        {permissionGuideOS === 'desktop' && (
                                            <>
                                                <p>1. คลิกไอคอนแม่กุญแจ 🔒 ข้าง URL ด้านบน</p>
                                                <p>2. เปิดสิทธิ์ <strong>กล้อง (Camera)</strong> ให้เป็น On / Allow</p>
                                            </>
                                        )}
                                    </div>

                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={startCamera}
                                        className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-medium"
                                    >
                                        <RefreshCw className="size-3.5 mr-1.5" />
                                        ลองขอสิทธิ์กล้องใหม่อีกครั้ง
                                    </Button>
                                </div>
                            )}

                            {isCameraActive ? (
                                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black shadow-inner flex items-center justify-center">
                                    <video
                                        ref={videoRef}
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover transform -scale-x-100"
                                    />

                                    {/* Real-time Dynamic AI Face Tracking Reticle */}
                                    {detectedBox && videoRef.current && (
                                        <div
                                            className="absolute border-2 border-emerald-400 bg-emerald-400/10 rounded-2xl pointer-events-none transition-all duration-75 shadow-[0_0_20px_rgba(52,211,153,0.5)] flex flex-col justify-between p-1.5 z-20"
                                            style={{
                                                left: `${((videoRef.current.videoWidth - (detectedBox.x + detectedBox.width)) / (videoRef.current.videoWidth || 640)) * 100}%`,
                                                top: `${(detectedBox.y / (videoRef.current.videoHeight || 480)) * 100}%`,
                                                width: `${(detectedBox.width / (videoRef.current.videoWidth || 640)) * 100}%`,
                                                height: `${(detectedBox.height / (videoRef.current.videoHeight || 480)) * 100}%`,
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow">
                                                    ✓ ตรวจพบใบหน้า {Math.round(detectedBox.score * 100)}%
                                                </span>
                                                <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div className="w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-400" />
                                                <div className="w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-400" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Oval Face HUD Guide */}
                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                        <div
                                            className={`w-52 h-64 rounded-[50%] border-4 transition-all duration-300 ${
                                                detectedBox
                                                    ? 'border-emerald-400 shadow-[0_0_35px_rgba(74,222,128,0.8)]'
                                                    : livenessStage === 'waiting_face'
                                                    ? 'border-yellow-400/80 animate-pulse shadow-[0_0_20px_rgba(250,204,21,0.5)]'
                                                    : 'border-blue-400 shadow-[0_0_25px_rgba(96,165,250,0.6)]'
                                            }`}
                                        />
                                    </div>

                                    {/* Liveness Step Overlay Text */}
                                    {detectedBox ? (
                                        <div className="absolute bottom-12 inset-x-4 bg-emerald-950/85 border border-emerald-500/50 backdrop-blur-md py-1.5 px-3 rounded-xl text-center text-emerald-200 text-xs font-semibold shadow-lg pointer-events-none animate-pulse">
                                            ✓ ล็อกตำแหน่งใบหน้าแล้ว กำลังสแกนอัตโนมัติ...
                                        </div>
                                    ) : (
                                        <div className="absolute bottom-12 inset-x-4 bg-black/75 backdrop-blur-md py-1.5 px-3 rounded-xl text-center text-white text-xs font-medium shadow-lg pointer-events-none">
                                            {livenessStage === 'waiting_face' && '⚠️ มองหน้าตรงที่กล้องเพื่อให้ AI ตรวจจับ'}
                                            {livenessStage === 'waiting_blink' && '👁️ กระพริบตา 1 ครั้ง หรือกดปุ่มด้านล่างเพื่อสแกน'}
                                            {livenessStage === 'blink_detected' && '✓ ตรวจพบใบหน้า กำลังสแกนเข้าสู่ระบบ...'}
                                            {livenessStage === 'verifying' && '⏳ กำลังค้นหาและเปรียบเทียบข้อมูลใบหน้า...'}
                                        </div>
                                    )}

                                    {/* Quick Manual Trigger Button */}
                                    <div className="absolute bottom-2 inset-x-4 flex items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => triggerCameraVerification()}
                                            disabled={processing}
                                            className="px-4 py-1.5 rounded-full bg-blue-600/90 hover:bg-blue-600 text-white font-medium text-xs shadow-lg backdrop-blur-sm transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Camera className="size-3.5" />
                                            <span>กดเพื่อสแกนเดี๋ยวนี้</span>
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={stopCamera}
                                        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                                    >
                                        <X className="size-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 px-4 rounded-2xl bg-gradient-to-b from-blue-50/70 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 border border-blue-100 dark:border-blue-900/40 w-full text-center space-y-4">
                                    <div className="size-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/25">
                                        <ScanFace className="size-10" />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
                                            สแกนใบหน้าอัตโนมัติ (ไม่ต้องระบุชื่อ)
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                                            เปิดกล้องแล้วมองหน้าตรง จากนั้นกระพริบตา 1 ครั้ง ระบบจะระบุตัวตนและเข้าสู่ระบบทันที
                                        </p>
                                    </div>

                                    <Button
                                        type="button"
                                        onClick={startCamera}
                                        disabled={processing}
                                        className="h-12 px-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/25 transition-transform hover:scale-105 active:scale-95"
                                    >
                                        <Camera className="size-5 mr-2" />
                                        เปิดกล้องสแกนใบหน้าทันที
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Native Apple Face ID / Android Passkey Mode View */}
                    {activeMode === 'native' && (
                        <div className="flex flex-col items-center justify-center py-7 px-5 rounded-2xl bg-gradient-to-b from-blue-50/80 via-indigo-50/40 to-white dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900 border-2 border-blue-200/80 dark:border-blue-800/60 text-center space-y-4 shadow-sm">
                            <div className="relative">
                                <div className="size-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 animate-pulse">
                                    {platformSupport.deviceType === 'apple' ? (
                                        <ScanFace className="size-11" />
                                    ) : (
                                        <Fingerprint className="size-11" />
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow">
                                    <ShieldCheck className="size-4" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                                    <Smartphone className="size-3.5" />
                                    <span>ระบบความปลอดภัยประจำโทรศัพท์มือถือ</span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    {platformSupport.deviceType === 'apple'
                                        ? 'Apple Face ID & Touch ID'
                                        : platformSupport.deviceType === 'android'
                                        ? 'Android Biometrics (สแกนนิ้ว/ใบหน้า)'
                                        : platformSupport.label}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                                    {platformSupport.deviceType === 'apple'
                                        ? 'สแกนใบหน้าด้วยเซนเซอร์ TrueDepth ของ iPhone / iPad หรือสแกนนิ้วมือบน Mac สะดวก รวดเร็ว แม้ในที่มืดสนิท'
                                        : 'แตะนิ้วบนเซนเซอร์สแกนลายนิ้วมือ หรือใช้ระบบสแกนใบหน้าของโทรศัพท์เพื่อเข้าสู่ระบบทันทีใน 0.2 วินาที'}
                                </p>
                            </div>

                            <Button
                                type="button"
                                onClick={handleNativeBiometricLogin}
                                disabled={processing}
                                className="w-full sm:w-auto h-13 px-8 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="size-5 animate-spin mr-2" />
                                        กำลังรอการยืนยันจากระบบโทรศัพท์...
                                    </>
                                ) : (
                                    <>
                                        <Fingerprint className="size-5 mr-2" />
                                        แตะเพื่อสแกนด้วยระบบของโทรศัพท์
                                    </>
                                )}
                            </Button>

                            <p className="text-[11px] text-gray-400 dark:text-gray-500 pt-1">
                                💡 หากเครื่องนี้ยังไม่ได้ลงทะเบียนชีวมิติ สามารถล็อกอินด้วยรหัสผ่าน แล้วเลือกผูกเครื่องได้ทันที
                            </p>
                        </div>
                    )}

                    {/* Collapsible: Manual 1:1 User Search Filter */}
                    <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={() => setShowNameFilter(!showNameFilter)}
                            className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 py-1 transition-colors"
                        >
                            <span className="flex items-center gap-1.5">
                                <Search className="size-3.5" />
                                {showNameFilter ? 'ซ่อนการค้นหาชื่อเจาะจง' : 'หรือต้องการค้นหาชื่อเพื่อสแกนแบบเจาะจง (1:1)'}
                            </span>
                            {showNameFilter ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                        </button>

                        {showNameFilter && (
                            <div className="space-y-2 pt-2 animate-fadeIn" ref={wrapperRef}>
                                <div className="relative">
                                    <Input
                                        id="face_identifier"
                                        type="text"
                                        value={identifier}
                                        onChange={(e) => handleIdentifierChange(e.target.value)}
                                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                        placeholder="พิมพ์ชื่อจริง, นามสกุล, username หรือ email..."
                                        className="pr-10 rounded-xl border-gray-300 dark:border-gray-700 focus:ring-blue-500 text-sm"
                                        disabled={processing || isCameraActive}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        {searching ? (
                                            <Loader2 className="size-4 animate-spin text-blue-500" />
                                        ) : identifier ? (
                                            <button
                                                type="button"
                                                onClick={clearSelectedUser}
                                                className="hover:text-gray-600 p-0.5"
                                            >
                                                <X className="size-4" />
                                            </button>
                                        ) : (
                                            <Search className="size-4" />
                                        )}
                                    </div>

                                    {/* Dropdown Suggestions */}
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                                            <div className="p-1.5 text-[11px] font-semibold text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-3">
                                                พบบัญชีผู้ใช้ {suggestions.length} รายการ
                                            </div>
                                            {suggestions.map((u) => (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    onClick={() => selectUserSuggestion(u)}
                                                    className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-between border-b last:border-b-0 border-gray-100 dark:border-gray-700/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 flex items-center justify-center shrink-0">
                                                            <UserIcon className="size-3.5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                                                {u.display_name}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400">
                                                                {u.email} {u.username ? `(@${u.username})` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                            u.has_face
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300'
                                                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                                        }`}
                                                    >
                                                        {u.has_face ? '✓ มีข้อมูลใบหน้า' : 'ยังไม่ลงทะเบียน'}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Verification Result Feedback */}
                    {verificationResult && (
                        <div
                            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                                verificationResult.success
                                    ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                                    : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                            }`}
                        >
                            {verificationResult.success ? (
                                <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-green-600" />
                            ) : (
                                <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-600" />
                            )}
                            <div className="flex-1">
                                <p className="font-semibold">{verificationResult.message}</p>
                                {typeof verificationResult.distance === 'number' && (
                                    <p className="mt-1 opacity-80">
                                        ระยะห่างเวกเตอร์: {verificationResult.distance.toFixed(3)}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Android & Apple Dedicated Permission Guide Dialog */}
            <PermissionGuideDialog
                open={showPermissionModal}
                onOpenChange={setShowPermissionModal}
                type="camera"
                onRetry={startCamera}
            />

            {/* Running Mascot Loading / Success Popup */}
            <RunningMascotLoader
                open={mascotLoader.open}
                title={mascotLoader.title}
                subtitle={mascotLoader.subtitle}
                status={mascotLoader.status}
                onClose={() => setMascotLoader((prev) => ({ ...prev, open: false }))}
            />
        </>
    );
}
