<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>จอแสดงคิวห้องตรวจ</title>
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
</head>
<body class="bg-slate-900 text-white h-screen w-screen overflow-hidden"
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
                            <iframe :src="`https://www.youtube.com/embed/` + getYtId(item.file_path) + `?autoplay=1&controls=0&loop=1&playlist=` + getYtId(item.file_path)" 
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
                <div class="p-8 h-full flex flex-col bg-gradient-to-br from-indigo-900 to-slate-900">
                    <h2 class="text-4xl font-extrabold mb-6 text-yellow-400 drop-shadow-md">📢 ข่าวสาร/ประกาศ</h2>
                    <div class="flex-1 overflow-hidden text-3xl leading-relaxed text-slate-100" x-html="rssHtml"></div>
                </div>
            @endif
        </div>

        <!-- ฝั่งขวา: รายการคิว -->
        <div class="h-full overflow-y-auto bg-gradient-to-br from-slate-950 to-slate-900 p-6 flex flex-col"
             style="width: {{ $settings->right_panel_width_percent }}%;">
            
            <div class="flex items-center justify-between mb-6 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-lg">
                <div class="flex items-center gap-4">
                    <div class="bg-indigo-500 p-3 rounded-xl shadow-inner">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </div>
                    <h1 class="text-4xl font-extrabold text-white tracking-wide">คิวห้องตรวจ</h1>
                </div>
                <div class="text-right">
                    <span class="text-3xl font-bold text-sky-400 drop-shadow-sm" x-text="clockTime"></span>
                    <div class="text-lg text-slate-400 mt-1" x-text="clockDate"></div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-6 flex-1 content-start">
                <template x-for="(roomData, roomName) in rooms" :key="roomName">
                    <div class="bg-slate-800/80 rounded-2xl p-5 shadow-xl border border-slate-700 flex flex-col transition-all">
                        
                        <!-- ชื่อห้อง -->
                        <div class="bg-slate-900/50 -mx-5 -mt-5 px-5 py-4 rounded-t-2xl border-b border-slate-700/50 mb-4 flex items-center justify-between">
                            <h2 class="text-2xl font-bold text-sky-300 truncate pr-2" x-text="roomName"></h2>
                            <div class="bg-indigo-500/20 text-indigo-300 text-sm font-semibold px-3 py-1 rounded-full border border-indigo-500/30">รอ <span x-text="roomData.waiting.length"></span> คิว</div>
                        </div>

                        <!-- กำลังเรียกคิว -->
                        <div class="mb-4 space-y-2">
                            <template x-for="q in roomData.calling" :key="roomName + '-calling-' + q.oqueue">
                                <div class="row-calling bg-gradient-to-r from-yellow-400 to-amber-500 rounded-xl px-4 py-4 shadow-lg border border-yellow-300 flex justify-between items-center transform scale-100 transition-all">
                                    <div class="flex items-baseline gap-3">
                                        <span class="text-amber-900 text-xl font-bold">เรียกคิว</span>
                                        <span class="text-slate-900 text-4xl font-black drop-shadow-sm" x-text="q.oqueue"></span>
                                    </div>
                                    <span class="text-slate-900 text-2xl font-extrabold truncate pl-4" x-text="q.display_name"></span>
                                </div>
                            </template>
                            <template x-if="roomData.calling.length === 0">
                                <div class="bg-slate-700/30 rounded-xl px-4 py-4 border border-slate-600 border-dashed text-center">
                                    <span class="text-slate-500 text-lg font-medium">-- ว่าง --</span>
                                </div>
                            </template>
                        </div>

                        <!-- คิวรอตรวจ -->
                        <div class="bg-slate-900/40 rounded-xl p-4 flex-1 border border-slate-700/50">
                            <h3 class="text-sm text-slate-400 font-bold mb-3 uppercase tracking-wider">คิวรอตรวจ</h3>
                            <div class="grid grid-cols-1 gap-2">
                                <template x-for="q in roomData.waiting" :key="roomName + '-waiting-' + q.oqueue">
                                    <div class="bg-slate-700/50 rounded-lg px-4 py-2 flex justify-between items-center border border-slate-600/50 hover:bg-slate-700/70 transition-colors">
                                        <span class="text-sky-300 text-xl font-bold" x-text="q.oqueue"></span>
                                        <span class="text-slate-300 text-lg font-medium truncate pl-2" x-text="q.display_name"></span>
                                    </div>
                                </template>
                            </div>
                            <p x-show="roomData.waiting.length === 0" class="text-slate-500 italic text-center py-4">ไม่มีคิวรอ</p>
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

                init() {
                    this.audioUnlocked = false; // บังคับให้กด 1 ครั้งเสมอ เพื่อให้ Browser อนุญาตให้เล่นเสียงสื่อได้

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
                    // ปิดเสียงเรียกคิวชั่วคราวตามที่ผู้ใช้ร้องขอ (ใส่ comment ไว้)
                    // const unlock = new Audio('/sounds/chime.mp3');
                    // unlock.volume = 0.01;
                    // unlock.play().catch(()=>{});
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
                    // ปิดใช้งานเสียงเรียกคิวชั่วคราว
                    /*
                    if (this.chimeEnabled) {
                        const audio = new Audio('/sounds/chime.mp3');
                        audio.play().catch(() => {});
                    }
                    */
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
