import { Head, router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Item {
    id: number;
    prompt: string;
    reverse_scored: boolean;
}
interface Section {
    id: number;
    title: string;
    weight: number;
    items: Item[];
}
interface FormRow {
    id: number;
    title: string;
    description: string | null;
    kind: string;
    visibility: string;
    is_system: boolean;
    is_active: boolean;
    disclaimer: string | null;
    sections: Section[];
}

const visibilityLabel: Record<string, string> = {
    anonymous: 'ไม่ระบุชื่อ',
    named: 'ผูกรายชื่อ ให้หัวหน้าเห็นรายคน',
    aggregate: 'ผูกรายชื่อ แต่สรุปอย่างเดียว',
};

function CreateForm() {
    const form = useForm({
        title: '',
        description: '',
        visibility: 'named',
        disclaimer: '',
    });

    return (
        <Card>
            <CardHeader><CardTitle>สร้างแบบสำรวจใหม่</CardTitle></CardHeader>
            <CardContent>
                <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); form.post(route('km.learn.assessments.forms.store')); }}>
                    <input className="h-10 rounded-md border px-3" placeholder="ชื่อแบบ" value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} />
                    <textarea className="rounded-md border px-3 py-2" placeholder="คำอธิบาย" value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                    <select className="h-10 rounded-md border px-3" value={form.data.visibility} onChange={(e) => form.setData('visibility', e.target.value)}>
                        <option value="anonymous">ไม่ระบุชื่อ สรุปเฉพาะกลุ่มงาน</option>
                        <option value="named">ผูกรายชื่อ หัวหน้าเห็นรายคน</option>
                        <option value="aggregate">ผูกรายชื่อ แต่หน้าสรุปไม่แสดงชื่อ</option>
                    </select>
                    <textarea className="rounded-md border px-3 py-2" placeholder="ข้อความชี้แจงบนแบบ" value={form.data.disclaimer} onChange={(e) => form.setData('disclaimer', e.target.value)} />
                    <Button disabled={form.processing} type="submit">สร้างแบบ</Button>
                </form>
            </CardContent>
        </Card>
    );
}

