import { useMemo, useState } from 'react';
import { Search, ShieldCheck, X } from 'lucide-react';

import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface HaTeamOption {
    id: number;
    abbreviation: string;
    name_th: string;
}

export default function HaTeamPicker({
    teams,
    selectedIds,
    onToggle,
    onRemove,
    error,
}: {
    teams: HaTeamOption[];
    selectedIds: number[];
    onToggle: (id: number) => void;
    onRemove: (id: number) => void;
    error?: string;
}) {
    const [searchQuery, setSearchQuery] = useState('');

    const selectedTeams = useMemo(
        () => teams.filter((t) => selectedIds.includes(t.id)),
        [teams, selectedIds],
    );

    const filteredTeams = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return teams;
        return teams.filter(
            (t) =>
                (t.abbreviation && t.abbreviation.toLowerCase().includes(query)) ||
                (t.name_th && t.name_th.toLowerCase().includes(query)),
        );
    }, [teams, searchQuery]);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>ทีม HA / คณะกรรมการคุณภาพ (เลือกได้หลายทีม)</span>
                </Label>
                <span className="text-xs text-muted-foreground font-normal">
                    (ไม่บังคับระบุ)
                </span>
            </div>

            {selectedTeams.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2 rounded-lg bg-emerald-50/60 p-3 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                    {selectedTeams.map((team) => (
                        <Badge
                            key={team.id}
                            variant="secondary"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-900 shadow-xs border border-emerald-200 dark:bg-gray-800 dark:text-emerald-200 dark:border-emerald-800"
                        >
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                {team.abbreviation}
                            </span>
                            <span className="max-w-[200px] truncate text-xs text-gray-600 dark:text-gray-300">
                                {team.name_th}
                            </span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(team.id);
                                }}
                                className="ml-1 rounded-full p-0.5 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-700 transition-colors"
                                title="ลบทีม"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            <div className="overflow-hidden rounded-lg border bg-card">
                <div className="relative">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="ค้นหาทีม HA (เช่น PCT, IC, RM, ENV, IM หรือชื่อไทย)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="rounded-none border-0 border-b pl-10 focus-visible:ring-0"
                    />
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredTeams.map((team) => {
                        const isChecked = selectedIds.includes(team.id);
                        return (
                            <label
                                key={team.id}
                                className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                                    isChecked ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                                }`}
                            >
                                <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => onToggle(team.id)}
                                />
                                <div className="flex-1 flex items-baseline gap-2 overflow-hidden">
                                    <span className="font-semibold text-xs rounded bg-gray-100 px-1.5 py-0.5 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                        {team.abbreviation}
                                    </span>
                                    <span className="text-sm truncate text-gray-800 dark:text-gray-200">
                                        {team.name_th}
                                    </span>
                                </div>
                            </label>
                        );
                    })}
                    {filteredTeams.length === 0 && (
                        <div className="px-3 py-4 text-center text-sm text-gray-500">
                            ไม่พบทีม HA ที่ค้นหา
                        </div>
                    )}
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                เลือกแล้ว {selectedIds.length} ทีม — สมาชิกจะถูกเพิ่มเข้ากลุ่มสนทนาของทีมใน FSHH Chat อัตโนมัติ
            </p>

            {error && <InputError message={error} />}
        </div>
    );
}
