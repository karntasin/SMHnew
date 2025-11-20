import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Create() {
    return (
        <AppLayout breadcrumbs={[{ title: 'เพิ่มรถใหม่', href: '#' }]}>
            <Head title="เพิ่มรถใหม่" />
            <div className="p-6">
                <Card>
                    <CardHeader><CardTitle>เพิ่มรถใหม่</CardTitle></CardHeader>
                    <CardContent><p className="text-gray-500">อยู่ระหว่างการพัฒนา...</p></CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
