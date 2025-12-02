# 📋 MRA System Development Todo List
## ระบบตรวจประเมินคุณภาพการบันทึกเวชระเบียน (Medical Record Audit)
### ตามเกณฑ์ สรพ. ปี 2563 และ สปสช. (MRA-Pro)

---

## 📊 สถานะโปรเจค: 🔄 กำลังดำเนินการ

| สถานะ | ความหมาย |
|-------|---------|
| ⬜ | ยังไม่เริ่ม |
| 🔄 | กำลังทำ |
| ✅ | เสร็จแล้ว |
| 🧪 | รอทดสอบ |

---

## Phase 1: Database Schema & Models
> ปรับปรุงโครงสร้างฐานข้อมูลตามมาตรฐาน MRA

### 1.1 สร้าง Migration ใหม่
- ⬜ **1.1.1** สร้างตาราง `mra_categories` - หมวดการตรวจสอบตามเกณฑ์ สรพ.
- ⬜ **1.1.2** สร้างตาราง `mra_criteria` - เกณฑ์การตรวจสอบรายข้อ
- ⬜ **1.1.3** ปรับปรุงตาราง `mra_audits` - เพิ่มฟิลด์ตามมาตรฐาน
- ⬜ **1.1.4** ปรับปรุงตาราง `mra_audit_details` - เชื่อมกับ criteria
- ⬜ **1.1.5** สร้างตาราง `mra_settings` - ค่าเป้าหมายและการตั้งค่า

### 1.2 สร้าง Models
- ⬜ **1.2.1** สร้าง Model `MraCategory`
- ⬜ **1.2.2** สร้าง Model `MraCriteria`
- ⬜ **1.2.3** ปรับปรุง Model `MraAudit`
- ⬜ **1.2.4** ปรับปรุง Model `MraAuditDetail`

### 1.3 สร้าง Seeder
- ⬜ **1.3.1** สร้าง Seeder เกณฑ์การตรวจตามมาตรฐาน สรพ. 2563

---

## Phase 2: HOSxP Integration
> เชื่อมต่อข้อมูลจากฐานข้อมูล HOSxP

### 2.1 สร้าง HOSxP Models
- ⬜ **2.1.1** สร้าง Model `Ovst` - ข้อมูล Visit OPD
- ⬜ **2.1.2** สร้าง Model `OpdScreen` - อาการสำคัญ/สัญญาณชีพ
- ⬜ **2.1.3** สร้าง Model `OvstDiag` - การวินิจฉัย OPD
- ⬜ **2.1.4** สร้าง Model `LabOrder` - ผลแลป
- ⬜ **2.1.5** สร้าง Model `Opitemrece` - รายการยา/บริการ

### 2.2 สร้าง Service Layer
- ⬜ **2.2.1** สร้าง `HosxpService` - ดึงข้อมูลจาก HOSxP
- ⬜ **2.2.2** สร้าง `MraDataService` - เตรียมข้อมูลสำหรับตรวจสอบ

---

## Phase 3: Backend API
> สร้าง Controller และ API endpoints

### 3.1 ปรับปรุง MRA Controller
- ⬜ **3.1.1** ปรับปรุง `searchPatient()` - ดึงข้อมูลครบถ้วนขึ้น
- ⬜ **3.1.2** สร้าง `getVisitData()` - ดึงข้อมูล Visit พร้อม OpdScreen, Diag
- ⬜ **3.1.3** สร้าง `getAuditCriteria()` - ดึงเกณฑ์การตรวจ
- ⬜ **3.1.4** ปรับปรุง `store()` - บันทึกพร้อมคะแนน
- ⬜ **3.1.5** สร้าง `calculateScore()` - คำนวณคะแนน MRA
- ⬜ **3.1.6** สร้าง `getStatistics()` - สถิติ Dashboard

### 3.2 สร้าง Routes ใหม่
- ⬜ **3.2.1** เพิ่ม routes สำหรับ API endpoints ใหม่

---

## Phase 4: Frontend - Audit Form
> สร้างหน้า Audit Form ตามเกณฑ์มาตรฐาน

