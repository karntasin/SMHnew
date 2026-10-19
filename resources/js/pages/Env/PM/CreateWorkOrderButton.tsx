import { router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Field, Modal } from '@/components/quality/quality-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { criticalityLabel } from '@/pages/Env/PM/PmSubNav';

interface AssetOption {
    id: number;
    name: string;
    stock_number?: string | null;
    control_number?: string | null;
    location?: string | null;
    issue_location?: string | null;
    risk_level?: string | null;
}

function today(): string {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
}

export default function CreateWorkOrderButton() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [assets, setAssets] = useState<AssetOption[]>([]);
    const [loading, setLoading] = useState(false);
    const form = useForm({
        asset_id: '',
        due_date: today(),
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        const handle = window.setTimeout(() => {
            setLoading(true);
            const url = `${route('env.pm.asset-options')}?q=${encodeURIComponent(query)}`;
            fetch(url, { headers: { Accept: 'application/json' } })
                .then((response) => response.json())
                .then((data: { assets?: AssetOption[] }) => setAssets(data.assets ?? []))
                .finally(() => setLoading(false));
        }, 250);

        return () => window.clearTimeout(handle);
    }, [open, query]);

    const close = () => {
        setOpen(false);
        setQuery('');
        form.reset();
        form.clearErrors();
        form.setData('due_date', today());
    };

    const selected = assets.find((asset) => String(asset.id) === form.data.asset_id);

    return (
        <>
            <Button className="rounded-xl bg-teal-600 hover:bg-teal-700" onClick={() => setOpen(true)}>
                สร้างใบงาน
            </Button>
            <Modal
                open={open}
                onClose={close}
                title="สร้างใบงาน PM"
                footer={
                    <>
                        <Button type="button" variant="outline" className="rounded-xl" onClick={close}>
                            ยกเลิก
                        </Button>
                        <Button
                            type="button"
                            className="rounded-xl bg-teal-600 hover:bg-teal-700"
                            disabled={form.processing || !form.data.asset_id}
                            onClick={() => form.post(route('env.pm.work-orders.store'))}
                        >
                            {form.processing ? 'กำลังสร้าง...' : 'เปิดใบงาน'}
                        </Button>
                    </>
                }
            >
                <Field label="ค้นหาเครื่อง" required error={form.errors.asset_id}>
                    <Input
                        value={query}
                        placeholder="ชื่อเครื่อง เลขครุภัณฑ์ หรือสถานที่"
                        onChange={(event) => setQuery(event.target.value)}
                    />
                </Field>
                <div className="max-h-56 space-y-2 overflow-y-auto">
                    {loading && <p className="text-sm text-slate-400">กำลังค้นหา...</p>}
                    {!loading && assets.length === 0 && <p className="text-sm text-slate-400">ไม่พบเครื่อง</p>}
                    {assets.map((asset) => {
                        const active = String(asset.id) === form.data.asset_id;
                        return (
                            <button
                                key={asset.id}
                                type="button"
                                className={`w-full rounded-xl border px-3 py-2 text-left ${active ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white'}`}
                                onClick={() => form.setData('asset_id', String(asset.id))}
                            >
                                <div className="font-medium text-slate-800">{asset.name}</div>
                                <div className="text-xs text-slate-500">
                                    {asset.stock_number || asset.control_number || '-'}
                                    {' · '}
                                    {asset.issue_location || asset.location || '-'}
                                    {' · '}
                                    {asset.risk_level} {criticalityLabel(asset.risk_level)}
                                </div>
                            </button>
                        );
                    })}
                </div>
                {selected && <p className="text-sm text-teal-700">เลือกแล้ว: {selected.name}</p>}
                <Field label="กำหนดเสร็จ" error={form.errors.due_date}>
                    <Input type="date" value={form.data.due_date} onChange={(event) => form.setData('due_date', event.target.value)} />
                </Field>
            </Modal>
        </>
    );
}

export function GenerateDueButton() {
    const [processing, setProcessing] = useState(false);

    return (
        <Button
            variant="outline"
            className="rounded-xl"
            disabled={processing}
            onClick={() => {
                setProcessing(true);
                router.post(
                    route('env.pm.generate'),
                    {},
                    {
                        onFinish: () => setProcessing(false),
                    },
                );
            }}
        >
            {processing ? 'กำลังตรวจรอบ...' : 'สร้างตามรอบที่ถึงกำหนด'}
        </Button>
    );
}
