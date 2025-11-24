import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, AlertTriangle, CheckCircle } from 'lucide-react';

export default function Index() {
    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบงานคุณภาพ', href: '#' },
            { title: 'ENV', href: route('env.index') }
        ]}>
            <Head title="Environment & Safety (ENV)" />

            <div className="p-6 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Leaf className="h-6 w-6 text-green-600" />
                        Environment & Safety (ENV)
                    </h2>
                    <p className="text-muted-foreground">ระบบบริหารจัดการสิ่งแวดล้อมและความปลอดภัย</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                ความเสี่ยงด้านสิ่งแวดล้อม
                            </CardTitle>
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                            <p className="text-xs text-muted-foreground">
                                รายการที่ต้องแก้ไข
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                การตรวจสอบความปลอดภัย
                            </CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                            <p className="text-xs text-muted-foreground">
                                รอบการเดินสำรวจเดือนนี้
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                        <div className="p-4 rounded-full bg-muted">
                            <Leaf className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold">อยู่ระหว่างการพัฒนา</h3>
                        <p className="text-muted-foreground max-w-sm">
                            ระบบบริหารจัดการสิ่งแวดล้อมและความปลอดภัย (ENV) กำลังอยู่ระหว่างการพัฒนา
                        </p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
