import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface Entry {
    id: number;
    period_date: string;
    numerator: number;
    denominator: number;
    result_value: number;
    notes: string;
}

interface Indicator {
    id: number;
    type: string;
    code: string;
    name: string;
    description: string;
    category: string;
    unit: string;
    target_value: number;
    target_operator: string;
    frequency: string;
    entries: Entry[];
}

export default function Show({ indicator }: { indicator: Indicator }) {
    const [isOpen, setIsOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        period_date: new Date().toISOString().split('T')[0],
        numerator: '',
        denominator: '',
        result_value: '',
        notes: '',
    });

    // Auto calculate result when numerator/denominator changes
    React.useEffect(() => {
        if (data.numerator && data.denominator && parseFloat(data.denominator) !== 0) {
            const num = parseFloat(data.numerator);
            const den = parseFloat(data.denominator);
            let res = 0;
            
            // Simple calculation logic based on unit or convention
            // Usually (num / den) * 100 for percentage
            if (indicator.unit === '%') {
                res = (num / den) * 100;
            } else if (indicator.unit.includes('1000')) {
                res = (num / den) * 1000;
            } else {
                res = num / den;
            }
            
            setData('result_value', res.toFixed(4));
        }
    }, [data.numerator, data.denominator]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('quality-indicators.entries.store', indicator.id), {
            onSuccess: () => {
                setIsOpen(false);
                reset();
            },
        });
    };

    const isPass = (value: number) => {
        const target = indicator.target_value;
        switch (indicator.target_operator) {
            case '<': return value < target;
            case '<=': return value <= target;
            case '>': return value > target;
            case '>=': return value >= target;
            case '=': return value === target;
            default: return false;
        }
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ตัวชี้วัดคุณภาพ', href: route('quality-indicators.index', { type: indicator.type }) },
            { title: indicator.code, href: '#' }
        ]}>
            <Head title={`${indicator.code} - ${indicator.name}`} />

            <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                    <div>
                        <Button variant="ghost" className="mb-2 pl-0 hover:pl-2 transition-all" asChild>
                            <Link href={route('quality-indicators.index', { type: indicator.type })}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                ย้อนกลับ
                            </Link>
                        </Button>
                        <h2 className="text-2xl font-bold tracking-tight">{indicator.code}: {indicator.name}</h2>
                        <p className="text-muted-foreground mt-1">{indicator.description}</p>
                    </div>
                    <Button onClick={() => setIsOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        บันทึกข้อมูล
                    </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="md:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>ข้อมูลการวัดผล (Data Entries)</CardTitle>
                            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm">
                                        <Plus className="mr-2 h-4 w-4" />
                                        บันทึกข้อมูล
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>บันทึกข้อมูลตัวชี้วัด</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="period_date">วันที่/งวดข้อมูล</Label>
                                            <Input type="date" id="period_date" value={data.period_date} onChange={e => setData('period_date', e.target.value)} required />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="numerator">ตัวตั้ง (Numerator)</Label>
                                                <Input type="number" step="any" id="numerator" value={data.numerator} onChange={e => setData('numerator', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="denominator">ตัวหาร (Denominator)</Label>
                                                <Input type="number" step="any" id="denominator" value={data.denominator} onChange={e => setData('denominator', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="result_value">ผลลัพธ์ ({indicator.unit})</Label>
                                            <Input type="number" step="any" id="result_value" value={data.result_value} onChange={e => setData('result_value', e.target.value)} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="notes">หมายเหตุ</Label>
                                            <Textarea id="notes" value={data.notes} onChange={e => setData('notes', e.target.value)} />
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit" disabled={processing}>บันทึก</Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>งวดข้อมูล</TableHead>
                                        <TableHead className="text-right">ตัวตั้ง</TableHead>
                                        <TableHead className="text-right">ตัวหาร</TableHead>
                                        <TableHead className="text-right">ผลลัพธ์</TableHead>
                                        <TableHead className="text-center">สถานะ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {indicator.entries.map((entry) => {
                                        const pass = isPass(entry.result_value);
                                        return (
                                            <TableRow key={entry.id}>
                                                <TableCell>{format(new Date(entry.period_date), 'MMM yyyy', { locale: th })}</TableCell>
                                                <TableCell className="text-right">{entry.numerator}</TableCell>
                                                <TableCell className="text-right">{entry.denominator}</TableCell>
                                                <TableCell className="text-right font-medium">{entry.result_value} {indicator.unit}</TableCell>
                                                <TableCell className="text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${pass ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {pass ? 'ผ่าน' : 'ไม่ผ่าน'}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {indicator.entries.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                ยังไม่มีข้อมูล
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>รายละเอียดตัวชี้วัด</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label className="text-muted-foreground">เป้าหมาย</Label>
                                    <div className="font-medium text-lg">
                                        {indicator.target_operator} {indicator.target_value} {indicator.unit}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">ความถี่</Label>
                                    <div>{indicator.frequency}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">คำนิยาม</Label>
                                    <div className="text-sm mt-1">{indicator.description || '-'}</div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
