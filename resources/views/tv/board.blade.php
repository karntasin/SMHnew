<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>จอแสดงคิวห้องตรวจ</title>
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    <style>
        /* Typography and Spacing Scaling based on layout mode (Calibrated for 43" 1080p TV / Projector) */
        .layout-1 {
            --max-room-title-size: 2.25rem;
            --max-calling-no-size: 4.75rem;
            --max-calling-name-size: 2.25rem;
            --max-waiting-no-size: 2rem;
            --max-waiting-name-size: 1.5rem;
        }
        .layout-1 .room-card { padding: 1.25rem 1.5rem; }
        .layout-1 .room-title { font-size: var(--max-room-title-size); }
        .layout-1 .room-header-wrap { padding: 0.65rem 1.15rem; margin-bottom: 0.85rem; border-radius: 0.85rem; }
        .layout-1 .wait-badge { font-size: 1.1rem; padding: 0.4rem 0.85rem; }
        .layout-1 .calling-label { font-size: 1.35rem; }
        .layout-1 .calling-no { font-size: var(--max-calling-no-size); line-height: 1; }
        .layout-1 .calling-name { font-size: var(--max-calling-name-size); }
        .layout-1 .calling-box { padding: 1.25rem 1.75rem; border-radius: 1rem; margin-bottom: 0.85rem; }
        .layout-1 .waiting-title { font-size: 1.25rem; margin-bottom: 0.65rem; }
        .layout-1 .waiting-no { font-size: var(--max-waiting-no-size); }
        .layout-1 .waiting-name { font-size: var(--max-waiting-name-size); }
        .layout-1 .waiting-item { padding: 0.55rem 1.15rem; margin-bottom: 0.45rem; border-radius: 0.65rem; }
        .layout-1 .empty-state { font-size: 1.35rem; padding: 1.25rem; }
        .layout-1 .lab-status-badge { font-size: 0.75rem; padding: 0.15rem 0.45rem; }

        .layout-2-4 {
            --max-room-title-size: 1.15rem;
            --max-calling-no-size: 2.15rem;
            --max-calling-name-size: 1.1rem;
            --max-waiting-no-size: 1.05rem;
            --max-waiting-name-size: 0.95rem;
        }
        .layout-2-4 .room-card { padding: 0.5rem 0.7rem; }
        .layout-2-4 .room-title { font-size: var(--max-room-title-size); }
        .layout-2-4 .room-header-wrap { padding: 0.3rem 0.55rem; margin-bottom: 0.35rem; border-radius: 0.5rem; }
        .layout-2-4 .wait-badge { font-size: 0.7rem; padding: 0.12rem 0.4rem; }
        .layout-2-4 .calling-label { font-size: 0.8rem; }
        .layout-2-4 .calling-no { font-size: var(--max-calling-no-size); line-height: 1; }
        .layout-2-4 .calling-name { font-size: var(--max-calling-name-size); }
        .layout-2-4 .calling-box { padding: 0.35rem 0.6rem; border-radius: 0.55rem; margin-bottom: 0.3rem; }
        .layout-2-4 .waiting-title { font-size: 0.75rem; margin-bottom: 0.15rem; }
        .layout-2-4 .waiting-no { font-size: var(--max-waiting-no-size); }
        .layout-2-4 .waiting-name { font-size: var(--max-waiting-name-size); }
        .layout-2-4 .waiting-item { padding: 0.2rem 0.45rem; margin-bottom: 0.12rem; border-radius: 0.375rem; }
        .layout-2-4 .empty-state { font-size: 0.85rem; padding: 0.35rem; }
        .layout-2-4 .waiting-area-box { padding: 0.3rem 0.4rem; }
        .layout-2-4 .lab-status-badge { font-size: 0.65rem; padding: 0.1rem 0.35rem; }

        .layout-5-8 {
            --max-room-title-size: 0.95rem;
            --max-calling-no-size: 1.35rem;
            --max-calling-name-size: 0.875rem;
            --max-waiting-no-size: 0.875rem;
            --max-waiting-name-size: 0.8rem;
        }
        .layout-5-8 .room-card { padding: 0.25rem 0.4rem; }
        .layout-5-8 .room-title { font-size: var(--max-room-title-size); }
        .layout-5-8 .room-header-wrap { padding: 0.15rem 0.35rem; margin-bottom: 0.15rem; border-radius: 0.35rem; }
        .layout-5-8 .wait-badge { font-size: 0.6rem; padding: 0.08rem 0.3rem; }
        .layout-5-8 .calling-label { font-size: 0.65rem; }
        .layout-5-8 .calling-no { font-size: var(--max-calling-no-size); line-height: 1; }
        .layout-5-8 .calling-name { font-size: var(--max-calling-name-size); }
        .layout-5-8 .calling-box { padding: 0.18rem 0.35rem; border-radius: 0.35rem; margin-bottom: 0.12rem; }
        .layout-5-8 .waiting-title { font-size: 0.6rem; margin-bottom: 0.1rem; }
        .layout-5-8 .waiting-no { font-size: var(--max-waiting-no-size); }
        .layout-5-8 .waiting-name { font-size: var(--max-waiting-name-size); }
        .layout-5-8 .waiting-item { padding: 0.2rem 0.4rem; border-radius: 0.35rem; }
        .layout-5-8 .empty-state { font-size: 0.7rem; padding: 0.25rem; }
        .layout-5-8 .waiting-area-box { padding: 0.25rem 0.35rem; }
        .layout-5-8 .lab-status-badge { font-size: 0.6rem; padding: 0.05rem 0.3rem; }

        .layout-9-plus {
            --max-room-title-size: 0.8rem;
            --max-calling-no-size: 1.05rem;
            --max-calling-name-size: 0.8rem;
            --max-waiting-no-size: 0.75rem;
            --max-waiting-name-size: 0.7rem;
        }
        .layout-9-plus .room-card { padding: 0.2rem 0.3rem; border-radius: 0.35rem; }
        .layout-9-plus .room-title { font-size: var(--max-room-title-size); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .layout-9-plus .room-header-wrap { padding: 0.15rem 0.25rem; margin-bottom: 0.15rem; border-radius: 0.25rem; }
        .layout-9-plus .wait-badge { font-size: 0.6rem; padding: 0.05rem 0.2rem; }
        .layout-9-plus .calling-label { display: none; }
        .layout-9-plus .calling-no { font-size: var(--max-calling-no-size); line-height: 1; }
        .layout-9-plus .calling-name { font-size: var(--max-calling-name-size); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70px; }
        .layout-9-plus .calling-box { padding: 0.15rem 0.25rem; border-radius: 0.25rem; margin-bottom: 0.15rem; flex-direction: column; align-items: flex-start; gap: 0.05rem; }
        .layout-9-plus .waiting-title { display: none; }
        .layout-9-plus .waiting-no { font-size: var(--max-waiting-no-size); }
        .layout-9-plus .waiting-name { font-size: var(--max-waiting-name-size); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 50px; }
        .layout-9-plus .waiting-item { padding: 0.15rem 0.35rem; border-radius: 0.3rem; }
        .layout-9-plus .empty-state { font-size: 0.65rem; padding: 0.15rem; }
        .layout-9-plus .waiting-area-box { padding: 0.25rem 0.35rem; }
        .layout-9-plus .lab-status-badge { font-size: 0.55rem; padding: 0.05rem 0.25rem; }

        /* Grid Rows Explicit Helpers to guarantee exact split in 43" TV view */
        .grid-rows-1 { grid-template-rows: repeat(1, minmax(0, 1fr)) !important; }
        .grid-rows-2 { grid-template-rows: repeat(2, minmax(0, 1fr)) !important; }
        .grid-rows-3 { grid-template-rows: repeat(3, minmax(0, 1fr)) !important; }

        @media (max-height: 820px) {
            /* Extra tightening for lower resolution projectors and scaled TV screens (720p/768p/125% DPI) */
            .layout-2-4 {
                --max-calling-no-size: 2rem;
                --max-calling-name-size: 1.1rem;
            }
            .layout-2-4 .room-card { padding: 0.45rem 0.65rem; }
            .layout-2-4 .calling-box { padding: 0.35rem 0.55rem; margin-bottom: 0.35rem; }

            .layout-5-8 {
                --max-room-title-size: 0.95rem;
                --max-calling-no-size: 1.35rem;
                --max-calling-name-size: 0.875rem;
                --max-waiting-no-size: 0.875rem;
                --max-waiting-name-size: 0.8rem;
            }
            .layout-5-8 .room-card { padding: 0.25rem 0.45rem; }
            .layout-5-8 .calling-box { padding: 0.2rem 0.35rem; margin-bottom: 0.15rem; }
            .layout-5-8 .waiting-item { padding: 0.25rem 0.5rem; }
            .layout-5-8 .waiting-area-box { padding: 0.3rem 0.4rem; }
        }

        @media (max-height: 720px) {
            .layout-5-8 {
                --max-room-title-size: 0.85rem;
                --max-calling-no-size: 1.2rem;
                --max-calling-name-size: 0.8rem;
                --max-waiting-no-size: 0.8rem;
                --max-waiting-name-size: 0.75rem;
            }
            .layout-5-8 .room-card { padding: 0.2rem 0.35rem; }
            .layout-5-8 .calling-box { padding: 0.15rem 0.3rem; margin-bottom: 0.12rem; }
            .layout-5-8 .waiting-item { padding: 0.18rem 0.35rem; }
            .layout-5-8 .waiting-area-box { padding: 0.25rem 0.35rem; }
        }

        /* ========================================================
           Layout ER: Specially optimized for 43" (1080p) Emergency Room Board
           - Compact calling box (กรอบชื่อคนไข้ที่กำลังเรียกเล็กลง พอดีจอ 43")
           - Ultra-slim empty state (เมื่อตอนที่ว่างเล็กลงอีก เป็นแถบกะทัดรัด ไม่เปลืองพื้นที่)
           - Proportional to 43" 1080p TV screen without vertical overflow
           ======================================================== */
        .layout-er .room-card { padding: 0.75rem 1rem; border-radius: 1rem; }
        .layout-er .room-title { font-size: 1.35rem; font-weight: 900; }
        .layout-er .room-header-wrap { padding: 0.35rem 0.75rem; margin-bottom: 0.4rem; border-radius: 0.6rem; }
        .layout-er .wait-badge { font-size: 0.85rem; padding: 0.2rem 0.6rem; font-weight: 800; }

        /* ER Calling Area (เมื่อมีคิวเรียก) */
        .layout-er .calling-box {
            padding: 0.4rem 1rem;
            border-radius: 0.75rem;
            margin-bottom: 0.4rem;
        }
        .layout-er .calling-label { font-size: 0.95rem; font-weight: 900; }
        .layout-er .calling-no { font-size: 2.25rem; line-height: 1; font-weight: 900; }
        .layout-er .calling-name { font-size: 1.4rem; font-weight: 900; }

        /* ER Empty Calling Box (เมื่อตอนที่ว่าง - เล็กลงอีกเป็นแถบสลิม) */
        .layout-er .calling-box.calling-box-empty,
        .layout-er .er-empty-box {
            padding: 0.25rem 0.6rem !important;
            min-height: 32px !important;
            max-height: 36px !important;
            border-radius: 0.5rem !important;
            margin-bottom: 0.4rem !important;
            background: rgba(15, 23, 42, 0.65) !important;
            border: 1.5px dashed rgba(100, 116, 139, 0.5) !important;
        }
        .layout-er .calling-box.calling-box-empty .empty-state,
        .layout-er .er-empty-text {
            font-size: 0.85rem !important;
            padding: 0 !important;
            font-weight: 700 !important;
            color: #94a3b8 !important;
            letter-spacing: 0.05em !important;
        }

        /* ER Waiting Area (คิวรอตรวจ) */
        .layout-er .waiting-title { font-size: 1rem; font-weight: 800; margin-bottom: 0.35rem; }
        .layout-er .waiting-item {
            padding: 0.35rem 0.65rem;
            margin-bottom: 0.25rem;
            border-radius: 0.5rem;
        }
        .layout-er .waiting-no {
            font-size: 1.15rem;
            font-weight: 900;
            min-width: 2.85rem;
            height: 2.25rem;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        .layout-er .waiting-name { font-size: 1.1rem; font-weight: 800; }

        /* ========================================================
           Triage 1 to 5 Styles (Pure CSS - Independent of Tailwind JIT)
           ======================================================== */
        /* Waiting Row Item Card (Left Accent Bar + Glowing Border + Gradient) */
        .triage-item-1 {
            border-left: 14px solid #ef4444 !important;
            border-top: 2px solid rgba(239, 68, 68, 0.75) !important;
            border-right: 2px solid rgba(239, 68, 68, 0.75) !important;
            border-bottom: 2px solid rgba(239, 68, 68, 0.75) !important;
            background: linear-gradient(to right, #450a0a, #0f172a 80%) !important;
            box-shadow: 0 4px 15px rgba(239, 68, 68, 0.35) !important;
        }
        .triage-item-2 {
            border-left: 14px solid #f97316 !important;
            border-top: 2px solid rgba(249, 115, 22, 0.75) !important;
            border-right: 2px solid rgba(249, 115, 22, 0.75) !important;
            border-bottom: 2px solid rgba(249, 115, 22, 0.75) !important;
            background: linear-gradient(to right, #431407, #0f172a 80%) !important;
            box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3) !important;
        }
        .triage-item-3 {
            border-left: 14px solid #facc15 !important;
            border-top: 2px solid rgba(250, 204, 21, 0.8) !important;
            border-right: 2px solid rgba(250, 204, 21, 0.8) !important;
            border-bottom: 2px solid rgba(250, 204, 21, 0.8) !important;
            background: linear-gradient(to right, #422006, #0f172a 80%) !important;
            box-shadow: 0 4px 15px rgba(250, 204, 21, 0.3) !important;
        }
        .triage-item-4 {
            border-left: 14px solid #10b981 !important;
            border-top: 2px solid rgba(16, 185, 129, 0.75) !important;
            border-right: 2px solid rgba(16, 185, 129, 0.75) !important;
            border-bottom: 2px solid rgba(16, 185, 129, 0.75) !important;
            background: linear-gradient(to right, #064e3b, #0f172a 80%) !important;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3) !important;
        }
        .triage-item-5 {
            border-left: 14px solid #ffffff !important;
            border-top: 2px solid rgba(255, 255, 255, 0.75) !important;
            border-right: 2px solid rgba(255, 255, 255, 0.75) !important;
            border-bottom: 2px solid rgba(255, 255, 255, 0.75) !important;
            background: linear-gradient(to right, #334155, #0f172a 80%) !important;
            box-shadow: 0 4px 15px rgba(255, 255, 255, 0.25) !important;
        }
        .triage-item-default {
            border-left: 10px solid #64748b !important;
            border: 1px solid #334155 !important;
            background: #0f172a !important;
        }

        /* Queue Number Solid Badges */
        .triage-no-1 { background-color: #dc2626 !important; color: #ffffff !important; border: 2px solid #f87171 !important; }
        .triage-no-2 { background-color: #f97316 !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #fed7aa !important; text-shadow: none !important; }
        .triage-no-3 { background-color: #facc15 !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #fef08a !important; text-shadow: none !important; }
        .triage-no-4 { background-color: #059669 !important; color: #ffffff !important; border: 2px solid #34d399 !important; }
        .triage-no-5 { background-color: #ffffff !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #cbd5e1 !important; text-shadow: none !important; }
        .triage-no-default { background-color: #334155 !important; color: #ffffff !important; border: 2px solid #64748b !important; }

        /* Triage Level Pill Badges */
        .triage-badge-1 { background-color: #dc2626 !important; color: #ffffff !important; border: 2px solid #fca5a5 !important; }
        .triage-badge-2 { background-color: #f97316 !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #fed7aa !important; text-shadow: none !important; }
        .triage-badge-3 { background-color: #facc15 !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #fef08a !important; text-shadow: none !important; }
        .triage-badge-4 { background-color: #059669 !important; color: #ffffff !important; border: 2px solid #6ee7b7 !important; }
        .triage-badge-5 { background-color: #ffffff !important; color: #020617 !important; font-weight: 900 !important; border: 2px solid #cbd5e1 !important; text-shadow: none !important; }
        .triage-badge-default { background-color: #334155 !important; color: #f1f5f9 !important; border: 1px solid #64748b !important; }

        /* ER Arrival Time */
        .triage-er-time { color: #fde68a !important; font-weight: 600; font-size: 0.825rem; }

        /* ========================================================
           ER 3-Row Dynamic Responsive Layout (Full-Frame & Smart Resize)
           ขนาดเริ่มต้นเท่ากันใหญ่เต็มกรอบ (1:1:1) แต่ลด-ขยายอัตโนมัติตามจำนวนข้อมูล
           ======================================================== */
        .er-sections-wrap {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
            height: 100%;
            min-height: 0;
            overflow: hidden;
        }

        .er-row-section {
            background: rgba(15, 23, 42, 0.95);
            border-radius: 0.75rem;
            padding: 0.45rem 0.75rem;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            min-height: 0;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.45);
            transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* กรอบสีของแต่ละแถว */
        .er-row-screening {
            border: 2px solid rgba(245, 158, 11, 0.6);
            box-shadow: 0 0 15px -3px rgba(245, 158, 11, 0.2);
        }
        .er-row-waiting {
            border: 2px solid rgba(239, 68, 68, 0.6);
            box-shadow: 0 0 15px -3px rgba(239, 68, 68, 0.2);
        }
        .er-row-treating {
            border: 2px solid rgba(16, 185, 129, 0.6);
            box-shadow: 0 0 15px -3px rgba(16, 185, 129, 0.2);
        }

        /* Dynamic sizing classes ตามจำนวนคิว (พอดีจอ 43" 1080p ไม่ล้น) */
        /* 1. สัดส่วนปกติเริ่มต้น: แบ่งเท่าๆ กัน 1:1:1 พอดีจอ */
        .er-row-flex-1 {
            flex: 1 1 0 !important;
            min-height: 120px !important;
        }

        /* 2. สัดส่วนขยายใหญ่: สำหรับข้อที่มีผู้ป่วยจำนวนมาก */
        .er-row-flex-expanded {
            flex: 1.6 1 0 !important;
            min-height: 180px !important;
        }

        /* 3. สัดส่วนลดขนาด (เมื่อมีข้ออื่นคนไข้เยอะ) */
        .er-row-flex-compact {
            flex: 0 1 auto !important;
            min-height: 90px !important;
            max-height: 120px !important;
        }

        /* 4. สัดส่วนกรณีไม่มีคิว (เมื่อมีข้ออื่นคนไข้เยอะ) */
        .er-row-flex-empty {
            flex: 0 0 auto !important;
            min-height: 55px !important;
            max-height: 70px !important;
        }

        .er-row-header {
            font-size: 1.05rem;
            font-weight: 900;
            padding: 0.3rem 0.65rem;
            border-radius: 0.5rem;
            margin-bottom: 0.35rem;
            display: flex;
            align-items: center;
            flex-shrink: 0;
            letter-spacing: 0.02em;
        }
        .er-row-header-screening { background: rgba(120, 53, 15, 0.9); color: #fef3c7; border: 1.5px solid rgba(245, 158, 11, 0.6); }
        .er-row-header-waiting { background: rgba(127, 29, 29, 0.9); color: #fee2e2; border: 1.5px solid rgba(239, 68, 68, 0.6); }
        .er-row-header-treating { background: rgba(6, 78, 59, 0.9); color: #d1fae5; border: 1.5px solid rgba(16, 185, 129, 0.6); }

        .er-row-body {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 0.15rem 0.1rem;
            scrollbar-width: thin;
            scrollbar-color: rgba(100,116,139,0.3) transparent;
        }

        /* แถวที่ 1: บัตรคิวรอคัดกรอง - เรียงเป็น Grid แนวนอน */
        .er-screening-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
            gap: 0.45rem;
        }
        .er-scr-card {
            background: rgba(30, 41, 59, 0.95);
            border: 1.5px solid rgba(100, 116, 139, 0.5);
            border-radius: 0.6rem;
            padding: 0.4rem 0.75rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
            transition: all 0.2s;
        }
        .er-scr-card:hover {
            background: rgba(51, 65, 85, 0.95);
            border-color: rgba(245, 158, 11, 0.75);
            transform: translateY(-1px);
        }
        .er-scr-no {
            background: #f59e0b;
            color: #0f172a;
            font-weight: 900;
            padding: 0.25rem 0.5rem;
            border-radius: 0.45rem;
            font-size: 1.25rem;
            min-width: 3.75rem;
            text-align: center;
            border: 2px solid #fbbf24;
            flex-shrink: 0;
            box-shadow: 0 2px 4px rgba(245, 158, 11, 0.4);
        }
        .er-scr-name {
            color: #f8fafc;
            font-weight: 800;
            font-size: 1.15rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* แถวที่ 2: กลุ่ม Triage */
        .er-triage-group {
            margin-bottom: 0.35rem;
            background: rgba(15, 23, 42, 0.6);
            border-radius: 0.6rem;
            padding: 0.3rem 0.5rem;
            border: 1.5px solid rgba(51, 65, 85, 0.7);
        }
        .er-triage-group-hdr {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.95rem;
            font-weight: 900;
            padding: 0.15rem 0.35rem 0.25rem 0.35rem;
            color: #f8fafc;
            border-bottom: 1px solid rgba(51, 65, 85, 0.6);
            margin-bottom: 0.3rem;
        }
        .er-waiting-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 0.35rem;
        }

        .er-triage-dot {
            width: 0.95rem;
            height: 0.95rem;
            border-radius: 50%;
            flex-shrink: 0;
            display: inline-block;
        }
        .er-triage-dot-1 { background: #ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.7); }
        .er-triage-dot-2 { background: #f97316; box-shadow: 0 0 8px rgba(249,115,22,0.6); }
        .er-triage-dot-3 { background: #facc15; box-shadow: 0 0 8px rgba(250,204,21,0.6); }
        .er-triage-dot-4 { background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.6); }
        .er-triage-dot-5 { background: #ffffff; box-shadow: 0 0 8px rgba(255,255,255,0.5); }

        /* แถวที่ 3: บัตรกำลังตรวจรักษา - เรียงเป็น Grid แนวนอน */
        .er-treating-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
            gap: 0.45rem;
        }
        .er-treat-card {
            background: rgba(30, 41, 59, 0.95);
            border-left: 6px solid;
            border-top: 1px solid rgba(100, 116, 139, 0.4);
            border-right: 1px solid rgba(100, 116, 139, 0.4);
            border-bottom: 1px solid rgba(100, 116, 139, 0.4);
            border-radius: 0.6rem;
            padding: 0.4rem 0.75rem;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
            transition: all 0.2s;
        }
        .er-treat-status {
            font-size: 0.85rem;
            font-weight: 800;
            margin-top: 0.2rem;
            padding: 0.15rem 0.5rem;
            border-radius: 0.35rem;
            display: inline-block;
            background: rgba(16, 185, 129, 0.2);
            border: 1px solid rgba(16, 185, 129, 0.45);
            color: #6ee7b7;
        }
        .er-treat-status-lab {
            background: rgba(59, 130, 246, 0.2) !important;
            border-color: rgba(59, 130, 246, 0.45) !important;
            color: #93c5fd !important;
        }
        .er-treat-status-xray {
            background: rgba(168, 85, 247, 0.2) !important;
            border-color: rgba(168, 85, 247, 0.45) !important;
            color: #c4b5fd !important;
        }

        .er-section-count {
            font-size: 0.85rem;
            padding: 0.15rem 0.6rem;
            border-radius: 9999px;
            margin-left: 0.5rem;
            font-weight: 800;
        }

        /* แถบล่างสุด: Ticker Announcement */
        .er-footer-banner {
            flex-shrink: 0;
            background: linear-gradient(90deg, #7f1d1d, #991b1b, #7f1d1d);
            border: 1.5px solid #ef4444;
            color: #ffffff;
            font-weight: 900;
            font-size: 0.95rem;
            padding: 0.35rem 0.85rem;
            border-radius: 0.5rem;
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.35);
            display: flex;
            align-items: center;
        }
    </style>
</head>
@php
    $normalizedKey = match (strtolower(trim($boardKey))) {
        '003', 'er', 'tv-er' => 'er',
        '013', 'drug', 'tv-drug', 'pharmacy' => 'drug',
        default => 'opd',
    };

    if ($normalizedKey === 'er') {
        $boardTitle = 'คิวห้องฉุกเฉิน (ER)';
        $bodyBg = 'bg-stone-950';
        $rightPanelBg = 'bg-gradient-to-br from-red-950 via-neutral-900 to-rose-950';
        $headerBoxBg = 'bg-slate-900/95 border-red-600/70 shadow-2xl';
        $iconBox = 'from-red-500 to-rose-700 shadow-rose-900/40';
        $titleGradient = 'from-red-200 via-rose-300 to-amber-200';
        $roomCardClass = 'bg-slate-950/95 border-2 border-red-600/60 shadow-2xl';
        $roomHeaderBg = 'bg-slate-900 border-b border-red-600/50';
        $roomTitleColor = 'text-white font-black';
        $waitBadgeColor = 'bg-red-600 text-white border-2 border-red-400 shadow-md font-black';
        $waitingAreaBg = 'bg-slate-950 border border-slate-800';
        $waitingTitleColor = 'text-amber-300 font-extrabold';
        $waitingItemBg = 'bg-slate-900 border-slate-800 hover:bg-slate-800';
        $waitingNoColor = 'text-amber-300';
        $waitingTitle = 'คิวรอตรวจ';
    } elseif ($normalizedKey === 'drug') {
        $boardTitle = 'คิวห้องจ่ายยา (Pharmacy)';
        $bodyBg = 'bg-slate-950';
        $rightPanelBg = 'bg-gradient-to-br from-teal-950 via-slate-900 to-emerald-950';
        $headerBoxBg = 'bg-slate-900/95 border-emerald-600/70 shadow-2xl';
        $iconBox = 'from-emerald-500 to-teal-700 shadow-emerald-900/40';
        $titleGradient = 'from-emerald-200 via-teal-200 to-cyan-200';
        $roomCardClass = 'bg-slate-950/95 border-2 border-emerald-600/60 shadow-2xl';
        $roomHeaderBg = 'bg-slate-900 border-b border-emerald-600/50';
        $roomTitleColor = 'text-white font-black';
        $waitBadgeColor = 'bg-emerald-600 text-white border-2 border-emerald-400 shadow-md font-black';
        $waitingAreaBg = 'bg-slate-950 border border-slate-800';
        $waitingTitleColor = 'text-emerald-300 font-extrabold';
        $waitingItemBg = 'bg-slate-900 border-slate-800 hover:bg-slate-800';
        $waitingNoColor = 'text-emerald-300';
        $waitingTitle = 'คิวรอจัดยา';
    } else {
        $boardTitle = 'คิวรับบริการห้องตรวจ';
        $bodyBg = 'bg-slate-900';
        $rightPanelBg = 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950';
        $headerBoxBg = 'bg-slate-900/95 border-sky-600/70 shadow-2xl';
        $iconBox = 'from-sky-400 to-indigo-600 shadow-indigo-900/40';
        $titleGradient = 'from-sky-300 to-indigo-300';
        $roomCardClass = 'bg-slate-950/95 border-2 border-sky-600/60 shadow-2xl';
        $roomHeaderBg = 'bg-slate-900 border-b border-sky-600/50';
        $roomTitleColor = 'text-white font-black';
        $waitBadgeColor = 'bg-indigo-600 text-white border-2 border-indigo-400 shadow-md font-black';
        $waitingAreaBg = 'bg-slate-950 border border-slate-800';
        $waitingTitleColor = 'text-sky-300 font-extrabold';
        $waitingItemBg = 'bg-slate-900 border-slate-800 hover:bg-slate-800';
        $waitingNoColor = 'text-sky-300';
        $waitingTitle = 'คิวรอตรวจ';
    }
@endphp
<body class="@if(!$settings->bg_color) {{ $bodyBg }} @endif text-white h-screen w-full max-h-screen overflow-hidden select-none"
      @if($settings->bg_color) style="background: {{ $settings->bg_color }}" @endif
      x-data="tvBoard('{{ $boardKey }}', {{ $settings->queue_poll_seconds }}, {{ $settings->chime_enabled ? 'true' : 'false' }}, {{ $settings->tts_enabled ? 'true' : 'false' }})"
      x-init="init()">

    <!-- TV Scale Toast Indicator -->
    <div x-show="showScaleToast" x-cloak x-transition.opacity.duration.300ms
         class="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-amber-300 border-2 border-amber-400/80 px-5 py-3 rounded-2xl shadow-2xl font-black text-lg flex items-center gap-3 backdrop-blur-md pointer-events-none">
        <span class="text-2xl">📺</span>
        <div>
            <div class="text-[11px] text-slate-400 font-bold uppercase tracking-wider">ขนาดหน้าจอทีวี (TV Scale)</div>
            <div class="text-xl" x-text="tvScale + '% (กด [ หรือ ] เพื่อปรับ)'"></div>
        </div>
    </div>

    <div x-show="!audioUnlocked" x-cloak
         class="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-opacity"
         @click="unlockAudio()">
        <div class="text-center px-12 py-10 bg-slate-800 rounded-3xl shadow-2xl border border-slate-700">
            <p class="text-6xl font-extrabold mb-8 text-sky-400">📺 ระบบจอเรียกคิวพร้อมใช้งาน</p>
            <p class="text-3xl text-slate-300 bg-slate-900/50 p-6 rounded-xl">โปรดกดปุ่ม OK บนรีโมท หรือแตะหน้าจอ <br>เพื่อเปิดใช้งานเสียงแจ้งเตือน</p>
        </div>
    </div>

    <div id="tv-viewport-root" class="flex h-screen w-full transition-transform duration-200 overflow-hidden" x-show="audioUnlocked" x-cloak>
        <!-- ฝั่งซ้าย: สื่อ/ประกาศ -->
        <div class="h-full relative bg-black shadow-2xl z-10 overflow-hidden" style="width: {{ $settings->left_panel_width_percent }}%;">
            @if($settings->left_media_mode === 'video' || $settings->left_media_mode === 'image_slider')
                <template x-for="(item, idx) in media" :key="item.id || idx">
                    <div x-show="mediaIndex === idx" 
                         class="w-full h-full absolute inset-0 bg-black flex items-center justify-center overflow-hidden" 
                         x-transition.opacity.duration.700ms>
                        
                        <!-- YouTube Embed -->
                        <template x-if="mediaIndex === idx && isYoutube(item.file_path)">
                            <iframe :src="getYoutubeUrl(item.file_path)" 
                                    class="w-full h-full pointer-events-none border-0" 
                                    frameborder="0" 
                                    allow="autoplay; fullscreen; encrypted-media"></iframe>
                        </template>

                        <!-- HTML5 Video File -->
                        <template x-if="mediaIndex === idx && item.media_type === 'video' && !isYoutube(item.file_path)">
                            <video :src="item.file_path" 
                                   autoplay 
                                   playsinline 
                                   :id="'tv-video-' + idx" 
                                   class="w-full h-full object-cover" 
                                   @ended="onVideoEnded(idx)"></video>
                        </template>

                        <!-- Image File -->
                        <template x-if="item.media_type === 'image'">
                            <img :src="item.file_path" class="w-full h-full object-cover select-none">
                        </template>
                    </div>
                </template>

                <!-- กรณีไม่มีรายการสื่อที่เปิดใช้งาน -->
                <div x-show="!media || media.length === 0" class="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-500 p-8 text-center">
                    <svg class="w-20 h-20 mb-4 opacity-40 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    <p class="text-2xl font-bold text-slate-300">ระบบแสดงคิวอัตโนมัติ</p>
                    <p class="text-base text-slate-500 mt-2">ยังไม่มีรายการสื่อที่เปิดใช้งานในระบบ</p>
                </div>
            @else
                <div class="p-8 h-full flex flex-col bg-gradient-to-br from-indigo-950 via-slate-900 to-black">
                    <h2 class="text-4xl font-extrabold mb-6 text-yellow-400 drop-shadow-md">📢 ข่าวสาร/ประกาศ</h2>
                    <div class="flex-1 overflow-hidden text-3xl leading-relaxed text-slate-100" x-html="rssHtml"></div>
                </div>
            @endif
        </div>

        <!-- ฝั่งขวา: รายการคิว (No Scrolling - Calibrated for 43" 1080p TV) -->
        <div class="h-full @if(!$settings->bg_color) {{ $rightPanelBg }} @endif p-3 md:p-3.5 flex flex-col overflow-hidden"
             style="width: {{ $settings->right_panel_width_percent }}%;@if($settings->bg_color) background: {{ $settings->bg_color }};@endif">
            
            <div class="flex-shrink-0 flex items-center justify-between mb-2 {{ $headerBoxBg }} backdrop-blur-md py-1.5 px-3 md:py-2 md:px-3.5 rounded-xl border shadow-xl">
                <div class="flex items-center gap-2.5">
                    <div class="bg-gradient-to-br {{ $iconBox }} p-1.5 rounded-lg shadow-inner">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </div>
                    <h1 class="text-xl md:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r {{ $titleGradient }} tracking-wide">{{ $boardTitle }}</h1>
                </div>

                <!-- Middle: View Switcher and TV Scale Pill -->
                <div class="flex items-center gap-2">
                    <!-- Fit TV Scale Button (One-click TV OverScan compensation) -->
                    <button type="button" @click="cycleScale()"
                            class="cursor-pointer select-none transition-all hover:scale-105 active:scale-95 px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-md border border-slate-600/70 bg-slate-900/80 hover:bg-slate-800 text-amber-300"
                            title="คลิกเพื่อปรับย่อ-ขยายขนาดหน้าจอให้พอดีกับขอบทีวี (100% -> 95% -> 90% -> 85%)">
                        <span>📺</span>
                        <span x-text="tvScale === 100 ? 'Fit TV' : tvScale + '%'"></span>
                    </button>

                    <!-- Interactive Switch View Badges for Non-ER / Non-Drug Boards -->
                    <template x-if="!isErBoard && !isDrugBoard && (labXrayEnabled || screeningEnabled)">
                        <div class="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-slate-700/60 shadow-md">
                            <!-- Button: Rooms View -->
                            <button type="button" @click="switchView('rooms')"
                                    class="cursor-pointer select-none transition-all px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5"
                                    :class="currentView === 'rooms' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'">
                                <span>🏥</span>
                                <span>ห้องตรวจ</span>
                            </button>

                            <!-- Button: Screening View -->
                            <template x-if="screeningEnabled">
                                <button type="button" @click="switchView('screening')"
                                        class="cursor-pointer select-none transition-all px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5"
                                        :class="currentView === 'screening' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'">
                                    <span>📋</span>
                                    <span>รอซักประวัติ</span>
                                    <span class="px-1.5 py-0.2 rounded-full text-[10px] font-black"
                                          :class="currentView === 'screening' ? 'bg-black/30 text-slate-950' : 'bg-slate-800 text-amber-300'"
                                          x-text="pendingScreening.length"></span>
                                </button>
                            </template>

                            <!-- Button: Lab & X-ray View -->
                            <template x-if="labXrayEnabled">
                                <button type="button" @click="switchView('lab_xray')"
                                        class="cursor-pointer select-none transition-all px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5"
                                        :class="currentView === 'lab_xray' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'">
                                    <span>🔬</span>
                                    <span>รอผลตรวจ</span>
                                    <span class="px-1.5 py-0.2 rounded-full text-[10px] font-black"
                                          :class="currentView === 'lab_xray' ? 'bg-black/30 text-white' : 'bg-slate-800 text-purple-300'"
                                          x-text="pendingLabXray.length"></span>
                                </button>
                            </template>

                            <!-- Rotation Timer Indicator -->
                            <div class="flex items-center gap-1 pl-2 border-l border-slate-700 font-mono font-black text-amber-400 text-xs pr-1">
                                <span x-text="rotateCountdown + 's'"></span>
                                <svg class="w-3 h-3 animate-spin text-amber-400" style="animation-duration: 3s;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            </div>
                        </div>
                    </template>
                </div>

                <div class="text-right flex flex-col items-end">
                    <span class="text-xl md:text-2xl lg:text-3xl font-black text-amber-400 drop-shadow-lg leading-none" x-text="clockTime"></span>
                    <div class="text-[11px] font-bold text-slate-200 mt-0.5 drop-shadow" x-text="clockDate"></div>
                </div>
            </div>

            <!-- Grid dynamically sized (non-ER boards) -->
            <div x-show="!isErBoard && currentView === 'rooms'"
                 x-transition:enter="transition ease-out duration-300"
                 x-transition:enter-start="opacity-0 scale-95"
                 x-transition:enter-end="opacity-100 scale-100"
                 class="grid gap-1.5 flex-1 min-h-0 h-full" :class="gridClass">
                <template x-for="([roomName, roomData], idx) in Object.entries(rooms)" :key="roomName">
                    <!-- Room Card -->
                    <div class="room-card backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl flex flex-col h-full min-h-0 relative overflow-hidden transition-all duration-300"
                         :class="getCardClass(roomData, idx)"
                         :style="getCardStyle(roomData, idx)">
                        
                        <!-- Room Header -->
                        <div class="room-header-wrap border flex items-center justify-between flex-shrink-0"
                             :class="getHeaderBgClass(roomData, idx)">
                            <div class="flex items-center gap-2.5">
                                <template x-if="isDrugBoard">
                                    <span class="px-2.5 py-0.5 rounded-full text-xs font-black border tracking-wider shadow-sm uppercase"
                                          :class="getBadgeClass(roomData, idx)"
                                          x-text="getBadgeText(roomData, idx)"></span>
                                </template>
                                <h2 class="room-title font-extrabold drop-shadow"
                                    :class="getTitleColorClass(roomData, idx)"
                                    x-text="getRoomTitle(roomName, roomData, idx)"
                                    @if(($settings->font_room_title ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_room_title }}px" @endif></h2>
                            </div>
                            @if($settings->show_wait_badge)
                            <div class="wait-badge font-bold rounded-full border whitespace-nowrap"
                                 :class="getWaitBadgeClass(roomData, idx)">
                                รอ <span x-text="roomData.waiting.length"></span>
                            </div>
                            @endif
                        </div>

                        <!-- Calling Area -->
                        <div class="flex-shrink-0" :class="isErBoard ? 'mb-1' : 'space-y-1 md:space-y-1.5'">
                            <template x-for="q in roomData.calling" :key="roomName + '-calling-' + q.oqueue">
                                <div>
                                    <!-- ER Calling Box Layout (กระชับ ได้สัดส่วนสำหรับจอ 43 นิ้ว) -->
                                    <template x-if="isErBoard">
                                        <div class="calling-box bg-gradient-to-r from-yellow-400 to-amber-500 shadow-xl border border-yellow-300 flex justify-between items-center transform scale-100 transition-all er-calling-box">
                                            <div class="flex items-center gap-3 min-w-0">
                                                <span class="calling-label text-amber-900 font-black tracking-wide uppercase flex-shrink-0">เรียกคิว</span>
                                                <template x-if="q.triage_level && {{ $settings->er_show_triage ? 'true' : 'false' }}">
                                                    <span class="px-2.5 py-0.5 rounded-full text-xs font-black border tracking-wider shadow-sm flex-shrink-0"
                                                          :class="getTriageBadgeClass(q.triage_level)"
                                                          x-text="q.triage_name"></span>
                                                </template>
                                                <span class="calling-no text-slate-900 font-black drop-shadow-sm flex-shrink-0" x-text="q.oqueue"
                                                      @if(($settings->font_calling_no ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_calling_no }}px" @endif></span>
                                            </div>
                                            <span class="calling-name text-slate-900 font-black truncate pl-3 text-right" x-text="q.display_name"
                                                  @if(($settings->font_calling_name ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_calling_name }}px" @endif></span>
                                        </div>
                                    </template>

                                    <!-- Non-ER Calling Box Layout -->
                                    <template x-if="!isErBoard">
                                        <div class="calling-box bg-gradient-to-r from-yellow-400 to-amber-500 shadow-xl border border-yellow-300 flex justify-between items-center transform scale-100 transition-all">
                                            <div class="flex items-baseline gap-3">
                                                <span class="calling-label text-amber-900 font-bold tracking-wide uppercase">เรียกคิว</span>
                                                <template x-if="!isDrugBoard && q.triage_level">
                                                    <span class="px-2 py-0.5 rounded-md text-xs font-black border tracking-wider shadow-sm flex-shrink-0"
                                                          :class="getTriageBadgeClass(q.triage_level)"
                                                          x-text="q.triage_name"></span>
                                                </template>
                                                <span class="calling-no text-slate-900 font-black drop-shadow-sm" x-text="q.oqueue"
                                                      @if(($settings->font_calling_no ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_calling_no }}px" @endif></span>
                                            </div>
                                            <div class="truncate pl-3 text-right">
                                                <span class="calling-name text-slate-900 font-extrabold truncate block" x-text="q.display_name"
                                                      @if(($settings->font_calling_name ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_calling_name }}px" @endif></span>
                                                <template x-if="!isDrugBoard && q.lab_status_text">
                                                    <span class="lab-status-badge font-black rounded bg-slate-900/85 tracking-wide inline-block mt-0.5 max-w-full truncate"
                                                          :class="q.lab_status === 'confirmed' ? 'text-emerald-300 border border-emerald-500/50' : 'text-sky-300 border border-sky-500/50 animate-pulse'"
                                                          x-text="'[ ' + (q.lab_status === 'confirmed' ? '✅ ' : '🔬 ') + q.lab_status_text + ' ]'"></span>
                                                </template>
                                            </div>
                                        </div>
                                    </template>
                                </div>
                            </template>
                            <template x-if="roomData.calling.length === 0">
                                <div class="calling-box calling-box-empty bg-slate-800/80 border-2 border-slate-700/80 border-dashed flex items-center justify-center"
                                     :class="isErBoard ? 'er-empty-box' : ''">
                                    <span class="text-slate-300 font-bold empty-state tracking-wider" :class="isErBoard ? 'er-empty-text' : ''">-- ว่าง --</span>
                                </div>
                            </template>
                        </div>

                        <!-- Waiting Area -->
                        <div class="{{ $waitingAreaBg }} rounded-xl p-1.5 flex-1 flex flex-col min-h-0 border overflow-hidden relative waiting-area-box">
                            <h3 class="waiting-title font-bold uppercase tracking-wider flex-shrink-0 mb-1"
                                :class="getWaitingTitleColorClass(roomData, idx)"
                                x-text="getWaitingTitle(roomData, idx)"></h3>
                            
                            <!-- Waiting Items: stacked neatly with consistent comfortable gap -->
                            <div class="flex-1 overflow-hidden flex flex-col justify-start gap-1">
                                <template x-for="q in roomData.waiting.slice(0, maxWaiting)" :key="roomName + '-waiting-' + q.oqueue">
                                    <div class="waiting-item flex justify-between items-center transition-all duration-200"
                                         :class="(!isDrugBoard && q.triage_level) ? getErWaitingItemClass(q) : ('border ' + getWaitingItemBgClass(roomData, idx))">
                                        
                                        <!-- Left: Queue number + Details -->
                                        <div class="flex items-center gap-2 md:gap-3 overflow-hidden min-w-0 flex-1 pr-2">
                                            <span class="waiting-no flex-shrink-0"
                                                  :class="(!isDrugBoard && q.triage_level) ? getErWaitingNoClass(q) : ('font-bold ' + getWaitingNoColorClass(roomData, idx))"
                                                  x-text="q.oqueue"
                                                  @if(($settings->font_waiting_no ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_waiting_no }}px" @endif></span>

                                            <!-- ER Layout: 2 rows (Name + Triage badge, then Arrival time) -->
                                            <template x-if="isErBoard">
                                                <div class="min-w-0 flex-1">
                                                    <div class="flex items-center gap-2 flex-wrap">
                                                        <span class="waiting-name text-white font-extrabold tracking-wide drop-shadow-sm truncate"
                                                              x-text="q.display_name"
                                                              @if(($settings->font_waiting_name ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_waiting_name }}px" @endif></span>
                                                        <template x-if="q.triage_level && {{ $settings->er_show_triage ? 'true' : 'false' }}">
                                                            <span class="px-2.5 py-0.5 rounded-md text-xs font-black border flex-shrink-0 whitespace-nowrap shadow-sm"
                                                                  :class="getTriageBadgeClass(q.triage_level)"
                                                                  x-text="q.triage_name"></span>
                                                        </template>
                                                    </div>
                                                    <template x-if="q.reg_datetime">
                                                        <span class="triage-er-time block mt-0.5 tracking-wide" x-text="'เข้า ER: ' + formatTime(q.reg_datetime)"></span>
                                                    </template>
                                                </div>
                                            </template>

                                            <!-- Non-ER Layout (Name + Triage badge + Lab Status) -->
                                            <template x-if="!isErBoard">
                                                <div class="min-w-0 flex-1">
                                                    <div class="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                                        <span class="waiting-name truncate text-slate-100 font-bold"
                                                              x-text="q.display_name"
                                                              @if(($settings->font_waiting_name ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_waiting_name }}px" @endif></span>
                                                        <template x-if="!isDrugBoard && q.triage_level">
                                                            <span class="px-2 py-0.5 rounded-md text-xs font-black border flex-shrink-0 whitespace-nowrap shadow-sm"
                                                                  :class="getTriageBadgeClass(q.triage_level)"
                                                                  x-text="q.triage_name"></span>
                                                        </template>
                                                    </div>
                                                    <template x-if="!isDrugBoard && q.lab_status_text">
                                                        <div class="mt-0.5 flex items-center gap-1 min-w-0">
                                                            <span class="lab-status-badge font-black rounded shadow-sm tracking-wide inline-block max-w-full truncate"
                                                                  :class="q.lab_status === 'confirmed' ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/70' : 'bg-sky-950/90 text-sky-300 border border-sky-500/70 animate-pulse'"
                                                                  x-text="'[ ' + (q.lab_status === 'confirmed' ? '✅ ' : '🔬 ') + q.lab_status_text + ' ]'"></span>
                                                        </div>
                                                    </template>
                                                </div>
                                            </template>
                                        </div>

                                        <!-- ER Countdown Timer -->
                                        <template x-if="isErBoard && {{ $settings->er_show_countdown ? 'true' : 'false' }} && q.reg_datetime">
                                            <div class="flex items-center flex-shrink-0 pl-2">
                                                <span class="text-xs md:text-sm font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap flex items-center gap-1 transition-all"
                                                      :class="getCountdownClass(q)"
                                                      x-text="getCountdownText(q)"></span>
                                            </div>
                                        </template>
                                    </div>
                                </template>
                                <!-- Show dots if more waiting queues exist -->
                                <template x-if="roomData.waiting.length > maxWaiting">
                                    <div class="text-center text-amber-300 font-black text-sm mt-1 animate-pulse drop-shadow-sm">...และอีก <span x-text="roomData.waiting.length - maxWaiting"></span> คิว</div>
                                </template>
                            </div>
                            <template x-if="roomData.waiting.length === 0">
                                <div class="absolute inset-0 flex items-center justify-center">
                                    <span class="text-slate-300 font-bold bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-700">ไม่มีคิวรอ</span>
                                </div>
                            </template>
                        </div>

                    </div>
                </template>
            </div>

            <!-- Non-ER View 2: หน้ารายชื่อผู้ป่วยรอผล LAB & X-RAY (สลับหน้าทุก 1 นาที) -->
            <div x-show="!isErBoard && currentView === 'lab_xray'" x-cloak
                 x-transition:enter="transition ease-out duration-300"
                 x-transition:enter-start="opacity-0 scale-98"
                 x-transition:enter-end="opacity-100 scale-100"
                 class="flex-1 min-h-0 flex flex-col bg-slate-900/85 backdrop-blur-md rounded-2xl border-2 border-indigo-500/30 p-5 shadow-2xl overflow-hidden">
                
                <!-- View 2 Sub-header Bar -->
                <div class="flex-shrink-0 flex items-center justify-between pb-4 mb-4 border-b border-slate-700/80">
                    <div class="flex items-center gap-3.5">
                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30">
                            🔬
                        </div>
                        <div>
                            <div class="flex items-center gap-3">
                                <h2 class="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 tracking-wide">
                                    {{ $settings->lab_xray_title ?: 'ผู้ป่วยรอผลตรวจ LAB & X-RAY' }}
                                </h2>
                                <span class="px-3 py-1 rounded-full text-sm font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                                      x-text="'รอผลตรวจทั้งหมด ' + pendingLabXray.length + ' ราย'"></span>
                            </div>
                            <p class="text-slate-400 text-xs md:text-sm mt-0.5 font-medium">
                                {{ $settings->lab_xray_subtitle ?: 'รายชื่อจะหายไปโดยอัตโนมัติเมื่อผลการตรวจออกครบทุกรายการ และสามารถเข้าตรวจต่อได้ทันที' }}
                            </p>
                        </div>
                    </div>

                    <!-- Legend & Action -->
                    <div class="flex items-center gap-3">
                        <div class="hidden xl:flex items-center gap-2.5 text-xs md:text-sm font-extrabold text-slate-200 bg-slate-950/70 px-4 py-2 rounded-xl border border-slate-800 shadow-inner">
                            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping inline-block"></span> <span class="text-base">🔬</span> รอผล LAB</span>
                            <span class="text-slate-600">|</span>
                            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping inline-block"></span> <span class="text-base">📷</span> รอผล X-RAY</span>
                            <span class="text-slate-600">|</span>
                            <span class="flex items-center gap-1.5 text-emerald-300"><span class="text-base">✅</span> ผลออกแล้ว</span>
                        </div>
                        <button type="button" @click="toggleView()"
                                class="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer">
                            <span>🏥 กลับหน้าห้องตรวจ</span>
                            <span class="text-xs bg-black/30 px-2 py-0.5 rounded-md" x-text="rotateCountdown + 's'"></span>
                        </button>
                    </div>
                </div>

                <!-- Cards Grid -->
                <div class="flex-1 min-h-0 overflow-y-auto pr-1">
                    <template x-if="pendingLabXray.length > 0">
                        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 items-stretch">
                            <template x-for="p in pendingLabXray" :key="'pending-' + p.oqueue">
                                <div class="bg-gradient-to-br from-slate-800/95 via-slate-850/95 to-slate-900/95 rounded-2xl p-4 md:p-5 border-2 transition-all duration-200 shadow-xl flex flex-col justify-between min-h-[175px]"
                                     :class="p.triage_level ? getErWaitingItemClass(p) : 'border-indigo-500/30 hover:border-indigo-400/50'">
                                    
                                    <!-- Top: Queue & Name -->
                                    <div>
                                        <div class="flex items-start justify-between gap-2.5 mb-2">
                                            <div class="flex items-center gap-2.5">
                                                <span class="font-black text-3xl md:text-4xl text-amber-300 drop-shadow-sm tracking-tight leading-none"
                                                      @if(($settings->font_lab_oqueue ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_lab_oqueue }}px !important" @endif
                                                      x-text="p.oqueue"></span>
                                                <template x-if="p.triage_level">
                                                    <span class="px-2.5 py-0.5 rounded-md text-xs font-black border tracking-wider shadow-sm"
                                                          :class="getTriageBadgeClass(p.triage_level)"
                                                          x-text="p.triage_name"></span>
                                                </template>
                                            </div>
                                            <span class="text-xs md:text-sm font-bold text-slate-200 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-700/80 truncate max-w-[170px] shadow-xs"
                                                  x-text="p.display_room_name"></span>
                                        </div>

                                        <div class="font-black text-xl md:text-2xl text-white break-words leading-tight my-2 md:my-3 drop-shadow-sm"
                                             @if(($settings->font_lab_name ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_lab_name }}px !important" @endif
                                             x-text="p.display_name"></div>
                                    </div>

                                    <!-- Bottom: Status Badges & Timing -->
                                    <div class="pt-2.5 md:pt-3 border-t border-slate-700/60 flex flex-col gap-2">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <!-- Lab badge -->
                                            <template x-if="p.has_lab && (p.lab_status !== 'confirmed' || {{ ($settings->lab_xray_show_confirmed ?? true) ? 'true' : 'false' }})">
                                                <span class="px-3.5 py-1.5 md:px-4 md:py-2 rounded-xl text-sm md:text-base font-black shadow-md tracking-wide inline-flex items-center gap-2 border-2"
                                                      :class="p.lab_status === 'confirmed'
                                                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/80'
                                                        : 'bg-amber-950/90 text-amber-300 border-amber-500/80 animate-pulse'">
                                                    <span class="text-xl md:text-2xl leading-none" x-text="p.lab_status === 'confirmed' ? '✅' : '🔬'"></span>
                                                    <span x-text="p.lab_status === 'confirmed' ? 'ผล LAB ออกแล้ว' : 'รอผล LAB'"></span>
                                                </span>
                                            </template>

                                            <!-- X-ray badge -->
                                            <template x-if="p.has_xray && (p.xray_status !== 'confirmed' || {{ ($settings->lab_xray_show_confirmed ?? true) ? 'true' : 'false' }})">
                                                <span class="px-3.5 py-1.5 md:px-4 md:py-2 rounded-xl text-sm md:text-base font-black shadow-md tracking-wide inline-flex items-center gap-2 border-2"
                                                      :class="p.xray_status === 'confirmed'
                                                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/80'
                                                        : 'bg-indigo-950/90 text-indigo-300 border-indigo-500/80 animate-pulse'">
                                                    <span class="text-xl md:text-2xl leading-none" x-text="p.xray_status === 'confirmed' ? '✅' : '📷'"></span>
                                                    <span x-text="p.xray_status === 'confirmed' ? 'ผล X-RAY ออกแล้ว' : 'รอผล X-RAY'"></span>
                                                </span>
                                            </template>
                                        </div>

                                        @if($settings->lab_xray_show_order_time ?? true)
                                        <template x-if="p.waited_minutes > 0">
                                            <div class="text-xs md:text-sm text-slate-300 font-bold bg-black/50 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                                <span class="flex items-center gap-1.5">
                                                    <span>⏱️</span>
                                                    <span>เวลาสั่งตรวจ: <span class="text-white font-extrabold" x-text="p.order_time || '-'"></span></span>
                                                </span>
                                                <span class="text-amber-400 font-black" x-text="'รอ ' + p.waited_minutes + ' นาที'"></span>
                                            </div>
                                        </template>
                                        @endif
                                    </div>

                                </div>
                            </template>
                        </div>
                    </template>

                    <!-- Empty state -->
                    <template x-if="pendingLabXray.length === 0">
                        <div class="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-slate-950/40 rounded-xl border border-dashed border-slate-700/60">
                            <div class="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-4xl mb-4 text-emerald-400">
                                ✨
                            </div>
                            <h3 class="text-2xl md:text-3xl font-black text-slate-200 mb-2">
                                ไม่มีผู้ป่วยรอผลตรวจ LAB หรือ X-RAY ในขณะนี้
                            </h3>
                            <p class="text-slate-400 text-base max-w-lg">
                                ผู้ป่วยที่สั่งตรวจและผลออกครบเรียบร้อยแล้ว จะถูกส่งกลับเข้าคิวรอตรวจของห้องแพทย์โดยอัตโนมัติ
                            </p>
                        </div>
                    </template>
                </div>

            </div>

            <!-- Non-ER View 3: หน้ารายชื่อผู้ป่วยรอซักประวัติ (002 จุดคัดกรอง OPD) -->
            <div x-show="!isErBoard && currentView === 'screening'" x-cloak
                 x-transition:enter="transition ease-out duration-300"
                 x-transition:enter-start="opacity-0 scale-98"
                 x-transition:enter-end="opacity-100 scale-100"
                 class="flex-1 min-h-0 flex flex-col bg-slate-900/85 backdrop-blur-md rounded-2xl border-2 border-amber-500/30 p-5 shadow-2xl overflow-hidden">
                
                <!-- View 3 Sub-header Bar -->
                <div class="flex-shrink-0 flex items-center justify-between pb-4 mb-4 border-b border-slate-700/80">
                    <div class="flex items-center gap-3.5">
                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30 text-slate-950 font-black">
                            📋
                        </div>
                        <div>
                            <div class="flex items-center gap-3">
                                <h2 class="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 tracking-wide">
                                    {{ $settings->screening_title ?: 'ผู้ป่วยรอซักประวัติ / คัดกรอง' }}
                                </h2>
                                <span class="px-3 py-1 rounded-full text-sm font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                                      x-text="'รอคัดกรองทั้งหมด ' + pendingScreening.length + ' ราย'"></span>
                            </div>
                            <p class="text-slate-400 text-xs md:text-sm mt-0.5 font-medium">
                                {{ $settings->screening_subtitle ?: 'จุดคัดกรองห้องตรวจโรคภายนอก (002)' }}
                            </p>
                        </div>
                    </div>

                    <!-- Legend & Action -->
                    <div class="flex items-center gap-3">
                        <div class="hidden xl:flex items-center gap-2.5 text-xs md:text-sm font-extrabold text-slate-200 bg-slate-950/70 px-4 py-2 rounded-xl border border-slate-800 shadow-inner">
                            <span class="flex items-center gap-1.5 text-emerald-300"><span class="text-base">📅</span> ผู้ป่วยนัด</span>
                            <span class="text-slate-600">|</span>
                            <span class="flex items-center gap-1.5 text-slate-400"><span>⚪</span> ไม่ได้นัด</span>
                            <span class="text-slate-600">|</span>
                            <span class="flex items-center gap-1.5 text-purple-300"><span class="text-base">🧪</span> มีตรวจ LAB</span>
                            <span class="text-slate-600">|</span>
                            <span class="flex items-center gap-1.5 text-amber-300"><span class="text-base">🩻</span> มีตรวจ X-RAY</span>
                        </div>
                        <button type="button" @click="nextView()"
                                class="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer">
                            <span>หน้าถัดไป</span>
                            <span class="text-xs bg-black/30 px-2 py-0.5 rounded-md" x-text="rotateCountdown + 's'"></span>
                        </button>
                    </div>
                </div>

                <!-- Cards Grid -->
                <div class="flex-1 min-h-0 overflow-y-auto pr-1">
                    <template x-if="pendingScreening.length > 0">
                        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 items-stretch">
                            <template x-for="p in pendingScreening" :key="'scr-p-' + p.oqueue">
                                <div class="rounded-2xl p-4 md:p-5 border-2 transition-all duration-200 shadow-xl flex flex-col justify-between min-h-[175px]"
                                     :class="p.status === 'calling' 
                                        ? 'bg-gradient-to-br from-yellow-950/80 via-slate-900 to-slate-900 border-yellow-400 shadow-yellow-500/10' 
                                        : 'bg-gradient-to-br from-slate-800/95 via-slate-850/95 to-slate-900/95 border-amber-500/30 hover:border-amber-400/50'">
                                    
                                    <!-- Top: Queue & Status Badge -->
                                    <div>
                                        <div class="flex items-start justify-between gap-2.5 mb-2">
                                            <div class="flex items-center gap-2.5">
                                                <span class="font-black text-3xl md:text-4xl drop-shadow-sm tracking-tight leading-none font-mono"
                                                      :class="p.status === 'calling' ? 'text-yellow-300' : 'text-amber-300'"
                                                      @if(($settings->font_screening_oqueue ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_screening_oqueue }}px !important" @endif
                                                      x-text="p.oqueue"></span>
                                            </div>
                                            <template x-if="p.status === 'calling'">
                                                <span class="px-3 py-1 rounded-full text-xs md:text-sm font-black bg-yellow-400 text-slate-950 animate-pulse shadow-md flex items-center gap-1">
                                                    <span>📢</span>
                                                    <span>กำลังเรียกคัดกรอง</span>
                                                </span>
                                            </template>
                                            <template x-if="p.status !== 'calling'">
                                                <span class="text-xs md:text-sm font-bold text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-700/80 shadow-xs">
                                                    จุดคัดกรอง (002)
                                                </span>
                                            </template>
                                        </div>

                                        <div class="font-black text-xl md:text-2xl text-white break-words leading-tight my-2 md:my-3 drop-shadow-sm"
                                             @if(($settings->font_screening_name ?? 'auto') !== 'auto') style="font-size: {{ $settings->font_screening_name }}px !important" @endif
                                             x-text="p.display_name"></div>
                                    </div>

                                    <!-- Bottom: Appointment & Lab/Xray tags & Arrival Timing -->
                                    <div class="pt-2.5 md:pt-3 border-t border-slate-700/60 flex flex-col gap-2">
                                        @if($settings->screening_show_appointment ?? true)
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <!-- Appointment Badge -->
                                            <template x-if="p.is_appointment">
                                                <span class="px-3.5 py-1.5 md:px-4 md:py-2 rounded-xl text-sm md:text-base font-black bg-emerald-950/90 text-emerald-300 border-2 border-emerald-500/80 inline-flex items-center gap-2 shadow-md">
                                                    <span class="text-xl md:text-2xl leading-none">📅</span>
                                                    <span>ผู้ป่วยนัด</span>
                                                </span>
                                            </template>
                                            <template x-if="!p.is_appointment">
                                                <span class="px-3.5 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold bg-slate-950/80 text-slate-300 border border-slate-700 inline-flex items-center gap-1.5">
                                                    <span>⚪</span>
                                                    <span>ไม่ได้นัด (ทั่วไป)</span>
                                                </span>
                                            </template>

                                            <!-- Lab tag -->
                                            <template x-if="p.has_lab">
                                                <span class="px-3.5 py-1.5 md:px-4 md:py-2 rounded-xl text-sm md:text-base font-black bg-purple-950/90 text-purple-300 border-2 border-purple-500/80 inline-flex items-center gap-2 shadow-md"
                                                      :title="p.lab_list_text || 'มีรายการสั่งตรวจ LAB'">
                                                    <span class="text-xl md:text-2xl leading-none">🧪</span>
                                                    <span>มีตรวจ LAB</span>
                                                </span>
                                            </template>

                                            <!-- X-ray tag -->
                                            <template x-if="p.has_xray">
                                                <span class="px-3.5 py-1.5 md:px-4 md:py-2 rounded-xl text-sm md:text-base font-black bg-amber-950/90 text-amber-300 border-2 border-amber-500/80 inline-flex items-center gap-2 shadow-md"
                                                      :title="p.xray_list_text || 'มีรายการสั่งตรวจ X-RAY'">
                                                    <span class="text-xl md:text-2xl leading-none">🩻</span>
                                                    <span>มีตรวจ X-RAY</span>
                                                </span>
                                            </template>
                                        </div>
                                        @endif

                                        @if($settings->screening_show_order_time ?? true)
                                        <div class="text-xs md:text-sm text-slate-300 font-bold bg-black/50 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                            <span class="flex items-center gap-1.5">
                                                <span>⏱️</span>
                                                <span>มาถึงจุดคัดกรอง: <span class="text-white font-extrabold" x-text="p.vsttime || '-'"></span></span>
                                            </span>
                                            <template x-if="p.waited_minutes > 0">
                                                <span class="text-amber-400 font-black" x-text="'รอ ' + p.waited_minutes + ' นาที'"></span>
                                            </template>
                                        </div>
                                        @endif
                                    </div>

                                </div>
                            </template>
                        </div>
                    </template>

                    <!-- Empty state -->
                    <template x-if="pendingScreening.length === 0">
                        <div class="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-slate-950/40 rounded-xl border border-dashed border-slate-700/60">
                            <div class="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-4xl mb-4 text-amber-400">
                                📋
                            </div>
                            <h3 class="text-2xl md:text-3xl font-black text-slate-200 mb-2">
                                ไม่มีผู้ป่วยรอซักประวัติ ณ จุดคัดกรอง (002) ในขณะนี้
                            </h3>
                            <p class="text-slate-400 text-base max-w-lg">
                                ผู้ป่วยที่ผ่านการคัดกรองแล้วจะถูกส่งเข้าห้องตรวจแพทย์โดยอัตโนมัติ
                            </p>
                        </div>
                    </template>
                </div>

            </div>

            <!-- ER 3-Row Layout (1. รอคัดแยก Triage -> 2. คิวรอตรวจ -> 3. กำลังตรวจรักษา -> แถบข้อความ) -->
            <div x-show="isErBoard" x-cloak class="er-sections-wrap flex-1 min-h-0">

                <!-- แถวที่ 1: รอคัดแยก (Triage) — อยู่ที่จุดคัดกรอง 003 จนกว่าจะส่งเข้า 063 -->
                <div class="er-row-section er-row-screening" :class="getSectionRowClass('screening')">
                    <div class="er-row-header er-row-header-screening">
                        <span class="text-xl mr-2">📋</span>
                        <span>1. รอคัดแยก (Triage)</span>
                        <span class="er-section-count bg-amber-700/80 text-amber-200" x-text="erScreening.length + ' คิว'"></span>
                    </div>
                    <div class="er-row-body">
                        <div class="er-screening-grid">
                            <template x-for="q in erScreening" :key="'scr-' + q.oqueue">
                                <div class="er-scr-card">
                                    <span class="er-scr-no" x-text="q.oqueue"></span>
                                    <span class="er-scr-name" x-text="q.display_name"></span>
                                </div>
                            </template>
                        </div>
                        <template x-if="erScreening.length === 0">
                            <div class="flex items-center justify-center py-3">
                                <span class="text-slate-400 font-bold text-sm tracking-wide">— ไม่มีคิวรอคัดแยกในขณะนี้ —</span>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- แถวที่ 2: คิวรอตรวจ (เรียงตามระดับความเร่งด่วน Triage) -->
                <div class="er-row-section er-row-waiting" :class="getSectionRowClass('waiting')">
                    <div class="er-row-header er-row-header-waiting">
                        <span class="text-xl mr-2">⏳</span>
                        <span>2. คิวรอตรวจ (เรียงตามระดับความเร่งด่วน Triage)</span>
                    </div>
                    <div class="er-row-body">
                        <template x-for="group in erWaitingGrouped" :key="'tg-' + group.level">
                            <div class="er-triage-group">
                                <div class="er-triage-group-hdr">
                                    <span class="er-triage-dot" :class="'er-triage-dot-' + group.level"></span>
                                    <span x-text="group.label"></span>
                                    <span class="text-xs text-slate-300 font-bold" x-text="'(' + group.patients.length + ' คิว)'"></span>
                                </div>
                                <div class="er-waiting-grid">
                                    <template x-for="p in group.patients" :key="'wp-' + p.oqueue">
                                        <div class="waiting-item flex justify-between items-center"
                                             :class="getErWaitingItemClass({triage_level: group.level})">
                                            <div class="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                                <span class="waiting-no flex-shrink-0 px-2.5 py-0.5 rounded-lg shadow-sm font-black"
                                                      :class="getErWaitingNoClass({triage_level: group.level})"
                                                      x-text="p.oqueue"></span>
                                                <div class="min-w-0 flex-1">
                                                    <span class="waiting-name text-white font-extrabold tracking-wide drop-shadow-sm truncate block"
                                                          x-text="p.display_name"></span>
                                                    <template x-if="p.reg_datetime">
                                                        <span class="triage-er-time block mt-0.5 tracking-wide"
                                                              x-text="'เข้า ER: ' + formatTime(p.reg_datetime)"></span>
                                                    </template>
                                                </div>
                                            </div>
                                            <template x-if="p.reg_datetime && p.target_minutes > 0">
                                                <div class="flex items-center flex-shrink-0 pl-1">
                                                    <span class="text-xs font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap"
                                                          :class="getCountdownClass({...p, triage_level: group.level})"
                                                          x-text="getCountdownText({...p, triage_level: group.level})"></span>
                                                </div>
                                            </template>
                                        </div>
                                    </template>
                                </div>
                            </div>
                        </template>
                        <template x-if="erWaitingGrouped.length === 0">
                            <div class="flex items-center justify-center py-6">
                                <span class="text-slate-400 font-bold text-sm tracking-wide">— ไม่มีคิวรอตรวจในขณะนี้ —</span>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- แถวที่ 3: กำลังตรวจรักษา (Currently In Room) -->
                <div class="er-row-section er-row-treating" :class="getSectionRowClass('treating')">
                    <div class="er-row-header er-row-header-treating">
                        <span class="text-xl mr-2">⚡</span>
                        <span>3. กำลังตรวจรักษา (Currently In Room)</span>
                        <span class="er-section-count bg-emerald-700/80 text-emerald-200" x-text="erTreating.length + ' คน'"></span>
                    </div>
                    <div class="er-row-body">
                        <div class="er-treating-grid">
                            <template x-for="t in erTreating" :key="'tr-' + t.oqueue">
                                <div class="er-treat-card" :style="'border-left-color: ' + getTriageHexColor(t.triage_level)">
                                    <div class="flex items-center gap-2.5">
                                        <span class="font-black px-2 py-0.5 rounded-lg shadow-sm text-sm flex-shrink-0"
                                              :class="getErWaitingNoClass({triage_level: t.triage_level})"
                                              x-text="t.oqueue"></span>
                                        <span class="text-white font-black text-base truncate" x-text="t.display_name"></span>
                                    </div>
                                    <div class="er-treat-status"
                                         :class="{'er-treat-status-lab': t.status_text.includes('Lab'), 'er-treat-status-xray': t.status_text.includes('X-ray') && !t.status_text.includes('Lab')}"
                                         x-text="'[ ' + t.status_text + ' ]'"></div>
                                </div>
                            </template>
                        </div>
                        <template x-if="erTreating.length === 0">
                            <div class="flex items-center justify-center py-3">
                                <span class="text-slate-400 font-bold text-sm tracking-wide">— ไม่มีผู้ป่วยกำลังตรวจในขณะนี้ —</span>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- แถบล่างสุด: ข้อความชี้แจงตามรูป q-ER -->
                <div class="er-footer-banner">
                    <span class="text-xl">📢</span>
                    <span>"ห้องฉุกเฉินจัดลำดับการตรวจตามความรุนแรงของโรค ไม่ได้เรียงตามเวลาที่มาก่อน-หลัง"</span>
                </div>

            </div>

        </div>
    </div>

    <script>
        function tvBoard(boardKey, pollSeconds, chimeEnabled, ttsEnabled) {
            return {
                boardKey, pollSeconds, chimeEnabled, ttsEnabled,
                rooms: {},
                media: @json($media),
                mediaIndex: 0,
                clockTime: '',
                clockDate: '',
                rssHtml: '',
                lastCallingKeys: new Set(),
                pollTimer: null,
                mediaTimer: null,
                audioUnlocked: false,

                // ER 3-Section data
                erScreening: [],
                erWaitingGrouped: [],
                erTreating: [],

                // OPD Rotation & Multi-View (rooms, screening, lab_xray)
                currentView: 'rooms', // 'rooms' | 'screening' | 'lab_xray'
                screeningEnabled: {{ ($settings->screening_enabled ?? true) ? 'true' : 'false' }},
                screeningRotateSeconds: {{ (int)($settings->screening_rotate_seconds ?? 60) }},
                pendingScreening: [],

                labXrayEnabled: {{ ($settings->lab_xray_enabled ?? true) ? 'true' : 'false' }},
                labXrayRotateSeconds: {{ (int)($settings->lab_xray_rotate_seconds ?? 60) }},
                rotateCountdown: {{ (int)($settings->screening_rotate_seconds ?? $settings->lab_xray_rotate_seconds ?? 60) }},
                isViewPaused: false,
                pendingLabXray: [],

                isDrugBoard: {{ $normalizedKey === 'drug' ? 'true' : 'false' }},
                isErBoard: {{ $normalizedKey === 'er' ? 'true' : 'false' }},
                nowTime: Date.now(),
                serverTimeOffset: 0,

                // TV Screen Scale & Fine-Tuning
                tvScale: 100,
                scaleToastTimer: null,
                showScaleToast: false,

                get roomCount() {
                    return Object.keys(this.rooms).length;
                },

                get gridClass() {
                    if (this.isDrugBoard) {
                        return 'grid-cols-2 grid-rows-1 layout-2-4';
                    }
                    if (this.isErBoard) {
                        return 'grid-cols-1 layout-er';
                    }
                    const len = this.roomCount;
                    if (len === 0 || len === 1) return 'grid-cols-1 grid-rows-1 layout-1';
                    if (len === 2) return 'grid-cols-2 grid-rows-1 layout-2-4';
                    if (len <= 4) return 'grid-cols-2 grid-rows-2 layout-2-4';
                    if (len <= 6) return 'grid-cols-3 grid-rows-2 layout-5-8';
                    if (len <= 8) return 'grid-cols-4 grid-rows-2 layout-5-8';
                    if (len <= 12) return 'grid-cols-4 grid-rows-3 layout-9-plus';
                    return 'grid-cols-5 grid-rows-3 layout-9-plus';
                },

                get maxWaiting() {
                    if (this.isDrugBoard) return 6;
                    if (this.isErBoard) return 6;
                    const len = this.roomCount;
                    if (len <= 1) return 7;
                    if (len === 2) return 6;
                    if (len <= 4) return 3; // 2 rows x 2 cols
                    if (len <= 6) return 2; // 2 rows x 3 cols (OPD 5–6 rooms @ 43" 1080p)
                    if (len <= 8) return 2; // 2 rows x 4 cols
                    return 2;
                },

                isCol1(roomData, idx) {
                    if (!this.isDrugBoard) return false;
                    return (roomData && roomData.cur_dep === '062') || idx === 0;
                },

                getCardStyle(roomData, idx) {
                    if (!this.isDrugBoard) return '';
                    const borderColor = this.isCol1(roomData, idx) 
                        ? '{{ $settings->drug_col1_border_color ?: "#06b6d4" }}' 
                        : '{{ $settings->drug_col2_border_color ?: "#f59e0b" }}';
                    return `border: 4px solid ${borderColor} !important; box-shadow: 0 0 25px -4px ${borderColor}55, 0 10px 15px -3px rgba(0, 0, 0, 0.5) !important;`;
                },

                getCardClass(roomData, idx) {
                    if (!this.isDrugBoard) {
                        return '{{ $roomCardClass }}';
                    }
                    return this.isCol1(roomData, idx)
                        ? 'bg-gradient-to-b from-cyan-950/95 via-slate-900/95 to-slate-950'
                        : 'bg-gradient-to-b from-amber-950/95 via-slate-900/95 to-slate-950';
                },

                getHeaderBgClass(roomData, idx) {
                    if (!this.isDrugBoard) {
                        return '{{ $roomHeaderBg }}';
                    }
                    return this.isCol1(roomData, idx)
                        ? 'bg-cyan-950/90 border-cyan-700/60'
                        : 'bg-amber-950/90 border-amber-700/60';
                },

                getTitleColorClass(roomData, idx) {
                    if (!this.isDrugBoard) {
                        return '{{ $roomTitleColor }}';
                    }
                    return this.isCol1(roomData, idx) ? 'text-white font-black' : 'text-white font-black';
                },

                getRoomTitle(roomName, roomData, idx) {
                    if (!this.isDrugBoard) return roomName;
                    if (this.isCol1(roomData, idx)) {
                        return '{{ addslashes($settings->drug_col1_title ?: "รอจ่ายยา") }}';
                    }
                    return '{{ addslashes($settings->drug_col2_title ?: "รอจัดยา") }}';
                },

                getBadgeText(roomData, idx) {
                    if (!this.isDrugBoard) return '';
                    return this.isCol1(roomData, idx) ? 'จุดรับยา (062)' : 'ห้องจ่ายยา (013)';
                },

                getBadgeClass(roomData, idx) {
                    if (!this.isDrugBoard) return '';
                    return this.isCol1(roomData, idx)
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                },

                getWaitBadgeClass(roomData, idx) {
                    if (!this.isDrugBoard) {
                        return '{{ $waitBadgeColor }}';
                    }
                    return this.isCol1(roomData, idx)
                        ? 'bg-cyan-500/25 text-cyan-200 border-cyan-500/40'
                        : 'bg-amber-500/25 text-amber-200 border-amber-500/40';
                },

                getWaitingTitle(roomData, idx) {
                    if (!this.isDrugBoard) return '{{ $waitingTitle }}';
                    if (this.isCol1(roomData, idx)) {
                        return '{{ addslashes($settings->drug_col1_waiting_title ?: "คิวรอจ่ายยา") }}';
                    }
                    return '{{ addslashes($settings->drug_col2_waiting_title ?: "คิวรอจัดยา") }}';
                },

                getWaitingTitleColorClass(roomData, idx) {
                    if (!this.isDrugBoard) return '{{ $waitingTitleColor }}';
                    return this.isCol1(roomData, idx) ? 'text-cyan-300/90' : 'text-amber-300/90';
                },

                getWaitingItemBgClass(roomData, idx) {
                    if (!this.isDrugBoard) return '{{ $waitingItemBg }}';
                    return this.isCol1(roomData, idx)
                        ? 'bg-cyan-950/80 border-cyan-800/60 hover:bg-cyan-900/70'
                        : 'bg-amber-950/80 border-amber-800/60 hover:bg-amber-900/70';
                },

                getWaitingNoColorClass(roomData, idx) {
                    if (!this.isDrugBoard) return '{{ $waitingNoColor }}';
                    return this.isCol1(roomData, idx) ? 'text-cyan-300' : 'text-amber-300';
                },

                getTriageBadgeClass(level) {
                    switch(Number(level)) {
                        case 1: return 'triage-badge-1 animate-pulse shadow-sm shadow-red-500/50';
                        case 2: return 'triage-badge-2 shadow-sm shadow-orange-500/50';
                        case 3: return 'triage-badge-3 shadow-sm shadow-yellow-500/50';
                        case 4: return 'triage-badge-4 shadow-sm shadow-emerald-500/50';
                        case 5: return 'triage-badge-5 shadow-sm shadow-slate-300/50';
                        default: return 'triage-badge-default';
                    }
                },

                getErWaitingItemClass(q) {
                    switch(Number(q.triage_level)) {
                        case 1: return 'triage-item-1';
                        case 2: return 'triage-item-2';
                        case 3: return 'triage-item-3';
                        case 4: return 'triage-item-4';
                        case 5: return 'triage-item-5';
                        default: return 'triage-item-default';
                    }
                },

                getErWaitingNoClass(q) {
                    switch(Number(q.triage_level)) {
                        case 1: return 'triage-no-1 px-2.5 py-0.5 rounded-lg shadow-sm';
                        case 2: return 'triage-no-2 px-2.5 py-0.5 rounded-lg shadow-sm';
                        case 3: return 'triage-no-3 px-2.5 py-0.5 rounded-lg shadow-sm';
                        case 4: return 'triage-no-4 px-2.5 py-0.5 rounded-lg shadow-sm';
                        case 5: return 'triage-no-5 px-2.5 py-0.5 rounded-lg shadow-sm';
                        default: return 'triage-no-default px-2.5 py-0.5 rounded-lg shadow-sm';
                    }
                },

                getErWaitingNoColor(q) {
                    return this.getErWaitingNoClass(q);
                },

                getTriageHexColor(level) {
                    switch(Number(level)) {
                        case 1: return '#ef4444';
                        case 2: return '#f97316';
                        case 3: return '#facc15';
                        case 4: return '#10b981';
                        case 5: return '#ffffff';
                        default: return '#64748b';
                    }
                },

                getSectionRowClass(sectionType) {
                    const c1 = this.erScreening.length;
                    const c2 = this.erWaitingGrouped.reduce((sum, g) => sum + (g.patients ? g.patients.length : 0), 0);
                    const c3 = this.erTreating.length;

                    let myCount = 0;
                    if (sectionType === 'screening') myCount = c1;
                    else if (sectionType === 'waiting') myCount = c2;
                    else if (sectionType === 'treating') myCount = c3;

                    // ตรวจสอบว่ามีข้อใดข้อหนึ่งมีผู้ป่วยหนาแน่น (ตั้งแต่ 6 คนขึ้นไป) หรือไม่
                    const hasCrowded = (c1 >= 6 || c2 >= 6 || c3 >= 6);

                    // 1. สภาวะปกติ: ไม่มีข้อไหนคนไข้เยอะเกินไป -> ทุกข้อใหญ่เท่ากัน 1:1:1 เต็มกรอบ
                    if (!hasCrowded) {
                        return 'er-row-flex-1';
                    }

                    // 2. สภาวะมีข้อที่คนไข้เยอะ:
                    // ข้อที่มีคนไข้เยอะ -> ขยายใหญ่
                    if (myCount >= 6) {
                        return 'er-row-flex-expanded';
                    }

                    // ข้อที่ไม่มีคนไข้เลย -> กรอบใหญ่ว่างสวยงาม (~125px)
                    if (myCount === 0) {
                        return 'er-row-flex-empty';
                    }

                    // ข้อที่มีคนไข้น้อย (1-4 คน) -> กรอบใหญ่กะทัดรัด (~160px)
                    if (myCount <= 4) {
                        return 'er-row-flex-compact';
                    }

                    return 'er-row-flex-1';
                },

                formatTime(dt) {
                    if (!dt) return '';
                    try {
                        const str = String(dt).trim();
                        const parts = str.split(' ');
                        if (parts.length >= 2) {
                            const timeParts = parts[1].split(':');
                            return `${timeParts[0]}:${timeParts[1]}`;
                        }
                        if (str.includes('T')) {
                            const timePart = str.split('T')[1];
                            const timeParts = timePart.split(':');
                            return `${timeParts[0]}:${timeParts[1]}`;
                        }
                        const d = new Date(str);
                        if (!isNaN(d.getTime())) {
                            const hh = String(d.getHours()).padStart(2, '0');
                            const mm = String(d.getMinutes()).padStart(2, '0');
                            return `${hh}:${mm}`;
                        }
                    } catch (e) {}
                    return dt;
                },

                getCountdownDiffSec(q) {
                    if (!q.reg_datetime) return 0;
                    let dtStr = String(q.reg_datetime).trim();
                    if (dtStr.includes(' ') && !dtStr.includes('T')) {
                        dtStr = dtStr.replace(' ', 'T') + '+07:00';
                    } else if (dtStr.includes('T') && !dtStr.includes('+') && !dtStr.includes('Z') && !dtStr.endsWith('Z')) {
                        dtStr = dtStr + '+07:00';
                    }
                    const regMs = new Date(dtStr).getTime();
                    if (isNaN(regMs)) return 0;
                    const targetMinutes = q.target_minutes !== undefined ? q.target_minutes : 60;
                    const deadlineMs = regMs + (targetMinutes * 60 * 1000);
                    return Math.floor((deadlineMs - this.nowTime) / 1000);
                },

                getCountdownText(q) {
                    if (!q.reg_datetime) return '-';
                    const diffSec = this.getCountdownDiffSec(q);

                    // หากครบเวลานับถอยหลัง หรือกรณีเคสกู้ชีพ (ระดับ 1) ที่ต้องตรวจทันที
                    if (diffSec <= 0 || (Number(q.triage_level) === 1 && (q.target_minutes === 0 || !q.target_minutes))) {
                        return '⚠️ กรุณาติดต่อเจ้าหน้าที่';
                    }

                    // แสดงเวลาที่เหลือในรูปแบบนาที
                    const mins = Math.max(1, Math.ceil(diffSec / 60));
                    return `⏳ เหลือ ${mins} นาที`;
                },

                getCountdownClass(q) {
                    const diffSec = this.getCountdownDiffSec(q);
                    if (diffSec <= 0 || (Number(q.triage_level) === 1 && (q.target_minutes === 0 || !q.target_minutes))) {
                        return 'bg-red-600 text-white border-2 border-red-300 animate-pulse font-black shadow-md shadow-red-500/50';
                    }
                    if (diffSec <= 300) { // 5 นาที
                        return 'bg-amber-500 text-slate-950 border-2 border-amber-300 font-black shadow-md shadow-amber-500/40';
                    }
                    return 'bg-slate-950/90 text-emerald-300 border border-emerald-500/50 font-bold shadow-sm';
                },

                init() {
                    this.audioUnlocked = false; 
                    this.initScale();

                    this.fetchQueue();
                    this.pollTimer = setInterval(() => this.fetchQueue(), this.pollSeconds * 1000);
                    setInterval(() => {
                        this.nowTime = Date.now() + this.serverTimeOffset;
                        this.updateClock();

                        // Auto-rotate page for OPD boards if enabled
                        if (!this.isErBoard && !this.isDrugBoard && (this.labXrayEnabled || this.screeningEnabled) && !this.isViewPaused) {
                            this.rotateCountdown--;
                            if (this.rotateCountdown <= 0) {
                                this.nextView();
                            }
                        }
                    }, 1000);
                    this.updateClock();
                    
                    if (this.media.length > 0) {
                        this.startMediaRotation();
                    }
                },

                initScale() {
                    // 1. Check URL query parameter: ?scale=95
                    const urlParams = new URLSearchParams(window.location.search);
                    const scaleParam = parseFloat(urlParams.get('scale'));
                    if (!isNaN(scaleParam) && scaleParam >= 60 && scaleParam <= 140) {
                        this.tvScale = scaleParam;
                        localStorage.setItem('fshh_tv_scale_' + this.boardKey, this.tvScale);
                    } else {
                        // 2. Check localStorage saved for this board
                        const saved = parseFloat(localStorage.getItem('fshh_tv_scale_' + this.boardKey));
                        if (!isNaN(saved) && saved >= 60 && saved <= 140) {
                            this.tvScale = saved;
                        }
                    }
                    this.$nextTick(() => this.applyScale());

                    // 3. Hotkeys on TV keyboard / remote: [ (zoom out), ] (zoom in), 0 (reset 100%)
                    window.addEventListener('keydown', (e) => {
                        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
                        if (e.key === '[' || e.key === '-') {
                            this.adjustScale(-2.5);
                        } else if (e.key === ']' || e.key === '=' || e.key === '+') {
                            this.adjustScale(2.5);
                        } else if (e.key === '0') {
                            this.tvScale = 100;
                            this.applyScale();
                            this.triggerScaleToast();
                        }
                    });
                },

                adjustScale(delta) {
                    this.tvScale = Math.min(120, Math.max(70, Math.round((this.tvScale + delta) * 10) / 10));
                    this.applyScale();
                    this.triggerScaleToast();
                },

                cycleScale() {
                    const scales = [100, 95, 90, 85];
                    let current = Math.round(this.tvScale);
                    let idx = scales.indexOf(current);
                    let nextIdx = (idx === -1) ? 1 : (idx + 1) % scales.length;
                    this.tvScale = scales[nextIdx];
                    this.applyScale();
                    this.triggerScaleToast();
                },

                applyScale() {
                    localStorage.setItem('fshh_tv_scale_' + this.boardKey, this.tvScale);
                    const rootEl = document.getElementById('tv-viewport-root');
                    if (rootEl) {
                        if (this.tvScale === 100) {
                            rootEl.style.transform = '';
                            rootEl.style.width = '100vw';
                            rootEl.style.height = '100vh';
                        } else {
                            const factor = this.tvScale / 100;
                            rootEl.style.transformOrigin = 'center center';
                            rootEl.style.transform = `scale(${factor})`;
                            rootEl.style.width = '100vw';
                            rootEl.style.height = '100vh';
                        }
                    }
                },

                triggerScaleToast() {
                    this.showScaleToast = true;
                    clearTimeout(this.scaleToastTimer);
                    this.scaleToastTimer = setTimeout(() => {
                        this.showScaleToast = false;
                    }, 2500);
                },

                nextView() {
                    const views = ['rooms'];
                    if (this.screeningEnabled) views.push('screening');
                    if (this.labXrayEnabled) views.push('lab_xray');
                    if (views.length <= 1) return;
                    let idx = views.indexOf(this.currentView);
                    let nextIdx = (idx === -1) ? 0 : (idx + 1) % views.length;
                    this.switchView(views[nextIdx]);
                },

                toggleView() {
                    this.nextView();
                },

                switchView(view) {
                    this.currentView = view;
                    if (view === 'screening') {
                        this.rotateCountdown = this.screeningRotateSeconds;
                    } else if (view === 'lab_xray') {
                        this.rotateCountdown = this.labXrayRotateSeconds;
                    } else {
                        this.rotateCountdown = this.screeningRotateSeconds || this.labXrayRotateSeconds || 60;
                    }
                },

                unlockAudio() {
                    this.audioUnlocked = true;
                },

                async fetchQueue() {
                    try {
                        // ER board ใช้ endpoint ใหม่ที่คืน 3 sections
                        const url = this.isErBoard
                            ? '/er/sections-data'
                            : `/tv/${this.boardKey}/queue-data`;
                        const res = await fetch(url, { cache: 'no-store' });
                        if (!res.ok) return;
                        const data = await res.json();
                        if (data.generated_at) {
                            const serverMs = new Date(data.generated_at).getTime();
                            if (!isNaN(serverMs)) {
                                this.serverTimeOffset = serverMs - Date.now();
                                this.nowTime = Date.now() + this.serverTimeOffset;
                            }
                        }

                        if (this.isErBoard) {
                            // ER: อัปเดต 3 sections
                            this.erScreening = data.screening || [];
                            this.erWaitingGrouped = data.waiting_grouped || [];
                            this.erTreating = data.treating || [];
                        } else {
                            // Non-ER: อัปเดต rooms เหมือนเดิม
                            this.detectNewCalls(data.rooms);
                            this.rooms = data.rooms;
                            this.pendingLabXray = data.pending_lab_xray || [];
                            this.pendingScreening = data.pending_screening || [];
                        }

                        if (data.media && Array.isArray(data.media)) {
                            const newSign = JSON.stringify(data.media.map(m => [m.id, m.sort_order, m.duration_seconds, m.file_path, m.is_active]));
                            const oldSign = JSON.stringify(this.media.map(m => [m.id, m.sort_order, m.duration_seconds, m.file_path, m.is_active]));
                            if (newSign !== oldSign) {
                                this.media = data.media;
                                if (this.mediaIndex >= this.media.length) {
                                    this.mediaIndex = 0;
                                }
                                this.startMediaRotation();
                            }
                        }
                    } catch (e) {
                        console.error('queue fetch failed', e);
                    }
                },

                detectNewCalls(newRooms) {
                    const currentKeys = new Set();
                    Object.entries(newRooms).forEach(([roomName, r]) => {
                        r.calling.forEach(q => currentKeys.add(roomName + '-' + q.oqueue));
                    });
                    
                    let hasNew = false;
                    currentKeys.forEach(key => {
                        if (!this.lastCallingKeys.has(key)) hasNew = true;
                    });
                    
                    if (hasNew) this.announce();
                    this.lastCallingKeys = currentKeys;
                },

                announce() {
                    if (!this.audioUnlocked) return;
                },

                isYoutube(url) {
                    if (!url) return false;
                    return url.includes('youtube.com') || url.includes('youtu.be');
                },

                getYtId(url) {
                    if (!url) return null;
                    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/|watch\?.+&v=))([a-zA-Z0-9_-]{11})/);
                    return match ? match[1] : null;
                },

                getYoutubeUrl(url) {
                    const id = this.getYtId(url);
                    if (!id) return url;
                    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&rel=0&playsinline=1`;
                },

                startMediaRotation() {
                    clearTimeout(this.mediaTimer);
                    if (!this.media || this.media.length === 0) return;

                    // Ensure mediaIndex within valid range
                    if (this.mediaIndex < 0 || this.mediaIndex >= this.media.length) {
                        this.mediaIndex = 0;
                    }

                    const item = this.media[this.mediaIndex];
                    if (!item) return;

                    const isYt = this.isYoutube(item.file_path);
                    const duration = parseInt(item.duration_seconds, 10);

                    // If single item in playlist
                    if (this.media.length === 1) {
                        if (item.media_type === 'video' && !isYt) {
                            this.$nextTick(() => {
                                const videoEl = document.getElementById('tv-video-' + this.mediaIndex);
                                if (videoEl) {
                                    videoEl.currentTime = 0;
                                    videoEl.play().catch(() => {
                                        videoEl.muted = true;
                                        videoEl.play().catch(() => {});
                                    });
                                }
                            });
                            if (duration > 0) {
                                this.mediaTimer = setTimeout(() => this.nextMedia(), duration * 1000);
                            }
                        }
                        return;
                    }

                    // Multiple items: sequential rotation
                    if (item.media_type === 'image') {
                        // Image: display for specified duration (default 15s)
                        const seconds = (duration > 0) ? duration : 15;
                        this.mediaTimer = setTimeout(() => {
                            this.nextMedia();
                        }, seconds * 1000);
                    } else if (isYt) {
                        // YouTube: display for specified duration (default 30s)
                        const seconds = (duration > 0) ? duration : 30;
                        this.mediaTimer = setTimeout(() => {
                            this.nextMedia();
                        }, seconds * 1000);
                    } else if (item.media_type === 'video') {
                        // HTML5 Video:
                        // 1. Play from beginning
                        this.$nextTick(() => {
                            const videoEl = document.getElementById('tv-video-' + this.mediaIndex);
                            if (videoEl) {
                                videoEl.currentTime = 0;
                                videoEl.play().catch(() => {
                                    videoEl.muted = true;
                                    videoEl.play().catch(() => {});
                                });
                            }
                        });

                        // 2. Maximum duration limit if specified
                        if (duration > 0) {
                            this.mediaTimer = setTimeout(() => {
                                this.nextMedia();
                            }, duration * 1000);
                        }
                        // If duration is 0 or not set, video plays until @ended fires
                    }
                },

                onVideoEnded(idx) {
                    // Only respond to ended event from the active media item
                    if (idx !== this.mediaIndex) return;

                    if (this.media.length === 1) {
                        const videoEl = document.getElementById('tv-video-' + idx);
                        if (videoEl) {
                            videoEl.currentTime = 0;
                            videoEl.play().catch(() => {});
                        }
                        return;
                    }

                    // Move to next media item immediately upon video completion
                    this.nextMedia();
                },

                nextMedia() {
                    clearTimeout(this.mediaTimer);
                    if (!this.media || this.media.length === 0) return;

                    // Pause current video if any
                    const currentVideo = document.getElementById('tv-video-' + this.mediaIndex);
                    if (currentVideo) {
                        try { currentVideo.pause(); } catch(e) {}
                    }

                    if (this.media.length === 1) {
                        this.startMediaRotation();
                        return;
                    }

                    // Sequential loop: 0 -> 1 -> ... -> N-1 -> 0
                    this.mediaIndex = (this.mediaIndex + 1) % this.media.length;
                    this.startMediaRotation();
                },

                updateClock() {
                    const d = new Date();
                    this.clockTime = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    this.clockDate = d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                }
            };
        }
    </script>
</body>
</html>
