@php
    $curBoard = $boardKey ?? ($setting->board_key ?? 'default');
    $normalized = match (strtolower(trim($curBoard))) {
        '003', 'er', 'tv-er' => 'er',
        '013', 'drug', 'tv-drug', 'pharmacy' => 'drug',
        default => 'opd',
    };

    $info = match ($normalized) {
        'er' => [
            'title' => 'ระบบคิวห้องฉุกเฉิน (ER)',
            'color' => 'rose',
            'badge' => 'ER Emergency',
            'tv_url' => '/er',
            'base_url' => '/admin/tv-er',
            'board_key' => '003',
        ],
        'drug' => [
            'title' => 'ระบบคิวห้องจ่ายยา (Pharmacy)',
            'color' => 'emerald',
            'badge' => 'Pharmacy',
            'tv_url' => '/drug',
            'base_url' => '/admin/tv-drug',
            'board_key' => '013',
        ],
        default => [
            'title' => 'ระบบคิวห้องตรวจ (OPD)',
            'color' => 'sky',
            'badge' => 'OPD Clinic',
            'tv_url' => '/tv',
            'base_url' => '/admin/tv',
            'board_key' => 'default',
        ],
    };
@endphp

<div class="mb-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
    <!-- Header Top Row -->
    <div class="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
            <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold px-2.5 py-0.5 rounded-full {{ $info['color'] === 'rose' ? 'bg-rose-100 text-rose-800' : ($info['color'] === 'emerald' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800') }}">
                    {{ $info['badge'] }}
                </span>
                <span class="text-xs text-slate-400">Board Key: {{ $info['board_key'] }}</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900">{{ $info['title'] }}</h1>
        </div>

        <div class="flex items-center gap-3">
            <a href="{{ $info['tv_url'] }}" target="_blank"
               class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white shadow-md transition-all hover:scale-105 {{ $info['color'] === 'rose' ? 'bg-rose-600 hover:bg-rose-700' : ($info['color'] === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700') }}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                <span>เปิดหน้าจอทีวี ({{ $info['tv_url'] }})</span>
            </a>
        </div>
    </div>

    <!-- Switch Board Bar & Tab Bar -->
    <div class="flex flex-wrap items-center justify-between gap-4 pt-4">
        <!-- Tab Bar -->
        <div class="flex items-center gap-2">
            <a href="{{ $info['base_url'] }}/rooms"
               class="px-4 py-2 rounded-xl text-sm font-bold transition-colors {{ request()->is('*/rooms*') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100' }}">
                📋 จับคู่ห้องตรวจ
            </a>
            <a href="{{ $info['base_url'] }}/settings"
               class="px-4 py-2 rounded-xl text-sm font-bold transition-colors {{ request()->is('*/settings*') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100' }}">
                ⚙️ ตั้งค่าจอแสดงผล
            </a>
            <a href="{{ $info['base_url'] }}/playlist"
               class="px-4 py-2 rounded-xl text-sm font-bold transition-colors {{ request()->is('*/playlist*') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100' }}">
                🎬 จัดการสื่อ/ประกาศ
            </a>
        </div>

        <!-- Switch between Boards -->
        <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <span class="text-xs font-medium text-slate-400 px-2">สลับจุดบริการ:</span>
            <a href="/admin/tv/rooms" class="px-3 py-1 text-xs font-bold rounded-lg transition-colors {{ $normalized === 'opd' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900' }}">
                🏥 ห้องตรวจ
            </a>
            <a href="/admin/tv-er/rooms" class="px-3 py-1 text-xs font-bold rounded-lg transition-colors {{ $normalized === 'er' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900' }}">
                🚨 ห้องฉุกเฉิน
            </a>
            <a href="/admin/tv-drug/rooms" class="px-3 py-1 text-xs font-bold rounded-lg transition-colors {{ $normalized === 'drug' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900' }}">
                💊 ห้องจ่ายยา
            </a>
        </div>
    </div>
</div>