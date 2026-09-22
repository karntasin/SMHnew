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
        $headerBoxBg = 'bg-red-900/40 border-red-700/60';
        $iconBox = 'from-red-500 to-rose-700 shadow-rose-900/40';
        $titleGradient = 'from-red-200 via-rose-300 to-amber-200';
        $roomCardClass = 'bg-red-950/40 border-red-700/50 shadow-rose-950/50';
        $roomHeaderBg = 'bg-red-950/70 border-red-800/50';
        $roomTitleColor = 'text-rose-200';
        $waitBadgeColor = 'bg-rose-500/25 text-rose-200 border-rose-500/40';
        $waitingAreaBg = 'bg-black/40 border-red-900/40';
        $waitingTitleColor = 'text-rose-300/80';
        $waitingItemBg = 'bg-red-950/50 border-red-800/40 hover:bg-red-900/40';
        $waitingNoColor = 'text-amber-300';
    } elseif ($normalizedKey === 'drug') {
        $boardTitle = 'คิวห้องจ่ายยา (Pharmacy)';
        $bodyBg = 'bg-slate-950';
        $rightPanelBg = 'bg-gradient-to-br from-teal-950 via-slate-900 to-emerald-950';
        $headerBoxBg = 'bg-emerald-900/30 border-emerald-700/50';
        $iconBox = 'from-emerald-500 to-teal-700 shadow-emerald-900/40';
        $titleGradient = 'from-emerald-200 via-teal-200 to-cyan-200';
        $roomCardClass = 'bg-emerald-950/40 border-emerald-700/50 shadow-emerald-950/50';
        $roomHeaderBg = 'bg-emerald-950/70 border-emerald-800/50';
        $roomTitleColor = 'text-emerald-200';
        $waitBadgeColor = 'bg-emerald-500/25 text-emerald-200 border-emerald-500/40';
        $waitingAreaBg = 'bg-black/40 border-emerald-900/40';
        $waitingTitleColor = 'text-emerald-300/80';
        $waitingItemBg = 'bg-emerald-950/50 border-emerald-800/40 hover:bg-emerald-900/40';
        $waitingNoColor = 'text-emerald-300';
    } else {
        $boardTitle = 'คิวรับบริการห้องตรวจ';
        $bodyBg = 'bg-slate-900';
        $rightPanelBg = 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950';
        $headerBoxBg = 'bg-slate-800/60 border-slate-700/80';
        $iconBox = 'from-sky-400 to-indigo-600 shadow-indigo-900/40';
        $titleGradient = 'from-sky-300 to-indigo-300';
        $roomCardClass = 'bg-slate-800/50 border-slate-700/50';
        $roomHeaderBg = 'bg-slate-900/60 border-slate-700/50';
        $roomTitleColor = 'text-sky-300';
        $waitBadgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
        $waitingAreaBg = 'bg-slate-900/40 border-slate-700/50';
        $waitingTitleColor = 'text-slate-400';
        $waitingItemBg = 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-700';
        $waitingNoColor = 'text-sky-300';
    }
