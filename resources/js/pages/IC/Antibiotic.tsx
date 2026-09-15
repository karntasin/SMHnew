import React, { useState, useEffect, useRef } from 'react';
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
    Pill,
    Plus,
    Filter,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Search,
    Loader2,
    Target,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from '@/lib/axios';

interface AntibioticRecord {
    id: number;
    hn: string;
    an: string | null;
    patient_name: string;
    ward_name: string;
    start_date: string;
    end_date: string | null;
    antibiotic_name: string;
    antibiotic_class: string | null;
    route: string;
    dose: string | null;
    indication: string;
    culture_site: string | null;
    organism: string | null;
    appropriateness: 'appropriate' | 'inappropriate' | 'need_review' | 'pending';
    reviewed_by: string | null;
    recommendation: string | null;
    reporter?: { name: string };
}

interface Stats {
    total_records: number;
    pending_review: number;
    appropriate_rate: number;
    by_class: { antibiotic_class: string; total: number }[];
    by_indication: { indication: string; total: number }[];
}

interface Props {
    records: {
        data: AntibioticRecord[];
        links: any[];
    };
    stats: Stats;
    filters: {
        appropriateness?: string;
        antibiotic_class?: string;
        ward?: string;
    };
}

export default function Antibiotic({ records, stats, filters }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<AntibioticRecord | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [searchHn, setSearchHn] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // Drug search states
    const [drugSearchQuery, setDrugSearchQuery] = useState('');
    const [drugSearchResults, setDrugSearchResults] = useState<{icode: string; name: string}[]>([]);
    const [isSearchingDrug, setIsSearchingDrug] = useState(false);
    const [showDrugResults, setShowDrugResults] = useState(false);
    const drugInputRef = useRef<HTMLDivElement>(null);

    // Close drug dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (drugInputRef.current && !drugInputRef.current.contains(event.target as Node)) {
                setShowDrugResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const { data, setData, post, processing, reset, errors } = useForm({
        hn: '',
        an: '',
        patient_name: '',
        ward_name: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        antibiotic_name: '',
        antibiotic_class: '',
        route: '',
        dose: '',
        frequency: '',
        indication: '',
        culture_site: '',
        organism: '',
        sensitivity_pattern: '',
        notes: '',
    });

    const reviewForm = useForm({
        appropriateness: 'appropriate',
        recommendation: '',
    });

    const handleSearch = async () => {
        if (!searchHn) return;
        setIsSearching(true);
        try {
            const response = await axios.get('/ic/surveillance/search', { params: { hn: searchHn } });
            setSearchResults(response.data);
        } catch {
            toast.error('เกิดข้อผิดพลาดในการค้นหา');
        } finally {
            setIsSearching(false);
        }
    };

    const selectPatient = (patient: any) => {
        setData((prev) => ({
            ...prev,
            hn: patient.hn,
            an: patient.an || '',
            patient_name: patient.patient_name,
            ward_name: patient.ward || '',
        }));
        setSearchResults([]);
    };

    // Drug search function
    const handleDrugSearch = async (query: string) => {
        setDrugSearchQuery(query);
        setData('antibiotic_name', query);
        
        if (query.length < 2) {
            setDrugSearchResults([]);
            setShowDrugResults(false);
            return;
        }
        
        setIsSearchingDrug(true);
        setShowDrugResults(true);
        try {
            const response = await axios.get('/ic/antibiotic/search-drugs', { params: { q: query } });
            setDrugSearchResults(response.data);
        } catch {
            toast.error('เกิดข้อผิดพลาดในการค้นหายา');
        } finally {
            setIsSearchingDrug(false);
        }
    };

    const selectDrug = (drug: { icode: string; name: string }) => {
        setData('antibiotic_name', drug.name);
        setDrugSearchQuery(drug.name);
        setDrugSearchResults([]);
        setShowDrugResults(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/ic/antibiotic', {
            onSuccess: () => {
                toast.success('บันทึกข้อมูลเรียบร้อยแล้ว');
                reset();
                setIsOpen(false);
            },
        });
    };

    const handleReview = (record: AntibioticRecord) => {
        setSelectedRecord(record);
        reviewForm.setData({
            appropriateness: record.appropriateness || 'appropriate',
            recommendation: record.recommendation || '',
        });
        setIsReviewOpen(true);
    };

    const submitReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRecord) return;
        reviewForm.post(`/ic/antibiotic/${selectedRecord.id}/review`, {
            onSuccess: () => {
                toast.success('บันทึก Review เรียบร้อยแล้ว');
                setIsReviewOpen(false);
                setSelectedRecord(null);
            },
        });
    };

    const antibioticClasses = [
        { value: 'penicillins', label: 'Penicillins' },
        { value: 'cephalosporins', label: 'Cephalosporins' },
        { value: 'carbapenems', label: 'Carbapenems' },
        { value: 'aminoglycosides', label: 'Aminoglycosides' },
        { value: 'fluoroquinolones', label: 'Fluoroquinolones' },
        { value: 'macrolides', label: 'Macrolides' },
        { value: 'glycopeptides', label: 'Glycopeptides (Vancomycin)' },
        { value: 'others', label: 'Others' },
    ];

    const indications = [
        { value: 'prophylaxis', label: 'Prophylaxis (ป้องกัน)' },
        { value: 'empiric', label: 'Empiric (เริ่มก่อนทราบผลเพาะเชื้อ)' },
        { value: 'definitive', label: 'Definitive (รักษาตรงเชื้อ)' },
    ];

    const getAppropriateBadge = (appropriateness: string) => {
        switch (appropriateness) {
            case 'appropriate':
                return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> เหมาะสม</Badge>;
            case 'inappropriate':
                return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> ไม่เหมาะสม</Badge>;
            case 'need_review':
                return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><AlertTriangle className="h-3 w-3 mr-1" /> ต้องทบทวน</Badge>;
            default:
                return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> รอ Review</Badge>;
        }
    };

    const addRecordDialog = (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl bg-rose-600 hover:bg-rose-700">
                    <Plus className="h-4 w-4" /> บันทึกการใช้ยา
                </Button>
            </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>บันทึกการใช้ยาปฏิชีวนะ</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        {/* Search Patient */}
                                        <div className="flex gap-2 items-end border-b pb-4">
                                            <div className="flex-1 space-y-2">
                                                <Label>ค้นหาผู้ป่วย (HN หรือ ชื่อ-สกุล)</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="พิมพ์ HN หรือชื่อผู้ป่วย..."
                                                        value={searchHn}
                                                        onChange={(e) => setSearchHn(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                                    />
                                                    <Button variant="secondary" onClick={handleSearch} disabled={isSearching || !searchHn.trim()}>
                                                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground">พิมพ์ HN หรือชื่อผู้ป่วยแล้วกด Enter หรือคลิกค้นหา</p>
                                            </div>
                                        </div>

                                        {searchResults.length > 0 && (
                                            <div className="border rounded-md p-2 max-h-40 overflow-y-auto bg-muted/50">
                                                {searchResults.map((item) => (
                                                    <div
                                                        key={item.an || item.hn}
                                                        className="text-sm p-2 hover:bg-accent cursor-pointer rounded"
                                                        onClick={() => selectPatient(item)}
                                                    >
                                                        {item.patient_name} (HN: {item.hn}) - {item.ward}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>HN</Label>
                                                    <Input value={data.hn} readOnly className="bg-muted" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>ชื่อ-สกุล</Label>
                                                    <Input value={data.patient_name} readOnly className="bg-muted" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>หอผู้ป่วย</Label>
                                                    <Input
                                                        value={data.ward_name}
                                                        onChange={(e) => setData('ward_name', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>วันที่เริ่มให้ยา</Label>
                                                    <Input
                                                        type="date"
                                                        value={data.start_date}
                                                        onChange={(e) => setData('start_date', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="p-4 bg-muted rounded-lg space-y-4">
                                                <h4 className="font-medium">ข้อมูลยาปฏิชีวนะ</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2 relative" ref={drugInputRef}>
                                                        <Label>ชื่อยา</Label>
                                                        <div className="relative">
                                                            <Input
                                                                placeholder="พิมพ์เพื่อค้นหายา..."
                                                                value={data.antibiotic_name}
                                                                onChange={(e) => handleDrugSearch(e.target.value)}
                                                                onFocus={() => drugSearchResults.length > 0 && setShowDrugResults(true)}
                                                            />
                                                            {isSearchingDrug && (
                                                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                                            )}
                                                        </div>
                                                        {showDrugResults && drugSearchResults.length > 0 && (
                                                            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                                {drugSearchResults.map((drug) => (
                                                                    <div
                                                                        key={drug.icode}
                                                                        className="px-3 py-2 hover:bg-pink-50 cursor-pointer text-sm border-b last:border-b-0"
                                                                        onClick={() => selectDrug(drug)}
                                                                    >
                                                                        <span className="font-medium">{drug.name}</span>
                                                                        <span className="text-muted-foreground ml-2 text-xs">({drug.icode})</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {showDrugResults && !isSearchingDrug && drugSearchResults.length === 0 && data.antibiotic_name.length >= 2 && (
                                                            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
                                                                ไม่พบยาที่ค้นหา
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>กลุ่มยา</Label>
                                                        <Select value={data.antibiotic_class} onValueChange={(v) => setData('antibiotic_class', v)}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="เลือกกลุ่ม" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {antibioticClasses.map((c) => (
                                                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Route</Label>
                                                        <Select value={data.route} onValueChange={(v) => setData('route', v)}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="เลือก" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="IV">IV</SelectItem>
                                                                <SelectItem value="Oral">Oral</SelectItem>
                                                                <SelectItem value="IM">IM</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Indication</Label>
                                                        <Select value={data.indication} onValueChange={(v) => setData('indication', v)}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="เลือก" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {indications.map((i) => (
                                                                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-yellow-50 rounded-lg space-y-4 border border-yellow-200">
                                                <h4 className="font-medium text-yellow-700">ผลเพาะเชื้อ (ถ้ามี)</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Culture Site</Label>
                                                        <Input
                                                            placeholder="เช่น Blood, Urine, Sputum"
                                                            value={data.culture_site}
                                                            onChange={(e) => setData('culture_site', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Organism</Label>
                                                        <Input
                                                            placeholder="เชื้อที่พบ"
                                                            value={data.organism}
                                                            onChange={(e) => setData('organism', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <Button type="submit" className="w-full rounded-xl bg-rose-600 hover:bg-rose-700" disabled={processing}>
                                                บันทึกข้อมูล
                                            </Button>
                                        </form>
                                    </div>
                                </DialogContent>
        </Dialog>
    );

    return (
        <QualityPage
            tone="rose"
            icon={Pill}
            badge="ศูนย์พัฒนาคุณภาพ · IC"
            title="Antibiotic Stewardship"
            subtitle="ติดตามและทบทวนการใช้ยาปฏิชีวนะ"
            headTitle="Antibiotic Stewardship - IC"
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'Infection Control (IC)', href: '/ic' },
                { title: 'ยาปฏิชีวนะ', href: '/ic/antibiotic' },
            ]}
            subNav={<IcSubNav active="ic.antibiotic" />}
            actions={addRecordDialog}
        >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="บันทึกทั้งหมด" value={stats.total_records} icon={Pill} tone="slate" />
                <StatCard label="รอ Review" value={stats.pending_review} icon={Clock} tone="amber" />
                <StatCard
                    label="Appropriate Rate"
                    value={
                        <span className="flex items-center gap-2">
                            {stats.appropriate_rate}%
                            {stats.appropriate_rate >= 80 ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : (
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                            )}
                        </span>
                    }
                    icon={CheckCircle2}
                    tone="rose"
                />
                <StatCard label="เป้าหมาย" value="≥80%" icon={Target} tone="emerald" sub="Appropriate rate" />
            </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Panel title="ตามกลุ่มยา">
                                <div className="space-y-2">
                                    {stats.by_class.length === 0 ? (
                                        <EmptyState text="ยังไม่มีข้อมูล" />
                                    ) : (
                                        stats.by_class.map((item, index) => {
                                            const classInfo = antibioticClasses.find(c => c.value === item.antibiotic_class);
                                            return (
                                                <div key={index} className="flex justify-between items-center">
                                                    <span>{classInfo?.label || item.antibiotic_class}</span>
                                                    <Badge variant="secondary">{item.total}</Badge>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                        </Panel>
                        <Panel title="ตาม Indication">
                                <div className="space-y-2">
                                    {stats.by_indication.length === 0 ? (
                                        <EmptyState text="ยังไม่มีข้อมูล" />
                                    ) : (
                                        stats.by_indication.map((item, index) => {
                                            const indicationInfo = indications.find(i => i.value === item.indication);
                                            return (
                                                <div key={index} className="flex justify-between items-center">
                                                    <span>{indicationInfo?.label || item.indication}</span>
                                                    <Badge variant="secondary">{item.total}</Badge>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                        </Panel>
                    </div>

                    <Panel
                        title="รายการใช้ยาปฏิชีวนะ"
                        action={
                            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowFilters(!showFilters)}>
                                <Filter className="mr-1 h-4 w-4" /> กรอง
                            </Button>
                        }
                    >
                            {showFilters && (
                                <div className="mb-4 grid grid-cols-3 gap-4 border-b border-slate-100 pb-4">
                                    <Select
                                        value={filters.appropriateness || ''}
                                        onValueChange={(v) => router.get('/ic/antibiotic', { ...filters, appropriateness: v }, { preserveState: true })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="สถานะ Review" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">ทั้งหมด</SelectItem>
                                            <SelectItem value="pending">รอ Review</SelectItem>
                                            <SelectItem value="appropriate">เหมาะสม</SelectItem>
                                            <SelectItem value="inappropriate">ไม่เหมาะสม</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={filters.antibiotic_class || ''}
                                        onValueChange={(v) => router.get('/ic/antibiotic', { ...filters, antibiotic_class: v }, { preserveState: true })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="กลุ่มยา" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">ทั้งหมด</SelectItem>
                                            {antibioticClasses.map((c) => (
                                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        placeholder="หอผู้ป่วย"
                                        value={filters.ward || ''}
                                        onChange={(e) => router.get('/ic/antibiotic', { ...filters, ward: e.target.value }, { preserveState: true })}
                                    />
                                </div>
                            )}
                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                            <th className="p-3">วันที่เริ่ม</th>
                                            <th className="p-3">ผู้ป่วย</th>
                                            <th className="p-3">หอผู้ป่วย</th>
                                            <th className="p-3">ยา</th>
                                            <th className="p-3">Route</th>
                                            <th className="p-3">Indication</th>
                                            <th className="p-3">Review</th>
                                            <th className="p-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.data.length === 0 ? (
                                            <tr><td colSpan={8}><EmptyState text="ไม่พบข้อมูล" /></td></tr>
                                        ) : (
                                            records.data.map((record) => (
                                                <tr key={record.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                                                    <td className="p-3">{new Date(record.start_date).toLocaleDateString('th-TH')}</td>
                                                    <td className="p-3">
                                                        <div className="font-medium">{record.patient_name}</div>
                                                        <div className="text-xs text-slate-500">HN: {record.hn}</div>
                                                    </td>
                                                    <td className="p-3">{record.ward_name}</td>
                                                    <td className="p-3 font-medium">{record.antibiotic_name}</td>
                                                    <td className="p-3">{record.route}</td>
                                                    <td className="p-3">{indications.find(i => i.value === record.indication)?.label || record.indication}</td>
                                                    <td className="p-3">{getAppropriateBadge(record.appropriateness)}</td>
                                                    <td className="p-3">
                                                        <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => handleReview(record)}>
                                                            Review
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                    </Panel>

                    <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Review การใช้ยา</DialogTitle>
                            </DialogHeader>
                            {selectedRecord && (
                                <form onSubmit={submitReview} className="space-y-4 py-4">
                                    <div className="rounded-lg bg-slate-50 p-4">
                                        <p><strong>ผู้ป่วย:</strong> {selectedRecord.patient_name} (HN: {selectedRecord.hn})</p>
                                        <p><strong>ยา:</strong> {selectedRecord.antibiotic_name} ({selectedRecord.route})</p>
                                        <p><strong>Indication:</strong> {selectedRecord.indication}</p>
                                        {selectedRecord.organism && <p><strong>Organism:</strong> {selectedRecord.organism}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>ผลการ Review</Label>
                                        <Select value={reviewForm.data.appropriateness} onValueChange={(v) => reviewForm.setData('appropriateness', v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="appropriate">เหมาะสม</SelectItem>
                                                <SelectItem value="inappropriate">ไม่เหมาะสม</SelectItem>
                                                <SelectItem value="need_review">ต้องทบทวนเพิ่มเติม</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>คำแนะนำ / Recommendation</Label>
                                        <Textarea
                                            value={reviewForm.data.recommendation}
                                            onChange={(e) => reviewForm.setData('recommendation', e.target.value)}
                                            placeholder="ระบุคำแนะนำ (ถ้ามี)"
                                        />
                                    </div>

                                    <Button type="submit" className="w-full rounded-xl bg-rose-600 hover:bg-rose-700" disabled={reviewForm.processing}>
                                        บันทึก Review
                                    </Button>
                                </form>
                            )}
                        </DialogContent>
                    </Dialog>
        </QualityPage>
    );
}
