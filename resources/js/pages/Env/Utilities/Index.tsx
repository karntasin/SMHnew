import React from 'react';
import { Link, router } from '@inertiajs/react';
import {
    Droplets,
    FileDown,
    Banknote,
    Building2,
    Wallet,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { QualityPage, Panel, StatCard, EmptyState } from '@/components/quality/quality-ui';
import EnvSubNav from '@/pages/Env/EnvSubNav';
import UtilitiesSubNav, { UtilitiesHint } from '@/pages/Env/Utilities/UtilitiesSubNav';
import { Button } from '@/components/ui/button';

interface LatestMonth {
    label: string;
    year_be: number;
    month: number;
    total: number;
    medical: number;
    revenue: number;
    admin: number;
    invoice: number;
    rows: number;
}

interface CategoryRow {
    id: number;
    code: string;
    name: string;
    invoice: number;
    medical: number;
    revenue: number;
    admin: number;
    total: number;
    rows: number;
    latest_month: LatestMonth | null;
}

interface Props {
    fiscalYear: number;
    fiscalYears: number[];
    summary: {
        total: number;
        medical: number;
        revenue: number;
        admin: number;
        invoice: number;
        category_count: number;
    };
    byCategory: CategoryRow[];
    monthly: { label: string; total: number; medical: number; revenue: number; admin: number }[];
    sp3Unlocked: boolean;
}

const money = (n?: number | null) =>
    n == null
        ? '-'
        : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function Index({ fiscalYear, fiscalYears, summary, byCategory, monthly }: Props) {
    const setYear = (y: number) => {
        router.get(route('env.utilities.index'), { fiscal_year: y }, { preserveState: true, replace: true });
    };

    return (
        <QualityPage
            tone="teal"
            icon={Droplets}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title="สาธารณูปโภค"
            subtitle={`ภาพรวมค่าใช้จ่ายปีงบ ${fiscalYear} (ไม่รวม สป.3)`}
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'ENV', href: route('env.index') },
                { title: 'สาธารณูปโภค', href: route('env.utilities.index') },
            ]}
            headTitle="สาธารณูปโภค ENV"
            subNav={<EnvSubNav active="env.utilities.index" />}
            actions={
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                        value={fiscalYear}
                        onChange={(e) => setYear(Number(e.target.value))}
                    >
                        {fiscalYears.map((y) => (
                            <option key={y} value={y}>
                                ปีงบ {y}
                            </option>
                        ))}
                    </select>
                    <Button asChild variant="outline" className="rounded-xl">
                        <a href={route('env.utilities.pdf', { fiscal_year: fiscalYear })} target="_blank" rel="noreferrer">
                            <FileDown className="mr-1 h-4 w-4" />
                            PDF รายงาน
                        </a>
                    </Button>
                </div>
            }
        >
            <UtilitiesSubNav active="overview" />
            <UtilitiesHint />

            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="รวมค่าใช้จ่าย" value={money(summary.total)} sub="บาท (ไม่รวม สป.3)" icon={Banknote} tone="teal" />
                <StatCard label="งบการแพทย์" value={money(summary.medical)} sub="บาท" icon={Building2} tone="cyan" />
                <StatCard label="งบรายรับ" value={money(summary.revenue)} sub="บาท" icon={Wallet} tone="amber" />
                <StatCard label="งบบริหารหน่วย" value={money(summary.admin)} sub="บาท" icon={Droplets} tone="slate" />
            </div>

            <Panel title="แนวโน้มรายเดือน" description="ผลรวมค่าใช้จ่ายสาธารณะรายเดือน" className="mb-4">
                {monthly.every((m) => m.total === 0) ? (
                    <EmptyState text="ยังไม่มีข้อมูลในปีงบนี้ — รัน php artisan env:import-utility-expenses" />
                ) : (
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthly}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} width={70} />
                                <Tooltip formatter={(v: number) => money(v)} />
                                <Bar dataKey="total" name="รวม" fill="#0d9488" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </Panel>

            <Panel title="แยกตามประเภท" description="ยอดค่าใช้จ่ายเดือนล่าสุดที่มีข้อมูล · คลิกเพื่อดูรายละเอียด">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {byCategory.map((cat) => {
                        const latest = cat.latest_month;
                        return (
                            <Link
                                key={cat.code}
                                href={route('env.utilities.category', cat.code) + `?fiscal_year=${fiscalYear}`}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/40"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="text-sm font-semibold text-slate-900">{cat.name}</div>
                                    <div className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                                        {latest ? latest.label : 'ยังไม่มีข้อมูล'}
                                    </div>
                                </div>
                                <div className="mt-2 text-2xl font-bold tabular-nums text-teal-800">
                                    {latest ? money(latest.total) : '-'}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                    {latest ? `เดือนล่าสุดที่มีข้อมูล · ${latest.rows} รายการ` : 'ยังไม่มีรายการในปีงบนี้'}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                                    {latest && latest.medical > 0 && <span>แพทย์ {money(latest.medical)}</span>}
                                    {latest && latest.revenue > 0 && <span>รายรับ {money(latest.revenue)}</span>}
                                    {latest && latest.admin > 0 && <span>บริหาร {money(latest.admin)}</span>}
                                    <span>ทั้งปีงบ {money(cat.total)}</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </Panel>
        </QualityPage>
    );
}
