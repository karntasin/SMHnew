import { FormEvent, useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Radar } from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import FirewallSubNav, { firewallBreadcrumbs } from './FirewallSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import FirewallDeviceCell, { type ItAssetRef } from './FirewallDeviceCell';

interface HitRow {
    id: number;
    logged_at: string | null;
    device_name: string | null;
    src_user?: string | null;
    src_mac?: string | null;
    srcip: string | null;
    hostname: string | null;
    dstip: string | null;
    ti_feed: string | null;
    ti_indicator: string | null;
    ti_threat_type: string | null;
    alerted: boolean;
    it_asset?: ItAssetRef | null;
}

interface Props {
    intel: {
        enabled: boolean;
        abusech_configured: boolean;
        phishtank_configured: boolean;
        totals: {
            indicators: number;
            by_feed: Record<string, Record<string, number>>;
        };
        risky_ports: Array<{ port: number; name: string; risk: string; note: string | null }>;
        latest_runs: Array<{
            feed: string;
            status: string;
            fetched: number;
            upserted: number;
            message: string | null;
            started_at: string | null;
        }>;
        custom_indicators: Array<{
            id: number;
            feed: string;
            type: string;
            value: string;
            threat_type: string | null;
            updated_at: string | null;
        }>;
        feeds: Array<{
            key: string;
            label: string;
            enabled: boolean;
            requires_auth: string | boolean;
        }>;
    };
    hits: {
        data: HitRow[];
        total: number;
        page: number;
        last_page: number;
    };
}

