import * as React from 'react';
import { Clock, Check, ChevronDown, Sparkles, Sun, Sunrise, Calendar, Coffee, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

export interface TimeSlotPreset {
    label: string;
    start: string;
    end: string;
    durationLabel: string;
    icon?: string;
}

export const THAI_TIME_PRESETS: TimeSlotPreset[] = [
    { label: 'ครึ่งวันเช้า', start: '08:30', end: '12:00', durationLabel: '3 ชม. 30 น.', icon: '🌅' },
    { label: 'ครึ่งวันบ่าย', start: '13:00', end: '16:30', durationLabel: '3 ชม. 30 น.', icon: '☀️' },
    { label: 'เต็มวันราชการ', start: '08:30', end: '16:30', durationLabel: '8 ชม.', icon: '📅' },
    { label: 'เช้า 1 ชม.', start: '09:00', end: '10:00', durationLabel: '1 ชม.', icon: '☕' },
    { label: 'บ่าย 1 ชม.', start: '13:30', end: '14:30', durationLabel: '1 ชม.', icon: '☕' },
    { label: 'บ่าย 2 ชม.', start: '13:00', end: '15:00', durationLabel: '2 ชม.', icon: '🕑' },
];

export const POPULAR_TIMES = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '13:00', '13:30', '14:00',
    '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
    '17:30', '18:00', '19:00', '20:00',
];

export const HOURS_LIST = [
    '06', '07', '08', '09', '10', '11', '12',
    '13', '14', '15', '16', '17', '18', '19',
    '20', '21', '22',
];

export const MINUTES_LIST = [
    '00', '05', '10', '15', '20', '25',
    '30', '35', '40', '45', '50', '55',
];

export function formatThaiTime(time?: string): string {
    if (!time) return '';
    const clean = time.trim();
    if (!clean) return '';
    return clean.endsWith('น.') ? clean : `${clean} น.`;
}

export function parseMinutes(timeStr?: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
}

export function formatDurationText(startStr?: string, endStr?: string): string | null {
    if (!startStr || !endStr) return null;
    const startM = parseMinutes(startStr);
    const endM = parseMinutes(endStr);
    const diff = endM - startM;
    if (diff <= 0) return null;

    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h > 0 && m > 0) return `${h} ชั่วโมง ${m} นาที`;
    if (h > 0) return `${h} ชั่วโมง`;
    return `${m} นาที`;
}

// -------------------------------------------------------------
// Component 1: ThaiTimePicker (ตัวเลือกเวลาเดี่ยวพร้อม Popover)
// -------------------------------------------------------------
interface ThaiTimePickerProps {
    value?: string;
    onChange: (time: string) => void;
    placeholder?: string;
    className?: string;
    minTime?: string;
    disabled?: boolean;
    label?: string;
}

