import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, Calendar, User, ArrowLeft } from 'lucide-react';

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

const breadcrumbs = [
    { title: 'KM', href: '/km/dashboard' },
    { title: 'Assets', href: '/km/assets' },
    { title: 'View', href: '#' },
];

export default function KmAssetsShow({ asset }: Props) {
    const downloadUrl = `/storage/${asset.file_path}`; // Simplified, ideally use a route

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={asset.title} />

            <div className="container mx-auto p-6 max-w-4xl">
                <Button variant="ghost" className="mb-4" asChild>
                    <Link href={route('km.assets.index')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> กลับหน้ารายการ
                    </Link>
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-start mb-2">
                                    <Badge>{asset.category}</Badge>
                                    <span className="text-sm text-muted-foreground">{new Date(asset.created_at).toLocaleDateString('th-TH')}</span>
                                </div>
                                <CardTitle className="text-2xl">{asset.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-muted/30 p-6 rounded-lg border flex items-center gap-4">
                                    <div className="h-16 w-16 bg-background rounded-lg border flex items-center justify-center shadow-sm">
                                        <span className="text-xl font-bold uppercase text-primary">{asset.file_type}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium">เอกสารแนบ</h3>
                                        <p className="text-sm text-muted-foreground">คลิกปุ่มด้านขวาเพื่อดาวน์โหลด</p>
                                    </div>
                                    <Button asChild size="lg">
                                        <a href={downloadUrl} target="_blank" rel="noopener noreferrer" download>
                                            <Download className="mr-2 h-5 w-5" /> ดาวน์โหลด
                                        </a>
                                    </Button>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2">รายละเอียด</h3>
                                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                        {asset.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                                    </p>
                                </div>

                                {asset.tags && asset.tags.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold mb-2 text-sm">Tags</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {asset.tags.map((tag, index) => (
                                                <Badge key={index} variant="secondary" className="font-normal">
                                                    #{tag.trim()}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">ข้อมูลเอกสาร</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4" /> ผู้จัดทำ</span>
                                    <span className="font-medium">{asset.uploader.name}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> วันที่เผยแพร่</span>
                                    <span className="font-medium">{new Date(asset.created_at).toLocaleDateString('th-TH')}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2"><Eye className="h-4 w-4" /> จำนวนเข้าชม</span>
                                    <span className="font-medium">{asset.views} ครั้ง</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2"><Download className="h-4 w-4" /> จำนวนดาวน์โหลด</span>
                                    <span className="font-medium">{asset.downloads} ครั้ง</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
