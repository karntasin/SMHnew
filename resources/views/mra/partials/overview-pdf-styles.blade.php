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
@page { margin: 58px 16px 42px 16px; }
* { box-sizing: border-box; font-family: 'sarabun', DejaVu Sans, sans-serif; }
body { margin: 0; color: #0f172a; font-size: 10.5px; line-height: 1.4; }
.page-header {
    position: fixed; top: -44px; left: 0; right: 0;
    border-bottom: 2px solid #4338ca; padding-bottom: 6px;
}
.hospital-name { font-size: 13px; font-weight: bold; color: #312e81; }
.hospital-sub { font-size: 8.5px; color: #64748b; margin-top: 1px; }
.page-footer {
    position: fixed; bottom: -28px; left: 0; right: 110px;
    border-top: 1px solid #e2e8f0; padding-top: 4px;
    font-size: 8px; color: #64748b;
}
.hero { width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 10px; }
.hero-left { width: 68%; padding: 10px 12px; color: #fff; background: #312e81; }
.hero-right { width: 32%; padding: 8px 10px; color: #312e81; background: #e0e7ff; text-align: right; vertical-align: middle; }
.eyebrow { font-size: 8px; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.88; margin-bottom: 2px; }
h1 { margin: 0; font-size: 14px; font-weight: bold; line-height: 1.25; word-wrap: break-word; }
.hero-sub { margin-top: 3px; font-size: 9px; opacity: 0.92; word-wrap: break-word; }
.report-date { font-size: 12px; font-weight: bold; }
.report-meta { margin-top: 2px; font-size: 8px; color: #4338ca; }
h2 {
    margin: 0 0 6px 0; padding-left: 8px; border-left: 4px solid #6366f1;
    color: #312e81; font-size: 11.5px; font-weight: bold; page-break-after: avoid;
}
.section { margin-bottom: 10px; }
.section-break { page-break-before: always; }
.kpi { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 5px 0; margin: 0 0 10px 0; }
.kpi td { width: 20%; vertical-align: top; padding: 0; }
.kpi-card { border: 1px solid #c7d2fe; background: #eef2ff; padding: 7px 8px; border-radius: 6px; }
.kpi-card.emerald { background: #ecfdf5; border-color: #6ee7b7; }
.kpi-card.rose { background: #fff1f2; border-color: #fda4af; }
.kpi-card.amber { background: #fffbeb; border-color: #fcd34d; }
.kpi-label { font-size: 8px; color: #64748b; }
.kpi-value { font-size: 13px; font-weight: bold; color: #1e1b4b; word-wrap: break-word; }
.kpi-card.emerald .kpi-value { color: #047857; }
.kpi-card.rose .kpi-value { color: #be123c; }
.kpi-card.amber .kpi-value { color: #b45309; }
.kpi-sub { font-size: 7.5px; color: #64748b; margin-top: 2px; }
table.data {
    width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; word-wrap: break-word;
}
table.data thead { display: table-header-group; }
table.data tr { page-break-inside: avoid; }
table.data th, table.data td {
    border: 1px solid #cbd5e1; padding: 3px 4px; vertical-align: top;
    word-wrap: break-word; overflow-wrap: break-word; overflow: hidden;
}
table.data th { background: #eef2ff; color: #312e81; font-weight: bold; font-size: 8.5px; text-align: left; }
table.data td { font-size: 8.5px; }
table.data td.num, table.data th.num { text-align: right; }
table.data td.center, table.data th.center { text-align: center; }
.wrap { word-wrap: break-word; overflow-wrap: break-word; }
.badge {
    display: inline-block; padding: 1px 4px; border-radius: 999px;
    font-size: 7.5px; font-weight: bold;
}
.badge-pass { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
.badge-fail { background: #ffe4e6; color: #9f1239; border: 1px solid #fda4af; }
.badge-na { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }
.badge-amber { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
.badge-indigo { background: #e0e7ff; color: #3730a3; border: 1px solid #a5b4fc; }
.empty {
    color: #94a3b8; font-style: italic; padding: 8px;
    border: 1px dashed #cbd5e1; border-radius: 6px; text-align: center;
}
.toc { width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 8px; }
.toc th, .toc td {
    border-bottom: 1px dotted #cbd5e1; padding: 4px 6px; vertical-align: top;
    font-size: 9.5px; word-wrap: break-word;
}
.toc th { background: #eef2ff; color: #312e81; font-weight: bold; font-size: 9px; border-bottom: 1px solid #c7d2fe; }
.toc .num { width: 46px; color: #4338ca; font-weight: bold; text-align: center; }
.sign-row { width: 100%; table-layout: fixed; margin-top: 18px; border-collapse: collapse; page-break-inside: avoid; }
.sign-row td { width: 33.33%; text-align: center; vertical-align: top; padding: 8px 10px; font-size: 9.5px; color: #475569; }
.sign-line { margin-top: 32px; border-top: 1px solid #94a3b8; padding-top: 4px; }
.channel-banner {
    background: #eef2ff; border: 1px solid #a5b4fc; border-radius: 6px;
    padding: 8px 10px; margin-bottom: 8px; page-break-after: avoid;
}
.channel-banner.emerald { background: #ecfdf5; border-color: #6ee7b7; }
.channel-banner.violet { background: #f5f3ff; border-color: #c4b5fd; }
.channel-banner .name { font-weight: bold; font-size: 12px; color: #1e1b4b; }
.acc-high { color: #047857; font-weight: bold; }
.acc-mid { color: #b45309; font-weight: bold; }
.acc-low { color: #be123c; font-weight: bold; }
