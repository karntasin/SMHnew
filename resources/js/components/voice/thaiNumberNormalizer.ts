// Thai Spoken Numbers to Arabic Numerals Converter (Speech-to-Digits Normalization)

const PROTECTED_WORDS = [
    'สามารถ', 'สามี', 'สามัญ', 'สามัคคี', 'สามเณร',
    'เก้าอี้', 'หัวล้าน', 'ผมล้าน',
    'แสนสาหัส', 'แสนจะ', 'แสนดี', 'แสนรัก', 'แสนสวย', 'แสนหวาน',
    'น้ำหนึ่งใจเดียว', 'เป็นหนึ่งเดียว', 'เป็นหนึ่ง',
    'ร้อยละ', 'ร้อยตำรวจ', 'ร้อยเอก', 'ร้อยโท', 'ร้อยตรี', 'ร้อยเวร',
    'พันตำรวจ', 'พันเอก', 'พันโท', 'พันตรี',
];

const DIGIT_MAP: Record<string, number> = {
    'ศูนย์': 0, 'หนึ่ง': 1, 'เอ็ด': 1, 'สอง': 2, 'ยี่': 2, 'สาม': 3,
    'สี่': 4, 'ห้า': 5, 'หก': 6, 'เจ็ด': 7, 'แปด': 8, 'เก้า': 9,
};

const UNIT_MAP: Record<string, number> = {
    'ล้าน': 1000000,
    'แสน': 100000,
    'หมื่น': 10000,
    'พัน': 1000,
    'ร้อย': 100,
    'สิบ': 10,
};

const NUMBER_SEQUENCE_REGEX = /(?:ศูนย์|หนึ่ง|เอ็ด|สอง|ยี่|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ|ร้อย|พัน|หมื่น|แสน|ล้าน)(?:\s*(?:ศูนย์|หนึ่ง|เอ็ด|สอง|ยี่|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ|ร้อย|พัน|หมื่น|แสน|ล้าน))*/g;

function thaiWordToNumber(raw: string): string {
    const word = raw.replace(/\s+/g, '');
    const hasUnits = /(สิบ|ร้อย|พัน|หมื่น|แสน|ล้าน)/.test(word);

    // If pure digit sequence (e.g. 'ศูนย์แปดหนึ่ง', 'หนึ่งศูนย์สอง')
    if (!hasUnits) {
        const digits = ['ศูนย์', 'หนึ่ง', 'เอ็ด', 'สอง', 'ยี่', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
        let str = word;
        let res = '';
        while (str.length > 0) {
            let matched = false;
            for (const d of digits) {
                if (str.startsWith(d)) {
                    res += DIGIT_MAP[d];
                    str = str.slice(d.length);
                    matched = true;
                    break;
                }
            }
            if (!matched) return raw;
        }
        return res;
    }

    // Compound Thai number (e.g. 'ยี่สิบห้า', 'สองพันห้าร้อยหกสิบเก้า')
    let total = 0;
    let currentVal = 0;
    let i = 0;
    const len = word.length;

    while (i < len) {
        let matched = false;
        // Try multipliers first
        for (const [unit, mult] of Object.entries(UNIT_MAP)) {
            if (word.startsWith(unit, i)) {
                if (currentVal === 0) currentVal = 1;
                if (mult === 1000000) {
                    total = (total + currentVal) * mult;
                    currentVal = 0;
                } else {
                    total += currentVal * mult;
                    currentVal = 0;
                }
                i += unit.length;
                matched = true;
                break;
            }
        }
        if (matched) continue;

        // Try single digits
        for (const [digit, val] of Object.entries(DIGIT_MAP)) {
            if (word.startsWith(digit, i)) {
                currentVal = val;
                i += digit.length;
                matched = true;
                break;
            }
        }
        if (!matched) {
            return raw;
        }
    }
    total += currentVal;
    return String(total);
}

/**
 * Converts spoken Thai numbers and Thai digits into Arabic numerals.
 * e.g.:
 * "หนึ่ง" -> "1"
 * "สอง" -> "2"
 * "ยี่สิบห้า" -> "25"
 * "ห้อง หนึ่งศูนย์สอง" -> "ห้อง 102"
 * "โทร ศูนย์ แปด หนึ่ง..." -> "โทร 081..."
 * Preserves non-numeric words like "เก้าอี้", "สามารถ", "สามี".
 */
export function convertThaiWordsToNumbers(text: string): string {
    if (!text) return '';

    // 1. Convert Thai digits ๐-๙ to 0-9
    let result = text.replace(/[๐-๙]/g, (ch) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(ch)));

    // 2. Protect non-number words
    const tokens: { placeholder: string; word: string }[] = [];
    PROTECTED_WORDS.forEach((word, idx) => {
        const placeholder = `__PROT_${idx}__`;
        if (result.includes(word)) {
            result = result.replaceAll(word, placeholder);
            tokens.push({ placeholder, word });
        }
    });

    // 3. Replace Thai number sequences with Arabic digits
    result = result.replace(NUMBER_SEQUENCE_REGEX, (match) => {
        const converted = thaiWordToNumber(match);
        return converted !== match ? converted : match;
    });

    // 4. Restore protected words
    tokens.forEach(({ placeholder, word }) => {
        result = result.replaceAll(placeholder, word);
    });

    return result;
}
