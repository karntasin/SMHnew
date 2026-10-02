@extends('layouts.admin')
@section('content')
@php
    $boardIdentifier = strtolower(trim($boardKey ?? ($setting->board_key ?? 'default')));
    $pendingCount = count($pendingPatients ?? []);
    $labPendingCount = collect($pendingPatients ?? [])->filter(fn($p) => $p['has_lab'] && $p['lab_status'] !== 'confirmed')->count();
    $xrayPendingCount = collect($pendingPatients ?? [])->filter(fn($p) => $p['has_xray'] && $p['xray_status'] !== 'confirmed')->count();
    $confirmedCount = collect($pendingPatients ?? [])->filter(fn($p) => ($p['has_lab'] && $p['lab_status'] === 'confirmed') || ($p['has_xray'] && $p['xray_status'] === 'confirmed'))->count();
@endphp

<div class="max-w-5xl mx-auto p-6" x-data="{
    enabled: {{ ($setting->lab_xray_enabled ?? true) ? 'true' : 'false' }},
    rotateSeconds: {{ $setting->lab_xray_rotate_seconds ?? 60 }},
    title: '{{ addslashes($setting->lab_xray_title ?: "ผู้ป่วยรอผลตรวจ LAB & X-RAY") }}',
    subtitle: '{{ addslashes($setting->lab_xray_subtitle ?: "รายชื่อจะหายไปโดยอัตโนมัติเมื่อผลการตรวจออกครบทุกรายการ และสามารถเข้าตรวจต่อได้ทันที") }}',
    showOrderTime: {{ ($setting->lab_xray_show_order_time ?? true) ? 'true' : 'false' }},
    fontOqueue: '{{ $setting->font_lab_oqueue ?? "auto" }}',
    fontName: '{{ $setting->font_lab_name ?? "auto" }}'
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

    <!-- ─── ส่วนที่ 1: สถานะภาพรวมผู้ป่วยรอผลตรวจในระบบขณะนี้ (Live Stats) ─── -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl text-indigo-600">
                👥
            </div>
            <div>
                <span class="text-xs font-bold text-slate-500 block">รอผลทั้งหมด</span>
                <span class="text-2xl font-black text-slate-900">{{ $pendingCount }}</span>
                <span class="text-xs text-slate-400">ราย</span>
            </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl text-amber-600">
                🔬
            </div>
            <div>
                <span class="text-xs font-bold text-slate-500 block">รอผล LAB</span>
                <span class="text-2xl font-black text-amber-600">{{ $labPendingCount }}</span>
                <span class="text-xs text-slate-400">ราย</span>
            </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-2xl text-sky-600">
                📷
            </div>
            <div>
                <span class="text-xs font-bold text-slate-500 block">รอผล X-RAY</span>
                <span class="text-2xl font-black text-sky-600">{{ $xrayPendingCount }}</span>
                <span class="text-xs text-slate-400">ราย</span>
            </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl text-emerald-600">
                ✅
            </div>
            <div>
                <span class="text-xs font-bold text-slate-500 block">ผลออกบางส่วน/ครบ</span>
                <span class="text-2xl font-black text-emerald-600">{{ $confirmedCount }}</span>
                <span class="text-xs text-slate-400">ราย</span>
            </div>
        </div>
    </div>

    <!-- ─── ส่วนที่ 2: ฟอร์มตั้งค่าจอรอผลตรวจ LAB & X-RAY ─── -->
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

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-indigo-200">
            <div class="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                <div>
                    <h2 class="text-lg font-black text-slate-900 flex items-center gap-2">
                        <span class="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">⚙️</span>
                        ตั้งค่าการแสดงผลหน้ารอผลตรวจ LAB & X-RAY บนจอทีวี
                    </h2>
                    <p class="text-xs text-slate-500 mt-1">กำหนดการสลับหน้าจออัตโนมัติ ข้อความหัวข้อ และรูปแบบตัวอักษรของหน้ารอผลตรวจบนจอทีวีผู้ป่วยนอก</p>
                </div>
                <span class="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                    OPD Lab & X-Ray View
                </span>
            </div>

            <!-- เปิด/ปิด และความถี่การสลับหน้าจอ -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <label class="flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-colors"
                       :class="enabled ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-slate-50'">
                    <input type="checkbox" name="lab_xray_enabled" value="1" x-model="enabled"
                           class="w-5 h-5 mt-0.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500">
                    <div>
                        <span class="text-sm font-bold text-slate-800">🔄 เปิดใช้งานระบบสลับหน้าจออัตโนมัติ (Auto-Rotate)</span>
                        <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                            เมื่อเปิดใช้งาน จอทีวีจะสลับระหว่าง <strong>"คิวห้องตรวจ"</strong> และ <strong>"รายชื่อรอผล LAB & X-RAY"</strong> โดยอัตโนมัติตามเวลาที่กำหนด
                        </p>
                    </div>
                </label>

                <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <div>
                        <label class="block text-sm font-bold text-slate-800 mb-1">⏱️ สลับหน้าจอทุกๆ (วินาที)</label>
                        <p class="text-xs text-slate-500 mb-2">ระยะเวลาที่ค้างไว้ในหน้ารอผลตรวจ ก่อนสลับกลับไปหน้าห้องตรวจ</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <select name="lab_xray_rotate_seconds" x-model.number="rotateSeconds"
                                class="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-sm font-bold focus:ring-2 focus:ring-indigo-500">
                            @foreach([20 => '20 วินาที (สลับเร็ว)', 30 => '30 วินาที', 45 => '45 วินาที', 60 => '60 วินาที (แนะนำ)', 90 => '90 วินาที (1 นาทีครึ่ง)', 120 => '120 วินาที (2 นาที)', 180 => '180 วินาที (3 นาที)'] as $sec => $label)
                                <option value="{{ $sec }}" @selected(($setting->lab_xray_rotate_seconds ?? 60) == $sec)>{{ $label }}</option>
                            @endforeach
                        </select>
                    </div>
                </div>
            </div>

            <!-- ข้อความหัวข้อ และคำอธิบาย -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">ชื่อหัวข้อบนจอทีวี</label>
                    <input type="text" name="lab_xray_title" x-model="title"
                           class="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                           placeholder="เช่น ผู้ป่วยรอผลตรวจ LAB & X-RAY">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">คำอธิบายใต้หัวข้อ</label>
                    <input type="text" name="lab_xray_subtitle" x-model="subtitle"
                           class="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                           placeholder="คำชี้แจงสำหรับคนไข้">
                </div>
            </div>

            <!-- ขนาดตัวอักษรและเวลาสั่งตรวจ -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3 border-t border-slate-100">
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">ขนาดเลขคิว (Queue No)</label>
                    <select name="font_lab_oqueue" x-model="fontOqueue"
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
                            <option value="{{ $fVal }}" @selected(($setting->font_lab_oqueue ?? 'auto') === $fVal)>{{ $fLabel }}</option>
                        @endforeach
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">ขนาดชื่อคนไข้ (Patient Name)</label>
                    <select name="font_lab_name" x-model="fontName"
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
                            <option value="{{ $fVal }}" @selected(($setting->font_lab_name ?? 'auto') === $fVal)>{{ $fLabel }}</option>
                        @endforeach
                    </select>
                </div>

                <div class="flex items-center pt-5">
                    <label class="inline-flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="lab_xray_show_order_time" value="1" x-model="showOrderTime"
                               class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500">
                        <span class="text-xs font-bold text-slate-700">⏱️ แสดงเวลาสั่งตรวจ & เวลารอคอย</span>
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
                            <span class="text-3xl">🔬</span>
                            <div>
                                <h3 class="text-base md:text-lg font-black text-amber-300" x-text="title"></h3>
                                <p class="text-xs text-slate-400" x-text="subtitle"></p>
                            </div>
                        </div>
                        <span class="text-xs font-bold px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">
                            รอผลตรวจทั้งหมด 3 ราย
                        </span>
                    </div>

                    <!-- Preview Cards Grid -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 items-stretch">
                        <!-- Example 1: Pending Lab -->
                        <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700 shadow-md flex flex-col justify-between transition-all">
                            <div>
                                <div class="flex justify-between items-start mb-2 gap-2">
                                    <span class="font-black text-amber-300 tracking-tight leading-none" :style="fontOqueue === 'auto' ? 'font-size: 1.75rem' : 'font-size: ' + fontOqueue + 'px'">012</span>
                                    <span class="text-xs font-bold text-slate-200 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-700">ห้องตรวจ 1</span>
                                </div>
                                <div class="font-bold text-white break-words leading-tight mb-3 drop-shadow-sm" :style="fontName === 'auto' ? 'font-size: 1.25rem' : 'font-size: ' + fontName + 'px'">นายสมชาย ทวีโชคชัย***</div>
                            </div>
                            <div class="pt-2 border-t border-slate-700/60 flex flex-col gap-1.5">
                                <span class="px-3 py-1.5 rounded-xl text-xs md:text-sm font-black bg-amber-950/90 text-amber-300 border-2 border-amber-500/80 animate-pulse inline-flex items-center gap-1.5 w-fit shadow-sm">
                                    <span class="text-base md:text-lg leading-none">🔬</span>
                                    <span>รอผล LAB</span>
                                </span>
                                <template x-if="showOrderTime">
                                    <div class="text-[11px] text-slate-300 bg-black/40 px-2.5 py-1 rounded-md border border-slate-800 flex justify-between font-bold">
                                        <span>⏱️ สั่ง: 09:15</span>
                                        <span class="text-amber-400">รอ 25 นาที</span>
                                    </div>
                                </template>
                            </div>
                        </div>

                        <!-- Example 2: Pending X-ray -->
                        <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700 shadow-md flex flex-col justify-between transition-all">
                            <div>
                                <div class="flex justify-between items-start mb-2 gap-2">
                                    <span class="font-black text-amber-300 tracking-tight leading-none" :style="fontOqueue === 'auto' ? 'font-size: 1.75rem' : 'font-size: ' + fontOqueue + 'px'">015</span>
                                    <span class="text-xs font-bold text-slate-200 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-700">ห้องตรวจ 2</span>
                                </div>
                                <div class="font-bold text-white break-words leading-tight mb-3 drop-shadow-sm" :style="fontName === 'auto' ? 'font-size: 1.25rem' : 'font-size: ' + fontName + 'px'">นางสมหญิง สุขเกษมสมบูรณ์***</div>
                            </div>
                            <div class="pt-2 border-t border-slate-700/60 flex flex-col gap-1.5">
                                <span class="px-3 py-1.5 rounded-xl text-xs md:text-sm font-black bg-indigo-950/90 text-indigo-300 border-2 border-indigo-500/80 animate-pulse inline-flex items-center gap-1.5 w-fit shadow-sm">
                                    <span class="text-base md:text-lg leading-none">📷</span>
                                    <span>รอผล X-RAY</span>
                                </span>
                                <template x-if="showOrderTime">
                                    <div class="text-[11px] text-slate-300 bg-black/40 px-2.5 py-1 rounded-md border border-slate-800 flex justify-between font-bold">
                                        <span>⏱️ สั่ง: 09:20</span>
                                        <span class="text-amber-400">รอ 20 นาที</span>
                                    </div>
                                </template>
                            </div>
                        </div>

                        <!-- Example 3: Confirmed / Ready -->
                        <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-emerald-500/50 shadow-md flex flex-col justify-between transition-all">
                            <div>
                                <div class="flex justify-between items-start mb-2 gap-2">
                                    <span class="font-black text-emerald-300 tracking-tight leading-none" :style="fontOqueue === 'auto' ? 'font-size: 1.75rem' : 'font-size: ' + fontOqueue + 'px'">018</span>
                                    <span class="text-xs font-bold text-slate-200 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-700">ห้องตรวจ 3</span>
                                </div>
                                <div class="font-bold text-white break-words leading-tight mb-3 drop-shadow-sm" :style="fontName === 'auto' ? 'font-size: 1.25rem' : 'font-size: ' + fontName + 'px'">นายวิชัย พิทักษ์อุดมโชค***</div>
                            </div>
                            <div class="pt-2 border-t border-slate-700/60 flex flex-col gap-1.5">
                                <span class="px-3 py-1.5 rounded-xl text-xs md:text-sm font-black bg-emerald-950/90 text-emerald-300 border-2 border-emerald-500/80 inline-flex items-center gap-1.5 w-fit shadow-sm">
                                    <span class="text-base md:text-lg leading-none">✅</span>
                                    <span>ผลตรวจออกแล้ว</span>
                                </span>
                                <template x-if="showOrderTime">
                                    <div class="text-[11px] text-emerald-300 bg-black/40 px-2.5 py-1 rounded-md border border-slate-800 flex justify-between font-bold">
                                        <span>พร้อมเข้าพบแพทย์</span>
                                        <span>รอ 35 นาที</span>
                                    </div>
                                </template>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-6 flex justify-end">
                <button type="submit" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                    <span>บันทึกการตั้งค่า</span>
                </button>
            </div>
        </div>
    </form>

    <!-- ─── ส่วนที่ 3: ตารางแสดงรายชื่อผู้ป่วยที่กำลังรอผลตรวจจริงในระบบขณะนี้ (Live Patient Monitor) ─── -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
            <div>
                <h3 class="font-black text-slate-900 text-base flex items-center gap-2">
                    <span>📋</span>
                    <span>รายชื่อผู้ป่วยที่กำลังรอผลตรวจ LAB & X-RAY ขณะนี้ (ข้อมูลสด)</span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">ดึงข้อมูลจากตารางคำสั่งตรวจ LAB/X-RAY ใน HOSxP ของคลินิกที่เปิดใช้งานบนจอนี้</p>
            </div>
            <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                    พบผู้ป่วย {{ count($pendingPatients ?? []) }} ราย
                </span>
                <a href="{{ route('admin.tv.lab_xray.index', $boardKey) }}"
                   class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 shadow-2xs transition-colors flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    <span>รีเฟรชข้อมูล</span>
                </a>
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-200 bg-slate-100/60 text-slate-700 text-xs font-black uppercase tracking-wider">
                        <th class="py-3 px-4 w-20 text-center">คิว</th>
                        <th class="py-3 px-4">ชื่อ - นามสกุล</th>
                        <th class="py-3 px-4">ห้องตรวจ</th>
                        <th class="py-3 px-4 text-center">สถานะ LAB</th>
                        <th class="py-3 px-4 text-center">สถานะ X-RAY</th>
                        <th class="py-3 px-4 text-right">เวลาสั่งตรวจ / เวลารอ</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm">
                    @forelse($pendingPatients ?? [] as $p)
                    <tr class="hover:bg-slate-50/80 transition-colors">
                        <td class="py-3 px-4 text-center">
                            <span class="inline-block px-2.5 py-1 rounded-lg font-black text-sm bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {{ $p['oqueue'] }}
                            </span>
                        </td>
                        <td class="py-3 px-4">
                            <div class="font-bold text-slate-900">{{ $p['display_name'] }}</div>
                            @if(!empty($p['triage_name']))
                                <span class="text-[10px] font-black px-1.5 py-0.5 rounded border mt-0.5 inline-block"
                                      style="background-color: {{ $p['triage_color'] ?? '#64748b' }}20; color: {{ $p['triage_color'] ?? '#64748b' }}; border-color: {{ $p['triage_color'] ?? '#64748b' }}60;">
                                    {{ $p['triage_name'] }}
                                </span>
                            @endif
                        </td>
                        <td class="py-3 px-4 text-slate-600 font-medium">
                            <span class="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 border border-slate-200 text-slate-700">
                                {{ $p['display_room_name'] }}
                            </span>
                        </td>
                        <td class="py-3 px-4 text-center">
                            @if($p['has_lab'])
                                @if($p['lab_status'] === 'confirmed')
                                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                        <span class="text-sm">✅</span>
                                        <span>ผลออกแล้ว</span>
                                    </span>
                                @else
                                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 animate-pulse shadow-2xs">
                                        <span class="text-sm">🔬</span>
                                        <span>รอผลตรวจ</span>
                                    </span>
                                @endif
                            @else
                                <span class="text-slate-400 text-xs">—</span>
                            @endif
                        </td>
                        <td class="py-3 px-4 text-center">
                            @if($p['has_xray'])
                                @if($p['xray_status'] === 'confirmed')
                                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                        <span class="text-sm">✅</span>
                                        <span>ผลออกแล้ว</span>
                                    </span>
                                @else
                                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-300 animate-pulse shadow-2xs">
                                        <span class="text-sm">📷</span>
                                        <span>รอผลตรวจ</span>
                                    </span>
                                @endif
                            @else
                                <span class="text-slate-400 text-xs">—</span>
                            @endif
                        </td>
                        <td class="py-3 px-4 text-right">
                            @if($p['waited_minutes'] > 0 || $p['order_time'])
                                <div class="text-xs text-slate-700 font-bold">
                                    {{ $p['order_time'] ? 'สั่ง: ' . $p['order_time'] : '-' }}
                                </div>
                                <div class="text-xs font-black text-amber-600">
                                    รอ {{ $p['waited_minutes'] }} นาที
                                </div>
                            @else
                                <span class="text-slate-400 text-xs">-</span>
                            @endif
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="6" class="py-12 text-center text-slate-400">
                            <div class="text-3xl mb-2">✨</div>
                            <div class="font-bold text-slate-600">ไม่มีผู้ป่วยรอผลตรวจ LAB หรือ X-RAY ในขณะนี้</div>
                            <div class="text-xs text-slate-400 mt-1">ผู้ป่วยที่สั่งตรวจครบแล้ว หรือผลออกเรียบร้อยจะถูกส่งกลับเข้าห้องตรวจโดยอัตโนมัติ</div>
                        </td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
