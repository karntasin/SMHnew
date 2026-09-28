@extends('layouts.admin')
@section('content')
@php
    $boardIdentifier = strtolower(trim($boardKey ?? ($setting->board_key ?? 'default')));
    $isDrug = in_array($boardIdentifier, ['013', 'drug', 'tv-drug', 'pharmacy']);
    $isEr = in_array($boardIdentifier, ['003', 'er', 'tv-er']);
@endphp
<style>
    /* ========================================================
       Triage 1 to 5 Styles (Pure CSS - Independent of Tailwind JIT)
       ======================================================== */
    .triage-item-1 {
        border-left: 14px solid #ef4444 !important;
        border-top: 2px solid rgba(239, 68, 68, 0.75) !important;
        border-right: 2px solid rgba(239, 68, 68, 0.75) !important;
        border-bottom: 2px solid rgba(239, 68, 68, 0.75) !important;
        background: linear-gradient(to right, #450a0a, #0f172a 80%) !important;
        box-shadow: 0 4px 15px rgba(239, 68, 68, 0.35) !important;
    }
    .triage-item-2 {
        border-left: 14px solid #f97316 !important;
        border-top: 2px solid rgba(249, 115, 22, 0.75) !important;
        border-right: 2px solid rgba(249, 115, 22, 0.75) !important;
        border-bottom: 2px solid rgba(249, 115, 22, 0.75) !important;
        background: linear-gradient(to right, #431407, #0f172a 80%) !important;
        box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3) !important;
    }
    .triage-item-3 {
        border-left: 14px solid #facc15 !important;
        border-top: 2px solid rgba(250, 204, 21, 0.8) !important;
        border-right: 2px solid rgba(250, 204, 21, 0.8) !important;
        border-bottom: 2px solid rgba(250, 204, 21, 0.8) !important;
        background: linear-gradient(to right, #422006, #0f172a 80%) !important;
        box-shadow: 0 4px 15px rgba(250, 204, 21, 0.3) !important;
    }
    .triage-item-4 {
        border-left: 14px solid #10b981 !important;
        border-top: 2px solid rgba(16, 185, 129, 0.75) !important;
        border-right: 2px solid rgba(16, 185, 129, 0.75) !important;
        border-bottom: 2px solid rgba(16, 185, 129, 0.75) !important;
        background: linear-gradient(to right, #064e3b, #0f172a 80%) !important;
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3) !important;
    }
    .triage-item-5 {
        border-left: 14px solid #ffffff !important;
        border-top: 2px solid rgba(255, 255, 255, 0.75) !important;
        border-right: 2px solid rgba(255, 255, 255, 0.75) !important;
        border-bottom: 2px solid rgba(255, 255, 255, 0.75) !important;
        background: linear-gradient(to right, #334155, #0f172a 80%) !important;
        box-shadow: 0 4px 15px rgba(255, 255, 255, 0.25) !important;
    }

    .triage-no-1 { background-color: #dc2626 !important; color: #ffffff !important; border: 2px solid #f87171 !important; }
    .triage-no-2 { background-color: #f97316 !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #fed7aa !important; text-shadow: none !important; }
    .triage-no-3 { background-color: #facc15 !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #fef08a !important; }
    .triage-no-4 { background-color: #059669 !important; color: #ffffff !important; border: 2px solid #34d399 !important; }
    .triage-no-5 { background-color: #ffffff !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #cbd5e1 !important; text-shadow: none !important; }

    .triage-badge-1 { background-color: #dc2626 !important; color: #ffffff !important; border: 2px solid #fca5a5 !important; }
    .triage-badge-2 { background-color: #f97316 !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #fed7aa !important; text-shadow: none !important; }
    .triage-badge-3 { background-color: #facc15 !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #fef08a !important; }
    .triage-badge-4 { background-color: #059669 !important; color: #ffffff !important; border: 2px solid #6ee7b7 !important; }
    .triage-badge-5 { background-color: #ffffff !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #cbd5e1 !important; text-shadow: none !important; }

    .triage-er-time { color: #fde68a !important; font-weight: 600; font-size: 0.825rem; }
</style>

<div class="max-w-4xl mx-auto p-6">
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

    <form method="POST" action="{{ route('admin.tv.settings.update', $setting->board_key) }}" class="space-y-8">
        @csrf @method('PUT')

        <!-- ─── ส่วนที่ 1: การตั้งค่าทั่วไป ─── -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 class="text-lg font-black text-slate-800 mb-5 flex items-center gap-2">
                <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                ตั้งค่าทั่วไป
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1.5">โหมดสื่อฝั่งซ้าย</label>
                    <select name="left_media_mode" class="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm">
                        @foreach(['video' => '🎥 วิดีโอ/YouTube วนซ้ำ', 'image_slider' => '🖼️ สไลด์ภาพ', 'rss_news' => '📰 ข่าว/ประกาศตัววิ่ง'] as $val => $label)
                            <option value="{{ $val }}" @selected($setting->left_media_mode === $val)>{{ $label }}</option>
                        @endforeach
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1.5">สัดส่วนฝั่งซ้าย (%)</label>
                    <select name="left_panel_width_percent" class="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm">
                        @foreach([30, 35, 40, 45, 50] as $pct)
                            <option value="{{ $pct }}" @selected($setting->left_panel_width_percent == $pct)>
                                สื่อ {{ $pct }}% / คิว {{ 100 - $pct }}%
                            </option>
                        @endforeach
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1.5">ความถี่รีเฟรชคิว (วินาที)</label>
                    <input type="number" name="queue_poll_seconds" value="{{ $setting->queue_poll_seconds }}"
                           min="3" max="60" class="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm">
                    <p class="text-xs text-slate-500 mt-1">ยิ่งน้อย ยิ่งอัปเดตเร็ว (แนะนำ 5-10 วินาที)</p>
                </div>

                <div class="flex flex-col justify-center gap-3">
                    <label class="inline-flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="chime_enabled" value="1" @checked($setting->chime_enabled)
                               class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500">
                        <span class="text-sm font-medium text-slate-700">🔔 เปิดเสียงเรียกคิว (Chime)</span>
                    </label>
                    <label class="inline-flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="tts_enabled" value="1" @checked($setting->tts_enabled)
                               class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500">
                        <span class="text-sm font-medium text-slate-700">🗣️ เปิดเสียงอ่านคิว (TTS)</span>
                    </label>
                </div>
            </div>
        </div>

        @if($isDrug)
        <!-- ─── ส่วนพิเศษ: ปรับแต่งคิวห้องจ่ายยา (2 คอลัมน์) ─── -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-emerald-200" x-data="{
            col1Title: '{{ $setting->drug_col1_title ?: "รอจ่ายยา" }}',
            col1Border: '{{ $setting->drug_col1_border_color ?: "#06b6d4" }}',
            col1Waiting: '{{ $setting->drug_col1_waiting_title ?: "คิวรอจ่ายยา" }}',
            col2Title: '{{ $setting->drug_col2_title ?: "รอจัดยา" }}',
            col2Border: '{{ $setting->drug_col2_border_color ?: "#f59e0b" }}',
            col2Waiting: '{{ $setting->drug_col2_waiting_title ?: "คิวรอจัดยา" }}'
        }">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                    <h2 class="text-lg font-black text-slate-900 flex items-center gap-2">
                        <span class="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">💊</span>
                        ปรับแต่งคิวห้องจ่ายยา (2 คอลัมน์: รอจ่ายยา 062 & รอจัดยา 013)
                    </h2>
                    <p class="text-xs text-slate-500 mt-1">กำหนดชื่อหัวข้อ สีกรอบ และป้ายกำกับคิวรอของแต่ละคอลัมน์เพื่อแบ่งแยกให้เห็นชัดเจนบนจอทีวี</p>
                </div>
                <span class="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                    Pharmacy Context
                </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- คอลัมน์ 1: จุดรับยา (062) -->
                <div class="bg-cyan-50/50 p-5 rounded-xl border border-cyan-200">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="font-bold text-cyan-900 flex items-center gap-2 text-sm">
                            <span class="w-3 h-3 rounded-full" :style="'background-color: ' + col1Border"></span>
                            คอลัมน์ 1: จุดรับยา (062)
                        </h3>
                        <span class="text-xs font-semibold px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded">แผนก 062</span>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">ชื่อหัวข้อคอลัมน์</label>
                            <input type="text" name="drug_col1_title" x-model="col1Title"
                                   class="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                   placeholder="เช่น รอจ่ายยา">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">🎨 สีกรอบคอลัมน์ 1 (Border Color)</label>
                            <div class="flex items-center gap-2">
                                <input type="color" x-model="col1Border" class="w-10 h-9 rounded border cursor-pointer p-0.5">
                                <input type="text" name="drug_col1_border_color" x-model="col1Border"
                                       class="flex-1 border border-slate-300 rounded-lg p-2 text-xs font-mono bg-white">
                            </div>
                            <div class="mt-2 flex items-center gap-2">
                                <span class="text-xs text-slate-400">แนะนำ:</span>
                                @foreach(['#06b6d4' => 'Cyan', '#0284c7' => 'Sky', '#10b981' => 'Emerald', '#3b82f6' => 'Blue', '#14b8a6' => 'Teal'] as $c => $lbl)
                                    <button type="button" @click="col1Border = '{{ $c }}'"
                                            class="w-6 h-6 rounded-full border-2 border-white shadow-xs hover:scale-110 transition-transform"
                                            style="background-color: {{ $c }}" title="{{ $lbl }}"></button>
                                @endforeach
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">ป้ายกำกับส่วนคิวรอ</label>
                            <input type="text" name="drug_col1_waiting_title" x-model="col1Waiting"
                                   class="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                   placeholder="เช่น คิวรอจ่ายยา">
                        </div>
                    </div>
                </div>

                <!-- คอลัมน์ 2: ห้องจ่ายยา (013) -->
                <div class="bg-amber-50/50 p-5 rounded-xl border border-amber-200">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="font-bold text-amber-900 flex items-center gap-2 text-sm">
                            <span class="w-3 h-3 rounded-full" :style="'background-color: ' + col2Border"></span>
                            คอลัมน์ 2: ห้องจ่ายยา (013)
                        </h3>
                        <span class="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">แผนก 013</span>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">ชื่อหัวข้อคอลัมน์</label>
                            <input type="text" name="drug_col2_title" x-model="col2Title"
                                   class="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                   placeholder="เช่น รอจัดยา">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">🎨 สีกรอบคอลัมน์ 2 (Border Color)</label>
                            <div class="flex items-center gap-2">
                                <input type="color" x-model="col2Border" class="w-10 h-9 rounded border cursor-pointer p-0.5">
                                <input type="text" name="drug_col2_border_color" x-model="col2Border"
                                       class="flex-1 border border-slate-300 rounded-lg p-2 text-xs font-mono bg-white">
                            </div>
                            <div class="mt-2 flex items-center gap-2">
                                <span class="text-xs text-slate-400">แนะนำ:</span>
                                @foreach(['#f59e0b' => 'Amber', '#f97316' => 'Orange', '#eab308' => 'Yellow', '#8b5cf6' => 'Purple', '#ec4899' => 'Pink'] as $c => $lbl)
                                    <button type="button" @click="col2Border = '{{ $c }}'"
                                            class="w-6 h-6 rounded-full border-2 border-white shadow-xs hover:scale-110 transition-transform"
                                            style="background-color: {{ $c }}" title="{{ $lbl }}"></button>
                                @endforeach
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">ป้ายกำกับส่วนคิวรอ</label>
                            <input type="text" name="drug_col2_waiting_title" x-model="col2Waiting"
                                   class="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                   placeholder="เช่น คิวรอจัดยา">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Live Preview ตัวอย่างหน้าจอ 2 คอลัมน์ -->
            <div class="mt-6 pt-5 border-t border-slate-100">
                <span class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">👁️ ตัวอย่างการแสดงผลสีกรอบ 2 คอลัมน์บนจอทีวี (Live Preview)</span>
                <div class="bg-slate-950 p-4 rounded-xl grid grid-cols-2 gap-4">
                    <!-- Preview Col 1 -->
                    <div class="rounded-xl p-3 bg-slate-900 flex flex-col"
                         :style="'border: 3px solid ' + col1Border + '; box-shadow: 0 0 15px -3px ' + col1Border + '40;'">
                        <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                            <div class="flex items-center gap-1.5">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">จุดรับยา (062)</span>
                                <span class="text-xs font-extrabold text-cyan-200" x-text="col1Title"></span>
                            </div>
                        </div>
                        <div class="bg-yellow-400 text-slate-900 rounded p-1.5 text-center text-xs font-black mb-2">
                            เรียกคิว: 025 (นายสมชาย)
                        </div>
                        <div class="bg-black/40 rounded p-2 text-[11px]">
                            <span class="text-cyan-300/80 font-bold block mb-1" x-text="col1Waiting"></span>
                            <div class="flex justify-between text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-cyan-900/40">
                                <span class="text-cyan-300 font-bold">026</span>
                                <span>นายวรวิทย์ ***</span>
                            </div>
                        </div>
                    </div>

                    <!-- Preview Col 2 -->
                    <div class="rounded-xl p-3 bg-slate-900 flex flex-col"
                         :style="'border: 3px solid ' + col2Border + '; box-shadow: 0 0 15px -3px ' + col2Border + '40;'">
                        <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                            <div class="flex items-center gap-1.5">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">ห้องจ่ายยา (013)</span>
                                <span class="text-xs font-extrabold text-amber-200" x-text="col2Title"></span>
                            </div>
                        </div>
                        <div class="bg-yellow-400 text-slate-900 rounded p-1.5 text-center text-xs font-black mb-2">
                            เรียกคิว: 042 (นางกัญญา)
                        </div>
                        <div class="bg-black/40 rounded p-2 text-[11px]">
                            <span class="text-amber-300/80 font-bold block mb-1" x-text="col2Waiting"></span>
                            <div class="flex justify-between text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-amber-900/40">
                                <span class="text-amber-300 font-bold">043</span>
                                <span>นางสมหญิง ***</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        @endif

        @if($isEr)
        <!-- ─── ส่วนพิเศษ: ปรับแต่งคิวห้องฉุกเฉิน (ER Triage & Countdown) ─── -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-rose-200" x-data="{
            showTriage: {{ ($setting->er_show_triage ?? true) ? 'true' : 'false' }},
            showCountdown: {{ ($setting->er_show_countdown ?? true) ? 'true' : 'false' }},
            target1: {{ $setting->er_triage_target_1 ?? 0 }},
            target2: {{ $setting->er_triage_target_2 ?? 15 }},
            target3: {{ $setting->er_triage_target_3 ?? 30 }},
            target4: {{ $setting->er_triage_target_4 ?? 60 }},
            target5: {{ $setting->er_triage_target_5 ?? 120 }}
        }">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                    <h2 class="text-lg font-black text-slate-900 flex items-center gap-2">
                        <span class="p-1.5 bg-rose-100 text-rose-700 rounded-lg">🚨</span>
                        ระดับความฉุกเฉิน & เวลานับถอยหลัง (ER Triage & Countdown)
                    </h2>
                    <p class="text-xs text-slate-500 mt-1">กำหนดการแสดงผลแถบสีตามระดับ Triage ใน HOSxP (Level 1-5) และเวลาเป้าหมายสำหรับการนับถอยหลังของคนไข้แต่ละคน</p>
                </div>
                <span class="text-xs font-bold px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
                    ER Context (003)
                </span>
            </div>

            <!-- สวิตช์เปิด/ปิดฟังก์ชัน -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <label class="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors"
                       :class="showTriage ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-slate-50'">
                    <input type="checkbox" name="er_show_triage" value="1" x-model="showTriage"
                           class="w-4 h-4 mt-0.5 text-rose-600 border-slate-300 rounded focus:ring-rose-500">
                    <div>
                        <span class="text-sm font-bold text-slate-800">🏷️ แสดงแถบสีและระดับความฉุกเฉิน (Triage Color & Badge)</span>
                        <p class="text-xs text-slate-500 mt-0.5">แสดงแถบสีด้านซ้ายและป้ายกำกับระดับความเร่งด่วน เช่น กู้ชีพ, ฉุกเฉิน, ด่วนมาก</p>
                    </div>
                </label>

                <label class="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors"
                       :class="showCountdown ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-slate-50'">
                    <input type="checkbox" name="er_show_countdown" value="1" x-model="showCountdown"
                           class="w-4 h-4 mt-0.5 text-amber-600 border-slate-300 rounded focus:ring-amber-500">
                    <div>
                        <span class="text-sm font-bold text-slate-800">⏱️ แสดงเวลารอคอยนับถอยหลัง (Countdown Waiting Time)</span>
                        <p class="text-xs text-slate-500 mt-0.5">คำนวณเวลานับถอยหลังจากเวลาเข้า ER ตามเป้าหมายของแต่ละระดับ หากเกินเวลาจะเตือนสีแดง</p>
                    </div>
                </label>
            </div>

            <!-- กำหนดเวลาเป้าหมายของแต่ละ Triage Level (นาที) -->
            <div class="mb-6">
                <h3 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    กำหนดเวลาเป้าหมายการตรวจตามระดับความเร่งด่วน (Target Wait Time)
                </h3>

                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    <!-- Level 1 -->
                    <div class="p-3 rounded-xl border-2 border-red-500 bg-red-50/40">
                        <div class="flex items-center gap-1.5 mb-1.5">
                            <span class="w-3 h-3 rounded-full bg-red-500"></span>
                            <span class="text-xs font-black text-red-700">ระดับ 1: กู้ชีพ</span>
                        </div>
                        <p class="text-[11px] text-slate-600 mb-2 font-medium">Resuscitate</p>
                        <div class="flex items-center gap-1.5">
                            <input type="number" name="er_triage_target_1" x-model.number="target1" min="0" max="1440"
                                   class="w-full border border-red-300 rounded-lg p-1.5 text-xs text-center font-bold bg-white focus:ring-2 focus:ring-red-500">
                            <span class="text-xs font-bold text-slate-600 whitespace-nowrap">นาที</span>
                        </div>
                        <span class="text-[10px] text-red-600/80 block mt-1">ตรวจทันที (0 นาที)</span>
                    </div>

                    <!-- Level 2 -->
                    <div class="p-3 rounded-xl border-2 border-orange-500 bg-orange-50/40">
                        <div class="flex items-center gap-1.5 mb-1.5">
                            <span class="w-3 h-3 rounded-full bg-orange-500"></span>
                            <span class="text-xs font-black text-orange-700">ระดับ 2: ฉุกเฉิน</span>
                        </div>
                        <p class="text-[11px] text-slate-600 mb-2 font-medium">Emergency</p>
                        <div class="flex items-center gap-1.5">
                            <input type="number" name="er_triage_target_2" x-model.number="target2" min="0" max="1440"
                                   class="w-full border border-orange-300 rounded-lg p-1.5 text-xs text-center font-bold bg-white focus:ring-2 focus:ring-orange-500">
                            <span class="text-xs font-bold text-slate-600 whitespace-nowrap">นาที</span>
                        </div>
                        <span class="text-[10px] text-orange-600/80 block mt-1">เป้าหมาย ≤ 15 นาที</span>
                    </div>

                    <!-- Level 3 -->
                    <div class="p-3 rounded-xl border-2 border-yellow-500 bg-yellow-50/40">
                        <div class="flex items-center gap-1.5 mb-1.5">
                            <span class="w-3 h-3 rounded-full bg-yellow-500"></span>
                            <span class="text-xs font-black text-yellow-800">ระดับ 3: ด่วนมาก</span>
                        </div>
                        <p class="text-[11px] text-slate-600 mb-2 font-medium">Urgency</p>
                        <div class="flex items-center gap-1.5">
                            <input type="number" name="er_triage_target_3" x-model.number="target3" min="0" max="1440"
                                   class="w-full border border-yellow-300 rounded-lg p-1.5 text-xs text-center font-bold bg-white focus:ring-2 focus:ring-yellow-500">
                            <span class="text-xs font-bold text-slate-600 whitespace-nowrap">นาที</span>
                        </div>
                        <span class="text-[10px] text-yellow-700/80 block mt-1">เป้าหมาย ≤ 30 นาที</span>
                    </div>

                    <!-- Level 4 -->
                    <div class="p-3 rounded-xl border-2 border-green-500 bg-green-50/40">
                        <div class="flex items-center gap-1.5 mb-1.5">
                            <span class="w-3 h-3 rounded-full bg-green-500"></span>
                            <span class="text-xs font-black text-green-700">ระดับ 4: ด่วน</span>
                        </div>
                        <p class="text-[11px] text-slate-600 mb-2 font-medium">Semi-urgency</p>
                        <div class="flex items-center gap-1.5">
                            <input type="number" name="er_triage_target_4" x-model.number="target4" min="0" max="1440"
                                   class="w-full border border-green-300 rounded-lg p-1.5 text-xs text-center font-bold bg-white focus:ring-2 focus:ring-green-500">
                            <span class="text-xs font-bold text-slate-600 whitespace-nowrap">นาที</span>
                        </div>
                        <span class="text-[10px] text-green-600/80 block mt-1">เป้าหมาย ≤ 60 นาที</span>
                    </div>

                    <!-- Level 5 -->
                    <div class="p-3 rounded-xl border-2 border-slate-400 bg-slate-50/60">
                        <div class="flex items-center gap-1.5 mb-1.5">
                            <span class="w-3 h-3 rounded-full bg-white border border-slate-400"></span>
                            <span class="text-xs font-black text-slate-800">ระดับ 5: รอได้</span>
                        </div>
                        <p class="text-[11px] text-slate-600 mb-2 font-medium">Non-urgency</p>
                        <div class="flex items-center gap-1.5">
                            <input type="number" name="er_triage_target_5" x-model.number="target5" min="0" max="1440"
                                   class="w-full border border-slate-300 rounded-lg p-1.5 text-xs text-center font-bold bg-white focus:ring-2 focus:ring-slate-400">
                            <span class="text-xs font-bold text-slate-600 whitespace-nowrap">นาที</span>
                        </div>
                        <span class="text-[10px] text-slate-600/80 block mt-1">เป้าหมาย ≤ 120 นาที</span>
                    </div>
                </div>
            </div>

            <!-- Live Preview ตัวอย่างหน้าจอคิว ER -->
            <div class="mt-6 pt-5 border-t border-slate-100">
                <span class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">👁️ ตัวอย่างการแสดงผลจอคิว ER บนทีวี 43" (Live Preview)</span>
                
                <!-- Calling Box Preview (เมื่อมีคิวเรียก vs เมื่อว่าง) -->
                <div class="mb-3 space-y-2">
                    <span class="text-[11px] font-bold text-slate-500">📢 กรอบเรียกคิว (ขณะเรียกคนไข้ - กระชับ พอดีจอ):</span>
                    <div class="p-2.5 px-4 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 border border-yellow-300 shadow-md flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <span class="text-xs font-black uppercase text-amber-900 tracking-wider">เรียกคิว</span>
                            <template x-if="showTriage">
                                <span class="px-2 py-0.5 rounded-full text-[11px] font-black uppercase triage-badge-1 shadow-sm">1 กู้ชีพ</span>
                            </template>
                            <span class="text-2xl font-black text-slate-950">001</span>
                        </div>
                        <span class="text-base font-black text-slate-950 truncate pl-3">นายสมเกียรติ พยา***</span>
                    </div>

                    <span class="text-[11px] font-bold text-slate-500 block pt-1">⏸️ กรอบสถานะว่าง (เมื่อไม่มีคิวเรียก - สลิมพิเศษ ไม่เปลืองพื้นที่):</span>
                    <div class="py-1.5 px-3 rounded-lg bg-slate-900/90 border border-dashed border-slate-700 flex items-center justify-center">
                        <span class="text-xs font-bold text-slate-400 tracking-wider">-- ว่าง --</span>
                    </div>
                </div>

                <span class="text-[11px] font-bold text-slate-500 block mb-2">⏳ รายการคิวรอตรวจ (Triage 1-5):</span>
                <div class="bg-slate-950 p-4 rounded-xl space-y-2.5">
                    <!-- Example Resuscitate (Level 1) -->
                    <div class="flex items-center justify-between p-3 rounded-xl transition-all"
                         :class="showTriage ? 'triage-item-1' : 'bg-slate-900 border border-slate-800'">
                        <div class="flex items-center gap-3">
                            <span class="text-sm font-black border shadow-sm"
                                  :class="showTriage ? 'triage-no-1 px-2.5 py-0.5 rounded-lg' : 'bg-slate-800 text-slate-200 border-slate-700 px-2.5 py-0.5 rounded-lg'">001</span>
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-extrabold text-white tracking-wide drop-shadow-sm">นายสมเกียรติ พยา***</span>
                                    <template x-if="showTriage">
                                        <span class="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase triage-badge-1 animate-pulse shadow-sm shadow-red-500/50">1 กู้ชีพ</span>
                                    </template>
                                </div>
                                <span class="triage-er-time">เข้า ER: 19:30</span>
                            </div>
                        </div>
                        <template x-if="showCountdown">
                            <div class="text-right">
                                <span class="px-2.5 py-1 rounded-lg text-xs font-mono font-black border-2 bg-red-600 text-white border-red-300 animate-pulse shadow-md shadow-red-500/50">
                                    ⚠️ ทันที (<span x-text="target1"></span> น.)
                                </span>
                            </div>
                        </template>
                    </div>

                    <!-- Example Emergency (Level 2) -->
                    <div class="flex items-center justify-between p-3 rounded-xl transition-all"
                         :class="showTriage ? 'triage-item-2' : 'bg-slate-900 border border-slate-800'">
                        <div class="flex items-center gap-3">
                            <span class="text-sm font-black border shadow-sm"
                                  :class="showTriage ? 'triage-no-2 px-2.5 py-0.5 rounded-lg' : 'bg-slate-800 text-slate-200 border-slate-700 px-2.5 py-0.5 rounded-lg'">002</span>
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-extrabold text-white tracking-wide drop-shadow-sm">น.ส.วิภาดา รักษ์***</span>
                                    <template x-if="showTriage">
                                        <span class="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase triage-badge-2 shadow-sm shadow-orange-500/50">2 ฉุกเฉิน</span>
                                    </template>
                                </div>
                                <span class="triage-er-time">เข้า ER: 19:42</span>
                            </div>
                        </div>
                        <template x-if="showCountdown">
                            <div class="text-right">
                                <span class="px-2.5 py-1 rounded-lg text-xs font-mono font-black border-2 bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/40">
                                    ⏳ เหลือ 06:45
                                </span>
                            </div>
                        </template>
                    </div>

                    <!-- Example Urgency (Level 3) -->
                    <div class="flex items-center justify-between p-3 rounded-xl transition-all"
                         :class="showTriage ? 'triage-item-3' : 'bg-slate-900 border border-slate-800'">
                        <div class="flex items-center gap-3">
                            <span class="text-sm font-black border shadow-sm"
                                  :class="showTriage ? 'triage-no-3 px-2.5 py-0.5 rounded-lg' : 'bg-slate-800 text-slate-200 border-slate-700 px-2.5 py-0.5 rounded-lg'">003</span>
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-extrabold text-white tracking-wide drop-shadow-sm">นางอำนวย สุขส***</span>
                                    <template x-if="showTriage">
                                        <span class="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase triage-badge-3 shadow-sm shadow-yellow-500/50">3 ด่วนมาก</span>
                                    </template>
                                </div>
                                <span class="triage-er-time">เข้า ER: 19:35</span>
                            </div>
                        </div>
                        <template x-if="showCountdown">
                            <div class="text-right">
                                <span class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold border bg-slate-950/90 text-emerald-300 border-emerald-500/50 shadow-sm">
                                    ⏳ เหลือ 19:12
                                </span>
                            </div>
                        </template>
                    </div>

                    <!-- Example Overdue Warning (Level 4) -->
                    <div class="flex items-center justify-between p-3 rounded-xl transition-all"
                         :class="showTriage ? 'triage-item-4' : 'bg-slate-900 border border-slate-800'">
                        <div class="flex items-center gap-3">
                            <span class="text-sm font-black border shadow-sm"
                                  :class="showTriage ? 'triage-no-4 px-2.5 py-0.5 rounded-lg' : 'bg-slate-800 text-slate-200 border-slate-700 px-2.5 py-0.5 rounded-lg'">004</span>
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-extrabold text-white tracking-wide drop-shadow-sm">นายสมบัติ เจริ***</span>
                                    <template x-if="showTriage">
                                        <span class="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase triage-badge-4 shadow-sm shadow-emerald-500/50">4 ด่วน</span>
                                    </template>
                                </div>
                                <span class="triage-er-time">เข้า ER: 18:40</span>
                            </div>
                        </div>
                        <template x-if="showCountdown">
                            <div class="text-right">
                                <span class="px-2.5 py-1 rounded-lg text-xs font-mono font-black border-2 bg-red-600 text-white border-red-300 animate-pulse shadow-md shadow-red-500/50">
                                    ⚠️ เกินเวลา -08:15
                                </span>
                            </div>
                        </template>
                    </div>

                    <!-- Example Non-urgency (Level 5) -->
                    <div class="flex items-center justify-between p-3 rounded-xl transition-all"
                         :class="showTriage ? 'triage-item-5' : 'bg-slate-900 border border-slate-800'">
                        <div class="flex items-center gap-3">
                            <span class="text-sm font-black border shadow-sm"
                                  :class="showTriage ? 'triage-no-5 px-2.5 py-0.5 rounded-lg' : 'bg-slate-800 text-slate-200 border-slate-700 px-2.5 py-0.5 rounded-lg'">005</span>
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-extrabold text-white tracking-wide drop-shadow-sm">นายสมศักดิ์ มั่นค***</span>
                                    <template x-if="showTriage">
                                        <span class="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase triage-badge-5 shadow-sm shadow-slate-300/50">5 รอได้</span>
                                    </template>
                                </div>
                                <span class="triage-er-time">เข้า ER: 17:15</span>
                            </div>
                        </div>
                        <template x-if="showCountdown">
                            <div class="text-right">
                                <span class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold border bg-slate-950/90 text-emerald-300 border-emerald-500/50 shadow-sm">
                                    ⏳ เหลือ 45:30
                                </span>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
        @endif

        <!-- ─── ส่วนที่ 2: ขนาดตัวอักษร ─── -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200" x-data="{
            fonts: {
                room_title: '{{ $setting->font_room_title ?? "auto" }}',
                calling_no: '{{ $setting->font_calling_no ?? "auto" }}',
                calling_name: '{{ $setting->font_calling_name ?? "auto" }}',
                waiting_no: '{{ $setting->font_waiting_no ?? "auto" }}',
                waiting_name: '{{ $setting->font_waiting_name ?? "auto" }}',
            },
            previewSize(val) {
                return val === 'auto' ? '' : val + 'px';
            }
        }">
            <h2 class="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
                <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                ขนาดตัวอักษร (Font Size)
            </h2>
            <p class="text-sm text-slate-500 mb-5">กำหนดขนาดตัวอักษรแต่ละส่วนบนจอแสดงคิว เลือก <strong>"อัตโนมัติ"</strong> เพื่อใช้ค่าที่ระบบคำนวณตามขนาดจอ</p>

            @php
                $fontOptions = [
                    ['value' => 'auto', 'label' => '🔄 อัตโนมัติ (ตามขนาดจอ)'],
                    ['value' => '16',   'label' => '16px — เล็กมาก'],
                    ['value' => '20',   'label' => '20px — เล็ก'],
                    ['value' => '24',   'label' => '24px — ปกติ'],
                    ['value' => '28',   'label' => '28px — ปานกลาง'],
                    ['value' => '32',   'label' => '32px — ใหญ่'],
                    ['value' => '40',   'label' => '40px — ใหญ่มาก'],
                    ['value' => '48',   'label' => '48px — ใหญ่พิเศษ'],
                    ['value' => '56',   'label' => '56px — จัมโบ้'],
                    ['value' => '64',   'label' => '64px — จัมโบ้ XL'],
                    ['value' => '80',   'label' => '80px — จัมโบ้ XXL'],
                    ['value' => '96',   'label' => '96px — จัมโบ้ XXXL'],
                    ['value' => '128',  'label' => '128px — ยักษ์'],
                ];

                $fontFields = [
                    [
                        'name' => 'font_room_title',
                        'label' => $isDrug ? '💊 ชื่อหัวข้อคอลัมน์ (รอจ่ายยา / รอจัดยา)' : ($isEr ? '🚨 ชื่อห้องฉุกเฉิน' : '🏥 ชื่อห้องตรวจ'),
                        'preview' => $isDrug ? 'รอจ่ายยา' : ($isEr ? 'ห้องฉุกเฉิน (ER)' : 'ห้องตรวจ 1')
                    ],
                    ['name' => 'font_calling_no',   'label' => '📢 เลขคิวที่กำลังเรียก',         'preview' => '042'],
                    ['name' => 'font_calling_name', 'label' => '👤 ชื่อคนไข้ที่กำลังเรียก',      'preview' => 'นายสมชาย ทดส***'],
                    ['name' => 'font_waiting_no',   'label' => '⏳ เลขคิวรอ',                    'preview' => '043'],
                    ['name' => 'font_waiting_name', 'label' => '👥 ชื่อคนไข้ที่รอ',              'preview' => 'นางสมหญิง ตัวอ***'],
                ];
            @endphp

            <div class="space-y-4">
                @foreach($fontFields as $field)
                    @php
                        $modelKey = str_replace('font_', '', $field['name']);
                    @endphp
                    <div class="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div class="flex flex-col md:flex-row md:items-center gap-3">
                            <div class="md:w-1/3">
                                <label class="block text-sm font-bold text-slate-700">{{ $field['label'] }}</label>
                            </div>
                            <div class="md:w-1/3">
                                <select name="{{ $field['name'] }}"
                                        x-model="fonts.{{ $modelKey }}"
                                        class="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                                    @foreach($fontOptions as $opt)
                                        <option value="{{ $opt['value'] }}"
                                                @selected(($setting->{$field['name']} ?? 'auto') === $opt['value'])>
                                            {{ $opt['label'] }}
                                        </option>
                                    @endforeach
                                </select>
                            </div>
                            <div class="md:w-1/3 flex items-center">
                                <div class="bg-slate-900 text-white rounded-lg px-4 py-2 overflow-hidden max-w-full">
                                    <span class="font-bold whitespace-nowrap transition-all duration-300"
                                          :style="previewSize(fonts.{{ $modelKey }}) ? 'font-size:' + previewSize(fonts.{{ $modelKey }}) : 'font-size: 24px'"
                                          >{{ $field['preview'] }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>

        <!-- ─── ส่วนที่ 3: สีพื้นหลังและการแสดงผล ─── -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200" x-data="{
            bgColor: '{{ $setting->bg_color ?? '' }}',
            showBadge: {{ $setting->show_wait_badge ? 'true' : 'false' }}
        }">
            <h2 class="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
                <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>
                สีพื้นหลังและการแสดงผล
            </h2>
            <p class="text-sm text-slate-500 mb-5">กำหนดสีพื้นหลังของแผงแสดงคิว เว้นว่างเพื่อใช้สีธีมเริ่มต้น</p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1.5">🎨 สีพื้นหลังแผงคิว</label>
                    <div class="flex items-center gap-3">
                        <input type="color" x-model="bgColor" class="w-12 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5">
                        <input type="text" name="bg_color" x-model="bgColor"
                               placeholder="เช่น #1e293b หรือเว้นว่าง"
                               class="flex-1 border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        <button type="button" @click="bgColor = ''" class="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors whitespace-nowrap">
                            ล้าง (ใช้ค่าเดิม)
                        </button>
                    </div>

                    <div class="mt-3 flex items-center gap-3">
                        <span class="text-xs text-slate-500">ตัวอย่างสี:</span>
                        @foreach(['#0f172a' => 'น้ำเงินเข้ม', '#1a0a0a' => 'แดงเข้ม', '#0a1a0f' => 'เขียวเข้ม', '#111827' => 'เทาเข้ม', '#000000' => 'ดำ'] as $hex => $name)
                            <button type="button" @click="bgColor = '{{ $hex }}'"
                                    class="w-7 h-7 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110"
                                    style="background-color: {{ $hex }}"
                                    title="{{ $name }} ({{ $hex }})"></button>
                        @endforeach
                    </div>

                    <template x-if="bgColor">
                        <div class="mt-3 p-3 rounded-xl border border-slate-200 text-white text-center font-bold text-sm"
                             :style="'background-color:' + bgColor">
                            ตัวอย่างพื้นหลัง: <span x-text="bgColor"></span>
                        </div>
                    </template>
                </div>

                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-3">📊 ป้ายจำนวนคิวรอ ("รอ 43")</label>
                    <div class="space-y-3">
                        <label class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                               :class="showBadge ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50'">
                            <input type="checkbox" name="show_wait_badge" value="1"
                                   x-model="showBadge"
                                   class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500">
                            <div>
                                <span class="text-sm font-bold text-slate-700">แสดงป้ายจำนวนคิวรอ</span>
                                <p class="text-xs text-slate-500 mt-0.5">เช่น "รอ 43" ที่มุมขวาบนของแต่ละห้อง</p>
                            </div>
                        </label>

                        <div class="flex items-center gap-4 p-3 bg-slate-100 rounded-xl">
                            <span class="text-xs font-bold text-slate-500">ตัวอย่าง:</span>
                            <template x-if="showBadge">
                                <div class="bg-slate-800 rounded-lg p-2 flex items-center gap-2">
                                    <span class="text-sky-300 font-bold text-sm">{{ $isDrug ? 'รอจ่ายยา' : ($isEr ? 'ห้องฉุกเฉิน (ER)' : 'ห้องตรวจ 1') }}</span>
                                    <span class="bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-bold rounded-full px-2 py-0.5 text-xs">รอ 5</span>
                                </div>
                            </template>
                            <template x-if="!showBadge">
                                <div class="bg-slate-800 rounded-lg p-2 flex items-center gap-2">
                                    <span class="text-sky-300 font-bold text-sm">{{ $isDrug ? 'รอจ่ายยา' : ($isEr ? 'ห้องฉุกเฉิน (ER)' : 'ห้องตรวจ 1') }}</span>
                                    <span class="text-xs text-slate-500 italic">(ไม่แสดงจำนวนรอ)</span>
                                </div>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ─── ปุ่มบันทึก ─── -->
        <div class="flex justify-end">
            <button type="submit" class="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2 text-lg">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                บันทึกการตั้งค่า
            </button>
        </div>
    </form>
</div>
@endsection
