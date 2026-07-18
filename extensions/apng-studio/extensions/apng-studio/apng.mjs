// APNG codec helpers (Node-side).
//
// - assembleApng(): repackages a list of already-encoded PNG frames into a
//   single Animated PNG, following https://wiki.mozilla.org/APNG_Specification.
//   Because every frame is already a valid PNG sharing one IHDR, we only need
//   to lift each frame's IDAT stream into the default image (frame 0) or into
//   `fdAT` chunks (later frames), wrapped by `acTL`/`fcTL` control chunks with
//   freshly computed CRC-32s. No re-compression required.
// - encodeRgbaPng(): minimal RGBA8 PNG encoder used for agent-generated frames.

import { deflateSync } from "node:zlib";

const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
        c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
}

function concat(chunks) {
    let total = 0;
    for (const c of chunks) total += c.length;
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
        out.set(c, off);
        off += c.length;
    }
    return out;
}

function readU32(bytes, off) {
    return (
        ((bytes[off] << 24) |
            (bytes[off + 1] << 16) |
            (bytes[off + 2] << 8) |
            bytes[off + 3]) >>>
        0
    );
}

// Build a PNG chunk: [length][type][data][crc], CRC over type+data.
function chunk(type, data) {
    const len = data.length;
    const out = new Uint8Array(12 + len);
    const view = new DataView(out.buffer);
    view.setUint32(0, len);
    out[4] = type.charCodeAt(0);
    out[5] = type.charCodeAt(1);
    out[6] = type.charCodeAt(2);
    out[7] = type.charCodeAt(3);
    out.set(data, 8);
    view.setUint32(8 + len, crc32(out.subarray(4, 8 + len)));
    return out;
}

// Parse the pieces of a PNG we care about: its IHDR data and the concatenated
// IDAT stream. Ancillary/color chunks are intentionally dropped — every frame
// shares a uniform RGBA8 IHDR so they are not needed.
function parsePng(bytes) {
    for (let i = 0; i < PNG_SIGNATURE.length; i++) {
        if (bytes[i] !== PNG_SIGNATURE[i]) {
            throw new Error("Not a PNG (bad signature)");
        }
    }
    let off = 8;
    let ihdrData = null;
    let width = 0;
    let height = 0;
    const idatParts = [];
    while (off + 8 <= bytes.length) {
        const len = readU32(bytes, off);
        const type = String.fromCharCode(
            bytes[off + 4],
            bytes[off + 5],
            bytes[off + 6],
            bytes[off + 7]
        );
        const dataStart = off + 8;
        const data = bytes.subarray(dataStart, dataStart + len);
        if (type === "IHDR") {
            ihdrData = data.slice();
            width = readU32(data, 0);
            height = readU32(data, 4);
        } else if (type === "IDAT") {
            idatParts.push(data.slice());
        } else if (type === "IEND") {
            break;
        }
        off = dataStart + len + 4; // skip data + CRC
    }
    if (!ihdrData) throw new Error("PNG missing IHDR");
    if (idatParts.length === 0) throw new Error("PNG missing IDAT");
    return { ihdrData, width, height, idat: concat(idatParts) };
}

function acTLChunk(numFrames, numPlays) {
    const data = new Uint8Array(8);
    const view = new DataView(data.buffer);
    view.setUint32(0, numFrames >>> 0);
    view.setUint32(4, numPlays >>> 0);
    return chunk("acTL", data);
}

// dispose_op: 0 = NONE (leave as-is), 1 = BACKGROUND (clear region to transparent
//   black), 2 = PREVIOUS (revert region to what it was before this frame).
// blend_op:   0 = SOURCE (overwrite region, alpha included), 1 = OVER (alpha-blend
//   this frame over the current canvas contents).
function fcTLChunk(sequence, width, height, params) {
    const {
        delayNum = 100,
        delayDen = 1000,
        disposeOp = 0,
        blendOp = 0,
        xOffset = 0,
        yOffset = 0,
    } = params || {};
    const data = new Uint8Array(26);
    const view = new DataView(data.buffer);
    view.setUint32(0, sequence >>> 0); // sequence_number
    view.setUint32(4, width >>> 0); // width
    view.setUint32(8, height >>> 0); // height
    view.setUint32(12, xOffset >>> 0); // x_offset
    view.setUint32(16, yOffset >>> 0); // y_offset
    view.setUint16(20, delayNum & 0xffff); // delay_num
    view.setUint16(22, delayDen & 0xffff); // delay_den
    data[24] = disposeOp & 0xff; // dispose_op
    data[25] = blendOp & 0xff; // blend_op
    return chunk("fcTL", data);
}

function fdATChunk(sequence, idat) {
    const data = new Uint8Array(4 + idat.length);
    new DataView(data.buffer).setUint32(0, sequence >>> 0);
    data.set(idat, 4);
    return chunk("fdAT", data);
}

const clampU16 = (n, dflt = 0) => {
    const v = Math.round(Number(n));
    return Number.isFinite(v) ? Math.max(0, Math.min(0xffff, v)) : dflt;
};
const clampDen = (n) => {
    const v = Math.round(Number(n));
    return Number.isFinite(v) && v >= 1 ? Math.min(0xffff, v) : 1000;
};
const clampOp = (n, hi) => {
    const v = Math.round(Number(n));
    return Number.isFinite(v) ? Math.max(0, Math.min(hi, v)) : 0;
};

