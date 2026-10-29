import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    Volume2,
    VolumeX,
    Smartphone,
    Share2,
    Filter,
    Search,
    X,
    ExternalLink,
    Building2,
    MessageCircle,
} from 'lucide-react';
import { CalendarScope } from '@/types/calendar';
import { isSoundMuted, setSoundMuted, playChimeSound } from '@/lib/notification-sound';

interface MobileHeaderProps {
    activeScope: CalendarScope | 'all';
    onScopeChange: (scope: CalendarScope | 'all') => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
    canViewHospital: boolean;
    onOpenGoogleSyncModal: () => void;
    onOpenPwaModal: () => void;
    eventCounts: { all: number; personal: number; hospital: number; hr: number };
}

export default function MobileHeader({
    activeScope,
    onScopeChange,
    searchQuery,
    onSearchChange,
    canViewHospital,
    onOpenGoogleSyncModal,
    onOpenPwaModal,
    eventCounts,
}: MobileHeaderProps) {
    const [muted, setMuted] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        setMuted(isSoundMuted());
        if (typeof window !== 'undefined') {
            const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true;
            setIsStandalone(standalone);
        }
    }, []);

    const toggleSound = () => {
        const next = !muted;
        setMuted(next);
        setSoundMuted(next);
        if (!next) {
            playChimeSound(true);
        }
    };

    return (
        <div className="space-y-2.5 lg:hidden">
            {/* Top Multi-App Switcher (เมื่อเปิดเป็นแอปเฉพาะ หรือเปิดบนมือถือ) */}
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {isStandalone ? 'แอปปฏิทิน SMH (Standalone)' : 'SMH Ecosystem'}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                    <a
                        href="/dashboard"
                        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                        title="กลับสู่เว็บหลัก SMH"
                    >
                        <Building2 className="h-3 w-3 text-purple-600" />
                        เว็บ SMH
                    </a>
                    <a
                        href="/s-chat"
                        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                        title="เปิดแอปแชท S-Chat"
                    >
                        <MessageCircle className="h-3 w-3 text-sky-600" />
                        S-Chat
                    </a>
                </div>
            </div>

            {/* Main Mobile App Brand Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <img
                        src="/icons/calendar-192.png"
                        alt="ปฏิทิน SMH"
                        className="h-10 w-10 rounded-2xl shadow-md shadow-sky-600/25 object-cover"
                        onError={(e) => {
                            // Fallback if image fails
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">
                                ปฏิทิน SMH
                            </h1>
                            <span className="rounded-full bg-sky-100 px-1.5 py-0.2 text-[9px] font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                                APP
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            รพ.ค่ายสุรสิงหนาท
                        </p>
                    </div>
                </div>

                {/* Quick Action Icons */}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setShowSearch(!showSearch)}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 shadow-2xs transition-colors dark:border-slate-800 ${
                            showSearch || searchQuery ? 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'
                        }`}
                        title="ค้นหากิจกรรม"
                    >
                        <Search className="h-4 w-4" />
                    </button>

                    <button
                        type="button"
                        onClick={toggleSound}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                        title={muted ? 'เปิดเสียงเตือน' : 'ปิดเสียงเตือน'}
                    >
                        {muted ? (
                            <VolumeX className="h-4 w-4 text-rose-500" />
                        ) : (
                            <Volume2 className="h-4 w-4 text-emerald-600" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={onOpenGoogleSyncModal}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-sky-600 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                        title="Google / Apple Calendar Sync"
                    >
                        <Share2 className="h-4 w-4" />
                    </button>

                    <button
                        type="button"
                        onClick={onOpenPwaModal}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-amber-600 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                        title="ติดตั้งแอปปฏิทินแยกต่างหาก"
                    >
                        <Smartphone className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Expandable Search Input on Mobile */}
            {(showSearch || searchQuery) && (
                <div className="relative animate-in fade-in slide-in-from-top-1 duration-150">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="พิมพ์เพื่อค้นหากิจกรรม, สถานที่..."
                        className="h-10 w-full rounded-xl border border-sky-300 bg-white pl-9 pr-9 text-xs text-slate-800 shadow-sm focus:border-sky-500 focus:outline-hidden dark:border-sky-800 dark:bg-slate-900 dark:text-slate-200"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => onSearchChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            )}

            {/* Horizontal Scrollable Scope Chips */}
            <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 py-1">
                <button
                    type="button"
                    onClick={() => onScopeChange('all')}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                        activeScope === 'all'
                            ? 'bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900'
                            : 'bg-white border border-slate-200/80 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
                    }`}
                >
                    <Filter className="h-3 w-3" />
                    ทั้งหมด
                    <span className="ml-0.5 rounded-full bg-slate-200/60 px-1.5 py-0.2 text-[10px] dark:bg-slate-700">
                        {eventCounts.all}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => onScopeChange('personal')}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                        activeScope === 'personal'
                            ? 'bg-sky-600 text-white shadow-xs shadow-sky-600/30'
                            : 'bg-white border border-slate-200/80 text-sky-700 dark:bg-slate-900 dark:border-slate-800 dark:text-sky-300'
                    }`}
                >
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    ส่วนตัว
                    <span className="ml-0.5 rounded-full bg-sky-100 px-1.5 py-0.2 text-[10px] text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                        {eventCounts.personal}
                    </span>
                </button>

                {canViewHospital && (
                    <button
                        type="button"
                        onClick={() => onScopeChange('hospital')}
                        className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                            activeScope === 'hospital'
                                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                                : 'bg-white border border-slate-200/80 text-emerald-700 dark:bg-slate-900 dark:border-slate-800 dark:text-emerald-300'
                        }`}
                    >
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        ภาพรวม รพ.
                        <span className="ml-0.5 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {eventCounts.hospital}
                        </span>
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => onScopeChange('hr')}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                        activeScope === 'hr'
                            ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/30'
                            : 'bg-white border border-slate-200/80 text-rose-700 dark:bg-slate-900 dark:border-slate-800 dark:text-rose-300'
                    }`}
                >
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    งาน HR
                    <span className="ml-0.5 rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        {eventCounts.hr}
                    </span>
                </button>
            </div>
        </div>
    );
}
