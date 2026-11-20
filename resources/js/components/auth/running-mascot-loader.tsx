import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface RunningMascotLoaderProps {
    open: boolean;
    title?: string;
    subtitle?: string;
    status?: 'loading' | 'success' | 'error';
    onClose?: () => void;
}

export function RunningMascotLoader({
    open,
    title = 'กำลังเข้าสู่ระบบ...',
    subtitle = 'ระบบกำลังตรวจสอบข้อมูลความปลอดภัยและเตรียมความพร้อม กรุณารอสักครู่',
    status = 'loading',
    onClose,
}: RunningMascotLoaderProps) {
    const [dots, setDots] = useState('');

    useEffect(() => {
        if (!open || status !== 'loading') return;
        const interval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
        }, 400);
        return () => clearInterval(interval);
    }, [open, status]);

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose && onClose()}>
            <DialogContent
                className="max-w-sm sm:max-w-md w-[92vw] p-0 overflow-hidden border-0 shadow-2xl rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl z-[9999] transition-all"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <div className="relative flex flex-col items-center justify-center p-6 sm:p-8 text-center select-none">
                    {/* Top ambient glow */}
                    <div
                        className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-40 pointer-events-none transition-colors duration-500 ${
                            status === 'success'
                                ? 'bg-emerald-400'
                                : status === 'error'
                                ? 'bg-rose-400'
                                : 'bg-blue-400'
                        }`}
                    />

                    {/* SVG Animation Container */}
                    <div className="relative w-48 h-44 mb-3 flex items-center justify-center">
                        <style>{`
                            @keyframes mascot-run-bounce {
                                0%, 100% { transform: translateY(0px) rotate(0deg); }
                                25% { transform: translateY(-8px) rotate(2deg); }
                                50% { transform: translateY(0px) rotate(0deg); }
                                75% { transform: translateY(-10px) rotate(-2deg); }
                            }
                            @keyframes leg-left-cycle {
                                0% { transform: rotate(-25deg); }
                                50% { transform: rotate(35deg); }
                                100% { transform: rotate(-25deg); }
                            }
                            @keyframes leg-right-cycle {
                                0% { transform: rotate(35deg); }
                                50% { transform: rotate(-25deg); }
                                100% { transform: rotate(35deg); }
                            }
                            @keyframes arm-left-swing {
                                0% { transform: rotate(35deg); }
                                50% { transform: rotate(-35deg); }
                                100% { transform: rotate(35deg); }
                            }
                            @keyframes arm-right-swing {
                                0% { transform: rotate(-35deg); }
                                50% { transform: rotate(35deg); }
                                100% { transform: rotate(-35deg); }
                            }
                            @keyframes speed-dash {
                                0% { stroke-dashoffset: 0; }
                                100% { stroke-dashoffset: -60; }
                            }
                            @keyframes dust-puff {
                                0% { transform: scale(0.3) translateX(0); opacity: 0.8; }
                                100% { transform: scale(1.4) translateX(-30px); opacity: 0; }
                            }
                            @keyframes mascot-cheer {
                                0%, 100% { transform: translateY(0) scale(1); }
                                50% { transform: translateY(-12px) scale(1.05); }
                            }
                            @keyframes star-twinkle {
                                0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
                                50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
                            }
                            .animate-mascot-run {
                                animation: mascot-run-bounce 0.45s ease-in-out infinite;
                                transform-origin: 50% 85%;
                            }
                            .animate-mascot-cheer {
                                animation: mascot-cheer 0.6s ease-in-out infinite;
                            }
                            .animate-leg-l {
                                animation: leg-left-cycle 0.45s ease-in-out infinite;
                                transform-origin: 85px 115px;
                            }
                            .animate-leg-r {
                                animation: leg-right-cycle 0.45s ease-in-out infinite;
                                transform-origin: 105px 115px;
                            }
                            .animate-arm-l {
                                animation: arm-left-swing 0.45s ease-in-out infinite;
                                transform-origin: 75px 82px;
                            }
                            .animate-arm-r {
                                animation: arm-right-swing 0.45s ease-in-out infinite;
                                transform-origin: 115px 82px;
                            }
                            .animate-speed-track {
                                stroke-dasharray: 12, 10;
                                animation: speed-dash 0.5s linear infinite;
                            }
                            .animate-dust-1 {
                                animation: dust-puff 0.5s ease-out infinite;
                                transform-origin: 70px 135px;
                            }
                            .animate-dust-2 {
                                animation: dust-puff 0.5s ease-out infinite 0.25s;
                                transform-origin: 70px 135px;
                            }
                        `}</style>

                        {status === 'loading' ? (
                            <svg
                                viewBox="0 0 200 160"
                                className="w-full h-full drop-shadow-md overflow-visible"
                            >
                                {/* Speed wind lines */}
                                <g opacity="0.5" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="20" y1="40" x2="60" y2="40" className="animate-speed-track" />
                                    <line x1="10" y1="70" x2="50" y2="70" className="animate-speed-track" />
                                    <line x1="25" y1="100" x2="65" y2="100" className="animate-speed-track" />
                                </g>

                                {/* Moving road ground */}
                                <line
                                    x1="20"
                                    y1="140"
                                    x2="180"
                                    y2="140"
                                    stroke="#cbd5e1"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    className="animate-speed-track"
                                />

                                {/* Running dust clouds */}
                                <circle cx="68" cy="133" r="6" fill="#cbd5e1" className="animate-dust-1" />
                                <circle cx="62" cy="136" r="4" fill="#e2e8f0" className="animate-dust-2" />

                                {/* Mascot Body + Head + Limbs Group */}
                                <g className="animate-mascot-run">
                                    {/* Left Leg (back) */}
                                    <g className="animate-leg-l">
                                        <rect x="80" y="112" width="10" height="24" rx="5" fill="#1e3a8a" />
                                        {/* Shoe */}
                                        <path d="M78 132 h16 a4 4 0 0 1 4 4 v2 h-20 z" fill="#ef4444" />
                                    </g>

                                    {/* Left Arm (back) */}
                                    <g className="animate-arm-l">
                                        <rect x="70" y="80" width="9" height="22" rx="4.5" fill="#e2e8f0" />
                                        {/* Hand / glove */}
                                        <circle cx="74.5" cy="103" r="5" fill="#fde047" />
                                    </g>

                                    {/* Body (Doctor Coat & scrubs) */}
                                    {/* Inner medical shirt */}
                                    <rect x="83" y="78" width="26" height="38" rx="8" fill="#0284c7" />
                                    {/* Stethoscope */}
                                    <path
                                        d="M90 78 C90 92 102 92 102 78"
                                        fill="none"
                                        stroke="#475569"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                    />
                                    <circle cx="96" cy="94" r="3" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />

                                    {/* White Doctor Coat */}
                                    <path
                                        d="M82 78 h9 v36 h-9 a4 4 0 0 1 -4 -4 v-28 a4 4 0 0 1 4 -4 z"
                                        fill="#ffffff"
                                        stroke="#e2e8f0"
                                        strokeWidth="1.5"
                                    />
                                    <path
                                        d="M101 78 h9 a4 4 0 0 1 4 4 v28 a4 4 0 0 1 -4 4 h-9 z"
                                        fill="#ffffff"
                                        stroke="#e2e8f0"
                                        strokeWidth="1.5"
                                    />

                                    {/* Right Leg (front) */}
                                    <g className="animate-leg-r">
                                        <rect x="100" y="112" width="10" height="24" rx="5" fill="#2563eb" />
                                        {/* Shoe */}
                                        <path d="M98 132 h16 a4 4 0 0 1 4 4 v2 h-20 z" fill="#dc2626" />
                                    </g>

                                    {/* Head (Cute Mascot Bear / Doctor) */}
                                    <circle cx="96" cy="54" r="23" fill="#fed7aa" stroke="#fdba74" strokeWidth="1" />
                                    {/* Cheeks */}
                                    <circle cx="83" cy="58" r="4" fill="#fca5a5" opacity="0.6" />
                                    <circle cx="109" cy="58" r="4" fill="#fca5a5" opacity="0.6" />

                                    {/* Eyes (happy determined runner) */}
                                    <path
                                        d="M87 50 Q91 46 95 50"
                                        fill="none"
                                        stroke="#1e293b"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d="M99 50 Q103 46 107 50"
                                        fill="none"
                                        stroke="#1e293b"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                    />

                                    {/* Smile */}
                                    <path
                                        d="M93 58 Q97 64 101 58"
                                        fill="none"
                                        stroke="#1e293b"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                    />

                                    {/* Doctor Nurse Cap with Cross */}
                                    <path
                                        d="M82 36 Q96 29 110 36 v-6 a4 4 0 0 0 -4 -4 H86 a4 4 0 0 0 -4 4 z"
                                        fill="#ffffff"
                                        stroke="#e2e8f0"
                                        strokeWidth="1"
                                    />
                                    {/* Red Cross */}
                                    <path
                                        d="M96 27 v6 M93 30 h6"
                                        stroke="#ef4444"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                    />

                                    {/* Right Arm (front) */}
                                    <g className="animate-arm-r">
                                        <rect x="112" y="80" width="9" height="22" rx="4.5" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
                                        {/* Hand */}
                                        <circle cx="116.5" cy="103" r="5" fill="#fde047" />
                                    </g>
                                </g>
                            </svg>
                        ) : status === 'success' ? (
                            <div className="relative flex flex-col items-center justify-center animate-mascot-cheer">
                                {/* Success mascot illustration */}
                                <svg viewBox="0 0 160 150" className="w-36 h-36 drop-shadow-lg">
                                    {/* Stars popping */}
                                    <path d="M25 35 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" fill="#fbbf24" style={{ animation: 'star-twinkle 1s ease-in-out infinite' }} />
                                    <path d="M135 40 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" fill="#34d399" style={{ animation: 'star-twinkle 1s ease-in-out infinite 0.3s' }} />

                                    {/* Body */}
                                    <rect x="66" y="70" width="28" height="38" rx="8" fill="#059669" />
                                    {/* White coat open */}
                                    <path d="M64 70 h8 v38 h-8 z" fill="#ffffff" />
                                    <path d="M88 70 h8 v38 h-8 z" fill="#ffffff" />

                                    {/* Head */}
                                    <circle cx="80" cy="46" r="23" fill="#fed7aa" />
                                    {/* Cheeks */}
                                    <circle cx="67" cy="50" r="4" fill="#fca5a5" opacity="0.8" />
                                    <circle cx="93" cy="50" r="4" fill="#fca5a5" opacity="0.8" />
                                    {/* Happy Eyes */}
                                    <path d="M71 43 Q75 38 79 43" fill="none" stroke="#065f46" strokeWidth="3" strokeLinecap="round" />
                                    <path d="M83 43 Q87 38 91 43" fill="none" stroke="#065f46" strokeWidth="3" strokeLinecap="round" />
                                    {/* Big smile */}
                                    <path d="M74 50 Q80 58 86 50" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />

                                    {/* Doctor Cap */}
                                    <path d="M68 28 h24 a3 3 0 0 1 3 3 v4 H65 v-4 a3 3 0 0 1 3 -3 z" fill="#ffffff" />
                                    <path d="M80 29 v5 M77.5 31.5 h5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />

                                    {/* Cheering Arms raised up */}
                                    <rect x="48" y="55" width="8" height="22" rx="4" fill="#ffffff" transform="rotate(-40 52 66)" />
                                    <circle cx="44" cy="50" r="5" fill="#fde047" />

                                    <rect x="104" y="55" width="8" height="22" rx="4" fill="#ffffff" transform="rotate(40 108 66)" />
                                    <circle cx="116" cy="50" r="5" fill="#fde047" />

                                    {/* Feet */}
                                    <rect x="68" y="108" width="10" height="18" rx="5" fill="#047857" />
                                    <rect x="82" y="108" width="10" height="18" rx="5" fill="#047857" />
                                    <path d="M65 124 h15 v3 h-15 z" fill="#ef4444" />
                                    <path d="M80 124 h15 v3 h-15 z" fill="#ef4444" />
                                </svg>
                                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1.5 shadow-lg animate-bounce">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-rose-500">
                                <AlertCircle className="w-20 h-20 animate-pulse" />
                            </div>
                        )}
                    </div>

                    {/* Dialog Titles */}
                    <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1.5">
                        <span>{title}</span>
                        {status === 'loading' && <span className="inline-block w-6 text-left text-blue-500 font-extrabold">{dots}</span>}
                    </DialogTitle>

                    <DialogDescription className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 max-w-xs leading-relaxed">
                        {subtitle}
                    </DialogDescription>

                    {/* Shimmering Progress Bar */}
                    {status === 'loading' && (
                        <div className="w-full mt-6 bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden relative shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400 rounded-full animate-pulse transition-all duration-300"
                                style={{ width: '100%' }}
                            />
                            <div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.5s_infinite]"
                                style={{
                                    backgroundImage:
                                        'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)',
                                    animation: 'shimmer 1.5s infinite',
                                }}
                            />
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="w-full mt-6 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-2xl py-2 px-3 text-sm font-semibold flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> เข้าสู่ระบบเรียบร้อยแล้ว กำลังนำทางไปหน้าหลัก
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
