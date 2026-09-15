import React, { useState } from 'react';

import AppLayout from '@/layouts/app-layout';

import { Head, Link } from '@inertiajs/react';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

import { iconMapper } from '@/lib/iconMapper';

import { ClipboardList, Plus, Wrench } from 'lucide-react';

import MaintenanceSubNav from './MaintenanceSubNav';

import MaintenanceRequestCard from './MaintenanceRequestCard';



interface Category {

    id: number;

    name: string;

    description?: string | null;

    icon?: string | null;

    color?: string | null;

}



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



interface DashboardProps {

    stats: {

        total: number;

        pending: number;

        in_progress: number;

        completed: number;

    };

    categories: Category[];

    recentRequests: RequestItem[];

    pendingRequests: RequestItem[];

}



export default function Dashboard({ stats, categories, recentRequests, pendingRequests }: DashboardProps) {

    const [requestTab, setRequestTab] = useState<'recent' | 'pending'>('recent');

    const requestItems = requestTab === 'recent' ? recentRequests : pendingRequests;



    return (

        <AppLayout breadcrumbs={[{ title: 'ระบบแจ้งซ่อม', href: route('maintenance.dashboard') }]}>

            <Head title="ระบบแจ้งซ่อม" />



            <div className="relative min-h-screen overflow-hidden">

                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(245,158,11,0.12),_transparent_45%)]" />

                <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-orange-300/20 blur-3xl" />

                <div className="pointer-events-none absolute -right-16 top-80 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />



                <div className="relative container mx-auto space-y-6 px-4 py-6">

                    <MaintenanceSubNav active="maintenance.dashboard" />



                    <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-gradient-to-br from-slate-900 via-orange-950 to-amber-900 p-6 text-white shadow-2xl shadow-orange-900/20 md:p-8">

                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

                            <div className="max-w-2xl space-y-3">

                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-orange-100 backdrop-blur">

                                    <Wrench className="h-3.5 w-3.5" />

                                    ระบบแจ้งซ่อมและติดตามงาน

                                </div>

                                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">ระบบแจ้งซ่อม</h1>

                                <p className="text-sm text-orange-100/80 md:text-base">

                                    เลือกหมวดหมู่ แจ้งปัญหา พร้อมติดตามสถานะงานซ่อมได้ในที่เดียว

                                </p>

                            </div>

                            <div className="flex flex-wrap gap-2">

                                <Link href={route('maintenance.requests.index')}>

                                    <Button variant="secondary" className="bg-white/15 text-white hover:bg-white/25">

                                        <ClipboardList className="mr-2 h-4 w-4" />

                                        รายการทั้งหมด

                                    </Button>

                                </Link>

                                <Link href={route('maintenance.requests.create')}>

                                    <Button className="bg-amber-400 text-slate-900 hover:bg-amber-300">

                                        <Plus className="mr-2 h-4 w-4" />

                                        แจ้งซ่อมใหม่

                                    </Button>

                                </Link>

                            </div>

                        </div>



                        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                            {[

                                { label: 'รายการทั้งหมด', value: stats?.total ?? 0 },

                                { label: 'รอดำเนินการ', value: stats?.pending ?? 0 },

                                { label: 'กำลังดำเนินการ', value: stats?.in_progress ?? 0 },

                                { label: 'เสร็จสิ้น', value: stats?.completed ?? 0 },

                            ].map((item) => (

                                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">

                                    <div className="text-2xl font-bold">{item.value}</div>

                                    <div className="text-xs text-orange-100/70">{item.label}</div>

                                </div>

                            ))}

                        </div>

                    </section>



                    <section className="space-y-4">

                        <div>

                            <h2 className="text-xl font-bold text-slate-800">หมวดหมู่การแจ้งซ่อม</h2>

                            <p className="text-sm text-slate-500">เลือกหมวดหมู่แล้วแจ้งซ่อมได้ทันที</p>

                        </div>



                        {categories.length === 0 ? (

                            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-12 text-center text-slate-500">

                                ยังไม่มีหมวดหมู่ — ไปที่เมนูตั้งค่าเพื่อเพิ่มหมวดหมู่การแจ้งซ่อม

                                <div className="mt-4">

                                    <Link href={route('maintenance.settings.index')}>

                                        <Button>ไปตั้งค่า</Button>

                                    </Link>

                                </div>

                            </div>

                        ) : (

                            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">

                                {categories.map((category) => {

                                    const Icon = iconMapper(category.icon || 'wrench');

                                    const color = category.color || '#f97316';



                                    return (

                                        <article

                                            key={category.id}

                                            className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-900/10"

                                            style={{ borderColor: `${color}33` }}

                                        >

                                            <div className="relative p-3 pb-0">

                                                <div

                                                    className="relative overflow-hidden rounded-2xl p-[3px]"

                                                    style={{

                                                        background: `linear-gradient(135deg, ${color} 0%, #fdba74 55%, ${color}88 100%)`,

                                                    }}

                                                >

                                                    <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br from-orange-50 to-amber-50">

                                                        <div

                                                            className="flex h-20 w-20 items-center justify-center rounded-full shadow-lg"

                                                            style={{ backgroundColor: `${color}22`, color }}

                                                        >

                                                            <Icon className="h-10 w-10" />

                                                        </div>

                                                    </div>

                                                </div>

                                            </div>



                                            <div className="space-y-3 p-4">

                                                <h3 className="text-lg font-bold text-slate-800">{category.name}</h3>

                                                <p className="line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">

                                                    {category.description || 'หมวดหมู่การแจ้งซ่อม'}

                                                </p>

                                                <Link href={`${route('maintenance.requests.create')}?category_id=${category.id}`}>

                                                    <Button className="w-full rounded-xl bg-orange-600 hover:bg-orange-700">

                                                        <Plus className="mr-2 h-4 w-4" />

                                                        แจ้งซ่อมหมวดนี้

                                                    </Button>

                                                </Link>

                                            </div>

                                        </article>

                                    );

                                })}

                            </div>

                        )}

                    </section>



                    <section className="space-y-4 rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-slate-900/5 backdrop-blur md:p-6">

                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                            <div>

                                <h2 className="text-xl font-bold text-slate-800">รายการแจ้งซ่อมล่าสุด</h2>

                                <p className="text-sm text-slate-500">ดูรายการล่าสุดและรายการที่รออนุมัติ</p>

                            </div>

                            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">

                                <button

                                    type="button"

                                    onClick={() => setRequestTab('recent')}

                                    className={cn(

                                        'rounded-xl px-4 py-2 text-sm font-medium transition',

                                        requestTab === 'recent' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500',

                                    )}

                                >

                                    ล่าสุด

                                </button>

                                <button

                                    type="button"

                                    onClick={() => setRequestTab('pending')}

                                    className={cn(

                                        'rounded-xl px-4 py-2 text-sm font-medium transition',

                                        requestTab === 'pending' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500',

                                    )}

                                >

                                    รออนุมัติ

                                </button>

                            </div>

                        </div>



                        {requestItems.length === 0 ? (

                            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-400">

                                ยังไม่มีรายการในช่วงนี้

                            </div>

                        ) : (

                            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">

                                {requestItems.map((request) => (

                                    <MaintenanceRequestCard key={request.id} request={request} />

                                ))}

                            </div>

                        )}



                        <div className="flex flex-wrap gap-2 pt-2">

                            <Link href={route('maintenance.requests.index')}>

                                <Button variant="outline" className="rounded-xl">

                                    ดูรายการทั้งหมด

                                </Button>

                            </Link>

                            <Link href={route('maintenance.requests.my')}>

                                <Button variant="outline" className="rounded-xl">

                                    รายการของฉัน

                                </Button>

                            </Link>

                        </div>

                    </section>

                </div>

            </div>

        </AppLayout>

    );

}

