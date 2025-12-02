import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

export default function IcIndex({ stats }: Props) {
    const breadcrumbs = [
        { title: 'งานคุณภาพ', href: '#' },
        { title: 'IC (ควบคุมการติดเชื้อ)', href: '/ic' },
    ];

    // Helper function for severity colors
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-500 text-white';
            case 'high': return 'bg-orange-500 text-white';
            case 'medium': return 'bg-yellow-500 text-black';
            default: return 'bg-green-500 text-white';
        }
    };

    // Calculate if rate is meeting target
    const isMeetingTarget = (rate: number, target: number, lowerIsBetter: boolean = false) => {
        return lowerIsBetter ? rate <= target : rate >= target;
    };

    // Quick Links for IC modules
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
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="IC Dashboard - ระบบควบคุมการติดเชื้อ" />

            <div className="flex flex-col min-h-screen">
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 text-white">
                    <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl"></div>

                    <div className="relative px-6 py-8">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                                <ShieldAlert className="h-10 w-10" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">
                                    Infection Control Dashboard
                                </h1>
                                <p className="text-white/80 text-lg">
                                    ระบบควบคุมและป้องกันการติดเชื้อ | มาตรฐาน สรพ.
                                </p>
                            </div>
                        </div>

                        {/* Summary Stats in Hero */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                                    <Activity className="h-4 w-4" />
                                    <span>การติดเชื้อ Active</span>
                                </div>
                                <div className="text-3xl font-bold">{stats.active_infections}</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                                    <Hand className="h-4 w-4" />
                                    <span>Hand Hygiene</span>
                                </div>
                                <div className="text-3xl font-bold">
                                    {stats.hand_hygiene_rate}%
                                    {isMeetingTarget(stats.hand_hygiene_rate, stats.targets.hand_hygiene) ? (
                                        <CheckCircle2 className="inline-block ml-2 h-5 w-5 text-green-300" />
                                    ) : (
                                        <XCircle className="inline-block ml-2 h-5 w-5 text-red-300" />
                                    )}
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>อุบัติการณ์เดือนนี้</span>
                                </div>
                                <div className="text-3xl font-bold">{stats.incidents_this_month}</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                                    <Siren className="h-4 w-4" />
                                    <span>Active Outbreaks</span>
                                </div>
                                <div className="text-3xl font-bold">
                                    {stats.active_outbreaks}
                                    {stats.active_outbreaks > 0 && (
                                        <span className="ml-2 inline-flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6 space-y-6 bg-gray-50 dark:bg-gray-900">
                    {/* HAI Rate Cards */}
                    <div className="grid gap-4 md:grid-cols-3">
                        {/* CAUTI Rate */}
                        <Card className="border-l-4 border-l-blue-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center justify-between">
                                    <span>CAUTI Rate</span>
                                    <Badge variant={isMeetingTarget(stats.cauti_rate, stats.targets.cauti, true) ? "default" : "destructive"}>
                                        เป้า: ≤{stats.targets.cauti}
                                    </Badge>
                                </CardTitle>
                                <CardDescription>ต่อ 1,000 catheter days</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-bold">{stats.cauti_rate}</span>
                                    {isMeetingTarget(stats.cauti_rate, stats.targets.cauti, true) ? (
                                        <TrendingDown className="h-6 w-6 text-green-500 mb-1" />
                                    ) : (
                                        <TrendingUp className="h-6 w-6 text-red-500 mb-1" />
                                    )}
                                </div>
                                <Progress 
                                    value={Math.min((stats.cauti_rate / (stats.targets.cauti * 2)) * 100, 100)} 
                                    className="mt-2 h-2"
                                />
                            </CardContent>
                        </Card>

                        {/* CLABSI Rate */}
                        <Card className="border-l-4 border-l-purple-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center justify-between">
                                    <span>CLABSI Rate</span>
                                    <Badge variant={isMeetingTarget(stats.clabsi_rate, stats.targets.clabsi, true) ? "default" : "destructive"}>
                                        เป้า: ≤{stats.targets.clabsi}
                                    </Badge>
                                </CardTitle>
                                <CardDescription>ต่อ 1,000 central line days</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-bold">{stats.clabsi_rate}</span>
                                    {isMeetingTarget(stats.clabsi_rate, stats.targets.clabsi, true) ? (
                                        <TrendingDown className="h-6 w-6 text-green-500 mb-1" />
                                    ) : (
                                        <TrendingUp className="h-6 w-6 text-red-500 mb-1" />
                                    )}
                                </div>
                                <Progress 
                                    value={Math.min((stats.clabsi_rate / (stats.targets.clabsi * 2)) * 100, 100)} 
                                    className="mt-2 h-2"
                                />
                            </CardContent>
                        </Card>

                        {/* VAP Rate */}
                        <Card className="border-l-4 border-l-orange-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center justify-between">
                                    <span>VAP Rate</span>
                                    <Badge variant={isMeetingTarget(stats.vap_rate, stats.targets.vap, true) ? "default" : "destructive"}>
                                        เป้า: ≤{stats.targets.vap}
                                    </Badge>
                                </CardTitle>
                                <CardDescription>ต่อ 1,000 ventilator days</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-bold">{stats.vap_rate}</span>
                                    {isMeetingTarget(stats.vap_rate, stats.targets.vap, true) ? (
                                        <TrendingDown className="h-6 w-6 text-green-500 mb-1" />
                                    ) : (
                                        <TrendingUp className="h-6 w-6 text-red-500 mb-1" />
                                    )}
                                </div>
                                <Progress 
                                    value={Math.min((stats.vap_rate / (stats.targets.vap * 2)) * 100, 100)} 
                                    className="mt-2 h-2"
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Actions */}
                    {(stats.pending_antibiotic_reviews > 0 || stats.active_outbreaks > 0) && (
                        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-amber-500" />
                                    ต้องดำเนินการ
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-3">
                                    {stats.pending_antibiotic_reviews > 0 && (
                                        <Link href="/ic/antibiotic?appropriateness=pending">
                                            <Button variant="outline" className="gap-2 border-amber-300 hover:bg-amber-100">
                                                <Pill className="h-4 w-4" />
                                                Review Antibiotic ({stats.pending_antibiotic_reviews})
                                            </Button>
                                        </Link>
                                    )}
                                    {stats.active_outbreaks > 0 && (
                                        <Link href="/ic/outbreak?status=active">
                                            <Button variant="outline" className="gap-2 border-red-300 hover:bg-red-100 text-red-600">
                                                <Siren className="h-4 w-4" />
                                                Active Outbreaks ({stats.active_outbreaks})
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Monthly Trend */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-blue-500" />
                                    แนวโน้มรายเดือน
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {stats.monthly_trend.map((item, index) => (
                                        <div key={index} className="flex items-center gap-4">
                                            <div className="w-20 text-sm text-muted-foreground">{item.month_thai}</div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm">Infections: <strong>{item.infections}</strong></span>
                                                    {item.hand_hygiene_rate !== null && (
                                                        <span className="text-sm">
                                                            HH: <strong className={item.hand_hygiene_rate >= stats.targets.hand_hygiene ? 'text-green-600' : 'text-red-600'}>
                                                                {item.hand_hygiene_rate}%
                                                            </strong>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 h-2">
                                                    <div 
                                                        className="bg-red-400 rounded-full" 
                                                        style={{ width: `${Math.max(item.infections * 10, 4)}px` }}
                                                    />
                                                    {item.hand_hygiene_rate !== null && (
                                                        <div 
                                                            className={`rounded-full ${item.hand_hygiene_rate >= stats.targets.hand_hygiene ? 'bg-green-400' : 'bg-yellow-400'}`}
                                                            style={{ width: `${item.hand_hygiene_rate}%` }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Infection by Type */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-purple-500" />
                                    การติดเชื้อแยกตามประเภท (เดือนนี้)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {stats.infection_by_type.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                                        <p>ไม่พบการติดเชื้อในเดือนนี้</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {stats.infection_by_type.map((item, index) => {
                                            const colors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
                                            return (
                                                <div key={index} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                                                        <span className="font-medium">{item.infection_type || 'อื่นๆ'}</span>
                                                    </div>
                                                    <Badge variant="secondary">{item.total} เคส</Badge>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Incidents */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                                    อุบัติการณ์ล่าสุด
                                </CardTitle>
                                <Link href="/ic/incidents">
                                    <Button variant="ghost" size="sm" className="gap-1">
                                        ดูทั้งหมด <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {stats.recent_incidents.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">ไม่มีอุบัติการณ์ล่าสุด</p>
                            ) : (
                                <div className="space-y-3">
                                    {stats.recent_incidents.map((incident) => (
                                        <div key={incident.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <Badge className={getSeverityColor(incident.severity)}>
                                                    {incident.severity.toUpperCase()}
                                                </Badge>
                                                <div>
                                                    <p className="font-medium">{incident.incident_type}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {incident.location} • {new Date(incident.incident_date).toLocaleDateString('th-TH')}
                                                    </p>
                                                </div>
                                            </div>
                                            <Link href={`/ic/incidents?id=${incident.id}`}>
                                                <Button variant="ghost" size="sm">
                                                    <ArrowRight className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Module Quick Links */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Stethoscope className="h-5 w-5" />
                            เมนู IC ทั้งหมด
                        </h2>
                        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                            {modules.map((module) => (
                                <Link key={module.href} href={module.href}>
                                    <Card className="h-full hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group">
                                        <CardContent className="p-4 text-center">
                                            <div className={`w-12 h-12 mx-auto mb-3 rounded-xl ${module.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                                <module.icon className="h-6 w-6 text-white" />
                                            </div>
                                            <h3 className="font-semibold text-sm mb-1">{module.title}</h3>
                                            <p className="text-xs text-muted-foreground">{module.description}</p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Infection by Ward */}
                    {stats.infection_by_ward.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-teal-500" />
                                    สถิติการติดเชื้อแยกตามหอผู้ป่วย (เดือนนี้)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                    {stats.infection_by_ward.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <span className="font-medium">{item.ward_name || 'ไม่ระบุ'}</span>
                                            <Badge variant="destructive">{item.total} เคส</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
