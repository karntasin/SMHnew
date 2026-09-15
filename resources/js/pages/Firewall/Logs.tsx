import { Head, router } from '@inertiajs/react';
import { ScrollText } from 'lucide-react';
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
    service: string | null;
    hostname: string | null;
    url: string | null;
    app: string | null;
    msg: string | null;
    is_denied_web: boolean;
    is_threat: boolean;
    is_ti_hit: boolean;
    is_risky_port: boolean;
    ti_feed: string | null;
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
    trafficLogNote: string;
}

const scopes = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'traffic', label: 'ทราฟฟิก' },
    { value: 'webfilter', label: 'Webfilter' },
    { value: 'app-ctrl', label: 'App-Ctrl' },
    { value: 'web-deny', label: 'Deny web' },
    { value: 'threats', label: 'Threats' },
    { value: 'ti-hits', label: 'TI hits' },
    { value: 'risky-ports', label: 'Risky ports' },
];

export default function Logs({ logs, scope, trafficLogNote }: Props) {
    return (
        <QualityPage
            title="บันทึกกิจกรรม"
            subtitle="เชื่อม MAC กับทะเบียนทรัพยากร IT เพื่อดูผู้ดูแลและหน่วยงาน — เก็บ log ไม่เกิน 90 วัน / 35 GB"
            tone="slate"
            icon={ScrollText}
            breadcrumbs={firewallBreadcrumbs({ title: 'บันทึกกิจกรรม', href: route('firewall.logs') })}
            badge={`${logs.total} รายการ`}
            subNav={<FirewallSubNav active="firewall.logs" />}
        >
            <Head title="บันทึกกิจกรรม — FortiGate" />

            <Panel title="หมายเหตุการเก็บ Log">
                <p className="px-5 pb-5 text-sm text-slate-600">{trafficLogNote}</p>
            </Panel>

            <div className="flex flex-wrap gap-2">
                {scopes.map((s) => (
                    <button
                        key={s.value}
                        type="button"
                        onClick={() => router.get(route('firewall.logs'), { scope: s.value }, { preserveState: true })}
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

            <Panel title="รายการล่าสุด">
                <div className="overflow-x-auto px-2 pb-4">
                    <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-3 py-2">เวลา</th>
                                <th className="px-3 py-2">ประเภท</th>
                                <th className="px-3 py-2">เครื่อง / ผู้ดูแล</th>
                                <th className="px-3 py-2">เป้าหมาย</th>
                                <th className="px-3 py-2">รายละเอียด</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">ยังไม่มีบันทึก</td>
                                </tr>
                            )}
                            {logs.data.map((row) => (
                                <tr key={row.id} className="border-b border-slate-100 align-top">
                                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">{row.logged_at ?? '—'}</td>
                                    <td className="px-3 py-2">
                                        <StatusPill
                                            label={row.log_type}
                                            className={
                                                row.is_ti_hit
                                                    ? 'border-violet-200 bg-violet-50 text-violet-700'
                                                    : row.is_threat
                                                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                                                        : row.is_denied_web
                                                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                                                            : row.log_type === 'traffic'
                                                                ? 'border-sky-200 bg-sky-50 text-sky-800'
                                                                : 'border-slate-200 bg-slate-50 text-slate-600'
                                            }
                                        />
                                        <div className="mt-1 text-xs text-slate-500">
                                            {row.action ?? ''} · {row.service ?? ''}
                                            {row.is_risky_port && row.dst_port ? ` · :${row.dst_port}` : ''}
                                            {row.ti_feed ? ` · ${row.ti_feed}` : ''}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <FirewallDeviceCell row={row} />
                                    </td>
                                    <td className="max-w-xs px-3 py-2 text-xs">
                                        <div className="font-medium text-slate-800">{row.hostname || row.dstip || '—'}</div>
                                        <div className="truncate text-slate-500">{row.url || row.app || ''}</div>
                                    </td>
                                    <td className="max-w-sm px-3 py-2 text-xs text-slate-600">{row.msg ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {logs.last_page > 1 && (
                    <div className="flex items-center justify-between px-5 pb-5">
                        <span className="text-xs text-slate-500">หน้า {logs.page} / {logs.last_page}</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled={logs.page <= 1} onClick={() => router.get(route('firewall.logs'), { scope, page: logs.page - 1 }, { preserveState: true })}>ก่อนหน้า</Button>
                            <Button variant="outline" size="sm" disabled={logs.page >= logs.last_page} onClick={() => router.get(route('firewall.logs'), { scope, page: logs.page + 1 }, { preserveState: true })}>ถัดไป</Button>
                        </div>
                    </div>
                )}
            </Panel>
        </QualityPage>
    );
}
