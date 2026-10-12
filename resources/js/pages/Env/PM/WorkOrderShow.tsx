import { Link, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { Wrench } from 'lucide-react';
import { Field, Panel, QualityPage, StatusPill } from '@/components/quality/quality-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import EnvSubNav from '@/pages/Env/EnvSubNav';
import PmSubNav, { criticalityLabel } from '@/pages/Env/PM/PmSubNav';
import { storageUrl } from '@/lib/asset';
import { format } from 'date-fns';

interface Task {
    id: number;
    task_name: string;
    acceptable_criteria?: string | null;
    unit?: string | null;
    min_value?: number | null;
    max_value?: number | null;
    input_type: string;
    result?: string | null;
    measured_value?: string | null;
    note?: string | null;
}

interface PartLine {
    spare_part_id: string;
    qty: string;
}

interface Order {
    id: number;
    wo_number: string;
    status: string;
    due_date: string;
    sop?: string | null;
    result?: string | null;
    findings?: string | null;
    labor_minutes?: number | null;
    labor_cost?: number | null;
    below_min_stock?: boolean;
    asset?: {
        id: number;
        name: string;
        brand?: string | null;
        model?: string | null;
        serial_number?: string | null;
        stock_number?: string | null;
        location?: string | null;
        issue_location?: string | null;
        risk_level?: string | null;
        owner?: string | null;
    } | null;
    schedule?: { basis?: string | null; meter_unit?: string | null } | null;
    tasks: Task[];
    photos: { id: number; phase: string; path: string }[];
    parts: { id: number; qty: number; unit_cost: number; spare_part?: { name: string; code: string } | null }[];
    assignee_users?: { id: number; name: string }[];
    corrective_request?: { id: number; ticket_number: string; title: string; status: string } | null;
    standard?: {
        parts?: { spare_part_id: number; qty_required: number; spare_part?: { name: string } | null }[];
    } | null;
}

export default function WorkOrderShow({
    order,
    technicians,
    parts,
    priorities,
}: {
    order: Order;
    technicians: { id: number; name: string }[];
    parts: { id: number; code: string; name: string; unit: string; on_hand: number; min_stock: number }[];
    priorities: { id: number; name: string }[];
}) {
    const open = ['scheduled', 'assigned', 'in_progress'].includes(order.status);
    const suggested: PartLine[] = (order.standard?.parts || []).map((part) => ({
        spare_part_id: String(part.spare_part_id),
        qty: String(part.qty_required),
    }));
    const [selectedUsers, setSelectedUsers] = useState<number[]>(order.assignee_users?.map((user) => user.id) || []);
    const form = useForm({
        performed_at: new Date().toISOString().slice(0, 10),
        result: 'Pass',
        findings: '',
        labor_minutes: '',
        meter_reading: '',
        priority_id: priorities[0] ? String(priorities[0].id) : '',
        tasks: order.tasks.map((task) => ({
            id: task.id,
            result: task.input_type === 'check' ? 'pass' : '',
            measured_value: '',
            note: '',
        })),
        parts: suggested,
    });
    const photoForm = useForm<{ phase: string; photos: File[] }>({ phase: 'before', photos: [] });

    const taskFail = useMemo(
        () => form.data.tasks.some((task) => task.result === 'fail') || form.data.result === 'Fail',
        [form.data.tasks, form.data.result],
    );

    const breadcrumbs = [
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'ENV', href: '/env' },
        { title: 'ใบสั่งงาน PM', href: '/env/pm/work-orders' },
        { title: order.wo_number, href: route('env.pm.work-orders.show', order.id) },
    ];

    return (
        <QualityPage
            tone="teal"
            icon={Wrench}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title={order.wo_number}
            subtitle={order.asset?.name}
            breadcrumbs={breadcrumbs}
            headTitle={order.wo_number}
            subNav={
                <>
                    <EnvSubNav active="env.pm.index" />
                    <PmSubNav active="orders" />
                </>
            }
        >
            <Panel title="ข้อมูลใบงาน">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 text-sm text-slate-600">
                        <div>
                            รหัสเครื่อง {order.asset?.stock_number || order.asset?.id} · {order.asset?.brand} {order.asset?.model}
                        </div>
                        <div>
                            สถานที่ {order.asset?.issue_location || order.asset?.location || '-'} · ผู้ดูแล {order.asset?.owner || '-'}
                        </div>
                        <div>
                            ความสำคัญ {order.asset?.risk_level} {criticalityLabel(order.asset?.risk_level)} · กำหนด{' '}
                            {format(new Date(order.due_date), 'dd MMM yyyy')}
                        </div>
                        {order.asset && (
                            <Link className="text-teal-700 underline" href={route('env.pm.assets.show', order.asset.id)}>
                                เปิดแผนของเครื่องนี้
                            </Link>
                        )}
                    </div>
                    <StatusPill label={order.result || order.status} className="border-slate-200 bg-slate-50 text-slate-700" />
                </div>
                {order.sop && (
                    <div className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                        <div className="mb-1 font-medium">ขั้นตอนการทำงาน (SOP)</div>
                        {order.sop}
                    </div>
                )}
                {order.corrective_request && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                        ใบแจ้งซ่อมแก้ไข {order.corrective_request.ticket_number} · {order.corrective_request.status}
                        <div>
                            <Link className="underline" href={route('technician.work-orders.show', order.corrective_request.id)}>
                                เปิดใบงานช่าง
                            </Link>
                        </div>
                    </div>
                )}
                {order.below_min_stock && (
                    <div className="mt-3 text-sm text-amber-700">มีการเบิกอะไหล่จนต่ำกว่าสต็อกขั้นต่ำ</div>
                )}
            </Panel>

            {open && (
                <Panel title="มอบหมายช่าง">
                    <div className="grid gap-2 sm:grid-cols-2">
                        {technicians.map((tech) => (
                            <label key={tech.id} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(tech.id)}
                                    onChange={(e) => {
                                        setSelectedUsers((current) =>
                                            e.target.checked ? [...current, tech.id] : current.filter((id) => id !== tech.id),
                                        );
                                    }}
                                />
                                {tech.name}
                            </label>
                        ))}
                    </div>
                    {technicians.length === 0 && <div className="text-sm text-slate-500">ยังไม่พบผู้ใช้ตำแหน่งช่าง</div>}
                    <div className="mt-3 flex gap-2">
                        <Button
                            className="rounded-xl"
                            disabled={selectedUsers.length === 0}
                            onClick={() =>
                                router.post(route('env.pm.work-orders.assign', order.id), { user_ids: selectedUsers })
                            }
                        >
                            มอบหมาย
                        </Button>
                        <Button variant="outline" className="rounded-xl" onClick={() => router.post(route('env.pm.work-orders.start', order.id))}>
                            เริ่มงาน
                        </Button>
                        <Button variant="outline" className="rounded-xl" onClick={() => router.post(route('env.pm.work-orders.cancel', order.id))}>
                            ยกเลิกใบงาน
                        </Button>
                    </div>
                </Panel>
            )}

            <Panel title="รูปก่อน-หลัง">
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                    {['before', 'after'].map((phase) => (
                        <div key={phase}>
                            <div className="mb-2 text-sm font-medium">{phase === 'before' ? 'ก่อนทำ' : 'หลังทำ'}</div>
                            <div className="flex flex-wrap gap-2">
                                {order.photos.filter((photo) => photo.phase === phase).map((photo) => (
                                    <div key={photo.id} className="space-y-1">
                                        <img src={storageUrl(photo.path)} alt="" className="h-24 w-24 rounded-lg object-cover" />
                                        {open && (
                                            <button
                                                type="button"
                                                className="text-xs text-rose-600"
                                                onClick={() => router.delete(route('env.pm.work-orders.photos.destroy', [order.id, photo.id]))}
                                            >
                                                ลบ
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {open && (
                    <form
                        className="flex flex-wrap items-end gap-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            photoForm.post(route('env.pm.work-orders.photos', order.id), { forceFormData: true });
                        }}
                    >
                        <Field label="ช่วง">
                            <select
                                className="h-10 rounded-xl border px-3 text-sm"
                                value={photoForm.data.phase}
                                onChange={(e) => photoForm.setData('phase', e.target.value)}
                            >
                                <option value="before">ก่อนทำ</option>
                                <option value="after">หลังทำ</option>
                            </select>
                        </Field>
                        <Field label="ไฟล์รูป">
                            <Input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => photoForm.setData('photos', Array.from(e.target.files || []))}
                            />
                        </Field>
                        <Button type="submit" className="rounded-xl" disabled={photoForm.processing}>
                            อัปโหลด
                        </Button>
                    </form>
                )}
            </Panel>

            {open ? (
                <form
                    className="space-y-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(route('env.pm.work-orders.complete', order.id));
                    }}
                >
                    <Panel title="รายการตรวจและค่าที่วัดได้">
                        {form.data.tasks.length === 0 ? (
                            <div className="text-sm text-slate-500">แผนนี้ไม่มีเช็กลิสต์ บันทึกผลรวมด้านล่าง</div>
                        ) : (
                            <div className="space-y-4">
                                {order.tasks.map((task, index) => (
                                    <div key={task.id} className="rounded-xl border border-slate-100 p-3">
                                        <div className="font-medium text-slate-800">{task.task_name}</div>
                                        {task.acceptable_criteria && (
                                            <div className="text-xs text-slate-500">เกณฑ์: {task.acceptable_criteria}</div>
                                        )}
                                        <div className="mt-2 grid gap-3 sm:grid-cols-3">
                                            {task.input_type !== 'check' && (
                                                <Field label={task.input_type === 'number' ? `ค่าวัด${task.unit ? ` (${task.unit})` : ''}` : 'บันทึก'}>
                                                    <Input
                                                        value={form.data.tasks[index].measured_value}
                                                        onChange={(e) => {
                                                            const tasks = [...form.data.tasks];
                                                            tasks[index] = { ...tasks[index], measured_value: e.target.value };
                                                            form.setData('tasks', tasks);
                                                        }}
                                                    />
                                                </Field>
                                            )}
                                            <Field label="ผล">
                                                <select
                                                    className="h-10 w-full rounded-xl border px-3 text-sm"
                                                    value={form.data.tasks[index].result}
                                                    onChange={(e) => {
                                                        const tasks = [...form.data.tasks];
                                                        tasks[index] = { ...tasks[index], result: e.target.value };
                                                        form.setData('tasks', tasks);
                                                    }}
                                                >
                                                    <option value="">-</option>
                                                    <option value="pass">Pass</option>
                                                    <option value="fail">Fail</option>
                                                    <option value="na">N/A</option>
                                                </select>
                                            </Field>
                                            {(task.min_value !== null || task.max_value !== null) && (
                                                <div className="text-xs text-slate-500 sm:col-span-3">
                                                    ช่วงที่ยอมรับ {task.min_value ?? '-'} ถึง {task.max_value ?? '-'} {task.unit}
                                                    {' '}ระบบจะตั้ง Pass/Fail จากค่าวัดให้เมื่อมีช่วงนี้
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>

                    <Panel title="อะไหล่ที่เบิกใช้">
                        <div className="space-y-2">
                            {form.data.parts.map((line, index) => (
                                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
                                    <select
                                        className="h-10 rounded-xl border px-3 text-sm"
                                        value={line.spare_part_id}
                                        onChange={(e) => {
                                            const next = [...form.data.parts];
                                            next[index] = { ...line, spare_part_id: e.target.value };
                                            form.setData('parts', next);
                                        }}
                                    >
                                        <option value="">เลือกอะไหล่</option>
                                        {parts.map((part) => (
                                            <option key={part.id} value={part.id}>
                                                {part.code} · {part.name} (คงเหลือ {part.on_hand}/{part.min_stock} {part.unit})
                                            </option>
                                        ))}
                                    </select>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="0.001"
                                        value={line.qty}
                                        onChange={(e) => {
                                            const next = [...form.data.parts];
                                            next[index] = { ...line, qty: e.target.value };
                                            form.setData('parts', next);
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => form.setData('parts', form.data.parts.filter((_, i) => i !== index))}
                                    >
                                        เอาออก
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="mt-3 rounded-xl"
                            onClick={() => form.setData('parts', [...form.data.parts, { spare_part_id: '', qty: '1' }])}
                        >
                            เพิ่มอะไหล่
                        </Button>
                    </Panel>

                    <Panel title="ปิดงาน">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="วันที่ทำ">
                                <Input type="date" value={form.data.performed_at} onChange={(e) => form.setData('performed_at', e.target.value)} required />
                            </Field>
                            <Field label="เวลาแรงงาน (นาที)">
                                <Input type="number" min={0} value={form.data.labor_minutes} onChange={(e) => form.setData('labor_minutes', e.target.value)} />
                            </Field>
                            <Field label="ผลรวม">
                                <select className="h-10 rounded-xl border px-3 text-sm" value={form.data.result} onChange={(e) => form.setData('result', e.target.value)}>
                                    <option value="Pass">Pass</option>
                                    <option value="Fail">Fail</option>
                                </select>
                            </Field>
                            {order.schedule?.basis === 'meter' && (
                                <Field label={`มิเตอร์ปัจจุบัน${order.schedule.meter_unit ? ` (${order.schedule.meter_unit})` : ''}`}>
                                    <Input type="number" min={0} step="0.01" value={form.data.meter_reading} onChange={(e) => form.setData('meter_reading', e.target.value)} />
                                </Field>
                            )}
                            {taskFail && (
                                <Field label="ความเร่งด่วนของใบแจ้งซ่อม">
                                    <select className="h-10 rounded-xl border px-3 text-sm" value={form.data.priority_id} onChange={(e) => form.setData('priority_id', e.target.value)}>
                                        <option value="">เลือก</option>
                                        {priorities.map((priority) => (
                                            <option key={priority.id} value={priority.id}>
                                                {priority.name}
                                            </option>
                                        ))}
                                    </select>
                                    {form.errors.priority_id && <div className="text-xs text-rose-600">{form.errors.priority_id}</div>}
                                </Field>
                            )}
                        </div>
                        <Field label="ปัญหาที่พบ">
                            <Textarea value={form.data.findings} onChange={(e) => form.setData('findings', e.target.value)} />
                        </Field>
                        <Button type="submit" className="rounded-xl bg-teal-600 hover:bg-teal-700" disabled={form.processing}>
                            บันทึกผลและปิดใบงาน
                        </Button>
                    </Panel>
                </form>
            ) : (
                <Panel title="ผลการปฏิบัติงาน">
                    <div className="space-y-2 text-sm text-slate-700">
                        <div>ผล {order.result || '-'} · แรงงาน {order.labor_minutes || 0} นาที · ค่าแรง {order.labor_cost || 0}</div>
                        {order.findings && <div className="whitespace-pre-wrap">{order.findings}</div>}
                        {order.tasks.map((task) => (
                            <div key={task.id} className="rounded-xl border border-slate-100 p-3">
                                <div className="font-medium">{task.task_name}</div>
                                <div>
                                    {task.result || '-'} {task.measured_value ? `· ${task.measured_value} ${task.unit || ''}` : ''}
                                </div>
                            </div>
                        ))}
                        {order.parts.map((part) => (
                            <div key={part.id}>
                                อะไหล่ {part.spare_part?.name} × {part.qty}
                            </div>
                        ))}
                    </div>
                </Panel>
            )}
        </QualityPage>
    );
}
