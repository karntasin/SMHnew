<?php

return [
    [
        'question_text' => 'ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ.2562 "ข้อมูลส่วนบุคคล" หมายถึงอะไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ข้อมูลเกี่ยวกับบุคคลที่ทำให้สามารถระบุตัวบุคคลนั้นได้ ไม่ว่าทางตรงหรือทางอ้อม', 'is_correct' => true],
            ['answer_text' => 'ข้อมูลทางการเงินของโรงพยาบาลเท่านั้น', 'is_correct' => false],
            ['answer_text' => 'ข้อมูลที่เผยแพร่สาธารณะบนเว็บไซต์โรงพยาบาล', 'is_correct' => false],
            ['answer_text' => 'ข้อมูลสถิติที่ไม่มีชื่อผู้ป่วย', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ข้อมูลสุขภาพของผู้ป่วย ข้อมูลพันธุกรรม และข้อมูลไบโอเมตริก จัดเป็น "ข้อมูลส่วนบุคคลอ่อนไหว" ตาม PDPA',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูกต้อง — ต้องมีฐานทางกฎหมายที่เข้มงวดกว่าข้อมูลส่วนบุคคลทั่วไป', 'is_correct' => true],
            ['answer_text' => 'ผิด — ข้อมูลสุขภาพเป็นข้อมูลส่วนบุคคลธรรมดา', 'is_correct' => false],
            ['answer_text' => 'ผิด — ใช้ได้เฉพาะโรงพยาบาลเอกชน', 'is_correct' => false],
            ['answer_text' => 'ถูกต้อง — แต่ไม่ต้องขอความยินยอมในการรักษา', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'โรงพยาบาลต้องการใช้ข้อมูลผู้ป่วยเพื่อวัตถุประสงค์ใหม่ (เช่น ส่งโปรโมชัน wellness) ควรทำอย่างไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ขอความยินยอมจากเจ้าของข้อมูลส่วนบุคคลก่อน เว้นแต่มีฐานทางกฎหมายอื่น', 'is_correct' => true],
            ['answer_text' => 'ใช้ได้เลยเพราะเป็นผู้ป่วยของโรงพยาบาล', 'is_correct' => false],
            ['answer_text' => 'แจ้งทาง Line หลังส่งโปรโมชันแล้ว', 'is_correct' => false],
            ['answer_text' => 'ให้พยาบาลโทรถามทีละคนโดยไม่บันทึก', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ฐานทางกฎหมายในการเก็บรวบรวมข้อมูลส่วนบุคคล (มาตรา 24) ใดที่โรงพยาบาลมักใช้ในการรักษาผู้ป่วย?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'การปฏิบัติตามสัญญา หรือเพื่อประโยชน์สำคัญต่อชีวิต (vital interest)', 'is_correct' => true],
            ['answer_text' => 'ผลประโยชน์โดยชอบด้วยกฎหมายของพนักงานเท่านั้น', 'is_correct' => false],
            ['answer_text' => 'การตลาดโดยไม่ต้องแจ้ง', 'is_correct' => false],
            ['answer_text' => 'ความยินยอมโดยปริยายจากญาติ', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'เจ้าของข้อมูลส่วนบุคคลมีสิทธิใดตาม PDPA?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ขอเข้าถึง แก้ไข ลบ ระงับ หรือโอนข้อมูล และคัดค้านการประมวลผลในบางกรณี', 'is_correct' => true],
            ['answer_text' => 'เข้าถึงข้อมูลผู้ป่วยรายอื่นในโรงพยาบาลได้', 'is_correct' => false],
            ['answer_text' => 'เรียกค่าปรับจากโรงพยาบาลโดยตรง', 'is_correct' => false],
            ['answer_text' => 'ยกเลิก PDPA สำหรับตนเองได้', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => '"ผู้ควบคุมข้อมูลส่วนบุคคล" (Data Controller) ในโรงพยาบาลหมายถึงใคร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'นิติบุคคลหรือหน่วยงานที่กำหนดวัตถุประสงค์และวิธีการประมวลผลข้อมูล', 'is_correct' => true],
            ['answer_text' => 'บริษัทที่ให้เช่าระบบ HOSxP เท่านั้น', 'is_correct' => false],
            ['answer_text' => 'พยาบาลที่บันทึกข้อมูลผู้ป่วยทุกคน', 'is_correct' => false],
            ['answer_text' => 'สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => '"ผู้ประมวลผลข้อมูลส่วนบุคคล" (Data Processor) คือผู้ที่ประมวลผลข้อมูลตามคำสั่งของผู้ควบคุมข้อมูล',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูกต้อง — เช่น ผู้ให้บริการคลาวด์ที่เก็บข้อมูลตามสัญญา', 'is_correct' => true],
            ['answer_text' => 'ผิด — เป็นคนเดียวกับผู้ควบคุมข้อมูลเสมอ', 'is_correct' => false],
            ['answer_text' => 'ผิด — หมายถึงเจ้าของข้อมูลส่วนบุคคล', 'is_correct' => false],
            ['answer_text' => 'ถูกต้อง — แต่ไม่ต้องมีสัญญาระบุหน้าที่', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'DPO (Data Protection Officer) มีบทบาทหลักอย่างไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ให้คำปรึกษา ตรวจสอบการปฏิบัติตาม PDPA และเป็นช่องทางประสานงาน', 'is_correct' => true],
            ['answer_text' => 'อนุมัติการรักษาผู้ป่วยทุกราย', 'is_correct' => false],
            ['answer_text' => 'เก็บรหัสผ่าน HOSxP ของพนักงาน', 'is_correct' => false],
            ['answer_text' => 'ลงโทษพนักงานที่ลืมล็อกหน้าจอ', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'Privacy Notice (ประกาศความเป็นส่วนตัว) ต้องแจ้งข้อมูลใดแก่เจ้าของข้อมูล?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'วัตถุประสงค์ ประเภทข้อมูล ระยะเวลาเก็บ สิทธิของเจ้าของข้อมูล และช่องทางติดต่อ', 'is_correct' => true],
            ['answer_text' => 'รหัสผ่านระบบของโรงพยาบาล', 'is_correct' => false],
            ['answer_text' => 'เงินเดือนพนักงานทุกคน', 'is_correct' => false],
            ['answer_text' => 'รายชื่อผู้ป่วย VIP', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'เมื่อเกิดเหตุละเมิดข้อมูลส่วนบุคคล (Data Breach) ที่อาจก่อให้เกิดความเสี่ยงต่อสิทธิและเสรีภาพ ผู้ควบคุมข้อมูลต้องแจ้งสำนักงาน ป.ค.ส. ภายในกี่ชั่วโมง?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => '72 ชั่วโมง นับแต่ทราบเหตุ', 'is_correct' => true],
            ['answer_text' => '24 ชั่วโมง', 'is_correct' => false],
            ['answer_text' => '7 วัน', 'is_correct' => false],
            ['answer_text' => '30 วัน', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ข้อมูลส่วนบุคคลอ่อนไหว ต้องได้รับ "ความยินยอมโดยชัดแจ้ง" (Explicit Consent) เป็นหลัก เว้นแต่กฎหมายอนุญาตเป็นกรณีพิเศษ',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูกต้อง — ตามหลักการในมาตรา 26', 'is_correct' => true],
            ['answer_text' => 'ผิด — ใช้ความยินยอมทั่วไปเหมือนข้อมูลทั่วไป', 'is_correct' => false],
            ['answer_text' => 'ผิด — ไม่ต้องขอความยินยอมสำหรับข้อมูลสุขภาพ', 'is_correct' => false],
            ['answer_text' => 'ถูกต้อง — แต่โทรศัพท์บอกปากเปล่าก็ถือว่าได้', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'เจ้าของข้อมูลสามารถถอนความยินยอมได้ตลอดเวลา และการถอนไม่มีผลย้อนหลังต่อการประมวลผลที่ทำไปแล้วโดยชอบ',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูกต้อง — ตามหลักสิทธิของเจ้าของข้อมูล', 'is_correct' => true],
            ['answer_text' => 'ผิด — ถอนไม่ได้หลังลงนาม', 'is_correct' => false],
            ['answer_text' => 'ผิด — ถอนได้เฉพาะข้อมูลการเงิน', 'is_correct' => false],
            ['answer_text' => 'ถูกต้อง — แต่โรงพยาบาลไม่ต้องหยุดใช้ข้อมูล', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'การโอนข้อมูลส่วนบุคคลของผู้ป่วยไปต่างประเทศ ต้องเป็นไปตามเงื่อนไขที่กฎหมายกำหนด',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูกต้อง — ต้องมีมาตรฐานคุ้มครองที่เพียงพอหรือข้อยกเว้นตามกฎหมาย', 'is_correct' => true],
            ['answer_text' => 'ผิด — โอนได้ฟรีถ้าใช้ Google Drive', 'is_correct' => false],
            ['answer_text' => 'ผิด — ห้ามโอนข้อมูลสุขภาพทุกกรณี', 'is_correct' => false],
            ['answer_text' => 'ถูกต้อง — แต่ส่งทางอีเมลส่วนตัวได้', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'พนักงานโรงพยาบาลเห็นข้อมูลผู้ป่วยคนดังใน HOSxP แล้วนำไปเล่าในโซเชียลมีเดีย ถือเป็นการละเมิด PDPA',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูกต้อง — เป็นการใช้ข้อมูลเกินขอบเขตและละเมิดความลับ', 'is_correct' => true],
            ['answer_text' => 'ผิด — ถ้าไม่ระบุชื่อก็ไม่ผิด', 'is_correct' => false],
            ['answer_text' => 'ผิด — เป็นเรื่องส่วนตัว ไม่เกี่ยวกับ PDPA', 'is_correct' => false],
            ['answer_text' => 'ถูกต้อง — แต่ลง story 24 ชั่วโมงได้', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'เมื่อเหตุละเมิดข้อมูลมีความเสี่ยงสูงต่อเจ้าของข้อมูล ผู้ควบคุมข้อมูลควรแจ้งเจ้าของข้อมูลโดยไม่ชักช้า',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูกต้อง — พร้อมแนวทางลดความเสียหาย', 'is_correct' => true],
            ['answer_text' => 'ผิด — แจ้งเฉพาะ ป.ค.ส. เท่านั้น', 'is_correct' => false],
            ['answer_text' => 'ผิด — ไม่ต้องแจ้งใครถ้าแก้ไขได้แล้ว', 'is_correct' => false],
            ['answer_text' => 'ถูกต้อง — แต่รอ 72 ชั่วโมงก่อน', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ข้อมูลที่ทำให้ไม่สามารถระบุตัวบุคคลได้ (Anonymized) อย่างถาวร ไม่ถือเป็นข้อมูลส่วนบุคคล',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูกต้อง — หากไม่สามารถระบุตัวบุคคลได้จริง', 'is_correct' => true],
            ['answer_text' => 'ผิด — ยังถือเป็นข้อมูลส่วนบุคคลเสมอ', 'is_correct' => false],
            ['answer_text' => 'ผิด — ใช้ได้เฉพาะข้อมูลการเงิน', 'is_correct' => false],
            ['answer_text' => 'ถูกต้อง — แต่โรงพยาบาลไม่ต้องบันทึกวิธีการ', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'การเก็บข้อมูลส่วนบุคคลของผู้ป่วย ควรเก็บเท่าที่จำเป็นตามวัตถุประสงค์ (Data Minimization)',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูกต้อง — เป็นหลักการสำคัญของ PDPA', 'is_correct' => true],
            ['answer_text' => 'ผิด — เก็บได้มากที่สุดเพื่อใช้ในอนาคต', 'is_correct' => false],
            ['answer_text' => 'ผิด — ใช้เฉพาะข้อมูลสุขภาพ ไม่ใช่ข้อมูลทั่วไป', 'is_correct' => false],
            ['answer_text' => 'ถูกต้อง — แต่ไม่ใช้กับข้อมูลพนักงาน', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'บุคลากรโรงพยาบาลที่เข้าถึงข้อมูลผู้ป่วย มีหน้าที่รักษาความลับตาม PDPA และนโยบายองค์กร',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูกต้อง — แม้จะลาออกแล้วก็ยังต้องรักษาความลับ', 'is_correct' => true],
            ['answer_text' => 'ผิด — หน้าที่สิ้นสุดเมื่อออกจากเวร', 'is_correct' => false],
            ['answer_text' => 'ผิด — เฉพาะแพทย์เท่านั้น', 'is_correct' => false],
            ['answer_text' => 'ถูกต้อง — แต่เล่าให้ญาติผู้ป่วยได้', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'เลขบัตรประชาชน หมายเลขโทรศัพท์ และที่อยู่ ถือเป็นข้อมูลส่วนบุคคล',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'โรงพยาบาลสามารถใช้ข้อมูลผู้ป่วยเพื่อการตลาดโดยไม่ต้องขอความยินยอม',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => false],
            ['answer_text' => 'ผิด', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'เจ้าของข้อมูลมีสิทธิขอสำเนาข้อมูลส่วนบุคคลของตนเองจากผู้ควบคุมข้อมูล',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ผู้ประมวลผลข้อมูลสามารถใช้ข้อมูลผู้ป่วยเพื่อวัตถุประสงค์ของตนเองได้ หากมีสัญญากับโรงพยาบาล',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => false],
            ['answer_text' => 'ผิด', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'การเก็บข้อมูลส่วนบุคคลต้องมีวัตถุประสงค์ที่ชัดเจน โปร่งใส และเป็นธรรม',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'เมื่อผู้ป่วยถอนความยินยอม โรงพยาบาลต้องหยุดประมวลผลข้อมูลทันทีในทุกกรณี รวมถึงการรักษาฉุกเฉิน',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => false],
            ['answer_text' => 'ผิด', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'Privacy Notice ควรเข้าถึงได้ง่าย เช่น แสดงในเว็บไซต์ แบบฟอร์มลงทะเบียน หรือจุดให้บริการ',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'การละเมิด PDPA อาจมีทั้งค่าปรับทางปกครองและความรับผิดทางแพ่ง',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ.______ มีผลใช้บังคับในประเทศไทย',
        'type' => 'fill_blank',
        'points' => 1,
        'answers' => [
            ['answer_text' => '2562', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล ย่อว่า ______',
        'type' => 'fill_blank',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'DPO', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'จับคู่บทบาทกับคำอธิบายตาม PDPA',
        'type' => 'matching',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ผู้ควบคุมข้อมูล (Controller)', 'matching_pair' => 'กำหนดวัตถุประสงค์และวิธีการประมวลผลข้อมูล', 'is_correct' => true],
            ['answer_text' => 'ผู้ประมวลผลข้อมูล (Processor)', 'matching_pair' => 'ประมวลผลข้อมูลตามคำสั่งของผู้ควบคุมข้อมูล', 'is_correct' => true],
            ['answer_text' => 'เจ้าของข้อมูลส่วนบุคคล', 'matching_pair' => 'บุคคลที่ข้อมูลนั้นระบุถึง', 'is_correct' => true],
            ['answer_text' => 'DPO', 'matching_pair' => 'ให้คำปรึกษาและตรวจสอบการปฏิบัติตาม PDPA', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'จับคู่ประเภทข้อมูลกับลักษณะที่ถูกต้อง',
        'type' => 'matching',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ข้อมูลส่วนบุคคลทั่วไป', 'matching_pair' => 'ชื่อ ที่อยู่ หมายเลขโทรศัพท์', 'is_correct' => true],
            ['answer_text' => 'ข้อมูลส่วนบุคคลอ่อนไหว', 'matching_pair' => 'ข้อมูลสุขภาพ พันธุกรรม ข้อมูลไบโอเมตริก', 'is_correct' => true],
            ['answer_text' => 'ข้อมูลที่ไม่ใช่ข้อมูลส่วนบุคคล', 'matching_pair' => 'ข้อมูลที่ไม่สามารถระบุตัวบุคคลได้อย่างถาวร', 'is_correct' => true],
        ],
    ],
];
