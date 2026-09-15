import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Wrench, AlertTriangle, History } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
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
    { title: 'แผนบำรุงรักษา (PM)', href: route('env.pm.index') },
];

export default function Index({ dueSchedules, history }: { dueSchedules: any[]; history: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<any>(null);

    const { data, setData, post, processing } = useForm({
        asset_id: '',
        schedule_id: '',
        performed_by: '',
        result: 'Pass',
        findings: '',
        performed_at: new Date().toISOString().split('T')[0],
    });

    const handlePerformPM = (schedule: any) => {
        setSelectedSchedule(schedule);
        setData({
            asset_id: schedule.asset_id,
            schedule_id: schedule.id,
            performed_by: '',
            result: 'Pass',
            findings: '',
            performed_at: new Date().toISOString().split('T')[0],
        });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('env.pm.store'), {
            onSuccess: () => setIsOpen(false),
        });
    };

    const overdueCount = dueSchedules.filter(
        (s) => new Date(s.next_pm_date) < new Date(),
    ).length;

    return (
        <QualityPage
            tone="teal"
            icon={Wrench}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title="การติดตามการบำรุงรักษา (PM Tracking)"
            subtitle="ติดตามและบันทึกผลการบำรุงรักษาเครื่องมือแพทย์"
            breadcrumbs={breadcrumbs}
            headTitle="PM Tracking"
            subNav={<EnvSubNav active="env.pm.index" />}
        >
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                    label="รายการที่ต้องทำ PM"
                    value={dueSchedules.length}
                    sub="Upcoming/Overdue"
                    icon={AlertTriangle}
                    tone={dueSchedules.length ? 'amber' : 'teal'}
                />
                <StatCard
                    label="เกินกำหนด"
                    value={overdueCount}
                    sub="รายการ"
                    icon={AlertTriangle}
                    tone={overdueCount ? 'rose' : 'emerald'}
                />
                <StatCard
                    label="ประวัติล่าสุด"
                    value={history.length}
                    sub="รายการบันทึก"
                    icon={History}
                    tone="teal"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Panel
                    title="รายการที่ต้องทำ PM"
                    description="Upcoming และ Overdue"
                >
                    {dueSchedules.length === 0 ? (
                        <EmptyState text="ไม่มีรายการที่ต้องทำเร็วๆ นี้" />
                    ) : (
                        <div className="space-y-3">
                            {dueSchedules.map((schedule) => {
                                const isOverdue = new Date(schedule.next_pm_date) < new Date();
                                return (
                                    <div
                                        key={schedule.id}
                                        className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
                                    >
                                        <div>
                                            <div className="font-semibold text-slate-800">{schedule.asset.name}</div>
                                            <div className="text-sm text-slate-500">
                                                Due:{' '}
                                                <span className={cn(isOverdue && 'font-bold text-rose-600')}>
                                                    {format(new Date(schedule.next_pm_date), 'dd MMM yyyy')}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-xs text-slate-400">
                                                Loc: {schedule.asset.location} | Risk: {schedule.asset.risk_level}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="rounded-xl bg-teal-600 hover:bg-teal-700"
                                            onClick={() => handlePerformPM(schedule)}
                                        >
                                            บันทึกผล
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Panel>

                <Panel title="ประวัติการทำ PM ล่าสุด" description="บันทึกผลการบำรุงรักษาย้อนหลัง">
                    {history.length === 0 ? (
                        <EmptyState text="ยังไม่มีประวัติการทำ PM" />
                    ) : (
                        <div className="max-h-[500px] space-y-3 overflow-y-auto pr-2">
                            {history.map((record) => (
                                <div
                                    key={record.id}
                                    className="flex items-start justify-between border-b border-slate-50 pb-3 last:border-0"
                                >
                                    <div>
                                        <div className="font-medium text-slate-800">{record.asset.name}</div>
                                        <div className="text-xs text-slate-400">
                                            {format(new Date(record.performed_at), 'dd MMM yyyy HH:mm')} by{' '}
                                            {record.performed_by}
                                        </div>
                                        {record.findings && (
                                            <div className="mt-1 rounded-xl bg-slate-50 p-2 text-xs text-slate-600">
                                                Note: {record.findings}
                                            </div>
                                        )}
                                    </div>
                                    <StatusPill
                                        label={record.result}
                                        className={
                                            record.result === 'Pass'
                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                : 'border-rose-200 bg-rose-50 text-rose-700'
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            </div>

            <Modal
                open={isOpen}
                onClose={() => setIsOpen(false)}
                title="บันทึกผลการบำรุงรักษา (PM)"
                footer={
                    <>
                        <Button variant="outline" className="rounded-xl" onClick={() => setIsOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button
                            className="rounded-xl bg-teal-600 hover:bg-teal-700"
                            onClick={handleSubmit}
                            disabled={processing}
                        >
                            บันทึกผล
                        </Button>
                    </>
                }
            >
                <div className="rounded-xl bg-slate-50 p-3">
                    <h4 className="font-medium text-slate-800">{selectedSchedule?.asset?.name}</h4>
                    <p className="text-sm text-slate-500">
                        Model: {selectedSchedule?.asset?.model} | SN:{' '}
                        {selectedSchedule?.asset?.serial_number}
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="วันที่ดำเนินการ">
                        <Input
                            type="date"
                            value={data.performed_at}
                            onChange={(e) => setData('performed_at', e.target.value)}
                            className="rounded-xl"
                            required
                        />
                    </Field>
                    <Field label="ผู้ดำเนินการ">
                        <Input
                            value={data.performed_by}
                            onChange={(e) => setData('performed_by', e.target.value)}
                            className="rounded-xl"
                            required
                        />
                    </Field>
                </div>
                <Field label="ผลการตรวจสอบ">
                    <Select value={data.result} onValueChange={(v) => setData('result', v)}>
                        <SelectTrigger className="rounded-xl">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Pass">Pass (ผ่าน)</SelectItem>
                            <SelectItem value="Fail">Fail (ไม่ผ่าน)</SelectItem>
                        </SelectContent>
                    </Select>
                </Field>
                <Field label="ข้อค้นพบ/การแก้ไข (Findings)">
                    <Textarea
                        value={data.findings}
                        onChange={(e) => setData('findings', e.target.value)}
                        className="rounded-xl"
                    />
                </Field>
            </Modal>
        </QualityPage>
    );
}
