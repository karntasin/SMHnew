import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Search } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

export default function MraCreate() {
  const { data, setData, post, processing, errors } = useForm({
    hn: '',
    vn: '',
    an: '',
    patient_name: '',
    visit_date: new Date().toISOString().split('T')[0],
    doctor_name: '',
    department: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/mra');
  };

  // Function to fetch data from HOSxP
  const handleSearch = async () => {
    if (!data.hn) return;
    
    try {
      const response = await axios.get(`/mra/search-patient`, {
        params: { hn: data.hn }
      });
      
      const result = response.data;
      
      setData((prev) => ({
        ...prev,
        patient_name: result.patient_name,
        // vn: result.vn || '', // If we fetched VN
      }));
      toast.success('ดึงข้อมูลผู้ป่วยเรียบร้อยแล้ว');
    } catch (error) {
      console.error(error);
      toast.error('ไม่พบข้อมูลผู้ป่วย หรือการเชื่อมต่อมีปัญหา');
    }
  };

  const breadcrumbs = [
    { title: 'งานคุณภาพ', href: '#' },
    { title: 'MRA', href: '/mra' },
    { title: 'สร้างการตรวจสอบใหม่', href: '#' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="สร้างการตรวจสอบใหม่" />

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/mra">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">สร้างการตรวจสอบใหม่</h1>
            <p className="text-muted-foreground">ระบุข้อมูลผู้ป่วยเพื่อเริ่มกระบวนการตรวจสอบ (Audit)</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลผู้ป่วย (Patient Info)</CardTitle>
            <CardDescription>ดึงข้อมูลจากระบบ HOSxP หรือระบุด้วยตนเอง</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="hn">HN (Hospital Number)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="hn"
                      value={data.hn}
                      onChange={(e) => setData('hn', e.target.value)}
                      placeholder="ระบุ HN..."
                      className={errors.hn ? 'border-red-500' : ''}
                    />
                    <Button type="button" variant="secondary" onClick={handleSearch}>
                      <Search className="h-4 w-4 mr-2" /> ค้นหา
                    </Button>
                  </div>
                  {errors.hn && <p className="text-sm text-red-500">{errors.hn}</p>}
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="vn">VN (Visit Number)</Label>
                  <Input
                    id="vn"
                    value={data.vn}
                    onChange={(e) => setData('vn', e.target.value)}
                    placeholder="ระบุ VN..."
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="an">AN (Admission Number)</Label>
                  <Input
                    id="an"
                    value={data.an}
                    onChange={(e) => setData('an', e.target.value)}
                    placeholder="ระบุ AN (ถ้ามี)..."
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="patient_name">ชื่อ-นามสกุล ผู้ป่วย</Label>
                  <Input
                    id="patient_name"
                    value={data.patient_name}
                    onChange={(e) => setData('patient_name', e.target.value)}
                    className={errors.patient_name ? 'border-red-500' : ''}
                  />
                  {errors.patient_name && <p className="text-sm text-red-500">{errors.patient_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visit_date">วันที่รับบริการ</Label>
                  <Input
                    id="visit_date"
                    type="date"
                    value={data.visit_date}
                    onChange={(e) => setData('visit_date', e.target.value)}
                    className={errors.visit_date ? 'border-red-500' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doctor_name">แพทย์ผู้รักษา</Label>
                  <Input
                    id="doctor_name"
                    value={data.doctor_name}
                    onChange={(e) => setData('doctor_name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">แผนก / คลินิก</Label>
                  <Input
                    id="department"
                    value={data.department}
                    onChange={(e) => setData('department', e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={processing}>
                  <Save className="mr-2 h-4 w-4" /> บันทึกและเริ่มตรวจสอบ
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
