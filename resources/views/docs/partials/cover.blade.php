<div class="cover-page">
    <div class="cover-bg"></div>
    <div class="cover-mesh"></div>
    <div class="cover-orb cover-orb-1"></div>
    <div class="cover-orb cover-orb-2"></div>
    <div class="cover-orb cover-orb-3"></div>

    <div class="cover-inner">
        <div class="cover-left">
            <div class="cover-topbar">
                <span class="cover-pill">SMH HOSPITAL</span>
                <span class="cover-pill cover-pill-gold">USER MANUAL v{{ $version }}</span>
            </div>

            <div class="cover-logo-wrap">
                @if (!empty($logoDataUri))
                    <img src="{{ $logoDataUri }}" alt="Logo" class="cover-logo-img" />
                @else
                    <svg viewBox="0 0 48 48" class="cover-logo-svg" xmlns="http://www.w3.org/2000/svg">
                        <rect x="6" y="16" width="36" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
                        <rect x="21" y="8" width="6" height="12" fill="currentColor"/>
                        <line x1="24" y1="24" x2="24" y2="32" stroke="currentColor" stroke-width="2.5"/>
                        <line x1="19" y1="28" x2="29" y2="28" stroke="currentColor" stroke-width="2.5"/>
                    </svg>
                @endif
            </div>

            <h1 class="cover-title">
                <span class="cover-title-line">คู่มือ</span>
                <span class="cover-title-line cover-title-accent">การใช้งาน</span>
            </h1>
            <p class="cover-app">{{ $appName }}</p>
            <p class="cover-desc">คู่มือฉบับสมบูรณ์พร้อมภาพหน้าจอจริง<br>ครอบคลุมทุกระบบในแอปพลิเคชัน</p>

            <div class="cover-tags">
                <span>🏆 คุณภาพ</span>
                <span>📋 ธุรการ</span>
                <span>🔧 แจ้งซ่อม</span>
                <span>🚗 จองรถ</span>
                <span>📄 หนังสือ</span>
                <span>📚 อบรม</span>
            </div>

            <div class="cover-bottom">
                <div class="cover-stat">
                    <strong>{{ $screenshotCount ?? '40+' }}</strong>
                    <span>ภาพหน้าจอ</span>
                </div>
                <div class="cover-stat">
                    <strong>{{ $moduleCount ?? '20+' }}</strong>
                    <span>ระบบงาน</span>
                </div>
                <div class="cover-stat">
                    <strong>{{ $generatedAt }}</strong>
                    <span>จัดทำเมื่อ</span>
                </div>
            </div>
        </div>

        <div class="cover-right">
            <div class="cover-device">
                <div class="cover-device-bar">
                    <span></span><span></span><span></span>
                    <div class="cover-device-url">{{ parse_url(config('app.url'), PHP_URL_HOST) ?? 'smh.local' }}/dashboard</div>
                </div>
                <div class="cover-device-screen">
                    @if (!empty($dashboardShot))
                        <img src="{{ $dashboardShot }}" alt="Dashboard preview" class="cover-device-img" />
                    @else
                        @include('docs.partials.illustrations', ['type' => 'dashboard'])
                    @endif
                </div>
            </div>
            <p class="cover-device-caption">ตัวอย่างหน้าจอแดชบอร์ดหลัก</p>
        </div>
    </div>
</div>
