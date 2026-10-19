import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Wrench } from 'lucide-react';
import { EmptyState, Field, Modal, Panel, QualityPage, StatusPill } from '@/components/quality/quality-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import EnvSubNav from '@/pages/Env/EnvSubNav';
import PmSubNav from '@/pages/Env/PM/PmSubNav';

interface TaskDraft {
    task_name: string;
    acceptable_criteria: string;
    unit: string;
    min_value: string;
    max_value: string;
    input_type: string;
}

interface PartDraft {
    spare_part_id: string;
    qty_required: string;
}

interface Standard {
    id: number;
    name: string;
    description?: string | null;
    frequency: string;
    basis: string;
    interval_value: number;
    meter_unit?: string | null;
    meter_interval?: number | null;
    sop?: string | null;
    estimated_labor_minutes: number;
    is_active: boolean;
    tasks: {
        task_name: string;
        acceptable_criteria?: string | null;
        unit?: string | null;
        min_value?: number | null;
        max_value?: number | null;
        input_type: string;
    }[];
    parts: { spare_part_id: number; qty_required: number; spare_part?: { name: string } | null }[];
}

const emptyTask = (): TaskDraft => ({
    task_name: '',
    acceptable_criteria: '',
    unit: '',
    min_value: '',
    max_value: '',
    input_type: 'check',
});

