import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Search, CheckCircle, Clock, File, Filter, MoreHorizontal, Eye, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface QualityDocument {
    id: number;
    title: string;
    document_number: string;
    category: string;
    status: string;
    created_at: string;
    owner?: {
        name: string;
    };
    department?: {
        name: string;
    };
}

interface Department {
    id: number;
    name: string;
}

interface Props {
    documents: {
        data: QualityDocument[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
        from: number;
        to: number;
    };
    departments: Department[];
    filters: {
        search?: string;
        department_id?: string;
    };
    stats: {
        total: number;
        published: number;
        review: number;
        draft: number;
    };
}

export default function Index({ documents, departments, filters, stats }: Props) {
    const { get } = useForm();
    const [search, setSearch] = React.useState(filters.search || '');
    const [departmentId, setDepartmentId] = React.useState(filters.department_id || 'all');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('quality-docs.index'), { 
            search, 
            department_id: departmentId === 'all' ? '' : departmentId 
        }, { preserveState: true });
    };

    const handleDepartmentChange = (val: string) => {
        setDepartmentId(val);
        router.get(route('quality-docs.index'), { 
            search, 
            department_id: val === 'all' ? '' : val 
        }, { preserveState: true });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'published':
                return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> ใช้งานจริง</Badge>;
            case 'review':
                return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Clock className="w-3 h-3 mr-1" /> รออนุมัติ</Badge>;
            case 'draft':
                return <Badge variant="secondary"><File className="w-3 h-3 mr-1" /> ฉบับร่าง</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'เอกสารคุณภาพ', href: '/quality-docs' },
            ]}
        >
            <Head title="เอกสารคุณภาพ" />
            
            <div className="p-6 space-y-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">ระบบเอกสารคุณภาพ</h1>
                        <p className="text-muted-foreground mt-1">จัดการเอกสารคุณภาพ HA, JCI และมาตรฐานอื่นๆ ของโรงพยาบาล</p>
                    </div>
                    <Button asChild className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                        <Link href={route('quality-docs.create')}>
                            <Plus className="mr-2 h-4 w-4" />
                            เพิ่มเอกสารใหม่
                        </Link>
                    </Button>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link href={route('quality-docs.index')}>
                            <Card className="bg-white dark:bg-gray-800 shadow-sm border-l-4 border-l-blue-500 hover:bg-blue-50/50 transition-colors cursor-pointer">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">เอกสารทั้งหมด</p>
                                        <h3 className="text-2xl font-bold mt-1">{stats.total}</h3>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                        
                        <Link href={route('quality-docs.index', { status: 'published' })}>
                            <Card className="bg-white dark:bg-gray-800 shadow-sm border-l-4 border-l-green-500 hover:bg-green-50/50 transition-colors cursor-pointer">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">ใช้งานจริง</p>
                                        <h3 className="text-2xl font-bold mt-1">{stats.published}</h3>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <CheckCircle className="h-5 w-5" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href={route('quality-docs.index', { status: 'review' })}>
                            <Card className="bg-white dark:bg-gray-800 shadow-sm border-l-4 border-l-yellow-500 hover:bg-yellow-50/50 transition-colors cursor-pointer">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">รออนุมัติ</p>
                                        <h3 className="text-2xl font-bold mt-1">{stats.review}</h3>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href={route('quality-docs.index', { status: 'draft' })}>
                            <Card className="bg-white dark:bg-gray-800 shadow-sm border-l-4 border-l-gray-500 hover:bg-gray-50/50 transition-colors cursor-pointer">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">ฉบับร่าง</p>
                                        <h3 className="text-2xl font-bold mt-1">{stats.draft}</h3>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                                        <File className="h-5 w-5" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                )}

                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Filter className="w-5 h-5 text-gray-500" />
                                รายการเอกสาร
                            </CardTitle>
                            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                                <div className="relative w-full md:w-[250px]">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <form onSubmit={handleSearch}>
                                        <Input
                                            type="search"
                                            placeholder="ค้นหาชื่อ หรือ รหัสเอกสาร..."
                                            className="pl-9"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </form>
                                </div>
                                <Select value={departmentId} onValueChange={handleDepartmentChange}>
                                    <SelectTrigger className="w-full md:w-[200px]">
                                        <SelectValue placeholder="กรองตามแผนก" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ทุกแผนก</SelectItem>
                                        {departments.map(dept => (
                                            <SelectItem key={dept.id} value={dept.id.toString()}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader className="bg-gray-50 dark:bg-gray-900">
                                    <TableRow>
                                        <TableHead className="w-[150px]">รหัสเอกสาร</TableHead>
                                        <TableHead>ชื่อเอกสาร</TableHead>
                                        <TableHead>หมวดหมู่</TableHead>
                                        <TableHead>แผนก</TableHead>
                                        <TableHead>สถานะ</TableHead>
                                        <TableHead className="text-right">จัดการ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documents.data.length > 0 ? (
                                        documents.data.map((doc) => (
                                            <TableRow key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <TableCell className="font-medium text-blue-600">
                                                    <Link href={route('quality-docs.show', { id: doc.id })} className="hover:underline">
                                                        {doc.document_number}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{doc.title}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {new Date(doc.created_at).toLocaleDateString('th-TH')}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-normal">
                                                        {doc.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{doc.department?.name || '-'}</TableCell>
                                                <TableCell>{getStatusBadge(doc.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>การจัดการ</DropdownMenuLabel>
                                                            <DropdownMenuItem asChild>
                                                                <Link href={route('quality-docs.show', { id: doc.id })} className="cursor-pointer">
                                                                    <Eye className="mr-2 h-4 w-4" /> ดูรายละเอียด
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => window.open(route('quality-docs.download', { id: doc.id }), '_blank')} className="cursor-pointer">
                                                                <Download className="mr-2 h-4 w-4" /> ดาวน์โหลด
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                ไม่พบเอกสารที่ค้นหา
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {documents.links.length > 3 && (
                            <div className="flex items-center justify-between space-x-2 py-4">
                                <div className="text-sm text-muted-foreground">
                                    แสดง {documents.from} ถึง {documents.to} จาก {documents.total} รายการ
                                </div>
                                <div className="flex gap-1">
                                    {documents.links.map((link, i) => (
                                        <Button
                                            key={i}
                                            variant={link.active ? "default" : "outline"}
                                            size="sm"
                                            asChild={!link.url}
                                            disabled={!link.url}
                                            onClick={() => link.url && router.get(link.url, { search, department_id: departmentId }, { preserveState: true })}
                                            className={!link.url ? "pointer-events-none opacity-50" : ""}
                                        >
                                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
