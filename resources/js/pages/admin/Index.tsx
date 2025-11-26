import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
  CheckSquare
} from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

export default function AdminHub() {
  const { t } = useTranslation();
  const modules = [
    {
      title: t('Meeting Room Booking'),
      description: 'Meeting Room Booking',
      icon: <Calendar className="h-8 w-8 text-blue-500" />,
      href: '/administration/rooms',
      color: 'bg-blue-50 hover:bg-blue-100',
      details: t('Book meeting rooms, check schedule and manage meetings'),
      subMenus: [
        { title: t('Room Schedule'), href: '/administration/rooms' },
        { title: t('Book Room'), href: '/administration/rooms/create' }, // Assuming create route exists or is modal
        { title: t('My Bookings'), href: '/administration/rooms?filter=my' },
      ]
    },
    {
      title: t('Maintenance Request'),
      description: 'Maintenance Request',
      icon: <Wrench className="h-8 w-8 text-orange-500" />,
      href: '/maintenance/dashboard',
      color: 'bg-orange-50 hover:bg-orange-100',
      details: t('Report maintenance, facilities and track status'),
      subMenus: [
        { title: 'Dashboard', href: '/maintenance/dashboard' },
        { title: t('New Request'), href: '/maintenance/requests/create' },
        { title: t('Request List'), href: '/maintenance/requests' },
        { title: t('My Requests'), href: '/maintenance/requests/my' },
      ]
    },
    {
      title: t('Vehicle Booking'),
      description: 'Vehicle Booking',
      icon: <Car className="h-8 w-8 text-green-500" />,
      href: '/vehicles/bookings',
      color: 'bg-green-50 hover:bg-green-100',
      details: t('Book vehicles, check schedule and manage fleet'),
      subMenus: [
        { title: t('Vehicle Schedule'), href: '/vehicles/calendar' },
        { title: t('Book Vehicle'), href: '/vehicles/bookings/create' },
        { title: t('Vehicle Bookings'), href: '/vehicles/bookings' },
      ]
    },
    {
      title: t('Document Management'),
      description: 'Document Management',
      icon: <FileText className="h-8 w-8 text-purple-500" />,
      href: '/documents/dashboard',
      color: 'bg-purple-50 hover:bg-purple-100',
      details: t('Manage inbound/outbound documents and registration'),
      subMenus: [
        { title: 'Dashboard', href: '/documents/dashboard' },
        { title: t('Inbound (Inbox)'), href: '/documents/inbox' },
        { title: t('Outbound (Sent)'), href: '/documents/sent' },
        { title: t('Receive Document'), href: '/documents/receive' },
        { title: t('Pending Approval'), href: '/documents?scope=approval' },
      ]
    }
  ];

  return (
    <AppLayout breadcrumbs={[{ title: t('Administrative Hub'), href: '/admin-hub' }]}>
      <Head title={t('Administrative Hub')} />

      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('Administrative Hub')}</h1>
          <p className="text-gray-500 mt-2">Administrative Hub</p>
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
      </div>
    </AppLayout>
  );
}
