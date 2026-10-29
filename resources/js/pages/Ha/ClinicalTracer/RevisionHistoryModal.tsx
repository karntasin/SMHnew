import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { 
  History, 
  RotateCcw, 
  Eye, 
  X, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertTriangle,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Revision {
  id: number;
  clinical_tracer_id: number;
  version_number: number;
  change_summary: string;
  created_at: string;
  snapshot_data: any;
  creator?: {
    id: number;
    name: string;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tracerId: number;
  currentVersion: number;
  revisions: Revision[];
}

export default function RevisionHistoryModal({
  isOpen,
  onClose,
  tracerId,
  currentVersion,
  revisions,
}: Props) {
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  if (!isOpen) return null;

  const handleRestore = (rev: Revision) => {
    if (!confirm(`คุณต้องการกู้คืนข้อมูล Clinical Tracer กลับไปเป็นเวอร์ชัน #${rev.version_number} หรือไม่? ระบบจะสร้างเวอร์ชันใหม่โดยดึงข้อมูลทั้งหมดจากรุ่นนี้กลับมา`)) {
      return;
    }

    setIsRestoring(true);
    router.post(
      `/ha/clinical-tracer/${tracerId}/revisions/${rev.id}/restore`,
      {},
      {
        onSuccess: () => {
          setIsRestoring(false);
          onClose();
        },
        onError: () => {
          setIsRestoring(false);
          alert('เกิดข้อผิดพลาดในการกู้คืนข้อมูล');
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                ประวัติการแก้ไขและกู้คืน Clinical Tracer
              </h3>
              <p className="text-xs text-slate-500">
                เวอร์ชันปัจจุบัน: <strong>#{currentVersion}</strong> — บันทึก Snapshot ข้อมูล 6 มิติทุกครั้งที่บันทึก
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revision List */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                รายการเวอร์ชัน ({revisions.length} เวอร์ชัน)
              </div>
              {revisions.map((rev) => {
                const isCurrent = rev.version_number === currentVersion;
                const isSelected = selectedRevision?.id === rev.id;

                return (
                  <div
                    key={rev.id}
                    onClick={() => setSelectedRevision(rev)}
                    className={cn(
                      "p-3.5 rounded-xl border text-xs cursor-pointer transition-all",
                      isSelected
                        ? "border-rose-500 bg-rose-50/60 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md font-mono font-bold text-[11px]",
                          isCurrent
                            ? "bg-rose-600 text-white"
                            : "bg-slate-100 text-slate-700"
                        )}>
                          v{rev.version_number}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                            ปัจจุบัน
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(rev.created_at).toLocaleString('th-TH')}
                      </span>
                    </div>

                    <p className="text-slate-800 font-medium mb-1.5 line-clamp-2">
                      {rev.change_summary || 'บันทึกการแก้ไขข้อมูล Clinical Tracer'}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                      <span>โดย: <strong>{rev.creator?.name ?? 'ระบบ'}</strong></span>
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <Eye className="w-3 h-3" /> ดูข้อมูลรุ่นนี้
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Revision Preview & Restore */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 flex flex-col justify-between">
              {selectedRevision ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <div className="text-xs font-bold text-rose-600 font-mono">
                        Snapshot เวอร์ชัน #{selectedRevision.version_number}
                      </div>
                      <div className="text-xs text-slate-500">
                        บันทึกเมื่อ: {new Date(selectedRevision.created_at).toLocaleString('th-TH')}
                      </div>
                    </div>
                    {selectedRevision.version_number !== currentVersion && (
                      <button
                        onClick={() => handleRestore(selectedRevision)}
                        disabled={isRestoring}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{isRestoring ? 'กำลังกู้คืน...' : 'กู้คืนรุ่นนี้ (Restore)'}</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-700 block mb-1">เหตุผลการบันทึก:</span>
                      <p className="text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                        {selectedRevision.change_summary || 'ไม่มีข้อความกำกับ'}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-700 block mb-1">ชื่อ Tracer:</span>
                      <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 font-medium">
                        {selectedRevision.snapshot_data?.title ?? '-'}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-700 block mb-1">ตัวอย่างบริบท & ขนาดปัญหา:</span>
                      <p className="text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {selectedRevision.snapshot_data?.context || 'ไม่มีข้อมูลบริบท'}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-700 block mb-1">จำนวนตัวชี้วัดในรุ่นนี้:</span>
                      <p className="text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                        {selectedRevision.snapshot_data?.kpi_data?.rows?.length ?? 0} ตัวชี้วัด
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Eye className="w-10 h-10 mb-2 opacity-30 text-rose-500" />
                  <p className="text-sm font-semibold text-slate-600">เลือกดูข้อมูลเวอร์ชันในอดีต</p>
                  <p className="text-xs text-slate-400 mt-1">
                    คลิกรายการเวอร์ชันทางซ้ายเพื่อดูตัวอย่าง และสามารถกดปุ่ม "กู้คืน (Restore)" เพื่อย้อนกลับไปใช้ข้อมูลรุ่นนั้นได้ทันที
                  </p>
                </div>
              )}

              {selectedRevision && selectedRevision.version_number !== currentVersion && (
                <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    ระบบจะนำข้อมูลในเวอร์ชันนี้มาตั้งเป็นข้อมูลปัจจุบัน และสร้างเป็นเวอร์ชันใหม่ #{currentVersion + 1}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
