import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Reviews from './Reviews';
import Audits from './Audits';
import Improvements from './Improvements';

export default function Index({ reviews, audits, improvements }: any) {
    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบงานคุณภาพ', href: '#' },
            { title: 'ระบบติดตามการทบทวน', href: route('quality-assurance.index') }
        ]}>
            <Head title="Quality Assurance" />

            <div className="p-6 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">ระบบติดตามการทบทวน (Review & Audit Tracking)</h2>
                    <p className="text-muted-foreground">ติดตามการทบทวน, การตรวจสอบภายใน, และแผนพัฒนาคุณภาพ (CQI/AAR)</p>
                </div>

                <Tabs defaultValue="reviews" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="reviews">ตารางการทบทวน (Reviews)</TabsTrigger>
                        <TabsTrigger value="audits">การตรวจสอบภายใน (Audits)</TabsTrigger>
                        <TabsTrigger value="improvements">แผนพัฒนาคุณภาพ (CQI/AAR)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="reviews" className="space-y-4">
                        <Reviews reviews={reviews} />
                    </TabsContent>
                    <TabsContent value="audits" className="space-y-4">
                        <Audits audits={audits} />
                    </TabsContent>
                    <TabsContent value="improvements" className="space-y-4">
                        <Improvements improvements={improvements} />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
