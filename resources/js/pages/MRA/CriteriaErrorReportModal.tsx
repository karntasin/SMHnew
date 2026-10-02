import React, { useEffect, useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    Database,
    ExternalLink,
    FileText,
    Info,
    Layers,
    Loader2,
    MessageSquare,
    Search,
    ShieldAlert,
    TrendingDown,
    User,
    UserCheck,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatThaiDateFromIso } from '@/components/ui/thai-date-picker';
import { apiFetch } from '@/lib/asset';

interface CriteriaInfo {
    id: number;
    code: string;
    name: string;
    name_en?: string;
    category_name: string;
    audit_type: string;
    max_score: number;
    audit_guide?: string | null;
    description?: string | null;
}

interface CriteriaSummary {
    total_lost_score: number;
    fail_count: number;
    total_evaluated: number;
    fail_rate_percentage: number;
    auditors_count: number;
    auditors: string[];
}

export interface FailedRecord {
    detail_id: number;
    audit_id: number;
    audit_type: 'opd' | 'ipd';
    audit_target: 'internal' | 'rta';
    hn: string;
    patient_name: string;
    vn?: string | null;
    an?: string | null;
    visit_date?: string | null;
    department: string;
    doctor_name: string;
    auditor_name: string;
    audited_at?: string | null;
    max_score: number;
    obtained_score: number;
    lost_score: number;
    hosxp_value?: string | null;
    auditor_comment?: string | null;
    summary_notes?: string | null;
}

interface CriteriaReportResponse {
    criteria: CriteriaInfo;
    summary: CriteriaSummary;
    records: FailedRecord[];
    filters: {
        from_date?: string;
        to_date?: string;
        audit_target?: string;
        channel?: string;
    };
}

interface CriteriaErrorReportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    criteriaId?: number;
    criteriaCode?: string;
    criteriaName?: string;
    fromDate?: string;
    toDate?: string;
    auditTarget?: 'all' | 'internal' | 'rta';
    channel?: 'all' | 'opd' | 'ipd';
}

