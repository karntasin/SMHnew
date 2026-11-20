import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, UserCheck, Check, ChevronsUpDown, X, Stethoscope, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';

export interface DoctorItem {
  code: string;
  name: string;
  licenseno: string;
  active?: string;
  label?: string;
}

interface DoctorPickerProps {
  doctors?: DoctorItem[];
  selectedDoctorName: string;
  selectedLicense: string;
  onSelect: (doctor: { name: string; licenseno: string }) => void;
  className?: string;
}

export default function DoctorPicker({
  doctors = [],
  selectedDoctorName,
  selectedLicense,
  onSelect,
  className = '',
}: DoctorPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [extraResults, setExtraResults] = useState<DoctorItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearch('');
      setExtraResults(null);
    }
  }, [open]);

  // Combine initial doctors and any search results
  const doctorList = useMemo(() => {
    if (extraResults) return extraResults;
    return doctors;
  }, [doctors, extraResults]);

  // Filter client-side
  const filteredDoctors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return doctorList;
    return doctorList.filter((doc) => {
      const matchName = doc.name.toLowerCase().includes(q);
      const matchLicense = doc.licenseno.toLowerCase().includes(q);
      const matchCode = doc.code.toLowerCase().includes(q);
      return matchName || matchLicense || matchCode;
    });
  }, [doctorList, search]);

  // Search via API if no client results or query is long
  const handleRemoteSearch = async (query: string) => {
    if (!query.trim()) {
      setExtraResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get('/ipd/api/doctors', {
        params: { q: query },
      });
      if (res.data?.doctors) {
        setExtraResults(res.data.doctors);
      }
    } catch (e) {
      console.error('Failed to search doctors:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePick = (doc: DoctorItem) => {
    onSelect({
      name: doc.name,
      licenseno: doc.licenseno,
    });
    setOpen(false);
  };

  const isMatchedSelected = (doc: DoctorItem) => {
    if (!selectedDoctorName && !selectedLicense) return false;
    return (
      (selectedDoctorName && doc.name.trim() === selectedDoctorName.trim()) ||
      (selectedLicense && doc.licenseno.trim() === selectedLicense.trim())
    );
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-slate-700 flex items-center">
          <Stethoscope className="w-3.5 h-3.5 mr-1 text-blue-600" />
          เลือกแพทย์ผู้ตรวจจากฐานข้อมูล HOSxP
        </label>
        <span className="text-[11px] text-slate-400">
          (กรองเฉพาะแพทย์ position_id = 1 ที่มีเลข ว.)
        </span>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-white text-xs font-normal border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 h-9 px-3 shadow-sm text-left"
          >
            <div className="flex items-center truncate mr-2">
              <UserCheck className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
              {selectedDoctorName ? (
                <div className="flex items-center space-x-2 truncate">
                  <span className="font-bold text-slate-900 truncate">{selectedDoctorName}</span>
                  {selectedLicense && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-200 shrink-0">
                      {selectedLicense.startsWith('ว') ? selectedLicense : `ว. ${selectedLicense}`}
                    </Badge>
                  )}
                </div>
              ) : (
                <span className="text-slate-400">-- คลิกเพื่อเลือกหรือค้นหาแพทย์ผู้ตรวจ --</span>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[380px] sm:w-[460px] p-0 bg-white shadow-xl rounded-xl border border-slate-200 text-xs" align="start">
          {/* Header & Search Bar */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (filteredDoctors.length === 0 && e.target.value.length >= 2) {
                    handleRemoteSearch(e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredDoctors.length === 1) {
                      handlePick(filteredDoctors[0]);
                    } else if (search.trim()) {
                      handleRemoteSearch(search);
                    }
                  }
                }}
                placeholder="พิมพ์ค้นหาชื่อ นามสกุล หรือเลข ว. (เช่น 26453)..."
                className="pl-8 pr-8 h-8 text-xs bg-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 px-0.5">
              <span>
                {loading ? 'กำลังค้นหา...' : `พบแพทย์ ${filteredDoctors.length} ท่าน`}
              </span>
              <span className="text-[10px] text-slate-400">
                คลิกเลือกเพื่อเติมชื่อและเลข ว. ทันที
              </span>
            </div>
          </div>

          {/* List of Doctors */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredDoctors.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <UserCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-medium text-xs">ไม่พบข้อมูลแพทย์ที่มีเลข ว. ตรงกับคำค้น</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ท่านยังสามารถพิมพ์ชื่อแพทย์และเลข ว. ลงในช่องด้านล่างได้โดยตรง
                </p>
              </div>
            ) : (
              filteredDoctors.map((doc) => {
                const selected = isMatchedSelected(doc);
                return (
                  <button
                    key={doc.code + doc.licenseno}
                    type="button"
                    onClick={() => handlePick(doc)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${
                      selected
                        ? 'bg-blue-50 text-blue-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate mr-2">
                      <div className={`p-1.5 rounded-md shrink-0 ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Stethoscope className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="font-medium text-xs truncate flex items-center space-x-1.5">
                          <span>{doc.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">#{doc.code}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                          <Award className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>เลข ว. :</span>
                          <span className="font-semibold text-slate-700 font-mono">{doc.licenseno}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center space-x-1">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-700 bg-blue-50/50">
                        {doc.licenseno}
                      </Badge>
                      {selected && <Check className="w-4 h-4 text-blue-600 ml-1" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Quick Footer */}
          <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500">
            <span>ฐานข้อมูล HOSxP (ตาราง doctor)</span>
            {selectedDoctorName && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onSelect({ name: '', licenseno: '' });
                  setOpen(false);
                }}
                className="h-6 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2"
              >
                ล้างข้อมูลแพทย์
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
