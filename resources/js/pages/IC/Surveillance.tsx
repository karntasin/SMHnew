import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

interface Log {
  id: number;
  hn: string;
  patient_name: string;
  infection_type: string;
  status: string;
  infection_date: string;
  ward_name: string;
  reporter: { name: string };
}

interface Props {
  logs: {
    data: Log[];
    links: any[];
  };
}

export default function IcSurveillance({ logs }: Props) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHn, setSearchHn] = useState('');
  
  const { data, setData, post, processing, reset, errors } = useForm({
    hn: '',
    an: '',
    patient_name: '',
    admit_date: '',
    infection_date: new Date().toISOString().split('T')[0],
    ward_name: '',
    infection_type: '',
    organism: '',
    status: 'suspected',
    notes: '',
  });

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const response = await axios.get('/ic/surveillance/search', {
        params: { hn: searchHn }
      });
      setSearchResults(response.data);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setIsSearching(false);
    }
  };

  const selectPatient = (patient: any) => {
    setData((prev) => ({
      ...prev,
      hn: patient.hn,
      an: patient.an,
      patient_name: patient.patient_name,
      admit_date: patient.regdate,
      ward_name: patient.ward,
    }));
    setIsSearchOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/ic/surveillance', {
      onSuccess: () => {
        toast.success('บันทึกข้อมูลเรียบร้อย');
        reset();
      },
    });
  };

  return (
    <AppLayout breadcrumbs={[{ title: 'IC', href: '/ic' }, { title: 'Surveillance', href: '#' }]}>
      <Head title="IC Surveillance" />

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">ระบบเฝ้าระวังการติดเชื้อ (Surveillance)</h1>
            <p className="text-muted-foreground">ติดตามผู้ป่วยกลุ่มเสี่ยงและบันทึกข้อมูล HAI</p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> บันทึกเคสใหม่</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>บันทึกข้อมูลการติดเชื้อใหม่</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Search Section */}
                <div className="flex gap-2 items-end border-b pb-4">
                  <div className="flex-1 space-y-2">
                    <Label>ค้นหาผู้ป่วย (HN)</Label>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="ระบุ HN..." 
                            value={searchHn}
                            onChange={(e) => setSearchHn(e.target.value)}
                        />
                        <Button variant="secondary" onClick={handleSearch} disabled={isSearching}>
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </div>
                  </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="border rounded-md p-2 max-h-40 overflow-y-auto bg-muted/50">
                        <p className="text-xs font-medium mb-2 text-muted-foreground">ผลการค้นหา (เลือกรายการที่ต้องการ)</p>
                        {searchResults.map((item) => (
                            <div 
                                key={item.an} 
                                className="text-sm p-2 hover:bg-accent cursor-pointer rounded flex justify-between"
                                onClick={() => selectPatient(item)}
                            >
                                <span>{item.patient_name} (HN: {item.hn})</span>
                                <span className="text-muted-foreground">{item.ward} - {item.regdate}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>HN</Label>
                            <Input value={data.hn} readOnly className="bg-muted" />
                            {errors.hn && <p className="text-red-500 text-xs">{errors.hn}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>ชื่อ-สกุล</Label>
                            <Input value={data.patient_name} readOnly className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label>วันที่ Admit</Label>
                            <Input value={data.admit_date} readOnly className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label>หอผู้ป่วย</Label>
                            <Input value={data.ward_name} onChange={e => setData('ward_name', e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>วันที่วินิจฉัยติดเชื้อ</Label>
                        <Input type="date" value={data.infection_date} onChange={e => setData('infection_date', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>ประเภทการติดเชื้อ</Label>
                            <Select value={data.infection_type} onValueChange={v => setData('infection_type', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="เลือกประเภท" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="VAP">VAP (ปอดอักเสบจากการใช้เครื่องช่วยหายใจ)</SelectItem>
                                    <SelectItem value="CAUTI">CAUTI (ติดเชื้อทางเดินปัสสาวะจากสายสวน)</SelectItem>
                                    <SelectItem value="CLABSI">CLABSI (ติดเชื้อในกระแสเลือดจากสายสวน)</SelectItem>
                                    <SelectItem value="SSI">SSI (ติดเชื้อแผลผ่าตัด)</SelectItem>
                                    <SelectItem value="Other">อื่นๆ</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.infection_type && <p className="text-red-500 text-xs">{errors.infection_type}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>สถานะ</Label>
                            <Select value={data.status} onValueChange={v => setData('status', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="เลือกสถานะ" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="suspected">Suspected (สงสัย)</SelectItem>
                                    <SelectItem value="confirmed">Confirmed (ยืนยัน)</SelectItem>
                                    <SelectItem value="rejected">Rejected (ปฏิเสธ)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>เชื้อก่อโรค (Organism)</Label>
                        <Input value={data.organism} onChange={e => setData('organism', e.target.value)} placeholder="เช่น E. coli, K. pneumoniae" />
                    </div>

                    <div className="space-y-2">
                        <Label>หมายเหตุ</Label>
                        <Textarea value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </div>

                    <Button type="submit" className="w-full" disabled={processing}>บันทึกข้อมูล</Button>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>รายการเฝ้าระวังล่าสุด</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="p-3">วันที่</th>
                                <th className="p-3">ผู้ป่วย</th>
                                <th className="p-3">ประเภท</th>
                                <th className="p-3">หอผู้ป่วย</th>
                                <th className="p-3">สถานะ</th>
                                <th className="p-3">ผู้รายงาน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-4 text-center text-muted-foreground">ไม่พบข้อมูล</td>
                                </tr>
                            ) : (
                                logs.data.map((log) => (
                                    <tr key={log.id} className="border-t hover:bg-muted/50">
                                        <td className="p-3">{log.infection_date}</td>
                                        <td className="p-3">
                                            <div className="font-medium">{log.patient_name}</div>
                                            <div className="text-xs text-muted-foreground">HN: {log.hn}</div>
                                        </td>
                                        <td className="p-3">{log.infection_type}</td>
                                        <td className="p-3">{log.ward_name}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                log.status === 'confirmed' ? 'bg-red-100 text-red-700' :
                                                log.status === 'suspected' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="p-3">{log.reporter?.name}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
