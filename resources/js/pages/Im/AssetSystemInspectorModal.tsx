import React, { useEffect, useState } from 'react';
import { Modal } from '@/pages/Im/ui';
import { Button } from '@/components/ui/button';
import {
    Activity, Cpu, HardDrive, Network, Layers, Monitor,
    Clock, RefreshCw, Zap, ShieldCheck, UserCheck, CheckCircle2,
    XCircle, Server
} from 'lucide-react';
import axios from 'axios';

interface Props {
    open: boolean;
    onClose: () => void;
    asset: any;
}

type InspectorTab = 'live' | 'cpu' | 'memory' | 'mainboard' | 'storage' | 'network';

export default function AssetSystemInspectorModal({ open, onClose, asset }: Props) {
    const [tab, setTab] = useState<InspectorTab>('live');
    const [liveData, setLiveData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Initial spec from asset prop or updated liveData
    const spec = liveData?.spec || asset?.system_spec;

    const fetchLive = async () => {
        if (!asset?.id) return;
        try {
            const res = await axios.get(`/im/resource/assets/${asset.id}/live`);
            setLiveData(res.data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Failed to fetch live stats', err);
        }
    };

    // Auto-polling when modal is open
    useEffect(() => {
        if (!open || !asset?.id) {
            setLiveData(null);
            return;
        }

        setLoading(true);
        fetchLive().finally(() => setLoading(false));

        const interval = setInterval(fetchLive, 3000);
        return () => clearInterval(interval);
    }, [open, asset?.id]);

    if (!asset) return null;

    const isOnline = liveData?.online ?? false;
    const pingMs = liveData?.ping_ms;
    const liveStats = liveData?.live_stats;

    // CPU calculations
    const cpuDetails = spec?.cpu_details || {};
    const memSlots: any[] = Array.isArray(spec?.memory_details) ? spec.memory_details : [];
    const motherboard = spec?.motherboard_details || {};
    const diskDetails = spec?.disk_details || {};
    const physicalDisks: any[] = Array.isArray(diskDetails.physical) ? diskDetails.physical : [];
    const partitions: any[] = Array.isArray(diskDetails.partitions) ? diskDetails.partitions : [];
    const gpus: any[] = Array.isArray(spec?.gpu_details) ? spec.gpu_details : [];
    const netDetails = spec?.network_details || {};
    const adapters: any[] = Array.isArray(netDetails.adapters) ? netDetails.adapters : [];

    // Helper for gauge colors
    const getProgressColor = (pct: number) => {
        if (pct < 60) return 'bg-emerald-500';
        if (pct < 85) return 'bg-amber-500';
        return 'bg-rose-500';
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`ข้อมูลเครื่องคอมพิวเตอร์แบบละเอียด (CPU-Z & Real-Time)`}
            extraWide
            footer={
                <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-sky-500' : ''}`} />
                        <span>อัปเดตสดอัตโนมัติทุก 3 วินาที (ไม่บันทึก Log ลงฐานข้อมูล)</span>
                        {lastUpdated && <span>· ล่าสุด {lastUpdated.toLocaleTimeString('th-TH')}</span>}
                    </div>
                    <Button variant="outline" className="rounded-xl" onClick={onClose}>
                        ปิดหน้าต่าง
                    </Button>
                </div>
            }
        >
            <div className="space-y-5">
                {/* Header Summary Card */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-md">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30">
                                <Monitor className="h-5 w-5" />
                            </span>
                            <div>
                                <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                                    <span>{spec?.hostname || asset.name}</span>
                                    {spec?.brand && <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">{spec.brand} {spec.model || ''}</span>}
                                </h3>
                                <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                                    <span>IP: <b className="text-slate-200 font-mono">{spec?.ip_address || '-'}</b></span>
                                    <span>·</span>
                                    <span>Subnet: <b className="text-slate-200 font-mono">{spec?.subnet_mask || '-'}</b></span>
                                    <span>·</span>
                                    <span>MAC: <b className="text-slate-200 font-mono">{spec?.mac_address || asset.mac_address || '-'}</b></span>
                                    {spec?.serial_number && (
                                        <>
                                            <span>·</span>
                                            <span>S/N: <b className="text-sky-300 font-mono">{spec.serial_number}</b></span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Live Ping & Online Status Badge */}
                        <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 border text-xs font-semibold ${isOnline ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                            <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400' : 'bg-slate-500'}`} />
                            <span>{isOnline ? 'ออนไลน์ (Online)' : 'ออฟไลน์ (Offline)'}</span>
                            {isOnline && pingMs !== null && pingMs !== undefined && (
                                <span className="rounded bg-emerald-900/80 px-1.5 py-0.2 font-mono text-[10px] text-emerald-200 border border-emerald-700/50">
                                    {pingMs} ms
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-2">
                    {[
                        { key: 'live', label: 'สถานะสด Real-Time', icon: Activity },
                        { key: 'cpu', label: 'ซีพียู (CPU-Z)', icon: Cpu },
                        { key: 'memory', label: 'หน่วยความจำ (RAM Slots)', icon: Layers },
                        { key: 'mainboard', label: 'เมนบอร์ด & BIOS', icon: Server },
                        { key: 'storage', label: 'ดิสก์ & การ์ดจอ', icon: HardDrive },
                        { key: 'network', label: 'เครือข่าย & IP', icon: Network },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key as InspectorTab)}
                            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                                tab === key
                                    ? 'bg-sky-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>

                {/* TAB 1: REAL-TIME MONITOR */}
                {tab === 'live' && (
                    <div className="space-y-4">
                        {/* 4 Live Gauges / Cards */}
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {/* CPU Load Gauge */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                        <Cpu className="h-4 w-4 text-sky-600" /> CPU Load
                                    </span>
                                    <span className="font-bold text-slate-900 text-sm">
                                        {liveStats?.cpu_load_percent ?? 0}%
                                    </span>
                                </div>
                                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={`h-full transition-all duration-500 ${getProgressColor(liveStats?.cpu_load_percent ?? 0)}`}
                                        style={{ width: `${Math.min(liveStats?.cpu_load_percent ?? 0, 100)}%` }}
                                    />
                                </div>
                                <div className="mt-2 text-[11px] text-slate-400 truncate">
                                    {spec?.cpu_name || 'Processor'}
                                </div>
                            </div>

                            {/* Memory Usage Gauge */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                        <Layers className="h-4 w-4 text-violet-600" /> RAM Usage
                                    </span>
                                    <span className="font-bold text-slate-900 text-sm">
                                        {liveStats?.memory_usage_percent ?? 0}%
                                    </span>
                                </div>
                                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={`h-full transition-all duration-500 ${getProgressColor(liveStats?.memory_usage_percent ?? 0)}`}
                                        style={{ width: `${Math.min(liveStats?.memory_usage_percent ?? 0, 100)}%` }}
                                    />
                                </div>
                                <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
                                    <span>ใช้ {liveStats?.memory_used_gb ?? '-'} GB</span>
                                    <span>จาก {spec?.ram_total_gb ?? '-'} GB</span>
                                </div>
                            </div>

                            {/* Drive C: Free Gauge */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                        <HardDrive className="h-4 w-4 text-amber-600" /> Drive C:
                                    </span>
                                    <span className="font-bold text-slate-900 text-sm">
                                        ว่าง {liveStats?.c_drive_free_gb ?? '-'} GB
                                    </span>
                                </div>
                                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    {liveStats?.c_drive_total_gb ? (
                                        <div
                                            className="h-full bg-sky-500 transition-all duration-500"
                                            style={{
                                                width: `${Math.round(((liveStats.c_drive_total_gb - liveStats.c_drive_free_gb) / liveStats.c_drive_total_gb) * 100)}%`
                                            }}
                                        />
                                    ) : (
                                        <div className="h-full w-0 bg-slate-200" />
                                    )}
                                </div>
                                <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
                                    <span>ขนาดทั้งหมด</span>
                                    <span>{liveStats?.c_drive_total_gb ?? '-'} GB</span>
                                </div>
                            </div>

                            {/* Uptime & User Card */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                        <Clock className="h-4 w-4 text-emerald-600" /> Uptime
                                    </span>
                                </div>
                                <div className="mt-1 text-base font-bold text-slate-900">
                                    {liveStats?.uptime_string || '-'}
                                </div>
                                <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1 truncate">
                                    <UserCheck className="h-3 w-3 text-slate-400 shrink-0" />
                                    <span className="truncate">ผู้ใช้: {spec?.logged_user || asset.assigned_user || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Top Active Processes Table */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Zap className="h-4 w-4 text-amber-500" />
                                <span>โปรเซสที่ใช้ซีพียูสูงสุด ณ ปัจจุบัน (Top 5 Processes)</span>
                            </h4>
                            {liveStats?.top_processes && liveStats.top_processes.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-slate-400 text-left">
                                                <th className="py-1.5 font-medium">ชื่อโปรเซส (Process Name)</th>
                                                <th className="py-1.5 font-medium text-right">CPU Time (s)</th>
                                                <th className="py-1.5 font-medium text-right">RAM Working Set</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {liveStats.top_processes.map((proc: any, i: number) => (
                                                <tr key={i} className="hover:bg-slate-50/50">
                                                    <td className="py-1.5 font-mono font-medium text-slate-800">{proc.name}</td>
                                                    <td className="py-1.5 text-right font-mono text-slate-600">{proc.cpu_seconds} s</td>
                                                    <td className="py-1.5 text-right font-mono text-slate-600">{proc.memory_mb} MB</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="py-6 text-center text-xs text-slate-400">
                                    {isOnline ? 'กำลังรอข้อมูลโปรเซสจาก Agent...' : 'เครื่องออฟไลน์หรือไม่สามารถติดต่อ Agent ได้ในขณะนี้'}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: CPU (CPU-Z DETAILS) */}
                {tab === 'cpu' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Cpu className="h-5 w-5 text-sky-600" />
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">ข้อมูลหน่วยประมวลผล (Processor / CPU-Z Specs)</h4>
                                <p className="text-xs text-slate-400">ข้อมูลสถาปัตยกรรมและโครงสร้างซีพียูจากระบบปฏิบัติการ</p>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">Processor Name</span>
                                <div className="font-bold text-slate-900 text-sm">{cpuDetails.name || spec?.cpu_name || '-'}</div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">Manufacturer</span>
                                <div className="font-bold text-slate-900 text-sm">{cpuDetails.manufacturer || '-'}</div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">Cores / Threads</span>
                                <div className="font-bold text-slate-900 text-sm font-mono">
                                    {cpuDetails.cores ?? '-'} Cores / {cpuDetails.threads ?? '-'} Threads
                                </div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">Max Clock Speed</span>
                                <div className="font-bold text-slate-900 text-sm font-mono">
                                    {cpuDetails.max_clock_mhz ? `${cpuDetails.max_clock_mhz} MHz (${(cpuDetails.max_clock_mhz / 1000).toFixed(2)} GHz)` : '-'}
                                </div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">Socket / Package</span>
                                <div className="font-bold text-slate-900 text-sm">{cpuDetails.socket || '-'}</div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">Architecture</span>
                                <div className="font-bold text-slate-900 text-sm font-mono">{cpuDetails.architecture || 'x64'}</div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">L2 Cache</span>
                                <div className="font-bold text-slate-900 text-sm font-mono">
                                    {cpuDetails.l2_cache_kb ? `${(cpuDetails.l2_cache_kb / 1024).toFixed(1)} MB (${cpuDetails.l2_cache_kb} KB)` : '-'}
                                </div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">L3 Cache</span>
                                <div className="font-bold text-slate-900 text-sm font-mono">
                                    {cpuDetails.l3_cache_kb ? `${(cpuDetails.l3_cache_kb / 1024).toFixed(1)} MB (${cpuDetails.l3_cache_kb} KB)` : '-'}
                                </div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">Operating System</span>
                                <div className="font-bold text-slate-900 text-sm">{spec?.os_name || '-'}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: MEMORY (RAM SLOTS) */}
                {tab === 'memory' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <Layers className="h-5 w-5 text-violet-600" />
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">หน่วยความจำหลัก (Physical Memory / RAM Slots)</h4>
                                    <p className="text-xs text-slate-400">รายละเอียดแต่ละช่องสล็อตและชนิดแรมที่ติดตั้งอยู่</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-slate-400">ขนาดรวมทั้งหมด:</span>
                                <div className="text-base font-bold text-violet-700 font-mono">
                                    {spec?.ram_total_gb ? `${spec.ram_total_gb} GB` : '-'}
                                </div>
                            </div>
                        </div>

                        {memSlots.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50 text-slate-600 text-left">
                                            <th className="py-2.5 px-3 font-semibold">ช่องติดตั้ง (Slot)</th>
                                            <th className="py-2.5 px-3 font-semibold">ความจุ (Size)</th>
                                            <th className="py-2.5 px-3 font-semibold">ชนิด (Type)</th>
                                            <th className="py-2.5 px-3 font-semibold">ความเร็ว (Speed)</th>
                                            <th className="py-2.5 px-3 font-semibold">ผู้ผลิต (Brand)</th>
                                            <th className="py-2.5 px-3 font-semibold">Part Number</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {memSlots.map((slot: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50/60">
                                                <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                                    {slot.slot || `Slot #${idx + 1}`}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono font-bold text-violet-700">
                                                    {slot.capacity_gb} GB
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className="rounded bg-violet-100 px-2 py-0.5 font-semibold text-violet-800 text-[10px]">
                                                        {slot.memory_type || 'DDR'}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 font-mono text-slate-700">
                                                    {slot.speed_mhz ? `${slot.speed_mhz} MHz` : '-'}
                                                </td>
                                                <td className="py-2.5 px-3 font-medium text-slate-800">
                                                    {slot.manufacturer || 'Unknown'}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono text-slate-500">
                                                    {slot.part_number || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-6 text-center text-xs text-slate-400">
                                ไม่พบข้อมูลรายละเอียดสล็อตแรม (ขนาดความจุรวม: {spec?.ram_total_gb ?? '-'} GB)
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: MAINBOARD & BIOS */}
                {tab === 'mainboard' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Server className="h-5 w-5 text-indigo-600" />
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">เมนบอร์ดและไบออส (Motherboard & BIOS)</h4>
                                <p className="text-xs text-slate-400">ข้อมูลผู้ผลิตบอร์ด รุ่น และเวอร์ชันของ BIOS</p>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">Motherboard Manufacturer</span>
                                <div className="font-bold text-slate-900 text-sm">{motherboard.manufacturer || spec?.brand || '-'}</div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">Motherboard Model</span>
                                <div className="font-bold text-slate-900 text-sm">{motherboard.model || spec?.model || '-'}</div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">Motherboard Serial</span>
                                <div className="font-bold text-slate-900 text-sm font-mono">{motherboard.serial || '-'}</div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">System Serial / Service Tag</span>
                                <div className="font-bold text-sky-700 text-sm font-mono">{spec?.serial_number || '-'}</div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">BIOS Version</span>
                                <div className="font-bold text-slate-900 text-sm font-mono">{motherboard.bios_version || '-'}</div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">BIOS Release Date</span>
                                <div className="font-bold text-slate-900 text-sm font-mono">{motherboard.bios_date || '-'}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 5: STORAGE & GPU */}
                {tab === 'storage' && (
                    <div className="space-y-4">
                        {/* Physical Disks */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <HardDrive className="h-4 w-4 text-amber-600" />
                                <span>ฮาร์ดดิสก์และอุปกรณ์จัดเก็บข้อมูล (Physical Drives)</span>
                            </h4>
                            {physicalDisks.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50 text-slate-600 text-left">
                                                <th className="py-2 px-3 font-semibold">รุ่นอุปกรณ์ (Model)</th>
                                                <th className="py-2 px-3 font-semibold">Interface</th>
                                                <th className="py-2 px-3 font-semibold">ชนิด (Media)</th>
                                                <th className="py-2 px-3 font-semibold text-right">ความจุ (Size)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {physicalDisks.map((d: any, idx: number) => (
                                                <tr key={idx}>
                                                    <td className="py-2 px-3 font-medium text-slate-800">{d.model}</td>
                                                    <td className="py-2 px-3 font-mono text-slate-600">{d.interface || '-'}</td>
                                                    <td className="py-2 px-3 text-slate-600">{d.media_type || 'Disk'}</td>
                                                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">{d.size_gb} GB</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 py-2">ไม่มีข้อมูลฮาร์ดดิสก์ทางกายภาพ</div>
                            )}
                        </div>

                        {/* Logical Volumes */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <Layers className="h-4 w-4 text-sky-600" />
                                <span>พาร์ติชันไดรฟ์ (Logical Volumes)</span>
                            </h4>
                            {partitions.length > 0 ? (
                                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                                    {partitions.map((vol: any, idx: number) => (
                                        <div key={idx} className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-slate-900 text-sm font-mono">{vol.drive} {vol.label ? `(${vol.label})` : ''}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">{vol.file_system}</span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                                <div
                                                    className="h-full bg-sky-600"
                                                    style={{ width: `${vol.used_percent || 0}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[11px] text-slate-500">
                                                <span>ว่าง {vol.free_gb} GB</span>
                                                <span>รวม {vol.total_gb} GB</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 py-2">ไม่มีข้อมูลพาร์ติชัน</div>
                            )}
                        </div>

                        {/* Graphics (GPU) */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <Monitor className="h-4 w-4 text-emerald-600" />
                                <span>การ์ดจอแสดงผล (Graphics Cards / GPU)</span>
                            </h4>
                            {gpus.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {gpus.map((gpu: any, idx: number) => (
                                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                                            <div>
                                                <div className="font-bold text-slate-800">{gpu.name}</div>
                                                <div className="text-slate-400 text-[11px]">เวอร์ชันไดรเวอร์: {gpu.driver_version || '-'}</div>
                                            </div>
                                            {gpu.vram_mb > 0 && (
                                                <div className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                                    VRAM {gpu.vram_mb} MB ({Math.round(gpu.vram_mb / 1024)} GB)
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 py-2">ไม่พบข้อมูลการ์ดจอ</div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 6: NETWORK & IP */}
                {tab === 'network' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Network className="h-5 w-5 text-cyan-600" />
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">การเชื่อมต่อเครือข่ายและที่อยู่ IP (Network Config)</h4>
                                <p className="text-xs text-slate-400">การตั้งค่า IP Address, Subnet Mask, Gateway และ DNS</p>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">IPv4 Address</span>
                                <div className="font-bold text-cyan-800 text-sm font-mono">{spec?.ip_address || '-'}</div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">Subnet Mask</span>
                                <div className="font-bold text-slate-900 text-sm font-mono">{spec?.subnet_mask || '-'}</div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">Default Gateway</span>
                                <div className="font-bold text-slate-900 text-sm font-mono">{spec?.gateway || '-'}</div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">MAC Address</span>
                                <div className="font-bold text-slate-900 text-sm font-mono">{spec?.mac_address || asset.mac_address || '-'}</div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">Hostname / Computer Name</span>
                                <div className="font-bold text-slate-900 text-sm font-mono">{spec?.hostname || asset.name}</div>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <span className="text-[11px] font-medium text-slate-400">Agent Version</span>
                                <div className="font-bold text-slate-900 text-sm font-mono">{spec?.agent_version || '1.0.0'}</div>
                            </div>
                        </div>

                        {/* Adapters list */}
                        {adapters.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <h5 className="text-xs font-bold text-slate-700">การ์ดเครือข่ายที่เปิดใช้งาน (Enabled Adapters)</h5>
                                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 p-2">
                                    {adapters.map((ad: any, idx: number) => (
                                        <div key={idx} className="p-2 text-xs flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <div className="font-semibold text-slate-800">{ad.description}</div>
                                                <div className="text-slate-400 font-mono text-[11px]">MAC: {ad.mac}</div>
                                            </div>
                                            <div className="text-right font-mono">
                                                <div className="font-bold text-slate-700">{ad.ip || '-'}</div>
                                                <div className="text-[10px] text-slate-400">DHCP: {ad.dhcp ? 'เปิด' : 'ปิด'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
