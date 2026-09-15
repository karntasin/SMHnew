import { useMemo, useState } from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { iconMapper } from '@/lib/iconMapper';
import { formatGroupLabel, formatPermissionLabel } from '@/lib/permission-labels';

export interface AccessMenuNode {
    id: number;
    title: string;
    icon: string;
    permission_name: string | null;
    permission_valid?: boolean;
    children: AccessMenuNode[];
}

interface ExtraPermission {
    id: number;
    name: string;
    group: string | null;
}

interface Props {
    menuTree: AccessMenuNode[];
    extraPermissions?: ExtraPermission[];
    selected: string[];
    onChange: (permissions: string[]) => void;
}

export function collectNodePermissions(node: AccessMenuNode): string[] {
    const names: string[] = [];

    if (node.permission_name && node.permission_valid !== false) {
        names.push(node.permission_name);
    }

    for (const child of node.children) {
        names.push(...collectNodePermissions(child));
    }

    return names;
}

function filterMenuTree(items: AccessMenuNode[], query: string): AccessMenuNode[] {
    if (!query.trim()) {
        return items;
    }

    const lower = query.toLowerCase();

    return items.reduce<AccessMenuNode[]>((acc, item) => {
        const children = item.children ? filterMenuTree(item.children, query) : [];
        const titleMatch = item.title.toLowerCase().includes(lower);
        const permMatch = item.permission_name?.toLowerCase().includes(lower);

        if (titleMatch || permMatch || children.length > 0) {
            acc.push({
                ...item,
                children: titleMatch || permMatch ? item.children : children,
            });
        }

        return acc;
    }, []);
}

function nodeCheckState(node: AccessMenuNode, selected: string[]): boolean | 'indeterminate' {
    const perms = collectNodePermissions(node);
    if (perms.length === 0) {
        return false;
    }

    const selectedCount = perms.filter((p) => selected.includes(p)).length;
    if (selectedCount === 0) {
        return false;
    }
    if (selectedCount === perms.length) {
        return true;
    }

    return 'indeterminate';
}

function MenuPickerIcon({
    icon,
    level,
    active,
}: {
    icon: string;
    level: number;
    active: boolean;
}) {
    const Icon = iconMapper(icon) as LucideIcon;

    if (level > 0) {
        return (
            <span
                className={cn(
                    'mt-1.5 size-1.5 shrink-0 rounded-full',
                    active ? 'bg-primary' : 'bg-muted-foreground/35',
                )}
            />
        );
    }

    return (
        <span
            className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground',
            )}
        >
            <Icon className="size-4" />
        </span>
    );
}

function AccessMenuItem({
    node,
    level,
    selected,
    onToggleNode,
    onTogglePermission,
    searchQuery,
}: {
    node: AccessMenuNode;
    level: number;
    selected: string[];
    onToggleNode: (node: AccessMenuNode) => void;
    onTogglePermission: (permission: string) => void;
    searchQuery: string;
}) {
    const children = node.children ?? [];
    const hasChildren = children.length > 0;
    const perms = collectNodePermissions(node);
    const checkState = nodeCheckState(node, selected);
    const isExpandedDefault = hasChildren && (checkState !== false || !!searchQuery.trim());

    const rowClass = cn(
        'group/menu-item relative flex w-full items-start gap-2.5 rounded-lg transition-colors',
        level === 0 ? 'px-2.5 py-2.5' : 'px-2 py-2',
        checkState !== false
            ? 'bg-primary/10 text-primary'
            : 'text-foreground hover:bg-muted/60',
        checkState !== false && level === 0 && 'border-l-[3px] border-l-primary pl-[calc(0.625rem-3px)]',
    );

    if (hasChildren) {
        return (
            <Collapsible key={node.id} defaultOpen={isExpandedDefault} className="group/collapsible">
                <div className={rowClass}>
                    <Checkbox
                        checked={checkState}
                        onCheckedChange={() => onToggleNode(node)}
                        className="mt-1"
                        aria-label={`เลือก ${node.title}`}
                    />
                    <CollapsibleTrigger asChild>
                        <button
                            type="button"
                            className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                        >
                            <MenuPickerIcon icon={node.icon} level={level} active={checkState !== false} />
                            <span
                                className={cn(
                                    'min-w-0 flex-1 leading-snug break-words',
                                    level === 0 ? 'text-[13px] font-medium' : 'text-xs font-normal',
                                )}
                            >
                                {node.title}
                            </span>
                            {perms.length > 0 && (
                                <Badge variant="outline" className="shrink-0 text-[10px]">
                                    {perms.filter((p) => selected.includes(p)).length}/{perms.length}
                                </Badge>
                            )}
                            <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </button>
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                    <div
                        className={cn(
                            'mt-0.5 space-y-0.5 border-l border-border/80',
                            level === 0 ? 'ml-5 pl-2' : 'ml-3 pl-2',
                        )}
                    >
                        {children.map((child) => (
                            <AccessMenuItem
                                key={child.id}
                                node={child}
                                level={level + 1}
                                selected={selected}
                                onToggleNode={onToggleNode}
                                onTogglePermission={onTogglePermission}
                                searchQuery={searchQuery}
                            />
                        ))}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        );
    }

    if (!node.permission_name) {
        return null;
    }

    const isChecked = selected.includes(node.permission_name);

    return (
        <label key={node.id} className={cn(rowClass, 'cursor-pointer')}>
            <Checkbox
                checked={isChecked}
                onCheckedChange={() => onTogglePermission(node.permission_name!)}
                className="mt-1"
            />
            <MenuPickerIcon icon={node.icon} level={level} active={isChecked} />
            <span className="min-w-0 flex-1">
                <span
                    className={cn(
                        'block leading-snug break-words',
                        level === 0 ? 'text-[13px] font-medium' : 'text-xs font-normal',
                    )}
                >
                    {node.title}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                    {formatPermissionLabel(node.permission_name)}
                </span>
            </span>
        </label>
    );
}

