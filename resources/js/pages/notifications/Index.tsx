import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Index() {
    return (
        <AppLayout breadcrumbs={[{ title: 'การแจ้งเตือน', href: '#' }]}>
            <Head title="การแจ้งเตือน" />
            <div className="p-6">
                <Card>
                    <CardHeader><CardTitle>การแจ้งเตือนทั้งหมด</CardTitle></CardHeader>
                    <CardContent><p className="text-gray-500">อยู่ระหว่างการพัฒนา...</p></CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
