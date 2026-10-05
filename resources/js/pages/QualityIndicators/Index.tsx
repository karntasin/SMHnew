import React, { useState, useEffect } from 'react';
import { Link, useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, BarChart2, MoreVertical, Pencil, Trash, Trash2, FileDown, Upload, Link2, ClipboardCheck, Target, Layers, Copy, RotateCcw, List } from 'lucide-react';
import { QualityPage, StatCard, Panel, StatusPill, EmptyState, qualityInput } from '@/components/quality/quality-ui';
import IndicatorsSubNav from '@/pages/QualityIndicators/IndicatorsSubNav';
import { cn } from '@/lib/utils';

const formatNum = (value: number | string | null | undefined, digits = 2): string => {
    if (value === null || value === undefined || value === '') return '-';
    const n = Number(value);
    if (Number.isNaN(n)) return '-';
    return n.toLocaleString('th-TH', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
};

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
    category: string;
    unit: string;
    frequency: string;
    target_value: number;
    target_operator: string;
    is_active: boolean;
    description: string;
    formula_description: string;
    type?: string;
    entries_count?: number;
    aliases_count?: number;
    is_master?: boolean;
    master_code?: string | null;
    department?: Department;
    team?: Team;
    deleted_at?: string | null;
    deleted_by_name?: string | null;
    restored_at?: string | null;
    restored_by_name?: string | null;
}

interface LinkableIndicator {
    id: number;
    code: string | null;
    name: string;
    type: string;
    owner?: string;
}

const LINK_TYPE_LABEL: Record<string, string> = {
    organization: 'ระดับองค์กร',
    department: 'ระดับแผนก/ฝ่าย',
    ha_team: 'ระดับทีม HA',
};

