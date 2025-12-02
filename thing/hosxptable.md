ส่วนงาน,ชื่อตาราง (Table Name),ชื่อ Field (ฟิลด์),คำอธิบายโดยย่อ
ข้อมูลหลักผู้ป่วย,patient,hn,เลขที่โรงพยาบาล (Hospital Number)
,patient,cid,เลขบัตรประชาชน (Citizen ID)
,patient,fname,ชื่อ (First Name)
,patient,lname,นามสกุล (Last Name)
,patient,birthdate,วันเดือนปีเกิด
,pttype,pttype,รหัสสิทธิการรักษา
,pttype,name,ชื่อสิทธิการรักษา
,thaiaddress,chwpart,รหัสจังหวัด
,thaiaddress,amppart,รหัสอำเภอ
,thaiaddress,tmbpart,รหัสตำบล
---,---,---,---
บริการผู้ป่วยนอก (OPD),ovst,vn,เลขที่ Visit (รหัสอ้างอิงการรับบริการ 1 ครั้ง)
,ovst,hn,เลขที่โรงพยาบาล
,ovst,vstdate,วันที่มารับบริการ
,ovst,spclty,รหัสแผนกที่รับบริการ
,opdscreen,symptom,อาการสำคัญ (CC: Chief Complaint)
,opdscreen,bpsys,ความดันโลหิตตัวบน
,opdscreen,bpdia,ความดันโลหิตตัวล่าง
,ovstdiag,icd10,รหัสวินิจฉัยโรค (ICD-10)
,ovstdiag,diagtype,ประเภทการวินิจฉัย (เช่น 1: Principal Diagnosis)
---,---,---,---
การเงิน/ค่ารักษา,opitemrece,icode,รหัสรายการยา/เวชภัณฑ์/บริการ
,opitemrece,qty,จำนวนที่สั่ง/ใช้
,opitemrece,sum_price,ราคารวม
,drugitems,icode,รหัสยา (Item Code)
,drugitems,name,ชื่อยา
,nondrugitems,icode,"รหัสรายการ ที่ไม่ใช่ยา (ค่าบริการ, เวชภัณฑ์)"
,drugusage,drugusage,รหัสวิธีการใช้ยา
---,---,---,---
ห้องปฏิบัติการ (Lab),lab_order,vn,เลขที่ Visit
,lab_items (รายชื่อ lab)
,lab_order,lab_items_code,รหัสรายการ Lab
,lab_order,lab_result,ผลการตรวจ (Result)
,lab_items_normal_value_ref ค่าปกติ
---,---,---,---
อื่นๆ,appoint,appdate,วันที่นัดหมาย
,er_regist,er_pt_type,ประเภทผู้ป่วยฉุกเฉิน