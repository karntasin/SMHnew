@extends('layouts.admin')
@section('content')
<div class="max-w-5xl mx-auto p-6" x-data="{
    editingItem: null,
    openEdit(item) {
        this.editingItem = { ...item };
    }
}">
    @include('admin.tv.header')

    @if(session('status'))
        <div class="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3">
            <svg class="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <span class="font-medium">{{ session('status') }}</span>
        </div>
    @endif

    @if($errors->any())
        <div class="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
            <ul class="list-disc pl-5 space-y-1 text-sm font-medium">
                @foreach($errors->all() as $error)
                    <li>{{ $error }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    <div class="flex items-center justify-between mb-4">
        <div>
            <h1 class="text-2xl font-black text-slate-800">🎬 รายการสื่อประชาสัมพันธ์ (Media Playlist)</h1>
            <p class="text-sm text-slate-500 mt-1">ระบบจะเล่นสื่อวนตามลำดับ (1, 2, 3...) เมื่อจบหรือหมดเวลาที่กำหนด จะเปลี่ยนไปยังรายการถัดไป และวนกลับมาอันแรกอัตโนมัติ</p>
        </div>
    </div>

    <!-- ฟอร์มเพิ่มสื่อใหม่ -->
    <form method="POST" action="{{ route('admin.tv.playlist.store', $boardKey) }}"
          enctype="multipart/form-data" class="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200" 
          x-data="{ type: 'image' }">
        @csrf
        <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            เพิ่มสื่อประชาสัมพันธ์ใหม่
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">ประเภทสื่อ</label>
                <select name="media_type" x-model="type" class="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                    <option value="image">🖼️ รูปภาพ (Image - JPG, PNG, WEBP)</option>
                    <option value="video">🎥 วิดีโอไฟล์ (Video MP4)</option>
                    <option value="youtube">▶️ YouTube Video URL</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">ชื่อหรือคำอธิบายสื่อ (ไม่บังคับ)</label>
                <input type="text" name="title" placeholder="เช่น แนะนำการล้างมือ, ข่าวสารรพ." class="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div x-show="type !== 'youtube'">
                <label class="block text-sm font-bold text-slate-700 mb-1.5">อัปโหลดไฟล์สื่อ</label>
                <input type="file" name="file" accept=".mp4,.jpg,.jpeg,.png,.webp,.gif" 
                       class="w-full border border-slate-300 rounded-xl p-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
                       :required="type !== 'youtube'">
                <p class="text-xs text-slate-500 mt-1.5">รองรับไฟล์ MP4, JPG, PNG, WEBP, GIF (ขนาดไฟล์สูงสุด 100MB)</p>
            </div>

            <div x-show="type === 'youtube'" x-cloak>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">YouTube URL</label>
                <input type="url" name="url" placeholder="https://www.youtube.com/watch?v=..." 
                       class="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                       :required="type === 'youtube'">
                <p class="text-xs text-slate-500 mt-1.5">ระบุลิงก์วิดีโอ YouTube ทั่วไป หรือ Shorts</p>
            </div>

            <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">ระยะเวลาแสดงผล (วินาที)</label>
                <div class="flex items-center gap-2">
                    <input type="number" name="duration_seconds" :value="type === 'video' ? '0' : (type === 'youtube' ? '30' : '15')" min="0" max="3600" class="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <span class="text-sm font-medium text-slate-500 whitespace-nowrap">วินาที</span>
                </div>
                <p class="text-xs text-slate-500 mt-1.5" x-show="type === 'image'">
                    ℹ️ <strong>รูปภาพ:</strong> แสดงผลตามจำนวนวินาทีที่ระบุ (ค่าเริ่มต้น 15 วิ) แล้วเปลี่ยนไปลำดับถัดไป
                </p>
                <p class="text-xs text-slate-500 mt-1.5" x-show="type === 'youtube'" x-cloak>
                    ℹ️ <strong>YouTube:</strong> เล่นตามเวลาที่ระบุ (เช่น 30 หรือ 60 วิ) แล้วเปลี่ยนไปลำดับถัดไป
                </p>
                <p class="text-xs text-slate-500 mt-1.5" x-show="type === 'video'" x-cloak>
                    ℹ️ <strong>วิดีโอ:</strong> ใส่ <strong>0</strong> เพื่อเล่นจนจบวิดีโอ หรือระบุเวลา เช่น <strong>30</strong> หากต้องการตัดเปลี่ยนเมื่อหมดเวลา (หรือจบวิดีโอก่อน)
                </p>
            </div>
        </div>

        <div class="flex justify-end pt-2">
            <button type="submit" class="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                บันทึกและเพิ่มลงรายการเล่น
            </button>
        </div>
    </form>

    <!-- ตารางรายการสื่อ -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span class="font-bold text-slate-700">ลำดับการเล่นสื่อทั้งหมด ({{ count($items) }} รายการ)</span>
            <span class="text-xs text-slate-500">ลำดับน้อยกว่าจะเล่นก่อน เมื่อครบทุกสื่อจะวนกลับมาอันแรก</span>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead class="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider font-bold">
                    <tr>
                        <th class="py-3 px-4 text-center w-16">ลำดับ</th>
                        <th class="py-3 px-4 w-28">ประเภท</th>
                        <th class="py-3 px-4">ชื่อสื่อ / ลิงก์ไฟล์</th>
                        <th class="py-3 px-4 w-44">เงื่อนไขการเล่น</th>
                        <th class="py-3 px-4 text-center w-28">สถานะ</th>
                        <th class="py-3 px-4 text-right w-36">จัดการ</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 text-sm">
                    @forelse($items as $item)
                    @php
                        $isYt = str_contains($item->file_path, 'youtube.com') || str_contains($item->file_path, 'youtu.be');
                    @endphp
                    <tr class="hover:bg-slate-50 transition-colors {{ !$item->is_active ? 'opacity-60 bg-slate-50/50' : '' }}">
                        <td class="py-3 px-4 text-center font-black text-slate-700 text-base">
                            {{ $item->sort_order }}
                        </td>
                        <td class="py-3 px-4">
                            @if($isYt)
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                    ▶️ YouTube
                                </span>
                            @elseif($item->media_type === 'video')
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                    🎥 วิดีโอ MP4
                                </span>
                            @else
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700 border border-sky-200">
                                    🖼️ รูปภาพ
                                </span>
                            @endif
                        </td>
                        <td class="py-3 px-4">
                            <div class="font-bold text-slate-900">{{ $item->title ?: 'สื่อประชาสัมพันธ์ #' . $item->id }}</div>
                            <a href="{{ $item->file_path }}" target="_blank" class="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-0.5 max-w-xs truncate">
                                <span>{{ $item->file_path }}</span>
                                <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                            </a>
                        </td>
                        <td class="py-3 px-4">
                            @if($item->media_type === 'video' && !$isYt)
                                @if($item->duration_seconds > 0)
                                    <div class="font-semibold text-amber-700 flex items-center gap-1">
                                        ⏱️ {{ $item->duration_seconds }} วิ <span class="text-xs font-normal text-slate-500">(หรือจบวิดีโอ)</span>
                                    </div>
                                @else
                                    <div class="font-semibold text-emerald-700 flex items-center gap-1">
                                        🎬 เล่นจนจบวิดีโอ
                                    </div>
                                @endif
                            @else
                                <div class="font-semibold text-slate-700 flex items-center gap-1">
                                    ⏱️ {{ $item->duration_seconds ?: 15 }} วินาที
                                </div>
                            @endif
                        </td>
                        <td class="py-3 px-4 text-center">
                            <form method="POST" action="{{ route('admin.tv.playlist.toggle', $item) }}">
                                @csrf @method('PATCH')
                                <button type="submit" class="px-3 py-1 rounded-full text-xs font-bold border transition-all {{ $item->is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200' }}">
                                    {{ $item->is_active ? '● เปิดใช้งาน' : '○ ปิดการแสดง' }}
                                </button>
                            </form>
                        </td>
                        <td class="py-3 px-4 text-right">
                            <div class="flex items-center justify-end gap-2">
                                <button type="button" @click="openEdit({{ json_encode($item) }})" 
                                        class="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors">
                                    แก้ไข
                                </button>
                                <form method="POST" action="{{ route('admin.tv.playlist.destroy', $item) }}"
                                      onsubmit="return confirm('ยืนยันที่จะลบสื่อนี้หรือไม่?')">
                                    @csrf @method('DELETE')
                                    <button type="submit" class="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors">
                                        ลบ
                                    </button>
                                </form>
                            </div>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="6" class="py-12 text-center text-slate-400">
                            <svg class="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path></svg>
                            <p class="font-medium text-base">ยังไม่มีสื่อในรายการเล่น</p>
                            <p class="text-xs mt-1">สามารถอัปโหลดรูปภาพ วิดีโอ หรือใส่ลิงก์ YouTube ที่ฟอร์มด้านบน</p>
                        </td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    <!-- Edit Modal -->
    <div x-show="editingItem" x-cloak class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <template x-if="editingItem">
            <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6" @click.away="editingItem = null">
                <h3 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    แก้ไขการเล่นสื่อ
                </h3>

                <form :action="'{{ url('admin/tv/playlist') }}/' + (editingItem ? editingItem.id : '')" method="POST" class="space-y-4">
                    @csrf
                    @method('PUT')

                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-1">ชื่อสื่อ</label>
                        <input type="text" name="title" x-model="editingItem.title" class="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500">
                    </div>

                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-1">ลำดับการเล่น (Sort Order)</label>
                        <input type="number" name="sort_order" x-model="editingItem.sort_order" min="0" class="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500">
                        <p class="text-xs text-slate-500 mt-1">เลขน้อยจะเล่นก่อน</p>
                    </div>

                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-1">ระยะเวลาแสดงผล (วินาที)</label>
                        <div class="flex items-center gap-2">
                            <input type="number" name="duration_seconds" x-model="editingItem.duration_seconds" min="0" max="3600" class="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500">
                            <span class="text-sm font-medium text-slate-500 whitespace-nowrap">วินาที</span>
                        </div>
                        <p class="text-xs text-slate-500 mt-1">สำหรับวิดีโอ: ระบุ 0 เพื่อเล่นจนจบ หรือระบุเวลาเพื่อตัดเปลี่ยน</p>
                    </div>

                    <div class="flex justify-end gap-3 pt-3">
                        <button type="button" @click="editingItem = null" class="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                            ยกเลิก
                        </button>
                        <button type="submit" class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm">
                            บันทึกการเปลี่ยนแปลง
                        </button>
                    </div>
                </form>
            </div>
        </template>
    </div>
</div>
@endsection
