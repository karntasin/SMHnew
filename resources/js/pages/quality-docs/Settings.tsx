import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, Plus, Edit2, Trash2, CheckCircle2, XCircle, ShieldCheck, FileText, Layers, AlertCircle } from 'lucide-react';
import { QualityPage, Panel, Field, StatusPill, EmptyState } from '@/components/quality/quality-ui';
import DocsSubNav from '@/pages/quality-docs/DocsSubNav';
import { cn } from '@/lib/utils';

interface Taxonomy {
    id: number;
    type: 'standard' | 'document_type';
    code: string;
    name: string;
    description: string | null;
    color: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface Props {
    standards: Taxonomy[];
    documentTypes: Taxonomy[];
    usage: {
        categories: Record<string, number>;
        documentTypes: Record<string, number>;
    };
    canManageSettings: boolean;
}

const COLOR_OPTIONS = [
    { value: 'blue', label: 'น้ำเงิน (Blue)', bg: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'indigo', label: 'คราม (Indigo)', bg: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { value: 'emerald', label: 'เขียว (Emerald)', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { value: 'teal', label: 'เขียวน้ำทะเล (Teal)', bg: 'bg-teal-100 text-teal-700 border-teal-200' },
    { value: 'amber', label: 'ส้ม/ทอง (Amber)', bg: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'rose', label: 'แดง/ชมพู (Rose)', bg: 'bg-rose-100 text-rose-700 border-rose-200' },
    { value: 'purple', label: 'ม่วง (Purple)', bg: 'bg-purple-100 text-purple-700 border-purple-200' },
    { value: 'slate', label: 'เทา (Slate)', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
];

export default function Settings({ standards, documentTypes, usage }: Props) {
    const [activeTab, setActiveTab] = useState<'standard' | 'document_type'>('standard');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Taxonomy | null>(null);
    const [deletingItem, setDeletingItem] = useState<Taxonomy | null>(null);

    // Form for Create
    const createForm = useForm({
        type: activeTab,
        code: '',
        name: '',
        description: '',
        color: 'blue',
        sort_order: 0,
        is_active: true,
    });

    // Form for Edit
    const editForm = useForm({
        code: '',
        name: '',
        description: '',
        color: 'blue',
        sort_order: 0,
        is_active: true,
    });

    const openCreateModal = (type: 'standard' | 'document_type') => {
        createForm.reset();
        createForm.setData({
            type,
            code: '',
            name: '',
            description: '',
            color: type === 'standard' ? 'blue' : 'emerald',
            sort_order: (type === 'standard' ? standards.length : documentTypes.length) + 1,
            is_active: true,
        });
        setIsCreateOpen(true);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('quality-docs.settings.taxonomies.store'), {
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const openEditModal = (item: Taxonomy) => {
        setEditingItem(item);
        editForm.setData({
            code: item.code,
            name: item.name,
            description: item.description || '',
            color: item.color || 'blue',
            sort_order: item.sort_order,
            is_active: item.is_active,
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        editForm.put(route('quality-docs.settings.taxonomies.update', { id: editingItem.id }), {
            onSuccess: () => {
                setEditingItem(null);
            },
        });
    };

    const handleToggleActive = (item: Taxonomy) => {
        router.patch(route('quality-docs.settings.taxonomies.toggle', { id: item.id }), {}, {
            preserveScroll: true,
        });
    };

    const handleDelete = () => {
        if (!deletingItem) return;
        router.delete(route('quality-docs.settings.taxonomies.destroy', { id: deletingItem.id }), {
            onSuccess: () => {
                setDeletingItem(null);
            },
        });
    };

    const getColorClasses = (colorName: string) => {
        const option = COLOR_OPTIONS.find((c) => c.value === colorName);
        return option ? option.bg : 'bg-slate-100 text-slate-700 border-slate-200';
    };

    const breadcrumbs = [
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'เอกสารคุณภาพ', href: '/quality-docs' },
        { title: 'ตั้งค่าหมวดหมู่', href: '/quality-docs/settings' },
    ];

    const renderTable = (items: Taxonomy[], type: 'standard' | 'document_type') => {
        const usageDict = type === 'standard' ? usage.categories : usage.documentTypes;

        if (items.length === 0) {
            return (
                <EmptyState
                    text={`ยังไม่มีรายการ${type === 'standard' ? 'หมวดหมู่มาตรฐาน' : 'ประเภทเอกสาร'}`}
                    action={
                        <Button onClick={() => openCreateModal(type)} className="mt-3 rounded-xl bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" /> เพิ่มรายการแรก
                        </Button>
                    }
                />
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                            <th className="py-2.5 pr-3">ลำดับ</th>
                            <th className="py-2.5 pr-3">รหัส (Code)</th>
                            <th className="py-2.5 pr-3">ชื่อหมวดหมู่</th>
                            <th className="py-2.5 pr-3">คำอธิบาย</th>
                            <th className="py-2.5 pr-3">ตัวอย่าง Badge</th>
                            <th className="py-2.5 pr-3 text-center">เอกสารใช้งาน</th>
                            <th className="py-2.5 pr-3 text-center">สถานะ</th>
                            <th className="py-2.5 text-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => {
                            const count = usageDict[item.code] || 0;
                            return (
                                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                    <td className="py-3 pr-3 text-slate-400">{item.sort_order || idx + 1}</td>
                                    <td className="py-3 pr-3 font-mono font-semibold text-slate-800">{item.code}</td>
                                    <td className="py-3 pr-3 font-medium text-slate-900">{item.name}</td>
                                    <td className="py-3 pr-3 text-xs text-slate-500 max-w-[250px] truncate">
                                        {item.description || '-'}
                                    </td>
                                    <td className="py-3 pr-3">
                                        <span className={cn('inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold', getColorClasses(item.color))}>
                                            {item.name}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-3 text-center">
                                        <span className={cn(
                                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                                            count > 0 ? 'bg-blue-50 text-blue-700 font-semibold' : 'bg-slate-100 text-slate-500'
                                        )}>
                                            {count} ฉบับ
                                        </span>
                                    </td>
                                    <td className="py-3 pr-3 text-center">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleActive(item)}
                                            className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
                                            title="คลิกเพื่อสลับสถานะ"
                                        >
                                            {item.is_active ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                                    <CheckCircle2 className="h-3 w-3" /> เปิดใช้งาน
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                                                    <XCircle className="h-3 w-3" /> ปิดใช้งาน
                                                </span>
                                            )}
                                        </button>
                                    </td>
                                    <td className="py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEditModal(item)}
                                                className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600"
                                                title="แก้ไข"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDeletingItem(item)}
                                                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
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
        );
    };

    return (
        <QualityPage
            tone="blue"
            icon={Settings2}
            badge="ศูนย์พัฒนาคุณภาพ · ตั้งค่าระบบ"
            title="ตั้งค่าหมวดหมู่เอกสารคุณภาพ"
            subtitle="จัดการหมวดหมู่มาตรฐาน (Standards) และประเภทเอกสาร (Document Types) สำหรับคลังเอกสารคุณภาพ"
            breadcrumbs={breadcrumbs}
            subNav={<DocsSubNav active="quality-docs.settings" />}
        >
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-600 p-2 text-white">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-blue-950">สิทธิ์การตั้งค่าระบบ (Role-based Settings)</h4>
                        <p className="text-xs text-blue-700">
                            เข้าถึงได้เฉพาะผู้มีบทบาท: <span className="font-semibold">admin, superuser, header, boss</span>
                        </p>
                    </div>
                </div>
            </div>

            <Panel title="หมวดหมู่และการจัดกลุ่มเอกสาร">
                <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'standard' | 'document_type')}>
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-100 sm:w-auto">
                            <TabsTrigger value="standard" className="flex items-center gap-2 rounded-lg py-2">
                                <Layers className="h-4 w-4" />
                                <span>มาตรฐาน (Standards)</span>
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                    {standards.length}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="document_type" className="flex items-center gap-2 rounded-lg py-2">
                                <FileText className="h-4 w-4" />
                                <span>ประเภทเอกสาร (Document Types)</span>
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                    {documentTypes.length}
                                </span>
                            </TabsTrigger>
                        </TabsList>

                        <Button
                            onClick={() => openCreateModal(activeTab)}
                            className="rounded-xl bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            {activeTab === 'standard' ? 'เพิ่มมาตรฐานใหม่' : 'เพิ่มประเภทเอกสารใหม่'}
                        </Button>
                    </div>

                    <TabsContent value="standard" className="mt-0">
                        {renderTable(standards, 'standard')}
                    </TabsContent>

                    <TabsContent value="document_type" className="mt-0">
                        {renderTable(documentTypes, 'document_type')}
                    </TabsContent>
                </Tabs>
            </Panel>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {createForm.data.type === 'standard' ? 'เพิ่มหมวดหมู่มาตรฐานใหม่' : 'เพิ่มประเภทเอกสารใหม่'}
                        </DialogTitle>
                        <DialogDescription>
                            กรอกข้อมูลหมวดหมู่เพื่อใช้ในการจัดเก็บและสืบค้นเอกสารคุณภาพ
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                        <Field label="รหัสย่อ (Code)" required error={createForm.errors.code}>
                            <Input
                                value={createForm.data.code}
                                onChange={(e) => createForm.setData('code', e.target.value.toUpperCase())}
                                placeholder={createForm.data.type === 'standard' ? 'เช่น HA, JCI, ISO' : 'เช่น Policy, WI, SOP'}
                                className="rounded-xl font-mono uppercase"
                            />
                        </Field>

                        <Field label="ชื่อที่แสดง (Display Name)" required error={createForm.errors.name}>
                            <Input
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                placeholder={createForm.data.type === 'standard' ? 'เช่น HA (Hospital Accreditation)' : 'เช่น วิธีปฏิบัติงาน (Work Instruction)'}
                                className="rounded-xl"
                            />
                        </Field>

                        <Field label="คำอธิบายเพิ่มเติม" error={createForm.errors.description}>
                            <Textarea
                                value={createForm.data.description}
                                onChange={(e) => createForm.setData('description', e.target.value)}
                                placeholder="รายละเอียดขอบเขตการใช้งาน..."
                                className="min-h-[80px] rounded-xl text-sm"
                            />
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="โทนสี Badge">
                                <Select
                                    value={createForm.data.color}
                                    onValueChange={(val) => createForm.setData('color', val)}
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COLOR_OPTIONS.map((c) => (
                                            <SelectItem key={c.value} value={c.value}>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn('h-3 w-3 rounded-full border', c.bg)} />
                                                    <span>{c.label}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="ลำดับการแสดงผล" error={createForm.errors.sort_order}>
                                <Input
                                    type="number"
                                    value={createForm.data.sort_order}
                                    onChange={(e) => createForm.setData('sort_order', parseInt(e.target.value) || 0)}
                                    className="rounded-xl"
                                />
                            </Field>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <div>
                                <p className="text-sm font-medium text-slate-800">เปิดใช้งานทันที</p>
                                <p className="text-xs text-slate-400">สามารถเลือกใช้งานในหน้าสร้างและกรองเอกสารได้</p>
                            </div>
                            <Switch
                                checked={createForm.data.is_active}
                                onCheckedChange={(val) => createForm.setData('is_active', val)}
                            />
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl">
                                ยกเลิก
                            </Button>
                            <Button type="submit" disabled={createForm.processing} className="rounded-xl bg-blue-600 hover:bg-blue-700">
                                {createForm.processing ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            แก้ไข{editingItem?.type === 'standard' ? 'หมวดหมู่มาตรฐาน' : 'ประเภทเอกสาร'}
                        </DialogTitle>
                        <DialogDescription>
                            ปรับปรุงข้อมูลรหัส ชื่อ หรือสถานะการใช้งาน
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <Field label="รหัสย่อ (Code)" required error={editForm.errors.code}>
                            <Input
                                value={editForm.data.code}
                                onChange={(e) => editForm.setData('code', e.target.value.toUpperCase())}
                                className="rounded-xl font-mono uppercase"
                            />
                        </Field>

                        <Field label="ชื่อที่แสดง (Display Name)" required error={editForm.errors.name}>
                            <Input
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                                className="rounded-xl"
                            />
                        </Field>

                        <Field label="คำอธิบายเพิ่มเติม" error={editForm.errors.description}>
                            <Textarea
                                value={editForm.data.description}
                                onChange={(e) => editForm.setData('description', e.target.value)}
                                className="min-h-[80px] rounded-xl text-sm"
                            />
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="โทนสี Badge">
                                <Select
                                    value={editForm.data.color}
                                    onValueChange={(val) => editForm.setData('color', val)}
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COLOR_OPTIONS.map((c) => (
                                            <SelectItem key={c.value} value={c.value}>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn('h-3 w-3 rounded-full border', c.bg)} />
                                                    <span>{c.label}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="ลำดับการแสดงผล" error={editForm.errors.sort_order}>
                                <Input
                                    type="number"
                                    value={editForm.data.sort_order}
                                    onChange={(e) => editForm.setData('sort_order', parseInt(e.target.value) || 0)}
                                    className="rounded-xl"
                                />
                            </Field>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <div>
                                <p className="text-sm font-medium text-slate-800">สถานะเปิดใช้งาน</p>
                                <p className="text-xs text-slate-400">หากปิดการใช้งาน จะไม่แสดงให้เลือกสร้างเอกสารใหม่</p>
                            </div>
                            <Switch
                                checked={editForm.data.is_active}
                                onCheckedChange={(val) => editForm.setData('is_active', val)}
                            />
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setEditingItem(null)} className="rounded-xl">
                                ยกเลิก
                            </Button>
                            <Button type="submit" disabled={editForm.processing} className="rounded-xl bg-blue-600 hover:bg-blue-700">
                                {editForm.processing ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <DialogTitle>ยืนยันการลบหมวดหมู่</DialogTitle>
                        <DialogDescription>
                            คุณแน่ใจหรือไม่ว่าต้องการลบรายการ &quot;{deletingItem?.name}&quot; ({deletingItem?.code}) ออกจากระบบ?
                        </DialogDescription>
                    </DialogHeader>

                    {deletingItem && (
                        (deletingItem.type === 'standard' ? usage.categories[deletingItem.code] : usage.documentTypes[deletingItem.code]) > 0 ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                <strong>แจ้งเตือน:</strong> มีเอกสารกำลังใช้งานหมวดหมู่นี้อยู่{' '}
                                {deletingItem.type === 'standard' ? usage.categories[deletingItem.code] : usage.documentTypes[deletingItem.code]} ฉบับ
                                ระบบจะไม่อนุญาตให้ลบจนกว่าจะไม่มีเอกสารผูกอยู่ (แนะนำให้สลับเป็น ปิดใช้งาน แทน)
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500">
                                รายการนี้ไม่มีเอกสารผูกอยู่ สามารถลบได้อย่างปลอดภัย
                            </p>
                        )
                    )}

                    <DialogFooter className="gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setDeletingItem(null)} className="rounded-xl">
                            ยกเลิก
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            className="rounded-xl"
                        >
                            ยืนยันการลบ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </QualityPage>
    );
}
