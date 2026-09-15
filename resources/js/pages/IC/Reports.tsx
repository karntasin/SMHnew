import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { QualityPage, StatCard, Panel, EmptyState } from '@/components/quality/quality-ui';
import IcSubNav from '@/pages/IC/IcSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    FileBarChart,
    Download,
    Calendar,
    TrendingUp,
    TrendingDown,
    Activity,
    Users,
    Pill,
    HandMetal,
} from 'lucide-react';
import { appPath } from '@/lib/asset';

interface MonthlyData {
    month: string;
    hai_count: number;
    patient_days: number;
    hai_rate: number;
    cauti_count: number;
    cauti_rate: number;
    clabsi_count: number;
    clabsi_rate: number;
    vap_count: number;
    vap_rate: number;
}

interface HygieneCompliance {
    month: string;
    total_observations: number;
    compliant: number;
    compliance_rate: number;
}

interface AntibioticStats {
    total_uses: number;
    appropriate_rate: number;
    by_class: { antibiotic_class: string; count: number }[];
}

interface Props {
    period: {
        start_date: string;
        end_date: string;
    };
    monthly_hai: MonthlyData[];
    hygiene_compliance: HygieneCompliance[];
    antibiotic_stats: AntibioticStats;
    summary: {
        total_hai: number;
        total_patient_days: number;
        avg_hai_rate: number;
        avg_compliance: number;
        total_trainings: number;
        total_trained: number;
    };
    targets: {
        hai_rate: number;
        hand_hygiene: number;
        antibiotic_appropriate: number;
    };
}

