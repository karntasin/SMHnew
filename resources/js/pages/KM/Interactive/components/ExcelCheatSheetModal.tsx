import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FileSpreadsheet } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function ExcelCheatSheetModal({ isOpen, onClose }: Props) {
    const cheats = [
        { formula: '=SUM(A1:A10)', desc: 'หาผลรวมตัวเลขทั้งหมดในช่วงเซลล์' },
        { formula: '=AVERAGE(B2:B20)', desc: 'หาค่าเฉลี่ยเลขคณิตของตัวเลข' },
        { formula: '=MAX(C1:C10) / =MIN(C1:C10)', desc: 'หาค่าสูงสุด / หาค่าต่ำสุด' },
        { formula: '=COUNT(A1:A10)', desc: 'นับจำนวนเซลล์ที่มีค่าเป็น "ตัวเลข"' },
        { formula: '=COUNTA(A1:A10)', desc: 'นับจำนวนเซลล์ที่ "ไม่ว่าง" ทั้งหมด' },
        { formula: '=IF(B2>=50, "ผ่าน", "ตก")', desc: 'ตรวจสอบเงื่อนไขจริง/เท็จ' },
        { formula: '=IF(AND(B2>=50, C2="Pass"), "ผ่าน", "ตก")', desc: 'ใช้เงื่อนไขร่วม (ต้องจริงทุกข้อ)' },
        { formula: '=IF(OR(B2>=140, C2>=90), "เสี่ยง", "ปกติ")', desc: 'ใช้เงื่อนไขทางเลือก (จริงข้อใดข้อหนึ่ง)' },
        { formula: '=IFS(B2>=80, "A", B2>=70, "B", TRUE, "C")', desc: 'ตัดเกรดหรือจัดกลุ่มหลายเงื่อนไข' },
        { formula: '=COUNTIF(B2:B20, ">100")', desc: 'นับจำนวนเซลล์ที่ตรงตามเงื่อนไขที่ระบุ' },
        { formula: '=SUMIF(A2:A20, "OPD", C2:C20)', desc: 'หาผลรวมตัวเลขเฉพาะแถวที่ตรงตามเงื่อนไข' },
        { formula: '=VLOOKUP(A2, E2:F10, 2, 0)', desc: 'ค้นหาค่าจากคอลัมน์แรก แล้วดึงคอลัมน์ที่ต้องการแบบตรงเป๊ะ (0)' },
        { formula: '=XLOOKUP(A2, D2:D10, E2:E10)', desc: 'ฟังก์ชันค้นหายุคใหม่ ค้นหาซ้าย-ขวาได้ คืนค่าแม่นยำ' },
        { formula: '=INDEX(B2:B10, MATCH(D2, A2:A10, 0))', desc: 'คู่หูค้นหาแบบยืดหยุ่นสูง แทน VLOOKUP ได้ทุกกรณี' },
        { formula: '=A2 & " " & B2', desc: 'เชื่อมข้อความจากเซลล์เข้าด้วยกัน' },
        { formula: '=LEFT(A2, 3) / =RIGHT(A2, 4)', desc: 'ตัดตัวอักษรจากซ้ายสุด / ขวาสุด' },
        { formula: '=MID(A2, 5, 2)', desc: 'ตัดตัวอักษรจากตรงกลางระบุตำแหน่งเริ่มต้นและความยาว' },
        { formula: '=DATEDIF(B2, TODAY(), "Y")', desc: 'หาผลต่างระหว่างวันที่ คำนวณเป็นปีเต็ม (หาอายุ)' },
        { formula: '=ROUND(A2, 2)', desc: 'ปัดเศษทศนิยมตามหลักคณิตศาสตร์' },
        { formula: '=MOD(A2, 2)', desc: 'หาเศษจากการหาร (เช็คเลขคู่เลขคี่)' },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-3xl">
                <DialogHeader className="p-6 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-foreground">
                                สรุปสูตรคำนวณสำคัญ (Excel Formula Cheat Sheet)
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                รวมสูตรและฟังก์ชัน Excel ยอดนิยมพร้อมตัวอย่างการใช้งานจริง
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 overflow-y-auto space-y-3 max-h-[60vh]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {cheats.map((c, i) => (
                            <div key={i} className="rounded-2xl border border-border p-3.5 bg-card hover:border-emerald-500/30 transition space-y-1">
                                <code className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 block truncate" title={c.formula}>
                                    {c.formula}
                                </code>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">{c.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
