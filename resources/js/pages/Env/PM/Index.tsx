import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Wrench, CheckCircle, AlertTriangle, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Index({ dueSchedules, history }: { dueSchedules: any[], history: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<any>(null);

    const { data, setData, post, processing, reset } = useForm({
        asset_id: '',
        schedule_id: '',
        performed_by: '',
        result: 'Pass',
        findings: '',
        performed_at: new Date().toISOString().split('T')[0],
    });

    const handlePerformPM = (schedule: any) => {
        setSelectedSchedule(schedule);
        setData({
            asset_id: schedule.asset_id,
            schedule_id: schedule.id,
            performed_by: '',
            result: 'Pass',
            findings: '',
            performed_at: new Date().toISOString().split('T')[0],
        });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('env.pm.store'), {
            onSuccess: () => setIsOpen(false),
        });
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ENV', href: route('env.index') },
            { title: 'แผนบำรุงรักษา (PM)', href: route('env.pm.index') }
        ]}>
            <Head title="PM Tracking" />

            <div className="p-6 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Wrench className="h-6 w-6" />
                        การติดตามการบำรุงรักษา (PM Tracking)
                    </h2>
                    <p className="text-muted-foreground">ติดตามและบันทึกผลการบำรุงรักษาเครื่องมือแพทย์</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Upcoming PMs */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                รายการที่ต้องทำ PM (Upcoming/Overdue)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {dueSchedules.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">ไม่มีรายการที่ต้องทำเร็วๆ นี้</div>
                            ) : (
                                <div className="space-y-4">
                                    {dueSchedules.map((schedule) => (
                                        <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                            <div>
                                                <div className="font-medium">{schedule.asset.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    Due: <span className={new Date(schedule.next_pm_date) < new Date() ? 'text-red-500 font-bold' : ''}>
                                                        {format(new Date(schedule.next_pm_date), 'dd MMM yyyy')}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Loc: {schedule.asset.location} | Risk: {schedule.asset.risk_level}
                                                </div>
                                            </div>
                                            <Button size="sm" onClick={() => handlePerformPM(schedule)}>
                                                บันทึกผล
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* History */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5 text-blue-500" />
                                ประวัติการทำ PM ล่าสุด
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                {history.map((record) => (
                                    <div key={record.id} className="flex items-start justify-between p-3 border-b last:border-0">
                                        <div>
                                            <div className="font-medium">{record.asset.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {format(new Date(record.performed_at), 'dd MMM yyyy HH:mm')} by {record.performed_by}
                                            </div>
                                            {record.findings && (
                                                <div className="text-xs mt-1 text-muted-foreground bg-muted p-1 rounded">
                                                    Note: {record.findings}
                                                </div>
                                            )}
                                        </div>
                                        <Badge variant={record.result === 'Pass' ? 'default' : 'destructive'}>
                                            {record.result}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>บันทึกผลการบำรุงรักษา (PM)</DialogTitle>
                        </DialogHeader>
                        <div className="py-2">
                            <h4 className="font-medium">{selectedSchedule?.asset?.name}</h4>
                            <p className="text-sm text-muted-foreground">Model: {selectedSchedule?.asset?.model} | SN: {selectedSchedule?.asset?.serial_number}</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>วันที่ดำเนินการ</Label>
                                    <Input type="date" value={data.performed_at} onChange={e => setData('performed_at', e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>ผู้ดำเนินการ</Label>
                                    <Input value={data.performed_by} onChange={e => setData('performed_by', e.target.value)} required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>ผลการตรวจสอบ</Label>
                                <Select value={data.result} onValueChange={v => setData('result', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Pass">Pass (ผ่าน)</SelectItem>
                                        <SelectItem value="Fail">Fail (ไม่ผ่าน)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>ข้อค้นพบ/การแก้ไข (Findings)</Label>
                                <Textarea value={data.findings} onChange={e => setData('findings', e.target.value)} />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={processing}>บันทึกผล</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
