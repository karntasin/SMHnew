import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Bell, Clock, Wrench, ExternalLink, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/asset';
import { router } from '@inertiajs/react';

interface UrgentNotification {
  id: string;
  data: {
    title: string;
    message: string;
    action_url: string;
    type: string;
    ticket_number?: string;
    category?: string;
    document_number?: string;
    action_type?: string;
  };
  created_at: string;
  created_at_raw: string;
  time_overdue: string;
  minutes_overdue: number;
}

interface UrgentNotificationPopupProps {
  checkInterval?: number; // milliseconds, default 60000 (1 minute)
}

export default function UrgentNotificationPopup({ 
  checkInterval = 60000 
}: UrgentNotificationPopupProps) {
  const [urgentNotifications, setUrgentNotifications] = useState<UrgentNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch urgent notifications
  const fetchUrgentNotifications = useCallback(async () => {
    try {
      const response = await apiFetch('/notifications/urgent', {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.urgent_notifications && data.urgent_notifications.length > 0) {
          setUrgentNotifications(data.urgent_notifications);
          setIsOpen(true);
        }
      }
    } catch (error) {
      console.error('Error fetching urgent notifications:', error);
    }
  }, []);

  // Check for urgent notifications periodically
  useEffect(() => {
    // Initial check
    fetchUrgentNotifications();

    // Set interval for checking
    const interval = setInterval(fetchUrgentNotifications, checkInterval);

    return () => clearInterval(interval);
  }, [fetchUrgentNotifications, checkInterval]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    if (!notificationId) return;
    
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

      // Remove from list
      setUrgentNotifications(prev => {
        const newList = prev.filter(n => n.id !== notificationId);
        // Close if no more notifications
        if (newList.length === 0) {
          setIsOpen(false);
        }
        // Adjust currentIndex if needed
        if (currentIndex >= newList.length && newList.length > 0) {
          setCurrentIndex(0);
        }
        return newList;
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Navigate to action URL
  const handleViewDetails = (notification: UrgentNotification) => {
    handleMarkAsRead(notification.id);
    if (notification.data.action_url) {
      router.visit(notification.data.action_url);
    }
  };

  // Navigate through multiple notifications
  const handleNext = () => {
    if (urgentNotifications.length > 0) {
      setCurrentIndex(prev => (prev + 1) % urgentNotifications.length);
    }
  };

  const handlePrev = () => {
    if (urgentNotifications.length > 0) {
      setCurrentIndex(prev => (prev - 1 + urgentNotifications.length) % urgentNotifications.length);
    }
  };

  // Early return if no notifications
  if (!isOpen || !urgentNotifications || urgentNotifications.length === 0) return null;

  const currentNotification = urgentNotifications[currentIndex];
  
  // Safety check for currentNotification
  if (!currentNotification) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      >
        {/* Backdrop with pulsing effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />

        {/* Alert Animation Background */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: [
              'radial-gradient(circle at center, rgba(239, 68, 68, 0.1) 0%, transparent 70%)',
              'radial-gradient(circle at center, rgba(239, 68, 68, 0.2) 0%, transparent 70%)',
              'radial-gradient(circle at center, rgba(239, 68, 68, 0.1) 0%, transparent 70%)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Main Modal */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative w-full max-w-md"
        >
          {/* Alert Card */}
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border-2 border-red-500">
            {/* Pulsing top border */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{ backgroundSize: '200% 200%' }}
            />

            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <AlertTriangle className="w-8 h-8 text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold text-white">แจ้งเตือนด่วน!</h2>
                    <p className="text-red-100 text-sm">
                      {urgentNotifications.length > 1 
                        ? `${currentIndex + 1} จาก ${urgentNotifications.length} รายการ`
                        : 'มีงานที่ยังไม่ได้ดำเนินการ'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Time Overdue Badge */}
              <motion.div
                className="flex items-center justify-center"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-red-700 dark:text-red-300 font-semibold">
                    รอดำเนินการ: {currentNotification?.time_overdue}
                  </span>
                </div>
              </motion.div>

              {/* Notification Details */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    currentNotification?.data.type === 'document' 
                      ? 'bg-purple-100 dark:bg-purple-900/30' 
                      : 'bg-orange-100 dark:bg-orange-900/30'
                  }`}>
                    {currentNotification?.data.type === 'document' ? (
                      <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <Wrench className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {currentNotification?.data.title}
                    </h3>
                    {currentNotification?.data.ticket_number && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        เลขที่: {currentNotification.data.ticket_number}
                      </p>
                    )}
                    {currentNotification?.data.document_number && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        เลขที่หนังสือ: {currentNotification.data.document_number}
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  {currentNotification?.data.message}
                </p>

                {currentNotification?.data.category && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">หมวดหมู่:</span>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                      {currentNotification.data.category}
                    </span>
                  </div>
                )}
                
                {/* Document action type indicator */}
                {currentNotification?.data.type === 'document' && currentNotification?.data.action_type && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">สถานะ:</span>
                    <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-full">
                      {currentNotification.data.action_type === 'reminder_sender' && 'รอผู้รับรับทราบ'}
                      {currentNotification.data.action_type === 'reminder_receiver' && 'รอคุณรับทราบ'}
                    </span>
                  </div>
                )}

                <p className="text-xs text-gray-400">
                  แจ้งเมื่อ: {currentNotification?.created_at}
                </p>
              </div>

              {/* Navigation for multiple notifications */}
              {urgentNotifications.length > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrev}>
                    ก่อนหน้า
                  </Button>
                  <div className="flex gap-1">
                    {urgentNotifications.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentIndex 
                            ? 'bg-red-500' 
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleNext}>
                    ถัดไป
                  </Button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => currentNotification && handleMarkAsRead(currentNotification.id)}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  รับทราบ
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={() => currentNotification && handleViewDetails(currentNotification)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  ดูรายละเอียด
                </Button>
              </div>
            </div>

            {/* Pulsing bottom indicator */}
            <motion.div
              className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
