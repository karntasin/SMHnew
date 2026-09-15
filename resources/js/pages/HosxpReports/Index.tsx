import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    FileSpreadsheet,
    Calendar,
    Download,
    Search,
    AlertTriangle,
    CheckCircle2,
    Database,
    Eye,
    RefreshCw,
    FileText,
    Bookmark,
    Clock,
    ExternalLink,
    Trash2,
    Save,
} from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import axios from '@/lib/axios';
import { isAxiosError } from 'axios';
import { ThaiDatePicker, formatThaiDateFromIso } from '@/components/ui/thai-date-picker';

interface Report {
    id: string;
    name: string;
    name_en: string;
    category: string;
    category_label: string;
    description: string;
    requires_date: boolean;
    filters: string[];
    available: boolean;
    unavailable_reason?: string;
}

interface ConnectionStatus {
    connected: boolean;
    database: string | null;
    message: string;
}

interface FilterOption {
    code: string;
    name: string;
}

interface Preset {
    id: number;
    name: string;
    report_id: string;
    params: Record<string, unknown>;
    is_shared: boolean;
    user_id: number;
}

interface ScheduledReport {
    id: number;
    name: string;
    report_id: string;
    format: 'xlsx' | 'pdf';
    frequency: string;
    is_active: boolean;
    next_run_at: string | null;
    last_run_at: string | null;
    last_file_path: string | null;
}

interface Props {
    auth: { user?: { id: number } };
    connection: ConnectionStatus;
    reports: Report[];
    defaults: {
        start_date: string;
        end_date: string;
        limit: number;
    };
    filter_options: {
        pttypes: FilterOption[];
        departments: FilterOption[];
        wards: FilterOption[];
    };
    presets: Preset[];
    scheduled_reports: ScheduledReport[];
}

interface PreviewState {
    headers: string[];
    rows: Record<string, unknown>[];
    total: number;
    truncated: boolean;
}

const CATEGORY_ORDER = ['summary', 'opd', 'ipd', 'clinical', 'epidemiology', 'surgery', 'lab', 'pharmacy', 'finance', 'patient'];

function datePreset(days: number): { start: string; end: string } {
    const end = new Date();
    const start = new Date();
    if (days === 0) {
        const iso = end.toISOString().slice(0, 10);
        return { start: iso, end: iso };
    }
    start.setDate(start.getDate() - days);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

const DATE_FIELD_PATTERN = /date|birthday|birthdate|vstdate|nextdate/i;

function formatReportCell(key: string, val: unknown): string {
    if (val == null || val === '') return '';
    const str = String(val);
    if (DATE_FIELD_PATTERN.test(key) || /^\d{4}-\d{2}-\d{2}/.test(str)) {
        const iso = str.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
            return formatThaiDateFromIso(iso);
        }
    }
    if (/time/i.test(key) && /^\d{2}:\d{2}/.test(str)) {
        return str.slice(0, 5);
    }
    return str;
}