export function RoleAccessMenuPicker({
    menuTree,
    extraPermissions = [],
    selected,
    onChange,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTree = useMemo(
        () => filterMenuTree(menuTree, searchQuery),
        [menuTree, searchQuery],
    );

    const filteredExtra = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) {
            return extraPermissions;
        }

        return extraPermissions.filter(
            (p) =>
                p.name.toLowerCase().includes(q)
                || formatPermissionLabel(p.name).toLowerCase().includes(q)
                || (p.group && formatGroupLabel(p.group).toLowerCase().includes(q)),
        );
    }, [extraPermissions, searchQuery]);

    const togglePermission = (permission: string) => {
        onChange(
            selected.includes(permission)
                ? selected.filter((p) => p !== permission)
                : [...selected, permission],
        );
    };

    const toggleNode = (node: AccessMenuNode) => {
        const names = collectNodePermissions(node);
        const allSelected = names.every((p) => selected.includes(p));

        if (allSelected) {
            onChange(selected.filter((p) => !names.includes(p)));
            return;
        }

        onChange([...new Set([...selected, ...names])]);
    };

    const extraGrouped = useMemo(() => {
        return filteredExtra.reduce<Record<string, ExtraPermission[]>>((acc, perm) => {
            const group = formatGroupLabel(perm.group ?? 'อื่นๆ');
            acc[group] ??= [];
            acc[group].push(perm);
            return acc;
        }, {});
    }, [filteredExtra]);

    const menuPermissionCount = useMemo(() => {
        const all = menuTree.flatMap((node) => collectNodePermissions(node));
        return {
            selected: all.filter((p) => selected.includes(p)).length,
            total: all.length,
        };
    }, [menuTree, selected]);

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาเมนูหรือโมดูล..."
                    className="h-9 pl-9 pr-8"
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                        aria-label="ล้างการค้นหา"
                    >
                        <X className="size-3.5" />
                    </button>
                )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>เมนูที่เข้าถึงได้</span>
                <Badge variant="secondary">
                    {menuPermissionCount.selected}/{menuPermissionCount.total}
                </Badge>
            </div>

            <ScrollArea className="h-[min(520px,60vh)] rounded-xl border bg-muted/20 p-2">
                <div className="space-y-0.5 pr-2">
                    {filteredTree.length > 0 ? (
                        filteredTree.map((node) => (
                            <AccessMenuItem
                                key={node.id}
                                node={node}
                                level={0}
                                selected={selected}
                                onToggleNode={toggleNode}
                                onTogglePermission={togglePermission}
                                searchQuery={searchQuery}
                            />
                        ))
                    ) : (
                        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                            ไม่พบเมนูที่ตรงกับการค้นหา
                        </p>
                    )}
                </div>
            </ScrollArea>

            {Object.keys(extraGrouped).length > 0 && (
                <div className="rounded-xl border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">สิทธิ์เพิ่มเติม (ไม่มีในเมนู)</p>
                        <Badge variant="outline" className="text-[10px]">
                            {filteredExtra.filter((p) => selected.includes(p.name)).length}/{filteredExtra.length}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        เช่น สิทธิ์บันทึก/แก้ไข/ลบ ที่ไม่ได้ผูกกับเมนูโดยตรง
                    </p>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                        {Object.entries(extraGrouped).map(([group, perms]) => (
                            <div key={group}>
                                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {group}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                    {perms.map((perm) => (
                                        <label
                                            key={perm.id}
                                            className="flex items-start gap-2 rounded-lg border bg-background px-2.5 py-2 cursor-pointer hover:bg-accent/40"
                                        >
                                            <Checkbox
                                                checked={selected.includes(perm.name)}
                                                onCheckedChange={() => togglePermission(perm.name)}
                                                className="mt-0.5"
                                            />
                                            <span className="min-w-0">
                                                <span className="block text-xs font-medium leading-snug">
                                                    {formatPermissionLabel(perm.name)}
                                                </span>
                                                <span className="block truncate text-[10px] text-muted-foreground">
                                                    {perm.name}
                                                </span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
