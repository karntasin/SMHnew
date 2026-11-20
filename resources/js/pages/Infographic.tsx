import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
  FileText,
  Clock,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Printer,
  Sparkles,
  ArrowRight,
  Tv,
  Wrench,
  Car,
  FolderLock,
  Layers,
  HeartPulse,
  Share2,
  CalendarCheck,
  ChevronRight,
  Smartphone,
  Leaf,
  Maximize2,
  Minimize2,
  Building2
} from 'lucide-react';

interface InfographicProps {
  stats?: {
    paperless_rate: number;
    time_saved_percent: number;
    workload_reduced_percent: number;
    paper_saved_sheets_per_year: number;
    cost_saved_baht_per_year: number;
    modules_count: number;
    security_standard: string;
  };
}

export default function Infographic({ stats }: InfographicProps) {
  const [staffCount, setStaffCount] = useState<number>(180);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'workload' | 'time' | 'paper'>('all');

  // Dynamic calculations based on staff size
  const calculatedPaperSaved = Math.round(staffCount * 320); // 320 sheets per staff per year
  const calculatedCostSaved = Math.round(calculatedPaperSaved * 2.8); // Paper + printing + storage cost (~2.8 THB/sheet)
  const calculatedHoursSaved = Math.round(staffCount * 45); // 45 hours saved per staff per year

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-500 selection:text-white print:bg-white print:text-black">
      <Head>
        <title>SMH Infographic - รพ.ค่ายสุรสิงหนาท Smart Hospital</title>
        <meta
          name="description"
          content="อินโฟกราฟฟิกนำเสนอระบบบริหารโรงพยาบาลค่ายสุรสิงหนาท (FSHH / SMH): ลดภาระงาน ประหยัดเวลา 100% Paperless"
        />
      </Head>

      {/* Top Floating Control Bar (Hidden when printing) */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              โรงพยาบาลค่ายสุรสิงหนาท (FSHH / SMH)
            </h1>
            <p className="text-xs text-slate-500">Smart Hospital Transformation • Infographic Presentation</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="สลับโหมดเต็มจอเพื่อนำเสนอ"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'ย่อจอ' : 'เต็มจอ (Presentation)'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
            title="พิมพ์หรือบันทึกเป็น PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์ / บันทึก PDF</span>
          </button>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg bg-white transition-colors"
          >
            <span>เข้าสู่ระบบ</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Infographic Canvas */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-emerald-950 text-white p-6 sm:p-10 shadow-xl border border-teal-800/40">
          {/* Background Ambient Glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>ก้าวสู่อนาคตการแพทย์ดิจิทัล 100% Digital Hospital</span>
            </div>

            <div className="space-y-3 max-w-3xl">
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
                SMH SMART WORKFLOW
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  ลดภาระงาน • ประหยัดเวลา • ไร้กระดาษ
                </span>
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                เว็บแอปพลิเคชันบริหารจัดการภายในโรงพยาบาลค่ายสุรสิงหนาท เชื่อมต่อทุกสายงานเข้าด้วยกัน 
                ตั้งแต่คิวผู้ป่วย งานแจ้งซ่อม บริหารยานพาหนะ ยืม-คืนครุภัณฑ์ ไปจนถึงคลังเอกสารคุณภาพ และการวิเคราะห์ข้อมูล HOSxP อัจฉริยะ
              </p>
            </div>

            {/* 3 Core Highlight Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-teal-800/60">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-300">
                    -70<span className="text-lg font-normal">%</span>
                  </div>
                  <div className="text-xs text-slate-300">ลดภาระงานธุรการซ้ำซ้อน</div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-cyan-300">
                    5x <span className="text-base font-normal">เร็วขึ้น</span>
                  </div>
                  <div className="text-xs text-slate-300">ขั้นตอนอนุมัติ & ค้นหาเอกสาร</div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Leaf className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-300">
                    100<span className="text-lg font-normal">%</span>
                  </div>
                  <div className="text-xs text-slate-300">Paperless ในระบบคำขอหลัก</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 PILLARS DEEP-DIVE */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl sm:text-3xl font-bold text-slate-900">
              3 เสาหลักมอบคุณค่า ยกระดับชีวิตการทำงานในโรงพยาบาล
            </h3>
            <p className="text-sm text-slate-600 max-w-2xl mx-auto">
              ออกแบบโดยเน้นผู้ใช้งานเป็นศูนย์กลาง (Human-Centered Design) ตอบโจทย์ทั้งบุคลากรทางการแพทย์ เจ้าหน้าที่ธุรการ และผู้บริหาร
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1: Workload */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Pillar 01</span>
                <h4 className="text-lg font-bold text-slate-900">การลดภาระงาน (Workload Cut)</h4>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>FSHH-Q ระบบคิวอัจฉริยะ:</strong> จอทีวีเรียกคิวอัตโนมัติ ลดการตะโกน ลดความแออัดหน้าห้องตรวจ</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>สแกนแจ้งซ่อม & ตรวจจุด ENV:</strong> สแกน QR หน้างาน แจ้งช่างได้ทันทีพร้อมแนบรูปถ่าย</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>ยืม-คืนเครื่องมือแพทย์:</strong> ระบบเช็คสต็อกสถานะ Real-time ป้องกันอุปกรณ์สูญหาย</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>ดึงรายงาน HOSxP อัตโนมัติ:</strong> ตัดขั้นตอนการคัดลอกและจัดฟอร์แมต Excel ซ้ำซ้อน</span>
                </li>
              </ul>
            </div>

            {/* Pillar 2: Time */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Pillar 02</span>
                <h4 className="text-lg font-bold text-slate-900">ประหยัดเวลา (Time Efficiency)</h4>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>อนุมัติ 1-Click ทุกที่ทุกเวลา:</strong> ขอใช้รถ จองห้องประชุม ขอลางาน อนุมัติผ่านมือถือได้ทันที</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>ค้นหาเอกสารใน 3 วินาที:</strong> ค้นหาระเบียบปฏิบัติ (SOP/WI/นโยบาย) ได้แม่นยำ ไม่ต้องรื้อตู้เอกสาร</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>แจ้งเตือนผ่าน LINE ทันที:</strong> เมื่อช่างรับงาน หรือผู้บริหารอนุมัติคำขอ ทุกฝ่ายทราบผลทันควัน</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Dashboard สรุปสด:</strong> ผู้บริหารดูตัวเลขสถิติผู้ป่วย ค่าใช้จ่าย ดัชนีคุณภาพ (HA) ได้แบบสดๆ</span>
                </li>
              </ul>
            </div>

            {/* Pillar 3: Paperless */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Leaf className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Pillar 03</span>
                <h4 className="text-lg font-bold text-slate-900">100% ไร้กระดาษ (Paperless & Green)</h4>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>ยกเลิกแบบฟอร์มกระดาษกว่า 20 ชนิด:</strong> ใบขอรถ ใบลา ใบส่งซ่อม ใบบันทึกตรวจเช็คอุปกรณ์</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>ประหยัดกระดาษ 58,000+ แผ่น/ปี:</strong> เทียบเท่าต้นไม้หลายสิบต้น ช่วยรักษาสิ่งแวดล้อม</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>ประหยัดงบค่าหมึก & ซ่อมเครื่องพิมพ์:</strong> ลดค่าใช้จ่ายสิ้นเปลืองของโรงพยาบาลได้มากกว่าแสนบาท/ปี</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>ประหยัดพื้นที่คลังเอกสาร:</strong> เอกสารจัดเก็บในระบบคลาวด์/เซิร์ฟเวอร์อย่างปลอดภัย ไม่ชำรุด</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* BEFORE VS AFTER COMPARISON */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Before & After Impact</span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                เปรียบเทียบชีวิตการทำงาน: รูปแบบเดิม VS ระบบใหม่ SMH
              </h3>
            </div>
            <span className="self-start sm:self-auto text-xs px-3 py-1 bg-slate-100 rounded-full font-medium text-slate-600">
              เห็นผลลัพธ์ชัดเจนตั้งแต่สัปดาห์แรกที่เริ่มใช้
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before (Traditional) */}
            <div className="rounded-2xl bg-rose-50/60 border border-rose-200/80 p-5 space-y-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-base">
                <XCircle className="w-5 h-5 text-rose-500" />
                <span>วันวานที่คุ้นเคย (แบบเดิม)</span>
              </div>
              <div className="space-y-3 text-xs sm:text-sm text-slate-700">
                <div className="p-3 bg-white/80 rounded-xl border border-rose-100">
                  <p className="font-semibold text-rose-900">📄 เอกสารล้นโต๊ะ ลายเซ็นหลายขั้นตอน</p>
                  <p className="text-slate-600 mt-1">ต้องเขียนใบขอรถ ใบลา ใบแจ้งซ่อม เดินแฟ้มไปตามตึก หากผู้บังคับบัญชาไม่อยู่ งานต้องชะงัก</p>
                </div>
                <div className="p-3 bg-white/80 rounded-xl border border-rose-100">
                  <p className="font-semibold text-rose-900">⏳ เสียเวลาค้นหาเอกสารเก่าเป็นชั่วโมง</p>
                  <p className="text-slate-600 mt-1">จะหาคู่มือ SOP หรือประวัติการซ่อม ต้องรื้อแฟ้มในห้องเก็บเอกสาร เสี่ยงเอกสารชำรุดหรือสูญหาย</p>
                </div>
                <div className="p-3 bg-white/80 rounded-xl border border-rose-100">
                  <p className="font-semibold text-rose-900">📢 คิวผู้ป่วยแออัด เจ้าหน้าที่ต้องตะโกนเรียก</p>
                  <p className="text-slate-600 mt-1">ผู้ป่วยไม่รู้ลำดับคิว ต้องยืนออหน้าห้องตรวจ/ห้องยา เกิดความเครียดทั้งผู้รับบริการและผู้ให้บริการ</p>
                </div>
                <div className="p-3 bg-white/80 rounded-xl border border-rose-100">
                  <p className="font-semibold text-rose-900">📊 รายงานคุณภาพ (HA/KPI) ต้องทำมือ</p>
                  <p className="text-slate-600 mt-1">ต้องดึงสถิติยา RDU และข้อมูลเวชระเบียนมาเขียนสูตรคำนวณใน Excel นานเป็นวันๆ</p>
                </div>
              </div>
            </div>

            {/* After (SMH Smart App) */}
            <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200/80 p-5 space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>วันนี้ที่ รพ.ค่ายสุรสิงหนาท (ระบบใหม่ SMH)</span>
              </div>
              <div className="space-y-3 text-xs sm:text-sm text-slate-700">
                <div className="p-3 bg-white/90 rounded-xl border border-emerald-200 shadow-2xs">
                  <p className="font-semibold text-emerald-950">✨ ยื่นคำขอ 1 นาที อนุมัติผ่านมือถือได้ทันที</p>
                  <p className="text-slate-600 mt-1">ไม่ต้องใช้กระดาษแม้แต่แผ่นเดียว ทุกคำขอส่งตรงถึงผู้มีอำนาจอนุมัติ พร้อมแจ้งเตือนผ่าน LINE</p>
                </div>
                <div className="p-3 bg-white/90 rounded-xl border border-emerald-200 shadow-2xs">
                  <p className="font-semibold text-emerald-950">⚡ ค้นหาเอกสารคุณภาพได้ใน 3 วินาที</p>
                  <p className="text-slate-600 mt-1">มีระบบ Smart Search ค้นหาด้วยคีย์เวิร์ด มีประวัติการแก้ไขและเวอร์ชันชัดเจน ถูกต้องตามเกณฑ์ HA</p>
                </div>
                <div className="p-3 bg-white/90 rounded-xl border border-emerald-200 shadow-2xs">
                  <p className="font-semibold text-emerald-950">📺 คิวขึ้นจอ TV อัจฉริยะ นั่งรออย่างสบายใจ</p>
                  <p className="text-slate-600 mt-1">ผู้ป่วยเห็นคิวชัดเจนบนจอทีวี ลดความแออัด เจ้าหน้าที่มีสมาธิในการตรวจและจ่ายยาเต็มที่</p>
                </div>
                <div className="p-3 bg-white/90 rounded-xl border border-emerald-200 shadow-2xs">
                  <p className="font-semibold text-emerald-950">📈 ประมวลผลดัชนีคุณภาพจาก HOSxP อัตโนมัติ</p>
                  <p className="text-slate-600 mt-1">เชื่อมต่อแบบ Read-Only มั่นคง ปลอดภัย ข้อมูลสถิติและ Dashboard ออกมาให้พร้อมใช้งานทันที</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW ROADMAP (1-2-3-4 STEP) */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl sm:text-3xl font-bold text-slate-900">
              การทำงาน 4 ขั้นตอนง่ายๆ สะดวก รวดเร็ว ทุกที่ ทุกเวลา
            </h3>
            <p className="text-sm text-slate-600 max-w-xl mx-auto">
              รองรับการทำงานทั้งบนคอมพิวเตอร์และสมาร์ตโฟน ใช้งานได้ทันทีโดยไม่ต้องติดตั้งโปรแกรมเพิ่ม
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center mb-3">
                1
              </div>
              <h5 className="font-bold text-slate-900 mb-1">สร้างรายการใน 1 นาที</h5>
              <p className="text-xs text-slate-600">
                เลือกแบบฟอร์มดิจิทัล (ขอรถ, ลางาน, จองห้อง, แจ้งซ่อม) กรอกข้อมูลง่ายๆ จากมือถือหรือคอมพิวเตอร์
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative">
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-sm flex items-center justify-center mb-3">
                2
              </div>
              <h5 className="font-bold text-slate-900 mb-1">อนุมัติแบบ 1-Click</h5>
              <p className="text-xs text-slate-600">
                หัวหน้างานและผู้บริหารได้รับแจ้งเตือน และกดอนุมัติได้ทันทีแม้ไม่ได้อยู่ที่โต๊ะทำงาน
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative">
              <div className="w-8 h-8 rounded-full bg-cyan-600 text-white font-bold text-sm flex items-center justify-center mb-3">
                3
              </div>
              <h5 className="font-bold text-slate-900 mb-1">ระบบแจ้งเตือน Real-time</h5>
              <p className="text-xs text-slate-600">
                ผู้ยื่นคำขอและผู้เกี่ยวข้องได้รับแจ้งสถานะผ่าน LINE และ In-App Notification พร้อมปฏิบัติงานต่อ
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center mb-3">
                4
              </div>
              <h5 className="font-bold text-slate-900 mb-1">จัดเก็บ & สรุป Dashboard</h5>
              <p className="text-xs text-slate-600">
                บันทึกเป็นประวัติดิจิทัล สืบค้นย้อนหลังได้ 100% พร้อมออกสถิติวิเคราะห์ให้ผู้บริหารตัดสินใจ
              </p>
            </div>
          </div>
        </section>

        {/* INTERACTIVE IMPACT & SAVINGS CALCULATOR (Interactive Simulation) */}
        <section className="bg-gradient-to-br from-teal-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-lg border border-teal-800/50 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-teal-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>จำลองผลลัพธ์ความคุ้มค่า (Interactive ROI Simulator)</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                คำนวณการประหยัดเวลา กระดาษ และงบประมาณ สำหรับ รพ.ค่ายสุรสิงหนาท
              </h3>
            </div>
            <div className="text-xs text-slate-300">
              เลื่อนเพื่อปรับจำนวนบุคลากรของโรงพยาบาล
            </div>
          </div>

          {/* Slider Control */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 space-y-4">
            <div className="flex justify-between items-center">
              <label htmlFor="staff-slider" className="text-sm font-semibold text-slate-200">
                จำนวนบุคลากรและเจ้าหน้าที่ในโรงพยาบาล:
              </label>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 bg-emerald-950/80 px-4 py-1 rounded-xl border border-emerald-500/30">
                {staffCount} <span className="text-sm font-normal text-slate-300">คน</span>
              </div>
            </div>

            <input
              id="staff-slider"
              type="range"
              min="50"
              max="400"
              step="10"
              value={staffCount}
              onChange={(e) => setStaffCount(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-2xs text-slate-400">
              <span>50 คน</span>
              <span>180 คน (ค่าเฉลี่ยปัจจุบัน)</span>
              <span>400 คน</span>
            </div>
          </div>

          {/* Calculator Output Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 space-y-1">
              <span className="text-xs text-emerald-300 font-medium">📄 กระดาษที่ประหยัดได้ต่อปี</span>
              <div className="text-2xl sm:text-4xl font-black text-white">
                {calculatedPaperSaved.toLocaleString()}{' '}
                <span className="text-sm sm:text-base font-normal text-emerald-300">แผ่น/ปี</span>
              </div>
              <p className="text-2xs text-slate-300 pt-1">
                ลดการสั่งซื้อกระดาษได้กว่า {Math.round(calculatedPaperSaved / 500)} รีม/ปี
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 space-y-1">
              <span className="text-xs text-cyan-300 font-medium">⏱️ เวลาทำงานที่ได้คืนต่อปี</span>
              <div className="text-2xl sm:text-4xl font-black text-white">
                {calculatedHoursSaved.toLocaleString()}{' '}
                <span className="text-sm sm:text-base font-normal text-cyan-300">ชั่วโมง/ปี</span>
              </div>
              <p className="text-2xs text-slate-300 pt-1">
                มีเวลาเพิ่มขึ้นเพื่อดูแลผู้ป่วยและพัฒนางานบริการ
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 space-y-1">
              <span className="text-xs text-amber-300 font-medium">💰 งบประมาณสิ้นเปลืองที่ประหยัดได้</span>
              <div className="text-2xl sm:text-4xl font-black text-amber-300">
                ฿{calculatedCostSaved.toLocaleString()}{' '}
                <span className="text-sm sm:text-base font-normal text-slate-200">บาท/ปี</span>
              </div>
              <p className="text-2xs text-slate-300 pt-1">
                คำนวณจากค่ากระดาษ ค่าหมึกพิมพ์ และค่าบำรุงรักษา
              </p>
            </div>
          </div>
        </section>

        {/* SECURITY, PDPA & STANDARDS */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">
                มาตรฐานความมั่นคงปลอดภัยตามหลักสากล (Security & Compliance)
              </h4>
              <p className="text-xs text-slate-500">
                โรงพยาบาลมั่นใจได้ในความปลอดภัยของข้อมูลผู้ป่วยและบุคลากร
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <FolderLock className="w-4 h-4 text-emerald-600" />
                <span>PDPA PII Masking</span>
              </div>
              <p className="text-2xs text-slate-600 leading-relaxed">
                ซ่อนเลขบัตรประชาชน HN และนามสกุลของผู้ป่วยโดยอัตโนมัติก่อนส่งออกสู่หน้าบ้าน
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>HOSxP Read-Only Architecture</span>
              </div>
              <p className="text-2xs text-slate-600 leading-relaxed">
                อ่านข้อมูลสถิติจาก HOSxP แบบ Read-Only 100% รับประกันฐานข้อมูลหลักไม่ถูกแก้ไข
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                <span>HA Standards Compliant</span>
              </div>
              <p className="text-2xs text-slate-600 leading-relaxed">
                รองรับการตรวจรับรองคุณภาพมาตรฐานโรงพยาบาล (HA) ด้วยระบบดัชนีชี้วัดที่ตรวจสอบย้อนกลับได้
              </p>
            </div>
          </div>
        </section>

        {/* FOOTER CALL TO ACTION */}
        <section className="text-center py-6 border-t border-slate-200 space-y-3">
          <p className="text-xs text-slate-500">
            ระบบบริหารจัดการโรงพยาบาลอัจฉริยะ • โรงพยาบาลค่ายสุรสิงหนาท (FSHH / SMH)
          </p>
          <div className="flex items-center justify-center gap-3 print:hidden">
            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสารแผ่นพับ / PDF</span>
            </button>

            <Link
              href="/dashboard"
              className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700 shadow-sm transition-colors inline-flex items-center gap-2"
            >
              <span>เข้าสู่ระบบบริหารโรงพยาบาล</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
