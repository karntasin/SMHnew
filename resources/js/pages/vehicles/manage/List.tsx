import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Car } from 'lucide-react';

interface Vehicle {
    id: number;
    license_plate: string;
    brand: string;
    model: string;
    category?: {
        name: string;
        color: string;
    };
    status: 'available' | 'maintenance' | 'busy';
    seats: number;
    image?: string;
}

interface Props {
    vehicles: {
        data: Vehicle[];
        links: any[];
        current_page: number;
        last_page: number;
    };
    filters: {
        search?: string;
    };
}

export default function Index({ vehicles, filters }: Props) {
    const [search, setSearch] = React.useState(filters.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('vehicles.manage.index'), { search }, { preserveState: true });
    };

    const handleDelete = (id: number) => {
        if (confirm('คุณแน่ใจหรือไม่ที่จะลบรถคันนี้?')) {
            router.delete(route('vehicles.manage.destroy', { manage: id }));
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'available':
                return <Badge className="bg-green-500">ว่าง</Badge>;
            case 'maintenance':
                return <Badge className="bg-red-500">ซ่อมบำรุง</Badge>;
            case 'busy':
                return <Badge className="bg-yellow-500">ไม่ว่าง</Badge>;
            default:
                return <Badge className="bg-gray-500">{status}</Badge>;
        }
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบจองรถ', href: route('vehicles.bookings.index') },
            { title: 'จัดการรถ', href: route('vehicles.manage.index') }
        ]}>
            <Head title="จัดการรถ" />
            
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Car className="w-6 h-6" />
                        จัดการข้อมูลรถ
                    </h1>
                    <Link href={route('vehicles.manage.create')}>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            เพิ่มรถใหม่
                        </Button>
                    </Link>
                </div>

                <div className="bg-white p-4 rounded-lg shadow space-y-4">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <Input 
                            placeholder="ค้นหาทะเบียน, ยี่ห้อ, รุ่น..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="max-w-sm"
                        />
                        <Button type="submit" variant="outline">
                            <Search className="w-4 h-4 mr-2" />
                            ค้นหา
                        </Button>
                    </form>

                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>รูปภาพ</TableHead>
                                    <TableHead>ทะเบียน</TableHead>
                                    <TableHead>ยี่ห้อ/รุ่น</TableHead>
                                    <TableHead>ประเภท</TableHead>
                                    <TableHead>ที่นั่ง</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead className="text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vehicles.data.length > 0 ? (
                                    vehicles.data.map((vehicle) => (
                                        <TableRow key={vehicle.id}>
                                            <TableCell>
                                                {vehicle.image ? (
                                                    <img src={`/storage/${vehicle.image}`} alt={vehicle.license_plate} className="w-16 h-10 object-cover rounded" />
                                                ) : (
                                                    <div className="w-16 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                                                        <Car className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">{vehicle.license_plate}</TableCell>
                                            <TableCell>{vehicle.brand} {vehicle.model}</TableCell>
                                            <TableCell>
                                                {vehicle.category ? (
                                                    <Badge variant="outline" style={{ borderColor: vehicle.category.color, color: vehicle.category.color }}>
                                                        {vehicle.category.name}
                                                    </Badge>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>{vehicle.seats}</TableCell>
                                            <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Link href={route('vehicles.manage.edit', { manage: vehicle.id })}>
                                                    <Button variant="ghost" size="icon">
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(vehicle.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                            ไม่พบข้อมูลรถ
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    
                    {/* Simple Pagination */}
                    <div className="flex justify-center gap-2 mt-4">
                        {vehicles.links.map((link, i) => (
                            <Link
                                key={i}
                                href={link.url || '#'}
                                className={`px-3 py-1 border rounded ${link.active ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'} ${!link.url ? 'opacity-50 pointer-events-none' : ''}`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
