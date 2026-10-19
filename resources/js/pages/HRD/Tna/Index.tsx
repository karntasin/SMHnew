import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const REASON: Record<string, string> = { gap: 'ช่องว่างสมรรถนะ', work: 'ปัญหาหน้างาน', policy: 'นโยบาย' };

export default function Tna({
    fiscalLabel,
    fiscalYear,
    mine,
    ranking,
    canEdit,
}: {
    fiscalLabel: string;
    fiscalYear: number;
    mine: { id: number; topic: string; reason: string; note: string | null }[];
    ranking: { topic: string; total: number }[];
    canEdit: boolean;
}) {
    const form = useForm({ fiscal_year: fiscalYear, topic: '', reason: 'work', note: '' });

    return (
        <AppLayout breadcrumbs={[{ title: 'พัฒนาบุคลากร', href: '/km/learn/hub' }, { title: 'สำรวจความต้องการ', href: '/km/learn/tna' }]}>
            <Head title="สำรวจความต้องการฝึกอบรม" />
            <div className="space-y-4 p-6">
                <h1 className="text-2xl font-bold">ความต้องการฝึกอบรม {fiscalLabel}</h1>
                <Card>
                    <CardHeader><CardTitle>ส่งความต้องการ</CardTitle></CardHeader>
                    <CardContent>
                        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); form.post(route('km.learn.tna.store')); }}>
                            <div><Label>เรื่องที่ต้องการ</Label><Input value={form.data.topic} onChange={(e) => form.setData('topic', e.target.value)} required /></div>
                            <div>
                                <Label>เพราะ</Label>
                                <select className="h-10 w-full rounded-md border px-3 text-sm" value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)}>
                                    <option value="gap">ช่องว่างสมรรถนะ</option>
                                    <option value="work">ปัญหาหน้างาน</option>
                                    <option value="policy">นโยบาย</option>
                                </select>
                            </div>
                            <Textarea value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} placeholder="รายละเอียดเพิ่มเติม" />
                            <Button type="submit">ส่ง</Button>
                        </form>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>ของฉัน</CardTitle></CardHeader>
                    <CardContent className="space-y-1 text-sm">
                        {mine.map((row) => <p key={row.id}>{row.topic} · {REASON[row.reason]}</p>)}
                    </CardContent>
                </Card>
                {canEdit && (
                    <Card>
                        <CardHeader><CardTitle>อันดับเรื่องที่ถูกขอ</CardTitle></CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            {ranking.map((row) => <p key={row.topic}>{row.topic} · {row.total} คน</p>)}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
