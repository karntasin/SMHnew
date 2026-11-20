import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit2, Save, X, Building2, Users } from 'lucide-react';
import axios from 'axios';

interface SupportUnit {
    id?: number;
    unit_code: string;
    unit_name: string;
    location: string;
    g1: number;
    g2: number;
    g3: number;
    g4: number;
    g5: number;
    k1: number;
    k2: number;
    k3: number;
    k4: number;
    k5: number;
    c1: number;
    c3: number;
    c4: number;
    total?: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onUpdated?: () => void;
}

const emptyUnit: SupportUnit = {
    unit_code: '',
    unit_name: '',
    location: '',
    g1: 0,
    g2: 0,
    g3: 0,
    g4: 0,
    g5: 0,
    k1: 0,
    k2: 0,
    k3: 0,
    k4: 0,
    k5: 0,
    c1: 0,
    c3: 0,
    c4: 0,
};

export default function UnitManagementModal({ open, onClose, onUpdated }: Props) {
    const [units, setUnits] = useState<SupportUnit[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingUnit, setEditingUnit] = useState<SupportUnit | null>(null);

    const fetchUnits = async () => {
        setLoading(true);
        try {
            const res = await axios.get(route('admin-docs.amedstat.units'));
            setUnits(res.data.units || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchUnits();
            setEditingUnit(null);
        }
    }, [open]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUnit) return;

        try {
            await axios.post(route('admin-docs.amedstat.units.save'), editingUnit);
            fetchUnits();
            setEditingUnit(null);
            if (onUpdated) onUpdated();
        } catch (e) {
            alert('บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบข้อมูล');
        }
    };

    const handleDelete = async (id?: number) => {
        if (!id) return;
        if (!confirm('คุณต้องการลบหน่วยรับการสนับสนุนนี้ใช่หรือไม่?')) return;

        try {
            await axios.delete(route('admin-docs.amedstat.units.delete', { id }));
            fetchUnits();
            if (onUpdated) onUpdated();
        } catch (e) {
            alert('ลบข้อมูลไม่สำเร็จ');
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                        จัดการรายชื่อหน่วยและยอดกำลังพลสนับสนุน (รง.ผสต.6)
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-2">
                    {/* Add / Edit Form */}
                    {editingUnit ? (
                        <form onSubmit={handleSave} className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-3">
                            <div className="flex justify-between items-center mb-1">
                                <h4 className="font-semibold text-emerald-800 text-sm flex items-center gap-1.5">
                                    <Users className="w-4 h-4" />
                                    {editingUnit.id ? 'แก้ไขข้อมูลหน่วยทหาร' : 'เพิ่มหน่วยทหารใหม่'}
                                </h4>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingUnit(null)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <Label className="text-xs">รหัสหน่วย (5 หลัก)</Label>
                                    <Input
                                        value={editingUnit.unit_code}
                                        onChange={(e) => setEditingUnit({ ...editingUnit, unit_code: e.target.value })}
                                        placeholder="เช่น 10801"
                                        required
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">ชื่อหน่วยรับการสนับสนุน</Label>
                                    <Input
                                        value={editingUnit.unit_name}
                                        onChange={(e) => setEditingUnit({ ...editingUnit, unit_name: e.target.value })}
                                        placeholder="เช่น มทบ.17 หรือ ร.29"
                                        required
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">ที่ตั้ง / ค่าย</Label>
                                    <Input
                                        value={editingUnit.location}
                                        onChange={(e) => setEditingUnit({ ...editingUnit, location: e.target.value })}
                                        placeholder="เช่น ค่ายสุรสีห์ กาญจนบุรี"
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <p className="text-xs font-semibold text-gray-700 mb-1.5">ยอดกำลังพลตามประเภทบุคคล (คน):</p>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                    {(['g1', 'g2', 'g3', 'g4', 'g5', 'k1', 'k2', 'k3', 'k4', 'k5', 'c1', 'c3', 'c4'] as const).map((col) => (
                                        <div key={col}>
                                            <Label className="text-[11px] text-gray-600 uppercase font-medium">{col}</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={editingUnit[col]}
                                                onChange={(e) => setEditingUnit({ ...editingUnit, [col]: parseInt(e.target.value) || 0 })}
                                                className="h-7 text-xs text-center"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setEditingUnit(null)}>
                                    ยกเลิก
                                </Button>
                                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <Save className="w-3.5 h-3.5 mr-1" /> บันทึกหน่วย
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                onClick={() => setEditingUnit({ ...emptyUnit, unit_code: `108${String(units.length + 1).padStart(2, '0')}` })}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" /> เพิ่มหน่วยทหาร
                            </Button>
                        </div>
                    )}

                    {/* Table */}
                    <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-gray-50 text-gray-700 border-b">
                                <tr>
                                    <th className="p-2 border-r text-center w-12">ลำดับ</th>
                                    <th className="p-2 border-r w-24">รหัสหน่วย</th>
                                    <th className="p-2 border-r">ชื่อหน่วยรับการสนับสนุน</th>
                                    <th className="p-2 border-r">ที่ตั้ง</th>
                                    <th className="p-2 border-r text-right w-16">ก1</th>
                                    <th className="p-2 border-r text-right w-16">ก2</th>
                                    <th className="p-2 border-r text-right w-16">ข1</th>
                                    <th className="p-2 border-r text-right w-16">ค1</th>
                                    <th className="p-2 border-r text-right w-20 font-bold bg-emerald-50/50">รวมทั้งสิ้น</th>
                                    <th className="p-2 text-center w-20">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-gray-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} className="p-6 text-center text-gray-500">กำลังโหลดข้อมูล...</td>
                                    </tr>
                                ) : units.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="p-6 text-center text-gray-500">ยังไม่มีข้อมูลหน่วยรับการสนับสนุน</td>
                                    </tr>
                                ) : (
                                    units.map((u, i) => (
                                        <tr key={u.id || i} className="hover:bg-gray-50/80">
                                            <td className="p-2 border-r text-center">{i + 1}</td>
                                            <td className="p-2 border-r font-mono font-medium">{u.unit_code}</td>
                                            <td className="p-2 border-r font-semibold">{u.unit_name}</td>
                                            <td className="p-2 border-r text-gray-600">{u.location || '-'}</td>
                                            <td className="p-2 border-r text-right">{u.g1}</td>
                                            <td className="p-2 border-r text-right">{u.g2}</td>
                                            <td className="p-2 border-r text-right">{u.k1}</td>
                                            <td className="p-2 border-r text-right">{u.c1}</td>
                                            <td className="p-2 border-r text-right font-bold text-emerald-700 bg-emerald-50/30">
                                                {(u.total || (u.g1 + u.g2 + u.g3 + u.g4 + u.g5 + u.k1 + u.k2 + u.k3 + u.k4 + u.k5 + u.c1 + u.c3 + u.c4)).toLocaleString()}
                                            </td>
                                            <td className="p-2 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingUnit(u)}
                                                        className="p-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50"
                                                        title="แก้ไข"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(u.id)}
                                                        className="p-1 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                                                        title="ลบ"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <DialogFooter className="pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={onClose}>
                        ปิดหน้าต่าง
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
