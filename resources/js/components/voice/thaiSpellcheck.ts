// Thai Spellchecking Engine reusing the hospital dictionary and longest-match segmentation

declare const route: (name: string, params?: any) => string;

const DEFAULT_EXCEPTIONS = new Set([
    'กห', 'รพ', 'ต', 'อ', 'จ', 'พล', 'ท', 'น', 'ร', 'ส', 'หญิง', 'ฯ',
    'ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ',
    'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ', 'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ',
    'พ', 'ฟ', 'ภ', 'ม', 'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ',
    'ผอ', 'หน', 'พว', 'พท', 'จนท', 'จนท.', 'โทร', 'ชม', 'วัน', 'เดือน', 'ปี',
]);

let dictionaryPromise: Promise<Set<string>> | null = null;

export async function loadDictionary(): Promise<Set<string>> {
    if (!dictionaryPromise) {
        const dictUrl = typeof route === 'function' ? route('admin-docs.memos.dict') : '/admin-docs/memos/dict';
        dictionaryPromise = fetch(dictUrl)
            .then(async (response) => {
                if (!response.ok) throw new Error('โหลดพจนานุกรมไม่สำเร็จ');
                const body = await response.text();
                const set = new Set<string>();
                for (const line of body.split(/\r?\n/)) {
                    const word = line.trim();
                    if (word !== '') set.add(word);
                }
                return set;
            })
            .catch((error) => {
                dictionaryPromise = null;
                throw error;
            });
    }
    return dictionaryPromise;
}

function isSuspect(token: string, dict: Set<string>, exceptions: Set<string>): boolean {
    if (token === '') return false;
    if (/^[\d๐-๙]+$/.test(token)) return false;
    if (/^[A-Za-z0-9._/@+:\-#]+$/.test(token)) return false;
    if (exceptions.has(token)) return false;
    if (dict.has(token)) return false;
    if (token.length === 1 && /[\u0E00-\u0E7F]/.test(token)) return false;
    return /[\u0E00-\u0E7F]/.test(token);
}

/** Longest-match Thai wordcut against the dictionary. */
export function segmentThai(text: string, dict: Set<string>): string[] {
    const tokens: string[] = [];
    let buffer = '';

    const flushLatin = () => {
        if (buffer === '') return;
        for (const part of buffer.split(/(\s+|[,.;:!?()[\]{}"“”‘’/\\|]+)/)) {
            if (part === '' || /^\s+$/.test(part)) continue;
            if (/^[,.;:!?()[\]{}"“”‘’/\\|]+$/.test(part)) continue;
            tokens.push(part);
        }
        buffer = '';
    };

    for (let i = 0; i < text.length; ) {
        const ch = text[i]!;
        if (/[\u0E00-\u0E7F]/.test(ch)) {
            flushLatin();
            let matched = '';
            const max = Math.min(text.length, i + 20);
            for (let end = max; end > i; end -= 1) {
                const candidate = text.slice(i, end);
                if (!/^[\u0E00-\u0E7F]+$/.test(candidate)) continue;
                if (dict.has(candidate) || candidate.length === 1) {
                    matched = candidate;
                    break;
                }
            }
            if (matched === '') {
                matched = ch;
            }
            tokens.push(matched);
            i += matched.length;
            continue;
        }
        buffer += ch;
        i += 1;
    }
    flushLatin();
    return tokens;
}

export async function findSuspectWords(
    text: string,
    extraExceptions: Iterable<string> = [],
): Promise<string[]> {
    if (!text || text.trim() === '') return [];
    const dict = await loadDictionary();
    const exceptions = new Set(DEFAULT_EXCEPTIONS);
    for (const word of extraExceptions) {
        const trimmed = word.trim();
        if (trimmed !== '') exceptions.add(trimmed);
    }

    const tokens = segmentThai(text, dict);
    const suspects = new Map<string, true>();
    for (const token of tokens) {
        if (!isSuspect(token, dict, exceptions)) continue;
        suspects.set(token, true);
    }
    return [...suspects.keys()];
}
