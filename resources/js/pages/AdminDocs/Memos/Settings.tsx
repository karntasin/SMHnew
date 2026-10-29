import { Head, router, useForm } from '@inertiajs/react';
import { CopyPlus, Move, Pencil, Save, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import LayoutCanvas from './LayoutCanvas';
import MemoSubNav from './MemoSubNav';
import { LAYOUT_LABELS, type FieldDef, type MemoBaseLayout, type MemoFormProps, type MemoLayout } from './types';

interface SettingsData {
    unit_name: string;
    agency: string | null;
    address: string | null;
    phone: string | null;
    fax: string | null;
    email: string | null;
    signer_name: string | null;
    signer_position: string | null;
    owner_unit: string | null;
}

interface Props {
    settings: SettingsData;
    forms: MemoFormProps[];
    defaultLayouts: Record<MemoBaseLayout, MemoLayout>;
}

const breadcrumbs = [
    { title: 'งานธุรการ', href: '/admin-hub' },
    { title: 'จัดการงานเอกสาร', href: route('admin-docs.memos.index') },
    { title: 'ตั้งค่า', href: route('admin-docs.memos.settings') },
];

const letterheadFields: { key: keyof SettingsData; label: string; area?: boolean }[] = [
    { key: 'unit_name', label: 'ชื่อหน่วยงาน' },
    { key: 'agency', label: 'ส่วนราชการ' },
    { key: 'address', label: 'ที่อยู่', area: true },
    { key: 'phone', label: 'โทร.' },
    { key: 'fax', label: 'โทรสาร' },
    { key: 'email', label: 'ไปรษณีย์อิเล็กทรอนิกส์' },
    { key: 'owner_unit', label: 'ส่วนราชการเจ้าของเรื่อง' },
    { key: 'signer_name', label: 'ชื่อผู้ลงนามเริ่มต้น' },
    { key: 'signer_position', label: 'ตำแหน่งผู้ลงนามเริ่มต้น' },
];

function initialTab(): string {
    if (typeof window === 'undefined') return 'letterhead';
    const tab = new URLSearchParams(window.location.search).get('tab');
    return tab === 'forms' ? 'forms' : 'letterhead';
}

export default function Settings({ settings, forms, defaultLayouts }: Props) {
    const [tab, setTab] = useState(initialTab);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [layoutingId, setLayoutingId] = useState<number | null>(null);
    const [creating, setCreating] = useState(false);

    const form = useForm({
        unit_name: settings.unit_name ?? '',
        agency: settings.agency ?? '',
        address: settings.address ?? '',
        phone: settings.phone ?? '',
        fax: settings.fax ?? '',
        email: settings.email ?? '',
        signer_name: settings.signer_name ?? '',
        signer_position: settings.signer_position ?? '',
        owner_unit: settings.owner_unit ?? '',
    });

    const editing = useMemo(() => forms.find((row) => row.id === editingId) ?? null, [forms, editingId]);
    const layouting = useMemo(() => forms.find((row) => row.id === layoutingId) ?? null, [forms, layoutingId]);

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="ตั้งค่าหนังสือราชการ">
            <Head title="ตั้งค่าหนังสือราชการ" />
            <div className={layouting ? 'mx-auto max-w-6xl space-y-5 p-4 md:p-6' : 'mx-auto max-w-4xl space-y-5 p-4 md:p-6'}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-medium text-emerald-700">จัดการงานเอกสาร</p>
                        <h1 className="text-2xl font-semibold text-slate-900">ตั้งค่าหนังสือราชการ</h1>
                        <p className="mt-1 text-sm text-slate-500">หัวกระดาษเริ่มต้น แบบฟอร์ม และจัดตำแหน่งบนกระดาษ</p>
                    </div>
                    <MemoSubNav />
                </div>

                <Tabs
                    value={tab}
                    onValueChange={(value) => {
                        setTab(value);
                        setEditingId(null);
                        setLayoutingId(null);
                        setCreating(false);
                        const url = new URL(window.location.href);
                        if (value === 'forms') url.searchParams.set('tab', 'forms');
                        else url.searchParams.delete('tab');
                        window.history.replaceState({}, '', url.toString());
                    }}
                >
                    <TabsList>
                        <TabsTrigger value="letterhead">หัวกระดาษ</TabsTrigger>
                        <TabsTrigger value="forms">แบบฟอร์ม</TabsTrigger>
                    </TabsList>

                    <TabsContent value="letterhead" className="mt-4">
                        <form
                            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                            onSubmit={(event) => {
                                event.preventDefault();
                                form.put(route('admin-docs.memos.settings.update'));
                            }}
                        >
                            {letterheadFields.map((field) => (
                                <div key={field.key} className="space-y-1.5">
                                    <Label htmlFor={field.key}>{field.label}</Label>
                                    {field.area ? (
                                        <Textarea
                                            id={field.key}
                                            rows={field.key === 'address' ? 4 : 3}
                                            value={form.data[field.key]}
                                            onChange={(event) => form.setData(field.key, event.target.value)}
                                            placeholder={
                                                field.key === 'address'
                                                    ? "ตำบล...\nอำเภอ...\nจังหวัด... 27120"
                                                    : undefined
                                            }
                                        />
                                    ) : (
                                        <Input
                                            id={field.key}
                                            value={form.data[field.key]}
                                            onChange={(event) => form.setData(field.key, event.target.value)}
                                            required={field.key === 'unit_name'}
                                        />
                                    )}
                                    {form.errors[field.key] && <p className="text-sm text-rose-600">{form.errors[field.key]}</p>}
                                </div>
                            ))}
                            <Button type="submit" disabled={form.processing} className="bg-emerald-600 hover:bg-emerald-700">
                                <Save className="mr-2 size-4" />
                                {form.processing ? 'กำลังบันทึก' : 'บันทึกหัวกระดาษ'}
                            </Button>
                        </form>
                    </TabsContent>

                    <TabsContent value="forms" className="mt-4 space-y-4">
                        {creating ? (
                            <CreateFormPanel forms={forms} onCancel={() => setCreating(false)} />
                        ) : layouting ? (
                            <LayoutFormPanel
                                formRow={layouting}
                                defaultLayout={defaultLayouts[layouting.base_layout]}
                                onCancel={() => setLayoutingId(null)}
                            />
                        ) : editing ? (
                            <EditFormPanel formRow={editing} onCancel={() => setEditingId(null)} />
                        ) : (
                            <>
                                <div className="flex justify-end">
                                    <Button type="button" onClick={() => setCreating(true)} className="bg-emerald-600 hover:bg-emerald-700">
                                        <CopyPlus className="mr-2 size-4" />
                                        สร้างแบบฟอร์มใหม่
                                    </Button>
                                </div>
                                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <ul className="divide-y divide-slate-100">
                                        {forms.map((row) => (
                                            <li key={row.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="font-medium text-slate-900">{row.label}</p>
                                                    <p className="text-sm text-slate-500">
                                                        คีย์ {row.key} · เลย์เอาต์ {LAYOUT_LABELS[row.base_layout]}
                                                        {row.is_system ? ' · แบบระบบ' : ''}
                                                        {' · '}
                                                        {row.fields.length} ช่อง
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button type="button" variant="outline" size="sm" onClick={() => setLayoutingId(row.id)}>
                                                        <Move className="mr-1.5 size-3.5" />
                                                        จัดตำแหน่ง
                                                    </Button>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(row.id)}>
                                                        <Pencil className="mr-1.5 size-3.5" />
                                                        แก้
                                                    </Button>
                                                    {!row.is_system && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-rose-700"
                                                            onClick={() => {
                                                                if (!confirm(`ลบแบบฟอร์ม “${row.label}” ?`)) return;
                                                                router.delete(route('admin-docs.memos.forms.destroy', row.id));
                                                            }}
                                                        >
                                                            <Trash2 className="mr-1.5 size-3.5" />
                                                            ลบ
                                                        </Button>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}

function CreateFormPanel({ forms, onCancel }: { forms: MemoFormProps[]; onCancel: () => void }) {
    const createForm = useForm({
        label: '',
        key: '',
        clone_from: forms[0]?.key ?? 'internal',
        base_layout: (forms[0]?.base_layout ?? 'internal') as MemoBaseLayout,
    });

    const syncLayoutFromClone = (cloneKey: string) => {
        const source = forms.find((row) => row.key === cloneKey);
        createForm.setData({
            ...createForm.data,
            clone_from: cloneKey,
            base_layout: source?.base_layout ?? 'internal',
        });
    };

    return (
        <form
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            onSubmit={(event) => {
                event.preventDefault();
                createForm.post(route('admin-docs.memos.forms.store'), {
                    onSuccess: () => onCancel(),
                });
            }}
        >
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">สร้างแบบฟอร์มใหม่</h2>
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                    <X className="size-4" />
                </Button>
            </div>
            <p className="text-sm text-slate-500">คัดลอกช่องจากแบบที่มีอยู่ แล้วตั้งชื่อและคีย์ใหม่ เลย์เอาต์ Word ใช้ฐานหนึ่งในสามแบบ</p>
            <div className="space-y-1.5">
                <Label htmlFor="new-label">ชื่อแบบฟอร์ม</Label>
                <Input
                    id="new-label"
                    value={createForm.data.label}
                    onChange={(event) => createForm.setData('label', event.target.value)}
                    required
                />
                {createForm.errors.label && <p className="text-sm text-rose-600">{createForm.errors.label}</p>}
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="new-key">คีย์ (ภาษาอังกฤษ เว้นว่างให้ระบบสร้าง)</Label>
                <Input
                    id="new-key"
                    value={createForm.data.key}
                    onChange={(event) => createForm.setData('key', event.target.value.replace(/[^a-z0-9_]/gi, '').toLowerCase())}
                    placeholder="เช่น circular"
                />
                {createForm.errors.key && <p className="text-sm text-rose-600">{createForm.errors.key}</p>}
            </div>
            <div className="space-y-1.5">
                <Label>คัดลอกจาก</Label>
                <Select value={createForm.data.clone_from} onValueChange={syncLayoutFromClone}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {forms.map((row) => (
                            <SelectItem key={row.key} value={row.key}>
                                {row.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <Label>เลย์เอาต์ฐาน</Label>
                <Select
                    value={createForm.data.base_layout}
                    onValueChange={(value) => createForm.setData('base_layout', value as MemoBaseLayout)}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {(Object.keys(LAYOUT_LABELS) as MemoBaseLayout[]).map((key) => (
                            <SelectItem key={key} value={key}>
                                {LAYOUT_LABELS[key]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex gap-2">
                <Button type="submit" disabled={createForm.processing} className="bg-emerald-600 hover:bg-emerald-700">
                    <Save className="mr-2 size-4" />
                    สร้างแบบฟอร์ม
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                    ยกเลิก
                </Button>
            </div>
        </form>
    );
}

function LayoutFormPanel({
    formRow,
    defaultLayout,
    onCancel,
}: {
    formRow: MemoFormProps;
    defaultLayout: MemoLayout;
    onCancel: () => void;
}) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const saveForm = useForm({
        label: formRow.label,
        base_layout: formRow.base_layout,
        fields: formRow.fields.map((field) => ({ ...field })),
        layout: structuredClone(formRow.layout),
    });

    return (
        <div
            className={
                isFullscreen
                    ? 'fixed inset-0 z-50 overflow-y-auto bg-stone-100 p-4 md:p-6 flex flex-col space-y-4'
                    : 'space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
            }
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">จัดตำแหน่ง — {formRow.label}</h2>
                    <p className="text-sm text-slate-500">
                        ลากบล็อกบนกระดาษ A4 — บันทึกแล้วตัวอย่างและไฟล์ Word ใช้พิกัดเดียวกัน
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        disabled={saveForm.processing}
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                            saveForm.put(route('admin-docs.memos.forms.update', formRow.id), {
                                onSuccess: () => onCancel(),
                            });
                        }}
                    >
                        <Save className="mr-2 size-4" />
                        บันทึกตำแหน่ง
                    </Button>
                    <Button type="button" variant="outline" onClick={onCancel}>
                        ยกเลิก
                    </Button>
                </div>
            </div>
            {Object.keys(saveForm.errors).length > 0 && (
                <p className="text-sm text-rose-600">บันทึกตำแหน่งไม่สำเร็จ ลองบันทึกอีกครั้ง</p>
            )}
            <LayoutCanvas
                layout={saveForm.data.layout}
                baseLayout={formRow.base_layout}
                defaultLayout={defaultLayout}
                onChange={(layout) => saveForm.setData('layout', layout)}
                isFullscreen={isFullscreen}
                onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
            />
        </div>
    );
}

function EditFormPanel({ formRow, onCancel }: { formRow: MemoFormProps; onCancel: () => void }) {
    const editForm = useForm({
        label: formRow.label,
        base_layout: formRow.base_layout,
        fields: formRow.fields.map((field) => ({ ...field })),
        layout: structuredClone(formRow.layout),
    });

    const updateField = (index: number, patch: Partial<FieldDef>) => {
        const fields = editForm.data.fields.map((field, i) => (i === index ? { ...field, ...patch } : field));
        editForm.setData('fields', fields);
    };

    return (
        <form
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            onSubmit={(event) => {
                event.preventDefault();
                editForm.put(route('admin-docs.memos.forms.update', formRow.id), {
                    onSuccess: () => onCancel(),
                });
            }}
        >
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">แก้แบบฟอร์ม</h2>
                    <p className="text-sm text-slate-500">คีย์ {formRow.key}{formRow.is_system ? ' · แบบระบบ (ลบไม่ได้)' : ''}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                    <X className="size-4" />
                </Button>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="edit-label">ชื่อแบบฟอร์ม</Label>
                <Input
                    id="edit-label"
                    value={editForm.data.label}
                    onChange={(event) => editForm.setData('label', event.target.value)}
                    required
                />
            </div>

            <div className="space-y-1.5">
                <Label>เลย์เอาต์ฐาน</Label>
                {formRow.is_system ? (
                    <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {LAYOUT_LABELS[formRow.base_layout]} (ล็อกไว้สำหรับแบบระบบ)
                    </p>
                ) : (
                    <Select
                        value={editForm.data.base_layout}
                        onValueChange={(value) => editForm.setData('base_layout', value as MemoBaseLayout)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {(Object.keys(LAYOUT_LABELS) as MemoBaseLayout[]).map((key) => (
                                <SelectItem key={key} value={key}>
                                    {LAYOUT_LABELS[key]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">ช่องข้อมูล</h3>
                {editForm.data.fields.map((field, index) => (
                    <div key={field.key} className="space-y-3 rounded-xl border border-slate-200 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-slate-800">{field.key}</p>
                            <label className="flex items-center gap-2 text-sm text-slate-600">
                                <Checkbox
                                    checked={field.enabled}
                                    onCheckedChange={(checked) => updateField(index, { enabled: checked === true })}
                                />
                                เปิดพิมพ์
                            </label>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label>คำอธิบาย</Label>
                                <Input value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label>ข้อความตัวอย่าง</Label>
                                <Input
                                    value={field.placeholder ?? ''}
                                    onChange={(event) => updateField(index, { placeholder: event.target.value })}
                                />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <Checkbox
                                checked={field.optional}
                                onCheckedChange={(checked) => updateField(index, { optional: checked === true })}
                            />
                            ไม่บังคับแสดงเมื่อว่าง
                        </label>
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <Button type="submit" disabled={editForm.processing} className="bg-emerald-600 hover:bg-emerald-700">
                    <Save className="mr-2 size-4" />
                    บันทึกแบบฟอร์ม
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                    ยกเลิก
                </Button>
            </div>
        </form>
    );
}