export default function ThreatIntel({ intel, hits }: Props) {
    const form = useForm({
        type: 'domain',
        value: '',
        threat_type: 'custom-blacklist',
    });
    const [syncing, setSyncing] = useState(false);

    const submitCustom = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('firewall.threat-intel.custom.store'), { preserveScroll: true, onSuccess: () => form.reset('value') });
    };

    const syncAll = () => {
        setSyncing(true);
        router.post(route('firewall.threat-intel.sync'), {}, {
            preserveScroll: true,
            onFinish: () => setSyncing(false),
        });
    };

    return (
        <QualityPage
            title="Threat Intelligence"
            subtitle="Open-source feeds · ข้อมูลไทย/Custom blacklist · พอร์ตเสี่ยง — จับคู่กับ log FortiGate อัตโนมัติ"
            tone="slate"
            icon={Radar}
            breadcrumbs={firewallBreadcrumbs({ title: 'Threat Intelligence', href: route('firewall.threat-intel') })}
            badge={`${intel.totals.indicators} IOC`}
            subNav={<FirewallSubNav active="firewall.threat-intel" />}
            actions={
                <Button onClick={syncAll} disabled={syncing}>
                    {syncing ? 'กำลังซิงก์…' : 'ซิงก์ Feeds ตอนนี้'}
                </Button>
            }
        >
            <Head title="Threat Intelligence — FortiGate" />

            {!intel.abusech_configured && (
                <Panel title="ตั้งค่า abuse.ch (แนะนำ)">
                    <p className="px-5 pb-5 text-sm text-slate-600">
                        URLhaus / ThreatFox ต้องใช้ Auth-Key ฟรีจาก{' '}
                        <a className="underline" href="https://auth.abuse.ch/" target="_blank" rel="noreferrer">auth.abuse.ch</a>
                        {' '}แล้วใส่ใน <code className="rounded bg-slate-100 px-1">ABUSECH_AUTH_KEY</code> ในไฟล์ .env
                        — Feodo / Blocklist.de / Spamhaus / OpenPhish ใช้งานได้ทันทีโดยไม่ต้องมีคีย์
                    </p>
                </Panel>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
                <Panel title="สรุป IOC">
                    <div className="px-5 pb-5">
                        <div className="text-3xl font-semibold text-slate-900">{intel.totals.indicators.toLocaleString()}</div>
                        <div className="mt-3 space-y-1 text-xs text-slate-600">
                            {Object.entries(intel.totals.by_feed).map(([feed, types]) => (
                                <div key={feed} className="flex justify-between gap-2">
                                    <span className="font-medium">{feed}</span>
                                    <span>{Object.entries(types).map(([t, n]) => `${t}:${n}`).join(' · ')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Panel>
                <Panel title="Feeds">
                    <div className="space-y-2 px-5 pb-5">
                        {intel.feeds.map((f) => (
                            <div key={f.key} className="flex items-center justify-between gap-2 text-sm">
                                <span>{f.label}</span>
                                <StatusPill
                                    label={f.enabled ? (f.requires_auth === 'abusech' && !intel.abusech_configured ? 'รอ Auth' : 'เปิด') : 'ปิด'}
                                    className={f.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}
                                />
                            </div>
                        ))}
                    </div>
                </Panel>
                <Panel title="พอร์ตเฝ้าระวัง">
                    <div className="max-h-56 space-y-1 overflow-y-auto px-5 pb-5 text-xs">
                        {intel.risky_ports.map((p) => (
                            <div key={p.port} className="flex justify-between gap-2 border-b border-slate-50 py-1">
                                <span className="font-mono">{p.port}/{p.name}</span>
                                <span className="text-slate-500">{p.risk} — {p.note}</span>
                            </div>
                        ))}
                    </div>
                </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Custom / Thai blacklist">
                    <form onSubmit={submitCustom} className="grid gap-3 px-5 pb-4 sm:grid-cols-4">
                        <select
                            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                            value={form.data.type}
                            onChange={(e) => form.setData('type', e.target.value)}
                        >
                            <option value="domain">Domain</option>
                            <option value="ip">IP</option>
                            <option value="url">URL</option>
                            <option value="cidr">CIDR</option>
                        </select>
                        <Input
                            className="sm:col-span-2"
                            placeholder="เช่น gambling-site.com"
                            value={form.data.value}
                            onChange={(e) => form.setData('value', e.target.value)}
                        />
                        <Button type="submit" disabled={form.processing}>เพิ่ม</Button>
                    </form>
                    <div className="max-h-64 overflow-y-auto px-2 pb-4">
                        <table className="min-w-full text-left text-sm">
                            <thead className="text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-3 py-2">Feed</th>
                                    <th className="px-3 py-2">ค่า</th>
                                    <th className="px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {intel.custom_indicators.map((row) => (
                                    <tr key={row.id} className="border-b border-slate-100">
                                        <td className="px-3 py-2 text-xs">{row.feed}/{row.type}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{row.value}</td>
                                        <td className="px-3 py-2 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => router.delete(route('firewall.threat-intel.custom.destroy', row.id), { preserveScroll: true })}
                                            >
                                                ลบ
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {intel.custom_indicators.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-3 py-6 text-center text-slate-500">ยังไม่มีรายการ</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Panel>

                <Panel title="ประวัติการซิงก์">
                    <div className="max-h-80 overflow-y-auto px-2 pb-4">
                        <table className="min-w-full text-left text-sm">
                            <thead className="text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-3 py-2">เวลา</th>
                                    <th className="px-3 py-2">Feed</th>
                                    <th className="px-3 py-2">ผล</th>
                                </tr>
                            </thead>
                            <tbody>
                                {intel.latest_runs.map((run, idx) => (
                                    <tr key={`${run.feed}-${run.started_at}-${idx}`} className="border-b border-slate-100 align-top">
                                        <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">{run.started_at ?? '—'}</td>
                                        <td className="px-3 py-2 text-xs font-medium">{run.feed}</td>
                                        <td className="px-3 py-2 text-xs">
                                            <StatusPill
                                                label={run.status}
                                                className={
                                                    run.status === 'ok'
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                        : run.status === 'skipped'
                                                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                                                            : 'border-rose-200 bg-rose-50 text-rose-700'
                                                }
                                            />
                                            <div className="mt-1 text-slate-500">+{run.upserted} / fetch {run.fetched}</div>
                                            {run.message && <div className="text-slate-400">{run.message}</div>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            </div>

            <Panel title={`เหตุการณ์ที่ตรง IOC (${hits.total})`}>
                <div className="overflow-x-auto px-2 pb-4">
                    <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-3 py-2">เวลา</th>
                                <th className="px-3 py-2">เครื่อง</th>
                                <th className="px-3 py-2">Feed / IOC</th>
                                <th className="px-3 py-2">เป้าหมาย</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hits.data.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">ยังไม่พบการจับคู่ IOC กับ traffic</td>
                                </tr>
                            )}
                            {hits.data.map((row) => (
                                <tr key={row.id} className="border-b border-slate-100 align-top">
                                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">{row.logged_at ?? '—'}</td>
                                    <td className="px-3 py-2">
                                        <FirewallDeviceCell row={row} />
                                    </td>
                                    <td className="px-3 py-2 text-xs">
                                        <div className="font-medium text-violet-700">{row.ti_feed}</div>
                                        <div className="truncate font-mono">{row.ti_indicator}</div>
                                        <div className="text-slate-500">{row.ti_threat_type}</div>
                                    </td>
                                    <td className="px-3 py-2 text-xs">{row.hostname || row.dstip || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Panel>
        </QualityPage>
    );
}
