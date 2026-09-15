import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { QualityPage, StatCard, Panel, EmptyState } from '@/components/quality/quality-ui';
import IcSubNav from '@/pages/IC/IcSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
    Search,
    Plus,
    Loader2,
    Activity,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Calendar,
    User,
    Building,
    Microscope,
    FileText,
    TrendingUp,
    Clock,
    ChevronRight,
    Sparkles,
} from 'lucide-react';
import axios from '@/lib/axios';
import { toast } from 'sonner';

interface Log {
    id: number;
    hn: string;
    an: string;
    patient_name: string;
    infection_type: string;
    status: string;
    infection_date: string;
    ward_name: string;
    organism: string;
    reporter: { name: string };
}

interface Stats {
    total: number;
    confirmed: number;
    suspected: number;
    this_month: number;
}

interface Props {
    logs: {
        data: Log[];
        links: any[];
    };
    stats: Stats;
    filters: {
        status?: string;
        infection_type?: string;
        ward?: string;
        date_from?: string;
        date_to?: string;
    };
}

export default function Surveillance({ logs, stats, filters }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);

    const { data, setData, post, processing, reset, errors } = useForm({
        hn: '',
        an: '',
        patient_name: '',
        admit_date: '',
        infection_date: new Date().toISOString().split('T')[0],
        ward_name: '',
        infection_type: '',
        device_related: '',
        organism: '',
        culture_date: '',
        sensitivity_pattern: '',
        status: 'suspected',
        onset_type: '',
        notes: '',
    });

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            toast.error('กรุณาระบุ HN หรือชื่อผู้ป่วย');
            return;
        }
        setIsSearching(true);
        try {
            const response = await axios.get('/ic/surveillance/search', {
                params: { hn: searchQuery },
            });
            setSearchResults(response.data);
            if (response.data.length === 0) {
                toast.info('ไม่พบข้อมูลผู้ป่วย');
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการค้นหา');
        } finally {
            setIsSearching(false);
        }
    };

    const selectPatient = (patient: any) => {
        setSelectedPatient(patient);
        setData((prev) => ({
            ...prev,
            hn: patient.hn,
            an: patient.an,
            patient_name: patient.patient_name,
            admit_date: patient.regdate,
            ward_name: patient.ward,
        }));
        setSearchResults([]);
        setSearchQuery('');
        toast.success('เลือกผู้ป่วยแล้ว');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/ic/surveillance', {
            onSuccess: () => {
                toast.success('บันทึกข้อมูลเรียบร้อยแล้ว');
                reset();
                setSelectedPatient(null);
                setIsOpen(false);
            },
            onError: () => {
                toast.error('เกิดข้อผิดพลาด กรุณาตรวจสอบข้อมูล');
            },
        });
    };

    const resetForm = () => {
        reset();
        setSelectedPatient(null);
        setSearchQuery('');
        setSearchResults([]);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed':
                return (
                    <Badge className="bg-red-500 hover:bg-red-600 gap-1">
                        <AlertTriangle className="h-3 w-3" /> ยืนยัน
                    </Badge>
                );
            case 'suspected':
                return (
                    <Badge className="bg-yellow-500 hover:bg-yellow-600 gap-1">
                        <Clock className="h-3 w-3" /> สงสัย
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge variant="secondary" className="gap-1">
                        <XCircle className="h-3 w-3" /> ปฏิเสธ
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getInfectionTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            VAP: 'bg-purple-100 text-purple-700 border-purple-300',
            CAUTI: 'bg-blue-100 text-blue-700 border-blue-300',
            CLABSI: 'bg-red-100 text-red-700 border-red-300',
            SSI: 'bg-orange-100 text-orange-700 border-orange-300',
            Other: 'bg-gray-100 text-gray-700 border-gray-300',
        };
        return (
            <Badge variant="outline" className={colors[type] || colors.Other}>
                {type}
            </Badge>
        );
    };

    const infectionTypes = [
        { value: 'VAP', label: 'VAP', desc: 'ปอดอักเสบจากเครื่องช่วยหายใจ', icon: '🫁' },
        { value: 'CAUTI', label: 'CAUTI', desc: 'ติดเชื้อทางเดินปัสสาวะจากสายสวน', icon: '🔴' },
        { value: 'CLABSI', label: 'CLABSI', desc: 'ติดเชื้อกระแสเลือดจากสายสวน', icon: '💉' },
        { value: 'SSI', label: 'SSI', desc: 'ติดเชื้อแผลผ่าตัด', icon: '🩹' },
        { value: 'Other', label: 'Other', desc: 'อื่นๆ', icon: '📋' },
    ];

    const addCaseDialog = (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
        }}>
            <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl bg-rose-600 hover:bg-rose-700">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">บันทึกเคสใหม่</span>
                    <span className="sm:hidden">เพิ่ม</span>
                </Button>
            </DialogTrigger>
                                <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
                                    <DialogHeader className="pb-4 border-b">
                                        <DialogTitle className="flex items-center gap-2 text-xl">
                                            <div className="p-2 bg-emerald-100 rounded-lg">
                                                <Microscope className="h-5 w-5 text-emerald-600" />
                                            </div>
                                            บันทึกข้อมูลการติดเชื้อใหม่
                                        </DialogTitle>
                                    </DialogHeader>

                                    <div className="space-y-6 py-4">
                                        {/* Step 1: Search Patient */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                                                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                                                    1
                                                </div>
                                                ค้นหาและเลือกผู้ป่วย
                                            </div>

                                            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            placeholder="พิมพ์ HN หรือชื่อผู้ป่วย..."
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                                            className="pl-10 bg-white"
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        onClick={handleSearch}
                                                        disabled={isSearching}
                                                        className="bg-emerald-600 hover:bg-emerald-700"
                                                    >
                                                        {isSearching ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            'ค้นหา'
                                                        )}
                                                    </Button>
                                                </div>

                                                {/* Search Results */}
                                                {searchResults.length > 0 && (
                                                    <div className="mt-3 bg-white rounded-lg border max-h-48 overflow-y-auto divide-y">
                                                        {searchResults.map((item) => (
                                                            <div
                                                                key={item.an}
                                                                className="p-3 hover:bg-emerald-50 cursor-pointer transition-colors flex items-center justify-between group"
                                                                onClick={() => selectPatient(item)}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                                                        <User className="h-5 w-5 text-emerald-600" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium">{item.patient_name}</div>
                                                                        <div className="text-xs text-muted-foreground">
                                                                            HN: {item.hn} | AN: {item.an}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <Badge variant="outline" className="mb-1">
                                                                        {item.ward}
                                                                    </Badge>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {item.regdate}
                                                                    </div>
                                                                </div>
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Selected Patient Display */}
                                                {selectedPatient && (
                                                    <div className="mt-3 p-3 bg-white rounded-lg border-2 border-emerald-500">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                                                                    <CheckCircle2 className="h-6 w-6 text-white" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-emerald-700">
                                                                        {selectedPatient.patient_name}
                                                                    </div>
                                                                    <div className="text-sm text-muted-foreground">
                                                                        HN: {selectedPatient.hn} | AN: {selectedPatient.an} | {selectedPatient.ward}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedPatient(null);
                                                                    setData((prev) => ({
                                                                        ...prev,
                                                                        hn: '',
                                                                        an: '',
                                                                        patient_name: '',
                                                                        admit_date: '',
                                                                        ward_name: '',
                                                                    }));
                                                                }}
                                                            >
                                                                เปลี่ยน
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Step 2: Infection Details */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                                                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                                                    2
                                                </div>
                                                ข้อมูลการติดเชื้อ
                                            </div>

                                            <form onSubmit={handleSubmit} className="space-y-4">
                                                {/* Infection Type Selection - Card Style */}
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">ประเภทการติดเชื้อ (HAI Type)</Label>
                                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                                        {infectionTypes.map((type) => (
                                                            <button
                                                                key={type.value}
                                                                type="button"
                                                                onClick={() => setData('infection_type', type.value)}
                                                                className={`p-3 rounded-xl border-2 transition-all text-center ${
                                                                    data.infection_type === type.value
                                                                        ? 'border-emerald-500 bg-emerald-50 shadow-md'
                                                                        : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                                                                }`}
                                                            >
                                                                <div className="text-2xl mb-1">{type.icon}</div>
                                                                <div className="font-semibold text-sm">{type.label}</div>
                                                                <div className="text-[10px] text-muted-foreground leading-tight">
                                                                    {type.desc}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {errors.infection_type && (
                                                        <p className="text-red-500 text-xs">{errors.infection_type}</p>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>วันที่วินิจฉัยติดเชื้อ</Label>
                                                        <Input
                                                            type="date"
                                                            value={data.infection_date}
                                                            onChange={(e) => setData('infection_date', e.target.value)}
                                                            className="bg-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>สถานะ</Label>
                                                        <Select
                                                            value={data.status}
                                                            onValueChange={(v) => setData('status', v)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="suspected">
                                                                    <span className="flex items-center gap-2">
                                                                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                                                        Suspected (สงสัย)
                                                                    </span>
                                                                </SelectItem>
                                                                <SelectItem value="confirmed">
                                                                    <span className="flex items-center gap-2">
                                                                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                                        Confirmed (ยืนยัน)
                                                                    </span>
                                                                </SelectItem>
                                                                <SelectItem value="rejected">
                                                                    <span className="flex items-center gap-2">
                                                                        <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                                                        Rejected (ปฏิเสธ)
                                                                    </span>
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                {/* Lab Results Section */}
                                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-4">
                                                    <div className="flex items-center gap-2 text-amber-700 font-medium">
                                                        <Microscope className="h-4 w-4" />
                                                        ผลการเพาะเชื้อ (Culture Results)
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-sm">เชื้อที่พบ (Organism)</Label>
                                                            <Input
                                                                value={data.organism}
                                                                onChange={(e) => setData('organism', e.target.value)}
                                                                placeholder="เช่น E. coli, K. pneumoniae"
                                                                className="bg-white"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-sm">วันที่เพาะเชื้อ</Label>
                                                            <Input
                                                                type="date"
                                                                value={data.culture_date}
                                                                onChange={(e) => setData('culture_date', e.target.value)}
                                                                className="bg-white"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-sm">Sensitivity Pattern</Label>
                                                        <Input
                                                            value={data.sensitivity_pattern}
                                                            onChange={(e) => setData('sensitivity_pattern', e.target.value)}
                                                            placeholder="เช่น MDR, ESBL, CRE"
                                                            className="bg-white"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>หมายเหตุ / รายละเอียดเพิ่มเติม</Label>
                                                    <Textarea
                                                        value={data.notes}
                                                        onChange={(e) => setData('notes', e.target.value)}
                                                        placeholder="รายละเอียดเพิ่มเติม..."
                                                        rows={3}
                                                    />
                                                </div>

                                                <div className="flex gap-3 pt-4">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="flex-1"
                                                        onClick={() => setIsOpen(false)}
                                                    >
                                                        ยกเลิก
                                                    </Button>
                                                    <Button
                                                        type="submit"
                                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                                        disabled={processing || !data.hn || !data.infection_type}
                                                    >
                                                        {processing ? (
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                        ) : (
                                                            <Sparkles className="h-4 w-4 mr-2" />
                                                        )}
                                                        บันทึกข้อมูล
                                                    </Button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </DialogContent>
        </Dialog>
    );

    return (
        <QualityPage
            tone="rose"
            icon={Activity}
            badge="ศูนย์พัฒนาคุณภาพ · IC"
            title="ระบบเฝ้าระวังการติดเชื้อ"
            subtitle="Infection Surveillance System"
            headTitle="IC Surveillance"
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'Infection Control (IC)', href: '/ic' },
                { title: 'เฝ้าระวัง', href: '/ic/surveillance' },
            ]}
            subNav={<IcSubNav active="ic.surveillance" />}
            actions={addCaseDialog}
        >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="บันทึกทั้งหมด" value={stats?.total || 0} icon={FileText} tone="slate" />
                <StatCard label="ยืนยันการติดเชื้อ" value={stats?.confirmed || 0} icon={AlertTriangle} tone="rose" />
                <StatCard label="กำลังสงสัย" value={stats?.suspected || 0} icon={Clock} tone="amber" />
                <StatCard label="เดือนนี้" value={stats?.this_month || 0} icon={TrendingUp} tone="sky" />
            </div>

                    {/* Filters */}
                    <Panel
                        title="ตัวกรองข้อมูล"
                        action={
                            <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setShowFilters(!showFilters)}>
                                {showFilters ? 'ซ่อน' : 'แสดง'}
                            </Button>
                        }
                    >
                        {showFilters && (
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                                    <Select
                                        value={filters?.status || ''}
                                        onValueChange={(v) =>
                                            router.get('/ic/surveillance', { ...filters, status: v }, { preserveState: true })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="สถานะ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">ทั้งหมด</SelectItem>
                                            <SelectItem value="suspected">สงสัย</SelectItem>
                                            <SelectItem value="confirmed">ยืนยัน</SelectItem>
                                            <SelectItem value="rejected">ปฏิเสธ</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={filters?.infection_type || ''}
                                        onValueChange={(v) =>
                                            router.get('/ic/surveillance', { ...filters, infection_type: v }, { preserveState: true })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="ประเภทการติดเชื้อ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">ทั้งหมด</SelectItem>
                                            <SelectItem value="VAP">VAP</SelectItem>
                                            <SelectItem value="CAUTI">CAUTI</SelectItem>
                                            <SelectItem value="CLABSI">CLABSI</SelectItem>
                                            <SelectItem value="SSI">SSI</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="date"
                                        value={filters?.date_from || ''}
                                        onChange={(e) =>
                                            router.get(
                                                '/ic/surveillance',
                                                { ...filters, date_from: e.target.value },
                                                { preserveState: true }
                                            )
                                        }
                                        placeholder="จากวันที่"
                                    />
                                    <Input
                                        type="date"
                                        value={filters?.date_to || ''}
                                        onChange={(e) =>
                                            router.get(
                                                '/ic/surveillance',
                                                { ...filters, date_to: e.target.value },
                                                { preserveState: true }
                                            )
                                        }
                                        placeholder="ถึงวันที่"
                                    />
                                    <Button variant="outline" className="rounded-xl" onClick={() => router.get('/ic/surveillance')}>
                                        ล้างตัวกรอง
                                    </Button>
                                </div>
                        )}
                    </Panel>

                    <Panel title="รายการเฝ้าระวังการติดเชื้อ" description={`แสดง ${logs?.data?.length || 0} รายการ`}>
                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                            <th className="p-3">วันที่วินิจฉัย</th>
                                            <th className="p-3">ผู้ป่วย</th>
                                            <th className="p-3">หอผู้ป่วย</th>
                                            <th className="p-3">ประเภท</th>
                                            <th className="p-3">เชื้อก่อโรค</th>
                                            <th className="p-3">สถานะ</th>
                                            <th className="p-3">ผู้รายงาน</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!logs?.data || logs.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={7}>
                                                    <EmptyState text="ไม่พบข้อมูลการเฝ้าระวัง" />
                                                    <div className="pb-4 text-center">
                                                        <Button variant="link" className="text-rose-600" onClick={() => setIsOpen(true)}>
                                                            + บันทึกเคสแรก
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            logs.data.map((log) => (
                                                <tr key={log.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-slate-400" />
                                                            {new Date(log.infection_date).toLocaleDateString('th-TH')}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50">
                                                                <User className="h-4 w-4 text-rose-600" />
                                                            </div>
                                                            <div>
                                                                <div className="font-medium">{log.patient_name}</div>
                                                                <div className="text-xs text-slate-500">
                                                                    HN: {log.hn}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-1">
                                                            <Building className="h-4 w-4 text-slate-400" />
                                                            {log.ward_name || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">{getInfectionTypeBadge(log.infection_type)}</td>
                                                    <td className="p-3">
                                                        {log.organism ? (
                                                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                                                                {log.organism}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3">{getStatusBadge(log.status)}</td>
                                                    <td className="p-3">
                                                        <div className="text-sm">{log.reporter?.name || '-'}</div>
                                                    </td>
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
