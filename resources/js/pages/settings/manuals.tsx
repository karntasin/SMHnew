import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import {
    BookOpen,
    CheckCircle2,
    Download,
    FileDown,
    FileText,
    HelpCircle,
    Info,
    KeyRound,
    Layers,
    ListOrdered,
    MessageCircle,
    QrCode,
    Shield,
    Sparkles,
    UserCheck,
    UserCog,
    Users,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'ตั้งค่าโปรไฟล์',
        href: '/settings/profile',
    },
    {
        title: 'คู่มือการใช้งาน',
        href: '/settings/manuals',
    },
];

interface ManualItem {
    id: string;
    title: string;
    subtitle: string;
    downloadUrl: string;
    badge: string;
    updatedAt: string;
    stepsCount: number;
    topics: string[];
}

export default function Manuals({ manuals }: { manuals: ManualItem[] }) {
    const [activeTab, setActiveTab] = useState<'registration' | 'profile'>('registration');

    const regManual = manuals.find((m) => m.id === 'registration') || manuals[0];
    const profManual = manuals.find((m) => m.id === 'profile') || manuals[1];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="คู่มือการใช้งานระบบ" />

            <SettingsLayout>
                <div className="space-y-6">
                    <div>
                        <HeadingSmall
                            title="คู่มือการใช้งานระบบสารสนเทศ"
                            description="ดาวน์โหลดคู่มือการสมัครสมาชิกและการตั้งค่าโปรไฟล์สำหรับบุคลากร รพ.ค่ายสุรสิงหนาท"
                        />
                    </div>

                    {/* Download Cards Overview */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        {/* Registration Card */}
                        <div
                            className={cn(
                                'relative flex flex-col justify-between rounded-2xl border p-5 shadow-2xs transition',
                                activeTab === 'registration'
                                    ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-400'
                                    : 'border-slate-200 bg-white hover:border-slate-300',
                            )}
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                        <QrCode className="h-3 w-3" />
                                        ผู้ใช้งานใหม่ / บุคลากร
                                    </span>
                                    <span className="text-[11px] text-slate-400">PDF A4</span>
                                </div>
                                <h3 className="mt-3 text-base font-bold text-slate-900">
                                    คู่มือการสมัครสมาชิก
                                </h3>
                                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                    ขั้นตอนสมัครด้วย LINE, ค้นหาประวัติบุคลากร (Staff Roster) ด้วยเลขบัตรประชาชน และเลือกสังกัดแผนก/ทีม
                                </p>
                            </div>

                            <div className="mt-5 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                                <Button
                                    asChild
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                                >
                                    <a href={regManual.downloadUrl} download>
                                        <FileDown className="mr-1.5 h-4 w-4" />
                                        ดาวน์โหลด PDF
                                    </a>
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setActiveTab('registration')}
                                    className="rounded-xl"
                                >
                                    <BookOpen className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                                    อ่านบนเว็บ
                                </Button>
                            </div>
                        </div>

                        {/* Profile Settings Card */}
                        <div
                            className={cn(
                                'relative flex flex-col justify-between rounded-2xl border p-5 shadow-2xs transition',
                                activeTab === 'profile'
                                    ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-400'
                                    : 'border-slate-200 bg-white hover:border-slate-300',
                            )}
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                                        <UserCog className="h-3 w-3" />
                                        ผู้ใช้งานทุกคน
                                    </span>
                                    <span className="text-[11px] text-slate-400">PDF A4</span>
                                </div>
                                <h3 className="mt-3 text-base font-bold text-slate-900">
                                    คู่มือการตั้งค่าโปรไฟล์
                                </h3>
                                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                    การจัดการข้อมูลส่วนตัว, รูปโปรไฟล์ (Avatar), ตั้งค่าแผนกหลัก, ทีมนำ HA, บัญชี LINE และรหัสผ่าน
                                </p>
                            </div>

                            <div className="mt-5 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                                <Button
                                    asChild
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                                >
                                    <a href={profManual.downloadUrl} download>
                                        <FileDown className="mr-1.5 h-4 w-4" />
                                        ดาวน์โหลด PDF
                                    </a>
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setActiveTab('profile')}
                                    className="rounded-xl"
                                >
                                    <BookOpen className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                                    อ่านบนเว็บ
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Tab Content Reader */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                        {/* Tab Switcher */}
                        <div className="flex border-b border-slate-200 pb-3">
                            <button
                                type="button"
                                onClick={() => setActiveTab('registration')}
                                className={cn(
                                    'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition cursor-pointer',
                                    activeTab === 'registration'
                                        ? 'border-emerald-600 text-emerald-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-800',
                                )}
                            >
                                <QrCode className="h-4 w-4" />
                                1. คู่มือการสมัครสมาชิก
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('profile')}
                                className={cn(
                                    'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition cursor-pointer',
                                    activeTab === 'profile'
                                        ? 'border-blue-600 text-blue-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-800',
                                )}
                            >
                                <UserCog className="h-4 w-4" />
                                2. คู่มือการตั้งค่าโปรไฟล์
                            </button>
                        </div>

                        {/* Registration Manual Tab */}
                        {activeTab === 'registration' && (
                            <div className="mt-5 space-y-6">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-emerald-50/70 p-4 border border-emerald-100">
                                    <div>
                                        <h4 className="font-bold text-emerald-950 text-sm">
                                            คู่มือการสมัครสมาชิกและเข้าใช้งานระบบ (ฉบับสมบูรณ์)
                                        </h4>
                                        <p className="text-xs text-emerald-800 mt-0.5">
                                            เอกสารรหัส SMH-MAN-REG · เวอร์ชัน 2.0 (ล่าสุด)
                                        </p>
                                    </div>
                                    <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                                        <a href={regManual.downloadUrl} download>
                                            <Download className="mr-1.5 h-3.5 w-3.5" />
                                            ดาวน์โหลด PDF ฉบับพิมพ์
                                        </a>
                                    </Button>
                                </div>

                                {/* Step 1-4 Details */}
                                <div className="space-y-4">
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        ขั้นตอนการสมัครสมาชิก (4 ขั้นตอน)
                                    </h5>

                                    <div className="grid gap-3">
                                        {[
                                            {
                                                step: 1,
                                                title: 'เข้าสู่หน้าสมัครสมาชิก (/register)',
                                                desc: 'เปิดเบราว์เซอร์บนคอมพิวเตอร์หรือโทรศัพท์ แล้วไปที่หน้าสมัครสมาชิกของโรงพยาบาล',
                                                icon: QrCode,
                                            },
                                            {
                                                step: 2,
                                                title: 'ยืนยันตัวตนด้วย LINE Login',
                                                desc: 'สแกน QR Code ด้วย LINE บนโทรศัพท์ หรือกดปุ่ม "เปิด LINE บนเครื่องนี้" แล้วกดยินยอม (Allow) ให้เชื่อมต่อข้อมูล',
                                                icon: MessageCircle,
                                            },
                                            {
                                                step: 3,
                                                title: 'กรอกข้อมูลบุคลากร (Staff Roster Lookup)',
                                                desc: 'ระบุเลขบัตรประชาชน 13 หลัก ระบบจะดึงชื่อ-ตำแหน่งอัตโนมัติ จากนั้นเลือกแผนกที่สังกัด และทีมนำ HA',
                                                icon: UserCheck,
                                            },
                                            {
                                                step: 4,
                                                title: 'เพิ่มเพื่อน LINE และยืนยันการสมัคร',
                                                desc: 'เพิ่มเพื่อน LINE Official Account เพื่อรับการแจ้งเตือนงาน และกดยืนยันบันทึกข้อมูลเพื่อเข้าใช้งานระบบทันที',
                                                icon: Sparkles,
                                            },
                                        ].map((item) => (
                                            <div
                                                key={item.step}
                                                className="flex items-start gap-3.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5"
                                            >
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow-2xs">
                                                    {item.step}
                                                </span>
                                                <div>
                                                    <h6 className="text-xs font-bold text-slate-900">{item.title}</h6>
                                                    <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                                                        {item.desc}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Checklist Before Registration */}
                                <div className="rounded-xl border border-slate-200 p-4">
                                    <h5 className="flex items-center gap-2 text-xs font-bold text-slate-800">
                                        <Info className="h-4 w-4 text-emerald-600" />
                                        สิ่งที่ต้องเตรียมก่อนสมัคร
                                    </h5>
                                    <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
                                        <li>• สมาร์ทโฟนที่ติดตั้งแอปพลิเคชัน LINE ที่ใช้งานเป็นประจำ</li>
                                        <li>• เลขประจำตัวประชาชน 13 หลักของท่าน</li>
                                        <li>• ทราบสังกัดแผนก/ฝ่าย และทีมนำ HA ที่ท่านร่วมปฏิบัติงาน</li>
                                        <li>• อีเมลที่ใช้งานได้จริงเพื่อใช้เป็นช่องทางสำรอง</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Profile Settings Manual Tab */}
                        {activeTab === 'profile' && (
                            <div className="mt-5 space-y-6">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-blue-50/70 p-4 border border-blue-100">
                                    <div>
                                        <h4 className="font-bold text-blue-950 text-sm">
                                            คู่มือการตั้งค่าโปรไฟล์และบัญชีผู้ใช้งาน (ฉบับสมบูรณ์)
                                        </h4>
                                        <p className="text-xs text-blue-800 mt-0.5">
                                            เอกสารรหัส SMH-MAN-PRF · เวอร์ชัน 2.0 (ล่าสุด)
                                        </p>
                                    </div>
                                    <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                                        <a href={profManual.downloadUrl} download>
                                            <Download className="mr-1.5 h-3.5 w-3.5" />
                                            ดาวน์โหลด PDF ฉบับพิมพ์
                                        </a>
                                    </Button>
                                </div>

                                {/* Sections in Profile Settings */}
                                <div className="space-y-4">
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        หัวข้อการตั้งค่าสำคัญในหน้าโปรไฟล์
                                    </h5>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                                            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                                                <UserCog className="h-4 w-4 text-blue-600" />
                                                1. ข้อมูลส่วนตัว & รูปโปรไฟล์
                                            </div>
                                            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                                แก้ไขชื่อภาษาไทย, อีเมล, ชื่อแสดงในแชท (Chat Display Name) และอัปโหลดรูป Avatar ใหม่
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                                            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                                                <Layers className="h-4 w-4 text-blue-600" />
                                                2. จัดการแผนก & แผนกหลัก
                                            </div>
                                            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                                เลือกแผนกที่สังกัดได้มากกว่า 1 แผนก พร้อมกำหนดแผนกหลัก (Primary Department)
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                                            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                                                <Users className="h-4 w-4 text-blue-600" />
                                                3. ทีมนำทางคลินิก (HA Team)
                                            </div>
                                            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                                เลือกทีมนำทางคลินิก เช่น PCT, IC, PTC, ENV, RM, IM, HRD เพื่อดูตัวชี้วัดของทีม
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                                            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                                                <KeyRound className="h-4 w-4 text-blue-600" />
                                                4. LINE Account & รหัสผ่าน
                                            </div>
                                            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                                ตรวจสอบสถานะหรือยกเลิกเชื่อมต่อ LINE (Unlink) และตั้งรหัสผ่านความปลอดภัยใหม่
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* PDPA Notice */}
                                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                                    <h5 className="flex items-center gap-2 text-xs font-bold text-amber-900">
                                        <Shield className="h-4 w-4 text-amber-700" />
                                        การรักษาความปลอดภัยและสิทธิ์การเข้าถึง (PDPA)
                                    </h5>
                                    <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                                        ห้ามเปิดเผยหรือใช้งานบัญชีร่วมกัน เนื่องจากระบบมีการบันทึก Audit Log ทุกกิจกรรมการเข้าถึงข้อมูลเวชระเบียนและข้อมูลผู้ป่วยตามมาตรฐานความปลอดภัยโรงพยาบาล
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
