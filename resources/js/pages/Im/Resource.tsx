import React, { useEffect, useMemo, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { ImPage, StatCard, Panel, Modal, Field, StatusPill, EmptyState } from '@/pages/Im/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { imInput, imSelect, fmtDate, STATUS_STYLE, STATUS_LABEL } from '@/pages/Im/shared';
import {
    Server, Plus, Trash2, Pencil, Cpu, HardDrive, Network, GitPullRequest, GraduationCap,
    Check, X, Wrench, PackageX, History, RotateCcw,
} from 'lucide-react';

interface AssetRepair {
    id: number;
    repair_no: string;
    reported_at: string;
    symptom: string;
    vendor?: string;
    cost?: number | null;
    returned_at?: string | null;
    result?: string | null;
    reported_by?: string | null;
    handled_by?: string | null;
    status: string;
    note?: string | null;
}

interface AssetDisposal {
    id: number;
    disposal_no: string;
    disposed_at: string;
    method: string;
    reason: string;
    document_ref?: string | null;
    approved_by?: string | null;
    note?: string | null;
}

interface Asset {
    id: number;
    asset_code?: string;
    name: string;
    brand?: string;
    type: string;
    device_type?: string;
    spec?: string;
    cpu?: string;
    os?: string;
    mac_address?: string;
    license_status: string;
    quantity: number;
    capacity?: string;
    utilization?: number;
    location?: string;
    assigned_user?: string;
    department?: string;
    status: string;
    note?: string;
    repairs?: AssetRepair[];
    open_repair?: AssetRepair | null;
    disposals?: AssetDisposal[];
}

interface Competency {
    id: number;
    user?: { id: number; name: string } | null;
    staff_name: string;
    competency: string;
    required_level: number;
    actual_level: number;
    gap: number;
    idp?: string;
    assessed_at?: string;
}

interface ChangeReq {
    id: number;
    cr_no: string;
    title: string;
    description?: string;
    requested_by?: string;
    category?: string;
    impact: string;
    risk_note?: string;
    status: string;
    approver?: { id: number; name: string } | null;
    approved_at?: string;
    planned_date?: string;
    note?: string;
}

interface Props {
    assets: Asset[];
    competencies: Competency[];
    changes: ChangeReq[];
    staff: { id: number; name: string }[];
    deviceTypes: Record<string, string>;
    summary: {
        hardware: number;
        software: number;
        network: number;
        active: number;
        repair: number;
        disposed: number;
        expired_license: number;
        avg_utilization: number;
        high_utilization: number;
        competency_gap: number;
        pending_changes: number;
    };
}

type Tab = 'assets' | 'competencies' | 'changes';

const TYPE_LABEL: Record<string, string> = { hardware: 'Hardware', software: 'Software', network: 'Network' };
const IMPACT_STYLE: Record<string, string> = {
    low: 'border-slate-200 bg-slate-50 text-slate-600',
    medium: 'border-amber-200 bg-amber-50 text-amber-700',
    high: 'border-red-200 bg-red-50 text-red-700',
};
const ASSET_STATUS_LABEL: Record<string, string> = {
    active: 'ปกติ',
    repair: 'ส่งซ่อม',
    disposed: 'จำหน่าย',
    retired: 'จำหน่าย',
};
const DISPOSAL_METHOD: Record<string, string> = {
    sell: 'ขาย',
    donate: 'บริจาค',
    destroy: 'ทำลาย',
    other: 'อื่นๆ',
};

const emptyAssetForm = () => ({
    asset_code: '',
    name: '',
    brand: '',
    type: 'hardware',
    device_type: 'computer',
    spec: '',
    cpu: '',
    os: '',
    mac_address: '',
    license_status: 'na',
    quantity: 1,
    capacity: '',
    utilization: '',
    location: '',
    assigned_user: '',
    department: '',
    status: 'active',
    note: '',
});

const today = () => new Date().toISOString().slice(0, 10);

export default function ResourcePage({ assets, competencies, changes, staff, deviceTypes, summary }: Props) {
    const [tab, setTab] = useState<Tab>('assets');
    const [assetModal, setAssetModal] = useState<{ open: boolean; edit?: Asset }>({ open: false });
    const [compModal, setCompModal] = useState<{ open: boolean; edit?: Competency }>({ open: false });
    const [changeModal, setChangeModal] = useState(false);
    const [repairModal, setRepairModal] = useState<{ open: boolean; asset?: Asset }>({ open: false });
    const [returnModal, setReturnModal] = useState<{ open: boolean; asset?: Asset; repair?: AssetRepair }>({ open: false });
    const [disposeModal, setDisposeModal] = useState<{ open: boolean; asset?: Asset }>({ open: false });
    const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);

    useEffect(() => {
        const hash = window.location.hash;
        if (!hash.startsWith('#asset-')) {
            return;
        }
        setTab('assets');
        requestAnimationFrame(() => {
            document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }, []);

    const assetForm = useForm<any>(emptyAssetForm());
    const repairForm = useForm<any>({
        reported_at: today(),
        symptom: '',
        vendor: '',
        cost: '',
        reported_by: '',
        handled_by: '',
        note: '',
    });
    const returnForm = useForm<any>({
        returned_at: today(),
        result: '',
        cost: '',
        handled_by: '',
        note: '',
        status: 'done',
    });
    const disposeForm = useForm<any>({
        disposed_at: today(),
        method: 'other',
        reason: '',
        document_ref: '',
        approved_by: '',
        note: '',
    });
    const compForm = useForm<any>({
        user_id: '',
        staff_name: '',
        competency: '',
        required_level: 3,
        actual_level: 1,
        idp: '',
        assessed_at: '',
    });
    const changeForm = useForm<any>({
        title: '',
        description: '',
        requested_by: '',
        category: '',
        impact: 'low',
        risk_note: '',
        planned_date: '',
        note: '',
    });

    const deviceLabel = (key?: string) => (key && deviceTypes[key]) || key || '-';

    const assetStatusPill = (status: string) => (
        <StatusPill
            label={ASSET_STATUS_LABEL[status] ?? STATUS_LABEL[status] ?? status}
            className={STATUS_STYLE[status] ?? STATUS_STYLE.closed}
        />
    );

    const openCreateAsset = () => {
        assetForm.setData(emptyAssetForm());
        assetForm.clearErrors();
        setAssetModal({ open: true });
    };

    const openEditAsset = (a: Asset) => {
        assetForm.setData({
            asset_code: a.asset_code ?? '',
            name: a.name,
            brand: a.brand ?? '',
            type: a.type,
            device_type: a.device_type ?? 'computer',
            spec: a.spec ?? '',
            cpu: a.cpu ?? '',
            os: a.os ?? '',
            mac_address: a.mac_address ?? '',
            license_status: a.license_status,
            quantity: a.quantity,
            capacity: a.capacity ?? '',
            utilization: a.utilization ?? '',
            location: a.location ?? '',
            assigned_user: a.assigned_user ?? '',
            department: a.department ?? '',
            status: a.status === 'retired' ? 'disposed' : a.status,
            note: a.note ?? '',
        });
        assetForm.clearErrors();
        setAssetModal({ open: true, edit: a });
    };

    const submitAsset = (e: React.FormEvent) => {
        e.preventDefault();
        if (assetModal.edit) {
            assetForm.put(route('im.resource.assets.update', assetModal.edit.id), {
                onSuccess: () => setAssetModal({ open: false }),
            });
        } else {
            assetForm.post(route('im.resource.assets.store'), {
                onSuccess: () => {
                    setAssetModal({ open: false });
                    assetForm.setData(emptyAssetForm());
                },
            });
        }
    };

    const openRepair = (a: Asset) => {
        repairForm.setData({
            reported_at: today(),
            symptom: '',
            vendor: '',
            cost: '',
            reported_by: '',
            handled_by: '',
            note: '',
        });
        repairForm.clearErrors();
        setRepairModal({ open: true, asset: a });
    };

    const submitRepair = (e: React.FormEvent) => {
        e.preventDefault();
        if (!repairModal.asset) return;
        repairForm.post(route('im.resource.assets.repairs.store', repairModal.asset.id), {
            onSuccess: () => setRepairModal({ open: false }),
        });
    };

    const openReturn = (a: Asset) => {
        const repair = a.open_repair ?? a.repairs?.find((r) => r.status === 'open');
        if (!repair) return;
        returnForm.setData({
            returned_at: today(),
            result: '',
            cost: repair.cost ?? '',
            handled_by: repair.handled_by ?? '',
            note: '',
            status: 'done',
        });
        returnForm.clearErrors();
        setReturnModal({ open: true, asset: a, repair });
    };

    const submitReturn = (e: React.FormEvent) => {
        e.preventDefault();
        if (!returnModal.asset || !returnModal.repair) return;
        returnForm.put(
            route('im.resource.assets.repairs.complete', [returnModal.asset.id, returnModal.repair.id]),
            { onSuccess: () => setReturnModal({ open: false }) },
        );
    };

    const openDispose = (a: Asset) => {
        disposeForm.setData({
            disposed_at: today(),
            method: 'other',
            reason: '',
            document_ref: '',
            approved_by: '',
            note: '',
        });
        disposeForm.clearErrors();
        setDisposeModal({ open: true, asset: a });
    };

    const submitDispose = (e: React.FormEvent) => {
        e.preventDefault();
        if (!disposeModal.asset) return;
        disposeForm.post(route('im.resource.assets.disposals.store', disposeModal.asset.id), {
            onSuccess: () => setDisposeModal({ open: false }),
        });
    };

    const openCreateComp = () => {
        compForm.reset();
        setCompModal({ open: true });
    };
    const openEditComp = (c: Competency) => {
        compForm.setData({
            user_id: c.user?.id ?? '',
            staff_name: c.staff_name,
            competency: c.competency,
            required_level: c.required_level,
            actual_level: c.actual_level,
            idp: c.idp ?? '',
            assessed_at: c.assessed_at?.slice(0, 10) ?? '',
        });
        setCompModal({ open: true, edit: c });
    };
    const submitComp = (e: React.FormEvent) => {
        e.preventDefault();
        if (compModal.edit) {
            compForm.put(route('im.resource.competencies.update', compModal.edit.id), {
                onSuccess: () => setCompModal({ open: false }),
            });
        } else {
            compForm.post(route('im.resource.competencies.store'), {
                onSuccess: () => {
                    setCompModal({ open: false });
                    compForm.reset();
                },
            });
        }
    };

    const submitChange = (e: React.FormEvent) => {
        e.preventDefault();
        changeForm.post(route('im.resource.changes.store'), {
            onSuccess: () => {
                setChangeModal(false);
                changeForm.reset();
            },
        });
    };
    const setChangeStatus = (c: ChangeReq, status: string) =>
        router.put(route('im.resource.changes.status', c.id), { status });

    const historyRepairs = useMemo(() => historyAsset?.repairs ?? [], [historyAsset]);
    const historyDisposals = useMemo(() => historyAsset?.disposals ?? [], [historyAsset]);

    return (
        <ImPage
            active="im.resource"
            icon={Server}
            badge="หมวดที่ 7"
            title="IT Resource, Competency & Change"
            subtitle="จัดการทรัพยากร ความรู้ และการเปลี่ยนแปลงทางเทคโนโลยี"
        >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
                <StatCard label="ปกติ" value={summary.active} icon={Server} tone="emerald" />
                <StatCard label="ส่งซ่อม" value={summary.repair} icon={Wrench} tone={summary.repair ? 'amber' : 'emerald'} />
                <StatCard label="จำหน่าย" value={summary.disposed} icon={PackageX} tone="slate" />
                <StatCard label="Hardware" value={summary.hardware} icon={Cpu} tone="sky" />
                <StatCard label="Software" value={summary.software} icon={HardDrive} tone="violet" />
                <StatCard label="Network" value={summary.network} icon={Network} tone="cyan" />
                <StatCard label="Competency Gap" value={summary.competency_gap} icon={GraduationCap} tone={summary.competency_gap ? 'amber' : 'emerald'} />
                <StatCard label="Change รออนุมัติ" value={summary.pending_changes} icon={GitPullRequest} tone="sky" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                    {([['assets', 'ทะเบียนทรัพยากร'], ['competencies', 'สมรรถนะ & IDP'], ['changes', 'Change Request']] as [Tab, string][]).map(([k, l]) => (
                        <button
                            key={k}
                            onClick={() => setTab(k)}
                            className={cn(
                                'rounded-xl border px-4 py-2 text-sm font-semibold transition',
                                tab === k ? 'border-sky-400 bg-sky-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200',
                            )}
                        >
                            {l}
                        </button>
                    ))}
                </div>
                <Button
                    className="rounded-xl bg-sky-600 hover:bg-sky-700"
                    onClick={() => (tab === 'assets' ? openCreateAsset() : tab === 'competencies' ? openCreateComp() : setChangeModal(true))}
                >
                    <Plus className="mr-1 h-4 w-4" /> เพิ่ม
                </Button>
            </div>

            {tab === 'assets' && (
                <Panel title="ทะเบียนทรัพยากร IT" description="ข้อมูลเครื่อง ผู้ใช้งาน หน่วยงาน และสถานะ ปกติ / ส่งซ่อม / จำหน่าย">
                    {assets.length === 0 ? (
                        <EmptyState text="ยังไม่มีทรัพยากร" />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1100px] text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                        <th className="py-2 pr-3">รหัส</th>
                                        <th className="py-2 pr-3">ชื่อเครื่อง</th>
                                        <th className="py-2 pr-3">ประเภทเครื่อง</th>
                                        <th className="py-2 pr-3">ยี่ห้อ</th>
                                        <th className="py-2 pr-3">CPU</th>
                                        <th className="py-2 pr-3">OS</th>
                                        <th className="py-2 pr-3">MAC</th>
                                        <th className="py-2 pr-3">ผู้ใช้งาน</th>
                                        <th className="py-2 pr-3">หน่วยงาน</th>
                                        <th className="py-2 pr-3">สถานะ</th>
                                        <th className="py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assets.map((a) => {
                                        const openRepair = a.open_repair ?? a.repairs?.find((r) => r.status === 'open');
                                        return (
                                            <tr key={a.id} id={`asset-${a.id}`} className="border-b border-slate-50 align-top">
                                                <td className="py-2.5 pr-3 font-mono text-xs text-slate-500">{a.asset_code || '-'}</td>
                                                <td className="py-2.5 pr-3">
                                                    <div className="font-medium text-slate-700">{a.name}</div>
                                                    <div className="text-[11px] text-slate-400">
                                                        {TYPE_LABEL[a.type]}
                                                        {a.location ? ` · ${a.location}` : ''}
                                                    </div>
                                                </td>
                                                <td className="py-2.5 pr-3 text-slate-600">{deviceLabel(a.device_type)}</td>
                                                <td className="py-2.5 pr-3 text-slate-600">{a.brand || '-'}</td>
                                                <td className="py-2.5 pr-3 text-slate-600">{a.cpu || '-'}</td>
                                                <td className="py-2.5 pr-3 text-slate-600">{a.os || '-'}</td>
                                                <td className="py-2.5 pr-3 font-mono text-xs text-slate-500">{a.mac_address || '-'}</td>
                                                <td className="py-2.5 pr-3 text-slate-600">{a.assigned_user || '-'}</td>
                                                <td className="py-2.5 pr-3 text-slate-600">{a.department || '-'}</td>
                                                <td className="py-2.5 pr-3">{assetStatusPill(a.status)}</td>
                                                <td className="py-2.5 text-right">
                                                    <div className="flex flex-wrap justify-end gap-1">
                                                        {a.status === 'active' && (
                                                            <button
                                                                title="ส่งซ่อม"
                                                                onClick={() => openRepair(a)}
                                                                className="rounded-lg border border-amber-200 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50"
                                                            >
                                                                <Wrench className="mr-0.5 inline h-3 w-3" />
                                                                ส่งซ่อม
                                                            </button>
                                                        )}
                                                        {a.status === 'repair' && openRepair && (
                                                            <button
                                                                title="รับคืน"
                                                                onClick={() => openReturn(a)}
                                                                className="rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
                                                            >
                                                                <RotateCcw className="mr-0.5 inline h-3 w-3" />
                                                                รับคืน
                                                            </button>
                                                        )}
                                                        {a.status === 'active' && (
                                                            <button
                                                                title="จำหน่าย"
                                                                onClick={() => openDispose(a)}
                                                                className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                                                            >
                                                                <PackageX className="mr-0.5 inline h-3 w-3" />
                                                                จำหน่าย
                                                            </button>
                                                        )}
                                                        <button
                                                            title="ประวัติ"
                                                            onClick={() => setHistoryAsset(a)}
                                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-sky-600"
                                                        >
                                                            <History className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            title="แก้ไข"
                                                            onClick={() => openEditAsset(a)}
                                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-sky-600"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            title="ลบ"
                                                            onClick={() => {
                                                                if (confirm('ลบทรัพยากรนี้?')) {
                                                                    router.delete(route('im.resource.assets.destroy', a.id));
                                                                }
                                                            }}
                                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
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
            )}

            {tab === 'competencies' && (
                <Panel title="IT Competency Assessment & IDP" description="ประเมินสมรรถนะรายบุคคล พร้อม Gap และแผนพัฒนา (IDP)">
                    {competencies.length === 0 ? (
                        <EmptyState text="ยังไม่มีการประเมินสมรรถนะ" />
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {competencies.map((c) => (
                                <div key={c.id} className="rounded-2xl border border-slate-200 p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="font-semibold text-slate-800">{c.user?.name || c.staff_name}</div>
                                            <div className="text-xs text-slate-500">{c.competency}</div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => openEditComp(c)} className="text-slate-400 hover:text-sky-600">
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => router.delete(route('im.resource.competencies.destroy', c.id))}
                                                className="text-slate-400 hover:text-rose-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center gap-3 text-xs">
                                        <span className="text-slate-500">
                                            ต้องการ <b className="text-slate-700">{c.required_level}</b>
                                        </span>
                                        <span className="text-slate-500">
                                            ปัจจุบัน <b className="text-slate-700">{c.actual_level}</b>
                                        </span>
                                        <StatusPill
                                            label={c.gap < 0 ? `ขาด ${Math.abs(c.gap)}` : c.gap > 0 ? `เกิน ${c.gap}` : 'ครบ'}
                                            className={c.gap < 0 ? STATUS_STYLE.fail : STATUS_STYLE.pass}
                                        />
                                    </div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={cn('h-full rounded-full', c.gap < 0 ? 'bg-rose-400' : 'bg-emerald-500')}
                                            style={{ width: `${(c.actual_level / 5) * 100}%` }}
                                        />
                                    </div>
                                    {c.idp && (
                                        <div className="mt-2 rounded-xl bg-slate-50 p-2 text-xs text-slate-600">
                                            <span className="font-semibold">IDP:</span> {c.idp}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            )}

            {tab === 'changes' && (
                <Panel title="Change Management System" description="บันทึกและอนุมัติคำขอเปลี่ยนแปลงระบบเพื่อควบคุมผลกระทบ">
                    {changes.length === 0 ? (
                        <EmptyState text="ยังไม่มีคำขอเปลี่ยนแปลง" />
                    ) : (
                        <div className="space-y-3">
                            {changes.map((c) => (
                                <div key={c.id} className="rounded-2xl border border-slate-200 p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-400">{c.cr_no}</span>
                                            <StatusPill
                                                label={`ผลกระทบ ${c.impact === 'high' ? 'สูง' : c.impact === 'medium' ? 'กลาง' : 'ต่ำ'}`}
                                                className={IMPACT_STYLE[c.impact]}
                                            />
                                            <StatusPill label={STATUS_LABEL[c.status] ?? c.status} className={STATUS_STYLE[c.status] ?? STATUS_STYLE.pending} />
                                        </div>
                                        <button
                                            onClick={() => router.delete(route('im.resource.changes.destroy', c.id))}
                                            className="text-slate-400 hover:text-rose-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="mt-1 font-semibold text-slate-800">{c.title}</div>
                                    {c.description && <p className="mt-0.5 text-xs text-slate-500">{c.description}</p>}
                                    <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-400">
                                        <span>ผู้ขอ: {c.requested_by || '-'}</span>
                                        {c.planned_date && <span>กำหนด: {fmtDate(c.planned_date)}</span>}
                                        {c.approver && <span>อนุมัติโดย {c.approver.name}</span>}
                                    </div>
                                    {c.status === 'pending' && (
                                        <div className="mt-3 flex gap-2">
                                            <Button size="sm" className="rounded-lg bg-emerald-600 hover:bg-emerald-700" onClick={() => setChangeStatus(c, 'approved')}>
                                                <Check className="mr-1 h-3 w-3" /> อนุมัติ
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50"
                                                onClick={() => setChangeStatus(c, 'rejected')}
                                            >
                                                <X className="mr-1 h-3 w-3" /> ไม่อนุมัติ
                                            </Button>
                                        </div>
                                    )}
                                    {c.status === 'approved' && (
                                        <div className="mt-3">
                                            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setChangeStatus(c, 'implemented')}>
                                                ทำเครื่องหมายว่าดำเนินการแล้ว
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            )}

            {/* Asset Modal */}
            <Modal
                open={assetModal.open}
                onClose={() => setAssetModal({ open: false })}
                title={assetModal.edit ? 'แก้ไขทรัพยากร' : 'เพิ่มทรัพยากร'}
                wide
                footer={
                    <>
                        <Button variant="outline" className="rounded-xl" onClick={() => setAssetModal({ open: false })}>
                            ยกเลิก
                        </Button>
                        <Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={submitAsset} disabled={assetForm.processing}>
                            บันทึก
                        </Button>
                    </>
                }
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="รหัสทรัพย์สิน">
                        <Input value={assetForm.data.asset_code} onChange={(e) => assetForm.setData('asset_code', e.target.value)} className="rounded-xl" />
                    </Field>
                    <Field label="ชื่อเครื่อง" required error={assetForm.errors.name}>
                        <Input value={assetForm.data.name} onChange={(e) => assetForm.setData('name', e.target.value)} className="rounded-xl" />
                    </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="ประเภท (หมวด)">
                        <select value={assetForm.data.type} onChange={(e) => assetForm.setData('type', e.target.value)} className={imSelect}>
                            <option value="hardware">Hardware</option>
                            <option value="software">Software</option>
                            <option value="network">Network</option>
                        </select>
                    </Field>
                    <Field label="ประเภทเครื่อง">
                        <select value={assetForm.data.device_type} onChange={(e) => assetForm.setData('device_type', e.target.value)} className={imSelect}>
                            {Object.entries(deviceTypes).map(([k, label]) => (
                                <option key={k} value={k}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="ยี่ห้อ">
                        <Input value={assetForm.data.brand} onChange={(e) => assetForm.setData('brand', e.target.value)} className="rounded-xl" />
                    </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="CPU">
                        <Input value={assetForm.data.cpu} onChange={(e) => assetForm.setData('cpu', e.target.value)} className="rounded-xl" placeholder="เช่น Intel i5-12400" />
                    </Field>
                    <Field label="ระบบปฏิบัติการ">
                        <Input value={assetForm.data.os} onChange={(e) => assetForm.setData('os', e.target.value)} className="rounded-xl" placeholder="เช่น Windows 11" />
                    </Field>
                    <Field label="MAC Address">
                        <Input value={assetForm.data.mac_address} onChange={(e) => assetForm.setData('mac_address', e.target.value)} className="rounded-xl" placeholder="AA:BB:CC:DD:EE:FF" />
                    </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ผู้ใช้งาน">
                        <Input value={assetForm.data.assigned_user} onChange={(e) => assetForm.setData('assigned_user', e.target.value)} className="rounded-xl" />
                    </Field>
                    <Field label="หน่วยงาน">
                        <Input value={assetForm.data.department} onChange={(e) => assetForm.setData('department', e.target.value)} className="rounded-xl" />
                    </Field>
                </div>
                <Field label="สเปคเพิ่มเติม">
                    <textarea value={assetForm.data.spec} onChange={(e) => assetForm.setData('spec', e.target.value)} className={imInput} rows={2} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-4">
                    <Field label="ลิขสิทธิ์">
                        <select value={assetForm.data.license_status} onChange={(e) => assetForm.setData('license_status', e.target.value)} className={imSelect}>
                            <option value="na">ไม่ระบุ</option>
                            <option value="licensed">มีลิขสิทธิ์</option>
                            <option value="free">ฟรี/Open</option>
                            <option value="expired">หมดอายุ</option>
                        </select>
                    </Field>
                    <Field label="จำนวน">
                        <Input type="number" min={1} value={assetForm.data.quantity} onChange={(e) => assetForm.setData('quantity', Number(e.target.value))} className="rounded-xl" />
                    </Field>
                    <Field label="Capacity">
                        <Input value={assetForm.data.capacity} onChange={(e) => assetForm.setData('capacity', e.target.value)} className="rounded-xl" placeholder="เช่น 500GB" />
                    </Field>
                    <Field label="Utilization (%)">
                        <Input type="number" min={0} max={100} value={assetForm.data.utilization} onChange={(e) => assetForm.setData('utilization', e.target.value)} className="rounded-xl" />
                    </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ตำแหน่งที่ตั้ง">
                        <Input value={assetForm.data.location} onChange={(e) => assetForm.setData('location', e.target.value)} className="rounded-xl" />
                    </Field>
                    <Field label="สถานะการใช้งาน" error={assetForm.errors.status}>
                        <select
                            value={assetForm.data.status}
                            onChange={(e) => assetForm.setData('status', e.target.value)}
                            className={imSelect}
                        >
                            <option value="active">ปกติ</option>
                            <option value="repair">ส่งซ่อม</option>
                            <option value="disposed">จำหน่าย</option>
                        </select>
                    </Field>
                </div>
                <Field label="หมายเหตุ">
                    <textarea value={assetForm.data.note} onChange={(e) => assetForm.setData('note', e.target.value)} className={imInput} rows={2} />
                </Field>
                <p className="text-xs text-slate-400">
                    หากต้องการบันทึกประวัติ ให้ใช้ปุ่มในตาราง (ส่งซ่อม · รับคืน · จำหน่าย)
                </p>
            </Modal>

            {/* Repair Modal */}
            <Modal
                open={repairModal.open}
                onClose={() => setRepairModal({ open: false })}
                title={`ส่งซ่อม: ${repairModal.asset?.name ?? ''}`}
                wide
                footer={
                    <>
                        <Button variant="outline" className="rounded-xl" onClick={() => setRepairModal({ open: false })}>
                            ยกเลิก
                        </Button>
                        <Button className="rounded-xl bg-amber-600 hover:bg-amber-700" onClick={submitRepair} disabled={repairForm.processing}>
                            บันทึกส่งซ่อม
                        </Button>
                    </>
                }
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="วันที่ส่งซ่อม" required error={repairForm.errors.reported_at}>
                        <Input type="date" value={repairForm.data.reported_at} onChange={(e) => repairForm.setData('reported_at', e.target.value)} className="rounded-xl" />
                    </Field>
                    <Field label="ผู้รับซ่อม/ร้าน">
                        <Input value={repairForm.data.vendor} onChange={(e) => repairForm.setData('vendor', e.target.value)} className="rounded-xl" />
                    </Field>
                </div>
                <Field label="อาการ/ปัญหา" required error={repairForm.errors.symptom}>
                    <textarea value={repairForm.data.symptom} onChange={(e) => repairForm.setData('symptom', e.target.value)} className={imInput} rows={3} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="ผู้แจ้ง">
                        <Input value={repairForm.data.reported_by} onChange={(e) => repairForm.setData('reported_by', e.target.value)} className="rounded-xl" />
                    </Field>
                    <Field label="ผู้รับผิดชอบ">
                        <Input value={repairForm.data.handled_by} onChange={(e) => repairForm.setData('handled_by', e.target.value)} className="rounded-xl" />
                    </Field>
                    <Field label="ค่าใช้จ่ายโดยประมาณ">
                        <Input type="number" min={0} value={repairForm.data.cost} onChange={(e) => repairForm.setData('cost', e.target.value)} className="rounded-xl" />
                    </Field>
                </div>
                <Field label="หมายเหตุ">
                    <textarea value={repairForm.data.note} onChange={(e) => repairForm.setData('note', e.target.value)} className={imInput} rows={2} />
                </Field>
            </Modal>

            {/* Return from repair Modal */}
            <Modal
                open={returnModal.open}
                onClose={() => setReturnModal({ open: false })}
                title={`รับคืนจากการซ่อม: ${returnModal.asset?.name ?? ''}`}
                wide
                footer={
                    <>
                        <Button variant="outline" className="rounded-xl" onClick={() => setReturnModal({ open: false })}>
                            ยกเลิก
                        </Button>
                        <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={submitReturn} disabled={returnForm.processing}>
                            บันทึกรับคืน
                        </Button>
                    </>
                }
            >
                {returnModal.repair && (
                    <div className="mb-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-xs text-amber-800">
                        <div className="font-semibold">{returnModal.repair.repair_no}</div>
                        <div className="mt-1">อาการ: {returnModal.repair.symptom}</div>
                        <div>ส่งซ่อมเมื่อ: {fmtDate(returnModal.repair.reported_at)}</div>
                    </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="วันที่รับคืน" required error={returnForm.errors.returned_at}>
                        <Input type="date" value={returnForm.data.returned_at} onChange={(e) => returnForm.setData('returned_at', e.target.value)} className="rounded-xl" />
                    </Field>
                    <Field label="ผลซ่อม">
                        <select value={returnForm.data.status} onChange={(e) => returnForm.setData('status', e.target.value)} className={imSelect}>
                            <option value="done">ซ่อมเสร็จ / ใช้งานได้</option>
                            <option value="cancelled">ยกเลิกการส่งซ่อม</option>
                        </select>
                    </Field>
                </div>
                <Field label="รายละเอียดผลซ่อม" required error={returnForm.errors.result}>
                    <textarea value={returnForm.data.result} onChange={(e) => returnForm.setData('result', e.target.value)} className={imInput} rows={3} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ผู้รับผิดชอบ">
                        <Input value={returnForm.data.handled_by} onChange={(e) => returnForm.setData('handled_by', e.target.value)} className="rounded-xl" />
                    </Field>
                    <Field label="ค่าใช้จ่ายจริง">
                        <Input type="number" min={0} value={returnForm.data.cost} onChange={(e) => returnForm.setData('cost', e.target.value)} className="rounded-xl" />
                    </Field>
                </div>
                <Field label="หมายเหตุ">
                    <textarea value={returnForm.data.note} onChange={(e) => returnForm.setData('note', e.target.value)} className={imInput} rows={2} />
                </Field>
            </Modal>

            {/* Disposal Modal */}
            <Modal
                open={disposeModal.open}
                onClose={() => setDisposeModal({ open: false })}
                title={`จำหน่าย: ${disposeModal.asset?.name ?? ''}`}
                wide
                footer={
                    <>
                        <Button variant="outline" className="rounded-xl" onClick={() => setDisposeModal({ open: false })}>
                            ยกเลิก
                        </Button>
                        <Button className="rounded-xl bg-slate-700 hover:bg-slate-800" onClick={submitDispose} disabled={disposeForm.processing}>
                            ยืนยันจำหน่าย
                        </Button>
                    </>
                }
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="วันที่จำหน่าย" required error={disposeForm.errors.disposed_at}>
                        <Input type="date" value={disposeForm.data.disposed_at} onChange={(e) => disposeForm.setData('disposed_at', e.target.value)} className="rounded-xl" />
                    </Field>
                    <Field label="วิธีการ" required>
                        <select value={disposeForm.data.method} onChange={(e) => disposeForm.setData('method', e.target.value)} className={imSelect}>
                            {Object.entries(DISPOSAL_METHOD).map(([k, label]) => (
                                <option key={k} value={k}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
                <Field label="เหตุผล" required error={disposeForm.errors.reason}>
                    <textarea value={disposeForm.data.reason} onChange={(e) => disposeForm.setData('reason', e.target.value)} className={imInput} rows={3} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ผู้รับผิดชอบ">
                        <Input value={disposeForm.data.approved_by} onChange={(e) => disposeForm.setData('approved_by', e.target.value)} className="rounded-xl" />
                    </Field>
                    <Field label="เลขที่เอกสารอ้างอิง">
                        <Input value={disposeForm.data.document_ref} onChange={(e) => disposeForm.setData('document_ref', e.target.value)} className="rounded-xl" />
                    </Field>
                </div>
                <Field label="หมายเหตุ">
                    <textarea value={disposeForm.data.note} onChange={(e) => disposeForm.setData('note', e.target.value)} className={imInput} rows={2} />
                </Field>
            </Modal>

            {/* History Modal */}
            <Modal
                open={!!historyAsset}
                onClose={() => setHistoryAsset(null)}
                title={`ประวัติ: ${historyAsset?.name ?? ''}`}
                wide
                footer={
                    <Button variant="outline" className="rounded-xl" onClick={() => setHistoryAsset(null)}>
                        ปิด
                    </Button>
                }
            >
                {historyAsset && (
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                            <span className="font-mono text-xs text-slate-400">{historyAsset.asset_code || '-'}</span>
                            {assetStatusPill(historyAsset.status)}
                            <span>{deviceLabel(historyAsset.device_type)}</span>
                            {historyAsset.assigned_user && <span>· ผู้ใช้ {historyAsset.assigned_user}</span>}
                            {historyAsset.department && <span>· {historyAsset.department}</span>}
                        </div>

                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Wrench className="h-4 w-4 text-amber-600" /> ประวัติส่งซ่อม
                            </div>
                            {historyRepairs.length === 0 ? (
                                <p className="text-xs text-slate-400">ยังไม่มีประวัติส่งซ่อม</p>
                            ) : (
                                <div className="space-y-2">
                                    {historyRepairs.map((r) => (
                                        <div key={r.id} className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="font-semibold text-slate-700">{r.repair_no}</span>
                                                <StatusPill label={STATUS_LABEL[r.status] ?? r.status} className={STATUS_STYLE[r.status] ?? STATUS_STYLE.open} />
                                            </div>
                                            <div className="mt-1">ส่งซ่อม: {fmtDate(r.reported_at)}{r.returned_at ? ` · รับคืน: ${fmtDate(r.returned_at)}` : ''}</div>
                                            <div className="mt-1">อาการ: {r.symptom}</div>
                                            {r.result && <div className="mt-1">ผล: {r.result}</div>}
                                            <div className="mt-1 text-slate-400">
                                                {r.vendor ? `ร้าน: ${r.vendor} · ` : ''}
                                                {r.handled_by ? `ผู้รับผิดชอบ: ${r.handled_by}` : ''}
                                                {r.cost != null ? ` · ค่าใช้จ่าย: ${Number(r.cost).toLocaleString('th-TH')}` : ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <PackageX className="h-4 w-4 text-slate-600" /> ประวัติจำหน่าย
                            </div>
                            {historyDisposals.length === 0 ? (
                                <p className="text-xs text-slate-400">ยังไม่มีประวัติจำหน่าย</p>
                            ) : (
                                <div className="space-y-2">
                                    {historyDisposals.map((d) => (
                                        <div key={d.id} className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
                                            <div className="font-semibold text-slate-700">{d.disposal_no}</div>
                                            <div className="mt-1">
                                                วันที่: {fmtDate(d.disposed_at)} · วิธี: {DISPOSAL_METHOD[d.method] ?? d.method}
                                            </div>
                                            <div className="mt-1">เหตุผล: {d.reason}</div>
                                            <div className="mt-1 text-slate-400">
                                                {d.approved_by ? `ผู้รับผิดชอบ: ${d.approved_by}` : ''}
                                                {d.document_ref ? ` · อ้างอิง: ${d.document_ref}` : ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Competency Modal */}
            <Modal
                open={compModal.open}
                onClose={() => setCompModal({ open: false })}
                title={compModal.edit ? 'แก้ไขสมรรถนะ' : 'ประเมินสมรรถนะ'}
                wide
                footer={
                    <>
                        <Button variant="outline" className="rounded-xl" onClick={() => setCompModal({ open: false })}>
                            ยกเลิก
                        </Button>
                        <Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={submitComp} disabled={compForm.processing}>
                            บันทึก
                        </Button>
                    </>
                }
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="เจ้าหน้าที่ (จากระบบ)">
                        <select
                            value={compForm.data.user_id}
                            onChange={(e) => {
                                const id = e.target.value;
                                compForm.setData('user_id', id);
                                const s = staff.find((x) => String(x.id) === id);
                                if (s) compForm.setData('staff_name', s.name);
                            }}
                            className={imSelect}
                        >
                            <option value="">- เลือก/ระบุเอง -</option>
                            {staff.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="ชื่อบุคลากร" required error={compForm.errors.staff_name}>
                        <Input value={compForm.data.staff_name} onChange={(e) => compForm.setData('staff_name', e.target.value)} className="rounded-xl" />
                    </Field>
                </div>
                <Field label="สมรรถนะ (Competency)" required error={compForm.errors.competency}>
                    <Input
                        value={compForm.data.competency}
                        onChange={(e) => compForm.setData('competency', e.target.value)}
                        className="rounded-xl"
                        placeholder="เช่น Network Security, Database Admin"
                    />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="ระดับที่ต้องการ (1-5)">
                        <select value={compForm.data.required_level} onChange={(e) => compForm.setData('required_level', Number(e.target.value))} className={imSelect}>
                            {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="ระดับปัจจุบัน (1-5)">
                        <select value={compForm.data.actual_level} onChange={(e) => compForm.setData('actual_level', Number(e.target.value))} className={imSelect}>
                            {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="วันที่ประเมิน">
                        <Input type="date" value={compForm.data.assessed_at} onChange={(e) => compForm.setData('assessed_at', e.target.value)} className="rounded-xl" />
                    </Field>
                </div>
                <Field label="แผนพัฒนารายบุคคล (IDP)">
                    <textarea value={compForm.data.idp} onChange={(e) => compForm.setData('idp', e.target.value)} className={imInput} rows={2} />
                </Field>
            </Modal>

            {/* Change Modal */}
            <Modal
                open={changeModal}
                onClose={() => setChangeModal(false)}
                title="ส่งคำขอเปลี่ยนแปลง (Change Request)"
                wide
                footer={
                    <>
                        <Button variant="outline" className="rounded-xl" onClick={() => setChangeModal(false)}>
                            ยกเลิก
                        </Button>
                        <Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={submitChange} disabled={changeForm.processing}>
                            ส่งคำขอ
                        </Button>
                    </>
                }
            >
                <Field label="หัวข้อการเปลี่ยนแปลง" required error={changeForm.errors.title}>
                    <Input value={changeForm.data.title} onChange={(e) => changeForm.setData('title', e.target.value)} className="rounded-xl" />
                </Field>
                <Field label="รายละเอียด">
                    <textarea value={changeForm.data.description} onChange={(e) => changeForm.setData('description', e.target.value)} className={imInput} rows={2} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="ผู้ขอ">
                        <Input value={changeForm.data.requested_by} onChange={(e) => changeForm.setData('requested_by', e.target.value)} className="rounded-xl" />
                    </Field>
                    <Field label="หมวดหมู่">
                        <Input value={changeForm.data.category} onChange={(e) => changeForm.setData('category', e.target.value)} className="rounded-xl" />
                    </Field>
                    <Field label="ระดับผลกระทบ">
                        <select value={changeForm.data.impact} onChange={(e) => changeForm.setData('impact', e.target.value)} className={imSelect}>
                            <option value="low">ต่ำ</option>
                            <option value="medium">ปานกลาง</option>
                            <option value="high">สูง</option>
                        </select>
                    </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="กำหนดการเปลี่ยนแปลง">
                        <Input type="date" value={changeForm.data.planned_date} onChange={(e) => changeForm.setData('planned_date', e.target.value)} className="rounded-xl" />
                    </Field>
                    <Field label="ความเสี่ยง/ผลกระทบที่คาด">
                        <Input value={changeForm.data.risk_note} onChange={(e) => changeForm.setData('risk_note', e.target.value)} className="rounded-xl" />
                    </Field>
                </div>
            </Modal>
        </ImPage>
    );
}
