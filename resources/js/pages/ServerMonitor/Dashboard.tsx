import React, { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
} from 'recharts';
import axios from '@/lib/axios';
import { cn } from '@/lib/utils';
import {
    Activity,
    RefreshCw,
    Server,
    Wifi,
    Database,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Clock,
    Cpu,
    HardDrive,
    Zap,
    Radio,
} from 'lucide-react';

interface LatestSnapshot {
    status: 'online' | 'degraded' | 'offline';
    ping_ok: boolean;
    ping_ms: number | null;
    mysql_ok: boolean | null;
    mysql_ms: number | null;
    snmp_ok: boolean | null;
    cpu_percent: number | null;
    memory_percent: number | null;
    disk_percent: number | null;
    snmp_uptime_seconds: number | null;
    snmp_sys_name: string | null;
    ports: { port: number; label: string; open: boolean }[] | null;
    message: string | null;
    checked_at: string | null;
}

interface CurrentServer {
    key: string;
    name: string;
    host: string;
    latest: LatestSnapshot | null;
}

interface SeriesPoint {
    time: string;
    ts: string;
    ping_ms: number | null;
    mysql_ms: number | null;
    cpu_percent: number | null;
    memory_percent: number | null;
    disk_percent: number | null;
    status: string;
}

interface SeriesServer {
    key: string;
    name: string;
    points: SeriesPoint[];
}

interface SummaryItem {
    key: string;
    name: string;
    uptime_percent: number | null;
    avg_ping_ms: number | null;
    avg_mysql_ms: number | null;
    samples: number;
}

interface DashboardData {
    current: CurrentServer[];
    series: SeriesServer[];
    summary: SummaryItem[];
    refresh_seconds: number;
}

interface RangeOption {
    value: string;
    label: string;
}

interface Props {
    initial: DashboardData;
    ranges: RangeOption[];
}

const STATUS_CONFIG = {
    online: {
        label: 'ออนไลน์',
        icon: CheckCircle2,
        dot: 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]',
        badge: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
        glow: 'from-emerald-500/20 via-cyan-500/10 to-transparent',
    },
    degraded: {
        label: 'ลดประสิทธิภาพ',
        icon: AlertTriangle,
        dot: 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]',
        badge: 'border-amber-400/40 bg-amber-500/15 text-amber-300',
        glow: 'from-amber-500/20 via-orange-500/10 to-transparent',
    },
    offline: {
        label: 'ออฟไลน์',
        icon: XCircle,
        dot: 'bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.9)]',
        badge: 'border-red-400/40 bg-red-500/15 text-red-300',
        glow: 'from-red-500/20 via-rose-500/10 to-transparent',
    },
} as const;

