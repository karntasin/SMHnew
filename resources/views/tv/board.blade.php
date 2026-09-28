<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>จอแสดงคิวห้องตรวจ</title>
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    <style>
        /* Typography and Spacing Scaling based on layout mode */
        .layout-1 .room-card { padding: 3rem; }
        .layout-1 .room-title { font-size: 3.5rem; }
        .layout-1 .room-header-wrap { padding: 1.5rem; margin-bottom: 2.5rem; border-radius: 1.5rem; }
        .layout-1 .wait-badge { font-size: 1.5rem; padding: 0.75rem 1.5rem; }
        .layout-1 .calling-label { font-size: 2.5rem; }
        .layout-1 .calling-no { font-size: 8rem; line-height: 1; }
        .layout-1 .calling-name { font-size: 3.5rem; }
        .layout-1 .calling-box { padding: 3rem; border-radius: 2rem; margin-bottom: 2rem; }
        .layout-1 .waiting-title { font-size: 2rem; margin-bottom: 1.5rem; }
        .layout-1 .waiting-no { font-size: 3rem; }
        .layout-1 .waiting-name { font-size: 2.5rem; }
        .layout-1 .waiting-item { padding: 1.5rem 2.5rem; margin-bottom: 1rem; border-radius: 1rem; }
        .layout-1 .empty-state { font-size: 2rem; padding: 3rem; }

        .layout-2-4 .room-card { padding: 1.25rem; }
        .layout-2-4 .room-title { font-size: 1.5rem; }
        .layout-2-4 .room-header-wrap { padding: 0.75rem; margin-bottom: 1rem; border-radius: 0.75rem; }
        .layout-2-4 .wait-badge { font-size: 0.875rem; padding: 0.25rem 0.5rem; }
        .layout-2-4 .calling-label { font-size: 1.125rem; }
        .layout-2-4 .calling-no { font-size: 3.5rem; line-height: 1; }
        .layout-2-4 .calling-name { font-size: 1.5rem; }
        .layout-2-4 .calling-box { padding: 1rem; border-radius: 1rem; margin-bottom: 1rem; }
        .layout-2-4 .waiting-title { font-size: 1rem; margin-bottom: 0.5rem; }
        .layout-2-4 .waiting-no { font-size: 1.25rem; }
        .layout-2-4 .waiting-name { font-size: 1.125rem; }
        .layout-2-4 .waiting-item { padding: 0.5rem 0.75rem; margin-bottom: 0.375rem; border-radius: 0.5rem; }
        .layout-2-4 .empty-state { font-size: 1.125rem; padding: 1rem; }

        .layout-5-8 .room-card { padding: 0.5rem; }
        .layout-5-8 .room-title { font-size: 1.125rem; }
        .layout-5-8 .room-header-wrap { padding: 0.375rem 0.5rem; margin-bottom: 0.5rem; border-radius: 0.5rem; }
        .layout-5-8 .wait-badge { font-size: 0.75rem; padding: 0.125rem 0.5rem; }
        .layout-5-8 .calling-label { font-size: 0.875rem; }
        .layout-5-8 .calling-no { font-size: 1.75rem; line-height: 1; }
        .layout-5-8 .calling-name { font-size: 1rem; }
        .layout-5-8 .calling-box { padding: 0.5rem; border-radius: 0.5rem; margin-bottom: 0.5rem; }
        .layout-5-8 .waiting-title { font-size: 0.75rem; margin-bottom: 0.25rem; }
        .layout-5-8 .waiting-no { font-size: 1rem; }
        .layout-5-8 .waiting-name { font-size: 0.875rem; }
        .layout-5-8 .waiting-item { padding: 0.25rem 0.5rem; margin-bottom: 0.25rem; border-radius: 0.375rem; }
        .layout-5-8 .empty-state { font-size: 1rem; padding: 0.75rem; }

        .layout-9-plus .room-card { padding: 0.375rem; border-radius: 0.5rem; }
        .layout-9-plus .room-title { font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .layout-9-plus .room-header-wrap { padding: 0.25rem 0.375rem; margin-bottom: 0.25rem; border-radius: 0.375rem; }
        .layout-9-plus .wait-badge { font-size: 0.65rem; padding: 0.125rem 0.25rem; }
        .layout-9-plus .calling-label { display: none; }
        .layout-9-plus .calling-no { font-size: 1.125rem; line-height: 1; }
        .layout-9-plus .calling-name { font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px; }
        .layout-9-plus .calling-box { padding: 0.25rem; border-radius: 0.375rem; margin-bottom: 0.25rem; flex-direction: column; align-items: flex-start; gap: 0.125rem; }
        .layout-9-plus .waiting-title { display: none; }
        .layout-9-plus .waiting-no { font-size: 0.75rem; }
        .layout-9-plus .waiting-name { font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60px; }
        .layout-9-plus .waiting-item { padding: 0.125rem 0.25rem; margin-bottom: 0.125rem; border-radius: 0.25rem; }
        .layout-9-plus .empty-state { font-size: 0.75rem; padding: 0.25rem; }

        /* ========================================================
           Layout ER: Specially optimized for 43" (1080p) Emergency Room Board
           - Compact calling box (กรอบชื่อคนไข้ที่กำลังเรียกเล็กลง พอดีจอ 43")
           - Ultra-slim empty state (เมื่อตอนที่ว่างเล็กลงอีก เป็นแถบกะทัดรัด ไม่เปลืองพื้นที่)
           - Proportional to 43" 1080p TV screen without vertical overflow
           ======================================================== */
        .layout-er .room-card { padding: 1rem 1.25rem; border-radius: 1.25rem; }
        .layout-er .room-title { font-size: 1.625rem; font-weight: 900; }
        .layout-er .room-header-wrap { padding: 0.5rem 1rem; margin-bottom: 0.5rem; border-radius: 0.75rem; }
        .layout-er .wait-badge { font-size: 0.95rem; padding: 0.25rem 0.75rem; font-weight: 800; }

        /* ER Calling Area (เมื่อมีคิวเรียก) */
        .layout-er .calling-box {
            padding: 0.5rem 1.25rem;
            border-radius: 0.875rem;
            margin-bottom: 0.5rem;
        }
        .layout-er .calling-label { font-size: 1.05rem; font-weight: 900; }
        .layout-er .calling-no { font-size: 2.75rem; line-height: 1; font-weight: 900; }
        .layout-er .calling-name { font-size: 1.75rem; font-weight: 900; }

        /* ER Empty Calling Box (เมื่อตอนที่ว่าง - เล็กลงอีกเป็นแถบสลิม) */
        .layout-er .calling-box.calling-box-empty,
        .layout-er .er-empty-box {
            padding: 0.3rem 0.75rem !important;
            min-height: 36px !important;
            max-height: 40px !important;
            border-radius: 0.625rem !important;
            margin-bottom: 0.5rem !important;
            background: rgba(15, 23, 42, 0.65) !important;
            border: 1.5px dashed rgba(100, 116, 139, 0.5) !important;
        }
        .layout-er .calling-box.calling-box-empty .empty-state,
        .layout-er .er-empty-text {
            font-size: 0.9rem !important;
            padding: 0 !important;
            font-weight: 700 !important;
            color: #94a3b8 !important;
            letter-spacing: 0.05em !important;
        }

        /* ER Waiting Area (คิวรอตรวจ) */
        .layout-er .waiting-title { font-size: 1.125rem; font-weight: 800; margin-bottom: 0.4rem; }
        .layout-er .waiting-item {
            padding: 0.45rem 0.875rem;
            margin-bottom: 0.35rem;
            border-radius: 0.625rem;
        }
        .layout-er .waiting-no {
            font-size: 1.35rem;
            font-weight: 900;
            min-width: 3.25rem;
            height: 2.65rem;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        .layout-er .waiting-name { font-size: 1.25rem; font-weight: 800; }

        /* ========================================================
           Triage 1 to 5 Styles (Pure CSS - Independent of Tailwind JIT)
           ======================================================== */
        /* Waiting Row Item Card (Left Accent Bar + Glowing Border + Gradient) */
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
        .triage-item-default {
            border-left: 10px solid #64748b !important;
            border: 1px solid #334155 !important;
            background: #0f172a !important;
        }

        /* Queue Number Solid Badges */
        .triage-no-1 { background-color: #dc2626 !important; color: #ffffff !important; border: 2px solid #f87171 !important; }
        .triage-no-2 { background-color: #f97316 !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #fed7aa !important; text-shadow: none !important; }
        .triage-no-3 { background-color: #facc15 !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #fef08a !important; text-shadow: none !important; }
        .triage-no-4 { background-color: #059669 !important; color: #ffffff !important; border: 2px solid #34d399 !important; }
        .triage-no-5 { background-color: #ffffff !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #cbd5e1 !important; text-shadow: none !important; }
        .triage-no-default { background-color: #334155 !important; color: #ffffff !important; border: 2px solid #64748b !important; }

        /* Triage Level Pill Badges */
        .triage-badge-1 { background-color: #dc2626 !important; color: #ffffff !important; border: 2px solid #fca5a5 !important; }
        .triage-badge-2 { background-color: #f97316 !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #fed7aa !important; text-shadow: none !important; }
        .triage-badge-3 { background-color: #facc15 !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #fef08a !important; text-shadow: none !important; }
        .triage-badge-4 { background-color: #059669 !important; color: #ffffff !important; border: 2px solid #6ee7b7 !important; }
        .triage-badge-5 { background-color: #ffffff !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #cbd5e1 !important; text-shadow: none !important; }
        .triage-badge-default { background-color: #334155 !important; color: #f1f5f9 !important; border: 1px solid #64748b !important; }

        /* ER Arrival Time */
        .triage-er-time { color: #fde68a !important; font-weight: 600; font-size: 0.825rem; }
    </style>
</head>
@php
    $normalizedKey = match (strtolower(trim($boardKey))) {
        '003', 'er', 'tv-er' => 'er',
        '013', 'drug', 'tv-drug', 'pharmacy' => 'drug',
        default => 'opd',
    };

    if ($normalizedKey === 'er') {
        $boardTitle = 'คิวห้องฉุกเฉิน (ER)';
        $bodyBg = 'bg-stone-950';
        $rightPanelBg = 'bg-gradient-to-br from-red-950 via-neutral-900 to-rose-950';
        $headerBoxBg = 'bg-slate-900/95 border-red-600/70 shadow-2xl';
        $iconBox = 'from-red-500 to-rose-700 shadow-rose-900/40';
        $titleGradient = 'from-red-200 via-rose-300 to-amber-200';
        $roomCardClass = 'bg-slate-950/95 border-2 border-red-600/60 shadow-2xl';
        $roomHeaderBg = 'bg-slate-900 border-b border-red-600/50';
        $roomTitleColor = 'text-white font-black';
        $waitBadgeColor = 'bg-red-600 text-white border-2 border-red-400 shadow-md font-black';
        $waitingAreaBg = 'bg-slate-950 border border-slate-800';
        $waitingTitleColor = 'text-amber-300 font-extrabold';
        $waitingItemBg = 'bg-slate-900 border-slate-800 hover:bg-slate-800';
        $waitingNoColor = 'text-amber-300';
        $waitingTitle = 'คิวรอตรวจ';
    } elseif ($normalizedKey === 'drug') {
        $boardTitle = 'คิวห้องจ่ายยา (Pharmacy)';
        $bodyBg = 'bg-slate-950';
        $rightPanelBg = 'bg-gradient-to-br from-teal-950 via-slate-900 to-emerald-950';
        $headerBoxBg = 'bg-slate-900/95 border-emerald-600/70 shadow-2xl';
        $iconBox = 'from-emerald-500 to-teal-700 shadow-emerald-900/40';
        $titleGradient = 'from-emerald-200 via-teal-200 to-cyan-200';
        $roomCardClass = 'bg-slate-950/95 border-2 border-emerald-600/60 shadow-2xl';
        $roomHeaderBg = 'bg-slate-900 border-b border-emerald-600/50';
        $roomTitleColor = 'text-white font-black';
        $waitBadgeColor = 'bg-emerald-600 text-white border-2 border-emerald-400 shadow-md font-black';
        $waitingAreaBg = 'bg-slate-950 border border-slate-800';
        $waitingTitleColor = 'text-emerald-300 font-extrabold';
        $waitingItemBg = 'bg-slate-900 border-slate-800 hover:bg-slate-800';
        $waitingNoColor = 'text-emerald-300';
        $waitingTitle = 'คิวรอจัดยา';
    } else {
        $boardTitle = 'คิวรับบริการห้องตรวจ';
        $bodyBg = 'bg-slate-900';
        $rightPanelBg = 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950';
        $headerBoxBg = 'bg-slate-900/95 border-sky-600/70 shadow-2xl';
        $iconBox = 'from-sky-400 to-indigo-600 shadow-indigo-900/40';
        $titleGradient = 'from-sky-300 to-indigo-300';
        $roomCardClass = 'bg-slate-950/95 border-2 border-sky-600/60 shadow-2xl';
        $roomHeaderBg = 'bg-slate-900 border-b border-sky-600/50';
        $roomTitleColor = 'text-white font-black';
        $waitBadgeColor = 'bg-indigo-600 text-white border-2 border-indigo-400 shadow-md font-black';
        $waitingAreaBg = 'bg-slate-950 border border-slate-800';
        $waitingTitleColor = 'text-sky-300 font-extrabold';
        $waitingItemBg = 'bg-slate-900 border-slate-800 hover:bg-slate-800';
        $waitingNoColor = 'text-sky-300';
        $waitingTitle = 'คิวรอตรวจ';
    }
@endphp
<body class="@if(!$settings->bg_color) {{ $bodyBg }} @endif text-white h-screen w-screen overflow-hidden"
      @if($settings->bg_color) style="background: {{ $settings->bg_color }}" @endif
      x-data="tvBoard('{{ $boardKey }}', {{ $settings->queue_poll_seconds }}, {{ $settings->chime_enabled ? 'true' : 'false' }}, {{ $settings->tts_enabled ? 'true' : 'false' }})"
      x-init="init()">

    <div x-show="!audioUnlocked" x-cloak
         class="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-opacity"
         @click="unlockAudio()">
        <div class="text-center px-12 py-10 bg-slate-800 rounded-3xl shadow-2xl border border-slate-700">
            <p class="text-6xl font-extrabold mb-8 text-sky-400">📺 ระบบจอเรียกคิวพร้อมใช้งาน</p>
            <p class="text-3xl text-slate-300 bg-slate-900/50 p-6 rounded-xl">โปรดกดปุ่ม OK บนรีโมท หรือแตะหน้าจอ <br>เพื่อเปิดใช้งานเสียงแจ้งเตือน</p>
        </div>
    </div>

    <div class="flex h-screen w-screen" x-show="audioUnlocked" x-cloak>
        <!-- ฝั่งซ้าย: สื่อ/ประกาศ -->
        <div class="h-full relative bg-black shadow-2xl z-10 overflow-hidden" style="width: {{ $settings->left_panel_width_percent }}%;">
            @if($settings->left_media_mode === 'video' || $settings->left_media_mode === 'image_slider')
                <template x-for="(item, idx) in media" :key="item.id || idx">
                    <div x-show="mediaIndex === idx" 
                         class="w-full h-full absolute inset-0 bg-black flex items-center justify-center overflow-hidden" 
                         x-transition.opacity.duration.700ms>
                        
                        <!-- YouTube Embed -->
                        <template x-if="mediaIndex === idx && isYoutube(item.file_path)">
                            <iframe :src="getYoutubeUrl(item.file_path)" 
                                    class="w-full h-full pointer-events-none border-0" 
                                    frameborder="0" 
                                    allow="autoplay; fullscreen; encrypted-media"></iframe>
                        </template>

                        <!-- HTML5 Video File -->
                        <template x-if="mediaIndex === idx && item.media_type === 'video' && !isYoutube(item.file_path)">
                            <video :src="item.file_path" 
                                   autoplay 
                                   playsinline 
                                   :id="'tv-video-' + idx" 
                                   class="w-full h-full object-cover" 
                                   @ended="onVideoEnded(idx)"></video>
                        </template>

                        <!-- Image File -->
                        <template x-if="item.media_type === 'image'">
                            <img :src="item.file_path" class="w-full h-full object-cover select-none">
                        </template>
                    </div>
                </template>

                <!-- กรณีไม่มีรายการสื่อที่เปิดใช้งาน -->
                <div x-show="!media || media.length === 0" class="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-500 p-8 text-center">
                    <svg class="w-20 h-20 mb-4 opacity-40 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    <p class="text-2xl font-bold text-slate-300">ระบบแสดงคิวอัตโนมัติ</p>
                    <p class="text-base text-slate-500 mt-2">ยังไม่มีรายการสื่อที่เปิดใช้งานในระบบ</p>
                </div>
            @else
                <div class="p-8 h-full flex flex-col bg-gradient-to-br from-indigo-950 via-slate-900 to-black">
                    <h2 class="text-4xl font-extrabold mb-6 text-yellow-400 drop-shadow-md">📢 ข่าวสาร/ประกาศ</h2>
                    <div class="flex-1 overflow-hidden text-3xl leading-relaxed text-slate-100" x-html="rssHtml"></div>
                </div>
            @endif
        </div>

        <!-- ฝั่งขวา: รายการคิว (No Scrolling) -->
        <div class="h-full @if(!$settings->bg_color) {{ $rightPanelBg }} @endif p-6 flex flex-col overflow-hidden"
             style="width: {{ $settings->right_panel_width_percent }}%;@if($settings->bg_color) background: {{ $settings->bg_color }};@endif">
            
            <div class="flex-shrink-0 flex items-center justify-between mb-6 {{ $headerBoxBg }} backdrop-blur-md p-6 rounded-2xl border shadow-2xl">
                <div class="flex items-center gap-4">
                    <div class="bg-gradient-to-br {{ $iconBox }} p-3 rounded-xl shadow-inner">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </div>
                    <h1 class="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r {{ $titleGradient }} tracking-wide">{{ $boardTitle }}</h1>
                </div>
                <div class="text-right flex flex-col items-end">
                    <span class="text-4xl font-black text-amber-400 drop-shadow-lg" x-text="clockTime"></span>
                    <div class="text-lg font-bold text-slate-200 mt-1 drop-shadow" x-text="clockDate"></div>
                </div>
            </div>

            <!-- Grid dynamically sized -->
            <div class="grid gap-4 flex-1 min-h-0" :class="gridClass">
                <template x-for="([roomName, roomData], idx) in Object.entries(rooms)" :key="roomName">
                    <!-- Room Card -->
                    <div class="room-card backdrop-blur-sm rounded-2xl shadow-xl flex flex-col min-h-0 relative overflow-hidden transition-all duration-300"
                         :class="getCardClass(roomData, idx)"
                         :style="getCardStyle(roomData, idx)">
                        
                        <!-- Room Header -->
                        <div class="room-header-wrap border flex items-center justify-between flex-shrink-0"
                             :class="getHeaderBgClass(roomData, idx)">
                            <div class="flex items-center gap-2.5">
                                <template x-if="isDrugBoard">
                                    <span class="px-2.5 py-0.5 rounded-full text-xs font-black border tracking-wider shadow-sm uppercase"
                                          :class="getBadgeClass(roomData, idx)"
                                          x-text="getBadgeText(roomData, idx)"></span>
                                </template>
                                <h2 class="room-title font-extrabold drop-shadow"
                                    :class="getTitleColorClass(roomData, idx)"
                                    x-text="getRoomTitle(roomName, roomData, idx)"
                                    @if(($settings->font_room_title ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_room_title }}px" @endif></h2>
                            </div>
                            @if($settings->show_wait_badge)
                            <div class="wait-badge font-bold rounded-full border whitespace-nowrap"
                                 :class="getWaitBadgeClass(roomData, idx)">
                                รอ <span x-text="roomData.waiting.length"></span>
                            </div>
                            @endif
                        </div>

                        <!-- Calling Area -->
                        <div class="flex-shrink-0" :class="isErBoard ? 'mb-1' : 'space-y-2'">
                            <template x-for="q in roomData.calling" :key="roomName + '-calling-' + q.oqueue">
                                <div>
                                    <!-- ER Calling Box Layout (กระชับ ได้สัดส่วนสำหรับจอ 43 นิ้ว) -->
                                    <template x-if="isErBoard">
                                        <div class="calling-box bg-gradient-to-r from-yellow-400 to-amber-500 shadow-xl border border-yellow-300 flex justify-between items-center transform scale-100 transition-all er-calling-box">
                                            <div class="flex items-center gap-3 min-w-0">
                                                <span class="calling-label text-amber-900 font-black tracking-wide uppercase flex-shrink-0">เรียกคิว</span>
                                                <template x-if="q.triage_level && {{ $settings->er_show_triage ? 'true' : 'false' }}">
                                                    <span class="px-2.5 py-0.5 rounded-full text-xs font-black border tracking-wider shadow-sm flex-shrink-0"
                                                          :class="getTriageBadgeClass(q.triage_level)"
                                                          x-text="q.triage_name"></span>
                                                </template>
                                                <span class="calling-no text-slate-900 font-black drop-shadow-sm flex-shrink-0" x-text="q.oqueue"
                                                      @if(($settings->font_calling_no ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_calling_no }}px" @endif></span>
                                            </div>
                                            <span class="calling-name text-slate-900 font-black truncate pl-3 text-right" x-text="q.display_name"
                                                  @if(($settings->font_calling_name ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_calling_name }}px" @endif></span>
                                        </div>
                                    </template>

                                    <!-- Non-ER Calling Box Layout -->
                                    <template x-if="!isErBoard">
                                        <div class="calling-box bg-gradient-to-r from-yellow-400 to-amber-500 shadow-xl border border-yellow-300 flex justify-between items-center transform scale-100 transition-all">
                                            <div class="flex items-baseline gap-3">
                                                <span class="calling-label text-amber-900 font-bold tracking-wide uppercase">เรียกคิว</span>
                                                <span class="calling-no text-slate-900 font-black drop-shadow-sm" x-text="q.oqueue"
                                                      @if(($settings->font_calling_no ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_calling_no }}px" @endif></span>
                                            </div>
                                            <span class="calling-name text-slate-900 font-extrabold truncate pl-4" x-text="q.display_name"
                                                  @if(($settings->font_calling_name ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_calling_name }}px" @endif></span>
                                        </div>
                                    </template>
                                </div>
                            </template>
                            <template x-if="roomData.calling.length === 0">
                                <div class="calling-box calling-box-empty bg-slate-800/80 border-2 border-slate-700/80 border-dashed flex items-center justify-center"
                                     :class="isErBoard ? 'er-empty-box' : ''">
                                    <span class="text-slate-300 font-bold empty-state tracking-wider" :class="isErBoard ? 'er-empty-text' : ''">-- ว่าง --</span>
                                </div>
                            </template>
                        </div>

                        <!-- Waiting Area -->
                        <div class="{{ $waitingAreaBg }} rounded-xl p-3 flex-1 flex flex-col min-h-0 border overflow-hidden relative">
                            <h3 class="waiting-title font-bold uppercase tracking-wider flex-shrink-0"
                                :class="getWaitingTitleColorClass(roomData, idx)"
                                x-text="getWaitingTitle(roomData, idx)"></h3>
                            <div class="flex-1 overflow-hidden flex flex-col gap-1.5">
                                <template x-for="q in roomData.waiting.slice(0, maxWaiting)" :key="roomName + '-waiting-' + q.oqueue">
                                    <div class="waiting-item flex justify-between items-center transition-all duration-200"
                                         :class="isErBoard && {{ $settings->er_show_triage ? 'true' : 'false' }} ? getErWaitingItemClass(q) : ('border ' + getWaitingItemBgClass(roomData, idx))">
                                        
                                        <!-- Left: Queue number + Details -->
                                        <div class="flex items-center gap-3 overflow-hidden min-w-0 flex-1 pr-2">
                                            <span class="waiting-no flex-shrink-0"
                                                  :class="isErBoard ? getErWaitingNoClass(q) : ('font-bold ' + getWaitingNoColorClass(roomData, idx))"
                                                  x-text="q.oqueue"
                                                  @if(($settings->font_waiting_no ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_waiting_no }}px" @endif></span>

                                            <!-- ER Layout: 2 rows (Name + Triage badge, then Arrival time) -->
                                            <template x-if="isErBoard">
                                                <div class="min-w-0 flex-1">
                                                    <div class="flex items-center gap-2 flex-wrap">
                                                        <span class="waiting-name text-white font-extrabold tracking-wide drop-shadow-sm truncate"
                                                              x-text="q.display_name"
                                                              @if(($settings->font_waiting_name ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_waiting_name }}px" @endif></span>
                                                        <template x-if="q.triage_level && {{ $settings->er_show_triage ? 'true' : 'false' }}">
                                                            <span class="px-2.5 py-0.5 rounded-md text-xs font-black border flex-shrink-0 whitespace-nowrap shadow-sm"
                                                                  :class="getTriageBadgeClass(q.triage_level)"
                                                                  x-text="q.triage_name"></span>
                                                        </template>
                                                    </div>
                                                    <template x-if="q.reg_datetime">
                                                        <span class="triage-er-time block mt-0.5 tracking-wide" x-text="'เข้า ER: ' + formatTime(q.reg_datetime)"></span>
                                                    </template>
                                                </div>
                                            </template>

                                            <!-- Non-ER Layout (Single row) -->
                                            <template x-if="!isErBoard">
                                                <span class="waiting-name truncate text-slate-200 font-medium"
                                                      x-text="q.display_name"
                                                      @if(($settings->font_waiting_name ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_waiting_name }}px" @endif></span>
                                            </template>
                                        </div>

                                        <!-- ER Countdown Timer -->
                                        <template x-if="isErBoard && {{ $settings->er_show_countdown ? 'true' : 'false' }} && q.reg_datetime">
                                            <div class="flex items-center flex-shrink-0 pl-2">
                                                <span class="text-xs md:text-sm font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap flex items-center gap-1 transition-all"
                                                      :class="getCountdownClass(q)"
                                                      x-text="getCountdownText(q)"></span>
                                            </div>
                                        </template>
                                    </div>
                                </template>
                                <!-- Show dots if more waiting queues exist -->
                                <template x-if="roomData.waiting.length > maxWaiting">
                                    <div class="text-center text-amber-300 font-black text-sm mt-1 animate-pulse drop-shadow-sm">...และอีก <span x-text="roomData.waiting.length - maxWaiting"></span> คิว</div>
                                </template>
                            </div>
                            <template x-if="roomData.waiting.length === 0">
                                <div class="absolute inset-0 flex items-center justify-center">
                                    <span class="text-slate-300 font-bold bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-700">ไม่มีคิวรอ</span>
                                </div>
                            </template>
                        </div>

                    </div>
                </template>
            </div>

        </div>
    </div>

    <script>
        function tvBoard(boardKey, pollSeconds, chimeEnabled, ttsEnabled) {
            return {
                boardKey, pollSeconds, chimeEnabled, ttsEnabled,
                rooms: {},
                media: @json($media),
                mediaIndex: 0,
                clockTime: '',
                clockDate: '',
                rssHtml: '',
                lastCallingKeys: new Set(),
                pollTimer: null,
                mediaTimer: null,
                audioUnlocked: false,

                isDrugBoard: {{ $normalizedKey === 'drug' ? 'true' : 'false' }},
                isErBoard: {{ $normalizedKey === 'er' ? 'true' : 'false' }},
                nowTime: Date.now(),
                serverTimeOffset: 0,

                get roomCount() {
                    return Object.keys(this.rooms).length;
                },

                get gridClass() {
                    if (this.isDrugBoard) {
                        return 'grid-cols-2 layout-2-4';
                    }
                    if (this.isErBoard) {
                        return 'grid-cols-1 layout-er';
                    }
                    const len = this.roomCount;
                    if (len === 0) return 'grid-cols-1 layout-1';
                    if (len === 1) return 'grid-cols-1 layout-1';
                    if (len <= 4) return 'grid-cols-2 layout-2-4';
                    if (len <= 6) return 'grid-cols-3 layout-5-8';
                    if (len <= 8) return 'grid-cols-4 layout-5-8';
                    if (len <= 12) return 'grid-cols-4 layout-9-plus';
                    return 'grid-cols-5 layout-9-plus';
                },

                get maxWaiting() {
                    if (this.isDrugBoard) return 8;
                    if (this.isErBoard) return 8;
                    const len = this.roomCount;
                    if (len === 1) return 10;
                    if (len <= 4) return 6;
                    if (len <= 6) return 5;
                    if (len <= 8) return 4;
                    return 4;
                },

                isCol1(roomData, idx) {
                    if (!this.isDrugBoard) return false;
                    return (roomData && roomData.cur_dep === '062') || idx === 0;
                },

                getCardStyle(roomData, idx) {
                    if (!this.isDrugBoard) return '';
                    const borderColor = this.isCol1(roomData, idx) 
                        ? '{{ $settings->drug_col1_border_color ?: "#06b6d4" }}' 
                        : '{{ $settings->drug_col2_border_color ?: "#f59e0b" }}';
                    return `border: 4px solid ${borderColor} !important; box-shadow: 0 0 25px -4px ${borderColor}55, 0 10px 15px -3px rgba(0, 0, 0, 0.5) !important;`;
                },

                getCardClass(roomData, idx) {
                    if (!this.isDrugBoard) {
                        return '{{ $roomCardClass }}';
                    }
                    return this.isCol1(roomData, idx)
                        ? 'bg-gradient-to-b from-cyan-950/95 via-slate-900/95 to-slate-950'
                        : 'bg-gradient-to-b from-amber-950/95 via-slate-900/95 to-slate-950';
                },

                getHeaderBgClass(roomData, idx) {
                    if (!this.isDrugBoard) {
                        return '{{ $roomHeaderBg }}';
                    }
                    return this.isCol1(roomData, idx)
                        ? 'bg-cyan-950/90 border-cyan-700/60'
                        : 'bg-amber-950/90 border-amber-700/60';
                },

                getTitleColorClass(roomData, idx) {
                    if (!this.isDrugBoard) {
                        return '{{ $roomTitleColor }}';
                    }
                    return this.isCol1(roomData, idx) ? 'text-white font-black' : 'text-white font-black';
                },

                getRoomTitle(roomName, roomData, idx) {
                    if (!this.isDrugBoard) return roomName;
                    if (this.isCol1(roomData, idx)) {
                        return '{{ addslashes($settings->drug_col1_title ?: "รอจ่ายยา") }}';
                    }
                    return '{{ addslashes($settings->drug_col2_title ?: "รอจัดยา") }}';
                },

                getBadgeText(roomData, idx) {
                    if (!this.isDrugBoard) return '';
                    return this.isCol1(roomData, idx) ? 'จุดรับยา (062)' : 'ห้องจ่ายยา (013)';
                },

                getBadgeClass(roomData, idx) {
                    if (!this.isDrugBoard) return '';
                    return this.isCol1(roomData, idx)
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                },

                getWaitBadgeClass(roomData, idx) {
                    if (!this.isDrugBoard) {
                        return '{{ $waitBadgeColor }}';
                    }
                    return this.isCol1(roomData, idx)
                        ? 'bg-cyan-500/25 text-cyan-200 border-cyan-500/40'
                        : 'bg-amber-500/25 text-amber-200 border-amber-500/40';
                },

                getWaitingTitle(roomData, idx) {
                    if (!this.isDrugBoard) return '{{ $waitingTitle }}';
                    if (this.isCol1(roomData, idx)) {
                        return '{{ addslashes($settings->drug_col1_waiting_title ?: "คิวรอจ่ายยา") }}';
                    }
                    return '{{ addslashes($settings->drug_col2_waiting_title ?: "คิวรอจัดยา") }}';
                },

                getWaitingTitleColorClass(roomData, idx) {
                    if (!this.isDrugBoard) return '{{ $waitingTitleColor }}';
                    return this.isCol1(roomData, idx) ? 'text-cyan-300/90' : 'text-amber-300/90';
                },

                getWaitingItemBgClass(roomData, idx) {
                    if (!this.isDrugBoard) return '{{ $waitingItemBg }}';
                    return this.isCol1(roomData, idx)
                        ? 'bg-cyan-950/80 border-cyan-800/60 hover:bg-cyan-900/70'
                        : 'bg-amber-950/80 border-amber-800/60 hover:bg-amber-900/70';
                },

                getWaitingNoColorClass(roomData, idx) {
                    if (!this.isDrugBoard) return '{{ $waitingNoColor }}';
                    return this.isCol1(roomData, idx) ? 'text-cyan-300' : 'text-amber-300';
                },

                getTriageBadgeClass(level) {
                    switch(Number(level)) {
                        case 1: return 'triage-badge-1 animate-pulse shadow-sm shadow-red-500/50';
                        case 2: return 'triage-badge-2 shadow-sm shadow-orange-500/50';
                        case 3: return 'triage-badge-3 shadow-sm shadow-yellow-500/50';
                        case 4: return 'triage-badge-4 shadow-sm shadow-emerald-500/50';
                        case 5: return 'triage-badge-5 shadow-sm shadow-slate-300/50';
                        default: return 'triage-badge-default';
                    }
                },

                getErWaitingItemClass(q) {
                    switch(Number(q.triage_level)) {
                        case 1: return 'triage-item-1';
                        case 2: return 'triage-item-2';
                        case 3: return 'triage-item-3';
                        case 4: return 'triage-item-4';
                        case 5: return 'triage-item-5';
                        default: return 'triage-item-default';
                    }
                },

                getErWaitingNoClass(q) {
                    switch(Number(q.triage_level)) {
                        case 1: return 'triage-no-1 px-2.5 py-0.5 rounded-lg shadow-sm';
                        case 2: return 'triage-no-2 px-2.5 py-0.5 rounded-lg shadow-sm';
                        case 3: return 'triage-no-3 px-2.5 py-0.5 rounded-lg shadow-sm';
                        case 4: return 'triage-no-4 px-2.5 py-0.5 rounded-lg shadow-sm';
                        case 5: return 'triage-no-5 px-2.5 py-0.5 rounded-lg shadow-sm';
                        default: return 'triage-no-default px-2.5 py-0.5 rounded-lg shadow-sm';
                    }
                },

                getErWaitingNoColor(q) {
                    return this.getErWaitingNoClass(q);
                },

                formatTime(dt) {
                    if (!dt) return '';
                    try {
                        const str = String(dt).trim();
                        const parts = str.split(' ');
                        if (parts.length >= 2) {
                            const timeParts = parts[1].split(':');
                            return `${timeParts[0]}:${timeParts[1]}`;
                        }
                        if (str.includes('T')) {
                            const timePart = str.split('T')[1];
                            const timeParts = timePart.split(':');
                            return `${timeParts[0]}:${timeParts[1]}`;
                        }
                        const d = new Date(str);
                        if (!isNaN(d.getTime())) {
                            const hh = String(d.getHours()).padStart(2, '0');
                            const mm = String(d.getMinutes()).padStart(2, '0');
                            return `${hh}:${mm}`;
                        }
                    } catch (e) {}
                    return dt;
                },

                getCountdownDiffSec(q) {
                    if (!q.reg_datetime) return 0;
                    let dtStr = String(q.reg_datetime).trim();
                    if (dtStr.includes(' ') && !dtStr.includes('T')) {
                        dtStr = dtStr.replace(' ', 'T') + '+07:00';
                    } else if (dtStr.includes('T') && !dtStr.includes('+') && !dtStr.includes('Z') && !dtStr.endsWith('Z')) {
                        dtStr = dtStr + '+07:00';
                    }
                    const regMs = new Date(dtStr).getTime();
                    if (isNaN(regMs)) return 0;
                    const targetMinutes = q.target_minutes !== undefined ? q.target_minutes : 60;
                    const deadlineMs = regMs + (targetMinutes * 60 * 1000);
                    return Math.floor((deadlineMs - this.nowTime) / 1000);
                },

                getCountdownText(q) {
                    if (!q.reg_datetime) return '-';
                    const diffSec = this.getCountdownDiffSec(q);

                    // หากครบเวลานับถอยหลัง หรือกรณีเคสกู้ชีพ (ระดับ 1) ที่ต้องตรวจทันที
                    if (diffSec <= 0 || (Number(q.triage_level) === 1 && (q.target_minutes === 0 || !q.target_minutes))) {
                        return '⚠️ กรุณาติดต่อเจ้าหน้าที่';
                    }

                    // แสดงเวลาที่เหลือในรูปแบบนาที
                    const mins = Math.max(1, Math.ceil(diffSec / 60));
                    return `⏳ เหลือ ${mins} นาที`;
                },

                getCountdownClass(q) {
                    const diffSec = this.getCountdownDiffSec(q);
                    if (diffSec <= 0 || (Number(q.triage_level) === 1 && (q.target_minutes === 0 || !q.target_minutes))) {
                        return 'bg-red-600 text-white border-2 border-red-300 animate-pulse font-black shadow-md shadow-red-500/50';
                    }
                    if (diffSec <= 300) { // 5 นาที
                        return 'bg-amber-500 text-slate-950 border-2 border-amber-300 font-black shadow-md shadow-amber-500/40';
                    }
                    return 'bg-slate-950/90 text-emerald-300 border border-emerald-500/50 font-bold shadow-sm';
                },

                init() {
                    this.audioUnlocked = false; 

                    this.fetchQueue();
                    this.pollTimer = setInterval(() => this.fetchQueue(), this.pollSeconds * 1000);
                    setInterval(() => {
                        this.nowTime = Date.now() + this.serverTimeOffset;
                        this.updateClock();
                    }, 1000);
                    this.updateClock();
                    
                    if (this.media.length > 0) {
                        this.startMediaRotation();
                    }
                },

                unlockAudio() {
                    this.audioUnlocked = true;
                },

                async fetchQueue() {
                    try {
                        const res = await fetch(`/tv/${this.boardKey}/queue-data`, { cache: 'no-store' });
                        if (!res.ok) return;
                        const data = await res.json();
                        if (data.generated_at) {
                            const serverMs = new Date(data.generated_at).getTime();
                            if (!isNaN(serverMs)) {
                                this.serverTimeOffset = serverMs - Date.now();
                                this.nowTime = Date.now() + this.serverTimeOffset;
                            }
                        }
                        this.detectNewCalls(data.rooms);
                        this.rooms = data.rooms;

                        if (data.media && Array.isArray(data.media)) {
                            const newSign = JSON.stringify(data.media.map(m => [m.id, m.sort_order, m.duration_seconds, m.file_path, m.is_active]));
                            const oldSign = JSON.stringify(this.media.map(m => [m.id, m.sort_order, m.duration_seconds, m.file_path, m.is_active]));
                            if (newSign !== oldSign) {
                                this.media = data.media;
                                if (this.mediaIndex >= this.media.length) {
                                    this.mediaIndex = 0;
                                }
                                this.startMediaRotation();
                            }
                        }
                    } catch (e) {
                        console.error('queue fetch failed', e);
                    }
                },

                detectNewCalls(newRooms) {
                    const currentKeys = new Set();
                    Object.entries(newRooms).forEach(([roomName, r]) => {
                        r.calling.forEach(q => currentKeys.add(roomName + '-' + q.oqueue));
                    });
                    
                    let hasNew = false;
                    currentKeys.forEach(key => {
                        if (!this.lastCallingKeys.has(key)) hasNew = true;
                    });
                    
                    if (hasNew) this.announce();
                    this.lastCallingKeys = currentKeys;
                },

                announce() {
                    if (!this.audioUnlocked) return;
                },

                isYoutube(url) {
                    if (!url) return false;
                    return url.includes('youtube.com') || url.includes('youtu.be');
                },

                getYtId(url) {
                    if (!url) return null;
                    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/|watch\?.+&v=))([a-zA-Z0-9_-]{11})/);
                    return match ? match[1] : null;
                },

                getYoutubeUrl(url) {
                    const id = this.getYtId(url);
                    if (!id) return url;
                    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&rel=0&playsinline=1`;
                },

                startMediaRotation() {
                    clearTimeout(this.mediaTimer);
                    if (!this.media || this.media.length === 0) return;

                    // Ensure mediaIndex within valid range
                    if (this.mediaIndex < 0 || this.mediaIndex >= this.media.length) {
                        this.mediaIndex = 0;
                    }

                    const item = this.media[this.mediaIndex];
                    if (!item) return;

                    const isYt = this.isYoutube(item.file_path);
                    const duration = parseInt(item.duration_seconds, 10);

                    // If single item in playlist
                    if (this.media.length === 1) {
                        if (item.media_type === 'video' && !isYt) {
                            this.$nextTick(() => {
                                const videoEl = document.getElementById('tv-video-' + this.mediaIndex);
                                if (videoEl) {
                                    videoEl.currentTime = 0;
                                    videoEl.play().catch(() => {
                                        videoEl.muted = true;
                                        videoEl.play().catch(() => {});
                                    });
                                }
                            });
                            if (duration > 0) {
                                this.mediaTimer = setTimeout(() => this.nextMedia(), duration * 1000);
                            }
                        }
                        return;
                    }

                    // Multiple items: sequential rotation
                    if (item.media_type === 'image') {
                        // Image: display for specified duration (default 15s)
                        const seconds = (duration > 0) ? duration : 15;
                        this.mediaTimer = setTimeout(() => {
                            this.nextMedia();
                        }, seconds * 1000);
                    } else if (isYt) {
                        // YouTube: display for specified duration (default 30s)
                        const seconds = (duration > 0) ? duration : 30;
                        this.mediaTimer = setTimeout(() => {
                            this.nextMedia();
                        }, seconds * 1000);
                    } else if (item.media_type === 'video') {
                        // HTML5 Video:
                        // 1. Play from beginning
                        this.$nextTick(() => {
                            const videoEl = document.getElementById('tv-video-' + this.mediaIndex);
                            if (videoEl) {
                                videoEl.currentTime = 0;
                                videoEl.play().catch(() => {
                                    videoEl.muted = true;
                                    videoEl.play().catch(() => {});
                                });
                            }
                        });

                        // 2. Maximum duration limit if specified
                        if (duration > 0) {
                            this.mediaTimer = setTimeout(() => {
                                this.nextMedia();
                            }, duration * 1000);
                        }
                        // If duration is 0 or not set, video plays until @ended fires
                    }
                },

                onVideoEnded(idx) {
                    // Only respond to ended event from the active media item
                    if (idx !== this.mediaIndex) return;

                    if (this.media.length === 1) {
                        const videoEl = document.getElementById('tv-video-' + idx);
                        if (videoEl) {
                            videoEl.currentTime = 0;
                            videoEl.play().catch(() => {});
                        }
                        return;
                    }

                    // Move to next media item immediately upon video completion
                    this.nextMedia();
                },

                nextMedia() {
                    clearTimeout(this.mediaTimer);
                    if (!this.media || this.media.length === 0) return;

                    // Pause current video if any
                    const currentVideo = document.getElementById('tv-video-' + this.mediaIndex);
                    if (currentVideo) {
                        try { currentVideo.pause(); } catch(e) {}
                    }

                    if (this.media.length === 1) {
                        this.startMediaRotation();
                        return;
                    }

                    // Sequential loop: 0 -> 1 -> ... -> N-1 -> 0
                    this.mediaIndex = (this.mediaIndex + 1) % this.media.length;
                    this.startMediaRotation();
                },

                updateClock() {
                    const d = new Date();
                    this.clockTime = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    this.clockDate = d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                }
            };
        }
    </script>
</body>
</html>
