import { Link, router } from '@inertiajs/react';
import { Wrench } from 'lucide-react';
import { EmptyState, Panel, QualityPage, StatusPill } from '@/components/quality/quality-ui';
import { Button } from '@/components/ui/button';
import EnvSubNav from '@/pages/Env/EnvSubNav';
import CreateWorkOrderButton, { GenerateDueButton } from '@/pages/Env/PM/CreateWorkOrderButton';
import PmSubNav, { criticalityLabel } from '@/pages/Env/PM/PmSubNav';
import { format } from 'date-fns';

interface Order {
    id: number;
    wo_number: string;
    status: string;
    due_date: string;
    result?: string | null;
    asset?: {
        name: string;
        stock_number?: string | null;
        location?: string | null;
        issue_location?: string | null;
        risk_level?: string | null;
    } | null;
    assignee_users?: { id: number; name: string; pivot?: { is_lead: boolean } }[];
}

const statuses = [
    { value: 'open', label: 'งานเปิด' },
    { value: 'scheduled', label: 'รอจ่ายงาน' },
    { value: 'assigned', label: 'มอบหมายแล้ว' },
    { value: 'in_progress', label: 'กำลังทำ' },
    { value: 'completed', label: 'ปิดงาน' },
    { value: 'cancelled', label: 'ยกเลิก' },
    { value: 'all', label: 'ทั้งหมด' },
];

const breadcrumbs = [
    { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
    { title: 'ENV', href: '/env' },
    { title: 'ใบสั่งงาน PM', href: '/env/pm/work-orders' },
];

export default function WorkOrders({
    orders,
    status,
}: {
    orders: { data: Order[]; links: { url: string | null; label: string; active: boolean }[] };
    status: string;
}) {
    return (
        <QualityPage
            tone="teal"
            icon={Wrench}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title="ใบสั่งงาน PM"
            subtitle="มอบหมายช่าง บันทึกผล และเปิดใบซ่อมเมื่อไม่ผ่าน"
            breadcrumbs={breadcrumbs}
            headTitle="PM Work Orders"
            subNav={
                <>
                    <EnvSubNav active="env.pm.index" />
                    <PmSubNav active="orders" />
                </>
            }
            actions={
                <div className="flex flex-wrap gap-2">
                    <CreateWorkOrderButton />
                    <GenerateDueButton />
                </div>
            }
        >
            <div className="flex flex-wrap gap-2">
                {statuses.map((item) => (
                    <Button
                        key={item.value}
                        size="sm"
                        variant={status === item.value ? 'default' : 'outline'}
                        className="rounded-full"
                        onClick={() => router.get(route('env.pm.work-orders.index'), { status: item.value }, { preserveState: true, replace: true })}
                    >
                        {item.label}
                    </Button>
                ))}
            </div>
            <Panel title="รายการใบงาน">
                {orders.data.length === 0 ? (
                    <EmptyState text="ยังไม่มีใบงานในสถานะนี้ กดสร้างใบงานแล้วเลือกเครื่อง" />
                ) : (
                    <div className="space-y-3">
                        {orders.data.map((order) => (
                            <button
                                key={order.id}
                                type="button"
                                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 p-4 text-left hover:border-teal-200"
                                onClick={() => router.get(route('env.pm.work-orders.show', order.id))}
                            >
                                <div>
                                    <div className="font-semibold text-slate-800">
                                        {order.wo_number} · {order.asset?.name}
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        กำหนด {format(new Date(order.due_date), 'dd MMM yyyy')}
                                        {' · '}
                                        {order.asset?.issue_location || order.asset?.location || '-'}
                                        {' · '}
                                        {order.asset?.risk_level} {criticalityLabel(order.asset?.risk_level)}
                                        {order.assignee_users?.length ? ` · ${order.assignee_users.map((user) => user.name).join(', ')}` : ''}
                                    </div>
                                </div>
                                <StatusPill label={order.result || order.status} className="border-slate-200 bg-slate-50 text-slate-700" />
                            </button>
                        ))}
                    </div>
                )}
            </Panel>
            <div className="flex flex-wrap gap-2">
                {orders.links.map((link, index) =>
                    link.url ? (
                        <Link
                            key={index}
                            href={link.url}
                            className={`rounded-xl border px-3 py-1 text-sm ${link.active ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-200 bg-white'}`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ) : (
                        <span
                            key={index}
                            className="rounded-xl border border-slate-100 px-3 py-1 text-sm text-slate-400"
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ),
                )}
            </div>
        </QualityPage>
    );
}
