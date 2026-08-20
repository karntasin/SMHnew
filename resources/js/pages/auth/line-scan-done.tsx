import { Head } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';

export default function LineScanDone({ displayName }: { displayName?: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-emerald-50 p-6">
            <Head title="สแกน LINE สำเร็จ" />
            <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
                <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
                <h1 className="mt-4 text-xl font-bold text-slate-900">ยืนยัน LINE สำเร็จ</h1>
                {displayName && <p className="mt-2 text-sm text-slate-600">{displayName}</p>}
                <p className="mt-3 text-sm text-slate-500">กลับไปที่คอมพิวเตอร์ที่แสดง QR เพื่อเข้าสู่ระบบต่อ</p>
            </div>
        </div>
    );
}
