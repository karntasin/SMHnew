import React from 'react';

import AppLayout from '@/layouts/app-layout';

import { Head, Link } from '@inertiajs/react';

import { Button } from '@/components/ui/button';

import { Plus } from 'lucide-react';

import MaintenanceSubNav from '../MaintenanceSubNav';

import MaintenanceRequestCard from '../MaintenanceRequestCard';



interface RequestItem {

    id: number;

    ticket_number: string;

    title: string;

    description?: string;

    location?: string;

    status: string;

    created_at: string;

    category?: { name: string; color?: string } | null;

    priority?: { name: string; color?: string } | null;

    requester?: { name: string } | null;

    images?: { image_path: string }[];

}



interface IndexProps {

    requests: {

        data: RequestItem[];

        links: { url: string | null; label: string; active: boolean }[];

    };

}



export default function Index({ requests }: IndexProps) {

    if (!requests || !requests.data) {

        return (

            <AppLayout breadcrumbs={[{ title: 'ระบบแจ้งซ่อม', href: route('maintenance.dashboard') }]}>

                <div className="p-6 text-center text-red-500">เกิดข้อผิดพลาดในการโหลดข้อมูล (No data received)</div>

            </AppLayout>

        );

    }



    return (

        <AppLayout

            breadcrumbs={[

                { title: 'ระบบแจ้งซ่อม', href: route('maintenance.dashboard') },

                { title: 'รายการทั้งหมด', href: '#' },

            ]}

        >

            <Head title="รายการแจ้งซ่อม" />



            <div className="relative min-h-screen overflow-hidden">

                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.14),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(245,158,11,0.10),_transparent_45%)]" />

                <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-orange-300/15 blur-3xl" />

                <div className="pointer-events-none absolute -right-16 top-80 h-80 w-80 rounded-full bg-amber-300/15 blur-3xl" />



                <div className="relative container mx-auto space-y-6 px-4 py-6">

                    <MaintenanceSubNav active="maintenance.requests.index" />



                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                            <h1 className="text-2xl font-bold text-slate-800">รายการแจ้งซ่อม</h1>

                            <p className="text-sm text-slate-500">อนุมัติและติดตามรายการแจ้งซ่อมทั้งหมด</p>

                        </div>

                        <Link href={route('maintenance.requests.create')}>

                            <Button className="rounded-xl bg-orange-600 hover:bg-orange-700">

                                <Plus className="mr-2 h-4 w-4" />

                                แจ้งซ่อมใหม่

                            </Button>

                        </Link>

                    </div>



                    {requests.data.length === 0 ? (

                        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-12 text-center text-slate-500">

                            ไม่พบรายการแจ้งซ่อม

                        </div>

                    ) : (

                        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">

                            {requests.data.map((req) => (

                                <MaintenanceRequestCard key={req.id} request={req} />

                            ))}

                        </div>

                    )}



                    {requests.links && requests.links.length > 3 && (

                        <div className="flex flex-wrap justify-center gap-2">

                            {requests.links.map((link, i) =>

                                link.url ? (

                                    <Link

                                        key={i}

                                        href={link.url}

                                        className={`rounded-xl px-3 py-1.5 text-sm ${

                                            link.active

                                                ? 'bg-orange-600 text-white'

                                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-orange-50'

                                        }`}

                                        dangerouslySetInnerHTML={{ __html: link.label }}

                                    />

                                ) : (

                                    <span

                                        key={i}

                                        className="rounded-xl px-3 py-1.5 text-sm text-slate-400"

                                        dangerouslySetInnerHTML={{ __html: link.label }}

                                    />

                                ),

                            )}

                        </div>

                    )}

                </div>

            </div>

        </AppLayout>

    );

}