export default function Index({ indicators, type, view = 'list', trashCount = 0, departments, teams, linkableIndicators = [], filters, orgCategoryCounts }: {
    indicators: Indicator[];
    type: 'department' | 'ha_team' | 'organization';
    view?: 'list' | 'trash';
    trashCount?: number;
    departments: Department[];
    teams: Team[];
    linkableIndicators?: LinkableIndicator[];
    filters?: {
        department_id?: number | null;
        team_id?: number | null;
        category?: string | null;
        search?: string;
    };
    orgCategoryCounts?: {
        all: number;
        sar: number;
        strategy: number;
    };
}) {
    const isTrash = view === 'trash';
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState(filters?.search || '');
    const [departmentFilter, setDepartmentFilter] = useState(filters?.department_id ? String(filters.department_id) : 'all');
    const [teamFilter, setTeamFilter] = useState(filters?.team_id ? String(filters.team_id) : 'all');
    const [orgCategoryFilter, setOrgCategoryFilter] = useState(filters?.category || 'all');
    const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null);
    const [copyingFrom, setCopyingFrom] = useState<Indicator | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Indicator | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [restoringId, setRestoringId] = useState<number | null>(null);
    const [linkSourceType, setLinkSourceType] = useState<'all' | 'organization' | 'department' | 'ha_team'>('all');
    const [linkSearch, setLinkSearch] = useState('');

    const defaultCategoryForType = (t: string, currentCatFilter = orgCategoryFilter) => {
        if (t === 'organization') {
            if (currentCatFilter === 'แผนยุทธศาสตร์ รพ.') return 'แผนยุทธศาสตร์ รพ.';
            return 'แบบประเมินตนเอง SAR';
        }
        return 'Clinical';
    };

    const { data, setData, post, put, processing, errors, reset } = useForm({
        type: type,
        department_id: '',
        team_id: '',
        code: '',
        name: '',
        category: defaultCategoryForType(type),
        unit: '%',
        target_value: '',
        target_operator: '<',
        frequency: 'Monthly',
        description: '',
        formula_description: '',
        is_active: true,
        link_to_id: '',
    });

    useEffect(() => {
        if (editingIndicator) {
            setData({
                type: type,
                department_id: editingIndicator.department?.id.toString() || '',
                team_id: editingIndicator.team?.id.toString() || '',
                code: editingIndicator.code || '',
                name: editingIndicator.name || '',
                category: editingIndicator.category || defaultCategoryForType(type),
                unit: editingIndicator.unit || '%',
                target_value: editingIndicator.target_value?.toString() || '',
                target_operator: editingIndicator.target_operator || '<',
                frequency: editingIndicator.frequency || 'Monthly',
                description: editingIndicator.description || '',
                formula_description: editingIndicator.formula_description || '',
                is_active: editingIndicator.is_active,
                link_to_id: '',
            });
            setIsOpen(true);
        } else if (copyingFrom) {
            setData({
                type: type,
                department_id: copyingFrom.department?.id.toString() || '',
                team_id: copyingFrom.team?.id.toString() || '',
                code: copyingFrom.code ? `${copyingFrom.code}-copy` : '',
                name: copyingFrom.name ? `${copyingFrom.name} (สำเนา)` : '',
                category: copyingFrom.category || defaultCategoryForType(type),
                unit: copyingFrom.unit || '%',
                target_value: copyingFrom.target_value !== null && copyingFrom.target_value !== undefined ? copyingFrom.target_value.toString() : '',
                target_operator: copyingFrom.target_operator || '<',
                frequency: copyingFrom.frequency || 'Monthly',
                description: copyingFrom.description || '',
                formula_description: copyingFrom.formula_description || '',
                is_active: true,
                link_to_id: '',
            });
            setIsOpen(true);
        } else {
            reset();
            setData('type', type);
            setData('category', defaultCategoryForType(type));
            setLinkSourceType('all');
            setLinkSearch('');
        }
    }, [editingIndicator, copyingFrom, type]);

    useEffect(() => {
        setDepartmentFilter(filters?.department_id ? String(filters.department_id) : 'all');
        setTeamFilter(filters?.team_id ? String(filters.team_id) : 'all');
        setOrgCategoryFilter(filters?.category || 'all');
        setSearch(filters?.search || '');
    }, [type, filters?.department_id, filters?.team_id, filters?.category]);

    const applyListFilters = (patch: {
        department_id?: string;
        team_id?: string;
        category?: string;
        search?: string;
    }) => {
        const nextDept = patch.department_id ?? departmentFilter;
        const nextTeam = patch.team_id ?? teamFilter;
        const nextCat = patch.category ?? orgCategoryFilter;
        const nextSearch = patch.search ?? search;

        router.get(
            route('quality-indicators.index'),
            {
                type,
                department_id: type === 'department' && nextDept !== 'all' ? nextDept : undefined,
                team_id: type === 'ha_team' && nextTeam !== 'all' ? nextTeam : undefined,
                category: type === 'organization' && nextCat !== 'all' ? nextCat : undefined,
                search: nextSearch || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const getPageTitle = () => {
        if (isTrash) return 'ถังขยะตัวชี้วัดคุณภาพ';
        switch (type) {
            case 'organization': return 'ตัวชี้วัดคุณภาพ (ระดับองค์กร)';
            case 'department': return 'ตัวชี้วัดคุณภาพ (ระดับแผนก)';
            case 'ha_team': return 'ตัวชี้วัดคุณภาพ (ระดับทีม)';
            default: return 'ตัวชี้วัดคุณภาพ';
        }
    };
    const pageTitle = getPageTitle();

    const getSubtitle = () => {
        if (isTrash) return 'กู้คืนตัวชี้วัดที่ถูกลบ พร้อมดูผู้ลบและเวลาที่ลบ';
        if (type === 'department') return 'บริหารจัดการตัวชี้วัดคุณภาพระดับแผนก/หน่วยงาน';
        if (type === 'ha_team') return 'บริหารจัดการตัวชี้วัดคุณภาพระดับทีมนำทางคลินิก (PCT/Teams)';
        return 'บริหารจัดการตัวชี้วัดคุณภาพระดับองค์กร (แบบประเมินตนเอง SAR & แผนยุทธศาสตร์ รพ.)';
    };

    const ownerLabel = (indicator: Indicator) => {
        const indicatorType = indicator.type || type;
        if (indicatorType === 'department') return indicator.department?.name || 'ไม่ระบุแผนก';
        if (indicatorType === 'ha_team') {
            if (!indicator.team) return 'ไม่ระบุทีม';
            return `${indicator.team.abbreviation} · ${indicator.team.name_th}`;
        }
        return 'ระดับองค์กร';
    };

    const handleCreate = () => {
        setEditingIndicator(null);
        setCopyingFrom(null);
        reset();
        setData((prev) => ({
            ...prev,
            type: type,
            category: defaultCategoryForType(type),
        }));
        setLinkSourceType('all');
        setLinkSearch('');
        setIsOpen(true);
    };

    const handleEdit = (indicator: Indicator) => {
        setCopyingFrom(null);
        setEditingIndicator(indicator);
    };

    const handleCopy = (indicator: Indicator) => {
        setEditingIndicator(null);
        setCopyingFrom(indicator);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsOpen(false);
        unlockPage();

        const options = {
            preserveScroll: true,
            onFinish: () => unlockPage(),
            onSuccess: () => {
                setEditingIndicator(null);
                setCopyingFrom(null);
                reset();
                unlockPage();
            },
            onError: () => {
                setIsOpen(true);
                unlockPage();
            },
        };

        if (editingIndicator) {
            put(route('quality-indicators.update', editingIndicator.id), options);
        } else {
            post(route('quality-indicators.store'), options);
        }
    };

    const unlockPage = () => {
        document.body.style.pointerEvents = '';
        document.body.style.overflow = '';
    };

    const handleDelete = () => {
        if (!deleteTarget || deleting) return;

        const id = deleteTarget.id;
        setDeleteTarget(null);
        setDeleting(true);
        unlockPage();

        router.delete(route('quality-indicators.destroy', id), {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                unlockPage();
            },
            onError: () => {
                setDeleting(false);
                unlockPage();
            },
        });
    };

    const handleRestore = (indicator: Indicator) => {
        if (restoringId) return;
        setRestoringId(indicator.id);
        router.post(route('quality-indicators.restore', indicator.id), {}, {
            preserveScroll: true,
            onFinish: () => setRestoringId(null),
            onError: (errors) => {
                setRestoringId(null);
                const message = errors.code || errors.indicator || Object.values(errors)[0];
                if (message) {
                    window.alert(String(message));
                }
            },
        });
    };

    const formatDateTime = (value?: string | null) => {
        if (!value) return '-';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleString('th-TH', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    };

    const typeLabel = (t?: string) => {
        if (t === 'organization') return 'ระดับองค์กร';
        if (t === 'ha_team') return 'ระดับทีม';
        return 'ระดับแผนก';
    };

    const deleteEntriesCount = deleteTarget?.entries_count ?? 0;
    const hasDeleteEntries = deleteEntriesCount > 0;
    const isLinking = !editingIndicator && !!data.link_to_id;

    const filteredLinkable = linkableIndicators.filter((item) => {
        if (linkSourceType !== 'all' && item.type !== linkSourceType) return false;
        const q = linkSearch.trim().toLowerCase();
        if (!q) return true;
        return (
            (item.code || '').toLowerCase().includes(q) ||
            item.name.toLowerCase().includes(q) ||
            (item.owner || '').toLowerCase().includes(q)
        );
    });

    const linkableByType = {
        organization: filteredLinkable.filter((i) => i.type === 'organization'),
        department: filteredLinkable.filter((i) => i.type === 'department'),
        ha_team: filteredLinkable.filter((i) => i.type === 'ha_team'),
    };

    const selectedLink = linkableIndicators.find((i) => String(i.id) === String(data.link_to_id));

    const filteredIndicators = indicators.filter(
        (ind) =>
            ind.name.toLowerCase().includes(search.toLowerCase()) ||
            ind.code?.toLowerCase().includes(search.toLowerCase()) ||
            ind.master_code?.toLowerCase().includes(search.toLowerCase()),
    );

    const activeCount = indicators.filter((i) => i.is_active).length;

    const breadcrumbs = [
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'ตัวชี้วัดคุณภาพ', href: route('quality-indicators.index') },
    ];

    const typeTabs = [
        { key: 'organization' as const, label: 'ระดับองค์กร' },
        { key: 'department' as const, label: 'ระดับแผนก/ฝ่าย' },
        { key: 'ha_team' as const, label: 'ระดับทีม' },
    ];

    const groupPdfHref = (() => {
        const params = new URLSearchParams({ type });
        if (type === 'department' && departmentFilter !== 'all') {
            params.set('department_id', departmentFilter);
        }
        if (type === 'ha_team' && teamFilter !== 'all') {
            params.set('team_id', teamFilter);
        }
        if (type === 'organization' && orgCategoryFilter !== 'all') {
            params.set('category', orgCategoryFilter);
        }
        return `${route('quality-indicators.export-pdf')}?${params.toString()}`;
    })();

    const groupPdfLabel = (() => {
        if (type === 'department') {
            return departmentFilter !== 'all' ? 'PDF แผนกนี้' : 'PDF แยกตามแผนก';
        }
        if (type === 'ha_team') {
            return teamFilter !== 'all' ? 'PDF ทีมนี้' : 'PDF แยกตามทีม';
        }
        if (orgCategoryFilter === 'แบบประเมินตนเอง SAR') return 'PDF แบบประเมิน SAR';
        if (orgCategoryFilter === 'แผนยุทธศาสตร์ รพ.') return 'PDF แผนยุทธศาสตร์ รพ.';
        return 'PDF ระดับองค์กร';
    })();

    return (
        <QualityPage
            tone="emerald"
            icon={BarChart2}
            badge="ศูนย์พัฒนาคุณภาพ · ตัวชี้วัด"
            title={pageTitle}
            subtitle={getSubtitle()}
            breadcrumbs={breadcrumbs}
            actions={
                <div className="flex flex-wrap gap-2">
                    {!isTrash && (
                        <>
                            <a href={groupPdfHref} target="_blank" rel="noreferrer">
                                <Button type="button" variant="outline" className="rounded-xl border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                                    <FileDown className="mr-2 h-4 w-4" />
                                    {groupPdfLabel}
                                </Button>
                            </a>
                            <Link
                                href={route('quality-indicators.import.index', {
                                    type,
                                    ...(type === 'department' && departmentFilter !== 'all' ? { department_id: departmentFilter } : {}),
                                    ...(type === 'ha_team' && teamFilter !== 'all' ? { team_id: teamFilter } : {}),
                                })}
                            >
                                <Button type="button" variant="outline" className="rounded-xl border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                                    <Upload className="mr-2 h-4 w-4" />
                                    นำเข้า Excel
                                </Button>
                            </Link>
                            <Button onClick={handleCreate} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="mr-2 h-4 w-4" />
                                เพิ่มตัวชี้วัด
                            </Button>
                        </>
                    )}
                    <Link href={isTrash ? route('quality-indicators.index', { type }) : route('quality-indicators.index', { view: 'trash' })}>
                        <Button
                            type="button"
                            variant="outline"
                            className={cn(
                                'rounded-xl',
                                isTrash
                                    ? 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                                    : 'border-rose-200 text-rose-700 hover:bg-rose-50',
                            )}
                        >
                            {isTrash ? (
                                <>
                                    <List className="mr-2 h-4 w-4" />
                                    กลับรายการ
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    ถังขยะ{trashCount > 0 ? ` (${trashCount})` : ''}
                                </>
                            )}
                        </Button>
                    </Link>
                </div>
            }
            subNav={
                <IndicatorsSubNav
                    active={isTrash ? 'quality-indicators.trash' : 'quality-indicators.index'}
                    trashCount={trashCount}
                />
            }
        >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <StatCard
                    label={isTrash ? 'ในถังขยะ' : 'ตัวชี้วัดทั้งหมด'}
                    value={indicators.length}
                    icon={isTrash ? Trash2 : BarChart2}
                    tone="emerald"
                />
                {!isTrash ? (
                    <>
                        <StatCard label="Active" value={activeCount} sub={`${indicators.length - activeCount} inactive`} icon={BarChart2} tone="teal" />
                        <StatCard label="แสดงผล" value={filteredIndicators.length} sub="หลังกรองค้นหา" icon={Search} tone="cyan" />
                    </>
                ) : (
                    <>
                        <StatCard label="แสดงผล" value={filteredIndicators.length} sub="หลังค้นหา" icon={Search} tone="cyan" />
                        <StatCard label="กู้คืนได้" value={filteredIndicators.length} sub="ข้อมูลวัดผลยังอยู่" icon={RotateCcw} tone="teal" />
                    </>
                )}
            </div>

            {!isTrash && (
            <div className="flex flex-wrap gap-2">
                {typeTabs.map((tab) => (
                    <Link key={tab.key} href={route('quality-indicators.index', { type: tab.key })}>
                        <button
                            type="button"
                            className={cn(
                                'rounded-xl border px-4 py-2 text-sm font-semibold transition',
                                type === tab.key
                                    ? 'border-emerald-400 bg-emerald-600 text-white'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50',
                            )}
                        >
                            <BarChart2 className="mr-1 inline h-4 w-4" />
                            {tab.label}
                        </button>
                    </Link>
                ))}
            </div>
            )}

            {!isTrash && type === 'organization' && (
                <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50/70 via-blue-50/40 to-indigo-50/30 p-3.5 sm:p-4 shadow-xs">
                    <div className="mb-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="inline-block h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-sky-900">
                                หัวข้อย่อยตัวชี้วัดระดับองค์กร
                            </span>
                        </div>
                        {orgCategoryFilter !== 'all' && (
                            <button
                                type="button"
                                onClick={() => {
                                    setOrgCategoryFilter('all');
                                    applyListFilters({ category: 'all' });
                                }}
                                className="text-xs font-medium text-sky-700 hover:text-sky-900 hover:underline"
                            >
                                ดูทั้งหมด
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                        <button
                            type="button"
                            onClick={() => {
                                setOrgCategoryFilter('all');
                                applyListFilters({ category: 'all' });
                            }}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all cursor-pointer',
                                orgCategoryFilter === 'all'
                                    ? 'border-sky-600 bg-sky-600 text-white shadow-sm ring-2 ring-sky-200'
                                    : 'border-white bg-white text-slate-700 shadow-2xs hover:border-sky-200 hover:bg-sky-50/50',
                            )}
                        >
                            <Layers className="h-4 w-4" />
                            <span>ทั้งหมด</span>
                            <span
                                className={cn(
                                    'ml-1 rounded-full px-2 py-0.5 text-xs font-bold',
                                    orgCategoryFilter === 'all'
                                        ? 'bg-sky-700 text-white'
                                        : 'bg-slate-100 text-slate-700',
                                )}
                            >
                                {orgCategoryCounts?.all ?? indicators.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                const cat = 'แบบประเมินตนเอง SAR';
                                setOrgCategoryFilter(cat);
                                applyListFilters({ category: cat });
                            }}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all cursor-pointer',
                                orgCategoryFilter === 'แบบประเมินตนเอง SAR'
                                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm ring-2 ring-blue-200'
                                    : 'border-white bg-white text-slate-700 shadow-2xs hover:border-blue-200 hover:bg-blue-50/50',
                            )}
                        >
                            <ClipboardCheck className="h-4 w-4" />
                            <span>แบบประเมินตนเอง SAR</span>
                            <span
                                className={cn(
                                    'ml-1 rounded-full px-2 py-0.5 text-xs font-bold',
                                    orgCategoryFilter === 'แบบประเมินตนเอง SAR'
                                        ? 'bg-blue-700 text-white'
                                        : 'bg-blue-100 text-blue-700',
                                )}
                            >
                                {orgCategoryCounts?.sar ?? 0}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                const cat = 'แผนยุทธศาสตร์ รพ.';
                                setOrgCategoryFilter(cat);
                                applyListFilters({ category: cat });
                            }}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all cursor-pointer',
                                orgCategoryFilter === 'แผนยุทธศาสตร์ รพ.'
                                    ? 'border-amber-600 bg-amber-600 text-white shadow-sm ring-2 ring-amber-200'
                                    : 'border-white bg-white text-slate-700 shadow-2xs hover:border-amber-200 hover:bg-amber-50/50',
                            )}
                        >
                            <Target className="h-4 w-4" />
                            <span>แผนยุทธศาสตร์ รพ.</span>
                            <span
                                className={cn(
                                    'ml-1 rounded-full px-2 py-0.5 text-xs font-bold',
                                    orgCategoryFilter === 'แผนยุทธศาสตร์ รพ.'
                                        ? 'bg-amber-700 text-white'
                                        : 'bg-amber-100 text-amber-800',
                                )}
                            >
                                {orgCategoryCounts?.strategy ?? 0}
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {!isTrash && (type === 'department' || type === 'ha_team') && (
                <Panel title="กรองข้อมูล" description={type === 'department' ? 'แยกดูตามแผนก/หน่วยงาน' : 'แยกดูตามทีม HA'}>
                    <div className="flex flex-wrap items-end gap-3">
                        {type === 'department' ? (
                            <div className="min-w-[220px] flex-1 space-y-1.5">
                                <Label>แผนก/หน่วยงาน</Label>
                                <Select
                                    value={departmentFilter}
                                    onValueChange={(v) => {
                                        setDepartmentFilter(v);
                                        applyListFilters({ department_id: v });
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
                        ) : (
                            <div className="min-w-[220px] flex-1 space-y-1.5">
                                <Label>ทีม HA</Label>
                                <Select
                                    value={teamFilter}
                                    onValueChange={(v) => {
                                        setTeamFilter(v);
                                        applyListFilters({ team_id: v });
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
                        {(departmentFilter !== 'all' || teamFilter !== 'all') && (
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => {
                                    setDepartmentFilter('all');
                                    setTeamFilter('all');
                                    applyListFilters({ department_id: 'all', team_id: 'all' });
                                }}
                            >
                                ล้างตัวกรอง
                            </Button>
                        )}
                    </div>
                </Panel>
            )}

            <Panel
                title={isTrash ? 'ตัวชี้วัดในถังขยะ' : 'รายการตัวชี้วัด'}
                description={isTrash ? 'กู้คืนตัวชี้วัดที่ถูกลบ — ข้อมูลการวัดผลยังถูกเก็บไว้' : 'ค้นหาและจัดการตัวชี้วัดคุณภาพ'}
                action={
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            placeholder="ค้นหาตัวชี้วัด..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={cn(qualityInput, 'w-full pl-9 sm:w-64')}
                        />
                    </div>
                }
            >
                {filteredIndicators.length === 0 ? (
                    <EmptyState text={isTrash ? 'ไม่มีตัวชี้วัดในถังขยะ' : 'ไม่พบตัวชี้วัด'} />
                ) : isTrash ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredIndicators.map((indicator) => (
                            <div
                                key={indicator.id}
                                className="flex h-full flex-col rounded-2xl border border-rose-200/70 bg-white p-4"
                            >
                                <div className="mb-2 flex items-start justify-between gap-2">
                                    <StatusPill
                                        label={indicator.code || 'No Code'}
                                        className="border-slate-200 bg-slate-50 text-slate-600"
                                    />
                                    <StatusPill
                                        label={typeLabel(indicator.type)}
                                        className="border-rose-200 bg-rose-50 text-rose-700"
                                    />
                                </div>
                                <h3 className="mb-1 text-base font-semibold text-slate-900">{indicator.name}</h3>
                                <p className="mb-3 text-xs font-medium text-emerald-700">{ownerLabel(indicator)}</p>
                                <div className="mb-4 space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                                    <p>
                                        <span className="font-semibold text-slate-800">ผู้ลบ:</span>{' '}
                                        {indicator.deleted_by_name || 'ไม่ระบุ'}
                                    </p>
                                    <p>
                                        <span className="font-semibold text-slate-800">ลบเมื่อ:</span>{' '}
                                        {formatDateTime(indicator.deleted_at)}
                                    </p>
                                    {(indicator.entries_count ?? 0) > 0 && (
                                        <p>
                                            <span className="font-semibold text-slate-800">ข้อมูลวัดผล:</span>{' '}
                                            {indicator.entries_count?.toLocaleString('th-TH')} รายการ (ยังอยู่)
                                        </p>
                                    )}
                                </div>
                                <div className="mt-auto">
                                    <Button
                                        type="button"
                                        className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700"
                                        disabled={restoringId === indicator.id}
                                        onClick={() => handleRestore(indicator)}
                                    >
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        {restoringId === indicator.id ? 'กำลังกู้คืน...' : 'กู้คืน'}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredIndicators.map((indicator) => (
                            <div key={indicator.id} className="group relative">
                                <Link href={route('quality-indicators.show', indicator.id)}>
                                    <div className="flex h-full cursor-pointer flex-col rounded-2xl border border-slate-200/70 bg-white p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50/30">
                                        <div className="mb-2 flex items-start justify-between pr-8">
                                            <StatusPill
                                                label={indicator.code || 'No Code'}
                                                className="border-slate-200 bg-slate-50 text-slate-600"
                                            />
                                            <StatusPill
                                                label={indicator.is_active ? 'Active' : 'Inactive'}
                                                className={
                                                    indicator.is_active
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                        : 'border-slate-200 bg-slate-50 text-slate-500'
                                                }
                                            />
                                        </div>
                                        {indicator.category === 'แบบประเมินตนเอง SAR' ? (
                                            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-2 py-0.5 text-xs font-semibold text-blue-700 w-fit">
                                                <ClipboardCheck className="h-3.5 w-3.5" />
                                                <span>แบบประเมินตนเอง SAR</span>
                                            </div>
                                        ) : indicator.category === 'แผนยุทธศาสตร์ รพ.' ? (
                                            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/80 px-2 py-0.5 text-xs font-semibold text-amber-800 w-fit">
                                                <Target className="h-3.5 w-3.5" />
                                                <span>แผนยุทธศาสตร์ รพ.</span>
                                            </div>
                                        ) : (
                                            <p className="mb-1 text-sm text-slate-500">{indicator.category || 'ทั่วไป'}</p>
                                        )}
                                        <p className="mb-2 text-xs font-medium text-emerald-700">{ownerLabel(indicator)}</p>
                                        {(indicator.aliases_count ?? 0) > 0 || indicator.is_master === false ? (
                                            <p className="mb-4 inline-flex items-center gap-1 text-[11px] font-medium text-violet-700">
                                                <Link2 className="h-3 w-3" />
                                                {indicator.is_master === false
                                                    ? `รหัสลูก · ข้อมูลเดียวกับ ${indicator.master_code || 'ตัวหลัก'}`
                                                    : `ตัวหลัก · มีรหัสเชื่อม ${indicator.aliases_count} รหัส`}
                                            </p>
                                        ) : (
                                            <div className="mb-4" />
                                        )}
                                        <div className="mt-auto flex justify-between border-t border-slate-100 pt-4 text-sm text-slate-600">
                                            <span>
                                                เป้าหมาย: {indicator.target_operator} {formatNum(indicator.target_value)} {indicator.unit}
                                            </span>
                                            <span className="text-slate-400">{indicator.frequency}</span>
                                        </div>
                                    </div>
                                </Link>

                                <div className="absolute right-3 top-3">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem asChild>
                                                <a
                                                    href={route('quality-indicators.export-indicator-pdf', indicator.id)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <FileDown className="mr-2 h-4 w-4" />
                                                    ดาวน์โหลด PDF
                                                </a>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleEdit(indicator)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                แก้ไข (Edit)
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleCopy(indicator)}>
                                                <Copy className="mr-2 h-4 w-4" />
                                                คัดลอกและสร้างใหม่ (Duplicate)
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-red-600"
                                                onSelect={(e) => {
                                                    // รอให้ Dropdown ปิดก่อน แล้วค่อยเปิด Confirm เพื่อไม่ให้ pointer-events ค้าง
                                                    e.preventDefault();
                                                    window.setTimeout(() => setDeleteTarget(indicator), 50);
                                                }}
                                            >
                                                <Trash className="mr-2 h-4 w-4" />
                                                ลบ (Delete)
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>

            <Dialog
                open={isOpen}
                onOpenChange={(open) => {
                    setIsOpen(open);
                    if (!open) {
                        setEditingIndicator(null);
                        setCopyingFrom(null);
                        unlockPage();
                    }
                }}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingIndicator
                                ? 'แก้ไขตัวชี้วัด'
                                : copyingFrom
                                ? 'คัดลอกและสร้างตัวชี้วัดใหม่'
                                : 'เพิ่มตัวชี้วัดใหม่'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingIndicator
                                ? 'การแก้ชื่อ/เป้า/สูตร มีผลต่อทุกรหัสที่เชื่อมข้อมูลชุดเดียวกัน'
                                : copyingFrom
                                ? `คัดลอกข้อมูลจาก "${copyingFrom.code ? copyingFrom.code + ' ' : ''}${copyingFrom.name}" สามารถแก้ไขข้อมูลก่อนบันทึกเป็นตัวชี้วัดใหม่ได้`
                                : 'สร้างตัวใหม่ หรือสร้างรหัสลูกที่ชี้ข้อมูลชุดเดียวกับตัวชี้วัดที่มีอยู่'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {copyingFrom && (
                            <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-800">
                                <Copy className="h-4 w-4 shrink-0 text-blue-600" />
                                <div>
                                    กำลังคัดลอกข้อมูลจาก <strong>{copyingFrom.code ? `${copyingFrom.code} - ` : ''}{copyingFrom.name}</strong> เพื่อสร้างเป็นตัวชี้วัดตัวใหม่
                                </div>
                            </div>
                        )}
                        {!editingIndicator && !copyingFrom && (
                            <div className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-3">
                                <Label>ใช้ร่วมกับตัวชี้วัดที่มีอยู่</Label>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <p className="text-[11px] font-medium text-slate-500">เลือกจากระดับ</p>
                                        <Select
                                            value={linkSourceType}
                                            onValueChange={(v) =>
                                                setLinkSourceType(v as 'all' | 'organization' | 'department' | 'ha_team')
                                            }
                                        >
                                            <SelectTrigger className="rounded-xl bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">ทุกระดับ</SelectItem>
                                                <SelectItem value="organization">ระดับองค์กร</SelectItem>
                                                <SelectItem value="department">ระดับแผนก/ฝ่าย</SelectItem>
                                                <SelectItem value="ha_team">ระดับทีม HA</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-[11px] font-medium text-slate-500">ค้นหารหัส / ชื่อ</p>
                                        <Input
                                            value={linkSearch}
                                            onChange={(e) => setLinkSearch(e.target.value)}
                                            placeholder="เช่น IPD-001 หรือ ติดเชื้อ"
                                            className="rounded-xl bg-white"
                                        />
                                    </div>
                                </div>
                                <Select
                                    value={data.link_to_id || 'new'}
                                    onValueChange={(v) => setData('link_to_id', v === 'new' ? '' : v)}
                                >
                                    <SelectTrigger className="rounded-xl bg-white">
                                        <SelectValue placeholder="สร้างเป็นตัวชี้วัดใหม่" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-80">
                                        <SelectItem value="new">สร้างใหม่ (เป็นตัวหลักของกลุ่มนี้)</SelectItem>
                                        {(['organization', 'department', 'ha_team'] as const).map((groupType) =>
                                            linkableByType[groupType].length === 0 ? null : (
                                                <SelectGroup key={groupType}>
                                                    <SelectLabel>{LINK_TYPE_LABEL[groupType]}</SelectLabel>
                                                    {linkableByType[groupType].map((item) => (
                                                        <SelectItem key={item.id} value={String(item.id)}>
                                                            {item.code || 'ไม่มีรหัส'} — {item.name}
                                                            {item.owner ? ` · ${item.owner}` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                                {selectedLink ? (
                                    <p className="text-xs text-violet-700">
                                        จะใช้ชื่อ/เป้า/ข้อมูลรายงวดชุดเดียวกับ{' '}
                                        <span className="font-semibold">{selectedLink.code || selectedLink.name}</span>
                                        {' '}({LINK_TYPE_LABEL[selectedLink.type]}
                                        {selectedLink.owner ? ` · ${selectedLink.owner}` : ''})
                                    </p>
                                ) : null}
                                {errors.link_to_id && <p className="text-sm text-rose-500">{errors.link_to_id}</p>}
                            </div>
                        )}
                        {isLinking && (
                            <div className="space-y-2">
                                <Label>ระดับของรหัสใหม่นี้</Label>
                                <Select
                                    value={data.type}
                                    onValueChange={(v) => {
                                        setData('type', v);
                                        if (v !== 'department') setData('department_id', '');
                                        if (v !== 'ha_team') setData('team_id', '');
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
                        )}
                        {(isLinking ? data.type === 'department' : type === 'department') ? (
                            <div className="space-y-2">
                                <Label htmlFor="department_id">แผนก/หน่วยงาน</Label>
                                <Select value={data.department_id} onValueChange={(v) => setData('department_id', v)}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="เลือกแผนก" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.id.toString()}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.department_id && <p className="text-sm text-rose-500">{errors.department_id}</p>}
                            </div>
                        ) : (isLinking ? data.type === 'ha_team' : type === 'ha_team') ? (
                            <div className="space-y-2">
                                <Label htmlFor="team_id">ทีม HA</Label>
                                <Select value={data.team_id} onValueChange={(v) => setData('team_id', v)}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="เลือกทีม" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teams.map((team) => (
                                            <SelectItem key={team.id} value={team.id.toString()}>
                                                {team.abbreviation} - {team.name_th}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.team_id && <p className="text-sm text-rose-500">{errors.team_id}</p>}
                            </div>
                        ) : null}

                        <div className={data.link_to_id && !editingIndicator ? 'space-y-2' : 'grid grid-cols-2 gap-4'}>
                            <div className="space-y-2">
                                <Label htmlFor="code">รหัส (Code)</Label>
                                <Input
                                    id="code"
                                    value={data.code}
                                    onChange={(e) => setData('code', e.target.value)}
                                    placeholder="เช่น KPI-001"
                                    className="rounded-xl"
                                />
                                {errors.code && <p className="text-sm text-rose-500">{errors.code}</p>}
                            </div>
                            {(!data.link_to_id || editingIndicator) && (
                                <div className="space-y-2">
                                    <Label htmlFor="category">หมวดหมู่</Label>
                                    <Select value={data.category} onValueChange={(v) => setData('category', v)}>
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="เลือกหมวดหมู่" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(data.type === 'organization' || type === 'organization') && (
                                                <SelectGroup>
                                                    <SelectLabel className="font-semibold text-sky-800">
                                                        หัวข้อย่อยระดับองค์กร
                                                    </SelectLabel>
                                                    <SelectItem value="แบบประเมินตนเอง SAR">
                                                        แบบประเมินตนเอง SAR
                                                    </SelectItem>
                                                    <SelectItem value="แผนยุทธศาสตร์ รพ.">
                                                        แผนยุทธศาสตร์ รพ.
                                                    </SelectItem>
                                                </SelectGroup>
                                            )}
                                            <SelectGroup>
                                                <SelectLabel>ทั่วไป / ทางคลินิก</SelectLabel>
                                                <SelectItem value="Clinical">Clinical (คลินิก)</SelectItem>
                                                <SelectItem value="Non-Clinical">Non-Clinical (ทั่วไป)</SelectItem>
                                                <SelectItem value="HA-I-1">HA ตอนที่ 1</SelectItem>
                                                <SelectItem value="HA-I-2">HA ตอนที่ 2</SelectItem>
                                                <SelectItem value="HA-I-3">HA ตอนที่ 3</SelectItem>
                                                <SelectItem value="HA-I-4">HA ตอนที่ 4</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {(!data.link_to_id || editingIndicator) && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="name">ชื่อตัวชี้วัด</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="เช่น อัตราการติดเชื้อในโรงพยาบาล"
                                        required={!data.link_to_id}
                                        className="rounded-xl"
                                    />
                                    {errors.name && <p className="text-sm text-rose-500">{errors.name}</p>}
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="target_operator">เงื่อนไขเป้าหมาย</Label>
                                        <Select value={data.target_operator} onValueChange={(v) => setData('target_operator', v)}>
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="<">น้อยกว่า (&lt;)</SelectItem>
                                                <SelectItem value="<=">น้อยกว่าหรือเท่ากับ (&le;)</SelectItem>
                                                <SelectItem value=">">มากกว่า (&gt;)</SelectItem>
                                                <SelectItem value=">=">มากกว่าหรือเท่ากับ (&ge;)</SelectItem>
                                                <SelectItem value="=">เท่ากับ (=)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="target_value">ค่าเป้าหมาย</Label>
                                        <Input
                                            id="target_value"
                                            type="number"
                                            step="0.01"
                                            value={data.target_value}
                                            onChange={(e) => setData('target_value', e.target.value)}
                                            placeholder="0.00"
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="unit">หน่วยนับ</Label>
                                        <Input
                                            id="unit"
                                            value={data.unit}
                                            onChange={(e) => setData('unit', e.target.value)}
                                            placeholder="%, ราย, ครั้ง"
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="frequency">ความถี่ในการเก็บข้อมูล</Label>
                                    <Select value={data.frequency} onValueChange={(v) => setData('frequency', v)}>
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Monthly">รายเดือน</SelectItem>
                                            <SelectItem value="Quarterly">รายไตรมาส</SelectItem>
                                            <SelectItem value="Yearly">รายปี</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">รายละเอียด/คำนิยาม</Label>
                                    <Textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        className="rounded-xl"
                                    />
                                </div>
                            </>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsOpen(false)}>
                                ยกเลิก
                            </Button>
                            <Button type="submit" disabled={processing} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                                {editingIndicator
                                    ? 'บันทึกการแก้ไข'
                                    : copyingFrom
                                    ? 'บันทึกเป็นตัวชี้วัดใหม่'
                                    : 'บันทึก'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteTarget(null);
                        unlockPage();
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ย้ายตัวชี้วัดไปถังขยะ?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>
                                    ต้องการย้ายตัวชี้วัด{' '}
                                    <span className="font-medium text-foreground">
                                        {deleteTarget?.code ? `${deleteTarget.code} — ` : ''}
                                        {deleteTarget?.name}
                                    </span>{' '}
                                    ไปถังขยะหรือไม่?
                                </p>
                                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
                                    สามารถกู้คืนได้ภายหลังจากเมนูถังขยะ และระบบจะบันทึกชื่อผู้ลบไว้
                                    {hasDeleteEntries
                                        ? ` ข้อมูลการวัดผล ${deleteEntriesCount.toLocaleString('th-TH')} รายการจะถูกเก็บไว้ด้วย`
                                        : ''}
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl" disabled={deleting}>
                            ยกเลิก
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl bg-rose-600 hover:bg-rose-700"
                            disabled={deleting}
                            onClick={(e) => {
                                e.preventDefault();
                                handleDelete();
                            }}
                        >
                            {deleting ? 'กำลังย้าย...' : 'ย้ายไปถังขยะ'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </QualityPage>
    );
}
