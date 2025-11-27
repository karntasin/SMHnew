import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BreadcrumbItem } from '@/types';
import { ArrowLeft, Save, Users } from 'lucide-react';

interface TeamHa {
  id: number;
  abbreviation: string;
  name_th: string;
  name_en: string | null;
}

interface Props {
  team?: TeamHa;
}

export default function TeamhaForm({ team }: Props) {
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
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      put(`/settings/teamha/${team.id}`);
    } else {
      post('/settings/teamha');
    }
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={isEditing ? 'แก้ไขทีม HA' : 'เพิ่มทีม HA'} />

      <div className="container mx-auto py-6 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/settings/teamha">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              {isEditing ? 'แก้ไขทีม HA' : 'เพิ่มทีม HA'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? 'แก้ไขข้อมูลทีม HA' : 'เพิ่มทีม HA ใหม่ในระบบ'}
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลทีม HA</CardTitle>
            <CardDescription>
              กรอกข้อมูลทีม HA ให้ครบถ้วน
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                {errors.abbreviation && (
                  <p className="text-sm text-destructive">{errors.abbreviation}</p>
                )}
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
                {errors.name_th && (
                  <p className="text-sm text-destructive">{errors.name_th}</p>
                )}
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
                {errors.name_en && (
                  <p className="text-sm text-destructive">{errors.name_en}</p>
                )}
              </div>

              <div className="flex gap-4 pt-4">
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
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
