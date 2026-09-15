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
import { Plus, Search, BarChart2, MoreVertical, Pencil, Trash, FileDown, Upload, Link2 } from 'lucide-react';
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
    entries_count?: number;
    aliases_count?: number;
    is_master?: boolean;
    master_code?: string | null;
    department?: Department;
    team?: Team;
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

export default function Index({ indicators, type, departments, teams, linkableIndicators = [], filters }: {
    indicators: Indicator[];
    type: 'department' | 'ha_team' | 'organization';
    departments: Department[];
    teams: Team[];
    linkableIndicators?: LinkableIndicator[];
    filters?: {
        department_id?: number | null;
        team_id?: number | null;
        search?: string;
    };
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState(filters?.search || '');
    const [departmentFilter, setDepartmentFilter] = useState(filters?.department_id ? String(filters.department_id) : 'all');
    const [teamFilter, setTeamFilter] = useState(filters?.team_id ? String(filters.team_id) : 'all');
    const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Indicator | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [linkSourceType, setLinkSourceType] = useState<'all' | 'organization' | 'department' | 'ha_team'>('all');
    const [linkSearch, setLinkSearch] = useState('');

    const { data, setData, post, put, processing, errors, reset } = useForm({
        type: type,
        department_id: '',
        team_id: '',
        code: '',
        name: '',
        category: 'Clinical',
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
                category: editingIndicator.category || 'Clinical',
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
        } else {
            reset();
            setData('type', type);
            setLinkSourceType('all');
            setLinkSearch('');
        }
    }, [editingIndicator, type]);

    useEffect(() => {
        setDepartmentFilter(filters?.department_id ? String(filters.department_id) : 'all');
        setTeamFilter(filters?.team_id ? String(filters.team_id) : 'all');
        setSearch(filters?.search || '');
    }, [type, filters?.department_id, filters?.team_id]);

    const applyListFilters = (patch: {
        department_id?: string;
        team_id?: string;
        search?: string;
    }) => {
        const nextDept = patch.department_id ?? departmentFilter;
        const nextTeam = patch.team_id ?? teamFilter;
        const nextSearch = patch.search ?? search;

        router.get(
            route('quality-indicators.index'),
            {
                type,
                department_id: type === 'department' && nextDept !== 'all' ? nextDept : undefined,
                team_id: type === 'ha_team' && nextTeam !== 'all' ? nextTeam : undefined,
                search: nextSearch || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const getPageTitle = () => {
        switch (type) {
            case 'organization': return 'ตัวชี้วัดคุณภาพ (ระดับองค์กร)';
            case 'department': return 'ตัวชี้วัดคุณภาพ (ระดับแผนก)';
            case 'ha_team': return 'ตัวชี้วัดคุณภาพ (ระดับทีม)';
            default: return 'ตัวชี้วัดคุณภาพ';
        }
    };
    const pageTitle = getPageTitle();

    const getSubtitle = () => {
        if (type === 'department') return 'บริหารจัดการตัวชี้วัดคุณภาพระดับแผนก/หน่วยงาน';
        if (type === 'ha_team') return 'บริหารจัดการตัวชี้วัดคุณภาพระดับทีมนำทางคลินิก (PCT/Teams)';
        return 'บริหารจัดการตัวชี้วัดคุณภาพระดับองค์กร';
    };

    const ownerLabel = (indicator: Indicator) => {
        if (type === 'department') return indicator.department?.name || 'ไม่ระบุแผนก';
        if (type === 'ha_team') {
            if (!indicator.team) return 'ไม่ระบุทีม';
            return `${indicator.team.abbreviation} · ${indicator.team.name_th}`;
        }
        return 'ระดับองค์กร';
    };

    const handleCreate = () => {
        setEditingIndicator(null);
        reset();
        setData('type', type);
        setLinkSourceType('all');
        setLinkSearch('');
        setIsOpen(true);
    };

    const handleEdit = (indicator: Indicator) => {
        setEditingIndicator(indicator);
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
        return `${route('quality-indicators.export-pdf')}?${params.toString()}`;
    })();

    const groupPdfLabel = (() => {
        if (type === 'department') {
            return departmentFilter !== 'all' ? 'PDF แผนกนี้' : 'PDF แยกตามแผนก';
        }
        if (type === 'ha_team') {
            return teamFilter !== 'all' ? 'PDF ทีมนี้' : 'PDF แยกตามทีม';
        }
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
                </div>
            }
            subNav={<IndicatorsSubNav active="quality-indicators.index" />}
        >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <StatCard label="ตัวชี้วัดทั้งหมด" value={indicators.length} icon={BarChart2} tone="emerald" />
                <StatCard label="Active" value={activeCount} sub={`${indicators.length - activeCount} inactive`} icon={BarChart2} tone="teal" />
                <StatCard label="แสดงผล" value={filteredIndicators.length} sub="หลังกรองค้นหา" icon={Search} tone="cyan" />
            </div>

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

            {(type === 'department' || type === 'ha_team') && (
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
                title="รายการตัวชี้วัด"
                description="ค้นหาและจัดการตัวชี้วัดคุณภาพ"
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
                    <EmptyState text="ไม่พบตัวชี้วัด" />
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
                                        <h3 className="mb-1 line-clamp-2 text-base font-semibold text-slate-800">{indicator.name}</h3>
                                        <p className="mb-1 text-sm text-slate-500">{indicator.category}</p>
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
                        unlockPage();
                    }
                }}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingIndicator ? 'แก้ไขตัวชี้วัด' : 'เพิ่มตัวชี้วัดใหม่'}</DialogTitle>
                        <DialogDescription>
                            {editingIndicator
                                ? 'การแก้ชื่อ/เป้า/สูตร มีผลต่อทุกรหัสที่เชื่อมข้อมูลชุดเดียวกัน'
                                : 'สร้างตัวใหม่ หรือสร้างรหัสลูกที่ชี้ข้อมูลชุดเดียวกับตัวชี้วัดที่มีอยู่'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!editingIndicator && (
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
                                            <SelectItem value="Clinical">Clinical (คลินิก)</SelectItem>
                                            <SelectItem value="Non-Clinical">Non-Clinical (ทั่วไป)</SelectItem>
                                            <SelectItem value="HA-I-1">HA ตอนที่ 1</SelectItem>
                                            <SelectItem value="HA-I-2">HA ตอนที่ 2</SelectItem>
                                            <SelectItem value="HA-I-3">HA ตอนที่ 3</SelectItem>
                                            <SelectItem value="HA-I-4">HA ตอนที่ 4</SelectItem>
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
                                {editingIndicator ? 'บันทึกการแก้ไข' : 'บันทึก'}
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
                        <AlertDialogTitle>
                            {hasDeleteEntries
                                ? 'ตัวชี้วัดนี้มีข้อมูลการวัดผลแล้ว — ยืนยันลบ?'
                                : 'ยืนยันการลบ?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>
                                    ต้องการลบตัวชี้วัด{' '}
                                    <span className="font-medium text-foreground">
                                        {deleteTarget?.code ? `${deleteTarget.code} — ` : ''}
                                        {deleteTarget?.name}
                                    </span>{' '}
                                    หรือไม่?
                                </p>
                                {hasDeleteEntries ? (
                                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                                        พบข้อมูลการวัดผล (Data Entries) จำนวน{' '}
                                        <span className="font-semibold">
                                            {deleteEntriesCount.toLocaleString('th-TH')}
                                        </span>{' '}
                                        รายการ หากลบตัวชี้วัดนี้ ข้อมูลการบันทึกทั้งหมดจะถูกลบถาวรและไม่สามารถย้อนกลับได้
                                    </p>
                                ) : (
                                    <p>การกระทำนี้ไม่สามารถย้อนกลับได้</p>
                                )}
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
                            {deleting
                                ? 'กำลังลบ...'
                                : hasDeleteEntries
                                  ? 'ยืนยันลบพร้อมข้อมูลการวัดผล'
                                  : 'ยืนยันลบ'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </QualityPage>
    );
}
