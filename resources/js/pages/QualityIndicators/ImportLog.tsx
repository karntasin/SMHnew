import React from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, History } from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import IndicatorsSubNav from '@/pages/QualityIndicators/IndicatorsSubNav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const statusLabel: Record<string, string> = {
    pending: 'รอยืนยัน',
    completed: 'สำเร็จ',
    failed: 'ล้มเหลว',
    cancelled: 'ยกเลิก',
};

export default function ImportLogPage({
    log,
}: {
    log: {
        id: number;
        type: string;
        status: string;
        original_filename: string;
        owner_label: string;
        indicators_create: number;
        indicators_update: number;
        entries_create: number;
        entries_update: number;
        row_errors: number;
        summary?: Record<string, unknown> | null;
        error_message?: string | null;
        user?: { id: number; name: string } | null;
        created_at?: string;
        confirmed_at?: string | null;
        payload?: {
            indicators?: Array<{ row: number; action: string; messages?: string[]; data: Record<string, unknown> }>;
            entries?: Array<{ row: number; action: string; messages?: string[]; data: Record<string, unknown> }>;
            errors?: Array<{ sheet: string; row: number; messages: string[] }>;
        };
    };
}) {
    const breadcrumbs = [
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'ตัวชี้วัดคุณภาพ', href: route('quality-indicators.index') },
        { title: 'นำเข้า Excel', href: route('quality-indicators.import.index') },
        { title: `Log #${log.id}`, href: '#' },
    ];

    return (
        <QualityPage
            tone="emerald"
            icon={History}
            badge="ศูนย์พัฒนาคุณภาพ · ตัวชี้วัด"
            title={`Log การนำเข้า #${log.id}`}
            subtitle={log.original_filename}
            breadcrumbs={breadcrumbs}
            headTitle={`Import Log #${log.id}`}
            actions={
                <Link href={route('quality-indicators.import.index')}>
                    <Button type="button" variant="outline" className="rounded-xl">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        กลับหน้านำเข้า
                    </Button>
                </Link>
            }
            subNav={<IndicatorsSubNav active="quality-indicators.import.index" />}
        >
            <Panel title="สรุป">
                <div className="grid gap-3 text-sm md:grid-cols-2">
                    <div>
                        <div className="text-slate-500">สถานะ</div>
                        <StatusPill
                            label={statusLabel[log.status] || log.status}
                            className={cn(
                                'mt-1',
                                log.status === 'completed' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                                log.status === 'pending' && 'border-amber-200 bg-amber-50 text-amber-700',
                                log.status === 'failed' && 'border-rose-200 bg-rose-50 text-rose-700',
                                log.status === 'cancelled' && 'border-slate-200 bg-slate-50 text-slate-600',
                            )}
                        />
                    </div>
                    <div>
                        <div className="text-slate-500">ปลายทาง</div>
                        <div className="font-medium text-slate-800">{log.owner_label}</div>
                    </div>
                    <div>
                        <div className="text-slate-500">ผู้ดำเนินการ</div>
                        <div className="font-medium text-slate-800">{log.user?.name || '-'}</div>
                    </div>
                    <div>
                        <div className="text-slate-500">เวลา</div>
                        <div className="font-medium text-slate-800">
                            อัปโหลด {log.created_at || '-'}
                            {log.confirmed_at ? ` · ยืนยัน ${log.confirmed_at}` : ''}
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="text-slate-500">ผลลัพธ์</div>
                        <div className="font-medium text-slate-800">
                            ตัวชี้วัดใหม่ {log.indicators_create} / อัปเดต {log.indicators_update} · ผลวัดใหม่{' '}
                            {log.entries_create} / อัปเดต {log.entries_update} · ผิดพลาด {log.row_errors}
                        </div>
                    </div>
                    {log.error_message && (
                        <div className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                            {log.error_message}
                        </div>
                    )}
                </div>
            </Panel>

            {(log.payload?.errors?.length ?? 0) > 0 && (
                <Panel title="ข้อผิดพลาด">
                    <ul className="space-y-1 text-sm text-rose-700">
                        {log.payload?.errors?.map((err, i) => (
                            <li key={i}>
                                ชีต {err.sheet} แถว {err.row}: {err.messages.join(', ')}
                            </li>
                        ))}
                    </ul>
                </Panel>
            )}

            <Panel title="รายละเอียดแถว (indicators)">
                <SimpleRows rows={log.payload?.indicators || []} />
            </Panel>
            <Panel title="รายละเอียดแถว (entries)">
                <SimpleRows rows={log.payload?.entries || []} />
            </Panel>
        </QualityPage>
    );
}

function SimpleRows({
    rows,
}: {
    rows: Array<{ row: number; action: string; messages?: string[]; data: Record<string, unknown> }>;
}) {
    if (!rows.length) {
        return <p className="text-sm text-slate-500">ไม่มีข้อมูล</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="text-slate-500">
                    <tr className="border-b">
                        <th className="py-2 pr-2">แถว</th>
                        <th className="py-2 pr-2">action</th>
                        <th className="py-2 pr-2">data</th>
                        <th className="py-2">messages</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-100 align-top">
                            <td className="py-2 pr-2">{row.row}</td>
                            <td className="py-2 pr-2">{row.action}</td>
                            <td className="py-2 pr-2 font-mono text-[11px] text-slate-700">
                                {JSON.stringify(row.data)}
                            </td>
                            <td className="py-2 text-rose-600">{row.messages?.join(', ') || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
