<?php

return [
    // ── ปรนัย (Multiple Choice) — 18 ข้อ ──
    [
        'question_text' => 'หน่วยประมวลผลกลาง (CPU) ทำหน้าที่หลักในการทำงานของคอมพิวเตอร์อย่างไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ประมวลผลและควบคุมการทำงานของคอมพิวเตอร์ตามคำสั่งโปรแกรม', 'is_correct' => true],
            ['answer_text' => 'เก็บข้อมูลระยะยาวแม้ปิดเครื่อง', 'is_correct' => false],
            ['answer_text' => 'แสดงภาพบนหน้าจอ', 'is_correct' => false],
            ['answer_text' => 'เชื่อมต่อคอมพิวเตอร์เข้ากับอินเทอร์เน็ตโดยตรง', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'หน่วยความจำหลัก (RAM) มีลักษณะการทำงานอย่างไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'เก็บข้อมูลชั่วคราวขณะเปิดเครื่องและปิดแล้วข้อมูลจะหาย', 'is_correct' => true],
            ['answer_text' => 'เก็บข้อมูลถาวรแม้ปิดเครื่อง', 'is_correct' => false],
            ['answer_text' => 'ใช้พิมพ์เอกสารออกกระดาษ', 'is_correct' => false],
            ['answer_text' => 'เป็นระบบปฏิบัติการของคอมพิวเตอร์', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'อุปกรณ์จัดเก็บข้อมูลใดที่เหมาะสมที่สุดสำหรับเก็บไฟล์เอกสารและรูปภาพในระยะยาว?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ฮาร์ดดิสก์ (HDD) หรือ SSD', 'is_correct' => true],
            ['answer_text' => 'หน่วยความจำ RAM', 'is_correct' => false],
            ['answer_text' => 'แคชของเว็บเบราว์เซอร์', 'is_correct' => false],
            ['answer_text' => 'คีย์บอร์ด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ข้อใดเป็นอุปกรณ์นำเข้า (Input Device)?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'เมาส์', 'is_correct' => true],
            ['answer_text' => 'จอภาพ (Monitor)', 'is_correct' => false],
            ['answer_text' => 'เครื่องพิมพ์', 'is_correct' => false],
            ['answer_text' => 'ลำโพง', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ข้อใดเป็นอุปกรณ์ส่งออก (Output Device)?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'เครื่องพิมพ์', 'is_correct' => true],
            ['answer_text' => 'สแกนเนอร์', 'is_correct' => false],
            ['answer_text' => 'ไมโครโฟน', 'is_correct' => false],
            ['answer_text' => 'เว็บแคม', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ระบบปฏิบัติการ (Operating System) มีหน้าที่หลักอย่างไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ควบคุมและจัดการทรัพยากรของคอมพิวเตอร์ รวมถึงเป็นตัวกลางระหว่างผู้ใช้กับฮาร์ดแวร์', 'is_correct' => true],
            ['answer_text' => 'ใช้พิมพ์เอกสารใน Microsoft Word', 'is_correct' => false],
            ['answer_text' => 'เป็นอุปกรณ์จัดเก็บข้อมูลภายนอก', 'is_correct' => false],
            ['answer_text' => 'ใช้ส่งอีเมลเท่านั้น', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ข้อใดอธิบายความแตกต่างระหว่างฮาร์ดแวร์ และซอฟต์แวร์ ได้ถูกต้อง?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ฮาร์ดแวร์ เป็นส่วนประกอบทางกายภาพที่จับต้องได้ ส่วนซอฟต์แวร์ เป็นชุดคำสั่งโปรแกรม', 'is_correct' => true],
            ['answer_text' => 'ฮาร์ดแวร์ คือโปรแกรม ส่วนซอฟต์แวร์ คืออุปกรณ์', 'is_correct' => false],
            ['answer_text' => 'ทั้งสองอย่างหมายถึงอินเทอร์เน็ต', 'is_correct' => false],
            ['answer_text' => 'ซอฟต์แวร์ ต้องใช้ไฟฟ้าเท่านั้น ฮาร์ดแวร์ ไม่ต้องใช้', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ไฟล์เอกสาร Microsoft Word มักมีนามสกุล (Extension) ใด?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => '.docx', 'is_correct' => true],
            ['answer_text' => '.xlsx', 'is_correct' => false],
            ['answer_text' => '.jpg', 'is_correct' => false],
            ['answer_text' => '.mp4', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'การสร้างโฟลเดอร์ (Folder) ใน Windows มีประโยชน์อย่างไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ช่วยจัดระเบียบและจัดกลุ่มไฟล์ให้ค้นหาได้ง่าย', 'is_correct' => true],
            ['answer_text' => 'ทำให้ไฟล์รันเร็วขึ้นโดยอัตโนมัติ', 'is_correct' => false],
            ['answer_text' => 'เข้ารหัสไฟล์ทุกไฟล์ในโฟลเดอร์ทันที', 'is_correct' => false],
            ['answer_text' => 'ลบไวรัสในไฟล์ทั้งหมด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'โปรแกรม Web Browser ใช้สำหรับทำอะไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'เปิดและแสดงหน้าเว็บไซต์บนอินเทอร์เน็ต', 'is_correct' => true],
            ['answer_text' => 'สร้างและแก้ไขเอกสาร Word', 'is_correct' => false],
            ['answer_text' => 'สำรองข้อมูลลงแผ่น CD', 'is_correct' => false],
            ['answer_text' => 'ติดตั้งไดรเวอร์ของเครื่องพิมพ์', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'URL (Uniform Resource Locator) คืออะไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ที่อยู่ของหน้าเว็บไซต์บนอินเทอร์เน็ต', 'is_correct' => true],
            ['answer_text' => 'รหัสผ่านสำหรับเข้าใช้อีเมล', 'is_correct' => false],
            ['answer_text' => 'ชื่อไฟล์ในเครื่องคอมพิวเตอร์', 'is_correct' => false],
            ['answer_text' => 'โปรแกรมสแกนไวรัส', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ส่วนหนึ่งของที่อยู่อีเมล (Email Address) ที่ระบุชื่อผู้ใช้และโดเมนของผู้ให้บริการ เช่น user@hospital.go.th เรียกว่าอะไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ที่อยู่อีเมล (Email Address)', 'is_correct' => true],
            ['answer_text' => 'URL ของเว็บไซต์', 'is_correct' => false],
            ['answer_text' => 'IP Address ของเครื่องพิมพ์', 'is_correct' => false],
            ['answer_text' => 'ชื่อโฟลเดอร์ในไดรฟ์ C:', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'Cloud Computing (คลาวด์) ในบริบทการทำงานของโรงพยาบาล หมายถึงอะไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'การจัดเก็บและเข้าถึงข้อมูลหรือโปรแกรมผ่านอินเทอร์เน็ตบนเซิร์ฟเวอร์ของผู้ให้บริการ', 'is_correct' => true],
            ['answer_text' => 'การติดตั้งโปรแกรมลงในคอมพิวเตอร์เครื่องเดียวเท่านั้น', 'is_correct' => false],
            ['answer_text' => 'การใช้จอภาพขนาดใหญ่เพื่อดูข้อมูล', 'is_correct' => false],
            ['answer_text' => 'การพิมพ์เอกสารผ่านเครือข่าย Wi-Fi', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'เมื่อคอมพิวเตอร์ทำงานช้าหรือค้างบ่อย ขั้นตอนใดควรลองทำก่อนเป็นอันดับแรก?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'รีสตาร์ท (Restart) เครื่องคอมพิวเตอร์', 'is_correct' => true],
            ['answer_text' => 'ถอดสายไฟและทิ้งเครื่องทันที', 'is_correct' => false],
            ['answer_text' => 'ลบไฟล์ระบบในไดรฟ์ C: ทั้งหมด', 'is_correct' => false],
            ['answer_text' => 'แชร์รหัสผ่านให้เพื่อนร่วมงานช่วยแก้', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'USB Flash Drive ใช้สำหรับอะไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'พกพาและถ่ายโอนไฟล์ระหว่างคอมพิวเตอร์', 'is_correct' => true],
            ['answer_text' => 'เพิ่มความเร็ว CPU', 'is_correct' => false],
            ['answer_text' => 'แสดงภาพบนหน้าจอ', 'is_correct' => false],
            ['answer_text' => 'เป็นระบบปฏิบัติการของคอมพิวเตอร์', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'แป้นลัด Ctrl + S ในโปรแกรมส่วนใหญ่ใช้ทำอะไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'บันทึก (Save) ไฟล์', 'is_correct' => true],
            ['answer_text' => 'พิมพ์เอกสาร', 'is_correct' => false],
            ['answer_text' => 'ปิดโปรแกรมทันที', 'is_correct' => false],
            ['answer_text' => 'คัดลอกข้อความ', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'โปรแกรม Antivirus มีหน้าที่หลักอย่างไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ตรวจจับและป้องกันไวรัสและมัลแวร์', 'is_correct' => true],
            ['answer_text' => 'เพิ่มความเร็วอินเทอร์เน็ต', 'is_correct' => false],
            ['answer_text' => 'สร้างเอกสาร Word', 'is_correct' => false],
            ['answer_text' => 'จัดการอีเมลขององค์กร', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'เจ้าหน้าที่โรงพยาบาลควรปฏิบัติอย่างไรเกี่ยวกับลิขสิทธิ์ซอฟต์แวร์?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ใช้เฉพาะโปรแกรมที่ได้รับอนุญาตและติดตั้งโดยฝ่าย IT ของโรงพยาบาล', 'is_correct' => true],
            ['answer_text' => 'ดาวน์โหลดโปรแกรมแครกจากอินเทอร์เน็ตได้หากใช้ในที่ทำงาน', 'is_correct' => false],
            ['answer_text' => 'แชร์ไฟล์ติดตั้งโปรแกรมให้เพื่อนร่วมงานทุกคน', 'is_correct' => false],
            ['answer_text' => 'ไม่จำเป็นต้องสนใจเรื่องลิขสิทธิ์ในองค์กร', 'is_correct' => false],
        ],
    ],

    // ── ถูก/ผิด (True/False) — 8 ข้อ ──
    [
        'question_text' => 'หน่วยความจำ RAM สามารถเก็บข้อมูลไว้ได้แม้ปิดเครื่องคอมพิวเตอร์แล้ว',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => false],
            ['answer_text' => 'ผิด', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'จอภาพ (Monitor) เป็นอุปกรณ์ส่งออก (Output Device)',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'Microsoft Windows เป็นระบบปฏิบัติการ (Operating System)',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'การลบไฟล์จากถังรีไซเคิล (Recycle Bin) แล้ว ไฟล์จะถูกลบถาวรจากเครื่อง',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'Wi-Fi เป็นเทคโนโลยีที่ใช้เชื่อมต่ออุปกรณ์เข้ากับเครือข่ายแบบไร้สาย',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'เจ้าหน้าที่โรงพยาบาลสามารถโพสต์ข้อมูลผู้ป่วยลงโซเชียลมีเดียได้หากไม่ระบุชื่อ',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => false],
            ['answer_text' => 'ผิด', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'ซอฟต์แวร์ สามารถทำงานได้โดยไม่ต้องมีฮาร์ดแวร์',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => false],
            ['answer_text' => 'ผิด', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'ไฟล์แนบในอีเมลอาจมีมัลแวร์หรือไวรัสได้ จึงควรเปิดเฉพาะจากผู้ส่งที่ไว้ใจได้',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],

    // ── เติมคำ (Fill Blank) — 2 ข้อ ──
    [
        'question_text' => 'หน่วยประมวลผลกลางของคอมพิวเตอร์ ย่อว่า ___ (ภาษาอังกฤษ 3 ตัวอักษร)',
        'type' => 'fill_blank',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'CPU', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'โปรแกรมที่ใช้เปิดและแสดงหน้าเว็บไซต์บนอินเทอร์เน็ต เรียกว่า ___ (ภาษาอังกฤษ 2 คำ)',
        'type' => 'fill_blank',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'Web Browser', 'is_correct' => true],
        ],
    ],

    // ── จับคู่ (Matching) — 2 ข้อ ──
    [
        'question_text' => 'จับคู่อุปกรณ์คอมพิวเตอร์กับหน้าที่การทำงานให้ถูกต้อง',
        'type' => 'matching',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'คีย์บอร์ด', 'matching_pair' => 'ป้อนตัวอักษรและคำสั่ง', 'is_correct' => true],
            ['answer_text' => 'จอภาพ', 'matching_pair' => 'แสดงผลภาพและข้อความ', 'is_correct' => true],
            ['answer_text' => 'ฮาร์ดดิสก์', 'matching_pair' => 'จัดเก็บไฟล์ระยะยาว', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'จับคู่นามสกุลไฟล์ (Extension) กับประเภทไฟล์ให้ถูกต้อง',
        'type' => 'matching',
        'points' => 1,
        'answers' => [
            ['answer_text' => '.xlsx', 'matching_pair' => 'ไฟล์ตารางคำนวณ Excel', 'is_correct' => true],
            ['answer_text' => '.pdf', 'matching_pair' => 'ไฟล์เอกสาร Portable Document Format', 'is_correct' => true],
            ['answer_text' => '.jpg', 'matching_pair' => 'ไฟล์รูปภาพ', 'is_correct' => true],
        ],
    ],
];
