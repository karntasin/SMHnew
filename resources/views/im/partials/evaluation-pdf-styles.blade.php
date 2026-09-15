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
@page { margin: 56px 16px 42px 16px; }
* { box-sizing: border-box; font-family: 'sarabun', DejaVu Sans, sans-serif; }
body { margin: 0; color: #0f172a; font-size: 10px; line-height: 1.4; }
.page-header {
    position: fixed; top: -42px; left: 0; right: 0;
    border-bottom: 2px solid #0369a1; padding-bottom: 6px;
}
.hospital-name { font-size: 13px; font-weight: bold; color: #0c4a6e; }
.hospital-sub { font-size: 8.5px; color: #64748b; margin-top: 1px; }
.page-footer {
    position: fixed; bottom: -28px; left: 0; right: 110px;
    border-top: 1px solid #e2e8f0; padding-top: 4px;
    font-size: 8px; color: #64748b;
}
.hero { width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 10px; }
.hero-left { width: 68%; padding: 10px 12px; color: #fff; background: #0c4a6e; }
.hero-right { width: 32%; padding: 8px 10px; color: #0c4a6e; background: #e0f2fe; text-align: right; vertical-align: middle; }
.eyebrow { font-size: 8px; letter-spacing: 0.05em; opacity: 0.9; margin-bottom: 2px; }
h1 { margin: 0; font-size: 14px; font-weight: bold; line-height: 1.25; }
.hero-sub { margin-top: 3px; font-size: 9px; opacity: 0.92; }
.report-date { font-size: 12px; font-weight: bold; }
.report-meta { margin-top: 2px; font-size: 8px; color: #0369a1; }
h2 {
    margin: 10px 0 6px; padding-left: 8px; border-left: 4px solid #0ea5e9;
    color: #0c4a6e; font-size: 11.5px; font-weight: bold; page-break-after: avoid;
}
h3 { margin: 8px 0 4px; font-size: 10.5px; color: #0c4a6e; font-weight: bold; page-break-after: avoid; }
.section-break { page-break-before: always; }
.kpi { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 5px 0; margin: 0 0 10px 0; }
.kpi td { vertical-align: top; padding: 0; }
.kpi-card { border: 1px solid #7dd3fc; background: #f0f9ff; padding: 7px 8px; border-radius: 6px; }
.kpi-label { font-size: 8px; color: #64748b; }
.kpi-value { font-size: 13px; font-weight: bold; color: #0c4a6e; }
.kpi-sub { font-size: 7.5px; color: #64748b; margin-top: 2px; }
table.data { width: 100%; table-layout: fixed; border-collapse: collapse; word-wrap: break-word; }
table.data thead { display: table-header-group; }
table.data tr { page-break-inside: avoid; }
table.data th, table.data td {
    border: 1px solid #cbd5e1; padding: 3px 4px; vertical-align: top;
    word-wrap: break-word; overflow: hidden; font-size: 8.5px;
}
table.data th { background: #e0f2fe; color: #0c4a6e; font-weight: bold; text-align: left; }
table.data td.num, table.data th.num { text-align: right; }
table.data td.center, table.data th.center { text-align: center; }
.wrap { word-wrap: break-word; }
.group-banner {
    background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 6px;
    padding: 6px 8px; margin: 8px 0 6px; page-break-after: avoid;
}
.group-banner .name { font-weight: bold; color: #0c4a6e; font-size: 11px; }
.comment { border: 1px solid #e2e8f0; background: #f8fafc; padding: 7px 8px; border-radius: 6px; font-size: 9px; color: #334155; }
.sign-row { width: 100%; table-layout: fixed; margin-top: 16px; border-collapse: collapse; page-break-inside: avoid; }
.sign-row td { width: 33.33%; text-align: center; vertical-align: top; padding: 8px 8px; font-size: 9px; color: #475569; }
.sign-line { margin-top: 28px; border-top: 1px solid #94a3b8; padding-top: 4px; }
.toc { width: 100%; table-layout: fixed; border-collapse: collapse; }
.toc th, .toc td { border-bottom: 1px dotted #cbd5e1; padding: 4px 6px; font-size: 9.5px; }
.toc th { background: #e0f2fe; color: #0c4a6e; }
.toc .num { width: 46px; color: #0369a1; font-weight: bold; text-align: center; }
.acc-high { color: #047857; font-weight: bold; }
.acc-mid { color: #b45309; font-weight: bold; }
.acc-low { color: #be123c; font-weight: bold; }
