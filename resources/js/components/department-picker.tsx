import { useMemo, useState } from 'react';
import { Building2, Search, Star, X } from 'lucide-react';

import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface DepartmentOption {
    id: number;
    name: string;
}

export default function DepartmentPicker({
    departments,
    selectedIds,
    primaryId,
    onToggle,
    onRemove,
    onSetPrimary,
    error,
}: {
    departments: DepartmentOption[];
    selectedIds: number[];
    primaryId: number | null;
    onToggle: (id: number) => void;
    onRemove: (id: number) => void;
    onSetPrimary: (id: number) => void;
    error?: string;
}) {
    const [searchQuery, setSearchQuery] = useState('');

    const selectedDepartments = departments.filter((dept) => selectedIds.includes(dept.id));
    const filteredDepartments = useMemo(
        () => departments.filter((dept) => dept.name.toLowerCase().includes(searchQuery.toLowerCase())),
        [departments, searchQuery],
    );

    return (
        <div className="space-y-2">
            <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                แผนก/หน่วยงาน (เลือกได้หลายแผนก)
            </Label>

            {selectedDepartments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                    {selectedDepartments.map((dept) => (
                        <Badge
                            key={dept.id}
                            variant={primaryId === dept.id ? 'default' : 'secondary'}
                            className="flex cursor-pointer items-center gap-1 px-3 py-1.5 hover:opacity-80"
                            onClick={() => onSetPrimary(dept.id)}
                        >
                            {primaryId === dept.id && <Star className="h-3 w-3 fill-current" />}
                            {dept.name}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(dept.id);
                                }}
                                className="ml-1 hover:text-red-500"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            <div className="overflow-hidden rounded-lg border">
                <div className="relative">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="ค้นหาแผนก..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="rounded-none border-0 border-b pl-10 focus-visible:ring-0"
                    />
                </div>
                <div className="max-h-48 overflow-y-auto">
                    {filteredDepartments.map((dept) => (
                        <label
                            key={dept.id}
                            className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                            <Checkbox checked={selectedIds.includes(dept.id)} onCheckedChange={() => onToggle(dept.id)} />
                            <span className="flex-1 text-sm">{dept.name}</span>
                            {selectedIds.includes(dept.id) && primaryId === dept.id && (
                                <Star className="h-4 w-4 fill-current text-yellow-500" />
                            )}
                        </label>
                    ))}
                    {filteredDepartments.length === 0 && (
                        <div className="px-3 py-4 text-center text-sm text-gray-500">ไม่พบแผนกที่ค้นหา</div>
                    )}
                </div>
            </div>

            <p className="text-xs text-gray-500">
                <Star className="mr-1 inline-block h-3 w-3 fill-current text-yellow-500" />
                คลิกที่ชื่อแผนกที่เลือกเพื่อตั้งเป็นแผนกหลัก · เลือกแล้ว {selectedIds.length} แผนก
            </p>
            {selectedIds.length === 0 && <p className="text-sm text-red-500">กรุณาเลือกแผนกอย่างน้อย 1 แผนก</p>}
            <InputError message={error} />
        </div>
    );
}
