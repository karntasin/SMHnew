import React from 'react';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Calendar, User, ArrowLeft } from 'lucide-react';
import { storageUrl } from '@/lib/asset';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import KmSubNav from '@/pages/KM/KmSubNav';

interface Asset {
    id: number;
    title: string;
    description: string;
    file_path: string;
    file_type: string;
    category: string;
    tags: string[];
    views: number;
    downloads: number;
    created_at: string;
    uploader: { name: string };
}

interface Props {
    asset: Asset;
}

export default function KmAssetsShow({ asset }: Props) {
    const downloadUrl = storageUrl(asset.file_path);

    const breadcrumbs = [
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'KM', href: route('km.dashboard') },
        { title: 'คลังความรู้', href: route('km.assets.index') },
        { title: asset.title, href: route('km.assets.show', asset.id) },
    ];

    return (
        <QualityPage
            tone="amber"
            icon={FileText}
            badge="ศูนย์พัฒนาคุณภาพ · KM"
            title={asset.title}
            subtitle={asset.category}
            breadcrumbs={breadcrumbs}
            subNav={<KmSubNav active="km.assets.index" />}
            actions={
                <Button variant="outline" className="rounded-xl" asChild>
                    <Link href={route('km.assets.index')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> กลับหน้ารายการ
                    </Link>
                </Button>
            }
        >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="space-y-6 md:col-span-2">
                    <Panel title="เอกสารแนบ" description="ดาวน์โหลดไฟล์เอกสาร">
                        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
                            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-bold uppercase text-amber-700 shadow-sm">
                                {asset.file_type}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-slate-800">เอกสารแนบ</h3>
                                <p className="text-sm text-slate-500">คลิกปุ่มด้านขวาเพื่อดาวน์โหลด</p>
                            </div>
                            <Button asChild size="lg" className="rounded-xl bg-amber-600 hover:bg-amber-700">
                                <a href={downloadUrl} target="_blank" rel="noopener noreferrer" download>
                                    <Download className="mr-2 h-5 w-5" /> ดาวน์โหลด
                                </a>
                            </Button>
                        </div>
                    </Panel>

                    <Panel title="รายละเอียด" description="คำอธิบายเอกสาร">
                        <p className="whitespace-pre-wrap leading-relaxed text-slate-600">
                            {asset.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                        </p>

                        {asset.tags && asset.tags.length > 0 && (
                            <div className="mt-5 border-t border-slate-100 pt-4">
                                <h3 className="mb-2 text-sm font-semibold text-slate-700">Tags</h3>
                                <div className="flex flex-wrap gap-2">
                                    {asset.tags.map((tag, index) => (
                                        <StatusPill
                                            key={index}
                                            label={`#${tag.trim()}`}
                                            className="border-slate-200 bg-slate-50 text-slate-600"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </Panel>
                </div>

                <Panel title="ข้อมูลเอกสาร" description="รายละเอียดเผยแพร่">
                    <div className="space-y-4 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-slate-500">
                                <User className="h-4 w-4" /> ผู้จัดทำ
                            </span>
                            <span className="font-medium text-slate-800">{asset.uploader.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-slate-500">
                                <Calendar className="h-4 w-4" /> วันที่เผยแพร่
                            </span>
                            <span className="font-medium text-slate-800">
                                {new Date(asset.created_at).toLocaleDateString('th-TH')}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-slate-500">
                                <Eye className="h-4 w-4" /> จำนวนเข้าชม
                            </span>
                            <span className="font-medium text-slate-800">{asset.views} ครั้ง</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-slate-500">
                                <Download className="h-4 w-4" /> จำนวนดาวน์โหลด
                            </span>
                            <span className="font-medium text-slate-800">{asset.downloads} ครั้ง</span>
                        </div>
                    </div>
                </Panel>
            </div>
        </QualityPage>
    );
}
