// Minimal, dependency-free QR Code encoder (byte mode, EC level M, versions
// 1-10). Enough to encode a short LAN URL for the "Send to phone" feature.
//
// Returns a square matrix of 0/1 modules. Rendering to PNG is done by the
// caller via the RGBA->PNG encoder in apng.mjs, so this file has no I/O.
//
// Reference: ISO/IEC 18004. Verified module-for-module against the python
// `qrcode` reference encoder (see eng verification) for forced masks 0-7.

// ---- Galois field GF(256), primitive polynomial 0x11d --------------------
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
        EXP[i] = x;
        LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

// Reed-Solomon generator polynomial of the given degree.
function rsGenerator(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i++) {
        const next = new Array(poly.length + 1).fill(0);
        for (let j = 0; j < poly.length; j++) {
            next[j] ^= gfMul(poly[j], EXP[i]);
            next[j + 1] ^= poly[j];
        }
        poly = next;
    }
    return poly;
}

function rsEncode(data, ecLen) {
    const gen = rsGenerator(ecLen); // constant-first; gen[ecLen] is the leading 1
    const res = new Array(ecLen).fill(0);
    for (const byte of data) {
        const factor = byte ^ res[0];
        res.shift();
        res.push(0);
        // Use the non-leading generator coefficients in descending-degree order.
        for (let i = 0; i < ecLen; i++) res[i] ^= gfMul(gen[ecLen - 1 - i], factor);
    }
    return res;
}

// ---- Version tables (EC level M) ----------------------------------------
// [ecPerBlock, [[blockCount, dataCodewordsPerBlock], ...]]
const EC_BLOCKS_M = {
    1: [10, [[1, 16]]],
    2: [16, [[1, 28]]],
    3: [26, [[1, 44]]],
    4: [18, [[2, 32]]],
    5: [24, [[2, 43]]],
    6: [16, [[4, 27]]],
    7: [18, [[4, 31]]],
    8: [22, [[2, 38], [2, 39]]],
    9: [22, [[3, 36], [2, 37]]],
    10: [26, [[4, 43], [1, 44]]],
};

const ALIGN_POS = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

const totalDataCodewords = (v) =>
    EC_BLOCKS_M[v][1].reduce((sum, [count, dc]) => sum + count * dc, 0);

const charCountBits = (v) => (v <= 9 ? 8 : 16);

function chooseVersion(dataLen) {
    for (let v = 1; v <= 10; v++) {
        const capacityBits = totalDataCodewords(v) * 8;
        const needed = 4 + charCountBits(v) + dataLen * 8;
        if (needed <= capacityBits) return v;
    }
    throw new Error("Data too long for QR versions 1-10 (byte mode, EC M)");
}

// ---- Bit buffer ----------------------------------------------------------
class BitBuffer {
    constructor() {
        this.bits = [];
    }
    put(value, length) {
        for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
    }
    get length() {
        return this.bits.length;
    }
}

function buildCodewords(bytes, version) {
    const buf = new BitBuffer();
    buf.put(0b0100, 4); // byte mode
    buf.put(bytes.length, charCountBits(version));
    for (const b of bytes) buf.put(b, 8);

    const capacityBits = totalDataCodewords(version) * 8;
    // Terminator (up to 4 zero bits).
    const term = Math.min(4, capacityBits - buf.length);
    buf.put(0, term);
    // Pad to a byte boundary.
    while (buf.length % 8 !== 0) buf.bits.push(0);
    // Pad bytes.
    const padBytes = [0xec, 0x11];
    let pi = 0;
    while (buf.length < capacityBits) {
        buf.put(padBytes[pi++ % 2], 8);
    }

    // Pack bits into data codewords.
    const data = [];
    for (let i = 0; i < buf.length; i += 8) {
        let byte = 0;
        for (let j = 0; j < 8; j++) byte = (byte << 1) | buf.bits[i + j];
        data.push(byte);
    }

    // Split into blocks, compute EC, then interleave.
    const [ecPerBlock, groups] = EC_BLOCKS_M[version];
    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    for (const [count, dcPerBlock] of groups) {
        for (let b = 0; b < count; b++) {
            const block = data.slice(offset, offset + dcPerBlock);
            offset += dcPerBlock;
            dataBlocks.push(block);
            ecBlocks.push(rsEncode(block, ecPerBlock));
        }
    }

    const result = [];
    const maxData = Math.max(...dataBlocks.map((b) => b.length));
    for (let i = 0; i < maxData; i++) {
        for (const block of dataBlocks) if (i < block.length) result.push(block[i]);
    }
    for (let i = 0; i < ecPerBlock; i++) {
        for (const block of ecBlocks) result.push(block[i]);
    }
    return result;
}

