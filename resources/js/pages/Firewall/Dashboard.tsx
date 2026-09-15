import React, { useCallback, useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import axios from '@/lib/axios';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { QualityPage, Panel, StatCard } from '@/components/quality/quality-ui';
import FirewallSubNav, { firewallBreadcrumbs } from './FirewallSubNav';
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Cpu,
    HardDrive,
    Network,
    Radio,
    RefreshCw,
    Shield,
    Zap,
} from 'lucide-react';

interface Latest {
    cpu_percent: number | null;
    memory_percent: number | null;
    disk_percent: number | null;
    session_count: number | null;
    session6_count: number | null;
    setup_rate: number | null;
    hostname: string | null;
    model: string | null;
    version: string | null;
    serial: string | null;
    health: string;
    checked_at: string | null;
    raw_meta?: { log_disk_status?: string | null } | null;
}

interface DashboardData {
    configured: boolean;
    latest: Latest | null;
    series: Array<{
        time: string;
        ts: string;
        cpu_percent: number | null;
        memory_percent: number | null;
        session_count: number | null;
        setup_rate: number | null;
        health: string;
    }>;
    interfaces: Array<{
        name: string;
        alias: string | null;
        ip: string | null;
        link: boolean;
        speed_mbps: number | null;
        rx_bytes: number;
        tx_bytes: number;
        rx_bps: number | null;
        tx_bps: number | null;
    }>;
    interface_series: Array<{
        name: string;
        points: Array<{ time: string; ts: string; rx_mbps: number | null; tx_mbps: number | null }>;
    }>;
    stats: { denied_web: number; threats: number; ti_hits?: number; risky_ports?: number; samples: number };
    top_devices?: Array<{ device: string; srcip: string | null; total: number }>;
    traffic_log_note: string;
    refresh_seconds: number;
}

interface SyslogStatus {
    enabled: boolean;
    running: boolean;
    pid: number | null;
    listen_host: string;
    listen_port: number;
    traffic_mode: string;
    message: string;
    started_at?: string | null;
    last_heartbeat_at?: string | null;
    stats: {
        recv: number;
        stored: number;
        dup: number;
        skip: number;
        err: number;
        last_from: string | null;
    };
    recent_log: string[];
}

interface Props {
    initial: DashboardData;
    syslogStatus: SyslogStatus;
    ranges: Array<{ value: string; label: string }>;
}

function formatBps(bps: number | null | undefined): string {
    if (bps == null) return '—';
    if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
    if (bps >= 1_000) return `${(bps / 1_000).toFixed(1)} Kbps`;
    return `${bps} bps`;
}

function formatBytes(n: number): string {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} GB`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)} KB`;
    return `${n} B`;
}

