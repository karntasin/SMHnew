import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Import() {
    return (
        <AppLayout breadcrumbs={[{ title: 'นำเข้าเอกสาร', href: '#' }]}>
            <Head title="นำเข้าเอกสาร" />
            <div className="p-6">
                <Card>
                    <CardHeader><CardTitle>นำเข้าเอกสาร</CardTitle></CardHeader>
                    <CardContent><p className="text-gray-500">อยู่ระหว่างการพัฒนา...</p></CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
