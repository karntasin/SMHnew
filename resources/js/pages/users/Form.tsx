import React from 'react';
import { useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BreadcrumbItem } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '../../components/ui/multiselect';
import DepartmentPicker, { type DepartmentOption } from '@/components/department-picker';
import HaTeamPicker, { type HaTeamOption } from '@/components/ha-team-picker';
import { User, Mail, Lock, Shield, ArrowLeft, Save } from 'lucide-react';

interface Role {
  id: number;
  name: string;
}

interface UserData {
  id?: number;
  name: string;
  email: string;
  role?: string;
  positions?: number[];
  department_ids?: number[];
  primary_department_id?: number | null;
  ha_team_ids?: number[];
}

interface Props {
  user?: UserData;
  roles: Role[];
  positions: any[];
  departments?: DepartmentOption[];
  haTeams?: HaTeamOption[];
  currentRole?: string;
}

export default function UserForm({ user, roles, positions, departments = [], haTeams = [], currentRole }: Props) {
  const isEdit = !!user;
  const initialDeptIds = user?.department_ids || [];
  const initialPrimary = user?.primary_department_id ?? initialDeptIds[0] ?? null;

  const { data, setData, post, put, processing, errors } = useForm({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: currentRole || '',
    positions: user?.positions || [],
    department_ids: initialDeptIds,
    primary_department_id: initialPrimary,
    ha_team_ids: user?.ha_team_ids || [],
  });

  const toggleDepartment = (deptId: number) => {
    const next = data.department_ids.includes(deptId)
      ? data.department_ids.filter((id) => id !== deptId)
      : [...data.department_ids, deptId];
    let primary = data.primary_department_id;
    if (next.length === 1) {
      primary = next[0];
    } else if (primary === null || !next.includes(primary)) {
      primary = next[0] ?? null;
    }
    setData({
      ...data,
      department_ids: next,
      primary_department_id: primary,
    });
  };

  const removeDepartment = (deptId: number) => {
    const next = data.department_ids.filter((id) => id !== deptId);
    setData({
      ...data,
      department_ids: next,
      primary_department_id: data.primary_department_id === deptId ? next[0] ?? null : data.primary_department_id,
    });
  };

  const toggleHaTeam = (teamId: number) => {
    const next = data.ha_team_ids.includes(teamId)
      ? data.ha_team_ids.filter((id) => id !== teamId)
      : [...data.ha_team_ids, teamId];
    setData('ha_team_ids', next);
  };

  const removeHaTeam = (teamId: number) => {
    setData('ha_team_ids', data.ha_team_ids.filter((id) => id !== teamId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    isEdit ? put(`/users/${user?.id}`) : post('/users');
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'การจัดการผู้ใช้งาน', href: '/users' },
    { title: isEdit ? 'แก้ไขผู้ใช้งาน' : 'สร้างผู้ใช้งาน', href: '#' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={isEdit ? 'แก้ไขผู้ใช้งาน' : 'สร้างผู้ใช้งาน'} />
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/users" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              กลับไปยังรายชื่อผู้ใช้งาน
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">{isEdit ? 'แก้ไขผู้ใช้งาน' : 'สร้างผู้ใช้งานใหม่'}</h1>
            <p className="text-muted-foreground">
              {isEdit ? 'อัปเดตข้อมูลผู้ใช้งาน แผนก ทีม และการกำหนดบทบาท' : 'เพิ่มผู้ใช้งานใหม่เข้าสู่ระบบ พร้อมแผนก ทีม และบทบาท'}
            </p>
          </div>

          <Card className="border-t-4 border-t-indigo-500 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลผู้ใช้งาน</CardTitle>
              <CardDescription>
                กรุณากรอกรายละเอียดด้านล่าง ช่องที่มีเครื่องหมาย * จำเป็นต้องกรอก
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      ชื่อ-นามสกุล <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="เช่น สมชาย ใจดี"
                      value={data.name}
                      onChange={(e) => setData('name', e.target.value)}
                      className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      อีเมล <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="เช่น somchai@example.com"
                      value={data.email}
                      onChange={(e) => setData('email', e.target.value)}
                      className={errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      รหัสผ่าน {isEdit ? '(เว้นว่างไว้หากไม่ต้องการเปลี่ยน)' : <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder={isEdit ? "••••••••" : "สร้างรหัสผ่าน"}
                      value={data.password}
                      onChange={(e) => setData('password', e.target.value)}
                      className={errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                  </div>

                  {/* Role */}
                  <div className="space-y-2">
                    <Label htmlFor="role" className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      การกำหนดบทบาท <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={data.role}
                      onValueChange={(value) => setData('role', value)}
                    >
                      <SelectTrigger className={errors.role ? 'border-red-500 focus:ring-red-500' : ''}>
                        <SelectValue placeholder="เลือกบทบาท" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.name}>
                            <div className="flex items-center gap-2">
                              <span className="capitalize">{role.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.role && <p className="text-sm text-red-500">{errors.role}</p>}
                    <p className="text-xs text-muted-foreground">
                      การกำหนดบทบาทจะเป็นตัวกำหนดสิทธิ์การใช้งานในระบบ
                    </p>
                  </div>
                  {/* Positions Multi-Select */}
                  <div className="space-y-2">
                    <Label htmlFor="positions" className="flex items-center gap-2">
                      ตำแหน่งงาน <span className="text-red-500">*</span>
                    </Label>
                    <MultiSelect
                      id="positions"
                      options={positions.map((p) => ({
                        value: p.id,
                        label: p.name,
                      }))}
                      value={data.positions}
                      onChange={(values) => setData('positions', values)}
                      placeholder="เลือกตำแหน่งงาน"
                    />
                    {errors.positions && <p className="text-sm text-red-500">{errors.positions}</p>}
                  </div>

                  <div className="space-y-6 md:col-span-2">
                    <DepartmentPicker
                      departments={departments}
                      selectedIds={data.department_ids}
                      primaryId={data.primary_department_id}
                      onToggle={toggleDepartment}
                      onRemove={removeDepartment}
                      onSetPrimary={(id) => setData('primary_department_id', id)}
                      error={errors.department_ids || errors.primary_department_id}
                    />
                    <HaTeamPicker
                      teams={haTeams}
                      selectedIds={data.ha_team_ids}
                      onToggle={toggleHaTeam}
                      onRemove={removeHaTeam}
                      error={errors.ha_team_ids}
                    />
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                  <Link href="/users" className="w-full sm:w-auto">
                    <Button type="button" variant="outline" className="w-full">
                      ยกเลิก
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    disabled={processing} 
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700"
                  >
                    {processing ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">↻</span> กำลังบันทึก...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        {isEdit ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างผู้ใช้งาน'}
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
