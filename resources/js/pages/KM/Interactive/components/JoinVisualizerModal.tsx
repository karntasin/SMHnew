import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GitMerge, ArrowRight, Play } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelectQuery: (sql: string) => void;
}

type JoinType = 'inner' | 'left' | 'right' | 'full';

export default function JoinVisualizerModal({ isOpen, onClose, onSelectQuery }: Props) {
    const [activeJoin, setActiveJoin] = useState<JoinType>('inner');

    const joinData = {
        inner: {
            title: 'INNER JOIN (เชื่อมเฉพาะข้อมูลที่ตรงกันทั้งสองฝั่ง)',
            desc: 'ดึงเฉพาะแถวข้อมูลที่มีคีย์เชื่อมโยง (Key) ตรงกันทั้งตารางซ้ายและตารางขวา แถวที่ไม่มีคู่จะถูกตัดออกทั้งหมด',
            venn: 'ตรงกลาง (Intersection)',
            sqlExample: `SELECT p.name AS product_name, c.name AS category_name
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id;`,
            rowsResult: [
                { left: 'Wireless Mouse (Cat: 1)', right: 'Electronics (ID: 1)', match: true },
                { left: 'Mechanical Keyboard (Cat: 1)', right: 'Electronics (ID: 1)', match: true },
                { left: 'Cotton T-Shirt (Cat: 2)', right: 'Clothing (ID: 2)', match: true },
                { left: 'SQL Book (Cat: 3)', right: 'Books (ID: 3)', match: true },
            ],
            note: 'สินค้าที่ไม่มีหมวดหมู่ หรือหมวดหมู่ที่ยังไม่มีสินค้า จะไม่ปรากฏในผลลัพธ์',
        },
        left: {
            title: 'LEFT JOIN (ตารางซ้ายมาครบทุกแถว)',
            desc: 'ดึงข้อมูลจากตารางฝั่งซ้าย (ตารางหลัก) ออกมาครบทุกแถวเสมอ หากตารางฝั่งขวาไม่มีข้อมูลคู่ที่ตรงกัน คอลัมน์ฝั่งขวาจะแสดงเป็น NULL',
            venn: 'วงกลมซ้ายทั้งหมด + ตรงกลาง',
            sqlExample: `SELECT c.name AS customer_name, o.order_id, o.total_amount
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id;`,
            rowsResult: [
                { left: 'สมชาย สายเสมอ (ID: 1)', right: 'Order #101, #103, #110', match: true },
                { left: 'สมหญิง จริงใจ (ID: 2)', right: 'Order #102, #107', match: true },
                { left: 'ประสิทธิ์ มั่งคั่ง (ID: 5)', right: 'Order #106', match: true },
                { left: 'พรทิพย์ สุขเกษม (ID: 8)', right: 'NULL (ยังไม่เคยสั่งซื้อ)', match: false },
                { left: 'นภาลัย ฟ้ากระจ่าง (ID: 10)', right: 'NULL (ยังไม่เคยสั่งซื้อ)', match: false },
            ],
            note: 'เหมาะสำหรับตรวจสอบ เช่น "ลูกค้าคนไหนบ้างที่ยังไม่เคยสั่งซื้อเลย" (WHERE o.order_id IS NULL)',
        },
        right: {
            title: 'RIGHT JOIN (ตารางขวามาครบทุกแถว)',
            desc: 'ดึงข้อมูลจากตารางฝั่งขวาออกมาครบทุกแถว หากตารางฝั่งซ้ายไม่มีข้อมูลคู่ที่ตรงกัน คอลัมน์ฝั่งซ้ายจะเป็น NULL (ใน SQLite นิยมสลับเขียนเป็น LEFT JOIN แทน)',
            venn: 'ตรงกลาง + วงกลมขวาทั้งหมด',
            sqlExample: `SELECT c.name AS category_name, p.name AS product_name
FROM products p
RIGHT JOIN categories c ON p.category_id = c.category_id;`,
            rowsResult: [
                { left: 'Electronics', right: 'Mouse, Keyboard, SSD', match: true },
                { left: 'Clothing', right: 'T-Shirt, Jeans, Jacket', match: true },
                { left: 'Books', right: 'SQL Book, JS Mastery', match: true },
                { left: 'Home & Kitchen', right: 'Air Fryer, Desk Mat', match: true },
            ],
            note: 'ในทางปฏิบัติ มักสลับตำแหน่งตารางซ้าย-ขวา แล้วใช้คำสั่ง LEFT JOIN แทน เพื่อความอ่านง่าย',
        },
        full: {
            title: 'FULL OUTER JOIN (รวมทุกแถวทั้งสองฝั่ง)',
            desc: 'นำข้อมูลทั้งหมดจากทั้งตารางซ้ายและตารางขวามาแสดงร่วมกัน หากฝั่งใดไม่มีคู่ตรงกัน อีกฝั่งหนึ่งจะแสดงเป็น NULL',
            venn: 'วงกลมทั้งสองวงทั้งหมด (Union)',
            sqlExample: `-- ใน SQLite ทำได้โดยนำ LEFT JOIN มารวมกับ RIGHT JOIN ด้วย UNION
SELECT c.name, o.order_id FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id
UNION
SELECT c.name, o.order_id FROM orders o LEFT JOIN customers c ON o.customer_id = c.customer_id;`,
            rowsResult: [
                { left: 'ลูกค้าที่มีออเดอร์', right: 'ออเดอร์ที่มีลูกค้าตรงกัน', match: true },
                { left: 'ลูกค้าที่ยังไม่มีออเดอร์', right: 'NULL', match: false },
            ],
            note: 'ให้ภาพรวมข้อมูลครบถ้วนที่สุด เหมาะสำหรับการทำ Data Reconciliation หรือตรวจสอบความไม่สอดคล้องของข้อมูล',
        },
    };

    const current = joinData[activeJoin];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl">
                <DialogHeader className="p-6 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <GitMerge className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-foreground">
                                JOIN Visualizer — ทำความเข้าใจการเชื่อมตาราง
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                เปรียบเทียบความแตกต่างระหว่าง INNER, LEFT, RIGHT และ FULL JOIN ให้เห็นภาพชัดเจน
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Join Tabs */}
                    <div className="flex items-center gap-2 mt-4 p-1 bg-muted rounded-xl text-xs">
                        <button
                            type="button"
                            onClick={() => setActiveJoin('inner')}
                            className={`flex-1 py-2 rounded-lg font-bold transition ${
                                activeJoin === 'inner'
                                    ? 'bg-background text-indigo-600 dark:text-indigo-400 shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            INNER JOIN
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveJoin('left')}
                            className={`flex-1 py-2 rounded-lg font-bold transition ${
                                activeJoin === 'left'
                                    ? 'bg-background text-indigo-600 dark:text-indigo-400 shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            LEFT JOIN
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveJoin('right')}
                            className={`flex-1 py-2 rounded-lg font-bold transition ${
                                activeJoin === 'right'
                                    ? 'bg-background text-indigo-600 dark:text-indigo-400 shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            RIGHT JOIN
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveJoin('full')}
                            className={`flex-1 py-2 rounded-lg font-bold transition ${
                                activeJoin === 'full'
                                    ? 'bg-background text-indigo-600 dark:text-indigo-400 shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            FULL JOIN
                        </button>
                    </div>
                </DialogHeader>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Explanation */}
                    <div className="space-y-1">
                        <h4 className="text-sm font-bold text-foreground">{current.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{current.desc}</p>
                    </div>

                    {/* Venn Diagram Graphic */}
                    <div className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col items-center justify-center gap-3">
                        <div className="flex items-center justify-center gap-2">
                            {/* Left Circle */}
                            <div className={`relative w-28 h-28 rounded-full border-2 border-indigo-500 flex items-center justify-center transition-all ${
                                activeJoin === 'left' || activeJoin === 'full' ? 'bg-indigo-500/20' : 'bg-transparent'
                            }`}>
                                <span className="text-xs font-bold text-foreground z-10 -ml-4">ตารางซ้าย (A)</span>
                            </div>
                            {/* Overlap indicator */}
                            <div className={`-mx-12 w-28 h-28 rounded-full border-2 border-indigo-500 flex items-center justify-center transition-all ${
                                activeJoin === 'inner' || activeJoin === 'left' || activeJoin === 'right' || activeJoin === 'full'
                                    ? 'bg-indigo-600/30'
                                    : 'bg-transparent'
                            }`}>
                                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                                    {activeJoin === 'inner' ? 'MATCH ONLY' : 'MATCH'}
                                </span>
                            </div>
                            {/* Right Circle */}
                            <div className={`relative w-28 h-28 rounded-full border-2 border-indigo-500 flex items-center justify-center transition-all ${
                                activeJoin === 'right' || activeJoin === 'full' ? 'bg-indigo-500/20' : 'bg-transparent'
                            }`}>
                                <span className="text-xs font-bold text-foreground z-10 -mr-4">ตารางขวา (B)</span>
                            </div>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">ส่วนที่ดึงข้อมูล: <b>{current.venn}</b></span>
                    </div>

                    {/* Code Example */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">ตัวอย่างคำสั่ง SQL</span>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    onSelectQuery(current.sqlExample);
                                    onClose();
                                }}
                                className="rounded-xl text-xs gap-1.5 h-7"
                            >
                                <Play className="h-3 w-3" />
                                นำไปรันใน Editor
                            </Button>
                        </div>
                        <pre className="p-3.5 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto">
                            {current.sqlExample}
                        </pre>
                    </div>

                    {/* Sample Output Matching Table */}
                    <div className="space-y-2">
                        <span className="text-xs font-bold text-foreground">ลักษณะผลลัพธ์แถวข้อมูล</span>
                        <div className="rounded-2xl border border-border overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="py-2.5 px-3">ข้อมูลตารางฝั่งซ้าย</th>
                                        <th className="py-2.5 px-3">ข้อมูลตารางฝั่งขวา</th>
                                        <th className="py-2.5 px-3">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {current.rowsResult.map((r, i) => (
                                        <tr key={i} className="hover:bg-muted/20">
                                            <td className="py-2 px-3 font-mono">{r.left}</td>
                                            <td className="py-2 px-3 font-mono">{r.right}</td>
                                            <td className="py-2 px-3">
                                                {r.match ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">จับคู่ได้ ✓</span>
                                                ) : (
                                                    <span className="text-amber-600 dark:text-amber-400 font-bold text-[11px]">NULL (ไม่พบคู่)</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-[11px] text-muted-foreground italic">💡 {current.note}</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
