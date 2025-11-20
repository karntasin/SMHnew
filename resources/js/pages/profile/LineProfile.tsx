import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LineProfile() {
    return (
        <AppLayout breadcrumbs={[{ title: 'โปรไฟล์ LINE', href: '#' }]}>
            <Head title="โปรไฟล์ LINE" />
            <div className="p-6">
                <Card>
                    <CardHeader><CardTitle>การเชื่อมต่อ LINE</CardTitle></CardHeader>
                    <CardContent><p className="text-gray-500">อยู่ระหว่างการพัฒนา...</p></CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
