<?php

namespace App\Services\OrganizationChat;

class MedicalDocumentKnowledgeService
{
    /**
     * ดึงบริบทแนะนำด้านการแพทย์หรือเทมเพลตเอกสารที่เกี่ยวข้องกับข้อความของผู้ใช้
     */
    public function getEnrichedContext(string $message): array
    {
        $contexts = [];

        // 1. ตรวจสอบงานเอกสารเวชระเบียน (Clinical Documentation)
        $clinicalDoc = $this->getClinicalDocGuideline($message);
        if ($clinicalDoc) {
            $contexts[] = $clinicalDoc;
        }

        // 2. ตรวจสอบงานสารบรรณ / บันทึกข้อความราชการ (Administrative Documentation)
        $adminDoc = $this->getAdministrativeDocGuideline($message);
        if ($adminDoc) {
            $contexts[] = $adminDoc;
        }

        // 3. ตรวจสอบแนวทางเวชปฏิบัติและข้อมูลโรค/ยาเฉพาะทาง (Clinical Practice Guidelines)
        $clinicalGuideline = $this->getClinicalGuideline($message);
        if ($clinicalGuideline) {
            $contexts[] = $clinicalGuideline;
        }

        return $contexts;
    }

    /**
     * แนวทางและเทมเพลตเอกสารเวชระเบียน (SOAP Note, Discharge Summary, Referral)
     */
    private function getClinicalDocGuideline(string $message): ?string
    {
        // 1.1 SOAP Note / Progress Note
        if (preg_match('/(soap|progress\s*note|บันทึกเวชระเบียน|เขียน\s*soap|เวชระเบียนผู้ป่วย)/iu', $message)) {
            return <<<EOT
[แนวปฏิบัติการบันทึกเวชระเบียนมาตรฐาน (SOAP Note Guideline)]:
ให้จัดโครงสร้างเป็น 4 ส่วนอย่างชัดเจนและเป็นทางการ:
1. S (Subjective): อาการสำคัญ (Chief Complaint: CC พร้อมระยะเวลา), ประวัติปัจจุบัน (Present Illness: PI ลำดับเวลาชัดเจน), ประวัติอดีตและโรคประจำตัว (Past History: PH), ประวัติแพ้ยา/อาหาร
2. O (Objective): สัญญาณชีพครบชุด (V/S: BP, PR, RR, Temp, SpO2), ผลการตรวจร่างกายตามระบบ (Physical Examination: PE), ผลการตรวจทางห้องปฏิบัติการหรือภาพรังสี (ถ้ามี)
3. A (Assessment): การประเมินทางคลินิก, การวินิจฉัยเบื้องต้น (Provisional Diagnosis / Impression) พร้อมระบุรหัส ICD-10 ที่เกี่ยวข้อง (ถ้าทราบ) และการวินิจฉัยแยกโรค (Differential Diagnosis: DDx)
4. P (Plan):
   - Diagnostic Plan: การตรวจทางห้องปฏิบัติการ/ภาพรังสีเพิ่มเติม
   - Therapeutic Plan: แผนการรักษา, ยาที่สั่งใช้ (ระบุชื่อยา ขนาด วิธีใช้ และระยะเวลาอย่างชัดเจน)
   - Patient Education: คำแนะนำการปฏิบัติตัวและข้อควรระวัง
   - Follow-up: แผนการนัดหมายติดตามอาการ หรือคำแนะนำกรณีอาการทรุดลง (Red Flags)
EOT;
        }

        // 1.2 Discharge Summary (สรุปประวัติเมื่อจำหน่าย)
        if (preg_match('/(discharge\s*summary|สรุปจำหน่าย|สรุปประวัติจำหน่าย|ใบจำหน่ายผู้ป่วย)/iu', $message)) {
            return <<<EOT
[โครงสร้างมาตรฐาน Discharge Summary ตามเกณฑ์เวชระเบียน]:
1. Patient Info: เพศ, อายุ, แผนก/หอผู้ป่วย, วันที่รับไว้รักษา (Admission Date), วันที่จำหน่าย (Discharge Date), รวมระยะเวลานอน รพ. (Length of Stay)
2. Principal Diagnosis (การวินิจฉัยหลัก): โรคที่เป็นสาเหตุหลักในการนอนโรงพยาบาล พร้อมรหัส ICD-10
3. Comorbidities & Complications (โรคแทรกซ้อน/โรคร่วม): โรคประจำตัวหรือภาวะแทรกซ้อนที่เกิดขึ้นระหว่างรักษา
4. Operations & Significant Procedures: หัตถการสำคัญที่ทำ พร้อมระบุวันที่และรหัส ICD-9-CM (ถ้ามี)
5. Hospital Course: สรุปเหตุการณ์สำคัญระหว่างรักษา การตอบสนองต่อยาและการรักษา
6. Condition on Discharge: สภาวะผู้ป่วย ณ วันจำหน่าย (เช่น Improved, Recovered) และสัญญาณชีพก่อนกลับ
7. Discharge Medications: รายการยากลับบ้านพร้อมวิธีรับประทาน
8. Follow-up & Home Care Advice: นัดหมายครั้งต่อไป และคำแนะนำการดูแลตนเอง/สัญญาณเตือนให้กลับมารพ.ทันที
EOT;
        }

        // 1.3 Referral Note (ใบส่งต่อผู้ป่วย)
        if (preg_match('/(refer|ใบส่งต่อ|ส่งต่อผู้ป่วย|referral\s*note)/iu', $message)) {
            return <<<EOT
[โครงสร้างใบส่งต่อผู้ป่วย (Referral Note Guidelines)]:
1. สถานพยาบาลต้นทางและปลายทาง (จาก โรงพยาบาลค่ายสุรสีหนาท ถึง ...)
2. ข้อมูลผู้ป่วยและสิทธิการรักษา
3. อาการสำคัญและประวัติการเจ็บป่วย (Chief Complaint & History of Illness)
4. ผลการตรวจร่างกายและผลตรวจทางห้องปฏิบัติการ/รังสีที่สำคัญ (Significant Physical & Lab Findings)
5. การวินิจฉัยเบื้องต้น (Preliminary Diagnosis)
6. การรักษาที่ได้ให้ไปแล้วก่อนส่งต่อ (Treatments Given Prior to Transfer)
7. เหตุผลความจำเป็นในการส่งต่อ (Reason for Referral เช่น เกินศักยภาพ, ต้องการตรวจพิเศษเฉพาะทาง, สิทธิการรักษา)
8. การดูแลระหว่างเดินทางส่งต่อ (Management During Transport)
EOT;
        }

        return null;
    }

