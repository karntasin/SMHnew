import React, { useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BreadcrumbItem } from '@/types';
import { ArrowLeft, Save, ClipboardList } from 'lucide-react';

const UNSPECIFIED_POSITION = '__none__';

interface StaffMember {
  id: number;
  prefix: string | null;
  first_name: string;
  last_name: string;
  position: string | null;
  phone: string | null;
  cid: string | null;
  role_name: string;
  is_active: boolean;
}

interface RoleOption {
  value: string;
  label: string;
}

interface Props {
  staffMember?: StaffMember;
  roleOptions: RoleOption[];
  positionOptions: string[];
}

export default function StaffRosterForm({ staffMember, roleOptions, positionOptions }: Props) {
  const isEditing = !!staffMember;

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'ตั้งค่า', href: '/settings-hub' },
    { title: 'จัดการเจ้าหน้าที่', href: '/settings/staff' },
    { title: isEditing ? 'แก้ไข' : 'เพิ่มใหม่', href: '#' },
  ];

  const { data, setData, post, put, processing, errors } = useForm({
    prefix: staffMember?.prefix || '',
    first_name: staffMember?.first_name || '',
    last_name: staffMember?.last_name || '',
    position: staffMember?.position || UNSPECIFIED_POSITION,
    phone: staffMember?.phone || '',
    cid: staffMember?.cid || '',
    role_name: staffMember?.role_name || 'user',
    is_active: staffMember?.is_active ?? true,
  });

  const dropdownPositions = useMemo(() => {
    const options = [...positionOptions];
    if (data.position && data.position !== UNSPECIFIED_POSITION && !options.includes(data.position)) {
      options.unshift(data.position);
    }
    return options;
  }, [positionOptions, data.position]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      put(`/settings/staff/${staffMember.id}`);
    } else {
      post('/settings/staff');
    }
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={isEditing ? 'แก้ไขเจ้าหน้าที่' : 'เพิ่มเจ้าหน้าที่'} />

      <div className="container mx-auto py-6 px-4 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/settings/staff">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              {isEditing ? 'แก้ไขเจ้าหน้าที่' : 'เพิ่มเจ้าหน้าที่'}
            </h1>
            <p className="text-muted-foreground">
              ชื่อและเลขบัตรในรายการนี้ใช้ตรวจตอนสมัครเข้าใช้ระบบ
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลเจ้าหน้าที่</CardTitle>
            <CardDescription>
              ต้องตรงกับชื่อหรือเลขบัตรที่กรอกตอนสมัคร จึงจะเข้าใช้งานได้
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prefix">คำนำหน้า</Label>
                  <Input
                    id="prefix"
                    value={data.prefix}
                    onChange={(e) => setData('prefix', e.target.value)}
                    placeholder="นาย / นาง / นางสาว"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="first_name">
                    ชื่อ <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    value={data.first_name}
                    onChange={(e) => setData('first_name', e.target.value)}
                    className={errors.first_name ? 'border-destructive' : ''}
                  />
                  {errors.first_name && <p className="text-sm text-destructive">{errors.first_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">
                    นามสกุล <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    value={data.last_name}
                    onChange={(e) => setData('last_name', e.target.value)}
                    className={errors.last_name ? 'border-destructive' : ''}
                  />
                  {errors.last_name && <p className="text-sm text-destructive">{errors.last_name}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cid">เลขบัตรประชาชน 13 หลัก</Label>
                <Input
                  id="cid"
                  inputMode="numeric"
                  maxLength={13}
                  value={data.cid}
                  onChange={(e) => setData('cid', e.target.value.replace(/\D/g, '').slice(0, 13))}
                  placeholder="ใช้ตรวจตอนสมัคร"
                  className={errors.cid ? 'border-destructive' : ''}
                />
                {errors.cid && <p className="text-sm text-destructive">{errors.cid}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">เบอร์โทร</Label>
                  <Input
                    id="phone"
                    value={data.phone}
                    onChange={(e) => setData('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ตำแหน่ง</Label>
                  <Select
                    value={data.position || UNSPECIFIED_POSITION}
                    onValueChange={(value) => setData('position', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกตำแหน่ง" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNSPECIFIED_POSITION}>ไม่ระบุ</SelectItem>
                      {dropdownPositions.map((position) => (
                        <SelectItem key={position} value={position}>
                          {position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>บทบาทตอนสมัคร</Label>
                <Select value={data.role_name} onValueChange={(value) => setData('role_name', value)}>
                  <SelectTrigger className={errors.role_name ? 'border-destructive' : ''}>
                    <SelectValue placeholder="เลือกบทบาท" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role_name && <p className="text-sm text-destructive">{errors.role_name}</p>}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={data.is_active}
                  onCheckedChange={(checked) => setData('is_active', checked)}
                />
                <Label htmlFor="is_active">เปิดสิทธิ์สมัครเข้าใช้ระบบ</Label>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={processing}>
                  <Save className="mr-2 h-4 w-4" />
                  {processing ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
                <Link href="/settings/staff">
                  <Button type="button" variant="outline">
                    ยกเลิก
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
