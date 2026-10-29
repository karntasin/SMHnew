/**
 * Build S-Chat user guide PDF (iOS + Android) without requiring Laravel PHP CLI.
 * Usage: node scripts/generate-schat-guide.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const imageDir = path.join(root, 'storage', 'app', 'docs', 'schat-guide');
const storageDir = path.join(root, 'storage', 'app', 'docs');
const docsDir = path.join(root, 'public', 'docs');
const htmlPath = path.join(storageDir, 'schat-user-guide.html');
const pdfAsciiPath = path.join(docsDir, 'S-Chat-user-guide.pdf');
const pdfPath = path.join(docsDir, 'S-Chat-คู่มือการใช้งาน.pdf');

function dataUri(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function findImage(base) {
  for (const ext of ['.jpg', '.png', '.jpeg']) {
    const p = path.join(imageDir, base + ext);
    if (fs.existsSync(p)) return dataUri(p);
  }
  return '';
}

function findChrome() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  return candidates.find((p) => p && fs.existsSync(p)) || null;
}

const logo = fs.existsSync(path.join(imageDir, 'logo.png'))
  ? dataUri(path.join(imageDir, 'logo.png'))
  : '';
const images = {
  android: findImage('android-install'),
  ios: findImage('ios-install'),
  groups: findImage('feature-groups'),
  unsend: findImage('feature-unsend'),
  stickers: findImage('feature-stickers'),
};

const today = new Intl.DateTimeFormat('th-TH', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Bangkok',
}).format(new Date());

const fig = (src, caption) =>
  src
    ? `<figure class="figure"><img src="${src}" alt=""><figcaption>${caption}</figcaption></figure>`
    : '';

const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>คู่มือการใช้งาน S-Chat — iPhone และ Android</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Sarabun',sans-serif;font-size:10.5pt;line-height:1.5;color:#0f172a;background:#fff}
@page{size:A4;margin:12mm 14mm}
.cover{position:relative;width:100%;height:273mm;overflow:hidden;page-break-after:always;color:#e8f1ff}
.cover-bg{position:absolute;inset:0;background:radial-gradient(ellipse at 15% 20%,rgba(56,189,248,.22),transparent 45%),radial-gradient(ellipse at 85% 75%,rgba(20,184,166,.18),transparent 40%),linear-gradient(160deg,#06101c 0%,#0b1a2e 55%,#0f2744 100%)}
.cover-inner{position:relative;z-index:2;height:100%;padding:18mm 12mm;display:flex;flex-direction:column}
.cover-pills{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap}
.pill{font-size:8pt;font-weight:700;padding:5px 12px;border-radius:999px;border:1px solid rgba(125,211,252,.35);background:rgba(14,165,233,.12);color:#bae6fd}
.pill-soft{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.18);color:#cbd5e1}
.cover-brand{display:flex;align-items:center;gap:14px;margin-bottom:22px}
.cover-logo{width:72px;height:72px;border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,.35)}
.cover-brand h1{font-size:28pt;font-weight:800;line-height:1.1;color:#fff}
.cover-brand .sub{font-size:11pt;color:#7dd3fc;font-weight:600;margin-top:4px}
.cover-title{font-size:22pt;font-weight:800;color:#fff;margin-bottom:8px;line-height:1.25}
.cover-desc{font-size:11pt;color:#94a3b8;max-width:420px;margin-bottom:28px}
.cover-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:auto}
.cover-card{background:rgba(255,255,255,.06);border:1px solid rgba(125,211,252,.2);border-radius:14px;padding:14px 16px}
.cover-card strong{display:block;font-size:13pt;color:#e0f2fe;margin-bottom:4px}
.cover-card span{font-size:9pt;color:#94a3b8}
.cover-foot{margin-top:18px;font-size:8pt;color:#64748b;display:flex;justify-content:space-between}
.section{page-break-after:always}.section:last-child{page-break-after:auto}
h2.sec{font-size:15pt;font-weight:800;color:#0b1a2e;border-bottom:3px solid #0ea5e9;padding-bottom:6px;margin-bottom:12px}
h3.sec{font-size:12pt;font-weight:700;color:#0c4a6e;margin:14px 0 8px}
p.lead{font-size:10.5pt;color:#334155;margin-bottom:12px}
.tip{background:#ecfeff;border-left:4px solid #06b6d4;padding:10px 12px;border-radius:0 8px 8px 0;font-size:9.5pt;color:#0e7490;margin:10px 0 14px}
.warn{background:#fff7ed;border-left:4px solid #f97316;padding:10px 12px;border-radius:0 8px 8px 0;font-size:9.5pt;color:#9a3412;margin:10px 0 14px}
.steps{counter-reset:step;margin:8px 0 14px}
.step{display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;page-break-inside:avoid}
.step::before{counter-increment:step;content:counter(step);flex:0 0 28px;height:28px;background:#0ea5e9;color:#fff;border-radius:8px;font-weight:800;font-size:11pt;line-height:28px;text-align:center}
.step-body h4{font-size:10.5pt;font-weight:700;color:#0f172a;margin-bottom:2px}
.step-body p{font-size:9.5pt;color:#475569}
.figure{margin:10px 0 16px;page-break-inside:avoid;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#f8fafc}
.figure img{width:100%;height:auto;display:block;max-height:190px;object-fit:cover;object-position:center}
.figure figcaption{font-size:8pt;color:#64748b;text-align:center;padding:6px 10px;background:#fff;border-top:1px solid #e2e8f0}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0}
.card{border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#fff;page-break-inside:avoid}
.card h4{font-size:10.5pt;font-weight:700;color:#0c4a6e;margin-bottom:6px}
.card p,.card li{font-size:9pt;color:#475569}
.card ul{padding-left:16px;margin-top:4px}
.card li{margin:3px 0}
.platform{display:inline-block;font-size:8pt;font-weight:700;padding:3px 9px;border-radius:999px;margin-right:6px;vertical-align:middle}
.platform-ios{background:#e0f2fe;color:#0369a1}
.platform-and{background:#d1fae5;color:#047857}
.faq-item{border-bottom:1px solid #e2e8f0;padding:10px 0;page-break-inside:avoid}
.faq-item strong{display:block;font-size:10pt;color:#0f172a;margin-bottom:3px}
.faq-item p{font-size:9.5pt;color:#475569}
.toc-row{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px dotted #cbd5e1;padding:7px 0;font-size:10pt}
.toc-row span:last-child{color:#0284c7;font-weight:700;font-size:9pt}
.footer-note{margin-top:16px;font-size:8pt;color:#94a3b8;text-align:center}
</style>
</head>
<body>
<div class="cover">
  <div class="cover-bg"></div>
  <div class="cover-inner">
    <div class="cover-pills">
      <span class="pill">S-Chat</span>
      <span class="pill pill-soft">iPhone</span>
      <span class="pill pill-soft">Android</span>
      <span class="pill pill-soft">ภาษาไทย</span>
    </div>
    <div class="cover-brand">
      ${logo ? `<img class="cover-logo" src="${logo}" alt="S-Chat">` : ''}
      <div>
        <h1>S-Chat</h1>
        <div class="sub">แชทองค์กรโรงพยาบาล</div>
      </div>
    </div>
    <div class="cover-title">คู่มือติดตั้ง และใช้งาน<br>บนมือถือ</div>
    <p class="cover-desc">อธิบายทีละขั้นสำหรับผู้ที่ไม่ชำนาญคอมพิวเตอร์ — ติดตั้งบน iPhone และ Android สร้างกลุ่ม ยกเลิกข้อความ และส่งสติกเกอร์</p>
    <div class="cover-grid">
      <div class="cover-card"><strong>ตอนที่ 1 · Android</strong><span>ติดตั้งแอปจาก Chrome · เปิดแจ้งเตือน · เข้าสู่ระบบ</span></div>
      <div class="cover-card"><strong>ตอนที่ 2 · iPhone</strong><span>เพิ่มไปหน้าจอโฮมด้วย Safari · ตั้งรหัสผ่าน · เข้าสู่ระบบ</span></div>
      <div class="cover-card"><strong>ตอนที่ 3 · ใช้งาน</strong><span>แชท · เพื่อน · กลุ่ม · สติกเกอร์ · ยกเลิกข้อความ</span></div>
      <div class="cover-card"><strong>แก้ปัญหาบ่อย</strong><span>แจ้งเตือนไม่มา · ติดตั้งไม่ได้ · ลืมรหัสผ่าน</span></div>
    </div>
    <div class="cover-foot"><span>เวอร์ชัน 1.0</span><span>อัปเดต ${today}</span></div>
  </div>
</div>

<div class="section">
  <h2 class="sec">สารบัญ และเริ่มต้น</h2>
  <p class="lead"><strong>S-Chat</strong> คือแอปแชทของโรงพยาบาลบนมือถือ ใช้คุยกับเพื่อนร่วมงานเป็นรายคนหรือเป็นกลุ่ม ติดตั้งครั้งเดียวแล้วเปิดจากไอคอนบนหน้าจอโฮมได้เหมือนแอปทั่วไป</p>
  <div class="toc-row"><span>1. ติดตั้งบน Android</span><span>หน้าถัดไป</span></div>
  <div class="toc-row"><span>2. ติดตั้งบน iPhone (Apple)</span><span>—</span></div>
  <div class="toc-row"><span>3. ใช้งานพื้นฐาน</span><span>—</span></div>
  <div class="toc-row"><span>4. กำหนดกลุ่ม</span><span>—</span></div>
  <div class="toc-row"><span>5. ยกเลิกข้อความ</span><span>—</span></div>
  <div class="toc-row"><span>6. ส่งสติกเกอร์</span><span>—</span></div>
  <div class="toc-row"><span>7. แก้ปัญหาที่พบบ่อย</span><span>—</span></div>
  <div class="tip" style="margin-top:18px"><strong>ก่อนเริ่ม:</strong> ขอลิงก์เปิด S-Chat จากทีมไอทีหรือผู้ดูแลระบบ แล้วเลือกทำตามตอนที่ตรงกับมือถือของคุณ</div>
  <div class="two-col">
    <div class="card"><h4><span class="platform platform-and">Android</span> เหมาะกับ</h4><ul><li>โทรศัพท์ Android ที่ใช้ Chrome</li><li>กดปุ่ม «ติดตั้งแอป» ได้โดยตรง</li><li>เข้าสู่ระบบด้วย LINE หรืออีเมลได้</li></ul></div>
    <div class="card"><h4><span class="platform platform-ios">iPhone</span> เหมาะกับ</h4><ul><li>ต้องเปิดด้วย <strong>Safari</strong> เท่านั้น</li><li>เพิ่มไปยังหน้าจอโฮมด้วยตัวเอง</li><li>เข้าสู่ระบบด้วยอีเมล + รหัสผ่าน</li></ul></div>
  </div>
</div>

<div class="section">
  <h2 class="sec"><span class="platform platform-and">Android</span> ตอนที่ 1 — ติดตั้งและตั้งค่า</h2>
  <p class="lead">ใช้เบราว์เซอร์ <strong>Chrome</strong> บนโทรศัพท์ Android ตามขั้นตอนด้านล่าง</p>
  ${fig(images.android, 'ภาพแนวทาง: กดติดตั้งแอป แล้วอนุญาตการแจ้งเตือน')}
  <div class="steps">
    <div class="step"><div class="step-body"><h4>เปิดลิงก์ S-Chat ใน Chrome</h4><p>แตะลิงก์ที่ได้รับ หรือวางลิงก์ในแถบที่อยู่ของ Chrome แล้วกดไป</p></div></div>
    <div class="step"><div class="step-body"><h4>กดปุ่ม «ติดตั้งแอป»</h4><p>ถ้าเห็นปุ่มนี้ ให้กดทันที แล้วยืนยันการติดตั้ง ไอคอน S-Chat จะไปอยู่ที่หน้าจอโฮม</p></div></div>
    <div class="step"><div class="step-body"><h4>อนุญาตการแจ้งเตือน</h4><p>เมื่อระบบถามเรื่องการแจ้งเตือน ให้กดอนุญาต เพื่อให้รู้เมื่อมีข้อความใหม่</p></div></div>
    <div class="step"><div class="step-body"><h4>เข้าสู่ระบบ</h4><p>เลือกเข้าด้วย LINE หรือกรอกอีเมลกับรหัสผ่านตามที่องค์กรกำหนด จากนั้นเริ่มแชทได้เลย</p></div></div>
  </div>
  <div class="tip">ครั้งถัดไปให้เปิดจากไอคอน <strong>S-Chat</strong> บนหน้าจอโฮม ไม่ต้องพิมพ์ลิงก์ใหม่ทุกครั้ง</div>
</div>

<div class="section">
  <h2 class="sec"><span class="platform platform-ios">iPhone</span> ตอนที่ 2 — ติดตั้งและตั้งค่า</h2>
  <p class="lead">บน iPhone ต้องใช้ <strong>Safari</strong> — อย่าใช้ Chrome เพราะติดตั้งและแจ้งเตือนจะใช้ไม่ได้</p>
  ${fig(images.ios, 'ภาพแนวทาง: แชร์ใน Safari → เพิ่มไปยังหน้าจอโฮม')}
  <h3 class="sec">2.1 ติดตั้งบนหน้าจอโฮม</h3>
  <div class="steps">
    <div class="step"><div class="step-body"><h4>เปิดลิงก์ S-Chat ใน Safari</h4><p>ถ้าเปิดใน Chrome ให้คัดลอกลิงก์ แล้ววางเปิดใน Safari แทน</p></div></div>
    <div class="step"><div class="step-body"><h4>แตะปุ่มแชร์ ⎙</h4><p>ปุ่มแชร์อยู่แถบล่างของ Safari จากนั้นเลื่อนหา «เพิ่มไปยังหน้าจอโฮม»</p></div></div>
    <div class="step"><div class="step-body"><h4>เปิดเป็นเว็บแอป แล้วแตะเพิ่ม</h4><p>ถ้ามีสวิตช์ «เปิดเป็นเว็บแอป» ให้เปิดไว้ แล้วแตะเพิ่ม — จะได้ไอคอน S-Chat บนหน้าจอโฮม</p></div></div>
    <div class="step"><div class="step-body"><h4>เปิดจากไอคอน (ไม่ใช่จากแถบ Safari)</h4><p>เปิดแอปที่ไม่มีแถบที่อยู่ของ Safari แล้วอนุญาตการแจ้งเตือนเมื่อระบบถาม</p></div></div>
  </div>
  <div class="warn"><strong>สำคัญ:</strong> ถ้าเคยติดตั้งไอคอนเก่าไว้ ให้ลบออกจากหน้าจอโฮมก่อน แล้วเพิ่มใหม่ตามขั้นตอนนี้</div>
  <h3 class="sec">2.2 ตั้งรหัสผ่านในเว็บแอป SMH (ครั้งแรก)</h3>
  <p class="lead" style="margin-bottom:8px">บน iPhone เข้า S-Chat ด้วย <strong>อีเมล + รหัสผ่าน</strong> เท่านั้น ถ้ายังไม่มีรหัสผ่าน ให้ตั้งในเว็บแอป SMH ก่อน</p>
  <div class="steps">
    <div class="step"><div class="step-body"><h4>เปิดเว็บแอป SMH บน Safari</h4><p>เข้าสู่ระบบเว็บแอปตามที่องค์กรใช้อยู่ (บนเว็บอาจใช้ LINE ได้)</p></div></div>
    <div class="step"><div class="step-body"><h4>ไปที่ ตั้งค่า → รหัสผ่าน</h4><p>ตั้งรหัสผ่านใหม่ที่จำได้ แล้วบันทึก</p></div></div>
    <div class="step"><div class="step-body"><h4>กลับมาที่ S-Chat แล้วล็อกอิน</h4><p>กรอกอีเมลเดียวกันกับในเว็บแอป พร้อมรหัสผ่านที่เพิ่งตั้ง แล้วเริ่มใช้งาน</p></div></div>
  </div>
</div>

<div class="section">
  <h2 class="sec">ตอนที่ 3 — ใช้งานพื้นฐาน</h2>
  <p class="lead">หลังเข้าสู่ระบบแล้ว จะเห็นแถบด้านบนชื่อ <strong>S-Chat</strong> และรายการแชท</p>
  <div class="two-col">
    <div class="card"><h4>แท็บหลัก</h4><ul><li><strong>แชท</strong> — ห้องที่เคยคุย</li><li><strong>เพื่อน</strong> — เลือกลูกคนเพื่อเริ่มคุย</li><li><strong>กลุ่ม</strong> — ห้องกลุ่มและสร้างกลุ่มใหม่</li></ul></div>
    <div class="card"><h4>สิ่งที่ควรเปิด</h4><ul><li>ปุ่ม <strong>เปิดแจ้งเตือน</strong> ถ้ายังไม่ได้อนุญาต</li><li>ปุ่ม <strong>ทดสอบเสียง</strong> เพื่อตรวจว่ามีเสียงเมื่อมีข้อความ</li><li>ค้นหาแชท จากช่องค้นหาด้านบนรายการ</li></ul></div>
  </div>
  <div class="tip">พิมพ์ข้อความในช่องด้านล่างแล้วกดส่ง — ข้อความจะไปหาอีกฝ่ายทันทีเมื่อออนไลน์</div>
</div>

<div class="section">
  <h2 class="sec">ตอนที่ 4 — กำหนดกลุ่ม</h2>
  <p class="lead">ใช้กลุ่มเมื่อต้องการคุยหลายคนพร้อมกัน เช่น ทีมงานแผนก หรือโครงการ</p>
  ${fig(images.groups, 'ภาพแนวทาง: แท็บกลุ่ม และปุ่มสร้างกลุ่ม')}
  <h3 class="sec">สร้างกลุ่มใหม่</h3>
  <div class="steps">
    <div class="step"><div class="step-body"><h4>แตะแท็บ «กลุ่ม»</h4><p>มุมล่างของรายการจะมีปุ่ม <strong>＋ สร้างกลุ่ม</strong></p></div></div>
    <div class="step"><div class="step-body"><h4>ตั้งชื่อกลุ่ม</h4><p>ใส่ชื่อที่เข้าใจง่าย เช่น «ทีมธุรการ» หรือ «ประชุมเช้า»</p></div></div>
    <div class="step"><div class="step-body"><h4>เลือกสมาชิก</h4><p>ค้นหาชื่อแล้วติ๊กเลือกอย่างน้อย 1 คน จากนั้นกด <strong>สร้างกลุ่ม</strong></p></div></div>
  </div>
  <h3 class="sec">ดู / เพิ่มสมาชิก</h3>
  <div class="steps">
    <div class="step"><div class="step-body"><h4>แตะชื่อกลุ่มที่หัวแชท</h4><p>จะเห็นรายชื่อสมาชิก สามารถเพิ่มสมาชิก หรือออกจากกลุ่มได้ตามสิทธิ์</p></div></div>
  </div>
  <div class="tip"><strong>กลุ่มแผนก/ฝ่าย:</strong> บางกลุ่มถูกสร้างอัตโนมัติจากแผนกที่เลือกในเว็บแอป SMH สมาชิกจะตามแผนก ไม่ต้องสร้างเอง — ถ้ายังไม่เห็น ให้ตรวจว่าเลือกแผนกในเว็บแอปแล้ว</div>
</div>

<div class="section">
  <h2 class="sec">ตอนที่ 5 — ยกเลิกข้อความ</h2>
  <p class="lead">ส่งผิดหรืออยากเก็บข้อความกลับ ให้ใช้ «ยกเลิกข้อความ» ข้อความจะหายไปจากห้องแชท</p>
  ${fig(images.unsend, 'ภาพแนวทาง: เมนูยกเลิกข้อความ และการยืนยัน')}
  <div class="steps">
    <div class="step"><div class="step-body"><h4>กดค้างที่ข้อความของตัวเอง</h4><p>หรือเปิดเมนูที่ข้อความ จนเห็นตัวเลือก <strong>ยกเลิกข้อความ</strong></p></div></div>
    <div class="step"><div class="step-body"><h4>แตะ «ยกเลิกข้อความ»</h4><p>ระบบจะถามยืนยันอีกครั้ง อ่านข้อความเตือนให้ครบ</p></div></div>
    <div class="step"><div class="step-body"><h4>กด «ยกเลิกเลย» เพื่อยืนยัน</h4><p>ถ้ายังไม่แน่ใจ ให้กด «ยังไม่ยกเลิก» — เมื่อยกเลิกแล้วจะเสียดายไม่ได้</p></div></div>
  </div>
  <div class="warn">ข้อความที่ยกเลิกแล้วจะแสดงเป็น «ยกเลิกข้อความแล้ว» อีกฝ่ายจะไม่เห็นเนื้อหาเดิม</div>
</div>

<div class="section">
  <h2 class="sec">ตอนที่ 6 — ส่งสติกเกอร์</h2>
  <p class="lead">สติกเกอร์ช่วยสื่ออารมณ์สั้น ๆ โดยไม่ต้องพิมพ์ยาว</p>
  ${fig(images.stickers, 'ภาพแนวทาง: ปุ่มสติกเกอร์และแผงเลือก')}
  <div class="steps">
    <div class="step"><div class="step-body"><h4>เปิดห้องแชทที่ต้องการ</h4><p>อยู่ที่ช่องพิมพ์ข้อความด้านล่างของหน้าจอ</p></div></div>
    <div class="step"><div class="step-body"><h4>แตะปุ่ม ☺ (สติกเกอร์)</h4><p>แผงสติกเกอร์จะเปิดขึ้นมาเหนือช่องพิมพ์</p></div></div>
    <div class="step"><div class="step-body"><h4>เลือกสติกเกอร์ที่ต้องการ</h4><p>แตะรูปหนึ่งครั้ง ระบบจะส่งเข้าห้องแชททันที</p></div></div>
  </div>
  <div class="tip">แตะปุ่ม ☺ อีกครั้งเพื่อปิดแผงสติกเกอร์ แล้วกลับไปพิมพ์ข้อความปกติได้</div>
</div>

<div class="section">
  <h2 class="sec">ตอนที่ 7 — แก้ปัญหาที่พบบ่อย</h2>
  <div class="faq-item"><strong>บน iPhone กดติดตั้งแล้วไม่สำเร็จ / ไม่มีแจ้งเตือน</strong><p>กำลังเปิดด้วย Chrome อยู่หรือไม่? ให้คัดลอกลิงก์ไปเปิดใน <strong>Safari</strong> แล้วเพิ่มไปยังหน้าจอโฮม จากนั้นเปิดจากไอคอนแอป</p></div>
  <div class="faq-item"><strong>เข้า S-Chat บน iPhone ไม่ได้ เพราะไม่มีรหัสผ่าน</strong><p>ไปตั้งรหัสผ่านที่เว็บแอป SMH เมนู <strong>ตั้งค่า → รหัสผ่าน</strong> แล้วกลับมาล็อกอินด้วยอีเมล + รหัสผ่านนั้น</p></div>
  <div class="faq-item"><strong>Android ไม่เห็นปุ่ม «ติดตั้งแอป»</strong><p>ลองเปิดลิงก์ใน Chrome อีกครั้ง หรือใช้เมนู ⋮ ของ Chrome แล้วเลือก «ติดตั้งแอป» / «เพิ่มไปยังหน้าจอหลัก»</p></div>
  <div class="faq-item"><strong>ไม่มีการแจ้งเตือนเมื่อมีข้อความใหม่</strong><p>เปิดแอปจากไอคอนหน้าจอโฮม กด «เปิดแจ้งเตือน» ในแอป และตรวจในการตั้งค่าโทรศัพท์ว่าอนุญาตการแจ้งเตือนให้ S-Chat แล้ว</p></div>
  <div class="faq-item"><strong>ยังไม่เห็นกลุ่มแผนก</strong><p>เข้าเว็บแอป SMH เลือกแผนก/ฝ่ายของตนเองให้ครบ แล้วกลับมาเปิด S-Chat ใหม่ กลุ่มแผนกจะปรากฏในแท็บกลุ่ม</p></div>
  <div class="faq-item"><strong>ลืมรหัสผ่าน</strong><p>ตั้งรหัสผ่านใหม่ได้จากเว็บแอป SMH (ตั้งค่า → รหัสผ่าน) หรือติดต่อทีมไอทีของโรงพยาบาล</p></div>
  <p class="footer-note">คู่มือนี้จัดทำสำหรับผู้ใช้ทั่วไป · S-Chat · ${today}</p>
</div>
</body>
</html>`;

fs.mkdirSync(storageDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('HTML saved:', htmlPath);

const chrome = findChrome();
if (!chrome) {
  console.error('Chrome not found');
  process.exit(1);
}

const htmlUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
try {
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdfAsciiPath}`,
    htmlUrl,
  ], { stdio: 'inherit' });
} catch (err) {
  // Chrome sometimes exits non-zero even after writing the PDF.
  console.warn('Chrome exited with a warning; checking output file…');
}

if (!fs.existsSync(pdfAsciiPath)) {
  console.error('PDF generation failed — Chrome did not write the file.');
  process.exit(1);
}

try {
  fs.copyFileSync(pdfAsciiPath, pdfPath);
} catch {
  // Thai filename may fail on some shells; ASCII copy is enough.
}
const sizeKb = Math.round(fs.statSync(pdfAsciiPath).size / 1024);
console.log(`PDF created: ${pdfAsciiPath} (${sizeKb} KB)`);
if (fs.existsSync(pdfPath)) {
  console.log(`Also: ${pdfPath}`);
}
