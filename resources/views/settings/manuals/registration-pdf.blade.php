<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>คู่มือการสมัครสมาชิกและเข้าใช้งานระบบ - โรงพยาบาลค่ายสุรสิงหนาท</title>
    <style>
        @include('settings.manuals.partials.manual-styles')
    </style>
</head>
<body>
    <div class="page-header">
        <div class="hospital-name">โรงพยาบาลค่ายสุรสิงหนาท (Saraburi Memorial Hospital)</div>
        <div class="hospital-sub">ศูนย์พัฒนาคุณภาพและเทคโนโลยีสารสนเทศ · เอกสารคู่มือการใช้งานระบบสารสนเทศ</div>
    </div>

    <div class="page-footer">
        <table style="width: 100%;">
            <tr>
                <td style="text-align: left; border: none; padding: 0;">คู่มือการสมัครสมาชิกและเข้าใช้งานระบบสารสนเทศ (ฉบับปรับปรุง)</td>
                <td style="text-align: right; border: none; padding: 0;">พิมพ์เมื่อ: {{ $generatedAt }}</td>
            </tr>
        </table>
    </div>

    <!-- Hero Banner -->
    <table class="hero">
        <tr>
            <td class="hero-left">
                <div class="eyebrow">USER REGISTRATION & ONBOARDING GUIDE</div>
                <h1>คู่มือการสมัครสมาชิกและเข้าใช้งานระบบสารสนเทศ</h1>
                <div class="hero-sub">สำหรับบุคลากรทางการแพทย์และเจ้าหน้าที่โรงพยาบาลค่ายสุรสิงหนาททุกท่าน</div>
            </td>
            <td class="hero-right">
                <div class="doc-code">รหัสเอกสาร: SMH-MAN-REG</div>
                <div class="doc-date">ระบบยืนยันตัวตน LINE Login</div>
                <div class="badge" style="margin-top: 5px;">เวอร์ชัน 2.0 (ล่าสุด)</div>
            </td>
        </tr>
    </table>

    <!-- วัตถุประสงค์และสิ่งที่ต้องเตรียม -->
    <div class="section-title">1. วัตถุประสงค์และสิ่งที่ต้องเตรียมก่อนสมัคร</div>
    <div class="card">
        <p style="margin: 0 0 6px 0;">
            ระบบสารสนเทศโรงพยาบาลค่ายสุรสิงหนาท ใช้การยืนยันตัวตนสองชั้นร่วมกับ <strong>LINE Application</strong> เพื่อความปลอดภัยและความสะดวกรวดเร็ว โดยเชื่อมโยงกับฐานข้อมูลกำลังพลของโรงพยาบาลโดยตรง บุคลากรไม่ต้องจำรหัสผ่านที่ซับซ้อน และสามารถรับการแจ้งเตือนงานผ่าน LINE ได้ทันที
        </p>
        <table class="info-table">
            <thead>
                <tr>
                    <th style="width: 30%;">สิ่งที่ต้องเตรียม</th>
                    <th style="width: 70%;">รายละเอียด / ข้อแนะนำ</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>1. สมาร์ทโฟนที่มี LINE</strong></td>
                    <td>ติดตั้งแอปพลิเคชัน LINE ที่ลงทะเบียนและใช้งานเป็นประจำบนสมาร์ทโฟน</td>
                </tr>
                <tr>
                    <td><strong>2. เลขบัตรประชาชน 13 หลัก</strong></td>
                    <td>ใช้สำหรับตรวจสอบความถูกต้องกับฐานข้อมูลบุคลากร (Staff Roster Lookup) ของโรงพยาบาล</td>
                </tr>
                <tr>
                    <td><strong>3. ข้อมูลสังกัดแผนกและทีม</strong></td>
                    <td>ทราบแผนก/ฝ่ายที่สังกัด (เช่น OPD, IPD, ER, เภสัชกรรม) และทีมนำทางคลินิก (HA Team ถ้ามี)</td>
                </tr>
                <tr>
                    <td><strong>4. อีเมลที่ใช้งานได้</strong></td>
                    <td>สำหรับรับข้อมูลข่าวสารและใช้เป็นช่องทางเข้าสู่ระบบสำรอง</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- ขั้นตอนการสมัครสมาชิก 4 ขั้นตอน -->
    <div class="section-title">2. ขั้นตอนการสมัครสมาชิก (4 ขั้นตอนง่ายๆ)</div>

    <div class="card">
        <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-title">เข้าสู่หน้าสมัครสมาชิกของระบบ</div>
            <div class="step-desc">
                เปิดโปรแกรมเบราว์เซอร์ (แนะนำ Google Chrome หรือ Microsoft Edge) แล้วไปที่หน้าสมัครสมาชิกของโรงพยาบาลที่ <code>/register</code>
            </div>
        </div>

        <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-title">ยืนยันตัวตนด้วย LINE Login</div>
            <div class="step-desc">
                • <strong>หากใช้งานบนคอมพิวเตอร์:</strong> เปิดกล้องโทรศัพท์หรือแอป LINE สแกน QR Code ที่ปรากฏบนหน้าจอเพื่อยืนยันตัวตน<br>
                • <strong>หากใช้งานบนสมาร์ทโฟน:</strong> กดปุ่มสีเขียว <strong>"เปิด LINE บนเครื่องนี้"</strong> ระบบจะสลับไปที่ LINE อัตโนมัติ<br>
                • กดยินยอม (Allow) ให้ระบบเข้าถึงข้อมูลโปรไฟล์พื้นฐาน (ชื่อ และรูปโปรไฟล์ LINE)
            </div>
        </div>

        <div class="step-item">
            <div class="step-num">3</div>
            <div class="step-title">กรอกข้อมูลและค้นหาประวัติบุคลากร (Complete Profile)</div>
            <div class="step-desc">
                หลังจากยืนยันตัวตน LINE สำเร็จ ระบบจะพาเข้าสู่หน้ากรอกข้อมูลบุคลากร:<br>
                • <strong>ระบุเลขบัตรประชาชน 13 หลัก:</strong> ระบบมีระบบค้นหาประวัติอัตโนมัติ (Staff Roster Lookup) หากตรงกับฐานข้อมูล ระบบจะดึงคำนำหน้า ชื่อ นามสกุล ตำแหน่ง และเบอร์โทรศัพท์มาให้อัตโนมัติ<br>
                • <strong>เลือกแผนก/ฝ่ายที่สังกัด:</strong> เลือกแผนกที่ท่านปฏิบัติงานจริง (สามารถเลือกได้มากกว่า 1 แผนก)<br>
                • <strong>เลือกทีมนำ HA (ถ้ามี):</strong> เลือกทีมคุณภาพที่ท่านร่วมเป็นคณะกรรมการ (เช่น PCT, IC, PTC, ENV, RM, IM, HRD)<br>
                • <strong>กรอกอีเมล:</strong> ใส่อีเมลเพื่อใช้เป็นช่องทางติดต่อและตั้งรหัสผ่านในอนาคต
            </div>
        </div>

        <div class="step-item">
            <div class="step-num">4</div>
            <div class="step-title">เพิ่มเพื่อน LINE Official และยืนยันการสมัคร</div>
            <div class="step-desc">
                • สแกนเพิ่มเพื่อน LINE Official Account ของโรงพยาบาล เพื่อรับการแจ้งเตือนงาน คิว และข่าวสารสำคัญ<br>
                • ตรวจสอบความถูกต้องของข้อมูลแล้วกดปุ่ม <strong>"บันทึกข้อมูลและเข้าสู่ระบบ"</strong><br>
                • บัญชีของท่านจะได้รับการเปิดใช้งานและเข้าสู่หน้าจอหลักของระบบทันที
            </div>
        </div>

        <div class="tip-box">
            <strong>คำแนะนำสำคัญ:</strong> หากท่านเคยมีบัญชีในระบบอยู่แล้ว และมาล็อกอินด้วย LINE ในภายหลัง ระบบจะทำการรวมบัญชี (Account Merge) ให้อัตโนมัติด้วยเลขบัตรประชาชน 13 หลัก โดยข้อมูลงานเดิมจะไม่สูญหาย
        </div>
    </div>

    <!-- การเข้าสู่ระบบในครั้งถัดไป -->
    <div class="section-title">3. วิธีการเข้าสู่ระบบในครั้งถัดไป</div>
    <div class="card">
        <p style="margin: 0 0 6px 0;">เมื่อลงทะเบียนเรียบร้อยแล้ว ในการใช้งานครั้งต่อไป สามารถเข้าใช้งานได้ 2 วิธี:</p>
        <table class="info-table">
            <thead>
                <tr>
                    <th style="width: 50%;">วิธีที่ 1: เข้าสู่ระบบด้วย LINE (แนะนำ)</th>
                    <th style="width: 50%;">วิธีที่ 2: เข้าสู่ระบบด้วยรหัสผ่าน</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        1. ไปที่หน้า <code>/login</code><br>
                        2. สแกน LINE QR Code บนหน้าจอ หรือกดปุ่ม "เข้าสู่ระบบด้วย LINE"<br>
                        3. เข้าสู่ระบบทันทีโดยไม่ต้องจำรหัสผ่าน
                    </td>
                    <td>
                        1. เข้าสู่หน้า <code>/login</code><br>
                        2. กรอกอีเมลและรหัสผ่าน (ที่ตั้งไว้ในหน้าตั้งค่าโปรไฟล์)<br>
                        3. กดปุ่ม "เข้าสู่ระบบ" เหมาะสำหรับกรณีไม่ได้พกโทรศัพท์
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- ข้อควรระวังและการแก้ปัญหา -->
    <div class="section-title">4. คำถามที่พบบ่อย (FAQ) และการติดต่อประสานงาน</div>
    <div class="card">
        <div style="margin-bottom: 6px;">
            <strong>Q1: สแกน QR Code แล้วหน้าจอขึ้นว่า QR Code หมดอายุ?</strong><br>
            <span style="color: #475569;">A: QR Code มีอายุการใช้งาน 3 นาทีเพื่อความปลอดภัย ให้กดปุ่มรีเฟรชหน้าเว็บ (F5) เพื่อรับ QR Code ใหม่</span>
        </div>
        <div style="margin-bottom: 6px;">
            <strong>Q2: กรอกเลขบัตรประชาชนแล้วระบบไม่พบรายชื่อในฐานข้อมูลบุคลากร?</strong><br>
            <span style="color: #475569;">A: ท่านสามารถกรอกชื่อ นามสกุล และตำแหน่งด้วยตนเองได้ในหน้านั้น และระบบจะส่งให้ผู้ดูแลระบบตรวจสอบความถูกต้องภายหลัง</span>
        </div>
        <div>
            <strong>Q3: เปลี่ยนโทรศัพท์หรือเปลี่ยนบัญชี LINE ต้องทำอย่างไร?</strong><br>
            <span style="color: #475569;">A: สามารถเข้าสู่ระบบด้วยรหัสผ่าน แล้วไปที่เมนู <strong>"ตั้งค่าโปรไฟล์"</strong> จากนั้นกดยกเลิกการเชื่อมต่อ LINE เดิม แล้วเชื่อมต่อกับ LINE ใหม่ได้ทันที</span>
        </div>

        <div class="alert-box">
            <strong>ติดต่อฝ่ายเทคโนโลยีสารสนเทศ (IM):</strong> ศูนย์คอมพิวเตอร์ โรงพยาบาลค่ายสุรสิงหนาท โทรภายใน 114 หรือติดต่อผู้ดูแลระบบผ่าน LINE Official Account
        </div>
    </div>
</body>
</html>
