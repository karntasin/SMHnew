<?php

return [
    [
        'question_text' => 'ใน Windows 10/11 ปุ่มลัดใดที่ใช้ล็อกหน้าจอคอมพิวเตอร์ได้ทันทีโดยไม่ต้องปิดเครื่อง?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => 'Windows + L', 'is_correct' => true],
            ['answer_text' => 'Ctrl + Alt + Delete แล้วเลือก Sign out', 'is_correct' => false],
            ['answer_text' => 'Alt + F4', 'is_correct' => false],
            ['answer_text' => 'Windows + D', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ปุ่มลัดใดใช้เปิด File Explorer (โฟลเดอร์/ไดรฟ์) ใน Windows?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => 'Windows + E', 'is_correct' => true],
            ['answer_text' => 'Windows + R', 'is_correct' => false],
            ['answer_text' => 'Ctrl + E', 'is_correct' => false],
            ['answer_text' => 'Windows + I', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'นามสกุลไฟล์ใดเป็นรูปแบบมาตรฐานของเอกสาร Microsoft Word ปัจจุบัน?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => '.docx', 'is_correct' => true],
            ['answer_text' => '.xlsx', 'is_correct' => false],
            ['answer_text' => '.pptx', 'is_correct' => false],
            ['answer_text' => '.pdf', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'การจัดเก็บไฟล์งานในโรงพยาบาลที่เหมาะสมที่สุดคือข้อใด?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => 'แยกโฟลเดอร์ตามปี/แผนก/ประเภทงาน และตั้งชื่อไฟล์ให้สื่อความหมาย', 'is_correct' => true],
            ['answer_text' => 'เก็บทุกไฟล์ไว้บน Desktop เพื่อหาง่าย', 'is_correct' => false],
            ['answer_text' => 'ใช้ชื่อไฟล์สั้น ๆ เช่น 1.docx, 2.docx', 'is_correct' => false],
            ['answer_text' => 'เก็บเฉพาะใน USB ส่วนตัวเพื่อความปลอดภัย', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ใน Microsoft Word ปุ่มลัดใดใช้บันทึกเอกสาร (Save)?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => 'Ctrl + S', 'is_correct' => true],
            ['answer_text' => 'Ctrl + P', 'is_correct' => false],
            ['answer_text' => 'Ctrl + N', 'is_correct' => false],
            ['answer_text' => 'Ctrl + O', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ใน Microsoft Word การคัดลอกข้อความที่เลือกไว้ใช้ปุ่มลัดใด?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => 'Ctrl + C', 'is_correct' => true],
            ['answer_text' => 'Ctrl + V', 'is_correct' => false],
            ['answer_text' => 'Ctrl + X', 'is_correct' => false],
            ['answer_text' => 'Ctrl + Z', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ใน Microsoft Excel ช่อง A1 หมายถึงอะไร?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => 'คอลัมน์ A แถวที่ 1', 'is_correct' => true],
            ['answer_text' => 'แถว A คอลัมน์ที่ 1', 'is_correct' => false],
            ['answer_text' => 'ชีตแรกของไฟล์', 'is_correct' => false],
            ['answer_text' => 'สูตรคำนวณเริ่มต้น', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ใน Microsoft Excel สูตรใดใช้รวมตัวเลขในช่วงเซลล์ B2 ถึง B10?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => '=SUM(B2:B10)', 'is_correct' => true],
            ['answer_text' => '=COUNT(B2:B10)', 'is_correct' => false],
            ['answer_text' => '=AVERAGE(B2+B10)', 'is_correct' => false],
            ['answer_text' => '=TOTAL(B2:B10)', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ใน Microsoft Excel การเรียงลำดับข้อมูล (Sort) ช่วยให้ทำอะไรได้?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => 'จัดเรียงข้อมูลตามค่า เช่น วันที่ ชื่อ หรือตัวเลข จากน้อยไปมากหรือมากไปน้อย', 'is_correct' => true],
            ['answer_text' => 'ลบข้อมูลที่ซ้ำกันออกจากตาราง', 'is_correct' => false],
            ['answer_text' => 'แปลงตัวเลขเป็นข้อความ', 'is_correct' => false],
            ['answer_text' => 'พิมพ์ตารางออกเครื่องพิมพ์โดยตรง', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ใน Microsoft PowerPoint ปุ่มใดใช้เริ่มนำเสนอสไลด์โชว์จากสไลด์แรก?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => 'F5', 'is_correct' => true],
            ['answer_text' => 'F1', 'is_correct' => false],
            ['answer_text' => 'Ctrl + S', 'is_correct' => false],
            ['answer_text' => 'Esc', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ในอีเมล ฟิลด์ BCC (Blind Carbon Copy) ใช้ทำอะไร?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => 'ส่งสำเนาให้ผู้รับโดยที่ผู้รับคนอื่นไม่เห็นรายชื่อใน BCC', 'is_correct' => true],
            ['answer_text' => 'ส่งอีเมลด่วนพิเศษ', 'is_correct' => false],
            ['answer_text' => 'แนบไฟล์ขนาดใหญ่', 'is_correct' => false],
            ['answer_text' => 'ตั้งเวลาส่งอีเมลล่วงหน้า', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'เมื่อได้รับอีเมลมีไฟล์แนบจากผู้ส่งที่ไม่รู้จัก ควรปฏิบัติอย่างไร?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => 'ไม่เปิดไฟล์แนบ และตรวจสอบ/รายงานฝ่าย IT หากสงสัย', 'is_correct' => true],
            ['answer_text' => 'เปิดทันทีเพื่อดูว่าเป็นอะไร', 'is_correct' => false],
            ['answer_text' => 'ส่งต่อให้เพื่อนร่วมงานเปิดแทน', 'is_correct' => false],
            ['answer_text' => 'บันทึกลง USB แล้วนำไปเปิดที่เครื่องอื่น', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'Google Drive หรือ OneDrive ใช้ทำอะไรได้เป็นหลัก?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => 'เก็บ แชร์ และสำรองไฟล์บนคลาวด์ ให้เข้าถึงได้จากหลายอุปกรณ์', 'is_correct' => true],
            ['answer_text' => 'สแกนไวรัสในเครื่องคอมพิวเตอร์', 'is_correct' => false],
            ['answer_text' => 'ติดตั้ง Windows ใหม่', 'is_correct' => false],
            ['answer_text' => 'พิมพ์เอกสารโดยไม่ต้องมีเครื่องพิมพ์', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'เมื่อมีเครื่องพิมพ์หลายเครื่องในโรงพยาบาล การตั้ง "Default Printer" หมายถึงอะไร?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => 'เครื่องพิมพ์ที่ระบบจะใช้โดยอัตโนมัติเมื่อสั่งพิมพ์', 'is_correct' => true],
            ['answer_text' => 'เครื่องพิมพ์ที่พิมพ์เร็วที่สุดเท่านั้น', 'is_correct' => false],
            ['answer_text' => 'เครื่องพิมพ์ที่ใช้พิมพ์เอกสารลับเท่านั้น', 'is_correct' => false],
            ['answer_text' => 'เครื่องพิมพ์ที่ไม่ต้องใส่กระดาษ', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ปุ่มลัด Alt + Tab ใน Windows ใช้ทำอะไร?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => 'สลับระหว่างหน้าต่างโปรแกรมที่เปิดอยู่', 'is_correct' => true],
            ['answer_text' => 'ปิดโปรแกรมทั้งหมด', 'is_correct' => false],
            ['answer_text' => 'เปิด Task Manager', 'is_correct' => false],
            ['answer_text' => 'ซูมหน้าจอ', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'การสำรองข้อมูล (Backup) ที่ดีควรทำอย่างไร?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => 'สำรองไฟล์สำคัญเป็นประจำ และเก็บไว้คนละที่กับเครื่องต้นฉบับ', 'is_correct' => true],
            ['answer_text' => 'สำรองครั้งเดียวเมื่อซื้อคอมพิวเตอร์ใหม่', 'is_correct' => false],
            ['answer_text' => 'เก็บไฟล์เฉพาะใน Desktop ก็เพียงพอ', 'is_correct' => false],
            ['answer_text' => 'ลบไฟล์เก่าออกแทนการสำรองเพื่อประหยัดพื้นที่', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'Recycle Bin (ถังขยะ) ใน Windows มีหน้าที่อะไร?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => 'เก็บไฟล์ที่ลบไว้ชั่วคราว สามารถกู้คืนได้ก่อนลบถาวร', 'is_correct' => true],
            ['answer_text' => 'ลบไฟล์ออกจากคอมพิวเตอร์ถาวรทันที', 'is_correct' => false],
            ['answer_text' => 'บีบอัดไฟล์ให้เล็กลง', 'is_correct' => false],
            ['answer_text' => 'สแกนไวรัสในไฟล์ที่ลบ', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ใน Microsoft Excel ฟีเจอร์ Filter (ตัวกรอง) ใช้ทำอะไร?',
        'type' => 'multiple_choice',
        'answers' => [
            ['answer_text' => 'แสดงเฉพาะแถวข้อมูลที่ตรงเงื่อนไขที่เลือก', 'is_correct' => true],
            ['answer_text' => 'ลบคอลัมน์ที่ไม่ต้องการ', 'is_correct' => false],
            ['answer_text' => 'เปลี่ยนสีเซลล์อัตโนมัติ', 'is_correct' => false],
            ['answer_text' => 'รวมหลายชีตเป็นชีตเดียว', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ปุ่มลัด Ctrl + Z ใช้ยกเลิกการทำงานล่าสุด (Undo) ใน Word, Excel และ PowerPoint',
        'type' => 'true_false',
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'การส่งรหัสผ่านระบบงานให้เพื่อนร่วมงานทางอีเมลเป็นแนวทางที่ปลอดภัย',
        'type' => 'true_false',
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => false],
            ['answer_text' => 'ผิด', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'ไฟล์ที่เก็บใน OneDrive หรือ Google Drive สามารถซิงก์และเปิดดูจากอุปกรณ์อื่นได้ หากล็อกอินบัญชีเดียวกัน',
        'type' => 'true_false',
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'เมื่อลบไฟล์จาก Recycle Bin แล้ว ไฟล์จะถูกกู้คืนได้ง่ายโดยไม่ต้องใช้เครื่องมือพิเศษ',
        'type' => 'true_false',
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => false],
            ['answer_text' => 'ผิด', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'ก่อนคลิกลิงก์ในอีเมล ควรตรวจสอบที่อยู่ผู้ส่งและเนื้อหาว่าน่าเชื่อถือหรือไม่',
        'type' => 'true_false',
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'การใช้ Print Preview (ดูก่อนพิมพ์) ช่วยลดการพิมพ์ผิดและประหยัดกระดาษ',
        'type' => 'true_false',
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ใน Windows 10/11 ปุ่มลัด Windows + Shift + S ใช้จับภาพหน้าจอ (Screenshot) บางส่วนหรือทั้งหน้าจอ',
        'type' => 'true_false',
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'การสำรองข้อมูลเป็นประจำช่วยลดความเสี่ยงเมื่อไฟล์เสียหาย ไวรัสเข้ารหัส หรือฮาร์ดดิสก์เสีย',
        'type' => 'true_false',
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ปุ่มลัดสำหรับบันทึกเอกสารใน Microsoft Word, Excel และ PowerPoint คือ Ctrl + _____',
        'type' => 'fill_blank',
        'answers' => [
            ['answer_text' => 'S', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'นามสกุลไฟล์มาตรฐานของ Microsoft Excel คือ ._____',
        'type' => 'fill_blank',
        'answers' => [
            ['answer_text' => 'xlsx', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'จับคู่ปุ่มลัด Windows กับหน้าที่ให้ถูกต้อง',
        'type' => 'matching',
        'answers' => [
            ['answer_text' => 'Ctrl + C', 'matching_pair' => 'คัดลอก', 'is_correct' => true],
            ['answer_text' => 'Ctrl + V', 'matching_pair' => 'วาง', 'is_correct' => true],
            ['answer_text' => 'Ctrl + P', 'matching_pair' => 'พิมพ์', 'is_correct' => true],
            ['answer_text' => 'Ctrl + F', 'matching_pair' => 'ค้นหา', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'จับคู่โปรแกรม Microsoft Office กับการใช้งานหลัก',
        'type' => 'matching',
        'answers' => [
            ['answer_text' => 'Microsoft Word', 'matching_pair' => 'พิมพ์เอกสาร หนังสือ รายงาน', 'is_correct' => true],
            ['answer_text' => 'Microsoft Excel', 'matching_pair' => 'คำนวณและจัดการตารางตัวเลข', 'is_correct' => true],
            ['answer_text' => 'Microsoft PowerPoint', 'matching_pair' => 'จัดทำสไลด์นำเสนอ', 'is_correct' => true],
            ['answer_text' => 'Microsoft Outlook', 'matching_pair' => 'ส่งและรับอีเมล', 'is_correct' => true],
        ],
    ],
];
