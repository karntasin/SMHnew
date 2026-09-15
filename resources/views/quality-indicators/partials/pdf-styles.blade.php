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
@page {
    margin: 58px 16px 42px 16px;
}
* {
    box-sizing: border-box;
    font-family: 'sarabun', DejaVu Sans, sans-serif;
}
body {
    margin: 0;
    color: #0f172a;
    font-size: 10.5px;
    line-height: 1.4;
    background: #ffffff;
}
.page-header {
    position: fixed;
    top: -50px;
    left: 0;
    right: 0;
    border-bottom: 2px solid #059669;
    padding-bottom: 6px;
}
.hospital-name {
    font-size: 13px;
    font-weight: bold;
    color: #065f46;
    letter-spacing: 0.02em;
}
.hospital-sub {
    font-size: 8.5px;
    color: #64748b;
    margin-top: 1px;
}
.page-footer {
    position: fixed;
    bottom: -28px;
    left: 0;
    right: 110px;
    border-top: 1px solid #e2e8f0;
    padding-top: 4px;
    font-size: 8px;
    color: #64748b;
}
.hero {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    margin-bottom: 10px;
}
.hero-left {
    width: 68%;
    padding: 10px 12px;
    color: #ffffff;
    background: #065f46;
}
.hero-right {
    width: 32%;
    padding: 8px 10px;
    color: #065f46;
    background: #d1fae5;
    text-align: right;
    vertical-align: middle;
}
.eyebrow {
    font-size: 8px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.88;
    margin-bottom: 2px;
}
h1 {
    margin: 0;
    font-size: 14px;
    font-weight: bold;
    line-height: 1.25;
    word-wrap: break-word;
}
.hero-sub {
    margin-top: 3px;
    font-size: 9px;
    opacity: 0.92;
    word-wrap: break-word;
}
.report-date {
    font-size: 12px;
    font-weight: bold;
}
.report-meta {
    margin-top: 2px;
    font-size: 8px;
    color: #047857;
}
.section {
    margin-bottom: 10px;
}
.section-break {
    page-break-before: always;
}
h2 {
    margin: 0 0 6px 0;
    padding-left: 8px;
    border-left: 4px solid #10b981;
    color: #065f46;
    font-size: 11.5px;
    font-weight: bold;
    page-break-after: avoid;
}
.meta-grid {
    width: 100%;
    table-layout: fixed;
    border-collapse: separate;
    border-spacing: 5px 0;
    margin: 0 0 10px 0;
}
.meta-grid td {
    width: 25%;
    vertical-align: top;
    padding: 0;
}
.card {
    border: 1px solid #a7f3d0;
    border-radius: 6px;
    background: #ecfdf5;
    padding: 7px 8px;
}
.card-label {
    color: #64748b;
    font-size: 8px;
    margin-bottom: 2px;
}
.card-value {
    color: #064e3b;
    font-size: 12px;
    font-weight: bold;
    word-wrap: break-word;
}
.card-sub {
    color: #64748b;
    font-size: 7.5px;
    margin-top: 2px;
}
.panel {
    border: 1px solid #d1fae5;
    border-radius: 6px;
    background: #ffffff;
    padding: 8px 10px;
    margin-bottom: 10px;
}
.panel-title {
    font-size: 11px;
    font-weight: bold;
    color: #065f46;
    margin-bottom: 5px;
}
table.data {
    width: 100%;
    max-width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    word-wrap: break-word;
}
table.data thead {
    display: table-header-group;
}
table.data tr {
    page-break-inside: avoid;
}
table.data th,
table.data td {
    border: 1px solid #cbd5e1;
    padding: 3px 4px;
    vertical-align: top;
    word-wrap: break-word;
    overflow-wrap: break-word;
    overflow: hidden;
}
table.data th {
    background: #ecfdf5;
    color: #065f46;
    font-weight: bold;
    font-size: 8.5px;
    text-align: left;
}
table.data td {
    font-size: 8.5px;
}
table.data td.num,
table.data th.num {
    text-align: right;
}
table.data td.center,
table.data th.center {
    text-align: center;
}
.wrap {
    word-wrap: break-word;
    overflow-wrap: break-word;
}
.badge {
    display: inline-block;
    padding: 1px 4px;
    border-radius: 999px;
    font-size: 7.5px;
    font-weight: bold;
    white-space: normal;
    word-wrap: break-word;
}
.badge-pass {
    background: #d1fae5;
    color: #065f46;
    border: 1px solid #6ee7b7;
}
.badge-fail {
    background: #ffe4e6;
    color: #9f1239;
    border: 1px solid #fda4af;
}
.badge-na {
    background: #f1f5f9;
    color: #64748b;
    border: 1px solid #cbd5e1;
}
.group-banner {
    background: #ecfdf5;
    border: 1px solid #6ee7b7;
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 10px;
    page-break-after: avoid;
}
.group-banner .name {
    font-weight: bold;
    font-size: 13px;
    color: #064e3b;
    word-wrap: break-word;
}
.summary-line {
    margin-top: 3px;
    font-size: 9px;
    color: #475569;
}
.empty {
    color: #94a3b8;
    font-style: italic;
    padding: 8px;
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    text-align: center;
}
.indicator-block {
    margin-bottom: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    overflow: hidden;
}
.indicator-head {
    background: #f0fdf4;
    border-bottom: 1px solid #bbf7d0;
    padding: 6px 8px;
    page-break-after: avoid;
}
.indicator-head .code {
    font-weight: bold;
    color: #059669;
    margin-right: 6px;
}
.indicator-head .iname {
    font-weight: bold;
    color: #0f172a;
    word-wrap: break-word;
}
.indicator-body {
    padding: 7px 8px;
}
.mini-meta {
    font-size: 8.5px;
    color: #64748b;
    margin-bottom: 5px;
    word-wrap: break-word;
}
.sign-row {
    width: 100%;
    table-layout: fixed;
    margin-top: 18px;
    border-collapse: collapse;
    page-break-inside: avoid;
}
.sign-row td {
    width: 33.33%;
    text-align: center;
    vertical-align: top;
    padding: 8px 10px;
    font-size: 9.5px;
    color: #475569;
}
.sign-line {
    margin-top: 32px;
    border-top: 1px solid #94a3b8;
    padding-top: 4px;
}
.toc-wrap {
    margin-bottom: 6px;
}
.toc {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
}
.toc th,
.toc td {
    border-bottom: 1px dotted #cbd5e1;
    padding: 4px 6px;
    vertical-align: top;
    font-size: 9.5px;
    word-wrap: break-word;
    overflow-wrap: break-word;
}
.toc th {
    background: #ecfdf5;
    color: #065f46;
    font-weight: bold;
    font-size: 9px;
    border-bottom: 1px solid #a7f3d0;
}
.toc .num {
    width: 46px;
    color: #059669;
    font-weight: bold;
    text-align: center;
}
.toc .code {
    width: 88px;
    font-weight: bold;
    color: #065f46;
    word-wrap: break-word;
}
.toc .owner {
    width: 28%;
    color: #475569;
    word-wrap: break-word;
}
.toc-group td {
    background: #f0fdf4;
    font-weight: bold;
    color: #064e3b;
    border-bottom: 1px solid #bbf7d0;
}
.toc-note {
    margin-top: 8px;
    font-size: 8.5px;
    color: #64748b;
}
.mini-toc {
    border: 1px solid #d1fae5;
    background: #f8fafc;
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 10px;
}
.mini-toc .title {
    font-weight: bold;
    color: #065f46;
    margin-bottom: 4px;
    font-size: 11px;
}
.mini-toc ol {
    margin: 0;
    padding-left: 18px;
}
.mini-toc li {
    margin: 2px 0;
    font-size: 9.5px;
    color: #334155;
}
