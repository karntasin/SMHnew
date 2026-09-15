import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
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
import { Plus, ClipboardCheck, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    QualityPage,
    Panel,
    Modal,
    Field,
    StatusPill,
    EmptyState,
} from '@/components/quality/quality-ui';
import EnvSubNav from '@/pages/Env/EnvSubNav';

const breadcrumbs = [
    { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
    { title: 'ENV', href: route('env.index') },
    { title: 'ตรวจสอบระบบสาธารณูปโภค', href: route('env.utility.index') },
];

export default function Index({ systems }: { systems: any[] }) {
    const [isSystemOpen, setIsSystemOpen] = useState(false);
    const [isChecklistOpen, setIsChecklistOpen] = useState(false);
    const [isCheckOpen, setIsCheckOpen] = useState(false);
    const [selectedSystem, setSelectedSystem] = useState<any>(null);

    const {
        data: systemData,
        setData: setSystemData,
        post: postSystem,
        processing: systemProcessing,
        reset: resetSystem,
    } = useForm({
        name: '',
        description: '',
    });

    const {
        data: checklistData,
        setData: setChecklistData,
        post: postChecklist,
        processing: checklistProcessing,
        reset: resetChecklist,
    } = useForm({
        system_id: '',
        item_name: '',
        frequency: 'daily',
        min_value: '',
        max_value: '',
        unit: '',
    });

    const {
        data: checkData,
        setData: setCheckData,
        post: postCheck,
        processing: checkProcessing,
        reset: resetCheck,
    } = useForm({
        system_id: '',
        check_date: format(new Date(), 'yyyy-MM-dd'),
        items: [] as any[],
        notes: '',
    });

    const handleCreateSystem = () => {
        resetSystem();
        setIsSystemOpen(true);
    };

    const handleAddChecklist = (systemId: number) => {
        resetChecklist();
        setChecklistData('system_id', systemId.toString());
        setIsChecklistOpen(true);
    };

    const handlePerformCheck = (system: any) => {
        setSelectedSystem(system);
        resetCheck();
        setCheckData({
            system_id: system.id,
            check_date: format(new Date(), 'yyyy-MM-dd'),
            items: system.checklists.map((cl: any) => ({
                checklist_id: cl.id,
                item_name: cl.item_name,
                status: 'pass',
                value: '',
                notes: '',
                min_value: cl.min_value,
                max_value: cl.max_value,
                unit: cl.unit,
            })),
            notes: '',
        });
        setIsCheckOpen(true);
    };

    const submitSystem = (e: React.FormEvent) => {
        e.preventDefault();
        postSystem(route('env.utility.store-system'), {
            onSuccess: () => setIsSystemOpen(false),
        });
    };

    const submitChecklist = (e: React.FormEvent) => {
        e.preventDefault();
        postChecklist(route('env.utility.store-checklist'), {
            onSuccess: () => setIsChecklistOpen(false),
        });
    };

    const submitCheck = (e: React.FormEvent) => {
        e.preventDefault();
        postCheck(route('env.utility.store-check'), {
            onSuccess: () => setIsCheckOpen(false),
        });
    };

    const updateCheckItem = (index: number, field: string, value: any) => {
        const newItems = [...checkData.items];
        newItems[index][field] = value;

        if (field === 'value' && value !== '') {
            const numVal = parseFloat(value);
            const min = newItems[index].min_value ? parseFloat(newItems[index].min_value) : null;
            const max = newItems[index].max_value ? parseFloat(newItems[index].max_value) : null;

            if ((min !== null && numVal < min) || (max !== null && numVal > max)) {
                newItems[index].status = 'fail';
            } else {
                newItems[index].status = 'pass';
            }
        }

        setCheckData('items', newItems);
    };

    return (
        <QualityPage
            tone="teal"
            icon={Activity}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title="ตรวจสอบระบบสาธารณูปโภค"
            subtitle="ติดตามสถานะและความพร้อมของระบบไฟฟ้า น้ำ และแก๊สทางการแพทย์"
            breadcrumbs={breadcrumbs}
            headTitle="ตรวจสอบระบบสาธารณูปโภค"
            subNav={<EnvSubNav active="env.index" />}
            actions={
                <Button className="rounded-xl bg-teal-600 hover:bg-teal-700" onClick={handleCreateSystem}>
                    <Plus className="mr-2 h-4 w-4" /> เพิ่มระบบใหม่
                </Button>
            }
        >
            {systems.length === 0 ? (
                <Panel title="ระบบสาธารณูปโภค" description="เครื่องกำเนิดไฟฟ้า น้ำ แก๊สทางการแพทย์">
                    <EmptyState text="ยังไม่มีระบบสาธารณูปโภค — กดปุ่มเพิ่มระบบใหม่เพื่อเริ่มต้น" />
                </Panel>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {systems.map((system) => (
                        <Panel
                            key={system.id}
                            title={system.name}
                            description={system.description || 'ไม่มีรายละเอียด'}
                            className={cn(
                                'border-l-4',
                                system.status === 'normal'
                                    ? 'border-l-emerald-500'
                                    : system.status === 'warning'
                                      ? 'border-l-amber-500'
                                      : 'border-l-rose-500',
                            )}
                            action={
                                <StatusPill
                                    label={system.status === 'normal' ? 'ปกติ' : 'ผิดปกติ'}
                                    className={
                                        system.status === 'normal'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-rose-200 bg-rose-50 text-rose-700'
                                    }
                                />
                            }
                        >
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">ตรวจสอบล่าสุด:</span>
                                    <span className="text-slate-700">
                                        {system.latest_check
                                            ? format(new Date(system.latest_check.check_date), 'dd/MM/yyyy')
                                            : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">ผู้ตรวจสอบ:</span>
                                    <span className="text-slate-700">
                                        {system.latest_check?.inspector?.name || '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">รายการตรวจสอบ:</span>
                                    <span className="text-slate-700">{system.checklists.length} รายการ</span>
                                </div>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full rounded-xl"
                                    onClick={() => handleAddChecklist(system.id)}
                                >
                                    <Plus className="mr-2 h-3 w-3" /> รายการตรวจ
                                </Button>
                                <Button
                                    size="sm"
                                    className="w-full rounded-xl bg-teal-600 hover:bg-teal-700"
                                    onClick={() => handlePerformCheck(system)}
                                >
                                    <ClipboardCheck className="mr-2 h-3 w-3" /> ตรวจสอบ
                                </Button>
                            </div>
                        </Panel>
                    ))}
                </div>
            )}

            <Modal
                open={isSystemOpen}
                onClose={() => setIsSystemOpen(false)}
                title="เพิ่มระบบสาธารณูปโภค"
                footer={
                    <>
                        <Button variant="outline" className="rounded-xl" onClick={() => setIsSystemOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button
                            className="rounded-xl bg-teal-600 hover:bg-teal-700"
                            onClick={submitSystem}
                            disabled={systemProcessing}
                        >
                            บันทึก
                        </Button>
                    </>
                }
            >
                <Field label="ชื่อระบบ">
                    <Input
                        placeholder="เช่น เครื่องกำเนิดไฟฟ้า, ระบบแก๊สทางการแพทย์"
                        value={systemData.name}
                        onChange={(e) => setSystemData('name', e.target.value)}
                        className="rounded-xl"
                        required
                    />
                </Field>
                <Field label="รายละเอียด">
                    <Textarea
                        placeholder="รายละเอียดเพิ่มเติม..."
                        value={systemData.description}
                        onChange={(e) => setSystemData('description', e.target.value)}
                        className="rounded-xl"
                    />
                </Field>
            </Modal>

            <Modal
                open={isChecklistOpen}
                onClose={() => setIsChecklistOpen(false)}
                title="เพิ่มรายการตรวจสอบ"
                footer={
                    <>
                        <Button variant="outline" className="rounded-xl" onClick={() => setIsChecklistOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button
                            className="rounded-xl bg-teal-600 hover:bg-teal-700"
                            onClick={submitChecklist}
                            disabled={checklistProcessing}
                        >
                            บันทึก
                        </Button>
                    </>
                }
            >
                <Field label="รายการตรวจสอบ">
                    <Input
                        placeholder="เช่น ตรวจสอบระดับน้ำมันเครื่อง, วัดแรงดัน"
                        value={checklistData.item_name}
                        onChange={(e) => setChecklistData('item_name', e.target.value)}
                        className="rounded-xl"
                        required
                    />
                </Field>
                <Field label="ความถี่">
                    <Select
                        value={checklistData.frequency}
                        onValueChange={(value) => setChecklistData('frequency', value)}
                    >
                        <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="เลือกความถี่" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="daily">รายวัน</SelectItem>
                            <SelectItem value="weekly">รายสัปดาห์</SelectItem>
                            <SelectItem value="monthly">รายเดือน</SelectItem>
                        </SelectContent>
                    </Select>
                </Field>
                <div className="grid grid-cols-3 gap-2">
                    <Field label="ค่าต่ำสุด">
                        <Input
                            type="number"
                            step="0.01"
                            value={checklistData.min_value}
                            onChange={(e) => setChecklistData('min_value', e.target.value)}
                            className="rounded-xl"
                        />
                    </Field>
                    <Field label="ค่าสูงสุด">
                        <Input
                            type="number"
                            step="0.01"
                            value={checklistData.max_value}
                            onChange={(e) => setChecklistData('max_value', e.target.value)}
                            className="rounded-xl"
                        />
                    </Field>
                    <Field label="หน่วย">
                        <Input
                            placeholder="เช่น Bar, PSI, V"
                            value={checklistData.unit}
                            onChange={(e) => setChecklistData('unit', e.target.value)}
                            className="rounded-xl"
                        />
                    </Field>
                </div>
            </Modal>

            <Modal
                open={isCheckOpen}
                onClose={() => setIsCheckOpen(false)}
                title={`บันทึกผลการตรวจสอบ: ${selectedSystem?.name}`}
                wide
                footer={
                    <>
                        <Button variant="outline" className="rounded-xl" onClick={() => setIsCheckOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button
                            className="rounded-xl bg-teal-600 hover:bg-teal-700"
                            onClick={submitCheck}
                            disabled={checkProcessing}
                        >
                            บันทึกผลการตรวจสอบ
                        </Button>
                    </>
                }
            >
                <p className="text-xs text-slate-500">วันที่: {format(new Date(), 'dd/MM/yyyy')}</p>
                <div className="space-y-4">
                    {checkData.items.map((item, index) => (
                        <div key={item.checklist_id} className="space-y-3 rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-800">{item.item_name}</span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={item.status === 'pass' ? 'default' : 'outline'}
                                        className={cn(
                                            'rounded-lg',
                                            item.status === 'pass' && 'bg-emerald-600 hover:bg-emerald-700',
                                        )}
                                        onClick={() => updateCheckItem(index, 'status', 'pass')}
                                    >
                                        ผ่าน
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={item.status === 'fail' ? 'destructive' : 'outline'}
                                        className="rounded-lg"
                                        onClick={() => updateCheckItem(index, 'status', 'fail')}
                                    >
                                        ไม่ผ่าน
                                    </Button>
                                </div>
                            </div>

                            {(item.min_value || item.max_value || item.unit) && (
                                <div className="flex items-center gap-2">
                                    <span className="w-20 text-xs text-slate-500">ค่าที่วัดได้:</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="h-8 w-32 rounded-xl"
                                        value={item.value}
                                        onChange={(e) => updateCheckItem(index, 'value', e.target.value)}
                                        placeholder={`${item.min_value || ''} - ${item.max_value || ''} ${item.unit || ''}`}
                                    />
                                    <span className="text-sm text-slate-500">{item.unit}</span>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <span className="w-20 text-xs text-slate-500">หมายเหตุ:</span>
                                <Input
                                    className="h-8 flex-1 rounded-xl"
                                    value={item.notes}
                                    onChange={(e) => updateCheckItem(index, 'notes', e.target.value)}
                                    placeholder="ระบุปัญหาหากไม่ผ่าน..."
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <Field label="หมายเหตุเพิ่มเติม">
                    <Textarea
                        value={checkData.notes}
                        onChange={(e) => setCheckData('notes', e.target.value)}
                        className="rounded-xl"
                    />
                </Field>
            </Modal>
        </QualityPage>
    );
}
