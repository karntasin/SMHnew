// resources/js/pages/KM/Interactive/data/mmertLessons.ts
// =====================================================================
// M-MERT Interactive Learning Lab – บทเรียนการแพทย์ฉุกเฉินภัยพิบัติ
// อ้างอิง: กองสาธารณสุขฉุกเฉิน สธ., กรมการแพทย์, สพฉ., ปภ.
// บริบท: รพ.ค่ายสุรสิงหนาท
// =====================================================================

export type QuestionType = 'mcq' | 'ordering' | 'matching' | 'scenario' | 'checklist';
export type LessonCategory =
    | 'overview'
    | 'structure'
    | 'triage'
    | 'ics'
    | 'amp'
    | 'methane'
    | 'scenario';

export interface MCQOption {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation?: string;
}

export interface OrderingItem {
    id: string;
    text: string;
    correctOrder: number;
}

export interface MatchingPair {
    left: string;
    right: string;
}

export interface Question {
    id: number;
    type: QuestionType;
    question: string;
    options?: MCQOption[];
    orderingItems?: OrderingItem[];
    matchingPairs?: MatchingPair[];
    checklistItems?: { id: string; text: string; isRequired: boolean }[];
    correctAnswer?: string;
    explanation: string;
    points: number;
}

export interface MmertLesson {
    id: number;
    category: LessonCategory;
    level: string;
    title: string;
    icon: string;
    color: string;
    description: string;
    keyPoints: string[];
    content: string; // Markdown content
    questions: Question[];
}

export const MMERT_CATEGORIES = [
    { id: 'all',       label: 'ทั้งหมด',          icon: '📚' },
    { id: 'overview',  label: 'ภาพรวม M-MERT',   icon: '🏥' },
    { id: 'structure', label: 'โครงสร้างทีม',     icon: '👥' },
    { id: 'triage',    label: 'การคัดแยกผู้บาดเจ็บ (MCI)', icon: '🔴' },
    { id: 'ics',       label: 'ระบบบัญชาการ (ICS)', icon: '📡' },
    { id: 'amp',       label: 'Advanced Medical Post', icon: '⛺' },
    { id: 'methane',   label: 'METHANE Report',   icon: '📋' },
    { id: 'scenario',  label: 'สถานการณ์จำลอง',  icon: '🎯' },
];

