import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={[{ title: 'แดชบอร์ดจองรถ', href: '#' }]}>
            <Head title="แดชบอร์ดจองรถ" />
            <div className="p-6">
                <Card>
                    <CardHeader><CardTitle>ภาพรวมการจองรถ</CardTitle></CardHeader>
                    <CardContent><p className="text-gray-500">อยู่ระหว่างการพัฒนา...</p></CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