export default function FirewallDashboard({ initial, syslogStatus: initialSyslog, ranges }: Props) {
    const [data, setData] = useState<DashboardData>(initial);
    const [range, setRange] = useState('24h');
    const [loading, setLoading] = useState(false);
    const [polling, setPolling] = useState(false);
    const [syslog, setSyslog] = useState<SyslogStatus>(initialSyslog);
    const [syslogBusy, setSyslogBusy] = useState(false);
    const [syslogMsg, setSyslogMsg] = useState<string | null>(null);

    const fetchMetrics = useCallback(async (selectedRange = range) => {
        setLoading(true);
        try {
            const res = await axios.get('/firewall/metrics', { params: { range: selectedRange } });
            setData(res.data);
        } catch {
            // keep previous
        } finally {
            setLoading(false);
        }
    }, [range]);

    const fetchSyslogStatus = useCallback(async () => {
        try {
            const res = await axios.get('/firewall/syslog/status');
            setSyslog(res.data);
        } catch {
            // keep previous
        }
    }, []);

    const handlePollNow = async () => {
        setPolling(true);
        try {
            const res = await axios.post('/firewall/poll-now');
            if (res.data.dashboard) setData(res.data.dashboard);
        } finally {
            setPolling(false);
        }
    };

    const handleSyslogStart = async () => {
        setSyslogBusy(true);
        setSyslogMsg(null);
        try {
            const res = await axios.post('/firewall/syslog/start');
            setSyslog(res.data.status ?? res.data);
            setSyslogMsg(res.data.message ?? 'เปิดตัวรับแล้ว');
        } catch (e: any) {
            const payload = e?.response?.data;
            if (payload?.status) setSyslog(payload.status);
            setSyslogMsg(payload?.message ?? 'เปิดตัวรับไม่สำเร็จ');
        } finally {
            setSyslogBusy(false);
        }
    };

    const handleSyslogStop = async () => {
        setSyslogBusy(true);
        setSyslogMsg(null);
        try {
            const res = await axios.post('/firewall/syslog/stop');
            setSyslog(res.data.status ?? res.data);
            setSyslogMsg(res.data.message ?? 'หยุดตัวรับแล้ว');
        } catch (e: any) {
            const payload = e?.response?.data;
            if (payload?.status) setSyslog(payload.status);
            setSyslogMsg(payload?.message ?? 'หยุดตัวรับไม่สำเร็จ');
        } finally {
            setSyslogBusy(false);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => fetchMetrics(range), (data.refresh_seconds || 30) * 1000);
        return () => clearInterval(interval);
    }, [fetchMetrics, range, data.refresh_seconds]);

    useEffect(() => {
        const interval = setInterval(fetchSyslogStatus, 5000);
        return () => clearInterval(interval);
    }, [fetchSyslogStatus]);

    const latest = data.latest;
    const healthy = latest?.health === 'healthy';
    const topIfaces = [...data.interfaces]
        .filter((i) => i.link)
        .sort((a, b) => (b.rx_bps ?? 0) + (b.tx_bps ?? 0) - ((a.rx_bps ?? 0) + (a.tx_bps ?? 0)))
        .slice(0, 6);
    const primaryIfaceSeries = data.interface_series.find((s) => s.name === topIfaces[0]?.name) ?? data.interface_series[0];

    return (
        <QualityPage
            title="ไฟร์วอลล์ FortiGate"
            subtitle={
                latest
                    ? `${latest.hostname ?? 'FortiGate'} · ${latest.model ?? 'F100'} · อัปเดตทุก ${data.refresh_seconds} วินาที`
                    : 'ยังไม่มีข้อมูล — กดดึงข้อมูลทันทีหรือรอตาราง poll'
            }
            tone="slate"
            icon={Shield}
            breadcrumbs={firewallBreadcrumbs()}
            badge={healthy ? 'Healthy' : latest ? 'Degraded' : 'Waiting'}
            subNav={<FirewallSubNav active="firewall.index" />}
            actions={
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-xl border border-slate-200 bg-white p-1">
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
                                    range === r.value ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800',
                                )}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fetchMetrics(range)} disabled={loading}>
                        <RefreshCw className={cn('mr-1 h-4 w-4', loading && 'animate-spin')} />
                        รีเฟรช
                    </Button>
                    <Button size="sm" onClick={handlePollNow} disabled={polling || !data.configured}>
                        <Zap className={cn('mr-1 h-4 w-4', polling && 'animate-pulse')} />
                        ดึงข้อมูลทันที
                    </Button>
                </div>
            }
        >
            <Head title="ไฟร์วอลล์ FortiGate" />

            <Panel title="ตัวรับ Syslog จาก FortiGate">
                <div className="space-y-4 px-5 pb-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <Radio className={cn('h-4 w-4', syslog.running ? 'text-emerald-600' : 'text-slate-400')} />
                                <span className={cn('text-sm font-semibold', syslog.running ? 'text-emerald-700' : 'text-slate-600')}>
                                    {syslog.running ? 'กำลังรับ log' : 'ยังไม่ทำงาน'}
                                </span>
                                {syslog.pid ? <span className="text-xs text-slate-400">PID {syslog.pid}</span> : null}
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{syslog.message}</p>
                            <p className="mt-1 text-xs text-slate-500">
                                UDP {syslog.listen_host}:{syslog.listen_port} · โหมด traffic: {syslog.traffic_mode}
                                {syslog.last_heartbeat_at ? ` · heartbeat ${syslog.last_heartbeat_at}` : ''}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={handleSyslogStart} disabled={syslogBusy || syslog.running || !syslog.enabled}>
                                เปิดตัวรับ
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleSyslogStop} disabled={syslogBusy || !syslog.running}>
                                หยุด
                            </Button>
                            <Button size="sm" variant="ghost" onClick={fetchSyslogStatus} disabled={syslogBusy}>
                                <RefreshCw className="mr-1 h-4 w-4" />
                                รีเฟรชสถานะ
                            </Button>
                        </div>
                    </div>

                    {syslogMsg && <p className="text-sm text-slate-700">{syslogMsg}</p>}

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">รับแล้ว</div>
                            <div className="text-lg font-semibold text-slate-900">{syslog.stats.recv.toLocaleString()}</div>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">บันทึกใหม่</div>
                            <div className="text-lg font-semibold text-slate-900">{syslog.stats.stored.toLocaleString()}</div>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">ซ้ำ</div>
                            <div className="text-lg font-semibold text-slate-900">{syslog.stats.dup.toLocaleString()}</div>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">ข้าม</div>
                            <div className="text-lg font-semibold text-slate-900">{syslog.stats.skip.toLocaleString()}</div>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">error</div>
                            <div className="text-lg font-semibold text-slate-900">{syslog.stats.err.toLocaleString()}</div>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500">
                        แหล่งล่าสุด: {syslog.stats.last_from || '—'} · ดูรายการในเมนูบันทึกกิจกรรม → ทราฟฟิก
                    </p>

                    {syslog.recent_log?.length > 0 && (
                        <pre className="max-h-40 overflow-auto rounded-xl bg-slate-950 px-3 py-2 text-[11px] leading-relaxed text-slate-100">
                            {syslog.recent_log.join('\n')}
                        </pre>
                    )}
                </div>
            </Panel>

            {!data.configured && (
                <Panel title="ยังไม่ได้ตั้งค่า API">
                    <p className="px-5 pb-5 text-sm text-slate-600">
                        ใส่ <code className="rounded bg-slate-100 px-1">FORTIGATE_HOST</code> และ{' '}
                        <code className="rounded bg-slate-100 px-1">FORTIGATE_API_TOKEN</code> ในไฟล์ .env แล้วรัน{' '}
                        <code className="rounded bg-slate-100 px-1">php artisan fortigate:poll</code>
                    </p>
                </Panel>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard tone="slate" icon={Cpu} label="CPU" value={latest?.cpu_percent != null ? `${latest.cpu_percent}%` : '—'} sub="การใช้โปรเซสเซอร์" />
                <StatCard tone="slate" icon={HardDrive} label="Memory" value={latest?.memory_percent != null ? `${latest.memory_percent}%` : '—'} sub="หน่วยความจำ" />
                <StatCard tone="slate" icon={Network} label="Active Sessions" value={latest?.session_count != null ? latest.session_count.toLocaleString() : '—'} sub={`IPv6 ${latest?.session6_count ?? '—'}`} />
                <StatCard
                    tone="slate"
                    icon={healthy ? CheckCircle2 : AlertTriangle}
                    label="สถานะ"
                    value={latest?.health === 'healthy' ? 'ปกติ' : latest?.health === 'degraded' ? 'โหลดสูง' : '—'}
                    sub={latest?.checked_at ? `ตรวจล่าสุด ${latest.checked_at}` : 'ยังไม่เคย poll'}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard tone="slate" icon={Activity} label="เว็บไม่ควรเข้า" value={String(data.stats.denied_web)} sub="deny / watch / blocked" />
                <StatCard tone="slate" icon={AlertTriangle} label="ภัยคุกคาม" value={String(data.stats.threats)} sub="virus / ips / TI / port" />
                <StatCard tone="slate" icon={Shield} label="ตรง Threat Intel" value={String(data.stats.ti_hits ?? 0)} sub="IOC match" />
                <StatCard tone="slate" icon={Network} label="พอร์ตเสี่ยง" value={String(data.stats.risky_ports ?? 0)} sub="RDP/SMB/DB/Tor…" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="เครื่องที่มีเหตุการณ์บ่อย (ช่วงนี้)">
                    <div className="space-y-2 px-5 pb-5">
                        {(data.top_devices ?? []).length === 0 && (
                            <p className="text-sm text-slate-500">ยังไม่มีเหตุการณ์ deny/threat ในช่วงที่เลือก</p>
                        )}
                        {(data.top_devices ?? []).map((row) => (
                            <div key={`${row.device}-${row.srcip}`} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm">
                                <div>
                                    <div className="font-semibold text-slate-800">{row.device}</div>
                                    <div className="font-mono text-xs text-slate-500">{row.srcip || '—'}</div>
                                </div>
                                <div className="text-sm font-semibold text-slate-700">{row.total}</div>
                            </div>
                        ))}
                    </div>
                </Panel>
                <Panel title="Session setup rate">
                    <div className="px-5 pb-5">
                        <div className="text-3xl font-semibold text-slate-900">{latest?.setup_rate != null ? String(latest.setup_rate) : '—'}</div>
                        <p className="mt-2 text-sm text-slate-500">sessions/sec · ใช้ดูภาระ firewall</p>
                    </div>
                </Panel>
            </div>

            <Panel title="CPU · Memory · Sessions">
                <div className="h-72 px-5 pb-5">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.series}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="cpu_percent" name="CPU %" stroke="#0f172a" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="memory_percent" name="Memory %" stroke="#64748b" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="session_count" name="Sessions" stroke="#38bdf8" strokeWidth={2} dot={false} yAxisId={0} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Bandwidth ตาม Interface (ลิงก์ขึ้น)">
                    <div className="space-y-2 px-5 pb-3">
                        {topIfaces.length === 0 && <p className="text-sm text-slate-500">ยังไม่มีข้อมูล interface</p>}
                        {topIfaces.map((iface) => (
                            <div key={iface.name} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm">
                                <div>
                                    <div className="font-semibold text-slate-800">{iface.name}{iface.alias ? ` (${iface.alias})` : ''}</div>
                                    <div className="text-xs text-slate-500">{iface.ip || '—'} · {iface.speed_mbps ? `${iface.speed_mbps} Mbps` : 'speed n/a'}</div>
                                </div>
                                <div className="text-right text-xs text-slate-600">
                                    <div>↓ {formatBps(iface.rx_bps)}</div>
                                    <div>↑ {formatBps(iface.tx_bps)}</div>
                                    <div className="text-[10px] text-slate-400">{formatBytes(iface.rx_bytes)} / {formatBytes(iface.tx_bytes)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="px-5 pb-5 text-xs text-slate-500">{data.traffic_log_note}</p>
                </Panel>

                <Panel title={primaryIfaceSeries ? `ทราฟฟิก ${primaryIfaceSeries.name}` : 'ทราฟฟิก Interface'}>
                    <div className="h-64 px-5 pb-5">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={primaryIfaceSeries?.points ?? []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="rx_mbps" name="RX Mbps" stroke="#0284c7" fill="#bae6fd" />
                                <Area type="monotone" dataKey="tx_mbps" name="TX Mbps" stroke="#334155" fill="#cbd5e1" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>
            </div>
        </QualityPage>
    );
}
