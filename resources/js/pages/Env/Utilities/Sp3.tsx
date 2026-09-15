import React from 'react';
import { router, useForm } from '@inertiajs/react';
import { Droplets, FileDown, Lock, LockKeyhole, Plus, Trash2, Unlock } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { QualityPage, Panel, EmptyState, StatCard } from '@/components/quality/quality-ui';
import EnvSubNav from '@/pages/Env/EnvSubNav';
import UtilitiesSubNav from '@/pages/Env/Utilities/UtilitiesSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Category {
    id: number;
    code: string;
    name: string;
    has_medical: boolean;
    has_revenue: boolean;
}

interface Entry {
    id: number;
    year_be: number;
    month: number;
    period_label: string;
    budget_medical?: number | null;
    budget_revenue?: number | null;
    note?: string | null;
    display_total: number;
}

interface Props {
    unlocked: boolean;
    fiscalYear: number;
    fiscalYears: number[];
    category: Category | null;
    entries: Entry[];
    monthly: { label: string; total: number; revenue: number; medical: number }[];
    summary: { total: number; revenue: number; medical: number };
    months?: { year_be: number; month: number; label: string }[];
    ledger?: {
        periods: {
            key: string;
            label: string;
            has_data: boolean;
            rows: {
                id: number;
                budget_medical?: number | null;
                budget_revenue?: number | null;
                note?: string | null;
                display_total: number;
            }[];
        }[];
        grand_totals: { revenue: number; medical: number; display_total: number };
    } | null;
}

