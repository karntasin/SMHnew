import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MyRequests() {
    return (
        <AppLayout breadcrumbs={[{ title: 'รายการแจ้งซ่อมของฉัน', href: '#' }]}>
            <Head title="รายการแจ้งซ่อมของฉัน" />
            <div className="p-6">
                <Card>
                    <CardHeader><CardTitle>รายการแจ้งซ่อมของฉัน</CardTitle></CardHeader>
                    <CardContent><p className="text-gray-500">อยู่ระหว่างการพัฒนา...</p></CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
