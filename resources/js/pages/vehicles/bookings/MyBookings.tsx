import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MyBookings() {
    return (
        <AppLayout breadcrumbs={[{ title: 'รายการจองรถของฉัน', href: '#' }]}>
            <Head title="รายการจองรถของฉัน" />
            <div className="p-6">
                <Card>
                    <CardHeader><CardTitle>รายการจองรถของฉัน</CardTitle></CardHeader>
                    <CardContent><p className="text-gray-500">อยู่ระหว่างการพัฒนา...</p></CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
