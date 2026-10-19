<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#0f766e">
    <title>ติดตามคิว</title>
    <link rel="manifest" href="{{ asset('queue-portal.webmanifest') }}">
    @include('queue-portal.partials.styles')
</head>
<body>
    <main class="wrap">
        <p class="eyebrow">ติดตามคิววันนี้</p>
        <h1>กรอกเลขคิวจากใบนำทาง</h1>
        <p class="lead">สแกน QR บนใบนำทางแล้วจะเปิดคิวของวันนี้ทันที หรือกรอกเลขคิวด้านล่าง</p>

        @if($error)
            <p class="banner banner-warn">{{ $error }}</p>
        @endif

        <form class="card" method="get" action="{{ route('queue-portal.index') }}">
            <label for="oqueue">เลขคิว</label>
            <input id="oqueue" name="oqueue" inputmode="numeric" autocomplete="off" maxlength="12" required placeholder="เช่น 125">
            <button type="submit">ดูคิวของฉัน</button>
        </form>

        <details class="staff">
            <summary>สำหรับเจ้าหน้าที่: ตั้งค่า QR บนใบนำทาง</summary>
            <p>QR บนฟอร์ม <strong>FORM-RxORDER1-Queue1</strong> ใช้ลิงก์นี้ตามด้วยเลขคิว สแกนแล้วเปิดหน้าคิวทันที</p>
            <pre>'https://fshh-app.online/queue/' + [ovst."oqueue"]</pre>
            <p>ตัวอย่างที่ได้: https://fshh-app.online/queue/125 อย่าใส่ www นำหน้า และอย่าใส่ชื่อ สกุล หรือ HN ต่อท้าย</p>
        </details>
    </main>
</body>
</html>
