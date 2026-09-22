@extends('layouts.admin')
@section('content')
<div class="max-w-2xl mx-auto p-6">
    @include('admin.tv.header')
    <h1 class="text-2xl font-bold mb-4">ตั้งค่าจอแสดงผล ({{ $setting->board_key }})</h1>

    @if(session('status'))
        <div class="bg-green-100 text-green-800 p-3 rounded mb-4">{{ session('status') }}</div>
    @endif

    <form method="POST" action="{{ route('admin.tv.settings.update', $setting->board_key) }}">
        @csrf @method('PUT')

        <label class="block mb-2 font-semibold">โหมดสื่อฝั่งซ้าย</label>
        <select name="left_media_mode" class="border rounded p-2 w-full mb-4">
            @foreach(['video' => 'วิดีโอวนซ้ำ', 'image_slider' => 'สไลด์ภาพ', 'rss_news' => 'ข่าว/ประกาศตัววิ่ง'] as $val => $label)
                <option value="{{ $val }}" @selected($setting->left_media_mode === $val)>{{ $label }}</option>
            @endforeach
        </select>

        <label class="block mb-2 font-semibold">สัดส่วนฝั่งซ้าย (%)</label>
        <select name="left_panel_width_percent" class="border rounded p-2 w-full mb-4">
            @foreach([40, 45] as $pct)
                <option value="{{ $pct }}" @selected($setting->left_panel_width_percent == $pct)>
                    {{ $pct }}% / {{ 100 - $pct }}%
                </option>
            @endforeach
        </select>

        <label class="inline-flex items-center mb-4">
            <input type="checkbox" name="chime_enabled" value="1" @checked($setting->chime_enabled)>
            <span class="ml-2">เปิดเสียงเรียกคิว (Chime)</span>
        </label><br>

        <label class="inline-flex items-center mb-4">
            <input type="checkbox" name="tts_enabled" value="1" @checked($setting->tts_enabled)>
            <span class="ml-2">เปิดเสียงอ่านคิว (TTS)</span>
        </label>

        <label class="block mb-2 font-semibold">ความถี่ในการรีเฟรชคิว (วินาที)</label>
        <input type="number" name="queue_poll_seconds" value="{{ $setting->queue_poll_seconds }}"
               min="3" max="60" class="border rounded p-2 w-full mb-4">

        <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded">บันทึก</button>
    </form>
</div>
@endsection