export default function Index({ connection, reports, defaults, filter_options, presets: initialPresets, scheduled_reports }: Props) {
    const { t } = useTranslation();
    const [selectedReport, setSelectedReport] = useState<string>('visit_statistics');
    const [startDate, setStartDate] = useState(defaults.start_date);
    const [endDate, setEndDate] = useState(defaults.end_date);
    const [limit, setLimit] = useState(String(defaults.limit));
    const [hasLab, setHasLab] = useState(false);
    const [hasDrug, setHasDrug] = useState(false);
    const [activeInRange, setActiveInRange] = useState(true);
    const [labItemName, setLabItemName] = useState('');
    const [labResultMax, setLabResultMax] = useState('');
    const [labResultMin, setLabResultMin] = useState('');
    const [drugName, setDrugName] = useState('');
    const [visitType, setVisitType] = useState('');
    const [pttype, setPttype] = useState('');
    const [department, setDepartment] = useState('');
    const [ward, setWard] = useState('');
    const [admitStatus, setAdmitStatus] = useState('all');
    const [icd10, setIcd10] = useState('');
    const [icd10Prefix, setIcd10Prefix] = useState('');
    const [diagtype, setDiagtype] = useState('');
    const [hn, setHn] = useState('');
    const [cid, setCid] = useState('');
    const [name, setName] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [loadingDownload, setLoadingDownload] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [preview, setPreview] = useState<PreviewState | null>(null);
    const [presets, setPresets] = useState<Preset[]>(initialPresets);
    const [presetName, setPresetName] = useState('');
    const [scheduleName, setScheduleName] = useState('');
    const [scheduleFormat, setScheduleFormat] = useState<'xlsx' | 'pdf'>('xlsx');
    const [scheduleFrequency, setScheduleFrequency] = useState('monthly');
    const [financeUrl, setFinanceUrl] = useState<string | null>(null);

    const selected = reports.find((r) => r.id === selectedReport);
    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('HOSxP Reports'), href: route('hosxp-reports.index') },
    ];

    const groupedReports = useMemo(() => {
        const filtered = reports.filter((r) => categoryFilter === 'all' || r.category === categoryFilter);
        const groups: Record<string, Report[]> = {};
        for (const report of filtered) {
            if (!groups[report.category]) groups[report.category] = [];
            groups[report.category].push(report);
        }
        return CATEGORY_ORDER.filter((c) => groups[c]?.length).map((c) => ({
            category: c,
            label: groups[c][0].category_label,
            items: groups[c],
        }));
    }, [reports, categoryFilter]);

    const buildParams = (): URLSearchParams => {
        const params = new URLSearchParams();
        params.append('report_id', selectedReport);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (limit) params.append('limit', limit);
        if (hasLab) params.append('has_lab', '1');
        if (hasDrug) params.append('has_drug', '1');
        if (selectedReport === 'patient_list' && activeInRange) params.append('active_in_range', '1');
        if (labItemName) params.append('lab_item_name', labItemName);
        if (labResultMax) params.append('lab_result_max', labResultMax);
        if (labResultMin) params.append('lab_result_min', labResultMin);
        if (drugName) params.append('drug_name', drugName);
        if (visitType) params.append('visit_type', visitType);
        if (pttype) params.append('pttype', pttype);
        if (department) params.append('department', department);
        if (ward) params.append('ward', ward);
        if (admitStatus && admitStatus !== 'all') params.append('admit_status', admitStatus);
        if (icd10) params.append('icd10', icd10);
        if (icd10Prefix) params.append('icd10_prefix', icd10Prefix);
        if (diagtype) params.append('diagtype', diagtype);
        if (hn) params.append('hn', hn);
        if (cid) params.append('cid', cid);
        if (name) params.append('name', name);
        return params;
    };

    const handlePreview = async () => {
        if (!selectedReport || !selected?.available) return;
        setLoadingPreview(true);
        setPreviewError(null);
        try {
            const { data } = await axios.get(route('hosxp-reports.preview'), { params: Object.fromEntries(buildParams()) });
            if (data.error) {
                setPreviewError(data.message);
                setPreview(null);
            } else {
                setPreview(data);
                setFinanceUrl(data.meta?.finance_revenue_url ?? null);
            }
        } catch (e: unknown) {
            let msg = 'Preview failed';
            if (isAxiosError(e)) {
                const data = e.response?.data as { message?: string; error?: boolean } | undefined;
                msg = data?.message ?? e.message;
            } else if (e instanceof Error) {
                msg = e.message;
            }
            setPreviewError(msg);
            setPreview(null);
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleDownloadPdf = () => {
        if (!selectedReport || !selected?.available) return;
        setLoadingDownload(true);
        window.location.href = `${route('hosxp-reports.generate-pdf')}?${buildParams().toString()}`;
        setTimeout(() => setLoadingDownload(false), 2500);
    };

    const applyPreset = (preset: Preset) => {
        setSelectedReport(preset.report_id);
        const p = preset.params || {};
        if (p.start_date) setStartDate(String(p.start_date));
        if (p.end_date) setEndDate(String(p.end_date));
        if (p.limit) setLimit(String(p.limit));
        setHasLab(!!p.has_lab);
        setHasDrug(!!p.has_drug);
        setPreview(null);
    };

    const savePreset = async () => {
        if (!presetName.trim() || !selectedReport) return;
        const { data } = await axios.post(route('hosxp-reports.presets.store'), {
            name: presetName,
            report_id: selectedReport,
            params: Object.fromEntries(buildParams()),
        });
        setPresets((prev) => [...prev, data.preset]);
        setPresetName('');
    };

    const deletePreset = async (id: number) => {
        await axios.delete(route('hosxp-reports.presets.destroy', id));
        setPresets((prev) => prev.filter((p) => p.id !== id));
    };

    const createSchedule = async () => {
        if (!scheduleName.trim() || !selectedReport) return;
        await axios.post(route('hosxp-reports.scheduled.store'), {
            name: scheduleName,
            report_id: selectedReport,
            params: Object.fromEntries(buildParams()),
            format: scheduleFormat,
            frequency: scheduleFrequency,
        });
        setScheduleName('');
        router.reload({ only: ['scheduled_reports'] });
    };

    const deleteSchedule = async (id: number) => {
        await axios.delete(route('hosxp-reports.scheduled.destroy', id));
        router.reload({ only: ['scheduled_reports'] });
    };

    const handleDownload = () => {
        if (!selectedReport || !selected?.available) return;
        setLoadingDownload(true);
        window.location.href = `${route('hosxp-reports.generate')}?${buildParams().toString()}`;
        setTimeout(() => setLoadingDownload(false), 2500);
    };

    const showFilter = (key: string) => selected?.filters.includes(key);

    return (
        <AppLayout breadcrumbs={breadcrumbs} title={t('HOSxP Reports')}>
            <Head title={t('HOSxP Reports')} />

            <div className="space-y-6 py-6">
                <Card className={connection.connected ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'}>
                    <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-3">
                            {connection.connected ? (
                                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                            ) : (
                                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                            )}
                            <div>
                                <p className="font-medium">{connection.message}</p>
                                {connection.database && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        <Database className="h-3.5 w-3.5" />
                                        {connection.database}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Badge variant={connection.connected ? 'default' : 'destructive'}>
                            {connection.connected ? t('Connected') : t('Disconnected')}
                        </Badge>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                    <Card className="xl:col-span-4">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5" />
                                {t('Select Report')}
                            </CardTitle>
                            <CardDescription>{t('Choose the type of report you want to generate')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant={categoryFilter === 'all' ? 'default' : 'outline'} onClick={() => setCategoryFilter('all')}>
                                    {t('All')}
                                </Button>
                                {CATEGORY_ORDER.map((cat) => {
                                    const label = reports.find((r) => r.category === cat)?.category_label;
                                    if (!label) return null;
                                    return (
                                        <Button key={cat} size="sm" variant={categoryFilter === cat ? 'default' : 'outline'} onClick={() => setCategoryFilter(cat)}>
                                            {label}
                                        </Button>
                                    );
                                })}
                            </div>

                            <div className="max-h-[32rem] space-y-4 overflow-y-auto pr-1">
                                {groupedReports.map((group) => (
                                    <div key={group.category}>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>
                                        <div className="space-y-2">
                                            {group.items.map((report) => (
                                                <button
                                                    key={report.id}
                                                    type="button"
                                                    disabled={!report.available}
                                                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                                                        selectedReport === report.id
                                                            ? 'border-primary bg-primary/5'
                                                            : report.available
                                                              ? 'hover:border-muted-foreground/40'
                                                              : 'cursor-not-allowed opacity-60'
                                                    }`}
                                                    onClick={() => {
                                                        setSelectedReport(report.id);
                                                        setPreview(null);
                                                        setPreviewError(null);
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="font-medium">{report.name}</p>
                                                            <p className="mt-1 text-xs text-muted-foreground">{report.description}</p>
                                                        </div>
                                                        {!report.available && (
                                                            <Badge variant="outline" className="shrink-0 text-[10px]">
                                                                N/A
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {!report.available && report.unavailable_reason && (
                                                        <p className="mt-2 text-xs text-amber-700">{report.unavailable_reason}</p>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6 xl:col-span-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    {t('Report Parameters')}
                                </CardTitle>
                                <CardDescription>{t('Set the date range and other options')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: t('Today'), days: 0 },
                                        { label: t('Last 7 days'), days: 7 },
                                        { label: t('Last 30 days'), days: 30 },
                                        { label: t('Last 90 days'), days: 90 },
                                    ].map((preset) => (
                                        <Button
                                            key={preset.days}
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const { start, end } = datePreset(preset.days);
                                                setStartDate(start);
                                                setEndDate(end);
                                            }}
                                        >
                                            {preset.label}
                                        </Button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <ThaiDatePicker
                                            label={t('Start Date')}
                                            value={startDate}
                                            onChange={setStartDate}
                                            placeholder={t('Select start date')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <ThaiDatePicker
                                            label={t('End Date')}
                                            value={endDate}
                                            onChange={setEndDate}
                                            placeholder={t('Select end date')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="limit">{t('Limit Records')}</Label>
                                        <Input id="limit" type="number" min={1} max={50000} value={limit} onChange={(e) => setLimit(e.target.value)} />
                                    </div>
                                </div>

                                {(startDate || endDate) && (
                                    <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
                                        <span className="font-medium text-primary">{t('Date Range')}: </span>
                                        {startDate ? formatThaiDateFromIso(startDate) : '—'}
                                        {' → '}
                                        {endDate ? formatThaiDateFromIso(endDate) : '—'}
                                    </p>
                                )}

                                {(showFilter('has_lab') || showFilter('has_drug')) && (
                                    <div className="flex flex-wrap gap-6 rounded-lg border p-4">
                                        {showFilter('has_lab') && (
                                            <label className="flex items-center gap-2 text-sm">
                                                <input type="checkbox" checked={hasLab} onChange={(e) => setHasLab(e.target.checked)} className="rounded" />
                                                {t('Has Lab Results')}
                                            </label>
                                        )}
                                        {showFilter('has_drug') && (
                                            <label className="flex items-center gap-2 text-sm">
                                                <input type="checkbox" checked={hasDrug} onChange={(e) => setHasDrug(e.target.checked)} className="rounded" />
                                                {t('Has Drug Prescriptions')}
                                            </label>
                                        )}
                                    </div>
                                )}

                                {(showFilter('pttype') || showFilter('department') || showFilter('ward') || showFilter('visit_type') || showFilter('admit_status')) && (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {showFilter('pttype') && (
                                            <div className="space-y-2">
                                                <Label>{t('Coverage (Pttype)')}</Label>
                                                <select className="w-full rounded-md border px-3 py-2 text-sm" value={pttype} onChange={(e) => setPttype(e.target.value)}>
                                                    <option value="">{t('All')}</option>
                                                    {filter_options.pttypes.map((p) => (
                                                        <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        {showFilter('department') && (
                                            <div className="space-y-2">
                                                <Label>{t('Department')}</Label>
                                                <select className="w-full rounded-md border px-3 py-2 text-sm" value={department} onChange={(e) => setDepartment(e.target.value)}>
                                                    <option value="">{t('All')}</option>
                                                    {filter_options.departments.map((d) => (
                                                        <option key={d.code} value={d.code}>{d.code} — {d.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        {showFilter('ward') && (
                                            <div className="space-y-2">
                                                <Label>{t('Ward')}</Label>
                                                <select className="w-full rounded-md border px-3 py-2 text-sm" value={ward} onChange={(e) => setWard(e.target.value)}>
                                                    <option value="">{t('All')}</option>
                                                    {filter_options.wards.map((w) => (
                                                        <option key={w.code} value={w.code}>{w.code} — {w.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        {showFilter('visit_type') && (
                                            <div className="space-y-2">
                                                <Label>OPD / IPD</Label>
                                                <select className="w-full rounded-md border px-3 py-2 text-sm" value={visitType} onChange={(e) => setVisitType(e.target.value)}>
                                                    <option value="">{t('All')}</option>
                                                    <option value="OPD">OPD</option>
                                                    <option value="IPD">IPD</option>
                                                </select>
                                            </div>
                                        )}
                                        {showFilter('admit_status') && (
                                            <div className="space-y-2">
                                                <Label>{t('Admission Status')}</Label>
                                                <select className="w-full rounded-md border px-3 py-2 text-sm" value={admitStatus} onChange={(e) => setAdmitStatus(e.target.value)}>
                                                    <option value="all">{t('All')}</option>
                                                    <option value="active">{t('Still admitted')}</option>
                                                    <option value="discharged">{t('Discharged')}</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {(showFilter('lab_item_name') || showFilter('lab_result_max')) && (
                                    <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-3">
                                        {showFilter('lab_item_name') && (
                                            <div className="space-y-2">
                                                <Label>{t('Lab Item Name')}</Label>
                                                <Input placeholder={t('e.g. Glucose, CBC')} value={labItemName} onChange={(e) => setLabItemName(e.target.value)} />
                                            </div>
                                        )}
                                        {showFilter('lab_result_min') && (
                                            <div className="space-y-2">
                                                <Label>{t('Min Result Value')}</Label>
                                                <Input type="number" value={labResultMin} onChange={(e) => setLabResultMin(e.target.value)} />
                                            </div>
                                        )}
                                        {showFilter('lab_result_max') && (
                                            <div className="space-y-2">
                                                <Label>{t('Max Result Value')}</Label>
                                                <Input type="number" value={labResultMax} onChange={(e) => setLabResultMax(e.target.value)} />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {showFilter('drug_name') && (
                                    <div className="space-y-2 border-t pt-4">
                                        <Label>{t('Drug Name')}</Label>
                                        <Input placeholder={t('e.g. Paracetamol')} value={drugName} onChange={(e) => setDrugName(e.target.value)} />
                                    </div>
                                )}

                                {(showFilter('icd10') || showFilter('icd10_prefix') || showFilter('diagtype')) && (
                                    <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-3">
                                        {showFilter('icd10_prefix') && (
                                            <div className="space-y-2">
                                                <Label>ICD-10 prefix</Label>
                                                <Input placeholder="E11, I10" value={icd10Prefix} onChange={(e) => setIcd10Prefix(e.target.value)} />
                                            </div>
                                        )}
                                        {showFilter('icd10') && (
                                            <div className="space-y-2">
                                                <Label>ICD-10</Label>
                                                <Input placeholder="E119" value={icd10} onChange={(e) => setIcd10(e.target.value)} />
                                            </div>
                                        )}
                                        {showFilter('diagtype') && (
                                            <div className="space-y-2">
                                                <Label>{t('Diagnosis Type')}</Label>
                                                <Input placeholder="1 = principal" value={diagtype} onChange={(e) => setDiagtype(e.target.value)} />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {(showFilter('hn') || showFilter('cid') || showFilter('name') || showFilter('active_in_range')) && (
                                    <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-3">
                                        {showFilter('hn') && <div className="space-y-2"><Label>HN</Label><Input value={hn} onChange={(e) => setHn(e.target.value)} /></div>}
                                        {showFilter('cid') && <div className="space-y-2"><Label>CID</Label><Input value={cid} onChange={(e) => setCid(e.target.value)} /></div>}
                                        {showFilter('name') && <div className="space-y-2"><Label>{t('Name')}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>}
                                        {showFilter('active_in_range') && (
                                            <label className="flex items-center gap-2 self-end pb-2 text-sm">
                                                <input type="checkbox" checked={activeInRange} onChange={(e) => setActiveInRange(e.target.checked)} className="rounded" />
                                                {t('Only patients with visits in date range')}
                                            </label>
                                        )}
                                    </div>
                                )}

                                {selected && (
                                    <div className="rounded-lg bg-muted/50 p-4 text-sm">
                                        <p className="font-medium">{selected.name}</p>
                                        <p className="text-muted-foreground">{selected.description}</p>
                                        <p className="mt-2">{t('Date Range')}: {startDate} — {endDate}</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex flex-wrap justify-end gap-2">
                                <Button variant="outline" onClick={handlePreview} disabled={!selected?.available || loadingPreview}>
                                    {loadingPreview ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                                    {t('Preview')}
                                </Button>
                                <Button variant="outline" onClick={handleDownloadPdf} disabled={!selected?.available || loadingDownload}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    {t('Download PDF')}
                                </Button>
                                <Button onClick={handleDownload} disabled={!selected?.available || loadingDownload}>
                                    {loadingDownload ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                    {t('Download Excel')}
                                </Button>
                            </CardFooter>
                        </Card>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Bookmark className="h-4 w-4" />
                                        {t('Saved Presets')}
                                    </CardTitle>
                                    <CardDescription>{t('Save filter combinations for quick reuse')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex gap-2">
                                        <Input placeholder={t('Preset name')} value={presetName} onChange={(e) => setPresetName(e.target.value)} />
                                        <Button type="button" variant="outline" onClick={savePreset} disabled={!presetName.trim()}>
                                            <Save className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {presets.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">{t('No presets yet')}</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {presets.map((p) => (
                                                <li key={p.id} className="flex items-center justify-between rounded border p-2 text-sm">
                                                    <button type="button" className="text-left hover:underline" onClick={() => applyPreset(p)}>
                                                        {p.name}
                                                    </button>
                                                    <Button type="button" size="sm" variant="ghost" onClick={() => deletePreset(p.id)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Clock className="h-4 w-4" />
                                        {t('Scheduled Reports')}
                                    </CardTitle>
                                    <CardDescription>{t('Auto-generate reports on a schedule')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Input placeholder={t('Schedule name')} value={scheduleName} onChange={(e) => setScheduleName(e.target.value)} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <select className="rounded-md border px-2 py-2 text-sm" value={scheduleFormat} onChange={(e) => setScheduleFormat(e.target.value as 'xlsx' | 'pdf')}>
                                            <option value="xlsx">Excel</option>
                                            <option value="pdf">PDF</option>
                                        </select>
                                        <select className="rounded-md border px-2 py-2 text-sm" value={scheduleFrequency} onChange={(e) => setScheduleFrequency(e.target.value)}>
                                            <option value="daily">{t('Daily')}</option>
                                            <option value="weekly">{t('Weekly')}</option>
                                            <option value="monthly">{t('Monthly')}</option>
                                        </select>
                                    </div>
                                    <Button type="button" className="w-full" variant="outline" onClick={createSchedule} disabled={!scheduleName.trim()}>
                                        {t('Create schedule')}
                                    </Button>
                                    {scheduled_reports.length > 0 && (
                                        <ul className="space-y-2 text-sm">
                                            {scheduled_reports.map((s) => (
                                                <li key={s.id} className="flex items-center justify-between rounded border p-2">
                                                    <div>
                                                        <p className="font-medium">{s.name}</p>
                                                        <p className="text-xs text-muted-foreground">{s.frequency} · {s.format.toUpperCase()}</p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {s.last_file_path && (
                                                            <a href={route('hosxp-reports.download-scheduled', s.id)} className="text-xs text-primary underline">
                                                                {t('Download')}
                                                            </a>
                                                        )}
                                                        <Button type="button" size="sm" variant="ghost" onClick={() => deleteSchedule(s.id)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Search className="h-5 w-5" />
                                    {t('Preview Results')}
                                </CardTitle>
                                <CardDescription>
                                    {preview ? `${t('Showing')} ${preview.rows.length} / ${preview.total.toLocaleString()} ${t('records')}` : t('Click Preview to verify data before export')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {financeUrl && (
                                    <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm">
                                        <Link href={financeUrl} className="inline-flex items-center gap-1 font-medium text-teal-800 hover:underline">
                                            <ExternalLink className="h-4 w-4" />
                                            {t('Open Finance Revenue Dashboard for this period')}
                                        </Link>
                                    </div>
                                )}
                                {previewError && (
                                    <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                        {previewError}
                                    </div>
                                )}
                                {!preview && !previewError && (
                                    <p className="text-sm text-muted-foreground italic">{t('No preview yet')}</p>
                                )}
                                {preview && preview.headers.length > 0 && (
                                    <div className="overflow-x-auto rounded-lg border">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-muted/60">
                                                <tr>
                                                    {preview.headers.map((h) => (
                                                        <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {preview.rows.map((row, idx) => (
                                                    <tr key={idx} className="border-t hover:bg-muted/30">
                                                        {Object.entries(row).map(([key, val], cidx) => (
                                                            <td key={cidx} className="max-w-xs truncate whitespace-nowrap px-3 py-2" title={formatReportCell(key, val)}>
                                                                {formatReportCell(key, val)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {preview?.truncated && (
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        {t('Preview shows first 50 rows only. Download Excel for full export up to your limit.')}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
