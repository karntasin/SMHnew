import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Item {
    id: number;
    title: string;
    scope: string;
    is_required: boolean;
    course?: { id: number; title: string } | null;
    department?: { name: string } | null;
}

function checked(checks: Record<string, unknown> | unknown[], id: number) {
    if (Array.isArray(checks)) return false;
    return Boolean(checks?.[id] || checks?.[String(id)]);
}

export default function Orientation({
    target,
    items,
    checks,
    clearance,
    ready,
    canEdit,
    canConfigure = false,
    users,
    departments,
    courses,
    catalog,
}: {
    target: { id: number; name: string };
    items: Item[];
    checks: Record<string, { checked_at: string }>;
    clearance: { cleared_at: string } | null;
    ready: boolean;
    canEdit: boolean;
    canConfigure?: boolean;
    users: { id: number; name: string }[];
    departments: { id: number; name: string }[];
    courses: { id: number; title: string }[];
    catalog: Item[];
}) {
    const form = useForm({ scope: 'org', department_id: '', title: '', course_id: '', is_required: true });

    return (
        <AppLayout breadcrumbs={[{ title: 'พัฒนาบุคลากร', href: '/km/learn/hub' }, { title: 'ปฐมนิเทศ', href: '/km/learn/orientation' }]}>
            <Head title="ปฐมนิเทศบุคลากรใหม่" />
            <div className="space-y-4 p-6">
                <h1 className="text-2xl font-bold">ปฐมนิเทศของ {target.name}</h1>
                {clearance ? <p className="text-emerald-700">รับรองขึ้นปฏิบัติงานอิสระแล้ว</p> : <p className="text-muted-foreground">ต้องผ่านรายการบังคับก่อนขึ้นปฏิบัติงานอิสระ</p>}
                {canEdit && (
                    <select className="h-10 rounded-md border px-3 text-sm" value={target.id} onChange={(e) => router.get(route('km.learn.orientation'), { user_id: e.target.value })}>
                        {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                    </select>
                )}
                <Card>
                    <CardHeader><CardTitle>รายการที่ต้องผ่าน</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {items.map((item) => (
                            <label key={item.id} className="flex items-start gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    disabled={!canEdit}
                                    checked={checked(checks, item.id)}
                                    onChange={(e) => router.post(route('km.learn.orientation.checks'), { user_id: target.id, item_id: item.id, checked: e.target.checked })}
                                />
                                <span>
                                    {item.title} {item.is_required ? '(บังคับ)' : ''}
                                    {item.course && <a className="ml-2 underline" href={route('km.learn.courses.show', item.course.id)}>{item.course.title}</a>}
                                </span>
                            </label>
                        ))}
                        {canEdit && ready && !clearance && (
                            <Button onClick={() => router.post(route('km.learn.orientation.clearance'), { user_id: target.id })}>รับรองขึ้นปฏิบัติงานอิสระ</Button>
                        )}
                    </CardContent>
                </Card>
                {canConfigure && (
                    <Card>
                        <CardHeader><CardTitle>จัดการชุดปฐมนิเทศ</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); form.post(route('km.learn.orientation.items.store')); }}>
                                <div>
                                    <Label>ชุด</Label>
                                    <select className="h-10 w-full rounded-md border px-3 text-sm" value={form.data.scope} onChange={(e) => form.setData('scope', e.target.value)}>
                                        <option value="org">ทั้งองค์กร</option>
                                        <option value="department">รายกลุ่มงาน</option>
                                    </select>
                                </div>
                                {form.data.scope === 'department' && (
                                    <select className="h-10 rounded-md border px-3 text-sm" value={form.data.department_id} onChange={(e) => form.setData('department_id', e.target.value)}>
                                        <option value="">กลุ่มงาน</option>
                                        {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                                    </select>
                                )}
                                <Input value={form.data.title} placeholder="รายการ" onChange={(e) => form.setData('title', e.target.value)} required />
                                <select className="h-10 rounded-md border px-3 text-sm" value={form.data.course_id} onChange={(e) => form.setData('course_id', e.target.value)}>
                                    <option value="">ไม่ผูกหลักสูตร</option>
                                    {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                                </select>
                                <Button type="submit">เพิ่มรายการ</Button>
                            </form>
                            {catalog.map((item) => (
                                <p key={item.id} className="flex justify-between text-sm">
                                    <span>{item.scope === 'org' ? 'องค์กร' : item.department?.name} · {item.title}</span>
                                    <Button size="sm" variant="outline" onClick={() => router.delete(route('km.learn.orientation.items.destroy', item.id))}>ลบ</Button>
                                </p>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