function FormEditor({ form }: { form: FormRow }) {
    const meta = useForm({
        title: form.title,
        description: form.description || '',
        disclaimer: form.disclaimer || '',
        is_active: form.is_active,
    });
    const sectionForm = useForm({ title: '', weight: 1 });

    return (
        <Card>
            <CardHeader><CardTitle>{form.title}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{visibilityLabel[form.visibility]}{form.kind === 'competency' ? ' · แก้ข้อสมรรถนะที่พจนานุกรมสมรรถนะ' : ''}</p>
                <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); meta.put(route('km.learn.assessments.forms.update', form.id)); }}>
                    <input className="h-10 rounded-md border px-3" value={meta.data.title} onChange={(e) => meta.setData('title', e.target.value)} />
                    <textarea className="rounded-md border px-3 py-2" value={meta.data.description} onChange={(e) => meta.setData('description', e.target.value)} />
                    {form.kind !== 'competency' && (
                        <textarea className="rounded-md border px-3 py-2" value={meta.data.disclaimer} onChange={(e) => meta.setData('disclaimer', e.target.value)} />
                    )}
                    {form.kind !== 'competency' && (
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={meta.data.is_active} onChange={(e) => meta.setData('is_active', e.target.checked)} />
                            เปิดใช้
                        </label>
                    )}
                    <div className="flex gap-2">
                        <Button disabled={meta.processing} type="submit">บันทึกแบบ</Button>
                        {!form.is_system && (
                            <Button type="button" variant="outline" onClick={() => { if (confirm('ลบแบบนี้และคำตอบทั้งหมด?')) router.delete(route('km.learn.assessments.forms.destroy', form.id)); }}>ลบแบบ</Button>
                        )}
                    </div>
                </form>
                {form.kind === 'survey' && (
                    <>
                        {form.sections.map((section) => (
                            <SectionBlock key={section.id} section={section} />
                        ))}
                        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); sectionForm.post(route('km.learn.assessments.sections.store', form.id), { onSuccess: () => sectionForm.reset() }); }}>
                            <input className="h-10 rounded-md border px-3" placeholder="ชื่อหมวด" value={sectionForm.data.title} onChange={(e) => sectionForm.setData('title', e.target.value)} />
                            <input className="h-10 w-24 rounded-md border px-3" type="number" min="0.1" step="0.1" value={sectionForm.data.weight} onChange={(e) => sectionForm.setData('weight', Number(e.target.value))} />
                            <Button type="submit">เพิ่มหมวด</Button>
                        </form>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function SectionBlock({ section }: { section: Section }) {
    const sectionForm = useForm({ title: section.title, weight: section.weight });
    const itemForm = useForm({ prompt: '', reverse_scored: false });

    return (
        <div className="space-y-2 rounded-lg border p-3">
            <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); sectionForm.put(route('km.learn.assessments.sections.update', section.id)); }}>
                <input className="h-10 flex-1 rounded-md border px-3" value={sectionForm.data.title} onChange={(e) => sectionForm.setData('title', e.target.value)} />
                <input className="h-10 w-24 rounded-md border px-3" type="number" min="0.1" step="0.1" value={sectionForm.data.weight} onChange={(e) => sectionForm.setData('weight', Number(e.target.value))} />
                <Button type="submit" variant="outline">บันทึกหมวด</Button>
                <Button type="button" variant="outline" onClick={() => { if (confirm('ลบหมวดนี้?')) router.delete(route('km.learn.assessments.sections.destroy', section.id)); }}>ลบหมวด</Button>
            </form>
            {section.items.map((item) => (
                <ItemRow key={item.id} item={item} />
            ))}
            <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); itemForm.post(route('km.learn.assessments.items.store', section.id), { onSuccess: () => itemForm.reset() }); }}>
                <input className="h-10 min-w-64 flex-1 rounded-md border px-3" placeholder="ข้อคำถาม" value={itemForm.data.prompt} onChange={(e) => itemForm.setData('prompt', e.target.value)} />
                <label className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={itemForm.data.reverse_scored} onChange={(e) => itemForm.setData('reverse_scored', e.target.checked)} />
                    กลับด้าน
                </label>
                <Button type="submit">เพิ่มข้อ</Button>
            </form>
        </div>
    );
}

function ItemRow({ item }: { item: Item }) {
    const form = useForm({ prompt: item.prompt, reverse_scored: item.reverse_scored });

    return (
        <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); form.put(route('km.learn.assessments.items.update', item.id)); }}>
            <input className="h-10 min-w-64 flex-1 rounded-md border px-3" value={form.data.prompt} onChange={(e) => form.setData('prompt', e.target.value)} />
            <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={form.data.reverse_scored} onChange={(e) => form.setData('reverse_scored', e.target.checked)} />
                กลับด้าน
            </label>
            <Button type="submit" variant="outline" size="sm">บันทึกข้อ</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { if (confirm('ลบข้อนี้?')) router.delete(route('km.learn.assessments.items.destroy', item.id)); }}>ลบ</Button>
        </form>
    );
}

export default function AssessmentBuilder({ forms }: { forms: FormRow[] }) {
    const flash = (usePage().props as { flash?: { success?: string } }).flash;

    return (
        <AppLayout breadcrumbs={[
            { title: 'พัฒนาบุคลากร', href: '/km/learn/hub' },
            { title: 'รวมแบบประเมิน', href: '/km/learn/assessments' },
            { title: 'สร้างแบบ', href: '/km/learn/assessments/builder' },
        ]}>
            <Head title="สร้างแบบประเมิน" />
            <div className="space-y-4 p-6">
                <h1 className="text-2xl font-bold">สร้างแบบประเมิน</h1>
                <p className="text-sm text-muted-foreground">น้ำหนักหมวดใช้ตอนคิดคะแนนรวม ข้อที่กลับด้านจะถูกกลับก่อนแปลงเป็นคะแนน 0–100</p>
                {flash?.success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{flash.success}</p>}
                <CreateForm />
                {forms.map((form) => <FormEditor key={form.id} form={form} />)}
            </div>
        </AppLayout>
    );
}
