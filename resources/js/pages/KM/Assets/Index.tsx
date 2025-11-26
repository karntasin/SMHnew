import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Download, Eye, Upload, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    { title: 'KM', href: '/km/dashboard' },
    { title: 'Knowledge Assets', href: '#' },
];

export default function KmAssetsIndex({ assets, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [category, setCategory] = useState(filters.category || 'all');

    const handleSearch = () => {
        router.get(route('km.assets.index'), { 
            search, 
            category: category === 'all' ? undefined : category 
        }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Knowledge Assets" />

            <div className="container mx-auto p-6 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">คลังความรู้ (Knowledge Assets)</h1>
                        <p className="text-muted-foreground">ค้นหาและดาวน์โหลดเอกสาร คู่มือ และสื่อความรู้</p>
                    </div>
                    <Button asChild>
                        <Link href={route('km.assets.create')}>
                            <Upload className="mr-2 h-4 w-4" /> อัปโหลดเอกสาร
                        </Link>
                    </Button>
                </div>

                <Card className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="ค้นหาชื่อเอกสาร..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <Select value={category} onValueChange={(val) => { setCategory(val); setTimeout(handleSearch, 100); }}>
                                <SelectTrigger>
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
                        <Button onClick={handleSearch}>ค้นหา</Button>
                    </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assets.data.map((asset) => (
                        <Card key={asset.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <Badge variant="outline">{asset.category || 'General'}</Badge>
                                    <span className="text-xs text-muted-foreground uppercase border px-1 rounded">{asset.file_type}</span>
                                </div>
                                <CardTitle className="line-clamp-2 text-lg mt-2">
                                    <Link href={route('km.assets.show', asset.id)} className="hover:underline">
                                        {asset.title}
                                    </Link>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 h-10">
                                    {asset.description || 'ไม่มีรายละเอียด'}
                                </p>
                                <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {asset.views}</span>
                                        <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {asset.downloads}</span>
                                    </div>
                                    <span>{new Date(asset.created_at).toLocaleDateString('th-TH')}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                
                {assets.data.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        ไม่พบเอกสารที่ค้นหา
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
