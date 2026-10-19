import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';
import { ArrowLeft, Save, Building2, Plus, Trash2, Check, ChevronsUpDown } from 'lucide-react';

interface LeaderRow {
  id?: number;
  user_id: number | null;
  role: string;
  sort_order: number;
}

interface Department {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  leaders?: LeaderRow[];
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
  department?: Department;
  users: UserOption[];
  roleOptions: RoleOption[];
}

const emptyLeader = (): LeaderRow => ({
  user_id: null,
  role: 'head',
  sort_order: 0,
});

function userLabel(user: UserOption): string {
  return `${user.name}${user.position ? ` · ${user.position}` : ''}`;
}

function UserPicker({
  users,
  value,
  onChange,
  invalid,
}: {
  users: UserOption[];
  value: number | null;
  onChange: (userId: number) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = users.find((user) => user.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            invalid && 'border-destructive',
            !selected && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{selected ? userLabel(selected) : 'ค้นหาหรือเลือกผู้ใช้'}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command
          filter={(value, search) => {
            const query = search.trim().toLowerCase();
            if (!query) return 1;
            return value.toLowerCase().includes(query) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="ค้นหาชื่อหรือตำแหน่ง..." />
          <CommandList>
            <CommandEmpty>ไม่พบชื่อที่ค้นหา</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`${userLabel(user)} ${user.id}`}
                  onSelect={() => {
                    onChange(user.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('h-4 w-4', value === user.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{userLabel(user)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function DepartmentForm({ department, users, roleOptions }: Props) {
  const isEditing = !!department;

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'ตั้งค่า', href: '/settingsapp' },
    { title: 'จัดการแผนก', href: '/settings/departments' },
    { title: isEditing ? 'แก้ไข' : 'เพิ่มใหม่', href: '#' },
  ];

  const { data, setData, post, put, processing, errors } = useForm({
    name: department?.name || '',
    code: department?.code || '',
    description: department?.description || '',
    is_active: department?.is_active ?? true,
    leaders: (department?.leaders?.length
      ? department.leaders.map((leader, index) => ({
          id: leader.id,
          user_id: leader.user_id,
          role: leader.role || 'head',
          sort_order: leader.sort_order ?? index,
        }))
      : []) as LeaderRow[],
  });

  const updateLeader = (index: number, patch: Partial<LeaderRow>) => {
    setData(
      'leaders',
      data.leaders.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const addLeader = () => {
    setData('leaders', [...data.leaders, { ...emptyLeader(), sort_order: data.leaders.length }]);
  };

  const removeLeader = (index: number) => {
    setData(
      'leaders',
      data.leaders.filter((_, i) => i !== index).map((row, i) => ({ ...row, sort_order: i })),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      put(`/settings/departments/${department.id}`);
    } else {
      post('/settings/departments');
    }
  };

  const leaderError = (index: number, field: string) =>
    (errors as Record<string, string>)[`leaders.${index}.${field}`];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={isEditing ? 'แก้ไขแผนก' : 'เพิ่มแผนก'} />

      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/settings/departments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              {isEditing ? 'แก้ไขแผนก' : 'เพิ่มแผนก'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing
                ? 'แก้ไขข้อมูลแผนก หัวหน้า และผู้ช่วย'
                : 'เพิ่มแผนกพร้อมกำหนดหัวหน้าและผู้ช่วย'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลแผนก</CardTitle>
              <CardDescription>กรอกข้อมูลแผนกให้ครบถ้วน</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="code">รหัสย่อ</Label>
                <Input
                  id="code"
                  value={data.code}
                  onChange={(e) => setData('code', e.target.value)}
                  placeholder="เช่น HR, IT, FIN"
                  className={errors.code ? 'border-destructive' : ''}
                />
                {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  ชื่อแผนก <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  placeholder="ชื่อแผนก"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">คำอธิบาย</Label>
                <Textarea
                  id="description"
                  value={data.description}
                  onChange={(e) => setData('description', e.target.value)}
                  placeholder="คำอธิบายเพิ่มเติม (ถ้ามี)"
                  rows={3}
                  className={errors.description ? 'border-destructive' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={data.is_active}
                  onCheckedChange={(checked) => setData('is_active', checked)}
                />
                <Label htmlFor="is_active">เปิดใช้งาน</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>หัวหน้าและผู้ช่วยแผนกฝ่าย</CardTitle>
                <CardDescription>
                  เลือกผู้ใช้ในระบบแล้วกำหนดเป็นหัวหน้าหรือผู้ช่วย เมื่อบันทึกจะเพิ่มบทบาท header ให้โดยอัตโนมัติถ้ายังไม่มี
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addLeader}>
                <Plus className="mr-1 h-4 w-4" />
                เพิ่มรายชื่อ
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.leaders.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                  ยังไม่มีหัวหน้าหรือผู้ช่วย — กด “เพิ่มรายชื่อ” เพื่อกำหนด
                </div>
              ) : (
                data.leaders.map((leader, index) => (
                  <div
                    key={leader.id ?? `new-${index}`}
                    className="space-y-3 rounded-xl border bg-slate-50/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-700">รายชื่อ #{index + 1}</div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeLeader(index)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        ลบ
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>
                          ผู้ใช้ในระบบ <span className="text-destructive">*</span>
                        </Label>
                        <UserPicker
                          users={users}
                          value={leader.user_id}
                          invalid={Boolean(leaderError(index, 'user_id'))}
                          onChange={(userId) => updateLeader(index, { user_id: userId })}
                        />
                        {leaderError(index, 'user_id') && (
                          <p className="text-sm text-destructive">{leaderError(index, 'user_id')}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>
                          ตำแหน่ง <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={leader.role}
                          onValueChange={(value) => updateLeader(index, { role: value })}
                        >
                          <SelectTrigger className={leaderError(index, 'role') ? 'border-destructive' : ''}>
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
                        {leaderError(index, 'role') && (
                          <p className="text-sm text-destructive">{leaderError(index, 'role')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {errors.leaders && typeof errors.leaders === 'string' && (
                <p className="text-sm text-destructive">{errors.leaders}</p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={processing}>
              <Save className="mr-2 h-4 w-4" />
              {processing ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
            <Link href="/settings/departments">
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
