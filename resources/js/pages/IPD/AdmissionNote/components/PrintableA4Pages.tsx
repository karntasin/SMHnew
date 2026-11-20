import React, { useState } from 'react';

export interface AdmissionFormData {
  hospital_name: string;
  admit_date: string;
  admit_time: string;
  patient_name: string;
  age: string;
  gender: string;
  hn: string;
  an: string;
  vn?: string;
  ward: string;
  pttype: string;
  main_dep_name?: string;

  // แหล่งที่มา
  src_patient: boolean;
  src_relative: boolean;
  src_ems: boolean;
  src_old_record: boolean;
  src_referral: boolean;
  src_unconscious: boolean;

  // CC & HPI
  chief_complaint: string;
  present_illness: string;
  prev_treatment_opt: 'none' | 'had';
  prev_treatment_detail: string;

  // ประวัติเดิม
  allergy_opt: 'none' | 'unknown' | 'yes';
  allergy_detail: string;
  pmh_opt: 'no' | 'yes';
  pmh_detail: string;
  surg_opt: 'none' | 'yes';
  surg_detail: string;
  med_opt: 'no' | 'yes';
  med_detail: string;
  smoke_opt: 'no' | 'yes';
  smoke_detail: string;
  alcohol_opt: 'no' | 'yes';
  alcohol_detail: string;
  fh_opt: 'no' | 'yes';
  fh_detail: string;
  lmp_na: boolean;
  lmp_detail: string;
  vac_na: boolean;
  vac_detail: string;

  // ROS
  ros: {
    ga_stat: 'n' | 'a'; ga_txt: string;
    heent_stat: 'n' | 'a'; heent_txt: string;
    cvs_stat: 'n' | 'a'; cvs_txt: string;
    chest_stat: 'n' | 'a'; chest_txt: string;
    gi_stat: 'n' | 'a'; gi_txt: string;
    gu_stat: 'n' | 'a'; gu_txt: string;
    ext_stat: 'n' | 'a'; ext_txt: string;
    neuro_stat: 'n' | 'a'; neuro_txt: string;
    oth_stat: 'n' | 'a'; oth_txt: string;
  };

  // Vital Signs
  vital_signs: {
    temperature: string;
    pulse: string;
    rr: string;
    spo2: string;
    bp: string;
    bw: string;
    height: string;
    bmi: string;
    pain_score: string;
  };

  // PE รายระบบ
  pe: {
    ga_stat: 'n' | 'a'; ga_txt: string;
    heent_stat: 'n' | 'a'; heent_txt: string;
    chest_stat: 'n' | 'a'; chest_txt: string;
    cvs_stat: 'n' | 'a'; cvs_txt: string;
    ab_stat: 'n' | 'a'; ab_txt: string;
    ext_stat: 'n' | 'a'; ext_txt: string;
    neuro_stat: 'n' | 'a'; neuro_txt: string;
  };

  // รอยโรค
  lesion_na: boolean;
  lesion_image: string | null;

  // Labs
  labs_text: string;

  // ปัญหา & วินิจฉัย & แผน
  problem_list: string;
  provisional_diagnosis: string;
  plan_of_management: string;

  // แพทย์
  doctor_name: string;
  doctor_license: string;
}

interface PrintableA4PagesProps {
  data: AdmissionFormData;
}

