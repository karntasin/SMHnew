import React, { useState, useEffect, useRef } from 'react';
import { SpreadsheetData, evaluateFormula, indexToColName } from './FormulaEvaluator';
import { FunctionSquare, CornerDownLeft, Lock } from 'lucide-react';

interface Props {
    data: SpreadsheetData;
    targetCell?: string;
    onCellChange: (address: string, formulaOrValue: string) => void;
    maxRows?: number;
    maxCols?: number;
}

export default function ExcelGrid({
    data,
    targetCell,
    onCellChange,
    maxRows = 10,
    maxCols = 7,
}: Props) {
    const [selectedCell, setSelectedCell] = useState<string>(targetCell || 'A1');
    const [isEditing, setIsEditing] = useState(false);
    const [formulaBarInput, setFormulaBarInput] = useState<string>('');

    const formulaInputRef = useRef<HTMLInputElement>(null);

    // เมื่อเลือกเซลล์ใหม่ ให้อัปเดต Formula Bar
    useEffect(() => {
        const cell = data[selectedCell];
        if (cell) {
            setFormulaBarInput(cell.formula || (cell.value !== null && cell.value !== undefined ? String(cell.value) : ''));
        } else {
            setFormulaBarInput('');
        }
    }, [selectedCell, data]);

    // เมื่อ targetCell เปลี่ยน (เช่น เปลี่ยนบทเรียน) ให้เลื่อน focus ไปที่ targetCell ทันที
    useEffect(() => {
        if (targetCell) {
            setSelectedCell(targetCell);
        }
    }, [targetCell]);

    // จัดการคลิกเซลล์
    const handleCellClick = (cellAddress: string) => {
        // หากกำลังพิมพ์สูตรอยู่ (ขึ้นต้นด้วย =) ในช่อง Formula Bar แล้วคลิกเซลล์อื่น ให้เติมพิกัดเซลล์ลงไปในสูตร
        if (isEditing && formulaBarInput.startsWith('=')) {
            const endsWithOperator = /([+\-*/^&,(:]|\s|=)$/.test(formulaBarInput);
            if (endsWithOperator) {
                setFormulaBarInput((prev) => prev + cellAddress);
                formulaInputRef.current?.focus();
                return;
            }
        }

        setSelectedCell(cellAddress);
        setIsEditing(false);
    };

    // บันทึกสูตร/ค่าเมื่อกด Enter หรือคลิกออก
    const commitEdit = () => {
        setIsEditing(false);
        onCellChange(selectedCell, formulaBarInput);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitEdit();
        } else if (e.key === 'Escape') {
            const cell = data[selectedCell];
            setFormulaBarInput(cell?.formula || (cell?.value !== null && cell?.value !== undefined ? String(cell?.value) : ''));
            setIsEditing(false);
        }
    };

    // ตรวจสอบว่าเซลล์ที่เลือกถูกล็อกหรือไม่
    const isSelectedCellLocked = data[selectedCell]?.isLocked ?? false;

    return (
        <div className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            {/* Excel Toolbar & Formula Bar */}
            <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/40 text-xs">
                {/* Active Cell Address Indicator */}
                <div className="flex items-center justify-center font-mono font-bold bg-background border border-border px-3 py-1.5 rounded-lg w-16 text-center text-foreground shrink-0 shadow-2xs">
                    {selectedCell}
                </div>

                {/* FX Icon Button */}
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                    <FunctionSquare className="h-4 w-4" />
                </div>

                {/* Formula Bar Input */}
                <div className="relative flex-1">
                    <input
                        ref={formulaInputRef}
                        type="text"
                        value={formulaBarInput}
                        disabled={isSelectedCellLocked}
                        onChange={(e) => {
                            setFormulaBarInput(e.target.value);
                            setIsEditing(true);
                        }}
                        onFocus={() => setIsEditing(true)}
                        onBlur={() => {
                            if (isEditing) commitEdit();
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            isSelectedCellLocked
                                ? '(เซลล์นี้ถูกล็อกข้อมูลไว้สำหรับโจทย์)'
                                : 'พิมพ์สูตรคำนวณ เช่น =SUM(B2:B5) หรือ =B2*C2 แล้วกด Enter'
                        }
                        className={`w-full font-mono text-xs px-3 py-1.5 rounded-lg border bg-background text-foreground transition focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                            isSelectedCellLocked
                                ? 'bg-muted/50 text-muted-foreground border-border cursor-not-allowed'
                                : 'border-input hover:border-emerald-400'
                        }`}
                    />
                    {isEditing && (
                        <button
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                commitEdit();
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 p-0.5 rounded-sm"
                            title="ยืนยันสูตร (Enter)"
                        >
                            <CornerDownLeft className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Spreadsheet Table Grid */}
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                <table className="w-full border-collapse text-xs select-none">
                    <thead>
                        <tr>
                            {/* Top-Left Corner Header */}
                            <th className="w-10 bg-muted/60 border-b border-r border-border p-1.5 text-center text-[11px] font-bold text-muted-foreground">
                                #
                            </th>
                            {/* Column Letters A, B, C... */}
                            {Array.from({ length: maxCols }).map((_, cIdx) => {
                                const colName = indexToColName(cIdx);
                                return (
                                    <th
                                        key={colName}
                                        className="min-w-[130px] bg-muted/50 border-b border-r border-border py-1.5 px-3 text-center text-[11px] font-mono font-bold text-muted-foreground"
                                    >
                                        {colName}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: maxRows }).map((_, rIdx) => {
                            const rowNumber = rIdx + 1;
                            return (
                                <tr key={rowNumber} className="hover:bg-muted/10">
                                    {/* Row Number Header 1, 2, 3... */}
                                    <td className="w-10 bg-muted/50 border-b border-r border-border py-1.5 text-center font-mono font-bold text-muted-foreground text-[11px]">
                                        {rowNumber}
                                    </td>

                                    {/* Data Cells */}
                                    {Array.from({ length: maxCols }).map((_, cIdx) => {
                                        const colName = indexToColName(cIdx);
                                        const cellAddress = `${colName}${rowNumber}`;
                                        const cell = data[cellAddress];
                                        const isSelected = selectedCell === cellAddress;
                                        const isTarget = targetCell === cellAddress;
                                        const isLocked = cell?.isLocked ?? false;

                                        let displayVal = '';
                                        if (cell?.value !== null && cell?.value !== undefined) {
                                            if (typeof cell.value === 'number') {
                                                displayVal = cell.value.toLocaleString(undefined, {
                                                    maximumFractionDigits: 4,
                                                });
                                            } else {
                                                displayVal = String(cell.value);
                                            }
                                        }

                                        return (
                                            <td
                                                key={cellAddress}
                                                onClick={() => handleCellClick(cellAddress)}
                                                className={`relative py-1.5 px-2.5 border-b border-r border-border font-mono transition text-xs cursor-pointer truncate ${
                                                    isSelected
                                                        ? 'outline-2 outline-emerald-500 -outline-offset-2 bg-emerald-500/10 font-bold z-10 text-foreground'
                                                        : isTarget
                                                          ? 'bg-amber-500/15 border-amber-500/40 text-foreground font-bold hover:bg-amber-500/20'
                                                          : isLocked
                                                            ? 'bg-muted/15 text-foreground'
                                                            : 'text-foreground hover:bg-muted/30'
                                                }`}
                                                style={{ height: '34px' }}
                                                title={`${cellAddress}: ${cell?.formula || displayVal || '(ว่าง)'}`}
                                            >
                                                {/* Display Value */}
                                                <div className="flex items-center justify-between w-full">
                                                    <span
                                                        className={`truncate ${
                                                            typeof cell?.value === 'number'
                                                                ? 'text-right w-full'
                                                                : 'text-left'
                                                        }`}
                                                    >
                                                        {displayVal || <span className="opacity-0">.</span>}
                                                    </span>

                                                    {/* Indicator Badges */}
                                                    {isLocked && (
                                                        <Lock className="h-2.5 w-2.5 text-muted-foreground/40 ml-1 shrink-0" />
                                                    )}
                                                    {isTarget && !displayVal && (
                                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold ml-1 animate-pulse shrink-0">
                                                            👈 กรอกที่นี่
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer Hint */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span> เซลล์ที่เลือก
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-500"></span> เซลล์เป้าหมายของโจทย์
                    </span>
                    <span className="flex items-center gap-1">
                        <Lock className="h-2.5 w-2.5 text-muted-foreground" /> ข้อมูลตั้งต้น
                    </span>
                </div>
                <div>คีย์ลัด: กด <b>Enter</b> เพื่อคำนวณสูตร</div>
            </div>
        </div>
    );
}
