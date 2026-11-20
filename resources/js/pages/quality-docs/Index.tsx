import React from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
    Plus,
    FileText,
    Search,
    CheckCircle,
    Clock,
    File,
    Eye,
    Download,
    MoreHorizontal,
    BookOpen,
    Paperclip,
    Filter,
    Edit3,
    Trash2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { QualityPage, StatCard, Panel, StatusPill, EmptyState, qualityInput } from '@/components/quality/quality-ui';
import DocsSubNav from '@/pages/quality-docs/DocsSubNav';
import { cn } from '@/lib/utils';
import FilePreviewModal, { PreviewTarget } from '@/pages/quality-docs/FilePreviewModal';

interface QualityDocument {
    id: number;
    title: string;
    document_number: string;
    category: string;
    document_type: string;
    status: string;
    created_at: string;
    owner_id?: number;
    file_path?: string;
    url?: string;
    owner?: {
        id?: number;
        name: string;
    };
    department?: {
        name: string;
    };
    attachments?: Array<{
        id: number;
        file_name: string;
        original_name?: string;
        file_path?: string;
        url?: string;
        file_extension?: string;
        formatted_size?: string;
        icon_type?: string;
    }>;
}

interface Department {
    id: number;
    name: string;
}

interface TaxonomyOption {
    code: string;
    name: string;
    color: string;
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
    standards?: TaxonomyOption[];
    documentTypes?: TaxonomyOption[];
    filters: {
        search?: string;
        department_id?: string;
        category?: string;
        document_type?: string;
        status?: string;
    };
    stats: {
        total: number;
        published: number;
        review: number;
        draft: number;
    };
    canManageSettings?: boolean;
}

