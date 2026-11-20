import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { 
  Printer, 
  Save, 
  RotateCcw, 
  Search, 
  Sparkles, 
  Bed, 
  ChevronLeft, 
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PrintableA4Pages, { AdmissionFormData } from './components/PrintableA4Pages';
import LesionCanvasModal from './components/LesionCanvasModal';
import HosxpPatientPicker, { AdmissionItem } from './components/HosxpPatientPicker';
import DoctorPicker, { DoctorItem } from './components/DoctorPicker';

interface FormProps {
  initialData?: any;
  recentAdmissions?: AdmissionItem[];
  doctors?: DoctorItem[];
  note?: any;
  isEdit?: boolean;
}

const defaultFormData: AdmissionFormData = {
  hospital_name: 'โรงพยาบาลค่ายสุรสิงหนาท',
  admit_date: '',
  admit_time: '',
  patient_name: '',
  age: '',
  gender: '',
  hn: '',
  an: '',
  ward: '',
  pttype: '',

  src_patient: true,
  src_relative: false,
  src_ems: false,
  src_old_record: false,
  src_referral: false,
  src_unconscious: false,

  chief_complaint: '',
  present_illness: '',
  prev_treatment_opt: 'none',
  prev_treatment_detail: '',

  allergy_opt: 'none',
  allergy_detail: '',
  pmh_opt: 'no',
  pmh_detail: '',
  surg_opt: 'none',
  surg_detail: '',
  med_opt: 'no',
  med_detail: '',
  smoke_opt: 'no',
  smoke_detail: '',
  alcohol_opt: 'no',
  alcohol_detail: '',
  fh_opt: 'no',
  fh_detail: '',
  lmp_na: true,
  lmp_detail: '-',
  vac_na: true,
  vac_detail: '-',

  ros: {
    ga_stat: 'n', ga_txt: 'ปกติ, ไม่มีอ่อนเพลีย',
    heent_stat: 'n', heent_txt: 'ปกติ, ไม่ปวดศีรษะ ไม่มึนงง',
    cvs_stat: 'n', cvs_txt: 'ปกติ, ไม่มีใจสั่น ไม่มีเจ็บหน้าอก',
    chest_stat: 'n', chest_txt: 'ปกติ, ไม่เหนื่อยหอบ ไม่ไอ',
    gi_stat: 'n', gi_txt: 'ปกติ, ไม่มีคลื่นไส้อาเจียน กินได้',
    gu_stat: 'n', gu_txt: 'ปกติ, ปัสสาวะออกดี ไม่ขัด',
    ext_stat: 'n', ext_txt: 'ปกติ, ไม่มีบวม ไม่มีชาแขนขา',
    neuro_stat: 'n', neuro_txt: 'ปกติ, ไม่มีแขนขาอ่อนแรง รู้สึกตัวดี',
    oth_stat: 'n', oth_txt: '',
  },

  vital_signs: {
    temperature: '36.5',
    pulse: '80',
    rr: '18',
    spo2: '98',
    bp: '120/80',
    bw: '',
    height: '',
    bmi: '',
    pain_score: '0/10',
  },

  pe: {
    ga_stat: 'n', ga_txt: 'Alert, good consciousness, not pale, no jaundice',
    heent_stat: 'n', heent_txt: 'Not pale, anicteric sclerae, pharynx not injected, no thyroid enlargement',
    chest_stat: 'n', chest_txt: 'Normal chest contour, equal breath sounds, clear both lungs, no adventitious sound',
    cvs_stat: 'n', cvs_txt: 'Normal S1 S2, no murmur, regular rhythm',
    ab_stat: 'n', ab_txt: 'Soft, not tender, no distension, normoactive bowel sounds, liver & spleen not palpable',
    ext_stat: 'n', ext_txt: 'No edema, no cyanosis, pulse full, capillary refill < 2s',
    neuro_stat: 'n', neuro_txt: 'Alert, motor power grade V all, sensory intact, DTR 2+, no facial palsy, no stiff neck, cerebellar signs normal',
  },

  lesion_na: true,
  lesion_image: null,

  labs_text: '',
  problem_list: '',
  provisional_diagnosis: '',
  plan_of_management: '',

  doctor_name: '',
  doctor_license: '',
};

export default function Form({ initialData, recentAdmissions = [], doctors = [], note, isEdit = false }: FormProps) {
  const [formData, setFormData] = useState<AdmissionFormData>(() => {
    if (initialData) {
      return { ...defaultFormData, ...initialData };
    }
    return defaultFormData;
  });

  const [initialFormSnapshot, setInitialFormSnapshot] = useState<string>(() => {
    return JSON.stringify(formData);
  });
  const [saving, setSaving] = useState(false);
  const [hosxpPickerOpen, setHosxpPickerOpen] = useState(false);
  const [lesionCanvasOpen, setLesionCanvasOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const isFormModified = JSON.stringify(formData) !== initialFormSnapshot;

  // แจ้งเตือนก่อนปิดแท็บ/รีเฟรช หากมีข้อมูลยังไม่ได้บันทึก
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormModified) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFormModified]);

  // ฟังก์ชันย้อนกลับพร้อมการยืนยัน
  const handleGoBack = () => {
    if (isFormModified) {
      const confirmLeave = window.confirm(
        'คุณมีข้อมูลที่กำลังกรอกหรือยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?\n(หากกดยืนยัน ข้อมูลที่ยังไม่ได้บันทึกจะสูญหาย)'
      );
      if (!confirmLeave) return;
    }

    if (window.history.length > 1) {
      window.history.back();
    } else {
      router.get('/ipd/admission-notes');
    }
  };

  const handleNavigate = (url: string, targetName: string) => {
    if (isFormModified) {
      const confirmLeave = window.confirm(
        `คุณมีข้อมูลที่ยังไม่ได้บันทึก ต้องการไปยังหน้า "${targetName}" หรือไม่?`
      );
      if (!confirmLeave) return;
    }
    router.get(url);
  };

  // Auto calculate BMI when BW or Height changes
  useEffect(() => {
    const bw = parseFloat(formData.vital_signs.bw);
    const ht = parseFloat(formData.vital_signs.height);
    if (!isNaN(bw) && !isNaN(ht) && ht > 0) {
      const hM = ht / 100.0;
      const bmiVal = (bw / (hM * hM)).toFixed(2);
      if (formData.vital_signs.bmi !== bmiVal) {
        setFormData((prev) => ({
          ...prev,
          vital_signs: { ...prev.vital_signs, bmi: bmiVal },
        }));
      }
    }
  }, [formData.vital_signs.bw, formData.vital_signs.height]);

  const updateField = (field: keyof AdmissionFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateVital = (field: keyof AdmissionFormData['vital_signs'], value: string) => {
    setFormData((prev) => ({
      ...prev,
      vital_signs: { ...prev.vital_signs, [field]: value },
    }));
  };

  const updateRos = (sys: string, stat?: 'n' | 'a', txt?: string) => {
    setFormData((prev) => {
      const ros = { ...prev.ros };
      if (stat !== undefined) {
        (ros as any)[`${sys}_stat`] = stat;
        if (stat === 'n' && txt === undefined) {
          const defaults: Record<string, string> = {
            ga: 'ปกติ, ไม่มีอ่อนเพลีย',
            heent: 'ปกติ, ไม่ปวดศีรษะ ไม่มึนงง',
            cvs: 'ปกติ, ไม่มีใจสั่น ไม่มีเจ็บหน้าอก',
            chest: 'ปกติ, ไม่เหนื่อยหอบ ไม่ไอ',
            gi: 'ปกติ, ไม่มีคลื่นไส้อาเจียน กินได้',
            gu: 'ปกติ, ปัสสาวะออกดี ไม่ขัด',
            ext: 'ปกติ, ไม่มีบวม ไม่มีชาแขนขา',
            neuro: 'ปกติ, ไม่มีแขนขาอ่อนแรง รู้สึกตัวดี',
            oth: '',
          };
          (ros as any)[`${sys}_txt`] = defaults[sys] || 'ปกติ';
        }
      }
      if (txt !== undefined) {
        (ros as any)[`${sys}_txt`] = txt;
      }
      return { ...prev, ros };
    });
  };

  const setAllRosNormal = () => {
    setFormData((prev) => ({
      ...prev,
      ros: {
        ga_stat: 'n', ga_txt: 'ปกติ, ไม่มีอ่อนเพลีย',
        heent_stat: 'n', heent_txt: 'ปกติ, ไม่ปวดศีรษะ ไม่มึนงง',
        cvs_stat: 'n', cvs_txt: 'ปกติ, ไม่มีใจสั่น ไม่มีเจ็บหน้าอก',
        chest_stat: 'n', chest_txt: 'ปกติ, ไม่เหนื่อยหอบ ไม่ไอ',
        gi_stat: 'n', gi_txt: 'ปกติ, ไม่มีคลื่นไส้อาเจียน กินได้',
        gu_stat: 'n', gu_txt: 'ปกติ, ปัสสาวะออกดี ไม่ขัด',
        ext_stat: 'n', ext_txt: 'ปกติ, ไม่มีบวม ไม่มีชาแขนขา',
        neuro_stat: 'n', neuro_txt: 'ปกติ, ไม่มีแขนขาอ่อนแรง รู้สึกตัวดี',
        oth_stat: 'n', oth_txt: '',
      },
    }));
  };

  const updatePe = (sys: string, stat?: 'n' | 'a', txt?: string) => {
    setFormData((prev) => {
      const pe = { ...prev.pe };
      if (stat !== undefined) {
        (pe as any)[`${sys}_stat`] = stat;
        if (stat === 'n' && txt === undefined) {
          const peDefaults: Record<string, string> = {
            ga: 'Alert, good consciousness, not pale, no jaundice',
            heent: 'Not pale, anicteric sclerae, pharynx not injected, no thyroid enlargement',
            chest: 'Normal chest contour, equal breath sounds, clear both lungs, no adventitious sound',
            cvs: 'Normal S1 S2, no murmur, regular rhythm',
            ab: 'Soft, not tender, no distension, normoactive bowel sounds, liver & spleen not palpable',
            ext: 'No edema, no cyanosis, pulse full, capillary refill < 2s',
            neuro: 'Alert, motor power grade V all, sensory intact, DTR 2+, no facial palsy, no stiff neck, cerebellar signs normal',
          };
          (pe as any)[`${sys}_txt`] = peDefaults[sys] || 'Normal';
        }
      }
      if (txt !== undefined) {
        (pe as any)[`${sys}_txt`] = txt;
      }
      return { ...prev, pe };
    });
  };

  const setAllPeNormal = () => {
    setFormData((prev) => ({
      ...prev,
      pe: {
        ga_stat: 'n', ga_txt: 'Alert, good consciousness, not pale, no jaundice',
        heent_stat: 'n', heent_txt: 'Not pale, anicteric sclerae, pharynx not injected, no thyroid enlargement',
        chest_stat: 'n', chest_txt: 'Normal chest contour, equal breath sounds, clear both lungs, no adventitious sound',
        cvs_stat: 'n', cvs_txt: 'Normal S1 S2, no murmur, regular rhythm',
        ab_stat: 'n', ab_txt: 'Soft, not tender, no distension, normoactive bowel sounds, liver & spleen not palpable',
        ext_stat: 'n', ext_txt: 'No edema, no cyanosis, pulse full, capillary refill < 2s',
        neuro_stat: 'n', neuro_txt: 'Alert, motor power grade V all, sensory intact, DTR 2+, no facial palsy, no stiff neck, cerebellar signs normal',
      },
    }));
  };

  const insertLabTemplate = (type: string) => {
    const templates: Record<string, string> = {
      CBC: 'CBC : Hb 16.0 g/dL, Hct 49%, WBC 10.4 x10³/µL (PMN 75.9%, L 14.9%), Plt 268 x10³/µL, MCV 97 fL',
      Renal: 'BUN / Cr : BUN 14.2 mg/dL, Cr 0.95 mg/dL, eGFR 92 mL/min/1.73m²',
      Lyte: 'Electrolytes : Na 141, K 3.1 mmol/L (HypoK), Cl 103, CO2 22 mmol/L, Anion gap 19.1',
      Minerals: 'Minerals : Mg 1.21 mg/dL (HypoMg), P 2.05 mg/dL (HypoP), Ca 8.18 mg/dL',
      LFT: 'LFT : TB 0.8, DB 0.2, AST 45, ALT 38, ALP 72, Alb 4.1, Glob 2.9',
      Coag: 'Coagulation : PT 12.2 s, INR 1.06, PTT 27.1 s',
      Lipid: 'Lipid Profile : Chol 222 mg/dL, TG 187 mg/dL, HDL 81 mg/dL, LDL 123 mg/dL',
      HbA1c: 'HbA1c : 6.2 %',
      DTX: 'DTX : 112 mg%',
      TropT: 'Troponin-T : < 5 pg/mL (Negative)',
      EKG: 'EKG 12 leads : Normal Sinus Rhythm (NSR), rate 75 bpm, no ST-T change',
      Film: 'Film (CXR) : Normal heart size, clear both lung fields, no infiltration, no pleural effusion',
    };

    const textToInsert = templates[type] || '';
    setFormData((prev) => ({
      ...prev,
      labs_text: prev.labs_text.trim() === '' ? textToInsert : `${prev.labs_text}\n${textToInsert}`,
    }));
  };

  const loadExampleData = () => {
    setFormData({
      hospital_name: 'โรงพยาบาลค่ายสุรสิงหนาท',
      admit_date: '08/11/2569',
      admit_time: '09:30',
      patient_name: 'จ.ส.อ.กิตติพงษ์ คำสิงห์นอก',
      age: '41',
      gender: 'ชาย',
      hn: '000002839',
      an: '690000123',
      ward: 'อายุรกรรมชาย',
      pttype: 'สิทธิจ่ายตรง กรมบัญชีกลาง',

      src_patient: true,
      src_relative: false,
      src_ems: false,
      src_old_record: false,
      src_referral: false,
      src_unconscious: false,

      chief_complaint: 'มึนศีรษะ ปวดศีรษะ ชาตามตัว แน่นหน้าอก หายใจไม่อิ่ม 4 ชั่วโมงก่อนมาโรงพยาบาล',
      present_illness:
        '4 ชั่วโมงก่อนมา รพ. ขณะพักผ่อน เริ่มมีอาการหน้าชา ชาตามตัว ไม่มีล้มหรือหมดสติ มีอาการมึนงงศีรษะ ร่วมกับปวดศีรษะ Pain Score = 7/10 มีอาการแน่นหน้าอก หายใจไม่อิ่ม ใจสั่น คลื่นไส้ นอนไม่หลับ และมีอาการอ่อนเพลียมาก ซักประวัติเพิ่มเติม: เมื่อช่วงเย็นวานนี้ดื่มเหล้าขาวร่วมกับเพื่อนรวม 4 คน ดื่มไปประมาณ 2 ขวด ปฏิเสธการใช้สารเสพติด ปฏิเสธภาวะเครียด',
      prev_treatment_opt: 'none',
      prev_treatment_detail: '',

      allergy_opt: 'none',
      allergy_detail: '',
      pmh_opt: 'yes',
      pmh_detail: 'Hypertension รักษาที่ รพ.สมเด็จพระยุพราชสระแก้ว กินยาไม่สม่ำเสมอ ขาดยามา 1 เดือน',
      surg_opt: 'none',
      surg_detail: '',
      med_opt: 'yes',
      med_detail: 'ยาลดความดันโลหิต (ขาดยา ไม่ได้รับประทานต่อเนื่อง 1 เดือน)',
      smoke_opt: 'yes',
      smoke_detail: '< 10 มวน/วัน',
      alcohol_opt: 'yes',
      alcohol_detail: 'เรื้อรัง 20 ปี (เบียร์ 1-2 ป๋อง/วัน, เปลี่ยนเป็นเหล้าขาว 1 ด., เย็นวาน 2 ขวด/4 คน)',
      fh_opt: 'no',
      fh_detail: 'ปฏิเสธประวัติโรคเรื้อรังในครอบครัว',
      lmp_na: true,
      lmp_detail: '-',
      vac_na: true,
      vac_detail: '-',

      ros: {
        ga_stat: 'a', ga_txt: 'อ่อนเพลีย นอนไม่หลับ',
        heent_stat: 'a', heent_txt: 'มึนศีรษะ ปวดศีรษะ',
        cvs_stat: 'a', cvs_txt: 'ใจสั่น แน่นหน้าอก',
        chest_stat: 'a', chest_txt: 'หายใจไม่อิ่ม, ไม่ไอ',
        gi_stat: 'a', gi_txt: 'คลื่นไส้ ไม่อาเจียน',
        gu_stat: 'n', gu_txt: 'ปัสสาวะปกติ',
        ext_stat: 'a', ext_txt: 'ชาตามตัว แขนขา',
        neuro_stat: 'a', neuro_txt: 'หน้าชา ไม่มีแขนขาอ่อนแรง',
        oth_stat: 'n', oth_txt: 'ปฏิเสธไข้ ปฏิเสธชัก',
      },

      vital_signs: {
        temperature: '36.0',
        pulse: '83',
        rr: '18',
        spo2: '99',
        bp: '157/100',
        bw: '65.0',
        height: '160',
        bmi: '25.39',
        pain_score: '7/10 (ปวดศีรษะ)',
      },

      pe: {
        ga_stat: 'a', ga_txt: 'Alert, mildly fatigued, not pale, no jaundice',
        heent_stat: 'n', heent_txt: 'Not pale, anicteric, pharynx not injected',
        chest_stat: 'n', chest_txt: 'Equal breath sounds, clear both lungs, no adventitious sound',
        cvs_stat: 'n', cvs_txt: 'Normal S1 S2, no murmur, regular rhythm rate 75 bpm',
        ab_stat: 'n', ab_txt: 'Soft, not tender, normoactive bowel sounds',
        ext_stat: 'n', ext_txt: 'No edema, no cyanosis, pulse full',
        neuro_stat: 'n', neuro_txt: 'No facial palsy, motor power grade V all, sensory intact, DTR 2+, cerebellar signs normal, pronator drift: negative',
      },

      lesion_na: true,
      lesion_image: null,

      labs_text: `EKG 12 leads : Normal Sinus Rhythm (NSR), rate 75 bpm, no ST-T change
CBC : Hb 16.0 g/dL, Hct 49%, WBC 10.4 x10³/µL (PMN 75.9%, L 14.9%), Plt 268 x10³/µL, MCV 97 fL | Coagulation : PT 12.2 s, INR 1.06, PTT 27.1 s
Electrolytes : Na 141, K 3.1 mmol/L (HypoK), Cl 103, CO2 22 mmol/L, Anion gap 19.1
Minerals & Lipid : Mg 1.21 mg/dL (HypoMg), P 2.05 mg/dL (HypoP), Ca 8.18 mg/dL | Chol 222, TG 187, HDL 81, LDL 123`,

      problem_list: `1. Pre-syncope with acute headache, palpitation, paresthesia
2. Hypertension with poor compliance (ขาดรับประทานยา 1 เดือน, BP 169/105)
3. Combined Electrolyte Imbalance: HypoK (3.1), HypoMg (1.21), HypoP (2.05)
4. Chronic heavy alcohol drinking 20 years, Dyslipidemia`,

      provisional_diagnosis: `1. Pre syncope with headache
2. Alcohol dependence
3. Alcohol induced tubulopathy with Hypokalemia, Hypomagnesemia, and Hypophosphatemia
4. Essential hypertension, Dyslipidemia`,

      plan_of_management: `• CT brain NC : If no intracranial lesion, continue treatment at Fort Hospital
• Admit : IV hydration (0.9% NSS), monitor V/S & Neuro signs q 4 hrs
• Electrolyte correction : MgSO4 IV, KCl replacement, Phosphate replacement
• Supportive & Follow-up : Thiamine 100 mg IV/IM, re-check Lytes/Mg/P/Ca, BUN/Cr`,

      doctor_name: 'นายแพทย์ธนายุต จันชุม',
      doctor_license: '77367',
    });
  };

  const handleSaveToDatabase = async () => {
    if (!formData.hn || !formData.patient_name) {
      alert('กรุณาระบุข้อมูลผู้ป่วยและ HN ก่อนบันทึก');
      return;
    }

    setSaving(true);
    setSaveSuccessMsg(null);

    const payload = {
      hn: formData.hn,
      an: formData.an || null,
      patient_name: formData.patient_name,
      age: formData.age || null,
      gender: formData.gender || null,
      ward: formData.ward || null,
      pttype: formData.pttype || null,
      admit_date: formData.admit_date || null,
      admit_time: formData.admit_time || null,
      hospital_name: formData.hospital_name || 'โรงพยาบาลค่ายสุรสิงหนาท',
      form_data: formData,
      lesion_image: formData.lesion_image || null,
      lesion_na: formData.lesion_na,
      doctor_name: formData.doctor_name || null,
      doctor_license: formData.doctor_license || null,
      status: 'completed',
    };

    try {
      if (isEdit && note?.id) {
        await axios.put(`/ipd/admission-notes/${note.id}`, payload);
        setSaveSuccessMsg('อัปเดตแบบบันทึกสำเร็จ');
        setInitialFormSnapshot(JSON.stringify(formData));
      } else {
        const res = await axios.post('/ipd/admission-notes', payload);
        setSaveSuccessMsg('บันทึกแบบบันทึกใหม่สำเร็จ');
        setInitialFormSnapshot(JSON.stringify(formData));
      }
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head title="ระบบจัดทำและพิมพ์แบบบันทึกการรับผู้ป่วย (Admission Note Generator)" />

      <div className="h-screen flex flex-col overflow-hidden bg-slate-900 text-slate-100 font-sans print:h-auto print:overflow-visible print:bg-white print:block">
        {/* Top Navbar */}
        <header className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between shrink-0 no-print print:hidden">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGoBack}
              className="text-slate-200 hover:text-white hover:bg-slate-800 text-xs px-2.5 font-medium flex items-center gap-1.5"
              title="ย้อนกลับไปหน้าก่อนหน้า"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ย้อนกลับ</span>
            </Button>

            <div className="h-4 w-px bg-slate-700" />

            <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-400">
              <button 
                type="button"
                onClick={() => handleNavigate('/ipd', 'Doctor Portal')}
                className="hover:text-slate-200 hover:underline cursor-pointer"
              >
                Doctor
              </button>
              <span>/</span>
              <button 
                type="button"
                onClick={() => handleNavigate('/ipd/admission-notes', 'ประวัติแบบบันทึก')}
                className="hover:text-slate-200 hover:underline cursor-pointer"
              >
                ประวัติแบบบันทึก
              </button>
            </div>

            <div className="h-4 w-px bg-slate-700 hidden md:block" />

            <div className="bg-blue-600 p-1.5 rounded text-white font-bold text-xs flex items-center space-x-1">
              <FileText className="w-4 h-4" />
              <span>ADMISSION NOTE</span>
            </div>
            <h1 className="text-xs sm:text-sm font-semibold tracking-wide text-white">
              {isEdit ? 'แก้ไขแบบบันทึกการรับผู้ป่วย' : 'แบบบันทึกการรับผู้ป่วยไว้ในโรงพยาบาล'}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            {saveSuccessMsg && (
              <span className="text-xs text-emerald-400 font-medium flex items-center mr-2 animate-pulse">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {saveSuccessMsg}
              </span>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHosxpPickerOpen(true)}
              className="bg-sky-600 hover:bg-sky-500 text-white border-sky-500 text-xs font-medium rounded shadow transition"
            >
              <Search className="w-3.5 h-3.5 mr-1.5" />
              ดึงข้อมูลจาก HOSxP
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadExampleData}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600 text-xs font-medium rounded transition"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              เคสตัวอย่าง
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormData(defaultFormData)}
              className="bg-rose-900/40 hover:bg-rose-800 text-rose-200 border-rose-800/60 text-xs font-medium rounded transition"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              ล้างฟอร์ม
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={handleSaveToDatabase}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded shadow transition"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? 'กำลังบันทึก...' : isEdit ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล (Save)'}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded shadow flex items-center space-x-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>สั่งพิมพ์ / PDF</span>
            </Button>
          </div>
        </header>

        {/* Workspace Split View */}
        <div className="flex-1 flex overflow-hidden print:block print:overflow-visible">
          {/* Left Column: Form Editor */}
          <aside className="w-[560px] lg:w-[620px] xl:w-[680px] shrink-0 bg-slate-100 border-r border-slate-300 overflow-y-auto p-4 space-y-4 no-print print:hidden text-slate-800 text-xs">
            <div className="bg-blue-50 border-l-4 border-blue-600 p-2.5 rounded text-blue-900 text-xs leading-relaxed flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                กรอกข้อมูลในฟอร์มด้านล่าง หน้าพรีวิวด้านขวาจะอัปเดตแบบเรียลไทม์ และจัดหน้าพิมพ์ A4 สองหน้ามาตรฐานพร้อมกล่องสติ๊กเกอร์คนไข้ครบถ้วน
              </span>
            </div>

            {/* 1. ข้อมูลผู้ป่วยแรกรับ */}
            <div className="bg-white p-3.5 rounded-lg shadow-sm border border-slate-200 space-y-3">
              <div className="font-bold text-slate-900 border-b pb-1.5 text-sm flex items-center justify-between">
                <span>1. ข้อมูลผู้ป่วยแรกรับ</span>
                <span className="text-xs text-slate-500 font-normal">Header Profile</span>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">ชื่อโรงพยาบาล</label>
                <Input
                  value={formData.hospital_name}
                  onChange={(e) => updateField('hospital_name', e.target.value)}
                  className="bg-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">วันที่ Admit (วว/ดด/ปปปป)</label>
                  <Input
                    value={formData.admit_date}
                    onChange={(e) => updateField('admit_date', e.target.value)}
                    placeholder="เช่น 08/11/2569"
                    className="bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">เวลา (เว้นว่างได้)</label>
                  <Input
                    value={formData.admit_time}
                    onChange={(e) => updateField('admit_time', e.target.value)}
                    placeholder="เช่น 09:30"
                    className="bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">ชื่อ-สกุล ผู้ป่วย</label>
                <Input
                  value={formData.patient_name}
                  onChange={(e) => updateField('patient_name', e.target.value)}
                  placeholder="เช่น นาย สมชาย ใจดี"
                  className="bg-white font-medium text-xs"
                />
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">อายุ (ปี)</label>
                  <Input
                    value={formData.age}
                    onChange={(e) => updateField('age', e.target.value)}
                    className="bg-white text-center text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">เพศ</label>
                  <Input
                    value={formData.gender}
                    onChange={(e) => updateField('gender', e.target.value)}
                    className="bg-white text-center text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">HN</label>
                  <Input
                    value={formData.hn}
                    onChange={(e) => updateField('hn', e.target.value)}
                    className="bg-white text-center font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">AN</label>
                  <Input
                    value={formData.an}
                    onChange={(e) => updateField('an', e.target.value)}
                    className="bg-white text-center text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">หอผู้ป่วย</label>
                  <Input
                    value={formData.ward}
                    onChange={(e) => updateField('ward', e.target.value)}
                    placeholder="เช่น อายุรกรรมชาย หรือเว้นว่าง"
                    className="bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">สิทธิการรักษา</label>
                  <Input
                    value={formData.pttype}
                    onChange={(e) => updateField('pttype', e.target.value)}
                    placeholder="เช่น สิทธิจ่ายตรง, บัตรทอง"
                    className="bg-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. ประวัติการเจ็บป่วย (CC & HPI) */}
            <div className="bg-white p-3.5 rounded-lg shadow-sm border border-slate-200 space-y-2.5">
              <div className="font-bold text-slate-900 border-b pb-1 text-sm flex items-center justify-between">
                <span>2. ประวัติการเจ็บป่วย (CC & HPI)</span>
                <span className="text-[11px] font-normal text-slate-500">Auto-wrap ตัดบรรทัดอัตโนมัติ</span>
              </div>

              {/* แหล่งที่มาของข้อมูล */}
              <div>
                <label className="font-medium text-slate-700 block mb-1">แหล่งที่มาของข้อมูล</label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.src_patient}
                      onChange={(e) => updateField('src_patient', e.target.checked)}
                    />
                    <span>ผู้ป่วย</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.src_relative}
                      onChange={(e) => updateField('src_relative', e.target.checked)}
                    />
                    <span>ญาติ</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.src_ems}
                      onChange={(e) => updateField('src_ems', e.target.checked)}
                    />
                    <span>ผู้นำส่ง</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.src_old_record}
                      onChange={(e) => updateField('src_old_record', e.target.checked)}
                    />
                    <span>เวชระเบียนเดิม</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.src_referral}
                      onChange={(e) => updateField('src_referral', e.target.checked)}
                    />
                    <span>ใบส่งตัว</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer col-span-3 text-red-600 font-medium">
                    <input
                      type="checkbox"
                      checked={formData.src_unconscious}
                      onChange={(e) => updateField('src_unconscious', e.target.checked)}
                    />
                    <span>ผู้ป่วยไม่รู้สึกตัว / ซักประวัติไม่ได้</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-0.5">Chief Complaint (อาการสำคัญและระยะเวลา)</label>
                <Textarea
                  rows={2}
                  value={formData.chief_complaint}
                  onChange={(e) => updateField('chief_complaint', e.target.value)}
                  placeholder="พิมพ์อาการสำคัญและระยะเวลา..."
                  className="bg-white text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-0.5">Present Illness (พิมพ์ข้อความยาวต่อเนื่องได้)</label>
                <Textarea
                  rows={4}
                  value={formData.present_illness}
                  onChange={(e) => updateField('present_illness', e.target.value)}
                  placeholder="พิมพ์ประวัติปัจจุบันต่อเนื่อง..."
                  className="bg-white text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">การรักษาที่ได้รับมาก่อนมา รพ.</label>
                <div className="flex items-center space-x-4 text-xs mb-1">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="prev_treatment_opt"
                      checked={formData.prev_treatment_opt === 'none'}
                      onChange={() => updateField('prev_treatment_opt', 'none')}
                    />
                    <span>ยังไม่ได้รับการรักษา</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="prev_treatment_opt"
                      checked={formData.prev_treatment_opt === 'had'}
                      onChange={() => updateField('prev_treatment_opt', 'had')}
                    />
                    <span>ได้รับการรักษามาแล้ว (ระบุ)</span>
                  </label>
                </div>
                {formData.prev_treatment_opt === 'had' && (
                  <Textarea
                    rows={2}
                    value={formData.prev_treatment_detail}
                    onChange={(e) => updateField('prev_treatment_detail', e.target.value)}
                    placeholder="ระบุการรักษาที่ได้รับมาก่อนมา รพ. (เช่น ได้รับยา, พ่นยา)..."
                    className="bg-white text-xs"
                  />
                )}
              </div>
            </div>

            {/* 3. ประวัติเดิม & Social Hx */}
            <div className="bg-white p-3.5 rounded-lg shadow-sm border border-slate-200 space-y-2.5">
              <div className="font-bold text-slate-900 border-b pb-1 text-sm flex items-center justify-between">
                <span>3. ประวัติเดิม & Social Hx</span>
              </div>

              {/* แพ้ยา */}
              <div>
                <label className="font-medium text-slate-700 block mb-1">ประวัติแพ้ยา / สารเคมี</label>
                <div className="flex items-center space-x-3 text-xs mb-1">
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="allergy_opt"
                      checked={formData.allergy_opt === 'none'}
                      onChange={() => updateField('allergy_opt', 'none')}
                    />
                    <span>ไม่มีประวัติแพ้</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="allergy_opt"
                      checked={formData.allergy_opt === 'unknown'}
                      onChange={() => updateField('allergy_opt', 'unknown')}
                    />
                    <span>ไม่ทราบ</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="allergy_opt"
                      checked={formData.allergy_opt === 'yes'}
                      onChange={() => updateField('allergy_opt', 'yes')}
                    />
                    <span className="text-red-600 font-semibold">มี (ระบุ)</span>
                  </label>
                </div>
                {formData.allergy_opt === 'yes' && (
                  <Input
                    value={formData.allergy_detail}
                    onChange={(e) => updateField('allergy_detail', e.target.value)}
                    placeholder="ระบุชื่อยาหรือสารที่แพ้และอาการ..."
                    className="bg-white text-xs border-red-300 text-red-700 font-medium"
                  />
                )}
              </div>

              {/* โรคประจำตัว */}
              <div>
                <label className="font-medium text-slate-700 block mb-0.5">โรคประจำตัว (Past illness)</label>
                <div className="flex items-center space-x-3 text-xs mb-1">
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="pmh_opt"
                      checked={formData.pmh_opt === 'no'}
                      onChange={() => updateField('pmh_opt', 'no')}
                    />
                    <span>ไม่มี</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="pmh_opt"
                      checked={formData.pmh_opt === 'yes'}
                      onChange={() => updateField('pmh_opt', 'yes')}
                    />
                    <span>มี (ระบุ)</span>
                  </label>
                </div>
                {formData.pmh_opt === 'yes' && (
                  <Input
                    value={formData.pmh_detail}
                    onChange={(e) => updateField('pmh_detail', e.target.value)}
                    className="bg-white text-xs"
                  />
                )}
              </div>

              {/* ผ่าตัด */}
              <div>
                <label className="font-medium text-slate-700 block mb-1">ประวัติการผ่าตัด</label>
                <div className="flex items-center space-x-3 text-xs mb-1">
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="surg_opt"
                      checked={formData.surg_opt === 'none'}
                      onChange={() => updateField('surg_opt', 'none')}
                    />
                    <span>ไม่มี</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="surg_opt"
                      checked={formData.surg_opt === 'yes'}
                      onChange={() => updateField('surg_opt', 'yes')}
                    />
                    <span>มี (ระบุ)</span>
                  </label>
                </div>
                {formData.surg_opt === 'yes' && (
                  <Input
                    value={formData.surg_detail}
                    onChange={(e) => updateField('surg_detail', e.target.value)}
                    placeholder="ระบุการผ่าตัดและระยะเวลา..."
                    className="bg-white text-xs"
                  />
                )}
              </div>

              {/* ยาประจำตัว */}
              <div>
                <label className="font-medium text-slate-700 block mb-1">ยาประจำตัวที่ใช้</label>
                <div className="flex items-center space-x-3 text-xs mb-1">
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="med_opt"
                      checked={formData.med_opt === 'no'}
                      onChange={() => updateField('med_opt', 'no')}
                    />
                    <span>ไม่มี</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="med_opt"
                      checked={formData.med_opt === 'yes'}
                      onChange={() => updateField('med_opt', 'yes')}
                    />
                    <span>มี (ระบุ)</span>
                  </label>
                </div>
                {formData.med_opt === 'yes' && (
                  <Input
                    value={formData.med_detail}
                    onChange={(e) => updateField('med_detail', e.target.value)}
                    className="bg-white text-xs"
                  />
                )}
              </div>

              {/* สูบบุหรี่ & สุรา */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">การสูบบุหรี่</label>
                  <div className="flex items-center space-x-2 text-xs mb-1">
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="radio"
                        name="smoke_opt"
                        checked={formData.smoke_opt === 'no'}
                        onChange={() => updateField('smoke_opt', 'no')}
                      />
                      <span>ไม่สูบ</span>
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="radio"
                        name="smoke_opt"
                        checked={formData.smoke_opt === 'yes'}
                        onChange={() => updateField('smoke_opt', 'yes')}
                      />
                      <span>สูบ</span>
                    </label>
                  </div>
                  {formData.smoke_opt === 'yes' && (
                    <Input
                      value={formData.smoke_detail}
                      onChange={(e) => updateField('smoke_detail', e.target.value)}
                      placeholder="เช่น < 10 มวน/วัน"
                      className="bg-white text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">การดื่มสุรา</label>
                  <div className="flex items-center space-x-2 text-xs mb-1">
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="radio"
                        name="alcohol_opt"
                        checked={formData.alcohol_opt === 'no'}
                        onChange={() => updateField('alcohol_opt', 'no')}
                      />
                      <span>ไม่ดื่ม</span>
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="radio"
                        name="alcohol_opt"
                        checked={formData.alcohol_opt === 'yes'}
                        onChange={() => updateField('alcohol_opt', 'yes')}
                      />
                      <span>ดื่ม</span>
                    </label>
                  </div>
                  {formData.alcohol_opt === 'yes' && (
                    <Input
                      value={formData.alcohol_detail}
                      onChange={(e) => updateField('alcohol_detail', e.target.value)}
                      placeholder="เช่น เบียร์ 1-2 ป๋อง/วัน"
                      className="bg-white text-xs"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Family Hx (ประวัติครอบครัว)</label>
                <div className="flex items-center space-x-3 text-xs mb-1">
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="fh_opt"
                      checked={formData.fh_opt === 'no'}
                      onChange={() => updateField('fh_opt', 'no')}
                    />
                    <span>ไม่มี</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="fh_opt"
                      checked={formData.fh_opt === 'yes'}
                      onChange={() => updateField('fh_opt', 'yes')}
                    />
                    <span>มี (ระบุ)</span>
                  </label>
                </div>
                {formData.fh_opt === 'yes' && (
                  <Input
                    value={formData.fh_detail}
                    onChange={(e) => updateField('fh_detail', e.target.value)}
                    className="bg-white text-xs"
                  />
                )}
              </div>
            </div>

            {/* 3.1 Review of Systems (ROS) */}
            <div className="bg-white p-3.5 rounded-lg shadow-sm border border-slate-200 space-y-2.5">
              <div className="font-bold text-slate-900 border-b pb-1 text-sm flex items-center justify-between">
                <span>3.1 Review of Systems (ROS)</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={setAllRosNormal}
                  className="h-6 px-2 text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                >
                  Set All N (ปกติทั้งหมด)
                </Button>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { key: 'ga', label: 'GA' },
                  { key: 'heent', label: 'HEENT' },
                  { key: 'cvs', label: 'CVS' },
                  { key: 'chest', label: 'Chest' },
                  { key: 'gi', label: 'GI' },
                  { key: 'gu', label: 'GU' },
                  { key: 'ext', label: 'Ext' },
                  { key: 'neuro', label: 'Neuro' },
                  { key: 'oth', label: 'Other' },
                ].map((sys) => {
                  const statKey = `${sys.key}_stat` as keyof typeof formData.ros;
                  const txtKey = `${sys.key}_txt` as keyof typeof formData.ros;
                  const stat = formData.ros[statKey];
                  const txt = formData.ros[txtKey] as string;

                  return (
                    <div key={sys.key} className="flex items-center space-x-2">
                      <span className="w-14 font-bold shrink-0">{sys.label}:</span>
                      <label className="flex items-center space-x-0.5 cursor-pointer">
                        <input
                          type="radio"
                          name={`ros_${sys.key}`}
                          checked={stat === 'n'}
                          onChange={() => updateRos(sys.key, 'n')}
                        />
                        <span>N</span>
                      </label>
                      <label className="flex items-center space-x-0.5 cursor-pointer">
                        <input
                          type="radio"
                          name={`ros_${sys.key}`}
                          checked={stat === 'a'}
                          onChange={() => updateRos(sys.key, 'a')}
                        />
                        <span>A</span>
                      </label>
                      <Input
                        value={txt}
                        onChange={(e) => updateRos(sys.key, undefined, e.target.value)}
                        className={`h-7 py-1 text-xs bg-white ${stat === 'a' ? 'font-semibold border-amber-400' : ''}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. สัญญาณชีพ (Vital Signs) */}
            <div className="bg-white p-3.5 rounded-lg shadow-sm border border-slate-200 space-y-2.5">
              <div className="font-bold text-slate-900 border-b pb-1 text-sm flex items-center justify-between">
                <span>4. สัญญาณชีพ (Vital Signs)</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="font-medium text-slate-700 block mb-0.5">T (°C)</label>
                  <Input
                    value={formData.vital_signs.temperature}
                    onChange={(e) => updateVital('temperature', e.target.value)}
                    className="bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-0.5">PR (/min)</label>
                  <Input
                    value={formData.vital_signs.pulse}
                    onChange={(e) => updateVital('pulse', e.target.value)}
                    className="bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-0.5">RR (/min)</label>
                  <Input
                    value={formData.vital_signs.rr}
                    onChange={(e) => updateVital('rr', e.target.value)}
                    className="bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-0.5">SpO2 (%)</label>
                  <Input
                    value={formData.vital_signs.spo2}
                    onChange={(e) => updateVital('spo2', e.target.value)}
                    className="bg-white text-xs"
                  />
                </div>
                <div className="col-span-4">
                  <label className="font-medium text-slate-700 block mb-0.5">BP (mmHg)</label>
                  <Input
                    value={formData.vital_signs.bp}
                    onChange={(e) => updateVital('bp', e.target.value)}
                    placeholder="เช่น 120/80"
                    className="bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-0.5">BW (kg)</label>
                  <Input
                    value={formData.vital_signs.bw}
                    onChange={(e) => updateVital('bw', e.target.value)}
                    className="bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-0.5">Ht (cm)</label>
                  <Input
                    value={formData.vital_signs.height}
                    onChange={(e) => updateVital('height', e.target.value)}
                    className="bg-white text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-medium text-slate-700 block mb-0.5">BMI (Auto-calc)</label>
                  <Input
                    value={formData.vital_signs.bmi}
                    readOnly
                    className="bg-slate-50 text-xs font-semibold"
                  />
                </div>
                <div className="col-span-4">
                  <label className="font-medium text-slate-700 block mb-0.5">Pain Score</label>
                  <Input
                    value={formData.vital_signs.pain_score}
                    onChange={(e) => updateVital('pain_score', e.target.value)}
                    className="bg-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 4.1 Physical Examination (PE) */}
            <div className="bg-white p-3.5 rounded-lg shadow-sm border border-slate-200 space-y-2.5">
              <div className="font-bold text-slate-900 border-b pb-1 text-sm flex items-center justify-between">
                <span>4.1 Physical Examination (PE รายระบบ)</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={setAllPeNormal}
                  className="h-6 px-2 text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                >
                  Set All N (ปกติทั้งหมด)
                </Button>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { key: 'ga', label: 'GA' },
                  { key: 'heent', label: 'HEENT' },
                  { key: 'chest', label: 'Chest' },
                  { key: 'cvs', label: 'CVS' },
                  { key: 'ab', label: 'Abdomen' },
                  { key: 'ext', label: 'Ext' },
                  { key: 'neuro', label: 'Neuro' },
                ].map((sys) => {
                  const statKey = `${sys.key}_stat` as keyof typeof formData.pe;
                  const txtKey = `${sys.key}_txt` as keyof typeof formData.pe;
                  const stat = formData.pe[statKey];
                  const txt = formData.pe[txtKey] as string;

                  return (
                    <div key={sys.key} className="flex items-center space-x-2">
                      <span className="w-16 font-bold shrink-0">{sys.label} :</span>
                      <label className="flex items-center space-x-0.5 cursor-pointer">
                        <input
                          type="radio"
                          name={`pe_${sys.key}`}
                          checked={stat === 'n'}
                          onChange={() => updatePe(sys.key, 'n')}
                        />
                        <span>N</span>
                      </label>
                      <label className="flex items-center space-x-0.5 cursor-pointer">
                        <input
                          type="radio"
                          name={`pe_${sys.key}`}
                          checked={stat === 'a'}
                          onChange={() => updatePe(sys.key, 'a')}
                        />
                        <span>A</span>
                      </label>
                      <Input
                        value={txt}
                        onChange={(e) => updatePe(sys.key, undefined, e.target.value)}
                        className={`h-7 py-1 text-xs bg-white ${stat === 'a' ? 'font-semibold border-amber-400' : ''}`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* รูปวาดรอยโรค / อวัยวะร่างกาย */}
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 text-xs">
                    รูปวาดรอยโรค / บาดแผล (Body Organ Lesion)
                  </span>
                  <label className="flex items-center space-x-1.5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formData.lesion_na}
                      onChange={(e) => updateField('lesion_na', e.target.checked)}
                    />
                    <span className="font-semibold text-slate-700">ตรวจไม่พบรอยโรค (NA)</span>
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLesionCanvasOpen(true)}
                    className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 text-xs"
                  >
                    <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                    เลือกรูปอวัยวะและวาดตำแหน่งรอยโรค (Draw / Mark)
                  </Button>

                  {formData.lesion_image && !formData.lesion_na && (
                    <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded border">
                      <img
                        src={formData.lesion_image}
                        alt="รอยโรคที่วาด"
                        className="w-10 h-8 object-contain bg-white rounded border"
                      />
                      <span className="text-[11px] text-slate-600 font-medium">มีรูปภาพรอยโรคแล้ว</span>
                      <button
                        type="button"
                        onClick={() => updateField('lesion_image', null)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                        title="ลบรูปภาพ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. ผลแลปและการตรวจวินิจฉัย */}
            <div className="bg-white p-3.5 rounded-lg shadow-sm border border-slate-200 space-y-2.5">
              <div className="font-bold text-slate-900 border-b pb-1 text-sm flex items-center justify-between">
                <span>5. Investigations & ผลตรวจ Lab</span>
                <span className="text-[11px] font-normal text-slate-500">Custom Lab Entries</span>
              </div>
              <div>
                <span className="font-medium text-slate-700 block mb-1">เลือกคลิกเพิ่ม Profile อัตโนมัติ:</span>
                <div className="space-y-1.5 mb-2">
                  <div className="flex flex-wrap gap-1.5">
                    {['CBC', 'Renal', 'Lyte', 'Minerals', 'LFT', 'Coag'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => insertLabTemplate(t)}
                        className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[11px] font-medium transition"
                      >
                        + {t}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {['Lipid', 'HbA1c', 'DTX', 'TropT', 'EKG', 'Film'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => insertLabTemplate(t)}
                        className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[11px] font-medium transition"
                      >
                        + {t}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea
                  rows={4}
                  value={formData.labs_text}
                  onChange={(e) => updateField('labs_text', e.target.value)}
                  placeholder="พิมพ์รายการตรวจและผลแลป..."
                  className="bg-white font-mono text-xs"
                />
              </div>
            </div>

            {/* 6. Problem list & Provisional Diagnosis */}
            <div className="bg-white p-3.5 rounded-lg shadow-sm border border-slate-200 space-y-2.5">
              <div className="font-bold text-slate-900 border-b pb-1 text-sm flex items-center justify-between">
                <span>6. ปัญหาและการวินิจฉัยโรค</span>
              </div>
              <div>
                <label className="font-medium text-slate-700 block mb-0.5">Problem list (บรรทัดละ 1 ข้อ)</label>
                <Textarea
                  rows={3}
                  value={formData.problem_list}
                  onChange={(e) => updateField('problem_list', e.target.value)}
                  placeholder="1. Acute headache..."
                  className="bg-white text-xs"
                />
              </div>
              <div>
                <label className="font-medium text-slate-700 block mb-0.5">Provisional Diagnosis (บรรทัดละ 1 ข้อ)</label>
                <Textarea
                  rows={3}
                  value={formData.provisional_diagnosis}
                  onChange={(e) => updateField('provisional_diagnosis', e.target.value)}
                  placeholder="1. Essential hypertension..."
                  className="bg-white text-xs"
                />
              </div>
            </div>

            {/* 7. Plan of Management & แพทย์ผู้ตรวจ */}
            <div className="bg-white p-3.5 rounded-lg shadow-sm border border-slate-200 space-y-2.5">
              <div className="font-bold text-slate-900 border-b pb-1 text-sm flex items-center justify-between">
                <span>7. แผนการรักษา & แพทย์ผู้ตรวจ</span>
              </div>
              <div>
                <label className="font-medium text-slate-700 block mb-0.5">Plan of Management (Bullet ละ 1 ข้อ)</label>
                <Textarea
                  rows={4}
                  value={formData.plan_of_management}
                  onChange={(e) => updateField('plan_of_management', e.target.value)}
                  placeholder="• Admit ward, IV hydration..."
                  className="bg-white text-xs"
                />
              </div>
              <div className="pt-2 border-t space-y-2">
                <DoctorPicker
                  doctors={doctors}
                  selectedDoctorName={formData.doctor_name}
                  selectedLicense={formData.doctor_license}
                  onSelect={({ name, licenseno }) => {
                    setFormData((prev) => ({
                      ...prev,
                      doctor_name: name,
                      doctor_license: licenseno,
                    }));
                  }}
                />

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="font-medium text-slate-700 block mb-0.5">ชื่อแพทย์ผู้ตรวจ (แก้ไขได้)</label>
                    <Input
                      value={formData.doctor_name}
                      onChange={(e) => updateField('doctor_name', e.target.value)}
                      placeholder="เช่น นพ.สมศักดิ์ สุขใจ"
                      className="bg-white text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-0.5">เลข ว. แพทย์ (แก้ไขได้)</label>
                    <Input
                      value={formData.doctor_license}
                      onChange={(e) => updateField('doctor_license', e.target.value)}
                      placeholder="เช่น 12345 หรือ ว.12345"
                      className="bg-white text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column: Live Printable Preview */}
          <main className="flex-1 bg-slate-700/90 overflow-y-auto p-4 sm:p-6 lg:p-8 flex justify-center print:block print:p-0 print:m-0 print:bg-white print:overflow-visible">
            <PrintableA4Pages data={formData} />
          </main>
        </div>
      </div>

      {/* Modals */}
      <HosxpPatientPicker
        open={hosxpPickerOpen}
        onOpenChange={setHosxpPickerOpen}
        recentAdmissions={recentAdmissions}
        onSelectPatient={(prefillData) => {
          setFormData((prev) => ({
            ...prev,
            ...prefillData,
            vital_signs: { ...prev.vital_signs, ...(prefillData.vital_signs || {}) },
            pe: { ...prev.pe, ...(prefillData.pe || {}) },
          }));
        }}
      />

      <LesionCanvasModal
        open={lesionCanvasOpen}
        onOpenChange={setLesionCanvasOpen}
        initialImage={formData.lesion_image}
        onSave={(dataUrl, isNa) => {
          setFormData((prev) => ({
            ...prev,
            lesion_image: dataUrl,
            lesion_na: isNa,
          }));
        }}
      />
    </>
  );
}
