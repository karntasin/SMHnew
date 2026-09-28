import React, { useState, useMemo, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, User as UserIcon, Send, Calendar, Search, Users, AlertCircle } from 'lucide-react';

interface DepartmentItem {
    id: number;
    name: string;
}

interface UserItem {
    id: number;
    name: string;
    department_id?: number | null;
}

interface TargetDocument {
    id: number;
    document_number?: string;
    title: string;
    due_date?: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    document: TargetDocument | null;
    departments: DepartmentItem[];
    users?: UserItem[];
    onSuccess?: () => void;
}

export default function ForwardDocumentDialog({
    open,
    onOpenChange,
    document,
    departments = [],
    users = [],
    onSuccess,
}: Props) {
    const [departmentIds, setDepartmentIds] = useState<string[]>([]);
    const [userIds, setUserIds] = useState<string[]>([]);
    const [dueDate, setDueDate] = useState<string>('');
    const [comment, setComment] = useState<string>('');
    const [deptSearch, setDeptSearch] = useState<string>('');
    const [userSearch, setUserSearch] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);

    useEffect(() => {
        if (open && document) {
            setDepartmentIds([]);
            setUserIds([]);
            setComment('');
            setDeptSearch('');
            setUserSearch('');
            if (document.due_date) {
                try {
                    const d = new Date(document.due_date);
                    const formatted = d.toISOString().slice(0, 16);
                    setDueDate(formatted);
                } catch {
                    setDueDate('');
                }
            } else {
                setDueDate('');
            }
        }
    }, [open, document]);

    const deptMap = useMemo(() => {
        const map = new Map<number, string>();
        departments.forEach((d) => map.set(d.id, d.name));
        return map;
    }, [departments]);

    const filteredDepartments = useMemo(() => {
        if (!deptSearch.trim()) return departments;
        const q = deptSearch.toLowerCase();
        return departments.filter((d) => d.name.toLowerCase().includes(q));
    }, [departments, deptSearch]);

    const filteredUsers = useMemo(() => {
        if (!userSearch.trim()) return users;
        const q = userSearch.toLowerCase();
        return users.filter((u) => {
            const userName = u.name.toLowerCase();
            const deptName = (u.department_id ? deptMap.get(u.department_id) || '' : '').toLowerCase();
            return userName.includes(q) || deptName.includes(q);
        });
    }, [users, userSearch, deptMap]);

    const toggleDepartment = (id: string) => {
        setDepartmentIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const toggleUser = (id: string) => {
        setUserIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const selectAllDepartments = () => {
        if (departmentIds.length === departments.length) {
            setDepartmentIds([]);
        } else {
            setDepartmentIds(departments.map((d) => String(d.id)));
        }
    };

    const handleForward = () => {
        if (!document) return;
        if (departmentIds.length === 0 && userIds.length === 0) {
            alert('กรุณาเลือกแผนกหรือบุคคลที่ต้องการส่งต่ออย่างน้อย 1 รายการ');
            return;
        }

        setSubmitting(true);
        router.post(
            route('documents.forward', document.id),
            {
                department_ids: departmentIds,
                user_ids: userIds,
                due_date: dueDate || null,
                comment: comment || null,
            },
            {
                onSuccess: (page: any) => {
                    setSubmitting(false);
                    const flashError = page?.props?.flash?.error;
                    if (flashError) {
                        alert(flashError);
                        return;
                    }
                    onOpenChange(false);
                    onSuccess?.();
                },
                onError: (err) => {
                    setSubmitting(false);
                    console.error('Forward error:', err);
                },
            }
        );
    };

    const totalRecipients = departmentIds.length + userIds.length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                        <Send className="h-5 w-5 text-indigo-600" />
                        ส่งต่อหนังสือและมอบหมายงาน
                    </DialogTitle>
                    {document && (
                        <div className="mt-1.5 rounded-2xl bg-indigo-50/70 p-3 text-sm border border-indigo-100">
                            <span className="font-semibold text-indigo-900 font-mono">
                                {document.document_number || 'ไม่ระบุเลขที่'}
                            </span>
                            <span className="mx-2 text-slate-300">|</span>
                            <span className="text-slate-700 font-medium">{document.title}</span>
                        </div>
                    )}
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <Tabs defaultValue="departments" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-slate-100 p-1">
                            <TabsTrigger value="departments" className="rounded-xl flex items-center gap-1.5 text-xs sm:text-sm">
                                <Building2 className="h-4 w-4" />
                                ส่งให้แผนก ({departmentIds.length})
                            </TabsTrigger>
                            <TabsTrigger value="users" className="rounded-xl flex items-center gap-1.5 text-xs sm:text-sm">
                                <UserIcon className="h-4 w-4" />
                                ส่งให้รายบุคคล ({userIds.length})
                            </TabsTrigger>
                        </TabsList>

                        {/* แผนก */}
                        <TabsContent value="departments" className="space-y-3 mt-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        placeholder="ค้นหาแผนก..."
                                        value={deptSearch}
                                        onChange={(e) => setDeptSearch(e.target.value)}
                                        className="h-9 pl-9 rounded-xl text-xs sm:text-sm"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={selectAllDepartments}
                                    className="rounded-xl h-9 shrink-0 text-xs"
                                >
                                    <Building2 className="mr-1 h-3.5 w-3.5" />
                                    {departmentIds.length === departments.length ? 'ล้างการเลือก' : 'เลือกทุกแผนก'}
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-200/80 p-3 rounded-2xl max-h-56 overflow-y-auto bg-slate-50/50">
                                {filteredDepartments.length === 0 ? (
                                    <div className="col-span-2 py-6 text-center text-xs text-slate-400">
                                        ไม่พบแผนกที่ค้นหา
                                    </div>
                                ) : (
                                    filteredDepartments.map((dept) => {
                                        const isChecked = departmentIds.includes(String(dept.id));
                                        return (
                                            <div
                                                key={dept.id}
                                                onClick={() => toggleDepartment(String(dept.id))}
                                                className={`flex items-center space-x-2.5 p-2 rounded-xl cursor-pointer transition border select-none ${
                                                    isChecked
                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-medium shadow-xs'
                                                        : 'bg-white border-slate-200/60 hover:bg-slate-100/70 text-slate-700'
                                                }`}
                                            >
                                                <Checkbox
                                                    checked={isChecked}
                                                    className="pointer-events-none"
                                                />
                                                <span className="text-xs sm:text-sm leading-none">
                                                    {dept.name}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </TabsContent>

                        {/* บุคคล */}
                        <TabsContent value="users" className="space-y-3 mt-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                <Input
                                    placeholder="ค้นหาชื่อบุคลากร หรือชื่อแผนก..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="h-9 pl-9 rounded-xl text-xs sm:text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-200/80 p-3 rounded-2xl max-h-56 overflow-y-auto bg-slate-50/50">
                                {filteredUsers.length === 0 ? (
                                    <div className="col-span-2 py-6 text-center text-xs text-slate-400">
                                        ไม่พบรายชื่อบุคลากร
                                    </div>
                                ) : (
                                    filteredUsers.map((u) => {
                                        const isChecked = userIds.includes(String(u.id));
                                        const deptName = u.department_id ? deptMap.get(u.department_id) : null;
                                        return (
                                            <div
                                                key={u.id}
                                                onClick={() => toggleUser(String(u.id))}
                                                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition border select-none ${
                                                    isChecked
                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-medium shadow-xs'
                                                        : 'bg-white border-slate-200/60 hover:bg-slate-100/70 text-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center space-x-2.5 truncate mr-1">
                                                    <Checkbox
                                                        checked={isChecked}
                                                        className="pointer-events-none"
                                                    />
                                                    <span className="text-xs sm:text-sm truncate">
                                                        {u.name}
                                                    </span>
                                                </div>
                                                {deptName && (
                                                    <Badge variant="outline" className="text-[10px] shrink-0 font-normal border-slate-200 text-slate-500">
                                                        {deptName}
                                                    </Badge>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* สรุปผู้รับที่เลือก */}
                    {totalRecipients > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-100/70 text-xs">
                            <span className="font-semibold text-slate-600 flex items-center gap-1">
                                <Users className="h-3.5 w-3.5 text-indigo-600" /> ผู้รับที่เลือก:
                            </span>
                            {departmentIds.length > 0 && (
                                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                                    แผนก: {departmentIds.length} แผนก
                                </Badge>
                            )}
                            {userIds.length > 0 && (
                                <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">
                                    บุคคล: {userIds.length} ท่าน
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* กำหนดส่ง / ติดตามงาน */}
                    <div className="space-y-1.5 rounded-2xl bg-amber-50/60 border border-amber-100 p-3">
                        <Label htmlFor="forward-due-date" className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                            <Calendar className="h-4 w-4 text-amber-600" />
                            กำหนดส่ง / ติดตามงาน (Due Date)
                        </Label>
                        <Input
                            id="forward-due-date"
                            type="datetime-local"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="rounded-xl border-amber-200 bg-white text-xs sm:text-sm"
                        />
                        <p className="flex items-center gap-1 text-[11px] text-amber-700/90">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            ระบบจะส่งแจ้งเตือนเข้า fshh-chat ล่วงหน้า 1 วัน และแจ้งเตือนติดตามงานหากเลยกำหนด
                        </p>
                    </div>

                    {/* บันทึกข้อความ / สั่งการ */}
                    <div className="space-y-1.5">
                        <Label htmlFor="forward-comment" className="text-xs font-semibold text-slate-700">
                            บันทึกข้อความ / สั่งการมอบหมาย
                        </Label>
                        <Textarea
                            id="forward-comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                            placeholder="ระบุข้อความสั่งการ หรือสิ่งที่ต้องการให้ผู้รับดำเนินการ..."
                            className="rounded-xl border-slate-200 text-xs sm:text-sm"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl"
                        disabled={submitting}
                    >
                        ยกเลิก
                    </Button>
                    <Button
                        type="button"
                        onClick={handleForward}
                        disabled={submitting || totalRecipients === 0}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        <Send className="mr-1.5 h-4 w-4" />
                        {submitting ? 'กำลังส่ง...' : `ยืนยันส่งต่อ (${totalRecipients} ปลายทาง)`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
