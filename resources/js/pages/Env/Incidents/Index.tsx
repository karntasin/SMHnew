import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Plus, Pencil, Trash, AlertTriangle, CheckCircle, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function Index({ incidents, mttr, users }: { incidents: any[], mttr: number, users: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isManageOpen, setIsManageOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const { auth } = usePage().props as any;

    // Form for Reporting
    const { data, setData, post, processing, reset, errors } = useForm({
        incident_type: '',
        location: '',
        severity: 'low',
        description: '',
    });

    // Form for Management
    const { data: manageData, setData: setManageData, put, processing: manageProcessing, reset: manageReset } = useForm({
        status: '',
        assigned_to: '',
        action_taken: '',
        resolution_notes: '',
        satisfaction_rating: '',
    });

    const handleCreate = () => {
        reset();
        setIsOpen(true);
    };

    const handleManage = (item: any) => {
        setEditingItem(item);
        setManageData({
            status: item.status,
            assigned_to: item.assigned_to?.toString() || '',
            action_taken: item.action_taken || '',
            resolution_notes: item.resolution_notes || '',
            satisfaction_rating: item.satisfaction_rating?.toString() || '',
        });
        setIsManageOpen(true);
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('env.incidents.store'), {
            onSuccess: () => {
                setIsOpen(false);
                reset();
            },
        });
    };

    const submitManage = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('env.incidents.update', editingItem.id), {
            onSuccess: () => {
                setIsManageOpen(false);
                manageReset();
                setEditingItem(null);
            },
        });
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'destructive';
            case 'high': return 'destructive';
            case 'medium': return 'warning'; // Assuming warning variant exists or default to yellow
            default: return 'secondary';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'reported': return 'secondary';
            case 'accepted': return 'default';
            case 'in_progress': return 'default'; // Blueish
            case 'resolved': return 'success'; // Greenish
            case 'closed': return 'outline';
            default: return 'secondary';
        }
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบสิ่งแวดล้อม (ENV)', href: '/env' },
            { title: 'รายงานอุบัติการณ์', href: '/env/incidents' },
        ]}>
            <Head title="รายงานอุบัติการณ์ความปลอดภัย" />

            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">รายงานอุบัติการณ์ความปลอดภัย</h2>
                        <p className="text-muted-foreground">รายงานและติดตามอุบัติการณ์ด้านความปลอดภัย อาคารสถานที่ และเครื่องมือ</p>
                    </div>
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> แจ้งอุบัติการณ์
                    </Button>
                </div>

                {/* Metrics */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">อุบัติการณ์ทั้งหมด</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{incidents.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">รอการแก้ไข</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {incidents.filter(i => ['reported', 'accepted', 'in_progress'].includes(i.status)).length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">MTTR (เวลาเฉลี่ยในการซ่อม)</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{mttr} ชั่วโมง</div>
                            <p className="text-xs text-muted-foreground">Mean Time To Repair</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Incidents List */}
                <div className="rounded-md border bg-card">
                    <div className="p-4">
                        <table className="w-full text-sm text-left">
                            <thead className="text-muted-foreground border-b">
                                <tr>
                                    <th className="pb-3 font-medium">วันที่</th>
                                    <th className="pb-3 font-medium">ประเภท</th>
                                    <th className="pb-3 font-medium">สถานที่</th>
                                    <th className="pb-3 font-medium">ความรุนแรง</th>
                                    <th className="pb-3 font-medium">สถานะ</th>
                                    <th className="pb-3 font-medium">ผู้รับผิดชอบ</th>
                                    <th className="pb-3 font-medium text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {incidents.map((item) => (
                                    <tr key={item.id} className="group hover:bg-muted/50">
                                        <td className="py-3">{format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')}</td>
                                        <td className="py-3 font-medium">{item.incident_type}</td>
                                        <td className="py-3">{item.location}</td>
                                        <td className="py-3">
                                            <Badge variant={getSeverityColor(item.severity) as any}>
                                                {item.severity.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="py-3">
                                            <Badge variant={getStatusColor(item.status) as any}>
                                                {item.status.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="py-3">
                                            {item.assignee ? (
                                                <div className="flex items-center gap-2">
                                                    <User className="h-3 w-3" />
                                                    {item.assignee.name}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="py-3 text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleManage(item)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {incidents.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                            ไม่มีรายการอุบัติการณ์
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>แจ้งอุบัติการณ์ความปลอดภัย</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitCreate} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="incident_type">ประเภทอุบัติการณ์</Label>
                            <Input
                                id="incident_type"
                                placeholder="เช่น ไฟฟ้าขัดข้อง, น้ำรั่ว, เครื่องมือชำรุด"
                                value={data.incident_type}
                                onChange={(e) => setData('incident_type', e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="location">สถานที่</Label>
                            <Input
                                id="location"
                                placeholder="เช่น ตึก A, ห้อง 101"
                                value={data.location}
                                onChange={(e) => setData('location', e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="severity">ระดับความรุนแรง</Label>
                            <Select
                                value={data.severity}
                                onValueChange={(value) => setData('severity', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="เลือกระดับความรุนแรง" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">ต่ำ (Low)</SelectItem>
                                    <SelectItem value="medium">ปานกลาง (Medium)</SelectItem>
                                    <SelectItem value="high">สูง (High)</SelectItem>
                                    <SelectItem value="critical">วิกฤต (Critical)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">รายละเอียด</Label>
                            <Textarea
                                id="description"
                                placeholder="ระบุรายละเอียดของเหตุการณ์..."
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>ยกเลิก</Button>
                            <Button type="submit" disabled={processing}>ส่งรายงาน</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Manage Modal */}
            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>จัดการอุบัติการณ์ #{editingItem?.id}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitManage} className="space-y-4">
                        <div className="p-4 bg-muted/50 rounded-md text-sm space-y-2">
                            <p><strong>ประเภท:</strong> {editingItem?.incident_type}</p>
                            <p><strong>สถานที่:</strong> {editingItem?.location}</p>
                            <p><strong>รายละเอียด:</strong> {editingItem?.description}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="status">สถานะ</Label>
                                <Select
                                    value={manageData.status}
                                    onValueChange={(value) => setManageData('status', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="เลือกสถานะ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="reported">แจ้งแล้ว (Reported)</SelectItem>
                                        <SelectItem value="accepted">รับเรื่องแล้ว (Accepted)</SelectItem>
                                        <SelectItem value="in_progress">กำลังดำเนินการ (In Progress)</SelectItem>
                                        <SelectItem value="resolved">แก้ไขแล้ว (Resolved)</SelectItem>
                                        <SelectItem value="closed">ปิดงาน (Closed)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="assigned_to">มอบหมายให้</Label>
                                <Select
                                    value={manageData.assigned_to}
                                    onValueChange={(value) => setManageData('assigned_to', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="เลือกผู้ใช้" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map((user) => (
                                            <SelectItem key={user.id} value={user.id.toString()}>
                                                {user.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="action_taken">การดำเนินการแก้ไข</Label>
                            <Textarea
                                id="action_taken"
                                placeholder="ระบุสิ่งที่ได้ดำเนินการไป..."
                                value={manageData.action_taken}
                                onChange={(e) => setManageData('action_taken', e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="resolution_notes">บันทึกการปิดงาน</Label>
                            <Textarea
                                id="resolution_notes"
                                placeholder="หมายเหตุเพิ่มเติม..."
                                value={manageData.resolution_notes}
                                onChange={(e) => setManageData('resolution_notes', e.target.value)}
                            />
                        </div>

                        {manageData.status === 'closed' && (
                            <div className="grid gap-2">
                                <Label htmlFor="satisfaction_rating">คะแนนความพึงพอใจ (1-5)</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={manageData.satisfaction_rating}
                                    onChange={(e) => setManageData('satisfaction_rating', e.target.value)}
                                />
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsManageOpen(false)}>ยกเลิก</Button>
                            <Button type="submit" disabled={manageProcessing}>บันทึกการเปลี่ยนแปลง</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
