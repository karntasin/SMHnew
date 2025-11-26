import React from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, ArrowLeft, Layers, Shield } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { BreadcrumbItem } from '@/types';

interface PermissionFormProps {
  permission?: {
    id: number;
    name: string;
    group: string | null;
  };
  groups?: string[];
}

export default function PermissionForm({ permission, groups = [] }: PermissionFormProps) {
  const isEdit = !!permission;

  const { data, setData, processing, errors } = useForm({
    name: permission?.name || '',
    group: permission?.group || '',
    newGroup: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: data.name,
      group: data.newGroup.trim() !== '' ? data.newGroup.trim() : data.group,
    };

    if (isEdit) {
      router.put(`/permissions/${permission?.id}`, payload);
    } else {
      router.post('/permissions', payload);
    }
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'การจัดการสิทธิ์', href: '/permissions' },
    { title: isEdit ? 'แก้ไขสิทธิ์' : 'เพิ่มสิทธิ์ใหม่', href: '#' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={isEdit ? 'แก้ไขสิทธิ์' : 'เพิ่มสิทธิ์ใหม่'} />

      <div className="flex-1 p-4 md:p-6 max-w-2xl mx-auto">
        <Card className="border-t-4 border-t-indigo-500 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Shield className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">
                  {isEdit ? 'แก้ไขข้อมูลสิทธิ์' : 'เพิ่มสิทธิ์ใหม่'}
                </CardTitle>
                <CardDescription>
                  {isEdit ? 'แก้ไขรายละเอียดของสิทธิ์การใช้งาน' : 'สร้างสิทธิ์การใช้งานใหม่เพื่อกำหนดการเข้าถึง'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Permission Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-medium">ชื่อสิทธิ์ (Permission Name)</Label>
                <Input
                  id="name"
                  placeholder="เช่น: manage-users, view-reports"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.name ? (
                  <p className="text-sm text-red-500">{errors.name}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">ชื่อภาษาอังกฤษที่ใช้ในโค้ด เช่น 'create-posts'</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Select Group */}
                <div className="space-y-2">
                  <Label htmlFor="group" className="text-base font-medium flex items-center gap-2">
                    <Layers className="h-4 w-4" /> เลือกกลุ่มที่มีอยู่
                  </Label>
                  <Select 
                    value={data.group || ''} 
                    onValueChange={(val) => {
                      setData('group', val);
                      if (val) setData('newGroup', ''); // Clear new group if existing selected
                    }}
                    disabled={!!data.newGroup}
                  >
                    <SelectTrigger className={!!data.newGroup ? 'opacity-50' : ''}>
                      <SelectValue placeholder="เลือกกลุ่ม..." />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group} value={group}>
                          {group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.group && <p className="text-sm text-red-500">{errors.group}</p>}
                </div>

                {/* New Group */}
                <div className="space-y-2">
                  <Label htmlFor="newGroup" className="text-base font-medium">หรือ สร้างกลุ่มใหม่</Label>
                  <Input
                    id="newGroup"
                    placeholder="เช่น: Reports, Settings"
                    value={data.newGroup}
                    onChange={(e) => {
                      setData('newGroup', e.target.value);
                      if (e.target.value) setData('group', ''); // Clear existing selection if typing new
                    }}
                    className={!!data.group ? 'opacity-50' : ''}
                  />
                </div>
              </div>

              <div className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground border border-dashed">
                <p><strong>หมายเหตุ:</strong> หากกรอก "สร้างกลุ่มใหม่" ระบบจะใช้ชื่อกลุ่มใหม่แทนการเลือกจากรายการ</p>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <Link href="/permissions">
                  <Button type="button" variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    ย้อนกลับ
                  </Button>
                </Link>
                <Button type="submit" disabled={processing} className="bg-indigo-600 hover:bg-indigo-700">
                  <Save className="mr-2 h-4 w-4" />
                  {processing
                    ? (isEdit ? 'กำลังบันทึก...' : 'กำลังเพิ่ม...')
                    : (isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มสิทธิ์')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
