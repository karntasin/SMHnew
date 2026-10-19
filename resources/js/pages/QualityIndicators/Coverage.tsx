import { Link } from '@inertiajs/react';
import { Building2, FileDown, Hash, Landmark, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QualityPage, StatCard, Panel, StatusPill } from '@/components/quality/quality-ui';
import IndicatorsSubNav from '@/pages/QualityIndicators/IndicatorsSubNav';

interface DepartmentRow {
    id: number;
    name: string;
    count: number;
}

interface TeamRow {
    id: number;
    abbreviation: string;
    name: string;
    count: number;
}

function CountTable({
    rows,
    nameLabel,
    renderName,
}: {
    rows: Array<{ id: number; count: number }>;
    nameLabel: string;
    renderName: (row: { id: number; count: number }) => { label: string; href: string };
}) {
    const missing = rows.filter((row) => row.count === 0).length;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                        <th className="py-2 pr-3">{nameLabel}</th>
                        <th className="py-2 pr-3 text-right">จำนวน</th>
                        <th className="py-2 text-right">สถานะ</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const item = renderName(row);
                        return (
                            <tr key={row.id} className="border-b border-slate-50">
                                <td className="py-2.5 pr-3">
                                    <Link href={item.href} className="font-medium text-slate-800 hover:text-emerald-700">
                                        {item.label}
                                    </Link>
                                </td>
                                <td className="py-2.5 pr-3 text-right font-semibold text-slate-900">
                                    {row.count.toLocaleString('th-TH')}
                                </td>
                                <td className="py-2.5 text-right">
                                    {row.count === 0 ? (
                                        <StatusPill label="ยังไม่มี" className="border-rose-200 bg-rose-50 text-rose-700" />
                                    ) : (
                                        <StatusPill label="มีแล้ว" className="border-emerald-200 bg-emerald-50 text-emerald-700" />
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-500">ยังไม่มี {missing.toLocaleString('th-TH')} จาก {rows.length.toLocaleString('th-TH')}</p>
        </div>
    );
}

export default function Coverage({
    organization,
    departments,
    teams,
}: {
    organization: number;
    departments: DepartmentRow[];
    teams: TeamRow[];
}) {
    const departmentsWith = departments.filter((row) => row.count > 0).length;
    const teamsWith = teams.filter((row) => row.count > 0).length;

    const breadcrumbs = [
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'ตัวชี้วัดคุณภาพ', href: route('quality-indicators.index') },
        { title: 'จำนวนรายส่วน', href: route('quality-indicators.coverage') },
    ];

    return (
        <QualityPage
            tone="emerald"
            icon={Hash}
            badge="ศูนย์พัฒนาคุณภาพ · ตัวชี้วัด"
            title="จำนวนตัวชี้วัดรายส่วน"
            subtitle="นับเฉพาะตัวชี้วัดที่ยังไม่ถูกลบ แต่ละส่วนแสดงแค่จำนวน"
            breadcrumbs={breadcrumbs}
            headTitle="จำนวนตัวชี้วัดรายส่วน"
            actions={
                <a href={route('quality-indicators.coverage.excel')}>
                    <Button type="button" variant="outline" className="rounded-xl border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                        <FileDown className="mr-2 h-4 w-4" />
                        ดาวน์โหลด Excel
                    </Button>
                </a>
            }
            subNav={<IndicatorsSubNav active="quality-indicators.coverage" />}
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard label="ระดับองค์กร" value={organization} sub="ตัวชี้วัด" icon={Landmark} tone="emerald" />
                <StatCard
                    label="แผนกที่มีตัวชี้วัด"
                    value={`${departmentsWith}/${departments.length}`}
                    sub={`ยังไม่มี ${departments.length - departmentsWith} แผนก`}
                    icon={Building2}
                    tone="cyan"
                />
                <StatCard
                    label="ทีมที่มีตัวชี้วัด"
                    value={`${teamsWith}/${teams.length}`}
                    sub={`ยังไม่มี ${teams.length - teamsWith} ทีม`}
                    icon={Users}
                    tone="amber"
                />
            </div>

            <Panel title="ระดับองค์กร" description="จำนวนตัวชี้วัดทั้งองค์กร">
                <div className="flex items-center justify-between gap-3">
                    <Link
                        href={route('quality-indicators.index', { type: 'organization' })}
                        className="font-medium text-slate-800 hover:text-emerald-700"
                    >
                        ตัวชี้วัดระดับองค์กร
                    </Link>
                    <span className="text-2xl font-semibold text-slate-900">{organization.toLocaleString('th-TH')}</span>
                </div>
            </Panel>

            <Panel title="แผนก" description="เรียงส่วนที่ยังไม่มีไว้ด้านบน แล้วตามด้วยจำนวนมากไปน้อย">
                <CountTable
                    rows={departments}
                    nameLabel="แผนก"
                    renderName={(row) => ({
                        label: (row as DepartmentRow).name,
                        href: route('quality-indicators.index', { type: 'department', department_id: row.id }),
                    })}
                />
            </Panel>

            <Panel title="ทีม HA" description="เรียงส่วนที่ยังไม่มีไว้ด้านบน แล้วตามด้วยจำนวนมากไปน้อย">
                <CountTable
                    rows={teams}
                    nameLabel="ทีม"
                    renderName={(row) => {
                        const team = row as TeamRow;
                        return {
                            label: `${team.abbreviation} · ${team.name}`,
                            href: route('quality-indicators.index', { type: 'ha_team', team_id: row.id }),
                        };
                    }}
                />
            </Panel>
        </QualityPage>
    );
}
