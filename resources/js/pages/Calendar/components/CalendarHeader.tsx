import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Volume2,
    VolumeX,
    Smartphone,
    Share2,
    Filter,
    Search,
    X,
} from 'lucide-react';
import { CalendarScope } from '@/types/calendar';
import { isSoundMuted, setSoundMuted, playChimeSound } from '@/lib/notification-sound';

interface CalendarHeaderProps {
    currentDate: Date;
    viewMode: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
    activeScope: CalendarScope | 'all';
    searchQuery: string;
    onSearchChange: (q: string) => void;
    canViewHospital: boolean;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onViewChange: (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => void;
    onScopeChange: (scope: CalendarScope | 'all') => void;
    onOpenCreateModal: () => void;
    onOpenGoogleSyncModal: () => void;
    onOpenPwaModal: () => void;
    eventCounts: { all: number; personal: number; hospital: number; hr: number };
}

const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function CalendarHeader({
    currentDate,
    viewMode,
    activeScope,
    searchQuery,
    onSearchChange,
    canViewHospital,
    onPrev,
    onNext,
    onToday,
    onViewChange,
    onScopeChange,
    onOpenCreateModal,
    onOpenGoogleSyncModal,
    onOpenPwaModal,
    eventCounts,
}: CalendarHeaderProps) {
    const [muted, setMuted] = useState(false);

    useEffect(() => {
        setMuted(isSoundMuted());
    }, []);

    const toggleSound = () => {
        const next = !muted;
        setMuted(next);
        setSoundMuted(next);
        if (!next) {
            playChimeSound(true);
        }
    };

    const thaiMonth = THAI_MONTHS[currentDate.getMonth()];
    const thaiYear = currentDate.getFullYear() + 543;

    return (
        <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md shadow-sky-600/20">
                            <CalendarIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
                                ปฏิทินงานและกิจกรรม
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                3 ระบบ: ส่วนตัว · {canViewHospital ? 'ภาพรวม รพ. · ' : ''}งาน HR · แจ้งเตือนผ่าน S-Chat Bot
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Action Tools + Search Bar */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search Bar Input */}
                    <div className="relative w-full sm:w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="ค้นหากิจกรรม..."
                            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-8 text-xs text-slate-700 shadow-2xs focus:border-sky-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => onSearchChange('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Audio Toggle */}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleSound}
                        title={muted ? 'เปิดเสียงแจ้งเตือน' : 'ปิดเสียงแจ้งเตือน'}
                        className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        {muted ? (
                            <>
                                <VolumeX className="mr-1.5 h-4 w-4 text-rose-500" />
                                <span className="hidden sm:inline">เสียงปิด</span>
                            </>
                        ) : (
                            <>
                                <Volume2 className="mr-1.5 h-4 w-4 text-emerald-600" />
                                <span className="hidden sm:inline">เสียงเปิด</span>
                            </>
                        )}
                    </Button>

                    {/* Google Calendar Sync */}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onOpenGoogleSyncModal}
                        className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <Share2 className="mr-1.5 h-4 w-4 text-sky-600" />
                        Google/Apple Sync
                    </Button>

                    {/* PWA Mobile App Install */}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onOpenPwaModal}
                        title="ติดตั้งแอปปฏิทินแยกต่างหากบน Android / iPhone (ไม่ทับกับ SMH)"
                        className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <Smartphone className="mr-1.5 h-4 w-4 text-sky-600" />
                        ติดตั้งแอปปฏิทิน
                    </Button>

                    {/* Add Event Button */}
                    <Button
                        type="button"
                        onClick={onOpenCreateModal}
                        className="rounded-xl bg-sky-600 text-white shadow-md shadow-sky-600/20 hover:bg-sky-700"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        สร้างกิจกรรม
                    </Button>
                </div>
            </div>

            {/* Middle Nav & Filters */}
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs md:flex-row md:items-center md:justify-between dark:border-slate-800 dark:bg-slate-900">
                {/* Month/Year Navigation */}
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onPrev}
                        className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onNext}
                        className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onToday}
                        className="rounded-xl text-xs font-semibold"
                    >
                        วันนี้
                    </Button>

                    <div className="ml-2 text-lg font-bold text-slate-800 dark:text-white">
                        {thaiMonth} {thaiYear}
                    </div>
                </div>

                {/* Scope Filters (3 ระบบ) */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => onScopeChange('all')}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                            activeScope === 'all'
                                ? 'bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                    >
                        <Filter className="h-3.5 w-3.5" />
                        ทั้งหมด ({eventCounts.all})
                    </button>

                    <button
                        type="button"
                        onClick={() => onScopeChange('personal')}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                            activeScope === 'personal'
                                ? 'bg-sky-600 text-white shadow-xs shadow-sky-600/30'
                                : 'bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300'
                        }`}
                    >
                        <span className="h-2 w-2 rounded-full bg-sky-500" />
                        ส่วนตัว ({eventCounts.personal})
                    </button>

                    {/* Hospital Overview (Admin/Superuser/Header only) */}
                    {canViewHospital && (
                        <button
                            type="button"
                            onClick={() => onScopeChange('hospital')}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                                activeScope === 'hospital'
                                    ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                            }`}
                        >
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            ภาพรวม รพ. ({eventCounts.hospital})
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => onScopeChange('hr')}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                            activeScope === 'hr'
                                ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/30'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}
                    >
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        งาน HR ({eventCounts.hr})
                    </button>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                    <button
                        type="button"
                        onClick={() => onViewChange('dayGridMonth')}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                            viewMode === 'dayGridMonth'
                                ? 'bg-white text-slate-800 shadow-xs dark:bg-slate-900 dark:text-white'
                                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`}
                    >
                        เดือน
                    </button>
                    <button
                        type="button"
                        onClick={() => onViewChange('timeGridWeek')}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                            viewMode === 'timeGridWeek'
                                ? 'bg-white text-slate-800 shadow-xs dark:bg-slate-900 dark:text-white'
                                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`}
                    >
                        สัปดาห์
                    </button>
                    <button
                        type="button"
                        onClick={() => onViewChange('timeGridDay')}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                            viewMode === 'timeGridDay'
                                ? 'bg-white text-slate-800 shadow-xs dark:bg-slate-900 dark:text-white'
                                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`}
                    >
                        วัน
                    </button>
                </div>
            </div>
        </div>
    );
}
