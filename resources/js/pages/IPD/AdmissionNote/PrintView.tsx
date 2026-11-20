import React, { useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import PrintableA4Pages, { AdmissionFormData } from './components/PrintableA4Pages';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrintViewProps {
  formData: AdmissionFormData;
  note: any;
}

export default function PrintView({ formData, note }: PrintViewProps) {
  useEffect(() => {
    // Check if auto_print is requested
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auto_print') === '1') {
      window.print();
    }
  }, []);

  const handleBack = () => {
    // หากเปิดในแท็บใหม่ หรือไม่มี history ย้อนกลับ ให้พยายามปิดแท็บ หรือนำทางกลับหน้ารายการ
    if (window.opener || window.history.length <= 1) {
      window.close();
      setTimeout(() => {
        router.get('/ipd/admission-notes');
      }, 150);
    } else {
      window.history.back();
    }
  };

  return (
    <>
      <Head title={`พิมพ์แบบบันทึกรับผู้ป่วย - ${formData.patient_name || ''} (HN: ${formData.hn || ''})`} />

      <div className="bg-slate-800 min-h-screen text-slate-100 font-sans print:bg-white print:min-h-0 print:p-0 print:m-0 print:block">
        {/* Floating Print Action Toolbar */}
        <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-700 px-4 py-2.5 flex items-center justify-between no-print print:hidden shadow-md">
          <div className="flex items-center space-x-2 text-xs">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="text-slate-200 border-slate-700 hover:bg-slate-800 text-xs flex items-center gap-1 font-medium"
              title="ย้อนกลับไปหน้าก่อนหน้า หรือปิดแท็บ"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ย้อนกลับ</span>
            </Button>
            <span className="font-semibold text-slate-200">
              แบบบันทึกการรับผู้ป่วย: {formData.patient_name} (HN: {formData.hn}, AN: {formData.an || '-'})
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              size="sm"
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded shadow flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์ / Export เป็น PDF</span>
            </Button>
          </div>
        </div>

        {/* Document Pages Container */}
        <div className="p-4 sm:p-8 flex justify-center print:p-0 print:m-0 print:block">
          <PrintableA4Pages data={formData} />
        </div>
      </div>
    </>
  );
}
