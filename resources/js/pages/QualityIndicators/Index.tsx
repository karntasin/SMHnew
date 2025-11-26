import React, { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, BarChart2, MoreVertical, Pencil, Trash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Department {
    id: number;
    name: string;
}

interface Team {
    id: number;
    abbreviation: string;
    name_th: string;
}

interface Indicator {
    id: number;
    code: string;
    name: string;
    category: string;
    unit: string;
    frequency: string;
    target_value: number;
    target_operator: string;
    is_active: boolean;
    description: string;
    formula_description: string;
    department?: Department;
    team?: Team;
}

export default function Index({ indicators, type, departments, teams }: { 
    indicators: Indicator[], 
    type: 'department' | 'ha_team' | 'organization',
    departments: Department[],
    teams: Team[]
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        type: type,
        department_id: '',
        team_id: '',
        code: '',
        name: '',
        category: 'Clinical',
        unit: '%',
        target_value: '',
        target_operator: '<',
        frequency: 'Monthly',
        description: '',
        formula_description: '',
        is_active: true,
    });

    useEffect(() => {
        if (editingIndicator) {
            setData({
                type: type,
                department_id: editingIndicator.department?.id.toString() || '',
                team_id: editingIndicator.team?.id.toString() || '',
                code: editingIndicator.code || '',
                name: editingIndicator.name || '',
                category: editingIndicator.category || 'Clinical',
                unit: editingIndicator.unit || '%',
                target_value: editingIndicator.target_value?.toString() || '',
                target_operator: editingIndicator.target_operator || '<',
                frequency: editingIndicator.frequency || 'Monthly',
                description: editingIndicator.description || '',
                formula_description: editingIndicator.formula_description || '',
                is_active: editingIndicator.is_active,
            });
            setIsOpen(true);
        } else {
            reset();
            setData('type', type);
        }
    }, [editingIndicator, type]);

    const getPageTitle = () => {
        switch(type) {
            case 'organization': return 'ตัวชี้วัดคุณภาพ (ระดับองค์กร)';
            case 'department': return 'ตัวชี้วัดคุณภาพ (ระดับแผนก)';
            case 'ha_team': return 'ตัวชี้วัดคุณภาพ (ระดับทีม)';
            default: return 'ตัวชี้วัดคุณภาพ';
        }
    };
    const pageTitle = getPageTitle();
    
    const breadcrumbTitle = type === 'department' ? 'KPIs (Department)' : (type === 'ha_team' ? 'KPIs (Team)' : 'KPIs (Organization)');

    const handleCreate = () => {
        setEditingIndicator(null);
        reset();
        setIsOpen(true);
    };

    const handleEdit = (indicator: Indicator) => {
        setEditingIndicator(indicator);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingIndicator) {
            put(route('quality-indicators.update', editingIndicator.id), {
                onSuccess: () => {
                    setIsOpen(false);
                    setEditingIndicator(null);
                    reset();
                },
            });
        } else {
            post(route('quality-indicators.store'), {
                onSuccess: () => {
                    setIsOpen(false);
                    reset();
                },
            });
        }
    };

    const handleDelete = () => {
        if (deleteId) {
            router.delete(route('quality-indicators.destroy', deleteId), {
                onSuccess: () => setDeleteId(null),
            });
        }
    };

    const filteredIndicators = indicators.filter(ind => 
        ind.name.toLowerCase().includes(search.toLowerCase()) ||
        ind.code?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบงานคุณภาพ', href: '#' },
            { title: breadcrumbTitle, href: route('quality-indicators.index', { type }) }
        ]}>
            <Head title={pageTitle} />

            <div className='p-6 space-y-6'>
                {/* Type Selection Tabs */}
                <div className="flex space-x-2 border-b pb-4">
                    <Link href={route('quality-indicators.index', { type: 'organization' })}>
                        <Button variant={type === 'organization' ? 'default' : 'outline'} className="gap-2">
                            <BarChart2 className="w-4 h-4" /> ระดับองค์กร
                        </Button>
                    </Link>
                    <Link href={route('quality-indicators.index', { type: 'department' })}>
                        <Button variant={type === 'department' ? 'default' : 'outline'} className="gap-2">
                            <BarChart2 className="w-4 h-4" /> ระดับแผนก/ฝ่าย
                        </Button>
                    </Link>
                    <Link href={route('quality-indicators.index', { type: 'ha_team' })}>
                        <Button variant={type === 'ha_team' ? 'default' : 'outline'} className="gap-2">
                            <BarChart2 className="w-4 h-4" /> ระดับทีม
                        </Button>
                    </Link>
                </div>

                <div className='flex justify-between items-center'>
                    <div>
                        <h2 className='text-2xl font-bold tracking-tight flex items-center gap-2'>
                            <BarChart2 className='h-6 w-6' />
                            {pageTitle}
                        </h2>
                        <p className='text-muted-foreground'>
                            {type === 'department' 
                                ? 'บริหารจัดการตัวชี้วัดคุณภาพระดับแผนก/หน่วยงาน' 
                                : (type === 'ha_team' 
                                    ? 'บริหารจัดการตัวชี้วัดคุณภาพระดับทีมนำทางคลินิก (PCT/Teams)'
                                    : 'บริหารจัดการตัวชี้วัดคุณภาพระดับองค์กร')}
                        </p>
                    </div>
                    <div className='flex gap-2'>
                        <Button variant='outline' asChild>
                            <Link href={route('quality-indicators.dashboard')}>
                                <BarChart2 className='mr-2 h-4 w-4' />
                                Dashboard
                            </Link>
                        </Button>
                        <Button onClick={handleCreate}>
                            <Plus className='mr-2 h-4 w-4' />
                            เพิ่มตัวชี้วัด
                        </Button>
                    </div>
                </div>

                <div className='flex items-center space-x-2'>
                    <Search className='w-4 h-4 text-muted-foreground' />
                    <Input 
                        placeholder='ค้นหาตัวชี้วัด...' 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className='max-w-sm'
                    />
                </div>

                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    {filteredIndicators.map((indicator) => (
                        <div key={indicator.id} className='relative group'>
                            <Link href={route('quality-indicators.show', indicator.id)}>
                                <div className='p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer h-full flex flex-col bg-card text-card-foreground shadow-sm'>
                                    <div className='flex justify-between items-start mb-2 pr-8'>
                                        <Badge variant='outline'>{indicator.code || 'No Code'}</Badge>
                                        <Badge className={indicator.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                                            {indicator.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <h3 className='font-semibold text-lg mb-1 line-clamp-2'>{indicator.name}</h3>
                                    <p className='text-sm text-muted-foreground mb-4'>{indicator.category}</p>
                                    <div className='mt-auto pt-4 border-t flex justify-between text-sm'>
                                        <span>เป้าหมาย: {indicator.target_operator} {indicator.target_value} {indicator.unit}</span>
                                        <span>{indicator.frequency}</span>
                                    </div>
                                </div>
                            </Link>
                            
                            <div className='absolute top-3 right-3'>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant='ghost' size='icon' className='h-8 w-8'>
                                            <MoreVertical className='h-4 w-4' />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align='end'>
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => handleEdit(indicator)}>
                                            <Pencil className='mr-2 h-4 w-4' />
                                            แก้ไข (Edit)
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                            className='text-red-600'
                                            onClick={() => setDeleteId(indicator.id)}
                                        >
                                            <Trash className='mr-2 h-4 w-4' />
                                            ลบ (Delete)
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    ))}
                </div>

                <Dialog open={isOpen} onOpenChange={(open) => {
                    setIsOpen(open);
                    if (!open) setEditingIndicator(null);
                }}>
                    <DialogContent className='max-w-2xl'>
                        <DialogHeader>
                            <DialogTitle>{editingIndicator ? 'แก้ไขตัวชี้วัด' : 'เพิ่มตัวชี้วัดใหม่'}</DialogTitle>
                            <DialogDescription>
                                กำหนดรายละเอียดตัวชี้วัดเพื่อใช้ในการติดตามผล
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className='space-y-4'>
                            {type === 'department' ? (
                                <div className='space-y-2'>
                                    <Label htmlFor='department_id'>แผนก/หน่วยงาน</Label>
                                    <Select value={data.department_id} onValueChange={v => setData('department_id', v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder='เลือกแผนก' />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map(dept => (
                                                <SelectItem key={dept.id} value={dept.id.toString()}>
                                                    {dept.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.department_id && <p className='text-red-500 text-sm'>{errors.department_id}</p>}
                                </div>
                            ) : (
                                <div className='space-y-2'>
                                    <Label htmlFor='team_id'>ทีม HA</Label>
                                    <Select value={data.team_id} onValueChange={v => setData('team_id', v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder='เลือกทีม' />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teams.map(team => (
                                                <SelectItem key={team.id} value={team.id.toString()}>
                                                    {team.abbreviation} - {team.name_th}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.team_id && <p className='text-red-500 text-sm'>{errors.team_id}</p>}
                                </div>
                            )}

                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-2'>
                                    <Label htmlFor='code'>รหัส (Code)</Label>
                                    <Input id='code' value={data.code} onChange={e => setData('code', e.target.value)} placeholder='เช่น KPI-001' />
                                    {errors.code && <p className='text-red-500 text-sm'>{errors.code}</p>}
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='category'>หมวดหมู่</Label>
                                    <Select value={data.category} onValueChange={v => setData('category', v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder='เลือกหมวดหมู่' />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value='Clinical'>Clinical (คลินิก)</SelectItem>
                                            <SelectItem value='Non-Clinical'>Non-Clinical (ทั่วไป)</SelectItem>
                                            <SelectItem value='HA-I-1'>HA ตอนที่ 1</SelectItem>
                                            <SelectItem value='HA-I-2'>HA ตอนที่ 2</SelectItem>
                                            <SelectItem value='HA-I-3'>HA ตอนที่ 3</SelectItem>
                                            <SelectItem value='HA-I-4'>HA ตอนที่ 4</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='name'>ชื่อตัวชี้วัด</Label>
                                <Input id='name' value={data.name} onChange={e => setData('name', e.target.value)} placeholder='เช่น อัตราการติดเชื้อในโรงพยาบาล' required />
                                {errors.name && <p className='text-red-500 text-sm'>{errors.name}</p>}
                            </div>

                            <div className='grid grid-cols-3 gap-4'>
                                <div className='space-y-2'>
                                    <Label htmlFor='target_operator'>เงื่อนไขเป้าหมาย</Label>
                                    <Select value={data.target_operator} onValueChange={v => setData('target_operator', v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value='<'>น้อยกว่า (&lt;)</SelectItem>
                                            <SelectItem value='<='>น้อยกว่าหรือเท่ากับ (&le;)</SelectItem>
                                            <SelectItem value='>'>มากกว่า (&gt;)</SelectItem>
                                            <SelectItem value='>='>มากกว่าหรือเท่ากับ (&ge;)</SelectItem>
                                            <SelectItem value='='>เท่ากับ (=)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='target_value'>ค่าเป้าหมาย</Label>
                                    <Input id='target_value' type='number' step='0.01' value={data.target_value} onChange={e => setData('target_value', e.target.value)} placeholder='0.00' />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='unit'>หน่วยนับ</Label>
                                    <Input id='unit' value={data.unit} onChange={e => setData('unit', e.target.value)} placeholder='%, ราย, ครั้ง' />
                                </div>
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='frequency'>ความถี่ในการเก็บข้อมูล</Label>
                                <Select value={data.frequency} onValueChange={v => setData('frequency', v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value='Monthly'>รายเดือน</SelectItem>
                                        <SelectItem value='Quarterly'>รายไตรมาส</SelectItem>
                                        <SelectItem value='Yearly'>รายปี</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='description'>รายละเอียด/คำนิยาม</Label>
                                <Textarea id='description' value={data.description} onChange={e => setData('description', e.target.value)} />
                            </div>

                            <DialogFooter>
                                <Button type='button' variant='outline' onClick={() => setIsOpen(false)}>ยกเลิก</Button>
                                <Button type='submit' disabled={processing}>{editingIndicator ? 'บันทึกการแก้ไข' : 'บันทึก'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>ยืนยันการลบ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                การกระทำนี้ไม่สามารถย้อนกลับได้ ข้อมูลตัวชี้วัดและข้อมูลการบันทึกทั้งหมดจะถูกลบถาวร
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className='bg-red-600 hover:bg-red-700'>
                                ยืนยันลบ
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}