function formatUptime(seconds: number | null): string {
    if (seconds == null || seconds <= 0) return '—';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}ว ${h}ชม`;
    if (h > 0) return `${h}ชม ${m}น`;
    return `${m} นาที`;
}

function metricTone(percent: number | null): { stroke: string; text: string; track: string } {
    if (percent == null) return { stroke: '#64748b', text: 'text-slate-400', track: 'stroke-slate-700' };
    if (percent >= 90) return { stroke: '#f87171', text: 'text-red-400', track: 'stroke-slate-700/80' };
    if (percent >= 75) return { stroke: '#fbbf24', text: 'text-amber-400', track: 'stroke-slate-700/80' };
    return { stroke: '#22d3ee', text: 'text-cyan-400', track: 'stroke-slate-700/80' };
}

function MetricRing({
    label,
    value,
    icon: Icon,
    sublabel,
}: {
    label: string;
    value: number | null;
    icon: React.ElementType;
    sublabel?: string;
}) {
    const size = 120;
    const stroke = 8;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const pct = value ?? 0;
    const offset = circumference - (pct / 100) * circumference;
    const tone = metricTone(value);

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl transition hover:border-cyan-400/30 hover:shadow-[0_0_40px_rgba(34,211,238,0.08)]">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl transition group-hover:bg-cyan-400/20" />
            <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                    <svg width={size} height={size} className="-rotate-90">
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            strokeWidth={stroke}
                            className={tone.track}
                        />
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            strokeWidth={stroke}
                            strokeLinecap="round"
                            stroke={tone.stroke}
                            strokeDasharray={circumference}
                            strokeDashoffset={value != null ? offset : circumference}
                            className="transition-all duration-700 ease-out"
                            style={{ filter: `drop-shadow(0 0 6px ${tone.stroke})` }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Icon className="mb-0.5 h-4 w-4 text-slate-500" />
                        <span className={cn('text-2xl font-bold tabular-nums tracking-tight', tone.text)}>
                            {value != null ? `${value}%` : '—'}
                        </span>
                    </div>
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
                    <p className="mt-1 text-sm text-slate-300">SNMP Real-time</p>
                    {sublabel && <p className="mt-2 truncate text-xs text-slate-500">{sublabel}</p>}
                </div>
            </div>
        </div>
    );
}

function StatTile({
    icon: Icon,
    label,
    value,
    unit,
    ok,
    okText,
    failText,
    accent,
    children,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    unit?: string;
    ok?: boolean;
    okText?: string;
    failText?: string;
    accent: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl">
            <div className={cn('pointer-events-none absolute inset-0 opacity-40 bg-gradient-to-br', accent)} />
            <div className="relative">
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                        <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                            <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
                    </div>
                    {ok != null && (
                        <span className={cn('text-xs font-medium', ok ? 'text-emerald-400' : 'text-red-400')}>
                            {ok ? okText : failText}
                        </span>
                    )}
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold tabular-nums tracking-tight text-white">{value}</span>
                    {unit && <span className="text-sm text-slate-500">{unit}</span>}
                </div>
                {children}
            </div>
        </div>
    );
}

function ChartPanel({
    title,
    description,
    children,
    empty,
    hasData,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
    empty: string;
    hasData: boolean;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl">
            <div className="border-b border-white/5 px-6 py-4">
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="text-xs text-slate-500">{description}</p>
            </div>
            <div className="h-80 p-4">
                {hasData ? children : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
                        <Radio className="h-8 w-8 opacity-30" />
                        <p className="text-sm">{empty}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

const chartTooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#e2e8f0',
    fontSize: '12px',
};

export default function ServerMonitorDashboard({ initial, ranges }: Props) {
    const [data, setData] = useState<DashboardData>(initial);
    const [range, setRange] = useState('24h');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const fetchMetrics = useCallback(async (selectedRange = range) => {
        setLoading(true);
        try {
            const res = await axios.get('/server-monitor/metrics', { params: { range: selectedRange } });
            setData(res.data);
            setLastRefresh(new Date());
        } catch {
            // keep previous data
        } finally {
            setLoading(false);
        }
    }, [range]);

    const handleCheckNow = async () => {
        setChecking(true);
        try {
            const res = await axios.post('/server-monitor/check-now');
            if (res.data.dashboard) {
                setData(res.data.dashboard);
                setLastRefresh(new Date());
            }
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => fetchMetrics(range), (data.refresh_seconds || 10) * 1000);
        return () => clearInterval(interval);
    }, [fetchMetrics, range, data.refresh_seconds]);

    const primary = data.current[0];
    const primarySeries = data.series[0];
    const primarySummary = data.summary[0];
    const status = primary?.latest?.status ?? 'offline';
    const statusCfg = STATUS_CONFIG[status];
    const StatusIcon = statusCfg.icon;

    const chartData = (primarySeries?.points ?? []).map((p) => ({
        ...p,
        label: p.time,
        status_value: p.status === 'online' ? 1 : p.status === 'degraded' ? 0.5 : 0,
    }));

    return (
        <AppLayout breadcrumbs={[
            { title: 'ศูนย์ตั้งค่า', href: '/settings-hub' },
            { title: 'ตรวจสอบเซิร์ฟเวอร์', href: '/server-monitor' },
        ]}>
            <Head title="ตรวจสอบเซิร์ฟเวอร์" />

            <div className="relative min-h-screen overflow-hidden bg-[#070b14] text-slate-200">
                {/* Ambient background */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
                    <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-[100px]" />
                    <div
                        className="absolute inset-0 opacity-[0.35]"
                        style={{
                            backgroundImage:
                                'linear-gradient(rgba(34,211,238,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.05) 1px, transparent 1px)',
                            backgroundSize: '48px 48px',
                        }}
                    />
                </div>

                {/* Header */}
                <div className="relative border-b border-white/5">
                    <div className="mx-auto max-w-7xl px-6 py-8">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">
                                    <span className="relative flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                                    </span>
                                    Live NOC Monitor
                                </div>
                                <h1 className="bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
                                    ศูนย์ควบคุมเซิร์ฟเวอร์ HOSxP
                                </h1>
                                <p className="mt-2 max-w-xl text-sm text-slate-400">
                                    ตรวจสอบ Ping · MySQL · SNMP แบบเรียลไทม์ — อัปเดตทุก {data.refresh_seconds || 10} วินาที
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="mr-2 flex rounded-xl border border-white/10 bg-slate-900/60 p-1 backdrop-blur">
                                    {ranges.map((r) => (
                                        <button
                                            key={r.value}
                                            type="button"
                                            onClick={() => {
                                                setRange(r.value);
                                                fetchMetrics(r.value);
                                            }}
                                            className={cn(
                                                'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                                                range === r.value
                                                    ? 'bg-cyan-500/20 text-cyan-300 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.3)]'
                                                    : 'text-slate-500 hover:text-slate-300',
                                            )}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchMetrics(range)}
                                    disabled={loading}
                                    className="border-white/10 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"
                                >
                                    <RefreshCw className={cn('mr-1 h-4 w-4', loading && 'animate-spin')} />
                                    รีเฟรช
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleCheckNow}
                                    disabled={checking}
                                    className="border-0 bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-[0_0_24px_rgba(34,211,238,0.25)] hover:from-cyan-400 hover:to-violet-500"
                                >
                                    <Zap className={cn('mr-1 h-4 w-4', checking && 'animate-pulse')} />
                                    สแกนทันที
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative mx-auto max-w-7xl space-y-6 px-6 py-8">
                    {primary && (
                        <>
                            {/* Hero status card */}
                            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur-xl">
                                <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-r opacity-60', statusCfg.glow)} />
                                <div className="relative grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
                                    <div className="flex items-start gap-4">
                                        <div className="relative">
                                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 shadow-inner">
                                                <Server className="h-8 w-8 text-cyan-400" />
                                            </div>
                                            <span className={cn('absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-slate-900', statusCfg.dot)} />
                                        </div>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h2 className="text-xl font-bold text-white">{primary.name}</h2>
                                                <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', statusCfg.badge)}>
                                                    <StatusIcon className="h-3.5 w-3.5" />
                                                    {statusCfg.label}
                                                </span>
                                            </div>
                                            <p className="mt-1 font-mono text-sm text-cyan-400/80">{primary.host}</p>
                                            {primary.latest?.snmp_sys_name && (
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Hostname: <span className="text-slate-400">{primary.latest.snmp_sys_name}</span>
                                                </p>
                                            )}
                                            {primary.latest?.message && (
                                                <p className="mt-3 max-w-2xl rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-xs leading-relaxed text-slate-400">
                                                    {primary.latest.message}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                        <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-center">
                                            <p className="text-[10px] uppercase tracking-widest text-slate-500">Uptime ช่วง</p>
                                            <p className="mt-1 text-2xl font-bold text-white">
                                                {primarySummary?.uptime_percent != null ? `${primarySummary.uptime_percent}%` : '—'}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-center">
                                            <p className="text-[10px] uppercase tracking-widest text-slate-500">Server Up</p>
                                            <p className="mt-1 text-lg font-bold text-cyan-300">
                                                {formatUptime(primary.latest?.snmp_uptime_seconds ?? null)}
                                            </p>
                                        </div>
                                        <div className="col-span-2 rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-center sm:col-span-1">
                                            <p className="text-[10px] uppercase tracking-widest text-slate-500">Samples</p>
                                            <p className="mt-1 text-2xl font-bold text-white">{primarySummary?.samples ?? 0}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Network metrics */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <StatTile
                                    icon={Wifi}
                                    label="Network Ping"
                                    value={primary.latest?.ping_ms != null ? String(primary.latest.ping_ms) : '—'}
                                    unit="ms"
                                    ok={primary.latest?.ping_ok}
                                    okText="ตอบสนองปกติ"
                                    failText="ไม่ตอบสนอง"
                                    accent="from-blue-600/20 to-transparent"
                                />
                                <StatTile
                                    icon={Database}
                                    label="MySQL Latency"
                                    value={primary.latest?.mysql_ms != null ? String(primary.latest.mysql_ms) : '—'}
                                    unit="ms"
                                    ok={primary.latest?.mysql_ok ?? undefined}
                                    okText="เชื่อมต่อได้"
                                    failText="เชื่อมต่อไม่ได้"
                                    accent="from-violet-600/20 to-transparent"
                                >
                                    {primary.latest?.ports?.map((p) => (
                                        <p key={p.port} className="mt-2 text-xs text-slate-500">
                                            <span className={p.open ? 'text-emerald-400' : 'text-red-400'}>
                                                {p.open ? '●' : '○'}
                                            </span>{' '}
                                            {p.label} :{p.port}
                                        </p>
                                    ))}
                                </StatTile>
                            </div>

                            {/* SNMP resource rings */}
                            {primary.latest?.snmp_ok && (
                                <div>
                                    <div className="mb-4 flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-cyan-400" />
                                        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                                            ทรัพยากรระบบ (SNMP)
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <MetricRing
                                            label="CPU Load"
                                            value={primary.latest.cpu_percent}
                                            icon={Cpu}
                                            sublabel="โหลดเฉลี่ยจาก snmpd"
                                        />
                                        <MetricRing
                                            label="Memory"
                                            value={primary.latest.memory_percent}
                                            icon={Activity}
                                            sublabel="หน่วยความจำที่ใช้งาน"
                                        />
                                        <MetricRing
                                            label="Disk /"
                                            value={primary.latest.disk_percent}
                                            icon={HardDrive}
                                            sublabel={primary.latest.snmp_sys_name ?? 'Root partition'}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Charts */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <ChartPanel
                            title="Latency Timeline"
                            description="Ping vs MySQL response time"
                            hasData={chartData.length > 0}
                            empty="ยังไม่มีข้อมูล — กด สแกนทันที หรือรอ scheduler"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <defs>
                                        <linearGradient id="pingGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" />
                                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit=" ms" />
                                    <Tooltip contentStyle={chartTooltipStyle} />
                                    <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                                    <Line
                                        type="monotone"
                                        dataKey="ping_ms"
                                        name="Ping"
                                        stroke="#22d3ee"
                                        strokeWidth={2}
                                        dot={false}
                                        connectNulls
                                        activeDot={{ r: 4, fill: '#22d3ee' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="mysql_ms"
                                        name="MySQL"
                                        stroke="#a78bfa"
                                        strokeWidth={2}
                                        dot={false}
                                        connectNulls
                                        activeDot={{ r: 4, fill: '#a78bfa' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartPanel>

                        <ChartPanel
                            title="Availability"
                            description="สถานะ online / degraded / offline"
                            hasData={chartData.length > 0}
                            empty="ยังไม่มีข้อมูล"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="statusGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                                            <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" />
                                    <YAxis hide domain={[0, 1]} />
                                    <Tooltip
                                        contentStyle={chartTooltipStyle}
                                        formatter={(_v, _n, props) => {
                                            const s = props.payload?.status;
                                            const labels: Record<string, string> = {
                                                online: 'ออนไลน์',
                                                degraded: 'ลดประสิทธิภาพ',
                                                offline: 'ออฟไลน์',
                                            };
                                            return [labels[s] ?? s, 'สถานะ'];
                                        }}
                                    />
                                    <Area
                                        type="stepAfter"
                                        dataKey="status_value"
                                        stroke="#34d399"
                                        fill="url(#statusGrad)"
                                        strokeWidth={2}
                                        name="สถานะ"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartPanel>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/5 bg-slate-900/30 px-5 py-4 text-xs text-slate-500 sm:flex-row">
                        <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                                อัปเดต UI: {lastRefresh.toLocaleTimeString('th-TH')}
                                {primary?.latest?.checked_at && ` · สแกนล่าสุด: ${primary.latest.checked_at}`}
                            </span>
                        </div>
                        <p className="text-center sm:text-right">
                            SNMP จากเซิร์ฟเวอร์ปลายทาง · Disk ที่ <code className="rounded bg-white/5 px-1 text-cyan-400">/</code> · Ping/MySQL จากเซิร์ฟเวอร์แอป
                        </p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