    /**
     * แนวทางและเทมเพลตงานสารบรรณ / บันทึกข้อความราชการ
     */
    private function getAdministrativeDocGuideline(string $message): ?string
    {
        if (preg_match('/(บันทึกข้อความ|หนังสือราชการ|ขออนุมัติ|งานสารบรรณ|หนังสือภายใน|ร่างหนังสือ|ร่างบันทึก)/iu', $message)) {
            return <<<EOT
[รูปแบบมาตรฐานบันทึกข้อความราชการภายในโรงพยาบาลค่ายสุรสีหนาท]:
ให้จัดรูปแบบตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ ดังนี้:
- ส่วนราชการ: โรงพยาบาลค่ายสุรสีหนาท (ระบุกลุ่มงาน/แผนก) โทร. ...
- ที่: (เว้นไว้สำหรับเลขที่สารบรรณ)          วันที่: (ระบุ วัน เดือน ปี)
- เรื่อง: (ระบุเรื่องอย่างชัดเจน สรุปสาระสำคัญ ขึ้นต้นด้วยกริยา เช่น ขออนุมัติ..., ขอความอนุเคราะห์..., รายงานผล...)
- เรียน: ผู้อำนวยการโรงพยาบาลค่ายสุรสีหนาท (หรือผู้บังคับบัญชาตามสายงาน)

โครงสร้างเนื้อหา 3 ย่อหน้ามาตรฐาน:
1. ข้อความย่อหน้าแรก (ต้นเรื่อง/ความเป็นมา):
   - ขึ้นต้นด้วย "ด้วย..." หรือ "ตามที่..." เพื่ออ้างถึงความเป็นมา หนังสือสั่งการเดิม หรือโครงการที่เกี่ยวข้อง
2. ข้อความย่อหน้าที่สอง (ข้อเท็จจริงและเหตุผลความจำเป็น):
   - ขึ้นต้นด้วย "ในการนี้..." หรือ "ข้อเท็จจริงปรากฏว่า..." ชี้แจงรายละเอียด รายการ งบประมาณ เหตุผลความจำเป็น หรือผลประโยชน์ที่โรงพยาบาลจะได้รับ
3. ข้อความย่อหน้าสุดท้าย (ข้อพิจารณาและข้อเสนอ):
   - ขึ้นต้นด้วย "โรงพยาบาลค่ายสุรสีหนาท (หรือแผนก...) พิจารณาแล้วเห็นว่า..."
   - สรุปความประสงค์ เช่น "จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ..." หรือ "จึงเรียนมาเพื่อโปรดทราบและพิจารณาต่อไป"
EOT;
        }

        return null;
    }