const money = (n?: number | null) =>
    n == null
        ? '-'
        : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function Sp3({ unlocked, fiscalYear, fiscalYears, category, entries, monthly, summary, months = [], ledger }: Props) {
    const unlockForm = useForm({ code: '' });
    const entryForm = useForm({
        category_id: category?.id || 0,
        year_be: months[months.length - 1]?.year_be || fiscalYear,
        month: months[months.length - 1]?.month || 1,
        budget_revenue: '' as string | number,
        budget_medical: '' as string | number,
        amount: '' as string | number,
        line_label: '',
        note: '',
    });

    const submitEntry = () => {
        if (!category) {
            return;
        }

        entryForm.transform((d) => ({
            category_id: category.id,
            year_be: d.year_be,
            month: d.month,
            budget_revenue: d.budget_revenue === '' ? null : Number(d.budget_revenue),
            budget_medical: d.budget_medical === '' ? null : Number(d.budget_medical),
            amount:
                d.budget_revenue !== ''
                    ? Number(d.budget_revenue)
                    : d.budget_medical !== ''
                      ? Number(d.budget_medical)
                      : null,
            line_label: '',
            note: d.note || null,
        }));
        entryForm.post(route('env.utilities.entries.store'), {
            preserveScroll: true,
            onSuccess: () => entryForm.reset('budget_revenue', 'budget_medical', 'note'),
        });
    };

    if (!unlocked) {
        return (
            <QualityPage
                tone="teal"
                icon={LockKeyhole}
                badge="ศูนย์พัฒนาคุณภาพ · ENV"
                title="สป.3 ค่าน้ำมันดีเซล"
                subtitle="ข้อมูลส่วนนี้ถูกซ่อนจากภาพรวม — กรุณาใส่รหัสเพื่อเข้าถึง"
                breadcrumbs={[
                    { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                    { title: 'ENV', href: route('env.index') },
                    { title: 'สาธารณูปโภค', href: route('env.utilities.index') },
                    { title: 'สป.3', href: route('env.utilities.sp3') },
                ]}
                headTitle="สป.3 · สาธารณูปโภค"
                subNav={<EnvSubNav active="env.utilities.index" />}
            >
                <UtilitiesSubNav active="sp3" />
                <div className="mx-auto max-w-md rounded-3xl border border-rose-100 bg-gradient-to-b from-rose-50 to-white p-8 shadow-sm">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-600 text-white">
                        <Lock className="h-7 w-7" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">ใส่รหัสเข้าถึง สป.3</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        ต้องใส่รหัสทุกครั้งที่เข้าดู · เมื่อออกจากหน้านี้แล้วกลับมาจะต้องปลดล็อกใหม่
                    </p>
                    <form
                        className="mt-5 space-y-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            unlockForm.post(route('env.utilities.sp3.unlock'));
                        }}
                    >
                        <Input
                            type="password"
                            inputMode="numeric"
                            value={unlockForm.data.code}
                            onChange={(e) => unlockForm.setData('code', e.target.value)}
                            placeholder="รหัสเข้าถึง"
                            className="rounded-xl text-center text-lg tracking-widest"
                            autoFocus
                        />
                        <Button type="submit" className="w-full rounded-xl bg-rose-600 hover:bg-rose-700" disabled={unlockForm.processing}>
                            <Unlock className="mr-1 h-4 w-4" />
                            ปลดล็อก
                        </Button>
                    </form>
                </div>
            </QualityPage>
        );
    }

    return (
        <QualityPage
            tone="teal"
            icon={Droplets}
            badge="ศูนย์พัฒนาคุณภาพ · ENV · สป.3"
            title="สป.3 ค่าน้ำมันดีเซล"
            subtitle={`ปีงบ ${fiscalYear} · ข้อมูลถูกจำกัดการเข้าถึง`}
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'ENV', href: route('env.index') },
                { title: 'สาธารณูปโภค', href: route('env.utilities.index') },
                { title: 'สป.3', href: route('env.utilities.sp3') },
            ]}
            headTitle="สป.3 · สาธารณูปโภค"
            subNav={<EnvSubNav active="env.utilities.index" />}
            actions={
                <div className="flex flex-wrap gap-2">
                    <select
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                        value={fiscalYear}
                        onChange={(e) =>
                            router.get(route('env.utilities.sp3'), { fiscal_year: Number(e.target.value) }, { replace: true })
                        }
                    >
                        {fiscalYears.map((y) => (
                            <option key={y} value={y}>
                                ปีงบ {y}
                            </option>
                        ))}
                    </select>
                    <Button asChild variant="outline" className="rounded-xl">
                        <a href={route('env.utilities.sp3.pdf', { fiscal_year: fiscalYear })} target="_blank" rel="noreferrer">
                            <FileDown className="mr-1 h-4 w-4" />
                            PDF
                        </a>
                    </Button>
                    <Button
                        variant="outline"
                        className="rounded-xl border-rose-200 text-rose-700"
                        onClick={() => router.post(route('env.utilities.sp3.lock'))}
                    >
                        <Lock className="mr-1 h-4 w-4" />
                        ล็อกอีกครั้ง
                    </Button>
                </div>
            }
        >
            <UtilitiesSubNav active="sp3" />

            <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <StatCard label="รวม สป.3" value={money(summary.total)} sub="บาท" icon={Droplets} tone="rose" />
                <StatCard label="งบรายรับ" value={money(summary.revenue)} sub="บาท" icon={Droplets} tone="amber" />
                <StatCard label="งบการแพทย์" value={money(summary.medical)} sub="บาท" icon={Droplets} tone="cyan" />
            </div>

            <Panel title="แนวโน้มรายเดือน" className="mb-4">
                <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthly}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} width={70} />
                            <Tooltip formatter={(v: number) => money(v)} />
                            <Bar dataKey="total" fill="#e11d48" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Panel>

            <Panel
                title="รายละเอียด"
                action={
                    category ? (
                        <Button
                            className="rounded-xl"
                            disabled={entryForm.processing}
                            onClick={submitEntry}
                        >
                            <Plus className="mr-1 h-4 w-4" />
                            บันทึกรายการด้านล่าง
                        </Button>
                    ) : null
                }
            >
                {category && (
                    <div className="mb-4 grid gap-3 rounded-2xl border border-rose-100 bg-rose-50/40 p-4 sm:grid-cols-4">
                        <div>
                            <label className="mb-1 block text-xs text-slate-600">เดือน</label>
                            <select
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                value={`${entryForm.data.year_be}-${entryForm.data.month}`}
                                onChange={(e) => {
                                    const [y, m] = e.target.value.split('-').map(Number);
                                    entryForm.setData('year_be', y);
                                    entryForm.setData('month', m);
                                }}
                            >
                                {months.map((m) => (
                                    <option key={`${m.year_be}-${m.month}`} value={`${m.year_be}-${m.month}`}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-slate-600">งบรายรับ</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={entryForm.data.budget_revenue}
                                onChange={(e) => entryForm.setData('budget_revenue', e.target.value)}
                                className="rounded-xl bg-white"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-slate-600">งบการแพทย์</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={entryForm.data.budget_medical}
                                onChange={(e) => entryForm.setData('budget_medical', e.target.value)}
                                className="rounded-xl bg-white"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-slate-600">หมายเหตุ</label>
                            <Input
                                value={entryForm.data.note}
                                onChange={(e) => entryForm.setData('note', e.target.value)}
                                className="rounded-xl bg-white"
                            />
                        </div>
                    </div>
                )}

                {(!ledger || ledger.periods.every((p) => !p.has_data)) ? (
                    <EmptyState text="ยังไม่มีข้อมูล สป.3 ในปีงบนี้" />
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full min-w-[700px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold text-slate-600">
                                    <th className="px-3 py-2.5">เดือนปี</th>
                                    <th className="px-3 py-2.5 text-right">งบรายรับ</th>
                                    <th className="px-3 py-2.5 text-right">งบการแพทย์</th>
                                    <th className="px-3 py-2.5">หมายเหตุ</th>
                                    <th className="px-3 py-2.5 w-12"></th>
                                </tr>
                                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] text-slate-400">
                                    <th className="px-3 py-1"></th>
                                    <th className="px-3 py-1 text-right">จำนวนเงิน(บาท)</th>
                                    <th className="px-3 py-1 text-right">จำนวนเงิน(บาท)</th>
                                    <th className="px-3 py-1"></th>
                                    <th className="px-3 py-1"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.periods.map((period) => {
                                    if (!period.has_data) {
                                        return (
                                            <tr key={period.key} className="border-b border-slate-50 text-slate-400">
                                                <td className="px-3 py-2 font-medium text-slate-700">{period.label}</td>
                                                <td className="px-3 py-2 text-right">-</td>
                                                <td className="px-3 py-2 text-right">-</td>
                                                <td className="px-3 py-2">-</td>
                                                <td className="px-3 py-2"></td>
                                            </tr>
                                        );
                                    }
                                    return period.rows.map((e, idx) => (
                                        <tr key={e.id} className="border-b border-slate-50">
                                            <td className="px-3 py-2 font-medium">{idx === 0 ? period.label : ''}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{money(e.budget_revenue)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{money(e.budget_medical)}</td>
                                            <td className="px-3 py-2 text-xs text-slate-500">{e.note || '-'}</td>
                                            <td className="px-3 py-2 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-rose-600"
                                                    onClick={() => {
                                                        if (confirm('ลบรายการนี้?')) {
                                                            router.delete(route('env.utilities.entries.destroy', e.id), {
                                                                preserveScroll: true,
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ));
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-rose-200 bg-rose-50/70 font-semibold">
                                    <td className="px-3 py-2.5">รวมเงิน</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{money(ledger.grand_totals.revenue)}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{money(ledger.grand_totals.medical)}</td>
                                    <td className="px-3 py-2.5 text-xs text-slate-500" colSpan={2}>
                                        รวม {money(ledger.grand_totals.display_total)} บาท
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </Panel>
        </QualityPage>
    );
}
