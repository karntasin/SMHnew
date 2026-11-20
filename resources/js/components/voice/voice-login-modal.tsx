import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Mic,
    MicOff,
    Loader2,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    Volume2,
    ShieldCheck,
    RefreshCw,
    Search,
    User as UserIcon,
    X,
} from 'lucide-react';
import AudioVisualizer from './audio-visualizer';
import { WavRecorder } from '@/lib/audio-recorder';
import { toast } from 'sonner';
import PermissionGuideDialog from '@/components/biometrics/permission-guide-dialog';
import { RunningMascotLoader } from '@/components/auth/running-mascot-loader';

interface VoiceLoginModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultIdentifier?: string;
}

interface ChallengeData {
    token: string;
    challenge_phrase: string;
    digits: string;
    expires_in: number;
}

interface UserSuggestion {
    id: number;
    display_name: string;
    name: string;
    email: string;
    username: string | null;
    has_voice: boolean;
}

export default function VoiceLoginModal({
    open,
    onOpenChange,
    defaultIdentifier = '',
}: VoiceLoginModalProps) {
    const [identifier, setIdentifier] = useState(defaultIdentifier);
    const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);
    const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
    const [searching, setSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [challenge, setChallenge] = useState<ChallengeData | null>(null);
    const [loadingChallenge, setLoadingChallenge] = useState(false);

    const [isRecording, setIsRecording] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [countdown, setCountdown] = useState(5);
    const [processing, setProcessing] = useState(false);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [verificationResult, setVerificationResult] = useState<{
        success: boolean;
        message: string;
        similarity?: number;
        threshold?: number;
    } | null>(null);

    const [mascotLoader, setMascotLoader] = useState<{
        open: boolean;
        title: string;
        subtitle: string;
        status: 'loading' | 'success' | 'error';
    }>({
        open: false,
        title: 'กำลังตรวจสอบข้อมูลเสียง...',
        subtitle: 'ระบบ AI กำลังเปรียบเทียบลายพิมพ์เสียง (Voiceprint) กรุณารอสักครู่',
        status: 'loading',
    });

    const recorderRef = useRef<WavRecorder | null>(null);
    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
    const speechRecognitionRef = useRef<any>(null);
    const transcribedTextRef = useRef<string>('');
    const isRecordingRef = useRef(false);
    const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

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
                fetchChallenge(initialId);
            } else {
                fetchChallenge('');
            }
        } else {
            resetState();
        }
    }, [open, defaultIdentifier]);

    const resetState = () => {
        stopRecording(false);
        setVerificationResult(null);
        setProcessing(false);
        setCountdown(5);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    // Live search debounced
    const handleIdentifierChange = (value: string) => {
        setIdentifier(value);
        setSelectedUser(null);
        setVerificationResult(null);

        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }

        if (value.trim().length >= 2) {
            setSearching(true);
            searchDebounceRef.current = setTimeout(async () => {
                try {
                    const res = await fetch(`/auth/voice/search-users?q=${encodeURIComponent(value.trim())}`);
                    const data = await res.json();
                    setSuggestions(data.users || []);
                    setShowSuggestions(true);
                } catch {
                    setSuggestions([]);
                } finally {
                    setSearching(false);
                }
            }, 250);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
            setSearching(false);
        }
    };

    const handleSelectUser = (user: UserSuggestion) => {
        setSelectedUser(user);
        setIdentifier(user.display_name);
        setShowSuggestions(false);
        fetchChallenge(user.display_name);

        if (!user.has_voice) {
            toast.warning('ผู้ใช้นี้ยังไม่ได้ลงทะเบียนเสียงในระบบ');
        }
    };

    const fetchChallenge = async (targetId?: string) => {
        const idToUse = targetId !== undefined ? targetId : identifier;
        setLoadingChallenge(true);
        setVerificationResult(null);

        try {
            const url = `/auth/voice/challenge${idToUse ? `?identifier=${encodeURIComponent(idToUse.trim())}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success && data.challenge) {
                setChallenge(data.challenge);
                if (data.matched_user) {
                    setSelectedUser(data.matched_user);
                }
            } else {
                toast.error('ไม่สามารถรับรหัสคำสั่งเสียงได้');
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoadingChallenge(false);
        }
    };

    const startRecording = async () => {
        if (!challenge) {
            toast.error('กรุณารอโหลดรหัสคำสั่งเสียงสักครู่');
            return;
        }

        if (!identifier.trim()) {
            toast.error('กรุณาระบุชื่อเจ้าหน้าที่ หรืออีเมลก่อน');
            return;
        }

        if (selectedUser && !selectedUser.has_voice) {
            toast.error('ผู้ใช้นี้ยังไม่ได้ลงทะเบียนเสียงในระบบ กรุณาเข้าสู่ระบบด้วยรหัสผ่านเพื่อลงทะเบียนก่อน');
            return;
        }

        try {
            setVerificationResult(null);
            transcribedTextRef.current = '';

            // Optional Thai Speech Recognition for Liveness
            const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRec) {
                try {
                    const recognition = new SpeechRec();
                    recognition.lang = 'th-TH';
                    recognition.continuous = false;
                    recognition.interimResults = false;
                    recognition.onresult = (e: any) => {
                        const transcript = e.results[0]?.[0]?.transcript || '';
                        transcribedTextRef.current = transcript;
                    };
                    recognition.start();
                    speechRecognitionRef.current = recognition;
                } catch {}
            }

            const recorder = new WavRecorder();
            recorderRef.current = recorder;
            const audioStream = await recorder.start();
            isRecordingRef.current = true;
            setStream(audioStream);
            setIsRecording(true);
            setCountdown(5);

            countdownTimerRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        stopRecording(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err: any) {
            isRecordingRef.current = false;
            setIsRecording(false);
            const msg = err.message || '';
            if (
                msg.includes('ปฏิเสธ') ||
                msg.includes('Permission') ||
                msg.includes('NotAllowed') ||
                err.name === 'NotAllowedError' ||
                err.name === 'PermissionDeniedError'
            ) {
                setShowPermissionModal(true);
            }
            toast.error('ไม่สามารถเข้าถึงไมโครโฟนได้: ' + (err.message || ''));
        }
    };

    const stopRecording = async (shouldSubmit = true) => {
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }

        if (speechRecognitionRef.current) {
            try {
                speechRecognitionRef.current.stop();
            } catch {}
            speechRecognitionRef.current = null;
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
            const wavBlob = await recorder.stop();

            if (shouldSubmit) {
                await submitVoiceAudio(wavBlob);
            }
        } catch (err: any) {
            console.error('Stop recording error:', err);
        }
    };

    const submitVoiceAudio = async (audioBlob: Blob) => {
        if (!challenge) return;
        setProcessing(true);
        setMascotLoader({
            open: true,
            title: 'กำลังวิเคราะห์เสียง...',
            subtitle: 'ระบบ AI กำลังเปรียบเทียบลายพิมพ์เสียงกับฐานข้อมูล กรุณารอสักครู่',
            status: 'loading',
        });

        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice_login.wav');
        formData.append('challenge_token', challenge.token);
        formData.append('spoken_text', transcribedTextRef.current);
        formData.append('identifier', identifier.trim());

        try {
            const tokenMeta = document.querySelector('meta[name="csrf-token"]');
            const csrf = tokenMeta ? tokenMeta.getAttribute('content') : '';

            const res = await fetch('/auth/voice/login', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrf || '',
                    'Accept': 'application/json',
                },
                body: formData,
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setVerificationResult({
                    success: true,
                    message: data.message,
                    similarity: data.similarity,
                    threshold: data.threshold,
                });
                setMascotLoader({
                    open: true,
                    title: 'ยืนยันตัวตนสำเร็จ!',
                    subtitle: data.message || 'ตรวจพบลายพิมพ์เสียงถูกต้อง กำลังนำทางเข้าสู่ระบบ...',
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
                    similarity: data.similarity,
                    threshold: data.threshold,
                });
                setMascotLoader({
                    open: true,
                    title: 'ยืนยันตัวตนไม่ผ่าน',
                    subtitle: data.message || 'ลายพิมพ์เสียงไม่ตรงกับเจ้าหน้าที่ในระบบ',
                    status: 'error',
                });
                toast.error(data.message || 'ยืนยันตัวตนด้วยเสียงไม่สำเร็จ');
                fetchChallenge();
                setTimeout(() => {
                    setMascotLoader((prev) => ({ ...prev, open: false }));
                }, 2200);
            }
        } catch (err: any) {
            setVerificationResult({
                success: false,
                message: 'เกิดข้อผิดพลาดในการส่งข้อมูลเสียง: ' + (err.message || ''),
            });
            setMascotLoader({
                open: true,
                title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
                subtitle: err.message || 'กรุณาลองใหม่อีกครั้ง',
                status: 'error',
            });
            toast.error('การเชื่อมต่อขัดข้อง');
            fetchChallenge();
            setTimeout(() => {
                setMascotLoader((prev) => ({ ...prev, open: false }));
            }, 2200);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl border-2 dark:border-gray-800 shadow-2xl">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100">
                        <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                            <ShieldCheck className="size-5" />
                        </div>
                        ยืนยันตัวบุคคลด้วยเสียง (1:1 Voice Verification)
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                        ค้นหาชื่อ-สกุล อีเมล หรือชื่อผู้ใช้ แล้วอ่านรหัสคำสั่งเสียงเพื่อเข้าสู่ระบบ
                    </DialogDescription>
                </DialogHeader>

                {/* 1:1 Identifier Search Area with Live Auto-Suggest */}
                <div ref={wrapperRef} className="relative space-y-1.5 pt-2">
                    <Label htmlFor="voice-identifier" className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                        <span>ค้นหาบัญชีผู้ใช้ (ชื่อจริง, นามสกุล, อีเมล หรือชื่อผู้ใช้)</span>
                        {searching && (
                            <span className="text-[11px] text-purple-600 flex items-center gap-1 font-normal">
                                <Loader2 className="size-3 animate-spin" /> กำลังค้นหา...
                            </span>
                        )}
                    </Label>

                    <div className="relative">
                        <Input
                            id="voice-identifier"
                            type="text"
                            value={identifier}
                            onChange={(e) => handleIdentifierChange(e.target.value)}
                            onFocus={() => {
                                if (suggestions.length > 0) setShowSuggestions(true);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setShowSuggestions(false);
                                    fetchChallenge(identifier);
                                }
                            }}
                            placeholder="พิมพ์ชื่อจริง, นามสกุล, อีเมล หรือ username..."
                            disabled={isRecording || processing}
                            className="h-11 pl-9 pr-9 rounded-xl border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                        <Search className="size-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

                        {identifier && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIdentifier('');
                                    setSelectedUser(null);
                                    setSuggestions([]);
                                    setShowSuggestions(false);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="size-4" />
                            </button>
                        )}
                    </div>

                    {/* Auto-suggest Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                            <div className="p-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                ผลการค้นหาเจ้าหน้าที่ ({suggestions.length})
                            </div>
                            {suggestions.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => handleSelectUser(user)}
                                    className="w-full text-left px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center justify-between transition-colors border-b last:border-b-0 border-gray-50 dark:border-gray-700/50"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="size-7 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                                            <UserIcon className="size-3.5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                {user.display_name}
                                            </p>
                                            <p className="text-[11px] text-gray-500">
                                                {user.email || user.username || ''}
                                            </p>
                                        </div>
                                    </div>

                                    {user.has_voice ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                            <CheckCircle2 className="size-3" />
                                            มีข้อมูลเสียง
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-700">
                                            ยังไม่ลงทะเบียนเสียง
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Matched User Confirmation Card */}
                    {selectedUser && (
                        <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                            selectedUser.has_voice
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                                : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                        }`}>
                            <div className="flex items-center gap-2">
                                <UserIcon className="size-4 shrink-0" />
                                <div>
                                    <span className="font-bold">{selectedUser.display_name}</span>
                                    <span className="opacity-75 block text-[11px]">
                                        {selectedUser.has_voice ? '✓ พร้อมยืนยันตัวตนด้วยเสียงแบบ 1:1' : '⚠️ ยังไม่ได้ลงทะเบียนเสียงในระบบ'}
                                    </span>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedUser(null);
                                    setIdentifier('');
                                }}
                                className="h-6 px-2 text-xs"
                            >
                                เปลี่ยน
                            </Button>
                        </div>
                    )}
                </div>

                {/* Challenge Phrase Card */}
                <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20 relative">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
                            <Volume2 className="size-3.5" />
                            รหัสคำสั่งเสียงที่ต้องอ่านออกเสียง:
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => fetchChallenge(identifier)}
                            disabled={loadingChallenge || isRecording || processing}
                            className="h-6 px-2 text-xs text-gray-500 hover:text-purple-600"
                        >
                            <RefreshCw className={`size-3 mr-1 ${loadingChallenge ? 'animate-spin' : ''}`} />
                            เปลี่ยนรหัส
                        </Button>
                    </div>

                    {loadingChallenge ? (
                        <div className="h-14 flex items-center justify-center">
                            <Loader2 className="size-5 animate-spin text-purple-500" />
                        </div>
                    ) : (
                        <div className="text-center py-2 px-3 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-purple-100 dark:border-purple-900/30">
                            <p className="text-base font-bold text-gray-900 dark:text-white leading-relaxed">
                                "{challenge?.challenge_phrase || 'กรุณาระบุชื่อผู้ใช้...'}"
                            </p>
                        </div>
                    )}
                </div>

                {/* Visualizer & Record Area */}
                <div className="flex flex-col items-center justify-center space-y-3 pt-1">
                    <AudioVisualizer stream={stream} isRecording={isRecording} className="w-full h-20" barColor="#a855f7" />

                    {isRecording ? (
                        <div className="flex flex-col items-center space-y-2">
                            <Button
                                type="button"
                                onClick={() => stopRecording(true)}
                                className="size-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 animate-pulse flex items-center justify-center p-0"
                            >
                                <MicOff className="size-7" />
                            </Button>
                            <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                                กำลังบันทึกเสียง... ({countdown}s) กดเพื่อส่งทันที
                            </span>
                        </div>
                    ) : processing ? (
                        <div className="flex flex-col items-center space-y-2 py-2">
                            <Loader2 className="size-10 animate-spin text-purple-600 dark:text-purple-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">
                                กำลังเปรียบเทียบเสียงกับโปรไฟล์ผู้ใช้ 1:1...
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center space-y-2">
                            <Button
                                type="button"
                                onClick={startRecording}
                                disabled={loadingChallenge || !identifier.trim() || (selectedUser !== null && !selectedUser.has_voice)}
                                className="h-12 px-6 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-lg shadow-purple-600/25 transition-transform hover:scale-105 disabled:opacity-50"
                            >
                                <Mic className="size-5 mr-2" />
                                เริ่มอ่านข้อความเพื่อเข้าสู่ระบบ
                            </Button>
                            <span className="text-[11px] text-gray-400">
                                {selectedUser && !selectedUser.has_voice
                                    ? 'บัญชีนี้ยังไม่มีข้อมูลเสียงในระบบ'
                                    : 'กดปุ่มแล้วอ่านข้อความด้านบนให้ชัดเจนภายใน 5 วินาที'}
                            </span>
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
                            {typeof verificationResult.similarity === 'number' && (
                                <p className="mt-1 opacity-80">
                                    คะแนนความตรงกัน: {(verificationResult.similarity * 100).toFixed(1)}% (เกณฑ์ความปลอดภัย:{' '}
                                    {((verificationResult.threshold ?? 0.70) * 100).toFixed(1)}%)
                                </p>
                            )}
                        </div>
                    </div>
                )}
                {/* Android & Apple Dedicated Permission Guide Dialog */}
                <PermissionGuideDialog
                    open={showPermissionModal}
                    onOpenChange={setShowPermissionModal}
                    type="microphone"
                    onRetry={startRecording}
                />

                {/* Running Mascot Loading / Success Popup */}
                <RunningMascotLoader
                    open={mascotLoader.open}
                    title={mascotLoader.title}
                    subtitle={mascotLoader.subtitle}
                    status={mascotLoader.status}
                    onClose={() => setMascotLoader((prev) => ({ ...prev, open: false }))}
                />
            </DialogContent>
        </Dialog>
    );
}
