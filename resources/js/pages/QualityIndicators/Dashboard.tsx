import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface Entry {
    id: number;
    period_date: string;
    result_value: number;
}

interface Indicator {
    id: number;
    code: string;
    name: string;
    target_value: number;
    target_operator: string;
    unit: string;
    entries: Entry[];
}

export default function Dashboard({ indicators }: { indicators: Indicator[] }) {
    const isPass = (indicator: Indicator, value: number) => {
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

    const getStatusColor = (indicator: Indicator, value: number) => {
        return isPass(indicator, value) ? 'text-green-600' : 'text-red-600';
    };

    const getStatusBg = (indicator: Indicator, value: number) => {
        return isPass(indicator, value) ? 'bg-green-100' : 'bg-red-100';
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ตัวชี้วัดคุณภาพ', href: route('quality-indicators.index') },
            { title: 'Dashboard', href: '#' }
        ]}>
            <Head title="Quality Dashboard" />

            <div className="p-6 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Dashboard ภาพรวมตัวชี้วัด</h2>
                    <p className="text-muted-foreground">สถานะล่าสุดของตัวชี้วัดคุณภาพทั้งหมด</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {indicators.map((indicator) => {
                        const latestEntry = indicator.entries[0];
                        const hasData = !!latestEntry;
                        const value = hasData ? latestEntry.result_value : 0;
                        const pass = hasData ? isPass(indicator, value) : false;

                        return (
                            <Link key={indicator.id} href={route('quality-indicators.show', { indicator: indicator.id })}>
                                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium line-clamp-1" title={indicator.name}>
                                            {indicator.code}
                                        </CardTitle>
                                        {hasData ? (
                                            <div className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusBg(indicator, value)} ${getStatusColor(indicator, value)}`}>
                                                {pass ? 'PASS' : 'FAIL'}
                                            </div>
                                        ) : (
                                            <div className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
                                                NO DATA
                                            </div>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold truncate">
                                            {hasData ? `${value} ${indicator.unit}` : '-'}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                            {indicator.name}
                                        </p>
                                        <div className="mt-4 text-xs text-muted-foreground flex justify-between">
                                            <span>Target: {indicator.target_operator} {indicator.target_value}</span>
                                            <span>{hasData ? new Date(latestEntry.period_date).toLocaleDateString('th-TH') : ''}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </AppLayout>
    );
}
