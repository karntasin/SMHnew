/**
 * FormulaEvaluator — In-browser Excel Formula Engine
 * รองรับการคำนวณสูตรสเปรดชีตมาตรฐานใน Excel สำหรับบทเรียนและการใช้งานจริง
 */

export type CellValue = string | number | boolean | null;

export interface SpreadsheetData {
    [cellAddress: string]: {
        value: CellValue;
        formula?: string;
        isLocked?: boolean;
    };
}

/**
 * แปลงพิกัด เช่น "A" -> 0, "B" -> 1, "AA" -> 26
 */
export function colNameToIndex(col: string): number {
    let index = 0;
    const clean = col.toUpperCase();
    for (let i = 0; i < clean.length; i++) {
        index = index * 26 + (clean.charCodeAt(i) - 64);
    }
    return index - 1;
}

/**
 * แปลงดัชนี 0 -> "A", 1 -> "B", 26 -> "AA"
 */
export function indexToColName(index: number): string {
    let num = index + 1;
    let colName = '';
    while (num > 0) {
        const rem = (num - 1) % 26;
        colName = String.fromCharCode(65 + rem) + colName;
        num = Math.floor((num - 1) / 26);
    }
    return colName;
}

/**
 * แยก Cell Address เช่น "B5" -> { col: "B", row: 5, colIdx: 1, rowIdx: 4 }
 */
export function parseCellAddress(address: string): { col: string; row: number; colIdx: number; rowIdx: number } | null {
    const match = address.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    const col = match[1];
    const row = parseInt(match[2], 10);
    return {
        col,
        row,
        colIdx: colNameToIndex(col),
        rowIdx: row - 1,
    };
}

/**
 * ขยาย Range เช่น "A1:A3" -> ["A1", "A2", "A3"], "B2:C3" -> ["B2", "C2", "B3", "C3"]
 */
export function expandRange(rangeStr: string): string[] {
    const parts = rangeStr.trim().toUpperCase().split(':');
    if (parts.length === 1) return [parts[0]];
    if (parts.length !== 2) return [];

    const start = parseCellAddress(parts[0]);
    const end = parseCellAddress(parts[1]);
    if (!start || !end) return [];

    const minCol = Math.min(start.colIdx, end.colIdx);
    const maxCol = Math.max(start.colIdx, end.colIdx);
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);

    const cells: string[] = [];
    for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
            cells.push(`${indexToColName(c)}${r}`);
        }
    }
    return cells;
}

/**
 * ดึงค่าจากเซลล์
 */
export function getCellValue(sheet: SpreadsheetData, address: string): CellValue {
    const addr = address.toUpperCase().trim();
    if (!sheet[addr]) return null;
    return sheet[addr].value;
}

/**
 * แปลงค่าให้เป็นตัวเลขถ้าทำได้
 */
export function toNumber(val: CellValue): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (typeof val === 'boolean') return val ? 1 : 0;
    const clean = String(val).replace(/,/g, '').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

/**
 * แปลง criteria เช่น ">50", "<=100", "Bangkok", "=Gold"
 */
function matchCriteria(cellVal: CellValue, criteria: any): boolean {
    if (criteria === null || criteria === undefined) return cellVal === null;

    const critStr = String(criteria).trim();
    const valNum = toNumber(cellVal);
    const isValNum = typeof cellVal === 'number' || (!isNaN(Number(cellVal)) && cellVal !== '');

    const opMatch = critStr.match(/^(>=|<=|<>|!=|>|<|=)(.*)$/);
    if (opMatch) {
        const op = opMatch[1];
        const target = opMatch[2].trim();
        const targetNum = parseFloat(target);

        if (!isNaN(targetNum) && isValNum) {
            switch (op) {
                case '>': return valNum > targetNum;
                case '<': return valNum < targetNum;
                case '>=': return valNum >= targetNum;
                case '<=': return valNum <= targetNum;
                case '=': return valNum === targetNum;
                case '<>':
                case '!=': return valNum !== targetNum;
            }
        } else {
            const vStr = String(cellVal ?? '').toLowerCase();
            const tStr = target.toLowerCase();
            switch (op) {
                case '=': return vStr === tStr;
                case '<>':
                case '!=': return vStr !== tStr;
            }
        }
    }

    // Default: case-insensitive string or numeric equality
    if (isValNum && !isNaN(Number(critStr))) {
        return valNum === Number(critStr);
    }
    return String(cellVal ?? '').toLowerCase() === critStr.toLowerCase();
}

