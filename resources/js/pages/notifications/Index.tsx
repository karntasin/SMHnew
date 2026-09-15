import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { apiFetch } from '@/lib/asset';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Bell, 
    BellOff, 
    Check, 
    CheckCheck, 
    ExternalLink, 
    Wrench, 
    AlertTriangle,
    Info,
    Car,
    UserCheck,
    Stethoscope
} from 'lucide-react';

interface NotificationData {
    title: string;
    message: string;
    action_url?: string;
    action_text?: string;
    type?: string;
    ticket_number?: string;
    category?: string;
}

interface Notification {
    id: string;
    data: NotificationData;
    created_at: string;
    created_at_raw: string;
    read_at: string | null;
}

interface IndexProps {
    unreadNotifications?: Notification[];
    readNotifications?: Notification[];
    unreadCount?: number;
    readCount?: number;
}

export default function Index({ 
    unreadNotifications = [], 
    readNotifications = [], 
    unreadCount = 0, 
    readCount = 0 
}: IndexProps) {
    const [activeTab, setActiveTab] = useState('unread');

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await apiFetch(`/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                credentials: 'same-origin',
            });
            router.reload();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await apiFetch('/notifications/read-all', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                credentials: 'same-origin',
            });
            router.reload();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const handleViewDetails = (notification: Notification) => {
        if (!notification.read_at) {
            handleMarkAsRead(notification.id);
        }
        // Support both action_url and url for backward compatibility
        const url = notification.data.action_url || (notification.data as any).url;
        if (url) {
            router.visit(url);
        }
    };

    const getNotificationIcon = (type?: string) => {
        switch (type) {
            case 'maintenance':
                return <Wrench className="w-5 h-5 text-orange-500" />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'vehicle_driver':
                return <Car className="w-5 h-5 text-green-500" />;
            case 'vehicle_booking_status':
                return <Car className="w-5 h-5 text-blue-500" />;
            case 'equipment_borrowing':
                return <Stethoscope className="w-5 h-5 text-teal-500" />;
            default:
                return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const NotificationItem = ({ notification, isRead }: { notification: Notification; isRead: boolean }) => {
        const hasLink = notification.data.action_url || (notification.data as any).url;
        
        const handleClick = () => {
            if (hasLink) {
                handleViewDetails(notification);
            }
        };
        
        return (
            <div 
                className={`p-4 border rounded-lg transition-colors ${
                    isRead 
                        ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700' 
                        : 'bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-800 shadow-sm'
                } ${hasLink ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800' : ''}`}
                onClick={handleClick}
            >
                <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${
                        isRead 
                            ? 'bg-gray-100 dark:bg-gray-700' 
                            : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                        {getNotificationIcon(notification.data.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className={`font-semibold ${
                                isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'
                            } ${hasLink ? 'hover:underline' : ''}`}>
                                {notification.data.title}
                            </h3>
                            {!isRead && (
                                <Badge variant="default" className="bg-blue-500">ใหม่</Badge>
                            )}
                            {notification.data.ticket_number && (
                                <Badge variant="outline">{notification.data.ticket_number}</Badge>
                            )}
                        </div>
                        
                        <p className={`text-sm mb-2 whitespace-pre-line ${
                            isRead ? 'text-gray-500 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                            {notification.data.message}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                            <span>{notification.created_at}</span>
                            {notification.data.category && (
                                <Badge variant="secondary" className="text-xs">
                                    {notification.data.category}
                                </Badge>
                            )}
                            {isRead && notification.read_at && (
                                <span className="flex items-center gap-1">
                                    <CheckCheck className="w-3 h-3" />
                                    อ่านแล้ว {notification.read_at}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {!isRead && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(notification.id)}
                                title="ทำเครื่องหมายว่าอ่านแล้ว"
                            >
                                <Check className="w-4 h-4" />
                            </Button>
                        )}
                        {(notification.data.action_url || (notification.data as any).url) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(notification)}
                            >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                {notification.data.action_text || 'ดู'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const EmptyState = ({ isRead }: { isRead: boolean }) => (
        <div className="text-center py-12">
            {isRead ? (
                <BellOff className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            ) : (
                <Bell className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            )}
            <p className="text-gray-500 dark:text-gray-400">
                {isRead ? 'ไม่มีการแจ้งเตือนที่อ่านแล้ว' : 'ไม่มีการแจ้งเตือนใหม่'}
            </p>
        </div>
    );

    return (
        <AppLayout breadcrumbs={[{ title: 'การแจ้งเตือน', href: '#' }]}>
            <Head title="การแจ้งเตือน" />
            
            <div className="p-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            การแจ้งเตือน
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            จัดการและติดตามการแจ้งเตือนทั้งหมดของคุณ
                        </p>
                    </div>
                    
                    {unreadCount > 0 && (
                        <Button variant="outline" onClick={handleMarkAllAsRead}>
                            <CheckCheck className="w-4 h-4 mr-2" />
                            อ่านทั้งหมด ({unreadCount})
                        </Button>
                    )}
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="unread" className="flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            ยังไม่อ่าน
                            {unreadCount > 0 && (
                                <Badge variant="destructive" className="ml-1">
                                    {unreadCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="read" className="flex items-center gap-2">
                            <BellOff className="w-4 h-4" />
                            อ่านแล้ว
                            <Badge variant="secondary" className="ml-1">
                                {readCount}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="unread">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-blue-500" />
                                    การแจ้งเตือนที่ยังไม่ได้อ่าน
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {unreadNotifications.length === 0 ? (
                                    <EmptyState isRead={false} />
                                ) : (
                                    unreadNotifications.map((notification) => (
                                        <NotificationItem 
                                            key={notification.id} 
                                            notification={notification} 
                                            isRead={false}
                                        />
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="read">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <BellOff className="w-5 h-5 text-gray-500" />
                                    การแจ้งเตือนที่อ่านแล้ว
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {readNotifications.length === 0 ? (
                                    <EmptyState isRead={true} />
                                ) : (
                                    readNotifications.map((notification) => (
                                        <NotificationItem 
                                            key={notification.id} 
                                            notification={notification} 
                                            isRead={true}
                                        />
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
