import React from 'react';
import { useForm, Link } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BreadcrumbItem } from '@/types';
import { ArrowLeft, Save, Briefcase } from 'lucide-react';

interface Position {
  id: number;
  name: string;
  description: string | null;
}

interface Props {
  position?: Position;
  positionOptions: string[];
}

export default function PositionForm({ position, positionOptions }: Props) {
  const isEdit = !!position;

  const { data, setData, post, put, processing, errors } = useForm({
    name: position?.name || '',
    description: position?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      put(`/settings/positions/${position?.id}`);
    } else {
      post('/settings/positions');
    }
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'ตั้งค่าโปรไฟล์', href: '/settings/profile' },
    { title: 'จัดการตำแหน่งงาน', href: '/settings/positions' },
    { title: isEdit ? 'แก้ไขตำแหน่ง' : 'เพิ่มตำแหน่งใหม่', href: '#' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={isEdit ? 'แก้ไขตำแหน่งงาน' : 'เพิ่มตำแหน่งงานใหม่'} />
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link 
              href="/settings/positions" 
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              กลับไปยังรายการตำแหน่งงาน
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEdit ? 'แก้ไขตำแหน่งงาน' : 'เพิ่มตำแหน่งงานใหม่'}
            </h1>
            <p className="text-muted-foreground">
              {isEdit ? 'แก้ไขข้อมูลตำแหน่งงานในระบบ' : 'เพิ่มตำแหน่งงานใหม่เข้าสู่ระบบ'}
            </p>
          </div>

          <Card className="border-t-4 border-t-indigo-500 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                ข้อมูลตำแหน่งงาน
              </CardTitle>
              <CardDescription>
                กรุณากรอกรายละเอียดด้านล่าง ช่องที่มีเครื่องหมาย * จำเป็นต้องกรอก
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    ชื่อตำแหน่ง <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={data.name}
                    onValueChange={(value) => setData('name', value)}
                  >
                    <SelectTrigger id="name" className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}>
                      <SelectValue placeholder="เลือกตำแหน่งงาน" />
                    </SelectTrigger>
                    <SelectContent>
                      {positionOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    รายการนี้ดึงจากตำแหน่งผู้ใช้ในระบบและตำแหน่งที่เคยบันทึกไว้
                  </p>
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">คำอธิบาย</Label>
                  <Textarea
                    id="description"
                    placeholder="คำอธิบายเพิ่มเติมเกี่ยวกับตำแหน่งงาน (ไม่บังคับ)"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    rows={3}
                    className={errors.description ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                </div>

                <Separator className="my-6" />

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                  <Link href="/settings/positions" className="w-full sm:w-auto">
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
                      <>กำลังบันทึก...</>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มตำแหน่งงาน'}
                      </>
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
