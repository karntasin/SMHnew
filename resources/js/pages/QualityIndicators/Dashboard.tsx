import React, { useMemo, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { BarChart2, CheckCircle, XCircle, FileDown, Search } from 'lucide-react';
import { QualityPage, StatCard, Panel, StatusPill, EmptyState, qualityInput } from '@/components/quality/quality-ui';
import IndicatorsSubNav from '@/pages/QualityIndicators/IndicatorsSubNav';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatThaiMonthYearFromIso } from '@/components/ui/thai-date-picker';

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
    result_value: number;
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

interface Indicator {
    id: number;
    code: string;
    name: string;
    type?: string;
    target_value: number;
    target_operator: string;
    unit: string;
    entries: Entry[];
    department?: Department | null;
    team?: Team | null;
    is_master?: boolean;
    master_code?: string | null;
    aliases_count?: number;
}

interface Props {
    indicators: Indicator[];
    departments?: Department[];
    teams?: Team[];
    filters?: {
        type?: string | null;
        department_id?: number | null;
        team_id?: number | null;
    };
}

export default function Dashboard({
    indicators,
    departments = [],
    teams = [],
    filters,
}: Props) {
    const [typeFilter, setTypeFilter] = useState(filters?.type || 'all');
    const [departmentFilter, setDepartmentFilter] = useState(
        filters?.department_id ? String(filters.department_id) : 'all',
    );
    const [teamFilter, setTeamFilter] = useState(filters?.team_id ? String(filters.team_id) : 'all');
    const [search, setSearch] = useState('');

    const filteredIndicators = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return indicators;

        return indicators.filter(
            (ind) =>
                ind.name.toLowerCase().includes(q) ||
                ind.code?.toLowerCase().includes(q),
        );
    }, [indicators, search]);

    const applyFilters = (patch: { type?: string; department_id?: string; team_id?: string }) => {
        const nextType = patch.type ?? typeFilter;
        const nextDept = patch.department_id ?? departmentFilter;
        const nextTeam = patch.team_id ?? teamFilter;

        router.get(
            route('quality-indicators.dashboard'),
            {
                type: nextType !== 'all' ? nextType : undefined,
                department_id: nextType === 'department' && nextDept !== 'all' ? nextDept : undefined,
                team_id: nextType === 'ha_team' && nextTeam !== 'all' ? nextTeam : undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const isPass = (indicator: Indicator, value: number) => {
        const target = indicator.target_value;
        switch (indicator.target_operator) {
            case '<': return value < target;
            case '<=': return value <= target;
            case '>': return value > target;
            case '>=': return value >= target;
            case '=': return value === target;
            default: return false;
        }
    };

    const ownerLabel = (indicator: Indicator) => {
        if (indicator.type === 'department') return indicator.department?.name || 'ไม่ระบุแผนก';
        if (indicator.type === 'ha_team') {
            if (!indicator.team) return 'ไม่ระบุทีม';
            return `${indicator.team.abbreviation} · ${indicator.team.name_th}`;
        }
        return 'ระดับองค์กร';
    };

    const withData = filteredIndicators.filter((i) => i.entries[0]);
    const passCount = withData.filter((i) => isPass(i, i.entries[0].result_value)).length;
    const failCount = withData.length - passCount;

    const groupPdfHref = (() => {
        const effectiveType = typeFilter === 'all' ? 'department' : typeFilter;
        const params = new URLSearchParams({ type: effectiveType });
        if (effectiveType === 'department' && departmentFilter !== 'all') {
            params.set('department_id', departmentFilter);
        }
        if (effectiveType === 'ha_team' && teamFilter !== 'all') {
            params.set('team_id', teamFilter);
        }
        return `${route('quality-indicators.export-pdf')}?${params.toString()}`;
    })();

    const groupPdfLabel = (() => {
        if (typeFilter === 'ha_team') {
            return teamFilter !== 'all' ? 'PDF ทีมนี้' : 'PDF แยกตามทีม';
        }
        if (typeFilter === 'organization') {
            return 'PDF ระดับองค์กร';
        }
        if (typeFilter === 'department') {
            return departmentFilter !== 'all' ? 'PDF แผนกนี้' : 'PDF แยกตามแผนก';
        }
        return 'PDF แยกตามแผนก';
    })();

    const breadcrumbs = [
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'ตัวชี้วัดคุณภาพ', href: route('quality-indicators.index') },
        { title: 'ภาพรวม', href: route('quality-indicators.dashboard') },
    ];

    return (
        <QualityPage
            tone="emerald"
            icon={BarChart2}
            badge="ศูนย์พัฒนาคุณภาพ · ตัวชี้วัด"
            title="ภาพรวมตัวชี้วัด"
            subtitle="สถานะล่าสุดของตัวชี้วัดคุณภาพ — กรองตามระดับ / แผนก / ทีม"
            breadcrumbs={breadcrumbs}
            headTitle="ภาพรวมตัวชี้วัด"
            actions={
                <a href={groupPdfHref} target="_blank" rel="noreferrer">
                    <Button type="button" variant="outline" className="rounded-xl border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                        <FileDown className="mr-2 h-4 w-4" />
                        {groupPdfLabel}
                    </Button>
                </a>
            }
            subNav={<IndicatorsSubNav active="quality-indicators.dashboard" />}
        >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="ตัวชี้วัดทั้งหมด" value={indicators.length} icon={BarChart2} tone="emerald" />
                <StatCard
                    label="แสดงผล"
                    value={filteredIndicators.length}
                    sub={search.trim() ? 'หลังค้นหา' : `${indicators.length} รายการ`}
                    icon={Search}
                    tone="cyan"
                />
                <StatCard label="ผ่านเป้าหมาย" value={passCount} icon={CheckCircle} tone="emerald" />
                <StatCard label="ไม่ผ่านเป้าหมาย" value={failCount} icon={XCircle} tone="rose" />
            </div>

            <Panel title="กรองข้อมูล" description="ค้นหาชื่อ/รหัส และแยกดูตามระดับองค์กร / แผนก / ทีม HA">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[220px] flex-1 space-y-1.5">
                        <Label>ค้นหาตัวชี้วัด</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                placeholder="ชื่อหรือรหัสตัวชี้วัด..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className={cn(qualityInput, 'w-full pl-9')}
                            />
                        </div>
                    </div>
                    <div className="min-w-[180px] space-y-1.5">
                        <Label>ระดับ</Label>
                        <Select
                            value={typeFilter}
                            onValueChange={(v) => {
                                setTypeFilter(v);
                                setDepartmentFilter('all');
                                setTeamFilter('all');
                                applyFilters({ type: v, department_id: 'all', team_id: 'all' });
                            }}
                        >
                            <SelectTrigger className="rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">ทุกระดับ</SelectItem>
                                <SelectItem value="organization">ระดับองค์กร</SelectItem>
                                <SelectItem value="department">ระดับแผนก</SelectItem>
                                <SelectItem value="ha_team">ระดับทีม</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {typeFilter === 'department' && (
                        <div className="min-w-[220px] flex-1 space-y-1.5">
                            <Label>แผนก/หน่วยงาน</Label>
                            <Select
                                value={departmentFilter}
                                onValueChange={(v) => {
                                    setDepartmentFilter(v);
                                    applyFilters({ department_id: v });
                                }}
                            >
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="ทุกแผนก" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทุกแผนก</SelectItem>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept.id} value={String(dept.id)}>
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {typeFilter === 'ha_team' && (
                        <div className="min-w-[220px] flex-1 space-y-1.5">
                            <Label>ทีม HA</Label>
                            <Select
                                value={teamFilter}
                                onValueChange={(v) => {
                                    setTeamFilter(v);
                                    applyFilters({ team_id: v });
                                }}
                            >
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="ทุกทีม" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทุกทีม</SelectItem>
                                    {teams.map((team) => (
                                        <SelectItem key={team.id} value={String(team.id)}>
                                            {team.abbreviation} - {team.name_th}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {(typeFilter !== 'all' || departmentFilter !== 'all' || teamFilter !== 'all' || search.trim()) && (
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                                setTypeFilter('all');
                                setDepartmentFilter('all');
                                setTeamFilter('all');
                                setSearch('');
                                applyFilters({ type: 'all', department_id: 'all', team_id: 'all' });
                            }}
                        >
                            ล้างตัวกรอง
                        </Button>
                    )}
                </div>
            </Panel>

            <Panel title="สถานะตัวชี้วัดล่าสุด" description="คลิกเพื่อดูรายละเอียดและบันทึกข้อมูล">
                {filteredIndicators.length === 0 ? (
                    <EmptyState text={search.trim() ? 'ไม่พบตัวชี้วัดที่ค้นหา' : 'ไม่พบตัวชี้วัดตามเงื่อนไขที่กรอง'} />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredIndicators.map((indicator) => {
                            const latestEntry = indicator.entries[0];
                            const hasData = !!latestEntry;
                            const value = hasData ? latestEntry.result_value : 0;
                            const pass = hasData ? isPass(indicator, value) : false;

                            return (
                                <Link key={indicator.id} href={route('quality-indicators.show', { indicator: indicator.id })}>
                                    <div className="flex h-full cursor-pointer flex-col rounded-2xl border border-slate-200/70 bg-white p-4 transition-all hover:border-emerald-200 hover:shadow-md">
                                        <div className="mb-3 flex items-center justify-between gap-2">
                                            <span className="truncate text-sm font-semibold text-slate-700" title={indicator.name}>
                                                {indicator.code}
                                            </span>
                                            {hasData ? (
                                                <StatusPill
                                                    label={pass ? 'PASS' : 'FAIL'}
                                                    className={
                                                        pass
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                            : 'border-rose-200 bg-rose-50 text-rose-700'
                                                    }
                                                />
                                            ) : (
                                                <StatusPill label="NO DATA" className="border-slate-200 bg-slate-50 text-slate-500" />
                                            )}
                                        </div>
                                        <div className="text-2xl font-bold text-slate-900">
                                            {hasData ? `${formatNum(value)} ${indicator.unit}` : '-'}
                                        </div>
                                        <p className="mt-1 line-clamp-1 text-xs text-slate-500">{indicator.name}</p>
                                        <p className={cn('mt-1 text-[11px] font-medium text-emerald-700')}>{ownerLabel(indicator)}</p>
                                        {indicator.is_master === false && indicator.master_code ? (
                                            <p className="mt-1 text-[11px] text-violet-700">ข้อมูลเดียวกับ {indicator.master_code}</p>
                                        ) : null}
                                        <div className="mt-4 flex justify-between text-xs text-slate-400">
                                            <span>
                                                เป้าหมาย: {indicator.target_operator} {formatNum(indicator.target_value)}
                                            </span>
                                            <span>{hasData ? formatThaiMonthYearFromIso(latestEntry.period_date) : '-'}</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </Panel>
        </QualityPage>
    );
}
