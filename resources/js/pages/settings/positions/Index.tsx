import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
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
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Briefcase, ArrowLeft } from 'lucide-react';
import { useDebounce } from 'use-debounce';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'ตั้งค่า', href: '/settingsapp' },
  { title: 'จัดการตำแหน่งงาน', href: '/settings/positions' },
];

interface Position {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  users_count?: number;
}

interface Props {
  positions: {
    data: Position[];
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
}

export default function PositionIndex({ positions, filters }: Props) {
  const { delete: destroy } = useForm();
  const [searchTerm, setSearchTerm] = useState(filters?.search || '');
  const [debouncedSearch] = useDebounce(searchTerm, 500);

  React.useEffect(() => {
    if (debouncedSearch !== (filters?.search || '')) {
      router.get(
        '/settings/positions',
        { search: debouncedSearch },
        { preserveState: true, replace: true }
      );
    }
  }, [debouncedSearch]);

  const handleDelete = (id: number) => {
    destroy(`/settings/positions/${id}`);
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="จัดการตำแหน่งงาน" />
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/settingsapp" className="text-muted-foreground hover:text-primary">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-2xl font-bold tracking-tight">จัดการตำแหน่งงาน</h1>
            </div>
            <p className="text-muted-foreground">เพิ่ม แก้ไข หรือลบตำแหน่งงานในระบบ</p>
          </div>
          <Link href="/settings/positions/create">
            <Button className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700">
              <Plus className="mr-2 h-4 w-4" /> เพิ่มตำแหน่งงานใหม่
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                รายการตำแหน่งงาน
              </CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="ค้นหาตำแหน่งงาน..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <CardDescription>
              แสดง {positions.from || 0} ถึง {positions.to || 0} จากทั้งหมด {positions.total} ตำแหน่ง
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">#</TableHead>
                    <TableHead>ชื่อตำแหน่ง</TableHead>
                    <TableHead>คำอธิบาย</TableHead>
                    <TableHead className="text-right">การจัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        ไม่พบข้อมูลตำแหน่งงาน
                      </TableCell>
                    </TableRow>
                  ) : (
                    positions.data.map((position, index) => (
                      <TableRow key={position.id}>
                        <TableCell className="font-medium text-muted-foreground">
                          {(positions.current_page - 1) * 15 + index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                              {position.name}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {position.description || '-'}
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
                              <Link href={`/settings/positions/${position.id}/edit`}>
                                <DropdownMenuItem>
                                  <Pencil className="mr-2 h-4 w-4" /> แก้ไข
                                </DropdownMenuItem>
                              </Link>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem 
                                    onSelect={(e) => e.preventDefault()} 
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> ลบ
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>ยืนยันการลบ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      คุณต้องการลบตำแหน่ง <strong>{position.name}</strong> หรือไม่? 
                                      การกระทำนี้ไม่สามารถย้อนกลับได้
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(position.id)}
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
            {positions.links.length > 3 && (
              <div className="flex items-center justify-end space-x-2 py-4">
                {positions.links.map((link, i) => (
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
      </div>
    </AppLayout>
  );
}
