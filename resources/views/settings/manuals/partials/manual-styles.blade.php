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
    margin: 54px 22px 38px 22px;
}
* {
    box-sizing: border-box;
    font-family: 'sarabun', DejaVu Sans, sans-serif;
}
body {
    margin: 0;
    color: #0f172a;
    font-size: 11px;
    line-height: 1.45;
    background: #ffffff;
}
.page-header {
    position: fixed;
    top: -46px;
    left: 0;
    right: 0;
    border-bottom: 2px solid #059669;
    padding-bottom: 5px;
}
.hospital-name {
    font-size: 13px;
    font-weight: bold;
    color: #065f46;
    letter-spacing: 0.02em;
}
.hospital-sub {
    font-size: 9px;
    color: #64748b;
    margin-top: 1px;
}
.page-footer {
    position: fixed;
    bottom: -24px;
    left: 0;
    right: 0;
    border-top: 1px solid #e2e8f0;
    padding-top: 4px;
    font-size: 8.5px;
    color: #64748b;
    width: 100%;
}
.hero {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    border-radius: 6px;
    overflow: hidden;
}
.hero-left {
    width: 72%;
    padding: 12px 14px;
    color: #ffffff;
    background: #065f46;
}
.hero-right {
    width: 28%;
    padding: 10px 12px;
    color: #065f46;
    background: #d1fae5;
    text-align: right;
    vertical-align: middle;
}
.eyebrow {
    font-size: 8.5px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    opacity: 0.9;
    margin-bottom: 3px;
}
h1 {
    margin: 0;
    font-size: 15px;
    font-weight: bold;
    line-height: 1.25;
}
.hero-sub {
    margin-top: 4px;
    font-size: 9.5px;
    opacity: 0.92;
}
.doc-code {
    font-size: 11px;
    font-weight: bold;
    color: #047857;
}
.doc-date {
    font-size: 9px;
    color: #475569;
    margin-top: 2px;
}
.section-title {
    font-size: 12px;
    font-weight: bold;
    color: #065f46;
    border-left: 3.5px solid #059669;
    padding-left: 8px;
    margin: 12px 0 8px 0;
    text-transform: uppercase;
    letter-spacing: 0.02em;
}
.card {
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    background: #ffffff;
    padding: 9px 11px;
    margin-bottom: 9px;
}
.card-header {
    font-size: 11.5px;
    font-weight: bold;
    color: #1e293b;
    margin-bottom: 4px;
    border-bottom: 1px dashed #e2e8f0;
    padding-bottom: 4px;
}
.step-item {
    margin-bottom: 7px;
    padding-left: 26px;
    position: relative;
}
.step-num {
    position: absolute;
    left: 0;
    top: 1px;
    width: 18px;
    height: 18px;
    background: #059669;
    color: #ffffff;
    font-size: 9.5px;
    font-weight: bold;
    text-align: center;
    line-height: 18px;
    border-radius: 50%;
}
.step-title {
    font-weight: bold;
    color: #0f172a;
    font-size: 11px;
}
.step-desc {
    color: #334155;
    font-size: 10px;
    margin-top: 2px;
}
.tip-box {
    background: #fef3c7;
    border: 1px solid #fde68a;
    border-left: 3px solid #d97706;
    border-radius: 4px;
    padding: 6px 9px;
    margin-top: 7px;
    font-size: 9.5px;
    color: #92400e;
}
.alert-box {
    background: #ffe4e6;
    border: 1px solid #fecdd3;
    border-left: 3px solid #e11d48;
    border-radius: 4px;
    padding: 6px 9px;
    margin-top: 7px;
    font-size: 9.5px;
    color: #9f1239;
}
.info-table {
    width: 100%;
    border-collapse: collapse;
    margin: 6px 0;
}
.info-table th {
    background: #f1f5f9;
    color: #334155;
    font-weight: bold;
    text-align: left;
    padding: 5px 8px;
    border: 1px solid #cbd5e1;
    font-size: 10px;
}
.info-table td {
    padding: 5px 8px;
    border: 1px solid #e2e8f0;
    font-size: 10px;
    vertical-align: top;
}
.badge {
    display: inline-block;
    padding: 2px 6px;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    color: #065f46;
    border-radius: 3px;
    font-size: 9px;
    font-weight: bold;
}
.badge-blue {
    display: inline-block;
    padding: 2px 6px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1d4ed8;
    border-radius: 3px;
    font-size: 9px;
    font-weight: bold;
}
.page-break {
    page-break-after: always;
}