/**
 * ตัวประเมินผลสูตรคำนวณหลัก (Formula Evaluator)
 */
export function evaluateFormula(formula: string, sheet: SpreadsheetData, visitedCells: Set<string> = new Set()): CellValue {
    if (!formula.startsWith('=')) {
        return formula;
    }

    const expr = formula.substring(1).trim();
    if (!expr) return '';

    try {
        return parseAndEval(expr, sheet, visitedCells);
    } catch (e: any) {
        return `#ERROR! ${e?.message || ''}`;
    }
}

/**
 * Helper แยก Arguments ของฟังก์ชัน โดยไม่ตัดลูกน้ำที่อยู่ในวงเล็บซ้อน หรือในเครื่องหมายคำพูด ""
 */
function splitArgs(argsStr: string): string[] {
    const args: string[] = [];
    let current = '';
    let depth = 0;
    let inQuotes = false;

    for (let i = 0; i < argsStr.length; i++) {
        const char = argsStr[i];
        if (char === '"') {
            inQuotes = !inQuotes;
            current += char;
        } else if (char === '(' && !inQuotes) {
            depth++;
            current += char;
        } else if (char === ')' && !inQuotes) {
            depth--;
            current += char;
        } else if (char === ',' && depth === 0 && !inQuotes) {
            args.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) {
        args.push(current.trim());
    }
    return args;
}

/**
 * Evaluate Expression
 */
function parseAndEval(expr: string, sheet: SpreadsheetData, visited: Set<string>): CellValue {
    expr = expr.trim();

    // 1. Literal string: "text"
    if (expr.startsWith('"') && expr.endsWith('"') && expr.length >= 2) {
        return expr.slice(1, -1);
    }

    // 2. Pure number
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
        return parseFloat(expr);
    }

    // 3. Boolean
    if (expr.toUpperCase() === 'TRUE') return true;
    if (expr.toUpperCase() === 'FALSE') return false;

    // 4. Function call: NAME(...)
    const fnMatch = expr.match(/^([A-Z0-9_.]+)\s*\((.*)\)$/i);
    if (fnMatch) {
        const fnName = fnMatch[1].toUpperCase();
        const rawArgs = fnMatch[2];
        const args = splitArgs(rawArgs);
        return executeFunction(fnName, args, sheet, visited);
    }

    // 5. Binary operations (handled in order of precedence: &, comparison, +, -, *, /, ^)
    // String concatenation: &
    if (hasTopLevelOp(expr, '&')) {
        const parts = splitByTopLevelOp(expr, '&');
        return parts.map(p => String(parseAndEval(p, sheet, visited) ?? '')).join('');
    }

    // Comparison operators: >=, <=, <>, !=, =, >, <
    for (const op of ['>=', '<=', '<>', '!=', '=', '>', '<']) {
        if (hasTopLevelOp(expr, op)) {
            const [left, right] = splitByFirstTopLevelOp(expr, op);
            const lVal = parseAndEval(left, sheet, visited);
            const rVal = parseAndEval(right, sheet, visited);
            return evalComparison(lVal, rVal, op);
        }
    }

    // Addition / Subtraction
    for (const op of ['+', '-']) {
        if (hasTopLevelOp(expr, op)) {
            const [left, right] = splitByFirstTopLevelOp(expr, op);
            if (left === '' && op === '-') {
                // Unary minus
                return -toNumber(parseAndEval(right, sheet, visited));
            }
            const lNum = toNumber(parseAndEval(left, sheet, visited));
            const rNum = toNumber(parseAndEval(right, sheet, visited));
            return op === '+' ? lNum + rNum : lNum - rNum;
        }
    }

    // Multiplication / Division
    for (const op of ['*', '/']) {
        if (hasTopLevelOp(expr, op)) {
            const [left, right] = splitByFirstTopLevelOp(expr, op);
            const lNum = toNumber(parseAndEval(left, sheet, visited));
            const rNum = toNumber(parseAndEval(right, sheet, visited));
            if (op === '/') {
                if (rNum === 0) return '#DIV/0!';
                return lNum / rNum;
            }
            return lNum * rNum;
        }
    }

    // Exponent: ^
    if (hasTopLevelOp(expr, '^')) {
        const [left, right] = splitByFirstTopLevelOp(expr, '^');
        return Math.pow(toNumber(parseAndEval(left, sheet, visited)), toNumber(parseAndEval(right, sheet, visited)));
    }

    // 6. Single Cell Reference: "A1"
    const cellRef = expr.toUpperCase().trim();
    if (/^[A-Z]+\d+$/.test(cellRef)) {
        if (visited.has(cellRef)) {
            return '#CIRCULAR!';
        }
        visited.add(cellRef);
        const cell = sheet[cellRef];
        if (!cell) return null;
        if (cell.formula) {
            return evaluateFormula(cell.formula, sheet, new Set(visited));
        }
        return cell.value;
    }

    return expr;
}

