import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { 
  FileText, 
  BarChart2, 
  ClipboardCheck, 
  Stethoscope, 
  ShieldAlert, 
  GraduationCap, 
  AlertTriangle,
  BookOpen,
  Activity,
  Search,
  Leaf,
  Users,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';

export default function QualityHub() {
  const { t } = useTranslation();
  const modules = [
    {
      title: t('Quality Document Repository'),
      description: 'Quality Document Repository',
      icon: <BookOpen className="h-8 w-8 text-blue-500" />,
      href: '/quality-docs',
      color: 'bg-blue-50 hover:bg-blue-100',
      details: t('Manage WI, Procedure, Policy and regulations'),
      subMenus: [
        { title: t('Search Documents'), href: '/quality-docs' },
        { title: t('Create New Document'), href: '/quality-docs/create' },
      ]
    },
    {
      title: t('Quality Indicators (KPIs)'),
      description: 'Quality Indicators (KPIs)',
      icon: <BarChart2 className="h-8 w-8 text-green-500" />,
      href: '/quality-indicators',
      color: 'bg-green-50 hover:bg-green-100',
      details: t('Track and report hospital quality indicators'),
      subMenus: [
        { title: t('Organization Level'), href: '/quality-indicators?type=organization' },
        { title: t('Department Level'), href: '/quality-indicators?type=department' },
        { title: t('Team Level'), href: '/quality-indicators?type=ha_team' },
      ]
    },
    {
      title: t('Quality Assurance (QA)'),
      description: 'Quality Assurance (QA)',
      icon: <ClipboardCheck className="h-8 w-8 text-purple-500" />,
      href: '/quality-assurance',
      color: 'bg-purple-50 hover:bg-purple-100',
      details: t('Record Review, Audit and Improvement'),
      subMenus: [
        { title: t('Review'), href: '/quality-assurance' },
        { title: t('Audit'), href: '/quality-assurance' }, // Assuming tabs
        { title: t('Improvement'), href: '/quality-assurance' }, // Assuming tabs
      ]
    },
    {
      title: t('Medical Record Accuracy (MRA)'),
      description: 'Medical Record Accuracy (MRA)',
      icon: <Search className="h-8 w-8 text-indigo-500" />,
      href: '/mra',
      color: 'bg-indigo-50 hover:bg-indigo-100',
      details: t('Verify completeness and accuracy of medical records'),
      subMenus: [
        { title: 'Dashboard', href: '/mra/dashboard' },
        { title: t('Search Patient'), href: '/mra/search-patient' },
        { title: t('Checklist'), href: '/mra' },
      ]
    },
    {
      title: t('Infection Control (IC)'),
      description: 'Infection Control (IC)',
      icon: <ShieldAlert className="h-8 w-8 text-red-500" />,
      href: '/ic',
      color: 'bg-red-50 hover:bg-red-100',
      details: t('Monitor hospital infections and report incidents'),
      subMenus: [
        { title: 'Dashboard', href: '/ic' },
        { title: t('Surveillance'), href: '/ic/surveillance' },
        { title: t('Incident Report'), href: '/ic/incidents' },
      ]
    },
    {
      title: t('Environment & Safety (ENV)'),
      description: 'Environment & Safety (ENV)',
      icon: <Leaf className="h-8 w-8 text-emerald-600" />,
      href: '/env',
      color: 'bg-emerald-50 hover:bg-emerald-100',
      details: t('Manage utilities, medical equipment and building safety'),
      subMenus: [
        { title: 'Dashboard', href: '/env' },
        { title: t('Manage Assets'), href: '/env/assets' },
        { title: t('Maintenance Plan (PM)'), href: '/env/pm' },
        { title: t('Incident Report'), href: '/env/incidents' },
        { title: t('System Check'), href: '/env/utility' },
      ]
    },
    {
      title: t('Human Resource Development (HRD)'),
      description: 'Human Resource Development (HRD)',
      icon: <Users className="h-8 w-8 text-pink-500" />,
      href: '/km/learn/dashboard',
      color: 'bg-pink-50 hover:bg-pink-100',
      details: t('Training plan, training hours and competency'),
      subMenus: [
        { title: 'Dashboard', href: '/km/learn/dashboard' },
        { title: t('Training Courses'), href: '/km/learn/courses' },
        { title: t('My Training'), href: '/km/learn/my-training' },
        { title: t('My Skills'), href: '/km/learn/my-skills' },
      ]
    },
    {
      title: t('Knowledge Management (KM)'),
      description: 'Knowledge Management (KM)',
      icon: <GraduationCap className="h-8 w-8 text-teal-500" />,
      href: '/km',
      color: 'bg-teal-50 hover:bg-teal-100',
      details: t('Knowledge repository, lessons and learning materials'),
      subMenus: [
        { title: 'Dashboard', href: '/km/dashboard' },
        { title: t('Knowledge Assets'), href: '/km/assets' },
      ]
    }
  ];

  return (
    <AppLayout breadcrumbs={[{ title: t('Quality Hub'), href: '/quality' }]}>
      <Head title={t('Quality Hub')} />

      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('Quality Hub')}</h1>
          <p className="text-gray-500 mt-2">Quality Management System Hub</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => (
            <Card key={index} className={`flex flex-col h-full transition-all duration-200 border-2 border-transparent hover:border-primary/20 ${module.color}`}>
              <Link href={module.href} className="block">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold text-gray-800">
                      {module.title}
                    </CardTitle>
                    <CardDescription className="font-medium text-gray-600">
                      {module.description}
                    </CardDescription>
                  </div>
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    {module.icon}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mt-2">
                    {module.details}
                  </p>
                </CardContent>
              </Link>
              
              <CardFooter className="mt-auto pt-0 px-6 pb-6">
                <div className="w-full pt-4 border-t border-gray-200/60">
                  <div className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                    {t('Quick Links')}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {module.subMenus.map((sub, subIndex) => (
                      <Link 
                        key={subIndex} 
                        href={sub.href}
                        className="group flex items-center justify-between text-sm text-gray-700 hover:text-primary bg-white/60 hover:bg-white border border-transparent hover:border-primary/20 px-3 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <span className="font-medium">{sub.title}</span>
                        <ChevronRight className="h-4 w-4 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </Link>
                    ))}
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {t('Overview')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-sm text-gray-500">เอกสารคุณภาพทั้งหมด</div>
              <div className="text-2xl font-bold mt-1">--</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-sm text-gray-500">ตัวชี้วัดที่ผ่านเกณฑ์</div>
              <div className="text-2xl font-bold mt-1 text-green-600">--%</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-sm text-gray-500">อุบัติการณ์เดือนนี้</div>
              <div className="text-2xl font-bold mt-1 text-orange-600">--</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-sm text-gray-500">การทบทวนที่รอดำเนินการ</div>
              <div className="text-2xl font-bold mt-1 text-blue-600">--</div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">
            * ข้อมูลภาพรวมอยู่ระหว่างการเชื่อมต่อระบบ
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
