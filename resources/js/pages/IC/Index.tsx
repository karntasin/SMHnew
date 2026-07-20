import React from 'react';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { QualityPage, StatCard, Panel, EmptyState } from '@/components/quality/quality-ui';
import IcSubNav from '@/pages/IC/IcSubNav';
import {
    Activity,
    AlertTriangle,
    ShieldAlert,
    Hand,
    Microscope,
    Pill,
    Siren,
    GraduationCap,
    FileBarChart,
    Calendar,
    TrendingUp,
    TrendingDown,
    Users,
    Stethoscope,
    ArrowRight,
    CheckCircle2,
    XCircle,
    Zap,
} from 'lucide-react';

interface Stats {
    total_infections: number;
    active_infections: number;
    incidents_this_month: number;
    hand_hygiene_rate: number;
    cauti_rate: number;
    clabsi_rate: number;
    vap_rate: number;
    active_outbreaks: number;
    pending_antibiotic_reviews: number;
    targets: {
        hand_hygiene: number;
        cauti: number;
        clabsi: number;
        vap: number;
    };
    infection_by_ward: { ward_name: string; total: number }[];
    infection_by_type: { infection_type: string; total: number }[];
    recent_incidents: {
        id: number;
        incident_type: string;
        severity: string;
        incident_date: string;
        location: string;
        reporter?: { name: string };
    }[];
    monthly_trend: {
        month: string;
        month_thai: string;
        infections: number;
        hand_hygiene_rate: number | null;
    }[];
}

interface Props {
    stats: Stats;
}

const IC_BREADCRUMBS = [
    { title: 'ศูนย์คุณภาพ', href: '/quality' },
    { title: 'Infection Control (IC)', href: '/ic' },
];

