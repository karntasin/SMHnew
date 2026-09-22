import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TABLES_SCHEMA, TableMeta } from '../data/sqlSchema';
import { Database, Table, Key, ArrowRight, Play, ShoppingBag, Hospital, Search } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelectQuery: (sql: string) => void;
}

export default function SchemaExplorerModal({ isOpen, onClose, onSelectQuery }: Props) {
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'ecommerce' | 'hospital'>('all');
    const [selectedTable, setSelectedTable] = useState<TableMeta>(TABLES_SCHEMA[0]);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTables = TABLES_SCHEMA.filter((t) => {
        const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
        const matchesSearch = !searchQuery || 
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            t.thaiName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
    });

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl">
                <DialogHeader className="p-6 border-b border-border bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Database className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                                    โครงสร้างตาราง (Database Schema Explorer)
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    สำรวจตาราง คอลัมน์ และความสัมพันธ์ของฐานข้อมูลจำลองสำหรับฝึกฝนคำสั่ง SQL
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl text-xs">
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('all')}
                                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                                    selectedCategory === 'all'
                                        ? 'bg-background text-foreground shadow-xs font-bold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                ทั้งหมด ({TABLES_SCHEMA.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('ecommerce')}
                                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition ${
                                    selectedCategory === 'ecommerce'
                                        ? 'bg-background text-foreground shadow-xs font-bold text-sky-600 dark:text-sky-400'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <ShoppingBag className="h-3.5 w-3.5" />
                                ร้านค้า E-Commerce (6)
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('hospital')}
                                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition ${
                                    selectedCategory === 'hospital'
                                        ? 'bg-background text-foreground shadow-xs font-bold text-emerald-600 dark:text-emerald-400'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Hospital className="h-3.5 w-3.5" />
                                โรงพยาบาล Healthcare (4)
                            </button>
                        </div>

                        <div className="relative w-56">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="ค้นหาตาราง..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                            />
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
                    {/* Left: Tables List */}
                    <div className="md:col-span-4 border-r border-border p-3 overflow-y-auto max-h-[60vh] space-y-1 bg-muted/10">
                        {filteredTables.map((table) => {
                            const isSelected = selectedTable.name === table.name;
                            return (
                                <button
                                    key={table.name}
                                    type="button"
                                    onClick={() => setSelectedTable(table)}
                                    className={`w-full text-left p-3 rounded-2xl transition flex items-start justify-between gap-2 ${
                                        isSelected
                                            ? 'bg-amber-500/15 border border-amber-500/30 text-foreground font-semibold shadow-xs'
                                            : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground border border-transparent'
                                    }`}
                                >
                                    <div className="space-y-0.5 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <Table className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} />
                                            <span className="font-mono text-xs truncate text-foreground">{table.name}</span>
                                        </div>
                                        <div className="text-[11px] text-muted-foreground truncate">{table.thaiName}</div>
                                    </div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${
                                        table.category === 'hospital'
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                            : 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                                    }`}>
                                        {table.columns.length} cols
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Right: Selected Table Details */}
                    <div className="md:col-span-8 p-6 overflow-y-auto max-h-[60vh] space-y-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-mono text-base font-bold text-foreground">{selectedTable.name}</h3>
                                    <span className="text-xs text-muted-foreground">({selectedTable.thaiName})</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{selectedTable.description}</p>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                    onSelectQuery(selectedTable.sampleQuery);
                                    onClose();
                                }}
                                className="rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shrink-0"
                            >
                                <Play className="h-3.5 w-3.5" />
                                ใส่คำสั่งตัวอย่าง
                            </Button>
                        </div>

                        {/* Sample Query Banner */}
                        <div className="rounded-2xl border border-border bg-muted/40 p-3 flex items-center justify-between gap-3 text-xs">
                            <div className="space-y-0.5 min-w-0">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">คำสั่งตัวอย่าง (Sample Query)</span>
                                <p className="font-mono text-xs text-amber-700 dark:text-amber-300 truncate">{selectedTable.sampleQuery}</p>
                            </div>
                        </div>

                        {/* Columns Table */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                คอลัมน์ทั้งหมด ({selectedTable.columns.length} คอลัมน์)
                            </h4>
                            <div className="overflow-x-auto rounded-2xl border border-border">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/50 text-muted-foreground">
                                        <tr>
                                            <th className="py-2.5 px-3">ชื่อคอลัมน์</th>
                                            <th className="py-2.5 px-3">ประเภทข้อมูล</th>
                                            <th className="py-2.5 px-3">คีย์</th>
                                            <th className="py-2.5 px-3">คำอธิบาย</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {selectedTable.columns.map((col) => (
                                            <tr key={col.name} className="hover:bg-muted/20 transition">
                                                <td className="py-2 px-3 font-mono font-bold text-foreground flex items-center gap-1.5">
                                                    {col.isPrimary && <Key className="h-3 w-3 text-amber-500" title="Primary Key" />}
                                                    {col.name}
                                                </td>
                                                <td className="py-2 px-3 font-mono text-muted-foreground text-[11px]">{col.type}</td>
                                                <td className="py-2 px-3">
                                                    {col.isPrimary ? (
                                                        <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                                            PK
                                                        </span>
                                                    ) : col.isForeign ? (
                                                        <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300" title={col.references}>
                                                            FK
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-[10px]">-</span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-3 text-muted-foreground text-[11px]">{col.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