function hasTopLevelOp(expr: string, op: string): boolean {
    let depth = 0;
    let inQuotes = false;
    for (let i = 0; i <= expr.length - op.length; i++) {
        const c = expr[i];
        if (c === '"') inQuotes = !inQuotes;
        else if (c === '(' && !inQuotes) depth++;
        else if (c === ')' && !inQuotes) depth--;
        else if (depth === 0 && !inQuotes && expr.substring(i, i + op.length) === op) {
            // Avoid matching within longer operator, e.g. '=' inside '>='
            if (op === '=' && (expr[i - 1] === '>' || expr[i - 1] === '<' || expr[i - 1] === '!')) continue;
            if (op === '>' && expr[i + 1] === '=') continue;
            if (op === '<' && (expr[i + 1] === '=' || expr[i + 1] === '>')) continue;
            return true;
        }
    }
    return false;
}

function splitByFirstTopLevelOp(expr: string, op: string): [string, string] {
    let depth = 0;
    let inQuotes = false;
    for (let i = 0; i <= expr.length - op.length; i++) {
        const c = expr[i];
        if (c === '"') inQuotes = !inQuotes;
        else if (c === '(' && !inQuotes) depth++;
        else if (c === ')' && !inQuotes) depth--;
        else if (depth === 0 && !inQuotes && expr.substring(i, i + op.length) === op) {
            if (op === '=' && (expr[i - 1] === '>' || expr[i - 1] === '<' || expr[i - 1] === '!')) continue;
            if (op === '>' && expr[i + 1] === '=') continue;
            if (op === '<' && (expr[i + 1] === '=' || expr[i + 1] === '>')) continue;
            return [expr.substring(0, i).trim(), expr.substring(i + op.length).trim()];
        }
    }
    return [expr, ''];
}

function splitByTopLevelOp(expr: string, op: string): string[] {
    const res: string[] = [];
    let current = '';
    let depth = 0;
    let inQuotes = false;
    for (let i = 0; i < expr.length; i++) {
        const c = expr[i];
        if (c === '"') {
            inQuotes = !inQuotes;
            current += c;
        } else if (c === '(' && !inQuotes) {
            depth++;
            current += c;
        } else if (c === ')' && !inQuotes) {
            depth--;
            current += c;
        } else if (depth === 0 && !inQuotes && expr.substring(i, i + op.length) === op) {
            res.push(current.trim());
            current = '';
            i += op.length - 1;
        } else {
            current += c;
        }
    }
    if (current.trim()) res.push(current.trim());
    return res;
}

