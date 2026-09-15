<!DOCTYPE html>

<html lang="th">

<head>

    <meta charset="UTF-8">

    <title>คู่มือการใช้งาน — {{ $appName }}</title>

    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

    <style>

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {

            font-family: 'Sarabun', sans-serif;

            font-size: 10pt;

            line-height: 1.45;

            color: #1e293b;

            background: #fff;

        }

        @page { size: A4; margin: 10mm 12mm; }



        /* ── Cover (modern split layout) ── */
        .cover-page {
            position: relative; width: 100%; height: 277mm;
            overflow: hidden; page-break-after: always; color: #fff;
        }
        .cover-bg {
            position: absolute; inset: 0;
            background: linear-gradient(135deg, #0f0a1e 0%, #1e1040 30%, #4c1d95 70%, #6d28d9 100%);
        }
        .cover-mesh {
            position: absolute; inset: 0; opacity: 0.12;
            background-image: radial-gradient(circle at 20% 50%, rgba(168,85,247,0.4) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(99,102,241,0.3) 0%, transparent 40%);
        }
        .cover-orb { position: absolute; border-radius: 50%; filter: blur(80px); }
        .cover-orb-1 { width: 300px; height: 300px; background: #a855f7; top: -100px; left: -80px; opacity: 0.25; }
        .cover-orb-2 { width: 250px; height: 250px; background: #6366f1; bottom: -60px; right: 20%; opacity: 0.2; }
        .cover-orb-3 { width: 180px; height: 180px; background: #f59e0b; top: 40%; right: -40px; opacity: 0.15; }
        .cover-inner {
            position: relative; z-index: 2; height: 100%;
            display: flex; align-items: center; padding: 16mm 14mm; gap: 12mm;
        }
        .cover-left { flex: 1; display: flex; flex-direction: column; justify-content: center; }
        .cover-right { flex: 0 0 48%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .cover-topbar { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
        .cover-pill {
            font-size: 7pt; font-weight: 700; letter-spacing: 0.12em;
            background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
            padding: 4px 10px; border-radius: 20px;
        }
        .cover-pill-gold { background: rgba(245,158,11,0.2); border-color: rgba(251,191,36,0.4); color: #fde68a; }
        .cover-logo-wrap {
            width: 56px; height: 56px; border-radius: 16px;
            background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.25);
            display: flex; align-items: center; justify-content: center; margin-bottom: 12px;
        }
        .cover-logo-svg { width: 32px; height: 32px; color: #fff; }
        .cover-logo-img { width: 40px; height: 40px; object-fit: contain; }
        .cover-title { margin-bottom: 4px; line-height: 1; }
        .cover-title-line { display: block; font-size: 28pt; font-weight: 800; }
        .cover-title-accent {
            font-size: 32pt;
            background: linear-gradient(90deg, #fff 0%, #e9d5ff 50%, #fbbf24 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .cover-app { font-size: 13pt; font-weight: 600; color: #e9d5ff; margin-bottom: 8px; }
        .cover-desc { font-size: 9.5pt; opacity: 0.85; line-height: 1.5; margin-bottom: 12px; }
        .cover-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 16px; }
        .cover-tags span {
            font-size: 7.5pt; font-weight: 600;
            background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
            padding: 3px 8px; border-radius: 12px;
        }
        .cover-bottom { display: flex; gap: 16px; margin-top: auto; }
        .cover-stat { text-align: center; }
        .cover-stat strong { display: block; font-size: 14pt; font-weight: 800; color: #fbbf24; }
        .cover-stat span { font-size: 7pt; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.05em; }
        .cover-device {
            width: 100%; background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.15); border-radius: 12px;
            overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        .cover-device-bar {
            display: flex; align-items: center; gap: 5px;
            padding: 6px 10px; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .cover-device-bar span { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.3); }
        .cover-device-bar span:first-child { background: #ef4444; }
        .cover-device-bar span:nth-child(2) { background: #f59e0b; }
        .cover-device-bar span:nth-child(3) { background: #22c55e; }
        .cover-device-url {
            flex: 1; margin-left: 6px; font-size: 6.5pt; color: rgba(255,255,255,0.5);
            background: rgba(0,0,0,0.2); padding: 3px 8px; border-radius: 4px; font-family: monospace;
        }
        .cover-device-screen { background: #f8fafc; line-height: 0; }
        .cover-device-img { width: 100%; height: auto; display: block; }
        .cover-device-caption { font-size: 7pt; opacity: 0.6; margin-top: 8px; text-align: center; }

        /* ── Screenshot gallery ── */
        .gallery-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 8px 0; }
        .gallery-item { page-break-inside: avoid; }
        .gallery-thumb {
            background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px;
            overflow: hidden; height: 72px;
        }
        .gallery-thumb img { width: 100%; height: 100%; object-fit: cover; object-position: top left; display: block; }
        .gallery-thumb svg { width: 100%; height: 72px; }
        .gallery-label { font-size: 6.5pt; color: #64748b; text-align: center; margin-top: 2px; font-weight: 600; }
        .screenshot-stack { display: flex; flex-direction: column; gap: 6px; }



        /* ── Sections ── */

        .section { page-break-after: always; }

        .section:last-child { page-break-after: auto; }

        h2.section-title {

            font-size: 14pt; font-weight: 700; color: #5b21b6;

            border-bottom: 2.5px solid #7c3aed;

            padding-bottom: 4px; margin-bottom: 10px;

        }

        h3.module-title { font-size: 11pt; font-weight: 700; color: #4c1d95; }

        .module-sub { font-size: 9pt; color: #64748b; margin-bottom: 4px; }

        .badge {

            display: inline-block; background: #ede9fe; color: #5b21b6;

            font-size: 7pt; font-weight: 600; padding: 2px 7px; border-radius: 10px; margin-bottom: 4px;

        }

        .path { font-size: 8pt; color: #7c3aed; font-family: monospace; margin-bottom: 6px; }



        /* ── TOC ── */

        .toc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin: 8px 0; }

        .toc-item {

            display: flex; justify-content: space-between; align-items: baseline;

            border-bottom: 1px dotted #cbd5e1; padding: 4px 0; font-size: 9pt;

        }

        .toc-item span:last-child { color: #7c3aed; font-weight: 600; font-size: 8pt; }



        /* ── Quick start ── */

        .quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 8px 0; }

        .quick-card {

            border: 1px solid #ddd6fe; border-radius: 8px; padding: 8px;

            background: linear-gradient(135deg, #faf5ff, #fff);

        }

        .quick-card .num {

            width: 22px; height: 22px; background: #7c3aed; color: #fff;

            border-radius: 6px; display: inline-flex; align-items: center;

            justify-content: center; font-weight: 700; font-size: 10pt; margin-bottom: 4px;

        }

        .quick-card h4 { font-size: 9pt; font-weight: 700; color: #4c1d95; }

        .quick-card p { font-size: 8pt; color: #64748b; line-height: 1.35; }



        /* ── Screenshots ── */

        .screenshot-figure { margin: 0; page-break-inside: avoid; }

        .screenshot-box {

            background: #f8fafc; border: 1px solid #e2e8f0;

            border-radius: 8px; padding: 4px; overflow: hidden;

        }

        .screenshot-img {

            width: 100%; height: auto; max-height: 155px;

            object-fit: cover; object-position: top left;

            border-radius: 5px; display: block;

        }

        .screenshot-caption { font-size: 7.5pt; color: #64748b; text-align: center; margin-top: 3px; }

        .screenshot-badge { font-size: 7pt; color: #7c3aed; text-align: center; font-weight: 600; }



        /* ── Module cards ── */

        .module-block {

            border: 1px solid #e9d5ff; border-radius: 8px;

            padding: 10px; margin-bottom: 10px;

            page-break-inside: avoid;

            background: #fefefe;

        }

        .module-layout { display: flex; gap: 10px; align-items: flex-start; margin-top: 6px; }

        .module-shot { flex: 0 0 42%; min-width: 0; }

        .module-text { flex: 1; min-width: 0; }

        .module-text-cols { display: flex; gap: 10px; }

        .module-text-cols > div { flex: 1; }



        ul.features { list-style: none; margin: 4px 0; }

        ul.features li { padding: 1px 0 1px 13px; position: relative; font-size: 8.5pt; }

        ul.features li::before { content: '✓'; position: absolute; left: 0; color: #7c3aed; font-weight: bold; font-size: 8pt; }



        ol.steps { margin: 4px 0 4px 14px; font-size: 8.5pt; }

        ol.steps li { margin-bottom: 3px; }

        ol.steps strong { color: #4c1d95; }



        .info-row { display: flex; gap: 8px; margin: 6px 0; }

        .info-box {

            flex: 1; padding: 6px 8px; border-radius: 6px; font-size: 8.5pt; line-height: 1.4;

        }

        .intro-box { background: #eff6ff; border-left: 3px solid #3b82f6; }

        .when-box { background: #f0fdf4; border-left: 3px solid #22c55e; }

        .tips {

            background: #fffbeb; border-left: 3px solid #f59e0b;

            padding: 5px 8px; margin-top: 6px; font-size: 8pt; border-radius: 0 5px 5px 0;

        }

        .tips strong { color: #b45309; }

        .issues-box {

            background: #fef2f2; border-left: 3px solid #ef4444;

            padding: 5px 8px; margin-top: 6px; font-size: 8pt; border-radius: 0 5px 5px 0;

        }

        .label-tag { font-size: 7pt; font-weight: 700; color: #5b21b6; text-transform: uppercase; letter-spacing: 0.04em; }



        .cat-header {

            background: linear-gradient(90deg, #ede9fe 0%, #faf5ff 60%, #fff 100%);

            padding: 8px 12px; border-radius: 8px; margin-bottom: 10px;

            border-left: 4px solid #7c3aed;

            page-break-before: always;

        }

        .cat-header h2 { font-size: 13pt; font-weight: 700; color: #4c1d95; border: none; margin: 0; padding: 0; }

        .cat-header:first-of-type { page-break-before: auto; }



        .start-shots { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }

        .start-shot-wide { grid-column: 1 / -1; }



        .faq-item { margin-bottom: 8px; page-break-inside: avoid; }

        .faq-q { font-weight: 700; color: #4c1d95; font-size: 9pt; margin-bottom: 2px; }

        .faq-a { font-size: 9pt; color: #475569; padding-left: 10px; }



        .footer-note {

            text-align: center; font-size: 8pt; color: #94a3b8;

            margin-top: 16px; padding-top: 10px; border-top: 1px solid #e2e8f0;

        }

        .col-title { font-size: 8.5pt; font-weight: 700; color: #5b21b6; margin-bottom: 3px; }

    </style>

</head>

<body>



{{-- หน้าปก --}}

@include('docs.partials.cover', [
    'appName' => $appName,
    'version' => $version,
    'generatedAt' => $generatedAt,
    'logoDataUri' => $logoDataUri ?? null,
    'dashboardShot' => $dashboardShot ?? null,
    'screenshotCount' => $screenshotCount ?? null,
    'moduleCount' => $moduleCount ?? null,
])



{{-- สารบัญ --}}

<div class="section">

    <h2 class="section-title">สารบัญ</h2>

    <div class="toc-grid">

        <div class="toc-item"><span>1. เริ่มต้นใช้งาน</span><span>หน้า 3</span></div>

        @php $pageNum = 4; @endphp

        @foreach ($categories as $catId => $cat)

            @if ($catId !== 'start')

            <div class="toc-item"><span>{{ $loop->iteration }}. {{ $cat['label'] }}</span><span>หน้า {{ $pageNum++ }}</span></div>

            @endif

        @endforeach

        <div class="toc-item"><span>คำถามที่พบบ่อย</span><span>ท้ายเล่ม</span></div>

    </div>



    <h2 class="section-title" style="margin-top:14px">ภาพรวมระบบ</h2>

    <p style="font-size:9pt;color:#64748b;margin-bottom:8px">

        ระบบ {{ $appName }} รวมงานคุณภาพ ธุรการ แจ้งซ่อม จองรถ หนังสือราชการ ความรู้ อบรม และรายงาน HOSxP ไว้ในที่เดียว — เมนูแสดงตามสิทธิ์ผู้ใช้

    </p>

    <div style="text-align:center; margin-bottom:10px">
        @include('docs.partials.illustrations', ['type' => 'modules-map'])
    </div>

    <h2 class="section-title" style="margin-top:10px">แกลเลอรีภาพหน้าจอ</h2>
    <p style="font-size:8.5pt;color:#64748b;margin-bottom:6px">ภาพหน้าจอจริงจากระบบ — ครอบคลุมทุกโมดูลหลัก</p>
    @include('docs.partials.screenshot-gallery', ['items' => $galleryScreenshots ?? []])
</div>



{{-- เริ่มต้น --}}

<div class="section">

    <h2 class="section-title">1. เริ่มต้นใช้งาน — 4 ขั้นตอน</h2>

    <div class="quick-grid">

        @foreach ($quickStart as $item)

        <div class="quick-card">

            <div class="num">{{ $item['step'] }}</div>

            <h4>{{ $item['title'] }}</h4>

            <p>{{ $item['description'] }}</p>

        </div>

        @endforeach

    </div>



    <div class="start-shots">

        <div>

            @include('docs.partials.screenshot', ['name' => 'login', 'caption' => 'หน้าเข้าสู่ระบบ', 'fallback' => 'login'])

        </div>

        <div>

            @include('docs.partials.screenshot', ['name' => 'sidebar', 'caption' => 'แถบเมนูด้านซ้าย', 'fallback' => 'sidebar'])

        </div>

        <div class="start-shot-wide">

            @include('docs.partials.screenshot', ['name' => 'dashboard', 'caption' => 'แดชบอร์ดหลักหลังล็อกอิน', 'fallback' => 'dashboard'])

        </div>

    </div>



    <div class="module-block" style="margin-top:10px">

        <h3 class="module-title">เคล็ดลับการใช้งานเบื้องต้น</h3>

        <ul class="features">

            <li>ใช้ช่อง <strong>ค้นหาเมนู</strong> ใน Sidebar พิมพ์ชื่อระบบภาษาไทย</li>

            <li>ตรวจสอบ <strong>การแจ้งเตือน</strong> (ไอคอนกระดิ่ง) ทุกวันก่อนเริ่มงาน</li>

            <li>อ่านคู่มือออนไลน์ได้ที่เมนู <strong>คู่มือการใช้งาน</strong> หรือ /help</li>

            <li>ไม่เห็นเมนูบางรายการ → ติดต่อ Admin เพื่อขอสิทธิ์</li>

        </ul>

    </div>

</div>



{{-- แต่ละหมวด --}}

@php

    $grouped = collect($modules)->groupBy('category');

    $sectionNum = 2;

@endphp

@foreach ($categories as $catId => $cat)

    @if ($catId === 'start') @continue @endif

    @php $catModules = $grouped->get($catId, []); @endphp

    @if ($catModules->isEmpty()) @continue @endif



    <div class="cat-header">

        <h2>{{ $sectionNum++ }}. {{ $cat['label'] }}</h2>

    </div>



    @foreach ($catModules as $mod)

    <div class="module-block">

        <span class="badge">👤 {{ $mod['audience'] }}</span>

        <h3 class="module-title">{{ $mod['title'] }}</h3>

        <p class="module-sub">{{ $mod['subtitle'] }}</p>

        @if (!empty($mod['path']))

        <p class="path">🔗 {{ $mod['path'] }}</p>

        @endif



        @if (!empty($mod['intro']) || !empty($mod['when_to_use']))

        <div class="info-row">

            @if (!empty($mod['intro']))

            <div class="info-box intro-box"><span class="label-tag">คืออะไร?</span><br>{{ $mod['intro'] }}</div>

            @endif

            @if (!empty($mod['when_to_use']))

            <div class="info-box when-box"><span class="label-tag">ใช้เมื่อไหร่?</span><br>{{ $mod['when_to_use'] }}</div>

            @endif

        </div>

        @endif



        <div class="module-layout">

            @if (!empty($mod['screenshot']))

            <div class="module-shot">
                <div class="screenshot-stack">
                    @include('docs.partials.screenshot', [
                        'name' => $mod['screenshot'],
                        'caption' => $mod['title'],
                        'fallback' => $mod['illus'] ?? 'default',
                    ])
                    @if (!empty($mod['screenshot_2']))
                    @include('docs.partials.screenshot', [
                        'name' => $mod['screenshot_2'],
                        'caption' => $mod['screenshot_2_caption'] ?? 'หน้าจอเพิ่มเติม',
                        'fallback' => $mod['illus'] ?? 'default',
                    ])
                    @endif
                </div>
            </div>

            @endif

            <div class="module-text {{ empty($mod['screenshot']) ? '' : '' }}">

                <div class="module-text-cols">

                    <div>

                        <p class="col-title">ทำอะไรได้บ้าง</p>

                        <ul class="features">

                            @foreach ($mod['features'] as $f)

                            <li>{{ $f }}</li>

                            @endforeach

                        </ul>

                    </div>

                    <div>

                        <p class="col-title">ขั้นตอนการใช้งาน</p>

                        <ol class="steps">

                            @foreach ($mod['steps'] as $step)

                            <li><strong>{{ $step['title'] }}</strong> — {{ $step['description'] }}</li>

                            @endforeach

                        </ol>

                    </div>

                </div>

            </div>

        </div>



        @if (!empty($mod['tips']))

        <div class="tips">

            <strong>เคล็ดลับ:</strong>

            @foreach ($mod['tips'] as $tip) {{ $tip }}@if (!$loop->last) · @endif @endforeach

        </div>

        @endif



        @if (!empty($mod['issues']))

        <div class="issues-box">

            <strong>แก้ปัญหาเบื้องต้น:</strong>

            <ul style="margin:4px 0 0 14px">

                @foreach ($mod['issues'] as $issue)

                <li>{{ $issue }}</li>

                @endforeach

            </ul>

        </div>

        @endif

    </div>

    @endforeach

@endforeach



{{-- FAQ --}}

<div class="section">

    <h2 class="section-title">คำถามที่พบบ่อย (FAQ)</h2>

    @foreach ($faq as $item)

    <div class="faq-item">

        <p class="faq-q">❓ {{ $item['question'] }}</p>

        <p class="faq-a">{{ $item['answer'] }}</p>

    </div>

    @endforeach



    <div class="footer-note">

        <p><strong>{{ $appName }}</strong> — คู่มือการใช้งานฉบับ {{ $version }}</p>

        <p>จัดทำเมื่อ {{ $generatedAt }} · คู่มือออนไลน์: /help · ติดต่อผู้ดูแลระบบหากต้องการความช่วยเหลือ</p>

    </div>

</div>



</body>

</html>

