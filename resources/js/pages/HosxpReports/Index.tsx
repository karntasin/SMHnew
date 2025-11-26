import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet, Calendar, Download } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

interface Report {
    id: string;
    name: string;
    description: string;
}

interface Props {
    auth: any;
    reports: Report[];
}

export default function Index({ auth, reports }: Props) {
    const { t } = useTranslation();
    const [selectedReport, setSelectedReport] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [limit, setLimit] = useState<string>('1000');
    const [hasLab, setHasLab] = useState<boolean>(false);
    const [hasDrug, setHasDrug] = useState<boolean>(false);
    const [labItemName, setLabItemName] = useState<string>('');
    const [labResultMax, setLabResultMax] = useState<string>('');
    const [drugName, setDrugName] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('HOSxP Reports'), href: route('hosxp-reports.index') },
    ];

    const handleDownload = () => {
        if (!selectedReport) return;
        
        setLoading(true);
        
        // Construct query parameters
        const params = new URLSearchParams();
        params.append('report_id', selectedReport);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (limit) params.append('limit', limit);
        if (hasLab) params.append('has_lab', '1');
        if (hasDrug) params.append('has_drug', '1');
        if (labItemName) params.append('lab_item_name', labItemName);
        if (labResultMax) params.append('lab_result_max', labResultMax);
        if (drugName) params.append('drug_name', drugName);

        // Trigger download via GET request
        // @ts-ignore
        window.location.href = `${route('hosxp-reports.generate')}?${params.toString()}`;
        
        // Reset loading state after a short delay
        setTimeout(() => setLoading(false), 2000);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs} title={t('HOSxP Reports')}>
            <Head title={t('HOSxP Reports')} />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Report Selection */}
                        <Card className="md:col-span-1">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileSpreadsheet className="h-5 w-5" />
                                    {t('Select Report')}
                                </CardTitle>
                                <CardDescription>{t('Choose the type of report you want to generate')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {reports.map((report) => (
                                        <div 
                                            key={report.id}
                                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedReport === report.id ? 'border-primary bg-primary/5' : 'hover:border-gray-400'}`}
                                            onClick={() => setSelectedReport(report.id)}
                                        >
                                            <h3 className="font-medium">{t(report.name)}</h3>
                                            <p className="text-sm text-muted-foreground mt-1">{t(report.description)}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Parameters & Action */}
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    {t('Report Parameters')}
                                </CardTitle>
                                <CardDescription>{t('Set the date range and other options')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="start_date">{t('Start Date')}</Label>
                                        <Input 
                                            id="start_date" 
                                            type="date" 
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="end_date">{t('End Date')}</Label>
                                        <Input 
                                            id="end_date" 
                                            type="date" 
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="limit">{t('Limit Records')}</Label>
                                        <Input 
                                            id="limit" 
                                            type="number" 
                                            min="1"
                                            max="10000"
                                            value={limit}
                                            onChange={(e) => setLimit(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2 pt-8">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2">
                                                <input 
                                                    type="checkbox" 
                                                    id="has_lab" 
                                                    checked={hasLab}
                                                    onChange={(e) => setHasLab(e.target.checked)}
                                                    className="rounded border-gray-300 text-primary shadow-sm focus:ring-primary"
                                                />
                                                <Label htmlFor="has_lab" className="cursor-pointer">{t('Has Lab Results')}</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <input 
                                                    type="checkbox" 
                                                    id="has_drug" 
                                                    checked={hasDrug}
                                                    onChange={(e) => setHasDrug(e.target.checked)}
                                                    className="rounded border-gray-300 text-primary shadow-sm focus:ring-primary"
                                                />
                                                <Label htmlFor="has_drug" className="cursor-pointer">{t('Has Drug Prescriptions')}</Label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {selectedReport === 'lab_report' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="lab_item_name">{t('Lab Item Name')}</Label>
                                            <Input 
                                                id="lab_item_name" 
                                                type="text" 
                                                placeholder={t('e.g. Glucose, CBC')}
                                                value={labItemName}
                                                onChange={(e) => setLabItemName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="lab_result_max">{t('Max Result Value')}</Label>
                                            <Input 
                                                id="lab_result_max" 
                                                type="number" 
                                                placeholder={t('e.g. 100')}
                                                value={labResultMax}
                                                onChange={(e) => setLabResultMax(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                {selectedReport === 'drug_report' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="drug_name">{t('Drug Name')}</Label>
                                            <Input 
                                                id="drug_name" 
                                                type="text" 
                                                placeholder={t('e.g. Paracetamol')}
                                                value={drugName}
                                                onChange={(e) => setDrugName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="bg-muted/50 p-4 rounded-lg">
                                    <h4 className="font-medium mb-2">{t('Selected Report Summary')}</h4>
                                    {selectedReport ? (
                                        <div className="text-sm space-y-1">
                                            <p><span className="text-muted-foreground">{t('Report')}:</span> {t(reports.find(r => r.id === selectedReport)?.name || '')}</p>
                                            <p><span className="text-muted-foreground">{t('Date Range')}:</span> {startDate || 'N/A'} - {endDate || 'N/A'}</p>
                                            <p><span className="text-muted-foreground">{t('Limit')}:</span> {limit}</p>
                                            {hasLab && <p className="text-primary font-medium">{t('Filter: Has Lab Results')}</p>}
                                            {hasDrug && <p className="text-primary font-medium">{t('Filter: Has Drug Prescriptions')}</p>}
                                            {selectedReport === 'lab_report' && labItemName && <p className="text-primary font-medium">{t('Lab Name')}: {labItemName}</p>}
                                            {selectedReport === 'lab_report' && labResultMax && <p className="text-primary font-medium">{t('Max Result')}: {labResultMax}</p>}
                                            {selectedReport === 'drug_report' && drugName && <p className="text-primary font-medium">{t('Drug Name')}: {drugName}</p>}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">{t('Please select a report from the list')}</p>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end">
                                <Button 
                                    onClick={handleDownload} 
                                    disabled={!selectedReport || loading}
                                    className="w-full md:w-auto"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="animate-spin">⏳</span> {t('Generating...')}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Download className="h-4 w-4" /> {t('Download Excel')}
                                        </span>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
