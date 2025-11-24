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
    CardDescription,
    CardFooter,
} from '@/components/ui/card';
import { Plus, CheckCircle, AlertTriangle, Activity, ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Index({ systems }: { systems: any[] }) {
    const [isSystemOpen, setIsSystemOpen] = useState(false);
    const [isChecklistOpen, setIsChecklistOpen] = useState(false);
    const [isCheckOpen, setIsCheckOpen] = useState(false);
    const [selectedSystem, setSelectedSystem] = useState<any>(null);

    // System Form
    const { data: systemData, setData: setSystemData, post: postSystem, processing: systemProcessing, reset: resetSystem } = useForm({
        name: '',
        description: '',
    });

    // Checklist Form
    const { data: checklistData, setData: setChecklistData, post: postChecklist, processing: checklistProcessing, reset: resetChecklist } = useForm({
        system_id: '',
        item_name: '',
        frequency: 'daily',
        min_value: '',
        max_value: '',
        unit: '',
    });

    // Check Form
    const { data: checkData, setData: setCheckData, post: postCheck, processing: checkProcessing, reset: resetCheck } = useForm({
        system_id: '',
        check_date: format(new Date(), 'yyyy-MM-dd'),
        items: [] as any[],
        notes: '',
    });

    const handleCreateSystem = () => {
        resetSystem();
        setIsSystemOpen(true);
    };

    const handleAddChecklist = (systemId: number) => {
        resetChecklist();
        setChecklistData('system_id', systemId.toString());
        setIsChecklistOpen(true);
    };

    const handlePerformCheck = (system: any) => {
        setSelectedSystem(system);
        resetCheck();
        setCheckData({
            system_id: system.id,
            check_date: format(new Date(), 'yyyy-MM-dd'),
            items: system.checklists.map((cl: any) => ({
                checklist_id: cl.id,
                item_name: cl.item_name, // For display
                status: 'pass',
                value: '',
                notes: '',
                min_value: cl.min_value,
                max_value: cl.max_value,
                unit: cl.unit,
            })),
            notes: '',
        });
        setIsCheckOpen(true);
    };

    const submitSystem = (e: React.FormEvent) => {
        e.preventDefault();
        postSystem(route('env.utility.store-system'), {
            onSuccess: () => setIsSystemOpen(false),
        });
    };

    const submitChecklist = (e: React.FormEvent) => {
        e.preventDefault();
        postChecklist(route('env.utility.store-checklist'), {
            onSuccess: () => setIsChecklistOpen(false),
        });
    };

    const submitCheck = (e: React.FormEvent) => {
        e.preventDefault();
        postCheck(route('env.utility.store-check'), {
            onSuccess: () => setIsCheckOpen(false),
        });
    };

    const updateCheckItem = (index: number, field: string, value: any) => {
        const newItems = [...checkData.items];
        newItems[index][field] = value;
        
        // Auto-fail if value out of range
        if (field === 'value' && value !== '') {
            const numVal = parseFloat(value);
            const min = newItems[index].min_value ? parseFloat(newItems[index].min_value) : null;
            const max = newItems[index].max_value ? parseFloat(newItems[index].max_value) : null;
            
            if ((min !== null && numVal < min) || (max !== null && numVal > max)) {
                newItems[index].status = 'fail';
            } else {
                newItems[index].status = 'pass';
            }
        }
        
        setCheckData('items', newItems);
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบสิ่งแวดล้อม (ENV)', href: '/env' },
            { title: 'ตรวจสอบระบบสาธารณูปโภค', href: '/env/utility' },
        ]}>
            <Head title="ตรวจสอบระบบสาธารณูปโภค" />

            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">ตรวจสอบระบบสาธารณูปโภค</h2>
                        <p className="text-muted-foreground">ติดตามสถานะและความพร้อมของระบบไฟฟ้า น้ำ และแก๊สทางการแพทย์</p>
                    </div>
                    <Button onClick={handleCreateSystem}>
                        <Plus className="mr-2 h-4 w-4" /> เพิ่มระบบใหม่
                    </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {systems.map((system) => (
                        <Card key={system.id} className={cn("border-l-4", system.status === 'normal' ? "border-l-green-500" : system.status === 'warning' ? "border-l-yellow-500" : "border-l-red-500")}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle>{system.name}</CardTitle>
                                    <Badge variant={system.status === 'normal' ? 'success' : 'destructive'}>
                                        {system.status === 'normal' ? 'ปกติ' : 'ผิดปกติ'}
                                    </Badge>
                                </div>
                                <CardDescription>{system.description || 'ไม่มีรายละเอียด'}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">ตรวจสอบล่าสุด:</span>
                                        <span>{system.latest_check ? format(new Date(system.latest_check.check_date), 'dd/MM/yyyy') : '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">ผู้ตรวจสอบ:</span>
                                        <span>{system.latest_check?.inspector?.name || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">รายการตรวจสอบ:</span>
                                        <span>{system.checklists.length} รายการ</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between gap-2">
                                <Button variant="outline" size="sm" className="w-full" onClick={() => handleAddChecklist(system.id)}>
                                    <Plus className="mr-2 h-3 w-3" /> รายการตรวจ
                                </Button>
                                <Button size="sm" className="w-full" onClick={() => handlePerformCheck(system)}>
                                    <ClipboardCheck className="mr-2 h-3 w-3" /> ตรวจสอบ
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Create System Modal */}
            <Dialog open={isSystemOpen} onOpenChange={setIsSystemOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>เพิ่มระบบสาธารณูปโภค</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitSystem} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">ชื่อระบบ</Label>
                            <Input
                                id="name"
                                placeholder="เช่น เครื่องกำเนิดไฟฟ้า, ระบบแก๊สทางการแพทย์"
                                value={systemData.name}
                                onChange={(e) => setSystemData('name', e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">รายละเอียด</Label>
                            <Textarea
                                id="description"
                                placeholder="รายละเอียดเพิ่มเติม..."
                                value={systemData.description}
                                onChange={(e) => setSystemData('description', e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsSystemOpen(false)}>ยกเลิก</Button>
                            <Button type="submit" disabled={systemProcessing}>บันทึก</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Checklist Modal */}
            <Dialog open={isChecklistOpen} onOpenChange={setIsChecklistOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>เพิ่มรายการตรวจสอบ</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitChecklist} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="item_name">รายการตรวจสอบ</Label>
                            <Input
                                id="item_name"
                                placeholder="เช่น ตรวจสอบระดับน้ำมันเครื่อง, วัดแรงดัน"
                                value={checklistData.item_name}
                                onChange={(e) => setChecklistData('item_name', e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="frequency">ความถี่</Label>
                            <Select
                                value={checklistData.frequency}
                                onValueChange={(value) => setChecklistData('frequency', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="เลือกความถี่" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">รายวัน</SelectItem>
                                    <SelectItem value="weekly">รายสัปดาห์</SelectItem>
                                    <SelectItem value="monthly">รายเดือน</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="grid gap-2">
                                <Label htmlFor="min_value">ค่าต่ำสุด</Label>
                                <Input
                                    id="min_value"
                                    type="number"
                                    step="0.01"
                                    value={checklistData.min_value}
                                    onChange={(e) => setChecklistData('min_value', e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="max_value">ค่าสูงสุด</Label>
                                <Input
                                    id="max_value"
                                    type="number"
                                    step="0.01"
                                    value={checklistData.max_value}
                                    onChange={(e) => setChecklistData('max_value', e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="unit">หน่วย</Label>
                                <Input
                                    id="unit"
                                    placeholder="เช่น Bar, PSI, V"
                                    value={checklistData.unit}
                                    onChange={(e) => setChecklistData('unit', e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsChecklistOpen(false)}>ยกเลิก</Button>
                            <Button type="submit" disabled={checklistProcessing}>บันทึก</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Perform Check Modal */}
            <Dialog open={isCheckOpen} onOpenChange={setIsCheckOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>บันทึกผลการตรวจสอบ: {selectedSystem?.name}</DialogTitle>
                        <CardDescription>วันที่: {format(new Date(), 'dd/MM/yyyy')}</CardDescription>
                    </DialogHeader>
                    <form onSubmit={submitCheck} className="space-y-6">
                        <div className="space-y-4">
                            {checkData.items.map((item, index) => (
                                <div key={item.checklist_id} className="p-4 border rounded-lg bg-card space-y-3">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-base font-medium">{item.item_name}</Label>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={item.status === 'pass' ? 'default' : 'outline'}
                                                className={cn(item.status === 'pass' && "bg-green-600 hover:bg-green-700")}
                                                onClick={() => updateCheckItem(index, 'status', 'pass')}
                                            >
                                                ผ่าน
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={item.status === 'fail' ? 'destructive' : 'outline'}
                                                onClick={() => updateCheckItem(index, 'status', 'fail')}
                                            >
                                                ไม่ผ่าน
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {(item.min_value || item.max_value || item.unit) && (
                                        <div className="flex items-center gap-2">
                                            <Label className="text-xs text-muted-foreground w-20">ค่าที่วัดได้:</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                className="h-8 w-32"
                                                value={item.value}
                                                onChange={(e) => updateCheckItem(index, 'value', e.target.value)}
                                                placeholder={`${item.min_value || ''} - ${item.max_value || ''} ${item.unit || ''}`}
                                            />
                                            <span className="text-sm text-muted-foreground">{item.unit}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs text-muted-foreground w-20">หมายเหตุ:</Label>
                                        <Input
                                            className="h-8 flex-1"
                                            value={item.notes}
                                            onChange={(e) => updateCheckItem(index, 'notes', e.target.value)}
                                            placeholder="ระบุปัญหาหากไม่ผ่าน..."
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="notes">หมายเหตุเพิ่มเติม</Label>
                            <Textarea
                                id="notes"
                                value={checkData.notes}
                                onChange={(e) => setCheckData('notes', e.target.value)}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCheckOpen(false)}>ยกเลิก</Button>
                            <Button type="submit" disabled={checkProcessing}>บันทึกผลการตรวจสอบ</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
