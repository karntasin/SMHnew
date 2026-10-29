import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Smartphone,
    Download,
    Share,
    PlusSquare,
    Bell,
    CheckCircle2,
    Volume2,
    AlertTriangle,
    ShieldCheck,
    Info,
} from 'lucide-react';
import { playChimeSound } from '@/lib/notification-sound';
import { updateAppBadge } from '@/lib/app-badge';

interface PwaInstallModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PwaInstallModal({
    isOpen,
    onClose,
}: PwaInstallModalProps) {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [badgeTested, setBadgeTested] = useState(false);
    const [isSecureContext, setIsSecureContext] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isSecure = window.location.protocol === 'https:' ||
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1';
            setIsSecureContext(isSecure);

            if (window.matchMedia('(display-mode: standalone)').matches) {
                setIsInstalled(true);
            }
        }

        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsInstalled(true);
                setDeferredPrompt(null);
            }
            return;
        }

        alert('เพื่อติดตั้งแอป:\n\n• สำหรับ Android (Chrome): แตะที่เมนู 3 จุด (มุมขวาบน) แล้วเลือก "ติดตั้งแอป" หรือ "เพิ่มลงหน้าจอหลัก"\n\n• สำหรับ iPhone (Safari): แตะปุ่มแชร์ (สี่เหลี่ยมลูกศรชี้ขึ้น) แล้วเลือก "เพิ่มไปยังหน้าจอโฮม"');
    };

    const handleTestFeatures = () => {
        playChimeSound(true);
        updateAppBadge(3);
        setBadgeTested(true);
        setTimeout(() => {
            setBadgeTested(false);
        }, 4000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl rounded-2xl max-sm:p-4">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
                        <Smartphone className="h-5 w-5 text-sky-600" />
                        ติดตั้งแอป "ปฏิทิน SMH" บนโทรศัพท์มือถือ
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-1 text-sm text-slate-600 dark:text-slate-300">
                    {/* App Showcase Card */}
                    <div className="flex items-center gap-3.5 rounded-2xl border border-sky-300 bg-linear-to-r from-sky-50 via-white to-sky-50/50 p-3.5 shadow-xs dark:border-sky-800 dark:from-slate-900 dark:to-slate-900">
                        <img
                            src="/icons/calendar-192.png"
                            alt="ปฏิทิน SMH"
                            className="h-14 w-14 shrink-0 rounded-2xl shadow-md shadow-sky-600/30 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                                    ปฏิทิน SMH
                                </h4>
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    แยกแอปอิสระ
                                </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                ติดตั้งเป็นอีกหนึ่งแอปบนหน้าจอมือถือ ไม่ทับกับแอปหลัก SMH หรือ S-Chat
                            </p>
                        </div>
                    </div>
                    {/* Security warning if accessed over plain HTTP on LAN IP */}
                    {!isSecureContext && (
                        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold">คำแนะนำการติดตั้งผ่านระบบความปลอดภัย:</span>
                                    <p className="mt-1 leading-relaxed text-amber-800 dark:text-amber-300">
                                        เบราว์เซอร์บนมือถือ (Chrome และ Safari) กำหนดให้เว็บที่จะติดตั้งเป็นแอปต้องเชื่อมต่อผ่าน <b>HTTPS/SSL</b> หรือ <b>localhost</b> เท่านั้น หากท่านเปิดผ่านหมายเลข IP เครื่อง (เช่น http://192.168...) ปุ่มดาวน์โหลดอัตโนมัติอาจไม่แสดง <u>แต่ท่านสามารถติดตั้งได้ทันทีผ่านเมนู 'เพิ่มลงหน้าจอหลัก'</u> ตามวิธีด้านล่างครับ
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Features list */}
                    <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-3.5 dark:border-sky-950 dark:bg-sky-950/20">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-sky-900 dark:text-sky-200">
                                คุณสมบัติเมื่อติดตั้งลงหน้าจอโฮม:
                            </span>
                            {isInstalled && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                    ติดตั้งแล้ว
                                </span>
                            )}
                        </div>

                        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span>เปิดเต็มหน้าจอ ไร้แถบ URL รบกวน</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span>จุดแดงแจ้งเตือนบนไอคอน (App Badge)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span>เสียงเตือนนุ่มนวลแบบโรงพยาบาล</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span>เปิดตารางงานได้ทันทีจากหน้าจอหลัก</span>
                            </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-sky-200/60 flex items-center justify-between">
                            <span className="text-xs text-sky-800 dark:text-sky-300">
                                ทดสอบเสียง & จุดแดงบนไอคอน:
                            </span>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleTestFeatures}
                                className="rounded-xl border-sky-300 bg-white text-xs font-medium text-sky-900 shadow-xs hover:bg-sky-100 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200"
                            >
                                <Volume2 className="mr-1.5 h-3.5 w-3.5 text-sky-600" />
                                {badgeTested ? 'ทดสอบแล้ว!' : 'ทดสอบเสียง & จุดแดง'}
                            </Button>
                        </div>
                    </div>

                    {/* Step-by-Step Installation for Android & Apple */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Android Chrome */}
                        <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 dark:text-white">
                                    สำหรับ Android (Chrome)
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800">
                                    Google
                                </span>
                            </div>
                            <ol className="mt-2 space-y-1.5 text-xs text-slate-500 list-decimal list-inside leading-relaxed">
                                <li>แตะเมนู <b>⋮ (3 จุด)</b> ที่มุมขวาบนของ Chrome</li>
                                <li>เลือก <b>"ติดตั้งแอป"</b> หรือ <b>"เพิ่มลงในหน้าจอหลัก"</b></li>
                                <li>กด <b>"ติดตั้ง"</b> จะได้ไอคอนแอปบนหน้าจอมือถือทันที</li>
                            </ol>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleInstallClick}
                                className="mt-3 w-full rounded-xl bg-sky-600 text-white shadow-xs hover:bg-sky-700 text-xs"
                            >
                                <Download className="mr-1.5 h-3.5 w-3.5" />
                                กดติดตั้งลง Android
                            </Button>
                        </div>

                        {/* Apple iOS Safari */}
                        <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 dark:text-white">
                                    สำหรับ iPhone / iPad (Safari)
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800">
                                    Apple
                                </span>
                            </div>
                            <ol className="mt-2 space-y-1.5 text-xs text-slate-500 list-decimal list-inside leading-relaxed">
                                <li>เปิดระบบนี้ในเบราว์เซอร์ <b>Safari</b></li>
                                <li>แตะปุ่ม <b>แชร์ (Share)</b> <Share className="inline h-3 w-3 text-sky-600 mx-0.5" /> ด้านล่าง</li>
                                <li>เลื่อนลงมาแตะเลือก <b>"เพิ่มไปยังหน้าจอโฮม"</b> <PlusSquare className="inline h-3 w-3 text-emerald-600 mx-0.5" /></li>
                                <li>กดปุ่ม <b>"เพิ่ม (Add)"</b> ที่มุมขวาบน</li>
                            </ol>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    >
                        ปิดหน้าต่าง
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
