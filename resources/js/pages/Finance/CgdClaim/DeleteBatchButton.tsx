import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { claimRoute, type ClaimModuleMeta } from './claimModule';

interface Props {
    batchId: number;
    module?: ClaimModuleMeta;
    destroyRouteName?: string;
    label?: string;
    documentNo?: string | null;
    filename?: string | null;
    rowCount?: number;
    variant?: 'outline' | 'destructive' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    className?: string;
    iconOnly?: boolean;
}

export default function DeleteBatchButton({
    batchId,
    module,
    destroyRouteName,
    label = 'ลบข้อมูลนำเข้า',
    documentNo,
    filename,
    rowCount,
    variant = 'outline',
    size = 'sm',
    className,
    iconOnly = false,
}: Props) {
    const [processing, setProcessing] = useState(false);
    const title = documentNo || filename || `ชุดข้อมูล #${batchId}`;

    const handleDelete = () => {
        setProcessing(true);
        const destroyUrl = destroyRouteName
            ? route(destroyRouteName, { batch: batchId })
            : claimRoute(module, 'destroy', batchId);
        router.delete(destroyUrl, {
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    type="button"
                    size={size}
                    variant={variant}
                    className={cn('rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700', className)}
                    disabled={processing}
                >
                    <Trash2 className={cn('h-4 w-4', !iconOnly && 'mr-2')} />
                    {!iconOnly && (processing ? 'กำลังลบ...' : label)}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>ลบข้อมูลนำเข้า REP?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-2 text-sm text-slate-600">
                            <p>
                                จะลบไฟล์ <span className="font-semibold text-slate-800">{title}</span>
                                {typeof rowCount === 'number' ? ` (${rowCount.toLocaleString()} รายการ)` : ''} ออกจากระบบ
                            </p>
                            <ul className="list-disc space-y-1 pl-5 text-slate-500">
                                <li>รายการ REP ที่นำเข้า</li>
                                <li>ผลการเปรียบเทียบกับ HOSxP</li>
                                <li>ไฟล์ต้นฉบับที่เก็บในระบบ</li>
                            </ul>
                            <p className="font-medium text-rose-600">การลบนี้ย้อนกลับไม่ได้</p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl" disabled={processing}>
                        ยกเลิก
                    </AlertDialogCancel>
                    <AlertDialogAction
                        className="rounded-xl bg-rose-600 hover:bg-rose-700"
                        disabled={processing}
                        onClick={handleDelete}
                    >
                        ยืนยันลบข้อมูล
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
