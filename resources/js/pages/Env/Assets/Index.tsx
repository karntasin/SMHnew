import React, { useMemo, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import { Box, FileSpreadsheet, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import {
    QualityPage,
    Panel,
    Modal,
    Field,
    StatusPill,
    EmptyState,
} from '@/components/quality/quality-ui';
import EnvSubNav from '@/pages/Env/EnvSubNav';
import AssetsSubNav from '@/pages/Env/Assets/AssetsSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { storageUrl } from '@/lib/asset';

interface LineOption {
    id: number;
    code: string;
    name: string;
    short_name?: string | null;
    count: number;
}

interface Asset {
    id: number;
    line_id: number | null;
    line?: LineOption | null;
    registry_status: string;
    registry_status_label: string;
    item_type?: string | null;
    name: string;
    model?: string | null;
    serial_number?: string | null;
    stock_number?: string | null;
    condition_code?: string | null;
    brand?: string | null;
    company?: string | null;
    price?: number | null;
    fiscal_year?: string | null;
    budget_type?: string | null;
    control_number?: string | null;
    issue_location?: string | null;
    status_note?: string | null;
    reference_doc?: string | null;
    delivery_date?: string | null;
    fan_coil?: string | null;
    condensing_unit?: string | null;
    location?: string | null;
    owner?: string | null;
    risk_level: string;
    risk_level_label?: string;
    inspection_status?: string | null;
    inspection_status_label?: string;
    status: string;
    purchase_date?: string | null;
    warranty_expiry?: string | null;
    image_path?: string | null;
    image_ref?: string | null;
    sent_at?: string | null;
    repair_slip_no?: string | null;
    repair_job_no?: string | null;
    inspection_doc?: string | null;
    disposal_doc?: string | null;
    writeoff_doc?: string | null;
    scrap_return_doc?: string | null;
}

interface Props {
    assets: {
        data: Asset[];
        links: { url: string | null; label: string; active: boolean }[];
        total: number;
        from?: number | null;
        to?: number | null;
        current_page?: number;
        last_page?: number;
    };
    lines: LineOption[];
    registryStatuses: { value: string; label: string; count: number }[];
    statusRequirements: Record<string, string[]>;
    summary: {
        total: number;
        active: number;
        repair: number;
        pending_disposal: number;
        disposed: number;
        with_image: number;
        value: number;
    };
    filters: {
        line_id?: number | null;
        registry_status?: string | null;
        q?: string;
    };
}

const money = (n?: number | null) =>
    n == null
        ? '-'
        : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const registryStyle: Record<string, string> = {
    normal: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    repair: 'border-amber-200 bg-amber-50 text-amber-800',
    pending_disposal: 'border-orange-200 bg-orange-50 text-orange-800',
    disposed: 'border-slate-200 bg-slate-100 text-slate-600',
};

const fieldLabels: Record<string, string> = {
    event_date: 'วันที่ดำเนินการ',
    repair_slip_no: 'เลขที่ใบส่งซ่อม',
    repair_job_no: 'เลขงาน',
    inspection_doc: 'เลขที่หนังสือตรวจสภาพ',
    disposal_doc: 'เลขที่หนังสือขออนุมัติจำหน่าย',
    note: 'หมายเหตุ / รายละเอียดเพิ่มเติม',
};

export default function Index({
    assets,
    lines,
    registryStatuses,
    statusRequirements,
    summary,
    filters,
}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Asset | null>(null);
    const [statusItem, setStatusItem] = useState<Asset | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [q, setQ] = useState(filters.q || '');

    const emptyForm = {
        line_id: filters.line_id ? String(filters.line_id) : '',
        item_type: '',
        name: '',
        price: '',
        stock_number: '',
        condition_code: '',
        brand: '',
        model: '',
        company: '',
        fiscal_year: '',
        budget_type: '',
        serial_number: '',
        control_number: '',
        issue_location: '',
        status_note: '',
        reference_doc: '',
        delivery_date: '',
        fan_coil: '',
        condensing_unit: '',
        location: '',
        owner: '',
        registry_status: 'normal',
        risk_level: 'C',
        inspection_status: 'not_inspect',
        purchase_date: '',
        warranty_expiry: '',
        frequency_type: 'month',
        frequency_value: '12',
        next_pm_date: '',
        image: null as File | null,
        remove_image: false as boolean,
    };

    const { data, setData, post, delete: destroy, processing, reset, transform } = useForm(emptyForm);

    const selectedLineCode = lines.find((l) => String(l.id) === String(data.line_id))?.code;
    const showAcFields = selectedLineCode === 'engineer';

    const statusForm = useForm({
        registry_status: 'repair',
        event_date: new Date().toISOString().slice(0, 10),
        repair_slip_no: '',
        repair_job_no: '',
        inspection_doc: '',
        disposal_doc: '',
        note: '',
    });

    const requiredFields = useMemo(
        () => statusRequirements[statusForm.data.registry_status] || ['event_date'],
        [statusForm.data.registry_status, statusRequirements],
    );

    const applyFilters = (next: Partial<Props['filters']> = {}) => {
        router.get(
            route('env.assets.index'),
            {
                line_id: next.line_id !== undefined ? next.line_id || undefined : filters.line_id || undefined,
                registry_status:
                    next.registry_status !== undefined
                        ? next.registry_status || undefined
                        : filters.registry_status || undefined,
                q: next.q !== undefined ? next.q || undefined : q || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const handleCreate = () => {
        setEditingItem(null);
        reset();
        setData({
            ...emptyForm,
            line_id: filters.line_id ? String(filters.line_id) : lines[0] ? String(lines[0].id) : '',
            registry_status: 'normal',
        });
        setIsOpen(true);
    };

    const handleEdit = (item: Asset) => {
        setEditingItem(item);
        setData({
            line_id: item.line_id ? String(item.line_id) : '',
            item_type: item.item_type || '',
            name: item.name,
            price: item.price != null ? String(item.price) : '',
            stock_number: item.stock_number || '',
            condition_code: item.condition_code || '',
            brand: item.brand || '',
            model: item.model || '',
            company: item.company || '',
            fiscal_year: item.fiscal_year || '',
            budget_type: item.budget_type || '',
            serial_number: item.serial_number || '',
            control_number: item.control_number || '',
            issue_location: item.issue_location || '',
            status_note: item.status_note || '',
            reference_doc: item.reference_doc || '',
            delivery_date: item.delivery_date || '',
            fan_coil: item.fan_coil || '',
            condensing_unit: item.condensing_unit || '',
            location: item.location || '',
            owner: item.owner || '',
            registry_status: item.registry_status || 'normal',
            risk_level: item.risk_level || 'C',
            inspection_status: item.inspection_status || 'not_inspect',
            purchase_date: item.purchase_date || '',
            warranty_expiry: item.warranty_expiry || '',
            frequency_type: 'month',
            frequency_value: '12',
            next_pm_date: '',
            image: null,
            remove_image: false,
        });
        setIsOpen(true);
    };

    const openStatusChange = (item: Asset) => {
        setStatusItem(item);
        statusForm.setData({
            registry_status: item.registry_status === 'normal' ? 'repair' : 'normal',
            event_date: new Date().toISOString().slice(0, 10),
            repair_slip_no: item.repair_slip_no || '',
            repair_job_no: item.repair_job_no || '',
            inspection_doc: item.inspection_doc || '',
            disposal_doc: item.disposal_doc || '',
            note: '',
        });
        setStatusOpen(true);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            transform((form) => ({
                ...form,
                _method: 'put',
                remove_image: form.remove_image ? 1 : 0,
            }));
            post(route('env.assets.update', editingItem.id), {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    setIsOpen(false);
                    reset();
                    setEditingItem(null);
                },
                onFinish: () => {
                    transform((form) => form);
                },
            });
            return;
        }

        post(route('env.assets.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setIsOpen(false);
                reset();
            },
        });
    };

    const submitStatus = (e: React.FormEvent) => {
        e.preventDefault();
        if (!statusItem) return;
        statusForm.post(route('env.assets.change-status', statusItem.id), {
            onSuccess: () => {
                setStatusOpen(false);
                setStatusItem(null);
            },
        });
    };

    return (
        <QualityPage
            tone="teal"
            icon={Box}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title="ทะเบียนครุภัณฑ์ (บัญชีคุมสิ่งอุปกรณ์)"
            subtitle="รูปประกอบจากไฟล์บัญชีคุม · สถานะ: ปกติ / ส่งซ่อม / รอจำหน่าย / จำหน่าย · เปลี่ยนสถานะต้องบันทึกเอกสารอ้างอิง"
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'ENV', href: route('env.index') },
                { title: 'ทะเบียนครุภัณฑ์', href: route('env.assets.index') },
            ]}
            headTitle="ทะเบียนครุภัณฑ์ ENV"
            subNav={<EnvSubNav active="env.assets.index" />}
            actions={
                <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="rounded-xl">
                        <Link href={route('env.assets.report', { line_id: filters.line_id || undefined })}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            รายงานแยกสาย
                        </Link>
                    </Button>
                    <Button className="rounded-xl" onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        ขึ้นทะเบียน
                    </Button>
                </div>
            }
        >
            <AssetsSubNav active="list" />

            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                {[
                    { label: 'รายการทั้งหมด', value: summary.total.toLocaleString('th-TH') },
                    { label: 'ปกติ', value: summary.active.toLocaleString('th-TH') },
                    { label: 'ส่งซ่อม', value: summary.repair.toLocaleString('th-TH') },
                    { label: 'รอจำหน่าย', value: summary.pending_disposal.toLocaleString('th-TH') },
                    { label: 'จำหน่าย', value: summary.disposed.toLocaleString('th-TH') },
                    { label: 'มีรูปประกอบ', value: summary.with_image.toLocaleString('th-TH') },
                ].map((card) => (
                    <div key={card.label} className="rounded-2xl border border-teal-100 bg-white px-4 py-3 shadow-sm">
                        <div className="text-xs text-slate-500">{card.label}</div>
                        <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{card.value}</div>
                    </div>
                ))}
            </div>

            <Panel title="สายงาน" className="mb-4">
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => applyFilters({ line_id: null })}>
                        <StatusPill
                            label={`ทุกสาย · ${lines.reduce((s, l) => s + l.count, 0).toLocaleString('th-TH')}`}
                            className={cn(
                                'border-slate-200 bg-white text-slate-700',
                                !filters.line_id && 'ring-2 ring-teal-400 ring-offset-1',
                            )}
                        />
                    </button>
                    {lines.map((line) => (
                        <button key={line.id} type="button" onClick={() => applyFilters({ line_id: line.id })}>
                            <StatusPill
                                label={`${line.name} · ${line.count.toLocaleString('th-TH')}`}
                                className={cn(
                                    'border-teal-200 bg-teal-50 text-teal-800',
                                    filters.line_id === line.id && 'ring-2 ring-teal-400 ring-offset-1',
                                )}
                            />
                        </button>
                    ))}
                </div>
            </Panel>

            <Panel title="สถานะ" className="mb-4">
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => applyFilters({ registry_status: null })}>
                        <StatusPill
                            label="ทุกสถานะ"
                            className={cn(
                                'border-slate-200 bg-white text-slate-700',
                                !filters.registry_status && 'ring-2 ring-teal-400 ring-offset-1',
                            )}
                        />
                    </button>
                    {registryStatuses.map((s) => (
                        <button
                            key={s.value}
                            type="button"
                            onClick={() => applyFilters({ registry_status: s.value })}
                        >
                            <StatusPill
                                label={`${s.label} · ${s.count.toLocaleString('th-TH')}`}
                                className={cn(
                                    registryStyle[s.value],
                                    filters.registry_status === s.value && 'ring-2 ring-teal-400 ring-offset-1',
                                )}
                            />
                        </button>
                    ))}
                </div>
            </Panel>

            <Panel
                title="รายการครุภัณฑ์"
                description={`แสดง ${assets.from ?? 0}-${assets.to ?? 0} จาก ${assets.total.toLocaleString('th-TH')} รายการ`}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[220px]">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') applyFilters({ q });
                                }}
                                placeholder="ค้นหา รายการ / หมายเลข สป. / SN"
                                className="rounded-xl pl-9"
                            />
                        </div>
                        <Button variant="outline" className="rounded-xl" onClick={() => applyFilters({ q })}>
                            ค้นหา
                        </Button>
                    </div>
                }
            >
                {assets.data.length === 0 ? (
                    <EmptyState text="ยังไม่มีรายการ" />
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full min-w-[1200px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                    <th className="px-3 py-2.5">รูป</th>
                                    <th className="px-3 py-2.5">สถานะ</th>
                                    <th className="px-3 py-2.5">สาย</th>
                                    <th className="px-3 py-2.5">รายการ</th>
                                    <th className="px-3 py-2.5">หมายเลข สป.</th>
                                    <th className="px-3 py-2.5">ยี่ห้อ/รุ่น</th>
                                    <th className="px-3 py-2.5 text-right">ราคา</th>
                                    <th className="px-3 py-2.5">ที่ตั้ง</th>
                                    <th className="px-3 py-2.5"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.data.map((item) => (
                                    <tr key={item.id} className="border-b border-slate-50 hover:bg-teal-50/30">
                                        <td className="px-3 py-2.5 align-top">
                                            {item.image_path ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setPreview(storageUrl(item.image_path!))}
                                                    className="block h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                                                >
                                                    <img
                                                        src={storageUrl(item.image_path)}
                                                        alt={item.name}
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                    />
                                                </button>
                                            ) : (
                                                <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-slate-200 text-[10px] text-slate-400">
                                                    ไม่มีรูป
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 align-top">
                                            <StatusPill
                                                label={item.registry_status_label}
                                                className={registryStyle[item.registry_status]}
                                            />
                                        </td>
                                        <td className="px-3 py-2.5 align-top text-xs text-slate-600">
                                            {item.line?.short_name || item.line?.name || '-'}
                                        </td>
                                        <td className="max-w-[220px] px-3 py-2.5 align-top">
                                            <div className="font-medium text-slate-900">{item.name}</div>
                                            {item.serial_number && (
                                                <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                                                    SN {item.serial_number}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 align-top font-mono text-xs">
                                            {item.stock_number || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 align-top text-xs">
                                            <div>{item.brand || '-'}</div>
                                            <div className="text-slate-400">{item.model || ''}</div>
                                        </td>
                                        <td className="px-3 py-2.5 align-top text-right tabular-nums">
                                            {money(item.price)}
                                        </td>
                                        <td className="max-w-[160px] px-3 py-2.5 align-top text-xs text-slate-600">
                                            <div className="line-clamp-3">
                                                {item.issue_location || item.location || '-'}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 align-top">
                                            <div className="flex gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                    title="เปลี่ยนสถานภาพ"
                                                    onClick={() => openStatusChange(item)}
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                    onClick={() => handleEdit(item)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-rose-600"
                                                    onClick={() => {
                                                        if (confirm('ลบรายการนี้?')) {
                                                            destroy(route('env.assets.destroy', item.id));
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {(assets.last_page || 1) > 1 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {assets.links.map((link, idx) => (
                            <Button
                                key={idx}
                                size="sm"
                                variant={link.active ? 'default' : 'outline'}
                                className="rounded-lg"
                                disabled={!link.url}
                                onClick={() => link.url && router.visit(link.url, { preserveState: true })}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </Panel>

            <Modal
                open={isOpen}
                onClose={() => setIsOpen(false)}
                title={editingItem ? 'แก้ไขครุภัณฑ์' : 'ขึ้นทะเบียนครุภัณฑ์ (แท็บปกติ)'}
                wide
            >
                <form onSubmit={submit} className="space-y-4">
                    <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2 text-xs text-teal-900">
                        กรอกข้อมูลตามคอลัมน์บัญชีคุมแท็บ “ปกติ” · สถานะเริ่มต้นเป็นปกติ · สามารถแนบรูปภาพ สป. ได้
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="สายงาน" required>
                            <Select value={data.line_id} onValueChange={(v) => setData('line_id', v)}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="เลือกสาย" />
                                </SelectTrigger>
                                <SelectContent>
                                    {lines.map((line) => (
                                        <SelectItem key={line.id} value={String(line.id)}>
                                            {line.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="ลำดับ / ประเภท สป.">
                            <Input value={data.item_type} onChange={(e) => setData('item_type', e.target.value)} />
                        </Field>

                        <Field label="รายการ" required className="sm:col-span-2">
                            <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                        </Field>

                        <Field label="ราคา/หน่วย">
                            <Input
                                type="number"
                                step="0.01"
                                value={data.price}
                                onChange={(e) => setData('price', e.target.value)}
                            />
                        </Field>
                        <Field label="หมายเลข สป. 8 หลัก">
                            <Input value={data.stock_number} onChange={(e) => setData('stock_number', e.target.value)} />
                        </Field>
                        <Field label="สถานภาพ สป.">
                            <Input
                                value={data.condition_code}
                                onChange={(e) => setData('condition_code', e.target.value)}
                                placeholder="เช่น ส.1 / ส.2"
                            />
                        </Field>
                        <Field label="ยี่ห้อ">
                            <Input value={data.brand} onChange={(e) => setData('brand', e.target.value)} />
                        </Field>
                        <Field label="รุ่น">
                            <Input value={data.model} onChange={(e) => setData('model', e.target.value)} />
                        </Field>
                        <Field label="บริษัท">
                            <Input value={data.company} onChange={(e) => setData('company', e.target.value)} />
                        </Field>
                        <Field label="ปีงบประมาณ">
                            <Input value={data.fiscal_year} onChange={(e) => setData('fiscal_year', e.target.value)} />
                        </Field>
                        <Field label="ประเภทงบประมาณ">
                            <Input value={data.budget_type} onChange={(e) => setData('budget_type', e.target.value)} />
                        </Field>
                        <Field label="SN">
                            <Input value={data.serial_number} onChange={(e) => setData('serial_number', e.target.value)} />
                        </Field>
                        <Field label="หมายเลข คฉ.">
                            <Input
                                value={data.control_number}
                                onChange={(e) => setData('control_number', e.target.value)}
                            />
                        </Field>
                        <Field label="อสอ./สป.4" className="sm:col-span-2">
                            <Input
                                value={data.issue_location}
                                onChange={(e) => setData('issue_location', e.target.value)}
                            />
                        </Field>
                        <Field label="สถานะสิ่งอุปกรณ์ / หมายเหตุ" className="sm:col-span-2">
                            <Textarea
                                value={data.status_note}
                                onChange={(e) => setData('status_note', e.target.value)}
                                rows={2}
                            />
                        </Field>
                        <Field label="เอกสารอ้างอิง">
                            <Input
                                value={data.reference_doc}
                                onChange={(e) => setData('reference_doc', e.target.value)}
                            />
                        </Field>
                        <Field label="วันที่ส่งมอบ">
                            <Input
                                value={data.delivery_date}
                                onChange={(e) => setData('delivery_date', e.target.value)}
                                placeholder="วว/ดด/ปปปป หรือ YYYY-MM-DD"
                            />
                        </Field>

                        {showAcFields && (
                            <>
                                <Field label="แฟนคอยล์">
                                    <Input value={data.fan_coil} onChange={(e) => setData('fan_coil', e.target.value)} />
                                </Field>
                                <Field label="คอนเดนซิ่ง">
                                    <Input
                                        value={data.condensing_unit}
                                        onChange={(e) => setData('condensing_unit', e.target.value)}
                                    />
                                </Field>
                            </>
                        )}

                        <Field label="ระดับความเสี่ยง">
                            <Select value={data.risk_level} onValueChange={(v) => setData('risk_level', v)}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="A">A สูง</SelectItem>
                                    <SelectItem value="B">B กลาง</SelectItem>
                                    <SelectItem value="C">C ต่ำ</SelectItem>
                                    <SelectItem value="N">ไม่ระบุ</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="การสอบเทียบ">
                            <Select
                                value={data.inspection_status}
                                onValueChange={(v) => setData('inspection_status', v)}
                            >
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="inspect">สอบเทียบ</SelectItem>
                                    <SelectItem value="not_inspect">ไม่สอบเทียบ</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        {!editingItem && (
                            <Field label="รอบ PM (เดือน)">
                                <Input
                                    type="number"
                                    min={1}
                                    value={data.frequency_value}
                                    onChange={(e) => setData('frequency_value', e.target.value)}
                                />
                            </Field>
                        )}

                        <Field label="รูปภาพ สป." className="sm:col-span-2">
                            <div className="flex flex-wrap items-start gap-3">
                                {editingItem?.image_path && !data.remove_image && !data.image && (
                                    <img
                                        src={storageUrl(editingItem.image_path)}
                                        alt=""
                                        className="h-20 w-20 rounded-lg border object-cover"
                                    />
                                )}
                                {data.image && (
                                    <div className="text-xs text-slate-600">เลือกไฟล์ใหม่: {data.image.name}</div>
                                )}
                                <div className="min-w-[220px] flex-1 space-y-2">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            setData('image', e.target.files?.[0] || null);
                                            setData('remove_image', false);
                                        }}
                                    />
                                    {editingItem?.image_path && (
                                        <label className="flex items-center gap-2 text-xs text-slate-600">
                                            <input
                                                type="checkbox"
                                                checked={data.remove_image}
                                                onChange={(e) => setData('remove_image', e.target.checked)}
                                            />
                                            ลบรูปเดิมออก
                                        </label>
                                    )}
                                </div>
                            </div>
                        </Field>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button type="submit" disabled={processing}>
                            บันทึก
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                open={statusOpen}
                onClose={() => setStatusOpen(false)}
                title={`เปลี่ยนสถานะ · ${statusItem?.name || ''}`}
                wide
            >
                <form onSubmit={submitStatus} className="space-y-3">
                    <Field label="สถานะใหม่">
                        <Select
                            value={statusForm.data.registry_status}
                            onValueChange={(v) => statusForm.setData('registry_status', v)}
                        >
                            <SelectTrigger className="rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {registryStatuses.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">
                        เมื่อเปลี่ยนสถานะ ต้องบันทึกข้อมูลอ้างอิงตามสถานะที่เลือก
                        {requiredFields.length > 0 && (
                            <div className="mt-1">
                                ต้องกรอก: {requiredFields.map((f) => fieldLabels[f] || f).join(', ')}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="วันที่ดำเนินการ" required>
                            <Input
                                type="date"
                                value={statusForm.data.event_date}
                                onChange={(e) => statusForm.setData('event_date', e.target.value)}
                                required
                            />
                        </Field>

                        {statusForm.data.registry_status === 'repair' && (
                            <>
                                <Field label="เลขที่ใบส่งซ่อม" required>
                                    <Input
                                        value={statusForm.data.repair_slip_no}
                                        onChange={(e) => statusForm.setData('repair_slip_no', e.target.value)}
                                        required
                                    />
                                </Field>
                                <Field label="เลขงาน" required>
                                    <Input
                                        value={statusForm.data.repair_job_no}
                                        onChange={(e) => statusForm.setData('repair_job_no', e.target.value)}
                                        required
                                    />
                                </Field>
                            </>
                        )}

                        {statusForm.data.registry_status === 'pending_disposal' && (
                            <>
                                <Field label="เลขที่หนังสือตรวจสภาพ" required className="sm:col-span-2">
                                    <Input
                                        value={statusForm.data.inspection_doc}
                                        onChange={(e) => statusForm.setData('inspection_doc', e.target.value)}
                                        required
                                    />
                                </Field>
                                <Field label="เลขที่หนังสือขออนุมัติจำหน่าย" required className="sm:col-span-2">
                                    <Input
                                        value={statusForm.data.disposal_doc}
                                        onChange={(e) => statusForm.setData('disposal_doc', e.target.value)}
                                        required
                                    />
                                </Field>
                            </>
                        )}

                        {statusForm.data.registry_status === 'disposed' && (
                            <Field label="เลขที่หนังสือขออนุมัติจำหน่าย" required className="sm:col-span-2">
                                <Input
                                    value={statusForm.data.disposal_doc}
                                    onChange={(e) => statusForm.setData('disposal_doc', e.target.value)}
                                    required
                                />
                            </Field>
                        )}

                        <Field label="หมายเหตุ / รายละเอียดเพิ่มเติม" className="sm:col-span-2">
                            <Textarea
                                value={statusForm.data.note}
                                onChange={(e) => statusForm.setData('note', e.target.value)}
                                rows={3}
                            />
                        </Field>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setStatusOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button type="submit" disabled={statusForm.processing}>
                            บันทึกการเปลี่ยนสถานะ
                        </Button>
                    </div>
                </form>
            </Modal>

            {preview && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={() => setPreview(null)}
                >
                    <img src={preview} alt="preview" className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl" />
                </div>
            )}
        </QualityPage>
    );
}
