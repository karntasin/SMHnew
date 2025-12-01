import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Rooms() {
    return (
        <AppLayout breadcrumbs={[{ title: 'จัดการห้องประชุม', href: '/administration/rooms/meeting-rooms' }]}>
            <Head title="จัดการห้องประชุม" />
            <div className="p-6">
                <Card>
                    <CardHeader><CardTitle>จัดการห้องประชุม</CardTitle></CardHeader>
                    <CardContent><p className="text-gray-500">อยู่ระหว่างการพัฒนา...</p></CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
