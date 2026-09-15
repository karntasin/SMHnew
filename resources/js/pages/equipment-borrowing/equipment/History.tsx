import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Props {
    equipment: any;
    borrowings: { data: any[] };
    stockLogs: any[];
}

export default function History({ equipment, borrowings, stockLogs }: Props) {
    return (
        <AppLayout breadcrumbs={[
            { title: 'จัดการอุปกรณ์', href: route('equipment-borrowing.equipment.index') },
            { title: equipment.name, href: '#' },
        ]}>
            <Head title={`ประวัติ ${equipment.name}`} />

            <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                    <Link href={route('equipment-borrowing.equipment.index')}><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
                    <div>
                        <h1 className="text-2xl font-bold">{equipment.name}</h1>
                        <p className="text-muted-foreground">{equipment.asset_code} · สต็อก {equipment.quantity_available}/{equipment.quantity_total}</p>
                    </div>
                </div>

                <Card>
                    <CardHeader><CardTitle>ประวัติการยืม</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {borrowings.data.map((b) => (
                            <Link key={b.id} href={route('equipment-borrowing.borrowings.show', b.id)} className="flex justify-between p-3 rounded-lg border hover:bg-accent/30">
                                <div>
                                    <p className="font-medium">{b.borrowing_number}</p>
                                    <p className="text-sm text-muted-foreground">{b.borrower?.name} · {b.purpose}</p>
                                </div>
                                <Badge variant="outline">{b.status}</Badge>
                            </Link>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>ประวัติสต็อก</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {stockLogs.map((log) => (
                            <div key={log.id} className="flex justify-between p-2 border-b">
                                <span>{log.reason}</span>
                                <span className={log.quantity_change < 0 ? 'text-red-600' : 'text-green-600'}>
                                    {log.quantity_change > 0 ? '+' : ''}{log.quantity_change} ({log.quantity_before}→{log.quantity_after})
                                </span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
