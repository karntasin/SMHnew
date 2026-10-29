/**
 * S-Chat — LIFF Chat UI (HTML page for Cloudflare Worker)
 */

import { STICKER_PACK } from './stickers.js';

export function buildChatPage(origin, config) {
  const LIFF_ID = JSON.stringify(config.LIFF_ID);
  const WORKER_ORIGIN = JSON.stringify(origin);
  const STICKERS_JSON = JSON.stringify(STICKER_PACK);
  const VAPID_PUBLIC_KEY = JSON.stringify(config.VAPID_PUBLIC_KEY || '');
  let webAppOrigin = 'https://fshh-app.online';
  try {
    if (config.WEB_APP_ORIGIN) webAppOrigin = String(config.WEB_APP_ORIGIN);
    else if (config.LARAVEL_API_URL) webAppOrigin = new URL(String(config.LARAVEL_API_URL)).origin;
  } catch (_) {
    /* keep default */
  }
  const WEB_APP_ORIGIN = JSON.stringify(webAppOrigin);

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#06101c">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="S-Chat">
  <title>S-Chat</title>
  <link rel="manifest" href="/manifest.webmanifest?v=4">
  <link id="dynamicFavicon" rel="icon" href="/icons/mark.svg?v=2" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/icons/s-chat-192.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://static.line-scdn.net/liff/edge/2/sdk.js"><\/script>
  <style>    :root {
      --bg-0: #040a12;
      --bg-1: #0a1628;
      --surface: rgba(12, 24, 42, 0.82);
      --surface-2: rgba(18, 34, 56, 0.94);
      --text: #e8f1ff;
      --muted: #8aa0b8;
      --cyan: #22d3ee;
      --cyan-dim: rgba(34, 211, 238, 0.15);
      --line: #06c755;
      --danger: #fb7185;
      --danger-bg: rgba(251, 113, 133, 0.14);
      --border: rgba(34, 211, 238, 0.18);
      --mine: linear-gradient(135deg, #0891b2, #0e7490);
      --theirs: rgba(30, 48, 72, 0.95);
      --glow: 0 0 24px rgba(34, 211, 238, 0.25);
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0; height: 100%;
      font-family: "Noto Sans Thai", system-ui, sans-serif;
      background: var(--bg-0); color: var(--text);
      -webkit-tap-highlight-color: transparent;
    }
    body::before {
      content: "";
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      background:
        radial-gradient(ellipse 80% 50% at 10% -10%, rgba(34, 211, 238, 0.18), transparent 55%),
        radial-gradient(ellipse 60% 40% at 100% 0%, rgba(6, 182, 212, 0.12), transparent 50%),
        linear-gradient(180deg, var(--bg-1), var(--bg-0)),
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent 39px,
          rgba(34, 211, 238, 0.03) 40px
        ),
        repeating-linear-gradient(
          90deg,
          transparent,
          transparent 39px,
          rgba(34, 211, 238, 0.03) 40px
        );
    }
    button, input { font: inherit; }
    .hidden { display: none !important; }
    .brand-font { font-family: Orbitron, "Noto Sans Thai", sans-serif; letter-spacing: 0.04em; }

    /* Login */
    #view-login {
      position: relative; z-index: 1;
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 24px;
    }
    .login-card {
      width: 100%; max-width: 420px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px; padding: 36px 28px;
      backdrop-filter: blur(18px);
      box-shadow: var(--glow), 0 24px 60px rgba(0,0,0,.45);
      text-align: center;
      animation: fadeUp .45s ease;
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .login-logo {
      width: 76px; height: 76px; margin: 0 auto 18px; border-radius: 18px;
      background: linear-gradient(145deg, #083344, #0e7490);
      border: 1px solid rgba(34, 211, 238, 0.45);
      color: var(--cyan); font-size: 28px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: var(--glow);
      font-family: Orbitron, sans-serif;
    }
    .brand-mark {
      display: block; width: 88px; height: 88px; margin: 0 auto 16px;
      filter: drop-shadow(0 10px 22px rgba(34, 211, 238, 0.28));
    }
    .brand-mark.sm {
      width: 38px; height: 38px; margin: 0; flex-shrink: 0;
      filter: drop-shadow(0 0 10px rgba(34, 211, 238, 0.4));
    }
    .login-card h1 {
      margin: 0 0 6px; font-size: 1.35rem;
      font-family: Orbitron, "Noto Sans Thai", sans-serif;
      background: linear-gradient(90deg, #e8f1ff, #22d3ee);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .login-card .tag {
      display: inline-block; margin-bottom: 14px;
      padding: 3px 10px; border-radius: 999px; font-size: 0.7rem;
      color: var(--cyan); border: 1px solid var(--border); background: var(--cyan-dim);
      font-family: Orbitron, sans-serif; letter-spacing: 0.08em;
    }
    .login-card p { margin: 0 0 26px; color: var(--muted); font-size: 0.92rem; line-height: 1.55; }
    .btn {
      border: 0; border-radius: 12px; padding: 13px 18px; font-weight: 700;
      cursor: pointer; transition: transform .12s, box-shadow .2s, background .2s, border-color .2s;
    }
    .btn:active { transform: scale(.98); }
    .btn-line {
      background: linear-gradient(135deg, #06c755, #05a847);
      color: #fff; width: 100%; font-size: 1rem;
      box-shadow: 0 8px 28px rgba(6, 199, 85, 0.35);
    }
    .btn-password {
      background: linear-gradient(135deg, #22d3ee, #0891b2);
      color: #042f2e; width: 100%; font-size: 1rem;
      box-shadow: 0 8px 28px rgba(34, 211, 238, 0.28);
      margin-top: 4px;
    }
    .btn-password:disabled { opacity: 0.55; cursor: wait; }
    .login-divider {
      display: flex; align-items: center; gap: 10px;
      margin: 18px 0 14px; color: var(--muted); font-size: 0.78rem;
    }
    .login-divider::before, .login-divider::after {
      content: ''; flex: 1; height: 1px;
      background: rgba(34, 211, 238, 0.18);
    }
    .login-form {
      display: flex; flex-direction: column; gap: 10px; text-align: left;
    }
    .login-form label {
      display: block; font-size: 0.78rem; color: var(--muted);
      margin-bottom: 4px; font-weight: 600;
    }
    .login-form input {
      width: 100%; box-sizing: border-box;
      border-radius: 12px; border: 1px solid var(--border);
      background: rgba(4, 10, 18, 0.55); color: var(--text);
      padding: 12px 14px; outline: none;
    }
    .login-form input:focus {
      border-color: rgba(34, 211, 238, 0.55);
      box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.12);
    }
    .btn-logout {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      flex-shrink: 0;
      background: var(--danger-bg);
      color: #fecdd3;
      border: 1px solid rgba(251, 113, 133, 0.45);
      border-radius: 10px;
      padding: 8px 14px;
      font-size: 0.82rem;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 0 16px rgba(251, 113, 133, 0.12);
    }
    .btn-logout:hover {
      background: rgba(251, 113, 133, 0.28);
      border-color: var(--danger);
      color: #fff;
    }
    .btn-logout .logout-ico { font-size: 0.95rem; line-height: 1; }
    .status-msg {
      margin-top: 16px; padding: 12px; border-radius: 12px; font-size: 0.85rem;
      background: rgba(234, 179, 8, 0.12); color: #fde68a;
      border: 1px solid rgba(234, 179, 8, 0.25);
    }
    .status-msg.error {
      background: var(--danger-bg); color: #fecdd3;
      border-color: rgba(251, 113, 133, 0.35);
    }
    .status-msg.ok {
      background: rgba(34, 211, 238, 0.1); color: #a5f3fc;
      border-color: var(--border);
    }

    /* App shell */
    #view-app {
      position: relative; z-index: 1;
      height: 100vh; height: 100dvh; display: flex; flex-direction: column;
      overflow: hidden;
    }
    .app-header {
      flex-shrink: 0;
      background: rgba(6, 16, 28, 0.88);
      border-bottom: 1px solid var(--border);
      backdrop-filter: blur(16px);
      color: var(--text);
      padding: 10px 14px;
      padding-top: max(10px, env(safe-area-inset-top));
      display: flex; align-items: center; gap: 10px; z-index: 10;
    }
    .header-brand { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; }
    .header-brand-text { min-width: 0; }
    .app-header h1 {
      margin: 0; font-size: 0.95rem;
      font-family: Orbitron, "Noto Sans Thai", sans-serif;
      letter-spacing: 0.03em;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .header-live {
      display: inline-flex; align-items: center; gap: 6px;
      margin-top: 3px; font-size: 0.7rem; color: var(--muted);
    }
    .header-live .pulse {
      width: 7px; height: 7px; border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.6);
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.55); }
      70% { box-shadow: 0 0 0 8px rgba(52, 211, 153, 0); }
      100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
    }
    .app-header .me-name {
      max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      color: var(--cyan);
    }
    .header-actions {
      display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    }
    .btn-sound {
      border: 1px solid rgba(34, 211, 238, 0.35);
      background: rgba(34, 211, 238, 0.1);
      color: var(--cyan);
      border-radius: 999px;
      padding: 5px 9px;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex; align-items: center; gap: 4px;
      white-space: nowrap;
      transition: all .15s ease;
    }
    .btn-sound:hover {
      background: rgba(34, 211, 238, 0.22);
      border-color: var(--cyan);
    }
    .badge {
      min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px;
      background: #f43f5e; color: #fff; font-size: 11px; font-weight: 700;
      display: inline-flex; align-items: center; justify-content: center;
      box-shadow: 0 0 12px rgba(244, 63, 94, 0.45);
    }
    .tab-badge {
      min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px;
      background: #f43f5e; color: #fff; font-size: 10px; font-weight: 800;
      display: inline-flex; align-items: center; justify-content: center;
      line-height: 1;
      box-shadow: 0 0 8px rgba(244, 63, 94, 0.6);
      animation: pulse-dot 2s infinite;
    }
    .tab-badge.hidden { display: none !important; }
    @keyframes pulse-dot {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.12); }
    }
    .app-body {
      flex: 1; display: flex; min-height: 0; overflow: hidden;
    }

    /* Panels */
    .panel {
      display: flex; flex-direction: column; min-height: 0;
      background: var(--surface-2);
    }
    #panel-list {
      width: 100%; max-width: 360px;
      border-right: 1px solid var(--border);
      background: rgba(8, 18, 32, 0.92);
    }
    #panel-chat {
      flex: 1;
      background:
        radial-gradient(circle at 20% 20%, rgba(34, 211, 238, 0.06), transparent 40%),
        radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.05), transparent 40%),
        #07101c;
    }

    .panel-head {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      background: rgba(10, 22, 40, 0.9);
    }
    .search-box {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 10px 14px; outline: none;
      background: rgba(4, 12, 22, 0.7);
      color: var(--text);
    }
    .search-box::placeholder { color: #64788f; }
    .search-box:focus {
      border-color: rgba(34, 211, 238, 0.55);
      box-shadow: 0 0 0 3px var(--cyan-dim);
    }
    .list-footer {
      flex-shrink: 0;
      display: flex; justify-content: center;
      padding: 8px 14px;
      padding-bottom: max(8px, env(safe-area-inset-bottom));
      border-top: 1px solid var(--border);
      background: rgba(10, 22, 40, 0.95);
    }
    .btn-create-group {
      border: 1px solid rgba(34, 211, 238, 0.4);
      background: var(--cyan-dim);
      color: var(--cyan);
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
    }
    .tabs { display: flex; gap: 6px; margin-top: 10px; }
    .tab {
      flex: 1; border: 1px solid transparent;
      background: rgba(15, 30, 50, 0.8); color: var(--muted);
      border-radius: 10px; padding: 7px 4px; font-weight: 700; cursor: pointer;
      font-size: 0.82rem;
      display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      position: relative;
    }
    .avatar.group-av {
      background: linear-gradient(145deg, #134e4a, #0e7490);
      font-size: 0.78rem;
    }
    .msg-sender { font-size: 0.7rem; color: var(--cyan); margin: 0 4px 3px; font-weight: 700; }
    .msg-row.system { align-self: center; max-width: 90%; }
    .msg-row.system .msg-bubble {
      background: transparent; border: 0; color: var(--muted); font-size: 0.78rem;
      text-align: center; box-shadow: none;
    }
    .modal-mask {
      position: fixed; inset: 0; z-index: 40;
      background: rgba(2, 8, 16, 0.72);
      display: flex; align-items: flex-end; justify-content: center;
    }
    @media (min-width: 769px) {
      .modal-mask { align-items: center; }
    }
    .modal {
      width: 100%; max-width: 440px; max-height: 86vh;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 18px 18px 0 0;
      padding: 16px;
      overflow: hidden; display: flex; flex-direction: column;
    }
    @media (min-width: 769px) {
      .modal { border-radius: 18px; }
    }
    .modal h3 { margin: 0 0 12px; font-size: 1.05rem; }
    .modal .member-list { flex: 1; overflow-y: auto; min-height: 160px; margin: 8px 0; }
    .modal .pick {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 4px; cursor: pointer;
    }
    .modal .pick input { width: 18px; height: 18px; }
    .modal-actions { display: flex; gap: 8px; }
    .modal-actions .btn { flex: 1; }
    .btn-ghost {
      background: rgba(15, 30, 50, 0.9); color: var(--muted);
      border: 1px solid var(--border);
    }
    .chat-head { cursor: pointer; }
    .tab.active {
      background: var(--cyan-dim);
      color: var(--cyan);
      border-color: rgba(34, 211, 238, 0.4);
      box-shadow: inset 0 0 12px rgba(34, 211, 238, 0.08);
    }

    .list-scroll { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
    .list-item {
      display: flex; align-items: center; gap: 12px; padding: 12px 14px;
      cursor: pointer; border-bottom: 1px solid rgba(34, 211, 238, 0.06);
      transition: background .15s, border-color .15s;
    }
    .list-item:hover, .list-item:active { background: rgba(34, 211, 238, 0.06); }
    .list-item.active {
      background: rgba(34, 211, 238, 0.1);
      border-left: 2px solid var(--cyan);
      padding-left: 12px;
    }
    .avatar {
      width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
      background: linear-gradient(145deg, #12304a, #0b1c2e);
      border: 1px solid var(--border);
      overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; color: var(--cyan); font-size: 1rem;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-wrap { position: relative; flex-shrink: 0; }
    .avatar-wrap .presence-badge {
      position: absolute; right: -2px; bottom: -2px;
      width: 12px; height: 12px; border-radius: 50%;
      background: #64748b;
      border: 2px solid #07101c;
    }
    .avatar-wrap.online .presence-badge {
      background: #34d399;
      box-shadow: 0 0 8px rgba(52, 211, 153, 0.7);
    }
    .list-meta { flex: 1; min-width: 0; }
    .list-name {
      font-weight: 700; font-size: 0.95rem;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .list-tag {
      display: inline-block; margin-top: 3px;
      font-size: 0.65rem; font-weight: 800; letter-spacing: .04em;
      color: var(--cyan); background: var(--cyan-dim);
      border: 1px solid rgba(34, 211, 238, 0.35);
      border-radius: 999px; padding: 1px 7px;
    }
    .list-sub {
      font-size: 0.78rem; color: var(--muted); margin-top: 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .list-presence {
      display: inline-flex; align-items: center; gap: 6px;
      margin-top: 3px; font-size: 0.75rem; color: var(--muted); font-weight: 600;
    }
    .list-presence.is-online { color: #6ee7b7; }
    .presence-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #64748b; flex-shrink: 0;
    }
    .list-presence.is-online .presence-dot {
      background: #34d399;
      box-shadow: 0 0 8px rgba(52, 211, 153, 0.65);
    }
    .chat-head-status.is-online { color: #6ee7b7; }
    .list-item-right {
      display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0;
    }
    .list-unread {
      min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
      background: #f43f5e; color: #fff; font-size: 10px; font-weight: 800;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .empty-state {
      padding: 40px 20px; text-align: center; color: var(--muted); font-size: 0.9rem;
    }
    .toast-stack {
      position: fixed; top: max(14px, env(safe-area-inset-top));
      right: 12px; left: 12px; z-index: 9999;
      display: flex; flex-direction: column; gap: 8px;
      pointer-events: none; max-width: 420px; margin-left: auto;
    }
    .toast {
      pointer-events: auto;
      background: rgba(8, 20, 36, 0.96);
      border: 1px solid rgba(34, 211, 238, 0.45);
      border-radius: 14px; padding: 12px 14px;
      box-shadow: var(--glow), 0 12px 30px rgba(0,0,0,.4);
      animation: fadeUp .25s ease;
      cursor: pointer;
    }
    .toast-title {
      font-weight: 800; font-size: 0.85rem; color: var(--cyan); margin-bottom: 3px;
    }
    .toast-body {
      font-size: 0.82rem; color: var(--text); line-height: 1.4;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .btn-notify {
      border: 1px solid var(--border);
      background: var(--cyan-dim);
      color: var(--cyan);
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-notify.hidden { display: none !important; }
    .notify-banner {
      margin: 0 12px 10px;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid rgba(34, 211, 238, 0.35);
      background: rgba(34, 211, 238, 0.1);
      color: var(--text);
      font-size: 0.82rem;
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
    }
    .notify-banner.hidden { display: none !important; }
    .notify-banner button {
      border: 0;
      border-radius: 999px;
      background: var(--cyan);
      color: #041018;
      font-weight: 800;
      font-size: 0.75rem;
      padding: 7px 12px;
      cursor: pointer;
      white-space: nowrap;
    }
    .notify-gate {
      position: fixed; inset: 0; z-index: 80;
      background: rgba(4, 10, 18, 0.86);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
    }
    .notify-gate.hidden { display: none !important; }
    .btn-install {
      margin-top: 10px;
      width: 100%;
      background: transparent;
      color: var(--cyan);
      border: 1px solid var(--border);
    }
    .ios-install {
      margin-top: 18px;
      padding: 14px 16px;
      text-align: left;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: rgba(8, 18, 32, 0.96);
      color: var(--text);
    }
    .ios-install.hidden { display: none !important; }
    .ios-install-head {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      margin-bottom: 8px;
    }
    .ios-install-title { font-weight: 800; }
    .ios-install-close {
      border: 0; background: transparent; color: var(--muted);
      font-weight: 700; cursor: pointer; padding: 4px 8px;
    }
    .ios-install ol { margin: 0; padding-left: 1.2rem; color: var(--muted); font-size: 0.86rem; }
    .ios-install li { margin: 4px 0; }
    .ios-install p { margin: 0 0 10px; color: var(--muted); font-size: 0.86rem; line-height: 1.45; }
    .ios-install button.copy-link,
    .ios-install button.guide-link,
    .ios-install a.guide-link,
    .login-card > button.guide-link {
      display: inline-flex; align-items: center; justify-content: center;
      border: 0; border-radius: 999px; background: var(--cyan); color: #041018;
      font-weight: 800; padding: 8px 12px; cursor: pointer;
      text-decoration: none; font-size: 0.82rem; margin: 4px 6px 4px 0;
    }
    .login-card > button.guide-link {
      width: 100%; margin: 10px 0 0; border-radius: 14px; padding: 12px 14px;
    }
    .ios-install .guide-section {
      margin-top: 14px; padding-top: 12px;
      border-top: 1px solid rgba(34, 211, 238, 0.15);
    }
    .ios-install .guide-section:first-of-type {
      margin-top: 0; padding-top: 0; border-top: 0;
    }
    .ios-install .guide-section h3 {
      margin: 0 0 8px; font-size: 0.9rem; color: var(--cyan); font-weight: 800;
    }
    .msg-row.pending .msg-bubble { opacity: .65; }
    .msg-row.failed .msg-bubble {
      border-color: rgba(251, 113, 133, 0.5) !important;
      background: rgba(251, 113, 133, 0.2) !important;
    }

    /* Chat */
    .chat-head {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px;
      background: rgba(6, 16, 28, 0.92);
      border-bottom: 1px solid var(--border);
      backdrop-filter: blur(12px);
      color: var(--text);
    }
    .chat-head .back {
      display: none; background: rgba(34, 211, 238, 0.08);
      border: 1px solid var(--border); border-radius: 10px;
      color: var(--cyan); font-size: 1.1rem; cursor: pointer; padding: 6px 10px;
    }
    .chat-head-info { flex: 1; min-width: 0; }
    .chat-head-name { font-weight: 700; font-size: 1rem; }
    .chat-head-status { font-size: 0.75rem; color: var(--muted); }
    .messages {
      flex: 1; overflow-y: auto; padding: 16px 12px 10px;
      display: flex; flex-direction: column; gap: 8px;
      -webkit-overflow-scrolling: touch;
    }
    .msg-row { display: flex; max-width: 82%; animation: fadeUp .25s ease; }
    .msg-row.mine { align-self: flex-end; flex-direction: row-reverse; }
    .msg-row.theirs { align-self: flex-start; }
    .msg-bubble {
      padding: 10px 13px; border-radius: 16px; font-size: 0.92rem; line-height: 1.45;
      word-break: break-word;
      border: 1px solid transparent;
    }
    .msg-row.mine .msg-bubble {
      background: var(--mine); color: #ecfeff;
      border-bottom-right-radius: 5px;
      box-shadow: 0 6px 18px rgba(8, 145, 178, 0.35);
    }
    .msg-row.theirs .msg-bubble {
      background: var(--theirs); color: var(--text);
      border-color: var(--border);
      border-bottom-left-radius: 5px;
    }
    .msg-row.card-msg { max-width: 92%; }
    .msg-row.card-msg .msg-bubble {
      padding: 0;
      overflow: hidden;
      background: #102033;
      border-color: color-mix(in srgb, var(--card-color, #64748b) 50%, var(--border));
    }
    .msg-row.card-urgent .msg-bubble {
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--card-color, #ef4444) 60%, transparent),
        0 10px 22px rgba(239, 68, 68, 0.16);
    }
    .msg-card { display: flex; min-width: 230px; }
    .msg-card-bar { width: 7px; flex-shrink: 0; background: var(--card-color, #64748b); }
    .msg-card-body { padding: 10px 12px 12px; flex: 1; min-width: 0; }
    .msg-card-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 8px; margin-bottom: 8px;
    }
    .msg-card-title { font-weight: 800; font-size: 0.95rem; line-height: 1.3; }
    .msg-card-priority {
      flex-shrink: 0; font-size: 0.7rem; font-weight: 800;
      padding: 3px 8px; border-radius: 999px; color: #fff;
      background: var(--card-color, #64748b);
    }
    .msg-card-row {
      display: grid; grid-template-columns: 6.4rem 1fr;
      gap: 2px 8px; font-size: 0.86rem; line-height: 1.45;
    }
    .msg-card-label { color: #8aa0b8; }
    .msg-card-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .msg-card-action {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 8px 12px; border-radius: 10px; font-size: 0.86rem; font-weight: 800;
      text-decoration: none; color: #04111f;
      background: color-mix(in srgb, var(--card-color, #0ea5e9) 86%, #fff);
      border: 1px solid color-mix(in srgb, var(--card-color, #0ea5e9) 55%, #fff);
    }
    .msg-card-action:hover { filter: brightness(1.06); }
    .bot-badge {
      display: inline-block; margin-left: 6px; padding: 1px 7px;
      border-radius: 999px; font-size: 0.68rem; font-weight: 800;
      vertical-align: middle; color: #e0f2fe; background: #0369a1;
    }
    .msg-time { font-size: 0.66rem; color: #6b8299; margin-top: 4px; padding: 0 4px; }
    .msg-row.mine .msg-time { text-align: right; color: #7dd3fc; }
    .msg-tools { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
    .msg-row.mine .msg-tools { justify-content: flex-end; }
    .msg-tools .msg-time { margin-top: 0; }
    .msg-read { font-size: 0.66rem; color: #67e8f9; text-align: right; margin-top: 2px; }
    .msg-unsend {
      border: 1px solid rgba(251, 113, 133, 0.45);
      background: rgba(251, 113, 133, 0.12);
      color: #fda4af;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      padding: 6px 12px;
      min-height: 32px;
      border-radius: 999px;
    }
    .msg-unsend:hover { color: #fff; background: rgba(251, 113, 133, 0.28); }
    .unsend-menu {
      position: fixed; z-index: 80;
      min-width: 168px;
      padding: 6px;
      border-radius: 14px;
      background: rgba(12, 24, 42, 0.96);
      border: 1px solid rgba(251, 113, 133, 0.35);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
    }
    .unsend-menu.hidden { display: none !important; }
    .unsend-menu button {
      width: 100%;
      min-height: 40px;
      border: 0;
      border-radius: 10px;
      background: rgba(251, 113, 133, 0.14);
      color: #fda4af;
      font-weight: 700;
      cursor: pointer;
    }
    .unsend-menu button:hover { color: #fff; background: rgba(251, 113, 133, 0.32); }
    .unsend-confirm {
      position: fixed; inset: 0; z-index: 90;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
      background: rgba(8, 14, 24, 0.62);
      backdrop-filter: blur(6px);
    }
    .unsend-confirm.hidden { display: none !important; }
    .unsend-confirm-card {
      width: min(360px, 100%);
      padding: 28px 22px 20px;
      text-align: center;
      border-radius: 24px;
      background: linear-gradient(180deg, #1a2433 0%, #121a26 100%);
      border: 1px solid rgba(148, 163, 184, 0.28);
      box-shadow: 0 24px 60px rgba(2, 8, 18, 0.55);
    }
    .unsend-sad {
      width: 72px; height: 72px; margin: 0 auto 14px;
      color: #94a3b8;
    }
    .unsend-sad svg { width: 100%; height: 100%; display: block; }
    .unsend-confirm-card p {
      margin: 0 0 20px;
      color: #cbd5e1;
      font-size: 1.02rem;
      line-height: 1.55;
    }
    .unsend-confirm-actions { display: flex; gap: 10px; }
    .unsend-confirm-actions button {
      flex: 1; min-height: 44px; border-radius: 14px;
      font-weight: 700; cursor: pointer;
    }
    #unsendConfirmCancel {
      background: transparent;
      color: #94a3b8;
      border: 1px solid rgba(148, 163, 184, 0.35);
    }
    #unsendConfirmOk {
      background: #3f4c5f;
      color: #e2e8f0;
      border: 0;
    }
    .msg-row.unsent .msg-bubble {
      background: transparent !important;
      border: 1px dashed rgba(148, 163, 184, 0.45) !important;
      color: #94a3b8 !important;
      box-shadow: none !important;
      font-style: italic;
    }
    .typing-bar {
      padding: 6px 16px 0;
      font-size: 0.78rem;
      color: var(--cyan);
    }
    .typing-bar.hidden { display: none; }

    .composer {
      flex-shrink: 0; display: flex; gap: 8px; padding: 10px 12px;
      padding-bottom: max(10px, env(safe-area-inset-bottom));
      background: rgba(6, 16, 28, 0.95);
      border-top: 1px solid var(--border);
    }
    .composer input[type="text"], .composer input[type="search"] {
      flex: 1; border: 1px solid var(--border); border-radius: 14px;
      padding: 12px 16px; outline: none;
      background: rgba(8, 20, 36, 0.9); color: var(--text);
    }
    .composer input[type="text"]::placeholder, .composer input[type="search"]::placeholder { color: #64788f; }
    .composer input[type="text"]:focus, .composer input[type="search"]:focus {
      border-color: rgba(34, 211, 238, 0.55);
      box-shadow: 0 0 0 3px var(--cyan-dim);
    }
    .composer .btn-send {
      width: 46px; height: 46px; border-radius: 14px; border: 0;
      background: linear-gradient(145deg, #22d3ee, #0891b2);
      color: #042f2e; font-size: 1.05rem; font-weight: 800; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: var(--glow);
    }
    .composer .btn-send:disabled { opacity: .4; cursor: not-allowed; box-shadow: none; }
    .composer .btn-sticker {
      width: 46px; height: 46px; border-radius: 14px; border: 1px solid var(--border);
      background: rgba(8, 20, 36, 0.9); color: var(--cyan); font-size: 1.2rem;
      cursor: pointer; flex-shrink: 0;
    }
    .composer .btn-sticker.active {
      background: var(--cyan-dim);
      border-color: rgba(34, 211, 238, 0.55);
    }
    .composer .btn-attach {
      width: 46px; height: 46px; border-radius: 14px; border: 1px solid var(--border);
      background: rgba(8, 20, 36, 0.9); color: var(--cyan); font-size: 1.05rem;
      cursor: pointer; flex-shrink: 0;
    }
    .msg-row.image-msg .msg-bubble {
      background: transparent !important; border: 0 !important; padding: 0;
      box-shadow: none !important;
    }
    .msg-image {
      max-width: min(240px, 72vw); max-height: 280px;
      border-radius: 14px; display: block; object-fit: contain;
      background: rgba(8, 20, 36, 0.5);
    }
    .file-chip {
      display: flex; align-items: center; gap: 10px;
      min-width: 170px; max-width: 250px;
      text-decoration: none; color: inherit;
    }
    .file-chip-ico {
      width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
      background: rgba(34, 211, 238, 0.14); color: var(--cyan);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.72rem; font-weight: 800;
    }
    .file-chip-name { font-weight: 700; font-size: 0.84rem; word-break: break-word; }
    .file-chip-size { font-size: 0.7rem; opacity: .8; margin-top: 2px; }
    .upload-bar {
      flex-shrink: 0; padding: 6px 12px; font-size: 0.78rem; color: var(--cyan);
      background: rgba(6, 16, 28, 0.98); border-top: 1px solid var(--border);
    }
    .sticker-panel {
      flex-shrink: 0; max-height: 220px; overflow-y: auto;
      background: rgba(6, 16, 28, 0.98);
      border-top: 1px solid var(--border);
      padding: 10px 10px 4px;
    }
    .sticker-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
      gap: 8px;
    }
    .sticker-cell {
      background: rgba(15, 30, 50, 0.8); border: 1px solid var(--border);
      border-radius: 12px; padding: 4px; cursor: pointer;
    }
    .sticker-cell img { width: 100%; height: 68px; object-fit: contain; display: block; }
    .msg-row.sticker-msg .msg-bubble {
      background: transparent !important; border: 0 !important; padding: 0;
      box-shadow: none !important;
    }
    .msg-sticker { width: 148px; height: auto; display: block; }

    .chat-placeholder {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; color: var(--muted); text-align: center; padding: 24px;
    }
    .chat-placeholder .brand-mark {
      width: 84px; height: 84px; margin: 0 0 14px;
    }

    .ai-fab {
      position: fixed; right: 16px; bottom: 22px; z-index: 46;
      height: 42px; min-width: 58px; padding: 0 16px; border: 0; border-radius: 999px;
      background: linear-gradient(145deg, #164e63, #0e7490 42%, #22d3ee);
      color: #ecfeff; cursor: pointer;
      box-shadow: 0 10px 28px rgba(8, 145, 178, .45), var(--glow);
      display: flex; align-items: center; justify-content: center;
    }
    .ai-fab-ring {
      position: absolute; inset: -5px; border-radius: 999px;
      border: 1px solid rgba(103, 232, 249, .45);
      animation: aiPulse 2.4s ease-out infinite;
      pointer-events: none;
    }
    @keyframes aiPulse {
      0% { transform: scale(.92); opacity: .7; }
      100% { transform: scale(1.18); opacity: 0; }
    }
    .ai-fab-ico {
      position: relative; z-index: 1;
      font-family: Orbitron, "Noto Sans Thai", sans-serif;
      font-size: 1.05rem; font-weight: 700; letter-spacing: 0.18em;
      color: #f0fdff;
    }
    .ai-panel {
      position: fixed; z-index: 47;
      right: 16px; bottom: 90px; width: min(400px, calc(100vw - 24px));
      height: min(560px, calc(100vh - 120px));
      display: flex; flex-direction: column;
      background: rgba(8, 18, 32, .96);
      border: 1px solid var(--border); border-radius: 20px;
      box-shadow: 0 24px 60px rgba(0,0,0,.5), var(--glow);
      backdrop-filter: blur(18px); overflow: hidden;
    }
    .ai-head {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; border-bottom: 1px solid var(--border);
    }
    .ai-head-mark {
      width: 34px; height: 34px; border-radius: 12px;
      background: linear-gradient(145deg, #22d3ee, #0e7490);
      color: #042f2e; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
    }
    .ai-head h2 { margin: 0; font-size: .95rem; }
    .ai-head p { margin: 0; color: var(--muted); font-size: .72rem; }
    .ai-head-close {
      margin-left: auto; border: 0; background: transparent;
      color: var(--muted); font-size: 1.2rem; cursor: pointer; padding: 4px 8px;
    }
    .ai-lock {
      margin: 0 14px 8px; padding: 8px 10px; border-radius: 12px;
      background: rgba(34, 211, 238, .08); border: 1px solid var(--border);
      color: #9fdff0; font-size: .72rem; line-height: 1.45;
    }
    .ai-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 14px 8px; }
    .ai-chip {
      border: 1px solid var(--border); background: rgba(15, 30, 50, .85);
      color: var(--text); border-radius: 999px; padding: 6px 10px;
      font-size: .72rem; cursor: pointer;
    }
    .ai-log { flex: 1; overflow-y: auto; padding: 8px 14px 12px; display: flex; flex-direction: column; gap: 10px; }
    .ai-bubble { max-width: 92%; padding: 10px 12px; border-radius: 14px; font-size: .88rem; line-height: 1.5; white-space: pre-wrap; }
    .ai-bubble.bot { align-self: flex-start; background: rgba(30, 48, 72, .95); border: 1px solid var(--border); }
    .ai-bubble.me { align-self: flex-end; background: linear-gradient(135deg, #0891b2, #0e7490); }
    .ai-bubble.err { align-self: flex-start; background: var(--danger-bg); color: #fecdd3; }
    .ai-src { display: block; margin-top: 6px; font-size: .68rem; color: var(--muted); }
    .ai-form { display: flex; gap: 8px; padding: 10px; border-top: 1px solid var(--border); }
    .ai-form input {
      flex: 1; border: 1px solid var(--border); border-radius: 12px;
      background: rgba(8, 20, 36, .9); color: var(--text); padding: 10px 12px; outline: none;
    }
    .ai-form button {
      width: 44px; height: 44px; border: 0; border-radius: 12px; cursor: pointer;
      background: linear-gradient(145deg, #22d3ee, #0891b2); color: #042f2e; font-weight: 800;
    }
    .ai-form button:disabled { opacity: .45; cursor: not-allowed; }

    /* Mobile */
    @media (max-width: 768px) {
      #panel-list { max-width: none; width: 100%; border-right: 0; }
      #panel-chat {
        position: fixed; inset: 0; z-index: 20; transform: translateX(100%);
        transition: transform .25s ease;
      }
      #view-app.show-chat #panel-chat { transform: translateX(0); }
      #view-app.show-chat #panel-list { display: none; }
      .chat-head {
        padding-top: max(12px, env(safe-area-inset-top));
        min-height: calc(48px + env(safe-area-inset-top));
      }
      .chat-head .back {
        display: block;
        min-width: 44px; min-height: 44px;
        padding: 8px 12px;
        font-size: 1.2rem;
        flex-shrink: 0;
      }
      .btn-logout { padding: 8px 12px; font-size: 0.78rem; }
      .app-header h1 { font-size: 0.85rem; }
      #view-app.show-chat .ai-fab { bottom: calc(96px + env(safe-area-inset-bottom)); }
      #view-app.show-chat .messages { padding-bottom: 84px; }
      .ai-panel {
        right: 8px; left: 8px; width: auto; bottom: 12px;
        height: min(78vh, calc(100vh - 24px));
      }
    }
    @media (min-width: 769px) {
      #panel-chat .chat-head .back { display: none; }
      .ai-fab {
        right: auto; left: 18px; bottom: 18px;
      }
      .ai-panel {
        left: 16px; right: auto; bottom: 72px;
      }
      #panel-list .list-scroll { padding-bottom: 58px; }
      #panel-list .list-footer { padding-bottom: 58px; }
    }
  </style>
</head>
<body>
<div id="unsendMenu" class="unsend-menu hidden" role="menu">
  <button type="button" onclick="confirmUnsendFromMenu()">ยกเลิกข้อความ</button>
</div>
<div id="unsendConfirm" class="unsend-confirm hidden" role="dialog" aria-modal="true" aria-labelledby="unsendConfirmText">
  <div class="unsend-confirm-card">
    <div class="unsend-sad" aria-hidden="true">
      <svg viewBox="0 0 80 80" fill="none">
        <circle cx="40" cy="40" r="30" stroke="currentColor" stroke-width="2.5"/>
        <path d="M27 36c1.4-3 3.4-4.4 5.6-4.4 2.2 0 4.2 1.4 5.6 4.4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M41.8 36c1.4-3 3.4-4.4 5.6-4.4 2.2 0 4.2 1.4 5.6 4.4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M28 54c3.4-5 8.2-7.4 12-7.4s8.6 2.4 12 7.4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M54 42c1.2 3.2.4 6.2-1.6 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
    <p id="unsendConfirmText">บางอย่างยกเลิกไปแล้ว จะเสียดายไม่ได้นะ</p>
    <div class="unsend-confirm-actions">
      <button type="button" id="unsendConfirmCancel">ยังไม่ยกเลิก</button>
      <button type="button" id="unsendConfirmOk">ยกเลิกเลย</button>
    </div>
  </div>
</div>
<div id="toastStack" class="toast-stack"></div>
<div id="notifyGate" class="notify-gate hidden">
  <div class="login-card">
    <div class="login-logo">!</div>
    <h1>เปิดการแจ้งเตือน</h1>
    <p>อนุญาตการแจ้งเตือนเพื่อให้ไอคอนแอปขึ้นป้ายแดงและมีเสียงเมื่อมีข้อความใหม่</p>
    <button type="button" class="btn btn-line" onclick="enableNotifications()">อนุญาตการแจ้งเตือน</button>
  </div>
</div>

<div id="view-login">
  <div class="login-card">
    <img class="brand-mark" src="/icons/mark.svg" alt="S-Chat">
    <div class="tag">SECURE CHANNEL</div>
    <h1>S-Chat</h1>
    <p id="loginSubtitle">ระบบแชทภายในองค์กร<br>เข้าด้วย LINE หรือบัญชีเว็บแอป</p>
    <button class="btn btn-line" id="btnLogin" onclick="loginLINE()">เข้าสู่ระบบด้วย LINE</button>
    <button type="button" class="btn btn-install hidden" id="btnLoginWeb" onclick="loginLINEWeb()">กรอกบัญชีในหน้านี้</button>
    <div class="login-divider" id="loginDivider">หรือใช้บัญชีเว็บแอป</div>
    <form class="login-form" id="passwordLoginForm" onsubmit="return loginWithPassword(event)">
      <div>
        <label for="loginEmail">อีเมลหรือชื่อผู้ใช้</label>
        <input type="text" id="loginEmail" name="email" autocomplete="username" required placeholder="อีเมลหรือชื่อผู้ใช้">
      </div>
      <div>
        <label for="loginPassword">รหัสผ่าน</label>
        <input type="password" id="loginPassword" name="password" autocomplete="current-password" required placeholder="รหัสผ่านเว็บแอป">
      </div>
      <button type="submit" class="btn btn-password" id="btnPasswordLogin">เข้าสู่ระบบด้วยบัญชี</button>
    </form>
    <button type="button" class="guide-link" id="smhLoginLink" onclick="openSmhLogin()">เปิดหน้าเข้าสู่ระบบ / ตั้งรหัสผ่าน SMH</button>
    <button type="button" class="btn btn-install hidden" id="btnInstall" onclick="installApp()">ติดตั้งแอป</button>
    <div id="loginStatus" class="status-msg hidden"></div>
    <div id="iosInstallGuide" class="ios-install hidden">
      <div class="ios-install-head">
        <div class="ios-install-title">คู่มือสำหรับ iPhone</div>
        <button type="button" class="ios-install-close" onclick="dismissIosInstallGuide()">ปิด</button>
      </div>
      <div class="guide-section" id="iosInstallSection">
        <h3>1. ติดตั้งบน iPhone</h3>
        <div id="iosInstallChrome" class="hidden">
          <p>Chrome บน iPhone ติดตั้งและแจ้งเตือนไม่ได้ ให้คัดลอกลิงก์ไปเปิดใน Safari แล้วเพิ่มไปที่หน้าจอโฮม</p>
          <button type="button" class="copy-link" onclick="copyIosLink()">คัดลอกลิงก์ S-Chat</button>
        </div>
        <ol id="iosInstallSteps">
          <li>ลบไอคอน S-Chat เดิมออกจากหน้าจอโฮม ถ้ามีอยู่แล้ว</li>
          <li>ใน Safari แตะปุ่มแชร์ แล้วเลือก เพิ่มไปยังหน้าจอโฮม</li>
          <li>เปิดสวิตช์ เปิดเป็นเว็บแอป แล้วแตะเพิ่ม</li>
          <li>เปิดจากไอคอนที่ไม่มีแถบที่อยู่ของ Safari แล้วกดอนุญาตการแจ้งเตือน</li>
        </ol>
      </div>
      <div class="guide-section" id="iosPasswordGuide">
        <h3>2. ตั้งชื่อผู้ใช้/รหัสผ่านในเว็บแอป SMH</h3>
        <p>บน iPhone ใช้ล็อกอินด้วยอีเมลหรือชื่อผู้ใช้ + รหัสผ่าน ถ้ายังไม่มีรหัสผ่าน ให้ตั้งที่เว็บแอปก่อน:</p>
        <ol>
          <li>กดปุ่ม <strong>เปิดหน้าเข้าสู่ระบบ / ตั้งรหัสผ่าน SMH</strong> ใต้ฟอร์มด้านบน</li>
          <li>เข้าสู่ระบบเว็บแอป (ใช้ LINE บนเว็บได้)</li>
          <li>ไปที่ <strong>ตั้งค่า → รหัสผ่าน</strong></li>
          <li>ตั้งชื่อผู้ใช้ (ถ้ายังไม่มีอีเมล) และรหัสผ่านใหม่ แล้วบันทึก</li>
          <li>กลับมาที่ S-Chat แล้วล็อกอินด้วยอีเมลหรือชื่อผู้ใช้ + รหัสผ่านนั้น</li>
        </ol>
      </div>
    </div>
  </div>
</div>

<div id="view-app" class="hidden">
  <header class="app-header">
    <div class="header-brand">
      <img class="brand-mark sm" src="/icons/mark.svg" alt="">
      <div class="header-brand-text">
      <h1>S-Chat</h1>
      <div class="header-live">
        <span class="pulse"></span>
        <span>ONLINE</span>
        <span>·</span>
        <span class="me-name" id="headerMe">-</span>
      </div>
      </div>
    </div>
    <div class="header-actions">
      <button type="button" class="btn-sound" id="btnTestSound" onclick="testNotificationSound()" title="ทดสอบเสียงแจ้งเตือน">🔊 ทดสอบเสียง</button>
      <button type="button" class="btn-notify hidden" id="btnEnableNotify" onclick="enableNotifications()" title="เปิดการแจ้งเตือน">🔔 เปิดแจ้งเตือน</button>
      <span id="unreadBadge" class="badge hidden">0</span>
      <button type="button" class="btn btn-logout" onclick="logoutLINE()" title="ออกจากระบบ" aria-label="ออกจากระบบ">
        <span class="logout-ico">⏻</span>
        <span>ออกจากระบบ</span>
      </button>
    </div>
  </header>

  <div id="notifyBanner" class="notify-banner hidden">
    <div>เปิดการแจ้งเตือนและเสียงเมื่อมีข้อความใหม่ (แนะนำเมื่อติดตั้งเป็นแอปบนมือถือ)</div>
    <button type="button" onclick="enableNotifications()">อนุญาต</button>
  </div>

  <div class="app-body">
    <aside id="panel-list" class="panel">
      <div class="panel-head">
        <input type="search" class="search-box" id="searchInput" placeholder="ค้นหาแชท..." oninput="onSearch()">
        <div class="tabs">
          <button class="tab active" id="tabChats" onclick="switchTab('chats')">
            <span>แชท</span>
            <span id="tabChatsBadge" class="tab-badge hidden">0</span>
          </button>
          <button class="tab" id="tabFriends" onclick="switchTab('friends')">เพื่อน</button>
          <button class="tab" id="tabGroups" onclick="switchTab('groups')">
            <span>กลุ่ม</span>
            <span id="tabGroupsBadge" class="tab-badge hidden">0</span>
          </button>
        </div>
      </div>
      <div class="list-scroll" id="listContainer"></div>
      <div id="listFooter" class="list-footer hidden">
        <button type="button" class="btn-create-group" onclick="openCreateGroup()">＋ สร้างกลุ่ม</button>
      </div>
    </aside>

    <main id="panel-chat" class="panel">
      <div id="chatEmpty" class="chat-placeholder">
        <img class="brand-mark" src="/icons/mark.svg" alt="">
        <div>เลือกแชท เพื่อน หรือกลุ่ม<br>เพื่อเริ่มคุย</div>
      </div>
      <div id="chatActive" class="hidden" style="display:flex;flex-direction:column;flex:1;min-height:0">
        <div class="chat-head" onclick="toggleGroupInfo()">
          <button class="back" onclick="event.stopPropagation();closeChat()">←</button>
          <div class="avatar" id="chatAvatar">?</div>
          <div class="chat-head-info">
            <div class="chat-head-name" id="chatName">-</div>
            <div class="chat-head-status" id="chatDept">-</div>
          </div>
        </div>
        <div class="messages" id="messages" ondragover="onChatDragOver(event)" ondrop="onChatDrop(event)"></div>
        <div id="uploadBar" class="upload-bar hidden">กำลังอัปโหลดไฟล์...</div>
        <div id="stickerPanel" class="sticker-panel hidden">
          <div class="sticker-grid" id="stickerGrid"></div>
        </div>
        <div id="typingBar" class="typing-bar hidden" aria-live="polite"></div>
        <div class="composer">
          <input type="file" id="fileInput" class="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt"
            onchange="onPickFile(this)">
          <button type="button" class="btn-attach" id="btnAttach" onclick="pickChatFile()" title="แนบไฟล์">📎</button>
          <button type="button" class="btn-sticker" id="btnSticker" onclick="toggleStickerPanel()" title="สติกเกอร์">☺</button>
          <input type="text" id="messageInput" placeholder="พิมพ์ข้อความ..." maxlength="2000"
            oninput="onComposerInput()"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage()}"
            onpaste="onPasteFile(event)">
          <button class="btn-send" id="btnSend" onclick="sendMessage()" title="ส่ง">➤</button>
        </div>
      </div>
    </main>
  </div>

  <button type="button" id="aiFab" class="ai-fab" onclick="toggleAiPanel()" title="ผู้ช่วย S-Chat" aria-label="เปิดผู้ช่วย S-Chat">
    <span class="ai-fab-ring"></span>
    <span class="ai-fab-ico">Ai</span>
  </button>
  <div id="aiPanel" class="ai-panel hidden" role="dialog" aria-label="ผู้ช่วย S-Chat">
    <div class="ai-head">
      <div class="ai-head-mark">AI</div>
      <div>
        <h2>ผู้ช่วย S-Chat</h2>
        <p>เว็บแอปกับเว็บสาธารณะแยกชุดกัน · ไม่ผสมข้อมูล</p>
      </div>
      <button type="button" class="ai-head-close" onclick="toggleAiPanel()" aria-label="ปิด">×</button>
    </div>
    <div class="ai-lock">ข้อมูลโรงพยาบาลใช้เฉพาะเว็บแอป · ความรู้ทั่วไปค้นจากเว็บสาธารณะ · ห้ามผสมในคำถามเดียวกัน · ไม่ตอบชื่อคนไข้ เลขบัตร เบอร์โทร ที่อยู่ หรือ HN รายบุคคล</div>
    <div class="ai-chips">
      <button type="button" class="ai-chip" onclick="askAiChip('ยอดผู้ป่วยนอกวันนี้')">ผู้ป่วยนอกวันนี้</button>
      <button type="button" class="ai-chip" onclick="askAiChip('5 โรคที่พบบ่อยเดือนนี้')">5 โรคที่พบบ่อย</button>
      <button type="button" class="ai-chip" onclick="askAiChip('ยาที่ใช้เยอะสุดเดือนนี้')">ยาที่ใช้เยอะสุด</button>
      <button type="button" class="ai-chip" onclick="askAiChip('ยอดผู้ป่วยรายแผนกเดือนนี้')">visit รายแผนก</button>
    </div>
    <div class="ai-log" id="aiLog"></div>
    <form class="ai-form" onsubmit="submitAiAsk(event)">
      <input type="text" id="aiInput" maxlength="400" placeholder="ถามข้อมูลโรงพยาบาล หรือความรู้ทั่วไปจากเว็บ..." autocomplete="off">
      <button type="submit" id="aiSend">➤</button>
    </form>
  </div>
</div>

<div id="groupModal" class="modal-mask hidden" onclick="if(event.target===this)closeCreateGroup()">
  <div class="modal">
    <h3 id="groupModalTitle">สร้างกลุ่ม</h3>
    <input type="text" class="search-box" id="groupNameInput" placeholder="ชื่อกลุ่ม เช่น งานคุณภาพ" maxlength="60">
    <input type="search" class="search-box" id="groupMemberSearch" placeholder="ค้นหาสมาชิก..." oninput="renderGroupPicker()" style="margin-top:8px">
    <div class="member-list" id="groupMemberList"></div>
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" onclick="closeCreateGroup()">ยกเลิก</button>
      <button type="button" class="btn btn-line" id="btnSaveGroup" onclick="submitCreateGroup()">สร้างกลุ่ม</button>
    </div>
  </div>
</div>

<div id="groupInfoModal" class="modal-mask hidden" onclick="if(event.target===this)closeGroupInfo()">
  <div class="modal">
    <h3 id="groupInfoTitle">สมาชิกกลุ่ม</h3>
    <div class="member-list" id="groupInfoList"></div>
    <div class="modal-actions" id="groupInfoActions"></div>
  </div>
</div>

<script>
const LIFF_ID = ${LIFF_ID};
const WORKER_ORIGIN = ${WORKER_ORIGIN};
const STICKERS = ${STICKERS_JSON};
const VAPID_PUBLIC_KEY = ${VAPID_PUBLIC_KEY};
const WEB_APP_ORIGIN = ${WEB_APP_ORIGIN};
const API_BASE = WORKER_ORIGIN + '/api/gas';
const PASSWORD_SETTINGS_URL = WEB_APP_ORIGIN + '/settings/password';
const WEB_APP_LOGIN_URL = WEB_APP_ORIGIN + '/login?redirect=' + encodeURIComponent('/settings/password');
const STORAGE_SESSION = 'organization_chat_session';
const STORAGE_USER = 'organization_chat_user';
const POLL_ACTIVE_MS = 4000;
const POLL_IDLE_MS = 10000;
const POLL_HIDDEN_MS = 30000;
const USERS_REFRESH_MS = 45000;
const PRESENCE_MS = 3 * 60 * 1000;

const state = {
  sessionToken: localStorage.getItem(STORAGE_SESSION) || '',
  me: null,
  users: [],
  conversations: [],
  tab: 'chats',
  search: '',
  active: null,
  messages: [],
  pollTimer: null,
  usersTimer: null,
  lastUnread: 0,
  lastPollAt: '',
  lastUpdatedAt: '',
  knownMessageIds: {},
  msgCache: {},
  openSeq: 0,
  _prevConvUnread: {},
  _pollBaselineSet: false,
  audioReady: false,
  sending: false,
  readCursors: [],
  typingUsers: [],
  _receiptId: '',
  _typingOn: false,
  _typingSentAt: 0,
  _typingTimer: null,
  notifyReady: false,
  aiOpen: false,
  aiBusy: false,
  aiTurns: [],
};

function unwrap(data) {
  return (data && data.gas) ? data.gas : data;
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function stickerSrc(id) {
  var pack = STICKERS.find(function(s) { return s.id === String(id); });
  var file = pack ? pack.file : (String(id) + '.png');
  return WORKER_ORIGIN + '/stickers/' + encodeURIComponent(file);
}

function fileUrl(fileId) {
  return WORKER_ORIGIN + '/files/' + encodeURIComponent(fileId) +
    '?sessionToken=' + encodeURIComponent(state.sessionToken || '');
}

function formatBytes(n) {
  n = Number(n) || 0;
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

function getAttachment(m) {
  if (m && m.attachment && m.attachment.fileId) return m.attachment;
  if (!m || (m.messageType !== 'file' && m.messageType !== 'image')) return null;
  try { return JSON.parse(m.message); } catch (e) { return null; }
}

function renderAlertCard(m) {
  var card = m && m.card;
  if (!card) return esc(m && m.message || '');
  var rows = (card.fields || []).map(function(f) {
    return '<div class="msg-card-row"><span class="msg-card-label">' + esc(f.label) + '</span><span>' + esc(f.value) + '</span></div>';
  }).join('');
  var badge = card.priority
    ? '<span class="msg-card-priority">' + esc(card.priority) + '</span>'
    : '';
  var actions = (card.actions || []).filter(function(a) {
    return a && a.label && a.url && /^https?:\/\//i.test(String(a.url));
  }).map(function(a) {
    return '<a class="msg-card-action" href="' + esc(a.url) + '" target="_blank" rel="noopener noreferrer">' +
      esc(a.label) + '</a>';
  }).join('');
  var actionsHtml = actions ? '<div class="msg-card-actions">' + actions + '</div>' : '';
  var bodyHtml = card.body && !(card.fields || []).length
    ? '<div class="msg-card-row" style="display:block;margin-bottom:4px">' + esc(card.body) + '</div>'
    : '';
  return '<div class="msg-card">' +
    '<div class="msg-card-bar"></div>' +
    '<div class="msg-card-body">' +
    '<div class="msg-card-head"><div class="msg-card-title">' + esc(card.title || 'แจ้งเตือน') + '</div>' + badge + '</div>' +
    bodyHtml +
    rows +
    actionsHtml +
    '</div></div>';
}

function messagePreviewLabel(m) {
  if (!m) return '';
  var type = m.messageType || m.lastMessageType;
  if (type === 'sticker') return 'สติกเกอร์';
  if (type === 'image') return 'รูปภาพ';
  if (type === 'file') {
    var att = getAttachment(m);
    if (att && att.name) return 'ไฟล์: ' + att.name;
    return m.lastMessage || 'ไฟล์แนบ';
  }
  if (type === 'card') {
    if (m.card && (m.card.title || m.card.priority)) {
      return [m.card.title, m.card.priority].filter(Boolean).join(' · ');
    }
    return m.lastMessage || m.message || 'แจ้งเตือน';
  }
  if (type === 'unsent') return 'ยกเลิกข้อความแล้ว';
  return m.message || m.lastMessage || '';
}

function closeStickerPanel() {
  var panel = document.getElementById('stickerPanel');
  var btn = document.getElementById('btnSticker');
  if (panel) panel.classList.add('hidden');
  if (btn) btn.classList.remove('active');
}

function toggleStickerPanel() {
  var panel = document.getElementById('stickerPanel');
  var btn = document.getElementById('btnSticker');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (btn) btn.classList.toggle('active', !panel.classList.contains('hidden'));
}

function renderStickerGrid() {
  var box = document.getElementById('stickerGrid');
  if (!box) return;
  box.innerHTML = STICKERS.map(function(s) {
    return '<button type="button" class="sticker-cell" onclick="sendSticker(\\'' + esc(s.id) + '\\')">' +
      '<img src="' + stickerSrc(s.id) + '" alt=""></button>';
  }).join('');
}

function avatarHtml(user) {
  if (user && user.isGroup) {
    return esc((user.displayName || 'ก').charAt(0));
  }
  const name = (user && (user.displayName || user.name)) || '?';
  const url = user && (user.avatar || user.pictureUrl);
  if (url) return '<img src="' + esc(url) + '" alt="">';
  return esc(name.charAt(0));
}

function isUserOnline(user) {
  if (!user || user.isGroup) return false;
  var ts = user.lastLogin || user.last_login || '';
  if (ts) {
    var t = Date.parse(ts);
    if (Number.isFinite(t)) return Date.now() - t < PRESENCE_MS;
  }
  if (typeof user.online === 'boolean') return user.online;
  return user.status === 'online';
}

function mergePresence(user) {
  if (!user || user.isGroup) return user;
  var live = (state.users || []).find(function(u) {
    return String(u.userId) === String(user.userId) ||
      (user.lineUserId && String(u.lineUserId) === String(user.lineUserId));
  });
  if (!live) return user;
  return Object.assign({}, user, {
    online: live.online,
    status: live.status,
    lastLogin: live.lastLogin || user.lastLogin,
  });
}

function avatarWrapHtml(user, group) {
  var online = !group && isUserOnline(user);
  return '<div class="avatar-wrap' + (online ? ' online' : '') + '">' +
    '<div class="avatar' + (group ? ' group-av' : '') + '">' + avatarHtml(user) + '</div>' +
    (group ? '' : '<span class="presence-badge"></span>') +
    '</div>';
}

function presenceLineHtml(opts) {
  if (opts && opts.group) {
    return '<div class="list-presence">' + esc(opts.memberLabel || 'กลุ่ม') + '</div>';
  }
  var on = !!(opts && opts.online);
  return '<div class="list-presence' + (on ? ' is-online' : '') + '">' +
    '<span class="presence-dot"></span>' + esc(on ? 'ออนไลน์' : 'ออฟไลน์') +
    '</div>';
}

function refreshChatHeadStatus() {
  if (!state.active) return;
  var el = document.getElementById('chatDept');
  if (!el) return;
  if (state.active.type === 'group') return;
  var user = mergePresence(state.active.otherUser);
  var on = isUserOnline(user);
  el.textContent = on ? 'ออนไลน์' : 'ออฟไลน์';
  el.classList.toggle('is-online', on);
}

function isGroupConv(c) {
  return !!(c && (c.type === 'group' || (c.otherUser && c.otherUser.isGroup)));
}

function shortId(user) {
  const id = String((user && (user.userId || user.lineUserId)) || '');
  return id ? id.slice(-4).toUpperCase() : '';
}

/** แยกชื่อซ้ำด้วยแผนก + รหัสท้าย */
function displayParts(user, pool) {
  const name = String((user && user.displayName) || 'ผู้ใช้').trim() || 'ผู้ใช้';
  const list = pool || state.users.concat(
    state.conversations.map(function(c) { return c.otherUser; }).filter(Boolean)
  );
  const same = list.filter(function(u) {
    return String((u && u.displayName) || '').trim() === name;
  });
  const dept = String((user && user.department) || '').trim();
  const sid = shortId(user);
  if (same.length > 1) {
    return {
      title: name,
      subtitle: [dept || 'ไม่ระบุแผนก', sid ? '#' + sid : ''].filter(Boolean).join(' · '),
    };
  }
  return {
    title: name,
    subtitle: dept || (user && user.status) || '',
  };
}

/** หาชื่อผู้ส่งจาก users / conversations / active chat */
function resolveUser(userId) {
  const id = String(userId || '');
  if (!id) return { displayName: 'ผู้ใช้ไม่ทราบชื่อ', userId: '' };

  if (state.me && String(state.me.userId) === id) {
    return state.me;
  }

  var fromUsers = state.users.find(function(u) {
    return String(u.userId) === id || String(u.lineUserId) === id;
  });
  if (fromUsers && fromUsers.displayName) return fromUsers;

  for (var i = 0; i < state.conversations.length; i++) {
    var c = state.conversations[i];
    var o = c.otherUser;
    if (o && (String(o.userId) === id || String(o.lineUserId) === id) && o.displayName) {
      return o;
    }
  }

  if (state.active && state.active.otherUser &&
      String(state.active.otherUser.userId) === id &&
      state.active.otherUser.displayName) {
    return state.active.otherUser;
  }

  if (fromUsers) return fromUsers;

  return {
    userId: id,
    displayName: 'ผู้ใช้ #' + id.slice(-4).toUpperCase(),
  };
}

function userLabel(userOrId) {
  var user = typeof userOrId === 'object' && userOrId
    ? userOrId
    : resolveUser(userOrId);
  if (!user || !user.displayName) {
    user = resolveUser(user && user.userId);
  }
  var parts = displayParts(user);
  return parts.title || 'ผู้ใช้ไม่ทราบชื่อ';
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { return ''; }
}

function setLoginStatus(msg, type) {
  const el = document.getElementById('loginStatus');
  el.textContent = msg;
  el.className = 'status-msg' + (type ? ' ' + type : '');
  el.classList.remove('hidden');
}

function showApp(show) {
  document.getElementById('view-login').classList.toggle('hidden', show);
  document.getElementById('view-app').classList.toggle('hidden', !show);
  updateIosInstallGuide();
}

function showToast(title, body, onClick) {
  const stack = document.getElementById('toastStack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = '<div class="toast-title">' + esc(title) + '</div>' +
    '<div class="toast-body">' + esc(body) + '</div>';
  el.onclick = function() {
    el.remove();
    if (onClick) onClick();
  };
  stack.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.remove(); }, 6000);
}

var _originalDocTitle = 'S-Chat';
var _titleBlinkTimer = null;
var _originalFaviconHref = '/icons/mark.svg?v=2';

function unlockAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!state._audioCtx || state._audioCtx.state === 'closed') {
      state._audioCtx = new Ctx();
    }
    if (state._audioCtx && state._audioCtx.state === 'suspended') {
      state._audioCtx.resume().catch(function() {});
    }
    state.audioReady = true;
  } catch (e) { /* ignore */ }
}

function playNotifySound() {
  try {
    unlockAudio();
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = state._audioCtx && state._audioCtx.state !== 'closed'
      ? state._audioCtx
      : new Ctx();
    state._audioCtx = ctx;

    const runChime = function() {
      try {
        const now = ctx.currentTime;
        // Tone 1: A5 -> E6 chime
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        osc1.frequency.exponentialRampToValueAtTime(1318.5, now + 0.08);
        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.linearRampToValueAtTime(0.35, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.36);

        // Tone 2: A6 bell harmonic slightly offset
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1760, now + 0.11);
        gain2.gain.setValueAtTime(0.001, now + 0.11);
        gain2.gain.linearRampToValueAtTime(0.3, now + 0.13);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.11);
        osc2.stop(now + 0.53);

        if (navigator.vibrate) {
          try { navigator.vibrate([100, 50, 100]); } catch (e) {}
        }
      } catch (e) {
        console.warn('playNotifySound error:', e);
      }
    };

    // ต้องรอ resume ก่อนเล่น — ไม่งั้น iOS/Chrome จะเงียบ (state ยัง suspended)
    if (ctx.state === 'suspended') {
      ctx.resume().then(runChime).catch(function() {});
      return;
    }
    runChime();
  } catch (e) {
    console.warn('playNotifySound error:', e);
  }
}

function testNotificationSound() {
  unlockAudio();
  playNotifySound();
  showToast('🔊 ทดสอบเสียง', 'ระบบเสียงแจ้งเตือนพร้อมทำงาน');
}

function updateFaviconBadge(count) {
  var link = document.getElementById('dynamicFavicon') || document.querySelector("link[rel*='icon']");
  if (!link) return;
  if (!count || count <= 0) {
    link.href = _originalFaviconHref;
    return;
  }
  try {
    var canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      ctx.clearRect(0, 0, 64, 64);
      ctx.drawImage(img, 0, 0, 64, 64);
      // Outer border circle
      ctx.beginPath();
      ctx.arc(46, 18, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#06101c';
      ctx.fill();
      // Inner vibrant red circle
      ctx.beginPath();
      ctx.arc(46, 18, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#f43f5e';
      ctx.fill();
      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Noto Sans Thai", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var text = count > 99 ? '99+' : String(count);
      if (text.length > 2) ctx.font = 'bold 12px Arial';
      ctx.fillText(text, 46, 19);
      link.href = canvas.toDataURL('image/png');
    };
    img.onerror = function() {
      ctx.clearRect(0, 0, 64, 64);
      ctx.beginPath();
      ctx.arc(32, 32, 28, 0, Math.PI * 2);
      ctx.fillStyle = '#f43f5e';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(count > 9 ? '9+' : String(count), 32, 32);
      link.href = canvas.toDataURL('image/png');
    };
    img.src = _originalFaviconHref;
  } catch (e) {
    /* fallback ignore */
  }
}

function updateTitleBadge(count, alertText) {
  if (_titleBlinkTimer) {
    clearInterval(_titleBlinkTimer);
    _titleBlinkTimer = null;
  }
  if (!count || count <= 0) {
    document.title = _originalDocTitle;
    return;
  }
  var baseTitle = '(' + (count > 99 ? '99+' : count) + ') 🔴 ' + _originalDocTitle;
  document.title = baseTitle;

  if (alertText && document.visibilityState === 'hidden') {
    var toggle = false;
    var blinks = 0;
    _titleBlinkTimer = setInterval(function() {
      blinks++;
      toggle = !toggle;
      document.title = toggle ? ('💬 ' + alertText.slice(0, 22)) : baseTitle;
      if (blinks >= 10 || document.visibilityState === 'visible') {
        clearInterval(_titleBlinkTimer);
        _titleBlinkTimer = null;
        document.title = baseTitle;
      }
    }, 1200);
  }
}

function alertNewMessage(senderLabel, preview, conversationId, senderUser) {
  var now = Date.now();
  var key = String(conversationId || '') + '|' + String(preview || '');
  if (state._lastAlert && state._lastAlert.key === key && now - state._lastAlert.at < 2800) {
    return;
  }
  state._lastAlert = { key: key, at: now };
  playNotifySound();
  showToast(senderLabel, preview, function() {
    if (conversationId) {
      openChat(conversationId, senderUser && senderUser.userId, senderUser);
    }
  });
  browserNotify(senderLabel, preview, conversationId);
  updateTitleBadge(state.lastUnread || 1, senderLabel + ': ' + preview);
}

function isStandaloneApp() {
  if (window.navigator.standalone === true) return true;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  return false;
}

function iosCanRequestNotification() {
  if (!('Notification' in window)) return false;
  if (typeof Notification.requestPermission !== 'function') return false;
  // iOS Safari รองรับ Notification API เฉพาะเมื่อติดตั้งเป็น PWA (standalone) เท่านั้น
  // ถ้าเปิดใน Safari ปกติหรือ LINE in-app browser จะ throw หรือ return 'denied' ทันที
  if (isIosDevice() && !isStandaloneApp()) return false;
  return true;
}

function isIosDevice() {
  var ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
}

function isIosChrome() {
  return isIosDevice() && /CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent || '');
}

function isLineInAppBrowser() {
  var ua = navigator.userAgent || '';
  if (ua.indexOf('Line/') >= 0) return true;
  return liffInClient();
}

function shouldForceIosSafari() {
  return isIosDevice() && !isStandaloneApp() && !iosCanRequestNotification() && isLineInAppBrowser();
}

function explainIosHomeScreenApp() {
  // แสดง modal แทน alert() เพื่อให้อ่านง่ายและไม่ตัดคำ
  showIosInstallModal();
}

function showIosInstallModal() {
  // ลบ modal เดิมถ้ามี
  var old = document.getElementById('iosNotifyModal');
  if (old) old.remove();

  var modal = document.createElement('div');
  modal.id = 'iosNotifyModal';
  modal.style.cssText = [
    'position:fixed;inset:0;z-index:9999',
    'background:rgba(4,10,18,0.88)',
    'display:flex;align-items:center;justify-content:center',
    'padding:20px',
    'backdrop-filter:blur(6px)',
  ].join(';');

  modal.innerHTML = [
    '<div style="width:min(380px,100%);background:linear-gradient(180deg,#0f1e30,#07101c);',
    'border:1px solid rgba(34,211,238,0.35);border-radius:22px;padding:28px 22px 22px;',
    'box-shadow:0 24px 60px rgba(0,0,0,.6);">',

    '<div style="font-size:2rem;text-align:center;margin-bottom:12px;">📱</div>',
    '<h2 style="margin:0 0 8px;font-size:1.1rem;color:#e8f1ff;text-align:center;">',
    'เปิดการแจ้งเตือนบน iPhone</h2>',
    '<p style="margin:0 0 18px;color:#8aa0b8;font-size:0.86rem;line-height:1.6;text-align:center;">',
    'iPhone รองรับการแจ้งเตือนเฉพาะเมื่อเปิดแอปจากไอคอนบนหน้าจอโฮมเท่านั้น</p>',

    '<div style="background:rgba(34,211,238,0.08);border:1px solid rgba(34,211,238,0.2);',
    'border-radius:14px;padding:14px 16px;margin-bottom:16px;">',
    '<div style="font-size:0.82rem;color:#a5f3fc;font-weight:700;margin-bottom:10px;">',
    '📋 ขั้นตอนการติดตั้ง</div>',
    '<ol style="margin:0;padding-left:1.3rem;color:#cbd5e1;font-size:0.84rem;line-height:1.8;">',
    '<li>ลบไอคอน S-Chat เดิมออกจากหน้าจอโฮม (ถ้ามี)</li>',
    '<li>เปิด <strong style="color:#e8f1ff;">Safari</strong> แล้วไปที่ URL ของ S-Chat</li>',
    '<li>แตะปุ่ม <strong style="color:#e8f1ff;">แชร์ ⎙</strong> ด้านล่าง</li>',
    '<li>เลือก <strong style="color:#e8f1ff;">"เพิ่มไปยังหน้าจอโฮม"</strong></li>',
    '<li>เปิดสวิตช์ <strong style="color:#e8f1ff;">"เปิดเป็นเว็บแอป"</strong> แล้วแตะ <strong style="color:#e8f1ff;">"เพิ่ม"</strong></li>',
    '<li>เปิดแอปจาก <strong style="color:#22d3ee;">ไอคอนบนหน้าจอโฮม</strong> (ไม่มีแถบ URL)</li>',
    '<li>กดปุ่ม <strong style="color:#22d3ee;">"🔔 เปิดแจ้งเตือน"</strong> แล้วกด <strong style="color:#22d3ee;">"Allow"</strong></li>',
    '</ol></div>',

    '<div style="display:flex;gap:10px;">',
    '<button onclick="document.getElementById(\\'iosNotifyModal\\').remove()" ',
    'style="flex:1;min-height:44px;border-radius:12px;border:1px solid rgba(148,163,184,0.35);',
    'background:transparent;color:#94a3b8;font-weight:700;cursor:pointer;font-size:0.9rem;">',
    'ปิด</button>',
    '<button onclick="copyIosLink();document.getElementById(\\'iosNotifyModal\\').remove()" ',
    'style="flex:1;min-height:44px;border-radius:12px;border:0;',
    'background:linear-gradient(135deg,#22d3ee,#0891b2);color:#042f2e;',
    'font-weight:800;cursor:pointer;font-size:0.9rem;">',
    '📋 คัดลอกลิงก์</button>',
    '</div>',
    '</div>',
  ].join('');

  document.body.appendChild(modal);
  // กดนอก modal เพื่อปิด
  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.remove();
  });
}

function openChatInSafari(sessionToken) {
  var url = lineLoginRedirectUri();
  if (sessionToken) {
    url += (url.indexOf('?') >= 0 ? '&' : '?') + 'appSession=' + encodeURIComponent(sessionToken);
  }
  setLoginStatus('กำลังเปิด Safari...', '');
  try {
    if (typeof liff !== 'undefined' && typeof liff.openWindow === 'function') {
      liff.openWindow({ url: url, external: true });
    }
  } catch (ignore) {}
}

function isMobileDevice() {
  var ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
  if (isIosDevice()) return true;
  if (navigator.userAgentData && navigator.userAgentData.mobile) return true;
  return false;
}

function dismissIosInstallGuide() {
  try { localStorage.setItem('fshh_hide_ios_install', '1'); } catch (ignore) {}
  var box = document.getElementById('iosInstallGuide');
  if (box) box.classList.add('hidden');
}

function passwordSettingsUrl() {
  return PASSWORD_SETTINGS_URL || (String(WEB_APP_ORIGIN || 'https://fshh-app.online') + '/settings/password');
}

function smhLoginUrl() {
  var base = String(WEB_APP_ORIGIN || 'https://fshh-app.online');
  return WEB_APP_LOGIN_URL || (base + '/login?redirect=' + encodeURIComponent('/settings/password'));
}

function webAppHostLabel() {
  var o = String(WEB_APP_ORIGIN || 'https://fshh-app.online');
  if (o.indexOf('https://') === 0) return o.slice(8);
  if (o.indexOf('http://') === 0) return o.slice(7);
  return o || 'fshh-app.online';
}

/** เปิดหน้าเข้าสู่ระบบเว็บแอป SMH */
function openSmhLogin(overrideUrl) {
  var url = overrideUrl || smhLoginUrl();
  // iOS PWA: <a target=_blank> มักไม่เปิดลิงก์นอกโดเมน — ใช้ location / window.open
  try {
    if (isStandaloneApp() && isIosDevice()) {
      location.assign(url);
      return false;
    }
    var win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) location.assign(url);
  } catch (e) {
    location.assign(url);
  }
  return false;
}

/** API บังคับเปลี่ยนรหัสผ่าน — แจ้งแล้วพาไป SMH */
function handleMustChangePassword(data) {
  if (!data || !data.mustChangePassword) return false;
  var url = data.passwordSettingsUrl || smhLoginUrl();
  setLoginStatus((data.error || 'กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งาน') + ' — กำลังเปิดหน้าตั้งรหัสผ่าน...', 'error');
  setTimeout(function () { openSmhLogin(url); }, 600);
  return true;
}

function applyLoginModeForDevice() {
  var ios = isIosDevice();
  var btnLogin = document.getElementById('btnLogin');
  var btnWeb = document.getElementById('btnLoginWeb');
  var divider = document.getElementById('loginDivider');
  var subtitle = document.getElementById('loginSubtitle');
  if (btnLogin) btnLogin.classList.toggle('hidden', ios);
  if (btnWeb) btnWeb.classList.add('hidden');
  if (divider) divider.classList.toggle('hidden', ios);
  if (subtitle) {
    subtitle.innerHTML = ios
      ? 'ระบบแชทภายในองค์กร<br>เข้าด้วยอีเมลและรหัสผ่านบัญชีเว็บแอป SMH'
      : 'ระบบแชทภายในองค์กร<br>เข้าด้วย LINE หรืออีเมลบัญชีเว็บแอป';
  }
  var host = document.getElementById('iosWebAppHost');
  if (host) host.textContent = webAppHostLabel();
  // บน iOS แสดงคู่มือตั้งรหัสผ่านแม้ติดตั้ง PWA แล้ว (ถ้าอยู่หน้า login)
  updateIosInstallGuide();
}

function updateIosInstallGuide() {
  var box = document.getElementById('iosInstallGuide');
  if (!box) return;
  var dismissed = false;
  try { dismissed = localStorage.getItem('fshh_hide_ios_install') === '1'; } catch (ignore) {}
  var login = document.getElementById('view-login');
  var onLogin = login && !login.classList.contains('hidden');
  // iOS + อยู่หน้า login + ยังไม่ dismiss
  // ถ้ายังไม่ใช่ PWA → แสดงทั้งติดตั้ง + ตั้งรหัสผ่าน
  // ถ้าเป็น PWA แล้ว → ยังแสดงบล็อกตั้งรหัสผ่าน (ซ่อนขั้นตอนติดตั้ง)
  var show = isIosDevice() && !dismissed && onLogin;
  box.classList.toggle('hidden', !show);
  var installSection = document.getElementById('iosInstallSection');
  if (installSection) installSection.classList.toggle('hidden', isStandaloneApp());
  var chromeNote = document.getElementById('iosInstallChrome');
  var steps = document.getElementById('iosInstallSteps');
  var inChrome = isIosChrome();
  if (chromeNote) chromeNote.classList.toggle('hidden', !inChrome || isStandaloneApp());
  if (steps) steps.classList.toggle('hidden', inChrome);
  var host = document.getElementById('iosWebAppHost');
  if (host) host.textContent = webAppHostLabel();
}

function copyIosLink() {
  var url = location.origin + '/chat';
  var done = function() { showToast('คัดลอกลิงก์แล้ว', 'เปิด Safari แล้ววางลิงก์นี้'); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done).catch(function() { window.prompt('คัดลอกลิงก์นี้ไปเปิดใน Safari', url); });
    return;
  }
  window.prompt('คัดลอกลิงก์นี้ไปเปิดใน Safari', url);
}

function showNotifyGate(show) {
  var el = document.getElementById('notifyGate');
  if (el) el.classList.toggle('hidden', !show);
}

function urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  var raw = atob(base64);
  var out = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function subscribePush() {
  if (!state.sessionToken || !VAPID_PUBLIC_KEY) return Promise.resolve();
  if (!('Notification' in window) || Notification.permission !== 'granted') return Promise.resolve();
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return Promise.resolve();
  return registerChatServiceWorker().then(function(reg) {
    if (!reg || !reg.pushManager) return null;
    return reg.pushManager.getSubscription().then(function(existing) {
      if (existing) return existing;
      return reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    });
  }).then(function(sub) {
    if (!sub) return;
    var json = sub.toJSON();
    var keys = json.keys || {};
    return apiCall('savePushSubscription', {
      endpoint: json.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }, 'POST');
  }).then(function() {
    state.notifyReady = true;
    updateNotifyUi();
  }).catch(function(err) {
    console.warn('subscribePush failed', err && err.message ? err.message : err);
  });
}

function updateNotifyUi() {
  var denied = ('Notification' in window) && Notification.permission === 'denied';
  var granted = state.notifyReady || (('Notification' in window) && Notification.permission === 'granted');
  var btn = document.getElementById('btnEnableNotify');
  var banner = document.getElementById('notifyBanner');
  if (btn) btn.classList.toggle('hidden', granted || denied);
  if (banner) banner.classList.toggle('hidden', granted || denied);
  if (granted || denied) showNotifyGate(false);
}

function finishNotifyGrant() {
  state.notifyReady = true;
  updateNotifyUi();
  subscribePush();
  setUnreadBadge(state.lastUnread || 0);
  browserNotify('S-Chat', 'เปิดการแจ้งเตือนแล้ว — จะแจ้งเมื่อมีข้อความใหม่', null, true);
  showToast('การแจ้งเตือน', 'เปิดใช้งานแล้ว');
}

function enableNotifications() {
  unlockAudio();
  registerChatServiceWorker();

  // --- iOS: ต้องเป็น standalone PWA เท่านั้นถึงจะขอ permission ได้ ---
  if (isIosDevice()) {
    if (!isStandaloneApp()) {
      // ยังไม่ได้ติดตั้งเป็น PWA → แสดงคำแนะนำวิธีติดตั้ง
      updateIosInstallGuide();
      explainIosHomeScreenApp();
      return;
    }
    // เป็น PWA แล้ว แต่ iOS เวอร์ชันเก่า (< 16.4) ไม่รองรับ Notification API
    if (!('Notification' in window)) {
      alert('iPhone ของคุณต้องอัปเดต iOS เป็นเวอร์ชัน 16.4 ขึ้นไปเพื่อรับการแจ้งเตือน\\n\\nไปที่ การตั้งค่า > ทั่วไป > อัปเดตซอฟต์แวร์');
      return;
    }
  }

  // --- ตรวจสอบว่าเบราว์เซอร์รองรับ Notification API หรือไม่ ---
  if (!iosCanRequestNotification()) {
    alert('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน');
    return;
  }

  // --- ขอ permission ---
  Notification.requestPermission().then(function(p) {
    if (p === 'granted') {
      finishNotifyGrant();
      return;
    }
    state.notifyReady = false;
    updateNotifyUi();
    if (p === 'denied') {
      showNotifyGate(false);
      alert(isIosDevice()
        ? 'ถูกปฏิเสธการแจ้งเตือน\\n\\nเปิดได้ที่: การตั้งค่า iPhone > การแจ้งเตือน > S-Chat > เปิดอนุญาตการแจ้งเตือน'
        : 'ถูกปฏิเสธการแจ้งเตือน — เปิดได้ในการตั้งค่าเบราว์เซอร์ของเว็บไซต์นี้');
      return;
    }
    showNotifyGate(true);
  }).catch(function() {
    showNotifyGate(true);
  });
}

function requestNotifyOnInstall(allowGate) {
  unlockAudio();
  registerChatServiceWorker();

  // iOS: ต้องเป็น standalone PWA เท่านั้นถึงจะขอ permission ได้
  // ถ้าไม่ใช่ standalone ให้ออกเงียบๆ ไม่แสดง gate (เพราะยังไม่ได้ติดตั้ง)
  if (isIosDevice() && !isStandaloneApp()) return Promise.resolve();

  if (!('Notification' in window)) return Promise.resolve();
  if (Notification.permission === 'granted') {
    state.notifyReady = true;
    updateNotifyUi();
    subscribePush();
    setUnreadBadge(state.lastUnread || 0);
    return Promise.resolve();
  }
  if (Notification.permission === 'denied') {
    updateNotifyUi();
    return Promise.resolve();
  }
  var asked;
  try {
    asked = Notification.requestPermission();
  } catch (e) {
    // iOS standalone PWA บางเวอร์ชันอาจ throw — แสดง gate ให้ผู้ใช้กดเองแทน
    if (allowGate !== false) showNotifyGate(true);
    return Promise.resolve();
  }
  return Promise.resolve(asked).then(function(p) {
    state.notifyReady = p === 'granted';
    updateNotifyUi();
    if (p === 'granted') {
      subscribePush();
      setUnreadBadge(state.lastUnread || 0);
      return;
    }
    if (p === 'default' && allowGate !== false) showNotifyGate(true);
  }).catch(function() {
    if (allowGate !== false) showNotifyGate(true);
  });
}

function requestNotifyPermission() {
  updateNotifyUi();
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    state.notifyReady = true;
    updateNotifyUi();
    subscribePush();
    setUnreadBadge(state.lastUnread || 0);
    return;
  }
  if (Notification.permission === 'denied') return;
  if (isIosDevice() || isStandaloneApp()) requestNotifyOnInstall();
}

var deferredInstallPrompt = null;

function installApp() {
  var permPromise = null;
  if ('Notification' in window && Notification.permission === 'default') {
    try { permPromise = Notification.requestPermission(); } catch (e) {}
  }
  var promptDone = deferredInstallPrompt
    ? deferredInstallPrompt.prompt()
    : Promise.resolve();
  Promise.resolve(promptDone).then(function() {
    if (deferredInstallPrompt && deferredInstallPrompt.userChoice) return deferredInstallPrompt.userChoice;
  }).catch(function() {}).then(function() {
    deferredInstallPrompt = null;
    var btn = document.getElementById('btnInstall');
    if (btn) btn.classList.add('hidden');
    return permPromise;
  }).then(function() {
    return requestNotifyOnInstall();
  });
}

function registerChatServiceWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  if (state._swRegistering) return state._swRegistering;
  state._swRegistering = navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(function(reg) {
      state.swRegistration = reg;
      return reg;
    })
    .catch(function() {
      return null;
    });
  return state._swRegistering;
}

function browserNotify(title, body, conversationId, force) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted' && !state.notifyReady) return;
  var viewingRoom = state.active && conversationId
    && String(state.active.conversationId) === String(conversationId);
  if (!force && viewingRoom && document.visibilityState === 'visible' && document.hasFocus()) return;

  var payload = {
    body: body || '',
    icon: '/icons/s-chat-192.png',
    badge: '/icons/badge-96.png?v=3',
    tag: conversationId ? ('chat-' + conversationId) : 'org-chat',
    data: { url: conversationId ? ('/chat?open=' + encodeURIComponent(conversationId)) : '/chat' },
  };
  // iOS ไม่รองรับ renotify/vibrate — ใส่แล้ว showNotification() จะ throw เงียบๆ
  if (!isIosDevice()) {
    payload.renotify = true;
    payload.vibrate = [120, 60, 120];
  }

  registerChatServiceWorker().then(function(reg) {
    if (reg && reg.showNotification) {
      return reg.showNotification(title || 'S-Chat', payload).catch(function() {
        return reg.showNotification(title || 'S-Chat', {
          body: payload.body,
          icon: payload.icon,
          tag: payload.tag,
          data: payload.data,
        });
      });
    }
    try {
      var n = new Notification(title || 'S-Chat', payload);
      n.onclick = function() {
        window.focus();
        n.close();
      };
    } catch (e) { /* ignore */ }
  });
}

function notifyNewMessages(items) {
  if (!items || !items.length) return;
  const myId = state.me && state.me.userId;
  const incoming = items.filter(function(m) {
    return String(m.senderId) !== String(myId);
  });
  if (!incoming.length) return;

  incoming.forEach(function(m) {
    if (m.messageId) state.knownMessageIds[m.messageId] = true;
  });

  const first = incoming[0];
  const isActiveRoom = state.active &&
    String(state.active.conversationId) === String(first.conversationId);

  // กำลังดูห้องนี้อยู่และแอปเปิดอยู่ → แค่แสดงข้อความ ไม่ toast
  if (isActiveRoom && document.visibilityState === 'visible' && document.hasFocus()) {
    return;
  }

  const sender = resolveUser(first.senderId);
  const label = userLabel(sender) || 'ข้อความใหม่';
  const preview = incoming.length === 1
    ? messagePreviewLabel(first)
    : ('มีข้อความใหม่ ' + incoming.length + ' ข้อความ');

  alertNewMessage(label, preview, first.conversationId, sender);
}

/** แจ้งเตือนจาก unread ของแต่ละ conversation */
function processConversationAlerts(conversations, skipAlert) {
  state._prevConvUnread = state._prevConvUnread || {};
  (conversations || []).forEach(function(c) {
    var cid = String(c.conversationId);
    var count = Number(c.unreadCount) || 0;
    var prev = state._prevConvUnread[cid] || 0;
    // ถือว่ากำลังดูห้องเฉพาะเมื่อหน้าจอเปิดอยู่จริง — ถ้าแอปอยู่พื้นหลังต้องแจ้งเตือน
    var viewingRoom = state.active
      && String(state.active.conversationId) === cid
      && document.visibilityState === 'visible';

    if (!skipAlert && count > prev && !viewingRoom) {
      var o = c.otherUser || {};
      var label = isGroupConv(c) ? (c.name || o.displayName || 'กลุ่ม') : userLabel(o);
      var preview = messagePreviewLabel({
        lastMessageType: c.lastMessageType,
        lastMessage: c.lastMessage,
        message: c.lastMessage,
      }) || ('ข้อความใหม่ ' + (count - prev) + ' ข้อความ');
      alertNewMessage(label, preview, c.conversationId, o);
    }

    state._prevConvUnread[cid] = count;
  });
}

async function apiCall(action, params, method) {
  method = method || 'GET';
  const token = state.sessionToken;
  if (method === 'GET') {
    const q = new URLSearchParams({ action: action });
    if (token) q.set('sessionToken', token);
    Object.keys(params || {}).forEach(function(k) {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') q.set(k, params[k]);
    });
    const res = await fetch(API_BASE + '?' + q.toString());
    const data = await res.json();
    return unwrap(data);
  }
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ action: action, sessionToken: token }, params || {})),
  });
  const data = await res.json();
  return unwrap(data);
}

function lineLoginRedirectUri() {
  var openId = new URLSearchParams(location.search).get('open');
  var url = location.origin + '/chat';
  if (openId) url += '?open=' + encodeURIComponent(openId);
  return url;
}

function maybeOpenFromQuery() {
  var params = new URLSearchParams(location.search);
  var openId = params.get('open');
  if (openId) openChat(openId);
  if (params.has('open') || params.has('sessionToken') || params.has('appSession')) {
    history.replaceState({}, '', location.pathname);
  }
}

async function init() {
  renderStickerGrid();
  var params = new URLSearchParams(location.search);
  var appToken = params.get('sessionToken') || params.get('appSession') || '';
  var lineError = params.get('error') || params.get('error_description') || '';

  // ล้าง URL parameter ทันทีเพื่อป้องกัน reload loop
  if (appToken || lineError || params.has('open')) {
    try { history.replaceState({}, '', location.pathname + (params.has('open') ? '?open=' + encodeURIComponent(params.get('open')) : '')); } catch (ignore) {}
  }

  if (appToken) {
    try {
      await bootFromAppSession(appToken);
      return;
    } catch (e) {
      localStorage.removeItem(STORAGE_SESSION);
      localStorage.removeItem(STORAGE_USER);
      state.sessionToken = '';
      setLoginStatus('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ด้วย LINE หรืออีเมล', 'error');
      // fall through ไป liff.init() เพื่อให้ปุ่มทำงานได้
    }
  }
  if (!appToken && state.sessionToken) {
    try {
      await bootFromAppSession(state.sessionToken);
      return;
    } catch (e) {
      localStorage.removeItem(STORAGE_SESSION);
      localStorage.removeItem(STORAGE_USER);
      state.sessionToken = '';
      // fall through ไป liff.init()
    }
  }
  try {
    if (typeof liff === 'undefined') throw new Error('ไม่พบ LIFF SDK');
    // ไม่ auto-login — ให้ผู้ใช้กดปุ่ม LINE หรือใช้อีเมล/รหัสผ่านเอง
    await liff.init({
      liffId: LIFF_ID,
      withLoginOnExternalBrowser: false,
    });
    applyLoginModeForDevice();
    if (lineError) {
      try { sessionStorage.removeItem('fshh_line_auto_login'); } catch (ignore) {}
      setLoginStatus(
        isIosDevice()
          ? 'เข้าสู่ระบบไม่สำเร็จ กรุณาใช้อีเมลและรหัสผ่านเว็บแอป'
          : 'เข้าสู่ระบบ LINE ไม่สำเร็จ กรุณาลองอีกครั้ง หรือใช้อีเมลเว็บแอป',
        'error'
      );
    } else if (isIosDevice()) {
      setLoginStatus('กรอกอีเมลและรหัสผ่านเว็บแอป SMH', '');
    } else {
      setLoginStatus('เลือกเข้าด้วย LINE หรืออีเมลเว็บแอป', '');
    }
    // iOS: ไม่แสดงปุ่ม LINE และไม่เรียก showIosLineChoice
    if (!isIosDevice()) {
      var loginBtn = document.getElementById('btnLogin');
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.onclick = function() { loginLINE(); };
      }
    }
  } catch (e) {
    applyLoginModeForDevice();
    setLoginStatus(
      isIosDevice()
        ? 'กรอกอีเมลและรหัสผ่านเว็บแอป SMH'
        : ('เริ่มระบบไม่สำเร็จ: ' + (e.message || e)),
      isIosDevice() ? '' : 'error'
    );
    if (!isIosDevice()) {
      var fallbackBtn = document.getElementById('btnLogin');
      if (fallbackBtn) {
        fallbackBtn.disabled = false;
        fallbackBtn.onclick = function() {
          location.assign('https://liff.line.me/' + LIFF_ID);
        };
      }
    }
  }
}

async function bootFromAppSession(token) {
  state.sessionToken = token;
  var data = await apiCall('me', {});
  if (!data || data.success === false || !data.user) {
    throw new Error((data && data.error) || 'SESSION_EXPIRED');
  }
  state.me = data.user;
  localStorage.setItem(STORAGE_SESSION, state.sessionToken);
  localStorage.setItem(STORAGE_USER, JSON.stringify(state.me));
  var header = document.getElementById('headerMe');
  if (header) header.textContent = state.me.displayName || 'S-Chat';
  showApp(true);
  unlockAudio();
  registerChatServiceWorker();
  requestNotifyPermission();
  await refreshAll();
  startPolling();
  startUsersRefresh();
  maybeOpenFromQuery();
}

function liffInClient() {
  try {
    return typeof liff !== 'undefined' && typeof liff.isInClient === 'function' && liff.isInClient();
  } catch (ignore) {
    return false;
  }
}

function showIosLineChoice() {
  var primary = document.getElementById('btnLogin');
  var web = document.getElementById('btnLoginWeb');
  if (primary) {
    primary.textContent = 'ใช้ LINE บนเครื่องนี้';
    primary.setAttribute('onclick', 'openLineOnDevice()');
  }
  if (web) web.classList.remove('hidden');
}

function openLineOnDevice() {
  if (isStandaloneApp() || iosCanRequestNotification()) {
    loginLINE();
    return;
  }
  location.assign('https://liff.line.me/' + LIFF_ID);
}

function loginLINEWeb() {
  try { sessionStorage.removeItem('fshh_skip_auto_login'); } catch (ignore) {}
  if (typeof liff === 'undefined' || !liff.isLoggedIn()) {
    liff.login({ redirectUri: lineLoginRedirectUri() });
    return;
  }
  bootApp();
}

async function loginWithPassword(event) {
  if (event) event.preventDefault();
  var emailEl = document.getElementById('loginEmail');
  var passEl = document.getElementById('loginPassword');
  var btn = document.getElementById('btnPasswordLogin');
  var email = emailEl ? String(emailEl.value || '').trim() : '';
  var password = passEl ? String(passEl.value || '') : '';
  if (!email || !password) {
    setLoginStatus('กรุณากรอกอีเมลหรือชื่อผู้ใช้ และรหัสผ่าน', 'error');
    return false;
  }
  if (btn) btn.disabled = true;
  setLoginStatus('กำลังเข้าสู่ระบบ...', '');
  try {
    var data = await apiCall('passwordLogin', { email: email, password: password }, 'POST');
    if (handleMustChangePassword(data)) {
      return false;
    }
    if (!data || data.success === false || !data.sessionToken) {
      throw new Error((data && data.error) || 'อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง');
    }
    if (passEl) passEl.value = '';
    await bootFromAppSession(String(data.sessionToken));
  } catch (e) {
    setLoginStatus(e.message || String(e), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
  return false;
}

function loginLINE() {
  try { sessionStorage.removeItem('fshh_skip_auto_login'); } catch (ignore) {}
  try { sessionStorage.removeItem('fshh_line_auto_login'); } catch (ignore) {}

  // LIFF ยังไม่ init → ใช้ LIFF URL โดยตรงแทน (ทำงานได้ทุก browser)
  if (typeof liff === 'undefined' || typeof liff.isLoggedIn !== 'function') {
    setLoginStatus('กำลังเปิด LINE...', '');
    location.assign('https://liff.line.me/' + LIFF_ID);
    return;
  }

  try {
    if (liff.isLoggedIn()) {
      bootApp();
      return;
    }
    // liff.login() อาจไม่ทำงานบน Android Chrome บางเวอร์ชัน
    // ใช้ redirect โดยตรงเป็น fallback ที่เชื่อถือได้กว่า
    var redirectUri = lineLoginRedirectUri();
    try {
      liff.login({ redirectUri: redirectUri });
    } catch (liffErr) {
      // fallback: ใช้ LIFF URL โดยตรง
      location.assign('https://liff.line.me/' + LIFF_ID + '?redirectUri=' + encodeURIComponent(redirectUri));
    }
  } catch (e) {
    // fallback สุดท้าย
    setLoginStatus('กำลังเปิด LINE...', '');
    location.assign('https://liff.line.me/' + LIFF_ID);
  }
}

/** ตรวจ JWT idToken ว่าหมดอายุหรือยัง (buffer 60 วินาที) */
function isIdTokenExpired(token) {
  if (!token) return true;
  try {
    var payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    return Date.now() >= (payload.exp * 1000) - 60000;
  } catch (e) {
    return true;
  }
}

function getUsableIdToken() {
  if (!liff.getIDToken) return null;
  var token = liff.getIDToken();
  if (!token || isIdTokenExpired(token)) return null;
  return token;
}

function isTokenExpiredError(msg) {
  var s = String(msg || '').toLowerCase();
  return s.indexOf('expired') >= 0 || s.indexOf('idtoken') >= 0;
}

async function serverLogin(profile, idToken) {
  var body = {
    lineUserId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl || '',
  };
  if (idToken) {
    body.action = 'authenticateWithLine';
    body.idToken = idToken;
  } else {
    body.action = 'lineLogin';
  }
  var res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  var wrapped = await res.json();
  var gas = unwrap(wrapped);

  // idToken หมดอายุ → ใช้ lineLogin จาก profile ที่ LIFF ยืนยันแล้ว
  if (
    !gas.success &&
    idToken &&
    isTokenExpiredError(gas.error)
  ) {
    var retry = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'lineLogin',
        lineUserId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl || '',
      }),
    });
    wrapped = await retry.json();
    gas = unwrap(wrapped);
  }

  return gas;
}

async function bootApp() {
  setLoginStatus('กำลังเข้าสู่ระบบ...', '');
  try {
    if (!liff.isLoggedIn()) {
      setLoginStatus('กรุณาเข้าสู่ระบบด้วย LINE', '');
      return;
    }
    const profile = await liff.getProfile();
    const idToken = getUsableIdToken();
    const gas = await serverLogin(profile, idToken);
    if (handleMustChangePassword(gas)) {
      return;
    }
    if (!gas.success) throw new Error(gas.error || 'Login ไม่สำเร็จ');
    state.sessionToken = gas.sessionToken;
    state.me = gas.user || {
      displayName: profile.displayName,
      lineUserId: profile.userId,
      avatar: profile.pictureUrl,
    };
    localStorage.setItem(STORAGE_SESSION, state.sessionToken);
    localStorage.setItem(STORAGE_USER, JSON.stringify(state.me));
    document.getElementById('headerMe').textContent = state.me.displayName || profile.displayName;
    showApp(true);
    try { sessionStorage.removeItem('fshh_line_auto_login'); } catch (ignore) {}
    unlockAudio();
    registerChatServiceWorker();
    requestNotifyPermission();
    await refreshAll();
    startPolling();
    startUsersRefresh();
    maybeOpenFromQuery();
  } catch (e) {
    var msg = e.message || String(e);
    if (isTokenExpiredError(msg)) {
      localStorage.removeItem(STORAGE_SESSION);
      localStorage.removeItem(STORAGE_USER);
      setLoginStatus('LINE Token หมดอายุ — กำลังเข้าสู่ระบบใหม่...', '');
      try {
        liff.logout();
      } catch (ignore) {}
      setTimeout(function() { liff.login(); }, 400);
      return;
    }
    setLoginStatus(msg, 'error');
  }
}

async function logoutLINE() {
  try { sessionStorage.setItem('fshh_skip_auto_login', '1'); } catch (ignore) {}
  stopPolling();
  stopUsersRefresh();
  try {
    if ('serviceWorker' in navigator) {
      var reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.pushManager) {
        var sub = await reg.pushManager.getSubscription();
        if (sub) {
          var json = sub.toJSON();
          await apiCall('deletePushSubscription', { endpoint: json.endpoint }, 'POST');
          await sub.unsubscribe();
        }
      }
      if (reg && reg.getNotifications) {
        var notes = await reg.getNotifications();
        (notes || []).forEach(function(note) { note.close(); });
      }
    }
    setAppBadgeCount(0);
  } catch (ignore) {}
  localStorage.removeItem(STORAGE_SESSION);
  localStorage.removeItem(STORAGE_USER);
  state.sessionToken = '';
  state.me = null;
  try {
    if (typeof liff !== 'undefined' && liff.isLoggedIn()) liff.logout();
  } catch (ignore) {}
  location.reload();
}

function dedupeClientUsers(users) {
  const map = {};
  (users || []).forEach(function(u) {
    const key = String(u.lineUserId || u.userId || '');
    if (!key) return;
    const prev = map[key];
    if (!prev) {
      map[key] = u;
      return;
    }
    const tPrev = new Date(prev.lastLogin || prev.createdAt || 0).getTime();
    const tNew = new Date(u.lastLogin || u.createdAt || 0).getTime();
    map[key] = tNew >= tPrev ? u : prev;
  });
  return Object.keys(map).map(function(k) { return map[k]; });
}

async function refreshAll() {
  await loadUsers();
  await pollInbox(true);
  renderList();
}

function startUsersRefresh() {
  stopUsersRefresh();
  state.usersTimer = setInterval(loadUsers, USERS_REFRESH_MS);
}

function stopUsersRefresh() {
  if (state.usersTimer) clearInterval(state.usersTimer);
  state.usersTimer = null;
}

async function pollInboxLegacy(forceFull) {
  var convRes = await apiCall('conversations', {}, 'GET');
  var unreadRes = await apiCall('unread', {}, 'GET');
  var res = {
    success: true,
    conversations: convRes.conversations || [],
    unread: unreadRes.unread || 0,
    messages: [],
    serverTime: new Date().toISOString(),
  };
  if (state.active && state.active.conversationId) {
    var last = state.messages.length
      ? state.messages[state.messages.length - 1].timestamp
      : '';
    var msgRes = await apiCall('messages', {
      conversationId: state.active.conversationId,
    }, 'GET');
    var all = msgRes.messages || [];
    if (last && !forceFull) {
      var sinceMs = new Date(last).getTime();
      res.messages = all.filter(function(m) {
        if (m.messageType === 'unsent') return true;
        return new Date(m.timestamp).getTime() > sinceMs;
      });
    } else {
      res.messages = all;
    }
  }
  return res;
}

async function fetchPollData(forceFull) {
  var params = {};
  if (forceFull) {
    state.lastUpdatedAt = '';
  } else if (state.lastUpdatedAt) {
    params.sinceUpdatedAt = state.lastUpdatedAt;
  }
  if (state.active && state.active.conversationId) {
    params.conversationId = state.active.conversationId;
    var last = state.messages.length
      ? state.messages[state.messages.length - 1]
      : null;
    if (last && !forceFull) {
      if (last.messageId) {
        var mid = String(last.messageId).replace(/^M/i, '');
        if (/^\d+$/.test(mid)) params.sinceMessageId = mid;
      }
      if (last.timestamp) params.since = last.timestamp;
    }
  }
  try {
    var res = await apiCall('poll', params, 'GET');
    if (res.success === false) throw new Error(res.error || 'poll failed');
    return res;
  } catch (e) {
    console.warn('poll API fallback', e);
    return pollInboxLegacy(forceFull);
  }
}

function patchUnsentMessage(messageId, conversationId) {
  if (!messageId) return false;
  var changed = false;
  function patch(list) {
    if (!list || !list.length) return list;
    return list.map(function(m) {
      if (String(m.messageId) !== String(messageId)) return m;
      if (m.messageType === 'unsent') return m;
      changed = true;
      return {
        messageId: m.messageId,
        conversationId: m.conversationId,
        senderId: m.senderId,
        receiverId: m.receiverId,
        messageType: 'unsent',
        message: '',
        timestamp: m.timestamp,
        deletedAt: new Date().toISOString(),
      };
    });
  }
  var activeId = state.active && state.active.conversationId;
  var matchesActive = !conversationId || String(activeId) === String(conversationId);
  if (matchesActive) state.messages = patch(state.messages);
  var cacheId = conversationId || activeId;
  if (cacheId && state.msgCache[cacheId]) {
    state.msgCache[cacheId] = patch(state.msgCache[cacheId]);
  }
  if (changed && matchesActive && activeId) {
    state.msgCache[activeId] = state.messages.slice();
    var last = state.messages.length ? state.messages[state.messages.length - 1] : null;
    if (last && String(last.messageId) === String(messageId)) {
      (state.conversations || []).forEach(function(c) {
        if (String(c.conversationId) === String(activeId)) {
          c.lastMessage = 'ยกเลิกข้อความแล้ว';
          c.lastMessageType = 'unsent';
        }
      });
    }
  }
  return changed;
}

function applyPollResult(res, forceFull) {
  if (res.conversations) {
    if (res.partial && !forceFull) {
      if (res.conversations.length) {
        var byId = {};
        (state.conversations || []).forEach(function(c) {
          byId[String(c.conversationId)] = c;
        });
        res.conversations.forEach(function(c) {
          byId[String(c.conversationId)] = c;
        });
        state.conversations = Object.keys(byId).map(function(k) { return byId[k]; });
        state.conversations.sort(function(a, b) {
          var ta = new Date(a.lastMessageAt || a.updatedAt || 0).getTime();
          var tb = new Date(b.lastMessageAt || b.updatedAt || 0).getTime();
          return tb - ta;
        });
      }
    } else {
      state.conversations = res.conversations;
    }
  }

  var watermark = '';
  (state.conversations || []).forEach(function(c) {
    // ต้องใช้ updatedAt ให้ตรงกับฟิลเตอร์ poll ของเซิร์ฟเวอร์ (c.updated_at > ?)
    var t = c.updatedAt || c.lastMessageAt || '';
    if (t && t > watermark) watermark = t;
  });
  // Do not use serverTime as watermark — it would make the next partial poll
  // skip every existing conversation (including groups).
  if (watermark) state.lastUpdatedAt = watermark;

  var unread = res.unread || 0;
  setUnreadBadge(unread);

  // ตั้ง baseline ครั้งแรก — ยังไม่แจ้งเตือน
  if (forceFull || !state._pollBaselineSet) {
    processConversationAlerts(res.partial ? state.conversations : (res.conversations || []), true);
    state.lastUnread = unread;
    state._pollBaselineSet = true;
  } else {
    processConversationAlerts(res.partial ? state.conversations : (res.conversations || []), false);
    state.lastUnread = unread;
  }

  if (Array.isArray(res.readCursors)) state.readCursors = res.readCursors;
  if (Array.isArray(res.typing)) {
    state.typingUsers = res.typing;
    renderTyping();
  }

  // sync ข้อความห้องที่เปิดอยู่
  var messageChanged = false;
  var incoming = [];
  if (state.active && res.messages && res.messages.length) {
    var myId = state.me && state.me.userId;
    res.messages.forEach(function(m) {
      if (m.messageType === 'unsent') {
        if (patchUnsentMessage(m.messageId, m.conversationId || (state.active && state.active.conversationId))) {
          messageChanged = true;
        }
        return;
      }
      if (!state.knownMessageIds[m.messageId]) {
        state.messages.push(m);
        state.knownMessageIds[m.messageId] = true;
        messageChanged = true;
        if (String(m.senderId) !== String(myId)) incoming.push(m);
      }
    });
    if (incoming.length) {
      var seen = {};
      state.messages = state.messages.filter(function(m) {
        if (seen[m.messageId]) return false;
        seen[m.messageId] = true;
        return true;
      });
    }
  }
  var receipt = readReceiptMessageId();
  if (receipt !== state._receiptId) {
    state._receiptId = receipt;
    messageChanged = true;
  }
  if (messageChanged && state.active) {
    state.msgCache[state.active.conversationId] = state.messages.slice();
    renderMessages(incoming.length > 0);
    if (incoming.length) {
      notifyNewMessages(incoming);
      apiCall('markRead', { conversationId: state.active.conversationId }, 'POST').catch(function() {});
    }
  }

  state.lastPollAt = res.serverTime || new Date().toISOString();
  renderList();
}

async function pollInbox(forceFull) {
  if (!state.sessionToken) return;
  try {
    var res = await fetchPollData(forceFull);
    applyPollResult(res, forceFull);
  } catch (e) {
    console.warn('pollInbox', e);
  }
}

function switchTab(tab) {
  state.tab = tab;
  document.getElementById('tabChats').classList.toggle('active', tab === 'chats');
  document.getElementById('tabFriends').classList.toggle('active', tab === 'friends');
  document.getElementById('tabGroups').classList.toggle('active', tab === 'groups');
  var input = document.getElementById('searchInput');
  if (input) {
    input.placeholder = tab === 'friends' ? 'ค้นหาเพื่อน...'
      : tab === 'groups' ? 'ค้นหากลุ่ม...'
      : 'ค้นหาแชท...';
  }
  var footer = document.getElementById('listFooter');
  if (footer) footer.classList.toggle('hidden', tab !== 'groups');
  renderList();
}

function onSearch() {
  state.search = document.getElementById('searchInput').value.trim().toLowerCase();
  renderList();
}

function filterUsers(list) {
  if (!state.search) return list;
  return list.filter(function(u) {
    const parts = displayParts(u, list);
    return (u.displayName || '').toLowerCase().indexOf(state.search) >= 0 ||
      (u.department || '').toLowerCase().indexOf(state.search) >= 0 ||
      parts.subtitle.toLowerCase().indexOf(state.search) >= 0 ||
      String(u.userId || '').toLowerCase().indexOf(state.search) >= 0;
  });
}

function renderList() {
  const box = document.getElementById('listContainer');
  if (state.tab === 'friends') {
    const users = filterUsers(state.users);
    if (!users.length) {
      box.innerHTML = '<div class="empty-state">ไม่พบเพื่อน</div>';
      return;
    }
    box.innerHTML = users.map(function(u) {
      const parts = displayParts(u, state.users);
      const online = isUserOnline(u);
      const botBadge = u.isBot || u.lineUserId === '__smh_systems_bot__'
        ? '<span class="bot-badge">บอท</span>'
        : '';
      const sub = (u.isBot || u.lineUserId === '__smh_systems_bot__')
        ? '<div class="list-sub">พิมพ์ชื่อระบบเพื่อเปิดลิงก์</div>'
        : presenceLineHtml({ online: online });
      return '<div class="list-item" onclick="openChatWithUser(\\'' + esc(u.userId) + '\\')">' +
        avatarWrapHtml(u, false) +
        '<div class="list-meta"><div class="list-name">' + esc(parts.title) + botBadge + '</div>' +
        sub +
        '</div></div>';
    }).join('');
    return;
  }

  var wantGroup = state.tab === 'groups';
  var convs = state.conversations.filter(function(c) {
    return wantGroup ? isGroupConv(c) : !isGroupConv(c);
  });
  if (state.search) {
    convs = convs.filter(function(c) {
      var o = c.otherUser || {};
      var title = isGroupConv(c) ? (c.name || o.displayName || '') : (o.displayName || '');
      var parts = displayParts(o);
      return title.toLowerCase().indexOf(state.search) >= 0 ||
        (o.department || '').toLowerCase().indexOf(state.search) >= 0 ||
        parts.subtitle.toLowerCase().indexOf(state.search) >= 0 ||
        String(c.lastMessage || '').toLowerCase().indexOf(state.search) >= 0;
    });
  }
  if (!convs.length) {
    box.innerHTML = wantGroup
      ? '<div class="empty-state">ยังไม่มีกลุ่ม<br><small>กลุ่มแผนก/ฝ่ายจะปรากฏเมื่อเลือกแผนกในเว็บแอป<br>หรือกดสร้างกลุ่มด้านล่าง</small></div>'
      : '<div class="empty-state">ยังไม่มีแชท<br><small>ไปที่แท็บ เพื่อน เพื่อเริ่มคุย</small></div>';
    return;
  }
  box.innerHTML = convs.map(function(c) {
    var o = mergePresence(c.otherUser || {});
    var group = isGroupConv(c);
    var parts = group
      ? { title: c.name || o.displayName || 'กลุ่ม', subtitle: (o.memberCount || 0) + ' คน' }
      : displayParts(o);
    var active = state.active && state.active.conversationId === c.conversationId;
    var unread = c.unreadCount || 0;
    var online = isUserOnline(o);
    return '<div class="list-item' + (active ? ' active' : '') + '" onclick="openChat(\\'' +
      esc(c.conversationId) + '\\',\\'' + esc(o.userId || '') + '\\')">' +
      avatarWrapHtml(o, group) +
      '<div class="list-meta"><div class="list-name">' + esc(parts.title || 'ไม่ทราบชื่อ') + '</div>' +
      (c.managed ? '<div class="list-tag">แผนก/ฝ่าย</div>' : '') +
      presenceLineHtml({
        group: group,
        memberLabel: parts.subtitle || 'กลุ่ม',
        online: online,
      }) +
      '</div>' +
      '<div class="list-item-right">' +
      (unread > 0 ? '<span class="list-unread">' + (unread > 99 ? '99+' : unread) + '</span>' : '') +
      '</div></div>';
  }).join('');
}

async function openChatWithUser(userId) {
  var user = state.users.find(function(u) { return String(u.userId) === String(userId); });
  if (!user) return;
  // ถ้าเคยคุยแล้ว เปิดจาก cache ทันที ไม่รอสร้าง conversation
  var existing = state.conversations.find(function(c) {
    if (isGroupConv(c)) return false;
    var o = c.otherUser || {};
    return String(o.userId) === String(userId);
  });
  if (existing && existing.conversationId) {
    openChat(existing.conversationId, userId, user);
    return;
  }
  try {
    document.getElementById('chatName').textContent = displayParts(user).title;
    document.getElementById('messages').innerHTML =
      '<div class="empty-state" style="padding:20px">กำลังเปิดแชท...</div>';
    var res = await apiCall('conversation', { otherUserId: userId }, 'GET');
    var conv = res.conversation || res;
    openChat(conv.conversationId, userId, user);
  } catch (e) {
    alert('เปิดแชทไม่สำเร็จ: ' + (e.message || e));
  }
}

function openChat(conversationId, otherUserId, otherUser) {
  if (state.active && String(state.active.conversationId) !== String(conversationId)) {
    pulseTyping(false);
  }
  var conv = state.conversations.find(function(c) {
    return String(c.conversationId) === String(conversationId);
  });
  if (!otherUser) {
    otherUser = (conv && conv.otherUser) || resolveUser(otherUserId);
  }
  var seq = ++state.openSeq;
  state.readCursors = [];
  state.typingUsers = [];
  state._receiptId = '';
  renderTyping();
  state.active = {
    conversationId: conversationId,
    otherUser: otherUser,
    type: conv && conv.type ? conv.type : (otherUser && otherUser.isGroup ? 'group' : 'direct'),
    members: [],
    myRole: 'member',
    managed: Boolean(conv && conv.managed),
    source: conv && conv.source ? conv.source : '',
  };

  document.getElementById('chatEmpty').classList.add('hidden');
  var activeEl = document.getElementById('chatActive');
  activeEl.classList.remove('hidden');
  activeEl.style.display = 'flex';

  var group = state.active.type === 'group';
  var parts = group
    ? { title: (conv && conv.name) || otherUser.displayName || 'กลุ่ม', subtitle: (otherUser.memberCount ? otherUser.memberCount + ' คน' : 'กลุ่ม') }
    : displayParts(otherUser);
  document.getElementById('chatName').textContent = parts.title;
  document.getElementById('chatAvatar').innerHTML = avatarHtml(otherUser);
  if (group) {
    document.getElementById('chatDept').textContent = parts.subtitle || 'กลุ่ม';
    document.getElementById('chatDept').classList.remove('is-online');
  } else {
    refreshChatHeadStatus();
  }
  document.getElementById('view-app').classList.add('show-chat');
  renderList();

  // แสดง cache ทันที แล้วค่อย sync เบื้องหลัง
  var cached = state.msgCache[conversationId];
  if (cached && cached.length) {
    state.messages = cached.slice();
    state.knownMessageIds = {};
    state.messages.forEach(function(m) {
      if (m.messageId) state.knownMessageIds[m.messageId] = true;
    });
    renderMessages(true);
  } else {
    state.messages = [];
    document.getElementById('messages').innerHTML =
      '<div class="empty-state" style="padding:20px">กำลังโหลดข้อความ...</div>';
  }

  document.getElementById('messageInput').focus();
  closeStickerPanel();
  restartPolling();
  syncActiveChat();

  // background sync — ไม่บล็อก UI
  loadMessages(conversationId, seq).then(function() {
    if (state.openSeq !== seq) return;
    apiCall('markRead', { conversationId: conversationId }, 'POST').catch(function() {});
    if (state.active && state.active.type === 'group') loadGroupInfo(conversationId);
  });
}

function closeChat() {
  closeStickerPanel();
  pulseTyping(false);
  document.getElementById('view-app').classList.remove('show-chat');
  state.active = null;
  state.readCursors = [];
  state.typingUsers = [];
  state._receiptId = '';
  renderTyping();
  renderList();
  restartPolling();
  syncActiveChat();
}

/** ปัดขวาจากขอบซ้าย / แถบหัวแชทบนมือถือ (Android+iOS) → กลับรายการแชท */
function setupChatEdgeSwipeBack() {
  var panel = document.getElementById('panel-chat');
  if (!panel || panel._swipeBackBound) return;
  panel._swipeBackBound = true;

  var startX = 0;
  var startY = 0;
  var tracking = false;
  var EDGE_PX = 48;

  function touchOnChatHead(target) {
    if (!target || !target.closest) return false;
    return Boolean(target.closest('.chat-head'));
  }

  panel.addEventListener('touchstart', function(e) {
    if (window.matchMedia('(min-width: 769px)').matches) return;
    if (!document.getElementById('view-app').classList.contains('show-chat')) return;
    if (!e.touches || !e.touches[0]) return;
    var t = e.touches[0];
    var fromEdge = t.clientX <= EDGE_PX;
    var fromHead = touchOnChatHead(e.target);
    if (!fromEdge && !fromHead) return;
    tracking = true;
    startX = t.clientX;
    startY = t.clientY;
  }, { passive: true });

  panel.addEventListener('touchmove', function(e) {
    if (!tracking || !e.touches || !e.touches[0]) return;
    var t = e.touches[0];
    var dx = t.clientX - startX;
    var dy = Math.abs(t.clientY - startY);
    if (dy > 40 && dy > dx) {
      tracking = false;
      return;
    }
  }, { passive: true });

  panel.addEventListener('touchend', function(e) {
    if (!tracking) return;
    tracking = false;
    var t = (e.changedTouches && e.changedTouches[0]) || null;
    if (!t) return;
    var dx = t.clientX - startX;
    var dy = Math.abs(t.clientY - startY);
    if (dx >= 80 && dy < 60) {
      closeChat();
    }
  }, { passive: true });
}

async function loadMessages(conversationId, seq) {
  var convId = conversationId || (state.active && state.active.conversationId);
  if (!convId) return;
  var mySeq = seq || state.openSeq;
  try {
    var res = await apiCall('messages', { conversationId: convId }, 'GET');
    if (state.openSeq !== mySeq) return;
    var list = res.messages || [];
    state.msgCache[convId] = list;
    if (state.active && state.active.conversationId === convId) {
      state.messages = list;
      state.knownMessageIds = {};
      state.messages.forEach(function(m) {
        if (m.messageId) state.knownMessageIds[m.messageId] = true;
      });
      renderMessages(true);
    }
  } catch (e) {
    console.warn('loadMessages', e);
    if (state.openSeq === mySeq && state.active && state.active.conversationId === convId && !state.messages.length) {
      document.getElementById('messages').innerHTML =
        '<div class="empty-state" style="padding:20px">โหลดข้อความไม่สำเร็จ แตะกลับแล้วเปิดใหม่</div>';
    }
  }
}

function readReceiptMessageId() {
  var cursors = state.readCursors || [];
  if (!cursors.length || !state.me) return '';
  var threshold = null;
  cursors.forEach(function(c) {
    var n = Number(c.lastReadMessageId) || 0;
    threshold = threshold === null ? n : Math.min(threshold, n);
  });
  if (!threshold) return '';
  var best = 0;
  var myId = state.me.userId;
  state.messages.forEach(function(m) {
    if (String(m.senderId) !== String(myId)) return;
    if (m._pending || m.messageType === 'unsent' || m.messageType === 'system') return;
    var id = Number(String(m.messageId || '').replace(/^M/i, ''));
    if (id > 0 && id <= threshold && id > best) best = id;
  });
  return best ? ('M' + best) : '';
}

function renderTyping() {
  var bar = document.getElementById('typingBar');
  if (!bar) return;
  var people = state.typingUsers || [];
  if (!state.active || !people.length) {
    bar.textContent = '';
    bar.classList.add('hidden');
    return;
  }
  var group = state.active.type === 'group';
  var label = 'กำลังพิมพ์...';
  if (group) {
    var name = people[0].displayName || 'สมาชิก';
    label = people.length === 1
      ? name + ' กำลังพิมพ์...'
      : name + ' และอีก ' + (people.length - 1) + ' คนกำลังพิมพ์...';
  }
  bar.textContent = label;
  bar.classList.remove('hidden');
}

function onComposerInput() {
  syncTypingFromInput();
}

function syncTypingFromInput() {
  var input = document.getElementById('messageInput');
  var hasText = !!(state.active && input && input.value.trim());
  pulseTyping(hasText);
}

function ensureTypingHeartbeat() {
  if (state._typingTimer) return;
  state._typingTimer = setInterval(syncTypingFromInput, 2000);
}

function pulseTyping(active) {
  if (!state.active || !state.active.conversationId) return;
  var now = Date.now();
  if (active) {
    if (state._typingOn && now - (state._typingSentAt || 0) < 2000) return;
    state._typingOn = true;
    state._typingSentAt = now;
  } else if (!state._typingOn) {
    return;
  } else {
    state._typingOn = false;
  }
  apiCall('setTyping', {
    conversationId: state.active.conversationId,
    active: active ? 1 : 0,
  }, 'POST').catch(function() {});
}

var unsendMenuId = '';

function hideUnsendMenu() {
  unsendMenuId = '';
  var menu = document.getElementById('unsendMenu');
  if (menu) menu.classList.add('hidden');
}

function showUnsendMenu(x, y, messageId) {
  var menu = document.getElementById('unsendMenu');
  if (!menu || !messageId) return;
  unsendMenuId = String(messageId);
  menu.classList.remove('hidden');
  menu.style.left = '0px';
  menu.style.top = '0px';
  var rect = menu.getBoundingClientRect();
  var left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
  var top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
}

function confirmUnsendFromMenu() {
  var id = unsendMenuId;
  hideUnsendMenu();
  if (id) unsendOwnMessage(id);
}

function initUnsendGestures() {
  var box = document.getElementById('messages');
  if (!box || box.getAttribute('data-unsend-bound')) return;
  box.setAttribute('data-unsend-bound', '1');
  var timer = null;
  var start = null;
  function ownRow(target) {
    if (!target || !target.closest) return null;
    return target.closest('.msg-row[data-unsend="1"]');
  }
  box.addEventListener('contextmenu', function(e) {
    var row = ownRow(e.target);
    if (!row) return;
    e.preventDefault();
    showUnsendMenu(e.clientX, e.clientY, row.getAttribute('data-id'));
  });
  box.addEventListener('touchstart', function(e) {
    var row = ownRow(e.target);
    if (!row || !e.touches || !e.touches[0]) return;
    var t = e.touches[0];
    start = { x: t.clientX, y: t.clientY, id: row.getAttribute('data-id') };
    clearTimeout(timer);
    timer = setTimeout(function() {
      if (!start) return;
      showUnsendMenu(start.x, start.y, start.id);
    }, 480);
  }, { passive: true });
  box.addEventListener('touchmove', function(e) {
    if (!start || !e.touches || !e.touches[0]) return;
    var t = e.touches[0];
    if (Math.abs(t.clientX - start.x) > 12 || Math.abs(t.clientY - start.y) > 12) {
      clearTimeout(timer);
      start = null;
    }
  }, { passive: true });
  function endPress() {
    clearTimeout(timer);
    start = null;
  }
  box.addEventListener('touchend', endPress);
  box.addEventListener('touchcancel', endPress);
  box.addEventListener('scroll', hideUnsendMenu);
  document.addEventListener('click', function(e) {
    var menu = document.getElementById('unsendMenu');
    if (!menu || menu.classList.contains('hidden')) return;
    if (menu.contains(e.target)) return;
    hideUnsendMenu();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') hideUnsendMenu();
  });
}

function askUnsendConfirm() {
  return new Promise(function(resolve) {
    var box = document.getElementById('unsendConfirm');
    var ok = document.getElementById('unsendConfirmOk');
    var cancel = document.getElementById('unsendConfirmCancel');
    if (!box || !ok || !cancel) {
      resolve(false);
      return;
    }
    box.classList.remove('hidden');
    function finish(yes) {
      box.classList.add('hidden');
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      box.removeEventListener('click', onMask);
      document.removeEventListener('keydown', onKey);
      resolve(yes);
    }
    function onOk() { finish(true); }
    function onCancel() { finish(false); }
    function onMask(e) { if (e.target === box) finish(false); }
    function onKey(e) { if (e.key === 'Escape') finish(false); }
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
    box.addEventListener('click', onMask);
    document.addEventListener('keydown', onKey);
  });
}

async function unsendOwnMessage(messageId) {
  if (!messageId) return;
  if (!(await askUnsendConfirm())) return;
  try {
    var res = await apiCall('unsendMessage', { messageId: messageId }, 'POST');
    if (!res || res.success === false) throw new Error((res && res.error) || 'ยกเลิกไม่สำเร็จ');
    state.messages = state.messages.map(function(m) {
      if (m.messageId !== messageId) return m;
      return {
        messageId: m.messageId,
        conversationId: m.conversationId,
        senderId: m.senderId,
        receiverId: m.receiverId,
        messageType: 'unsent',
        message: '',
        timestamp: m.timestamp,
        deletedAt: res.deletedAt || new Date().toISOString(),
      };
    });
    if (state.active) {
      state.msgCache[state.active.conversationId] = state.messages.slice();
    }
    state._receiptId = readReceiptMessageId();
    renderMessages(false);
    pollInbox(false);
    hideUnsendMenu();
  } catch (e) {
    alert('ยกเลิกข้อความไม่สำเร็จ: ' + (e.message || e));
  }
}

function renderMessages(forceScroll) {
  var box = document.getElementById('messages');
  if (!box) return;
  var nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  var prevScroll = box.scrollTop;
  var myId = state.me && state.me.userId;
  var receiptId = readReceiptMessageId();
  state._receiptId = receiptId;
  if (!state.messages.length) {
    box.innerHTML = '<div class="empty-state" style="padding:20px">ยังไม่มีข้อความ — ส่งข้อความแรกได้เลย</div>';
    return;
  }
  box.innerHTML = state.messages.map(function(m) {
    if (m.messageType === 'system') {
      return '<div class="msg-row system"><div class="msg-bubble">' + esc(m.message) + '</div></div>';
    }
    var mine = String(m.senderId) === String(myId);
    var cls = mine ? 'mine' : 'theirs';
    if (m._pending) cls += ' pending';
    if (m._failed) cls += ' failed';
    if (m.messageType === 'unsent') cls += ' unsent';
    if (m.messageType === 'sticker') cls += ' sticker-msg';
    if (m.messageType === 'image') cls += ' image-msg';
    if (m.messageType === 'card') {
      cls += ' card-msg';
      var pName = (m.card && m.card.priority) || '';
      if (pName.indexOf('วิกฤต') >= 0 || pName.indexOf('เร่งด่วน') >= 0) cls += ' card-urgent';
    }
    var senderName = '';
    if (!mine && state.active && state.active.type === 'group') {
      senderName = '<div class="msg-sender">' + esc(userLabel(m.senderId)) + '</div>';
    }
    var att = getAttachment(m);
    var body;
    if (m.messageType === 'sticker') {
      body = '<img class="msg-sticker" src="' + stickerSrc(m.message) + '" alt="สติกเกอร์">';
    } else if (m.messageType === 'image') {
      var imgSrc = m._localUrl || (att && att.fileId ? fileUrl(att.fileId) : '');
      body = imgSrc
        ? '<a href="' + esc(imgSrc) + '" target="_blank" rel="noopener noreferrer">' +
          '<img class="msg-image" src="' + esc(imgSrc) + '" alt="' + esc((att && att.name) || 'รูปภาพ') + '" referrerpolicy="no-referrer"></a>'
        : esc((att && att.name) || 'รูปภาพ');
    } else if (m.messageType === 'file') {
      var href = m._pending ? '#' : (att && att.fileId ? fileUrl(att.fileId) : '#');
      body = '<a class="file-chip" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' +
        '<div class="file-chip-ico">FILE</div><div>' +
        '<div class="file-chip-name">' + esc((att && att.name) || 'ไฟล์แนบ') + '</div>' +
        '<div class="file-chip-size">' + esc(formatBytes(att && att.size)) + '</div></div></a>';
    } else if (m.messageType === 'card') {
      body = renderAlertCard(m);
    } else if (m.messageType === 'unsent') {
      body = 'ยกเลิกข้อความแล้ว';
    } else {
      body = esc(m.message);
    }
    var canUnsend = mine && !m._pending && !m._failed &&
      m.messageType !== 'unsent' && m.messageType !== 'card' && m.messageType !== 'system';
    var unsend = canUnsend
      ? '<button type="button" class="msg-unsend" data-id="' + esc(m.messageId || '') + '" onclick="unsendOwnMessage(this.dataset.id)">ยกเลิก</button>'
      : '';
    var read = mine && receiptId && String(m.messageId) === String(receiptId)
      ? '<div class="msg-read">อ่านแล้ว</div>'
      : '';
    return '<div class="msg-row ' + cls + '" data-id="' + esc(m.messageId || '') + '"' +
      (canUnsend ? ' data-unsend="1"' : '') +
      (m.messageType === 'card' && m.card && m.card.color ? ' style="--card-color:' + esc(m.card.color) + '"' : '') +
      '>' +
      '<div>' + senderName + '<div class="msg-bubble">' + body + '</div>' +
      '<div class="msg-tools"><div class="msg-time">' + (m._pending ? 'กำลังส่ง...' : formatTime(m.timestamp)) + '</div>' +
      unsend + '</div>' + read + '</div></div>';
  }).join('');
  if (forceScroll || nearBottom) box.scrollTop = box.scrollHeight;
  else box.scrollTop = prevScroll;
}

async function sendMessage() {
  var input = document.getElementById('messageInput');
  var text = input.value.trim();
  if (!text) return;
  closeStickerPanel();
  input.value = '';
  await deliverMessage({ messageType: 'text', message: text });
}

async function sendSticker(stickerId) {
  closeStickerPanel();
  await deliverMessage({ messageType: 'sticker', message: stickerId, stickerId: stickerId });
}

function pickChatFile() {
  var input = document.getElementById('fileInput');
  if (input) input.click();
}

function onPickFile(input) {
  var file = input.files && input.files[0];
  input.value = '';
  if (file) uploadChatFile(file);
}

function onChatDragOver(e) {
  e.preventDefault();
}

function onChatDrop(e) {
  e.preventDefault();
  if (!state.active || !e.dataTransfer || !e.dataTransfer.files.length) return;
  uploadChatFile(e.dataTransfer.files[0]);
}

function onPasteFile(e) {
  var files = e.clipboardData && e.clipboardData.files;
  if (!files || !files.length) return;
  e.preventDefault();
  uploadChatFile(files[0]);
}

async function uploadChatFile(file) {
  if (!state.active || state.sending) return;
  closeStickerPanel();
  if (file.size > 8 * 1024 * 1024) {
    alert('ไฟล์ใหญ่เกิน 8 MB');
    return;
  }
  if (!file.size) {
    alert('ไฟล์ว่าง');
    return;
  }
  var isImage = String(file.type || '').indexOf('image/') === 0;
  var tempId = 'tmp_' + Date.now();
  var localUrl = isImage ? URL.createObjectURL(file) : '';
  var btn = document.getElementById('btnSend');
  var bar = document.getElementById('uploadBar');
  var optimistic = {
    messageId: tempId,
    conversationId: state.active.conversationId,
    senderId: state.me.userId,
    receiverId: state.active.otherUser && state.active.otherUser.userId,
    messageType: isImage ? 'image' : 'file',
    message: '',
    attachment: { fileId: '', name: file.name, mime: file.type, size: file.size },
    timestamp: new Date().toISOString(),
    _localUrl: localUrl,
    _pending: true,
  };
  state.messages.push(optimistic);
  state.knownMessageIds[tempId] = true;
  renderMessages(true);
  state.sending = true;
  if (btn) btn.disabled = true;
  if (bar) {
    bar.textContent = 'กำลังอัปโหลด ' + file.name + '...';
    bar.classList.remove('hidden');
  }
  try {
    var fd = new FormData();
    fd.append('sessionToken', state.sessionToken);
    fd.append('conversationId', state.active.conversationId);
    fd.append('file', file, file.name);
    var res = await fetch(WORKER_ORIGIN + '/api/upload', { method: 'POST', body: fd });
    var raw = await res.json();
    var data = unwrap(raw);
    if (!res.ok || data.success === false) throw new Error(data.error || 'อัปโหลดไม่สำเร็จ');
    state.messages = state.messages.filter(function(m) { return m.messageId !== tempId; });
    if (data.messageId) {
      state.messages.push(data);
      state.knownMessageIds[data.messageId] = true;
    }
    state.msgCache[state.active.conversationId] = state.messages.filter(function(m) {
      return !m._pending && !String(m.messageId).startsWith('tmp_');
    });
    renderMessages(true);
    pollInbox(false);
  } catch (e) {
    state.messages = state.messages.map(function(m) {
      if (m.messageId === tempId) {
        m._pending = false;
        m._failed = true;
      }
      return m;
    });
    renderMessages(true);
    alert('แนบไฟล์ไม่สำเร็จ: ' + (e.message || e));
  } finally {
    if (localUrl) URL.revokeObjectURL(localUrl);
    state.sending = false;
    if (btn) btn.disabled = false;
    if (bar) bar.classList.add('hidden');
  }
}

async function deliverMessage(opts) {
  if (!state.active || state.sending) return;
  pulseTyping(false);
  var messageType = opts.messageType || 'text';
  var text = String(opts.message || '').trim();
  if (!text) return;
  var btn = document.getElementById('btnSend');
  var tempId = 'tmp_' + Date.now();
  var optimistic = {
    messageId: tempId,
    conversationId: state.active.conversationId,
    senderId: state.me.userId,
    receiverId: state.active.otherUser.userId,
    messageType: messageType,
    message: text,
    timestamp: new Date().toISOString(),
    _pending: true,
  };
  state.messages.push(optimistic);
  state.knownMessageIds[tempId] = true;
  renderMessages(true);
  state.sending = true;
  btn.disabled = true;
  try {
    var res = await apiCall('sendMessage', {
      conversationId: state.active.conversationId,
      receiverId: state.active.otherUser && !state.active.otherUser.isGroup
        ? state.active.otherUser.userId
        : undefined,
      messageType: messageType,
      message: text,
      stickerId: opts.stickerId,
    }, 'POST');
    if (res.success === false) throw new Error(res.error || 'ส่งไม่สำเร็จ');
    state.messages = state.messages.filter(function(m) { return m.messageId !== tempId; });
    if (res.messageId) {
      state.messages.push({
        messageId: res.messageId,
        conversationId: res.conversationId || state.active.conversationId,
        senderId: res.senderId || state.me.userId,
        receiverId: res.receiverId,
        messageType: res.messageType || messageType,
        message: res.message || text,
        timestamp: res.timestamp || new Date().toISOString(),
      });
      state.knownMessageIds[res.messageId] = true;
    }
    state.msgCache[state.active.conversationId] = state.messages.filter(function(m) {
      return !m._pending && !String(m.messageId).startsWith('tmp_');
    });
    renderMessages(true);
    pollInbox(false);
  } catch (e) {
    state.messages = state.messages.map(function(m) {
      if (m.messageId === tempId) {
        m._pending = false;
        m._failed = true;
      }
      return m;
    });
    renderMessages(true);
    alert('ส่งข้อความไม่สำเร็จ: ' + (e.message || e));
  } finally {
    state.sending = false;
    btn.disabled = false;
    document.getElementById('messageInput').focus();
  }
}

function getPollIntervalMs() {
  if (document.visibilityState === 'hidden') return POLL_HIDDEN_MS;
  if (state.active) return POLL_ACTIVE_MS;
  return POLL_IDLE_MS;
}

function restartPolling() {
  stopPolling();
  var tick = async function() {
    if (!state.sessionToken) return;
    await pollInbox(false);
  };
  tick();
  state.pollTimer = setInterval(tick, getPollIntervalMs());
}

function startPolling() {
  ensureTypingHeartbeat();
  restartPolling();
}

function stopPolling() {
  if (state.pollTimer) clearInterval(state.pollTimer);
  state.pollTimer = null;
}

async function loadUsers() {
  try {
    const res = await apiCall('users', {});
    const meId = state.me && state.me.userId;
    state.users = dedupeClientUsers(res.users || []).filter(function(u) {
      return String(u.userId) !== String(meId);
    });
    state.users.sort(function(a, b) {
      var aBot = a.isBot || a.lineUserId === '__smh_systems_bot__' ? 0 : 1;
      var bBot = b.isBot || b.lineUserId === '__smh_systems_bot__' ? 0 : 1;
      if (aBot !== bBot) return aBot - bBot;
      return String(a.displayName || '').localeCompare(String(b.displayName || ''), 'th');
    });
    renderList();
    refreshChatHeadStatus();
  } catch (e) { console.warn('loadUsers', e); }
}

state.groupPicked = {};
state.groupModalMode = 'create';

function openCreateGroup() {
  state.groupModalMode = 'create';
  state.groupPicked = {};
  document.getElementById('groupModalTitle').textContent = 'สร้างกลุ่ม';
  document.getElementById('groupNameInput').value = '';
  document.getElementById('groupNameInput').classList.remove('hidden');
  document.getElementById('groupMemberSearch').value = '';
  document.getElementById('btnSaveGroup').textContent = 'สร้างกลุ่ม';
  document.getElementById('btnSaveGroup').onclick = submitCreateGroup;
  renderGroupPicker();
  document.getElementById('groupModal').classList.remove('hidden');
}

function closeCreateGroup() {
  document.getElementById('groupModal').classList.add('hidden');
}

function renderGroupPicker() {
  var q = (document.getElementById('groupMemberSearch').value || '').trim().toLowerCase();
  var box = document.getElementById('groupMemberList');
  var list = state.users.filter(function(u) {
    if (u.isBot || u.lineUserId === '__smh_systems_bot__') return false;
    if (!q) return true;
    return (u.displayName || '').toLowerCase().indexOf(q) >= 0 ||
      (u.department || '').toLowerCase().indexOf(q) >= 0;
  });
  if (!list.length) {
    box.innerHTML = '<div class="empty-state">ไม่พบเพื่อน</div>';
    return;
  }
  box.innerHTML = list.map(function(u) {
    var checked = !!state.groupPicked[u.userId];
    return '<label class="pick"><input type="checkbox" ' + (checked ? 'checked' : '') +
      ' onchange="toggleGroupPick(\\'' + esc(u.userId) + '\\', this.checked)">' +
      '<div class="avatar" style="width:36px;height:36px;border-radius:10px">' + avatarHtml(u) + '</div>' +
      '<div><div class="list-name">' + esc(u.displayName) + '</div>' +
      '<div class="list-sub">' + esc(u.department || '') + '</div></div></label>';
  }).join('');
}

function toggleGroupPick(userId, on) {
  if (on) state.groupPicked[userId] = true;
  else delete state.groupPicked[userId];
}

async function submitCreateGroup() {
  var name = document.getElementById('groupNameInput').value.trim();
  var memberIds = Object.keys(state.groupPicked);
  if (!name) { alert('กรุณาใส่ชื่อกลุ่ม'); return; }
  if (!memberIds.length) { alert('เลือกสมาชิกอย่างน้อย 1 คน'); return; }
  try {
    var res = await apiCall('createGroup', { name: name, memberIds: memberIds }, 'POST');
    if (res.success === false) throw new Error(res.error || 'สร้างกลุ่มไม่สำเร็จ');
    closeCreateGroup();
    await pollInbox(true);
    switchTab('groups');
    openChat(res.conversationId, 'g' + res.conversationId, {
      userId: 'g' + res.conversationId,
      displayName: name,
      isGroup: true,
      memberCount: memberIds.length + 1,
    });
  } catch (e) {
    alert(e.message || e);
  }
}

async function loadGroupInfo(conversationId) {
  try {
    var res = await apiCall('groupInfo', { conversationId: conversationId }, 'GET');
    if (!state.active || state.active.conversationId !== conversationId) return;
    state.active.members = res.members || [];
    state.active.myRole = res.myRole || 'member';
    state.active.managed = Boolean(res.managed);
    state.active.source = res.source || state.active.source || '';
    var extra = state.active.managed ? ' · กลุ่มแผนก/ฝ่าย' : ' · แตะเพื่อดูสมาชิก';
    document.getElementById('chatDept').textContent = (state.active.members.length || 0) + ' คน' + extra;
  } catch (e) { console.warn('groupInfo', e); }
}

function toggleGroupInfo() {
  if (!state.active || state.active.type !== 'group') return;
  openGroupInfo();
}

function closeGroupInfo() {
  document.getElementById('groupInfoModal').classList.add('hidden');
}

function openGroupInfo() {
  if (!state.active || state.active.type !== 'group') return;
  var members = state.active.members || [];
  document.getElementById('groupInfoTitle').textContent = document.getElementById('chatName').textContent;
  document.getElementById('groupInfoList').innerHTML = members.map(function(u) {
    var role = u.role === 'admin' ? 'หัวหน้ากลุ่ม' : '';
    return '<div class="pick" style="cursor:default">' +
      '<div class="avatar" style="width:36px;height:36px;border-radius:10px">' + avatarHtml(u) + '</div>' +
      '<div style="flex:1"><div class="list-name">' + esc(u.displayName) + '</div>' +
      '<div class="list-sub">' + esc(role || u.department || '') + '</div></div>' +
      (state.active.managed ? '' : (
        state.active.myRole === 'admin' && String(u.userId) !== String(state.me.userId)
        ? '<button class="btn-ghost btn" style="padding:6px 10px" onclick="removeGroupMember(\\'' + esc(u.userId) + '\\')">ลบ</button>'
        : ''
      )) +
      '</div>';
  }).join('') || '<div class="empty-state">ไม่มีสมาชิก</div>';
  var actions = '';
  if (state.active.managed) {
    actions = '<div class="list-sub" style="text-align:center;padding:4px 0 8px">สมาชิกตามแผนก/ฝ่ายที่เลือกในเว็บแอป</div>' +
      '<button type="button" class="btn btn-ghost" onclick="closeGroupInfo()">ปิด</button>';
  } else {
    if (state.active.myRole === 'admin') {
      actions += '<button type="button" class="btn btn-line" onclick="openAddMembers()">เพิ่มสมาชิก</button>';
    }
    actions += '<button type="button" class="btn btn-ghost" onclick="leaveCurrentGroup()">ออกจากกลุ่ม</button>';
  }
  document.getElementById('groupInfoActions').innerHTML = actions;
  document.getElementById('groupInfoModal').classList.remove('hidden');
}

function openAddMembers() {
  closeGroupInfo();
  state.groupModalMode = 'add';
  state.groupPicked = {};
  var already = {};
  (state.active.members || []).forEach(function(u) { already[String(u.userId)] = true; });
  document.getElementById('groupModalTitle').textContent = 'เพิ่มสมาชิก';
  document.getElementById('groupNameInput').classList.add('hidden');
  document.getElementById('groupMemberSearch').value = '';
  document.getElementById('btnSaveGroup').textContent = 'เพิ่ม';
  document.getElementById('btnSaveGroup').onclick = submitAddMembers;
  var box = document.getElementById('groupMemberList');
  var list = state.users.filter(function(u) { return !already[String(u.userId)]; });
  box.innerHTML = list.length ? list.map(function(u) {
    return '<label class="pick"><input type="checkbox" onchange="toggleGroupPick(\\'' + esc(u.userId) + '\\', this.checked)">' +
      '<div class="avatar" style="width:36px;height:36px;border-radius:10px">' + avatarHtml(u) + '</div>' +
      '<div><div class="list-name">' + esc(u.displayName) + '</div></div></label>';
  }).join('') : '<div class="empty-state">ไม่มีคนให้เพิ่ม</div>';
  document.getElementById('groupModal').classList.remove('hidden');
}

async function submitAddMembers() {
  var memberIds = Object.keys(state.groupPicked);
  if (!memberIds.length) { alert('เลือกสมาชิกที่จะเพิ่ม'); return; }
  try {
    var res = await apiCall('addMembers', {
      conversationId: state.active.conversationId,
      memberIds: memberIds,
    }, 'POST');
    if (res.success === false) throw new Error(res.error);
    closeCreateGroup();
    await loadGroupInfo(state.active.conversationId);
    openGroupInfo();
  } catch (e) {
    alert(e.message || e);
  }
}

async function removeGroupMember(userId) {
  if (!confirm('ลบสมาชิกคนนี้ออกจากกลุ่ม?')) return;
  try {
    var res = await apiCall('removeMember', {
      conversationId: state.active.conversationId,
      userId: userId,
    }, 'POST');
    if (res.success === false) throw new Error(res.error);
    await loadGroupInfo(state.active.conversationId);
    openGroupInfo();
  } catch (e) {
    alert(e.message || e);
  }
}

async function leaveCurrentGroup() {
  if (!confirm('ออกจากกลุ่มนี้?')) return;
  try {
    var res = await apiCall('leaveGroup', { conversationId: state.active.conversationId }, 'POST');
    if (res.success === false) throw new Error(res.error);
    closeGroupInfo();
    closeChat();
    await pollInbox(true);
  } catch (e) {
    alert(e.message || e);
  }
}

function setUnreadBadge(n) {
  n = Number(n) || 0;
  const badge = document.getElementById('unreadBadge');
  if (badge) {
    if (n > 0) {
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // Update In-App Tab badges (Direct Chats vs Groups)
  var directUnread = 0;
  var groupUnread = 0;
  (state.conversations || []).forEach(function(c) {
    var cnt = c.unreadCount || 0;
    if (isGroupConv(c)) groupUnread += cnt;
    else directUnread += cnt;
  });

  var tabChatsBadge = document.getElementById('tabChatsBadge');
  if (tabChatsBadge) {
    if (directUnread > 0) {
      tabChatsBadge.textContent = directUnread > 99 ? '99+' : String(directUnread);
      tabChatsBadge.classList.remove('hidden');
    } else {
      tabChatsBadge.classList.add('hidden');
    }
  }

  var tabGroupsBadge = document.getElementById('tabGroupsBadge');
  if (tabGroupsBadge) {
    if (groupUnread > 0) {
      tabGroupsBadge.textContent = groupUnread > 99 ? '99+' : String(groupUnread);
      tabGroupsBadge.classList.remove('hidden');
    } else {
      tabGroupsBadge.classList.add('hidden');
    }
  }

  // Dynamic Favicon Red Dot & Badge
  updateFaviconBadge(n);

  // Document Title Badge
  updateTitleBadge(n);

  // จุดแดงบนไอคอน Home Screen (iOS 16.4+ PWA / Android / Desktop)
  setAppBadgeCount(n);

  if (!n && navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
    navigator.serviceWorker.getRegistration().then(function(reg) {
      if (!reg || !reg.getNotifications) return;
      reg.getNotifications().then(function(list) {
        (list || []).forEach(function(note) { note.close(); });
      });
    }).catch(function() {});
  }
}

/** อัปเดต App Badge ทั้งจากหน้าและ Service Worker (iOS พึ่ง SW เป็นหลัก) */
function setAppBadgeCount(n) {
  n = Math.max(0, Number(n) || 0);
  try {
    if (n > 0) {
      if (navigator.setAppBadge) navigator.setAppBadge(n).catch(function() {});
    } else if (navigator.clearAppBadge) {
      navigator.clearAppBadge().catch(function() {});
    }
  } catch (e) { /* ignore */ }

  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then(function(reg) {
    if (!reg) return;
    try {
      if (n > 0 && reg.setAppBadge) return reg.setAppBadge(n);
      if (n <= 0 && reg.clearAppBadge) return reg.clearAppBadge();
    } catch (e) { /* ignore */ }
  }).catch(function() {});

  if (navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({ type: 'SET_BADGE', count: n });
    } catch (e) { /* ignore */ }
  }
}

function toggleAiPanel() {
  var panel = document.getElementById('aiPanel');
  if (!panel) return;
  state.aiOpen = panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !state.aiOpen);
  if (state.aiOpen) {
    var log = document.getElementById('aiLog');
    if (log && !log.childElementCount) {
      appendAiBubble('bot', 'ถามได้เรื่องงานในเว็บแอป และยอดรวม เช่น ผู้ป่วยนอกวันนี้ รายได้ ตัวชี้วัดของแผนก\\n\\nจะไม่ตอบชื่อคนไข้ เลขบัตร เบอร์โทร ที่อยู่ หรือ HN รายบุคคล');
    }
    var input = document.getElementById('aiInput');
    if (input) input.focus();
  }
}

function askAiChip(text) {
  var input = document.getElementById('aiInput');
  if (input) input.value = text;
  submitAiAsk();
}

function appendAiBubble(kind, text, source) {
  var log = document.getElementById('aiLog');
  if (!log) return;
  var div = document.createElement('div');
  div.className = 'ai-bubble ' + kind;
  div.textContent = text;
  if (kind === 'bot' && source) {
    var tag = document.createElement('span');
    tag.className = 'ai-src';
    tag.textContent = source === 'custom_llm'
      ? 'แหล่งข้อมูล: Custom LLM (โรงพยาบาล)'
      : (source === 'webapp'
        ? 'แหล่งข้อมูล: เว็บแอปเท่านั้น'
        : (source === 'web' ? 'แหล่งข้อมูล: เว็บสาธารณะ · ไม่ใช้ข้อมูลโรงพยาบาล' : ''));
    if (tag.textContent) div.appendChild(tag);
  }
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

async function submitAiAsk(ev) {
  if (ev && ev.preventDefault) ev.preventDefault();
  if (state.aiBusy || !state.sessionToken) return;
  var input = document.getElementById('aiInput');
  var question = String(input && input.value || '').trim();
  if (!question) return;
  input.value = '';
  appendAiBubble('me', question);
  state.aiBusy = true;
  var send = document.getElementById('aiSend');
  if (send) send.disabled = true;
  try {
    var res = await fetch(WORKER_ORIGIN + '/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: state.sessionToken,
        question: question,
        history: state.aiTurns.slice(-4),
      }),
    });
    var data = await res.json();
    if (!res.ok || data.success === false) {
      appendAiBubble('err', data.error || 'ถามไม่สำเร็จ');
      return;
    }
    var answer = data.answer || 'ไม่มีคำตอบ';
    appendAiBubble('bot', answer, data.source || '');
    state.aiTurns.push({ role: 'user', content: question });
    state.aiTurns.push({ role: 'assistant', content: answer });
    if (state.aiTurns.length > 8) state.aiTurns = state.aiTurns.slice(-8);
  } catch (e) {
    appendAiBubble('err', e.message || String(e));
  } finally {
    state.aiBusy = false;
    if (send) send.disabled = false;
  }
}

function syncActiveChat() {
  if (!('serviceWorker' in navigator)) return;
  var id = state.active && state.active.conversationId ? String(state.active.conversationId) : '';
  var send = function(worker) {
    if (!worker) return;
    try { worker.postMessage({ type: 'ACTIVE_CHAT', conversationId: id }); } catch (e) {}
  };
  if (navigator.serviceWorker.controller) {
    send(navigator.serviceWorker.controller);
    return;
  }
  navigator.serviceWorker.ready.then(function(reg) { send(reg && reg.active); }).catch(function() {});
}

document.addEventListener('visibilitychange', function() {
  // พื้นหลัง: เคลียร์ ACTIVE_CHAT ใน SW เพื่อไม่ให้ push ถูกระงับ (โดยเฉพาะ iOS PWA)
  if (document.visibilityState === 'hidden') {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({ type: 'ACTIVE_CHAT', conversationId: '' });
      } catch (e) {}
    }
  } else {
    syncActiveChat();
  }
  if (document.visibilityState === 'visible' && state.sessionToken) {
    unlockAudio();
    pollInbox(false);
    restartPolling();
  } else if (state.sessionToken) {
    restartPolling();
  }
});

['click', 'touchstart', 'keydown', 'pointerdown', 'focus'].forEach(function(evt) {
  window.addEventListener(evt, unlockAudio, { passive: true });
});
window.addEventListener('focus', function() {
  unlockAudio();
  if (state.sessionToken) {
    pollInbox(false);
  }
});
document.addEventListener('DOMContentLoaded', function() {
  applyLoginModeForDevice();
  initUnsendGestures();
  setupChatEdgeSwipeBack();
  registerChatServiceWorker();
  updateNotifyUi();
  var permissionReady = (isStandaloneApp() || (isIosDevice() && iosCanRequestNotification()))
    ? requestNotifyOnInstall(false)
    : Promise.resolve();
  Promise.resolve(permissionReady).then(function() { init(); });
});

window.addEventListener('beforeinstallprompt', function(event) {
  event.preventDefault();
  deferredInstallPrompt = event;
  var btn = document.getElementById('btnInstall');
  if (btn) btn.classList.remove('hidden');
});

window.addEventListener('appinstalled', function() {
  deferredInstallPrompt = null;
  var btn = document.getElementById('btnInstall');
  if (btn) btn.classList.add('hidden');
  requestNotifyOnInstall();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', function(event) {
    var data = event.data || {};
    if (data.type === 'MESSAGE_UNSENT' && data.messageId) {
      if (patchUnsentMessage(data.messageId, data.conversationId)) {
        renderMessages(false);
        renderList();
      }
      if (state.sessionToken) pollInbox(false);
      return;
    }
    if (data.type === 'PUSH_MESSAGE' && state.sessionToken) {
      var viewing = state.active && data.conversationId
        && String(state.active.conversationId) === String(data.conversationId)
        && document.visibilityState === 'visible'
        && document.hasFocus();
      if (typeof data.unread === 'number' && data.unread >= 0) {
        state.lastUnread = data.unread;
        setUnreadBadge(data.unread);
      }
      // แจ้งทันทีจาก push — ไม่รอ poll (เสียง + จุดแดง + toast)
      if (!viewing && data.kind !== 'unsent') {
        alertNewMessage(
          data.title || 'S-Chat',
          data.body || 'ข้อความใหม่',
          data.conversationId || null,
          null
        );
      }
      pollInbox(false);
      if (viewing && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLOSE_NOTIFY',
          tag: data.tag || ('chat-' + data.conversationId),
        });
      }
      return;
    }
    if (data.type !== 'OPEN_CHAT' || !state.sessionToken) return;
    var id = data.conversationId;
    if (!id && data.url) {
      try { id = new URL(data.url, location.origin).searchParams.get('open'); } catch (e) {}
    }
    if (id) openChat(id);
  });
}
<\/script>
</body>
</html>`;
}
