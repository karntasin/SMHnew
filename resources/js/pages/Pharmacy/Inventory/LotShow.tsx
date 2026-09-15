import { useEffect, useRef } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Button } from '@/components/ui/button';
import QRCode from 'qrcode';

type Lot = {
    id: number;
    lot_no: string;
    qr_token: string;
    qr_payload: string;
    received_at?: string;
    expires_at?: string;
    qty_received: number;
    qty_remaining: number;
    status: string;
    supplier?: string;
    invoice_no?: string;
    notes?: string;
    item: { icode?: string; name?: string; strength?: string; unit?: string };
    location: { name?: string; code?: string; type?: string };
    received_by?: string;
};

export default function LotShow({ lot }: { lot: Lot }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        QRCode.toCanvas(canvasRef.current, lot.qr_payload, {
            width: 220,
            margin: 2,
            color: { dark: '#1e1b4b', light: '#ffffff' },
        });
    }, [lot.qr_payload]);

    const printLabel = () => window.print();

    return (
        <AppLayout breadcrumbs={pharmacyBreadcrumbs([
            { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
            { title: 'Lot / QR', href: route('pharmacy.inventory.lots') },
            { title: lot.lot_no },
        ])}>
            <Head title={`Lot ${lot.lot_no}`} />
            <div className="container mx-auto space-y-6 px-4 py-6">
                <PharmacySubNav active="pharmacy.inventory.index" />
                <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                    <div className="rounded-3xl border bg-white p-5 text-center shadow-sm print:border-0">
                        <canvas ref={canvasRef} className="mx-auto" />
                        <div className="mt-3 font-mono text-xs text-slate-600 break-all">{lot.qr_payload}</div>
                        <Button type="button" onClick={printLabel} className="mt-4 rounded-xl print:hidden">พิมพ์ฉลาก QR</Button>
                    </div>
                    <div className="rounded-3xl border bg-white p-6 shadow-sm">
                        <h1 className="text-2xl font-bold text-slate-900">{lot.item.name}</h1>
                        <div className="mt-1 text-sm text-slate-500">{lot.item.icode} {lot.item.strength || ''}</div>
                        <dl className="mt-6 grid gap-3 sm:grid-cols-2 text-sm">
                            <div><dt className="text-slate-500">Lot No.</dt><dd className="font-semibold">{lot.lot_no}</dd></div>
                            <div><dt className="text-slate-500">สถานที่</dt><dd className="font-semibold">{lot.location.name}</dd></div>
                            <div><dt className="text-slate-500">วันที่รับ</dt><dd className="font-semibold">{lot.received_at || '—'}</dd></div>
                            <div><dt className="text-slate-500">วันหมดอายุ</dt><dd className="font-semibold">{lot.expires_at || '—'}</dd></div>
                            <div><dt className="text-slate-500">รับเข้า</dt><dd className="font-semibold">{lot.qty_received}</dd></div>
                            <div><dt className="text-slate-500">คงเหลือ</dt><dd className="font-semibold">{lot.qty_remaining}</dd></div>
                            <div><dt className="text-slate-500">ผู้จำหน่าย</dt><dd className="font-semibold">{lot.supplier || '—'}</dd></div>
                            <div><dt className="text-slate-500">ใบส่งของ</dt><dd className="font-semibold">{lot.invoice_no || '—'}</dd></div>
                            <div><dt className="text-slate-500">ผู้รับเข้า</dt><dd className="font-semibold">{lot.received_by || '—'}</dd></div>
                            <div><dt className="text-slate-500">สถานะ</dt><dd className="font-semibold">{lot.status}</dd></div>
                        </dl>
                        {lot.notes && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{lot.notes}</p>}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
