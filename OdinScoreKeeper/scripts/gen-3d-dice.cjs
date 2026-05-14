// 3D isometric dice icon — pure Node.js, no deps
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── PNG engine ────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const l = Buffer.alloc(4); l.writeUInt32BE(data.length, 0);
  const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([l, t, data, cr]);
}
function makePNG(size, drawFn) {
  const rowBytes = 1 + size * 4;
  const raw = Buffer.alloc(size * rowBytes);
  for (let y = 0; y < size; y++) {
    raw[y * rowBytes] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a = 255] = drawFn(x, y, size);
      const off = y * rowBytes + 1 + x * 4;
      raw[off] = r; raw[off+1] = g; raw[off+2] = b; raw[off+3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Helpers ───────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function mix(A, B, t) { return A.map((v, i) => Math.round(lerp(v, B[i], clamp(t, 0, 1)))); }

function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - hw + r;
  const qy = Math.abs(py - cy) - hh + r;
  return Math.sqrt(Math.max(0, qx)**2 + Math.max(0, qy)**2) + Math.min(0, Math.max(qx, qy)) - r;
}
function aa(d, w = 1.2) { return clamp(-d / w + 0.5, 0, 1); }

// Cross product of 2D vectors
function cross2(ax, ay, bx, by) { return ax * by - ay * bx; }

// Point inside convex polygon (vertices in order)
function inPoly(px, py, pts) {
  let sign = null;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    const c = cross2(bx - ax, by - ay, px - ax, py - ay);
    if (Math.abs(c) < 0.2) continue;
    const s = c > 0;
    if (sign === null) sign = s;
    else if (s !== sign) return false;
  }
  return sign !== null;
}

// Distance to line segment
function dSeg(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, L2 = dx*dx + dy*dy;
  if (L2 < 0.001) return Math.hypot(px - ax, py - ay);
  const t = clamp(((px - ax)*dx + (py - ay)*dy) / L2, 0, 1);
  return Math.hypot(px - ax - t*dx, py - ay - t*dy);
}

// Bilinear UV→screen (exact for parallelograms)
function uvXY(u, v, [ax,ay], [bx,by], [cx,cy], [dx,dy]) {
  const iu = 1 - u, iv = 1 - v;
  return [ax*iu*iv + bx*u*iv + cx*u*v + dx*iu*v,
          ay*iu*iv + by*u*iv + cy*u*v + dy*iu*v];
}

