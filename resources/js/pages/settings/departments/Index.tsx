import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
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
import { BreadcrumbItem } from '@/types';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Building2, ArrowLeft } from 'lucide-react';
import { useDebounce } from 'use-debounce';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'ตั้งค่า', href: '/settingsapp' },
  { title: 'จัดการแผนก', href: '/settings/departments' },
];

interface Department {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface PaginatedData {
  data: Department[];
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
  departments: PaginatedData;
  filters: {
    search?: string;
  };
}

export default function DepartmentIndex({ departments, filters }: Props) {
  const [search, setSearch] = useState(filters.search || '');
  const [debouncedSearch] = useDebounce(search, 300);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  React.useEffect(() => {
    if (debouncedSearch !== (filters.search || '')) {
      router.get('/settings/departments', { search: debouncedSearch }, {
        preserveState: true,
        replace: true,
      });
    }
  }, [debouncedSearch]);

  const handleDelete = (id: number) => {
    router.delete(`/settings/departments/${id}`, {
      onSuccess: () => setDeleteId(null),
    });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="จัดการแผนก" />

      <div className="container mx-auto py-6 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/settingsapp">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" />
                จัดการแผนก
              </h1>
              <p className="text-muted-foreground">
                จัดการข้อมูลแผนกในระบบ
              </p>
            </div>
          </div>
          <Link href="/settings/departments/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มแผนก
            </Button>
          </Link>
        </div>

        {/* Search & Stats */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาแผนก..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="secondary" className="text-sm">
                ทั้งหมด {departments.total} แผนก
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>รายการแผนก</CardTitle>
            <CardDescription>
              แสดง {departments.from || 0} - {departments.to || 0} จาก {departments.total} รายการ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">รหัสย่อ</TableHead>
                    <TableHead>ชื่อแผนก</TableHead>
                    <TableHead>คำอธิบาย</TableHead>
                    <TableHead className="w-[100px]">สถานะ</TableHead>
                    <TableHead className="text-right w-[100px]">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        ไม่พบข้อมูลแผนก
                      </TableCell>
                    </TableRow>
                  ) : (
                    departments.data.map((department) => (
                      <TableRow key={department.id}>
                        <TableCell>
                          <Badge variant="outline">{department.code || '-'}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{department.name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {department.description || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={department.is_active ? 'default' : 'secondary'}>
                            {department.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
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
                                <Link href={`/settings/departments/${department.id}/edit`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  แก้ไข
                                </Link>
                              </DropdownMenuItem>
                              <AlertDialog open={deleteId === department.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setDeleteId(department.id);
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
                                      คุณต้องการลบแผนก "{department.name}" หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(department.id)}
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

            {/* Pagination */}
            {departments.last_page > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                {departments.links.map((link, index) => (
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
    </AppLayout>
  );
}
