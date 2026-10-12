import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Wrench } from 'lucide-react';
import { EmptyState, Field, Modal, Panel, QualityPage, StatusPill } from '@/components/quality/quality-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EnvSubNav from '@/pages/Env/EnvSubNav';
import PmSubNav from '@/pages/Env/PM/PmSubNav';

interface Part {
    id: number;
    code: string;
    name: string;
    unit: string;
    min_stock: number;
    on_hand: number;
    unit_cost: number;
    location?: string | null;
    is_active: boolean;
    below_min: boolean;
}

const breadcrumbs = [
    { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
    { title: 'ENV', href: '/env' },
    { title: 'อะไหล่ PM', href: '/env/pm/parts' },
];

export default function Parts({ parts }: { parts: Part[] }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Part | null>(null);
    const [stockPart, setStockPart] = useState<Part | null>(null);
    const form = useForm({
        code: '',
        name: '',
        unit: 'ชิ้น',
        min_stock: '0',
        on_hand: '0',
        unit_cost: '0',
        location: '',
        is_active: true,
    });
    const stockForm = useForm({ qty: '1', on_hand: '0', note: '' });

    const startCreate = () => {
        setEditing(null);
        form.reset();
        setOpen(true);
    };

    const startEdit = (part: Part) => {
        setEditing(part);
        form.setData({
            code: part.code,
            name: part.name,
            unit: part.unit,
            min_stock: String(part.min_stock),
            on_hand: String(part.on_hand),
            unit_cost: String(part.unit_cost),
            location: part.location || '',
            is_active: part.is_active,
        });
        setOpen(true);
    };

    return (
        <QualityPage
            tone="teal"
            icon={Wrench}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title="อะไหล่และอุปกรณ์สิ้นเปลือง"
            subtitle="สต็อกคงเหลือเทียบขั้นต่ำ รับเข้าและปรับยอด"
            breadcrumbs={breadcrumbs}
            headTitle="PM Spare Parts"
            subNav={
                <>
                    <EnvSubNav active="env.pm.index" />
                    <PmSubNav active="parts" />
                </>
            }
            actions={
                <Button className="rounded-xl bg-teal-600 hover:bg-teal-700" onClick={startCreate}>
                    เพิ่มอะไหล่
                </Button>
            }
        >
            <Panel title="รายการอะไหล่">
                {parts.length === 0 ? (
                    <EmptyState text="ยังไม่มีอะไหล่" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-slate-500">
                                <tr>
                                    <th className="py-2">รหัส</th>
                                    <th>ชื่อ</th>
                                    <th>คงเหลือ</th>
                                    <th>ขั้นต่ำ</th>
                                    <th>ราคา/หน่วย</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {parts.map((part) => (
                                    <tr key={part.id} className="border-t border-slate-100">
                                        <td className="py-2 font-mono text-xs">{part.code}</td>
                                        <td>
                                            {part.name}
                                            <div className="text-xs text-slate-400">{part.location}</div>
                                        </td>
                                        <td>
                                            {part.on_hand} {part.unit}
                                            {part.below_min && (
                                                <StatusPill label="ต่ำกว่าขั้นต่ำ" className="ml-2 border-amber-200 bg-amber-50 text-amber-700" />
                                            )}
                                        </td>
                                        <td>{part.min_stock}</td>
                                        <td>{part.unit_cost}</td>
                                        <td className="space-x-2 text-right">
                                            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setStockPart(part); stockForm.setData({ qty: '1', on_hand: String(part.on_hand), note: '' }); }}>
                                                สต็อก
                                            </Button>
                                            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => startEdit(part)}>
                                                แก้ไข
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title={editing ? 'แก้ไขอะไหล่' : 'เพิ่มอะไหล่'}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
                        <Button
                            className="bg-teal-600"
                            disabled={form.processing}
                            onClick={() => {
                                const options = { onSuccess: () => setOpen(false) };
                                if (editing) form.put(route('env.pm.parts.update', editing.id), options);
                                else form.post(route('env.pm.parts.store'), options);
                            }}
                        >
                            บันทึก
                        </Button>
                    </>
                }
            >
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="รหัส"><Input value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} /></Field>
                    <Field label="ชื่อ"><Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} /></Field>
                    <Field label="หน่วย"><Input value={form.data.unit} onChange={(e) => form.setData('unit', e.target.value)} /></Field>
                    <Field label="ขั้นต่ำ"><Input type="number" min={0} value={form.data.min_stock} onChange={(e) => form.setData('min_stock', e.target.value)} /></Field>
                    {!editing && (
                        <Field label="ยอดเริ่มต้น"><Input type="number" min={0} value={form.data.on_hand} onChange={(e) => form.setData('on_hand', e.target.value)} /></Field>
                    )}
                    <Field label="ราคาต่อหน่วย"><Input type="number" min={0} step="0.01" value={form.data.unit_cost} onChange={(e) => form.setData('unit_cost', e.target.value)} /></Field>
                    <Field label="สถานที่เก็บ" className="sm:col-span-2"><Input value={form.data.location} onChange={(e) => form.setData('location', e.target.value)} /></Field>
                </div>
            </Modal>

            <Modal
                open={!!stockPart}
                onClose={() => setStockPart(null)}
                title={stockPart ? `สต็อก ${stockPart.name}` : 'สต็อก'}
                footer={<Button variant="outline" onClick={() => setStockPart(null)}>ปิด</Button>}
            >
                {stockPart && (
                    <div className="space-y-4">
                        <form
                            className="space-y-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                stockForm.post(route('env.pm.parts.receive', stockPart.id), { onSuccess: () => setStockPart(null) });
                            }}
                        >
                            <Field label="รับเข้า">
                                <Input type="number" min={0} step="0.001" value={stockForm.data.qty} onChange={(e) => stockForm.setData('qty', e.target.value)} />
                            </Field>
                            <Button type="submit" className="rounded-xl bg-teal-600">รับเข้า</Button>
                        </form>
                        <form
                            className="space-y-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                router.post(route('env.pm.parts.adjust', stockPart.id), { on_hand: stockForm.data.on_hand, note: stockForm.data.note }, { onSuccess: () => setStockPart(null) });
                            }}
                        >
                            <Field label="ปรับยอดคงเหลือเป็น">
                                <Input type="number" min={0} step="0.001" value={stockForm.data.on_hand} onChange={(e) => stockForm.setData('on_hand', e.target.value)} />
                            </Field>
                            <Button type="submit" variant="outline" className="rounded-xl">ปรับยอด</Button>
                        </form>
                    </div>
                )}
            </Modal>
        </QualityPage>
    );
}
