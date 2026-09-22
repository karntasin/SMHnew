@extends('layouts.admin')
@section('content')
<div class="max-w-4xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">จับคู่ห้องตรวจ HOSxP ↔ ชื่อที่แสดงบนทีวี</h1>

    <form method="POST" action="{{ route($routePrefix . 'rooms.store', $boardKey) }}" class="flex gap-2 mb-6">
        @csrf
        <input type="text" name="hosxp_cur_dep" placeholder="cur_dep เช่น 002" required class="border rounded p-2">
        <input type="text" name="display_name" placeholder="ชื่อที่แสดง" required class="border rounded p-2 flex-1">
        <input type="number" name="sort_order" placeholder="ลำดับ" class="border rounded p-2 w-24">
        <button class="bg-blue-600 text-white px-4 rounded">เพิ่ม</button>
    </form>

    <table class="w-full border">
        <thead class="bg-slate-100">
            <tr><th class="p-2 text-left">cur_dep</th><th class="text-left">ชื่อที่แสดง</th><th class="text-left">ลำดับ</th><th class="text-left">สถานะ</th><th></th></tr>
        </thead>
        <tbody>
            @foreach($rooms as $room)
            <tr class="border-t">
                <td class="p-2">{{ $room->hosxp_cur_dep }}</td>
                <td>{{ $room->display_name }}</td>
                <td>{{ $room->sort_order }}</td>
                <td>
                    <form method="POST" action="{{ route($routePrefix . 'rooms.toggle', $room) }}">
                        @csrf @method('PATCH')
                        <button class="px-2 py-1 rounded {{ $room->is_active ? 'bg-green-200' : 'bg-red-200' }}">
                            {{ $room->is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
                        </button>
                    </form>
                </td>
                <td>
                    <form method="POST" action="{{ route($routePrefix . 'rooms.destroy', $room) }}"
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
