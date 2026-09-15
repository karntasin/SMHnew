import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function FinanceDashboard({ financeUrl }: { financeUrl: string }) {
    const [sessionId, setSessionId] = useState('');
    const [currentUrl, setCurrentUrl] = useState<string | null>(null);

    const handleRun = () => {
        if (!sessionId) return;
        const url = `https://finance-dashboard.bmscloud.in.th?bms-session-id=${sessionId}`;
        setCurrentUrl(url);
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'รายงานการเงิน', href: route('finance.dashboard') },
            { title: 'แดชบอร์ด BMS', href: route('finance.dashboard') },
        ]}>
            <Head title="แดชบอร์ด BMS" />
            
            <div className="flex flex-col h-[calc(100vh-4rem)]">
                <div className="p-4 border-b bg-background flex items-center gap-4 shrink-0">
                    <div className="font-medium whitespace-nowrap">BMS Session ID:</div>
                    <Input 
                        value={sessionId}
                        onChange={(e) => setSessionId(e.target.value)}
                        placeholder="วาง Session ID ที่นี่ (เช่น 59B43CF3...)"
                        className="max-w-md"
                    />
                    <Button onClick={handleRun} disabled={!sessionId}>
                        แสดงผล (Run)
                    </Button>
                </div>

                <div className="flex-1 w-full overflow-hidden bg-muted/20 relative">
                    {currentUrl ? (
                        <iframe 
                            src={currentUrl} 
                            className="w-full h-full border-0"
                            title="Finance Dashboard"
                            allowFullScreen
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                            <p>กรุณากรอก Session ID แล้วกดปุ่ม "แสดงผล"</p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
