import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Show() {
    return (
        <AppLayout breadcrumbs={[{ title: 'ดูร่างเอกสาร', href: '#' }]}>
            <Head title="ดูร่างเอกสาร" />
            <div className="p-6">
                <Card>
                    <CardHeader><CardTitle>ดูร่างเอกสาร</CardTitle></CardHeader>
                    <CardContent><p className="text-gray-500">อยู่ระหว่างการพัฒนา...</p></CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