const breadcrumbs = [
    { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
    { title: 'ENV', href: '/env' },
    { title: 'แผนมาตรฐาน PM', href: '/env/pm/standards' },
];

export default function Standards({
    standards,
    parts,
    frequencies,
}: {
    standards: Standard[];
    parts: { id: number; code: string; name: string; unit: string }[];
    frequencies: Record<string, string>;
}) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Standard | null>(null);
    const form = useForm({
        name: '',
        description: '',
        frequency: 'monthly',
        basis: 'time',
        interval_value: '1',
        meter_unit: '',
        meter_interval: '',
        sop: '',
        estimated_labor_minutes: '60',
        is_active: true,
        tasks: [emptyTask()] as TaskDraft[],
        parts: [] as PartDraft[],
    });

    const startCreate = () => {
        setEditing(null);
        form.reset();
        form.setData('tasks', [emptyTask()]);
        setOpen(true);
    };

    const startEdit = (standard: Standard) => {
        setEditing(standard);
        form.setData({
            name: standard.name,
            description: standard.description || '',
            frequency: standard.frequency,
            basis: standard.basis,
            interval_value: String(standard.interval_value),
            meter_unit: standard.meter_unit || '',
            meter_interval: standard.meter_interval != null ? String(standard.meter_interval) : '',
            sop: standard.sop || '',
            estimated_labor_minutes: String(standard.estimated_labor_minutes),
            is_active: standard.is_active,
            tasks: standard.tasks.length
                ? standard.tasks.map((task) => ({
                      task_name: task.task_name,
                      acceptable_criteria: task.acceptable_criteria || '',
                      unit: task.unit || '',
                      min_value: task.min_value != null ? String(task.min_value) : '',
                      max_value: task.max_value != null ? String(task.max_value) : '',
                      input_type: task.input_type,
                  }))
                : [emptyTask()],
            parts: standard.parts.map((part) => ({
                spare_part_id: String(part.spare_part_id),
                qty_required: String(part.qty_required),
            })),
        });
        setOpen(true);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const options = { onSuccess: () => setOpen(false) };
        if (editing) {
            form.put(route('env.pm.standards.update', editing.id), options);
            return;
        }
        form.post(route('env.pm.standards.store'), options);
    };

    return (
        <QualityPage
            tone="teal"
            icon={Wrench}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title="แผนมาตรฐานและรายการตรวจสอบ"
            subtitle="งานที่ต้องทำตามความถี่ พร้อมเกณฑ์ที่ยอมรับและอะไหล่ต่อรอบ"
            breadcrumbs={breadcrumbs}
            headTitle="PM Standards"
            subNav={
                <>
                    <EnvSubNav active="env.pm.index" />
                    <PmSubNav active="standards" />
                </>
            }
            actions={
                <Button className="rounded-xl bg-teal-600 hover:bg-teal-700" onClick={startCreate}>
                    เพิ่มแผนมาตรฐาน
                </Button>
            }
        >
            <Panel title="แผนมาตรฐาน">
                {standards.length === 0 ? (
                    <EmptyState text="ยังไม่มีแผนมาตรฐาน" />
                ) : (
                    <div className="space-y-3">
                        {standards.map((standard) => (
                            <div key={standard.id} className="rounded-2xl border border-slate-200 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="font-semibold text-slate-800">{standard.name}</div>
                                        <div className="text-sm text-slate-500">
                                            {frequencies[standard.frequency] || standard.frequency} · ทุก {standard.interval_value} ·{' '}
                                            {standard.basis === 'meter' ? `ตามมิเตอร์ ${standard.meter_interval || '-'} ${standard.meter_unit || ''}` : 'ตามเวลา'}
                                            {' · '}
                                            {standard.tasks.length} รายการตรวจ · แรงงาน {standard.estimated_labor_minutes} นาที
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusPill
                                            label={standard.is_active ? 'ใช้งาน' : 'ปิด'}
                                            className="border-slate-200 bg-slate-50 text-slate-700"
                                        />
                                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => startEdit(standard)}>
                                            แก้ไข
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-xl text-rose-600"
                                            onClick={() => router.delete(route('env.pm.standards.destroy', standard.id))}
                                        >
                                            ลบ
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>

                <Modal
                open={open}
                onClose={() => setOpen(false)}
                wide
                title={editing ? 'แก้ไขแผนมาตรฐาน' : 'เพิ่มแผนมาตรฐาน'}
                footer={
                    <>
                        <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button className="rounded-xl bg-teal-600" onClick={submit} disabled={form.processing}>
                            บันทึก
                        </Button>
                    </>
                }
            >
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="ชื่อแผน" className="sm:col-span-2">
                        <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                    </Field>
                    <Field label="ความถี่">
                        <select className="h-10 rounded-xl border px-3 text-sm" value={form.data.frequency} onChange={(e) => form.setData('frequency', e.target.value)}>
                            {Object.entries(frequencies).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="ทุกกี่หน่วย">
                        <Input type="number" min={1} value={form.data.interval_value} onChange={(e) => form.setData('interval_value', e.target.value)} />
                    </Field>
                    <Field label="ฐานการคิด">
                        <select className="h-10 rounded-xl border px-3 text-sm" value={form.data.basis} onChange={(e) => form.setData('basis', e.target.value)}>
                            <option value="time">ตามเวลา</option>
                            <option value="meter">ตามชั่วโมง/มิเตอร์</option>
                        </select>
                    </Field>
                    <Field label="นาทีแรงงานโดยประมาณ">
                        <Input type="number" min={0} value={form.data.estimated_labor_minutes} onChange={(e) => form.setData('estimated_labor_minutes', e.target.value)} />
                    </Field>
                    {form.data.basis === 'meter' && (
                        <>
                            <Field label="หน่วยมิเตอร์">
                                <Input value={form.data.meter_unit} onChange={(e) => form.setData('meter_unit', e.target.value)} />
                            </Field>
                            <Field label="ทำทุกกี่หน่วยมิเตอร์">
                                <Input type="number" min={0} value={form.data.meter_interval} onChange={(e) => form.setData('meter_interval', e.target.value)} />
                            </Field>
                        </>
                    )}
                    <Field label="SOP" className="sm:col-span-2">
                        <Textarea value={form.data.sop} onChange={(e) => form.setData('sop', e.target.value)} />
                    </Field>
                </div>
                <div className="space-y-3">
                    <div className="font-medium text-slate-800">รายการตรวจ</div>
                    {form.data.tasks.map((task, index) => (
                        <div key={index} className="grid gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-2">
                            <Input
                                placeholder="ชื่องาน"
                                value={task.task_name}
                                onChange={(e) => {
                                    const tasks = [...form.data.tasks];
                                    tasks[index] = { ...task, task_name: e.target.value };
                                    form.setData('tasks', tasks);
                                }}
                            />
                            <select
                                className="h-10 rounded-xl border px-3 text-sm"
                                value={task.input_type}
                                onChange={(e) => {
                                    const tasks = [...form.data.tasks];
                                    tasks[index] = { ...task, input_type: e.target.value };
                                    form.setData('tasks', tasks);
                                }}
                            >
                                <option value="check">ตรวจเช็ก</option>
                                <option value="number">ค่าวัด</option>
                                <option value="text">ข้อความ</option>
                            </select>
                            <Input
                                className="sm:col-span-2"
                                placeholder="เกณฑ์ที่ยอมรับ"
                                value={task.acceptable_criteria}
                                onChange={(e) => {
                                    const tasks = [...form.data.tasks];
                                    tasks[index] = { ...task, acceptable_criteria: e.target.value };
                                    form.setData('tasks', tasks);
                                }}
                            />
                            <Input
                                placeholder="หน่วย"
                                value={task.unit}
                                onChange={(e) => {
                                    const tasks = [...form.data.tasks];
                                    tasks[index] = { ...task, unit: e.target.value };
                                    form.setData('tasks', tasks);
                                }}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    placeholder="ต่ำสุด"
                                    value={task.min_value}
                                    onChange={(e) => {
                                        const tasks = [...form.data.tasks];
                                        tasks[index] = { ...task, min_value: e.target.value };
                                        form.setData('tasks', tasks);
                                    }}
                                />
                                <Input
                                    placeholder="สูงสุด"
                                    value={task.max_value}
                                    onChange={(e) => {
                                        const tasks = [...form.data.tasks];
                                        tasks[index] = { ...task, max_value: e.target.value };
                                        form.setData('tasks', tasks);
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => form.setData('tasks', [...form.data.tasks, emptyTask()])}>
                        เพิ่มรายการตรวจ
                    </Button>
                </div>
                <div className="space-y-2">
                    <div className="font-medium text-slate-800">อะไหล่ต่อรอบ</div>
                    {form.data.parts.map((part, index) => (
                        <div key={index} className="grid grid-cols-[1fr_120px] gap-2">
                            <select
                                className="h-10 rounded-xl border px-3 text-sm"
                                value={part.spare_part_id}
                                onChange={(e) => {
                                    const next = [...form.data.parts];
                                    next[index] = { ...part, spare_part_id: e.target.value };
                                    form.setData('parts', next);
                                }}
                            >
                                <option value="">เลือกอะไหล่</option>
                                {parts.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.code} · {item.name}
                                    </option>
                                ))}
                            </select>
                            <Input
                                type="number"
                                min={0}
                                step="0.001"
                                value={part.qty_required}
                                onChange={(e) => {
                                    const next = [...form.data.parts];
                                    next[index] = { ...part, qty_required: e.target.value };
                                    form.setData('parts', next);
                                }}
                            />
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => form.setData('parts', [...form.data.parts, { spare_part_id: '', qty_required: '1' }])}
                    >
                        เพิ่มอะไหล่
                    </Button>
                </div>
            </Modal>
        </QualityPage>
    );
}
