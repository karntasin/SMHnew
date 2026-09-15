import { Head, router } from '@inertiajs/react';
import { Globe } from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import FirewallSubNav, { firewallBreadcrumbs } from './FirewallSubNav';
import FirewallDeviceCell, { type ItAssetRef } from './FirewallDeviceCell';
import { Button } from '@/components/ui/button';

interface LogRow {
    id: number;
    log_type: string;
    logged_at: string | null;
    action: string | null;
    srcip: string | null;
    device_name: string | null;
    src_user: string | null;
    src_mac: string | null;
    hostname: string | null;
    url: string | null;
    catdesc: string | null;
    msg: string | null;
    is_denied_web: boolean;
    is_watch_web: boolean;
    is_ti_hit: boolean;
    ti_feed: string | null;
    alerted: boolean;
    it_asset?: ItAssetRef | null;
}

interface Props {
    logs: {
        data: LogRow[];
        total: number;
        page: number;
        last_page: number;
    };
    denyPatterns: string[];
    watchPatterns: string[];
}

export default function WebWatch({ logs, denyPatterns, watchPatterns }: Props) {
    return (
        <QualityPage
            title="เฝ้าระวังเว็บ"
            subtitle="แสดงชื่อเครื่องที่เข้าเว็บ/หมวดหมู่ที่ไม่ควรใช้งาน จาก webfilter และ app-ctrl"
            tone="slate"
            icon={Globe}
            breadcrumbs={firewallBreadcrumbs({ title: 'เฝ้าระวังเว็บ', href: route('firewall.web-watch') })}
            badge={`${logs.total} รายการ`}
            subNav={<FirewallSubNav active="firewall.web-watch" />}
        >
            <Head title="เฝ้าระวังเว็บ — FortiGate" />

            <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Deny patterns">
                    <div className="flex flex-wrap gap-2 px-5 pb-5">
                        {denyPatterns.map((p) => (
                            <span key={p} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">{p}</span>
                        ))}
                    </div>
                </Panel>
                <Panel title="Watch patterns">
                    <div className="flex flex-wrap gap-2 px-5 pb-5">
                        {watchPatterns.map((p) => (
                            <span key={p} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">{p}</span>
                        ))}
                    </div>
                </Panel>
            </div>

            <Panel title="เหตุการณ์ที่ตรงรายการ">
                <div className="overflow-x-auto px-2 pb-4">
                    <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-3 py-2">เวลา</th>
                                <th className="px-3 py-2">เครื่อง</th>
                                <th className="px-3 py-2">โฮสต์/URL</th>
                                <th className="px-3 py-2">สถานะ</th>
                                <th className="px-3 py-2">ข้อความ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">ยังไม่มีเหตุการณ์</td>
                                </tr>
                            )}
                            {logs.data.map((row) => (
                                <tr key={row.id} className="border-b border-slate-100 align-top">
                                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">{row.logged_at ?? '—'}</td>
                                    <td className="px-3 py-2"><FirewallDeviceCell row={row} /></td>
                                    <td className="max-w-xs px-3 py-2">
                                        <div className="truncate font-medium text-slate-800">{row.hostname || '—'}</div>
                                        <div className="truncate text-xs text-slate-500">{row.url || row.catdesc || ''}</div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex flex-col gap-1">
                                            {row.is_denied_web && (
                                                <StatusPill label="Deny" className="border-rose-200 bg-rose-50 text-rose-700" />
                                            )}
                                            {row.is_watch_web && !row.is_denied_web && (
                                                <StatusPill label="Watch" className="border-amber-200 bg-amber-50 text-amber-800" />
                                            )}
                                            {row.is_ti_hit && (
                                                <StatusPill label={row.ti_feed ? `TI:${row.ti_feed}` : 'TI'} className="border-violet-200 bg-violet-50 text-violet-700" />
                                            )}
                                            {row.alerted && (
                                                <StatusPill label="แจ้งแล้ว" className="border-slate-200 bg-slate-50 text-slate-600" />
                                            )}
                                            <span className="text-xs text-slate-500">{row.action ?? ''}</span>
                                        </div>
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
                            <Button variant="outline" size="sm" disabled={logs.page <= 1} onClick={() => router.get(route('firewall.web-watch'), { page: logs.page - 1 }, { preserveState: true })}>ก่อนหน้า</Button>
                            <Button variant="outline" size="sm" disabled={logs.page >= logs.last_page} onClick={() => router.get(route('firewall.web-watch'), { page: logs.page + 1 }, { preserveState: true })}>ถัดไป</Button>
                        </div>
                    </div>
                )}
            </Panel>
        </QualityPage>
    );
}
