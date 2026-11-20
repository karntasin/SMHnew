import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Camera,
    Mic,
    Smartphone,
    Apple,
    Laptop,
    RefreshCw,
    ShieldAlert,
    CheckCircle2,
    Lock,
    Settings,
    Sliders,
} from 'lucide-react';

export type PermissionType = 'camera' | 'microphone';
export type DeviceOS = 'android' | 'ios' | 'desktop';

interface PermissionGuideDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: PermissionType;
    onRetry?: () => void;
}

export function detectDeviceOS(): DeviceOS {
    if (typeof window === 'undefined') return 'desktop';
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/android/.test(ua)) return 'android';
    return 'desktop';
}

export default function PermissionGuideDialog({
    open,
    onOpenChange,
    type,
    onRetry,
}: PermissionGuideDialogProps) {
    const [selectedOS, setSelectedOS] = useState<DeviceOS>('android');

    useEffect(() => {
        setSelectedOS(detectDeviceOS());
    }, [open]);

    const isCamera = type === 'camera';
    const title = isCamera ? 'อนุญาตให้เข้าถึงกล้องถ่ายรูป' : 'อนุญาตให้เข้าถึงไมโครโฟน';
    const deviceName = isCamera ? 'กล้อง' : 'ไมโครโฟน';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] p-6 rounded-2xl border-2 dark:border-gray-800 shadow-2xl bg-white dark:bg-gray-900">
                <DialogHeader className="space-y-2 text-left">
                    <div className="flex items-center gap-3">
                        <div className="size-11 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                            {isCamera ? <Camera className="size-6" /> : <Mic className="size-6" />}
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                {title}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
                                จำเป็นต้องเปิดสิทธิ์การใช้งาน{deviceName} เพื่อความปลอดภัยในการยืนยันตัวตน
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* OS Switcher Tabs */}
                <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl text-xs gap-1 mt-2">
                    <button
                        type="button"
                        onClick={() => setSelectedOS('android')}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                            selectedOS === 'android'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm'
                                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <Smartphone className="size-3.5" />
                        Android
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedOS('ios')}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                            selectedOS === 'ios'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm'
                                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <span className="font-semibold text-xs leading-none"></span>
                        iPhone / iPad
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedOS('desktop')}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                            selectedOS === 'desktop'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm'
                                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <Laptop className="size-3.5" />
                        คอมพิวเตอร์
                    </button>
                </div>

                {/* OS-specific step guide */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 p-4 space-y-3 mt-1">
                    {selectedOS === 'android' && (
                        <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                <Lock className="size-3.5 text-blue-600" />
                                วิธีเปิดสิทธิ์บนโทรศัพท์ Android (Chrome / Samsung Internet):
                            </p>
                            <ol className="space-y-2 pl-1">
                                <li className="flex items-start gap-2">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                                        1
                                    </span>
                                    <span>
                                        สังเกตที่ <strong>แถบพิมพ์ที่อยู่เว็บ (URL)</strong> ด้านบน ให้แตะที่ไอคอน <strong>แม่กุญแจ 🔒</strong> หรือปุ่ม <strong>การตั้งค่าเว็บไซต์</strong>
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                                        2
                                    </span>
                                    <span>
                                        เลือกหัวข้อ <strong>สิทธิ์ (Permissions)</strong>
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                                        3
                                    </span>
                                    <span>
                                        เปิดสวิตช์อนุญาต <strong>{deviceName} (Allow)</strong>
                                    </span>
                                </li>
                            </ol>
                        </div>
                    )}

                    {selectedOS === 'ios' && (
                        <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                <Sliders className="size-3.5 text-purple-600" />
                                วิธีเปิดสิทธิ์บน iPhone / iPad (Safari):
                            </p>
                            <ol className="space-y-2 pl-1">
                                <li className="flex items-start gap-2">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                                        1
                                    </span>
                                    <span>
                                        ที่แถบค้นหา URL ด้านล่าง แตะที่ไอคอน <strong>aA</strong> หรือไอคอนตั้งค่าข้างชื่อเว็บ
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                                        2
                                    </span>
                                    <span>
                                        เลือกเมนู <strong>การตั้งค่าเว็บไซต์ (Website Settings)</strong>
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                                        3
                                    </span>
                                    <span>
                                        ที่หัวข้อ <strong>{deviceName} ({isCamera ? 'Camera' : 'Microphone'})</strong> ให้เลือกเป็น <strong>อนุญาต (Allow)</strong>
                                    </span>
                                </li>
                            </ol>
                        </div>
                    )}

                    {selectedOS === 'desktop' && (
                        <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                <Settings className="size-3.5 text-gray-600" />
                                วิธีเปิดสิทธิ์บนคอมพิวเตอร์ (Chrome / Edge / Safari):
                            </p>
                            <ol className="space-y-2 pl-1">
                                <li className="flex items-start gap-2">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-[10px]">
                                        1
                                    </span>
                                    <span>คลิกไอคอนรูปแม่กุญแจ 🔒 ด้านซ้ายสุดของช่องกรอก URL ด้านบน</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-[10px]">
                                        2
                                    </span>
                                    <span>เปิดสวิตช์อนุญาต <strong>{deviceName}</strong> ให้เป็น <strong>เปิด (On / Allow)</strong></span>
                                </li>
                            </ol>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="flex-1 rounded-xl text-xs h-10 border-gray-300 dark:border-gray-700"
                    >
                        ปิด
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            onOpenChange(false);
                            if (onRetry) onRetry();
                        }}
                        className="flex-1 rounded-xl text-xs h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-md shadow-blue-500/20"
                    >
                        <RefreshCw className="size-3.5 mr-1.5" />
                        ลองขอสิทธิ์ใหม่อีกครั้ง
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
