/**
 * Thai name helpers for speech ASR errors (e.g. กานต์ → การ) and fuzzy search variants.
 * Keep in sync with app/Support/ThaiNameSearch.php
 */

const TRAILING_PARTICLES = /(ค่ะ|ครับ|คะ|นะ|นะคะ|นะครับ)+$/g;

/** Common ASR confusions at the start of Thai given names. */
const PREFIX_VARIANTS: Array<[RegExp, string[]]> = [
    [/^การ/, ['กาน', 'กานต์', 'การ']],
    [/^กานต์/, ['กานต์', 'กาน', 'การ']],
    [/^กาน(?!ต์)/, ['กาน', 'กานต์', 'การ']],
];

export function normalizeThaiNameQuery(input: string): string {
    return input
        .trim()
        .replace(/\s+/g, ' ')
        .replace(TRAILING_PARTICLES, '')
        .trim();
}

/** Prefer a spelling that is more likely to match staff names after speech input. */
export function correctThaiSpeechName(spoken: string): string {
    let text = normalizeThaiNameQuery(spoken);
    if (text === '') return '';

    // การ… → กานต์… (most common Chrome Thai ASR miss for กานต์)
    if (text.startsWith('การ') && !text.startsWith('กาน')) {
        text = `กานต์${text.slice('การ'.length)}`;
    } else if (text.startsWith('กาน') && !text.startsWith('กานต์')) {
        // กานตะศิลป์ → กานต์ตะศิลป์ when the rest looks like a surname stem
        const rest = text.slice('กาน'.length);
        if (rest !== '' && !rest.startsWith('ต์')) {
            text = `กานต์${rest}`;
        }
    }

    return text;
}

/** Search query variants for LIKE matching (original + ASR alternatives). */
export function thaiNameSearchVariants(input: string): string[] {
    const base = normalizeThaiNameQuery(input);
    if (base === '') return [];

    const set = new Set<string>([base, correctThaiSpeechName(base)]);

    for (const [pattern, replacements] of PREFIX_VARIANTS) {
        if (!pattern.test(base)) continue;
        const rest = base.replace(pattern, '');
        for (const prefix of replacements) {
            set.add(`${prefix}${rest}`);
        }
    }

    // Also try without Thai thanthakhat (์) which ASR often drops/adds.
    for (const item of [...set]) {
        const stripped = item.replace(/์/g, '');
        if (stripped !== '') set.add(stripped);
    }

    return [...set].filter((item) => item !== '');
}

/** Fold tone marks / thanthakhat for loose comparison. */
export function foldThaiName(input: string): string {
    return normalizeThaiNameQuery(input)
        .replace(/์/g, '')
        .replace(/[่้๊๋็ัำิีึืฺุู]/g, '')
        .toLowerCase();
}

export function scoreNameMatch(query: string, candidate: string): number {
    const q = foldThaiName(query);
    const c = foldThaiName(candidate);
    if (q === '' || c === '') return 0;
    if (c === q) return 200;
    if (c.includes(q)) return 150 - Math.min(40, c.length - q.length);
    if (q.includes(c) && c.length >= 3) return 120;

    let best = 0;
    for (const variant of thaiNameSearchVariants(query)) {
        const v = foldThaiName(variant);
        if (v === '') continue;
        if (c === v) best = Math.max(best, 190);
        else if (c.includes(v)) best = Math.max(best, 140 - Math.min(30, c.length - v.length));
        else if (v.includes(c) && c.length >= 3) best = Math.max(best, 110);
    }

    // Character overlap bonus for near miss ASR.
    const shorter = q.length <= c.length ? q : c;
    const longer = q.length <= c.length ? c : q;
    let hits = 0;
    for (const ch of shorter) {
        if (longer.includes(ch)) hits += 1;
    }
    const ratio = shorter.length > 0 ? hits / shorter.length : 0;
    if (ratio >= 0.7) best = Math.max(best, Math.round(ratio * 80));

    return best;
}

export function rankSignerNames<T extends { name: string }>(query: string, users: T[]): T[] {
    return [...users].sort((a, b) => scoreNameMatch(query, b.name) - scoreNameMatch(query, a.name));
}
