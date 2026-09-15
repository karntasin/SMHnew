/**
 * Capture real app screenshots for the user manual PDF.
 * Usage: node scripts/capture-guide-screenshots.mjs
 *
 * Prerequisites: XAMPP Apache + Vite dev server (npm run dev) running.
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'storage', 'app', 'docs', 'screenshots');

function loadEnv() {
    const envPath = path.join(root, '.env');
    if (!fs.existsSync(envPath)) return {};
    const env = {};
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        env[key] = val;
    }
    return env;
}

const env = loadEnv();
const BASE_URL = (process.env.APP_URL || env.APP_URL || 'http://localhost/sss/my-app/public').replace(/\/$/, '');
const EMAIL = process.env.GUIDE_LOGIN_EMAIL || env.GUIDE_LOGIN_EMAIL || 'admin@admin.com';
const PASSWORD = process.env.GUIDE_LOGIN_PASSWORD || env.GUIDE_LOGIN_PASSWORD || 'admin123';

const ERROR_PATTERNS = [
    /404/i,
    /not found/i,
    /sqlstate/i,
    /uncaught error/i,
    /internal server error/i,
    /server error/i,
    /something went wrong/i,
    /this page could not be found/i,
];

const pages = [
    // ── เริ่มต้น ──
    { name: 'login', path: '/login', auth: false, wait: 1500 },
    { name: 'dashboard', path: '/dashboard', auth: true, selector: 'main', wait: 2500 },
    { name: 'sidebar', path: '/dashboard', auth: true, wait: 1200, clip: { x: 0, y: 0, width: 300, height: 880 } },
    { name: 'help', path: '/help', auth: true, selector: 'main', wait: 2000 },
    { name: 'profile', path: '/settings/profile', auth: true, selector: 'main', wait: 2000 },
    { name: 'notifications', path: '/notifications', auth: true, selector: 'main', wait: 2000 },

    // ── แดชบอร์ด & รายงาน ──
    { name: 'hosxp-reports', path: '/hosxp-reports', auth: true, selector: 'main', wait: 2000 },
    { name: 'finance-dashboard', path: '/finance-dashboard', auth: true, selector: 'main', wait: 2000 },

    // ── ศูนย์พัฒนาคุณภาพ ──
    { name: 'quality', path: '/quality', auth: true, selector: 'main', wait: 2000 },
    { name: 'quality-docs', path: '/quality-docs', auth: true, selector: 'main', wait: 2000 },
    { name: 'quality-kpi', path: '/quality-indicators', auth: true, selector: 'main', wait: 2000 },
    { name: 'quality-kpi-dashboard', path: '/quality-indicators/dashboard', auth: true, selector: 'main', wait: 2000 },
    { name: 'quality-assurance', path: '/quality-assurance', auth: true, selector: 'main', wait: 2000 },
    { name: 'mra', path: '/mra', auth: true, selector: 'main', wait: 2500 },
    { name: 'mra-dashboard', path: '/mra/dashboard', auth: true, selector: 'main', wait: 2000 },
    { name: 'mra-reports', path: '/mra/reports', auth: true, selector: 'main', wait: 2000 },
    { name: 'ic', path: '/ic', auth: true, selector: 'main', wait: 2500 },
    { name: 'ic-surveillance', path: '/ic/surveillance', auth: true, selector: 'main', wait: 2000 },
    { name: 'ic-hand-hygiene', path: '/ic/hand-hygiene', auth: true, selector: 'main', wait: 2000 },
    { name: 'ic-incidents', path: '/ic/incidents', auth: true, selector: 'main', wait: 2000 },
    { name: 'ic-reports', path: '/ic/reports', auth: true, selector: 'main', wait: 2000 },
    { name: 'env', path: '/env', auth: true, selector: 'main', wait: 2000 },
    { name: 'env-assets', path: '/env/assets', auth: true, selector: 'main', wait: 2000 },
    { name: 'env-incidents', path: '/env/incidents', auth: true, selector: 'main', wait: 2000 },

    // ── งานธุรการ ──
    { name: 'admin-hub', path: '/admin-hub', auth: true, selector: 'main', wait: 2000 },
    { name: 'rooms', path: '/administration/rooms', auth: true, selector: 'main', wait: 2000 },
    { name: 'rooms-calendar', path: '/administration/rooms/calendar', auth: true, selector: 'main', wait: 2000 },
    { name: 'rooms-my', path: '/administration/rooms/my', auth: true, selector: 'main', wait: 2000 },
    { name: 'vehicles', path: '/vehicles/bookings', auth: true, selector: 'main', wait: 2500 },
    { name: 'vehicles-create', path: '/vehicles/bookings/create', auth: true, selector: 'main', wait: 2000 },
    { name: 'vehicles-my', path: '/vehicles/bookings/my', auth: true, selector: 'main', wait: 2000 },
    { name: 'vehicles-calendar', path: '/vehicles/calendar', auth: true, selector: 'main', wait: 2000 },
    { name: 'documents', path: '/documents/dashboard', auth: true, selector: 'main', wait: 2000 },
    { name: 'documents-list', path: '/documents', auth: true, selector: 'main', wait: 2000 },
    { name: 'documents-create', path: '/documents/create', auth: true, selector: 'main', wait: 2000 },

    // ── งานประจำวัน ──
    { name: 'maintenance', path: '/maintenance/dashboard', auth: true, selector: 'main', wait: 2000 },
    { name: 'maintenance-create', path: '/maintenance/requests/create', auth: true, selector: 'main', wait: 2000 },
    { name: 'maintenance-my', path: '/maintenance/requests/my', auth: true, selector: 'main', wait: 2000 },
    { name: 'maintenance-settings', path: '/maintenance/settings', auth: true, selector: 'main', wait: 2000 },
    { name: 'technician-work-orders', path: '/technician/work-orders', auth: true, selector: 'main', wait: 2000 },

    // ── ความรู้ & อบรม ──
    { name: 'km', path: '/km/dashboard', auth: true, selector: 'main', wait: 2000 },
    { name: 'km-assets', path: '/km/assets', auth: true, selector: 'main', wait: 2000 },
    { name: 'elearning', path: '/km/learn/dashboard', auth: true, selector: 'main', wait: 2000 },
    { name: 'elearning-my-training', path: '/km/learn/my-training', auth: true, selector: 'main', wait: 2000 },

    // ── ตั้งค่าระบบ ──
    { name: 'users', path: '/users', auth: true, selector: 'main', wait: 2000 },
    { name: 'menus', path: '/menus', auth: true, selector: 'main', wait: 2000 },
    { name: 'departments', path: '/settings/departments', auth: true, selector: 'main', wait: 2000 },
    { name: 'settingsapp', path: '/settingsapp', auth: true, selector: 'main', wait: 2000 },
    { name: 'settings-hub', path: '/settings-hub', auth: true, selector: 'main', wait: 2000 },
    { name: 'backup', path: '/backup', auth: true, selector: 'main', wait: 2000 },
    { name: 'audit-logs', path: '/audit-logs', auth: true, selector: 'main', wait: 2000 },
];

async function hasPageError(page) {
    const text = await page.evaluate(() => document.body?.innerText || '');
    return ERROR_PATTERNS.some((re) => re.test(text));
}

async function waitForAppReady(page, item) {
    await page.waitForFunction(
        () => document.getElementById('app') !== null,
        { timeout: 30000 },
    );

    if (item.selector) {
        try {
            await page.waitForSelector(item.selector, { timeout: 20000 });
        } catch {
            // fallback — page may still be usable
        }
    }

    await new Promise((r) => setTimeout(r, item.wait || 1500));

    if (await hasPageError(page)) {
        throw new Error('Page shows error content');
    }
}

async function login(page) {
    console.log('  → Logging in...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#email', { timeout: 30000 });

    await page.evaluate(() => {
        const email = document.querySelector('#email');
        const pass = document.querySelector('#password');
        if (email) email.value = '';
        if (pass) pass.value = '';
    });

    await page.type('#email', EMAIL, { delay: 15 });
    await page.type('#password', PASSWORD, { delay: 15 });

    await Promise.all([
        page.waitForFunction(
            () => {
                const href = window.location.href;
                const pageData = document.getElementById('app')?.getAttribute('data-page') || '';
                return href.includes('dashboard') || pageData.includes('dashboard') || pageData.includes('Dashboard');
            },
            { timeout: 60000 },
        ),
        page.click('button[type="submit"]'),
    ]);

    await new Promise((r) => setTimeout(r, 2000));
    console.log('  ✓ Logged in →', page.url());
}

async function capture(page, item, attempt = 1) {
    const url = `${BASE_URL}${item.path}`;
    console.log(`  → ${item.name}: ${url}${attempt > 1 ? ` (retry ${attempt})` : ''}`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    try {
        await waitForAppReady(page, item);
    } catch (err) {
        if (attempt < 3) {
            console.warn(`  ⚠ ${item.name}: ${err.message}, retrying...`);
            await new Promise((r) => setTimeout(r, 2000));
            return capture(page, item, attempt + 1);
        }
        throw err;
    }

    const file = path.join(outDir, `${item.name}.png`);
    const options = { path: file, type: 'png' };

    if (item.clip) {
        options.clip = item.clip;
    } else {
        options.fullPage = false;
    }

    await page.screenshot(options);
    console.log(`  ✓ Saved ${item.name}.png`);
}

fs.mkdirSync(outDir, { recursive: true });

console.log(`\n📸 Capturing screenshots for user manual`);
console.log(`   Base URL: ${BASE_URL}`);
console.log(`   Output:   ${outDir}\n`);

const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,920'],
    defaultViewport: { width: 1440, height: 920, deviceScaleFactor: 2 },
});

const failed = [];

try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'th-TH,th;q=0.9' });
    await page.evaluateOnNewDocument(() => {
        const style = document.createElement('style');
        style.textContent = 'vite-error-overlay, [data-vite-dev-toolbar] { display: none !important; }';
        document.head.appendChild(style);
    });

    let loggedIn = false;

    for (const item of pages) {
        if (item.auth && !loggedIn) {
            await login(page);
            loggedIn = true;
        }
        try {
            await capture(page, item);
        } catch (err) {
            console.error(`  ✗ Failed ${item.name}: ${err.message}`);
            failed.push(item.name);
        }
    }

    const count = fs.readdirSync(outDir).filter((f) => f.endsWith('.png')).length;
    console.log(`\n✅ Done — ${count} screenshots saved.`);
    if (failed.length) {
        console.log(`⚠️  Failed (${failed.length}): ${failed.join(', ')}`);
        console.log('   Ensure XAMPP + Vite (npm run dev) are running, then retry.\n');
        process.exit(1);
    }
    console.log('');
} finally {
    await browser.close();
}
