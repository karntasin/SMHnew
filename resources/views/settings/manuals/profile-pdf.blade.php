<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>คู่มือการตั้งค่าโปรไฟล์และบัญชีผู้ใช้งาน - โรงพยาบาลค่ายสุรสิงหนาท</title>
    <style>
        @include('settings.manuals.partials.manual-styles')
    </style>
</head>
<body>
    <div class="page-header">
        <div class="hospital-name">โรงพยาบาลค่ายสุรสิงหนาท (Saraburi Memorial Hospital)</div>
        <div class="hospital-sub">ศูนย์พัฒนาคุณภาพและเทคโนโลยีสารสนเทศ · เอกสารคู่มือการตั้งค่าบัญชีผู้ใช้งาน</div>
    </div>

    <div class="page-footer">
        <table style="width: 100%;">
            <tr>
                <td style="text-align: left; border: none; padding: 0;">คู่มือการตั้งค่าโปรไฟล์และบัญชีผู้ใช้งาน (ฉบับปรับปรุง)</td>
                <td style="text-align: right; border: none; padding: 0;">พิมพ์เมื่อ: {{ $generatedAt }}</td>
            </tr>
        </table>
    </div>

    <!-- Hero Banner -->
    <table class="hero">
        <tr>
            <td class="hero-left">
                <div class="eyebrow">PROFILE & ACCOUNT SETTINGS GUIDE</div>
                <h1>คู่มือการตั้งค่าโปรไฟล์และบัญชีผู้ใช้งาน</h1>
                <div class="hero-sub">การจัดการข้อมูลส่วนตัว แผนกที่สังกัด ทีมนำ HA บัญชี LINE และความปลอดภัย</div>
            </td>
            <td class="hero-right">
                <div class="doc-code">รหัสเอกสาร: SMH-MAN-PRF</div>
                <div class="doc-date">โมดูลการตั้งค่า (Settings)</div>
                <div class="badge-blue" style="margin-top: 5px;">เวอร์ชัน 2.0 (ล่าสุด)</div>
            </td>
        </tr>
    </table>

    <!-- การเข้าสู่หน้าตั้งค่าโปรไฟล์ -->
    <div class="section-title">1. การเข้าสู่หน้าตั้งค่าโปรไฟล์</div>
    <div class="card">
        <p style="margin: 0 0 6px 0;">
            ผู้ใช้งานสามารถเข้าสู่หน้าการตั้งค่าโปรไฟล์ได้ตลอดเวลาหลังจากเข้าสู่ระบบ โดยทำได้ 2 ช่องทาง:
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 10.5px;">
            <li><strong>ช่องทางที่ 1:</strong> คลิกที่ <strong>รูปโปรไฟล์หรือชื่อของท่าน</strong> บริเวณมุมขวาบนของหน้าจอ แล้วเลือก <strong>"ตั้งค่าโปรไฟล์ (Profile Settings)"</strong></li>
            <li><strong>ช่องทางที่ 2:</strong> เข้าผ่านเมนูด้านข้าง (Sidebar) เลือกเมนู <strong>"การตั้งค่า (Settings)" → "โปรไฟล์"</strong> ที่ URL: <code>/settings/profile</code></li>
        </ul>
    </div>

    <!-- ส่วนที่ 1: ข้อมูลส่วนตัวและรูปโปรไฟล์ -->
    <div class="section-title">2. การจัดการข้อมูลส่วนตัวและรูปโปรไฟล์ (Avatar)</div>
    <div class="card">
        <table class="info-table">
            <thead>
                <tr>
                    <th style="width: 32%;">รายการ</th>
                    <th style="width: 68%;">คำอธิบายและวิธีตั้งค่า</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>รูปโปรไฟล์ (Avatar)</strong></td>
                    <td>
                        • คลิกที่ <strong>ไอคอนกล้องถ่ายรูป</strong> บนรูปโปรไฟล์ เพื่อเลือกไฟล์รูปภาพจากคอมพิวเตอร์หรือโทรศัพท์<br>
                        • รองรับไฟล์นามสกุล JPG, PNG หรือ GIF (ขนาดไฟล์ไม่เกิน 2MB)<br>
                        • หากไม่ได้อัปโหลดรูป ระบบจะใช้รูปโปรไฟล์จาก LINE หรือตัวอักษรย่อของชื่อท่านอัตโนมัติ
                    </td>
                </tr>
                <tr>
                    <td><strong>ชื่อ-นามสกุล (Name)</strong></td>
                    <td>ชื่อภาษาไทยเต็มที่ใช้แสดงผลในรายงาน งานคุณภาพ และระบบคิวตรวจ</td>
                </tr>
                <tr>
                    <td><strong>อีเมล (Email)</strong></td>
                    <td>อีเมลสำหรับการติดต่อประสานงาน และใช้สำหรับการกู้คืนรหัสผ่าน</td>
                </tr>
                <tr>
                    <td><strong>ชื่อแสดงผลในแชท (Chat Display Name)</strong></td>
                    <td>ชื่อเล่นหรือชื่อย่อที่ต้องการให้ปรากฏเวลาพูดคุยในระบบแชทของโรงพยาบาล (S-Chat)</td>
                </tr>
            </tbody>
        </table>
        <div class="tip-box">
            <strong>คำแนะนำ:</strong> เมื่อแก้ไขข้อมูลส่วนตัวแล้ว ให้กดปุ่ม <strong>"บันทึกข้อมูล"</strong> ที่ด้านล่างของส่วนข้อมูลส่วนตัวเสมอ
        </div>
    </div>

    <!-- ส่วนที่ 2: การจัดการแผนกและทีมนำ HA -->
    <div class="section-title">3. การจัดการแผนกที่สังกัด และทีมนำทางคลินิก (HA Team)</div>
    <div class="card">
        <p style="margin: 0 0 6px 0;">การกำหนดแผนกและทีม HA ที่ถูกต้อง มีผลโดยตรงต่อการได้รับสิทธิ์ดูตัวชี้วัด การรับงาน และการตรวจประเมินคุณภาพ:</p>
        
        <div class="step-item">
            <div class="step-num">A</div>
            <div class="step-title">การเลือกแผนกที่สังกัด (Department Assignment)</div>
            <div class="step-desc">
                • ท่านสามารถคลิกเลือกแผนกที่ท่านปฏิบัติงานได้มากกว่า 1 แผนก (เช่น ปฏิบัติงานทั้ง ER และ OPD)<br>
                • <strong>การตั้งแผนกหลัก (Primary Department):</strong> ให้คลิกเลือกปุ่มวิทยุที่แผนกหลัก เพื่อกำหนดเป็นแผนกเริ่มต้นในการบันทึกตัวชี้วัดและรับหนังสือเวียน
            </div>
        </div>

        <div class="step-item">
            <div class="step-num">B</div>
            <div class="step-title">การเลือกทีมนำทางคลินิกและประสานงาน (HA Team Picker)</div>
            <div class="step-desc">
                • เลือกทีมคุณภาพที่ท่านร่วมเป็นคณะทำงาน เช่น <strong>PCT</strong> (ทีมนำทางคลินิก), <strong>IC</strong> (ป้องกันการติดเชื้อ), <strong>PTC</strong> (ระบบยา), <strong>ENV</strong> (กายภาพและความปลอดภัย), <strong>RM</strong> (บริหารความเสี่ยง), <strong>IM</strong> (สารสนเทศ), <strong>HRD</strong> (พัฒนาบุคลากร)<br>
                • การเลือกทีม HA จะทำให้ท่านสามารถดูและบันทึกตัวชี้วัดระดับทีม HA นั้นๆ ได้
            </div>
        </div>
    </div>

    <!-- ส่วนที่ 3: บัญชี LINE และรหัสผ่าน -->
    <div class="section-title">4. การจัดการบัญชี LINE และการตั้งรหัสผ่าน</div>
    <div class="card">
        <table class="info-table">
            <thead>
                <tr>
                    <th style="width: 50%;">การจัดการบัญชี LINE</th>
                    <th style="width: 50%;">การตั้งรหัสผ่าน (Change Password)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        • <strong>สถานะการเชื่อมต่อ:</strong> แสดงว่าบัญชีเชื่อมต่อกับ LINE ชื่ออะไร พร้อมรูปโปรไฟล์ LINE<br>
                        • <strong>ยกเลิกการเชื่อมต่อ (Unlink LINE):</strong> หากต้องการเปลี่ยนไปใช้ LINE บัญชีอื่น สามารถกดยกเลิกเชื่อมต่อได้ (ระบบจะแจ้งเตือนยืนยันก่อนยกเลิก)<br>
                        • <strong>เชื่อมต่อใหม่:</strong> กดปุ่มเชื่อมต่อ LINE เพื่อสแกน QR Code ผูกกับบัญชีใหม่
                    </td>
                    <td>
                        • ไปที่เมนู <strong>"รหัสผ่าน"</strong> (URL: <code>/settings/password</code>)<br>
                        • <strong>รหัสผ่านปัจจุบัน:</strong> ระบุรหัสผ่านเดิม (ถ้ามี)<br>
                        • <strong>รหัสผ่านใหม่:</strong> ตั้งรหัสผ่านความยาวอย่างน้อย 8 ตัวอักษร<br>
                        • <strong>ยืนยันรหัสผ่านใหม่:</strong> กรอกรหัสผ่านซ้ำอีกครั้งเพื่อความถูกต้อง<br>
                        • กดปุ่ม "บันทึกรหัสผ่าน"
                    </td>
                </tr>
            </tbody>
        </table>

        <div class="alert-box">
            <strong>นโยบายความปลอดภัยและคุ้มครองข้อมูล (PDPA):</strong> ห้ามแบ่งปันบัญชีผู้ใช้งานให้ผู้อื่นใช้ร่วมกันเด็ดขาด เนื่องจากระบบมีการบันทึก Audit Log ทุกการแก้ไขข้อมูลเวชระเบียนและตัวชี้วัด หากตรวจพบจะมีความผิดตามระเบียบโรงพยาบาล
        </div>
    </div>
</body>
</html>