export function ThaiTimePicker({
    value = '',
    onChange,
    placeholder = 'เลือกเวลา',
    className,
    minTime,
    disabled = false,
    label,
}: ThaiTimePickerProps) {
    const [open, setOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<'popular' | 'precision'>('popular');

    // Parse hour and minute from current value
    const parts = value ? value.split(':') : [];
    const currentHour = parts[0] ? parts[0].padStart(2, '0') : '';
    const currentMinute = parts[1] ? parts[1].padStart(2, '0') : '';

    const handleSelectTime = (t: string) => {
        onChange(t);
        setOpen(false);
    };

    const handleHourChange = (h: string) => {
        const m = currentMinute || '00';
        onChange(`${h}:${m}`);
    };

    const handleMinuteChange = (m: string) => {
        const h = currentHour || '08';
        onChange(`${h}:${m}`);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        'w-full justify-between rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-left font-normal shadow-xs transition-all hover:border-sky-400 hover:bg-slate-50/80',
                        !value && 'text-slate-400',
                        value && 'font-semibold text-slate-800 border-sky-300 bg-sky-50/30',
                        className
                    )}
                >
                    <div className="flex items-center gap-2 truncate">
                        <Clock className={cn('h-4 w-4', value ? 'text-sky-600' : 'text-slate-400')} />
                        <span>{value ? formatThaiTime(value) : placeholder}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0 rounded-2xl shadow-xl border border-slate-200" align="start">
                <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-indigo-50/50 rounded-t-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-sky-600" />
                        <span className="text-sm font-bold text-slate-800">{label || 'เลือกเวลา (เวลาไทย)'}</span>
                    </div>
                    {value && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-black bg-sky-600 text-white shadow-2xs">
                            {formatThaiTime(value)}
                        </span>
                    )}
                </div>

                {/* Mode Selector Tabs */}
                <div className="flex border-b border-slate-100 p-1.5 bg-slate-50/60 gap-1 text-xs">
                    <button
                        type="button"
                        onClick={() => setActiveTab('popular')}
                        className={cn(
                            'flex-1 py-1.5 rounded-lg font-bold transition-all text-center',
                            activeTab === 'popular'
                                ? 'bg-white text-sky-700 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                        )}
                    >
                        ⚡ เวลายอดนิยม
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('precision')}
                        className={cn(
                            'flex-1 py-1.5 rounded-lg font-bold transition-all text-center',
                            activeTab === 'precision'
                                ? 'bg-white text-sky-700 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                        )}
                    >
                        🔢 ระบุ ชม. / นาที
                    </button>
                </div>

                {/* Tab 1: Popular Times */}
                {activeTab === 'popular' && (
                    <div className="p-3 max-h-[260px] overflow-y-auto">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            ช่วงเวลาแนะนำ
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                            {POPULAR_TIMES.map((t) => {
                                const isSelected = value === t;
                                const isPastMin = minTime ? parseMinutes(t) < parseMinutes(minTime) : false;
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        disabled={isPastMin}
                                        onClick={() => handleSelectTime(t)}
                                        className={cn(
                                            'px-2.5 py-2 text-xs font-mono font-bold rounded-xl transition-all border text-center flex items-center justify-center gap-1',
                                            isSelected
                                                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                                                : isPastMin
                                                ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                                : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50/60'
                                        )}
                                    >
                                        <span>{t}</span>
                                        <span className="text-[10px] opacity-80">น.</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tab 2: Precision Selector */}
                {activeTab === 'precision' && (
                    <div className="p-3">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <div className="text-xs font-bold text-slate-600 mb-1.5 text-center">ชั่วโมง (นาฬิกา)</div>
                                <div className="h-44 overflow-y-auto rounded-xl border border-slate-200 p-1 space-y-1 bg-slate-50/40">
                                    {HOURS_LIST.map((h) => {
                                        const isHSelected = currentHour === h;
                                        return (
                                            <button
                                                key={h}
                                                type="button"
                                                onClick={() => handleHourChange(h)}
                                                className={cn(
                                                    'w-full py-1.5 text-xs font-mono font-bold rounded-lg text-center transition-all',
                                                    isHSelected
                                                        ? 'bg-sky-600 text-white shadow-xs'
                                                        : 'text-slate-700 hover:bg-slate-200/70'
                                                )}
                                            >
                                                {h} นาฬิกา
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-600 mb-1.5 text-center">นาที</div>
                                <div className="h-44 overflow-y-auto rounded-xl border border-slate-200 p-1 space-y-1 bg-slate-50/40">
                                    {MINUTES_LIST.map((m) => {
                                        const isMSelected = currentMinute === m;
                                        return (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => handleMinuteChange(m)}
                                                className={cn(
                                                    'w-full py-1.5 text-xs font-mono font-bold rounded-lg text-center transition-all',
                                                    isMSelected
                                                        ? 'bg-sky-600 text-white shadow-xs'
                                                        : 'text-slate-700 hover:bg-slate-200/70'
                                                )}
                                            >
                                                :{m} นาที
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            className="w-full bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold"
                            onClick={() => setOpen(false)}
                        >
                            ตกลง ({value ? formatThaiTime(value) : 'ยังไม่เลือก'})
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

// -------------------------------------------------------------
// Component 2: ThaiTimeRangePicker (ระบบเลือกช่วงเวลาคู่ เริ่ม-สิ้นสุด พร้อม Presets)
// -------------------------------------------------------------
interface ThaiTimeRangePickerProps {
    startTime: string;
    endTime: string;
    onChange: (startTime: string, endTime: string) => void;
    startError?: string;
    endError?: string;
    className?: string;
}

export function ThaiTimeRangePicker({
    startTime,
    endTime,
    onChange,
    startError,
    endError,
    className,
}: ThaiTimeRangePickerProps) {
    const duration = formatDurationText(startTime, endTime);
    const isInvalidRange = startTime && endTime && parseMinutes(endTime) <= parseMinutes(startTime);

    // Apply preset
    const handleApplyPreset = (preset: TimeSlotPreset) => {
        onChange(preset.start, preset.end);
    };

    // Auto-advance end time if start time moves past current end time
    const handleStartTimeChange = (newStart: string) => {
        if (!endTime || parseMinutes(endTime) <= parseMinutes(newStart)) {
            // Default +2 hours or +1 hour
            const startM = parseMinutes(newStart);
            const proposedEndM = Math.min(22 * 60, startM + 120); // 2 hours later, cap at 22:00
            const eh = String(Math.floor(proposedEndM / 60)).padStart(2, '0');
            const em = String(proposedEndM % 60).padStart(2, '0');
            onChange(newStart, `${eh}:${em}`);
        } else {
            onChange(newStart, endTime);
        }
    };

    const handleEndTimeChange = (newEnd: string) => {
        onChange(startTime, newEnd);
    };

    return (
        <div className={cn('space-y-3.5', className)}>
            {/* Quick Presets Bar */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>ช่วงเวลายอดนิยม (คลิกเลือกได้ทันที):</span>
                    </span>
                    {duration && !isInvalidRange && (
                        <span className="text-[11px] font-black text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-full">
                            ⏱️ {duration}
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {THAI_TIME_PRESETS.map((preset) => {
                        const isActive = startTime === preset.start && endTime === preset.end;
                        return (
                            <button
                                key={preset.label}
                                type="button"
                                onClick={() => handleApplyPreset(preset)}
                                className={cn(
                                    'px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between shadow-2xs',
                                    isActive
                                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm scale-[1.02]'
                                        : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50/50'
                                )}
                            >
                                <span className="flex items-center gap-1.5">
                                    <span>{preset.icon}</span>
                                    <span>{preset.label}</span>
                                </span>
                                <span className={cn('text-[10px]', isActive ? 'text-sky-100' : 'text-slate-400')}>
                                    {preset.start}-{preset.end}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Custom Time Selection (Start Time & End Time side-by-side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50/50">
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>เวลาเริ่ม <span className="text-red-500">*</span></span>
                        {startTime && <span className="text-[11px] font-mono font-bold text-sky-600">{formatThaiTime(startTime)}</span>}
                    </Label>
                    <ThaiTimePicker
                        value={startTime}
                        onChange={handleStartTimeChange}
                        placeholder="เลือกเวลาเริ่มประชุม"
                        label="เวลาเริ่มประชุม"
                    />
                    {startError && <p className="text-xs font-medium text-red-500 mt-1">{startError}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>เวลาสิ้นสุด <span className="text-red-500">*</span></span>
                        {endTime && <span className="text-[11px] font-mono font-bold text-sky-600">{formatThaiTime(endTime)}</span>}
                    </Label>
                    <ThaiTimePicker
                        value={endTime}
                        onChange={handleEndTimeChange}
                        placeholder="เลือกเวลาสิ้นสุดประชุม"
                        minTime={startTime}
                        label="เวลาสิ้นสุดประชุม"
                    />
                    {endError && <p className="text-xs font-medium text-red-500 mt-1">{endError}</p>}
                </div>
            </div>

            {/* Range Validation & Summary Alert */}
            {isInvalidRange && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shadow-2xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>เวลาสิ้นสุด ({endTime} น.) ต้องอยู่หลังเวลาเริ่ม ({startTime} น.)</span>
                </div>
            )}

            {startTime && endTime && !isInvalidRange && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-50/80 border border-sky-200 text-sky-900 text-xs shadow-2xs">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-sky-600" />
                        <span>
                            กำหนดการ: <strong>{formatThaiTime(startTime)}</strong> ถึง <strong>{formatThaiTime(endTime)}</strong>
                        </span>
                    </div>
                    {duration && (
                        <span className="font-black text-sky-700 bg-white px-2 py-0.5 rounded-lg border border-sky-200 shadow-2xs">
                            {duration}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

export default ThaiTimeRangePicker;
