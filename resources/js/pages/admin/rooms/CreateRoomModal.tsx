import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function CreateRoomModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>เพิ่มห้องประชุมใหม่</DialogTitle></DialogHeader>
                <p className="text-gray-500">แบบฟอร์มอยู่ระหว่างการพัฒนา...</p>
            </DialogContent>
        </Dialog>
    );
}
