import React, { ReactNode } from 'react';
import AppLayout from '@/layouts/app-layout';
import RcmSubNav from './RcmSubNav';
import { Head } from '@inertiajs/react';

interface RcmLayoutProps {
    title: string;
    active: 'dashboard' | 'import' | 'scrubber' | 'csop' | 'cipn' | 'reconcile' | 'smt' | 'monthly' | 'dialysis' | 'uc' | 'uc-hospital' | 'file-patch';
    children: ReactNode;
}

export default function RcmLayout({ title, active, children }: RcmLayoutProps) {
    const breadcrumbs = [
        { title: 'หน้าหลัก', href: route('dashboard') },
        { title: 'ระบบบริหารวงจรรายได้ (RCM)', href: route('rcm.dashboard') },
        { title, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`RCM - ${title}`} />
            <div className="min-h-screen bg-slate-50/60 pb-12">
                <RcmSubNav active={active} />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {children}
                </div>
            </div>
        </AppLayout>
    );
}
