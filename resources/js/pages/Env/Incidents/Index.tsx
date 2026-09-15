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
import { Plus, Pencil, AlertTriangle, CheckCircle, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import {
    QualityPage,
    StatCard,
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
    { title: 'รายงานอุบัติการณ์', href: route('env.incidents.index') },
];

const severityStyle: Record<string, string> = {
    critical: 'border-rose-200 bg-rose-50 text-rose-700',
    high: 'border-rose-200 bg-rose-50 text-rose-700',
    medium: 'border-amber-200 bg-amber-50 text-amber-700',
    low: 'border-slate-200 bg-slate-50 text-slate-600',
};

const statusStyle: Record<string, string> = {
    reported: 'border-slate-200 bg-slate-50 text-slate-600',
    accepted: 'border-sky-200 bg-sky-50 text-sky-700',
    in_progress: 'border-amber-200 bg-amber-50 text-amber-700',
    resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    closed: 'border-slate-200 bg-slate-100 text-slate-500',
};

export default function Index({
    incidents,
    mttr,
    users,
}: {
    incidents: any[];
    mttr: number;
    users: any[];
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isManageOpen, setIsManageOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    const { data, setData, post, processing, reset } = useForm({
        incident_type: '',
        location: '',
        severity: 'low',
        description: '',
    });

    const {
        data: manageData,
        setData: setManageData,
        put,
        processing: manageProcessing,
        reset: manageReset,
    } = useForm({
        status: '',
        assigned_to: '',
        action_taken: '',
        resolution_notes: '',
        satisfaction_rating: '',
    });

    const pendingCount = incidents.filter((i) =>
        ['reported', 'accepted', 'in_progress'].includes(i.status),
    ).length;

    const handleCreate = () => {
        reset();
        setIsOpen(true);
    };

    const handleManage = (item: any) => {
        setEditingItem(item);
        setManageData({
            status: item.status,
            assigned_to: item.assigned_to?.toString() || '',
            action_taken: item.action_taken || '',
            resolution_notes: item.resolution_notes || '',
            satisfaction_rating: item.satisfaction_rating?.toString() || '',
        });
        setIsManageOpen(true);
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('env.incidents.store'), {
            onSuccess: () => {
                setIsOpen(false);
                reset();
            },
        });
    };

    const submitManage = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('env.incidents.update', editingItem.id), {
            onSuccess: () => {
                setIsManageOpen(false);
                manageReset();
                setEditingItem(null);
            },
        });
    };

    return (
        <QualityPage
            tone="teal"
            icon={AlertTriangle}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title="รายงานอุบัติการณ์ความปลอดภัย"
            subtitle="รายงานและติดตามอุบัติการณ์ด้านความปลอดภัย อาคารสถานที่ และเครื่องมือ"
            breadcrumbs={breadcrumbs}
            headTitle="รายงานอุบัติการณ์ความปลอดภัย"
            subNav={<EnvSubNav active="env.incidents.index" />}
            actions={
                <Button className="rounded-xl bg-teal-600 hover:bg-teal-700" onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> แจ้งอุบัติการณ์
                </Button>
            }
        >
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                    label="อุบัติการณ์ทั้งหมด"
                    value={incidents.length}
                    icon={AlertTriangle}
                    tone="teal"
                />
                <StatCard
                    label="รอการแก้ไข"
                    value={pendingCount}
                    icon={Clock}
                    tone={pendingCount ? 'amber' : 'emerald'}
                />
                <StatCard
                    label="MTTR"
                    value={`${mttr} ชม.`}
                    sub="Mean Time To Repair"
                    icon={CheckCircle}
                    tone="teal"
                />
            </div>

            <Panel title="รายการอุบัติการณ์" description="ติดตามสถานะและผู้รับผิดชอบ">
                {incidents.length === 0 ? (
                    <EmptyState text="ไม่มีรายการอุบัติการณ์" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                    <th className="py-2 pr-3">วันที่</th>
                                    <th className="py-2 pr-3">ประเภท</th>
                                    <th className="py-2 pr-3">สถานที่</th>
                                    <th className="py-2 pr-3">ความรุนแรง</th>
                                    <th className="py-2 pr-3">สถานะ</th>
                                    <th className="py-2 pr-3">ผู้รับผิดชอบ</th>
                                    <th className="py-2 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incidents.map((item) => (
                                    <tr key={item.id} className="border-b border-slate-50">
                                        <td className="py-2.5 pr-3 text-slate-600">
                                            {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')}
                                        </td>
                                        <td className="py-2.5 pr-3 font-medium text-slate-700">
                                            {item.incident_type}
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-600">{item.location}</td>
                                        <td className="py-2.5 pr-3">
                                            <StatusPill
                                                label={item.severity.toUpperCase()}
                                                className={severityStyle[item.severity] ?? severityStyle.low}
                                            />
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <StatusPill
                                                label={item.status.replace('_', ' ').toUpperCase()}
                                                className={statusStyle[item.status] ?? statusStyle.reported}
                                            />
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            {item.assignee ? (
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <User className="h-3 w-3" />
                                                    {item.assignee.name}
                                                </div>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td className="py-2.5 text-right">
                                            <button
                                                onClick={() => handleManage(item)}
                                                className="text-slate-400 hover:text-teal-600"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>

            <Modal
                open={isOpen}
                onClose={() => setIsOpen(false)}
                title="แจ้งอุบัติการณ์ความปลอดภัย"
                footer={
                    <>
                        <Button variant="outline" className="rounded-xl" onClick={() => setIsOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button
                            className="rounded-xl bg-teal-600 hover:bg-teal-700"
                            onClick={submitCreate}
                            disabled={processing}
                        >
                            ส่งรายงาน
                        </Button>
                    </>
                }
            >
                <Field label="ประเภทอุบัติการณ์">
                    <Input
                        placeholder="เช่น ไฟฟ้าขัดข้อง, น้ำรั่ว, เครื่องมือชำรุด"
                        value={data.incident_type}
                        onChange={(e) => setData('incident_type', e.target.value)}
                        className="rounded-xl"
                        required
                    />
                </Field>
                <Field label="สถานที่">
                    <Input
                        placeholder="เช่น ตึก A, ห้อง 101"
                        value={data.location}
                        onChange={(e) => setData('location', e.target.value)}
                        className="rounded-xl"
                        required
                    />
                </Field>
                <Field label="ระดับความรุนแรง">
                    <Select value={data.severity} onValueChange={(value) => setData('severity', value)}>
                        <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="เลือกระดับความรุนแรง" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">ต่ำ (Low)</SelectItem>
                            <SelectItem value="medium">ปานกลาง (Medium)</SelectItem>
                            <SelectItem value="high">สูง (High)</SelectItem>
                            <SelectItem value="critical">วิกฤต (Critical)</SelectItem>
                        </SelectContent>
                    </Select>
                </Field>
                <Field label="รายละเอียด">
                    <Textarea
                        placeholder="ระบุรายละเอียดของเหตุการณ์..."
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        className="rounded-xl"
                        required
                    />
                </Field>
            </Modal>

            <Modal
                open={isManageOpen}
                onClose={() => setIsManageOpen(false)}
                title={`จัดการอุบัติการณ์ #${editingItem?.id}`}
                wide
                footer={
                    <>
                        <Button variant="outline" className="rounded-xl" onClick={() => setIsManageOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button
                            className="rounded-xl bg-teal-600 hover:bg-teal-700"
                            onClick={submitManage}
                            disabled={manageProcessing}
                        >
                            บันทึกการเปลี่ยนแปลง
                        </Button>
                    </>
                }
            >
                <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                    <p>
                        <strong>ประเภท:</strong> {editingItem?.incident_type}
                    </p>
                    <p>
                        <strong>สถานที่:</strong> {editingItem?.location}
                    </p>
                    <p>
                        <strong>รายละเอียด:</strong> {editingItem?.description}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="สถานะ">
                        <Select
                            value={manageData.status}
                            onValueChange={(value) => setManageData('status', value)}
                        >
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="เลือกสถานะ" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="reported">แจ้งแล้ว (Reported)</SelectItem>
                                <SelectItem value="accepted">รับเรื่องแล้ว (Accepted)</SelectItem>
                                <SelectItem value="in_progress">กำลังดำเนินการ (In Progress)</SelectItem>
                                <SelectItem value="resolved">แก้ไขแล้ว (Resolved)</SelectItem>
                                <SelectItem value="closed">ปิดงาน (Closed)</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label="มอบหมายให้">
                        <Select
                            value={manageData.assigned_to}
                            onValueChange={(value) => setManageData('assigned_to', value)}
                        >
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="เลือกผู้ใช้" />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map((user) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                </div>

                <Field label="การดำเนินการแก้ไข">
                    <Textarea
                        placeholder="ระบุสิ่งที่ได้ดำเนินการไป..."
                        value={manageData.action_taken}
                        onChange={(e) => setManageData('action_taken', e.target.value)}
                        className="rounded-xl"
                    />
                </Field>

                <Field label="บันทึกการปิดงาน">
                    <Textarea
                        placeholder="หมายเหตุเพิ่มเติม..."
                        value={manageData.resolution_notes}
                        onChange={(e) => setManageData('resolution_notes', e.target.value)}
                        className="rounded-xl"
                    />
                </Field>

                {manageData.status === 'closed' && (
                    <Field label="คะแนนความพึงพอใจ (1-5)">
                        <Input
                            type="number"
                            min="1"
                            max="5"
                            value={manageData.satisfaction_rating}
                            onChange={(e) => setManageData('satisfaction_rating', e.target.value)}
                            className="rounded-xl"
                        />
                    </Field>
                )}
            </Modal>
        </QualityPage>
    );
}
