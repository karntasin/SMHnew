import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Search } from 'lucide-react';

interface SpellcheckModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    suspects: string[];
    onProceed?: () => void;
}

export function SpellcheckModal({
    open,
    onOpenChange,
    suspects,
    onProceed,
}: SpellcheckModalProps) {
    const hasSuspects = suspects.length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                        {hasSuspects ? (
                            <>
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                <span>พบคำที่อาจสะกดผิด ({suspects.length} คำ)</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                <span>ไม่พบคำผิดในพจนานุกรม</span>
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {hasSuspects
                            ? 'คำด้านล่างนี้ไม่พบในพจนานุกรมภาษาไทยมาตรฐานของโรงพยาบาล โปรดตรวจสอบความถูกต้อง'
                            : 'ข้อความทั้งหมดตรงตามคำศัพท์ในพจนานุกรมภาษาไทยของระบบ'}
                    </DialogDescription>
                </DialogHeader>

                {hasSuspects ? (
                    <div className="space-y-2 py-2">
                        <div className="max-h-52 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                            <div className="flex flex-wrap gap-2">
                                {suspects.map((word, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-sm font-medium text-amber-900 shadow-xs"
                                    >
                                        {word}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            * คำเฉพาะ ชื่อเฉพาะ หรือตัวย่อทางการแพทย์อาจไม่มีในพจนานุกรมทั่วไป หากมั่นใจว่าถูกต้องสามารถใช้งานต่อได้
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <p className="text-sm">คำศัพท์ถูกต้อง ไม่พบคำผิด</p>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {hasSuspects ? 'กลับไปแก้ไข' : 'ปิด'}
                    </Button>
                    {hasSuspects && onProceed && (
                        <Button
                            type="button"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => {
                                onOpenChange(false);
                                onProceed();
                            }}
                        >
                            ยืนยันใช้คำนี้
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