@endphp
<body class="{{ $bodyBg }} text-white h-screen w-screen overflow-hidden"
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
        <div class="h-full relative bg-black shadow-2xl z-10" style="width: {{ $settings->left_panel_width_percent }}%;">
            @if($settings->left_media_mode === 'video' || $settings->left_media_mode === 'image_slider')
                <template x-for="(item, idx) in media" :key="item.id">
                    <div x-show="mediaIndex === idx" class="w-full h-full absolute inset-0 bg-black" x-transition.opacity.duration.700ms>
                        <template x-if="isYoutube(item.file_path)">
                            <iframe :src="`https://www.youtube.com/embed/${getYtId(item.file_path)}?autoplay=1&controls=0&loop=1&playlist=${getYtId(item.file_path)}`" 
                                    class="w-full h-full pointer-events-none" frameborder="0" allow="autoplay; fullscreen"></iframe>
                        </template>
                        <template x-if="item.media_type === 'video' && !isYoutube(item.file_path)">
                            <video :src="item.file_path" autoplay class="w-full h-full object-cover" @ended="nextMedia()"></video>
                        </template>
                        <template x-if="item.media_type === 'image'">
                            <img :src="item.file_path" class="w-full h-full object-cover">
                        </template>
                    </div>
                </template>
            @else
                <div class="p-8 h-full flex flex-col bg-gradient-to-br from-indigo-950 via-slate-900 to-black">
                    <h2 class="text-4xl font-extrabold mb-6 text-yellow-400 drop-shadow-md">📢 ข่าวสาร/ประกาศ</h2>
                    <div class="flex-1 overflow-hidden text-3xl leading-relaxed text-slate-100" x-html="rssHtml"></div>
                </div>
            @endif
        </div>

        <!-- ฝั่งขวา: รายการคิว (No Scrolling) -->
        <div class="h-full {{ $rightPanelBg }} p-6 flex flex-col overflow-hidden"
             style="width: {{ $settings->right_panel_width_percent }}%;">
            
            <div class="flex-shrink-0 flex items-center justify-between mb-6 {{ $headerBoxBg }} backdrop-blur-md p-6 rounded-2xl border shadow-2xl">
                <div class="flex items-center gap-4">
                    <div class="bg-gradient-to-br {{ $iconBox }} p-3 rounded-xl shadow-inner">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </div>
                    <h1 class="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r {{ $titleGradient }} tracking-wide">{{ $boardTitle }}</h1>
                </div>
                <div class="text-right flex flex-col items-end">
                    <span class="text-4xl font-black text-amber-400 drop-shadow-lg" x-text="clockTime"></span>
                    <div class="text-lg font-medium text-slate-400 mt-1" x-text="clockDate"></div>
                </div>
            </div>

            <!-- Grid dynamically sized -->
            <div class="grid gap-4 flex-1 min-h-0" :class="gridClass">
                <template x-for="(roomData, roomName) in rooms" :key="roomName">
                    <!-- Room Card -->
                    <div class="room-card {{ $roomCardClass }} backdrop-blur-sm rounded-2xl shadow-xl border flex flex-col min-h-0 relative overflow-hidden">
                        
                        <!-- Room Header -->
                        <div class="room-header-wrap {{ $roomHeaderBg }} border flex items-center justify-between flex-shrink-0">
                            <h2 class="room-title font-extrabold {{ $roomTitleColor }} drop-shadow" x-text="roomName"></h2>
                            <div class="wait-badge {{ $waitBadgeColor }} font-bold rounded-full border whitespace-nowrap">
                                รอ <span x-text="roomData.waiting.length"></span>
                            </div>
                        </div>

                        <!-- Calling Area -->
                        <div class="flex-shrink-0 space-y-2">
                            <template x-for="q in roomData.calling" :key="roomName + '-calling-' + q.oqueue">
                                <div class="calling-box bg-gradient-to-r from-yellow-400 to-amber-500 shadow-xl border border-yellow-300 flex justify-between items-center transform scale-100 transition-all">
                                    <div class="flex items-baseline gap-3">
                                        <span class="calling-label text-amber-900 font-bold tracking-wide uppercase">เรียกคิว</span>
                                        <span class="calling-no text-slate-900 font-black drop-shadow-sm" x-text="q.oqueue"></span>
                                    </div>
                                    <span class="calling-name text-slate-900 font-extrabold truncate pl-4" x-text="q.display_name"></span>
                                </div>
                            </template>
                            <template x-if="roomData.calling.length === 0">
                                <div class="calling-box bg-slate-700/30 border border-slate-600 border-dashed flex items-center justify-center">
                                    <span class="text-slate-500 font-medium empty-state">-- ว่าง --</span>
                                </div>
                            </template>
                        </div>

                        <!-- Waiting Area -->
                        <div class="{{ $waitingAreaBg }} rounded-xl p-3 flex-1 flex flex-col min-h-0 border overflow-hidden relative">
                            <h3 class="waiting-title {{ $waitingTitleColor }} font-bold uppercase tracking-wider flex-shrink-0">คิวรอตรวจ</h3>
                            <div class="flex-1 overflow-hidden flex flex-col gap-1">
                                <template x-for="q in roomData.waiting.slice(0, maxWaiting)" :key="roomName + '-waiting-' + q.oqueue">
                                    <div class="waiting-item {{ $waitingItemBg }} flex justify-between items-center border transition-colors">
                                        <span class="waiting-no {{ $waitingNoColor }} font-bold" x-text="q.oqueue"></span>
                                        <span class="waiting-name text-slate-300 font-medium truncate pl-2" x-text="q.display_name"></span>
                                    </div>
                                </template>
                                <!-- Show dots if more waiting queues exist -->
                                <template x-if="roomData.waiting.length > maxWaiting">
                                    <div class="text-center text-slate-500 font-bold text-sm mt-1 animate-pulse">...และอีก <span x-text="roomData.waiting.length - maxWaiting"></span> คิว</div>
                                </template>
                            </div>
                            <template x-if="roomData.waiting.length === 0">
                                <div class="absolute inset-0 flex items-center justify-center">
                                    <span class="text-slate-600 italic font-medium">ไม่มีคิวรอ</span>
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

                get roomCount() {
                    return Object.keys(this.rooms).length;
                },

                get gridClass() {
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
                    const len = this.roomCount;
                    if (len === 1) return 10;
                    if (len <= 4) return 6;
                    if (len <= 6) return 5;
                    if (len <= 8) return 4;
                    return 4;
                },

                init() {
                    this.audioUnlocked = false; 

                    this.fetchQueue();
                    this.pollTimer = setInterval(() => this.fetchQueue(), this.pollSeconds * 1000);
                    setInterval(() => this.updateClock(), 1000);
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
                        this.detectNewCalls(data.rooms);
                        this.rooms = data.rooms;
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
                    return url && (url.includes('youtube.com') || url.includes('youtu.be'));
                },

                getYtId(url) {
                    let match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
                    return match ? match[1] : null;
                },

                startMediaRotation() {
                    const item = this.media[this.mediaIndex];
                    if (!item) return;
                    
                    const isYt = this.isYoutube(item.file_path);
                    const duration = (item.media_type === 'image' || isYt) ? (item.duration_seconds * 1000) : null;
                    
                    if (duration) {
                        this.mediaTimer = setTimeout(() => this.nextMedia(), duration);
                    }
                },

                nextMedia() {
                    clearTimeout(this.mediaTimer);
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
