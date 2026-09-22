@extends('layouts.admin')
@section('content')
<div class="max-w-4xl mx-auto p-6">
    @include('admin.tv.header')
    <h1 class="text-2xl font-bold mb-4">จัดการสื่อฝั่งซ้าย</h1>

    <form method="POST" action="{{ route('admin.tv.playlist.store', $boardKey) }}"
          enctype="multipart/form-data" class="mb-6 space-y-4 bg-white p-6 rounded-lg shadow-sm border" x-data="{ type: 'image' }">
        @csrf
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium mb-1">ประเภทสื่อ</label>
                <select name="media_type" x-model="type" class="w-full border rounded-md p-2">
                    <option value="image">รูปภาพ (Image)</option>
                    <option value="video">วิดีโอ (Video)</option>
                    <option value="youtube">YouTube URL</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">ชื่อสื่อ (ไม่บังคับ)</label>
                <input type="text" name="title" placeholder="ชื่อเรียก..." class="w-full border rounded-md p-2">
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div x-show="type !== 'youtube'">
                <label class="block text-sm font-medium mb-1">อัปโหลดไฟล์</label>
                <input type="file" name="file" accept=".mp4,.jpg,.jpeg,.png,.webp" class="w-full border rounded-md p-1.5" :required="type !== 'youtube'">
            </div>
            <div x-show="type === 'youtube'" x-cloak>
                <label class="block text-sm font-medium mb-1">YouTube URL</label>
                <input type="url" name="url" placeholder="https://www.youtube.com/watch?v=..." class="w-full border rounded-md p-2" :required="type === 'youtube'">
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">ระยะเวลาแสดงผล (วินาที)</label>
                <input type="number" name="duration_seconds" value="15" placeholder="เช่น 15 วินาที" class="w-full border rounded-md p-2">
                <p class="text-xs text-gray-500 mt-1">ใช้สำหรับรูปภาพ และ YouTube (วิดีโออัปโหลดจะเล่นจนจบอัตโนมัติ)</p>
            </div>
        </div>
        <button class="bg-indigo-600 text-white px-6 py-2 rounded-md font-medium hover:bg-indigo-700 transition-colors">บันทึก</button>
    </form>

    <table class="w-full border">
        <thead class="bg-slate-100">
            <tr><th class="p-2 text-left">ลำดับ</th><th class="text-left">ประเภท</th><th class="text-left">ชื่อ/ไฟล์</th><th class="text-left">ระยะเวลา</th><th class="text-left">สถานะ</th><th></th></tr>
        </thead>
        <tbody>
            @foreach($items as $item)
            <tr class="border-t">
                <td class="p-2">{{ $item->sort_order }}</td>
                <td>{{ $item->media_type }}</td>
                <td>
                    <span class="block truncate w-48">{{ $item->title ?? 'ไม่มีชื่อ' }}</span>
                    <a href="{{ $item->file_path }}" target="_blank" class="text-blue-500 text-xs">ดูไฟล์</a>
                </td>
                <td>{{ $item->media_type === 'image' ? $item->duration_seconds . 's' : '-' }}</td>
                <td>
                    <form method="POST" action="{{ route('admin.tv.playlist.toggle', $item) }}">
                        @csrf @method('PATCH')
                        <button class="px-2 py-1 rounded {{ $item->is_active ? 'bg-green-200' : 'bg-red-200' }}">
                            {{ $item->is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
                        </button>
                    </form>
                </td>
                <td>
                    <form method="POST" action="{{ route('admin.tv.playlist.destroy', $item) }}"
                          onsubmit="return confirm('ยืนยันลบ?')">
                        @csrf @method('DELETE')
                        <button class="text-red-600">ลบ</button>
                    </form>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endsection