export const MMERT_LESSONS: MmertLesson[] = [
    // =================================================================
    // บทที่ 1: ภาพรวม M-MERT
    // =================================================================
    {
        id: 1,
        category: 'overview',
        level: 'บทที่ 1 · ภาพรวม',
        title: 'M-MERT คืออะไร? ทำไมถึงสำคัญ?',
        icon: '🏥',
        color: 'blue',
        description: 'ทำความรู้จักกับ M-MERT ทีมแพทย์เผชิญเหตุทางทหาร ความสำคัญ และภารกิจหลัก',
        keyPoints: [
            'M-MERT = Military Medical Emergency Response Team',
            'จัดตั้งโดยกรมแพทย์ทหารบก เพื่อรับมือภัยพิบัติ',
            'ทำงานร่วมกับ MERT (สธ.) และ Mini-MERT ระดับอำเภอ',
            'รพ.ค่ายสุรสิงหนาทเป็นฐานปฏิบัติการสำคัญในพื้นที่',
        ],
        content: `
## M-MERT คืออะไร?

**Military Medical Emergency Response Team (M-MERT)** หรือ "ชุดแพทย์เผชิญเหตุ" คือทีมแพทย์เฉพาะกิจของกองทัพบก จัดตั้งโดย **กรมแพทย์ทหารบก** เพื่อตอบสนองต่อภาวะภัยพิบัติ สาธารณภัย และเหตุฉุกเฉินทางการแพทย์ขนาดใหญ่

### ความแตกต่างระหว่าง MERT, Mini-MERT และ M-MERT

| ทีม | สังกัด | ขนาดทีม | บทบาทหลัก |
|-----|--------|---------|-----------|
| **MERT** | กระทรวงสาธารณสุข | 14–16 คน | ดูแลผู้ป่วยวิกฤต ระดับตติยภูมิ |
| **Mini-MERT** | สาธารณสุขอำเภอ | 5 คน | ตอบสนองเร็ว ระดับปฐมภูมิ |
| **M-MERT** | กองทัพบก | 17–25 คน | ปฏิบัติการในพื้นที่เสี่ยงภัย |

### ภารกิจหลักของ M-MERT
1. **จัดตั้งตำบลรวบรวมผู้บาดเจ็บ (CCP)** – Casualty Collection Point
2. **คัดแยกผู้บาดเจ็บหมู่** (Mass Casualty Incident Triage)
3. **ให้การรักษาพยาบาลฉุกเฉินขั้นต้น** ก่อนส่งต่อ
4. **บูรณาการกับ USAR** (Urban Search and Rescue)
5. **สนับสนุนโรงพยาบาลสนาม** ของหน่วยทหาร

### บทบาทของ รพ.ค่ายสุรสิงหนาท
โรงพยาบาลค่ายสุรสิงหนาทเป็น **Level 2 Medical Facility** มีหน้าที่:
- เป็นฐานปฏิบัติการของ M-MERT ในพื้นที่จังหวัดสระบุรีและใกล้เคียง
- รองรับผู้บาดเจ็บจากปฏิบัติการฉุกเฉินก่อนส่งต่อโรงพยาบาลระดับสูง
- ฝึกซ้อมแผนตอบโต้ภาวะฉุกเฉิน (Tabletop Exercise & Full-scale Exercise)
        `,
        questions: [
            {
                id: 101,
                type: 'mcq',
                question: 'M-MERT ย่อมาจากอะไร และสังกัดหน่วยงานใด?',
                options: [
                    { id: 'a', text: 'Medical Mobile Emergency Response Team – กระทรวงสาธารณสุข', isCorrect: false, explanation: 'ไม่ถูกต้อง MERT ของ สธ. มีชื่อว่า Medical Emergency Response Team' },
                    { id: 'b', text: 'Military Medical Emergency Response Team – กรมแพทย์ทหารบก', isCorrect: true, explanation: 'ถูกต้อง! M-MERT เป็นทีมแพทย์เผชิญเหตุของกองทัพบก จัดตั้งโดยกรมแพทย์ทหารบก' },
                    { id: 'c', text: 'Mini Medical Emergency Response Team – สพฉ.', isCorrect: false, explanation: 'Mini-MERT คือทีมระดับอำเภอของกระทรวงสาธารณสุข ไม่ใช่ M-MERT' },
                    { id: 'd', text: 'Military Medical Evacuation Response Team – กรมป้องกันภัยพลเรือน', isCorrect: false, explanation: 'ไม่ถูกต้องทั้งชื่อเต็มและหน่วยงาน' },
                ],
                explanation: 'M-MERT = Military Medical Emergency Response Team เป็นชุดแพทย์เผชิญเหตุของกองทัพบก จัดตั้งโดยกรมแพทย์ทหารบก เพื่อปฏิบัติการในพื้นที่กึ่งเสี่ยงภัยและสนับสนุนระบบการแพทย์ฉุกเฉิน',
                points: 10,
            },
            {
                id: 102,
                type: 'mcq',
                question: 'ทีม Mini-MERT ในสังกัดกระทรวงสาธารณสุขมีบุคลากรจำนวนเท่าใด และประกอบด้วยอะไรบ้าง?',
                options: [
                    { id: 'a', text: '3 คน: แพทย์ 1 พยาบาล 1 EMT 1', isCorrect: false },
                    { id: 'b', text: '5 คน: แพทย์ 1 พยาบาล 2 EMT/FR 2', isCorrect: true, explanation: 'ถูกต้อง! Mini-MERT ระดับอำเภอมีบุคลากร 5 คน: แพทย์ 1 คน (หัวหน้าทีม) พยาบาล 2 คน EMT หรือ FR 2 คน' },
                    { id: 'c', text: '7 คน: แพทย์ 2 พยาบาล 3 เภสัช 1 EMT 1', isCorrect: false },
                    { id: 'd', text: '14-16 คน: สหวิชาชีพ', isCorrect: false, explanation: 'นั่นคือขนาดของ MERT ระดับตติยภูมิ ไม่ใช่ Mini-MERT' },
                ],
                explanation: 'Mini-MERT ระดับอำเภอมีบุคลากร 5 คน ได้แก่ แพทย์ 1 คน (หัวหน้าทีม) พยาบาล 2 คน และ EMT หรือพนักงานขับรถที่ผ่านการอบรม FR อีก 2 คน เน้นความคล่องตัวและความรวดเร็วในการตอบสนอง',
                points: 10,
            },
            {
                id: 103,
                type: 'mcq',
                question: 'รพ.ค่ายสุรสิงหนาทถูกจัดอยู่ใน Role/Level ใดของระบบสถานพยาบาลทางทหาร?',
                options: [
                    { id: 'a', text: 'Level 1 – First Aid เบื้องต้น', isCorrect: false },
                    { id: 'b', text: 'Level 2 – การดูแลผู้ป่วยใน, ช่วยชีวิต, ผ่าตัดเล็ก', isCorrect: true, explanation: 'ถูกต้อง! รพ.ค่ายสุรสิงหนาทเป็น Level 2 Medical Facility สามารถรองรับผู้ป่วยใน, คัดแยก, ผ่าตัดเล็กน้อย ก่อนส่งต่อ' },
                    { id: 'c', text: 'Level 3 – ผ่าตัดซับซ้อน/ICU', isCorrect: false },
                    { id: 'd', text: 'Level 4 – โรงพยาบาลปลายทางขั้นสูงสุด', isCorrect: false },
                ],
                explanation: 'ในระบบ Role/Level of Care ของทหาร: Level 1 = First Aid, Level 2 = การดูแลผู้ป่วยใน/คัดแยก/ผ่าตัดเล็ก, Level 3 = ผ่าตัดซับซ้อน/ICU, Level 4 = โรงพยาบาลปลายทางขั้นสูงสุด',
                points: 10,
            },
        ],
    },

    // =================================================================
    // บทที่ 2: โครงสร้างทีม M-MERT
    // =================================================================
    {
        id: 2,
        category: 'structure',
        level: 'บทที่ 2 · โครงสร้าง',
        title: 'โครงสร้างทีมและบทบาทหน้าที่',
        icon: '👥',
        color: 'green',
        description: 'ทำความรู้จักกับโครงสร้างบุคลากร M-MERT บทบาทของแต่ละคน และระบบการสั่งการ',
        keyPoints: [
            'M-MERT มีบุคลากร 17–25 คน แบ่งเป็นฝ่ายการแพทย์และฝ่ายสนับสนุน',
            'มีแพทย์เป็นหัวหน้าทีม (Medical Officer in Charge)',
            'พยาบาล เภสัชกร นักเทคนิคการแพทย์ ช่างซ่อมบำรุง เจ้าหน้าที่สื่อสาร',
            'ต้องพึ่งพาตนเองได้ไม่น้อยกว่า 72 ชั่วโมง',
        ],
        content: `
## โครงสร้างทีม M-MERT

ทีม M-MERT ประกอบด้วยบุคลากร **17–25 คน** แบ่งเป็น 2 ส่วนหลัก:

### ฝ่ายการแพทย์ (Medical Section)
| ตำแหน่ง | จำนวน | บทบาท |
|---------|-------|-------|
| **แพทย์** (Medical Officer) | 2–3 คน | หัวหน้าทีม วางแผนการรักษา |
| **พยาบาลวิชาชีพ** | 4–6 คน | ดูแลผู้ป่วย ให้สารน้ำ ยา |
| **เภสัชกร** | 1 คน | จัดยา ควบคุมยา |
| **นักเทคนิคการแพทย์** | 1–2 คน | Lab เบื้องต้น |
| **ผู้ช่วยพยาบาล/EMT** | 4–6 คน | ดูแลผู้บาดเจ็บ Transport |

### ฝ่ายสนับสนุน (Support Section)
| ตำแหน่ง | จำนวน | บทบาท |
|---------|-------|-------|
| **ช่างซ่อมบำรุง** | 1–2 คน | อุปกรณ์การแพทย์ เครื่องกำเนิดไฟฟ้า |
| **เจ้าหน้าที่สื่อสาร** | 2 คน | วิทยุ ระบบสื่อสาร |
| **คนขับรถ** | 2–3 คน | พาหนะเคลื่อนที่ |
| **พลาธิการ** | 1–2 คน | เสบียง น้ำ อุปกรณ์ยังชีพ |

### หลักการพึ่งพาตนเอง (Self-Sufficient)
M-MERT ต้องสามารถปฏิบัติการได้โดยไม่รบกวนทรัพยากรท้องถิ่น **อย่างน้อย 72 ชั่วโมง** ซึ่งหมายถึง:
- มีเวชภัณฑ์เพียงพอ
- มีแหล่งพลังงานสำรอง (เครื่องปั่นไฟ)
- มีน้ำและอาหารสำหรับทีม
- พร้อมออกเดินทางได้ใน **6–12 ชั่วโมง** หลังได้รับคำสั่ง
        `,
        questions: [
            {
                id: 201,
                type: 'mcq',
                question: 'M-MERT ต้องสามารถพึ่งพาตนเองได้นานเท่าใดโดยไม่รบกวนทรัพยากรท้องถิ่น?',
                options: [
                    { id: 'a', text: '24 ชั่วโมง', isCorrect: false },
                    { id: 'b', text: '48 ชั่วโมง', isCorrect: false },
                    { id: 'c', text: '72 ชั่วโมง', isCorrect: true, explanation: 'ถูกต้อง! M-MERT ต้องสามารถปฏิบัติการได้อย่างน้อย 72 ชั่วโมง (3 วัน) โดยไม่รบกวนทรัพยากรของพื้นที่' },
                    { id: 'd', text: '120 ชั่วโมง', isCorrect: false },
                ],
                explanation: 'มาตรฐาน MERT และ M-MERT กำหนดให้ทีมต้องพึ่งพาตนเองได้ไม่น้อยกว่า 72 ชั่วโมง (3 วัน) เพื่อลดภาระทรัพยากรของพื้นที่ประสบภัย',
                points: 10,
            },
            {
                id: 202,
                type: 'mcq',
                question: 'M-MERT ต้องพร้อมออกปฏิบัติการได้ภายในกี่ชั่วโมงหลังได้รับคำสั่ง?',
                options: [
                    { id: 'a', text: '1–2 ชั่วโมง', isCorrect: false },
                    { id: 'b', text: '6–12 ชั่วโมง', isCorrect: true, explanation: 'ถูกต้อง! มาตรฐานกำหนดให้ทีมต้องพร้อมออกปฏิบัติการได้ภายใน 6–12 ชั่วโมงหลังได้รับคำสั่ง' },
                    { id: 'c', text: '24–48 ชั่วโมง', isCorrect: false },
                    { id: 'd', text: '3–5 วัน', isCorrect: false },
                ],
                explanation: 'มาตรฐานกำหนดให้ทีม M-MERT ต้องพร้อมออกปฏิบัติการภายใน 6–12 ชั่วโมงหลังได้รับคำสั่ง ซึ่งรวมถึงการรวมพล บรรจุอุปกรณ์ และการเตรียมพาหนะ',
                points: 10,
            },
            {
                id: 203,
                type: 'matching',
                question: 'จับคู่ตำแหน่งกับบทบาทหน้าที่ใน M-MERT ให้ถูกต้อง',
                matchingPairs: [
                    { left: 'Medical Officer', right: 'หัวหน้าทีม วางแผนการรักษา' },
                    { left: 'เภสัชกร', right: 'จัดยา ควบคุมคลังเวชภัณฑ์' },
                    { left: 'เจ้าหน้าที่สื่อสาร', right: 'ควบคุมระบบวิทยุและการสื่อสาร' },
                    { left: 'ช่างซ่อมบำรุง', right: 'ดูแลอุปกรณ์การแพทย์และเครื่องกำเนิดไฟฟ้า' },
                ],
                explanation: 'M-MERT ประกอบด้วยสหวิชาชีพที่มีบทบาทชัดเจน: แพทย์เป็นหัวหน้า, เภสัชกรดูแลยา, เจ้าหน้าที่สื่อสารดูแลการติดต่อ, ช่างดูแลอุปกรณ์',
                points: 20,
            },
        ],
    },

    // =================================================================
    // บทที่ 3: METHANE Report
    // =================================================================
    {
        id: 3,
        category: 'methane',
        level: 'บทที่ 3 · การรายงาน',
        title: 'METHANE Report – การรายงานสถานการณ์ฉุกเฉิน',
        icon: '📋',
        color: 'orange',
        description: 'เรียนรู้หลักการรายงานสถานการณ์สาธารณภัยด้วยกรอบ METHANE มาตรฐานสากล',
        keyPoints: [
            'METHANE = กรอบการรายงานสถานการณ์ฉุกเฉินมาตรฐานสากล',
            'ใช้เมื่อเกิด MCI เพื่อรายงานศูนย์สั่งการ',
            'ช่วยลดความสับสน ให้ข้อมูลที่ตรงและรวดเร็ว',
            'ต้องรายงานอย่างต่อเนื่องตลอดภารกิจ',
        ],
        content: `
## METHANE Report คืออะไร?

**METHANE** คือกรอบการรายงานสถานการณ์ฉุกเฉินมาตรฐานสากล ใช้เมื่อเกิดเหตุ **Mass Casualty Incident (MCI)** หรืออุบัติภัยหมู่ เพื่อสื่อสารข้อมูลที่สำคัญอย่างรวดเร็วและเป็นระบบ

### ความหมายของแต่ละตัวอักษร

| ตัวอักษร | ความหมาย | ตัวอย่างการรายงาน |
|---------|---------|-----------------|
| **M** | **Major Incident** – ประกาศว่าเป็นอุบัติภัยหมู่หรือไม่ | "ประกาศ Major Incident ณ ถนนพหลโยธิน กม. 125" |
| **E** | **Exact Location** – ระบุพิกัดที่ชัดเจน | "พิกัด GPS 14.7835, 100.9820 ใกล้ทางแยกมิตรภาพ" |
| **T** | **Type of Incident** – ประเภทเหตุการณ์ | "รถไฟชนรถโดยสาร มีผู้บาดเจ็บจำนวนมาก" |
| **H** | **Hazards** – อันตรายในพื้นที่ | "โครงสร้างไม่มั่นคง ไฟไหม้เล็กน้อย ระวังสายไฟขาด" |
| **A** | **Access** – เส้นทางเข้าออก | "เข้าจากด้านถนนมิตรภาพ ทางลาดเอียงด้านตะวันตก" |
| **N** | **Number of Casualties** – จำนวนผู้บาดเจ็บ | "ประเมินแดง 5 เหลือง 12 เขียว 30 ดำ 3 คน" |
| **E** | **Emergency Services** – หน่วยที่อยู่ในพื้นที่ | "ตำรวจ 1 กอง ดับเพลิง 2 คัน EMS 3 คัน ขอเพิ่ม ALS 2 คัน" |

### หลักการสำคัญ
1. **รายงานทันทีที่มาถึงจุดเกิดเหตุ** ไม่รอข้อมูลครบ
2. **ปรับปรุงข้อมูลต่อเนื่อง** เมื่อสถานการณ์เปลี่ยน
3. **ใช้คำศัพท์มาตรฐาน** เพื่อลดความเข้าใจผิด
4. **แจ้งทรัพยากรที่ต้องการเพิ่ม** ไม่ใช่แค่รายงานสิ่งที่มี
        `,
        questions: [
            {
                id: 301,
                type: 'ordering',
                question: 'เรียงลำดับตัวอักษรของ METHANE ให้ถูกต้อง',
                orderingItems: [
                    { id: 'e2', text: 'E – Emergency Services (หน่วยที่อยู่ในพื้นที่)', correctOrder: 7 },
                    { id: 'm',  text: 'M – Major Incident Declared (ประกาศภาวะฉุกเฉิน)', correctOrder: 1 },
                    { id: 'a',  text: 'A – Access (เส้นทางเข้าออก)', correctOrder: 5 },
                    { id: 'h',  text: 'H – Hazards (อันตรายในพื้นที่)', correctOrder: 4 },
                    { id: 'e1', text: 'E – Exact Location (พิกัดสถานที่)', correctOrder: 2 },
                    { id: 't',  text: 'T – Type of Incident (ประเภทเหตุการณ์)', correctOrder: 3 },
                    { id: 'n',  text: 'N – Number of Casualties (จำนวนผู้บาดเจ็บ)', correctOrder: 6 },
                ],
                explanation: 'METHANE ย่อมาจาก: M-ajor Incident, E-xact Location, T-ype of Incident, H-azards, A-ccess, N-umber of Casualties, E-mergency Services',
                points: 20,
            },
            {
                id: 302,
                type: 'scenario',
                question: 'สถานการณ์: ท่านถึงจุดเกิดเหตุรถไฟชนกัน 2 ขบวน ที่ สถานีรถไฟแก่งคอย จังหวัดสระบุรี เห็นผู้บาดเจ็บจำนวนมาก มีควันไฟ โครงสร้างรถไม่มั่นคง มีรถ EMS 1 คันในพื้นที่ ท่านจะรายงานใน "H – Hazards" อย่างไร?',
                options: [
                    { id: 'a', text: 'มีผู้บาดเจ็บจำนวนมาก', isCorrect: false, explanation: 'นั่นคือข้อมูลของ N (Number) ไม่ใช่ H (Hazards)' },
                    { id: 'b', text: 'มีควันไฟ โครงสร้างรถไม่มั่นคง เสี่ยงตู้รถไฟพลิกตกราง สายไฟฟ้าอาจขาด', isCorrect: true, explanation: 'ถูกต้อง! H-Hazards คือรายงานอันตรายที่มีอยู่ในพื้นที่ ทั้งที่มองเห็นและที่อาจเกิดขึ้นได้' },
                    { id: 'c', text: 'สถานีรถไฟแก่งคอย จังหวัดสระบุรี', isCorrect: false, explanation: 'นั่นคือข้อมูลของ E (Exact Location) ไม่ใช่ H (Hazards)' },
                    { id: 'd', text: 'รถไฟชนกัน 2 ขบวน', isCorrect: false, explanation: 'นั่นคือข้อมูลของ T (Type of Incident) ไม่ใช่ H (Hazards)' },
                ],
                explanation: 'H – Hazards คือการรายงานอันตรายที่อาจเป็นภัยต่อทั้งผู้บาดเจ็บและทีมกู้ภัย เช่น ไฟ, โครงสร้างไม่มั่นคง, สารเคมี, ไฟฟ้า ซึ่งเป็นข้อมูลสำคัญสำหรับการวางแผนการเข้าพื้นที่',
                points: 15,
            },
            {
                id: 303,
                type: 'mcq',
                question: 'เมื่อใดที่ควรส่ง METHANE Report?',
                options: [
                    { id: 'a', text: 'หลังจากคัดแยกผู้บาดเจ็บเสร็จทั้งหมดแล้วเท่านั้น', isCorrect: false },
                    { id: 'b', text: 'เฉพาะเมื่อเหตุการณ์สงบลงแล้ว', isCorrect: false },
                    { id: 'c', text: 'ทันทีที่มาถึงจุดเกิดเหตุ และรายงานต่อเนื่องเมื่อสถานการณ์เปลี่ยน', isCorrect: true, explanation: 'ถูกต้อง! ต้องรายงานทันทีที่ถึงจุดเกิดเหตุแม้ข้อมูลยังไม่ครบ และอัปเดตต่อเนื่องเพื่อให้ศูนย์สั่งการรับรู้สถานการณ์ตลอดเวลา' },
                    { id: 'd', text: 'เฉพาะเมื่อมีผู้บาดเจ็บมากกว่า 10 คน', isCorrect: false },
                ],
                explanation: 'METHANE ต้องส่งทันทีที่มาถึงจุดเกิดเหตุ แม้ข้อมูลยังไม่ครบถ้วน เพราะศูนย์สั่งการต้องการข้อมูลเบื้องต้นเพื่อระดมทรัพยากร และต้องอัปเดตอย่างต่อเนื่องเมื่อสถานการณ์เปลี่ยนแปลง',
                points: 10,
            },
        ],
    },

    // =================================================================
    // บทที่ 4: การคัดแยกผู้บาดเจ็บหมู่ (MCI Triage)
    // =================================================================
    {
        id: 4,
        category: 'triage',
        level: 'บทที่ 4 · Triage',
        title: 'การคัดแยกผู้บาดเจ็บหมู่ (Mass Casualty Incident)',
        icon: '🔴',
        color: 'red',
        description: 'เรียนรู้ระบบ START Triage การแบ่งสีผู้บาดเจ็บ และหลักปฏิบัติใน MCI',
        keyPoints: [
            'START Triage: Simple Triage and Rapid Treatment',
            '4 สี: แดง (Immediate), เหลือง (Delayed), เขียว (Minor), ดำ (Expectant)',
            'ประเมิน 3 ด้าน: Respiration, Circulation, Mental Status',
            'หลักการ: ช่วยคนมากที่สุดด้วยทรัพยากรที่มี',
        ],
        content: `
## การคัดแยกผู้บาดเจ็บหมู่ (MCI Triage)

**Mass Casualty Incident (MCI)** คือสถานการณ์ที่มีผู้บาดเจ็บมากเกินขีดความสามารถของทรัพยากรที่มีอยู่ ต้องใช้หลักการ **"The Greatest Good for the Greatest Number"** – ช่วยคนมากที่สุดด้วยทรัพยากรที่มีจำกัด

### ระบบ START Triage
**START = Simple Triage and Rapid Treatment**

ประเมินผู้บาดเจ็บด้วย 3 ด้านหลัก:

#### ขั้นที่ 1: RPM Assessment
\`\`\`
R – Respiration (การหายใจ)
P – Perfusion/Circulation (การไหลเวียนโลหิต)  
M – Mental Status (ระดับความรู้สึกตัว)
\`\`\`

#### สีที่ใช้แบ่งผู้บาดเจ็บ

| สี | ประเภท | ความหมาย | ตัวอย่าง |
|----|-------|---------|---------|
| 🔴 **แดง** | Immediate | วิกฤต ต้องรักษาทันที | หายใจเร็ว > 30/นาที หรือ < 10/นาที, CRT > 2 วินาที |
| 🟡 **เหลือง** | Delayed | อาการคงที่ รอได้ไม่นาน | หายใจปกติ CRT ปกติ ตอบสนองคำสั่ง |
| 🟢 **เขียว** | Minor | บาดเจ็บเล็กน้อย เดินได้ | รอยขีดข่วน แผลเล็กน้อย |
| ⚫ **ดำ** | Expectant/Deceased | เสียชีวิต หรือบาดเจ็บรุนแรงเกินช่วย | ไม่หายใจ แม้เปิดทางเดินหายใจ |

### พื้นที่คัดแยกและรักษา (Triage Zones)
\`\`\`
🔴 พื้นที่แดง (Immediate Treatment Area)
🟡 พื้นที่เหลือง (Delayed Treatment Area)  
🟢 พื้นที่เขียว (Minor Treatment Area)
⚫ พื้นที่ดำ (Expectant/Morgue Area)
🚑 พื้นที่ Ambulance Loading
\`\`\`

### Casualty Collection Point (CCP)
CCP คือจุดรวบรวมผู้บาดเจ็บก่อนนำเข้าระบบคัดแยก M-MERT มีหน้าที่จัดตั้ง CCP ในพื้นที่ปลอดภัย (Cold Zone) และประสานการส่งต่อ
        `,
        questions: [
            {
                id: 401,
                type: 'mcq',
                question: 'ผู้บาดเจ็บที่มีอัตราการหายใจ 32 ครั้ง/นาที CRT 3 วินาที และสับสน ควรได้รับสีอะไร?',
                options: [
                    { id: 'a', text: '🟢 เขียว – Minor', isCorrect: false },
                    { id: 'b', text: '🟡 เหลือง – Delayed', isCorrect: false },
                    { id: 'c', text: '🔴 แดง – Immediate', isCorrect: true, explanation: 'ถูกต้อง! การหายใจ > 30/นาที บ่งชี้วิกฤต CRT > 2 วินาที บ่งชี้ shock ต้องรักษาทันที = สีแดง (Immediate)' },
                    { id: 'd', text: '⚫ ดำ – Expectant', isCorrect: false },
                ],
                explanation: 'START Triage: หายใจ > 30 หรือ < 10 ครั้ง/นาที = สีแดง; CRT (Capillary Refill Time) > 2 วินาที = สีแดง; ไม่ตอบสนอง = สีแดง ผู้บาดเจ็บรายนี้มี 2 ตัวบ่งชี้วิกฤต = สีแดง Immediate',
                points: 15,
            },
            {
                id: 402,
                type: 'mcq',
                question: 'ผู้บาดเจ็บไม่หายใจ ท่านเปิดทางเดินหายใจด้วย Head-tilt Chin-lift แต่ยังไม่หายใจ ควรได้รับสีอะไร?',
                options: [
                    { id: 'a', text: '🔴 แดง – Immediate', isCorrect: false, explanation: 'สีแดงใช้กับผู้ที่มีโอกาสรอดหากรักษาทันที แต่รายนี้ไม่หายใจแม้เปิดทางเดินหายใจแล้ว' },
                    { id: 'b', text: '🟡 เหลือง – Delayed', isCorrect: false },
                    { id: 'c', text: '🟢 เขียว – Minor', isCorrect: false },
                    { id: 'd', text: '⚫ ดำ – Expectant/Deceased', isCorrect: true, explanation: 'ถูกต้อง! ใน START Triage หากผู้บาดเจ็บไม่หายใจ แม้เปิดทางเดินหายใจแล้ว = สีดำ (ในสถานการณ์ MCI ไม่มีทรัพยากรพอที่จะ CPR ผู้เดียว)' },
                ],
                explanation: 'ใน START Triage สถานการณ์ MCI: ถ้าเปิดทางเดินหายใจแล้วยังไม่หายใจ = สีดำ (Expectant) เนื่องจากทรัพยากรจำกัด ต่างจากการช่วยชีวิตปกติที่เริ่ม CPR ทันที',
                points: 15,
            },
            {
                id: 403,
                type: 'ordering',
                question: 'เรียงลำดับขั้นตอนการคัดแยกผู้บาดเจ็บด้วย START Triage ให้ถูกต้อง',
                orderingItems: [
                    { id: 'step4', text: 'ประเมิน Mental Status – ตอบสนองคำสั่งง่ายๆ ได้หรือไม่', correctOrder: 4 },
                    { id: 'step1', text: 'สั่งให้ผู้ที่เดินได้ไปรวมกันที่จุดสีเขียว (ประเมิน Ambulatory)', correctOrder: 1 },
                    { id: 'step3', text: 'ประเมิน Circulation – CRT < หรือ > 2 วินาที, ควบคุมเลือดออก', correctOrder: 3 },
                    { id: 'step5', text: 'ติดป้ายสีและย้ายไปพื้นที่รักษาที่เหมาะสม', correctOrder: 5 },
                    { id: 'step2', text: 'ประเมิน Respiration – หายใจ? อัตราการหายใจ? เปิดทางเดินหายใจ?', correctOrder: 2 },
                ],
                explanation: 'ลำดับ START Triage: 1)ให้คนเดินได้ไปพื้นที่เขียว → 2)ประเมินการหายใจ → 3)ประเมินการไหลเวียนโลหิต → 4)ประเมินสติสัมปชัญญะ → 5)ติดป้ายสีและย้าย',
                points: 20,
            },
            {
                id: 404,
                type: 'mcq',
                question: 'CCP (Casualty Collection Point) ควรจัดตั้งในโซนใด?',
                options: [
                    { id: 'a', text: 'Hot Zone – ใกล้จุดเกิดเหตุมากที่สุด', isCorrect: false, explanation: 'Hot Zone คือพื้นที่อันตรายโดยตรง ไม่ปลอดภัยสำหรับการจัดตั้ง CCP' },
                    { id: 'b', text: 'Warm Zone – ห่างจากจุดอันตราย', isCorrect: false, explanation: 'Warm Zone ยังมีความเสี่ยงระดับหนึ่ง อาจจัดตั้ง CCP ได้ในบางสถานการณ์แต่ไม่ใช่ตัวเลือกที่ดีที่สุด' },
                    { id: 'c', text: 'Cold Zone – พื้นที่ปลอดภัยห่างจากอันตราย', isCorrect: true, explanation: 'ถูกต้อง! CCP ควรอยู่ใน Cold Zone ที่ปลอดภัย สะดวกสำหรับการนำผู้บาดเจ็บเข้า และรถพยาบาลออก' },
                    { id: 'd', text: 'ขึ้นอยู่กับผู้บัญชาการ ไม่มีกฎตายตัว', isCorrect: false },
                ],
                explanation: 'Zoning ใน MCI: Hot Zone = พื้นที่อันตรายโดยตรง; Warm Zone = พื้นที่รับผู้บาดเจ็บจาก Hot Zone, ล้างสารเคมี; Cold Zone = พื้นที่ปลอดภัย ที่ตั้ง CCP, Triage, Command Post',
                points: 10,
            },
        ],
    },

    // =================================================================
    // บทที่ 5: ICS – ระบบบัญชาการเหตุการณ์
    // =================================================================
    {
        id: 5,
        category: 'ics',
        level: 'บทที่ 5 · บัญชาการ',
        title: 'ICS – ระบบบัญชาการเหตุการณ์ (Incident Command System)',
        icon: '📡',
        color: 'purple',
        description: 'ทำความเข้าใจ ICS โครงสร้างการบัญชาการ การประสานงานหน่วยแพทย์กับ USAR และหน่วยกู้ภัย',
        keyPoints: [
            'ICS = ระบบบัญชาการที่ใช้ในภาวะฉุกเฉินทุกประเภท',
            'Incident Commander (IC) เป็นผู้รับผิดชอบหลัก',
            'Medical Branch ทำงานภายใต้ Operations Section',
            'Span of Control = ควบคุมได้ 3–7 คน/หน่วยงาน',
        ],
        content: `
## ระบบบัญชาการเหตุการณ์ (ICS)

ICS เป็นเครื่องมือบริหารจัดการภาวะฉุกเฉินที่ใช้ทั่วโลก ช่วยให้การทำงานร่วมกันระหว่างหน่วยงานหลายฝ่ายเป็นไปอย่างราบรื่น

### โครงสร้างหลักของ ICS

\`\`\`
          ┌──────────────────┐
          │ Incident Commander│
          │       (IC)        │
          └──────────────────┘
                    │
    ┌───────────────┼────────────────┐
    ▼               ▼                ▼
Operations     Planning         Logistics
 Section        Section          Section
    │                                │
    ▼                                ▼
Medical         Finance/Admin     Communications
 Branch          Section           Unit
    │
    ├── Triage Unit
    ├── Treatment Unit (Red/Yellow/Green)
    └── Transport/Evacuation Unit
\`\`\`

### บทบาทของ Medical Branch ใน ICS
| ตำแหน่ง | หน้าที่ |
|---------|--------|
| **Medical Branch Director** | ประสานงานทีมแพทย์ทั้งหมดกับ IC |
| **Triage Unit Leader** | ควบคุมการคัดแยกผู้บาดเจ็บ |
| **Treatment Unit Leader** | ควบคุมพื้นที่รักษาสีแดง/เหลือง/เขียว |
| **Transport Unit Leader** | ประสานการส่งต่อด้วยรถพยาบาล |

### หลัก Span of Control
ผู้ควบคุมแต่ละคนควรดูแลได้ **3–7 คน/หน่วย** (อุดมคติ = 5) หากมากกว่านี้ต้องขยายโครงสร้าง

### การบูรณาการ M-MERT กับ USAR
\`\`\`
USAR Team ──→ ค้นหาและนำส่งผู้บาดเจ็บออกจาก Hot Zone
                    ↓
CCP (Cold Zone) ─→ M-MERT: คัดแยก รักษาเบื้องต้น
                    ↓
AMP / Field Hospital ─→ รักษาต่อเนื่อง
                    ↓
รพ.ค่ายสุรสิงหนาท ─→ Level 2 Care / ส่งต่อ
\`\`\`
        `,
        questions: [
            {
                id: 501,
                type: 'mcq',
                question: 'ใน ICS ตำแหน่ง "Incident Commander" (IC) มีหน้าที่อะไร?',
                options: [
                    { id: 'a', text: 'ดูแลการรักษาผู้บาดเจ็บในพื้นที่สีแดงเท่านั้น', isCorrect: false },
                    { id: 'b', text: 'รับผิดชอบการบริหารจัดการเหตุการณ์โดยรวม มีอำนาจสั่งการสูงสุด', isCorrect: true, explanation: 'ถูกต้อง! IC มีอำนาจและรับผิดชอบสูงสุดในการบริหารจัดการเหตุการณ์ทั้งหมด ประสานงานทุกส่วน' },
                    { id: 'c', text: 'ดูแลเฉพาะการส่งต่อผู้บาดเจ็บทางอากาศ', isCorrect: false },
                    { id: 'd', text: 'เป็นตำแหน่งที่ไม่จำเป็นในเหตุการณ์เล็กน้อย', isCorrect: false },
                ],
                explanation: 'IC (Incident Commander) มีอำนาจและรับผิดชอบสูงสุดในการบริหารจัดการเหตุการณ์ ประสานงานทุก Section: Operations, Planning, Logistics และ Finance/Admin',
                points: 10,
            },
            {
                id: 502,
                type: 'mcq',
                question: '"Span of Control" ใน ICS หมายถึงอะไร และจำนวนที่เหมาะสมคือเท่าไหร่?',
                options: [
                    { id: 'a', text: 'จำนวนผู้บาดเจ็บที่ทีมแพทย์ 1 คนรักษาได้ = 10 คน', isCorrect: false },
                    { id: 'b', text: 'ขอบเขตพื้นที่ที่ IC ควบคุมได้ = 500 เมตร', isCorrect: false },
                    { id: 'c', text: 'จำนวนคน/หน่วยที่ผู้ควบคุม 1 คนบริหารได้อย่างมีประสิทธิภาพ = 3–7 (อุดมคติ 5)', isCorrect: true, explanation: 'ถูกต้อง! Span of Control = จำนวน subordinate ที่ supervisor 1 คนควรดูแลได้ = 3–7 คน อุดมคติ = 5 เพื่อประสิทธิภาพสูงสุด' },
                    { id: 'd', text: 'ระยะเวลาที่ IC ปฏิบัติหน้าที่ต่อเนื่องได้ = 12 ชั่วโมง', isCorrect: false },
                ],
                explanation: 'Span of Control คือจำนวน subordinate ที่ supervisor 1 คนสามารถดูแลได้อย่างมีประสิทธิภาพ = 3–7 คน/หน่วย อุดมคติ = 5 หากมากกว่าต้องขยายโครงสร้าง ICS',
                points: 10,
            },
            {
                id: 503,
                type: 'matching',
                question: 'จับคู่ Section ของ ICS กับหน้าที่ที่ถูกต้อง',
                matchingPairs: [
                    { left: 'Operations Section', right: 'ควบคุมการปฏิบัติการในพื้นที่ (รวม Medical Branch)' },
                    { left: 'Planning Section', right: 'รวบรวมข้อมูล วางแผน จัดทำ Incident Action Plan' },
                    { left: 'Logistics Section', right: 'จัดหาทรัพยากร สิ่งอุปกรณ์ การสื่อสาร' },
                    { left: 'Finance/Admin Section', right: 'บริหารงบประมาณ จัดทำเอกสาร บันทึกเวลาปฏิบัติงาน' },
                ],
                explanation: 'ICS มี 4 Section หลัก: Operations (ปฏิบัติการ), Planning (วางแผน), Logistics (ส่งกำลัง), Finance/Admin (การเงิน) ทุก Section รายงานตรงต่อ IC',
                points: 20,
            },
        ],
    },

    // =================================================================
    // บทที่ 6: Advanced Medical Post (AMP)
    // =================================================================
    {
        id: 6,
        category: 'amp',
        level: 'บทที่ 6 · AMP',
        title: 'การจัดตั้ง Advanced Medical Post (AMP)',
        icon: '⛺',
        color: 'teal',
        description: 'เรียนรู้หลักการเลือกพื้นที่และจัดตั้ง AMP โรงพยาบาลสนาม ในบริบทของ M-MERT',
        keyPoints: [
            'AMP = จุดดูแลรักษาขั้นสูงในพื้นที่ภัยพิบัติ',
            'เลือกพื้นที่ปลอดภัย เข้าออกสะดวก ใกล้ทรัพยากร',
            'แบ่งโซนพื้นที่ตามสีผู้บาดเจ็บ',
            'ต้องรองรับได้ 24–72 ชั่วโมงโดยพึ่งพาตนเอง',
        ],
        content: `
## Advanced Medical Post (AMP)

AMP คือจุดดูแลรักษาขั้นสูงที่จัดตั้งในพื้นที่ภัยพิบัติ เป็นจุดกึ่งกลางระหว่าง CCP และโรงพยาบาลจริง

### หลักเกณฑ์การเลือกพื้นที่ AMP
1. **ความปลอดภัย** – อยู่ใน Cold Zone ห่างจากอันตราย
2. **การเข้าถึง** – รถพยาบาลเข้าออกได้สะดวก หลายเส้นทาง
3. **พื้นที่** – กว้างพอสำหรับการจัดโซน ไม่น้อยกว่า 500 ตร.ม.
4. **สาธารณูปโภค** – มีน้ำ, ไฟฟ้า, หรือสามารถจัดหาได้
5. **การสื่อสาร** – มีสัญญาณวิทยุ/โทรศัพท์

### การจัดโซนภายใน AMP
\`\`\`
[ทางเข้า/ออก] ←─ รถพยาบาล ─→ [ทางออก]
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    🔴 Red Zone      🟡 Yellow Zone  🟢 Green Zone
  (Immediate)       (Delayed)        (Minor)
   ผู้ป่วยหนัก      ผู้ป่วยปานกลาง   บาดเจ็บเล็กน้อย
                          │
                    ⚫ Black Zone
                  (Expectant/Morgue)
                          │
                   📦 Supply/Pharmacy
                          │
                   🚿 Decontamination (ถ้าจำเป็น)
\`\`\`

### การจัดตั้ง AMP ใน 72 ชั่วโมงแรก
| ช่วงเวลา | ภารกิจ |
|---------|--------|
| 0–6 ชม. | สำรวจพื้นที่, กำหนดโซน, ตั้ง Command Post |
| 6–24 ชม. | จัดเตรียมอุปกรณ์, เริ่มรับผู้บาดเจ็บ, ประสาน Evacuation |
| 24–72 ชม. | ปรับปรุงตามสถานการณ์, หมุนเวียนบุคลากร, ส่งรายงาน |
| > 72 ชม. | ส่งมอบให้หน่วยงานพลเรือน, ถอนกำลัง |

### ความต้องการอุปกรณ์พื้นฐาน
- เตียงสนาม 20–50 เตียง
- เครื่องปั่นไฟสำรอง 2 เครื่อง
- ออกซิเจนถัง 10–20 ถัง
- IV Fluid และชุด Infusion
- ยาฉุกเฉินตามบัญชียา AMP
- วิทยุสื่อสาร 4–6 เครื่อง
        `,
        questions: [
            {
                id: 601,
                type: 'checklist',
                question: 'ในการเลือกพื้นที่จัดตั้ง AMP ในพื้นที่ภัยพิบัติแผ่นดินไหว ข้อใดบ้างที่ต้องประเมิน (เลือกทุกข้อที่ถูกต้อง)',
                checklistItems: [
                    { id: 'c1', text: 'อยู่ใน Cold Zone ห่างจากพื้นที่ที่อาจพังถล่มได้', isRequired: true },
                    { id: 'c2', text: 'มีเส้นทางสำหรับรถพยาบาลเข้าออกได้อย่างน้อย 2 ทาง', isRequired: true },
                    { id: 'c3', text: 'อยู่ใกล้ศูนย์การค้าหรือห้างสรรพสินค้าเพื่อสะดวกซื้อของ', isRequired: false },
                    { id: 'c4', text: 'มีพื้นที่เพียงพอสำหรับการจัดโซน Triage และ Treatment', isRequired: true },
                    { id: 'c5', text: 'สามารถเข้าถึงระบบน้ำสะอาดหรือมีแหล่งน้ำสำรอง', isRequired: true },
                    { id: 'c6', text: 'ต้องมีอาคารถาวรเท่านั้น ไม่ใช้เต็นท์', isRequired: false },
                    { id: 'c7', text: 'มีสัญญาณวิทยุหรือโทรศัพท์สำหรับการสื่อสาร', isRequired: true },
                ],
                explanation: 'การเลือกพื้นที่ AMP ต้องคำนึงถึง: ความปลอดภัย (Cold Zone), การเข้าถึง (หลายเส้นทาง), พื้นที่เพียงพอ, น้ำสะอาด และการสื่อสาร ส่วนอาคารถาวรหรือเต็นท์ใช้ได้ทั้งคู่ตามสถานการณ์',
                points: 20,
            },
            {
                id: 602,
                type: 'mcq',
                question: 'ใน AMP ผู้บาดเจ็บที่อยู่ใน "Yellow Zone" หมายถึงใคร?',
                options: [
                    { id: 'a', text: 'ผู้เสียชีวิตและผู้บาดเจ็บรุนแรงเกินช่วย', isCorrect: false },
                    { id: 'b', text: 'ผู้บาดเจ็บเล็กน้อย เดินได้ รอรับการรักษาได้นาน', isCorrect: false },
                    { id: 'c', text: 'ผู้บาดเจ็บปานกลาง อาการคงที่ รอได้ระยะหนึ่งก่อนรักษา', isCorrect: true, explanation: 'ถูกต้อง! Yellow Zone (Delayed) = ผู้บาดเจ็บที่อาการคงที่ สามารถรอได้ก่อน แต่ต้องได้รับการรักษาในเวลาไม่นานนัก' },
                    { id: 'd', text: 'บุคลากรทางการแพทย์ที่ปฏิบัติงาน', isCorrect: false },
                ],
                explanation: 'Yellow Zone = Delayed = ผู้บาดเจ็บที่มีอาการปานกลาง อาการคงที่ สามารถรอให้รักษากลุ่มแดงก่อนได้ แต่ต้องติดตามอาการอย่างต่อเนื่อง',
                points: 10,
            },
            {
                id: 603,
                type: 'mcq',
                question: 'M-MERT ควรเริ่มส่งมอบ AMP ให้หน่วยงานพลเรือนหลังจากกี่ชั่วโมง?',
                options: [
                    { id: 'a', text: 'หลัง 24 ชั่วโมง', isCorrect: false },
                    { id: 'b', text: 'หลัง 48 ชั่วโมง', isCorrect: false },
                    { id: 'c', text: 'หลัง 72 ชั่วโมง', isCorrect: true, explanation: 'ถูกต้อง! หลัง 72 ชั่วโมง ระบบพลเรือนควรเข้ามารับช่วงต่อ M-MERT จะส่งมอบภารกิจและถอนกำลังออก' },
                    { id: 'd', text: 'หลัง 7 วัน', isCorrect: false },
                ],
                explanation: 'มาตรฐาน M-MERT กำหนดให้รองรับการปฏิบัติการได้อย่างน้อย 72 ชั่วโมง หลังจากนั้นควรส่งมอบให้ระบบพลเรือน (สาธารณสุขจังหวัด, โรงพยาบาลรัฐ) รับช่วงต่อ',
                points: 10,
            },
        ],
    },

    // =================================================================
    // บทที่ 7: สถานการณ์จำลอง – แผ่นดินไหวในจังหวัดสระบุรี
    // =================================================================
    {
        id: 7,
        category: 'scenario',
        level: 'บทที่ 7 · จำลองสถานการณ์',
        title: 'สถานการณ์จำลอง: แผ่นดินไหว 6.0 ริกเตอร์ที่สระบุรี',
        icon: '🎯',
        color: 'amber',
        description: 'ทดสอบความรู้แบบบูรณาการผ่านสถานการณ์จำลองเหตุการณ์จริงในพื้นที่ รพ.ค่ายสุรสิงหนาท',
        keyPoints: [
            'บูรณาการความรู้ METHANE, Triage, ICS และ AMP',
            'ฝึกตัดสินใจในสถานการณ์ฉุกเฉิน',
            'เรียนรู้จากกรณีศึกษาในพื้นที่จริง',
            'ประยุกต์ใช้บทบาทของ รพ.ค่ายสุรสิงหนาท',
        ],
        content: `
## สถานการณ์จำลอง: แผ่นดินไหวสระบุรี

### สถานการณ์
**เวลา 14:30 น.** เกิดแผ่นดินไหวขนาด 6.0 ริกเตอร์บริเวณจังหวัดสระบุรี ส่งผลให้อาคาร 5 ชั้นในนิคมอุตสาหกรรมแหลมฉบังพังถล่มบางส่วน มีผู้สูญหายในซากอาคาร ถนนหลักเสียหาย ไฟฟ้าดับในบางพื้นที่

**รพ.ค่ายสุรสิงหนาท** ได้รับคำสั่งให้ส่ง M-MERT ออกปฏิบัติการ

### ทรัพยากรที่มี
- M-MERT ทีมเต็ม 20 คน
- รถพยาบาล 2 คัน รถบรรทุกอุปกรณ์ 1 คัน
- เวชภัณฑ์สำหรับ 72 ชั่วโมง
- วิทยุสื่อสาร 6 เครื่อง

### ภารกิจ
ทีม M-MERT ต้องประเมินสถานการณ์ จัดตั้ง CCP/AMP และร่วมปฏิบัติการกับ USAR Thailand

> ตอบคำถามต่อไปนี้โดยอิงจากสถานการณ์ข้างต้น
        `,
        questions: [
            {
                id: 701,
                type: 'scenario',
                question: 'ทีมหัวหน้าถึงจุดเกิดเหตุเป็นคนแรก เห็น: อาคารพังครึ่งหลัง, มีฝุ่นและควันเล็กน้อย, ผู้บาดเจ็บนอนอยู่ประมาณ 30-40 คน, รถดับเพลิง 1 คัน กำลังเข้าพื้นที่ ท่านต้องรายงาน METHANE ข้อ "T" และ "H" อย่างไร?',
                options: [
                    { id: 'a', text: 'T: แผ่นดินไหว อาคารถล่ม H: ฝุ่น ควัน โครงสร้างไม่มั่นคง เสี่ยงพังเพิ่ม', isCorrect: true, explanation: 'ถูกต้อง! T = ระบุประเภทเหตุการณ์ชัดเจน, H = รายงานอันตรายทั้งหมดที่มองเห็นและที่อาจเกิดขึ้น' },
                    { id: 'b', text: 'T: มีผู้บาดเจ็บ 40 คน H: ต้องการความช่วยเหลือ', isCorrect: false, explanation: 'ไม่ถูกต้อง: จำนวนผู้บาดเจ็บอยู่ใน N ไม่ใช่ T และ H ต้องระบุอันตรายที่เฉพาะเจาะจง' },
                    { id: 'c', text: 'T: สระบุรี H: รถดับเพลิงอยู่ในพื้นที่แล้ว', isCorrect: false, explanation: 'ไม่ถูกต้อง: สระบุรีอยู่ใน E (Exact Location), รถดับเพลิงอยู่ใน E (Emergency Services)' },
                    { id: 'd', text: 'T: ฉุกเฉิน H: อันตราย', isCorrect: false, explanation: 'คำตอบคลุมเครือเกินไป METHANE ต้องการข้อมูลที่ชัดเจนและเฉพาะเจาะจง' },
                ],
                explanation: 'METHANE: T (Type) = ระบุประเภทเหตุการณ์ชัดเจน = "แผ่นดินไหว ขนาด 6.0 อาคาร 5 ชั้นถล่มบางส่วน"; H (Hazards) = อันตรายทั้งที่เห็นและอาจเกิด = "ฝุ่น ควัน โครงสร้างไม่มั่นคง เสี่ยงพังเพิ่ม อาจมีแก๊สรั่ว"',
                points: 20,
            },
            {
                id: 702,
                type: 'scenario',
                question: 'เมื่อ USAR นำผู้บาดเจ็บออกมาจากซากอาคาร 15 คน ทีม Triage ประเมินได้: หายใจ > 30 ครั้ง 3 คน, CRT > 2 วินาที 4 คน, ไม่หายใจ 2 คน, เดินได้ 6 คน จำนวนผู้บาดเจ็บในแต่ละสีที่ถูกต้องคือ?',
                options: [
                    { id: 'a', text: 'แดง 7 คน เหลือง 0 คน เขียว 6 คน ดำ 2 คน', isCorrect: true, explanation: 'ถูกต้อง! เดินได้ = เขียว 6 คน; ไม่หายใจ = ดำ 2 คน; หายใจ > 30 และ CRT > 2 = แดง (บางคนอาจซ้ำกัน แต่ทั้ง 7 คนถือว่าแดงทั้งหมด)' },
                    { id: 'b', text: 'แดง 3 คน เหลือง 4 คน เขียว 6 คน ดำ 2 คน', isCorrect: false, explanation: 'ไม่ถูกต้อง: CRT > 2 วินาที ก็เป็นแดง ไม่ใช่เหลือง' },
                    { id: 'c', text: 'แดง 9 คน เหลือง 0 คน เขียว 4 คน ดำ 2 คน', isCorrect: false },
                    { id: 'd', text: 'แดง 5 คน เหลือง 2 คน เขียว 6 คน ดำ 2 คน', isCorrect: false },
                ],
                explanation: 'START: เดินได้ = เขียว 6 คน | ไม่หายใจแม้เปิดทางเดิน = ดำ 2 คน | หายใจ > 30/นาที (3 คน) + CRT > 2 วินาที (4 คน) = ทั้งหมดเป็น แดง 7 คน | เหลือ 0 คน (ไม่มีผู้บาดเจ็บที่ยังอยู่ในกลุ่มเหลือง)',
                points: 20,
            },
            {
                id: 703,
                type: 'mcq',
                question: 'ในสถานการณ์นี้ รพ.ค่ายสุรสิงหนาท (Level 2) ควรเตรียมรับผู้บาดเจ็บกลุ่มใดเป็นลำดับแรก?',
                options: [
                    { id: 'a', text: 'กลุ่มสีเขียว (Minor) เพราะมีจำนวนมากสุด', isCorrect: false },
                    { id: 'b', text: 'กลุ่มสีแดง (Immediate) เพราะต้องรักษาทันที', isCorrect: true, explanation: 'ถูกต้อง! กลุ่มแดงต้องได้รับการรักษาทันที รพ.ค่ายสุรสิงหนาทต้องเตรียมห้องฉุกเฉิน ห้องผ่าตัด ICU สำหรับกลุ่มนี้เป็นลำดับแรก' },
                    { id: 'c', text: 'กลุ่มสีดำ (Expectant) เพราะต้องการความช่วยเหลือมากที่สุด', isCorrect: false, explanation: 'กลุ่มดำ = เสียชีวิตหรือบาดเจ็บรุนแรงเกินช่วยในสถานการณ์ MCI ไม่ใช่ลำดับแรก' },
                    { id: 'd', text: 'ทุกกลุ่มพร้อมกัน ไม่มีลำดับความสำคัญ', isCorrect: false },
                ],
                explanation: 'ระบบการรักษาใน MCI: แดง (Immediate) → เหลือง (Delayed) → เขียว (Minor) → ดำ (Expectant last) รพ.ค่ายสุรสิงหนาทในฐานะ Level 2 ต้องเตรียมรับกลุ่มแดงที่ถูกส่งมาจาก AMP เป็นลำดับแรก',
                points: 15,
            },
        ],
    },
];

// สรุปสถิติ
export const MMERT_STATS = {
    totalLessons: MMERT_LESSONS.length,
    totalQuestions: MMERT_LESSONS.reduce((acc, l) => acc + l.questions.length, 0),
    totalPoints: MMERT_LESSONS.reduce(
        (acc, l) => acc + l.questions.reduce((qa, q) => qa + q.points, 0),
        0,
    ),
};
