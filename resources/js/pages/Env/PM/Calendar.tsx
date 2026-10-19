import { router } from '@inertiajs/react';
import { Wrench } from 'lucide-react';
import { EmptyState, Panel, QualityPage, StatusPill } from '@/components/quality/quality-ui';
import { Button } from '@/components/ui/button';
import EnvSubNav from '@/pages/Env/EnvSubNav';
import PmSubNav, { criticalityLabel } from '@/pages/Env/PM/PmSubNav';

interface Order {
    id: number;
    wo_number: string;
    status: string;
    due_date: string;
    asset?: { name: string; risk_level?: string | null } | null;
}

const breadcrumbs = [
    { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
    { title: 'ENV', href: '/env' },
    { title: 'ปฏิทิน PM', href: '/env/pm/calendar' },
];

function shiftMonth(month: string, delta: number) {
    const [year, mon] = month.split('-').map(Number);
    const date = new Date(year, mon - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function Calendar({ month, orders }: { month: string; orders: Order[] }) {
    const [year, mon] = month.split('-').map(Number);
    const first = new Date(year, mon - 1, 1);
    const daysInMonth = new Date(year, mon, 0).getDate();
    const cells: Array<number | null> = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(day);

    const byDay = orders.reduce<Record<number, Order[]>>((acc, order) => {
        const day = new Date(order.due_date).getDate();
        acc[day] = acc[day] || [];
        acc[day].push(order);
        return acc;
    }, {});

    return (
        <QualityPage
            tone="teal"
            icon={Wrench}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title="ปฏิทินงาน PM"
            subtitle={month}
            breadcrumbs={breadcrumbs}
            headTitle="PM Calendar"
            subNav={
                <>
                    <EnvSubNav active="env.pm.index" />
                    <PmSubNav active="calendar" />
                </>
            }
            actions={
                <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => router.get(route('env.pm.calendar'), { month: shiftMonth(month, -1) })}>
                        เดือนก่อน
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => router.get(route('env.pm.calendar'), { month: shiftMonth(month, 1) })}>
                        เดือนถัดไป
                    </Button>
                </div>
            }
        >
            <Panel title="งานตามวันกำหนดส่ง">
                <div className="grid grid-cols-7 gap-2">
                        {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((label) => (
                            <div key={label} className="px-1 text-center text-xs font-medium text-slate-400">
                                {label}
                            </div>
                        ))}
                        {cells.map((day, index) => (
                            <div key={index} className="min-h-24 rounded-xl border border-slate-100 bg-slate-50/60 p-2">
                                {day && <div className="text-xs font-semibold text-slate-500">{day}</div>}
                                <div className="mt-1 space-y-1">
                                    {(day ? byDay[day] || [] : []).map((order) => (
                                        <button
                                            key={order.id}
                                            type="button"
                                            className="block w-full rounded-lg bg-white px-1.5 py-1 text-left text-[11px] leading-tight text-slate-700 shadow-sm"
                                            onClick={() => router.get(route('env.pm.work-orders.show', order.id))}
                                        >
                                            <div className="font-medium">{order.asset?.name}</div>
                                            <div className="text-slate-400">
                                                {order.asset?.risk_level} {criticalityLabel(order.asset?.risk_level)}
                                            </div>
                                            <StatusPill label={order.status} className="mt-1 border-slate-200 bg-slate-50 text-slate-600" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    {orders.length === 0 && <EmptyState text="ไม่มีใบงานในเดือนนี้" />}
            </Panel>
        </QualityPage>
    );
}