function evalComparison(left: CellValue, right: CellValue, op: string): boolean {
    const isNum = (typeof left === 'number' || !isNaN(Number(left))) && (typeof right === 'number' || !isNaN(Number(right)));
    if (isNum && left !== '' && right !== '' && left !== null && right !== null) {
        const l = toNumber(left);
        const r = toNumber(right);
        switch (op) {
            case '>=': return l >= r;
            case '<=': return l <= r;
            case '>': return l > r;
            case '<': return l < r;
            case '=': return l === r;
            case '<>':
            case '!=': return l !== r;
        }
    }
    const lStr = String(left ?? '').toLowerCase();
    const rStr = String(right ?? '').toLowerCase();
    switch (op) {
        case '=': return lStr === rStr;
        case '<>':
        case '!=': return lStr !== rStr;
        case '>': return lStr > rStr;
        case '<': return lStr < rStr;
        case '>=': return lStr >= rStr;
        case '<=': return lStr <= rStr;
    }
    return false;
}

/**
 * รวมค่าจาก Range หรือ Single Address ทั้งหมด
 */
function resolveArgValues(argExpr: string, sheet: SpreadsheetData, visited: Set<string>): CellValue[] {
    const trimmed = argExpr.trim();
    if (trimmed.includes(':') && /^[A-Z]+\d+:[A-Z]+\d+$/i.test(trimmed)) {
        const cells = expandRange(trimmed);
        return cells.map(c => {
            const cell = sheet[c];
            if (!cell) return null;
            if (cell.formula) return evaluateFormula(cell.formula, sheet, new Set(visited));
            return cell.value;
        });
    }

    const val = parseAndEval(trimmed, sheet, visited);
    return [val];
}

/**
 * Execute Built-in Excel Functions
 */
