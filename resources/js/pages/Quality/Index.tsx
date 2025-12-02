import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
  FileText, 
  BarChart2, 
  ClipboardCheck, 
  ShieldAlert, 
  GraduationCap, 
  BookOpen,
  Activity,
  Search,
  Leaf,
  Users,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export default function QualityHub() {
  const { t } = useTranslation();

  const systems = [
    {
      title: t('Quality Document Repository'),
      description: t('Manage WI, Procedure, Policy and regulations'),
      icon: BookOpen,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      gradient: 'from-blue-500 to-cyan-500',
      href: '/quality-docs',
      links: [
        { label: t('Search Documents'), href: '/quality-docs' },
        { label: t('Create New Document'), href: '/quality-docs/create' },
      ]
    },
    {
      title: t('Quality Indicators (KPIs)'),
      description: t('Track and report hospital quality indicators'),
      icon: BarChart2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
      gradient: 'from-emerald-500 to-green-500',
      href: '/quality-indicators',
      links: [
        { label: t('Organization Level'), href: '/quality-indicators?type=organization' },
        { label: t('Department Level'), href: '/quality-indicators?type=department' },
        { label: t('Team Level'), href: '/quality-indicators?type=ha_team' },
      ]
    },
    {
      title: t('Quality Assurance (QA)'),
      description: t('Record Review, Audit and Improvement'),
      icon: ClipboardCheck,
      color: 'text-violet-600',
      bg: 'bg-violet-100',
      gradient: 'from-violet-500 to-purple-500',
      href: '/quality-assurance',
      links: [
        { label: t('Review'), href: '/quality-assurance' },
        { label: t('Audit'), href: '/quality-assurance' },
        { label: t('Improvement'), href: '/quality-assurance' },
      ]
    },
    {
      title: t('Medical Record Accuracy (MRA)'),
      description: t('Verify completeness and accuracy of medical records'),
      icon: Search,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
      gradient: 'from-indigo-500 to-blue-600',
      href: '/mra',
      links: [
        { label: 'Dashboard', href: '/mra/dashboard' },
        { label: t('New Audit'), href: '/mra/create' },
        { label: t('Checklist'), href: '/mra' },
      ]
    },
    {
      title: t('Infection Control (IC)'),
      description: t('Monitor hospital infections and report incidents'),
      icon: ShieldAlert,
      color: 'text-rose-600',
      bg: 'bg-rose-100',
      gradient: 'from-rose-500 to-red-500',
      href: '/ic',
      links: [
        { label: 'Dashboard', href: '/ic' },
        { label: t('Surveillance'), href: '/ic/surveillance' },
        { label: t('Incident Report'), href: '/ic/incidents' },
      ]
    },
    {
      title: t('Environment & Safety (ENV)'),
      description: t('Manage utilities, medical equipment and building safety'),
      icon: Leaf,
      color: 'text-teal-600',
      bg: 'bg-teal-100',
      gradient: 'from-teal-500 to-emerald-500',
      href: '/env',
      links: [
        { label: 'Dashboard', href: '/env' },
        { label: t('Manage Assets'), href: '/env/assets' },
        { label: t('Maintenance Plan (PM)'), href: '/env/pm' },
        { label: t('Incident Report'), href: '/env/incidents' },
        { label: t('System Check'), href: '/env/utility' },
      ]
    },
    {
      title: t('Human Resource Development (HRD)'),
      description: t('Training plan, training hours and competency'),
      icon: Users,
      color: 'text-pink-600',
      bg: 'bg-pink-100',
      gradient: 'from-pink-500 to-rose-500',
      href: '/km/learn/dashboard',
      links: [
        { label: 'Dashboard', href: '/km/learn/dashboard' },
        { label: t('Training Courses'), href: '/km/learn/courses' },
        { label: t('My Training'), href: '/km/learn/my-training' },
        { label: t('My Skills'), href: '/km/learn/my-skills' },
      ]
    },
    {
      title: t('Knowledge Management (KM)'),
      description: t('Knowledge repository, lessons and learning materials'),
      icon: GraduationCap,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      gradient: 'from-amber-500 to-orange-500',
      href: '/km',
      links: [
        { label: 'Dashboard', href: '/km/dashboard' },
        { label: t('Knowledge Assets'), href: '/km/assets' },
        { label: t('E-Learning Dashboard'), href: '/km/learn/dashboard' },
        { label: t('All Courses'), href: '/km/learn' },
        { label: t('Create Course'), href: '/km/learn/courses/create' },
      ]
    }
  ];

  return (
    <AppLayout breadcrumbs={[{ title: t('Quality Hub'), href: '/quality' }]}>
      <Head title={t('Quality Hub')} />

      <div className="min-h-screen bg-slate-50/50">
        {/* Hero Section */}
        <div className="relative bg-white border-b border-slate-100 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50 opacity-60" />
          <div className="absolute inset-0 bg-grid-slate-100/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
          
          <div className="relative max-w-7xl mx-auto px-6 py-10 sm:py-12">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-blue-100 text-blue-600 text-sm font-medium mb-6 shadow-sm">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {t('Quality Management System')}
                </span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-4">
                {t('Quality Center')}
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed">
                {t('Centralized hub for all hospital quality assurance systems, document control, and performance indicators.')}
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
                className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-6">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300", system.bg)}>
                    <system.icon className={cn("w-7 h-7", system.color)} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">
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
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-white hover:shadow-sm transition-all group/link"
                      >
                        <span>{link.label}</span>
                        <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all text-blue-400" />
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