export default function CriteriaErrorReportModal({
    open,
    onOpenChange,
    criteriaId,
    criteriaCode,
    criteriaName,
    fromDate,
    toDate,
    auditTarget = 'all',
    channel = 'all',
}: CriteriaErrorReportModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<CriteriaReportResponse | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterOnlyNotes, setFilterOnlyNotes] = useState(false);

    useEffect(() => {
        if (!open || (!criteriaId && !criteriaCode)) {
            return;
        }

        const fetchReport = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams();
                if (criteriaId) params.append('criteria_id', String(criteriaId));
                if (criteriaCode) params.append('criteria_code', criteriaCode);
                if (fromDate) params.append('from_date', fromDate);
                if (toDate) params.append('to_date', toDate);
                if (auditTarget) params.append('audit_target', auditTarget);
                if (channel) params.append('channel', channel);

                const response = await apiFetch(`/mra/criteria-error-report?${params.toString()}`);

                if (!response.ok) {
                    const errData = await response.json().catch(() => null);
                    throw new Error(errData?.error || errData?.message || `ไม่สามารถโหลดข้อมูลรายงานข้อผิดพลาดได้ (HTTP ${response.status})`);
                }

                const result = await response.json();
                setData(result);
            } catch (err: any) {
                console.error('Error fetching criteria error report:', err);
                setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [open, criteriaId, criteriaCode, fromDate, toDate, auditTarget, channel]);

    // Reset filters when modal closes
    useEffect(() => {
        if (!open) {
            setSearchQuery('');
            setFilterOnlyNotes(false);
        }
    }, [open]);

    const records = data?.records || [];

    const filteredRecords = useMemo(() => {
        return records.filter((r) => {
            if (filterOnlyNotes) {
                const hasComment = Boolean(r.auditor_comment && r.auditor_comment.trim() !== '');
                const hasSummaryNote = Boolean(r.summary_notes && r.summary_notes.trim() !== '');
                if (!hasComment && !hasSummaryNote) {
                    return false;
                }
            }

            if (!searchQuery.trim()) return true;

            const q = searchQuery.toLowerCase().trim();
            return (
                r.hn?.toLowerCase().includes(q) ||
                r.patient_name?.toLowerCase().includes(q) ||
                r.vn?.toLowerCase().includes(q) ||
                r.an?.toLowerCase().includes(q) ||
                r.doctor_name?.toLowerCase().includes(q) ||
                r.auditor_name?.toLowerCase().includes(q) ||
                r.department?.toLowerCase().includes(q) ||
                r.auditor_comment?.toLowerCase().includes(q) ||
                r.summary_notes?.toLowerCase().includes(q) ||
                r.hosxp_value?.toLowerCase().includes(q)
            );
        });
    }, [records, searchQuery, filterOnlyNotes]);

    const recordsWithNotesCount = useMemo(() => {
        return records.filter(
            (r) =>
                (r.auditor_comment && r.auditor_comment.trim() !== '') ||
                (r.summary_notes && r.summary_notes.trim() !== ''),
        ).length;
    }, [records]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50/50">
                {/* Header */}
                <div className="border-b border-slate-200 bg-white px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-flex items-center rounded-md bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
                            {data?.criteria.code || criteriaCode || 'CRITERIA'}
                        </span>
                        {data?.criteria.category_name && (
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                                <Layers className="mr-1 h-3 w-3 text-slate-500" />
                                {data.criteria.category_name}
                            </span>
                        )}
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            {data?.criteria.audit_type === 'ipd' ? 'IPD ผู้ป่วยใน' : 'OPD ผู้ป่วยนอก'}
                        </span>
                        <span className="ml-auto text-xs text-slate-500">
                            เกณฑ์คะแนนเต็ม: <strong className="text-slate-800 font-semibold">{data?.criteria.max_score ?? 1}</strong> คะแนน/แฟ้ม
                        </span>
                    </div>

                    <DialogTitle className="text-lg font-bold text-slate-900 leading-snug">
                        {data?.criteria.name || criteriaName || 'รายงานเจาะลึกข้อผิดพลาดตามเกณฑ์'}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-0.5">
                        รายงานสรุปข้อผิดพลาด ข้อมูลผู้ตรวจ ผู้ป่วย บันทึกข้อเสนอแนะ และคะแนนที่หายไปทั้งหมด
                    </DialogDescription>

                    {data?.criteria.audit_guide && (
                        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50/60 p-2.5 text-xs text-blue-900">
                            <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                            <div>
                                <strong className="font-semibold text-blue-950">เกณฑ์การตรวจสอบ: </strong>
                                <span>{data.criteria.audit_guide}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                            <p className="text-sm font-medium">กำลังโหลดข้อมูลรายงานข้อผิดพลาดเชิงลึก...</p>
                        </div>
                    ) : error ? (
                        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                            <span>{error}</span>
                        </div>
                    ) : data ? (
                        <>
                            {/* KPI Stat Cards */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-xl border border-rose-200 bg-white p-3.5 shadow-xs">
                                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                                        <span>คะแนนที่หายไปทั้งหมด</span>
                                        <TrendingDown className="h-4 w-4 text-rose-500" />
                                    </div>
                                    <div className="mt-2 text-2xl font-bold text-rose-600">
                                        -{data.summary.total_lost_score.toFixed(1)}
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        คะแนนที่ถูกหักจากข้อนี้รวม
                                    </p>
                                </div>

                                <div className="rounded-xl border border-amber-200 bg-white p-3.5 shadow-xs">
                                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                                        <span>จำนวนแฟ้มที่ไม่ผ่าน</span>
                                        <ShieldAlert className="h-4 w-4 text-amber-500" />
                                    </div>
                                    <div className="mt-2 text-2xl font-bold text-amber-600">
                                        {data.summary.fail_count} <span className="text-sm font-normal text-slate-500">แฟ้ม</span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        จากตรวจทั้งหมด {data.summary.total_evaluated} แฟ้ม
                                    </p>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                                        <span>อัตราข้อผิดพลาด</span>
                                        <span className="text-xs font-bold text-rose-500">Fail Rate</span>
                                    </div>
                                    <div className="mt-2 text-2xl font-bold text-slate-800">
                                        {data.summary.fail_rate_percentage}%
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        ของเคสที่มีการประเมินข้อนี้
                                    </p>
                                </div>

                                <div className="rounded-xl border border-indigo-200 bg-white p-3.5 shadow-xs">
                                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                                        <span>ผู้ตรวจที่พบปัญหานี้</span>
                                        <UserCheck className="h-4 w-4 text-indigo-500" />
                                    </div>
                                    <div className="mt-2 text-2xl font-bold text-indigo-600">
                                        {data.summary.auditors_count} <span className="text-sm font-normal text-slate-500">คน</span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        กรรมการ/ผู้ตรวจสอบเวชระเบียน
                                    </p>
                                </div>
                            </div>

                            {/* Search and Filters */}
                            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="ค้นหา HN, ชื่อผู้ป่วย, แพทย์, ผู้ตรวจ, ข้อความใน Note..."
                                        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-xs"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant={filterOnlyNotes ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setFilterOnlyNotes(!filterOnlyNotes)}
                                        className={cn(
                                            'text-xs h-8',
                                            filterOnlyNotes
                                                ? 'bg-amber-600 hover:bg-amber-700 text-white border-transparent'
                                                : 'text-slate-600 border-slate-200',
                                        )}
                                    >
                                        <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                                        เฉพาะที่มีบันทึก Note ({recordsWithNotesCount})
                                    </Button>
                                    <span className="text-xs text-slate-400">
                                        แสดง {filteredRecords.length} จาก {records.length} แฟ้ม
                                    </span>
                                </div>
                            </div>

                            {/* Records List */}
                            {filteredRecords.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
                                    <MessageSquare className="mx-auto h-8 w-8 text-slate-300" />
                                    <p className="mt-2 text-sm font-medium text-slate-600">
                                        ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        ลองปรับคำค้นหา หรือปิดตัวกรองดูเฉพาะที่มี Note
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {filteredRecords.map((record) => {
                                        return (
                                            <div
                                                key={record.detail_id}
                                                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition-all space-y-3"
                                            >
                                                {/* Header Row of Record */}
                                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                                        <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                            วันที่รับบริการ: <strong className="text-slate-800">{record.visit_date ? formatThaiDateFromIso(record.visit_date) : '-'}</strong>
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                'rounded-full px-2 py-0.5 text-[11px] font-semibold border',
                                                                record.audit_target === 'rta'
                                                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                    : 'bg-blue-50 text-blue-700 border-blue-200',
                                                            )}
                                                        >
                                                            {record.audit_target === 'rta' ? 'ตรวจส่ง ทบ.' : 'Internal Audit'}
                                                        </span>
                                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                                                            {record.audit_type}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
                                                            -{record.lost_score.toFixed(1)} คะแนน
                                                        </span>
                                                        {record.audit_id && (
                                                            <a
                                                                // @ts-ignore
                                                                href={window.route ? window.route('mra.show', record.audit_id) : `/mra/${record.audit_id}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                                                            >
                                                                ดูเวชระเบียน
                                                                <ExternalLink className="h-3 w-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Patient & Auditor Info Grid */}
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                                                    {/* Patient Info */}
                                                    <div className="rounded-lg bg-slate-50/70 p-2.5 border border-slate-100 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-slate-500">HN / ผู้ป่วย:</span>
                                                            <span className="font-semibold text-slate-800">
                                                                {record.patient_name} ({record.hn})
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-slate-500">VN / AN:</span>
                                                            <span className="font-mono text-slate-700">
                                                                {record.vn || record.an || '-'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-slate-500">แผนก:</span>
                                                            <span className="text-slate-700">{record.department}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-slate-500">แพทย์ผู้รักษา:</span>
                                                            <span className="font-medium text-slate-700">{record.doctor_name}</span>
                                                        </div>
                                                    </div>

                                                    {/* Auditor Info */}
                                                    <div className="rounded-lg bg-slate-50/70 p-2.5 border border-slate-100 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-slate-500">ผู้ตรวจสอบ:</span>
                                                            <span className="font-semibold text-indigo-700 flex items-center gap-1">
                                                                <User className="h-3 w-3 text-indigo-500" />
                                                                {record.auditor_name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-slate-500">วันเวลาที่ตรวจ:</span>
                                                            <span className="text-slate-700">
                                                                {record.audited_at ? formatThaiDateFromIso(record.audited_at) : '-'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-slate-500">สถานะผลการตรวจ:</span>
                                                            <span className="font-semibold text-rose-600">
                                                                ไม่ผ่านเกณฑ์ (0 / {record.max_score} คะแนน)
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Highlighted Notes Box */}
                                                <div className="space-y-2 pt-1">
                                                    {/* Auditor Specific Comment on this Criteria */}
                                                    {record.auditor_comment ? (
                                                        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs">
                                                            <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                                                                <MessageSquare className="h-4 w-4 text-amber-600" />
                                                                <span>ข้อเสนอแนะ/บันทึกของผู้ตรวจในข้อนี้:</span>
                                                            </div>
                                                            <p className="mt-1 text-slate-800 whitespace-pre-wrap pl-5 font-medium leading-relaxed">
                                                                {record.auditor_comment}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-400 italic flex items-center gap-1.5">
                                                            <MessageSquare className="h-3.5 w-3.5 text-slate-300" />
                                                            <span>ไม่มีการระบุข้อความ Note เฉพาะข้อนี้</span>
                                                        </div>
                                                    )}

                                                    {/* HOSxP Value at check time */}
                                                    {record.hosxp_value && (
                                                        <div className="rounded-lg border border-slate-200 bg-slate-100/70 px-3 py-2 text-xs">
                                                            <div className="flex items-center gap-1.5 font-medium text-slate-600">
                                                                <Database className="h-3.5 w-3.5 text-slate-500" />
                                                                <span>ข้อมูลที่ดึงจากระบบ HOSxP ณ วันตรวจ:</span>
                                                            </div>
                                                            <p className="mt-1 font-mono text-slate-800 pl-5 text-[11px] break-all">
                                                                {record.hosxp_value}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Overall Summary Notes of the Audit */}
                                                    {record.summary_notes && (
                                                        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-2.5 text-xs text-blue-950">
                                                            <div className="flex items-center gap-1.5 font-semibold text-blue-900">
                                                                <FileText className="h-3.5 w-3.5 text-blue-600" />
                                                                <span>บันทึกสรุปภาพรวมเวชระเบียนฉบับนี้:</span>
                                                            </div>
                                                            <p className="mt-1 text-slate-700 whitespace-pre-wrap pl-5">
                                                                {record.summary_notes}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 bg-white px-6 py-3 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                        {data?.filters?.from_date && data?.filters?.to_date ? (
                            <span>
                                ข้อมูลช่วงวันที่ {formatThaiDateFromIso(data.filters.from_date)} ถึง {formatThaiDateFromIso(data.filters.to_date)}
                                {data.filters.audit_target === 'internal' && ' • เฉพาะ Internal Audit'}
                                {data.filters.audit_target === 'rta' && ' • เฉพาะส่ง ทบ.'}
                            </span>
                        ) : (
                            <span>ข้อมูลทั้งหมดในระบบ</span>
                        )}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="text-xs"
                    >
                        ปิดหน้าต่าง
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