export default function Index({
    documents,
    departments,
    standards = [],
    documentTypes = [],
    filters,
    stats,
    canManageSettings = false,
}: Props) {
    const { auth } = usePage().props as unknown as { auth?: { user?: { roles?: string[]; id?: number } } };
    const userRoles = auth?.user?.roles || [];
    const userCanManage = canManageSettings || userRoles.some(role =>
        ['admin', 'Admin', 'Super Admin', 'ผู้ดูแลระบบ', 'superuser', 'superUser', 'SuperUser', 'header', 'Header', 'boss', 'Boss']
            .some(allowed => allowed.toLowerCase() === role.toLowerCase())
    );

    const [search, setSearch] = React.useState(filters.search || '');
    const [departmentId, setDepartmentId] = React.useState(filters.department_id || 'all');
    const [category, setCategory] = React.useState(filters.category || 'all');
    const [documentType, setDocumentType] = React.useState(filters.document_type || 'all');
    const [deletingDoc, setDeletingDoc] = React.useState<QualityDocument | null>(null);
    const [previewTarget, setPreviewTarget] = React.useState<PreviewTarget | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

    const handleConfirmDelete = () => {
        if (!deletingDoc) return;
        router.delete(route('quality-docs.destroy', { qualityDoc: deletingDoc.id }), {
            onSuccess: () => setDeletingDoc(null),
        });
    };

    const executeFilter = (newParams: Partial<typeof filters>) => {
        router.get(
            route('quality-docs.index'),
            {
                search: newParams.search !== undefined ? newParams.search : search,
                department_id: (newParams.department_id !== undefined ? newParams.department_id : departmentId) === 'all' ? '' : (newParams.department_id || departmentId),
                category: (newParams.category !== undefined ? newParams.category : category) === 'all' ? '' : (newParams.category || category),
                document_type: (newParams.document_type !== undefined ? newParams.document_type : documentType) === 'all' ? '' : (newParams.document_type || documentType),
                status: filters.status || '',
            },
            { preserveState: true }
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        executeFilter({ search });
    };

    const handleDepartmentChange = (val: string) => {
        setDepartmentId(val);
        executeFilter({ department_id: val });
    };

    const handleCategoryChange = (val: string) => {
        setCategory(val);
        executeFilter({ category: val });
    };

    const handleTypeChange = (val: string) => {
        setDocumentType(val);
        executeFilter({ document_type: val });
    };

    const handleResetFilters = () => {
        setSearch('');
        setDepartmentId('all');
        setCategory('all');
        setDocumentType('all');
        router.get(route('quality-docs.index'));
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

    const hasActiveFilters = search || (departmentId && departmentId !== 'all') || (category && category !== 'all') || (documentType && documentType !== 'all');

    return (
        <QualityPage
            tone="blue"
            icon={BookOpen}
            badge="ศูนย์พัฒนาคุณภาพ · เอกสาร"
            title="ระบบเอกสารคุณภาพ"
            subtitle="ศูนย์รวมเอกสารคุณภาพ HA, JCI, ISO และมาตรฐานโรงพยาบาล"
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
                title="รายการเอกสารคุณภาพ"
                description="ค้นหาและกรองเอกสารตามมาตรฐาน แผนก และประเภทเอกสาร"
            >
                {/* Filter Controls Bar */}
                <div className="mb-6 flex flex-wrap items-center gap-3">
                    <form onSubmit={handleSearch} className="relative min-w-[220px] flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            placeholder="ค้นหาชื่อ หรือ รหัสเอกสาร..."
                            className={cn(qualityInput, 'w-full pl-9')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </form>

                    <Select value={departmentId} onValueChange={handleDepartmentChange}>
                        <SelectTrigger className="w-[180px] rounded-xl">
                            <SelectValue placeholder="ทุกแผนก" />
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

                    <Select value={category} onValueChange={handleCategoryChange}>
                        <SelectTrigger className="w-[170px] rounded-xl">
                            <SelectValue placeholder="ทุกมาตรฐาน" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">ทุกมาตรฐาน (Category)</SelectItem>
                            {standards.map((st) => (
                                <SelectItem key={st.code} value={st.code}>
                                    {st.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={documentType} onValueChange={handleTypeChange}>
                        <SelectTrigger className="w-[170px] rounded-xl">
                            <SelectValue placeholder="ทุกประเภทเอกสาร" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">ทุกประเภทเอกสาร</SelectItem>
                            {documentTypes.map((dt) => (
                                <SelectItem key={dt.code} value={dt.code}>
                                    {dt.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResetFilters}
                            className="rounded-xl text-xs text-slate-500 hover:text-slate-800"
                        >
                            ล้างตัวกรอง
                        </Button>
                    )}
                </div>

                {documents.data.length === 0 ? (
                    <EmptyState
                        text="ไม่พบเอกสารคุณภาพตามเงื่อนไขที่ค้นหา"
                        action={
                            hasActiveFilters ? (
                                <Button
                                    variant="outline"
                                    onClick={handleResetFilters}
                                    className="mt-3 rounded-xl"
                                >
                                    ล้างตัวกรองการค้นหา
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                    <th className="py-2.5 pr-3">รหัสเอกสาร</th>
                                    <th className="py-2.5 pr-3">ชื่อเอกสาร</th>
                                    <th className="py-2.5 pr-3">หมวดหมู่มาตรฐาน</th>
                                    <th className="py-2.5 pr-3">ประเภท</th>
                                    <th className="py-2.5 pr-3">แผนก</th>
                                    <th className="py-2.5 pr-3 text-center">ไฟล์แนบ</th>
                                    <th className="py-2.5 pr-3 text-center">สถานะ</th>
                                    <th className="py-2.5 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.data.map((doc) => {
                                    const attachmentCount = (doc.attachments && doc.attachments.length > 0)
                                        ? doc.attachments.length
                                        : (doc.file_path ? 1 : 0);
                                    return (
                                        <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="py-3 pr-3 font-mono font-medium text-blue-600">
                                                <Link href={route('quality-docs.show', { qualityDoc: doc.id })} className="hover:underline">
                                                    {doc.document_number}
                                                </Link>
                                            </td>
                                            <td className="py-3 pr-3">
                                                <div className="font-medium text-slate-800">{doc.title}</div>
                                                <div className="text-xs text-slate-400">
                                                    {new Date(doc.created_at).toLocaleDateString('th-TH')}
                                                    {doc.owner && ` · โดย ${doc.owner.name}`}
                                                </div>
                                            </td>
                                            <td className="py-3 pr-3">
                                                <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                                                    {doc.category}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-3">
                                                <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                                                    {doc.document_type || '-'}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-3 text-slate-500">{doc.department?.name || '-'}</td>
                                            <td className="py-3 pr-3 text-center">
                                                {attachmentCount > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const first = doc.attachments?.[0];
                                                            if (first) {
                                                                setPreviewTarget({
                                                                    url: (first as any).url || `/storage/${(first as any).file_path?.replace(/^\//, '')}`,
                                                                    fileName: first.original_name || first.file_name,
                                                                    fileExtension: (first as any).file_extension || first.file_name.split('.').pop(),
                                                                    fileSize: (first as any).formatted_size,
                                                                    iconType: (first as any).icon_type,
                                                                    downloadUrl: route('quality-docs.attachments.download', { qualityDoc: doc.id, attachment: first.id }),
                                                                });
                                                                setIsPreviewOpen(true);
                                                            }
                                                        }}
                                                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium cursor-pointer transition-colors"
                                                        title="คลิกเพื่อดูตัวอย่างไฟล์"
                                                    >
                                                        <Paperclip className="h-3 w-3 text-blue-600" />
                                                        {attachmentCount}
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 pr-3 text-center">{getStatusPill(doc.status)}</td>
                                            <td className="py-3 text-right">
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
                                                            <Link href={route('quality-docs.show', { qualityDoc: doc.id })} className="cursor-pointer">
                                                                <FileText className="mr-2 h-4 w-4" /> ดูรายละเอียด
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        {(attachmentCount > 0 || doc.file_path) && (
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    const first = doc.attachments?.[0];
                                                                    if (first) {
                                                                        setPreviewTarget({
                                                                            url: (first as any).url || `/storage/${(first as any).file_path?.replace(/^\//, '')}`,
                                                                            fileName: first.original_name || first.file_name,
                                                                            fileExtension: (first as any).file_extension || first.file_name.split('.').pop(),
                                                                            fileSize: (first as any).formatted_size,
                                                                            iconType: (first as any).icon_type,
                                                                            downloadUrl: route('quality-docs.attachments.download', { qualityDoc: doc.id, attachment: first.id }),
                                                                        });
                                                                        setIsPreviewOpen(true);
                                                                    } else if (doc.file_path) {
                                                                        setPreviewTarget({
                                                                            url: doc.url || `/storage/${doc.file_path.replace(/^\//, '')}`,
                                                                            fileName: `${doc.document_number}_ไฟล์ตั้งต้น`,
                                                                            fileExtension: doc.file_path.split('.').pop(),
                                                                            downloadUrl: route('quality-docs.download', { qualityDoc: doc.id }),
                                                                        });
                                                                        setIsPreviewOpen(true);
                                                                    }
                                                                }}
                                                                className="cursor-pointer text-blue-600 focus:text-blue-700 font-medium"
                                                            >
                                                                <Eye className="mr-2 h-4 w-4" /> ดูตัวอย่างเอกสาร
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            onClick={() => window.open(route('quality-docs.download', { qualityDoc: doc.id }), '_blank')}
                                                            className="cursor-pointer"
                                                        >
                                                            <Download className="mr-2 h-4 w-4" /> ดาวน์โหลดเอกสาร
                                                        </DropdownMenuItem>
                                                        {(userCanManage || (auth?.user?.id && auth.user.id === doc.owner_id)) && (
                                                            <>
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={route('quality-docs.edit', { qualityDoc: doc.id })} className="cursor-pointer text-blue-600 focus:text-blue-700">
                                                                        <Edit3 className="mr-2 h-4 w-4" /> แก้ไขเอกสาร
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => setDeletingDoc(doc)}
                                                                    className="cursor-pointer text-rose-600 focus:text-rose-700"
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" /> ลบเอกสาร
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    );
                                })}
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
                                    onClick={() => link.url && router.get(link.url, {
                                        search,
                                        department_id: departmentId === 'all' ? '' : departmentId,
                                        category: category === 'all' ? '' : category,
                                        document_type: documentType === 'all' ? '' : documentType,
                                    }, { preserveState: true })}
                                    className={cn('rounded-xl', !link.url && 'pointer-events-none opacity-50', link.active && 'bg-blue-600 hover:bg-blue-700')}
                                >
                                    <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </Panel>

            {/* Delete Document Dialog */}
            <Dialog open={!!deletingDoc} onOpenChange={(open) => !open && setDeletingDoc(null)}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                            <Trash2 className="h-5 w-5" />
                        </div>
                        <DialogTitle>ยืนยันการลบเอกสาร</DialogTitle>
                        <DialogDescription>
                            คุณแน่ใจหรือไม่ว่าต้องการลบเอกสาร &quot;{deletingDoc?.document_number} - {deletingDoc?.title}&quot; ออกจากระบบ?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setDeletingDoc(null)} className="rounded-xl">
                            ยกเลิก
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleConfirmDelete} className="rounded-xl">
                            ยืนยันการลบ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* File Preview Modal */}
            <FilePreviewModal
                target={previewTarget}
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
            />
        </QualityPage>
    );
}
