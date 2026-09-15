import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search, FileText, Download, Eye, Upload } from 'lucide-react';
import {
    QualityPage,
    Panel,
    StatusPill,
    EmptyState,
} from '@/components/quality/quality-ui';
import KmSubNav from '@/pages/KM/KmSubNav';

interface Asset {
    id: number;
    title: string;
    description: string;
    file_type: string;
    category: string;
    views: number;
    downloads: number;
    created_at: string;
    uploader: { name: string };
}

interface Props {
    assets: {
        data: Asset[];
        links: any[];
    };
    filters: {
        search?: string;
        category?: string;
    };
}

const breadcrumbs = [
    { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
    { title: 'KM', href: route('km.dashboard') },
    { title: 'คลังความรู้', href: route('km.assets.index') },
];

export default function KmAssetsIndex({ assets, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [category, setCategory] = useState(filters.category || 'all');

    const handleSearch = () => {
        router.get(
            route('km.assets.index'),
            {
                search,
                category: category === 'all' ? undefined : category,
            },
            { preserveState: true },
        );
    };

    return (
        <QualityPage
            tone="amber"
            icon={FileText}
            badge="ศูนย์พัฒนาคุณภาพ · KM"
            title="คลังความรู้ (Knowledge Assets)"
            subtitle="ค้นหาและดาวน์โหลดเอกสาร คู่มือ และสื่อความรู้"
            breadcrumbs={breadcrumbs}
            headTitle="Knowledge Assets"
            subNav={<KmSubNav active="km.assets.index" />}
            actions={
                <Button asChild className="rounded-xl bg-amber-600 hover:bg-amber-700">
                    <Link href={route('km.assets.create')}>
                        <Upload className="mr-2 h-4 w-4" /> อัปโหลดเอกสาร
                    </Link>
                </Button>
            }
        >
            <Panel title="ค้นหาเอกสาร" description="กรองตามชื่อและหมวดหมู่">
                <div className="flex flex-col gap-3 md:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="ค้นหาชื่อเอกสาร..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="rounded-xl pl-9"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <Select
                            value={category}
                            onValueChange={(val) => {
                                setCategory(val);
                                setTimeout(handleSearch, 100);
                            }}
                        >
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="หมวดหมู่" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">ทั้งหมด</SelectItem>
                                <SelectItem value="Manual">คู่มือ (Manual)</SelectItem>
                                <SelectItem value="Procedure">ระเบียบปฏิบัติ (Procedure)</SelectItem>
                                <SelectItem value="Research">งานวิจัย (Research)</SelectItem>
                                <SelectItem value="Form">แบบฟอร์ม (Form)</SelectItem>
                                <SelectItem value="Other">อื่นๆ</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button className="rounded-xl bg-amber-600 hover:bg-amber-700" onClick={handleSearch}>
                        ค้นหา
                    </Button>
                </div>
            </Panel>

            {assets.data.length === 0 ? (
                <Panel title="ผลการค้นหา">
                    <EmptyState text="ไม่พบเอกสารที่ค้นหา" />
                </Panel>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {assets.data.map((asset) => (
                        <div
                            key={asset.id}
                            className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:shadow-md"
                        >
                            <div className="mb-3 flex items-start justify-between">
                                <StatusPill
                                    label={asset.category || 'General'}
                                    className="border-amber-200 bg-amber-50 text-amber-700"
                                />
                                <span className="rounded border border-slate-200 px-1.5 text-[10px] uppercase text-slate-500">
                                    {asset.file_type}
                                </span>
                            </div>
                            <h3 className="mb-2 line-clamp-2 text-base font-bold text-slate-900">
                                <Link
                                    href={route('km.assets.show', asset.id)}
                                    className="hover:text-amber-700"
                                >
                                    {asset.title}
                                </Link>
                            </h3>
                            <p className="mb-4 line-clamp-3 h-10 text-sm text-slate-500">
                                {asset.description || 'ไม่มีรายละเอียด'}
                            </p>
                            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-400">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                        <Eye className="h-3 w-3" /> {asset.views}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Download className="h-3 w-3" /> {asset.downloads}
                                    </span>
                                </div>
                                <span>{new Date(asset.created_at).toLocaleDateString('th-TH')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </QualityPage>
    );
}
