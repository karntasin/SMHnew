import React, { useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { BreadcrumbItem } from '@/types';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowLeft,
  Upload,
  ClipboardList,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { Checkbox } from '@/components/ui/checkbox';
import { maskSurname } from '@/lib/pii';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'ตั้งค่า', href: '/settings-hub' },
  { title: 'จัดการเจ้าหน้าที่', href: '/settings/staff' },
];

interface StaffMember {
  id: number;
  prefix: string | null;
  first_name: string;
  last_name: string;
  position: string | null;
  phone: string | null;
  cid: string | null;
  cid_masked?: string | null;
  role_name: string;
  is_active: boolean;
}

interface PaginatedData {
  data: StaffMember[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
}

interface Props {
  staff: PaginatedData;
  filters: {
    search?: string;
    status?: string;
  };
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
  roleLabels: Record<string, string>;
}

export default function StaffRosterIndex({ staff, filters, stats, roleLabels }: Props) {
  const [search, setSearch] = useState(filters.search || '');
  const [debouncedSearch] = useDebounce(search, 300);
  const [status, setStatus] = useState(filters.status || 'all');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [replaceAll, setReplaceAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { errors } = usePage().props as { errors: Record<string, string> };

  React.useEffect(() => {
    const currentSearch = filters.search || '';
    const currentStatus = filters.status || 'all';
    if (debouncedSearch !== currentSearch || status !== currentStatus) {
      router.get('/settings/staff', { search: debouncedSearch, status }, {
        preserveState: true,
        replace: true,
      });
    }
  }, [debouncedSearch, status]);

  const handleDelete = (id: number) => {
    router.delete(`/settings/staff/${id}`, {
      onSuccess: () => setDeleteId(null),
    });
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    router.post('/settings/staff/import', {
      file,
      replace: replaceAll,
    }, {
      forceFormData: true,
      onSuccess: () => {
        setImportOpen(false);
        setReplaceAll(false);
        if (fileRef.current) fileRef.current.value = '';
      },
    });
  };

  const fullName = (row: StaffMember) =>
    [row.prefix, row.first_name, maskSurname(row.last_name) || row.last_name].filter(Boolean).join(' ');

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="จัดการเจ้าหน้าที่" />

      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/settings-hub">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-primary" />
                จัดการเจ้าหน้าที่
              </h1>
              <p className="text-muted-foreground">
                รายชื่อผู้มีสิทธิสมัครเข้าใช้ระบบ — เฉพาะสถานะใช้งานเท่านั้นที่สมัครได้
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              นำเข้า Excel
            </Button>
            <Link href="/settings/staff/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มเจ้าหน้าที่
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">ทั้งหมด</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">สมัครได้</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">ปิดสิทธิ์</p>
              <p className="text-2xl font-bold text-slate-500">{stats.inactive}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาชื่อ นามสกุล CID ตำแหน่ง..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: 'active', label: 'สมัครได้' },
                  { id: 'inactive', label: 'ปิดสิทธิ์' },
                ].map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    size="sm"
                    variant={status === item.id ? 'default' : 'outline'}
                    onClick={() => setStatus(item.id)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>รายชื่อเจ้าหน้าที่</CardTitle>
            <CardDescription>
              แสดง {staff.from || 0} - {staff.to || 0} จาก {staff.total} รายการ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ-นามสกุล</TableHead>
                    <TableHead>ตำแหน่ง</TableHead>
                    <TableHead>CID</TableHead>
                    <TableHead>เบอร์โทร</TableHead>
                    <TableHead>บทบาท</TableHead>
                    <TableHead>สิทธิ์สมัคร</TableHead>
                    <TableHead className="text-right w-[100px]">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        ไม่พบรายชื่อเจ้าหน้าที่
                      </TableCell>
                    </TableRow>
                  ) : (
                    staff.data.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{fullName(row)}</TableCell>
                        <TableCell className="text-muted-foreground">{row.position || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{row.cid_masked || row.cid || '-'}</TableCell>
                        <TableCell>{row.phone || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{roleLabels[row.role_name] || row.role_name}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.is_active ? 'default' : 'secondary'}>
                            {row.is_active ? 'ใช้งาน' : 'ปิด'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>จัดการ</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/settings/staff/${row.id}/edit`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  แก้ไข
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => router.patch(`/settings/staff/${row.id}/toggle`)}
                              >
                                {row.is_active ? (
                                  <>
                                    <ShieldOff className="mr-2 h-4 w-4" />
                                    ปิดสิทธิ์สมัคร
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    เปิดสิทธิ์สมัคร
                                  </>
                                )}
                              </DropdownMenuItem>
                              <AlertDialog open={deleteId === row.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setDeleteId(row.id);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    ลบ
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      ลบ "{fullName(row)}" ออกจากรายชื่อผู้มีสิทธิ์หรือไม่? หลังลบจะสมัครเข้าใช้ระบบไม่ได้
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(row.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      ลบ
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

            {staff.last_page > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                {staff.links.map((link, index) => (
                  <Button
                    key={index}
                    variant={link.active ? 'default' : 'outline'}
                    size="sm"
                    disabled={!link.url}
                    onClick={() => link.url && router.get(link.url)}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
        <AlertDialogContent>
          <form onSubmit={handleImport}>
            <AlertDialogHeader>
              <AlertDialogTitle>นำเข้าจาก Excel</AlertDialogTitle>
              <AlertDialogDescription>
                คอลัมน์แถวที่ 1: คำนำหน้า, ชื่อ, นามสกุล, ตำแหน่ง, เบอร์, CID, บทบาท — ข้อมูลเริ่มที่แถวที่ 2
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="staff-file">ไฟล์ .xlsx / .xls</Label>
                <Input id="staff-file" ref={fileRef} type="file" accept=".xlsx,.xls,.csv" />
                {errors.file && <p className="text-sm text-destructive">{errors.file}</p>}
              </div>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={replaceAll} onCheckedChange={(checked) => setReplaceAll(Boolean(checked))} />
                <span>แทนที่รายชื่อเดิมทั้งหมด (ใช้เมื่อนำเข้าใหม่ทั้งชุด)</span>
              </label>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">ยกเลิก</AlertDialogCancel>
              <Button type="submit">นำเข้า</Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