### 4.1 ปรับปรุงหน้า Create
- ⬜ **4.1.1** ปรับปรุง `MRA/Create.tsx` - ค้นหาผู้ป่วย/Visit
- ⬜ **4.1.2** แสดงข้อมูล Visit จาก HOSxP (CC, Diag, Vital Signs)

### 4.2 สร้างหน้า Audit Form
- ⬜ **4.2.1** สร้าง `MRA/AuditForm.tsx` - ฟอร์มตรวจสอบหลัก
- ⬜ **4.2.2** สร้าง Component `AuditSection` - แต่ละหมวด
- ⬜ **4.2.3** สร้าง Component `AuditItem` - แต่ละข้อตรวจ
- ⬜ **4.2.4** สร้าง Component `ScoreSummary` - สรุปคะแนน

### 4.3 หมวดการตรวจตามเกณฑ์ สรพ. 2563
- ⬜ **4.3.1** หมวด 1: ข้อมูลทั่วไปผู้ป่วย (Patient Identification)
- ⬜ **4.3.2** หมวด 2: ประวัติการเจ็บป่วย (History Taking)
- ⬜ **4.3.3** หมวด 3: การตรวจร่างกาย (Physical Examination)
- ⬜ **4.3.4** หมวด 4: การวินิจฉัยโรค (Diagnosis)
- ⬜ **4.3.5** หมวด 5: แผนการรักษา (Treatment Plan)
- ⬜ **4.3.6** หมวด 6: Progress Note
- ⬜ **4.3.7** หมวด 7: คำสั่งการรักษา (Doctor's Order)
- ⬜ **4.3.8** หมวด 8: การลงลายมือชื่อ (Signature & Authentication)
- ⬜ **4.3.9** หมวด 9: Discharge Summary (ถ้ามี)

---

## Phase 5: Frontend - Dashboard & Reports
> สร้าง Dashboard และรายงาน

### 5.1 ปรับปรุง Dashboard
- ⬜ **5.1.1** ปรับปรุง `MRA/Dashboard.tsx`
- ⬜ **5.1.2** แสดงอัตราความถูกต้องรวม (Overall Accuracy Rate)
- ⬜ **5.1.3** แสดงอัตราความถูกต้องรายหมวด
- ⬜ **5.1.4** แสดง Top Errors (ข้อผิดพลาดที่พบบ่อย)
- ⬜ **5.1.5** แสดงแนวโน้มรายเดือน (Trend Chart)
- ⬜ **5.1.6** แสดงการเปรียบเทียบตามแผนก

### 5.2 สร้างหน้ารายงาน
- ⬜ **5.2.1** สร้าง `MRA/Reports.tsx` - หน้ารายงาน
- ⬜ **5.2.2** รายงานสรุปรายเดือน
- ⬜ **5.2.3** รายงานรายแผนก
- ⬜ **5.2.4** Export PDF/Excel

---

## Phase 6: Frontend - List & Detail
> ปรับปรุงหน้ารายการและรายละเอียด

### 6.1 ปรับปรุงหน้า Index
- ⬜ **6.1.1** ปรับปรุง `MRA/Index.tsx` - รายการ Audit
- ⬜ **6.1.2** เพิ่ม Filter (วันที่, แผนก, สถานะ)
- ⬜ **6.1.3** เพิ่ม Search
- ⬜ **6.1.4** แสดงคะแนนในรายการ

### 6.2 ปรับปรุงหน้า Show
- ⬜ **6.2.1** ปรับปรุง `MRA/Show.tsx` - รายละเอียด Audit
- ⬜ **6.2.2** แสดงผลการตรวจแต่ละหมวด
- ⬜ **6.2.3** แสดงคะแนนรายหมวดและรวม

---

## Phase 7: Testing & Deployment
> ทดสอบและ Deploy

### 7.1 Testing
- ⬜ **7.1.1** ทดสอบการเชื่อมต่อ HOSxP
- ⬜ **7.1.2** ทดสอบการค้นหาผู้ป่วย
- ⬜ **7.1.3** ทดสอบการบันทึก Audit
- ⬜ **7.1.4** ทดสอบการคำนวณคะแนน
- ⬜ **7.1.5** ทดสอบ Dashboard
- ⬜ **7.1.6** ทดสอบ UI/UX

### 7.2 Build & Deploy
- ⬜ **7.2.1** Build Production
- ⬜ **7.2.2** Test บน Production

---

## 📝 เกณฑ์การตรวจตามมาตรฐาน สรพ. 2563

### หมวดที่ 1: ข้อมูลทั่วไปผู้ป่วย (Patient Identification)
| รหัส | รายการตรวจ | แหล่งข้อมูล HOSxP |
|------|-----------|------------------|
| 1.1 | ชื่อ-นามสกุล ถูกต้อง ครบถ้วน | patient.fname, patient.lname |
| 1.2 | HN ถูกต้อง | patient.hn |
| 1.3 | เลขบัตรประชาชน ถูกต้อง | patient.cid |
| 1.4 | วันเดือนปีเกิด ถูกต้อง | patient.birthdate |
| 1.5 | ที่อยู่ครบถ้วน | thaiaddress |
| 1.6 | สิทธิการรักษา ถูกต้อง | pttype |

### หมวดที่ 2: ประวัติการเจ็บป่วย (History Taking)
| รหัส | รายการตรวจ | แหล่งข้อมูล HOSxP |
|------|-----------|------------------|
| 2.1 | Chief Complaint (CC) ครบถ้วน | opdscreen.symptom |
| 2.2 | Present Illness (PI) ครบถ้วน | - |
| 2.3 | Past History ครบถ้วน | - |
| 2.4 | ประวัติแพ้ยา | patient.drugallergy |

### หมวดที่ 3: การตรวจร่างกาย (Physical Examination)
| รหัส | รายการตรวจ | แหล่งข้อมูล HOSxP |
|------|-----------|------------------|
| 3.1 | Vital Signs ครบถ้วน | opdscreen (bpsys, bpdia, pulse, temp) |
| 3.2 | การตรวจร่างกายตามระบบ | - |

### หมวดที่ 4: การวินิจฉัยโรค (Diagnosis)
| รหัส | รายการตรวจ | แหล่งข้อมูล HOSxP |
|------|-----------|------------------|
| 4.1 | Principal Diagnosis (PDx) ถูกต้อง | ovstdiag (diagtype=1) |
| 4.2 | ICD-10 ตรงกับการวินิจฉัย | ovstdiag.icd10 |
| 4.3 | Secondary Diagnosis ครบถ้วน | ovstdiag (diagtype=2,3,4,5) |

### หมวดที่ 5: แผนการรักษา (Treatment Plan)
| รหัส | รายการตรวจ | แหล่งข้อมูล HOSxP |
|------|-----------|------------------|
| 5.1 | แผนการรักษาสอดคล้องกับการวินิจฉัย | - |
| 5.2 | การสั่งยาเหมาะสม | opitemrece, drugitems |
| 5.3 | การส่งตรวจ Lab เหมาะสม | lab_order |

### หมวดที่ 6: การลงลายมือชื่อ (Authentication)
| รหัส | รายการตรวจ | แหล่งข้อมูล HOSxP |
|------|-----------|------------------|
| 6.1 | ลายมือชื่อแพทย์ ครบถ้วน | - |
| 6.2 | วันที่-เวลา บันทึกครบถ้วน | ovst.vstdate, vsttime |

---

## 📅 Timeline โดยประมาณ

| Phase | ระยะเวลา | หมายเหตุ |
|-------|---------|---------|
| Phase 1 | ~30 นาที | Database & Models |
| Phase 2 | ~20 นาที | HOSxP Integration |
| Phase 3 | ~30 นาที | Backend API |
| Phase 4 | ~60 นาที | Audit Form UI |
| Phase 5 | ~30 นาที | Dashboard |
| Phase 6 | ~20 นาที | List & Detail |
| Phase 7 | ~15 นาที | Testing |

**รวม: ~3-4 ชั่วโมง**

---

## 🚀 เริ่มต้นทำงาน!

**วันที่เริ่ม:** 2 ธันวาคม 2025
**ผู้พัฒนา:** GitHub Copilot + User

---
