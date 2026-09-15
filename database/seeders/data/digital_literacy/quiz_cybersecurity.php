<?php

return [
    [
        'question_text' => 'อีเมลแจ้งว่า "บัญชีอีเมลโรงพยาบาลจะถูกระงับภายใน 2 ชั่วโมง หากไม่คลิกลิงก์เปลี่ยนรหัสผ่าน" น่าจะเป็น Phishing',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ใช่ — เป็นลักษณะเร่งด่วนและหลอกให้คลิกลิงก์', 'is_correct' => true],
            ['answer_text' => 'ไม่ — เป็นการแจ้งเตือนปกติจากฝ่าย IT', 'is_correct' => false],
            ['answer_text' => 'ไม่ — ถ้าอีเมลมีโลโก้โรงพยาบาลก็น่าเชื่อถือ', 'is_correct' => false],
            ['answer_text' => 'ใช่ — แต่คลิกได้ถ้าใช้คอมพิวเตอร์ส่วนตัว', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'รหัสผ่านที่ปลอดภัยสำหรับระบบงานโรงพยาบาลควรมีลักษณะอย่างไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ยาวอย่างน้อย 12 ตัวอักษร ผสมตัวพิมพ์ใหญ่-เล็ก ตัวเลข และสัญลักษณ์ ไม่ซ้ำกับระบบอื่น', 'is_correct' => true],
            ['answer_text' => 'ใช้เลขบัตรประชาชนหรือวันเกิดเพื่อจำง่าย', 'is_correct' => false],
            ['answer_text' => 'ใช้รหัสเดียวกันกับอีเมลและ HOSxP เพื่อความสะดวก', 'is_correct' => false],
            ['answer_text' => 'เปลี่ยนทุก 5 ปี โดยเพิ่มตัวเลขท้ายรหัสเดิม', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'Multi-Factor Authentication (MFA) หมายถึงการยืนยันตัวตนด้วยปัจจัยอย่างน้อย 2 ประเภท เช่น รหัสผ่าน + OTP',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูกต้อง — ช่วยลดความเสี่ยงแม้รหัสผ่านรั่วไหล', 'is_correct' => true],
            ['answer_text' => 'ผิด — MFA ใช้ได้เฉพาะผู้บริหาร', 'is_correct' => false],
            ['answer_text' => 'ผิด — MFA แทนที่รหัสผ่านได้โดยไม่ต้องตั้งรหัส', 'is_correct' => false],
            ['answer_text' => 'ถูกต้อง — แต่แชร์ OTP ให้เพื่อนร่วมงานได้เมื่อลาป่วย', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'Ransomware โจมตีโรงพยาบาลอย่างไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'เข้ารหัสไฟล์หรือระบบ แล้วเรียกค่าไถ่เพื่อปลดล็อก', 'is_correct' => true],
            ['answer_text' => 'ขโมยรหัสผ่าน Wi-Fi ของผู้ป่วย', 'is_correct' => false],
            ['answer_text' => 'ลบไวรัสในเครื่องอัตโนมัติ', 'is_correct' => false],
            ['answer_text' => 'ส่งอีเมลโฆษณายาให้บุคลากร', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'มีคนโทรศัพท์อ้างว่าเป็นฝ่าย IT ขอรหัสผ่าน HOSxP เพื่อ "อัปเดตระบบด่วน" ควรทำอย่างไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ไม่ให้รหัสผ่าน วางสาย และแจ้งฝ่าย IT ผ่านช่องทางทางการ', 'is_correct' => true],
            ['answer_text' => 'ให้รหัสผ่านชั่วคราวแล้วเปลี่ยนทีหลัง', 'is_correct' => false],
            ['answer_text' => 'ให้รหัสผ่านเก่าที่ไม่ได้ใช้แล้ว', 'is_correct' => false],
            ['answer_text' => 'ให้รหัสผ่านถ้าเขารู้ชื่อ-นามสกุลของคุณ', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'เมื่อใช้ Wi-Fi สาธารณะ (เช่น ที่ร้านกาแฟ) เพื่อเข้าอีเมลงาน ควรปฏิบัติอย่างไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'หลีกเลี่ยงเข้าระบบสำคัญ หรือใช้ VPN ของโรงพยาบาล', 'is_correct' => true],
            ['answer_text' => 'ใช้ได้ตามปกติถ้า Wi-Fi มีรหัสผ่าน', 'is_correct' => false],
            ['answer_text' => 'ปิดแอนตี้ไวรัสเพื่อให้เชื่อมต่อเร็วขึ้น', 'is_correct' => false],
            ['answer_text' => 'แชร์ Wi-Fi ให้ผู้ป่วยใช้ร่วมกัน', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'พบ USB ไดรฟ์ในที่จอดรถโรงพยาบาล ควรทำอย่างไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ไม่เสียบเข้าคอมพิวเตอร์งาน นำส่งฝ่าย IT เพื่อตรวจสอบ', 'is_correct' => true],
            ['answer_text' => 'เสียบดูว่ามีไฟล์อะไร แล้วค่อยแจ้ง IT', 'is_correct' => false],
            ['answer_text' => 'นำไปใช้ส่วนตัวที่บ้าน', 'is_correct' => false],
            ['answer_text' => 'เสียบเฉพาะเครื่องที่ไม่มีข้อมูลผู้ป่วย', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'หลัก Clean Desk Policy สำหรับพื้นที่ทำงานในโรงพยาบาลหมายถึงอะไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ไม่วางเอกสารผู้ป่วยหรือรหัสผ่านทิ้งไว้บนโต๊ะเมื่อไม่อยู่', 'is_correct' => true],
            ['answer_text' => 'ทำความสะอาดโต๊ะด้วยน้ำยาฆ่าเชื้อทุกวัน', 'is_correct' => false],
            ['answer_text' => 'จัดโต๊ะให้สวยงามเพื่อรับผู้บริหาร', 'is_correct' => false],
            ['answer_text' => 'เก็บเอกสารผู้ป่วยไว้ในลิ้นชักที่ไม่มีกุญแจ', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'เมื่อพบอีเมล Phishing หรือเหตุการณ์ผิดปกติด้านความปลอดภัย ควรทำอย่างไรเป็นอันดับแรก?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'รายงานฝ่าย IT/เจ้าหน้าที่ความปลอดภัยสารสนเทศทันที', 'is_correct' => true],
            ['answer_text' => 'ลบอีเมลแล้วไม่ต้องบอกใคร', 'is_correct' => false],
            ['answer_text' => 'ส่งต่อให้เพื่อนร่วมงานเปิดดูก่อน', 'is_correct' => false],
            ['answer_text' => 'โพสต์ในกลุ่ม Line เพื่อเตือนคนอื่น', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'Confidentiality ใน CIA Triad หมายถึงอะไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ข้อมูลเข้าถึงได้เฉพาะผู้ที่มีสิทธิ์เท่านั้น', 'is_correct' => true],
            ['answer_text' => 'ข้อมูลถูกต้องและไม่ถูกแก้ไขโดยไม่ได้รับอนุญาต', 'is_correct' => false],
            ['answer_text' => 'ระบบพร้อมใช้งานเมื่อต้องการ', 'is_correct' => false],
            ['answer_text' => 'การสำรองข้อมูลเป็นประจำ', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'Smishing คือการหลอกลวงผ่านช่องทางใด?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'SMS หรือข้อความในแอปส่งข้อความ', 'is_correct' => true],
            ['answer_text' => 'การโทรศัพท์เสียง (Vishing)', 'is_correct' => false],
            ['answer_text' => 'จดหมายทางไปรษณีย์', 'is_correct' => false],
            ['answer_text' => 'ป้ายโฆษณาในพื้นที่โรงพยาบาล', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'Vishing คือการหลอกลวงทางโทรศัพท์เพื่อขอข้อมูลสำคัญ เช่น รหัส OTP',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูกต้อง — มักแอบอ้างเป็นธนาคาร หน่วยงานรัฐ หรือฝ่าย IT', 'is_correct' => true],
            ['answer_text' => 'ผิด — Vishing หมายถึงไวรัสในโทรศัพท์เท่านั้น', 'is_correct' => false],
            ['answer_text' => 'ผิด — เป็นการโจมตีผ่านวิดีโอคอลเท่านั้น', 'is_correct' => false],
            ['answer_text' => 'ถูกต้อง — แต่ให้ OTP ได้ถ้าผู้โทรรู้เลขบัญชีเงินเดือน', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ก่อนคลิกลิงก์ในอีเมลที่อ้างว่ามาจาก สปสช. หรือหน่วยงานภายนอก ควรทำอย่างไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'วางเมาส์เหนือลิงก์ดู URL จริง หรือเข้าเว็บไซต์โดยตรงจากที่รู้จัก', 'is_correct' => true],
            ['answer_text' => 'คลิกทันทีถ้าอีเมลมีตราครุฑ', 'is_correct' => false],
            ['answer_text' => 'คลิกเฉพาะจากมือถือเพราะปลอดภัยกว่า', 'is_correct' => false],
            ['answer_text' => 'ส่งต่อให้เพื่อนเปิดก่อน', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'การใช้รหัสผ่านเดียวกันกับ HOSxP อีเมลองค์กร และ Facebook มีความเสี่ยงอย่างไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'หากระบบใดถูกแฮก ผู้โจมตีอาจเข้าถึงระบบงานโรงพยาบาลได้', 'is_correct' => true],
            ['answer_text' => 'ไม่มีความเสี่ยง ถ้ารหัสผ่านยาวพอ', 'is_correct' => false],
            ['answer_text' => 'มีความเสี่ยงเฉพาะ Facebook เท่านั้น', 'is_correct' => false],
            ['answer_text' => 'ปลอดภัยถ้าเปิด MFA ที่ Facebook', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ปัจจัย "สิ่งที่มี" (Something you have) ใน MFA ตัวอย่างใดถูกต้อง?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'โทรศัพท์ที่รับ OTP หรือ Security Token', 'is_correct' => true],
            ['answer_text' => 'รหัสผ่านที่จำได้', 'is_correct' => false],
            ['answer_text' => 'ลายนิ้วมือ', 'is_correct' => false],
            ['answer_text' => 'ชื่อผู้ใช้งาน', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'เมื่อสงสัยว่าเครื่องคอมพิวเตอร์ติดมัลแวร์ ควรทำอย่างไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ตัดการเชื่อมต่อเครือข่ายและแจ้งฝ่าย IT ทันที', 'is_correct' => true],
            ['answer_text' => 'รีสตาร์ทเครื่องซ้ำๆ จนกว่าจะหาย', 'is_correct' => false],
            ['answer_text' => 'ลบไฟล์ในโฟลเดอร์ Windows ด้วยตนเอง', 'is_correct' => false],
            ['answer_text' => 'ติดตั้งโปรแกรมจากอินเทอร์เน็ตเพื่อกำจัดไวรัส', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'Social Engineering คือการโจมตีที่ใช้การหลอกลวงทางจิตวิทยา มากกว่าการเจาะระบบทางเทคนิค',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูกต้อง — มักใช้ประโยชน์จากความไว้ใจของมนุษย์', 'is_correct' => true],
            ['answer_text' => 'ผิด — เป็นไวรัสชนิดหนึ่งเท่านั้น', 'is_correct' => false],
            ['answer_text' => 'ผิด — ใช้ได้เฉพาะกับระบบ HOSxP', 'is_correct' => false],
            ['answer_text' => 'ถูกต้อง — แต่ไม่เกี่ยวกับการขอรหัสผ่านทางโทรศัพท์', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'Integrity ใน CIA Triad เกี่ยวข้องกับอะไร?',
        'type' => 'multiple_choice',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ความถูกต้องและความสมบูรณ์ของข้อมูล ไม่ถูกแก้ไขโดยไม่ได้รับอนุญาต', 'is_correct' => true],
            ['answer_text' => 'การเก็บข้อมูลเป็นความลับ', 'is_correct' => false],
            ['answer_text' => 'ความพร้อมใช้งานของเซิร์ฟเวอร์', 'is_correct' => false],
            ['answer_text' => 'การลบข้อมูลเมื่อพนักงานลาออก', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ข้อมูลประวัติการรักษาผู้ป่วยในโรงพยาบาลถือเป็นข้อมูลที่มีความละเอียดอ่อนสูง',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ฝ่าย IT ของโรงพยาบาลมีสิทธิขอรหัสผ่านของคุณทางโทรศัพท์ได้',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => false],
            ['answer_text' => 'ผิด', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'การล็อกหน้าจอคอมพิวเตอร์เมื่อออกจากโต๊ะทำงานช่วยปกป้อง Confidentiality',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ไฟล์แนบ .exe จากผู้ส่งที่ไม่รู้จักในอีเมลงาน เปิดได้ถ้าแอนตี้ไวรัสไม่เตือน',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => false],
            ['answer_text' => 'ผิด', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'Availability ใน CIA Triad หมายถึงระบบและข้อมูลพร้อมใช้งานเมื่อต้องการ',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'การแชร์รหัส OTP จากแอปยืนยันตัวตนให้เพื่อนร่วมงาน เป็นเรื่องปกติเมื่อลาป่วย',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => false],
            ['answer_text' => 'ผิด', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'Wi-Fi ที่มีรหัสผ่านในที่สาธารณะ ปลอดภัยเท่ากับเครือข่ายภายในโรงพยาบาล',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => false],
            ['answer_text' => 'ผิด', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'เมื่อได้รับ SMS แจ้งว่าได้รับเงินคืนประกันสังคม ให้คลิกลิงก์กรอกเลขบัญชี ควรระวัง Smishing',
        'type' => 'true_false',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'ถูก', 'is_correct' => true],
            ['answer_text' => 'ผิด', 'is_correct' => false],
        ],
    ],
    [
        'question_text' => 'ตัวอักษร "A" ใน CIA Triad ย่อมาจาก ______ (ความพร้อมใช้งาน)',
        'type' => 'fill_blank',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'Availability', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'การยืนยันตัวตนหลายปัจจัย ย่อว่า ______',
        'type' => 'fill_blank',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'MFA', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'จับคู่องค์ประกอบ CIA Triad กับความหมายที่ถูกต้อง',
        'type' => 'matching',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'Confidentiality', 'matching_pair' => 'ข้อมูลเข้าถึงได้เฉพาะผู้มีสิทธิ์', 'is_correct' => true],
            ['answer_text' => 'Integrity', 'matching_pair' => 'ข้อมูลถูกต้องและไม่ถูกแก้ไขโดยไม่ได้รับอนุญาต', 'is_correct' => true],
            ['answer_text' => 'Availability', 'matching_pair' => 'ระบบและข้อมูลพร้อมใช้งานเมื่อต้องการ', 'is_correct' => true],
        ],
    ],
    [
        'question_text' => 'จับคู่ประเภทภัยคุกคามกับคำอธิบาย',
        'type' => 'matching',
        'points' => 1,
        'answers' => [
            ['answer_text' => 'Phishing', 'matching_pair' => 'หลอกลวงทางอีเมลหรือเว็บไซต์ปลอม', 'is_correct' => true],
            ['answer_text' => 'Ransomware', 'matching_pair' => 'เข้ารหัสข้อมูลแล้วเรียกค่าไถ่', 'is_correct' => true],
            ['answer_text' => 'Smishing', 'matching_pair' => 'หลอกลวงผ่าน SMS หรือข้อความ', 'is_correct' => true],
            ['answer_text' => 'Vishing', 'matching_pair' => 'หลอกลวงทางโทรศัพท์', 'is_correct' => true],
        ],
    ],
];
