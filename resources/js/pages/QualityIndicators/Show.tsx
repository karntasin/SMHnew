import React, { useMemo, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, BarChart2, Target, Calendar, Pencil, Trash2, TrendingUp, FileDown, ClipboardCheck, Crown, Unlink } from 'lucide-react';
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ReferenceLine,
} from 'recharts';
import { QualityPage, Panel, StatusPill, EmptyState, StatCard } from '@/components/quality/quality-ui';
import IndicatorsSubNav from '@/pages/QualityIndicators/IndicatorsSubNav';
import {
    ThaiDatePicker,
    formatIndicatorPeriod,
    formatThaiDateFromIso,
} from '@/components/ui/thai-date-picker';

const formatNum = (value: number | string | null | undefined, digits = 2): string => {
    if (value === null || value === undefined || value === '') return '-';
    const n = Number(value);
    if (Number.isNaN(n)) return '-';
    return n.toLocaleString('th-TH', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
};

interface Entry {
    id: number;
    period_date: string;
    series_key?: string | null;
    numerator: number | null;
    denominator: number | null;
    result_value: number | null;
    is_na?: boolean;
    notes: string | null;
}

interface SeriesDef {
    key: string;
    label: string;
    target_operator?: string | null;
    target_value?: number | null;
}

const SERIES_COLORS = ['#059669', '#d97706', '#e11d48', '#2563eb', '#7c3aed', '#0891b2'];

interface Indicator {
    id: number;
    type: string;
    code: string;
    name: string;
    description: string;
    category: string;
    unit: string;
    target_value: number;
    target_operator: string;
    frequency: string;
    series?: SeriesDef[] | null;
    entries: Entry[];
    is_master?: boolean;
    master_code?: string | null;
    reviews?: Array<{
        id: number;
        topic: string;
        status: string;
        schedule_date: string;
        findings?: string | null;
        recommendations?: string | null;
    }>;
}

interface FamilyMember {
    id: number;
    code: string | null;
    type: string;
    is_master: boolean;
    is_active: boolean;
    department?: { id: number; name: string } | null;
    team?: { id: number; abbreviation: string; name_th: string } | null;
}

interface Department {
    id: number;
    name: string;
}

interface Team {
    id: number;
    abbreviation: string;
    name_th: string;
}

const emptyForm = () => ({
    period_date: new Date().toISOString().split('T')[0],
    numerator: '',
    denominator: '',
    result_value: '',
    is_na: false,
    notes: '',
});

const toDateInput = (value?: string | null) => {
    if (!value) return new Date().toISOString().split('T')[0];
    return String(value).slice(0, 10);
};

const typeLabel = (type: string) => {
    if (type === 'department') return 'แผนก/ฝ่าย';
    if (type === 'ha_team') return 'ทีม HA';
    return 'องค์กร';
};

const memberOwner = (member: FamilyMember) => {
    if (member.type === 'department') return member.department?.name || 'ไม่ระบุแผนก';
    if (member.type === 'ha_team') {
        if (!member.team) return 'ไม่ระบุทีม';
        return `${member.team.abbreviation} · ${member.team.name_th}`;
    }
    return 'ระดับองค์กร';
};

export default function Show({
    indicator,
    familyMembers = [],
    departments = [],
    teams = [],
}: {
    indicator: Indicator;
    familyMembers?: FamilyMember[];
    departments?: Department[];
    teams?: Team[];
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
    const [aliasOpen, setAliasOpen] = useState(false);

    const series = indicator.series ?? [];
    const hasSeries = series.length > 0;
    const periodText = (value?: string) => formatIndicatorPeriod(value, indicator.frequency);
    const emptySeriesForm = () => ({
        period_date: new Date().toISOString().split('T')[0],
        series_entries: series.map((item) => ({
            series_key: item.key,
            numerator: '',
            denominator: '',
            result_value: '',
            is_na: false,
            notes: '',
        })),
    });

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(emptyForm());
    const seriesForm = useForm(emptySeriesForm());
    const aliasForm = useForm({
        type: 'department',
        department_id: '',
        team_id: '',
        code: '',
    });

    const seriesResult = (numerator: string, denominator: string) => {
        const num = parseFloat(numerator);
        const den = parseFloat(denominator);
        if (Number.isNaN(num) || Number.isNaN(den) || den === 0) return null;
        if (indicator.unit === '%') return ((num / den) * 100).toFixed(2);
        if (indicator.unit.includes('1000')) return ((num / den) * 1000).toFixed(2);
        return (num / den).toFixed(2);
    };

    const updateSeriesField = (index: number, field: 'numerator' | 'denominator' | 'result_value' | 'notes', value: string) => {
        const next = seriesForm.data.series_entries.map((row, rowIndex) => {
            if (rowIndex !== index) return row;
            const updated = { ...row, [field]: value };
            if (!updated.is_na && (field === 'numerator' || field === 'denominator')) {
                const calculated = seriesResult(updated.numerator, updated.denominator);
                if (calculated !== null) updated.result_value = calculated;
            }
            return updated;
        });
        seriesForm.setData('series_entries', next);
    };

    const setSeriesNa = (index: number, isNa: boolean) => {
        const next = seriesForm.data.series_entries.map((row, rowIndex) => {
            if (rowIndex !== index) return row;
            if (!isNa) return { ...row, is_na: false };
            return { ...row, is_na: true, numerator: '', denominator: '', result_value: '' };
        });
        seriesForm.setData('series_entries', next);
    };

    React.useEffect(() => {
        if (data.is_na) return;
        if (data.numerator !== '' && data.denominator !== '' && parseFloat(String(data.denominator)) !== 0) {
            const num = parseFloat(String(data.numerator));
            const den = parseFloat(String(data.denominator));
            if (Number.isNaN(num) || Number.isNaN(den)) return;

            let res = 0;
            if (indicator.unit === '%') {
                res = (num / den) * 100;
            } else if (indicator.unit.includes('1000')) {
                res = (num / den) * 1000;
            } else {
                res = num / den;
            }

            setData('result_value', res.toFixed(2));
        }
    }, [data.is_na, data.numerator, data.denominator]);

    const openCreate = () => {
        clearErrors();
        seriesForm.clearErrors();
        setEditingEntry(null);
        reset();
        setData(emptyForm());
        seriesForm.setData(emptySeriesForm());
        setIsOpen(true);
    };

    const openEdit = (entry: Entry) => {
        clearErrors();
        seriesForm.clearErrors();
        setEditingEntry(entry);
        if (hasSeries) {
            const period = toDateInput(entry.period_date);
            seriesForm.setData({
                period_date: period,
                series_entries: series.map((item) => {
                    const found = indicator.entries.find(
                        (row) => toDateInput(row.period_date) === period && (row.series_key || '') === item.key,
                    );
                    const isNa = Boolean(found?.is_na);
                    return {
                        series_key: item.key,
                        is_na: isNa,
                        numerator: isNa || found?.numerator == null ? '' : Number(found.numerator).toFixed(2),
                        denominator: isNa || found?.denominator == null ? '' : Number(found.denominator).toFixed(2),
                        result_value: isNa || found?.result_value == null ? '' : Number(found.result_value).toFixed(2),
                        notes: found?.notes || '',
                    };
                }),
            });
            setIsOpen(true);
            return;
        }
        const isNa = Boolean(entry.is_na);
        setData({
            period_date: toDateInput(entry.period_date),
            is_na: isNa,
            numerator: isNa || entry.numerator == null ? '' : Number(entry.numerator).toFixed(2),
            denominator: isNa || entry.denominator == null ? '' : Number(entry.denominator).toFixed(2),
            result_value: isNa || entry.result_value == null ? '' : Number(entry.result_value).toFixed(2),
            notes: entry.notes || '',
        });
        setIsOpen(true);
    };

    const unlockPage = () => {
        document.body.style.removeProperty('pointer-events');
        document.body.style.removeProperty('overflow');
    };

    const closeDialog = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            setEditingEntry(null);
            reset();
            clearErrors();
            unlockPage();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsOpen(false);
        unlockPage();

        const options = {
            preserveScroll: true,
            onFinish: () => unlockPage(),
            onSuccess: () => {
                setEditingEntry(null);
                reset();
                clearErrors();
                unlockPage();
            },
            onError: () => {
                setIsOpen(true);
                unlockPage();
            },
        };

        if (hasSeries) {
            seriesForm.post(route('quality-indicators.entries.store', indicator.id), {
                ...options,
                onSuccess: () => {
                    setEditingEntry(null);
                    seriesForm.reset();
                    seriesForm.clearErrors();
                    unlockPage();
                },
            });
            return;
        }

        if (editingEntry) {
            put(route('quality-indicators.entries.update', [indicator.id, editingEntry.id]), options);
            return;
        }

        post(route('quality-indicators.entries.store', indicator.id), options);
    };

    const handleDelete = (entry: Entry) => {
        const seriesLabel = seriesOf(entry)?.label;
        const periodLabel = periodText(entry.period_date);
        if (!confirm(`ต้องการลบข้อมูลงวด ${periodLabel}${seriesLabel ? ` · ${seriesLabel}` : ''} หรือไม่?`)) {
            return;
        }
        router.delete(route('quality-indicators.entries.destroy', [indicator.id, entry.id]));
    };

    const passesTarget = (value: number | string | null, operator: string, target: number | string | null) => {
        const result = Number(value);
        const goal = Number(target);
        if (Number.isNaN(result) || Number.isNaN(goal)) return false;
        switch (operator) {
            case '<': return result < goal;
            case '<=': return result <= goal;
            case '>': return result > goal;
            case '>=': return result >= goal;
            case '=': return result === goal;
            default: return false;
        }
    };

    const isPass = (value: number | string | null) => passesTarget(value, indicator.target_operator, indicator.target_value);

    const seriesOf = (entry: Entry) => series.find((item) => item.key === (entry.series_key || ''));

    const latestEntry = [...indicator.entries].sort(
        (a, b) => new Date(b.period_date).getTime() - new Date(a.period_date).getTime(),
    )[0];
    const latestIsNa = Boolean(latestEntry?.is_na);
    const latestPass = latestEntry && !latestIsNa ? isPass(latestEntry.result_value) : null;
    const latestSeriesRows = hasSeries && latestEntry
        ? series.map((item) => {
            const found = indicator.entries.find(
                (row) => toDateInput(row.period_date) === toDateInput(latestEntry.period_date) && (row.series_key || '') === item.key,
            );
            if (!found) return `${item.label} -`;
            return `${item.label} ${found.is_na ? 'N/A' : formatNum(found.result_value)}`;
        })
        : [];

    const chartData = useMemo(() => {
        if (hasSeries) {
            const byPeriod = new Map<string, { label: string; period: string; [key: string]: string | number | null }>();
            [...indicator.entries]
                .sort((a, b) => new Date(a.period_date).getTime() - new Date(b.period_date).getTime())
                .forEach((entry) => {
                    const period = toDateInput(entry.period_date);
                    const row = byPeriod.get(period) ?? {
                        label: periodText(entry.period_date),
                        period: entry.period_date,
                    };
                    row[entry.series_key || 'result'] = entry.is_na ? null : Number(entry.result_value);
                    byPeriod.set(period, row);
                });
            return [...byPeriod.values()];
        }

        return [...indicator.entries]
            .sort((a, b) => new Date(a.period_date).getTime() - new Date(b.period_date).getTime())
            .map((entry) => ({
                id: entry.id,
                label: periodText(entry.period_date),
                period: entry.period_date,
                result: entry.is_na ? null : Number(entry.result_value),
                target: Number(indicator.target_value ?? 0),
                pass: entry.is_na ? null : isPass(Number(entry.result_value)),
            }));
    }, [hasSeries, indicator.entries, indicator.frequency, indicator.target_value, indicator.target_operator]);

    const tableEntries = useMemo(
        () =>
            [...indicator.entries].sort(
                (a, b) => new Date(b.period_date).getTime() - new Date(a.period_date).getTime(),
            ),
        [indicator.entries],
    );

    const breadcrumbs = [
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'ตัวชี้วัดคุณภาพ', href: route('quality-indicators.index', { type: indicator.type }) },
        { title: indicator.code, href: '#' },
    ];

    return (
        <QualityPage
            tone="emerald"
            icon={BarChart2}
            badge="ศูนย์พัฒนาคุณภาพ · ตัวชี้วัด"
            title={`${indicator.code}: ${indicator.name}`}
            subtitle={
                familyMembers.length > 1
                    ? `${indicator.description || ''} · รหัสนี้เชื่อมข้อมูลชุดเดียวกับ ${familyMembers.length} รหัส`.trim()
                    : indicator.description || undefined
            }
            headTitle={`${indicator.code} - ${indicator.name}`}
            breadcrumbs={breadcrumbs}
            actions={
                <div className="flex flex-wrap gap-2">
                    <Link href={`${route('quality-assurance.index')}?indicator_id=${indicator.id}`}>
                        <Button type="button" variant="outline" className="rounded-xl border-violet-200 text-violet-800 hover:bg-violet-50">
                            <ClipboardCheck className="mr-2 h-4 w-4" />
                            ทบทวนตัวชี้วัดนี้
                        </Button>
                    </Link>
                    <a href={route('quality-indicators.export-indicator-pdf', indicator.id)} target="_blank" rel="noreferrer">
                        <Button type="button" variant="outline" className="rounded-xl border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                            <FileDown className="mr-2 h-4 w-4" />
                            ดาวน์โหลด PDF
                        </Button>
                    </a>
                    <Button onClick={openCreate} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="mr-2 h-4 w-4" />
                        บันทึกข้อมูล
                    </Button>
                </div>
            }
            subNav={<IndicatorsSubNav active="quality-indicators.index" />}
        >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <StatCard
                    label="เป้าหมาย"
                    value={hasSeries ? `${series.length} ชุด` : `${indicator.target_operator} ${formatNum(indicator.target_value)}`}
                    sub={hasSeries ? series.map((item) => `${item.label} ${item.target_operator} ${formatNum(item.target_value)}`).join(' · ') : indicator.unit}
                    icon={Target}
                    tone="emerald"
                />
                <StatCard label="ความถี่" value={indicator.frequency} icon={Calendar} tone="cyan" />
                <StatCard
                    label="ผลล่าสุด"
                    value={hasSeries ? (latestSeriesRows[0] ?? '-') : latestIsNa ? 'N/A' : latestEntry ? `${formatNum(latestEntry.result_value)} ${indicator.unit}` : '-'}
                    sub={hasSeries ? latestSeriesRows.slice(1).join(' · ') || 'ยังไม่มีข้อมูล' : latestIsNa ? 'ไม่นำมาคำนวณ' : latestPass === null ? 'ยังไม่มีข้อมูล' : latestPass ? 'ผ่าน' : 'ไม่ผ่าน'}
                    icon={BarChart2}
                    tone={latestIsNa || latestPass === null ? 'slate' : latestPass ? 'emerald' : 'rose'}
                />
            </div>

            <Panel
                title="รหัสที่เชื่อมข้อมูลชุดเดียวกัน"
                description="ตัวที่สร้างก่อนเป็นตัวหลัก · แก้ชื่อ/เป้า/ผลรายงวดที่รหัสใดก็มีผลทุกหัสในกลุ่มนี้"
                action={
                    <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => setAliasOpen(true)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        เพิ่มรหัสลูก
                    </Button>
                }
            >
                <div className="space-y-2">
                    {familyMembers.map((member) => (
                        <div
                            key={member.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-sm"
                        >
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Link
                                        href={route('quality-indicators.show', member.id)}
                                        className="font-semibold text-slate-800 hover:text-emerald-700"
                                    >
                                        {member.code || 'ไม่มีรหัส'}
                                    </Link>
                                    {member.is_master ? (
                                        <StatusPill label="ตัวหลัก" className="border-amber-200 bg-amber-50 text-amber-800" />
                                    ) : (
                                        <StatusPill label="รหัสลูก" className="border-violet-200 bg-violet-50 text-violet-700" />
                                    )}
                                    <span className="text-xs text-slate-500">{typeLabel(member.type)}</span>
                                </div>
                                <p className="text-xs text-slate-500">{memberOwner(member)}</p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {!member.is_master && member.id === indicator.id && (
                                    <>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="rounded-lg"
                                            onClick={() => {
                                                if (confirm('ตั้งรหัสนี้เป็นตัวหลัก? ข้อมูลรายงวดยังเป็นชุดเดิม')) {
                                                    router.post(route('quality-indicators.promote', indicator.id));
                                                }
                                            }}
                                        >
                                            <Crown className="mr-1 h-3.5 w-3.5" />
                                            ตั้งเป็นตัวหลัก
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="rounded-lg text-rose-700"
                                            onClick={() => {
                                                if (confirm('ยกเลิกการเชื่อม? รหัสนี้จะแยกตัวและคัดลอกข้อมูลงวดไว้กับตัวเอง')) {
                                                    router.post(route('quality-indicators.unlink', indicator.id));
                                                }
                                            }}
                                        >
                                            <Unlink className="mr-1 h-3.5 w-3.5" />
                                            ยกเลิกเชื่อม
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Panel>

            <Panel
                title="การทบทวนที่เชื่อมโยง"
                description="รายการทบทวนจากโมดูลติดตามทบทวนที่อ้างอิงตัวชี้วัดนี้"
                action={
                    <Link href={route('quality-assurance.index')}>
                        <Button type="button" size="sm" variant="outline" className="rounded-xl border-violet-200 text-violet-800">
                            <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                            ไปที่การทบทวน
                        </Button>
                    </Link>
                }
            >
                {(indicator.reviews?.length ?? 0) === 0 ? (
                    <EmptyState text="ยังไม่มีการทบทวนที่เชื่อมโยงตัวชี้วัดนี้ — สร้างได้ที่เมนูการติดตามทบทวน" />
                ) : (
                    <div className="space-y-2">
                        {indicator.reviews!.map((review) => (
                            <div
                                key={review.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2 text-sm"
                            >
                                <div>
                                    <div className="font-medium text-slate-800">{review.topic}</div>
                                    <div className="text-xs text-slate-500">
                                        กำหนด {formatThaiDateFromIso(String(review.schedule_date).slice(0, 10))} · {review.status}
                                    </div>
                                </div>
                                <StatusPill
                                    label={review.status}
                                    className={
                                        review.status === 'Completed'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-violet-200 bg-violet-50 text-violet-700'
                                    }
                                />
                            </div>
                        ))}
                    </div>
                )}
            </Panel>

            <Panel
                title={`กราฟตัวชี้วัด · ${indicator.code}: ${indicator.name}`}
                description={hasSeries ? 'เปรียบเทียบหัวข้อย่อยบนกราฟเดียวกัน แต่ละเส้นมีเป้าหมายของตัวเอง' : 'แนวโน้มผลลัพธ์ตามงวดข้อมูล พร้อมเส้นเป้าหมายของตัวชี้วัดนี้'}
                action={
                    <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {chartData.length} งวด
                    </div>
                }
            >
                {chartData.length === 0 ? (
                    <EmptyState text="ยังไม่มีข้อมูลสำหรับแสดงกราฟ — บันทึกผลการวัดก่อน" />
                ) : (
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id={`qi-fill-${indicator.id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    tickFormatter={(v) => formatNum(v)}
                                    width={56}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: 12,
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
                                    }}
                                    formatter={(value: number | string | null, name: string) => {
                                        const serie = series.find((item) => item.key === name);
                                        const label = serie ? serie.label : name === 'result' ? 'ผลลัพธ์' : name === 'target' ? 'เป้าหมาย' : name;
                                        if (value === null || value === undefined || value === '') return ['N/A', label];
                                        return [`${formatNum(value)} ${indicator.unit}`, label];
                                    }}
                                    labelFormatter={(label, payload) => {
                                        const row = payload?.[0]?.payload as { period?: string } | undefined;
                                        if (row?.period) {
                                            return formatThaiDateFromIso(row.period);
                                        }
                                        return String(label);
                                    }}
                                />
                                <Legend
                                    formatter={(value) => {
                                        const serie = series.find((item) => item.key === value);
                                        if (serie) return serie.label;
                                        return value === 'result' ? 'ผลลัพธ์' : value === 'target' ? 'เป้าหมาย' : value;
                                    }}
                                />
                                {hasSeries ? (
                                    <>
                                        {series.map((item, index) => (
                                            <Line
                                                key={item.key}
                                                type="monotone"
                                                dataKey={item.key}
                                                name={item.key}
                                                stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                                                strokeWidth={2.5}
                                                dot={{ r: 3.5, fill: SERIES_COLORS[index % SERIES_COLORS.length], strokeWidth: 0 }}
                                                activeDot={{ r: 5 }}
                                                connectNulls={false}
                                            />
                                        ))}
                                        {series.map((item, index) => (
                                            item.target_value == null ? null : (
                                                <ReferenceLine
                                                    key={`${item.key}-target`}
                                                    y={Number(item.target_value)}
                                                    stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                                                    strokeDasharray="6 4"
                                                    strokeWidth={1.5}
                                                />
                                            )
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        <Area
                                            type="monotone"
                                            dataKey="result"
                                            stroke="none"
                                            fill={`url(#qi-fill-${indicator.id})`}
                                            name="result"
                                            legendType="none"
                                            connectNulls={false}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="result"
                                            name="result"
                                            stroke="#059669"
                                            strokeWidth={2.5}
                                            dot={{ r: 3.5, fill: '#059669', strokeWidth: 0 }}
                                            activeDot={{ r: 5 }}
                                            connectNulls={false}
                                        />
                                        {indicator.target_value != null && (
                                            <ReferenceLine
                                                y={Number(indicator.target_value)}
                                                stroke="#f59e0b"
                                                strokeDasharray="6 4"
                                                strokeWidth={2}
                                                label={{
                                                    value: `เป้าหมาย ${indicator.target_operator} ${formatNum(indicator.target_value)}`,
                                                    position: 'insideTopRight',
                                                    fill: '#b45309',
                                                    fontSize: 11,
                                                }}
                                            />
                                        )}
                                    </>
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </Panel>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                    <Panel
                        title="ข้อมูลการวัดผล (Data Entries)"
                        description={hasSeries ? 'แต่ละหัวข้อย่อยบันทึกแยกกันในงวดเดียวกัน' : 'ประวัติการบันทึกชุดเดียวของกลุ่มนี้ — แก้ที่รหัสใดก็อัปเดตทุกหัสที่เชื่อมกัน'}
                        action={
                            <Button size="sm" onClick={openCreate} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="mr-2 h-4 w-4" />
                                บันทึกข้อมูล
                            </Button>
                        }
                    >
                        {tableEntries.length === 0 ? (
                            <EmptyState text="ยังไม่มีข้อมูล" />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                            <th className="py-2 pr-3">งวดข้อมูล</th>
                                            {hasSeries && <th className="py-2 pr-3">หัวข้อย่อย</th>}
                                            <th className="py-2 pr-3 text-right">ตัวตั้ง</th>
                                            <th className="py-2 pr-3 text-right">ตัวหาร</th>
                                            <th className="py-2 pr-3 text-right">ผลลัพธ์</th>
                                            <th className="py-2 pr-3 text-center">สถานะ</th>
                                            <th className="py-2 text-right">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableEntries.map((entry) => {
                                            const entrySeries = seriesOf(entry);
                                            const targetValue = entrySeries ? entrySeries.target_value : indicator.target_value;
                                            const targetOperator = entrySeries ? entrySeries.target_operator : indicator.target_operator;
                                            const isNa = Boolean(entry.is_na);
                                            const pass = isNa
                                                ? 'na'
                                                : targetValue == null || !targetOperator
                                                    ? null
                                                    : passesTarget(entry.result_value, targetOperator, targetValue);
                                            return (
                                                <tr key={entry.id} className="border-b border-slate-50">
                                                    <td className="py-2.5 pr-3 text-slate-700">
                                                        {periodText(entry.period_date)}
                                                    </td>
                                                    {hasSeries && (
                                                        <td className="py-2.5 pr-3 text-slate-700">{entrySeries?.label || '-'}</td>
                                                    )}
                                                    <td className="py-2.5 pr-3 text-right text-slate-600">{isNa ? '-' : formatNum(entry.numerator)}</td>
                                                    <td className="py-2.5 pr-3 text-right text-slate-600">{isNa ? '-' : formatNum(entry.denominator)}</td>
                                                    <td className="py-2.5 pr-3 text-right font-medium text-slate-800">
                                                        {isNa ? 'N/A' : `${formatNum(entry.result_value)} ${indicator.unit}`}
                                                    </td>
                                                    <td className="py-2.5 pr-3 text-center">
                                                        {pass === 'na' ? (
                                                            <StatusPill label="N/A" className="border-slate-200 bg-slate-50 text-slate-500" />
                                                        ) : pass === null ? (
                                                            <StatusPill label="ไม่มีเป้า" className="border-slate-200 bg-slate-50 text-slate-500" />
                                                        ) : (
                                                            <StatusPill
                                                                label={pass ? 'ผ่าน' : 'ไม่ผ่าน'}
                                                                className={
                                                                    pass
                                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                        : 'border-rose-200 bg-rose-50 text-rose-700'
                                                                }
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 text-right">
                                                        <div className="inline-flex items-center gap-1">
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-slate-500 hover:text-emerald-700"
                                                                onClick={() => openEdit(entry)}
                                                                title="แก้ไข"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-slate-400 hover:text-rose-600"
                                                                onClick={() => handleDelete(entry)}
                                                                title="ลบ"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Panel>
                </div>

                <Panel title="รายละเอียดตัวชี้วัด">
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-medium uppercase text-slate-400">เป้าหมาย</p>
                            <p className="text-lg font-semibold text-slate-800">
                                {indicator.target_operator} {formatNum(indicator.target_value)} {indicator.unit}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase text-slate-400">ความถี่</p>
                            <p className="text-slate-700">{indicator.frequency}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase text-slate-400">หมวดหมู่</p>
                            <p className="text-slate-700">{indicator.category}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase text-slate-400">คำนิยาม</p>
                            <p className="mt-1 text-sm text-slate-600">{indicator.description || '-'}</p>
                        </div>
                    </div>
                </Panel>
            </div>

            <Dialog open={aliasOpen} onOpenChange={(open) => {
                setAliasOpen(open);
                if (!open) {
                    document.body.style.removeProperty('pointer-events');
                    document.body.style.removeProperty('overflow');
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>เพิ่มรหัสลูก</DialogTitle>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            aliasForm.post(route('quality-indicators.aliases.store', indicator.id), {
                                preserveScroll: true,
                                onStart: () => {
                                    setAliasOpen(false);
                                    document.body.style.removeProperty('pointer-events');
                                    document.body.style.removeProperty('overflow');
                                },
                                onFinish: () => {
                                    document.body.style.removeProperty('pointer-events');
                                    document.body.style.removeProperty('overflow');
                                },
                                onSuccess: () => aliasForm.reset(),
                                onError: () => setAliasOpen(true),
                            });
                        }}
                    >
                        <div className="space-y-2">
                            <Label>ระดับ</Label>
                            <Select
                                value={aliasForm.data.type}
                                onValueChange={(v) => {
                                    aliasForm.setData('type', v);
                                    aliasForm.setData('department_id', '');
                                    aliasForm.setData('team_id', '');
                                }}
                            >
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="organization">ระดับองค์กร</SelectItem>
                                    <SelectItem value="department">ระดับแผนก/ฝ่าย</SelectItem>
                                    <SelectItem value="ha_team">ระดับทีม HA</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {aliasForm.data.type === 'department' && (
                            <div className="space-y-2">
                                <Label>แผนก/หน่วยงาน</Label>
                                <Select
                                    value={aliasForm.data.department_id}
                                    onValueChange={(v) => aliasForm.setData('department_id', v)}
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="เลือกแผนก" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept.id} value={String(dept.id)}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {aliasForm.errors.department_id && (
                                    <p className="text-xs text-rose-600">{aliasForm.errors.department_id}</p>
                                )}
                            </div>
                        )}
                        {aliasForm.data.type === 'ha_team' && (
                            <div className="space-y-2">
                                <Label>ทีม HA</Label>
                                <Select value={aliasForm.data.team_id} onValueChange={(v) => aliasForm.setData('team_id', v)}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="เลือกทีม" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teams.map((team) => (
                                            <SelectItem key={team.id} value={String(team.id)}>
                                                {team.abbreviation} - {team.name_th}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {aliasForm.errors.team_id && <p className="text-xs text-rose-600">{aliasForm.errors.team_id}</p>}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>รหัสลูก</Label>
                            <Input
                                value={aliasForm.data.code}
                                onChange={(e) => aliasForm.setData('code', e.target.value)}
                                placeholder="เช่น MED-IPD-01"
                                className="rounded-xl"
                                required
                            />
                            {aliasForm.errors.code && <p className="text-xs text-rose-600">{aliasForm.errors.code}</p>}
                            {aliasForm.errors.type && <p className="text-xs text-rose-600">{aliasForm.errors.type}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setAliasOpen(false)}>
                                ยกเลิก
                            </Button>
                            <Button type="submit" disabled={aliasForm.processing} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                                สร้างรหัสลูก
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isOpen} onOpenChange={closeDialog}>
                <DialogContent
                    className={hasSeries ? 'max-w-3xl overflow-visible' : 'overflow-visible'}
                    onPointerDownOutside={(event) => {
                        const target = event.target as HTMLElement | null;
                        if (target?.closest('[data-slot="popover-content"]')) {
                            event.preventDefault();
                        }
                    }}
                    onInteractOutside={(event) => {
                        const target = event.target as HTMLElement | null;
                        if (target?.closest('[data-slot="popover-content"]')) {
                            event.preventDefault();
                        }
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>{editingEntry ? 'แก้ไขข้อมูลตัวชี้วัด' : 'บันทึกข้อมูลตัวชี้วัด'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="period_date">วันที่/งวดข้อมูล</Label>
                            <ThaiDatePicker
                                label="งวดข้อมูล"
                                value={hasSeries ? seriesForm.data.period_date : data.period_date}
                                onChange={(date) => (hasSeries ? seriesForm.setData('period_date', date) : setData('period_date', date))}
                                placeholder="เลือกวันที่ (พ.ศ.)"
                            />
                            {(hasSeries ? seriesForm.errors.period_date : errors.period_date) && (
                                <p className="text-xs text-rose-600">{hasSeries ? seriesForm.errors.period_date : errors.period_date}</p>
                            )}
                        </div>
                        {hasSeries ? (
                            <div className="space-y-3">
                                {seriesForm.data.series_entries.map((row, index) => {
                                    const item = series.find((serie) => serie.key === row.series_key);
                                    return (
                                        <div key={row.series_key} className="space-y-2 rounded-xl border border-slate-200 p-3">
                                            <p className="text-sm font-semibold text-slate-800">
                                                {item?.label} · เป้าหมาย {item?.target_operator} {formatNum(item?.target_value)} {indicator.unit}
                                            </p>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-1">
                                                    <Label>ตัวตั้ง</Label>
                                                    <Input type="number" step="any" value={row.numerator} disabled={row.is_na} onChange={(e) => updateSeriesField(index, 'numerator', e.target.value)} className="rounded-xl" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label>ตัวหาร</Label>
                                                    <Input type="number" step="any" value={row.denominator} disabled={row.is_na} onChange={(e) => updateSeriesField(index, 'denominator', e.target.value)} className="rounded-xl" />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <Label>ผลลัพธ์ ({indicator.unit})</Label>
                                                        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                                            <Checkbox checked={row.is_na} onCheckedChange={(checked) => setSeriesNa(index, checked === true)} />
                                                            N/A
                                                        </label>
                                                    </div>
                                                    <Input type="number" step="any" value={row.result_value} disabled={row.is_na} onChange={(e) => updateSeriesField(index, 'result_value', e.target.value)} required={!row.is_na} className="rounded-xl" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {seriesForm.errors.series_entries && (
                                    <p className="text-xs text-rose-600">{seriesForm.errors.series_entries}</p>
                                )}
                            </div>
                        ) : (
                        <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="numerator">ตัวตั้ง (Numerator)</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    id="numerator"
                                    value={data.numerator}
                                    disabled={data.is_na}
                                    onChange={(e) => setData('numerator', e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="denominator">ตัวหาร (Denominator)</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    id="denominator"
                                    value={data.denominator}
                                    disabled={data.is_na}
                                    onChange={(e) => setData('denominator', e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <Label htmlFor="result_value">ผลลัพธ์ ({indicator.unit})</Label>
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                                    <Checkbox
                                        checked={data.is_na}
                                        onCheckedChange={(checked) => {
                                            const isNa = checked === true;
                                            setData({
                                                ...data,
                                                is_na: isNa,
                                                ...(isNa ? { numerator: '', denominator: '', result_value: '' } : {}),
                                            });
                                        }}
                                    />
                                    N/A
                                </label>
                            </div>
                            <Input
                                type="number"
                                step="any"
                                id="result_value"
                                value={data.result_value}
                                disabled={data.is_na}
                                onChange={(e) => setData('result_value', e.target.value)}
                                required={!data.is_na}
                                className="rounded-xl"
                            />
                            {errors.result_value && <p className="text-xs text-rose-600">{errors.result_value}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">หมายเหตุ</Label>
                            <Textarea
                                id="notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                        </>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" className="rounded-xl" onClick={() => closeDialog(false)}>
                                ยกเลิก
                            </Button>
                            <Button type="submit" disabled={processing || seriesForm.processing} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                                {editingEntry ? 'บันทึกการแก้ไข' : 'บันทึก'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </QualityPage>
    );
}