export default function Reports({ period, monthly_hai, hygiene_compliance, antibiotic_stats, summary, targets }: Props) {
    const [reportPeriod, setReportPeriod] = useState({
        start_date: period.start_date,
        end_date: period.end_date,
    });

    const handleGenerateReport = () => {
        router.get('/ic/reports', reportPeriod, { preserveState: true });
    };

    const handleExport = (format: 'pdf' | 'excel') => {
        window.open(appPath(`/ic/reports/export?format=${format}&start_date=${reportPeriod.start_date}&end_date=${reportPeriod.end_date}`), '_blank');
    };

    const getTrend = (current: number, previous: number) => {
        if (current > previous) {
            return <TrendingUp className="h-4 w-4 text-red-500" />;
        } else if (current < previous) {
            return <TrendingDown className="h-4 w-4 text-green-500" />;
        }
        return null;
    };

    return (
        <QualityPage
            tone="rose"
            icon={FileBarChart}
            badge="ศูนย์พัฒนาคุณภาพ · IC"
            title="IC Reports & Analytics"
            subtitle="รายงานและวิเคราะห์ข้อมูลการควบคุมการติดเชื้อ"
            headTitle="IC Reports"
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'Infection Control (IC)', href: '/ic' },
                { title: 'รายงาน', href: '/ic/reports' },
            ]}
            subNav={<IcSubNav active="ic.reports" />}
            actions={
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2 rounded-xl" onClick={() => handleExport('excel')}>
                        <Download className="h-4 w-4" /> Excel
                    </Button>
                    <Button className="gap-2 rounded-xl bg-rose-600 hover:bg-rose-700" onClick={() => handleExport('pdf')}>
                        <Download className="h-4 w-4" /> PDF
                    </Button>
                </div>
            }
        >
            <Panel title="ช่วงเวลารายงาน" description="เลือกช่วงวันที่แล้วกดสร้างรายงาน">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1">
                        <Label>วันที่เริ่มต้น</Label>
                        <Input
                            type="date"
                            value={reportPeriod.start_date}
                            onChange={(e) => setReportPeriod((prev) => ({ ...prev, start_date: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>วันที่สิ้นสุด</Label>
                        <Input
                            type="date"
                            value={reportPeriod.end_date}
                            onChange={(e) => setReportPeriod((prev) => ({ ...prev, end_date: e.target.value }))}
                        />
                    </div>
                    <Button onClick={handleGenerateReport} className="rounded-xl bg-rose-600 hover:bg-rose-700">
                        <Calendar className="mr-2 h-4 w-4" /> สร้างรายงาน
                    </Button>
                </div>
            </Panel>

            <div className="grid gap-4 md:grid-cols-4">
                <StatCard
                    label="HAI Rate เฉลี่ย"
                    value={summary.avg_hai_rate.toFixed(2)}
                    sub={`เป้า ≤${targets.hai_rate} ต่อ 1,000 patient days`}
                    icon={Activity}
                    tone="rose"
                />
                <StatCard
                    label="Hand Hygiene Compliance"
                    value={`${summary.avg_compliance.toFixed(1)}%`}
                    sub={`เป้า ≥${targets.hand_hygiene}%`}
                    icon={HandMetal}
                    tone="sky"
                />
                <StatCard
                    label="Antibiotic Appropriate"
                    value={`${antibiotic_stats.appropriate_rate.toFixed(1)}%`}
                    sub={`เป้า ≥${targets.antibiotic_appropriate}%`}
                    icon={Pill}
                    tone="pink"
                />
                <StatCard
                    label="IC Training"
                    value={summary.total_trained}
                    sub={`${summary.total_trainings} ครั้ง`}
                    icon={Users}
                    tone="indigo"
                />
            </div>

                    <Panel title="อัตราการติดเชื้อในโรงพยาบาลรายเดือน" description="HAI Rate ต่อ 1,000 patient days / Device-associated infection rates">
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                            <th className="p-3">เดือน</th>
                                            <th className="p-3 text-right">Patient Days</th>
                                            <th className="p-3 text-right">HAI ทั้งหมด</th>
                                            <th className="p-3 text-right">HAI Rate</th>
                                            <th className="p-3 text-right">CAUTI</th>
                                            <th className="p-3 text-right">CLABSI</th>
                                            <th className="p-3 text-right">VAP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthly_hai.length === 0 ? (
                                            <tr><td colSpan={7}><EmptyState text="ไม่มีข้อมูลในช่วงเวลาที่เลือก" /></td></tr>
                                        ) : (
                                            monthly_hai.map((row, index) => (
                                                <tr key={row.month} className="border-t border-slate-100 hover:bg-slate-50/60">
                                                    <td className="p-3 font-medium">{row.month}</td>
                                                    <td className="p-3 text-right">{row.patient_days.toLocaleString()}</td>
                                                    <td className="p-3 text-right">{row.hai_count}</td>
                                                    <td className="p-3 text-right">
                                                        <span className={`font-medium ${row.hai_rate > targets.hai_rate ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                            {row.hai_rate.toFixed(2)}
                                                        </span>
                                                        {index > 0 && getTrend(row.hai_rate, monthly_hai[index - 1].hai_rate)}
                                                    </td>
                                                    <td className="p-3 text-right">{row.cauti_count} ({row.cauti_rate.toFixed(2)})</td>
                                                    <td className="p-3 text-right">{row.clabsi_count} ({row.clabsi_rate.toFixed(2)})</td>
                                                    <td className="p-3 text-right">{row.vap_count} ({row.vap_rate.toFixed(2)})</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                    </Panel>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Panel title="Hand Hygiene Compliance รายเดือน">
                                {hygiene_compliance.length === 0 ? (
                                    <EmptyState text="ไม่มีข้อมูล" />
                                ) : (
                                    <div className="space-y-3">
                                        {hygiene_compliance.map((row) => (
                                            <div key={row.month} className="flex items-center justify-between">
                                                <span className="text-sm">{row.month}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
                                                        <div
                                                            className={`h-full rounded-full ${row.compliance_rate >= targets.hand_hygiene ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                            style={{ width: `${row.compliance_rate}%` }}
                                                        />
                                                    </div>
                                                    <span className={`w-12 text-right text-sm font-medium ${row.compliance_rate >= targets.hand_hygiene ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        {row.compliance_rate.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                        </Panel>

                        <Panel title="การใช้ยาปฏิชีวนะตามกลุ่ม">
                                {antibiotic_stats.by_class.length === 0 ? (
                                    <EmptyState text="ไม่มีข้อมูล" />
                                ) : (
                                    <div className="space-y-3">
                                        {antibiotic_stats.by_class.map((item) => {
                                            const total = antibiotic_stats.total_uses;
                                            const percentage = total > 0 ? (item.count / total) * 100 : 0;
                                            return (
                                                <div key={item.antibiotic_class} className="flex items-center justify-between">
                                                    <span className="text-sm capitalize">{item.antibiotic_class}</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
                                                            <div className="h-full rounded-full bg-rose-500" style={{ width: `${percentage}%` }} />
                                                        </div>
                                                        <span className="w-16 text-right text-sm font-medium">
                                                            {item.count} ({percentage.toFixed(1)}%)
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                        </Panel>
                    </div>

                    <Panel
                        title="สรุปผลการดำเนินงาน IC"
                        description={`ช่วงเวลา: ${new Date(period.start_date).toLocaleDateString('th-TH')} - ${new Date(period.end_date).toLocaleDateString('th-TH')}`}
                    >
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <div className="mb-2 text-sm text-slate-500">การเฝ้าระวังการติดเชื้อ</div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span>HAI ทั้งหมด:</span>
                                            <span className="font-medium">{summary.total_hai} ราย</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Patient Days:</span>
                                            <span className="font-medium">{summary.total_patient_days.toLocaleString()} วัน</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>HAI Rate เฉลี่ย:</span>
                                            <span className={`font-medium ${summary.avg_hai_rate > targets.hai_rate ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {summary.avg_hai_rate.toFixed(2)} ‰
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                    <div className="mb-2 text-sm text-slate-500">Hand Hygiene</div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span>Compliance เฉลี่ย:</span>
                                            <span className={`font-medium ${summary.avg_compliance >= targets.hand_hygiene ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {summary.avg_compliance.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>เป้าหมาย:</span>
                                            <span className="font-medium">≥{targets.hand_hygiene}%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                    <div className="mb-2 text-sm text-slate-500">Antibiotic Stewardship</div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span>การใช้ยาทั้งหมด:</span>
                                            <span className="font-medium">{antibiotic_stats.total_uses} รายการ</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Appropriate Rate:</span>
                                            <span className={`font-medium ${antibiotic_stats.appropriate_rate >= targets.antibiotic_appropriate ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {antibiotic_stats.appropriate_rate.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                    </Panel>
        </QualityPage>
    );
}
