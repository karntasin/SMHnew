<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Admin - TV Board</title>
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
</head>
<body class="font-sans antialiased text-slate-900 bg-slate-50">
    <div class="min-h-screen flex flex-col">
        <!-- Top Navigation -->
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div class="flex items-center gap-6">
                    <a href="{{ url('/dashboard') }}" class="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        กลับหน้าหลัก (Dashboard)
                    </a>
                    
                    <div class="h-6 w-px bg-slate-200"></div>

                    <nav class="flex gap-4">
                        <a href="{{ route('admin.tv.settings.edit') }}" class="text-sm font-medium {{ request()->routeIs('admin.tv.settings.edit') ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600' }}">ตั้งค่าจอแสดงผล</a>
                        <a href="{{ route('admin.tv.playlist.index') }}" class="text-sm font-medium {{ request()->routeIs('admin.tv.playlist.index') ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600' }}">จัดการสื่อ/ประกาศ</a>
                        <a href="{{ route('admin.tv.rooms.index') }}" class="text-sm font-medium {{ request()->routeIs('admin.tv.rooms.index') ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600' }}">ตั้งค่าห้องตรวจ</a>
                    </nav>
                </div>
                
                <div>
                    <a href="{{ route('tv.board') }}" target="_blank" class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        เปิดหน้าจอทีวี
                    </a>
                </div>
            </div>
        </header>

        <!-- Page Content -->
        <main class="flex-1">
            @yield('content')
        </main>
    </div>
</body>
</html>
