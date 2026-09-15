import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
  Calendar, 
  Wrench, 
  Car, 
  FileText, 
  Settings,
  ChevronRight,
  LayoutDashboard,
  PlusCircle,
  List,
  Inbox,
  Send,
  CheckSquare,
  Building2,
  Stethoscope,
  ClipboardList
} from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export default function AdminHub() {
  const { t } = useTranslation();

  const systems = [
    {
      title: t('Meeting Room Booking'),
      description: t('Book meeting rooms, check schedule and manage meetings'),
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      gradient: 'from-blue-500 to-cyan-500',
      href: '/administration/rooms',
      links: [
        { label: t('Room Schedule'), href: '/administration/rooms' },
        { label: t('Book Room'), href: '/administration/rooms?action=create' },
        { label: t('My Bookings'), href: '/administration/rooms/my' },
        { label: t('Calendar'), href: '/administration/rooms/calendar' },
        { label: 'ตั้งค่าห้อง', href: '/administration/rooms/settings' },
      ]
    },
    {
      title: t('Maintenance Request'),
      description: t('Report maintenance, facilities and track status'),
      icon: Wrench,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      gradient: 'from-orange-500 to-amber-500',
      href: '/maintenance/dashboard',
      links: [
        { label: 'Dashboard', href: '/maintenance/dashboard' },
        { label: t('New Request'), href: '/maintenance/requests/create' },
        { label: t('Request List'), href: '/maintenance/requests' },
        { label: t('My Requests'), href: '/maintenance/requests/my' },
        { label: t('Settings'), href: '/maintenance/settings' },
      ]
    },
    {
      title: t('Vehicle Booking'),
      description: t('Book vehicles, check schedule and manage fleet'),
      icon: Car,
      color: 'text-green-600',
      bg: 'bg-green-100',
      gradient: 'from-green-500 to-emerald-500',
      href: '/vehicles',
      links: [
        { label: 'เลือกรถ', href: '/vehicles' },
        { label: t('Book Vehicle'), href: '/vehicles/bookings/create' },
        { label: t('Vehicle Bookings'), href: '/vehicles/bookings' },
        { label: t('Vehicle Schedule'), href: '/vehicles/calendar' },
        { label: t('Manage Vehicles'), href: '/vehicles/settings' },
      ]
    },
    {
      title: t('Document Management'),
      description: t('Manage inbound/outbound documents and registration'),
      icon: FileText,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      gradient: 'from-purple-500 to-violet-500',
      href: route('documents.dashboard'),
      links: [
        { label: t('แดชบอร์ดหนังสือ'), href: route('documents.dashboard') },
        { label: t('รายการหนังสือ'), href: route('documents.index') },
        { label: t('ลงทะเบียนรับหนังสือ'), href: route('documents.create') },
        { label: t('ระหว่างนำเรียน'), href: route('documents.pendingReview') },
        { label: t('กล่องงานผู้อำนวยการ'), href: route('documents.director.index') },
      ]
    },
    {
      title: t('Medical Equipment Borrowing'),
      description: t('Borrow medical equipment, track stock and return status'),
      icon: Stethoscope,
      color: 'text-teal-600',
      bg: 'bg-teal-100',
      gradient: 'from-teal-500 to-cyan-500',
      href: route('equipment-borrowing.dashboard'),
      links: [
        { label: t('Equipment Borrowing Dashboard'), href: route('equipment-borrowing.dashboard') },
        { label: t('Request Equipment'), href: route('equipment-borrowing.borrowings.create') },
        { label: t('My Borrowings'), href: route('equipment-borrowing.borrowings.my') },
        { label: t('Manage Equipment'), href: route('equipment-borrowing.equipment.index') },
        { label: t('Equipment Settings'), href: route('equipment-borrowing.settings.index') },
      ]
    },
    {
      title: 'ระบบบันทึกการลา',
      description: 'ยื่นใบลา ตรวจสอบสถานะ อนุมัติใบลา ตามระเบียบ ทบ. พ.ศ. ๒๕๕๖',
      icon: ClipboardList,
      color: 'text-rose-600',
      bg: 'bg-rose-100',
      gradient: 'from-rose-500 to-pink-500',
      href: route('leave.index'),
      links: [
        { label: 'ภาพรวมการลา', href: route('leave.index') },
        { label: 'ยื่นใบลา', href: route('leave.create') },
        { label: 'รออนุมัติ', href: route('leave.index', { tab: 'pending' }) },
      ]
    }
  ];

  return (
    <AppLayout breadcrumbs={[{ title: t('Administrative Hub'), href: '/admin-hub' }]}>
      <Head title={t('Administrative Hub')} />

      <div className="min-h-screen bg-slate-50/50">
        {/* Hero Section */}
        <div className="relative bg-white border-b border-slate-100 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-amber-50/30 to-yellow-50 opacity-60" />
          <div className="absolute inset-0 bg-grid-slate-100/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
          
          <div className="relative max-w-7xl mx-auto px-6 py-10 sm:py-12">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-orange-100 text-orange-600 text-sm font-medium mb-6 shadow-sm">
                <Building2 className="w-4 h-4 text-orange-500" />
                <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Administrative Services
                </span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-4">
                {t('Administrative Center')}
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed">
                {t('Centralized management for hospital administration, facilities, vehicles, and document flow.')}
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
                className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-orange-100 transition-all duration-300 overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-6">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300", system.bg)}>
                    <system.icon className={cn("w-7 h-7", system.color)} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-orange-700 transition-colors">
                    {system.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2">
                    {system.description}
                  </p>
                </div>

                {/* Links Section */}
                <div className="mt-auto bg-slate-50/50 p-4 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
                    {t('Quick Actions')}
                  </div>
                  <div className="space-y-1">
                    {system.links.map((link, i) => (
                      <Link 
                        key={i} 
                        href={link.href}
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-white hover:shadow-sm transition-all group/link"
                      >
                        <span>{link.label}</span>
                        <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all text-orange-400" />
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
