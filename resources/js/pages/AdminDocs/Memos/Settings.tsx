import { Head, useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import MemoSubNav from './MemoSubNav';

interface SettingsData {
    unit_name: string;
    agency: string | null;
    address: string | null;
    phone: string | null;
    fax: string | null;
    email: string | null;
    signer_name: string | null;
    signer_position: string | null;
    owner_unit: string | null;
}

interface Props {
    settings: SettingsData;
}

const breadcrumbs = [
    { title: 'งานธุรการ', href: '/admin-hub' },
    { title: 'จัดการงานเอกสาร', href: route('admin-docs.memos.index') },
    { title: 'ตั้งค่าหัวกระดาษ', href: route('admin-docs.memos.settings') },
];

const fields: { key: keyof SettingsData; label: string; area?: boolean }[] = [
    { key: 'unit_name', label: 'ชื่อหน่วยงาน' },
    { key: 'agency', label: 'ส่วนราชการ' },
    { key: 'address', label: 'ที่อยู่', area: true },
    { key: 'phone', label: 'โทร.' },
    { key: 'fax', label: 'โทรสาร' },
    { key: 'email', label: 'ไปรษณีย์อิเล็กทรอนิกส์' },
    { key: 'owner_unit', label: 'ส่วนราชการเจ้าของเรื่อง' },
    { key: 'signer_name', label: 'ชื่อผู้ลงนามเริ่มต้น' },
    { key: 'signer_position', label: 'ตำแหน่งผู้ลงนามเริ่มต้น' },
];

export default function Settings({ settings }: Props) {
    const form = useForm({
        unit_name: settings.unit_name ?? '',
        agency: settings.agency ?? '',
        address: settings.address ?? '',
        phone: settings.phone ?? '',
        fax: settings.fax ?? '',
        email: settings.email ?? '',
        signer_name: settings.signer_name ?? '',
        signer_position: settings.signer_position ?? '',
        owner_unit: settings.owner_unit ?? '',
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="ตั้งค่าหัวกระดาษ">
            <Head title="ตั้งค่าหัวกระดาษ" />
            <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-medium text-emerald-700">จัดการงานเอกสาร</p>
                        <h1 className="text-2xl font-semibold text-slate-900">ตั้งค่าหัวกระดาษ</h1>
                        <p className="mt-1 text-sm text-slate-500">ค่านี้ถูกใส่ให้หนังสือฉบับใหม่ และแก้ในแต่ละฉบับได้อีกครั้ง</p>
                    </div>
                    <MemoSubNav />
                </div>

                <form
                    className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.put(route('admin-docs.memos.settings.update'));
                    }}
                >
                    {fields.map((field) => (
                        <div key={field.key} className="space-y-1.5">
                            <Label htmlFor={field.key}>{field.label}</Label>
                            {field.area ? (
                                <Textarea
                                    id={field.key}
                                    rows={3}
                                    value={form.data[field.key]}
                                    onChange={(event) => form.setData(field.key, event.target.value)}
                                />
                            ) : (
                                <Input
                                    id={field.key}
                                    value={form.data[field.key]}
                                    onChange={(event) => form.setData(field.key, event.target.value)}
                                    required={field.key === 'unit_name'}
                                />
                            )}
                            {form.errors[field.key] && <p className="text-sm text-rose-600">{form.errors[field.key]}</p>}
                        </div>
                    ))}
                    <Button type="submit" disabled={form.processing} className="bg-emerald-600 hover:bg-emerald-700">
                        <Save className="mr-2 size-4" />
                        {form.processing ? 'กำลังบันทึก' : 'บันทึกหัวกระดาษ'}
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
