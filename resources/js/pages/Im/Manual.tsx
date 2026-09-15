import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { ImPage, Panel } from '@/pages/Im/ui';
import { cn } from '@/lib/utils';
import {
    BookOpen, Target, ShieldAlert, Lock, Headset, FileCheck, Code2, Server,
    ArrowRight, CheckCircle2, Info, Lightbulb,
} from 'lucide-react';

interface Section {
    id: string;
    no: number;
    title: string;
    th: string;
    icon: typeof Target;
    color: string;
    href: string;
    intro: string;
    features: { name: string; desc: string }[];
    steps: string[];
    tips?: string[];
}

const SECTIONS: Section[] = [
    {
        id: 'master-plan', no: 1, title: 'IT Master Plan & Strategy', th: 'แผนแม่บทเทคโนโลยีสารสนเทศและแผนปฏิบัติการ',
        icon: Target, color: 'sky', href: '/im/master-plan',
        intro: 'จัดการแผนแม่บท IT ให้สอดคล้องกับยุทธศาสตร์โรงพยาบาล พร้อมติดตามการดำเนินงานแบบ PDCA และประเมินผลย้อนหลังหลายปี',
        features: [
            { name: 'Strategic Alignment Mapping', desc: 'เชื่อมยุทธศาสตร์โรงพยาบาลเข้ากับยุทธศาสตร์ IT ผ่านปัจจัยแห่งความสำเร็จ พร้อมแสดงอัตราความถูกต้อง (ต้องไม่ผิดพลาดเกินร้อยละ 50)' },
            { name: 'Action Plan Manager', desc: 'สร้างแผนปฏิบัติการ กำหนดโครงการ งบประมาณ ผู้รับผิดชอบ และช่วงเวลาเริ่มต้น-สิ้นสุดจริง (ระบบเตือนโครงการที่ยาว 12 เดือน)' },
            { name: 'PDCA Tracking Dashboard', desc: 'บันทึกผลการดำเนินงาน งบที่ใช้จริง ปัญหาอุปสรรค และ Lesson Learned เพื่อส่งต่อปีถัดไป' },
            { name: 'Multi-year Strategy Evaluation', desc: 'สรุปภาพรวมผลงานย้อนหลัง 2-3 ปี (เกณฑ์ระดับ 3 ดาว)' },
        ],
        steps: [
            'กด “สร้างแผนแม่บท” ระบุปี พ.ศ. ชื่อแผน และวิสัยทัศน์',
            'เลือกแผนที่ต้องการ แล้วเพิ่มการเชื่อมโยงยุทธศาสตร์ พร้อมกรอกอัตราความถูกต้องการวิเคราะห์',
            'เพิ่มโครงการในแผน กำหนดวันเริ่ม-สิ้นสุดจริง งบประมาณ และผู้รับผิดชอบ',
            'อัปเดตความคืบหน้า ขั้น PDCA ปัญหา และ Lesson Learned เป็นระยะ',
        ],
        tips: ['ระบบเตือนสีเหลืองเมื่อโครงการมีระยะเวลา 12 เดือน เพื่อกันการตั้งเวลาเหมารวมทุกโครงการ'],
    },
    {
        id: 'risk', no: 2, title: 'IT Risk Management', th: 'บริหารจัดการความเสี่ยงด้านสารสนเทศ',
        icon: ShieldAlert, color: 'rose', href: '/im/risk',
        intro: 'ประเมินและจัดการความเสี่ยง IT ล่วงหน้า พร้อมเปรียบเทียบคะแนนก่อน-หลัง และเก็บประวัติต่อเนื่องหลายรอบ PDCA',
        features: [
            { name: 'Vulnerability & Risk Assessment', desc: 'ประเมินความเสี่ยงด้วยคะแนน Likelihood (P) × Impact (I) แบบอัตโนมัติ ระบบบล็อกไม่ให้นำอุบัติการณ์ที่เกิดแล้วมาประเมิน' },
            { name: 'Risk Mitigation Strategy (4 Matrix)', desc: 'แยกกลยุทธ์ 4 ด้าน: Avoid / Reduce / Share / Accept' },
            { name: 'Pre-Post Risk Score Comparison', desc: 'เปรียบเทียบคะแนนก่อนและหลังการจัดการเพื่อดูประสิทธิภาพ' },
            { name: 'Risk History & PDCA Logs', desc: 'บันทึกประวัติรายปี เชื่อมโยงรหัส และเก็บได้อย่างน้อย 3 รอบ PDCA (เกณฑ์ระดับ 3 ดาว)' },
        ],
        steps: [
            'เลือกปีที่ต้องการ แล้วกด “ประเมินความเสี่ยง”',
            'ระบุรายละเอียด เลือกคะแนน P และ I (ระบบคำนวณคะแนนความเสี่ยงให้)',
            'เลือกกลยุทธ์จัดการ (4 Matrix) และกรอกมาตรการควบคุม',
            'หลังดำเนินการ กรอกคะแนน P/I หลังจัดการ เพื่อดูการเปรียบเทียบก่อน-หลัง',
        ],
        tips: ['หากติ๊ก “เป็นอุบัติการณ์ที่เกิดขึ้นแล้ว” ระบบจะไม่บันทึก เพราะระบบนี้ใช้วิเคราะห์โอกาสเกิดในอนาคตเท่านั้น'],
    },
    {
        id: 'security', no: 3, title: 'Security, PDPA & BCP', th: 'ความมั่นคงปลอดภัย PDPA และความต่อเนื่องทางธุรกิจ',
        icon: Lock, color: 'violet', href: '/im/security',
        intro: 'รวมนโยบายความปลอดภัยและ PDPA จัดการการประเมินความเข้าใจบุคลากร ซ้อมแผน BCP/DRP และบันทึกการสำรองข้อมูล',
        features: [
            { name: 'Policy & PDPA Document Center', desc: 'รวมนโยบายพร้อมควบคุมเวอร์ชันและแนบไฟล์' },
            { name: 'Staff Awareness & Testing', desc: 'ประเมินความเข้าใจบุคลากร (เป้าหมาย 100%) พร้อมแดชบอร์ด' },
            { name: 'BCP & DRP Drill Manager', desc: 'จับเวลาการซ้อมแผน บันทึกรายงานและผลปรับปรุงแบบ PDCA' },
            { name: 'Backup Logs & Checklist', desc: 'บันทึกการสำรองข้อมูล Offline ประจำวัน' },
        ],
        steps: [
            'ที่แท็บ “นโยบาย & PDPA” เพิ่มนโยบายพร้อมเวอร์ชันและไฟล์แนบ',
            'ที่แท็บ “ประเมินความเข้าใจ” บันทึกคะแนนบุคลากร (ผ่านเมื่อ ≥ 80%)',
            'ที่แท็บ “ซ้อมแผน” บันทึกเวลาที่ใช้ ผลการซ้อม และการปรับปรุง',
            'ที่แท็บ “Backup” บันทึกการสำรองข้อมูลประจำวัน',
        ],
    },
    {
        id: 'service-desk', no: 4, title: 'IT Service Desk & Incident', th: 'รับเรื่อง บันทึกอุบัติการณ์ และภาระงาน IT',
        icon: Headset, color: 'amber', href: '/im/service-desk',
        intro: 'รับแจ้งปัญหาและติดตามตาม SLA บันทึกอุบัติการณ์ตามมาตรฐาน HAIT พร้อม Problem Management และ Timesheet',
        features: [
            { name: 'Service Desk & SLA Monitor', desc: 'รับแจ้งปัญหาและติดตามสถานะ ระบบแจ้งเตือนเมื่อเกิน SLA' },
            { name: 'Incident & Problem Management', desc: 'บันทึกเหตุระบบล่ม/ขัดข้องตามมาตรฐาน HAIT และวิเคราะห์ป้องกันการเกิดซ้ำ' },
            { name: 'IT Timesheet & Activity Logs', desc: 'บันทึกกิจกรรมรายชั่วโมงของเจ้าหน้าที่ IT' },
        ],
        steps: [
            'ที่แท็บ “Service Desk” กดเพิ่มเพื่อเปิด Ticket กำหนดความสำคัญและ SLA',
            'อัปเดตสถานะ Ticket จนแก้ไขเสร็จ ระบบคำนวณเวลาและตรวจ SLA ให้',
            'ที่แท็บ “Incident” บันทึกเหตุการณ์พร้อม Root Cause และ Problem Management',
            'ที่แท็บ “Timesheet” บันทึกกิจกรรมและชั่วโมงงานประจำวัน',
        ],
    },
    {
        id: 'medical-record', no: 5, title: 'Medical Record Quality Control', th: 'ควบคุมคุณภาพเวชระเบียน (OPD/IPD)',
        icon: FileCheck, color: 'emerald', href: '/im/medical-record',
        intro: 'สุ่มตรวจและให้คะแนนคุณภาพเวชระเบียน ติดตามคะแนนรายหัวข้อ/รายแพทย์ และบันทึกความขัดแย้งของข้อมูล',
        features: [
            { name: 'OPD/IPD Record Audit System', desc: 'สุ่มตรวจให้คะแนนรายหัวข้อ ประเมินคะแนนของแพทย์แต่ละคน' },
            { name: 'Quality Development Plan', desc: 'ติดตามคะแนนรายหัวข้อ (เป้า ≥80% ระดับ 1 ดาว, ≥95% ระดับ 2 ดาว)' },
            { name: 'Print Preview & Discrepancy Logger', desc: 'ตรวจการพิมพ์เวชระเบียนและบันทึกความผิดเพี้ยน' },
        ],
        steps: [
            'กด “ตรวจเวชระเบียน” เลือกประเภท OPD/IPD และระบุ HN/AN และแพทย์',
            'ให้คะแนนแต่ละหัวข้อ (ระบบคำนวณเปอร์เซ็นต์และระดับดาวให้อัตโนมัติ)',
            'ติ๊กการตรวจสอบการพิมพ์ และบันทึกความขัดแย้งที่พบ',
            'ดูภาพรวมคะแนนรายหัวข้อและรายแพทย์ในแดชบอร์ด',
        ],
    },
    {
        id: 'software-qa', no: 6, title: 'Software Development QA', th: 'ควบคุมคุณภาพการพัฒนาโปรแกรม',
        icon: Code2, color: 'indigo', href: '/im/software-qa',
        intro: 'จัดเก็บเอกสาร SDLC เชื่อม Git Repository และบันทึกผล Code Review เพื่อควบคุมคุณภาพการพัฒนา',
        features: [
            { name: 'SDLC Document Repository', desc: 'จัดเก็บ System Analysis, Context Diagram, DFD, ER, Sequence, Data Dictionary และ User Manual' },
            { name: 'Version Control Integration', desc: 'เก็บลิงก์ Git Repository (GitHub/GitLab) เพื่อติดตาม Commit และ Release' },
            { name: 'Code Review & Comment Evaluation', desc: 'บันทึกผลการตรวจ Source Code Comment โดยบุคคลภายนอกและ SQA' },
        ],
        steps: [
            'ที่แท็บ “คลังเอกสาร SDLC” เพิ่มเอกสารตามประเภท พร้อมแนบไฟล์และ Repo URL',
            'ที่แท็บ “Code Review” บันทึกผลการตรวจ ระบุคะแนน Comment และข้อเสนอแนะ',
        ],
    },
    {
        id: 'resource', no: 7, title: 'Resource, Competency & Change', th: 'จัดการทรัพยากร ความรู้ และการเปลี่ยนแปลง',
        icon: Server, color: 'cyan', href: '/im/resource',
        intro: 'ทะเบียนทรัพยากร IT พร้อม Utilization และ Gap Analysis ประเมินสมรรถนะรายบุคคล (IDP) และควบคุม Change Request',
        features: [
            { name: 'IT Asset & Capacity Inventory', desc: 'ทะเบียน Hardware/Software (สถานะลิขสิทธิ์)/Network พร้อม Capacity และวิเคราะห์ Utilization' },
            { name: 'Gap Analysis Tool', desc: 'เปรียบเทียบความต้องการขั้นต่ำกับอุปกรณ์ที่มีอยู่จริง' },
            { name: 'IT Competency Assessment', desc: 'ประเมินสมรรถนะรายบุคคลพร้อมแผนพัฒนา (IDP)' },
            { name: 'Change Management System', desc: 'บันทึกและอนุมัติคำขอเปลี่ยนแปลงเพื่อควบคุมผลกระทบ' },
        ],
        steps: [
            'ที่แท็บ “ทะเบียนทรัพยากร” เพิ่มอุปกรณ์พร้อม Capacity และ Utilization',
            'ที่แท็บ “สมรรถนะ & IDP” ประเมินระดับที่ต้องการเทียบกับปัจจุบัน (ระบบคำนวณ Gap ให้)',
            'ที่แท็บ “Change Request” ส่งคำขอเปลี่ยนแปลง แล้วอนุมัติ/ไม่อนุมัติ',
        ],
    },
];

