import React from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { QualityPage, Panel, EmptyState } from '@/components/quality/quality-ui';
import IcSubNav from '@/pages/IC/IcSubNav';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface Incident {
  id: number;
  incident_date: string;
  incident_type: string;
  location: string;
  severity: string;
  status: string;
  reporter: { name: string };
}

interface Props {
  incidents: {
    data: Incident[];
    links: any[];
  };
}

const IC_BREADCRUMBS = [
  { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
  { title: 'Infection Control (IC)', href: '/ic' },
  { title: 'อุบัติการณ์', href: '/ic/incidents' },
];

export default function IcIncidents({ incidents }: Props) {
  const { data, setData, post, processing, reset, errors } = useForm({
    incident_date: new Date().toISOString().slice(0, 16),
    location: '',
    incident_type: '',
    description: '',
    severity: 'low',
    action_taken: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/ic/incidents', {
      onSuccess: () => {
        toast.success('รายงานอุบัติการณ์เรียบร้อย');
        reset();
      },
    });
  };

  return (
    <QualityPage
      tone="rose"
      icon={ShieldAlert}
      badge="ศูนย์พัฒนาคุณภาพ · IC"
      title="รายงานอุบัติการณ์ (Incidents)"
      subtitle="แจ้งเหตุเข็มตำ สัมผัสสารคัดหลั่ง หรือการละเมิดแนวปฏิบัติ"
      headTitle="IC Incidents"
      breadcrumbs={IC_BREADCRUMBS}
      subNav={<IcSubNav active="ic.incidents" />}
      actions={
        <Dialog>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-rose-600 hover:bg-rose-700">
              <AlertTriangle className="mr-2 h-4 w-4" /> แจ้งเหตุใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>แจ้งอุบัติการณ์ IC</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>วันเวลาที่เกิดเหตุ</Label>
                <Input
                  type="datetime-local"
                  value={data.incident_date}
                  onChange={(e) => setData('incident_date', e.target.value)}
                />
                {errors.incident_date && <p className="text-xs text-rose-500">{errors.incident_date}</p>}
              </div>

              <div className="space-y-2">
                <Label>สถานที่เกิดเหตุ</Label>
                <Input
                  placeholder="เช่น หอผู้ป่วยอายุรกรรม, ห้องฉุกเฉิน"
                  value={data.location}
                  onChange={(e) => setData('location', e.target.value)}
                />
                {errors.location && <p className="text-xs text-rose-500">{errors.location}</p>}
              </div>

              <div className="space-y-2">
                <Label>ประเภทอุบัติการณ์</Label>
                <Select value={data.incident_type} onValueChange={(v) => setData('incident_type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Needle Stick">Needle Stick Injury (เข็มตำ)</SelectItem>
                    <SelectItem value="Blood/Body Fluid Exposure">สัมผัสเลือด/สารคัดหลั่ง</SelectItem>
                    <SelectItem value="PPE Breach">การใช้อุปกรณ์ป้องกันไม่ถูกต้อง (PPE Breach)</SelectItem>
                    <SelectItem value="Environment">สิ่งแวดล้อมไม่ปลอดภัย</SelectItem>
                    <SelectItem value="Other">อื่นๆ</SelectItem>
                  </SelectContent>
                </Select>
                {errors.incident_type && <p className="text-xs text-rose-500">{errors.incident_type}</p>}
              </div>

              <div className="space-y-2">
                <Label>ระดับความรุนแรง</Label>
                <Select value={data.severity} onValueChange={(v) => setData('severity', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกระดับ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (เล็กน้อย)</SelectItem>
                    <SelectItem value="medium">Medium (ปานกลาง)</SelectItem>
                    <SelectItem value="high">High (สูง)</SelectItem>
                    <SelectItem value="critical">Critical (วิกฤต)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>รายละเอียดเหตุการณ์</Label>
                <Textarea
                  value={data.description}
                  onChange={(e) => setData('description', e.target.value)}
                  rows={3}
                />
                {errors.description && <p className="text-xs text-rose-500">{errors.description}</p>}
              </div>

              <div className="space-y-2">
                <Label>การแก้ไขเบื้องต้น (ถ้ามี)</Label>
                <Textarea
                  value={data.action_taken}
                  onChange={(e) => setData('action_taken', e.target.value)}
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full rounded-xl bg-rose-600 hover:bg-rose-700" disabled={processing}>
                ส่งรายงาน
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <Panel title="ประวัติอุบัติการณ์" description="รายการอุบัติการณ์ที่รายงานในระบบ">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                <th className="p-3">วันเวลา</th>
                <th className="p-3">ประเภท</th>
                <th className="p-3">สถานที่</th>
                <th className="p-3">ความรุนแรง</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3">ผู้รายงาน</th>
              </tr>
            </thead>
            <tbody>
              {incidents.data.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState text="ไม่พบข้อมูลอุบัติการณ์" />
                  </td>
                </tr>
              ) : (
                incidents.data.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="p-3">{new Date(item.incident_date).toLocaleString('th-TH')}</td>
                    <td className="p-3 font-medium">{item.incident_type}</td>
                    <td className="p-3">{item.location}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          item.severity === 'critical'
                            ? 'bg-red-500 text-white'
                            : item.severity === 'high'
                              ? 'bg-orange-500 text-white'
                              : item.severity === 'medium'
                                ? 'bg-yellow-500 text-black'
                                : 'bg-green-500 text-white'
                        }`}
                      >
                        {item.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3">{item.status}</td>
                    <td className="p-3">{item.reporter?.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </QualityPage>
  );
}
