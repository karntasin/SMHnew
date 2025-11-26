import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { type BreadcrumbItem } from '@/types';
import { Plus, Edit, Trash2, Search, Shield, Layers } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';

interface Permission {
  id: number;
  name: string;
  group: string;
  created_at: string;
}

interface Props {
  groupedPermissions: Record<string, Permission[]>;
  filters: {
    search?: string;
  };
}

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'การจัดการสิทธิ์',
    href: '/permissions',
  },
];

export default function PermissionIndex({ groupedPermissions, filters }: Props) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [debouncedSearch] = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearch !== (filters.search || '')) {
      router.get(
        '/permissions',
        { search: debouncedSearch },
        { preserveState: true, replace: true }
      );
    }
  }, [debouncedSearch]);

  const handleDelete = (id: number) => {
    router.delete(`/permissions/${id}`, {
      onSuccess: () => toast.success('ลบสิทธิ์เรียบร้อยแล้ว'),
      onError: () => toast.error('ไม่สามารถลบสิทธิ์ได้'),
    });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="การจัดการสิทธิ์" />
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">การจัดการสิทธิ์ (Permissions)</h1>
            <p className="text-muted-foreground">จัดการสิทธิ์การเข้าถึงระบบแยกตามกลุ่มการใช้งาน</p>
          </div>
          <Link href="/permissions/create">
            <Button className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700">
              <Plus className="mr-2 h-4 w-4" /> เพิ่มสิทธิ์ใหม่
            </Button>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาสิทธิ์ หรือกลุ่ม..."
            className="pl-9 max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {Object.keys(groupedPermissions).length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <h3 className="mt-4 text-lg font-semibold">ไม่พบข้อมูลสิทธิ์</h3>
            <p className="text-muted-foreground">ลองค้นหาด้วยคำอื่น หรือเพิ่มสิทธิ์ใหม่</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Object.entries(groupedPermissions).map(([group, permissions]) => (
              <Card key={group} className="flex flex-col h-full overflow-hidden border-t-4 border-t-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="bg-muted/20 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-indigo-600" />
                      <CardTitle className="text-lg">{group || 'ทั่วไป (General)'}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                      {permissions.length} สิทธิ์
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <div className="divide-y">
                    {permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
                          <span className="text-sm font-medium truncate" title={permission.name}>
                            {permission.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/permissions/${permission.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-indigo-600">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>ยืนยันการลบสิทธิ์?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  คุณต้องการลบสิทธิ์ <strong>{permission.name}</strong> ใช่หรือไม่? 
                                  การกระทำนี้ไม่สามารถย้อนกลับได้
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleDelete(permission.id)}
                                >
                                  ลบข้อมูล
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
