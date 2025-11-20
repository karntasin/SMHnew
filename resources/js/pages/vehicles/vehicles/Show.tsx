import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Show() {
    return (
        <AppLayout breadcrumbs={[{ title: 'รายละเอียดรถ', href: '#' }]}>
            <Head title="รายละเอียดรถ" />
            <div className="p-6">
                <Card>
                    <CardHeader><CardTitle>รายละเอียดรถ</CardTitle></CardHeader>
                    <CardContent><p className="text-gray-500">อยู่ระหว่างการพัฒนา...</p></CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
