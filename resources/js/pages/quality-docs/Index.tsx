import React from 'react';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Search, CheckCircle, Clock, File, Eye, Download, MoreHorizontal, BookOpen } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { QualityPage, StatCard, Panel, StatusPill, EmptyState, qualityInput } from '@/components/quality/quality-ui';
import DocsSubNav from '@/pages/quality-docs/DocsSubNav';
import { cn } from '@/lib/utils';

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
    const [search, setSearch] = React.useState(filters.search || '');
    const [departmentId, setDepartmentId] = React.useState(filters.department_id || 'all');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('quality-docs.index'), {
            search,
            department_id: departmentId === 'all' ? '' : departmentId,
        }, { preserveState: true });
    };

    const handleDepartmentChange = (val: string) => {
        setDepartmentId(val);
        router.get(route('quality-docs.index'), {
            search,
            department_id: val === 'all' ? '' : val,
        }, { preserveState: true });
    };

    const getStatusPill = (status: string) => {
        switch (status) {
            case 'published':
                return <StatusPill label="ใช้งานจริง" className="border-emerald-200 bg-emerald-50 text-emerald-700" />;
            case 'review':
                return <StatusPill label="รออนุมัติ" className="border-amber-200 bg-amber-50 text-amber-700" />;
            case 'draft':
                return <StatusPill label="ฉบับร่าง" className="border-slate-200 bg-slate-50 text-slate-600" />;
            default:
                return <StatusPill label={status} className="border-slate-200 bg-slate-50 text-slate-500" />;
        }
    };

    const breadcrumbs = [
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'เอกสารคุณภาพ', href: '/quality-docs' },
    ];

    return (
        <QualityPage
            tone="blue"
            icon={BookOpen}
            badge="ศูนย์พัฒนาคุณภาพ · เอกสาร"
            title="ระบบเอกสารคุณภาพ"
            subtitle="จัดการเอกสารคุณภาพ HA, JCI และมาตรฐานอื่นๆ ของโรงพยาบาล"
            breadcrumbs={breadcrumbs}
            actions={
                <Button asChild className="rounded-xl bg-blue-600 hover:bg-blue-700">
                    <Link href={route('quality-docs.create')}>
                        <Plus className="mr-2 h-4 w-4" />
                        เพิ่มเอกสารใหม่
                    </Link>
                </Button>
            }
            subNav={<DocsSubNav active="quality-docs.index" />}
        >
            {stats && (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Link href={route('quality-docs.index')}>
                        <StatCard label="เอกสารทั้งหมด" value={stats.total} icon={FileText} tone="blue" />
                    </Link>
                    <Link href={route('quality-docs.index', { status: 'published' })}>
                        <StatCard label="ใช้งานจริง" value={stats.published} icon={CheckCircle} tone="emerald" />
                    </Link>
                    <Link href={route('quality-docs.index', { status: 'review' })}>
                        <StatCard label="รออนุมัติ" value={stats.review} icon={Clock} tone="amber" />
                    </Link>
                    <Link href={route('quality-docs.index', { status: 'draft' })}>
                        <StatCard label="ฉบับร่าง" value={stats.draft} icon={File} tone="slate" />
                    </Link>
                </div>
            )}

            <Panel
                title="รายการเอกสาร"
                description="ค้นหาและกรองเอกสารคุณภาพ"
                action={
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <form onSubmit={handleSearch} className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                placeholder="ค้นหาชื่อ หรือ รหัสเอกสาร..."
                                className={cn(qualityInput, 'w-full pl-9 sm:w-[250px]')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </form>
                        <Select value={departmentId} onValueChange={handleDepartmentChange}>
                            <SelectTrigger className="w-full rounded-xl sm:w-[200px]">
                                <SelectValue placeholder="กรองตามแผนก" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">ทุกแผนก</SelectItem>
                                {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id.toString()}>
                                        {dept.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                }
            >
                {documents.data.length === 0 ? (
                    <EmptyState text="ไม่พบเอกสารที่ค้นหา" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                    <th className="py-2 pr-3">รหัสเอกสาร</th>
                                    <th className="py-2 pr-3">ชื่อเอกสาร</th>
                                    <th className="py-2 pr-3">หมวดหมู่</th>
                                    <th className="py-2 pr-3">แผนก</th>
                                    <th className="py-2 pr-3">สถานะ</th>
                                    <th className="py-2 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.data.map((doc) => (
                                    <tr key={doc.id} className="border-b border-slate-50">
                                        <td className="py-2.5 pr-3 font-medium text-blue-600">
                                            <Link href={route('quality-docs.show', { id: doc.id })} className="hover:underline">
                                                {doc.document_number}
                                            </Link>
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <div className="font-medium text-slate-800">{doc.title}</div>
                                            <div className="text-xs text-slate-400">
                                                {new Date(doc.created_at).toLocaleDateString('th-TH')}
                                            </div>
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <StatusPill label={doc.category} className="border-slate-200 bg-slate-50 text-slate-600" />
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-500">{doc.department?.name || '-'}</td>
                                        <td className="py-2.5 pr-3">{getStatusPill(doc.status)}</td>
                                        <td className="py-2.5 text-right">
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
                                                    <DropdownMenuItem
                                                        onClick={() => window.open(route('quality-docs.download', { id: doc.id }), '_blank')}
                                                        className="cursor-pointer"
                                                    >
                                                        <Download className="mr-2 h-4 w-4" /> ดาวน์โหลด
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {documents.links.length > 3 && (
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                        <div className="text-sm text-slate-500">
                            แสดง {documents.from} ถึง {documents.to} จาก {documents.total} รายการ
                        </div>
                        <div className="flex gap-1">
                            {documents.links.map((link, i) => (
                                <Button
                                    key={i}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    asChild={!link.url}
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url, { search, department_id: departmentId }, { preserveState: true })}
                                    className={cn('rounded-xl', !link.url && 'pointer-events-none opacity-50', link.active && 'bg-blue-600 hover:bg-blue-700')}
                                >
                                    <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </Panel>
        </QualityPage>
    );
}
