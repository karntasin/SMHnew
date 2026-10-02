@extends('layouts.admin')
@section('content')
@php
    $boardIdentifier = strtolower(trim($boardKey ?? ($setting->board_key ?? 'default')));
    $pendingCount = count($pendingPatients ?? []);
    $appointmentCount = collect($pendingPatients ?? [])->filter(fn($p) => !empty($p['is_appointment']))->count();
    $generalCount = $pendingCount - $appointmentCount;
    $labCount = collect($pendingPatients ?? [])->filter(fn($p) => !empty($p['has_lab']))->count();
    $xrayCount = collect($pendingPatients ?? [])->filter(fn($p) => !empty($p['has_xray']))->count();
    $callingCount = collect($pendingPatients ?? [])->filter(fn($p) => ($p['status'] ?? '') === 'calling')->count();
@endphp

<div class="max-w-5xl mx-auto p-6" x-data="{
    enabled: {{ ($setting->screening_enabled ?? true) ? 'true' : 'false' }},
    rotateSeconds: {{ $setting->screening_rotate_seconds ?? 60 }},
    title: '{{ addslashes($setting->screening_title ?: "ผู้ป่วยรอซักประวัติ / คัดกรอง") }}',
    subtitle: '{{ addslashes($setting->screening_subtitle ?: "จุดคัดกรองห้องตรวจโรคภายนอก (002)") }}',
    showAppointment: {{ ($setting->screening_show_appointment ?? true) ? 'true' : 'false' }},
    showOrderTime: {{ ($setting->screening_show_order_time ?? true) ? 'true' : 'false' }},
    fontOqueue: '{{ $setting->font_screening_oqueue ?? "auto" }}',
    fontName: '{{ $setting->font_screening_name ?? "auto" }}'
}">
    @include('admin.tv.header')

    @if(session('status'))
        <div class="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 shadow-xs">
            <svg class="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <span class="font-bold">{{ session('status') }}</span>
        </div>
    @endif

    @if($errors->any())
        <div class="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl shadow-xs">
            <ul class="list-disc pl-5 space-y-1 text-sm font-medium">
                @foreach($errors->all() as $error)
                    <li>{{ $error }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    <!-- ─── ส่วนที่ 1: สถานะภาพรวมผู้ป่วยรอคัดกรองในระบบขณะนี้ (Live Stats) ─── -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl text-indigo-600">
                👥
            </div>
            <div>
                <span class="text-xs font-bold text-slate-500 block">รอคัดกรองทั้งหมด</span>
                <span class="text-2xl font-black text-slate-900">{{ $pendingCount }}</span>
                <span class="text-xs text-slate-400">ราย</span>
            </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl text-emerald-600">
                📅
            </div>
            <div>
                <span class="text-xs font-bold text-slate-500 block">ผู้ป่วยนัด</span>
                <span class="text-2xl font-black text-emerald-600">{{ $appointmentCount }}</span>
                <span class="text-xs text-slate-400">ราย</span>
            </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-2xl text-purple-600">
                🧪
            </div>
            <div>
                <span class="text-xs font-bold text-slate-500 block">นัดตรวจ LAB</span>
                <span class="text-2xl font-black text-purple-600">{{ $labCount }}</span>
                <span class="text-xs text-slate-400">ราย</span>
            </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl text-amber-600">
                🩻
            </div>
            <div>
                <span class="text-xs font-bold text-slate-500 block">นัดตรวจ X-RAY</span>
                <span class="text-2xl font-black text-amber-600">{{ $xrayCount }}</span>
                <span class="text-xs text-slate-400">ราย</span>
            </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-xl bg-yellow-50 border border-yellow-200 flex items-center justify-center text-2xl text-yellow-600">
                📢
            </div>
            <div>
                <span class="text-xs font-bold text-slate-500 block">กำลังคัดกรอง</span>
                <span class="text-2xl font-black text-yellow-600">{{ $callingCount }}</span>
                <span class="text-xs text-slate-400">ราย</span>
            </div>
        </div>
    </div>

    <!-- ─── ส่วนที่ 2: ฟอร์มตั้งค่าจอรอซักประวัติ (002) ─── -->
    <form method="POST" action="{{ route('admin.tv.settings.update', $setting->board_key) }}" class="space-y-6 mb-10">
        @csrf @method('PUT')

        <!-- Hidden preserves other TV display settings -->
        <input type="hidden" name="left_media_mode" value="{{ $setting->left_media_mode }}">
        <input type="hidden" name="left_panel_width_percent" value="{{ $setting->left_panel_width_percent }}">
        <input type="hidden" name="queue_poll_seconds" value="{{ $setting->queue_poll_seconds }}">
        <input type="hidden" name="chime_enabled" value="{{ $setting->chime_enabled ? '1' : '0' }}">
        <input type="hidden" name="tts_enabled" value="{{ $setting->tts_enabled ? '1' : '0' }}">
        <input type="hidden" name="tts_voice_locale" value="{{ $setting->tts_voice_locale }}">
        <input type="hidden" name="rss_feed_url" value="{{ $setting->rss_feed_url }}">
        <input type="hidden" name="font_room_title" value="{{ $setting->font_room_title }}">
        <input type="hidden" name="font_calling_no" value="{{ $setting->font_calling_no }}">
        <input type="hidden" name="font_calling_name" value="{{ $setting->font_calling_name }}">
        <input type="hidden" name="font_waiting_no" value="{{ $setting->font_waiting_no }}">
        <input type="hidden" name="font_waiting_name" value="{{ $setting->font_waiting_name }}">
        <input type="hidden" name="bg_color" value="{{ $setting->bg_color }}">
        <input type="hidden" name="show_wait_badge" value="{{ $setting->show_wait_badge ? '1' : '0' }}">
        <input type="hidden" name="lab_xray_enabled" value="{{ $setting->lab_xray_enabled ? '1' : '0' }}">
        <input type="hidden" name="lab_xray_rotate_seconds" value="{{ $setting->lab_xray_rotate_seconds }}">
        <input type="hidden" name="lab_xray_title" value="{{ $setting->lab_xray_title }}">
        <input type="hidden" name="lab_xray_subtitle" value="{{ $setting->lab_xray_subtitle }}">
        <input type="hidden" name="lab_xray_show_confirmed" value="{{ $setting->lab_xray_show_confirmed ? '1' : '0' }}">
        <input type="hidden" name="lab_xray_show_order_time" value="{{ $setting->lab_xray_show_order_time ? '1' : '0' }}">
        <input type="hidden" name="font_lab_oqueue" value="{{ $setting->font_lab_oqueue }}">
        <input type="hidden" name="font_lab_name" value="{{ $setting->font_lab_name }}">

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-indigo-200">
            <div class="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                <div>
                    <h2 class="text-lg font-black text-slate-900 flex items-center gap-2">
                        <span class="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">📋</span>
                        ตั้งค่าการแสดงผลหน้ารอซักประวัติ (002) บนจอทีวี
                    </h2>
                    <p class="text-xs text-slate-500 mt-1">กำหนดการสลับหน้าจออัตโนมัติ ข้อความหัวข้อ ขนาดตัวอักษร และแท็กแสดงสถานะผู้ป่วยนัด/ตรวจแล็บ-เอกซเรย์</p>
                </div>
                <span class="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                    OPD Screening (002)
                </span>
            </div>

            <!-- เปิด/ปิด และความถี่การสลับหน้าจอ -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <label class="flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-colors"
                       :class="enabled ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-slate-50'">
                    <input type="checkbox" name="screening_enabled" value="1" x-model="enabled"
                           class="w-5 h-5 mt-0.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500">
                    <div>
                        <span class="text-sm font-bold text-slate-800">🔄 เปิดใช้งานระบบสลับหน้าจออัตโนมัติ (Auto-Rotate)</span>
                        <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                            เมื่อเปิดใช้งาน จอทีวีจะสลับไปแสดงหน้า <strong>"รายชื่อผู้ป่วยรอซักประวัติ (002)"</strong> ตามเวลาที่กำหนด
                        </p>
                    </div>
                </label>

                <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <div>
                        <label class="block text-sm font-bold text-slate-800 mb-1">⏱️ สลับหน้าจอทุกๆ (วินาที)</label>
                        <p class="text-xs text-slate-500 mb-2">ระยะเวลาที่ค้างไว้ในหน้ารอซักประวัติ ก่อนสลับไปหน้าถัดไป</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <select name="screening_rotate_seconds" x-model.number="rotateSeconds"
                                class="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-sm font-bold focus:ring-2 focus:ring-indigo-500">
                            @foreach([20 => '20 วินาที (สลับเร็ว)', 30 => '30 วินาที', 45 => '45 วินาที', 60 => '60 วินาที (แนะนำ)', 90 => '90 วินาที (1 นาทีครึ่ง)', 120 => '120 วินาที (2 นาที)', 180 => '180 วินาที (3 นาที)'] as $sec => $label)
                                <option value="{{ $sec }}" @selected(($setting->screening_rotate_seconds ?? 60) == $sec)>{{ $label }}</option>
                            @endforeach
                        </select>
                    </div>
                </div>
            </div>

            <!-- ข้อความหัวข้อ และคำอธิบาย -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">ชื่อหัวข้อบนจอทีวี</label>
                    <input type="text" name="screening_title" x-model="title"
                           class="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                           placeholder="เช่น ผู้ป่วยรอซักประวัติ / คัดกรอง">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">คำอธิบายใต้หัวข้อ</label>
                    <input type="text" name="screening_subtitle" x-model="subtitle"
                           class="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                           placeholder="เช่น จุดคัดกรองห้องตรวจโรคภายนอก (002)">
                </div>
            </div>

            <!-- ขนาดตัวอักษรและตัวเลือกแสดงผล -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-5 pt-3 border-t border-slate-100">
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">ขนาดเลขคิว (Queue No)</label>
                    <select name="font_screening_oqueue" x-model="fontOqueue"
                            class="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-sm focus:ring-2 focus:ring-indigo-500">
                        <option value="auto">🔄 อัตโนมัติ (ตามขนาดจอ)</option>
                        @foreach([
                            '24' => '24px — ปกติ',
                            '28' => '28px — ปานกลาง',
                            '32' => '32px — ใหญ่ (แนะนำ)',
                            '36' => '36px — ใหญ่มาก',
                            '40' => '40px — ใหญ่พิเศษ',
                            '48' => '48px — จัมโบ้',
                            '56' => '56px — จัมโบ้ XL',
                            '64' => '64px — จัมโบ้ XXL',
                            '72' => '72px — จัมโบ้ XXXL',
                            '80' => '80px — ยักษ์'
                        ] as $fVal => $fLabel)
                            <option value="{{ $fVal }}" @selected(($setting->font_screening_oqueue ?? 'auto') === $fVal)>{{ $fLabel }}</option>
                        @endforeach
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">ขนาดชื่อคนไข้ (Patient Name)</label>
                    <select name="font_screening_name" x-model="fontName"
                            class="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-sm focus:ring-2 focus:ring-indigo-500">
                        <option value="auto">🔄 อัตโนมัติ (ตามขนาดจอ)</option>
                        @foreach([
                            '18' => '18px — ปกติ',
                            '20' => '20px — ชัดเจน',
                            '24' => '24px — ปานกลาง',
                            '28' => '28px — ใหญ่ (แนะนำ)',
                            '32' => '32px — ใหญ่มาก (แนะนำ 43 นิ้ว)',
                            '36' => '36px — ใหญ่พิเศษ',
                            '40' => '40px — จัมโบ้',
                            '48' => '48px — จัมโบ้ XL',
                            '56' => '56px — จัมโบ้ XXL',
                            '64' => '64px — ยักษ์'
                        ] as $fVal => $fLabel)
                            <option value="{{ $fVal }}" @selected(($setting->font_screening_name ?? 'auto') === $fVal)>{{ $fLabel }}</option>
                        @endforeach
                    </select>
                </div>

                <div class="flex items-center pt-5">
                    <label class="inline-flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="screening_show_appointment" value="1" x-model="showAppointment"
                               class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500">
                        <span class="text-xs font-bold text-slate-700">🏷️ แสดงแท็ก นัด/ไม่ได้นัด & ตรวจ Lab/X-ray</span>
                    </label>
                </div>

                <div class="flex items-center pt-5">
                    <label class="inline-flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="screening_show_order_time" value="1" x-model="showOrderTime"
                               class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500">
                        <span class="text-xs font-bold text-slate-700">⏱️ แสดงเวลามาถึง & เวลารอคอย</span>
                    </label>
                </div>
            </div>

            <!-- ─── Live Preview ตัวอย่างหน้าจอ ─── -->
            <div class="mt-6 pt-5 border-t border-slate-100">
                <span class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">👁️ ตัวอย่างการแสดงผลบนจอทีวี (Live Preview)</span>
                <div class="bg-slate-950 p-4 md:p-5 rounded-2xl border border-slate-800">
                    <!-- Preview Header Bar -->
                    <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                        <div class="flex items-center gap-3">
                            <span class="text-3xl">📋</span>
                            <div>
                                <h3 class="text-base md:text-lg font-black text-amber-300" x-text="title"></h3>
                                <p class="text-xs text-slate-400" x-text="subtitle"></p>
                            </div>
                        </div>
                        <span class="text-xs font-bold px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">
                            รอคัดกรองทั้งหมด 4 ราย
                        </span>
                    </div>

                    <!-- Preview Cards Grid -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-stretch">
                        <!-- Example 1: Calling Queue -->
                        <div class="bg-gradient-to-br from-yellow-950/70 via-slate-900 to-slate-900 rounded-2xl p-4 border-2 border-yellow-400/90 shadow-lg shadow-yellow-500/10 flex flex-col justify-between transition-all">
                            <div>
                                <div class="flex justify-between items-start mb-2 gap-2">
                                    <span class="font-black text-yellow-300 tracking-tight leading-none" :style="fontOqueue === 'auto' ? 'font-size: 1.75rem' : 'font-size: ' + fontOqueue + 'px'">125</span>
                                    <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-yellow-400 text-slate-950 animate-pulse shadow-sm">📢 กำลังเรียก</span>
                                </div>
                                <div class="font-bold text-white break-words leading-tight mb-3 drop-shadow-sm" :style="fontName === 'auto' ? 'font-size: 1.25rem' : 'font-size: ' + fontName + 'px'">นางกัณฑ์มณี ศรีป***</div>
                            </div>
                            <div class="pt-2 border-t border-slate-700/60 flex flex-col gap-1.5">
                                <template x-if="showAppointment">
                                    <div class="flex flex-wrap items-center gap-1.5">
                                        <span class="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 inline-flex items-center gap-1 shadow-xs">
                                            <span>📅 ผู้ป่วยนัด</span>
                                        </span>
                                        <span class="px-2 py-1 rounded-lg text-xs font-black bg-purple-950/90 text-purple-300 border border-purple-500/60 inline-flex items-center gap-1 shadow-xs">
                                            <span>🧪 มีตรวจ LAB</span>
                                        </span>
                                    </div>
                                </template>
                                <template x-if="showOrderTime">
                                    <div class="text-[11px] text-slate-300 bg-black/40 px-2.5 py-1 rounded-md border border-slate-800 flex justify-between font-bold">
                                        <span>มาถึง: 09:13</span>
                                        <span class="text-amber-400">รอ 5 นาที</span>
                                    </div>
                                </template>
                            </div>
                        </div>

                        <!-- Example 2: Appointment with X-ray -->
                        <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700 shadow-md flex flex-col justify-between transition-all">
                            <div>
                                <div class="flex justify-between items-start mb-2 gap-2">
                                    <span class="font-black text-amber-300 tracking-tight leading-none" :style="fontOqueue === 'auto' ? 'font-size: 1.75rem' : 'font-size: ' + fontOqueue + 'px'">126</span>
                                    <span class="text-xs font-bold text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-700">รอซักประวัติ</span>
                                </div>
                                <div class="font-bold text-white break-words leading-tight mb-3 drop-shadow-sm" :style="fontName === 'auto' ? 'font-size: 1.25rem' : 'font-size: ' + fontName + 'px'">นายพิรพัฒน์ ศรีป***</div>
                            </div>
                            <div class="pt-2 border-t border-slate-700/60 flex flex-col gap-1.5">
                                <template x-if="showAppointment">
                                    <div class="flex flex-wrap items-center gap-1.5">
                                        <span class="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 inline-flex items-center gap-1 shadow-xs">
                                            <span>📅 ผู้ป่วยนัด</span>
                                        </span>
                                        <span class="px-2 py-1 rounded-lg text-xs font-black bg-amber-950/90 text-amber-300 border border-amber-500/60 inline-flex items-center gap-1 shadow-xs">
                                            <span>🩻 มีตรวจ X-RAY</span>
                                        </span>
                                    </div>
                                </template>
                                <template x-if="showOrderTime">
                                    <div class="text-[11px] text-slate-300 bg-black/40 px-2.5 py-1 rounded-md border border-slate-800 flex justify-between font-bold">
                                        <span>มาถึง: 09:13</span>
                                        <span class="text-amber-400">รอ 5 นาที</span>
                                    </div>
                                </template>
                            </div>
                        </div>

                        <!-- Example 3: Appointment with Both Lab & X-ray -->
                        <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700 shadow-md flex flex-col justify-between transition-all">
                            <div>
                                <div class="flex justify-between items-start mb-2 gap-2">
                                    <span class="font-black text-amber-300 tracking-tight leading-none" :style="fontOqueue === 'auto' ? 'font-size: 1.75rem' : 'font-size: ' + fontOqueue + 'px'">127</span>
                                    <span class="text-xs font-bold text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-700">รอซักประวัติ</span>
                                </div>
                                <div class="font-bold text-white break-words leading-tight mb-3 drop-shadow-sm" :style="fontName === 'auto' ? 'font-size: 1.25rem' : 'font-size: ' + fontName + 'px'">น.ส.พิมพ์ชนก ปัญญา***</div>
                            </div>
                            <div class="pt-2 border-t border-slate-700/60 flex flex-col gap-1.5">
                                <template x-if="showAppointment">
                                    <div class="flex flex-wrap items-center gap-1.5">
                                        <span class="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 inline-flex items-center gap-1 shadow-xs">
                                            <span>📅 ผู้ป่วยนัด</span>
                                        </span>
                                        <span class="px-2 py-1 rounded-lg text-xs font-black bg-purple-950/90 text-purple-300 border border-purple-500/60 inline-flex items-center gap-1 shadow-xs">
                                            <span>🧪 LAB</span>
                                        </span>
                                        <span class="px-2 py-1 rounded-lg text-xs font-black bg-amber-950/90 text-amber-300 border border-amber-500/60 inline-flex items-center gap-1 shadow-xs">
                                            <span>🩻 X-RAY</span>
                                        </span>
                                    </div>
                                </template>
                                <template x-if="showOrderTime">
                                    <div class="text-[11px] text-slate-300 bg-black/40 px-2.5 py-1 rounded-md border border-slate-800 flex justify-between font-bold">
                                        <span>มาถึง: 09:14</span>
                                        <span class="text-amber-400">รอ 4 นาที</span>
                                    </div>
                                </template>
                            </div>
                        </div>

                        <!-- Example 4: General patient (No appointment) -->
                        <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700 shadow-md flex flex-col justify-between transition-all">
                            <div>
                                <div class="flex justify-between items-start mb-2 gap-2">
                                    <span class="font-black text-amber-300 tracking-tight leading-none" :style="fontOqueue === 'auto' ? 'font-size: 1.75rem' : 'font-size: ' + fontOqueue + 'px'">130</span>
                                    <span class="text-xs font-bold text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-700">รอซักประวัติ</span>
                                </div>
                                <div class="font-bold text-white break-words leading-tight mb-3 drop-shadow-sm" :style="fontName === 'auto' ? 'font-size: 1.25rem' : 'font-size: ' + fontName + 'px'">นายประเสริฐ รัตนพานิชย์***</div>
                            </div>
                            <div class="pt-2 border-t border-slate-700/60 flex flex-col gap-1.5">
                                <template x-if="showAppointment">
                                    <div class="flex flex-wrap items-center gap-1.5">
                                        <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 inline-flex items-center gap-1">
                                            <span>⚪ ไม่ได้นัด (ทั่วไป)</span>
                                        </span>
                                    </div>
                                </template>
                                <template x-if="showOrderTime">
                                    <div class="text-[11px] text-slate-300 bg-black/40 px-2.5 py-1 rounded-md border border-slate-800 flex justify-between font-bold">
                                        <span>มาถึง: 09:17</span>
                                        <span class="text-amber-400">รอ 1 นาที</span>
                                    </div>
                                </template>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ปุ่มบันทึก -->
            <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span class="text-xs text-slate-400">การตั้งค่าจะมีผลทันทีต่อหน้าจอทีวีผู้ป่วยนอกหลังจากกดบันทึก</span>
                <button type="submit" class="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all hover:scale-105">
                    💾 บันทึกการตั้งค่า
                </button>
            </div>
        </div>
    </form>

    <!-- ─── ส่วนที่ 3: ตารางมอนิเตอร์รายชื่อผู้ป่วยรอคัดกรองจริง (002) จาก HOSxP ─── -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div>
                <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>📋 รายชื่อผู้ป่วยรอซักประวัติ ณ จุดคัดกรอง (002) ขณะนี้</span>
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{{ $pendingCount }} ราย</span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">ดึงข้อมูลสดจาก HOSxP (ตาราง ovst แผนก cur_dep = '002' วันนี้) ผ่านการคุ้มครองข้อมูลส่วนบุคคล (PDPA)</p>
            </div>
            <button type="button" onclick="window.location.reload()"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                <span>รีเฟรชข้อมูล</span>
            </button>
        </div>

        @if($pendingCount === 0)
            <div class="p-12 text-center text-slate-400">
                <span class="text-4xl block mb-2">🎉</span>
                <span class="font-bold text-slate-600 block">ไม่มีผู้ป่วยรอคัดกรองในขณะนี้</span>
                <span class="text-xs text-slate-400">ระบบคัดกรองเคลียร์คิวเรียบร้อย หรือยังไม่มีผู้ป่วยมาถึงจุดคัดกรอง</span>
            </div>
        @else
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                            <th class="py-3 px-4 w-20 text-center">คิว</th>
                            <th class="py-3 px-4">ชื่อ-นามสกุล (PDPA)</th>
                            <th class="py-3 px-4">สถานะการนัดหมาย</th>
                            <th class="py-3 px-4">ตรวจเพิ่มเติม</th>
                            <th class="py-3 px-4 text-center">เวลามาถึง</th>
                            <th class="py-3 px-4 text-center">เวลารอคอย</th>
                            <th class="py-3 px-4 text-center">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        @foreach($pendingPatients as $patient)
                        <tr class="hover:bg-slate-50/80 transition-colors {{ ($patient['status'] ?? '') === 'calling' ? 'bg-yellow-50/50' : '' }}">
                            <td class="py-3.5 px-4 text-center font-black text-base text-slate-900 font-mono">
                                {{ $patient['oqueue'] }}
                            </td>
                            <td class="py-3.5 px-4 font-bold text-slate-800">
                                {{ $patient['display_name'] }}
                            </td>
                            <td class="py-3.5 px-4">
                                @if(!empty($patient['is_appointment']))
                                    <span class="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                                        <span>📅 ผู้ป่วยนัด</span>
                                    </span>
                                @else
                                    <span class="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                                        <span>⚪ ไม่ได้นัด (ทั่วไป)</span>
                                    </span>
                                @endif
                            </td>
                            <td class="py-3.5 px-4">
                                <div class="flex flex-wrap items-center gap-1.5">
                                    @if(!empty($patient['has_lab']))
                                        <span class="px-2 py-0.5 rounded-md text-xs font-black bg-purple-100 text-purple-800 border border-purple-300 inline-flex items-center gap-1"
                                              title="{{ $patient['lab_list_text'] ?? 'ตรวจทางห้องปฏิบัติการ' }}">
                                            <span>🧪 ตรวจ LAB</span>
                                        </span>
                                    @endif
                                    @if(!empty($patient['has_xray']))
                                        <span class="px-2 py-0.5 rounded-md text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1"
                                              title="{{ $patient['xray_list_text'] ?? 'ตรวจทางรังสีวิทยา' }}">
                                            <span>🩻 ตรวจ X-RAY</span>
                                        </span>
                                    @endif
                                    @if(empty($patient['has_lab']) && empty($patient['has_xray']))
                                        <span class="text-xs text-slate-400">-</span>
                                    @endif
                                </div>
                            </td>
                            <td class="py-3.5 px-4 text-center text-xs font-mono font-bold text-slate-600">
                                {{ $patient['vsttime'] ?? '-' }}
                            </td>
                            <td class="py-3.5 px-4 text-center">
                                @php $wm = $patient['waited_minutes'] ?? 0; @endphp
                                <span class="px-2.5 py-1 rounded-md text-xs font-mono font-bold {{ $wm > 30 ? 'bg-rose-100 text-rose-800' : ($wm > 15 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700') }}">
                                    {{ $wm }} นาที
                                </span>
                            </td>
                            <td class="py-3.5 px-4 text-center">
                                @if(($patient['status'] ?? '') === 'calling')
                                    <span class="px-2.5 py-1 rounded-full text-xs font-black bg-yellow-400 text-slate-950 animate-pulse inline-flex items-center gap-1 shadow-xs">
                                        <span>📢 กำลังเรียก</span>
                                    </span>
                                @else
                                    <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 inline-flex items-center gap-1">
                                        <span>⏳ รอเรียก</span>
                                    </span>
                                @endif
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endif
    </div>
</div>
@endsection
