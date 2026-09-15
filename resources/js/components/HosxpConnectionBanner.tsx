import { Link, usePage } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';

interface HosxpStatus {
    connected: boolean;
    message: string;
    checked_at?: string | null;
}

export default function HosxpConnectionBanner() {
    const { hosxp_status, can_server_monitor } = usePage().props as {
        hosxp_status?: HosxpStatus | null;
        can_server_monitor?: boolean;
    };

    if (!hosxp_status || hosxp_status.connected) {
        return null;
    }

    return (
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                    <strong>HOSxP:</strong> {hosxp_status.message}
                    {hosxp_status.checked_at ? ` (ตรวจเมื่อ ${hosxp_status.checked_at})` : ''}
                </span>
                <Link href={route('setting.database')} className="font-medium underline underline-offset-2">
                    ตั้งค่าฐานข้อมูล
                </Link>
                {can_server_monitor && (
                    <Link href={route('server-monitor.index')} className="font-medium underline underline-offset-2">
                        ตรวจสอบเซิร์ฟเวอร์
                    </Link>
                )}
            </div>
        </div>
    );
}