// ---- Matrix construction -------------------------------------------------
function makeBaseMatrix(size) {
    const m = Array.from({ length: size }, () => new Array(size).fill(null));
    return m;
}

function placeFinder(m, r, c) {
    for (let i = -1; i <= 7; i++) {
        for (let j = -1; j <= 7; j++) {
            const rr = r + i;
            const cc = c + j;
            if (rr < 0 || cc < 0 || rr >= m.length || cc >= m.length) continue;
            const inRing =
                i >= 0 && i <= 6 && j >= 0 && j <= 6 &&
                (i === 0 || i === 6 || j === 0 || j === 6);
            const inCore = i >= 2 && i <= 4 && j >= 2 && j <= 4;
            m[rr][cc] = inRing || inCore ? 1 : 0;
        }
    }
}

function placeAlignment(m, version) {
    const pos = ALIGN_POS[version];
    for (const r of pos) {
        for (const c of pos) {
            // Skip the three finder corners.
            if ((r === 6 && c === 6) || (r === 6 && c === m.length - 7) || (r === m.length - 7 && c === 6)) continue;
            if (m[r][c] !== null) continue;
            for (let i = -2; i <= 2; i++) {
                for (let j = -2; j <= 2; j++) {
                    const ring = Math.max(Math.abs(i), Math.abs(j));
                    m[r + i][c + j] = ring === 1 ? 0 : 1;
                }
            }
        }
    }
}

function reserveFormat(m) {
    const size = m.length;
    // Marks format/version areas as reserved (use a sentinel we overwrite later).
    // Handled implicitly: we set them during placement by skipping null-only.
    return size;
}

const FORMAT_MASK = 0x5412;

function bchFormat(data5) {
    let d = data5 << 10;
    const g = 0b10100110111;
    for (let i = 4; i >= 0; i--) {
        if ((d >> (i + 10)) & 1) d ^= g << i;
    }
    return ((data5 << 10) | d) ^ FORMAT_MASK;
}

function bchVersion(version) {
    let d = version << 12;
    const g = 0b1111100100101;
    for (let i = 5; i >= 0; i--) {
        if ((d >> (i + 12)) & 1) d ^= g << i;
    }
    return (version << 12) | d;
}

const MASKS = [
    (r, c) => (r + c) % 2 === 0,
    (r, c) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function isFunctionModule(reserved, r, c) {
    return reserved[r][c];
}

function buildReserved(size, version) {
    const reserved = Array.from({ length: size }, () => new Array(size).fill(false));
    const mark = (r, c) => {
        if (r >= 0 && c >= 0 && r < size && c < size) reserved[r][c] = true;
    };
    // Finders + separators.
    for (const [br, bc] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
        for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) mark(br + i, bc + j);
    }
    // Timing.
    for (let i = 0; i < size; i++) {
        mark(6, i);
        mark(i, 6);
    }
    // Alignment.
    const pos = ALIGN_POS[version];
    for (const r of pos) for (const c of pos) {
        if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
        for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) mark(r + i, c + j);
    }
    // Format info areas.
    for (let i = 0; i < 9; i++) {
        mark(8, i);
        mark(i, 8);
    }
    for (let i = 0; i < 8; i++) {
        mark(8, size - 1 - i);
        mark(size - 1 - i, 8);
    }
    mark(size - 8, 8); // dark module
    // Version info (v >= 7).
    if (version >= 7) {
        for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
            mark(i, size - 11 + j);
            mark(size - 11 + j, i);
        }
    }
    return reserved;
}

function placeTiming(m) {
    const size = m.length;
    for (let i = 0; i < size; i++) {
        if (m[6][i] === null) m[6][i] = i % 2 === 0 ? 1 : 0;
        if (m[i][6] === null) m[i][6] = i % 2 === 0 ? 1 : 0;
    }
}

function placeData(m, reserved, codewords) {
    const size = m.length;
    const bits = [];
    for (const cw of codewords) for (let i = 7; i >= 0; i--) bits.push((cw >> i) & 1);
    let idx = 0;
    let upward = true;
    for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col--; // skip vertical timing column
        for (let n = 0; n < size; n++) {
            const row = upward ? size - 1 - n : n;
            for (let k = 0; k < 2; k++) {
                const c = col - k;
                if (reserved[row][c]) continue;
                m[row][c] = idx < bits.length ? bits[idx++] : 0;
            }
        }
        upward = !upward;
    }
}

