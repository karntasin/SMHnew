import React, { useState, useEffect } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { type BreadcrumbItem } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  User as UserIcon, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  KeyRound,
  Mail,
  Shield
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/th';
import { useDebounce } from 'use-debounce';

dayjs.extend(relativeTime);
dayjs.locale('th');

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'การจัดการผู้ใช้งาน',
    href: '/users',
  },
];

interface Role {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  roles: Role[];
  positions?: { id: number; name: string }[];
  line_id?: string | null;
  line_display_name?: string | null;
  profile_completed?: boolean;
}

interface Props {
  users: {
    data: User[];
    current_page: number;
    last_page: number;
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    from: number;
    to: number;
  };
  filters?: {
    search?: string;
  };
  allRoles: Role[];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  return parts
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function isLineStubEmail(email: string) {
  return email.toLowerCase().endsWith('@line.login');
}

export default function UserIndex({ users, filters, allRoles }: Props) {
  const { delete: destroy, processing } = useForm();
  const [searchTerm, setSearchTerm] = useState(filters?.search || '');
  const [debouncedSearch] = useDebounce(searchTerm, 500);

  // Role Management State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  useEffect(() => {
    if (debouncedSearch !== (filters?.search || '')) {
      router.get(
        '/users',
        { search: debouncedSearch },
        { preserveState: true, replace: true }
      );
    }
  }, [debouncedSearch]);

  const handleDelete = (id: number) => {
    destroy(`/users/${id}`);
  };

  const handleResetPassword = (id: number) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตรหัสผ่านสำหรับผู้ใช้นี้?')) {
      router.put(`/users/${id}/reset-password`, {}, { preserveScroll: true });
    }
  };

  const openRoleModal = (user: User) => {
    setSelectedUser(user);
    setSelectedRoles(user.roles.map(r => r.name));
    setIsRoleModalOpen(true);
  };

  const handleRoleSave = () => {
    if (!selectedUser) return;
    setIsSavingRoles(true);
    router.put(`/users/${selectedUser.id}/roles`, {
      roles: selectedRoles
    }, {
      onSuccess: () => {
        setIsRoleModalOpen(false);
        setIsSavingRoles(false);
      },
      onError: () => {
        setIsSavingRoles(false);
      }
    });
  };

  const toggleRole = (roleName: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleName) 
        ? prev.filter(r => r !== roleName)
        : [...prev, roleName]
    );
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="การจัดการผู้ใช้งาน" />
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">การจัดการผู้ใช้งาน</h1>
            <p className="text-muted-foreground">จัดการบัญชีผู้ใช้ บทบาท และสิทธิ์การเข้าถึง</p>
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <Link href={route('users.bulk-roles')}>
              <Button variant="outline" className="w-full md:w-auto">
                <Shield className="mr-2 h-4 w-4" /> จัดการบทบาทแบบกลุ่ม
              </Button>
            </Link>
            <Link href="/users/create">
              <Button className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700">
                <Plus className="mr-2 h-4 w-4" /> เพิ่มผู้ใช้งานใหม่
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">รายชื่อผู้ใช้งาน</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="ค้นหาผู้ใช้งาน..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <CardDescription>
              แสดง {users.from || 0} ถึง {users.to || 0} จากทั้งหมด {users.total} ผู้ใช้งาน
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">ผู้ใช้งาน</TableHead>
                    <TableHead>บทบาท</TableHead>
                    <TableHead>วันที่เข้าร่วม</TableHead>
                    <TableHead className="text-right">การจัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        ไม่พบข้อมูลผู้ใช้งาน
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.data.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                              {getInitials(user.name || user.line_display_name || '?')}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {user.name || user.line_display_name || 'ยังไม่มีชื่อ'}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />{' '}
                                {isLineStubEmail(user.email) ? 'บัญชี LINE (ยังไม่ผูกอีเมล)' : user.email}
                              </span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {user.line_id && (
                                  <Badge variant="outline" className="font-normal text-[#06C755] border-[#06C755]/40">
                                    LINE
                                  </Badge>
                                )}
                                {user.profile_completed === false && (
                                  <Badge variant="outline" className="font-normal text-amber-700 border-amber-300">
                                    รอกรอกโปรไฟล์
                                  </Badge>
                                )}
                              </div>
                              {user.positions && user.positions.length > 0 && (
                                <span className="text-xs text-indigo-700 mt-1">
                                  {user.positions.map((pos) => pos.name).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length > 0 ? (
                              user.roles.map((role) => (
                                <Badge key={role.id} variant="secondary" className="font-normal">
                                  {role.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm italic">ไม่มีบทบาท</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {dayjs(user.created_at).fromNow()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">เปิดเมนู</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>การจัดการ</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openRoleModal(user)}>
                                <Shield className="mr-2 h-4 w-4" /> จัดการบทบาท
                              </DropdownMenuItem>
                              <Link href={`/users/${user.id}/edit`}>
                                <DropdownMenuItem>
                                  <Pencil className="mr-2 h-4 w-4" /> แก้ไขข้อมูล
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                                <KeyRound className="mr-2 h-4 w-4" /> รีเซ็ตรหัสผ่าน
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" /> ลบผู้ใช้งาน
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      การกระทำนี้ไม่สามารถย้อนกลับได้ ระบบจะลบบัญชีผู้ใช้
                                      <strong> {user.name}</strong> อย่างถาวร
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(user.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      ลบข้อมูล
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {users.links.length > 3 && (
              <div className="flex items-center justify-end space-x-2 py-4">
                {users.links.map((link, i) => (
                  <Button
                    key={i}
                    variant={link.active ? "default" : "outline"}
                    size="sm"
                    asChild
                    disabled={!link.url}
                    className={!link.url ? 'opacity-50 pointer-events-none' : ''}
                  >
                    <Link href={link.url || '#'}>
                      <span dangerouslySetInnerHTML={{ __html: link.label }} />
                    </Link>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Management Modal */}
        <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>จัดการบทบาทผู้ใช้งาน</DialogTitle>
              <DialogDescription>
                กำหนดบทบาทให้กับ <strong>{selectedUser?.name}</strong> เลือกบทบาทที่ต้องการด้านล่าง
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-4">
                {allRoles.map((role) => (
                  <div key={role.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`role-${role.id}`} 
                      checked={selectedRoles.includes(role.name)}
                      onCheckedChange={() => toggleRole(role.name)}
                    />
                    <Label 
                      htmlFor={`role-${role.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {role.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRoleModalOpen(false)}>ยกเลิก</Button>
              <Button onClick={handleRoleSave} disabled={isSavingRoles}>
                {isSavingRoles ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
