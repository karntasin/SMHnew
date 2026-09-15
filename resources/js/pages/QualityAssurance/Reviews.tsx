import React, { useMemo, useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash, Link2, FilePlus2, ExternalLink, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';
import { Modal, Field, StatusPill, EmptyState, qualityInput } from '@/components/quality/quality-ui';
import { cn } from '@/lib/utils';

const statusStyle: Record<string, string> = {
    Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    'In Progress': 'border-sky-200 bg-sky-50 text-sky-700',
    Pending: 'border-slate-200 bg-slate-50 text-slate-600',
};

interface IndicatorOption {
    id: number;
    code: string | null;
    name: string;
    unit: string;
    target_value: number | null;
    target_operator: string;
    type: string;
    department_id?: number | null;
    team_id?: number | null;
    category?: string | null;
    frequency?: string | null;
    owner_label: string;
    label: string;
}

interface DepartmentOption {
    id: number;
    name: string;
}

interface TeamOption {
    id: number;
    abbreviation: string;
    name_th: string;
}

interface ReviewItem {
    id: number;
    subject_type: 'indicator' | 'custom' | string;
    quality_indicator_id: number | null;
    topic: string;
    review_type: string;
    schedule_date: string;
    reviewer: string | null;
    status: string;
    findings: string | null;
    recommendations: string | null;
    indicator?: {
        id: number;
        code: string | null;
        name: string;
        unit?: string;
        target_value?: number | null;
        target_operator?: string;
        department?: { id: number; name: string } | null;
        team?: { id: number; abbreviation: string; name_th: string } | null;
    } | null;
}

const emptyForm = () => ({
    subject_type: 'indicator' as 'indicator' | 'custom',
    quality_indicator_id: '' as string,
    topic: '',
    review_type: 'KPI Review',
    schedule_date: new Date().toISOString().slice(0, 10),
    reviewer: '',
    status: 'Pending',
    findings: '',
    recommendations: '',
});

const toDateInput = (value?: string | null) => {
    if (!value) return new Date().toISOString().slice(0, 10);
    return String(value).slice(0, 10);
};

const formatNum = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return '-';
    const n = Number(value);
    if (Number.isNaN(n)) return '-';
    return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function Reviews({
    reviews,
    indicators = [],
    departments = [],
    teams = [],
    preselectIndicatorId = null,
    onPreselectConsumed,
}: {
    reviews: ReviewItem[];
    indicators?: IndicatorOption[];
    departments?: DepartmentOption[];
    teams?: TeamOption[];
    preselectIndicatorId?: number | null;
    onPreselectConsumed?: () => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ReviewItem | null>(null);
    const [filter, setFilter] = useState<'all' | 'indicator' | 'custom'>('all');
    const [indicatorTypeFilter, setIndicatorTypeFilter] = useState<'all' | 'organization' | 'department' | 'ha_team'>('all');
    const [departmentFilter, setDepartmentFilter] = useState<string>('all');
    const [teamFilter, setTeamFilter] = useState<string>('all');

    const { data, setData, post, put, delete: destroy, processing, reset, errors } = useForm(emptyForm());

    const syncFiltersFromIndicator = (ind?: IndicatorOption | null) => {
        if (!ind) {
            setIndicatorTypeFilter('all');
            setDepartmentFilter('all');
            setTeamFilter('all');
            return;
        }
        const type = (ind.type as 'organization' | 'department' | 'ha_team') || 'organization';
        setIndicatorTypeFilter(type);
        setDepartmentFilter(ind.department_id ? String(ind.department_id) : 'all');
        setTeamFilter(ind.team_id ? String(ind.team_id) : 'all');
    };

    const filteredIndicators = useMemo(() => {
        return indicators.filter((ind) => {
            if (indicatorTypeFilter !== 'all' && ind.type !== indicatorTypeFilter) return false;
            if (indicatorTypeFilter === 'department' && departmentFilter !== 'all') {
                return String(ind.department_id) === departmentFilter;
            }
            if (indicatorTypeFilter === 'ha_team' && teamFilter !== 'all') {
                return String(ind.team_id) === teamFilter;
            }
            return true;
        });
    }, [indicators, indicatorTypeFilter, departmentFilter, teamFilter]);

    React.useEffect(() => {
        if (!preselectIndicatorId) return;
        const ind = indicators.find((i) => i.id === preselectIndicatorId);
        if (!ind) {
            onPreselectConsumed?.();
            return;
        }
        setEditingItem(null);
        syncFiltersFromIndicator(ind);
        setData({
            ...emptyForm(),
            subject_type: 'indicator',
            quality_indicator_id: String(ind.id),
            topic: `${ind.code ? ind.code + ': ' : ''}${ind.name}`,
            review_type: 'KPI Review',
        });
        setIsOpen(true);
        onPreselectConsumed?.();
    }, [preselectIndicatorId]);

    const filteredReviews = useMemo(() => {
        if (filter === 'all') return reviews;
        return reviews.filter((r) => (r.subject_type || 'custom') === filter);
    }, [reviews, filter]);

    const selectedIndicator = useMemo(
        () => indicators.find((i) => String(i.id) === String(data.quality_indicator_id)),
        [indicators, data.quality_indicator_id],
    );

    const handleCreate = () => {
        setEditingItem(null);
        reset();
        setData(emptyForm());
        setIndicatorTypeFilter('all');
        setDepartmentFilter('all');
        setTeamFilter('all');
        setIsOpen(true);
    };

    const handleEdit = (item: ReviewItem) => {
        setEditingItem(item);
        const linked = indicators.find((i) => i.id === item.quality_indicator_id) || null;
        syncFiltersFromIndicator(item.subject_type === 'indicator' ? linked : null);
        setData({
            subject_type: (item.subject_type === 'indicator' ? 'indicator' : 'custom') as 'indicator' | 'custom',
            quality_indicator_id: item.quality_indicator_id ? String(item.quality_indicator_id) : '',
            topic: item.topic || '',
            review_type: item.review_type || 'Other',
            schedule_date: toDateInput(item.schedule_date),
            reviewer: item.reviewer || '',
            status: item.status || 'Pending',
            findings: item.findings || '',
            recommendations: item.recommendations || '',
        });
        setIsOpen(true);
    };

    const handleSubjectChange = (type: 'indicator' | 'custom') => {
        setData({
            ...data,
            subject_type: type,
            quality_indicator_id: type === 'indicator' ? data.quality_indicator_id : '',
            review_type: type === 'indicator' ? 'KPI Review' : data.review_type === 'KPI Review' ? 'Other' : data.review_type,
            topic: type === 'indicator' ? '' : data.topic,
        });
        if (type !== 'indicator') {
            setIndicatorTypeFilter('all');
            setDepartmentFilter('all');
            setTeamFilter('all');
        }
    };

    const handleTypeFilterChange = (type: 'all' | 'organization' | 'department' | 'ha_team') => {
        setIndicatorTypeFilter(type);
        setDepartmentFilter('all');
        setTeamFilter('all');
        setData({
            ...data,
            quality_indicator_id: '',
            topic: '',
        });
    };

    const handleDepartmentFilterChange = (value: string) => {
        setDepartmentFilter(value);
        setData({
            ...data,
            quality_indicator_id: '',
            topic: '',
        });
    };

    const handleTeamFilterChange = (value: string) => {
        setTeamFilter(value);
        setData({
            ...data,
            quality_indicator_id: '',
            topic: '',
        });
    };

    const handleIndicatorChange = (id: string) => {
        const ind = indicators.find((i) => String(i.id) === id);
        setData({
            ...data,
            quality_indicator_id: id,
            topic: ind ? `${ind.code ? ind.code + ': ' : ''}${ind.name}` : data.topic,
            review_type: 'KPI Review',
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            put(route('quality-assurance.reviews.update', editingItem.id), {
                onSuccess: () => setIsOpen(false),
            });
        } else {
            post(route('quality-assurance.reviews.store'), {
                onSuccess: () => setIsOpen(false),
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('ต้องการลบรายการทบทวนนี้หรือไม่?')) {
            destroy(route('quality-assurance.reviews.destroy', { review: id }));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    {(
                        [
                            { key: 'all', label: 'ทั้งหมด' },
                            { key: 'indicator', label: 'ทบทวนตัวชี้วัด' },
                            { key: 'custom', label: 'ทบทวนเรื่องใหม่' },
                        ] as const
                    ).map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => setFilter(f.key)}
                            className={cn(
                                'rounded-full border px-3 py-1 text-xs font-semibold transition',
                                filter === f.key
                                    ? 'border-violet-400 bg-violet-600 text-white'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200',
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <Button onClick={handleCreate} className="rounded-xl bg-violet-600 hover:bg-violet-700">
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่มการทบทวน
                </Button>
            </div>

            {filteredReviews.length === 0 ? (
                <EmptyState text="ยังไม่มีการทบทวนตามเงื่อนไขที่เลือก" />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredReviews.map((review) => {
                        const isIndicator = (review.subject_type || 'custom') === 'indicator';
                        return (
                            <div key={review.id} className="flex flex-col rounded-2xl border border-slate-200 p-4 shadow-sm">
                                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                                    <div className="flex flex-wrap gap-1.5">
                                        <StatusPill
                                            label={isIndicator ? 'ตัวชี้วัด' : 'เรื่องใหม่'}
                                            className={
                                                isIndicator
                                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                    : 'border-amber-200 bg-amber-50 text-amber-700'
                                            }
                                        />
                                        <StatusPill label={review.review_type} className="border-violet-200 bg-violet-50 text-violet-700" />
                                    </div>
                                    <StatusPill label={review.status} className={statusStyle[review.status] ?? statusStyle.Pending} />
                                </div>

                                <h3 className="mb-1 text-lg font-semibold text-slate-900">{review.topic}</h3>

                                {isIndicator && review.indicator && (
                                    <div className="mb-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800">
                                        <div className="flex items-center gap-1 font-semibold">
                                            <BarChart2 className="h-3.5 w-3.5" />
                                            {review.indicator.code || 'QI'} · เป้า {review.indicator.target_operator}{' '}
                                            {formatNum(review.indicator.target_value)} {review.indicator.unit}
                                        </div>
                                        <Link
                                            href={route('quality-indicators.show', review.indicator.id)}
                                            className="mt-1 inline-flex items-center gap-1 text-emerald-700 hover:underline"
                                        >
                                            เปิดหน้าตัวชี้วัด <ExternalLink className="h-3 w-3" />
                                        </Link>
                                    </div>
                                )}

                                <p className="mb-1 text-sm text-slate-500">
                                    กำหนดทบทวน: {format(new Date(toDateInput(review.schedule_date)), 'dd MMM yyyy')}
                                </p>
                                {review.reviewer && <p className="mb-2 text-sm text-slate-600">ผู้รับผิดชอบ: {review.reviewer}</p>}
                                {review.findings && (
                                    <p className="mb-1 line-clamp-2 text-xs text-slate-500">ผล: {review.findings}</p>
                                )}
                                {review.recommendations && (
                                    <p className="mb-2 line-clamp-2 text-xs text-violet-700">ข้อเสนอแนะ: {review.recommendations}</p>
                                )}

                                <div className="mt-auto flex justify-end gap-2 border-t border-slate-100 pt-4">
                                    <button type="button" onClick={() => handleEdit(review)} className="text-slate-400 hover:text-violet-600">
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button type="button" onClick={() => handleDelete(review.id)} className="text-slate-400 hover:text-rose-500">
                                        <Trash className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal
                open={isOpen}
                onClose={() => setIsOpen(false)}
                title={editingItem ? 'แก้ไขการทบทวน' : 'เพิ่มการทบทวนใหม่'}
                footer={
                    <Button type="submit" form="qa-review-form" disabled={processing} className="rounded-xl bg-violet-600 hover:bg-violet-700">
                        บันทึก
                    </Button>
                }
            >
                <form id="qa-review-form" onSubmit={handleSubmit} className="space-y-4">
                    <Field label="ประเภทเรื่องที่ทบทวน" required>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => handleSubjectChange('indicator')}
                                className={cn(
                                    'flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm transition',
                                    data.subject_type === 'indicator'
                                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                                        : 'border-slate-200 hover:border-emerald-200',
                                )}
                            >
                                <Link2 className="h-4 w-4 shrink-0" />
                                <span>
                                    <span className="block font-semibold">เชื่อมโยงตัวชี้วัด</span>
                                    <span className="text-xs opacity-80">ทบทวน KPI ที่มีในระบบ</span>
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSubjectChange('custom')}
                                className={cn(
                                    'flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm transition',
                                    data.subject_type === 'custom'
                                        ? 'border-amber-400 bg-amber-50 text-amber-900'
                                        : 'border-slate-200 hover:border-amber-200',
                                )}
                            >
                                <FilePlus2 className="h-4 w-4 shrink-0" />
                                <span>
                                    <span className="block font-semibold">ทบทวนเรื่องใหม่</span>
                                    <span className="text-xs opacity-80">หัวข้ออิสระ นอกเหนือ KPI</span>
                                </span>
                            </button>
                        </div>
                    </Field>

                    {data.subject_type === 'indicator' ? (
                        <>
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-3">
                                <p className="text-xs font-semibold text-emerald-800">กรองตัวชี้วัดก่อนเลือก</p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field label="ระดับ">
                                        <Select
                                            value={indicatorTypeFilter}
                                            onValueChange={(v) =>
                                                handleTypeFilterChange(v as 'all' | 'organization' | 'department' | 'ha_team')
                                            }
                                        >
                                            <SelectTrigger className={cn(qualityInput, 'h-auto py-2 bg-white')}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">ทุกระดับ</SelectItem>
                                                <SelectItem value="organization">ระดับองค์กร</SelectItem>
                                                <SelectItem value="department">ระดับแผนก/ฝ่าย</SelectItem>
                                                <SelectItem value="ha_team">ระดับทีม HA</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    {indicatorTypeFilter === 'department' && (
                                        <Field label="แผนก/หน่วยงาน">
                                            <Select value={departmentFilter} onValueChange={handleDepartmentFilterChange}>
                                                <SelectTrigger className={cn(qualityInput, 'h-auto py-2 bg-white')}>
                                                    <SelectValue placeholder="ทุกแผนก" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">ทุกแผนก</SelectItem>
                                                    {departments.map((d) => (
                                                        <SelectItem key={d.id} value={String(d.id)}>
                                                            {d.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                    )}

                                    {indicatorTypeFilter === 'ha_team' && (
                                        <Field label="ทีม HA">
                                            <Select value={teamFilter} onValueChange={handleTeamFilterChange}>
                                                <SelectTrigger className={cn(qualityInput, 'h-auto py-2 bg-white')}>
                                                    <SelectValue placeholder="ทุกทีม" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">ทุกทีม</SelectItem>
                                                    {teams.map((t) => (
                                                        <SelectItem key={t.id} value={String(t.id)}>
                                                            {t.abbreviation} - {t.name_th}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                    )}
                                </div>
                                <p className="text-[11px] text-emerald-700/80">
                                    พบ {filteredIndicators.length} ตัวชี้วัดตามตัวกรอง
                                </p>
                            </div>

                            <Field label="ตัวชี้วัดคุณภาพ" required>
                                <Select
                                    value={
                                        filteredIndicators.some((i) => String(i.id) === String(data.quality_indicator_id))
                                            ? data.quality_indicator_id || undefined
                                            : undefined
                                    }
                                    onValueChange={handleIndicatorChange}
                                >
                                    <SelectTrigger className={cn(qualityInput, 'h-auto py-2')}>
                                        <SelectValue placeholder="เลือกตัวชี้วัด..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-72">
                                        {filteredIndicators.length === 0 ? (
                                            <div className="px-3 py-2 text-sm text-slate-500">
                                                ไม่พบตัวชี้วัดตามเงื่อนไขที่กรอง
                                            </div>
                                        ) : (
                                            filteredIndicators.map((ind) => (
                                                <SelectItem key={ind.id} value={String(ind.id)}>
                                                    {ind.label} ({ind.owner_label})
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                                {errors.quality_indicator_id && (
                                    <p className="mt-1 text-xs text-rose-600">{errors.quality_indicator_id}</p>
                                )}
                            </Field>
                            {selectedIndicator && (
                                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-900">
                                    <div className="font-semibold">{selectedIndicator.label}</div>
                                    <div className="mt-1 text-emerald-700">
                                        สังกัด: {selectedIndicator.owner_label} · เป้า {selectedIndicator.target_operator}{' '}
                                        {formatNum(selectedIndicator.target_value)} {selectedIndicator.unit} · ความถี่{' '}
                                        {selectedIndicator.frequency || '-'}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <Field label="หัวข้อการทบทวน" required>
                                <Input
                                    value={data.topic}
                                    onChange={(e) => setData('topic', e.target.value)}
                                    required
                                    placeholder="เช่น ทบทวนอุบัติการณ์ / เวชระเบียน / ประชุมคุณภาพ"
                                    className={qualityInput}
                                />
                                {errors.topic && <p className="mt-1 text-xs text-rose-600">{errors.topic}</p>}
                            </Field>
                            <Field label="ประเภทการทบทวน">
                                <Select value={data.review_type} onValueChange={(v) => setData('review_type', v)}>
                                    <SelectTrigger className={cn(qualityInput, 'h-auto py-2')}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Chart Review">Chart Review (ทบทวนเวชระเบียน)</SelectItem>
                                        <SelectItem value="Death Review">Death Review (ทบทวนการเสียชีวิต)</SelectItem>
                                        <SelectItem value="Incident Review">Incident Review (ทบทวนอุบัติการณ์)</SelectItem>
                                        <SelectItem value="Meeting Review">Meeting Review (ทบทวนจากการประชุม)</SelectItem>
                                        <SelectItem value="Other">Other (อื่นๆ)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                        </>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="วันที่กำหนดทบทวน" required>
                            <Input
                                type="date"
                                value={data.schedule_date}
                                onChange={(e) => setData('schedule_date', e.target.value)}
                                required
                                className={qualityInput}
                            />
                        </Field>
                        <Field label="สถานะ">
                            <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                                <SelectTrigger className={cn(qualityInput, 'h-auto py-2')}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pending">รอดำเนินการ</SelectItem>
                                    <SelectItem value="In Progress">กำลังดำเนินการ</SelectItem>
                                    <SelectItem value="Completed">เสร็จสิ้น</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>

                    <Field label="ผู้รับผิดชอบ">
                        <Input
                            value={data.reviewer}
                            onChange={(e) => setData('reviewer', e.target.value)}
                            placeholder="ชื่อผู้ทบทวน / คณะทำงาน"
                            className={qualityInput}
                        />
                    </Field>
                    <Field label="ผลการทบทวน / ข้อค้นพบ">
                        <Textarea
                            value={data.findings}
                            onChange={(e) => setData('findings', e.target.value)}
                            placeholder="สรุปสิ่งที่พบจากการทบทวน"
                            className={qualityInput}
                        />
                    </Field>
                    <Field label="ข้อเสนอแนะ / แผนติดตาม">
                        <Textarea
                            value={data.recommendations}
                            onChange={(e) => setData('recommendations', e.target.value)}
                            placeholder="แนวทางปรับปรุง หรือรอบทบทวนครั้งถัดไป"
                            className={qualityInput}
                        />
                    </Field>
                </form>
            </Modal>
        </div>
    );
}
