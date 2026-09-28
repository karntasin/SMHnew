@extends('layouts.admin')
@section('content')
<div class="max-w-4xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">จัดการหน้าจอทีวี</h1>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        @php
            $boards = [
                '002' => 'หน้าจอจุดซักประวัติ / ห้องตรวจ',
                '003' => 'หน้าจอจุดห้องฉุกเฉิน',
                '013' => 'หน้าจอจุดห้องจ่ายยา'
            ];
        @endphp
        @foreach($boards as $key => $name)
        <div class="border rounded-lg p-4 bg-white shadow flex flex-col gap-3">
            <h2 class="font-bold text-lg">{{ $name }}</h2>
            <div class="text-sm text-gray-500">Board Key: {{ $key }}</div>
            <div class="flex gap-2">
                <a href="{{ route('admin.tv.rooms.index', $key) }}" class="text-blue-600 hover:underline">ตั้งค่าห้องตรวจ</a>
                <a href="{{ route('admin.tv.settings.edit', $key) }}" class="text-blue-600 hover:underline">ตั้งค่าการแสดงผล</a>
            </div>
            <a href="{{ route('tv.board', $key) }}" target="_blank" class="block text-center bg-emerald-600 text-white rounded py-2 mt-2">เปิดดูหน้าจอ</a>
        </div>
        @endforeach
    </div>
</div>
@endsection
