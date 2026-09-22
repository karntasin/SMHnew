import { SpreadsheetData } from '../components/FormulaEvaluator';

export interface ExcelChallenge {
    instruction: string;
    targetCell: string;
    expectedValue?: any;
    expectedFormulaMatch?: string; // RegExp pattern string
    hint: string;
    solutionFormula: string;
}

export interface ExcelLesson {
    id: number;
    level: string;
    category: 'basic' | 'logical' | 'lookup' | 'text' | 'analysis';
    title: string;
    description: string;
    tip: string;
    initialData: SpreadsheetData;
    challenge: ExcelChallenge;
}

export const EXCEL_CATEGORIES = [
    { id: 'all', label: 'ทั้งหมด (20)' },
    { id: 'basic', label: '1. สูตรพื้นฐาน & ตัวเลข (5)' },
    { id: 'logical', label: '2. เงื่อนไข & ตรรกะ (5)' },
    { id: 'lookup', label: '3. ค้นหา & อ้างอิง (3)' },
    { id: 'text', label: '4. ข้อความ & วันที่ (3)' },
    { id: 'analysis', label: '5. วิเคราะห์ & โรงพยาบาล (4)' },
];

export const EXCEL_LESSONS: ExcelLesson[] = [
    {
        id: 1,
        level: 'บทที่ 1 · พื้นฐาน',
        category: 'basic',
        title: 'เริ่มต้นเขียนสูตรคำนวณเบื้องต้น (+, -, *, /)',
        description: `ใน Excel ทุกการคำนวณจะต้องขึ้นต้นด้วยเครื่องหมายเท่ากับ \`=\` เสมอ
เครื่องหมายคำนวณพื้นฐาน:
- \`+\` บวก
- \`-\` ลบ
- \`*\` คูณ
- \`/\` หาร

แทนที่จะพิมพ์ตัวเลขตรงๆ เช่น \`=100*5\` เราจะพิมพ์ **พิกัดของเซลล์** เช่น \`=B2*C2\` เพื่อให้สูตรคำนวณผลลัพธ์ใหม่อัตโนมัติเมื่อตัวเลขในเซลล์เปลี่ยน`,
        tip: 'คลิกที่เซลล์ผลลัพธ์ แล้วพิมพ์ = จากนั้นคลิกเซลล์ตัวเลขที่ต้องการ ระบบจะใส่พิกัดเซลล์ให้เอง',
        initialData: {
            A1: { value: 'รายการยา', isLocked: true },
            B1: { value: 'ราคาต่อหน่วย (บาท)', isLocked: true },
            C1: { value: 'จำนวนที่ซื้อ', isLocked: true },
            D1: { value: 'ยอดรวม (บาท)', isLocked: true },
            A2: { value: 'Paracetamol 500mg', isLocked: true },
            B2: { value: 1.5, isLocked: true },
            C2: { value: 100, isLocked: true },
            D2: { value: null }, // Target
        },
        challenge: {
            instruction: 'เขียนสูตรคำนวณหายอดรวมในเซลล์ D2 โดยนำราคาต่อหน่วย (B2) คูณด้วยจำนวน (C2)',
            targetCell: 'D2',
            expectedValue: 150,
            expectedFormulaMatch: '^=B2\\*C2$',
            hint: 'คลิกเซลล์ D2 แล้วพิมพ์ =B2*C2 แล้วกด Enter',
            solutionFormula: '=B2*C2',
        },
    },
    {
        id: 2,
        level: 'บทที่ 2 · พื้นฐาน',
        category: 'basic',
        title: 'การหาผลรวมด้วยฟังก์ชัน =SUM()',
        description: `ฟังก์ชัน **SUM** เป็นฟังก์ชันที่นิยมใช้มากที่สุดในโลก ใช้สำหรับหาผลรวมของช่วงเซลล์ตัวเลข

ไวยากรณ์:
\`\`\`excel
=SUM(start_cell:end_cell)
\`\`\`
ตัวอย่าง:
\`=SUM(B2:B5)\` หมายถึง นำค่าในเซลล์ B2, B3, B4, และ B5 มาบวกกันทั้งหมด`,
        tip: 'เครื่องหมายโคลอน (:) หมายถึงช่วงเซลล์ต่อเนื่อง เช่น B2:B6 หมายถึงตั้งแต่ B2 ถึง B6',
        initialData: {
            A1: { value: 'แผนก', isLocked: true },
            B1: { value: 'จำนวนผู้ป่วย (คน)', isLocked: true },
            A2: { value: 'อายุรกรรม (OPD)', isLocked: true },
            B2: { value: 120, isLocked: true },
            A3: { value: 'ศัลยกรรม', isLocked: true },
            B3: { value: 45, isLocked: true },
            A4: { value: 'กุมารเวชกรรม', isLocked: true },
            B4: { value: 60, isLocked: true },
            A5: { value: 'หู คอ จมูก', isLocked: true },
            B5: { value: 35, isLocked: true },
            A6: { value: 'รวมทั้งหมด', isLocked: true },
            B6: { value: null }, // Target
        },
        challenge: {
            instruction: 'ใส่สูตรในเซลล์ B6 เพื่อหาผลรวมจำนวนผู้ป่วยทั้งหมดตั้งแต่ B2 ถึง B5 ด้วยฟังก์ชัน =SUM(B2:B5)',
            targetCell: 'B6',
            expectedValue: 260,
            expectedFormulaMatch: '^=SUM\\(B2:B5\\)$',
            hint: 'คลิกเซลล์ B6 พิมพ์ =SUM(B2:B5) แล้วกด Enter',
            solutionFormula: '=SUM(B2:B5)',
        },
    },
    {
        id: 3,
        level: 'บทที่ 3 · พื้นฐาน',
        category: 'basic',
        title: 'การหาค่าเฉลี่ยด้วย =AVERAGE()',
        description: `ฟังก์ชัน **AVERAGE** ใช้หาค่าเฉลี่ยเลขคณิตของกลุ่มข้อมูลตัวเลข (ผลรวมหารด้วยจำนวน)

ไวยากรณ์:
\`\`\`excel
=AVERAGE(B2:B6)
\`\`\`
*ข้อดี:* AVERAGE จะข้ามเซลล์ที่ว่างหรือไม่ใช่ตัวเลขโดยอัตโนมัติ ไม่นำมาเป็นตัวหาร`,
        tip: 'หากมีเซลล์ที่มีค่าเป็น 0 ฟังก์ชัน AVERAGE จะนำ 0 มาร่วมหารเฉลี่ยด้วย',
        initialData: {
            A1: { value: 'วัน', isLocked: true },
            B1: { value: 'เวลาเฉลี่ยรอรับยา (นาที)', isLocked: true },
            A2: { value: 'จันทร์', isLocked: true },
            B2: { value: 25, isLocked: true },
            A3: { value: 'อังคาร', isLocked: true },
            B3: { value: 18, isLocked: true },
            A4: { value: 'พุธ', isLocked: true },
            B4: { value: 32, isLocked: true },
            A5: { value: 'พฤหัสบดี', isLocked: true },
            B5: { value: 20, isLocked: true },
            A6: { value: 'ศุกร์', isLocked: true },
            B6: { value: 30, isLocked: true },
            A7: { value: 'เฉลี่ยทั้งสัปดาห์', isLocked: true },
            B7: { value: null }, // Target
        },
        challenge: {
            instruction: 'ใส่สูตรในเซลล์ B7 เพื่อหาเวลาเฉลี่ยรอรับยาตั้งแต่ B2 ถึง B6 ด้วย =AVERAGE(B2:B6)',
            targetCell: 'B7',
            expectedValue: 25,
            expectedFormulaMatch: '^=AVERAGE\\(B2:B6\\)$',
            hint: 'พิมพ์ =AVERAGE(B2:B6) ในเซลล์ B7',
            solutionFormula: '=AVERAGE(B2:B6)',
        },
    },
    {
        id: 4,
        level: 'บทที่ 4 · พื้นฐาน',
        category: 'basic',
        title: 'หาค่าสูงสุดและต่ำสุด (=MAX, =MIN)',
        description: `ฟังก์ชันค้นหาค่าขอบเขต:
- \`=MAX(range)\`: หาค่าที่ **มากที่สุด** ในช่วงเซลล์
- \`=MIN(range)\`: หาค่าที่ **น้อยที่สุด** ในช่วงเซลล์

ตัวอย่าง:
\`\`\`excel
=MAX(C2:C10)
=MIN(C2:C10)
\`\`\``,
        tip: 'มักใช้ในการดูระดับความดันสูงสุด หรือราคาต่ำสุดของสินค้าจากตัวแทนจำหน่าย',
        initialData: {
            A1: { value: 'ผู้ป่วย', isLocked: true },
            B1: { value: 'Systolic BP (mmHg)', isLocked: true },
            A2: { value: 'HN 001', isLocked: true },
            B2: { value: 135, isLocked: true },
            A3: { value: 'HN 002', isLocked: true },
            B3: { value: 168, isLocked: true },
            A4: { value: 'HN 003', isLocked: true },
            B4: { value: 120, isLocked: true },
            A5: { value: 'HN 004', isLocked: true },
            B5: { value: 154, isLocked: true },
            A6: { value: 'ความดันสูงสุด', isLocked: true },
            B6: { value: null }, // Target
        },
        challenge: {
            instruction: 'ใส่สูตรในเซลล์ B6 เพื่อหาค่าความดันสูงสุดจากช่วงเซลล์ B2:B5 ด้วย =MAX(B2:B5)',
            targetCell: 'B6',
            expectedValue: 168,
            expectedFormulaMatch: '^=MAX\\(B2:B5\\)$',
            hint: 'พิมพ์ =MAX(B2:B5) ในช่อง B6',
            solutionFormula: '=MAX(B2:B5)',
        },
    },
    {
        id: 5,
        level: 'บทที่ 5 · พื้นฐาน',
        category: 'basic',
        title: 'การนับจำนวนข้อมูล (=COUNT, =COUNTA)',
        description: `ฟังก์ชันการนับใน Excel มี 2 แบบที่ต้องรู้:
- **COUNT(range):** นับเฉพาะเซลล์ที่เป็น **ตัวเลข**
- **COUNTA(range):** นับเซลล์ที่ **ไม่ว่าง** ทั้งหมด (ทั้งตัวเลข ข้อความ และวันที่)

ตัวอย่าง:
ถ้ามีรายชื่อเจ้าหน้าที่ในคอลัมน์ A เป็นข้อความ เราต้องใช้ \`=COUNTA(A2:A10)\``,
        tip: 'จำง่ายๆ: COUNT = Count Numbers, COUNTA = Count All (Non-empty)',
        initialData: {
            A1: { value: 'รหัสยา', isLocked: true },
            B1: { value: 'ชื่อยา', isLocked: true },
            A2: { value: '1460001', isLocked: true },
            B2: { value: 'Amlodipine 5mg', isLocked: true },
            A3: { value: '1460002', isLocked: true },
            B3: { value: 'Enalapril 5mg', isLocked: true },
            A4: { value: '1460003', isLocked: true },
            B4: { value: 'Losartan 50mg', isLocked: true },
            A5: { value: '1460004', isLocked: true },
            B5: { value: 'Simvastatin 20mg', isLocked: true },
            A6: { value: 'จำนวนรายการยาทั้งหมด', isLocked: true },
            B6: { value: null }, // Target
        },
        challenge: {
            instruction: 'ใส่สูตรในเซลล์ B6 เพื่อนับจำนวนรายการยาทั้งหมดในคอลัมน์ B (B2:B5) ด้วยฟังก์ชัน =COUNTA(B2:B5)',
            targetCell: 'B6',
            expectedValue: 4,
            expectedFormulaMatch: '^=COUNTA\\(B2:B5\\)$',
            hint: 'พิมพ์ =COUNTA(B2:B5) ในเซลล์ B6',
            solutionFormula: '=COUNTA(B2:B5)',
        },
    },
    {
        id: 6,
        level: 'บทที่ 6 · เงื่อนไข',
        category: 'logical',
        title: 'การตรวจสอบเงื่อนไขด้วย =IF()',
        description: `ฟังก์ชัน **IF** ใช้ตรวจสอบเงื่อนไข ถ้าเงื่อนไขเป็นจริง (TRUE) ให้ทำสิ่งหนึ่ง ถ้าเป็นเท็จ (FALSE) ให้ทำอีกสิ่งหนึ่ง

ไวยากรณ์:
\`\`\`excel
=IF(เงื่อนไข, ค่าเมื่อจริง, ค่าเมื่อเท็จ)
\`\`\`
ตัวอย่าง:
\`\`\`excel
=IF(B2>=50, "ผ่าน", "ตก")
=IF(C2<10, "สั่งซื้อด่วน", "ปกติ")
\`\`\``,
        tip: 'ข้อความที่ต้องการให้แสดงผลจะต้องครอบด้วยเครื่องหมายคำพูดคู่ "..." เสมอ',
        initialData: {
            A1: { value: 'ชื่อบุคลากร', isLocked: true },
            B1: { value: 'ชั่วโมงอบรมสะสม', isLocked: true },
            C1: { value: 'ผลการประเมิน (>= 20 ชม.)', isLocked: true },
            A2: { value: 'นพ.สมชาย', isLocked: true },
            B2: { value: 24, isLocked: true },
            C2: { value: null }, // Target
            A3: { value: 'พว.สุดา', isLocked: true },
            B3: { value: 15, isLocked: true },
            C3: { value: null },
        },
        challenge: {
            instruction: 'เขียนสูตรในเซลล์ C2 โดยถ้าชั่วโมงอบรม (B2) มากกว่าหรือเท่ากับ 20 ให้แสดง "ผ่าน" หากไม่ถึงให้แสดง "ไม่ผ่าน"',
            targetCell: 'C2',
            expectedValue: 'ผ่าน',
            expectedFormulaMatch: '^=IF\\(B2\\s*>=\\s*20,\\s*"ผ่าน",\\s*"ไม่ผ่าน"\\)$',
            hint: 'พิมพ์ =IF(B2>=20, "ผ่าน", "ไม่ผ่าน") ในเซลล์ C2',
            solutionFormula: '=IF(B2>=20, "ผ่าน", "ไม่ผ่าน")',
        },
    },
    {
        id: 7,
        level: 'บทที่ 7 · เงื่อนไข',
        category: 'logical',
        title: 'การใช้เงื่อนไขร่วมด้วย =AND() และ =OR()',
        description: `เมื่อมีมากกว่า 1 เงื่อนไข:
- \`AND(เงื่อนไข1, เงื่อนไข2)\`: ต้องจริง **ทุกข้อ**
- \`OR(เงื่อนไข1, เงื่อนไข2)\`: จริง **ข้อใดข้อหนึ่ง** ก็พอ

ตัวอย่างการนำมารวมกับ IF:
\`\`\`excel
-- ผ่านทั้งเกณฑ์ชั่วโมงอบรม (>= 20) และผ่านการสอบ (C2="Pass")
=IF(AND(B2>=20, C2="Pass"), "ได้เลื่อนขั้น", "รอประเมิน")
\`\`\``,
        tip: 'ฟังก์ชัน AND และ OR จะส่งกลับค่า TRUE หรือ FALSE เสมอ',
        initialData: {
            A1: { value: 'ผู้ป่วย', isLocked: true },
            B1: { value: 'Systolic BP', isLocked: true },
            C1: { value: 'Diastolic BP', isLocked: true },
            D1: { value: 'ภาวะความดันสูง', isLocked: true },
            A2: { value: 'HN 001', isLocked: true },
            B2: { value: 145, isLocked: true },
            C2: { value: 85, isLocked: true },
            D2: { value: null }, // Target
        },
        challenge: {
            instruction: 'ในเซลล์ D2 ถ้าความดันตัวบน (B2) >= 140 หรือความดันตัวล่าง (C2) >= 90 ให้แสดง "ความดันสูง" นอกนั้นให้แสดง "ปกติ"',
            targetCell: 'D2',
            expectedValue: 'ความดันสูง',
            expectedFormulaMatch: '^=IF\\(OR\\(B2\\s*>=\\s*140,\\s*C2\\s*>=\\s*90\\),\\s*"ความดันสูง",\\s*"ปกติ"\\)$',
            hint: 'พิมพ์ =IF(OR(B2>=140, C2>=90), "ความดันสูง", "ปกติ")',
            solutionFormula: '=IF(OR(B2>=140, C2>=90), "ความดันสูง", "ปกติ")',
        },
    },
    {
        id: 8,
        level: 'บทที่ 8 · เงื่อนไข',
        category: 'logical',
        title: 'การนับจำนวนแบบมีเงื่อนไขด้วย =COUNTIF()',
        description: `ฟังก์ชัน **COUNTIF** ใช้นับจำนวนเซลล์ในช่วงที่ตรงตามเงื่อนไขที่กำหนด

ไวยากรณ์:
\`\`\`excel
=COUNTIF(range, criteria)
\`\`\`
ตัวอย่าง:
- นับคนที่มีสถานะ "ผ่าน": \`=COUNTIF(C2:C10, "ผ่าน")\`
- นับสินค้าที่ราคามากกว่า 500: \`=COUNTIF(B2:B10, ">500")\``,
        tip: 'เงื่อนไขที่เป็นเครื่องหมายเปรียบเทียบ เช่น ">100" หรือ "<=50" ต้องครอบด้วยเครื่องหมายคำพูดคู่เสมอ',
        initialData: {
            A1: { value: 'HN', isLocked: true },
            B1: { value: 'ผลการตรวจ COVID', isLocked: true },
            A2: { value: 'HN 01', isLocked: true },
            B2: { value: 'Negative', isLocked: true },
            A3: { value: 'HN 02', isLocked: true },
            B3: { value: 'Positive', isLocked: true },
            A4: { value: 'HN 03', isLocked: true },
            B4: { value: 'Negative', isLocked: true },
            A5: { value: 'HN 04', isLocked: true },
            B5: { value: 'Positive', isLocked: true },
            A6: { value: 'HN 05', isLocked: true },
            B6: { value: 'Positive', isLocked: true },
            A7: { value: 'จำนวนผู้ติดเชื้อ (Positive)', isLocked: true },
            B7: { value: null }, // Target
        },
        challenge: {
            instruction: 'ใส่สูตรในเซลล์ B7 เพื่อนับจำนวนผู้ป่วยที่มีผลเป็น "Positive" ในช่วงเซลล์ B2:B6 ด้วย =COUNTIF(B2:B6, "Positive")',
            targetCell: 'B7',
            expectedValue: 3,
            expectedFormulaMatch: '^=COUNTIF\\(B2:B6,\\s*"Positive"\\)$',
            hint: 'พิมพ์ =COUNTIF(B2:B6, "Positive") ในเซลล์ B7',
            solutionFormula: '=COUNTIF(B2:B6, "Positive")',
        },
    },
    {
        id: 9,
        level: 'บทที่ 9 · เงื่อนไข',
        category: 'logical',
        title: 'การหาผลรวมแบบมีเงื่อนไขด้วย =SUMIF()',
        description: `ฟังก์ชัน **SUMIF** ใช้หาผลรวมของตัวเลข เฉพาะแถวที่ตรงตามเงื่อนไขที่กำหนด

ไวยากรณ์:
\`\`\`excel
=SUMIF(range_เงื่อนไข, เงื่อนไข, [range_ตัวเลขที่ต้องการรวม])
\`\`\`
ตัวอย่าง:
หายอดรวมค่ารักษาเฉพาะแผนก "OPD":
\`=SUMIF(A2:A10, "OPD", C2:C10)\``,
        tip: 'ถ้าไม่ใส่ range ตัวเลขที่ต้องการรวม ระบบจะนำ range แรกมาบวกกันเอง เช่น =SUMIF(B2:B10, ">1000")',
        initialData: {
            A1: { value: 'แผนก', isLocked: true },
            B1: { value: 'ค่ายา (บาท)', isLocked: true },
            A2: { value: 'OPD', isLocked: true },
            B2: { value: 1200, isLocked: true },
            A3: { value: 'IPD', isLocked: true },
            B3: { value: 5400, isLocked: true },
            A4: { value: 'OPD', isLocked: true },
            B4: { value: 850, isLocked: true },
            A5: { value: 'ER', isLocked: true },
            B5: { value: 2100, isLocked: true },
            A6: { value: 'OPD', isLocked: true },
            B6: { value: 1950, isLocked: true },
            A7: { value: 'รวมค่ายาแผนก OPD ทั้งหมด', isLocked: true },
            B7: { value: null }, // Target
        },
        challenge: {
            instruction: 'ใส่สูตรในเซลล์ B7 เพื่อรวมค่ายาเฉพาะแผนก "OPD" (คอลัมน์ A คือ A2:A6 และคอลัมน์ตัวเลขคือ B2:B6)',
            targetCell: 'B7',
            expectedValue: 4000,
            expectedFormulaMatch: '^=SUMIF\\(A2:A6,\\s*"OPD",\\s*B2:B6\\)$',
            hint: 'พิมพ์ =SUMIF(A2:A6, "OPD", B2:B6) ในเซลล์ B7',
            solutionFormula: '=SUMIF(A2:A6, "OPD", B2:B6)',
        },
    },
    {
        id: 10,
        level: 'บทที่ 10 · เงื่อนไข',
        category: 'logical',
        title: 'การจัดกลุ่มหลายเงื่อนไขด้วย =IFS()',
        description: `ฟังก์ชัน **IFS** ใช้แทนการเขียน IF ซ้อนกันหลายชั้น (Nested IF) ทำให้อ่านง่ายและไม่สับสน

ไวยากรณ์:
\`\`\`excel
=IFS(เงื่อนไข1, ค่าเมื่อจริง1, เงื่อนไข2, ค่าเมื่อจริง2, ...)
\`\`\`
ตัวอย่างการตัดเกรด BMI:
\`\`\`excel
=IFS(B2>=30, "อ้วนมาก", B2>=25, "ท้วม", B2>=18.5, "ปกติ", TRUE, "ผอม")
\`\`\``,
        tip: 'เงื่อนไขสุดท้ายสามารถใส่ TRUE เพื่อทำหน้าที่เหมือน ELSE รองรับค่าที่เหลือทั้งหมด',
        initialData: {
            A1: { value: 'ชื่อผู้ป่วย', isLocked: true },
            B1: { value: 'ระดับน้ำตาลในเลือด (mg/dL)', isLocked: true },
            C1: { value: 'กลุ่มเสี่ยงเบาหวาน', isLocked: true },
            A2: { value: 'นายทองดี', isLocked: true },
            B2: { value: 135, isLocked: true },
            C2: { value: null }, // Target
        },
        challenge: {
            instruction: 'ในเซลล์ C2 ถ้า B2>=126 ให้แสดง "เป็นเบาหวาน" ถ้า B2>=100 ให้แสดง "กลุ่มเสี่ยง" นอกนั้นให้แสดง "ปกติ"',
            targetCell: 'C2',
            expectedValue: 'เป็นเบาหวาน',
            expectedFormulaMatch: '^=IFS\\(B2\\s*>=\\s*126,\\s*"เป็นเบาหวาน",\\s*B2\\s*>=\\s*100,\\s*"กลุ่มเสี่ยง",\\s*TRUE,\\s*"ปกติ"\\)$',
            hint: 'พิมพ์ =IFS(B2>=126, "เป็นเบาหวาน", B2>=100, "กลุ่มเสี่ยง", TRUE, "ปกติ")',
            solutionFormula: '=IFS(B2>=126, "เป็นเบาหวาน", B2>=100, "กลุ่มเสี่ยง", TRUE, "ปกติ")',
        },
    },
    {
        id: 11,
        level: 'บทที่ 11 · ค้นหา & จับคู่',
        category: 'lookup',
        title: 'การค้นหาข้อมูลด้วย =VLOOKUP()',
        description: `ฟังก์ชัน **VLOOKUP** (Vertical Lookup) ใช้ค้นหาค่าจากคอลัมน์แรกสุดของตารางอ้างอิง แล้วดึงข้อมูลในคอลัมน์ที่ต้องการของแถวเดียวกันกลับมา

ไวยากรณ์:
\`\`\`excel
=VLOOKUP(ค่าที่ค้นหา, ตารางข้อมูล, ลำดับคอลัมน์ที่ต้องการดึง, [exact_match])
\`\`\`
- ตัวที่ 1: เซลล์ที่มีค่ารหัสที่ต้องการค้นหา
- ตัวที่ 2: ช่วงตารางอ้างอิงทั้งหมด เช่น E2:F6
- ตัวที่ 3: ลำดับคอลัมน์ที่ต้องการคำตอบ (คอลัมน์แรกคือ 1, ถัดไปคือ 2)
- ตัวที่ 4: ใส่ \`FALSE\` หรือ \`0\` เสมอ เพื่อค้นหาแบบ **ตรงกันทุกตัวอักษร (Exact Match)**`,
        tip: 'จุดที่คนพลาดบ่อยที่สุดคือลืมใส่ 0 หรือ FALSE ตัวสุดท้าย ทำให้ได้คำตอบที่ไม่ถูกต้อง',
        initialData: {
            A1: { value: 'รหัสยา', isLocked: true },
            B1: { value: 'ราคาต่อหน่วย', isLocked: true },
            A2: { value: '1460002', isLocked: true },
            B2: { value: null }, // Target
            D1: { value: 'ตารางราคายา (Catalog)', isLocked: true },
            E1: { value: 'icode', isLocked: true },
            F1: { value: 'ราคา (บาท)', isLocked: true },
            E2: { value: '1460001', isLocked: true },
            F2: { value: 15.0, isLocked: true },
            E3: { value: '1460002', isLocked: true },
            F3: { value: 18.0, isLocked: true },
            E4: { value: '1460003', isLocked: true },
            F4: { value: 24.0, isLocked: true },
        },
        challenge: {
            instruction: 'ใส่สูตรในเซลล์ B2 เพื่อค้นหาราคาของรหัสยาใน A2 จากตาราง E2:F4 (ดึงคอลัมน์ที่ 2 แบบตรงเป๊ะ 0)',
            targetCell: 'B2',
            expectedValue: 18.0,
            expectedFormulaMatch: '^=VLOOKUP\\(A2,\\s*E2:F4,\\s*2,\\s*0\\)$',
            hint: 'พิมพ์ =VLOOKUP(A2, E2:F4, 2, 0) ในเซลล์ B2',
            solutionFormula: '=VLOOKUP(A2, E2:F4, 2, 0)',
        },
    },
    {
        id: 12,
        level: 'บทที่ 12 · ค้นหา & จับคู่',
        category: 'lookup',
        title: 'การจับคู่ด้วย =INDEX() และ =MATCH()',
        description: `ข้อจำกัดของ VLOOKUP คือค้นหาได้เฉพาะจากซ้ายไปขวา แต่การรวมกันของ **INDEX + MATCH** สามารถค้นหาคอลัมน์ใดก็ได้
- \`MATCH(ค่าที่หา, ช่วงแถว/คอลัมน์, 0)\`: หาว่าค่านี้อยู่แถวที่เท่าไร
- \`INDEX(ช่วงผลลัพธ์, หมายเลขแถว)\`: ดึงค่าในแถวนั้นออกมา

ตัวอย่าง:
\`\`\`excel
=INDEX(B2:B10, MATCH(D2, A2:A10, 0))
\`\`\``,
        tip: 'INDEX + MATCH เป็นสูตรมาตรฐานที่มืออาชีพด้าน Excel นิยมใช้เพราะยืดหยุ่นและเสถียรกว่า',
        initialData: {
            A1: { value: 'ชื่อยา', isLocked: true },
            B1: { value: 'รหัสยา (icode)', isLocked: true },
            A2: { value: 'Amlodipine 5mg', isLocked: true },
            B2: { value: '1460001', isLocked: true },
            A3: { value: 'Losartan 50mg', isLocked: true },
            B3: { value: '1460005', isLocked: true },
            D1: { value: 'ค้นหาชื่อ:', isLocked: true },
            E1: { value: 'Amlodipine 5mg', isLocked: true },
            D2: { value: 'รหัสที่ได้:', isLocked: true },
            E2: { value: null }, // Target
        },
        challenge: {
            instruction: 'ในเซลล์ E2 ใช้ INDEX(B2:B3, MATCH(E1, A2:A3, 0)) เพื่อดึงรหัสยาจากชื่อที่ระบุใน E1',
            targetCell: 'E2',
            expectedValue: '1460001',
            expectedFormulaMatch: '^=INDEX\\(B2:B3,\\s*MATCH\\(E1,\\s*A2:A3,\\s*0\\)\\)$',
            hint: 'พิมพ์ =INDEX(B2:B3, MATCH(E1, A2:A3, 0)) ในเซลล์ E2',
            solutionFormula: '=INDEX(B2:B3, MATCH(E1, A2:A3, 0))',
        },
    },
    {
        id: 13,
        level: 'บทที่ 13 · ค้นหา & จับคู่',
        category: 'lookup',
        title: 'ฟังก์ชันค้นหายุคใหม่ =XLOOKUP()',
        description: `**XLOOKUP** คือฟังก์ชันค้นหารุ่นใหม่ล่าสุดที่มาแทนที่ทั้ง VLOOKUP และ HLOOKUP
ข้อดี:
1. ไม่ต้องจำลำดับคอลัมน์ ระบุช่วงค้นหากับช่วงผลลัพธ์แยกกันได้เลย
2. ค้นหาจากขวาไปซ้ายได้
3. ค่าเริ่มต้นเป็น Exact Match อัตโนมัติ (ไม่ต้องพิมพ์ FALSE หรือ 0)
4. มีตัวเลือกแสดงข้อความกรณีหาไม่เจอในตัว

ไวยากรณ์:
\`\`\`excel
=XLOOKUP(ค่าที่หา, ช่วงที่ค้นหา, ช่วงที่คืนค่า)
\`\`\``,
        tip: 'ถ้าต้องการระบุข้อความกรณีหาไม่พบ ให้ใส่ argument ที่ 4 เช่น =XLOOKUP(A2, D2:D5, E2:E5, "ไม่พบข้อมูล")',
        initialData: {
            A1: { value: 'ค้นหา HN', isLocked: true },
            B1: { value: 'ชื่อผู้ป่วยที่ค้นพบ', isLocked: true },
            A2: { value: '670002', isLocked: true },
            B2: { value: null }, // Target
            D1: { value: 'HN', isLocked: true },
            E1: { value: 'ชื่อ-นามสกุล', isLocked: true },
            D2: { value: '670001', isLocked: true },
            E2: { value: 'นายอำนาจ พลคง', isLocked: true },
            D3: { value: '670002', isLocked: true },
            E3: { value: 'นางสาวจินตนา มารวย', isLocked: true },
            D4: { value: '670003', isLocked: true },
            E4: { value: 'นายสมคิด ก้าวหน้า', isLocked: true },
        },
        challenge: {
            instruction: 'ใส่สูตรในเซลล์ B2 เพื่อค้นหาชื่อผู้ป่วยจากรหัส HN ใน A2 โดยใช้ =XLOOKUP(A2, D2:D4, E2:E4)',
            targetCell: 'B2',
            expectedValue: 'นางสาวจินตนา มารวย',
            expectedFormulaMatch: '^=XLOOKUP\\(A2,\\s*D2:D4,\\s*E2:E4\\)$',
            hint: 'พิมพ์ =XLOOKUP(A2, D2:D4, E2:E4) ในเซลล์ B2',
            solutionFormula: '=XLOOKUP(A2, D2:D4, E2:E4)',
        },
    },
    {
        id: 14,
        level: 'บทที่ 14 · ข้อความ',
        category: 'text',
        title: 'การเชื่อมต่อข้อความ (& และ CONCAT)',
        description: `เราสามารถนำข้อความจากหลายเซลล์มาต่อกันเป็นประโยคเดียวได้ 2 วิธี:
1. ใช้เครื่องหมาย \`&\`: \`=A2 & " " & B2\`
2. ใช้ฟังก์ชัน \`=CONCAT(A2, " ", B2)\`

ตัวอย่าง:
ถ้า A2 คือ "นาย" และ B2 คือ "สมชาย"
สูตร \`=A2 & B2\` จะได้ "นายสมชาย"`,
        tip: 'หากต้องการให้มีเว้นวรรคระหว่างคำ ให้เชื่อมด้วย " " (เครื่องหมายคำพูดที่มีช่องว่าง)',
        initialData: {
            A1: { value: 'คำนำหน้า', isLocked: true },
            B1: { value: 'ชื่อ', isLocked: true },
            C1: { value: 'นามสกุล', isLocked: true },
            D1: { value: 'ชื่อ-นามสกุลเต็ม', isLocked: true },
            A2: { value: 'นาย', isLocked: true },
            B2: { value: 'ประสิทธิ์', isLocked: true },
            C2: { value: 'มั่งคั่ง', isLocked: true },
            D2: { value: null }, // Target
        },
        challenge: {
            instruction: 'ในเซลล์ D2 เชื่อมคำนำหน้า ชื่อ และนามสกุลเข้าด้วยกัน โดยมีช่องว่างระหว่างชื่อกับนามสกุล (=A2 & B2 & " " & C2)',
            targetCell: 'D2',
            expectedValue: 'นายประสิทธิ์ มั่งคั่ง',
            expectedFormulaMatch: '^=A2\\s*&\\s*B2\\s*&\\s*" "\\s*&\\s*C2$',
            hint: 'พิมพ์ =A2 & B2 & " " & C2 ในเซลล์ D2',
            solutionFormula: '=A2 & B2 & " " & C2',
        },
    },
    {
        id: 15,
        level: 'บทที่ 15 · ข้อความ',
        category: 'text',
        title: 'การตัดแยกข้อความ (=LEFT, =RIGHT, =MID)',
        description: `ฟังก์ชันตัดข้อความตามตำแหน่ง:
- \`=LEFT(text, จำนวนตัวอักษร)\`: ตัดจาก **ซ้ายสุด**
- \`=RIGHT(text, จำนวนตัวอักษร)\`: ตัดจาก **ขวาสุด**
- \`=MID(text, ตำแหน่งเริ่มต้น, ความยาว)\`: ตัดจาก **ตรงกลาง**

ตัวอย่าง:
ถ้ารหัสใน A2 คือ "LOT-6801-X"
\`=LEFT(A2, 3)\` จะได้ "LOT"
\`=RIGHT(A2, 4)\` จะได้ "-X"`,
        tip: 'มีประโยชน์มากในการแยกปี พ.ศ. จากเลขที่ใบสั่งยา หรือแยกเลขรหัสคลัง',
        initialData: {
            A1: { value: 'รหัสอ้างอิงเอกสาร', isLocked: true },
            B1: { value: 'ประเภทเอกสาร (3 ตัวแรก)', isLocked: true },
            A2: { value: 'REC-202603-001', isLocked: true },
            B2: { value: null }, // Target
        },
        challenge: {
            instruction: 'ใส่สูตรในเซลล์ B2 เพื่อตัดตัวอักษร 3 ตัวแรกจากเซลล์ A2 ด้วย =LEFT(A2, 3)',
            targetCell: 'B2',
            expectedValue: 'REC',
            expectedFormulaMatch: '^=LEFT\\(A2,\\s*3\\)$',
            hint: 'พิมพ์ =LEFT(A2, 3) ในเซลล์ B2',
            solutionFormula: '=LEFT(A2, 3)',
        },
    },
    {
        id: 16,
        level: 'บทที่ 16 · วันที่',
        category: 'text',
        title: 'การคำนวณอายุและระยะเวลาด้วย =DATEDIF()',
        description: `ฟังก์ชัน **DATEDIF** ใช้หาผลต่างระหว่างวันที่สองวัน:
\`\`\`excel
=DATEDIF(วันเริ่มต้น, วันสิ้นสุด, "หน่วย")
\`\`\`
หน่วยที่ระบุได้:
- \`"Y"\`: คำนวณเป็น **ปีเต็ม** (ใช้หาอายุ)
- \`"M"\`: คำนวณเป็น **เดือน**
- \`"D"\`: คำนวณเป็น **จำนวนวัน**

ตัวอย่าง:
\`=DATEDIF(B2, TODAY(), "Y")\` เพื่อหาอายุตามวันเกิดเทียบกับวันนี้`,
        tip: 'วันเริ่มต้นต้องเป็นวันที่ที่เกิดก่อนวันสิ้นสุดเสมอ มิฉะนั้นจะแสดงข้อผิดพลาด #VALUE!',
        initialData: {
            A1: { value: 'ชื่อผู้ป่วย', isLocked: true },
            B1: { value: 'วันเกิด', isLocked: true },
            C1: { value: 'วันที่มารับบริการ', isLocked: true },
            D1: { value: 'อายุ ณ วันตรวจ (ปีเต็ม)', isLocked: true },
            A2: { value: 'นายอำนาจ พลคง', isLocked: true },
            B2: { value: '1980-04-12', isLocked: true },
            C2: { value: '2026-03-01', isLocked: true },
            D2: { value: null }, // Target
        },
        challenge: {
            instruction: 'คำนวณอายุในเซลล์ D2 โดยหาผลต่างระหว่างวันเกิด (B2) กับวันตรวจ (C2) เป็นปี ด้วย =DATEDIF(B2, C2, "Y")',
            targetCell: 'D2',
            expectedValue: 45,
            expectedFormulaMatch: '^=DATEDIF\\(B2,\\s*C2,\\s*"Y"\\)$',
            hint: 'พิมพ์ =DATEDIF(B2, C2, "Y") ในเซลล์ D2',
            solutionFormula: '=DATEDIF(B2, C2, "Y")',
        },
    },
    {
        id: 17,
        level: 'บทที่ 17 · การวิเคราะห์',
        category: 'analysis',
        title: 'การคำนวณยอดสต็อกคงเหลือ (ยอดยกมา + รับเข้า - จ่ายออก)',
        description: `ในงานคลังยาและพัสดุ การคำนวณยอดคงเหลือจริงเป็นหัวใจสำคัญ:
\`\`\`excel
ยอดคงเหลือปลายงวด = ยอดยกมา + รับเข้า - จ่ายออก
\`\`\`
เมื่อใช้พิกัดเซลล์:
\`\`\`excel
=B2 + C2 - D2
\`\`\``,
        tip: 'ควรตรวจสอบว่ายอดคงเหลือไม่ติดลบ หากติดลบแสดงว่ามีการบันทึกการเบิกจ่ายผิดพลาด',
        initialData: {
            A1: { value: 'รายการยา', isLocked: true },
            B1: { value: 'ยอดยกมา', isLocked: true },
            C1: { value: 'รับเข้าคลัง', isLocked: true },
            D1: { value: 'จ่ายออกห้องยา', isLocked: true },
            E1: { value: 'คงเหลือยกไป', isLocked: true },
            A2: { value: 'Paracetamol 500mg (ขวด)', isLocked: true },
            B2: { value: 50, isLocked: true },
            C2: { value: 100, isLocked: true },
            D2: { value: 35, isLocked: true },
            E2: { value: null }, // Target
        },
        challenge: {
            instruction: 'ใส่สูตรในเซลล์ E2 เพื่อคำนวณยอดคงเหลือยกไป โดยนำ B2 + C2 - D2',
            targetCell: 'E2',
            expectedValue: 115,
            expectedFormulaMatch: '^=B2\\s*\\+\\s*C2\\s*-\\s*D2$',
            hint: 'พิมพ์ =B2+C2-D2 ในเซลล์ E2',
            solutionFormula: '=B2+C2-D2',
        },
    },
    {
        id: 18,
        level: 'บทที่ 18 · การวิเคราะห์',
        category: 'analysis',
        title: 'การคิดสัดส่วนร้อยละ (Percentage & Ratios)',
        description: `การคำนวณสัดส่วนหรือเปอร์เซ็นต์ใน Excel:
\`\`\`excel
สัดส่วน = ส่วนย่อย / ยอดรวมทั้งหมด
\`\`\`
เช่น การคำนวณ **อัตราการครองเตียง (Bed Occupancy Rate)**:
จำนวนเตียงที่มีผู้ป่วยนอน / จำนวนเตียงทั้งหมดที่มี`,
        tip: 'ผลลัพธ์จะได้เป็นทศนิยม เช่น 0.85 ซึ่งใน Excel สามารถคลิกปุ่ม % เพื่อแสดงเป็น 85% ได้',
        initialData: {
            A1: { value: 'หอผู้ป่วย (Ward)', isLocked: true },
            B1: { value: 'เตียงที่มีผู้ป่วย', isLocked: true },
            C1: { value: 'เตียงทั้งหมด', isLocked: true },
            D1: { value: 'อัตราครองเตียง (สัดส่วน)', isLocked: true },
            A2: { value: 'หอผู้ป่วยในรวม (IPD)', isLocked: true },
            B2: { value: 24, isLocked: true },
            C2: { value: 30, isLocked: true },
            D2: { value: null }, // Target
        },
        challenge: {
            instruction: 'ในเซลล์ D2 คำนวณสัดส่วนครองเตียงโดยนำเตียงที่มีผู้ป่วย (B2) หารด้วยเตียงทั้งหมด (C2)',
            targetCell: 'D2',
            expectedValue: 0.8,
            expectedFormulaMatch: '^=B2\\s*/\\s*C2$',
            hint: 'พิมพ์ =B2/C2 ในเซลล์ D2',
            solutionFormula: '=B2/C2',
        },
    },
    {
        id: 19,
        level: 'บทที่ 19 · การวิเคราะห์',
        category: 'analysis',
        title: 'การคำนวณส่วนลดและราคาสุทธิ (Discount Calculation)',
        description: `สูตรคำนวณราคาสุทธิหลังหักส่วนลด:
\`\`\`excel
ราคาสุทธิ = ราคาเต็ม - (ราคาเต็ม * เปอร์เซ็นต์ส่วนลด)
หรือ = ราคาเต็ม * (1 - ส่วนลด)
\`\`\`
ตัวอย่าง:
ถ้า A2 คือราคา 1,000 บาท และ B2 คือส่วนลด 10% (0.1)
สูตรคือ \`=A2 - (A2*B2)\` หรือ \`=A2*(1-B2)\``,
        tip: 'การคูณเปอร์เซ็นต์ในวงเล็บช่วยให้คำนวณแม่นยำและอ่านสูตรเข้าใจง่าย',
        initialData: {
            A1: { value: 'เวชภัณฑ์', isLocked: true },
            B1: { value: 'ราคาตั้ง (บาท)', isLocked: true },
            C1: { value: 'ส่วนลด (%)', isLocked: true },
            D1: { value: 'ราคาจ่ายจริงสุทธิ (บาท)', isLocked: true },
            A2: { value: 'Arm Sling Size M', isLocked: true },
            B2: { value: 250, isLocked: true },
            C2: { value: 0.1, isLocked: true }, // 10%
            D2: { value: null }, // Target
        },
        challenge: {
            instruction: 'ในเซลล์ D2 คำนวณราคาจ่ายจริงสุทธิโดยนำ B2 - (B2*C2)',
            targetCell: 'D2',
            expectedValue: 225,
            expectedFormulaMatch: '^=B2\\s*-\\s*\\(B2\\s*\\*\\s*C2\\)$',
            hint: 'พิมพ์ =B2-(B2*C2) ในเซลล์ D2',
            solutionFormula: '=B2-(B2*C2)',
        },
    },
    {
        id: 20,
        level: 'บทที่ 20 · ภารกิจส่งท้าย',
        category: 'analysis',
        title: 'ภารกิจสรุปตัวชี้วัดโรงพยาบาล (Hospital KPI Master)',
        description: `ยินดีด้วยที่คุณผ่านการฝึกฝนทักษะ Excel มาจนถึงบทเรียนสุดท้าย!
ในภารกิจนี้คุณได้รับตารางข้อมูลคนไข้ที่มาตรวจสุขภาพประจำปี
โจทย์คือ:
**จงคำนวณจำนวนผู้ป่วยที่มีระดับน้ำตาลในเลือด (FBS) สูงกว่า 126 mg/dL** เพื่อรายงานตัวชี้วัดผู้ป่วยกลุ่มเสี่ยงเบาหวานรายใหม่`,
        tip: 'ใช้ฟังก์ชัน =COUNTIF(range, ">126")',
        initialData: {
            A1: { value: 'HN', isLocked: true },
            B1: { value: 'ชื่อ-นามสกุล', isLocked: true },
            C1: { value: 'FBS (mg/dL)', isLocked: true },
            A2: { value: '670001', isLocked: true },
            B2: { value: 'นายอำนาจ พลคง', isLocked: true },
            C2: { value: 110, isLocked: true },
            A3: { value: '670002', isLocked: true },
            B3: { value: 'นางสาวจินตนา มารวย', isLocked: true },
            C3: { value: 142, isLocked: true },
            A4: { value: '670003', isLocked: true },
            B4: { value: 'นายสมคิด ก้าวหน้า', isLocked: true },
            C4: { value: 135, isLocked: true },
            A5: { value: '670004', isLocked: true },
            B5: { value: 'นางวิไลพร ชัยเจริญ', isLocked: true },
            C5: { value: 95, isLocked: true },
            A6: { value: '670005', isLocked: true },
            B6: { value: 'นายธวัชชัย บำรุงสุข', isLocked: true },
            C6: { value: 150, isLocked: true },
            A7: { value: 'จำนวนผู้ป่วย FBS > 126 mg/dL', isLocked: true },
            B7: { value: '', isLocked: true },
            C7: { value: null }, // Target
        },
        challenge: {
            instruction: 'ใส่สูตรในเซลล์ C7 เพื่อนับจำนวนผู้ป่วยใน C2:C6 ที่มีค่า FBS มากกว่า 126 ด้วย =COUNTIF(C2:C6, ">126")',
            targetCell: 'C7',
            expectedValue: 3,
            expectedFormulaMatch: '^=COUNTIF\\(C2:C6,\\s*">126"\\)$',
            hint: 'พิมพ์ =COUNTIF(C2:C6, ">126") ในเซลล์ C7',
            solutionFormula: '=COUNTIF(C2:C6, ">126")',
        },
    },
];
