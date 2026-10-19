<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#0f766e">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>คิว {{ $oqueue }}</title>
    <link rel="manifest" href="{{ asset('queue-portal.webmanifest') }}">
    @include('queue-portal.partials.styles')
</head>
<body>
    @php
        $found = is_array($status);
        $calling = $found && !empty($status['is_calling']);
    @endphp
    <main
        class="wrap"
        id="queue-portal"
        data-oqueue="{{ $oqueue }}"
        data-status-url="{{ route('queue-portal.status', ['oqueue' => $oqueue]) }}"
        data-push-url="{{ route('queue-portal.push', ['oqueue' => $oqueue]) }}"
        data-key-url="{{ route('queue-portal.push-key') }}"
        data-push-configured="{{ $pushConfigured ? '1' : '0' }}"
        data-sw-url="{{ asset('queue-portal-sw.js') }}"
    >
        <p class="eyebrow">ติดตามคิววันนี้</p>
        <p class="queue-label">เลขคิว</p>
        <p class="queue-number" id="queue-number">{{ $found ? $status['oqueue'] : $oqueue }}</p>

        <p class="banner banner-warn" id="unavailable" @unless($unavailable) hidden @endunless>ยังเชื่อมต่อระบบคิวไม่ได้ ลองใหม่อีกครั้ง</p>
        <p class="banner banner-warn" id="missing" @if($found || $unavailable) hidden @endif>ไม่พบคิวนี้ในวันนี้</p>

        <section id="board" @unless($found) hidden @endunless>
            <p class="banner banner-contact" id="contact-banner" @if(! $found || empty($status['contact_text'])) hidden @endif>
                <span id="contact-text">{{ $found ? ($status['contact_text'] ?? '') : '' }}</span>
            </p>
            <p class="banner banner-call" id="calling-banner" @unless($calling) hidden @endunless>
                ถึงคิวแล้ว ที่<span id="calling-room">{{ $found ? $status['room_name'] : '' }}</span>
            </p>

            <div class="card stats">
                <div>
                    <p class="stat-label">คิวที่เหลือข้างหน้า</p>
                    <p class="stat-value" id="remaining">{{ $found && ($status['remaining'] ?? null) !== null ? $status['remaining'] : '–' }}</p>
                </div>
                <div>
                    <p class="stat-label">ห้องปัจจุบัน</p>
                    <p class="stat-room" id="room-name">{{ $found ? $status['room_name'] : '' }}</p>
                </div>
            </div>

            <section class="card">
                <h2>ขั้นตอนวันนี้</h2>
                <ol class="steps" id="steps">
                    @foreach(($status['steps'] ?? []) as $step)
                        <li class="step step-{{ $step['state'] }}">
                            <strong>{{ $step['label'] }}</strong>
                            <span>{{ $step['detail'] }}</span>
                        </li>
                    @endforeach
                </ol>
            </section>

            <section class="card pharmacy">
                <h2>สถานะยา</h2>
                <p id="pharmacy-text">{{ $found ? $status['pharmacy_text'] : '' }}</p>
            </section>
        </section>

        <section class="card notify" id="notify-card">
            <h2>แจ้งเตือนบนมือถือ</h2>
            <p>แจ้งเมื่อเหลือไม่เกิน 3 คิว และเมื่อถึงคิว แม้ปิดหน้านี้ไว้</p>
            <button type="button" id="enable-push" @disabled(! $pushConfigured)>เปิดการแจ้งเตือน</button>
            <p class="hint" id="push-note">
                @if($pushConfigured)
                    กดอนุญาตเมื่อเบราว์เซอร์ถาม Android แจ้งได้หลังปิดหน้าจอ
                @else
                    ระบบแจ้งเตือนยังไม่พร้อมใช้งาน
                @endif
            </p>
            <ol class="ios-steps" id="ios-steps" hidden>
                <li>กดปุ่มแชร์ที่แถบล่างของ Safari (สี่เหลี่ยมมีลูกศรชี้ขึ้น)</li>
                <li>เลื่อนแล้วเลือก เพิ่มไปยังหน้าจอโฮม</li>
                <li>ปิด Safari แล้วเปิดไอคอนติดตามคิวจากหน้าโฮม จากนั้นกดเปิดการแจ้งเตือน</li>
            </ol>
        </section>

        <p class="back"><a href="{{ route('queue-portal.index') }}">กรอกเลขคิวอื่น</a></p>
    </main>
    <script src="{{ asset('queue-portal.js') }}" defer></script>
</body>
</html>
