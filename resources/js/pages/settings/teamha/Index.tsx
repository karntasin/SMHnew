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
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Users, ArrowLeft } from 'lucide-react';
import { useDebounce } from 'use-debounce';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'ตั้งค่า', href: '/settingsapp' },
  { title: 'จัดการทีม HA', href: '/settings/teamha' },
];

interface TeamHa {
  id: number;
  abbreviation: string;
  name_th: string;
  name_en: string | null;
  created_at: string;
}

interface PaginatedData {
  data: TeamHa[];
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
  teams: PaginatedData;
  filters: {
    search?: string;
  };
}

export default function TeamhaIndex({ teams, filters }: Props) {
  const [search, setSearch] = useState(filters.search || '');
  const [debouncedSearch] = useDebounce(search, 300);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  React.useEffect(() => {
    if (debouncedSearch !== (filters.search || '')) {
      router.get('/settings/teamha', { search: debouncedSearch }, {
        preserveState: true,
        replace: true,
      });
    }
  }, [debouncedSearch]);

  const handleDelete = (id: number) => {
    router.delete(`/settings/teamha/${id}`, {
      onSuccess: () => setDeleteId(null),
    });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="จัดการทีม HA" />

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
                <Users className="h-6 w-6 text-primary" />
                จัดการทีม HA
              </h1>
              <p className="text-muted-foreground">
                จัดการข้อมูลทีม HA ในระบบ
              </p>
            </div>
          </div>
          <Link href="/settings/teamha/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มทีม HA
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
                  placeholder="ค้นหาทีม HA..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="secondary" className="text-sm">
                ทั้งหมด {teams.total} ทีม
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>รายการทีม HA</CardTitle>
            <CardDescription>
              แสดง {teams.from || 0} - {teams.to || 0} จาก {teams.total} รายการ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">รหัสย่อ</TableHead>
                    <TableHead>ชื่อ (ภาษาไทย)</TableHead>
                    <TableHead>ชื่อ (ภาษาอังกฤษ)</TableHead>
                    <TableHead className="text-right w-[100px]">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        ไม่พบข้อมูลทีม HA
                      </TableCell>
                    </TableRow>
                  ) : (
                    teams.data.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell>
                          <Badge variant="outline">{team.abbreviation}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{team.name_th}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {team.name_en || '-'}
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
                                <Link href={`/settings/teamha/${team.id}/edit`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  แก้ไข
                                </Link>
                              </DropdownMenuItem>
                              <AlertDialog open={deleteId === team.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setDeleteId(team.id);
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
                                      คุณต้องการลบทีม "{team.name_th}" หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(team.id)}
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
            {teams.last_page > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                {teams.links.map((link, index) => (
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
