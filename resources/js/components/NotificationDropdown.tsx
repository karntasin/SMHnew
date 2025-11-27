import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuHeader,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuFooter,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

interface Notification {
    id: string;
    data: {
        title: string;
        message: string;
        action_url?: string;
        type?: 'info' | 'success' | 'warning' | 'error';
    };
    created_at: string;
    read_at: string | null;
}

export default function NotificationDropdown() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = async () => {
        try {
            const response = await axios.get('/notifications');
            setNotifications(response.data.notifications);
            setUnreadCount(response.data.unread_count);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        
        // Optional: Poll every minute
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await axios.post(`/notifications/${id}/read`);
            setNotifications(notifications.map(n => 
                n.id === id ? { ...n, read_at: new Date().toISOString() } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            setLoading(true);
            await axios.post('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, read_at: new Date().toISOString() })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read', error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type?: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 md:w-96">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h3 className="font-semibold">การแจ้งเตือน</h3>
                    {unreadCount > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-auto px-2 text-xs text-muted-foreground hover:text-primary"
                            onClick={markAllAsRead}
                            disabled={loading}
                        >
                            <CheckCheck className="mr-1 h-3 w-3" />
                            อ่านทั้งหมด
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[400px]">
                    {notifications.length > 0 ? (
                        <div className="flex flex-col">
                            {notifications.map((notification) => (
                                <div 
                                    key={notification.id} 
                                    className={cn(
                                        "flex gap-3 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors relative group",
                                        !notification.read_at && "bg-blue-50/50 dark:bg-blue-900/10"
                                    )}
                                >
                                    <div className="mt-1 flex-shrink-0">
                                        {getIcon(notification.data.type)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={cn("text-sm font-medium leading-none", !notification.read_at && "text-primary")}>
                                                {notification.data.title}
                                            </p>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                {notification.created_at}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {notification.data.message}
                                        </p>
                                        {notification.data.action_url && (
                                            <Link 
                                                href={notification.data.action_url} 
                                                className="text-xs text-primary hover:underline inline-block mt-1"
                                                onClick={() => !notification.read_at && markAsRead(notification.id)}
                                            >
                                                ดูรายละเอียด
                                            </Link>
                                        )}
                                    </div>
                                    {!notification.read_at && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                markAsRead(notification.id);
                                            }}
                                            title="Mark as read"
                                        >
                                            <Check className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">ไม่มีการแจ้งเตือน</p>
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
