import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BreadcrumbItem } from '@/types';
import { ArrowLeft, FileDown, Plus, Save, Trash2, Users } from 'lucide-react';

interface TeamMemberRow {
  id?: number;
  user_id: number | null;
  name: string;
  role: string;
  job_title: string;
  sort_order: number;
}

interface TeamHa {
  id: number;
  abbreviation: string;
  name_th: string;
  name_en: string | null;
  members?: TeamMemberRow[];
}

interface UserOption {
  id: number;
  name: string;
  position: string | null;
}

interface RoleOption {
  value: string;
  label: string;
}

interface Props {
  team?: TeamHa;
  users: UserOption[];
  roleOptions: RoleOption[];
}

const emptyMember = (role = 'committee'): TeamMemberRow => ({
  user_id: null,
  name: '',
  role,
  job_title: '',
  sort_order: 0,
});

export default function TeamhaForm({ team, users, roleOptions }: Props) {
  const isEditing = !!team;

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'ตั้งค่า', href: '/settingsapp' },
    { title: 'จัดการทีม HA', href: '/settings/teamha' },
    { title: isEditing ? 'แก้ไข' : 'เพิ่มใหม่', href: '#' },
  ];

  const { data, setData, post, put, processing, errors } = useForm({
    abbreviation: team?.abbreviation || '',
    name_th: team?.name_th || '',
    name_en: team?.name_en || '',
    members: (team?.members?.length
      ? team.members.map((m, i) => ({
          id: m.id,
          user_id: m.user_id,
          name: m.name || '',
          role: m.role || 'committee',
          job_title: m.job_title || '',
          sort_order: m.sort_order ?? i,
        }))
      : []) as TeamMemberRow[],
  });

  const updateMember = (index: number, patch: Partial<TeamMemberRow>) => {
    const next = data.members.map((row, i) => (i === index ? { ...row, ...patch } : row));
    setData('members', next);
  };

  const addMember = () => {
    setData('members', [...data.members, { ...emptyMember(), sort_order: data.members.length }]);
  };

  const removeMember = (index: number) => {
    setData(
      'members',
      data.members.filter((_, i) => i !== index).map((row, i) => ({ ...row, sort_order: i })),
    );
  };

  const pickUser = (index: number, userId: string) => {
    if (userId === '__none__') {
      updateMember(index, { user_id: null });
      return;
    }
    const user = users.find((u) => String(u.id) === userId);
    if (!user) return;
    updateMember(index, {
      user_id: user.id,
      name: user.name,
      job_title: data.members[index].job_title || user.position || '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      put(`/settings/teamha/${team.id}`);
    } else {
      post('/settings/teamha');
    }
  };

  const memberError = (index: number, field: string) =>
    (errors as Record<string, string>)[`members.${index}.${field}`];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={isEditing ? 'แก้ไขทีม HA' : 'เพิ่มทีม HA'} />

      <div className="container mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/settings/teamha">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <Users className="h-6 w-6 text-primary" />
                {isEditing ? 'แก้ไขทีม HA' : 'เพิ่มทีม HA'}
              </h1>
              <p className="text-muted-foreground">
                {isEditing ? 'แก้ไขข้อมูลทีมและรายชื่อสมาชิก' : 'เพิ่มทีม HA พร้อมรายชื่อสมาชิก'}
              </p>
            </div>
          </div>
          {isEditing && (
            <a href={`/settings/teamha/export-pdf?team_id=${team.id}`} target="_blank" rel="noreferrer">
              <Button type="button" variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                PDF ทีมนี้
              </Button>
            </a>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลทีม HA</CardTitle>
              <CardDescription>กรอกรหัสย่อและชื่อทีม</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="abbreviation">
                  รหัสย่อ <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="abbreviation"
                  value={data.abbreviation}
                  onChange={(e) => setData('abbreviation', e.target.value)}
                  placeholder="เช่น ENV, IC, PCT"
                  className={errors.abbreviation ? 'border-destructive' : ''}
                />
                {errors.abbreviation && <p className="text-sm text-destructive">{errors.abbreviation}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name_th">
                  ชื่อทีม (ภาษาไทย) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name_th"
                  value={data.name_th}
                  onChange={(e) => setData('name_th', e.target.value)}
                  placeholder="ชื่อทีมภาษาไทย"
                  className={errors.name_th ? 'border-destructive' : ''}
                />
                {errors.name_th && <p className="text-sm text-destructive">{errors.name_th}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name_en">ชื่อทีม (ภาษาอังกฤษ)</Label>
                <Input
                  id="name_en"
                  value={data.name_en}
                  onChange={(e) => setData('name_en', e.target.value)}
                  placeholder="Team name in English"
                  className={errors.name_en ? 'border-destructive' : ''}
                />
                {errors.name_en && <p className="text-sm text-destructive">{errors.name_en}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>รายชื่อสมาชิกทีม</CardTitle>
                <CardDescription>
                  เพิ่มเจ้าหน้าที่พร้อมตำแหน่งในทีม เช่น ประธาน รองประธาน กรรมการ เลขานุการ ผู้ช่วยเลขานุการ
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addMember}>
                <Plus className="mr-1 h-4 w-4" />
                เพิ่มรายชื่อ
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.members.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                  ยังไม่มีสมาชิก — กด “เพิ่มรายชื่อ” เพื่อเพิ่มผู้ที่อยู่ในทีม
                </div>
              ) : (
                data.members.map((member, index) => (
                  <div
                    key={member.id ?? `new-${index}`}
                    className="space-y-3 rounded-xl border bg-slate-50/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-700">สมาชิก #{index + 1}</div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeMember(index)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        ลบ
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>เลือกจากผู้ใช้ในระบบ</Label>
                        <Select
                          value={member.user_id ? String(member.user_id) : '__none__'}
                          onValueChange={(value) => pickUser(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="ไม่ระบุ / พิมพ์ชื่อเอง" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">ไม่ระบุ / พิมพ์ชื่อเอง</SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={String(user.id)}>
                                {user.name}
                                {user.position ? ` · ${user.position}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>
                          ตำแหน่งในทีม <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={member.role}
                          onValueChange={(value) => updateMember(index, { role: value })}
                        >
                          <SelectTrigger className={memberError(index, 'role') ? 'border-destructive' : ''}>
                            <SelectValue placeholder="เลือกตำแหน่ง" />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {memberError(index, 'role') && (
                          <p className="text-sm text-destructive">{memberError(index, 'role')}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>
                          ชื่อ-สกุล <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={member.name}
                          onChange={(e) => updateMember(index, { name: e.target.value })}
                          placeholder="ชื่อ-นามสกุล"
                          className={memberError(index, 'name') ? 'border-destructive' : ''}
                        />
                        {memberError(index, 'name') && (
                          <p className="text-sm text-destructive">{memberError(index, 'name')}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>ตำแหน่งงาน (ถ้ามี)</Label>
                        <Input
                          value={member.job_title}
                          onChange={(e) => updateMember(index, { job_title: e.target.value })}
                          placeholder="เช่น พยาบาลวิชาชีพ / หัวหน้างาน"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
              {errors.members && typeof errors.members === 'string' && (
                <p className="text-sm text-destructive">{errors.members}</p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={processing}>
              <Save className="mr-2 h-4 w-4" />
              {processing ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
            <Link href="/settings/teamha">
              <Button type="button" variant="outline">
                ยกเลิก
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
