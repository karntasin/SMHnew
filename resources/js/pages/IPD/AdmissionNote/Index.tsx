import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  Edit, 
  Trash2, 
  Bed, 
  Calendar, 
  User, 
  Stethoscope,
  Clock,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

interface NoteItem {
  id: number;
  an: string | null;
  hn: string;
  patient_name: string;
  age: string | null;
  gender: string | null;
  ward: string | null;
  pttype: string | null;
  admit_date: string | null;
  doctor_name: string | null;
  status: string;
  created_at: string;
  creator?: { id: number; name: string };
}

interface IndexProps {
  notes: {
    data: NoteItem[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
  };
  filters: {
    search?: string;
  };
}

export default function Index({ notes, filters }: IndexProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.get('/ipd/admission-notes', { search: searchTerm }, { preserveState: true });
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`คุณต้องการลบแบบบันทึกของ "${name}" ใช่หรือไม่?`)) {
      router.delete(`/ipd/admission-notes/${id}`);
    }
  };

  return (
    <AppLayout
      title="ประวัติแบบบันทึกรับผู้ป่วย (Admission Note History)"
      breadcrumbs={[
        { title: 'Doctor', href: '/ipd' },
        { title: 'ประวัติแบบบันทึก', href: '/ipd/admission-notes' },
      ]}
    >
      <Head title="ประวัติแบบบันทึกการรับผู้ป่วยใน (Admission Notes)" />

      <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              <span>ประวัติแบบบันทึกการรับผู้ป่วยใน (Admission Notes)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              รายการแบบบันทึกแรกรับผู้ป่วยที่บันทึกไว้ในระบบ สามารถแก้ไข สั่งพิมพ์ซ้ำ หรือส่งออกเป็น PDF ได้
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button asChild variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-lg shadow-xs">
              <Link href="/ipd">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                ย้อนกลับหน้า Doctor
              </Link>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow">
              <Link href="/ipd/admission-notes/create">
                <Plus className="w-4 h-4 mr-1.5" />
                สร้างแบบบันทึกใหม่
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                type="text"
                placeholder="ค้นหาด้วย HN, AN, ชื่อผู้ป่วย หรือชื่อแพทย์..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Button type="submit" variant="secondary" className="h-9 text-xs">
              ค้นหา
            </Button>
          </form>

          <span className="text-xs text-slate-500">
            ทั้งหมด <strong>{notes.total}</strong> รายการ
          </span>
        </div>

        {/* Notes Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">ข้อมูลผู้ป่วย</th>
                  <th className="px-4 py-3">HN / AN</th>
                  <th className="px-4 py-3">วันที่ Admit</th>
                  <th className="px-4 py-3">หอผู้ป่วย / สิทธิ</th>
                  <th className="px-4 py-3">แพทย์ผู้ตรวจ</th>
                  <th className="px-4 py-3">ผู้บันทึก</th>
                  <th className="px-4 py-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notes.data.length > 0 ? (
                  notes.data.map((note) => (
                    <tr key={note.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 text-sm">{note.patient_name}</div>
                        <div className="text-slate-500 text-[11px]">
                          {note.gender || '-'} / {note.age ? `${note.age} ปี` : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">HN: {note.hn}</div>
                        <div className="text-slate-500 text-[11px]">AN: {note.an || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{note.admit_date || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{note.ward || '-'}</div>
                        <div className="text-slate-500 text-[11px] truncate max-w-[160px]">{note.pttype || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 flex items-center">
                          <Stethoscope className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          <span>{note.doctor_name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        <div>{note.creator?.name || 'ระบบ'}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(note.created_at).toLocaleDateString('th-TH')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                            title="สั่งพิมพ์ / PDF"
                          >
                            <Link href={`/ipd/admission-notes/${note.id}/print`}>
                              <Printer className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-600 hover:text-amber-600 hover:bg-amber-50"
                            title="แก้ไข"
                          >
                            <Link href={`/ipd/admission-notes/${note.id}/edit`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(note.id, note.patient_name)}
                            className="h-8 w-8 p-0 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-xs">
                      ยังไม่มีรายการแบบบันทึกการรับผู้ป่วยในระบบ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {notes.last_page > 1 && (
            <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                หน้า {notes.current_page} จาก {notes.last_page}
              </div>
              <div className="flex space-x-1">
                {notes.links.map((link, idx) => (
                  <Button
                    key={idx}
                    asChild={!!link.url}
                    variant={link.active ? 'default' : 'outline'}
                    size="sm"
                    disabled={!link.url}
                    className="h-7 px-2 text-xs"
                  >
                    {link.url ? (
                      <Link href={link.url} dangerouslySetInnerHTML={{ __html: link.label }} />
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: link.label }} />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