export default function PrintableA4Pages({ data }: PrintableA4PagesProps) {
  // Check abnormal vitals for red/bold highlight
  const tVal = parseFloat(data.vital_signs.temperature);
  const isTAbnormal = !isNaN(tVal) && (tVal >= 37.8 || tVal < 36.0);

  const prVal = parseFloat(data.vital_signs.pulse);
  const isPRAbnormal = !isNaN(prVal) && (prVal > 100 || prVal < 60);

  const rrVal = parseFloat(data.vital_signs.rr);
  const isRRAbnormal = !isNaN(rrVal) && (rrVal > 20 || rrVal < 16);

  const spo2Val = parseFloat(data.vital_signs.spo2);
  const isSpO2Abnormal = !isNaN(spo2Val) && spo2Val < 95;

  let isBpAbnormal = false;
  if (data.vital_signs.bp?.includes('/')) {
    const parts = data.vital_signs.bp.split('/');
    const sbp = parseFloat(parts[0]);
    const dbp = parseFloat(parts[1]);
    if ((!isNaN(sbp) && (sbp >= 140 || sbp < 90)) || (!isNaN(dbp) && (dbp >= 90 || dbp < 60))) {
      isBpAbnormal = true;
    }
  }

  // Parse multilines for problems, diagnoses, plans, and labs
  const labLines = (data.labs_text || '').split('\n').map((l) => l.trim()).filter((l) => l !== '');
  const problemLines = (data.problem_list || '').split('\n').map((l) => l.trim()).filter((l) => l !== '');
  const provLines = (data.provisional_diagnosis || '').split('\n').map((l) => l.trim()).filter((l) => l !== '');
  const planLines = (data.plan_of_management || '').split('\n').map((l) => l.trim()).filter((l) => l !== '');

  // Pagination mode:
  // - '3': 3 หน้ามาตรฐาน (แนะนำสูงสุด) - สวยงาม ไม่ล้น ไม่เบียด
  // - '2': 2 หน้ากระชับ - รวม ROS และ PE เข้าด้วยกันเมื่อข้อมูลสั้น
  // - '4': 4 หน้า - เมื่อ Lab และแผนการรักษายาวมาก
  const [pageLayoutMode, setPageLayoutMode] = useState<'3' | '2' | '4'>('3');

  const totalPages = pageLayoutMode === '2' ? 2 : pageLayoutMode === '4' ? 4 : 3;

  // Reusable Page Header with Patient Info & 50x25mm Sticker Box (Repeated on Every Page)
  const renderHeader = (currentPage: number, pageCount: number) => (
    <div className="border-2 border-black rounded p-2 mb-2 bg-white text-black shrink-0">
      <div className="flex justify-between items-center border-b border-black pb-1 mb-1.5">
        <div className="flex items-center space-x-2.5">
          <div>
            <div className="text-[10pt] font-bold text-gray-900 leading-tight">
              {data.hospital_name || 'โรงพยาบาลค่ายสุรสิงหนาท'}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sarabun-title whitespace-nowrap">
                แบบบันทึกการรับผู้ป่วยไว้ในโรงพยาบาล (Admission Note)
              </span>
              <span className="text-[8.5pt] bg-slate-100 border border-slate-500 px-1.5 py-0.2 rounded font-bold whitespace-nowrap">
                หน้า {currentPage} จาก {pageCount}
              </span>
            </div>
          </div>
        </div>
        <div className="text-sarabun-body whitespace-nowrap font-normal flex items-center pr-1.5 text-[9.5pt]">
          <span>
            วันที่: <strong className="dotted-line-text min-w-[72px] text-center inline-block">{data.admit_date || '-'}</strong>
          </span>
          <span className="ml-2">
            เวลา: <strong className="dotted-line-text inline-block min-w-[40px] text-center">{data.admit_time || '-'}</strong>
          </span>
          <span className="ml-1">น.</span>
        </div>
      </div>

      <div className="flex items-stretch justify-between gap-3">
        <div className="flex-1 grid grid-cols-12 gap-y-1 text-sarabun-body items-center font-normal">
          <div className="col-span-12 flex items-center min-w-0">
            <span className="shrink-0 font-bold">ชื่อ-สกุล:</span>
            <strong className="dotted-line-text ml-1.5 flex-1 min-w-[140px] font-semibold text-black">{data.patient_name || '-'}</strong>
            <span className="shrink-0 font-bold ml-2">อายุ:</span>
            <strong className="dotted-line-text mx-1 min-w-[32px] text-center">{data.age || '-'}</strong>
            <span className="shrink-0">ปี</span>
            <span className="shrink-0 font-bold ml-2">เพศ:</span>
            <strong className="dotted-line-text ml-1 min-w-[36px] text-center">{data.gender || '-'}</strong>
          </div>
          <div className="col-span-12 flex items-center min-w-0">
            <span className="shrink-0 font-bold">HN:</span>
            <strong className="dotted-line-text ml-1 min-w-[85px] text-center font-bold text-black">{data.hn || '-'}</strong>
            <span className="shrink-0 font-bold ml-3">AN:</span>
            <strong className="dotted-line-text ml-1 min-w-[80px] text-center font-bold text-black">{data.an || '-'}</strong>
            <span className="shrink-0 font-bold ml-3">หอผู้ป่วย/แผนก:</span>
            <span className="dotted-line-text ml-1 flex-1 min-w-[70px] text-center">{data.ward || data.main_dep_name || '-'}</span>
          </div>
          <div className="col-span-12 flex items-center min-w-0">
            <span className="shrink-0 font-bold">สิทธิการรักษา:</span>
            <strong className="dotted-line-text ml-1.5 flex-1 font-medium">{data.pttype || '-'}</strong>
          </div>
        </div>

        {/* กล่องสติ๊กเกอร์คนไข้มาตรฐาน (50 x 25 mm) */}
        <div className="w-[50mm] h-[25mm] border border-dashed border-gray-400 rounded flex flex-col items-center justify-center bg-gray-50/50 shrink-0 select-none text-center">
          <span className="text-[10px] text-gray-500 font-semibold tracking-wide">สติ๊กเกอร์ผู้ป่วย (5x2.5 ซม.)</span>
          <span className="text-[9.5px] text-gray-700 font-mono font-bold">HN: {data.hn || '-'}</span>
          {data.an && <span className="text-[8.5px] text-gray-500 font-mono">AN: {data.an}</span>}
        </div>
      </div>
    </div>
  );

  // Document Footer on Every Page
  const renderFooter = (currentPage: number, pageCount: number) => (
    <div className="pt-1.5 border-t border-black/40 flex justify-between items-center text-[8pt] text-gray-600 font-normal shrink-0 mt-auto">
      <span>เอกสารเวชระเบียนผู้ป่วยใน (IPD Admission Note) • โรงพยาบาลค่ายสุรสิงหนาท</span>
      <span>หน้า {currentPage} จาก {pageCount} • HN: {data.hn || '-'} {data.an ? `• AN: ${data.an}` : ''}</span>
    </div>
  );

  // Doctor Signature Block at the bottom of the final page
  const renderDoctorSignature = () => (
    <div className="pt-2 border-t-2 border-black mt-auto shrink-0 mb-1">
      <div className="flex justify-between items-end text-sarabun-body">
        <div className="space-y-0.5">
          <div className="text-[8.5pt] font-semibold text-slate-800">
            สถานะแบบบันทึก: สมบูรณ์ (Completed)
          </div>
          <div className="text-[8pt] text-gray-500 font-normal">
            FSHH-IPD-ADM-01 (Rev. 2026) • โรงพยาบาลค่ายสุรสิงหนาท
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-end">
            <span className="mr-2">ลงชื่อ</span>
            <span className="inline-block w-44 border-b border-black">&nbsp;</span>
            <span className="mx-2">แพทย์ผู้ตรวจ</span>
            <span className="font-bold mr-1">เลข ว. :</span>
            <span className="w-24 text-center border-b border-black font-bold">
              {data.doctor_license || '&nbsp;'}
            </span>
          </div>
          <div className="flex items-center justify-start pl-8">
            <div className="w-44 text-center">
              <span>(</span>
              <span className="font-medium mx-1">{data.doctor_name || '...........................................'}</span>
              <span>)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Review of Systems (ROS) Sub-component
  const renderROS = () => (
    <div className="pt-1 border-t border-black">
      <div className="text-sarabun-heading mb-1">Review of Systems (ROS) :</div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-sarabun-sub bg-slate-50/70 p-2 rounded border border-gray-400">
        {[
          { key: 'ga', label: 'GA' },
          { key: 'heent', label: 'HEENT' },
          { key: 'cvs', label: 'CVS' },
          { key: 'chest', label: 'Chest' },
          { key: 'gi', label: 'GI' },
          { key: 'gu', label: 'GU' },
          { key: 'ext', label: 'Ext' },
          { key: 'neuro', label: 'Neuro' },
        ].map((sys) => {
          const statKey = `${sys.key}_stat` as keyof typeof data.ros;
          const txtKey = `${sys.key}_txt` as keyof typeof data.ros;
          const isAbnormal = data.ros[statKey] === 'a';
          const txt = (data.ros[txtKey] as string) || '-';

          return (
            <div key={sys.key} className="flex items-center min-w-0">
              <span className="w-16 font-bold shrink-0">{sys.label} :</span>
              <div className="flex items-center mr-2 space-x-1 shrink-0">
                <label className="flex items-center"><span className={`checkbox-custom ${!isAbnormal ? 'checked' : ''}`} />N</label>
                <label className="flex items-center"><span className={`checkbox-custom ${isAbnormal ? 'checked' : ''}`} />A</label>
              </div>
              <span className={`dotted-line-text flex-1 truncate ${isAbnormal ? 'font-bold' : 'font-normal'}`}>{txt}</span>
            </div>
          );
        })}

        <div className="col-span-2 flex items-center pt-1 border-t border-gray-300">
          <span className="w-20 font-bold shrink-0">Other/อื่นๆ :</span>
          <div className="flex items-center mr-2 space-x-1 shrink-0">
            <label className="flex items-center"><span className={`checkbox-custom ${data.ros.oth_stat === 'n' ? 'checked' : ''}`} />N</label>
            <label className="flex items-center"><span className={`checkbox-custom ${data.ros.oth_stat === 'a' ? 'checked' : ''}`} />A</label>
          </div>
          <span className={`dotted-line-text flex-1 truncate ${data.ros.oth_stat === 'a' ? 'font-bold' : 'font-normal'}`}>
            {data.ros.oth_txt || '-'}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div id="printArea" className="w-[210mm] max-w-full space-y-6 text-black print:space-y-0 print:m-0 print:p-0">
      {/* Layout Control Toolbar (Screen Preview Only) */}
      <div className="no-print bg-slate-900/90 text-white p-3 rounded-lg flex items-center justify-between text-xs shadow-md border border-slate-700">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-300">รูปแบบการจัดหน้าเอกสาร:</span>
          <div className="inline-flex rounded-md shadow-xs bg-slate-800 p-0.5 border border-slate-600">
            <button
              type="button"
              onClick={() => setPageLayoutMode('3')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                pageLayoutMode === '3'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              3 หน้ามาตรฐาน (แนะนำ - สวยงาม ไม่ล้นขอบ)
            </button>
            <button
              type="button"
              onClick={() => setPageLayoutMode('2')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                pageLayoutMode === '2'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              2 หน้ากระชับ (เมื่อข้อมูลสั้น)
            </button>
            <button
              type="button"
              onClick={() => setPageLayoutMode('4')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                pageLayoutMode === '4'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              4 หน้า (เมื่อเคสซับซ้อน)
            </button>
          </div>
        </div>

        <div className="text-slate-400 text-[11px]">
          ปัจจุบันแสดงผล: <strong className="text-emerald-400">{totalPages} หน้า</strong> (มี Header + สติ๊กเกอร์ 50x25mm ทุกหน้า)
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');

        .a4-page {
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;
          margin: 0 auto 24px auto;
          background: white;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
          padding: 9mm 12mm 8mm 12mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          font-family: 'Sarabun', 'TH Sarabun New', sans-serif;
          color: #000;
        }

        .text-sarabun-title {
          font-size: 12pt;
          font-weight: 700;
          color: #000;
          line-height: 1.3;
        }
        .text-sarabun-heading {
          font-size: 11pt;
          font-weight: 700;
          color: #000;
          line-height: 1.35;
        }
        .text-sarabun-body {
          font-size: 9.8pt;
          font-weight: 400;
          color: #000;
          line-height: 1.4;
        }
        .text-sarabun-sub {
          font-size: 9.2pt;
          font-weight: 400;
          color: #000;
          line-height: 1.38;
        }
        .dotted-line-text {
          border-bottom: 1px dotted #000000;
          padding-bottom: 1.5px;
          display: inline-block;
        }
        .dotted-multiline {
          line-height: 21px;
          background-image: repeating-linear-gradient(transparent, transparent 20px, #000000 20px, #000000 21px);
          background-size: 100% 21px;
          background-repeat: repeat-y;
          word-break: break-word;
          white-space: pre-wrap;
          min-height: 21px;
          padding-bottom: 2px;
        }
        .checkbox-custom {
          width: 12.5px;
          height: 12.5px;
          border: 1.3px solid #000000;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          vertical-align: middle;
          margin-right: 4px;
          margin-left: 2px;
          border-radius: 2px;
          background: #fff;
          font-size: 10px;
          font-weight: 700;
          line-height: 1;
          color: #000000;
          flex-shrink: 0;
        }
        .checkbox-custom.checked::after {
          content: "✓";
        }

        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          *, *::before, *::after {
            box-sizing: border-box !important;
          }

          html, body {
            width: 210mm !important;
            height: auto !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: visible !important;
          }

          .no-print, header, aside {
            display: none !important;
          }

          main {
            display: block !important;
            width: 210mm !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            overflow: visible !important;
          }

          #printArea {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .a4-page {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 9mm 12mm 8mm 12mm !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            background: white !important;
          }

          .a4-page:last-child {
            page-break-after: avoid !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* ==================== หน้าที่ 1 (ข้อมูลแรกรับและประวัติผู้ป่วย) ==================== */}
      <div className="a4-page">
        <div className="flex-1 flex flex-col justify-start">
          {/* Header หน้า 1 */}
          {renderHeader(1, totalPages)}

          {/* แหล่งที่มาของข้อมูล */}
          <div className="pb-1 mb-1.5 border-b border-black text-sarabun-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="font-bold w-32 shrink-0">แหล่งที่มาของข้อมูล :</span>
                <label className="flex items-center"><span className={`checkbox-custom ${data.src_patient ? 'checked' : ''}`} /> ผู้ป่วย</label>
                <label className="flex items-center"><span className={`checkbox-custom ${data.src_relative ? 'checked' : ''}`} /> ญาติ</label>
                <label className="flex items-center"><span className={`checkbox-custom ${data.src_ems ? 'checked' : ''}`} /> ผู้นำส่ง</label>
              </div>
              <div className="whitespace-nowrap shrink-0">
                <label className="flex items-center"><span className={`checkbox-custom ${data.src_unconscious ? 'checked' : ''}`} /> ผู้ป่วยไม่รู้สึกตัว / ซักประวัติไม่ได้</label>
              </div>
            </div>
            <div className="flex items-center space-x-3 mt-0.5">
              <span className="w-32 shrink-0" />
              <label className="flex items-center"><span className={`checkbox-custom ${data.src_old_record ? 'checked' : ''}`} /> เวชระเบียนเดิม</label>
              <label className="flex items-center"><span className={`checkbox-custom ${data.src_referral ? 'checked' : ''}`} /> ใบส่งตัวจาก รพ.</label>
            </div>
          </div>

          {/* Chief Complaint */}
          <div className="mb-1.5">
            <div className="text-sarabun-heading mb-0.5">Chief complaint :</div>
            <div className="text-sarabun-body dotted-multiline font-semibold">
              {data.chief_complaint || '-'}
            </div>
          </div>

          {/* Present Illness */}
          <div className="mb-1.5">
            <div className="text-sarabun-heading mb-0.5">Present illness :</div>
            <div className="text-sarabun-body dotted-multiline">
              {data.present_illness || '-'}
            </div>
            <div className="text-sarabun-body mt-1 pt-0.5">
              <div className="flex items-start flex-wrap gap-y-1">
                <span className="font-bold shrink-0 mr-2">การรักษาที่ได้รับมาก่อนมา รพ. :</span>
                <label className="inline-flex items-center shrink-0 mr-3">
                  <span className={`checkbox-custom ${data.prev_treatment_opt === 'none' ? 'checked' : ''}`} /> ยังไม่ได้รับการรักษามาจากที่ใด
                </label>
                <div className="inline-flex items-start flex-1 min-w-[200px]">
                  <label className="inline-flex items-center shrink-0 mr-1.5">
                    <span className={`checkbox-custom ${data.prev_treatment_opt === 'had' ? 'checked' : ''}`} /> ได้รับการรักษามาแล้ว :
                  </label>
                  {data.prev_treatment_opt === 'had' && (
                    <span className="dotted-multiline font-semibold flex-1 min-w-0">{data.prev_treatment_detail || '-'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ประวัติเดิม & Social Hx */}
          <div className="mb-1.5 pt-1.5 border-t border-black text-sarabun-body space-y-1">
            <div>
              <div className="flex items-start flex-wrap gap-y-1">
                <span className="w-44 font-bold shrink-0">ประวัติแพ้ยา / สารเคมี :</span>
                <label className="inline-flex items-center mr-3 shrink-0">
                  <span className={`checkbox-custom ${data.allergy_opt === 'none' ? 'checked' : ''}`} /> ไม่มีประวัติแพ้ยา / แพ้อื่นๆ
                </label>
                <label className="inline-flex items-center mr-3 shrink-0">
                  <span className={`checkbox-custom ${data.allergy_opt === 'unknown' ? 'checked' : ''}`} /> ไม่ทราบ
                </label>
                <div className="inline-flex items-start flex-1 min-w-[180px]">
                  <label className="inline-flex items-center shrink-0 mr-1.5">
                    <span className={`checkbox-custom ${data.allergy_opt === 'yes' ? 'checked' : ''}`} /> มี (ระบุ) :
                  </label>
                  {data.allergy_opt === 'yes' && (
                    <span className="dotted-multiline font-semibold flex-1 min-w-0 text-red-700 underline">{data.allergy_detail || '-'}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start">
              <span className="w-44 font-bold shrink-0">โรคประจำตัว :</span>
              <div className="flex-1">
                <label className="inline-flex items-center mr-3"><span className={`checkbox-custom ${data.pmh_opt === 'no' ? 'checked' : ''}`} /> ไม่มี</label>
                <label className="inline-flex items-center mr-2"><span className={`checkbox-custom ${data.pmh_opt === 'yes' ? 'checked' : ''}`} /> มี :</label>
                <span className="dotted-line-text font-semibold">{data.pmh_opt === 'yes' ? (data.pmh_detail || '-') : '-'}</span>
              </div>
            </div>

            <div className="flex items-start">
              <span className="w-44 font-bold shrink-0">ประวัติการผ่าตัด :</span>
              <div className="flex-1">
                <label className="inline-flex items-center mr-4"><span className={`checkbox-custom ${data.surg_opt === 'none' ? 'checked' : ''}`} /> ไม่มี</label>
                <label className="inline-flex items-center mr-2"><span className={`checkbox-custom ${data.surg_opt === 'yes' ? 'checked' : ''}`} /> มี (ระบุ) :</label>
                <span className="dotted-line-text font-semibold min-w-[120px]">{data.surg_opt === 'yes' ? (data.surg_detail || '-') : '-'}</span>
              </div>
            </div>

            <div className="flex items-start">
              <span className="w-44 font-bold shrink-0">ยาที่ใช้เป็นประจำ :</span>
              <div className="flex-1">
                <label className="inline-flex items-center mr-3"><span className={`checkbox-custom ${data.med_opt === 'no' ? 'checked' : ''}`} /> ไม่มี</label>
                <label className="inline-flex items-center mr-2"><span className={`checkbox-custom ${data.med_opt === 'yes' ? 'checked' : ''}`} /> มี (ระบุ) :</label>
                <span className="dotted-line-text font-semibold">{data.med_opt === 'yes' ? (data.med_detail || '-') : '-'}</span>
              </div>
            </div>

            <div className="pt-1 border-t border-gray-300 space-y-1">
              <div className="flex items-center text-sarabun-body">
                <span className="w-28 font-bold shrink-0">Social Hx :</span>
                <span className="font-semibold mr-2 shrink-0">การสูบบุหรี่ :</span>
                <label className="flex items-center mr-3 shrink-0"><span className={`checkbox-custom ${data.smoke_opt === 'no' ? 'checked' : ''}`} />ไม่สูบ</label>
                <label className="flex items-center mr-1.5 shrink-0"><span className={`checkbox-custom ${data.smoke_opt === 'yes' ? 'checked' : ''}`} />สูบ</label>
                <span className="dotted-line-text font-semibold px-2">{data.smoke_opt === 'yes' ? (data.smoke_detail || '-') : '-'}</span>
              </div>
              <div className="flex items-center text-sarabun-body">
                <span className="w-28 shrink-0" />
                <span className="font-semibold mr-2 shrink-0">การดื่มสุรา :</span>
                <label className="flex items-center mr-3 shrink-0"><span className={`checkbox-custom ${data.alcohol_opt === 'no' ? 'checked' : ''}`} />ไม่ดื่ม</label>
                <label className="flex items-center mr-1.5 shrink-0"><span className={`checkbox-custom ${data.alcohol_opt === 'yes' ? 'checked' : ''}`} />ดื่ม</label>
                <span className="dotted-line-text font-semibold flex-1 min-w-0">{data.alcohol_opt === 'yes' ? (data.alcohol_detail || '-') : '-'}</span>
              </div>
              <div className="flex items-center text-sarabun-body pt-0.5">
                <span className="w-28 font-bold shrink-0">Family Hx :</span>
                <label className="flex items-center mr-3 shrink-0"><span className={`checkbox-custom ${data.fh_opt === 'no' ? 'checked' : ''}`} /> ไม่มี</label>
                <label className="flex items-center mr-1.5 shrink-0"><span className={`checkbox-custom ${data.fh_opt === 'yes' ? 'checked' : ''}`} /> มี (ระบุ) :</label>
                <span className="dotted-line-text font-semibold flex-1 min-w-0">{data.fh_opt === 'yes' ? (data.fh_detail || '-') : 'ปฏิเสธประวัติโรคเรื้อรังในครอบครัว'}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 pt-0.5 text-sarabun-body">
                <div className="flex items-center">
                  <span className="font-bold mr-2">ประวัติประจำเดือน :</span>
                  <span className="dotted-line-text px-3">{data.lmp_na ? '-' : (data.lmp_detail || '-')}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-bold mr-2">วัคซีนและพัฒนาการ :</span>
                  <span className="dotted-line-text px-3">{data.vac_na ? '-' : (data.vac_detail || '-')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* In 2-page compact mode only: ROS rendered on Page 1 */}
          {totalPages === 2 && renderROS()}
        </div>

        {/* Page 1 Document Footer */}
        {renderFooter(1, totalPages)}
      </div>

      {/* ==================== หน้าที่ 2 (ROS + ตรวจร่างกาย + รอยโรค) ==================== */}
      <div className="a4-page">
        <div className="flex-1 flex flex-col justify-start">
          {/* Header หน้า 2 */}
          {renderHeader(2, totalPages)}

          {/* In 3-page & 4-page mode: Review of Systems (ROS) placed at top of Page 2 */}
          {totalPages >= 3 && (
            <div className="mb-2">
              {renderROS()}
            </div>
          )}

          {/* Physical Examination */}
          <div className="mb-2">
            <div className="text-sarabun-heading mb-1">Physical Examination :</div>

            {/* Vital Signs */}
            <div className="bg-slate-100/80 px-3 py-1.5 rounded border border-black mb-2 text-sarabun-body">
              <div className="flex items-center justify-between flex-wrap gap-y-1 pb-1 border-b border-gray-400">
                <div className="flex items-center space-x-3">
                  <span>T: <strong className={isTAbnormal ? 'text-red-700 underline font-bold' : 'text-black'}>{data.vital_signs.temperature || '-'}</strong> <strong>°C</strong></span>
                  <span>PR: <strong className={isPRAbnormal ? 'text-red-700 underline font-bold' : 'text-black'}>{data.vital_signs.pulse || '-'}</strong> <strong>/min</strong></span>
                  <span>RR: <strong className={isRRAbnormal ? 'text-red-700 underline font-bold' : 'text-black'}>{data.vital_signs.rr || '-'}</strong> <strong>/min</strong></span>
                  <span>SpO2: <strong className={isSpO2Abnormal ? 'text-red-700 underline font-bold' : 'text-black'}>{data.vital_signs.spo2 || '-'}</strong><strong>%</strong></span>
                </div>
                <div>
                  <span>BP: <strong className={isBpAbnormal ? 'text-red-700 underline font-bold' : 'text-black'}>{data.vital_signs.bp ? `${data.vital_signs.bp} mmHg` : '-'}</strong></span>
                </div>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-y-1 pt-1">
                <div className="flex items-center space-x-4">
                  <span>BW: <strong>{data.vital_signs.bw || '-'}</strong> <strong>kg</strong></span>
                  <span>Ht: <strong>{data.vital_signs.height || '-'}</strong> <strong>cm</strong></span>
                  <span>BMI: <strong>{data.vital_signs.bmi || '-'}</strong> <strong>kg/m²</strong></span>
                </div>
                <div>
                  <span>Pain Score: <strong>{data.vital_signs.pain_score || '-'}</strong></span>
                </div>
              </div>
            </div>

            {/* PE รายระบบ & กรอบรอยโรค (Medical Anatomy Diagram) */}
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-7 text-sarabun-sub space-y-1">
                {[
                  { key: 'ga', label: 'GA' },
                  { key: 'heent', label: 'HEENT' },
                  { key: 'chest', label: 'Chest' },
                  { key: 'cvs', label: 'CVS' },
                  { key: 'ab', label: 'Abdomen' },
                  { key: 'ext', label: 'Ext' },
                  { key: 'neuro', label: 'Neuro' },
                ].map((sys) => {
                  const statKey = `${sys.key}_stat` as keyof typeof data.pe;
                  const txtKey = `${sys.key}_txt` as keyof typeof data.pe;
                  const isAbnormal = data.pe[statKey] === 'a';
                  const txt = (data.pe[txtKey] as string) || '-';

                  return (
                    <div key={sys.key} className="flex items-start">
                      <span className="w-16 font-bold shrink-0">{sys.label} :</span>
                      <span className={`dotted-line-text flex-1 ${isAbnormal ? 'font-bold' : 'font-normal'}`}>
                        {txt}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* กรอบตำแหน่งรอยโรค / แผล / ผื่น กายวิภาค */}
              <div className="col-span-5 border border-black rounded p-1.5 flex flex-col justify-between items-center bg-white text-center min-h-[175px] max-h-[200px]">
                <div className="border-b border-gray-300 w-full pb-0.5">
                  <span className="text-[9pt] font-bold block leading-tight">รูปวาดรอยโรค / แผล / ผื่น (Anatomy Chart)</span>
                </div>

                <div className="my-auto w-full flex-1 flex items-center justify-center overflow-hidden py-1">
                  {data.lesion_image && !data.lesion_na ? (
                    <img
                      src={data.lesion_image}
                      alt="รอยโรค"
                      className="max-h-[140px] max-w-full object-contain mx-auto"
                    />
                  ) : (
                    <div className="text-[10px] text-gray-400 italic py-6">
                      {data.lesion_na ? 'ตรวจไม่พบรอยโรค (NA)' : 'ไม่มีรูปภาพรอยโรค'}
                    </div>
                  )}
                </div>

                <div className="text-sarabun-sub pt-1 border-t border-gray-200 w-full">
                  <label className="flex items-center justify-center font-bold text-[8.5pt]">
                    <span className={`checkbox-custom ${data.lesion_na ? 'checked' : ''}`} /> ตรวจไม่พบรอยโรค (NA)
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* In 2-page compact mode only: Labs, Problems, Dx, Plan and Signature on Page 2 */}
          {totalPages === 2 && (
            <>
              {/* Investigations / Lab */}
              <div className="mb-2 pt-1 border-t border-black text-sarabun-sub">
                <div className="text-sarabun-heading mb-1">Investigations / Lab :</div>
                <div className="space-y-0.5">
                  {labLines.length > 0 ? (
                    labLines.map((line, idx) => (
                      <div key={idx} className="dotted-line-text w-full pb-0.5">{line}</div>
                    ))
                  ) : (
                    <>
                      <div className="dotted-line-text w-full pb-0.5 text-gray-400">-</div>
                      <div className="dotted-line-text w-full pb-0.5">&nbsp;</div>
                    </>
                  )}
                </div>
              </div>

              {/* Problem list & Provisional Diagnosis */}
              <div className="grid grid-cols-2 gap-x-5 mb-2 pt-1 border-t border-black text-sarabun-body">
                <div>
                  <div className="text-sarabun-heading mb-1">Problem list :</div>
                  <div className="space-y-0.5 font-medium text-sarabun-sub">
                    {problemLines.length > 0 ? (
                      problemLines.map((line, idx) => (
                        <div key={idx} className="dotted-line-text w-full pb-0.5">{line}</div>
                      ))
                    ) : (
                      <>
                        <div className="dotted-line-text w-full pb-0.5 text-gray-400">-</div>
                        <div className="dotted-line-text w-full pb-0.5">&nbsp;</div>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sarabun-heading mb-1">Provisional diagnosis :</div>
                  <div className="space-y-0.5 font-bold text-sarabun-sub">
                    {provLines.length > 0 ? (
                      provLines.map((line, idx) => (
                        <div key={idx} className="dotted-line-text w-full pb-0.5">{line}</div>
                      ))
                    ) : (
                      <>
                        <div className="dotted-line-text w-full pb-0.5 text-gray-400">-</div>
                        <div className="dotted-line-text w-full pb-0.5">&nbsp;</div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Plan of Management */}
              <div className="mb-2 pt-1 border-t border-black text-sarabun-body">
                <div className="text-sarabun-heading mb-1">Plan of Management :</div>
                <div className="space-y-0.5 text-sarabun-sub">
                  {planLines.length > 0 ? (
                    planLines.map((line, idx) => (
                      <div key={idx} className="dotted-line-text w-full pb-0.5">{line}</div>
                    ))
                  ) : (
                    <>
                      <div className="dotted-line-text w-full pb-0.5 text-gray-400">-</div>
                      <div className="dotted-line-text w-full pb-0.5">&nbsp;</div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* If 2 pages only: Doctor signature + Footer at bottom of Page 2 */}
        {totalPages === 2 ? (
          <>
            {renderDoctorSignature()}
            {renderFooter(2, totalPages)}
          </>
        ) : (
          renderFooter(2, totalPages)
        )}
      </div>

      {/* ==================== หน้าที่ 3 (Labs, Problems, Diagnosis, Plan & Signature) ==================== */}
      {totalPages >= 3 && (
        <div className="a4-page">
          <div className="flex-1 flex flex-col justify-start">
            {/* Header หน้า 3 */}
            {renderHeader(3, totalPages)}

            {/* Investigations / Lab */}
            <div className="mb-3 pt-1 border-t border-black text-sarabun-sub">
              <div className="text-sarabun-heading mb-1.5">Investigations / Lab :</div>
              <div className="space-y-1">
                {labLines.length > 0 ? (
                  labLines.map((line, idx) => (
                    <div key={idx} className="dotted-line-text w-full pb-0.5">
                      {line.includes(':') ? (
                        <>
                          <strong className="text-black">{line.split(/:(.+)/)[0].trim()} :</strong> {line.split(/:(.+)/)[1]?.trim() || ''}
                        </>
                      ) : (
                        line
                      )}
                    </div>
                  ))
                ) : (
                  <>
                    <div className="dotted-line-text w-full pb-0.5 text-gray-400">-</div>
                    <div className="dotted-line-text w-full pb-0.5">&nbsp;</div>
                    <div className="dotted-line-text w-full pb-0.5">&nbsp;</div>
                  </>
                )}
              </div>
            </div>

            {/* Problem list & Provisional Diagnosis */}
            <div className="grid grid-cols-2 gap-x-5 mb-3 pt-2 border-t border-black text-sarabun-body">
              <div>
                <div className="text-sarabun-heading mb-1.5">Problem list :</div>
                <div className="space-y-1 font-medium text-sarabun-sub">
                  {problemLines.length > 0 ? (
                    problemLines.map((line, idx) => (
                      <div key={idx} className="dotted-line-text w-full pb-0.5">{line}</div>
                    ))
                  ) : (
                    <>
                      <div className="dotted-line-text w-full pb-0.5 text-gray-400">-</div>
                      <div className="dotted-line-text w-full pb-0.5">&nbsp;</div>
                      <div className="dotted-line-text w-full pb-0.5">&nbsp;</div>
                    </>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sarabun-heading mb-1.5">Provisional diagnosis :</div>
                <div className="space-y-1 font-bold text-sarabun-sub">
                  {provLines.length > 0 ? (
                    provLines.map((line, idx) => (
                      <div key={idx} className="dotted-line-text w-full pb-0.5">{line}</div>
                    ))
                  ) : (
                    <>
                      <div className="dotted-line-text w-full pb-0.5 text-gray-400">-</div>
                      <div className="dotted-line-text w-full pb-0.5">&nbsp;</div>
                      <div className="dotted-line-text w-full pb-0.5">&nbsp;</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Plan of Management */}
            <div className="mb-3 pt-2 border-t border-black text-sarabun-body flex-1">
              <div className="text-sarabun-heading mb-1.5">Plan of Management :</div>
              <div className="space-y-1 text-sarabun-sub">
                {planLines.length > 0 ? (
                  planLines.map((line, idx) => (
                    <div key={idx} className="dotted-line-text w-full pb-0.5">{line}</div>
                  ))
                ) : (
                  <>
                    <div className="dotted-line-text w-full pb-0.5 text-gray-400">-</div>
                    <div className="dotted-line-text w-full pb-0.5">&nbsp;</div>
                    <div className="dotted-line-text w-full pb-0.5">&nbsp;</div>
                    <div className="dotted-line-text w-full pb-0.5">&nbsp;</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ลายเซ็นแพทย์ผู้ตรวจ ท้ายหน้าสุดท้าย (หน้าที่ 3) */}
          {totalPages === 3 && renderDoctorSignature()}
          {renderFooter(3, totalPages)}
        </div>
      )}

      {/* ==================== หน้าที่ 4 (กรณีเอกสารยาวพิเศษ) ==================== */}
      {totalPages >= 4 && (
        <div className="a4-page">
          <div className="flex-1 flex flex-col justify-start">
            {/* Header หน้า 4 */}
            {renderHeader(4, totalPages)}

            <div className="mb-3 pt-1 border-t border-black text-sarabun-body">
              <div className="text-sarabun-heading mb-1.5">Plan of Management (ต่อเนื่อง) / Additional Notes :</div>
              <div className="space-y-1 text-sarabun-sub">
                {planLines.slice(10).map((line, idx) => (
                  <div key={idx} className="dotted-line-text w-full pb-0.5">{line}</div>
                ))}
              </div>
            </div>
          </div>

          {/* ลายเซ็นแพทย์ผู้ตรวจ ท้ายหน้า 4 */}
          {renderDoctorSignature()}
          {renderFooter(4, totalPages)}
        </div>
      )}
    </div>
  );
}
