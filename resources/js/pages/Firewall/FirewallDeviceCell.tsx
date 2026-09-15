import { Link } from '@inertiajs/react';

export interface ItAssetRef {
    id: number;
    asset_code: string | null;
    name: string | null;
    assigned_user: string | null;
    department: string | null;
    location: string | null;
    status: string | null;
    device_type: string | null;
    url: string;
}

interface DeviceFields {
    device_name: string | null;
    src_user: string | null;
    src_mac: string | null;
    srcip: string | null;
    it_asset?: ItAssetRef | null;
}

export default function FirewallDeviceCell({ row }: { row: DeviceFields }) {
    const asset = row.it_asset ?? null;
    const title = asset?.name || row.device_name || row.src_user || 'ไม่ทราบชื่อเครื่อง';

    return (
        <div className="space-y-0.5">
            <div className="font-medium text-slate-800">{title}</div>
            <div className="font-mono text-xs text-slate-500">{row.srcip ?? '—'}</div>
            <div className="font-mono text-[11px] text-slate-400">{row.src_mac ? `MAC ${row.src_mac}` : 'MAC —'}</div>

            {asset ? (
                <div className="mt-1 rounded-lg border border-teal-100 bg-teal-50/70 px-2 py-1.5 text-[11px] leading-relaxed text-teal-900">
                    <div>
                        <span className="text-teal-600">ผู้ดูแล</span> {asset.assigned_user || '—'}
                    </div>
                    <div>
                        <span className="text-teal-600">หน่วยงาน</span> {asset.department || '—'}
                    </div>
                    {asset.location ? (
                        <div>
                            <span className="text-teal-600">สถานที่</span> {asset.location}
                        </div>
                    ) : null}
                    <Link
                        href={asset.url || route('im.resource')}
                        className="mt-0.5 inline-block font-medium text-teal-700 underline-offset-2 hover:underline"
                    >
                        ดูในทะเบียนทรัพยากร
                        {asset.asset_code ? ` (${asset.asset_code})` : ''}
                    </Link>
                </div>
            ) : row.src_mac ? (
                <div className="mt-1 text-[11px] text-slate-400">ยังไม่พบในทะเบียนทรัพยากร IT</div>
            ) : null}
        </div>
    );
}
