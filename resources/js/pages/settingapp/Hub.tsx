import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
  Users, 
  UserCog, 
  Key, 
  Menu, 
  Briefcase, 
  Building2,
  Cog,
  Database,
  History,
  HardDrive,
  FolderOpen,
  Settings,
  ChevronRight,
  Shield
} from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export default function SettingsHub() {
  const { t } = useTranslation();

  const systems = [
    {
      title: 'จัดการผู้ใช้งาน',
      description: 'จัดการบัญชีผู้ใช้ สิทธิ์การเข้าถึง และการควบคุมการเข้าถึง',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      gradient: 'from-blue-500 to-cyan-500',
      href: '/users',
      links: [
        { label: 'ผู้ใช้ทั้งหมด', href: '/users' },
        { label: 'สร้างผู้ใช้ใหม่', href: '/users/create' },
        { label: 'กำหนดบทบาทหลายคน', href: '/users/bulk-roles' },
      ]
    },
    {
      title: 'บทบาทและสิทธิ์',
      description: 'กำหนดค่าบทบาท สิทธิ์ และระดับการเข้าถึง',
      icon: Shield,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      gradient: 'from-purple-500 to-violet-500',
      href: '/roles',
      links: [
        { label: 'จัดการบทบาท', href: '/roles' },
        { label: 'จัดการสิทธิ์', href: '/permissions' },
        { label: 'สร้างบทบาทใหม่', href: '/roles/create' },
      ]
    },
    {
      title: 'จัดการเมนู',
      description: 'กำหนดค่าเมนูนำทางและการจัดเรียง',
      icon: Menu,
      color: 'text-green-600',
      bg: 'bg-green-100',
      gradient: 'from-green-500 to-emerald-500',
      href: '/menus',
      links: [
        { label: 'เมนูทั้งหมด', href: '/menus' },
        { label: 'สร้างเมนูใหม่', href: '/menus/create' },
      ]
    },
    {
      title: 'ตั้งค่าองค์กร',
      description: 'จัดการตำแหน่ง ทีม และแผนก',
      icon: Building2,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      gradient: 'from-orange-500 to-amber-500',
      href: '/settings/positions',
      links: [
        { label: 'ตำแหน่ง', href: '/settings/positions' },
        { label: 'ทีม HA', href: '/settings/teamha' },
        { label: 'แผนก', href: '/settings/departments' },
      ]
    },
    {
      title: 'ตั้งค่าแอปพลิเคชัน',
      description: 'กำหนดค่าชื่อแอป โลโก้ สี และ SEO',
      icon: Cog,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
      gradient: 'from-slate-500 to-gray-500',
      href: '/settingsapp',
      links: [
        { label: 'ตั้งค่าทั่วไป', href: '/settingsapp' },
        { label: 'ตั้งค่าฐานข้อมูล', href: '/settingsapp/database' },
      ]
    },
    {
      title: 'บันทึกระบบ',
      description: 'ดูบันทึกการตรวจสอบและประวัติกิจกรรมระบบ',
      icon: History,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
      gradient: 'from-indigo-500 to-blue-500',
      href: '/audit-logs',
      links: [
        { label: 'บันทึกการตรวจสอบ', href: '/audit-logs' },
      ]
    },
    {
      title: 'สำรองและกู้คืน',
      description: 'จัดการการสำรองข้อมูลและการกู้คืน',
      icon: HardDrive,
      color: 'text-rose-600',
      bg: 'bg-rose-100',
      gradient: 'from-rose-500 to-red-500',
      href: '/backup',
      links: [
        { label: 'จัดการสำรองข้อมูล', href: '/backup' },
      ]
    },
    {
      title: 'จัดการไฟล์',
      description: 'จัดการไฟล์และเอกสารที่อัปโหลด',
      icon: FolderOpen,
      color: 'text-teal-600',
      bg: 'bg-teal-100',
      gradient: 'from-teal-500 to-emerald-500',
      href: '/files',
      links: [
        { label: 'ไฟล์ของฉัน', href: '/files' },
      ]
    }
  ];

  return (
    <AppLayout breadcrumbs={[{ title: 'ศูนย์ตั้งค่า', href: '/settings-hub' }]}>
      <Head title="ศูนย์ตั้งค่า" />

      <div className="min-h-screen bg-slate-50/50">
        {/* Hero Section */}
        <div className="relative bg-white border-b border-slate-100 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-gray-50/30 to-zinc-50 opacity-60" />
          <div className="absolute inset-0 bg-grid-slate-100/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
          
          <div className="relative max-w-7xl mx-auto px-6 py-10 sm:py-12">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium mb-6 shadow-sm">
                <Settings className="w-4 h-4 text-slate-500" />
                <span className="bg-gradient-to-r from-slate-600 to-gray-600 bg-clip-text text-transparent">
                  การกำหนดค่าระบบ
                </span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-4">
                ศูนย์ตั้งค่า
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed">
                จัดการผู้ใช้ บทบาท สิทธิ์ และการกำหนดค่าระบบจากศูนย์กลางแห่งเดียว
              </p>
            </div>
          </div>
        </div>

        {/* Systems Grid */}
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {systems.map((system, idx) => (
              <div 
                key={idx}
                className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-6">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300", system.bg)}>
                    <system.icon className={cn("w-7 h-7", system.color)} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-slate-700 transition-colors">
                    {system.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2">
                    {system.description}
                  </p>
                </div>

                {/* Links Section */}
                <div className="mt-auto bg-slate-50/50 p-4 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
                    ลิงก์ด่วน
                  </div>
                  <div className="space-y-1">
                    {system.links.map((link, i) => (
                      <Link 
                        key={i} 
                        href={link.href}
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white hover:shadow-sm transition-all group/link"
                      >
                        <span>{link.label}</span>
                        <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all text-slate-400" />
                      </Link>
                    ))}
                  </div>
                </div>
                
                {/* Top Gradient Line */}
                <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", system.gradient)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
