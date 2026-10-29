import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { 
  History, 
  RotateCcw, 
  X, 
  CheckCircle2, 
  Clock, 
  User, 
  Eye, 
  Calendar,
  AlertCircle 
} from 'lucide-react';

interface Revision {
  id: number;
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
  revisions: Revision[];
  currentVersion: number;
}

export default function RevisionModal({
  isOpen,
  onClose,
  revisions,
  currentVersion
}: Props) {
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  if (!isOpen) return null;

  const handleRestore = (rev: Revision) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการย้อนคืนข้อมูลกลับไปเป็นเวอร์ชัน #${rev.version_number}?\nระบบจะสร้างบันทึกเวอร์ชันใหม่ให้โดยอัตโนมัติ`)) {
      setIsRestoring(true);
      router.post(`/ha/hospital-profile/revisions/${rev.id}/restore`, {}, {
        onSuccess: () => {
          setIsRestoring(false);
          onClose();
        },
        onError: () => {
          setIsRestoring(false);
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-200/50">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                ประวัติการแก้ไขและกู้คืนเวอร์ชัน (Revision History)
              </h3>
              <p className="text-xs text-slate-500">
                เวอร์ชันปัจจุบัน: <span className="font-bold text-amber-600">v{currentVersion}</span> • จัดเก็บประวัติทุกครั้งที่บันทึกข้อมูล
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {revisions && revisions.length > 0 ? (
            <div className="space-y-3">
              {revisions.map((rev) => {
                const isCurrent = rev.version_number === currentVersion;
                return (
                  <div
                    key={rev.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-amber-500/5 border-amber-200 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                            isCurrent
                              ? 'bg-amber-500 text-slate-950 shadow-2xs'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            v{rev.version_number}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              เวอร์ชันปัจจุบัน
                            </span>
                          )}
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(rev.created_at).toLocaleString('th-TH', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800">
                          {rev.change_summary || 'บันทึกการปรับปรุงข้อมูล'}
                        </p>
                        {rev.creator && (
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            โดย: {rev.creator.name}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setSelectedRevision(selectedRevision?.id === rev.id ? null : rev)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{selectedRevision?.id === rev.id ? 'ซ่อนตัวอย่าง' : 'ดูตัวอย่าง'}</span>
                        </button>

                        {!isCurrent && (
                          <button
                            type="button"
                            disabled={isRestoring}
                            onClick={() => handleRestore(rev)}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>กู้คืนเวอร์ชันนี้</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Snapshot Preview Accordion */}
                    {selectedRevision?.id === rev.id && (
                      <div className="mt-4 pt-4 border-t border-slate-200/80 bg-slate-50 p-4 rounded-xl text-xs space-y-2 font-mono">
                        <div className="font-bold text-slate-700 flex items-center justify-between">
                          <span>สรุปข้อมูลใน Snapshot เวอร์ชัน #{rev.version_number}:</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto bg-white p-3 rounded-lg border border-slate-200 text-slate-600 whitespace-pre-wrap">
                          {typeof rev.snapshot_data === 'string'
                            ? rev.snapshot_data
                            : JSON.stringify(rev.snapshot_data, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <History className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">ยังไม่มีประวัติการแก้ไขเพิ่มเติม</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