function executeFunction(fnName: string, args: string[], sheet: SpreadsheetData, visited: Set<string>): CellValue {
    switch (fnName) {
        // ================= MATH & STATS =================
        case 'SUM': {
            let sum = 0;
            for (const arg of args) {
                const vals = resolveArgValues(arg, sheet, visited);
                for (const v of vals) {
                    sum += toNumber(v);
                }
            }
            return sum;
        }

        case 'AVERAGE': {
            let sum = 0;
            let count = 0;
            for (const arg of args) {
                const vals = resolveArgValues(arg, sheet, visited);
                for (const v of vals) {
                    if (v !== null && v !== '' && !isNaN(Number(v))) {
                        sum += toNumber(v);
                        count++;
                    }
                }
            }
            return count > 0 ? sum / count : '#DIV/0!';
        }

        case 'COUNT': {
            let count = 0;
            for (const arg of args) {
                const vals = resolveArgValues(arg, sheet, visited);
                for (const v of vals) {
                    if (v !== null && v !== '' && typeof v === 'number' && !isNaN(v)) {
                        count++;
                    } else if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) {
                        count++;
                    }
                }
            }
            return count;
        }

        case 'COUNTA': {
            let count = 0;
            for (const arg of args) {
                const vals = resolveArgValues(arg, sheet, visited);
                for (const v of vals) {
                    if (v !== null && v !== undefined && String(v).trim() !== '') {
                        count++;
                    }
                }
            }
            return count;
        }

        case 'MIN': {
            let min: number | null = null;
            for (const arg of args) {
                const vals = resolveArgValues(arg, sheet, visited);
                for (const v of vals) {
                    if (v !== null && v !== '' && !isNaN(Number(v))) {
                        const num = toNumber(v);
                        if (min === null || num < min) min = num;
                    }
                }
            }
            return min ?? 0;
        }

        case 'MAX': {
            let max: number | null = null;
            for (const arg of args) {
                const vals = resolveArgValues(arg, sheet, visited);
                for (const v of vals) {
                    if (v !== null && v !== '' && !isNaN(Number(v))) {
                        const num = toNumber(v);
                        if (max === null || num > max) max = num;
                    }
                }
            }
            return max ?? 0;
        }

        case 'ROUND': {
            if (args.length < 1) return '#VALUE!';
            const val = toNumber(parseAndEval(args[0], sheet, visited));
            const decimals = args.length >= 2 ? Math.floor(toNumber(parseAndEval(args[1], sheet, visited))) : 0;
            const factor = Math.pow(10, decimals);
            return Math.round(val * factor) / factor;
        }

        case 'MOD': {
            if (args.length < 2) return '#VALUE!';
            const num = toNumber(parseAndEval(args[0], sheet, visited));
            const div = toNumber(parseAndEval(args[1], sheet, visited));
            if (div === 0) return '#DIV/0!';
            return num % div;
        }

        case 'ABS': {
            if (args.length < 1) return '#VALUE!';
            return Math.abs(toNumber(parseAndEval(args[0], sheet, visited)));
        }

        // ================= LOGICAL =================
        case 'IF': {
            if (args.length < 2) return '#VALUE!';
            const condition = parseAndEval(args[0], sheet, visited);
            const isTrue = condition === true || (typeof condition === 'number' && condition !== 0);
            if (isTrue) {
                return parseAndEval(args[1], sheet, visited);
            }
            return args.length >= 3 ? parseAndEval(args[2], sheet, visited) : false;
        }

        case 'IFS': {
            if (args.length % 2 !== 0) return '#VALUE!';
            for (let i = 0; i < args.length; i += 2) {
                const cond = parseAndEval(args[i], sheet, visited);
                const isTrue = cond === true || (typeof cond === 'number' && cond !== 0);
                if (isTrue) {
                    return parseAndEval(args[i + 1], sheet, visited);
                }
            }
            return '#N/A';
        }

        case 'AND': {
            for (const arg of args) {
                const val = parseAndEval(arg, sheet, visited);
                const isTrue = val === true || (typeof val === 'number' && val !== 0);
                if (!isTrue) return false;
            }
            return true;
        }

        case 'OR': {
            for (const arg of args) {
                const val = parseAndEval(arg, sheet, visited);
                const isTrue = val === true || (typeof val === 'number' && val !== 0);
                if (isTrue) return true;
            }
            return false;
        }

        case 'NOT': {
            if (args.length < 1) return '#VALUE!';
            const val = parseAndEval(args[0], sheet, visited);
            const isTrue = val === true || (typeof val === 'number' && val !== 0);
            return !isTrue;
        }

        // ================= CONDITIONAL AGGREGATION =================
        case 'COUNTIF': {
            if (args.length < 2) return '#VALUE!';
            const rangeCells = expandRange(args[0]);
            const criteria = parseAndEval(args[1], sheet, visited);
            let count = 0;
            for (const c of rangeCells) {
                const cellVal = getCellValue(sheet, c);
                if (matchCriteria(cellVal, criteria)) {
                    count++;
                }
            }
            return count;
        }

        case 'SUMIF': {
            if (args.length < 2) return '#VALUE!';
            const rangeCells = expandRange(args[0]);
            const criteria = parseAndEval(args[1], sheet, visited);
            const sumCells = args.length >= 3 ? expandRange(args[2]) : rangeCells;

            let sum = 0;
            for (let i = 0; i < rangeCells.length; i++) {
                const c = rangeCells[i];
                const cellVal = getCellValue(sheet, c);
                if (matchCriteria(cellVal, criteria)) {
                    const sumCellAddr = sumCells[i] || c;
                    sum += toNumber(getCellValue(sheet, sumCellAddr));
                }
            }
            return sum;
        }

        // ================= LOOKUP & REFERENCE =================
        case 'VLOOKUP': {
            if (args.length < 3) return '#VALUE!';
            const lookupVal = parseAndEval(args[0], sheet, visited);
            const tableRange = args[1].trim().toUpperCase();
            const colIndex = Math.floor(toNumber(parseAndEval(args[2], sheet, visited)));
            // rangeLookup defaults to true in Excel, but in practice users mostly need exact match (false or 0)
            const exactMatch = args.length >= 4 ? !toNumber(parseAndEval(args[3], sheet, visited)) : false;

            const rangeParts = tableRange.split(':');
            if (rangeParts.length !== 2) return '#REF!';

            const start = parseCellAddress(rangeParts[0]);
            const end = parseCellAddress(rangeParts[1]);
            if (!start || !end) return '#REF!';

            const minCol = Math.min(start.colIdx, end.colIdx);
            const maxCol = Math.max(start.colIdx, end.colIdx);
            const minRow = Math.min(start.row, end.row);
            const maxRow = Math.max(start.row, end.row);

            const targetColIdx = minCol + (colIndex - 1);
            if (targetColIdx < minCol || targetColIdx > maxCol) {
                return '#REF!';
            }

            for (let r = minRow; r <= maxRow; r++) {
                const firstColCell = `${indexToColName(minCol)}${r}`;
                const cellVal = getCellValue(sheet, firstColCell);

                const isMatch = exactMatch
                    ? String(cellVal ?? '').toLowerCase() === String(lookupVal ?? '').toLowerCase()
                    : matchCriteria(cellVal, lookupVal);

                if (isMatch) {
                    const resultCell = `${indexToColName(targetColIdx)}${r}`;
                    return getCellValue(sheet, resultCell);
                }
            }
            return '#N/A';
        }

        case 'XLOOKUP': {
            if (args.length < 3) return '#VALUE!';
            const lookupVal = parseAndEval(args[0], sheet, visited);
            const lookupCells = expandRange(args[1]);
            const returnCells = expandRange(args[2]);
            const notFoundVal = args.length >= 4 ? parseAndEval(args[3], sheet, visited) : '#N/A';

            for (let i = 0; i < lookupCells.length; i++) {
                const c = lookupCells[i];
                const cellVal = getCellValue(sheet, c);
                if (String(cellVal ?? '').toLowerCase() === String(lookupVal ?? '').toLowerCase()) {
                    const retAddr = returnCells[i];
                    return retAddr ? getCellValue(sheet, retAddr) : '#REF!';
                }
            }
            return notFoundVal;
        }

        case 'INDEX': {
            if (args.length < 2) return '#VALUE!';
            const rangeStr = args[0].trim().toUpperCase();
            const rowNum = Math.floor(toNumber(parseAndEval(args[1], sheet, visited)));
            const colNum = args.length >= 3 ? Math.floor(toNumber(parseAndEval(args[2], sheet, visited))) : 1;

            const parts = rangeStr.split(':');
            if (parts.length === 1) {
                return getCellValue(sheet, parts[0]);
            }
            const start = parseCellAddress(parts[0]);
            const end = parseCellAddress(parts[1]);
            if (!start || !end) return '#REF!';

            const targetRow = Math.min(start.row, end.row) + (rowNum - 1);
            const targetCol = Math.min(start.colIdx, end.colIdx) + (colNum - 1);

            return getCellValue(sheet, `${indexToColName(targetCol)}${targetRow}`);
        }

        case 'MATCH': {
            if (args.length < 2) return '#VALUE!';
            const lookupVal = parseAndEval(args[0], sheet, visited);
            const cells = expandRange(args[1]);

            for (let i = 0; i < cells.length; i++) {
                const val = getCellValue(sheet, cells[i]);
                if (String(val ?? '').toLowerCase() === String(lookupVal ?? '').toLowerCase()) {
                    return i + 1; // 1-based index
                }
            }
            return '#N/A';
        }

        // ================= TEXT =================
        case 'CONCAT':
        case 'CONCATENATE': {
            let res = '';
            for (const arg of args) {
                const vals = resolveArgValues(arg, sheet, visited);
                for (const v of vals) {
                    res += String(v ?? '');
                }
            }
            return res;
        }

        case 'LEFT': {
            if (args.length < 1) return '';
            const text = String(parseAndEval(args[0], sheet, visited) ?? '');
            const num = args.length >= 2 ? Math.max(0, Math.floor(toNumber(parseAndEval(args[1], sheet, visited)))) : 1;
            return text.substring(0, num);
        }

        case 'RIGHT': {
            if (args.length < 1) return '';
            const text = String(parseAndEval(args[0], sheet, visited) ?? '');
            const num = args.length >= 2 ? Math.max(0, Math.floor(toNumber(parseAndEval(args[1], sheet, visited)))) : 1;
            return text.substring(Math.max(0, text.length - num));
        }

        case 'MID': {
            if (args.length < 3) return '';
            const text = String(parseAndEval(args[0], sheet, visited) ?? '');
            const start = Math.max(1, Math.floor(toNumber(parseAndEval(args[1], sheet, visited)))) - 1;
            const len = Math.max(0, Math.floor(toNumber(parseAndEval(args[2], sheet, visited))));
            return text.substring(start, start + len);
        }

        case 'LEN': {
            if (args.length < 1) return 0;
            return String(parseAndEval(args[0], sheet, visited) ?? '').length;
        }

        case 'TRIM': {
            if (args.length < 1) return '';
            return String(parseAndEval(args[0], sheet, visited) ?? '').trim();
        }

        case 'UPPER': {
            if (args.length < 1) return '';
            return String(parseAndEval(args[0], sheet, visited) ?? '').toUpperCase();
        }

        case 'LOWER': {
            if (args.length < 1) return '';
            return String(parseAndEval(args[0], sheet, visited) ?? '').toLowerCase();
        }

        // ================= DATE =================
        case 'TODAY': {
            return new Date().toISOString().split('T')[0];
        }

        case 'NOW': {
            const now = new Date();
            return now.toISOString().replace('T', ' ').substring(0, 19);
        }

        case 'YEAR': {
            if (args.length < 1) return '#VALUE!';
            const d = new Date(String(parseAndEval(args[0], sheet, visited)));
            return isNaN(d.getFullYear()) ? '#VALUE!' : d.getFullYear();
        }

        case 'MONTH': {
            if (args.length < 1) return '#VALUE!';
            const d = new Date(String(parseAndEval(args[0], sheet, visited)));
            return isNaN(d.getMonth()) ? '#VALUE!' : d.getMonth() + 1;
        }

        case 'DAY': {
            if (args.length < 1) return '#VALUE!';
            const d = new Date(String(parseAndEval(args[0], sheet, visited)));
            return isNaN(d.getDate()) ? '#VALUE!' : d.getDate();
        }

        case 'DATEDIF': {
            if (args.length < 3) return '#VALUE!';
            const startStr = String(parseAndEval(args[0], sheet, visited));
            const endStr = String(parseAndEval(args[1], sheet, visited));
            const unit = String(parseAndEval(args[2], sheet, visited)).toUpperCase();

            const start = new Date(startStr);
            const end = new Date(endStr);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return '#VALUE!';

            const diffMs = end.getTime() - start.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (unit === 'Y') {
                let years = end.getFullYear() - start.getFullYear();
                const m = end.getMonth() - start.getMonth();
                if (m < 0 || (m === 0 && end.getDate() < start.getDate())) {
                    years--;
                }
                return Math.max(0, years);
            }
            if (unit === 'M') {
                return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
            }
            if (unit === 'D') {
                return Math.max(0, diffDays);
            }
            return diffDays;
        }

        default:
            return `#NAME? (ไม่รู้จักฟังก์ชัน ${fnName})`;
    }
}

/**
 * คำนวณค่าในสเปรดชีตซ้ำทั้งหมดเมื่อมีการเปลี่ยนแปลงค่าหรือสูตร
 */
export function recomputeSpreadsheet(sheet: SpreadsheetData): SpreadsheetData {
    const newSheet: SpreadsheetData = {};
    for (const [k, v] of Object.entries(sheet)) {
        newSheet[k] = { ...v };
    }
    // คำนวณซ้ำ 2 รอบเพื่อให้แน่ใจว่าการอ้างอิงระหว่างสูตรได้รับการอัปเดตอย่างสมบูรณ์
    for (let pass = 0; pass < 2; pass++) {
        for (const cell of Object.values(newSheet)) {
            if (cell.formula) {
                cell.value = evaluateFormula(cell.formula, newSheet);
            }
        }
    }
    return newSheet;
}