export default function IcIndex({ stats }: Props) {
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-500 text-white';
            case 'high': return 'bg-orange-500 text-white';
            case 'medium': return 'bg-yellow-500 text-black';
            default: return 'bg-green-500 text-white';
        }
    };

    const isMeetingTarget = (rate: number, target: number, lowerIsBetter: boolean = false) => {
        return lowerIsBetter ? rate <= target : rate >= target;
    };

    const modules = [
        { title: 'เฝ้าระวังการติดเชื้อ', icon: Activity, href: '/ic/surveillance', color: 'bg-blue-500', description: 'HAI Surveillance' },
        { title: 'อุบัติการณ์', icon: AlertTriangle, href: '/ic/incidents', color: 'bg-orange-500', description: 'Needle Stick / Exposure' },
        { title: 'Hand Hygiene', icon: Hand, href: '/ic/hand-hygiene', color: 'bg-teal-500', description: 'WHO 5 Moments' },
        { title: 'Environment', icon: Microscope, href: '/ic/environment', color: 'bg-purple-500', description: 'Surface / Equipment' },
        { title: 'Antibiotic', icon: Pill, href: '/ic/antibiotic', color: 'bg-pink-500', description: 'Stewardship Program' },
        { title: 'Device Days', icon: Calendar, href: '/ic/device-days', color: 'bg-indigo-500', description: 'Catheter / Ventilator' },
        { title: 'Outbreak', icon: Siren, href: '/ic/outbreak', color: 'bg-red-500', description: 'Investigation & Control' },
        { title: 'อบรม IC', icon: GraduationCap, href: '/ic/education', color: 'bg-green-500', description: 'Training Records' },
        { title: 'รายงาน', icon: FileBarChart, href: '/ic/reports', color: 'bg-gray-600', description: 'Reports & Analytics' },
    ];

    return (
        <QualityPage
            tone="rose"
            icon={ShieldAlert}
            badge="ศูนย์คุณภาพ · IC"
            title="ภาพรวมการควบคุมการติดเชื้อ"
            subtitle="ระบบควบคุมและป้องกันการติดเชื้อ | มาตรฐาน สรพ."
            headTitle="ภาพรวม IC - ระบบควบคุมการติดเชื้อ"
            breadcrumbs={IC_BREADCRUMBS}
            subNav={<IcSubNav active="ic.index" />}
        >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard
                    label="การติดเชื้อ Active"
                    value={stats.active_infections}
                    icon={Activity}
                    tone="rose"
                />
                <StatCard
                    label="Hand Hygiene"
                    value={
                        <span className="flex items-center gap-2">
                            {stats.hand_hygiene_rate}%
                            {isMeetingTarget(stats.hand_hygiene_rate, stats.targets.hand_hygiene) ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : (
                                <XCircle className="h-5 w-5 text-rose-500" />
                            )}
                        </span>
                    }
                    sub={`เป้า ≥${stats.targets.hand_hygiene}%`}
                    icon={Hand}
                    tone="teal"
                />
                <StatCard
                    label="อุบัติการณ์เดือนนี้"
                    value={stats.incidents_this_month}
                    icon={AlertTriangle}
                    tone="amber"
                />
                <StatCard
                    label="Active Outbreaks"
                    value={
                        <span className="flex items-center gap-2">
                            {stats.active_outbreaks}
                            {stats.active_outbreaks > 0 && (
                                <span className="relative inline-flex h-3 w-3">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                                    <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
                                </span>
                            )}
                        </span>
                    }
                    icon={Siren}
                    tone="rose"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Panel title="CAUTI Rate" description="ต่อ 1,000 catheter days">
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-slate-900">{stats.cauti_rate}</span>
                        {isMeetingTarget(stats.cauti_rate, stats.targets.cauti, true) ? (
                            <TrendingDown className="mb-1 h-6 w-6 text-emerald-500" />
                        ) : (
                            <TrendingUp className="mb-1 h-6 w-6 text-rose-500" />
                        )}
                        <Badge variant={isMeetingTarget(stats.cauti_rate, stats.targets.cauti, true) ? 'default' : 'destructive'} className="ml-auto">
                            เป้า: ≤{stats.targets.cauti}
                        </Badge>
                    </div>
                    <Progress value={Math.min((stats.cauti_rate / (stats.targets.cauti * 2)) * 100, 100)} className="mt-3 h-2" />
                </Panel>

                <Panel title="CLABSI Rate" description="ต่อ 1,000 central line days">
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-slate-900">{stats.clabsi_rate}</span>
                        {isMeetingTarget(stats.clabsi_rate, stats.targets.clabsi, true) ? (
                            <TrendingDown className="mb-1 h-6 w-6 text-emerald-500" />
                        ) : (
                            <TrendingUp className="mb-1 h-6 w-6 text-rose-500" />
                        )}
                        <Badge variant={isMeetingTarget(stats.clabsi_rate, stats.targets.clabsi, true) ? 'default' : 'destructive'} className="ml-auto">
                            เป้า: ≤{stats.targets.clabsi}
                        </Badge>
                    </div>
                    <Progress value={Math.min((stats.clabsi_rate / (stats.targets.clabsi * 2)) * 100, 100)} className="mt-3 h-2" />
                </Panel>

                <Panel title="VAP Rate" description="ต่อ 1,000 ventilator days">
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-slate-900">{stats.vap_rate}</span>
                        {isMeetingTarget(stats.vap_rate, stats.targets.vap, true) ? (
                            <TrendingDown className="mb-1 h-6 w-6 text-emerald-500" />
                        ) : (
                            <TrendingUp className="mb-1 h-6 w-6 text-rose-500" />
                        )}
                        <Badge variant={isMeetingTarget(stats.vap_rate, stats.targets.vap, true) ? 'default' : 'destructive'} className="ml-auto">
                            เป้า: ≤{stats.targets.vap}
                        </Badge>
                    </div>
                    <Progress value={Math.min((stats.vap_rate / (stats.targets.vap * 2)) * 100, 100)} className="mt-3 h-2" />
                </Panel>
            </div>

            {(stats.pending_antibiotic_reviews > 0 || stats.active_outbreaks > 0) && (
                <Panel title="ต้องดำเนินการ" description="รายการที่ต้องติดตามด่วน">
                    <div className="flex flex-wrap gap-3">
                        {stats.pending_antibiotic_reviews > 0 && (
                            <Link href="/ic/antibiotic?appropriateness=pending">
                                <Button variant="outline" className="gap-2 rounded-xl border-amber-300 hover:bg-amber-50">
                                    <Pill className="h-4 w-4" />
                                    Review Antibiotic ({stats.pending_antibiotic_reviews})
                                </Button>
                            </Link>
                        )}
                        {stats.active_outbreaks > 0 && (
                            <Link href="/ic/outbreak?status=active">
                                <Button variant="outline" className="gap-2 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50">
                                    <Siren className="h-4 w-4" />
                                    Active Outbreaks ({stats.active_outbreaks})
                                </Button>
                            </Link>
                        )}
                    </div>
                </Panel>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                <Panel title="แนวโน้มรายเดือน" description="การติดเชื้อและ Hand Hygiene">
                    <div className="space-y-4">
                        {stats.monthly_trend.map((item, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <div className="w-20 text-sm text-slate-500">{item.month_thai}</div>
                                <div className="flex-1">
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className="text-sm">Infections: <strong>{item.infections}</strong></span>
                                        {item.hand_hygiene_rate !== null && (
                                            <span className="text-sm">
                                                HH: <strong className={item.hand_hygiene_rate >= stats.targets.hand_hygiene ? 'text-emerald-600' : 'text-rose-600'}>
                                                    {item.hand_hygiene_rate}%
                                                </strong>
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex h-2 gap-1">
                                        <div className="rounded-full bg-rose-400" style={{ width: `${Math.max(item.infections * 10, 4)}px` }} />
                                        {item.hand_hygiene_rate !== null && (
                                            <div
                                                className={`rounded-full ${item.hand_hygiene_rate >= stats.targets.hand_hygiene ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                                style={{ width: `${item.hand_hygiene_rate}%` }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Panel>

                <Panel title="การติดเชื้อแยกตามประเภท (เดือนนี้)">
                    {stats.infection_by_type.length === 0 ? (
                        <EmptyState text="ไม่พบการติดเชื้อในเดือนนี้" />
                    ) : (
                        <div className="space-y-3">
                            {stats.infection_by_type.map((item, index) => {
                                const colors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
                                return (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-3 w-3 rounded-full ${colors[index % colors.length]}`} />
                                            <span className="font-medium">{item.infection_type || 'อื่นๆ'}</span>
                                        </div>
                                        <Badge variant="secondary">{item.total} เคส</Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Panel>
            </div>

            <Panel
                title="อุบัติการณ์ล่าสุด"
                action={
                    <Link href="/ic/incidents">
                        <Button variant="ghost" size="sm" className="gap-1 rounded-xl">
                            ดูทั้งหมด <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                }
            >
                {stats.recent_incidents.length === 0 ? (
                    <EmptyState text="ไม่มีอุบัติการณ์ล่าสุด" />
                ) : (
                    <div className="space-y-3">
                        {stats.recent_incidents.map((incident) => (
                            <div key={incident.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                                <div className="flex items-center gap-3">
                                    <Badge className={getSeverityColor(incident.severity)}>
                                        {incident.severity.toUpperCase()}
                                    </Badge>
                                    <div>
                                        <p className="font-medium">{incident.incident_type}</p>
                                        <p className="text-sm text-slate-500">
                                            {incident.location} • {new Date(incident.incident_date).toLocaleDateString('th-TH')}
                                        </p>
                                    </div>
                                </div>
                                <Link href={`/ic/incidents?id=${incident.id}`}>
                                    <Button variant="ghost" size="sm" className="rounded-xl">
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>

            <Panel title="เมนู IC ทั้งหมด" description="เข้าถึงโมดูลย่อยทั้งหมด">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                    {modules.map((module) => (
                        <Link key={module.href} href={module.href}>
                            <div className="group h-full cursor-pointer rounded-2xl border border-slate-200/70 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                                <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${module.color} transition-transform group-hover:scale-110`}>
                                    <module.icon className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="mb-1 text-sm font-semibold">{module.title}</h3>
                                <p className="text-xs text-slate-500">{module.description}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </Panel>

            {stats.infection_by_ward.length > 0 && (
                <Panel title="สถิติการติดเชื้อแยกตามหอผู้ป่วย (เดือนนี้)">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {stats.infection_by_ward.map((item, index) => (
                            <div key={index} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                                <span className="font-medium">{item.ward_name || 'ไม่ระบุ'}</span>
                                <Badge variant="destructive">{item.total} เคส</Badge>
                            </div>
                        ))}
                    </div>
                </Panel>
            )}
        </QualityPage>
    );
}
