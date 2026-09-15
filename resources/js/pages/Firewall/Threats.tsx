import { Head, router } from '@inertiajs/react';
import { ShieldAlert } from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import FirewallSubNav, { firewallBreadcrumbs } from './FirewallSubNav';
import FirewallDeviceCell, { type ItAssetRef } from './FirewallDeviceCell';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LogRow {
    id: number;
    log_type: string;
    logged_at: string | null;
    action: string | null;
    srcip: string | null;
    device_name: string | null;
    src_user: string | null;
    src_mac: string | null;
    dstip: string | null;
    dst_port: number | null;
    virus: string | null;
    attack: string | null;
    url: string | null;
    msg: string | null;
    alerted: boolean;
    level: string | null;
    is_ti_hit: boolean;
    is_risky_port: boolean;
    ti_feed: string | null;
    ti_indicator: string | null;
    ti_threat_type: string | null;
    it_asset?: ItAssetRef | null;
}

interface Props {
    logs: {
        data: LogRow[];
        total: number;
        page: number;
        last_page: number;
    };
    scope: string;
}

const scopes = [
    { value: 'threats', label: 'ทั้งหมด' },
    { value: 'ti-hits', label: 'Threat Intel' },
    { value: 'risky-ports', label: 'พอร์ตเสี่ยง' },
];

export default function Threats({ logs, scope }: Props) {
    return (
        <QualityPage
            title="ภัยคุกคาม"
            subtitle="เฝ้าระวัง virus / IPS / Threat Intel / พอร์ตเสี่ยง — แสดงชื่อเครื่องที่พบเหตุการณ์"
            tone="slate"
            icon={ShieldAlert}
            breadcrumbs={firewallBreadcrumbs({ title: 'ภัยคุกคาม', href: route('firewall.threats') })}
            badge={`${logs.total} รายการ`}
            subNav={<FirewallSubNav active="firewall.threats" />}
        >
            <Head title="ภัยคุกคาม — FortiGate" />

            <div className="flex flex-wrap gap-2">
                {scopes.map((s) => (
                    <button
                        key={s.value}
                        type="button"
                        onClick={() => router.get(route('firewall.threats'), { scope: s.value }, { preserveState: true })}
                        className={cn(
                            'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                            scope === s.value
                                ? 'border-slate-800 bg-slate-800 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                        )}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            <Panel title="เหตุการณ์ความปลอดภัย">
                <div className="overflow-x-auto px-2 pb-4">
                    <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-3 py-2">เวลา</th>
                                <th className="px-3 py-2">เครื่อง</th>
                                <th className="px-3 py-2">ประเภท</th>
                                <th className="px-3 py-2">แหล่ง → ปลายทาง</th>
                                <th className="px-3 py-2">รายละเอียด</th>
                                <th className="px-3 py-2">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500">ยังไม่พบบันทึกภัยคุกคาม</td>
                                </tr>
                            )}
                            {logs.data.map((row) => (
                                <tr key={row.id} className="border-b border-slate-100 align-top">
                                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">{row.logged_at ?? '—'}</td>
                                    <td className="px-3 py-2">
                                        <FirewallDeviceCell row={row} />
                                    </td>
                                    <td className="px-3 py-2">
                                        <StatusPill label={row.log_type} className="border-rose-200 bg-rose-50 text-rose-700" />
                                        <div className="mt-1 flex flex-col gap-1">
                                            {row.is_ti_hit && (
                                                <StatusPill label={row.ti_feed || 'TI'} className="border-violet-200 bg-violet-50 text-violet-700" />
                                            )}
                                            {row.is_risky_port && (
                                                <StatusPill label={`Port ${row.dst_port ?? '?'}`} className="border-orange-200 bg-orange-50 text-orange-800" />
                                            )}
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500">{row.level ?? ''}</div>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-xs">
                                        <div>{row.srcip ?? '—'}</div>
                                        <div className="text-slate-400">→ {row.dstip ?? '—'}{row.dst_port ? `:${row.dst_port}` : ''}</div>
                                    </td>
                                    <td className="max-w-md px-3 py-2 text-xs text-slate-700">
                                        <div className="font-medium">{row.virus || row.attack || row.ti_threat_type || '—'}</div>
                                        {row.ti_indicator && (
                                            <div className="truncate text-violet-700">IOC: {row.ti_indicator}</div>
                                        )}
                                        <div className="truncate text-slate-500">{row.url || ''}</div>
                                        <div>{row.msg ?? ''}</div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="text-xs">{row.action ?? '—'}</div>
                                        {row.alerted && (
                                            <StatusPill label="แจ้งแล้ว" className="border-slate-200 bg-slate-50 text-slate-600" />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {logs.last_page > 1 && (
                    <div className="flex items-center justify-between px-5 pb-5">
                        <span className="text-xs text-slate-500">หน้า {logs.page} / {logs.last_page}</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled={logs.page <= 1} onClick={() => router.get(route('firewall.threats'), { scope, page: logs.page - 1 }, { preserveState: true })}>ก่อนหน้า</Button>
                            <Button variant="outline" size="sm" disabled={logs.page >= logs.last_page} onClick={() => router.get(route('firewall.threats'), { scope, page: logs.page + 1 }, { preserveState: true })}>ถัดไป</Button>
                        </div>
                    </div>
                )}
            </Panel>
        </QualityPage>
    );
}