const TONE: Record<string, string> = {
    sky: 'bg-sky-100 text-sky-600', rose: 'bg-rose-100 text-rose-600', violet: 'bg-violet-100 text-violet-600',
    amber: 'bg-amber-100 text-amber-600', emerald: 'bg-emerald-100 text-emerald-600', indigo: 'bg-indigo-100 text-indigo-600', cyan: 'bg-cyan-100 text-cyan-600',
};

export default function Manual() {
    const [active, setActive] = useState<string>('master-plan');

    return (
        <ImPage active="im.manual" icon={BookOpen} badge="เอกสารประกอบ" title="คู่มือการใช้งานระบบ IM" subtitle="แนวทางการใช้งานระบบงานสารสนเทศโรงพยาบาล ครบทั้ง 7 หมวดตามมาตรฐาน HAIT">
            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                {/* TOC */}
                <div className="lg:sticky lg:top-4 lg:self-start">
                    <Panel title="สารบัญ">
                        <nav className="space-y-1">
                            {SECTIONS.map((s) => {
                                const Icon = s.icon;
                                return (
                                    <button key={s.id} onClick={() => { setActive(s.id); document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                                        className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition', active === s.id ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-600 hover:bg-slate-50')}>
                                        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold', TONE[s.color])}>{s.no}</span>
                                        <span className="min-w-0 flex-1 truncate">{s.title}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </Panel>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-indigo-50/50 p-5">
                        <div className="flex items-center gap-2 text-sky-700"><Info className="h-5 w-5" /><span className="font-bold">ภาพรวมระบบ</span></div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            ระบบงานสารสนเทศ (IM) ออกแบบตามมาตรฐาน HAIT ครอบคลุมงานสารสนเทศโรงพยาบาลทั้ง 7 หมวด เข้าถึงได้จากเมนู <b>ศูนย์พัฒนาคุณภาพ → งานสารสนเทศ (IM)</b> แต่ละหมวดมีแดชบอร์ด สรุปตัวชี้วัด และเครื่องมือบันทึกข้อมูลของตนเอง สามารถสลับหมวดได้จากแถบเมนูด้านบนของทุกหน้า
                        </p>
                    </div>

                    {SECTIONS.map((s) => {
                        const Icon = s.icon;
                        return (
                            <section key={s.id} id={`sec-${s.id}`} className="scroll-mt-4">
                                <Panel title={`หมวดที่ ${s.no}: ${s.title}`} description={s.th}
                                    action={<Link href={s.href} className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">เปิดใช้งาน <ArrowRight className="h-3 w-3" /></Link>}>
                                    <div className="flex items-start gap-4">
                                        <div className={cn('hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl sm:flex', TONE[s.color])}><Icon className="h-7 w-7" /></div>
                                        <p className="text-sm leading-relaxed text-slate-600">{s.intro}</p>
                                    </div>

                                    <div className="mt-5">
                                        <h4 className="mb-2 text-sm font-bold text-slate-700">ความสามารถหลัก</h4>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {s.features.map((f) => (
                                                <div key={f.name} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                                                    <div className="text-sm font-semibold text-slate-800">{f.name}</div>
                                                    <div className="mt-0.5 text-xs text-slate-500">{f.desc}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-5">
                                        <h4 className="mb-2 text-sm font-bold text-slate-700">ขั้นตอนการใช้งาน</h4>
                                        <ol className="space-y-2">
                                            {s.steps.map((step, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[11px] font-bold text-sky-700">{i + 1}</span>
                                                    {step}
                                                </li>
                                            ))}
                                        </ol>
                                    </div>

                                    {s.tips && s.tips.length > 0 && (
                                        <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                                            {s.tips.map((tip, i) => (
                                                <div key={i} className="flex items-start gap-2 text-xs text-amber-800"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0" /> {tip}</div>
                                            ))}
                                        </div>
                                    )}
                                </Panel>
                            </section>
                        );
                    })}

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
                        <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-5 w-5" /><span className="font-bold">ข้อแนะนำการใช้งานให้ได้ประโยชน์สูงสุด</span></div>
                        <ul className="mt-2 space-y-1 text-sm text-slate-600">
                            <li>• บันทึกข้อมูลอย่างสม่ำเสมอเพื่อให้แดชบอร์ดและตัวชี้วัดสะท้อนสถานการณ์จริง</li>
                            <li>• ใช้ Lesson Learned และผล PDCA จากปีก่อนเป็นข้อมูลตั้งต้นในการวางแผนปีถัดไป</li>
                            <li>• ทบทวนความเสี่ยงและซ้อมแผน BCP/DRP อย่างน้อยปีละครั้งเพื่อคงระดับคุณภาพ</li>
                        </ul>
                    </div>
                </div>
            </div>
        </ImPage>
    );
}
