import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    FileBarChart,
    Download,
    Calendar,
    TrendingUp,
    TrendingDown,
    Target,
    AlertTriangle,
    CheckCircle2,
    Activity,
    Users,
    Pill,
    HandMetal,
    Thermometer,
} from 'lucide-react';

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
        window.open(`/ic/reports/export?format=${format}&start_date=${reportPeriod.start_date}&end_date=${reportPeriod.end_date}`, '_blank');
    };

    const getStatusIcon = (value: number, target: number, inverse = false) => {
        const isGood = inverse ? value <= target : value >= target;
        if (isGood) {
            return <CheckCircle2 className="h-5 w-5 text-green-500" />;
        }
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    };

    const getTrend = (current: number, previous: number) => {
        if (current > previous) {
            return <TrendingUp className="h-4 w-4 text-red-500" />;
        } else if (current < previous) {
            return <TrendingDown className="h-4 w-4 text-green-500" />;
        }
        return null;
    };

    const breadcrumbs = [
        { title: 'IC', href: '/ic' },
        { title: 'Reports', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="IC Reports" />

            <div className="flex flex-col min-h-screen">
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-700 via-slate-600 to-gray-700 text-white">
                    <div className="absolute inset-0 bg-grid-white/10"></div>
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

                    <div className="relative px-6 py-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                                    <FileBarChart className="h-10 w-10" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">
                                        IC Reports & Analytics
                                    </h1>
                                    <p className="text-white/80 text-lg">
                                        รายงานและวิเคราะห์ข้อมูลการควบคุมการติดเชื้อ
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10" onClick={() => handleExport('excel')}>
                                    <Download className="h-4 w-4" /> Excel
                                </Button>
                                <Button className="gap-2 bg-white text-slate-700 hover:bg-white/90" onClick={() => handleExport('pdf')}>
                                    <Download className="h-4 w-4" /> PDF
                                </Button>
                            </div>
                        </div>

                        {/* Period Selector */}
                        <div className="flex items-end gap-4 mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <div className="space-y-1">
                                <Label className="text-white/80">วันที่เริ่มต้น</Label>
                                <Input
                                    type="date"
                                    value={reportPeriod.start_date}
                                    onChange={(e) => setReportPeriod(prev => ({ ...prev, start_date: e.target.value }))}
                                    className="bg-white/20 border-white/30 text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-white/80">วันที่สิ้นสุด</Label>
                                <Input
                                    type="date"
                                    value={reportPeriod.end_date}
                                    onChange={(e) => setReportPeriod(prev => ({ ...prev, end_date: e.target.value }))}
                                    className="bg-white/20 border-white/30 text-white"
                                />
                            </div>
                            <Button onClick={handleGenerateReport} className="bg-white text-slate-700 hover:bg-white/90">
                                <Calendar className="h-4 w-4 mr-2" /> สร้างรายงาน
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6 space-y-6 bg-gray-50 dark:bg-gray-900">
                    {/* KPI Summary Cards */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card className="border-l-4 border-l-red-500">
                            <CardContent className="pt-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted-foreground">HAI Rate เฉลี่ย</div>
                                        <div className="text-3xl font-bold">{summary.avg_hai_rate.toFixed(2)}</div>
                                        <div className="text-xs text-muted-foreground">ต่อ 1,000 patient days</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {getStatusIcon(summary.avg_hai_rate, targets.hai_rate, true)}
                                        <span className="text-xs">เป้า ≤{targets.hai_rate}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-blue-500">
                            <CardContent className="pt-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted-foreground">Hand Hygiene Compliance</div>
                                        <div className="text-3xl font-bold">{summary.avg_compliance.toFixed(1)}%</div>
                                        <div className="text-xs text-muted-foreground">อัตราการปฏิบัติถูกต้อง</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {getStatusIcon(summary.avg_compliance, targets.hand_hygiene)}
                                        <span className="text-xs">เป้า ≥{targets.hand_hygiene}%</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-pink-500">
                            <CardContent className="pt-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted-foreground">Antibiotic Appropriate</div>
                                        <div className="text-3xl font-bold">{antibiotic_stats.appropriate_rate.toFixed(1)}%</div>
                                        <div className="text-xs text-muted-foreground">การใช้ยาที่เหมาะสม</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {getStatusIcon(antibiotic_stats.appropriate_rate, targets.antibiotic_appropriate)}
                                        <span className="text-xs">เป้า ≥{targets.antibiotic_appropriate}%</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-indigo-500">
                            <CardContent className="pt-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted-foreground">IC Training</div>
                                        <div className="text-3xl font-bold">{summary.total_trained}</div>
                                        <div className="text-xs text-muted-foreground">คนอบรมแล้ว ({summary.total_trainings} ครั้ง)</div>
                                    </div>
                                    <Users className="h-8 w-8 text-indigo-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Monthly HAI Data Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                อัตราการติดเชื้อในโรงพยาบาลรายเดือน
                            </CardTitle>
                            <CardDescription>
                                HAI Rate ต่อ 1,000 patient days / Device-associated infection rates
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>เดือน</TableHead>
                                            <TableHead className="text-right">Patient Days</TableHead>
                                            <TableHead className="text-right">HAI ทั้งหมด</TableHead>
                                            <TableHead className="text-right">HAI Rate</TableHead>
                                            <TableHead className="text-right">CAUTI</TableHead>
                                            <TableHead className="text-right">CLABSI</TableHead>
                                            <TableHead className="text-right">VAP</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {monthly_hai.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    ไม่มีข้อมูลในช่วงเวลาที่เลือก
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            monthly_hai.map((row, index) => (
                                                <TableRow key={row.month}>
                                                    <TableCell className="font-medium">{row.month}</TableCell>
                                                    <TableCell className="text-right">{row.patient_days.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right">{row.hai_count}</TableCell>
                                                    <TableCell className="text-right">
                                                        <span className={`font-medium ${row.hai_rate > targets.hai_rate ? 'text-red-600' : 'text-green-600'}`}>
                                                            {row.hai_rate.toFixed(2)}
                                                        </span>
                                                        {index > 0 && getTrend(row.hai_rate, monthly_hai[index - 1].hai_rate)}
                                                    </TableCell>
                                                    <TableCell className="text-right">{row.cauti_count} ({row.cauti_rate.toFixed(2)})</TableCell>
                                                    <TableCell className="text-right">{row.clabsi_count} ({row.clabsi_rate.toFixed(2)})</TableCell>
                                                    <TableCell className="text-right">{row.vap_count} ({row.vap_rate.toFixed(2)})</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Hand Hygiene Compliance */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <HandMetal className="h-5 w-5" />
                                    Hand Hygiene Compliance รายเดือน
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {hygiene_compliance.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        ไม่มีข้อมูล
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {hygiene_compliance.map((row) => (
                                            <div key={row.month} className="flex items-center justify-between">
                                                <span className="text-sm">{row.month}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full ${row.compliance_rate >= targets.hand_hygiene ? 'bg-green-500' : 'bg-yellow-500'}`}
                                                            style={{ width: `${row.compliance_rate}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-sm font-medium w-12 text-right ${row.compliance_rate >= targets.hand_hygiene ? 'text-green-600' : 'text-yellow-600'}`}>
                                                        {row.compliance_rate.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Antibiotic Usage by Class */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Pill className="h-5 w-5" />
                                    การใช้ยาปฏิชีวนะตามกลุ่ม
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {antibiotic_stats.by_class.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        ไม่มีข้อมูล
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {antibiotic_stats.by_class.map((item) => {
                                            const total = antibiotic_stats.total_uses;
                                            const percentage = total > 0 ? (item.count / total) * 100 : 0;
                                            return (
                                                <div key={item.antibiotic_class} className="flex items-center justify-between">
                                                    <span className="text-sm capitalize">{item.antibiotic_class}</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-pink-500 rounded-full"
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-medium w-16 text-right">
                                                            {item.count} ({percentage.toFixed(1)}%)
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary Statistics */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5" />
                                สรุปผลการดำเนินงาน IC
                            </CardTitle>
                            <CardDescription>
                                ช่วงเวลา: {new Date(period.start_date).toLocaleDateString('th-TH')} - {new Date(period.end_date).toLocaleDateString('th-TH')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="p-4 bg-muted rounded-lg">
                                    <div className="text-sm text-muted-foreground mb-2">การเฝ้าระวังการติดเชื้อ</div>
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
                                            <span className={`font-medium ${summary.avg_hai_rate > targets.hai_rate ? 'text-red-600' : 'text-green-600'}`}>
                                                {summary.avg_hai_rate.toFixed(2)} ‰
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-muted rounded-lg">
                                    <div className="text-sm text-muted-foreground mb-2">Hand Hygiene</div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span>Compliance เฉลี่ย:</span>
                                            <span className={`font-medium ${summary.avg_compliance >= targets.hand_hygiene ? 'text-green-600' : 'text-yellow-600'}`}>
                                                {summary.avg_compliance.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>เป้าหมาย:</span>
                                            <span className="font-medium">≥{targets.hand_hygiene}%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-muted rounded-lg">
                                    <div className="text-sm text-muted-foreground mb-2">Antibiotic Stewardship</div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span>การใช้ยาทั้งหมด:</span>
                                            <span className="font-medium">{antibiotic_stats.total_uses} รายการ</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Appropriate Rate:</span>
                                            <span className={`font-medium ${antibiotic_stats.appropriate_rate >= targets.antibiotic_appropriate ? 'text-green-600' : 'text-yellow-600'}`}>
                                                {antibiotic_stats.appropriate_rate.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