function applyMask(m, reserved, maskFn) {
    const out = m.map((row) => row.slice());
    for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m.length; c++) {
            if (reserved[r][c]) continue;
            if (maskFn(r, c)) out[r][c] ^= 1;
        }
    }
    return out;
}

function placeFormatBits(m, maskIndex) {
    const size = m.length;
    // EC level M = 0b00. Format data = (ecBits << 3) | maskIndex.
    const format = bchFormat((0b00 << 3) | maskIndex);
    const bits = [];
    for (let i = 14; i >= 0; i--) bits.push((format >> i) & 1);
    // Around top-left finder.
    const coords1 = [
        [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
        [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    ];
    coords1.forEach(([r, c], i) => (m[r][c] = bits[i]));
    // Split across top-right and bottom-left.
    const coords2 = [
        [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8],
        [size - 5, 8], [size - 6, 8], [size - 7, 8],
        [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5],
        [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1],
    ];
    coords2.forEach(([r, c], i) => (m[r][c] = bits[i]));
    m[size - 8][8] = 1; // dark module
}

function placeVersionBits(m, version) {
    if (version < 7) return;
    const size = m.length;
    const v = bchVersion(version);
    const bits = [];
    for (let i = 0; i <= 17; i++) bits.push((v >> i) & 1); // least-significant bit first
    let idx = 0;
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 3; j++) {
            const b = bits[idx++];
            m[i][size - 11 + j] = b;
            m[size - 11 + j][i] = b;
        }
    }
}

// Penalty scoring for mask selection (ISO 18004 rules 1-4).
function penalty(m) {
    const size = m.length;
    let score = 0;
    // Rule 1: runs of 5+ same-color in rows/cols.
    for (let r = 0; r < size; r++) {
        for (const line of [m[r], m.map((row) => row[r])]) {
            let run = 1;
            for (let c = 1; c < size; c++) {
                if (line[c] === line[c - 1]) {
                    run++;
                    if (run === 5) score += 3;
                    else if (run > 5) score += 1;
                } else run = 1;
            }
        }
    }
    // Rule 2: 2x2 blocks.
    for (let r = 0; r < size - 1; r++) {
        for (let c = 0; c < size - 1; c++) {
            const v = m[r][c];
            if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
        }
    }
    // Rule 3: finder-like patterns.
    const pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    const matchAt = (line, i, pat) => pat.every((p, k) => line[i + k] === p);
    for (let r = 0; r < size; r++) {
        const rowLine = m[r];
        const colLine = m.map((row) => row[r]);
        for (let c = 0; c <= size - 11; c++) {
            if (matchAt(rowLine, c, pat1) || matchAt(rowLine, c, pat2)) score += 40;
            if (matchAt(colLine, c, pat1) || matchAt(colLine, c, pat2)) score += 40;
        }
    }
    // Rule 4: dark/light balance.
    let dark = 0;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) dark += m[r][c];
    const percent = (dark * 100) / (size * size);
    const prev = Math.floor(percent / 5) * 5;
    const next = prev + 5;
    score += Math.min(Math.abs(prev - 50), Math.abs(next - 50)) / 5 * 10;
    return score;
}

/**
 * Encode a string into a QR matrix (array of rows of 0/1).
 * @param {string} text
 * @param {{forceMask?: number}} [opts] forceMask selects a specific mask (for tests).
 * @returns {{matrix: number[][], version: number, size: number, mask: number}}
 */
export function encodeQr(text, opts = {}) {
    const bytes = Array.from(new TextEncoder().encode(text));
    const version = chooseVersion(bytes.length);
    const size = version * 4 + 17;
    const codewords = buildCodewords(bytes, version);
    const reserved = buildReserved(size, version);

    const base = makeBaseMatrix(size);
    placeFinder(base, 0, 0);
    placeFinder(base, 0, size - 7);
    placeFinder(base, size - 7, 0);
    placeAlignment(base, version);
    placeTiming(base);
    placeVersionBits(base, version);
    placeData(base, reserved, codewords);

    let chosen = opts.forceMask;
    let bestMatrix = null;
    if (chosen == null) {
        let bestScore = Infinity;
        for (let mi = 0; mi < 8; mi++) {
            const masked = applyMask(base, reserved, MASKS[mi]);
            placeFormatBits(masked, mi);
            const s = penalty(masked);
            if (s < bestScore) {
                bestScore = s;
                chosen = mi;
                bestMatrix = masked;
            }
        }
    } else {
        bestMatrix = applyMask(base, reserved, MASKS[chosen]);
        placeFormatBits(bestMatrix, chosen);
    }

    return { matrix: bestMatrix, version, size, mask: chosen };
}
