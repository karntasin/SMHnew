import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    AlertCircle,
    Bell,
    Plus,
    Trash2,
    Check,
    Building2,
    User,
    Users,
    Paperclip,
    Upload,
} from 'lucide-react';
import {
    CalendarScope,
    CalendarPriority,
    CalendarFullEvent,
    CalendarReminderItem,
    CalendarAttachment,
} from '@/types/calendar';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (eventData: any, isEdit: boolean, eventId?: number) => Promise<void>;
    editEvent: CalendarFullEvent | null;
    initialDate: Date | null;
    departments: { id: number; name: string }[];
    isAdminOrHr: boolean;
    canViewHospital?: boolean;
}

const COLOR_PRESETS = [
    { label: 'Sky ฟ้า', value: '#0284c7' },
    { label: 'Emerald เขียว', value: '#059669' },
    { label: 'Rose แดง', value: '#e11d48' },
    { label: 'Amber ส้ม', value: '#d97706' },
    { label: 'Purple ม่วง', value: '#7c3aed' },
    { label: 'Indigo น้ำเงินเข้ม', value: '#4338ca' },
    { label: 'Teal เขียวอมฟ้า', value: '#0d9488' },
    { label: 'Slate เทาเข้ม', value: '#475569' },
];

export default function EventModal({
    isOpen,
    onClose,
    onSave,
    editEvent,
    initialDate,
    departments,
    isAdminOrHr,
    canViewHospital = false,
}: EventModalProps) {
    const isEdit = !!editEvent;

    // Form state
    const [scope, setScope] = useState<CalendarScope>('personal');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [category, setCategory] = useState('general');
    const [priority, setPriority] = useState<CalendarPriority>('normal');
    const [color, setColor] = useState('#0284c7');
    const [departmentId, setDepartmentId] = useState<number | ''>('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('10:00');

    // Attachments state
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<CalendarAttachment[]>([]);

    // Multi-level Reminders state
    const [reminders, setReminders] = useState<CalendarReminderItem[]>([
        {
            reminder_type: 'before_1d',
            offset_minutes: -1440,
            max_repeats: 1,
            channel: 'both',
        },
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (editEvent) {
            const props = editEvent.extendedProps;
            setScope(props.scope);
            setTitle(editEvent.title);
            setDescription(props.description || '');
            setLocation(props.location || '');
            setCategory(props.category || 'general');
            setPriority(props.priority || 'normal');
            setColor(editEvent.backgroundColor || '#0284c7');
            setDepartmentId(props.department?.id || '');
            setIsAllDay(editEvent.allDay);

            const startObj = new Date(editEvent.start);
            setStartDate(startObj.toISOString().slice(0, 10));
            setStartTime(startObj.toTimeString().slice(0, 5));

            if (editEvent.end) {
                const endObj = new Date(editEvent.end);
                setEndDate(endObj.toISOString().slice(0, 10));
                setEndTime(endObj.toTimeString().slice(0, 5));
            } else {
                setEndDate(startObj.toISOString().slice(0, 10));
                setEndTime('10:00');
            }

            if (props.reminders && props.reminders.length > 0) {
                setReminders(props.reminders);
            } else {
                setReminders([]);
            }

            setExistingAttachments(props.attachments || []);
            setSelectedFiles([]);
        } else {
            // New Event defaults
            setScope('personal');
            setTitle('');
            setDescription('');
            setLocation('');
            setCategory('general');
            setPriority('normal');
            setColor('#0284c7');
            setDepartmentId('');
            setIsAllDay(false);
            setExistingAttachments([]);
            setSelectedFiles([]);

            const target = initialDate || new Date();
            const dateStr = target.toISOString().slice(0, 10);
            setStartDate(dateStr);
            setEndDate(dateStr);
            setStartTime('09:00');
            setEndTime('10:00');

            setReminders([
                {
                    reminder_type: 'before_1d',
                    offset_minutes: -1440,
                    max_repeats: 1,
                    channel: 'both',
                },
            ]);
        }
    }, [editEvent, initialDate, isOpen]);

    // Update color preset according to scope if not customized
    const handleScopeChange = (newScope: CalendarScope) => {
        setScope(newScope);
        if (newScope === 'personal') setColor('#0284c7');
        else if (newScope === 'hospital') setColor('#059669');
        else if (newScope === 'hr') setColor('#e11d48');
    };

    const addReminder = () => {
        setReminders([
            ...reminders,
            {
                reminder_type: 'before_30m',
                offset_minutes: -30,
                max_repeats: 1,
                channel: 'both',
            },
        ]);
    };

    const removeReminder = (index: number) => {
        setReminders(reminders.filter((_, i) => i !== index));
    };

    const updateReminder = (index: number, key: keyof CalendarReminderItem, val: any) => {
        const updated = [...reminders];
        updated[index] = { ...updated[index], [key]: val };

        // sync offset_minutes with reminder_type
        if (key === 'reminder_type') {
            const offsets: Record<string, number> = {
                before_1d: -1440,
                before_3h: -180,
                before_1h: -60,
                before_30m: -30,
                before_15m: -15,
                on_time: 0,
            };
            if (offsets[val] !== undefined) {
                updated[index].offset_minutes = offsets[val];
            }
        }

        setReminders(updated);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesArr = Array.from(e.target.files);
            setSelectedFiles((prev) => [...prev, ...filesArr]);
        }
    };

    const removeSelectedFile = (idx: number) => {
        setSelectedFiles(selectedFiles.filter((_, i) => i !== idx));
    };

    const deleteExistingAttachment = async (attId: number) => {
        if (!confirm('ต้องการลบไฟล์แนบนี้ใช่หรือไม่?')) return;
        try {
            await axios.delete(`/calendar/attachments/${attId}`);
            setExistingAttachments(existingAttachments.filter((a) => a.id !== attId));
        } catch (err) {
            console.error('Delete attachment error', err);
            alert('ไม่สามารถลบไฟล์แนบได้');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !startDate) return;

        setIsSubmitting(true);
        try {
            const startDateTime = isAllDay ? `${startDate} 00:00:00` : `${startDate} ${startTime}:00`;
            const endDateTime = isAllDay ? `${endDate || startDate} 23:59:59` : `${endDate || startDate} ${endTime}:00`;

            const formData = new FormData();
            formData.append('scope', scope);
            formData.append('title', title.trim());
            if (description.trim()) formData.append('description', description.trim());
            if (location.trim()) formData.append('location', location.trim());
            formData.append('category', category);
            formData.append('priority', priority);
            formData.append('color', color);
            if (departmentId) formData.append('department_id', String(departmentId));
            formData.append('is_all_day', isAllDay ? '1' : '0');
            formData.append('start_time', startDateTime);
            formData.append('end_time', endDateTime);

            // Reminders
            reminders.forEach((r, index) => {
                formData.append(`reminders[${index}][reminder_type]`, r.reminder_type);
                formData.append(`reminders[${index}][offset_minutes]`, String(r.offset_minutes));
                formData.append(`reminders[${index}][max_repeats]`, String(r.max_repeats));
                formData.append(`reminders[${index}][channel]`, r.channel);
            });

            // Upload files
            selectedFiles.forEach((file) => {
                formData.append('attachments[]', file);
            });

            await onSave(formData, isEdit, editEvent?.extendedProps.id);
            onClose();
        } catch (err) {
            console.error('Save error', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl rounded-2xl max-sm:fixed max-sm:bottom-0 max-sm:top-auto max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-3xl max-sm:max-h-[92vh] max-sm:p-5">
                {/* Mobile Drag Handle */}
                <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden mb-1" />

                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <CalendarIcon className="h-5 w-5 text-sky-600" />
                        {isEdit ? 'แก้ไขกิจกรรม' : 'สร้างกิจกรรมใหม่'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                    {/* Scope Selector (3 ระบบ) */}
                    <div>
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            เลือกระบบงาน (Scope)
                        </Label>
                        <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                            {/* Personal */}
                            <button
                                type="button"
                                onClick={() => handleScopeChange('personal')}
                                className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                                    scope === 'personal'
                                        ? 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-500/30 dark:bg-sky-950/40'
                                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <div className="flex w-full items-center justify-between">
                                    <div className="flex items-center gap-1.5 font-bold text-sky-700 dark:text-sky-300">
                                        <User className="h-4 w-4" />
                                        ส่วนตัว (Personal)
                                    </div>
                                    {scope === 'personal' && <Check className="h-4 w-4 text-sky-600" />}
                                </div>
                                <span className="mt-1 text-[11px] text-slate-500">
                                    เห็นเฉพาะตนเอง แจ้งเตือนบอทเข้าแชทส่วนตัว
                                </span>
                            </button>

                            {/* Hospital Overview (Admin / Superuser / Header only) */}
                            {canViewHospital && (
                                <button
                                    type="button"
                                    disabled={!isAdminOrHr && !isEdit}
                                    onClick={() => handleScopeChange('hospital')}
                                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                                        scope === 'hospital'
                                            ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/30 dark:bg-emerald-950/40'
                                            : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                                    } ${!isAdminOrHr && !isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex w-full items-center justify-between">
                                        <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                                            <Building2 className="h-4 w-4" />
                                            ภาพรวม รพ.
                                        </div>
                                        {scope === 'hospital' && <Check className="h-4 w-4 text-emerald-600" />}
                                    </div>
                                    <span className="mt-1 text-[11px] text-slate-500">
                                        บุคลากรทุกคนมองเห็น งานส่วนรวม รพ.
                                    </span>
                                </button>
                            )}

                            {/* HR */}
                            <button
                                type="button"
                                disabled={!isAdminOrHr && !isEdit}
                                onClick={() => handleScopeChange('hr')}
                                className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                                    scope === 'hr'
                                        ? 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-500/30 dark:bg-rose-950/40'
                                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                                } ${!isAdminOrHr && !isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className="flex w-full items-center justify-between">
                                    <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300">
                                        <Users className="h-4 w-4" />
                                        งาน HR / กำลังพล
                                    </div>
                                    {scope === 'hr' && <Check className="h-4 w-4 text-rose-600" />}
                                </div>
                                <span className="mt-1 text-[11px] text-slate-500">
                                    ประเมินผล อบรม ต่อใบอนุญาต สิทธิประโยชน์
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <Label htmlFor="title" className="text-xs font-semibold">
                            หัวข้อกิจกรรม / ชื่องาน <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="เช่น ประชุมทบทวนเวชระเบียน, ตารางเวรเช้า, อบรมปฐมนิเทศ"
                            className="mt-1.5 rounded-xl"
                            required
                        />
                    </div>

                    {/* Date & Time Settings */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                กำหนดวันและเวลา
                            </span>
                            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isAllDay}
                                    onChange={(e) => setIsAllDay(e.target.checked)}
                                    className="rounded text-sky-600 focus:ring-sky-500"
                                />
                                <span>ตลอดทั้งวัน (All Day)</span>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Start */}
                            <div>
                                <Label className="text-xs text-slate-500">วันเริ่มต้น</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="mt-1 rounded-xl bg-white dark:bg-slate-900"
                                    required
                                />
                                {!isAllDay && (
                                    <div className="mt-2">
                                        <Label className="text-xs text-slate-500">เวลาเริ่ม</Label>
                                        <Input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="mt-1 rounded-xl bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* End */}
                            <div>
                                <Label className="text-xs text-slate-500">วันสิ้นสุด</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="mt-1 rounded-xl bg-white dark:bg-slate-900"
                                    required
                                />
                                {!isAllDay && (
                                    <div className="mt-2">
                                        <Label className="text-xs text-slate-500">เวลาสิ้นสุด</Label>
                                        <Input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="mt-1 rounded-xl bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Category, Priority & Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <Label className="text-xs font-semibold">หมวดหมู่</Label>
                            <Input
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="เช่น meeting, training, duty"
                                className="mt-1.5 rounded-xl"
                            />
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">ความสำคัญ</Label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as CalendarPriority)}
                                className="mt-1.5 flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="low">ต่ำ (Low)</option>
                                <option value="normal">ปกติ (Normal)</option>
                                <option value="high">สำคัญ (High)</option>
                                <option value="urgent">เร่งด่วน (Urgent)</option>
                            </select>
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">สถานที่ / ลิงก์</Label>
                            <Input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="เช่น ห้องประชุม 1, ลิงก์ Zoom"
                                className="mt-1.5 rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Color Preset Palette */}
                    <div>
                        <Label className="text-xs font-semibold">สีประจำกิจกรรม</Label>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            {COLOR_PRESETS.map((p) => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => setColor(p.value)}
                                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                                        color === p.value ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white scale-110' : 'hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: p.value }}
                                    title={p.label}
                                >
                                    {color === p.value && <Check className="h-4 w-4 text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <Label htmlFor="desc" className="text-xs font-semibold">
                            รายละเอียดเพิ่มเติม
                        </Label>
                        <Textarea
                            id="desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="ระบุวาระการประชุม หรือข้อความบันทึกเตือนความจำ..."
                            rows={3}
                            className="mt-1.5 rounded-xl"
                        />
                    </div>

                    {/* File Attachments Section */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300">
                                <Paperclip className="h-4 w-4 text-sky-600" />
                                <span>ไฟล์แนบเอกสาร / รูปภาพ (Attachments)</span>
                            </div>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                <Upload className="h-3.5 w-3.5 text-sky-600" />
                                <span>เลือกไฟล์</span>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        {/* Existing Attachments */}
                        {existingAttachments.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                                <span className="text-[11px] font-semibold text-slate-500">ไฟล์แนบที่มีอยู่เดิม:</span>
                                <div className="space-y-1">
                                    {existingAttachments.map((att) => (
                                        <div
                                            key={att.id}
                                            className="flex items-center justify-between rounded-lg bg-white p-2 text-xs border border-slate-100 dark:bg-slate-800 dark:border-slate-700"
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate">{att.file_name}</span>
                                                <span className="text-[10px] text-slate-400">({att.file_size})</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => deleteExistingAttachment(att.id)}
                                                className="text-rose-500 hover:text-rose-700 p-1"
                                                title="ลบไฟล์นี้"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Newly Selected Files */}
                        {selectedFiles.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                                <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">ไฟล์ที่เลือกใหม่ (จะอัปโหลดเมื่อกดบันทึก):</span>
                                <div className="space-y-1">
                                    {selectedFiles.map((f, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between rounded-lg bg-sky-50/80 p-2 text-xs border border-sky-200 dark:bg-sky-950/40 dark:border-sky-800"
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <Upload className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                                                <span className="truncate font-medium text-sky-900 dark:text-sky-200">{f.name}</span>
                                                <span className="text-[10px] text-sky-600 dark:text-sky-400">
                                                    ({(f.size / 1024).toFixed(0)} KB)
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeSelectedFile(idx)}
                                                className="text-slate-400 hover:text-rose-600 p-1"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {existingAttachments.length === 0 && selectedFiles.length === 0 && (
                            <p className="mt-2 text-xs text-slate-400">
                                ยังไม่มีไฟล์แนบ (สามารถแนบ PDF, DOCX, XLSX, รูปภาพ ได้สูงสุด 20MB)
                            </p>
                        )}
                    </div>

                    {/* Multi-Level Reminders Section */}
                    <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 dark:border-sky-950 dark:bg-sky-950/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bell className="h-4 w-4 text-sky-600" />
                                <span className="text-xs font-bold text-sky-900 dark:text-sky-200">
                                    การตั้งค่าแจ้งเตือนหลายระดับ (S-Chat Bot & System Bell)
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addReminder}
                                className="rounded-xl border-sky-300 text-xs text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:text-sky-300"
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                เพิ่มการแจ้งเตือน
                            </Button>
                        </div>

                        {reminders.length === 0 ? (
                            <p className="mt-2 text-xs text-slate-500">
                                ไม่ได้เปิดการแจ้งเตือนสำหรับกิจกรรมนี้
                            </p>
                        ) : (
                            <div className="mt-3 space-y-2.5">
                                {reminders.map((rem, idx) => (
                                    <div
                                        key={idx}
                                        className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-2.5 shadow-xs dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                                    >
                                        {/* Reminder timing type */}
                                        <select
                                            value={rem.reminder_type}
                                            onChange={(e) => updateReminder(idx, 'reminder_type', e.target.value)}
                                            className="h-8 rounded-lg border border-slate-200 bg-transparent px-2 text-xs dark:border-slate-700"
                                        >
                                            <option value="before_1d">ล่วงหน้า 1 วัน</option>
                                            <option value="before_3h">ล่วงหน้า 3 ชั่วโมง</option>
                                            <option value="before_1h">ล่วงหน้า 1 ชั่วโมง</option>
                                            <option value="before_30m">ล่วงหน้า 30 นาที</option>
                                            <option value="before_15m">ล่วงหน้า 15 นาที</option>
                                            <option value="on_time">เมื่อถึงเวลากิจกรรม</option>
                                        </select>

                                        {/* Repeat Count */}
                                        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                                            <span>เตือน:</span>
                                            <select
                                                value={rem.max_repeats}
                                                onChange={(e) => updateReminder(idx, 'max_repeats', parseInt(e.target.value))}
                                                className="h-8 rounded-lg border border-slate-200 bg-transparent px-2 text-xs dark:border-slate-700"
                                            >
                                                <option value={1}>1 ครั้ง</option>
                                                <option value={2}>2 ครั้ง</option>
                                                <option value={3}>3 ครั้ง</option>
                                            </select>
                                        </div>

                                        {/* Channel */}
                                        <select
                                            value={rem.channel}
                                            onChange={(e) => updateReminder(idx, 'channel', e.target.value as any)}
                                            className="h-8 rounded-lg border border-slate-200 bg-transparent px-2 text-xs dark:border-slate-700"
                                        >
                                            <option value="both">S-Chat Bot + กระดิ่งระบบ</option>
                                            <option value="schat">เฉพาะบอท S-Chat</option>
                                            <option value="system">เฉพาะกระดิ่งในระบบ</option>
                                        </select>

                                        {/* Delete reminder button */}
                                        <button
                                            type="button"
                                            onClick={() => removeReminder(idx)}
                                            className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                                            title="ลบตัวแจ้งเตือนนี้"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="rounded-xl"
                            disabled={isSubmitting}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-xl bg-sky-600 text-white shadow-md shadow-sky-600/20 hover:bg-sky-700"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'กำลังบันทึก...' : isEdit ? 'อัปเดตกิจกรรม' : 'บันทึกกิจกรรม'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
