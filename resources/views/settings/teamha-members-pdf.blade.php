<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานรายชื่อทีม HA</title>
    <style>
        @font-face {
            font-family: 'sarabun';
            font-style: normal;
            font-weight: normal;
            src: url('{{ $fontRegularUri }}') format('truetype');
        }
        @font-face {
            font-family: 'sarabun';
            font-style: normal;
            font-weight: bold;
            src: url('{{ $fontBoldUri }}') format('truetype');
        }
        @page { margin: 24px 28px 32px 28px; }
        * {
            box-sizing: border-box;
            font-family: 'sarabun', DejaVu Sans, sans-serif;
        }
        body {
            font-size: 12px;
            color: #111827;
            line-height: 1.45;
        }
        h1 {
            font-size: 18px;
            margin: 0 0 2px 0;
            color: #1e3a8a;
            font-weight: bold;
        }
        .meta {
            font-size: 10px;
            color: #4b5563;
            margin-bottom: 16px;
        }
        .team-block {
            margin-bottom: 18px;
            page-break-inside: avoid;
        }
        .team-header {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            padding: 8px 10px;
            margin-bottom: 6px;
        }
        .team-code {
            display: inline-block;
            font-weight: bold;
            color: #1d4ed8;
            margin-right: 8px;
        }
        .team-name {
            font-weight: bold;
            font-size: 13px;
        }
        .team-en {
            color: #6b7280;
            font-size: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            border: 1px solid #d1d5db;
            padding: 6px 8px;
            vertical-align: top;
        }
        th {
            background: #f8fafc;
            font-weight: bold;
            font-size: 11px;
            text-align: left;
        }
        td.num { width: 36px; text-align: center; }
        td.role { width: 140px; font-weight: bold; color: #1e40af; }
        .empty {
            color: #9ca3af;
            font-style: italic;
            padding: 8px;
            border: 1px dashed #d1d5db;
            border-radius: 4px;
        }
        .footer {
            margin-top: 20px;
            font-size: 10px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            padding-top: 8px;
        }
    </style>
</head>
<body>
    <h1>รายงานรายชื่อทีม HA{{ $singleTeam ? '' : ' (ทั้งหมด)' }}</h1>
    <div class="meta">
        {{ $appName }} · สร้างเมื่อ {{ $generatedAt }} · รวม {{ $teams->count() }} ทีม
    </div>

    @forelse ($teams as $team)
        <div class="team-block">
            <div class="team-header">
                <span class="team-code">{{ $team->abbreviation }}</span>
                <span class="team-name">{{ $team->name_th }}</span>
                @if ($team->name_en)
                    <div class="team-en">{{ $team->name_en }}</div>
                @endif
            </div>

            @if ($team->members->isEmpty())
                <div class="empty">ยังไม่มีรายชื่อสมาชิกในทีมนี้</div>
            @else
                <table>
                    <thead>
                        <tr>
                            <th class="num">ลำดับ</th>
                            <th>ตำแหน่งในทีม</th>
                            <th>ชื่อ-สกุล</th>
                            <th>ตำแหน่งงาน</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($team->members as $i => $member)
                            <tr>
                                <td class="num">{{ $i + 1 }}</td>
                                <td class="role">{{ $roles[$member->role] ?? $member->role }}</td>
                                <td>{{ $member->name }}</td>
                                <td>{{ $member->job_title ?: ($member->user?->position ?: '-') }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endif
        </div>
    @empty
        <div class="empty">ยังไม่มีข้อมูลทีม HA</div>
    @endforelse

    <div class="footer">
        ตำแหน่งในทีม: ประธาน · รองประธาน · กรรมการ · เลขานุการ · ผู้ช่วยเลขานุการ
    </div>
</body>
</html>