// ── Draw function ─────────────────────────────────────────────────────
function draw3dDice(x, y, S) {
  const cx = S / 2, cy = S / 2;
  // Cube half-size in screen pixels
  // We offset the cube upward slightly so it looks centered visually
  const s  = S * 0.315;
  const oy = S * 0.03; // small upward offset

  // ── 7 key vertices (isometric projection) ──
  //         T
  //        / \
  //      TL   TR
  //      |\ /|
  //      | C |
  //      |/ \|
  //      BL   BR
  //        \ /
  //         B
  const T  = [cx,       cy - s         - oy];
  const TL = [cx - s,   cy - s * 0.5   - oy];
  const TR = [cx + s,   cy - s * 0.5   - oy];
  const CM = [cx,       cy             - oy]; // center spine vertex
  const BL = [cx - s,   cy + s * 0.5   - oy];
  const BR = [cx + s,   cy + s * 0.5   - oy];
  const B  = [cx,       cy + s         - oy];

  // Three visible faces (vertices in clockwise screen order)
  const topF   = [T,  TR, CM, TL];
  const rightF = [TR, BR, B,  CM];
  const leftF  = [TL, CM, B,  BL];

  // ── Face colours (light from upper-right) ──
  const TOP_C   = [252, 248, 238];   // brightest
  const RIGHT_C = [222, 210, 188];   // medium
  const LEFT_C  = [155, 143, 122];   // darkest (shadow)
  const DOT_C   = [22,  18,  30];    // near-black dots
  const EDGE_C  = [6,   5,   8];     // edge outline
  const BG_C    = [10,  10,  15];    // background

  // ── Dots (face UV positions) ──
  const p = 0.27;
  //   Top face  → 1 dot
  const dotsTop = [[0.5, 0.5]];
  //   Right face → 5 dots
  const dotsRight = [[p,1-p],[1-p,1-p],[0.5,0.5],[p,p],[1-p,p]];
  //   Left face  → 2 dots
  const dotsLeft = [[p,p],[1-p,1-p]];

  // UV corners in screen space: A=UV(0,0), B=UV(1,0), C=UV(1,1), D=UV(0,1)
  //  Top face:   A=T, B=TR, C=CM, D=TL  (u: T→TR, v: T→TL)
  //  Right face: A=TR, B=BR, C=B, D=CM  (u: TR→BR, v: TR→CM)
  //  Left face:  A=TL, B=CM, C=B, D=BL  (u: TL→CM, v: TL→BL)

  const dotR = S * 0.051;
  function dotAlpha(px, py, uvs, A, B, C, D) {
    let best = 0;
    for (const [u, v] of uvs) {
      const [sx, sy] = uvXY(u, v, A, B, C, D);
      const d = Math.hypot(px - sx, py - sy);
      best = Math.max(best, aa(d - dotR, 1.5));
    }
    return best;
  }

  // ── Background (rounded rect) ──
  const bgSDF = sdRoundRect(x, y, cx, cy, S * 0.44, S * 0.44, S * 0.12);
  const bgA = aa(bgSDF);
  if (bgA <= 0) return [0, 0, 0, 0]; // transparent outside

  // ── Subtle drop shadow below cube ──
  const shadowY = cy + s * 0.82 - oy;
  const shadowDist = Math.hypot(x - cx, (y - shadowY) * 1.8);
  const shadowA = clamp(1 - shadowDist / (s * 0.9), 0, 1) ** 2 * 0.45;

  // ── Face hit test ──
  const inTop   = inPoly(x, y, topF);
  const inRight = inPoly(x, y, rightF);
  const inLeft  = inPoly(x, y, leftF);
  const onCube  = inTop || inRight || inLeft;

  // ── Edge outlines ──
  const edgeW = S * 0.011;
  const edgeDist = !onCube ? Infinity : Math.min(
    dSeg(x, y, T,  TL), dSeg(x, y, T,  TR),
    dSeg(x, y, T,  CM), dSeg(x, y, TL, CM), dSeg(x, y, TR, CM),
    dSeg(x, y, CM, B),
    dSeg(x, y, TL, BL), dSeg(x, y, TR, BR),
    dSeg(x, y, BL, B),  dSeg(x, y, BR, B)
  );
  const edgeA = aa(edgeDist - edgeW, edgeW * 0.6);

  // ── Compose ──
  let faceCol;
  let dA = 0;

  if (inTop) {
    faceCol = [...TOP_C];
    dA = dotAlpha(x, y, dotsTop,   T, TR, CM, TL);
    // Top edge highlight (thin lighter stripe along T-TL and T-TR)
    const topHL = Math.max(
      aa(dSeg(x, y, T, TL) - S*0.008, S*0.012),
      aa(dSeg(x, y, T, TR) - S*0.008, S*0.012)
    );
    if (topHL > 0) faceCol = mix(faceCol, [255, 255, 255], topHL * 0.4);
  } else if (inRight) {
    faceCol = [...RIGHT_C];
    dA = dotAlpha(x, y, dotsRight, TR, BR, B, CM);
  } else if (inLeft) {
    faceCol = [...LEFT_C];
    dA = dotAlpha(x, y, dotsLeft,  TL, CM, B, BL);
  } else {
    // Not on cube — background + shadow
    const bgBase = mix(BG_C, [0, 0, 0], shadowA);
    return [...bgBase, Math.round(bgA * 255)];
  }

  // Blend dots
  if (dA > 0) faceCol = mix(faceCol, DOT_C, dA);

  // Blend edges
  if (edgeA > 0) faceCol = mix(faceCol, EDGE_C, edgeA * 0.85);

  return [...faceCol, 255];
}

// ── Generate ──────────────────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(outDir, 'icon-preview-3d-192.png'), makePNG(192, draw3dDice));
fs.writeFileSync(path.join(outDir, 'icon-preview-3d-512.png'), makePNG(512, draw3dDice));
console.log('3D dice icons generated ✓');
