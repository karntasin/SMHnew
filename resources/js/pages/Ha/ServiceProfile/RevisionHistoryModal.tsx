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
  Building2,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Revision {
  id: number;
  service_profile_id?: number;
  version_number: number;
  change_summary?: string;
  created_at: string;
  snapshot_data?: any;
  creator?: {
    name: string;
  };
}

interface Props {
  profileId: number;
  currentVersion: number;
  revisions: Revision[];
  onClose: () => void;
}

export default function RevisionHistoryModal({
  profileId,
  currentVersion,
  revisions,
  onClose,
}: Props) {
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = (rev: Revision) => {
    if (!confirm(`คุณต้องการกู้คืนข้อมูล Service Profile กลับไปเป็นเวอร์ชัน #${rev.version_number} หรือไม่? ระบบจะสร้างเวอร์ชันใหม่โดยดึงข้อมูลทั้งหมดจากรุ่นนี้กลับมา`)) {
      return;
    }

    setIsRestoring(true);
    router.post(
      `/ha/service-profile/${profileId}/revisions/${rev.id}/restore`,
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
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                ประวัติการแก้ไขและกู้คืน Service Profile
              </h3>
              <p className="text-xs text-slate-500">
                เวอร์ชันปัจจุบัน: <strong>#{currentVersion}</strong> — บันทึก Snapshot ข้อมูลทั้ง 5 ส่วนทุกครั้งที่กดบันทึก
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revision List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                ประวัติเวอร์ชันย้อนหลัง ({revisions.length} เวอร์ชัน)
              </h4>

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
                        ? "bg-amber-50/60 border-amber-300 ring-2 ring-amber-100"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-white text-[11px]">
                          v{rev.version_number}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>เวอร์ชันปัจจุบัน</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(rev.created_at).toLocaleDateString('th-TH')}</span>
                      </div>
                    </div>

                    <p className="text-slate-700 font-medium line-clamp-2 mt-1">
                      {rev.change_summary || 'บันทึกการแก้ไขข้อมูล'}
                    </p>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{rev.creator?.name || 'ระบบ'}</span>
                      </span>

                      {!isCurrent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(rev);
                          }}
                          disabled={isRestoring}
                          className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-bold hover:underline cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>กู้คืนเวอร์ชันนี้</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Revision Detail Preview */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col h-full">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                ตัวอย่างข้อมูล Snapshot {selectedRevision ? `(v${selectedRevision.version_number})` : ''}
              </h4>

              {selectedRevision ? (
                <div className="space-y-4 flex-1 overflow-y-auto text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">เหตุผลที่แก้ไข:</span>
                    <p className="font-semibold text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200">
                      {selectedRevision.change_summary || '-'}
                    </p>
                  </div>

                  {selectedRevision.snapshot_data && (
                    <div className="space-y-3">
                      <div>
                        <span className="text-slate-500 block mb-0.5">หน้าที่และเป้าหมาย (Purpose):</span>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap line-clamp-4">
                          {selectedRevision.snapshot_data.purpose || '-'}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 block mb-0.5">ประเด็นคุณภาพสำคัญ:</span>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap line-clamp-3">
                          {selectedRevision.snapshot_data.key_quality_issues || '-'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center pt-2">
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">ตัวชี้วัด (KPIs)</span>
                          <span className="font-black text-slate-800 text-sm">
                            {selectedRevision.snapshot_data.performance_indicators?.length ?? 0} รายการ
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">กระบวนการสำคัญ</span>
                          <span className="font-black text-slate-800 text-sm">
                            {selectedRevision.snapshot_data.key_processes?.length ?? 0} กระบวนการ
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedRevision.version_number !== currentVersion && (
                    <div className="pt-4 mt-auto">
                      <button
                        onClick={() => handleRestore(selectedRevision)}
                        disabled={isRestoring}
                        className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-200 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>กู้คืนข้อมูลกลับไปเป็นเวอร์ชัน #{selectedRevision.version_number}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Eye className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-xs">คลิกเลือกเวอร์ชันทางซ้ายมือเพื่อดูตัวอย่างข้อมูลและกดกู้คืน</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