// Normalize a caller-supplied frame descriptor into the exact fcTL fields.
// Timing accepts either delayNum/delayDen (exact) or a delayMs shorthand
// (treated as delayNum ms over a 1000 denominator).
function frameParams(f) {
    let delayNum;
    let delayDen;
    if (f.delayNum != null) {
        delayNum = clampU16(f.delayNum, 100);
        delayDen = clampDen(f.delayDen);
    } else {
        delayNum = clampU16(f.delayMs, 100);
        delayDen = 1000;
    }
    return {
        delayNum,
        delayDen,
        disposeOp: clampOp(f.disposeOp, 2),
        blendOp: clampOp(f.blendOp, 1),
    };
}

// The APNG spec forbids APNG_DISPOSE_OP_PREVIOUS on the first fcTL (decoders
// must treat it as BACKGROUND). Normalize it for whichever frame is composited
// first so our output is well-defined instead of relying on decoder leniency.
function firstFrameParams(f) {
    const p = frameParams(f);
    if (p.disposeOp === 2) p.disposeOp = 1;
    return p;
}

/**
 * Assemble an APNG from a list of PNG frames.
 *
 * @param {Array<{png: Uint8Array, delayMs?: number, delayNum?: number, delayDen?: number, disposeOp?: number, blendOp?: number}>} frames
 * @param {{loops?: number, hiddenFirst?: boolean}} [options]
 *   loops: 0 = infinite. hiddenFirst: when true (and >=2 frames) the first frame
 *   becomes the static default image shown by non-APNG viewers and is NOT part
 *   of the animation; frames 2..N make up the loop.
 * @returns {Uint8Array} APNG bytes.
 */
export function assembleApng(frames, options = {}) {
    if (!Array.isArray(frames) || frames.length === 0) {
        throw new Error("assembleApng requires at least one frame");
    }
    const loops = Math.max(0, Math.round(Number(options.loops) || 0));
    const hiddenFirst = !!options.hiddenFirst && frames.length >= 2;
    const parsed = frames.map((f) => parsePng(f.png));

    const width = parsed[0].width;
    const height = parsed[0].height;
    for (const p of parsed) {
        if (p.width !== width || p.height !== height) {
            throw new Error(
                `All frames must share dimensions (${width}x${height}); found ${p.width}x${p.height}`
            );
        }
    }

    const parts = [PNG_SIGNATURE, chunk("IHDR", parsed[0].ihdrData)];
    const numFrames = hiddenFirst ? parsed.length - 1 : parsed.length;
    parts.push(acTLChunk(numFrames, loops));

    let seq = 0;
    if (hiddenFirst) {
        // Default image = frame 0, with no fcTL, so it is not animated.
        parts.push(chunk("IDAT", parsed[0].idat));
        for (let i = 1; i < parsed.length; i++) {
            const params = i === 1 ? firstFrameParams(frames[i]) : frameParams(frames[i]);
            parts.push(fcTLChunk(seq++, width, height, params));
            parts.push(fdATChunk(seq++, parsed[i].idat));
        }
    } else {
        // Frame 0 = default image AND first animation frame: fcTL then IDAT.
        parts.push(fcTLChunk(seq++, width, height, firstFrameParams(frames[0])));
        parts.push(chunk("IDAT", parsed[0].idat));
        // Remaining frames: fcTL then fdAT (each carries a sequence number).
        for (let i = 1; i < parsed.length; i++) {
            parts.push(fcTLChunk(seq++, width, height, frameParams(frames[i])));
            parts.push(fdATChunk(seq++, parsed[i].idat));
        }
    }

    parts.push(chunk("IEND", new Uint8Array(0)));
    return concat(parts);
}

/**
 * Encode an 8-bit RGBA pixel buffer into a (non-animated) PNG.
 *
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array} rgba length must be width*height*4
 * @returns {Uint8Array} PNG bytes.
 */
export function encodeRgbaPng(width, height, rgba) {
    if (rgba.length !== width * height * 4) {
        throw new Error("rgba length does not match width*height*4");
    }
    const ihdr = new Uint8Array(13);
    const view = new DataView(ihdr.buffer);
    view.setUint32(0, width >>> 0);
    view.setUint32(4, height >>> 0);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // color type: RGBA
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter method
    ihdr[12] = 0; // interlace

    // Filtered raw scanlines: one leading filter byte (0 = None) per row.
    const stride = width * 4;
    const raw = new Uint8Array((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        const src = y * stride;
        const dst = y * (stride + 1);
        raw[dst] = 0;
        raw.set(rgba.subarray(src, src + stride), dst + 1);
    }
    const compressed = deflateSync(raw, { level: 9 });

    return concat([
        PNG_SIGNATURE,
        chunk("IHDR", ihdr),
        chunk("IDAT", new Uint8Array(compressed.buffer, compressed.byteOffset, compressed.length)),
        chunk("IEND", new Uint8Array(0)),
    ]);
}

/**
 * Convenience: encode a solid-color frame as a PNG.
 * @param {number} width
 * @param {number} height
 * @param {{r:number,g:number,b:number,a:number}} color 0-255 components
 */
export function solidColorPng(width, height, color) {
    const rgba = new Uint8Array(width * height * 4);
    const { r, g, b, a } = color;
    for (let i = 0; i < rgba.length; i += 4) {
        rgba[i] = r;
        rgba[i + 1] = g;
        rgba[i + 2] = b;
        rgba[i + 3] = a;
    }
    return encodeRgbaPng(width, height, rgba);
}
