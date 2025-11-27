import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BreadcrumbItem } from '@/types';
import { ArrowLeft, Save, Building2 } from 'lucide-react';

interface Department {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
}

interface Props {
  department?: Department;
}

export default function DepartmentForm({ department }: Props) {
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
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      put(`/settings/departments/${department.id}`);
    } else {
      post('/settings/departments');
    }
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={isEditing ? 'แก้ไขแผนก' : 'เพิ่มแผนก'} />

      <div className="container mx-auto py-6 px-4 max-w-2xl">
        {/* Header */}
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
              {isEditing ? 'แก้ไขข้อมูลแผนก' : 'เพิ่มแผนกใหม่ในระบบ'}
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลแผนก</CardTitle>
            <CardDescription>
              กรอกข้อมูลแผนกให้ครบถ้วน
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="code">รหัสย่อ</Label>
                <Input
                  id="code"
                  value={data.code}
                  onChange={(e) => setData('code', e.target.value)}
                  placeholder="เช่น HR, IT, FIN"
                  className={errors.code ? 'border-destructive' : ''}
                />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code}</p>
                )}
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
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
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

              <div className="flex gap-4 pt-4">
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
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