    /**
     * แนวทางเวชปฏิบัติ CPG ที่พบบ่อยในโรงพยาบาล (Stroke, STEMI, Sepsis, Dengue, HT, DM)
     */
    private function getClinicalGuideline(string $message): ?string
    {
        // Stroke / อัมพฤกษ์ อัมพาต
        if (preg_match('/(stroke|สโตรก|อัมพฤกษ์|อัมพาต|fast\s*track|หลอดเลือดสมอง)/iu', $message)) {
            return <<<EOT
[แนวปฏิบัติ Stroke Fast Track (Clinical Guideline)]:
1. คัดกรอง BE-FAST: Balance (ทรงตัวไม่อยู่), Eyes (ตามัวมองไม่เห็น), Face (ปากเบี้ยว), Arm (แขนขาอ่อนแรง), Speech (พูดไม่ชัด/นึกคำไม่ออก), Time (Onset < 4.5 ชม.)
2. เป้าหมายเวลา (Time Targets): Door to CT < 25-45 นาที, Door to Needle (rtPA) < 60 นาที
3. การตรวจด่วน: Non-contrast CT Brain ทันที, DTX (ตรวจน้ำตาลในเลือด), CBC, Coagulation (PT, INR, PTT), EKG 12 leads
4. ข้อห้ามสำคัญ rtPA: มีเลือดออกในสมอง (ICH), BP > 185/110 mmHg แม้ให้ยาลดความดันแล้ว, Recent major surgery/trauma < 14 วัน
EOT;
        }

        // STEMI / Chest pain / เจ็บแน่นหน้าอก
        if (preg_match('/(stemi|chest\s*pain|เจ็บแน่นหน้าอก|หัวใจขาดเลือด|กล้ามเนื้อหัวใจตาย)/iu', $message)) {
            return <<<EOT
[แนวปฏิบัติ STEMI / Acute Coronary Syndrome Fast Track]:
1. อาการสงสัย: เจ็บแน่นกลางหน้าอกเหมือนมีอะไรทับ นาน > 20 นาที อาจร้าวไปกรามหรือแขนซ้าย มีเหงื่อแตกตัวเย็น
2. เป้าหมายเวลา: Door to EKG 12 leads <= 10 นาที
3. การรักษาเบื้องต้น (MONA protocol):
   - Oxygen (ถ้า SpO2 < 90%)
   - Aspirin 300 mg เคี้ยวทันที (ถ้าไม่มีข้อห้าม)
   - Clopidogrel 300-600 mg loading
   - Isordil/NTG อมใต้ลิ้น (ห้ามใช้ถ้า BP < 90 หรือใช้ยา PDE5 inhibitor หรือสงสัย Right ventricular infarction)
   - Morphine IV แก้ปวด
4. เตรียมส่งต่อ Primary PCI (เป้าหมาย Door-to-balloon < 90 นาที) หรือพิจารณา Fibrinolytic therapy (Door-to-needle < 30 นาที)
EOT;
        }

        // Sepsis / ติดเชื้อในกระแสเลือด
        if (preg_match('/(sepsis|ติดเชื้อในกระแสเลือด|septic\s*shock)/iu', $message)) {
            return <<<EOT
[แนวปฏิบัติ Sepsis 1-Hour Bundle Guidelines]:
1. สัญญาณสงสัย (qSOFA >= 2): RR >= 22/min, Altered mental status, SBP <= 100 mmHg
2. ปฏิบัติการใน 1 ชั่วโมงแรก (1-Hour Bundle):
   - เจาะเลือดตรวจ Serum Lactate ทันที (ซ้ำถ้า > 2 mmol/L)
   - ส่ง Hemoculture (อย่างน้อย 2 ขวด) ก่อนเริ่มยาปฏิชีวนะ
   - ให้ Broad-spectrum IV Antibiotics ทันทีภายใน 1 ชั่วโมง
   - โหลดสารน้ำ 30 mL/kg Crystalloid IV ในผู้ป่วยที่มีความดันต่ำ (MAP < 65) หรือ Lactate >= 4 mmol/L
   - ให้ยา Vasopressor (Noradrenaline เป็นตัวเลือกแรก) หากสารน้ำแล้ว MAP ยัง < 65 mmHg
EOT;
        }

        // Dengue / ไข้เลือดออก
        if (preg_match('/(dengue|ไข้เลือดออก|เดงกี่)/iu', $message)) {
            return <<<EOT
[แนวปฏิบัติโรคไข้เลือดออก (Dengue Clinical Management)]:
1. สัญญาณเตือนอันตราย (Warning Signs): ปวดท้องรุนแรง, อาเจียนตลอดเวลา, เลือดออกตามเยื่อบุ/จุดเลือดออก, กระสับกระส่าย/ซึม, ตับโต (> 2 ซม.), Hct พุ่งสูงร่วมกับเกล็ดเลือดลดลงอย่างรวดเร็ว
2. การดูแลผู้ป่วย:
   - ห้ามใช้ยา NSAIDs, Aspirin, Ibuprofen เด็ดขาด (ใช้เฉพาะ Paracetamol ตามขนาดยาที่ปลอดภัย)
   - ประเมิน Tourniquet test และติดตาม CBC (Hct, Platelet) ทุกวัน
   - สารน้ำให้ทางปาก (ORS) ให้เพียงพอ หากเข้าสู่ระยะวิกฤต (Critical phase: ช่วงไข้ลด) ให้ระวังภาวะ Plasma leakage และ Dengue Shock Syndrome
EOT;
        }

        // ความดันโลหิตสูง / เบาหวาน (Hypertension / DM)
        if (preg_match('/(ความดันโลหิตสูง|hypertension|เบาหวาน|diabetes|cpg\s*dm|cpg\s*ht)/iu', $message)) {
            return <<<EOT
[แนวปฏิบัติเวชปฏิบัติสำหรับโรคเรื้อรัง HT & DM (Thai CPG Summary)]:
1. โรคความดันโลหิตสูง (Hypertension):
   - เป้าหมาย: BP < 130/80 mmHg (หรือ < 140/90 mmHg ในผู้สูงอายุ/ทั่วไป)
   - ยาอันดับแรก: ACEI/ARB, CCB (Amlodipine), Thiazide diuretics
   - เน้นย้ำการปรับพฤติกรรม (ลดเค็ม < 2,000 mg Na/วัน, ออกกำลังกาย, ควบคุมน้ำหนัก)
2. โรคเบาหวาน (Diabetes Mellitus):
   - เป้าหมาย: HbA1c < 7.0% (หรือ 7.0-8.0% ในผู้สูงอายุที่มีโรคร่วม), FBS 80-130 mg/dL
   - ยาอันดับแรก: Metformin (หาก eGFR > 30 mL/min/1.73m2)
   - ติดตามคัดกรองภาวะแทรกซ้อนประจำปี: ตา (DR), ไต (Microalbumin/eGFR), เท้า (Diabetic foot)
EOT;
        }

        return null;
    }
}
