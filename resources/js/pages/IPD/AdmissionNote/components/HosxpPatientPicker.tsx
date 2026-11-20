import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Loader2, 
  Calendar, 
  Bed, 
  ArrowRight, 
  Hospital, 
  Building2, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Users,
  History,
  ChevronDown,
  ChevronUp,
  Stethoscope
} from 'lucide-react';
import axios from 'axios';

export interface AdmissionItem {
  an: string;
  hn: string;
  vn: string;
  has_an: boolean;
  patient_name: string;
  gender: string;
  age: string;
  main_dep: string;
  main_dep_name: string;
  ward: string;
  pttype: string;
  vstdate: string;
  vstdate_raw?: string;
  vsttime: string;
  admit_date: string;
  admit_time: string;
  status: string;
}

export interface PatientVisitItem {
  vn: string;
  hn: string;
  an: string;
  has_an: boolean;
  vstdate: string;
  vstdate_raw: string;
  vsttime: string;
  main_dep: string;
  main_dep_name: string;
  cc: string;
  pttype: string;
  ward: string;
  vitals_summary: string;
}

interface HosxpPatientPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recentAdmissions?: AdmissionItem[];
  onSelectPatient: (data: any) => void;
}

export default function HosxpPatientPicker({
  open,
  onOpenChange,
  recentAdmissions = [],
  onSelectPatient,
}: HosxpPatientPickerProps) {
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'today' | 'ipd' | 'all'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString);
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState<string | null>(null);
  const [results, setResults] = useState<AdmissionItem[]>(recentAdmissions);
  const [hasSearched, setHasSearched] = useState(false);

  // Visit history expansion states
  const [expandedHn, setExpandedHn] = useState<string | null>(null);
  const [visitHistoryMap, setVisitHistoryMap] = useState<Record<string, PatientVisitItem[]>>({});
  const [loadingVisitsHn, setLoadingVisitsHn] = useState<string | null>(null);

  // Sync recent admissions when modal opens if results empty
  useEffect(() => {
    if (open && results.length === 0 && recentAdmissions.length > 0) {
      setResults(recentAdmissions);
    }
  }, [open, recentAdmissions]);

  // When filterTab or selectedDate changes, trigger search if modal is open
  useEffect(() => {
    if (open) {
      executeSearch(searchTerm, filterTab, selectedDate);
    }
  }, [filterTab, selectedDate, open]);

  const executeSearch = async (term: string, filter: 'today' | 'ipd' | 'all', dateVal?: string) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await axios.get('/ipd/api/admissions/search', {
        params: { 
          q: term,
          filter: filter,
          date: filter === 'today' ? (dateVal || selectedDate) : undefined,
        },
      });
      setResults(res.data.results || []);
    } catch (err) {
      console.error('Error searching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSearch(searchTerm, filterTab, selectedDate);
  };

  const handlePickIdentifier = async (identifier: string) => {
    if (!identifier) {
      alert('ไม่พบรหัสผู้ป่วย (AN / VN / HN) สำหรับดึงข้อมูล');
      return;
    }

    setFetchingDetails(identifier);
    try {
      const res = await axios.get(`/ipd/api/admissions/${encodeURIComponent(identifier)}/prefill`);
      if (res.data.success && res.data.data) {
        onSelectPatient(res.data.data);
        onOpenChange(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'ไม่สามารถดึงข้อมูลจาก HOSxP ได้');
    } finally {
      setFetchingDetails(null);
    }
  };

  const handlePick = (pt: AdmissionItem) => {
    const pickIdentifier = (pt.has_an && pt.an) ? pt.an : (pt.vn || pt.hn);
    handlePickIdentifier(pickIdentifier);
  };

  const togglePastVisits = async (hn: string) => {
    if (expandedHn === hn) {
      setExpandedHn(null);
      return;
    }

    setExpandedHn(hn);
    if (!visitHistoryMap[hn]) {
      setLoadingVisitsHn(hn);
      try {
        const res = await axios.get(`/ipd/api/patients/${encodeURIComponent(hn)}/visits`);
        if (res.data.success) {
          setVisitHistoryMap((prev) => ({
            ...prev,
            [hn]: res.data.visits || [],
          }));
        }
      } catch (err) {
        console.error('Error loading patient visit history:', err);
      } finally {
        setLoadingVisitsHn(null);
      }
    }
  };

  const todayStr = getTodayString();
  const yesterdayStr = getYesterdayString();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-5 bg-white text-slate-900 rounded-xl shadow-2xl">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Hospital className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                ค้นหาและดึงข้อมูลผู้ป่วยจาก HOSxP (IPD Auto-fill)
              </DialogTitle>
              <p className="text-xs text-slate-500">
                เลือกนำเข้าข้อมูลผู้ป่วยที่มา รพ. วันนี้ หรือเลือก Visit ย้อนหลังเพื่อนำสัญญาณชีพและผลการตรวจมาใส่ในฟอร์ม
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 pt-1 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setFilterTab('today')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 ${
              filterTab === 'today'
                ? 'border-blue-600 text-blue-700 bg-blue-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            ผู้ป่วย OPD / ER / คัดกรอง (Visit วันนี้)
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('ipd')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 ${
              filterTab === 'ipd'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Bed className="w-3.5 h-3.5 text-emerald-600" />
            ผู้ป่วยในกำลัง Admit (IPD มี AN)
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 ${
              filterTab === 'all'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            ค้นหาทั้งหมด
          </button>
        </div>

        {/* Date Selector Bar (Shown in OPD/ER/คัดกรอง tab) */}
        {filterTab === 'today' && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-blue-50/50 border border-blue-100 rounded-lg text-xs">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-medium">วันที่มารับบริการ:</span>
              <span className="font-bold text-blue-900">
                {selectedDate === todayStr ? 'วันนี้' : selectedDate === yesterdayStr ? 'เมื่อวาน' : selectedDate}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-2.5 py-1 text-[11px] rounded font-medium transition ${
                  selectedDate === todayStr
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(yesterdayStr)}
                className={`px-2.5 py-1 text-[11px] rounded font-medium transition ${
                  selectedDate === yesterdayStr
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                เมื่อวาน
              </button>
              <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                <span className="text-[11px] text-slate-500">เลือกวันที่:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                    }
                  }}
                  className="text-xs bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-700 focus:outline-blue-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 my-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              type="text"
              placeholder={
                filterTab === 'today'
                  ? 'พิมพ์ HN, ชื่อ-สกุล หรือ VN... (เว้นว่างไว้เพื่อดูผู้ป่วยทั้งหมดตามวันที่เลือก)'
                  : filterTab === 'ipd'
                  ? 'พิมพ์ AN, HN หรือ ชื่อ-สกุล... (เว้นว่างไว้เพื่อดูผู้ป่วยในที่กำลัง Admit ทั้งหมด)'
                  : 'พิมพ์ HN, ชื่อ-สกุล, AN หรือ VN เพื่อค้นหาประวัติ...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ค้นหา'}
          </Button>
        </form>

        {/* Results List */}
        <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span>กำลังดึงข้อมูลจากฐานข้อมูล HOSxP...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((pt) => {
              const pickId = (pt.has_an && pt.an) ? pt.an : (pt.vn || pt.hn);
              const isCurrent = fetchingDetails === pickId;
              const isExpanded = expandedHn === pt.hn;
              const pastVisits = visitHistoryMap[pt.hn] || [];

              return (
                <div
                  key={`${pt.vn || pt.an || pt.hn}-${pt.vstdate}-${pt.vsttime}`}
                  className="p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 transition flex flex-col gap-2 group"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Header: Name, Gender/Age, Admit/Visit Status Badge */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">{pt.patient_name}</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded">
                          {pt.gender} / {pt.age} ปี
                        </span>

                        {pt.has_an && pt.an ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-md border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            AN: <strong>{pt.an}</strong>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-semibold rounded-md border border-amber-200 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            ยังไม่มี AN (รอดำเนินการ Admit)
                          </span>
                        )}

                        {pt.ward && (
                          <span className="px-1.5 py-0.5 bg-cyan-50 text-cyan-700 text-[10px] font-semibold rounded border border-cyan-200 flex items-center gap-1">
                            <Bed className="w-3 h-3" />
                            {pt.ward}
                          </span>
                        )}
                      </div>

                      {/* Department (main_dep) Badge */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                          <Building2 className="w-3.5 h-3.5 mr-1 text-indigo-600 shrink-0" />
                          <span>แผนก: <strong className="text-indigo-900">{pt.main_dep_name || 'ไม่ระบุแผนก'}</strong></span>
                        </span>

                        {pt.pttype && (
                          <span className="text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            สิทธิ: {pt.pttype}
                          </span>
                        )}
                      </div>

                      {/* Details: HN, VN, Visit Time, Admit Time */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>HN: <strong className="text-slate-800">{pt.hn}</strong></span>
                        {pt.vn && (
                          <span>VN: <strong className="text-slate-700">{pt.vn}</strong></span>
                        )}
                        {pt.vstdate && (
                          <span className="flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                            มา รพ.: <span className="ml-1 text-slate-700 font-medium">{pt.vstdate} {pt.vsttime ? `${pt.vsttime} น.` : ''}</span>
                          </span>
                        )}
                        {pt.has_an && pt.admit_date && (
                          <span className="flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                            Admit: <span className="ml-1 text-emerald-800 font-medium">{pt.admit_date} {pt.admit_time ? `${pt.admit_time} น.` : ''}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons: Pick Today vs Select Past Visits */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {/* Button to toggle past visits */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => togglePastVisits(pt.hn)}
                        className={`text-xs h-8 px-2.5 rounded-lg border transition flex items-center gap-1 ${
                          isExpanded
                            ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                        title="ดูประวัติการมารับบริการทั้งหมดของคนไข้รายนี้"
                      >
                        <History className="w-3.5 h-3.5 text-blue-600" />
                        <span>{isExpanded ? 'ซ่อน Visit ย้อนหลัง' : 'เลือก Visit ย้อนหลัง'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </Button>

                      {/* Main Pick Button for this visit */}
                      <Button
                        type="button"
                        size="sm"
                        disabled={isCurrent}
                        onClick={() => handlePick(pt)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 rounded-lg shadow-xs flex items-center gap-1"
                      >
                        {isCurrent ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>กำลังดึงข้อมูล...</span>
                          </>
                        ) : (
                          <>
                            <span>{filterTab === 'today' ? 'เลือก Visit วันนี้' : 'เลือกเคสนี้'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Past Visits Drawer */}
                  {isExpanded && (
                    <div className="mt-2 pt-2.5 border-t border-slate-200 bg-slate-50/80 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                        <span className="flex items-center gap-1.5 text-blue-700">
                          <History className="w-4 h-4 text-blue-600" />
                          ประวัติการมารับบริการ (Visits) ย้อนหลังของ {pt.patient_name} (HN: {pt.hn})
                        </span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          คลิก "เลือก Visit นี้" เพื่อนำเข้าข้อมูลการตรวจเก่า
                        </span>
                      </div>

                      {loadingVisitsHn === pt.hn ? (
                        <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          <span>กำลังดึงประวัติ Visit จากฐานข้อมูล HOSxP...</span>
                        </div>
                      ) : pastVisits.length > 0 ? (
                        <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                          {pastVisits.map((v) => {
                            const isVisitCurrent = fetchingDetails === (v.has_an && v.an ? v.an : v.vn);
                            const isSameAsToday = v.vn === pt.vn;

                            return (
                              <div
                                key={v.vn}
                                className={`p-2.5 bg-white rounded-lg border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs ${
                                  isSameAsToday ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200 hover:border-blue-400'
                                }`}
                              >
                                <div className="text-xs space-y-1 flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-slate-900">
                                      {v.vstdate} {v.vsttime ? `${v.vsttime} น.` : ''}
                                    </span>
                                    {isSameAsToday && (
                                      <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded font-bold">
                                        Visit วันนี้
                                      </span>
                                    )}
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] rounded font-semibold border border-indigo-200">
                                      {v.main_dep_name}
                                    </span>
                                    {v.has_an && (
                                      <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[10px] rounded font-semibold border border-emerald-200">
                                        AN: {v.an}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      VN: {v.vn}
                                    </span>
                                  </div>

                                  {v.cc && (
                                    <div className="text-[11px] text-slate-700">
                                      <span className="text-slate-400 font-medium">อาการสำคัญ (CC):</span> {v.cc}
                                    </div>
                                  )}

                                  {v.vitals_summary && (
                                    <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                      <Stethoscope className="w-3 h-3 text-slate-400" />
                                      <span>สัญญาณชีพ: {v.vitals_summary}</span>
                                    </div>
                                  )}
                                </div>

                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isVisitCurrent}
                                  onClick={() => handlePickIdentifier(v.has_an && v.an ? v.an : v.vn)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-3 rounded-lg shrink-0 shadow-2xs self-end sm:self-center"
                                >
                                  {isVisitCurrent ? (
                                    <>
                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                      กำลังดึง...
                                    </>
                                  ) : (
                                    <>
                                      <span>เลือก Visit นี้</span>
                                      <ArrowRight className="w-3 h-3 ml-1" />
                                    </>
                                  )}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-3 text-center text-xs text-slate-400">
                          ไม่พบประวัติ Visit อื่นในฐานข้อมูล
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              {hasSearched ? 'ไม่พบข้อมูลผู้ป่วยที่ตรงกับเงื่อนไขการค้นหา' : 'ไม่มีรายการผู้ป่วยในหมวดหมู่นี้'}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 my-auto">
            💡 คลิก "เลือก Visit วันนี้" หรือกด "เลือก Visit ย้อนหลัง" เพื่อเลือกการตรวจเก่าของคนไข้เข้าแบบบันทึก
          </span>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
