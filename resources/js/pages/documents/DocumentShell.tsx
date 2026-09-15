import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import DocumentSubNav, { DocumentTabKey, documentBreadcrumbs } from './DocumentSubNav';

interface Props {
    active: DocumentTabKey;
    title: string;
    headTitle?: string;
    breadcrumbs?: { title: string; href: string }[];
    children: React.ReactNode;
}

export default function DocumentShell({
    active,
    title,
    headTitle,
    breadcrumbs,
    children,
}: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs ?? documentBreadcrumbs([{ title, href: '#' }])}>
            <Head title={headTitle ?? title} />
            <div className="relative min-h-screen overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.16),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(192,132,252,0.12),_transparent_45%)]" />
                <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />
                <div className="pointer-events-none absolute -right-16 top-80 h-80 w-80 rounded-full bg-fuchsia-300/15 blur-3xl" />

                <div className="relative container mx-auto space-y-6 px-4 py-6">
                    <DocumentSubNav active={active} />
                    {children}
                </div>
            </div>
        </AppLayout>
    );
}
