import React, { useMemo } from 'react';
import { useForm, Link } from '@inertiajs/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BreadcrumbItem } from '@/types';
import { ArrowLeft, Save, Shield, Copy, Eye, Layers, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { isViewPermission } from '@/lib/permission-labels';
import {
    AccessMenuNode,
    RoleAccessMenuPicker,
    collectNodePermissions,
} from '@/components/roles/role-access-menu-picker';

interface Permission {
    id: number;
    name: string;
    group: string | null;
}

interface Role {
    id?: number;
    name: string;
    permissions?: Permission[];
}

interface RoleTemplate {
    id: number;
    name: string;
    permissions: string[];
    permissions_count: number;
}

interface Props {
    role?: Role;
    accessMenuTree: AccessMenuNode[];
    extraPermissions?: Permission[];
    validPermissionNames?: string[];
    roleTemplates?: RoleTemplate[];
}

export default function RoleForm({
    role,
    accessMenuTree,
    extraPermissions = [],
    validPermissionNames = [],
    roleTemplates = [],
}: Props) {
    const isEdit = !!role;

    const validPermissionSet = useMemo(
        () => new Set(validPermissionNames),
        [validPermissionNames],
    );

    const allPermissionNames = useMemo(() => {
        const fromMenus = accessMenuTree.flatMap((node) => collectNodePermissions(node));
        const fromExtra = extraPermissions.map((p) => p.name);
        return [...new Set([...fromMenus, ...fromExtra])].filter((name) => validPermissionSet.has(name));
    }, [accessMenuTree, extraPermissions, validPermissionSet]);

    const { data, setData, post, put, processing, errors, transform } = useForm({
        name: role?.name || '',
        permissions: (role?.permissions?.map((p) => p.name) || []).filter((name) => validPermissionSet.has(name)),
    });

    transform((formData) => ({
        ...formData,
        permissions: formData.permissions.filter((name) => validPermissionSet.has(name)),
    }));

    const submitOptions = {
        onError: (formErrors: Record<string, string>) => {
            const firstError = Object.values(formErrors)[0];
            toast.error(firstError || 'บันทึกไม่สำเร็จ กรุณาตรวจสอบข้อมูล');
        },
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!data.name.trim()) {
            toast.error('กรุณาระบุชื่อบทบาท');
            return;
        }

        if (isEdit) {
            put(route('roles.update', role!.id!), submitOptions);
            return;
        }

        post(route('roles.store'), submitOptions);
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'จัดการบทบาท', href: route('roles.index') },
        { title: isEdit ? 'แก้ไขบทบาท' : 'สร้างบทบาทใหม่', href: '#' },
    ];

    const selectViewOnly = () => {
        setData(
            'permissions',
            allPermissionNames.filter((name) => isViewPermission(name)),
        );
    };

    const applyTemplate = (templateId: string) => {
        const template = roleTemplates.find((t) => String(t.id) === templateId);
        if (!template) {
            return;
        }
        setData('permissions', [...template.permissions.filter((name) => validPermissionSet.has(name))]);
        if (!isEdit && !data.name.trim()) {
            setData('name', `${template.name}-copy`);
        }
    };

    const moduleSummary = useMemo(() => {
        return accessMenuTree
            .map((node) => {
                const perms = collectNodePermissions(node);
                const selected = perms.filter((p) => data.permissions.includes(p)).length;
                return { title: node.title, selected, total: perms.length };
            })
            .filter((item) => item.selected > 0 && item.total > 0);
    }, [accessMenuTree, data.permissions]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'แก้ไขบทบาท' : 'สร้างบทบาทใหม่'} />
            <div className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full">
                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                {isEdit ? 'แก้ไขบทบาท' : 'สร้างบทบาทใหม่'}
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                เลือกสิทธิ์ตามโครงสร้างเมนู — โมดูลหลักและเมนูย่อยเหมือน Sidebar
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Link href={route('roles.index')}>
                                <Button variant="outline" type="button">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> ยกเลิก
                                </Button>
                            </Link>
                            <Button type="submit" disabled={processing || !data.name.trim()} className="bg-primary hover:bg-primary/90">
                                <Save className="mr-2 h-4 w-4" /> {isEdit ? 'บันทึกการแก้ไข' : 'สร้างบทบาท'}
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="md:col-span-1 space-y-6">
                            <Card className="border-none shadow-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Shield className="h-5 w-5 text-primary" />
                                        ข้อมูลบทบาท
                                    </CardTitle>
                                    <CardDescription>ชื่อบทบาทที่จะมอบให้ผู้ใช้</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">ชื่อบทบาท <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="name"
                                            placeholder="เช่น หัวหน้าแผนก, เจ้าหน้าที่การเงิน"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            className={errors.name ? 'border-red-500' : ''}
                                        />
                                        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                                        {errors.permissions && <p className="text-sm text-red-500">{errors.permissions}</p>}
                                    </div>

                                    <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">สิทธิ์ที่เลือก</span>
                                            <Badge variant="secondary">{data.permissions.length}</Badge>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">จากทั้งหมด</span>
                                            <span className="font-medium">{allPermissionNames.length}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-md">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Copy className="h-4 w-4" />
                                        เริ่มจากแม่แบบ
                                    </CardTitle>
                                    <CardDescription>คัดลอกสิทธิ์จากบทบาทที่มีอยู่แล้ว</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Select onValueChange={applyTemplate}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="เลือกบทบาทต้นแบบ..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roleTemplates.map((template) => (
                                                <SelectItem key={template.id} value={String(template.id)}>
                                                    {template.name} ({template.permissions_count} สิทธิ์)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <div className="grid gap-2">
                                        <Button type="button" variant="outline" size="sm" className="justify-start" onClick={selectViewOnly}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            เลือกเฉพาะสิทธิ์ดู/แดชบอร์ด
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="justify-start"
                                            onClick={() => {
                                                const userTemplate = roleTemplates.find((t) => t.name === 'user');
                                                if (userTemplate) {
                                                    setData('permissions', [...userTemplate.permissions.filter((name) => validPermissionSet.has(name))]);
                                                }
                                            }}
                                        >
                                            <Layers className="mr-2 h-4 w-4" />
                                            ชุดสิทธิ์ผู้ใช้ทั่วไป
                                        </Button>
                                        <Button type="button" variant="ghost" size="sm" className="justify-start text-muted-foreground" onClick={() => setData('permissions', [])}>
                                            <X className="mr-2 h-4 w-4" />
                                            ล้างสิทธิ์ทั้งหมด
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {moduleSummary.length > 0 && (
                                <Card className="border-none shadow-md">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">สรุปตามโมดูล</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {moduleSummary.map(({ title, selected, total }) => (
                                            <div key={title} className="flex items-center justify-between text-xs">
                                                <span className="truncate pr-2">{title}</span>
                                                <Badge variant="outline">{selected}/{total}</Badge>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <Card className="border-none shadow-md">
                                <CardHeader className="pb-4">
                                    <CardTitle>เลือกการเข้าถึงเมนู</CardTitle>
                                    <CardDescription>
                                        ติ๊กที่โมดูลหลักเพื่อเลือกทั้งกลุ่ม — ขยายเมนูย่อยเพื่อเลือกรายการเฉพาะ
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <RoleAccessMenuPicker
                                        menuTree={accessMenuTree}
                                        extraPermissions={extraPermissions}
                                        selected={data.permissions}
                                        onChange={(permissions) => setData('permissions', permissions)}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
