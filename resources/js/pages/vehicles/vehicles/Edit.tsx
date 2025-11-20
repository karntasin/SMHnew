import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Edit() {
    return (
        <AppLayout breadcrumbs={[{ title: 'แก้ไขข้อมูลรถ', href: '#' }]}>
            <Head title="แก้ไขข้อมูลรถ" />
            <div className="p-6">
                <Card>
                    <CardHeader><CardTitle>แก้ไขข้อมูลรถ</CardTitle></CardHeader>
                    <CardContent><p className="text-gray-500">อยู่ระหว่างการพัฒนา...</p></CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
