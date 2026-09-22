import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BookOpen } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function SqlCheatSheetModal({ isOpen, onClose }: Props) {
    const cheats = [
        { syntax: 'SELECT col1, col2 FROM table', desc: 'เลือกดึงเฉพาะคอลัมน์ที่ต้องการจากตาราง' },
        { syntax: 'SELECT DISTINCT col FROM table', desc: 'เลือกเฉพาะค่าที่ไม่ซ้ำกัน (Unique)' },
        { syntax: "WHERE col = 'val' AND col2 > 10", desc: 'กรองข้อมูลตามเงื่อนไข (AND, OR, NOT)' },
        { syntax: "WHERE col LIKE 'A%' OR '%xyz%'", desc: 'ค้นหาข้อความบางส่วนด้วย Wildcard %' },
        { syntax: "WHERE col IN ('A', 'B', 'C')", desc: 'ตรวจสอบค่าที่ตรงกับสมาชิกในรายการ' },
        { syntax: 'WHERE col IS NULL / IS NOT NULL', desc: 'ตรวจสอบข้อมูลที่เป็นค่าว่าง (NULL)' },
        { syntax: 'ORDER BY col1 ASC, col2 DESC', desc: 'เรียงลำดับผลลัพธ์ (น้อยไปมาก หรือมากไปน้อย)' },
        { syntax: 'LIMIT 10 OFFSET 20', desc: 'จำกัดจำนวนผลลัพธ์และแบ่งหน้า (Pagination)' },
        { syntax: 'COUNT(*), SUM(col), AVG(col)', desc: 'ฟังก์ชันคำนวณสถิติและสรุปยอด' },
        { syntax: 'GROUP BY col HAVING COUNT(*) > 1', desc: 'จัดกลุ่มข้อมูล และกรองผลลัพธ์หลังจัดกลุ่ม' },
        { syntax: 'INNER JOIN t2 ON t1.id = t2.t1_id', desc: 'เชื่อมตารางเฉพาะแถวที่ข้อมูลตรงกันทั้งสองฝั่ง' },
        { syntax: 'LEFT JOIN t2 ON t1.id = t2.t1_id', desc: 'เชื่อมตารางโดยเก็บข้อมูลตารางซ้ายไว้ครบทุกแถว' },
        { syntax: 'CASE WHEN cond THEN v1 ELSE v2 END', desc: 'คำสั่งเงื่อนไข If-Else ในคำสั่ง SQL' },
        { syntax: "strftime('%Y-%m', date_col)", desc: 'ฟังก์ชันจัดรูปแบบและดึงค่า วัน/เดือน/ปี' },
        { syntax: 'INSERT INTO table (c1, c2) VALUES (v1, v2)', desc: 'เพิ่มแถวข้อมูลใหม่เข้าไปในตาราง' },
        { syntax: 'UPDATE table SET c1 = v1 WHERE cond', desc: 'แก้ไขข้อมูลที่มีอยู่เดิม (ต้องใส่ WHERE เสมอ)' },
        { syntax: 'DELETE FROM table WHERE cond', desc: 'ลบแถวข้อมูลออกจากตาราง (ต้องใส่ WHERE เสมอ)' },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-3xl">
                <DialogHeader className="p-6 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-foreground">
                                สรุปคำสั่งสำคัญ (SQL Cheat Sheet)
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                สรุปไวยากรณ์คำสั่ง SQL สำคัญที่พบบ่อยในการทำงานจริง
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 overflow-y-auto space-y-3 max-h-[60vh]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {cheats.map((c, i) => (
                            <div key={i} className="rounded-2xl border border-border p-3.5 bg-card hover:border-amber-500/30 transition space-y-1">
                                <code className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 block truncate" title={c.syntax}>
                                    {c.syntax}
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
