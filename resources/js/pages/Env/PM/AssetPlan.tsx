import { Link, router, useForm } from '@inertiajs/react';
import { Wrench } from 'lucide-react';
import { Field, Panel, QualityPage, StatusPill } from '@/components/quality/quality-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EnvSubNav from '@/pages/Env/EnvSubNav';
import PmSubNav, { criticalityLabel } from '@/pages/Env/PM/PmSubNav';
import { format } from 'date-fns';

interface Schedule {
    id: number;
    basis: string;
    frequency_type: string;
    frequency_value: number;
    next_pm_date?: string | null;
    meter_unit?: string | null;
    meter_interval?: number | null;
    last_meter_reading?: number | null;
    next_meter_due?: number | null;
    standard?: { id: number; name: string; frequency: string } | null;
    meter_readings?: { id: number; reading: number; read_at: string; note?: string | null }[];
}

interface Asset {
    id: number;
    name: string;
    brand?: string | null;
    model?: string | null;
    serial_number?: string | null;
    stock_number?: string | null;
    control_number?: string | null;
    location?: string | null;
    issue_location?: string | null;
    owner?: string | null;
    line?: string | null;
    risk_level: string;
    risk_label: string;
    criticality?: string | null;
    install_date?: string | null;
    annual_pm_budget?: number | null;
}

export default function AssetPlan({
    asset,
    schedules,
    standards,
    openOrders,
}: {
    asset: Asset;
    schedules: Schedule[];
    standards: { id: number; name: string; frequency: string; basis: string }[];
    openOrders: { id: number; wo_number: string; status: string; due_date: string; schedule_id?: number | null }[];
}) {
    const profile = useForm({
        install_date: asset.install_date || '',
        annual_pm_budget: asset.annual_pm_budget != null ? String(asset.annual_pm_budget) : '',
    });
    const assign = useForm({ standard_id: standards[0] ? String(standards[0].id) : '', next_pm_date: '' });

    const breadcrumbs = [
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'ทะเบียนครุภัณฑ์', href: '/env/assets' },
        { title: asset.name, href: route('env.pm.assets.show', asset.id) },
    ];

    return (
        <QualityPage
            tone="teal"
            icon={Wrench}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title={asset.name}
            subtitle={`รหัส ${asset.stock_number || asset.control_number || asset.id}`}
            breadcrumbs={breadcrumbs}
            headTitle={`PM ${asset.name}`}
            subNav={
                <>
                    <EnvSubNav active="env.pm.index" />
                    <PmSubNav active="dashboard" />
                </>
            }
        >
            <Panel title="ทะเบียนเครื่อง">
                <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <div>ยี่ห้อ/รุ่น {asset.brand || '-'} {asset.model || ''}</div>
                    <div>SN {asset.serial_number || '-'}</div>
                    <div>สถานที่ {asset.issue_location || asset.location || '-'}</div>
                    <div>สายงาน/ผู้ดูแล {asset.line || asset.owner || '-'}</div>
                    <div>
                        ความสำคัญ {asset.risk_level} {asset.risk_label}
                        {asset.criticality ? ` · ${criticalityLabel(asset.risk_level)}` : ''}
                    </div>
                </div>
                <form
                    className="mt-4 grid gap-3 sm:grid-cols-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        profile.put(route('env.pm.assets.update', asset.id));
                    }}
                >
                    <Field label="วันที่ติดตั้ง">
                        <Input type="date" value={profile.data.install_date} onChange={(e) => profile.setData('install_date', e.target.value)} />
                    </Field>
                    <Field label="งบ PM ต่อปี (บาท)">
                        <Input type="number" min={0} step="0.01" value={profile.data.annual_pm_budget} onChange={(e) => profile.setData('annual_pm_budget', e.target.value)} />
                    </Field>
                    <Button type="submit" className="w-fit rounded-xl bg-teal-600" disabled={profile.processing}>
                        บันทึกข้อมูลเครื่อง
                    </Button>
                </form>
            </Panel>

            <Panel title="แผนที่ผูกกับเครื่องนี้">
                <form
                    className="mb-4 grid gap-3 sm:grid-cols-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        assign.post(route('env.pm.assets.schedules.store', asset.id));
                    }}
                >
                    <Field label="แผนมาตรฐาน">
                        <select className="h-10 rounded-xl border px-3 text-sm" value={assign.data.standard_id} onChange={(e) => assign.setData('standard_id', e.target.value)}>
                            {standards.map((standard) => (
                                <option key={standard.id} value={standard.id}>
                                    {standard.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="วันครบรอบถัดไป">
                        <Input type="date" value={assign.data.next_pm_date} onChange={(e) => assign.setData('next_pm_date', e.target.value)} />
                    </Field>
                    <div className="flex items-end">
                        <Button type="submit" className="rounded-xl" disabled={!assign.data.standard_id || assign.processing}>
                            ผูกแผน
                        </Button>
                    </div>
                </form>
                <div className="space-y-3">
                    {schedules.map((schedule) => (
                        <div key={schedule.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <div className="font-medium">{schedule.standard?.name || 'แผนเริ่มต้น'}</div>
                                    <div className="text-sm text-slate-500">
                                        {schedule.basis === 'meter'
                                            ? `มิเตอร์ทุก ${schedule.meter_interval || '-'} ${schedule.meter_unit || ''} · ล่าสุด ${schedule.last_meter_reading ?? '-'} · ถึงรอบ ${schedule.next_meter_due ?? '-'}`
                                            : `ทุก ${schedule.frequency_value} ${schedule.frequency_type} · ครบรอบ ${schedule.next_pm_date ? format(new Date(schedule.next_pm_date), 'dd MMM yyyy') : '-'}`}
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => router.delete(route('env.pm.assets.schedules.destroy', [asset.id, schedule.id]))}
                                >
                                    นำออก
                                </Button>
                            </div>
                            {schedule.basis === 'meter' && (
                                <form
                                    className="mt-3 grid gap-2 sm:grid-cols-4"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        router.post(route('env.pm.assets.meter', asset.id), {
                                            schedule_id: schedule.id,
                                            reading: formData.get('reading'),
                                            read_at: formData.get('read_at'),
                                            note: formData.get('note'),
                                        });
                                    }}
                                >
                                    <Input name="reading" type="number" min={0} step="0.01" placeholder="ค่ามิเตอร์" required />
                                    <Input name="read_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                                    <Input name="note" placeholder="หมายเหตุ" />
                                    <Button type="submit" variant="outline">บันทึกมิเตอร์</Button>
                                </form>
                            )}
                        </div>
                    ))}
                </div>
            </Panel>

            <Panel title="ใบงานที่ยังเปิด">
                {openOrders.length === 0 ? (
                    <div className="text-sm text-slate-500">ไม่มีใบงานค้าง</div>
                ) : (
                    <div className="space-y-2">
                        {openOrders.map((order) => (
                            <Link key={order.id} href={route('env.pm.work-orders.show', order.id)} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                                <span>{order.wo_number} · {format(new Date(order.due_date), 'dd MMM yyyy')}</span>
                                <StatusPill label={order.status} className="border-slate-200 bg-slate-50 text-slate-700" />
                            </Link>
                        ))}
                    </div>
                )}
            </Panel>
        </QualityPage>
    );
}
