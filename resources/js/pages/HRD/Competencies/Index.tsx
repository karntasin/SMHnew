import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Competency {
    id: number;
    name: string;
    description: string | null;
    type: string;
    indicators: { level: number; behavior: string }[];
    courses: { id: number }[];
}

const TYPES = [
    { value: 'core', label: 'สมรรถนะหลัก' },
    { value: 'functional', label: 'สมรรถนะตามวิชาชีพ' },
    { value: 'managerial', label: 'สมรรถนะด้านการบริหาร' },
];

export default function Competencies({
    competencies,
    courses,
    positions,
    matrix,
}: {
    competencies: Competency[];
    courses: { id: number; title: string }[];
    positions: { id: number; name: string }[];
    matrix: { id: number; expected_level: number; position?: { name: string }; competency?: { name: string } }[];
}) {
    const form = useForm({
        name: '',
        description: '',
        type: 'core',
        indicators: ['', '', '', '', ''],
        course_ids: [] as number[],
        score_weight: 3,
    });
    const link = useForm({ position_id: '', competency_id: '', expected_level: 3 });

    return (
        <AppLayout breadcrumbs={[{ title: 'พัฒนาบุคลากร', href: '/km/learn/hub' }, { title: 'พจนานุกรมสมรรถนะ', href: '/km/learn/competencies' }]}>
            <Head title="พจนานุกรมสมรรถนะ" />
            <div className="space-y-4 p-6">
                <h1 className="text-2xl font-bold">พจนานุกรมสมรรถนะ</h1>
                <Card>
                    <CardHeader><CardTitle>เพิ่มสมรรถนะ</CardTitle></CardHeader>
                    <CardContent>
                        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); form.post(route('km.learn.competencies.store')); }}>
                            <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="ชื่อสมรรถนะ" required />
                            <Textarea value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} placeholder="คำอธิบาย" />
                            <select className="h-10 w-full rounded-md border px-3 text-sm" value={form.data.type} onChange={(e) => form.setData('type', e.target.value)}>
                                {TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                            </select>
                            {form.data.indicators.map((text, index) => (
                                <Input key={index} value={text} placeholder={`พฤติกรรมบ่งชี้ระดับ ${index + 1}`} onChange={(e) => {
                                    const next = [...form.data.indicators];
                                    next[index] = e.target.value;
                                    form.setData('indicators', next);
                                }} required />
                            ))}
                            <Label>หลักสูตรที่ปิดช่องว่างนี้</Label>
                            <select multiple className="min-h-24 w-full rounded-md border px-3 py-2 text-sm" value={form.data.course_ids.map(String)} onChange={(e) => form.setData('course_ids', Array.from(e.target.selectedOptions).map((option) => Number(option.value)))}>
                                {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                            </select>
                            <div>
                                <Label>ระดับที่เสนอเมื่อผ่านหลักสูตร</Label>
                                <Input type="number" min={1} max={5} value={form.data.score_weight} onChange={(e) => form.setData('score_weight', Number(e.target.value))} />
                            </div>
                            <Button disabled={form.processing} type="submit">บันทึก</Button>
                        </form>
                    </CardContent>
                </Card>
                {competencies.map((competency) => (
                    <Card key={competency.id}>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>{competency.name}</span>
                                <Button size="sm" variant="outline" onClick={() => router.delete(route('km.learn.competencies.destroy', competency.id))}>ลบ</Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            <p>{TYPES.find((type) => type.value === competency.type)?.label} · {competency.description}</p>
                            {competency.indicators.map((indicator) => <p key={indicator.level}>ระดับ {indicator.level}: {indicator.behavior}</p>)}
                        </CardContent>
                    </Card>
                ))}
                <Card>
                    <CardHeader><CardTitle>ผูกกับตำแหน่ง</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <form className="grid gap-3 md:grid-cols-4" onSubmit={(e) => { e.preventDefault(); link.post(route('km.learn.position-competencies.store')); }}>
                            <select className="h-10 rounded-md border px-3 text-sm" value={link.data.position_id} onChange={(e) => link.setData('position_id', e.target.value)} required>
                                <option value="">ตำแหน่ง</option>
                                {positions.map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}
                            </select>
                            <select className="h-10 rounded-md border px-3 text-sm" value={link.data.competency_id} onChange={(e) => link.setData('competency_id', e.target.value)} required>
                                <option value="">สมรรถนะ</option>
                                {competencies.map((competency) => <option key={competency.id} value={competency.id}>{competency.name}</option>)}
                            </select>
                            <Input type="number" min={1} max={5} value={link.data.expected_level} onChange={(e) => link.setData('expected_level', Number(e.target.value))} />
                            <Button type="submit">ผูก</Button>
                        </form>
                        {matrix.map((row) => (
                            <p key={row.id} className="flex items-center justify-between text-sm">
                                <span>{row.position?.name} · {row.competency?.name} · คาดหวังระดับ {row.expected_level}</span>
                                <Button size="sm" variant="outline" onClick={() => router.delete(route('km.learn.position-competencies.destroy', row.id))}>ยกเลิก</Button>
                            </p>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
