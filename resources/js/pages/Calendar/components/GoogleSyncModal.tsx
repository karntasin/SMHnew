import React, { useState } from 'react';
import axios from 'axios';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Share2,
    Copy,
    Check,
    Download,
    Calendar,
    Smartphone,
    Globe,
    ExternalLink,
    Upload,
    ArrowDownToLine,
    ArrowUpFromLine,
    Loader2,
} from 'lucide-react';

interface GoogleSyncModalProps {
    isOpen: boolean;
    onClose: () => void;
    feedUrl: string;
    onImportSuccess?: () => void;
}

export default function GoogleSyncModal({
    isOpen,
    onClose,
    feedUrl,
    onImportSuccess,
}: GoogleSyncModalProps) {
    const [activeTab, setActiveTab] = useState<'sync' | 'import'>('sync');
    const [copied, setCopied] = useState(false);

    // Import state
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importUrl, setImportUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importMessage, setImportMessage] = useState<string | null>(null);
    const [importError, setImportError] = useState<string | null>(null);

    // WebCal scheme for Apple & Google 1-click
    const webcalUrl = feedUrl.replace(/^https?:\/\//i, 'webcal://');
    const googleOneClickUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(feedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleImportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!importFile && !importUrl.trim()) return;

        setIsImporting(true);
        setImportMessage(null);
        setImportError(null);

        try {
            const formData = new FormData();
            if (importFile) {
                formData.append('ics_file', importFile);
            } else if (importUrl.trim()) {
                formData.append('ics_url', importUrl.trim());
            }

            const response = await axios.post('/calendar/import-ics', formData);
            if (response.data.success) {
                setImportMessage(response.data.message || 'นำเข้ากิจกรรมเรียบร้อยแล้ว');
                setImportFile(null);
                setImportUrl('');
                if (onImportSuccess) {
                    onImportSuccess();
                }
            }
        } catch (err: any) {
            setImportError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการนำเข้าปฏิทิน');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl rounded-2xl max-sm:p-4">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
                        <Share2 className="h-5 w-5 text-sky-600" />
                        เชื่อมต่อปฏิทิน Google, Apple & มือถือ
                    </DialogTitle>
                </DialogHeader>

                {/* Tab Switcher */}
                <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                    <button
                        type="button"
                        onClick={() => setActiveTab('sync')}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                            activeTab === 'sync'
                                ? 'bg-white text-sky-700 shadow-2xs dark:bg-slate-900 dark:text-sky-300'
                                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                        }`}
                    >
                        <ArrowUpFromLine className="h-3.5 w-3.5" />
                        1-Click ซิงค์ไปมือถือ / Google / Apple
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('import')}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                            activeTab === 'import'
                                ? 'bg-white text-sky-700 shadow-2xs dark:bg-slate-900 dark:text-sky-300'
                                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                        }`}
                    >
                        <ArrowDownToLine className="h-3.5 w-3.5" />
                        ดึงข้อมูลจากภายนอกเข้ามา (Import)
                    </button>
                </div>

                {/* Tab 1: 1-Click Sync & Subscribe */}
                {activeTab === 'sync' && (
                    <div className="space-y-4 pt-1 text-sm text-slate-600 dark:text-slate-300">
                        {/* 1-Click Quick Action Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Apple 1-click */}
                            <a
                                href={webcalUrl}
                                className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 transition-all hover:bg-emerald-100/70 active:scale-[0.98] dark:border-emerald-900 dark:bg-emerald-950/30"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Smartphone className="h-5 w-5 text-emerald-600 shrink-0" />
                                    <div>
                                        <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                                            iPhone / iPad / Mac
                                        </div>
                                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                            แตะ 1 ครั้ง เปิดแอป Calendar ทันที
                                        </div>
                                    </div>
                                </div>
                                <ExternalLink className="h-4 w-4 text-emerald-600" />
                            </a>

                            {/* Google 1-click */}
                            <a
                                href={googleOneClickUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between rounded-2xl border border-sky-200 bg-sky-50/70 p-3.5 transition-all hover:bg-sky-100/70 active:scale-[0.98] dark:border-sky-900 dark:bg-sky-950/30"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Globe className="h-5 w-5 text-sky-600 shrink-0" />
                                    <div>
                                        <div className="text-xs font-bold text-sky-950 dark:text-sky-200">
                                            Google Calendar
                                        </div>
                                        <div className="text-[11px] text-sky-700 dark:text-sky-400">
                                            คลิกเดียว เพิ่มปฏิทินอัตโนมัติ
                                        </div>
                                    </div>
                                </div>
                                <ExternalLink className="h-4 w-4 text-sky-600" />
                            </a>
                        </div>

                        {/* iCal Subscription URL */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    หรือคัดลอกลิงก์ iCal Feed ไปใส่ด้วยตนเอง:
                                </span>
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                                    Live Sync
                                </span>
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                                <input
                                    readOnly
                                    value={feedUrl}
                                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleCopy}
                                    className="rounded-xl bg-sky-600 text-white shadow-xs hover:bg-sky-700 text-xs h-8"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="mr-1 h-3.5 w-3.5" />
                                            คัดลอกแล้ว
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="mr-1 h-3.5 w-3.5" />
                                            คัดลอก
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 2: Inward Pull / Import Calendar */}
                {activeTab === 'import' && (
                    <form onSubmit={handleImportSubmit} className="space-y-4 pt-1 text-xs text-slate-600 dark:text-slate-300">
                        <p className="text-slate-500">
                            ดึงกิจกรรมและตารางนัดหมายจาก Google Calendar หรือ Apple iCloud เข้ามาแสดงในปฏิทินส่วนตัวของท่าน:
                        </p>

                        {/* Option A: Upload .ics file */}
                        <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <span className="font-bold text-slate-800 dark:text-white block mb-1">
                                วิธีที่ 1: อัปโหลดไฟล์ .ics จาก Google/Apple Calendar
                            </span>
                            <input
                                type="file"
                                accept=".ics,text/calendar"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setImportFile(e.target.files[0]);
                                        setImportUrl('');
                                    }
                                }}
                                className="mt-1 block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 dark:file:bg-sky-950 dark:file:text-sky-300"
                            />
                        </div>

                        {/* Option B: iCal URL */}
                        <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <span className="font-bold text-slate-800 dark:text-white block mb-1">
                                วิธีที่ 2: วาง Secret iCal URL จาก Google Calendar
                            </span>
                            <input
                                type="text"
                                value={importUrl}
                                onChange={(e) => {
                                    setImportUrl(e.target.value);
                                    setImportFile(null);
                                }}
                                placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                                className="mt-1 h-9 w-full rounded-xl border border-slate-300 bg-transparent px-3 text-xs shadow-2xs focus:border-sky-500 focus:outline-hidden dark:border-slate-700"
                            />
                            <span className="mt-1 block text-[10px] text-slate-400">
                                (ดูได้จาก การตั้งค่า Google Calendar &gt; ที่อยู่ลับในรูปแบบ iCal)
                            </span>
                        </div>

                        {/* Feedback alerts */}
                        {importMessage && (
                            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1.5 font-semibold">
                                <Check className="h-4 w-4 text-emerald-600" />
                                <span>{importMessage}</span>
                            </div>
                        )}

                        {importError && (
                            <div className="rounded-xl bg-rose-50 p-2.5 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                                ❌ {importError}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isImporting || (!importFile && !importUrl.trim())}
                            className="w-full rounded-xl bg-sky-600 text-white shadow-md shadow-sky-600/20 hover:bg-sky-700"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                    กำลังดึงข้อมูล...
                                </>
                            ) : (
                                <>
                                    <Download className="mr-1.5 h-4 w-4" />
                                    เริ่มนำเข้าข้อมูลปฏิทิน
                                </>
                            )}
                        </Button>
                    </form>
                )}

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
