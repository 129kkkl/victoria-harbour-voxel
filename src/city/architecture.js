// Pure architecture plans: no WebGL/Canvas dependency. Every element is local to
// its parcel so generation, rendering and footprint validation use the same data.
import { MODERN_TYPES, HERITAGE_TYPES, planDistrictBuilding } from './districtArchitecture.js';
export const ARCHETYPES = {
  slender: '纤细办公塔', chamfered: '切角玻璃塔', setback: '阶梯塔楼',
  offset: '错层双体塔', twins: '双塔住宅', slab: '板式住宅',
  courtyard: '围合院落', shophouse: '港式唐楼', industrial: '工业阁楼',
  tapered:'收分晶体塔',lantern:'椭圆空中花园塔',blade:'斜冠办公塔',skybridge:'连廊双塔',
  arcade:'骑楼商住楼',corner:'圆角街楼',walkup:'退台旧楼'
};

export function seededRandom(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE = {
  glass: [[0.78, 0.91, 0.94], [0.91, 0.94, 0.92], [0.60, 0.77, 0.81], [0.90, 0.83, 0.68]],
  concrete: [[1.15, 1.10, 0.99], [1.02, 1.07, 1.10], [1.08, 1.02, 0.91], [0.92, 1.04, 0.96]],
  tileOld: [[1.26, 1.09, 0.83], [0.91, 1.16, 1.05], [0.92, 1.11, 1.22], [1.25, 0.99, 0.89]],
  mosaic: [[1.05, 1.14, 1.03], [1.19, 1.03, 0.94], [1.03, 1.13, 1.23], [1.27, 1.18, 0.94]],
  granite: [[1.07, 1.06, 1.01], [0.95, 1.02, 1.07], [1.12, 1.06, 0.91]],
  brick: [[1.13, 1.02, 0.92], [0.91, 0.98, 1.02]],
  industrial: [[0.93, 1.06, 1.10], [1.08, 1.10, 1.00]]
};

export function planBuilding(lot) {
  const seed = lot.seed ?? ((Math.round(lot.x * 10) ^ Math.round(lot.z * 100)) >>> 0);
  const r = seededRandom(seed);
  const pick = arr => arr[Math.floor(r() * arr.length)];
  const old = /tileOld|mosaic|brick/.test(lot.family);
  let type;
  if (old) type = lot.w > 42 && lot.d > 40 && r() < 0.4 ? 'courtyard' : pick(HERITAGE_TYPES);
  else if (lot.district === 'central') type = pick([...MODERN_TYPES,'tapered','lantern','chamfered']);
  else if (lot.family === 'industrial') type = 'industrial';
  else if (lot.family === 'glass') type = pick(['slender', 'chamfered', 'offset', 'setback', ...MODERN_TYPES]);
  else if (lot.w > 43 && lot.d > 38) type = pick(['twins', 'courtyard', 'slab', 'setback']);
  else type = pick(['slab', 'slender', 'offset']);

  if (MODERN_TYPES.includes(type) || HERITAGE_TYPES.includes(type)) return planDistrictBuilding(lot,type,seed,r);

  const palette = PALETTE[lot.family] ?? PALETTE.concrete;
  const tint = pick(palette).map(c => c * (0.95 + r() * 0.08));
  const accent = pick([[0.39, 0.46, 0.47], [0.57, 0.59, 0.55], [0.65, 0.56, 0.40], [0.69, 0.72, 0.70]]);
  const pale = [0.66, 0.68, 0.64], dark = [0.13, 0.20, 0.22];
  const bodies = [], details = [], props = [], gardens = [];
  const W = lot.w - 2.4, D = lot.d - 2.4, H = lot.boxH;
  const ph = old ? 4.2 : Math.min(12, H * 0.13);
  const add = (arr, dx, dz, y0, w, d, h, color, family, shape = 'box') => {
    if (w <= 0 || d <= 0 || h <= 0) return;
    arr.push({ dx, dz, y0, w, d, h, tint: color, family, shape, seed,
      facadeY: y0, detail: arr !== bodies });
  };
  const body = (dx, dz, y, w, d, h, family = lot.family, shape = 'box') =>
    add(bodies, dx, dz, y, w, d, h, tint, family, shape);
  const detail = (dx, dz, y, w, d, h, color = accent) => add(details, dx, dz, y, w, d, h, color);
  const plant = (dx, dz, y, w, d) => add(gardens, dx, dz, y, w, d, 0.6, [0.14, 0.27, 0.16]);
  const cap = (dx, dz, y, w, d, color = pale) => {
    // Four parapets leave an actual recessed roof, rather than a solid white lid.
    detail(dx, dz - d / 2 + 0.3, y, w, 0.6, 0.85, color);
    detail(dx, dz + d / 2 - 0.3, y, w, 0.6, 0.85, color);
    detail(dx - w / 2 + 0.3, dz, y, 0.6, d, 0.85, color);
    detail(dx + w / 2 - 0.3, dz, y, 0.6, d, 0.85, color);
  };
  const fins = (dx, dz, y, w, d, h, count = 4) => {
    for (let i = 0; i < count; i++) {
      const x = dx + (i / (count - 1) - 0.5) * (w - 1.1);
      for (const s of [-1, 1]) detail(x, dz + s * (d / 2 + 0.28), y, 0.55, 0.65, h);
    }
  };
  const rooftop = (dx, dz, y, w, d) => {
    cap(dx, dz, y, w, d);
    const rw = Math.min(7, w * 0.35), rd = Math.min(6, d * 0.3);
    add(props, dx + w * 0.16, dz + d * 0.16, y, rw, rd, 2.3 + r() * 2.1, dark);
    if (w > 20 && d > 20) {
      plant(dx - w * 0.22, dz - d * 0.24, y + 0.2, w * 0.30, d * 0.22);
      for (let n = 0; n < 2; n++) add(props, dx - w * 0.23 + n * 3, dz + d * 0.22, y, 2.2, 3.5, 1.2, pale);
    }
  };

  // A podium stays within the buildable envelope and presents a glazed storefront.
  if (type !== 'courtyard') {
    body(0, 0, 0, W, D, ph, old ? 'podium' : 'granite');
    body(0, -D * 0.46, 0.4, W * 0.92, D * 0.06, ph - 0.8, 'podium');
    detail(0, -D * 0.47, ph - 0.4, W, D * 0.06, 0.45, pale);
  }

  if (type === 'slender' || type === 'chamfered') {
    const w = W * (0.57 + r() * 0.16), d = D * (0.54 + r() * 0.16);
    const shape = type === 'chamfered' ? 'chamfer' : 'box';
    body(0, 0, ph, w, d, H - ph - 4, lot.family, shape);
    if (shape === 'box') fins(0, 0, ph, w, d, H - ph - 4, 4 + Math.floor(r() * 3));
    else for (const s of [-1, 1]) detail(0, s * (d / 2 + 0.12), ph, 0.85, 0.4, H - ph - 4, pale);
    body(0, 0, H - 4, w * 0.78, d * 0.78, 4, 'metal', shape);
    rooftop(0, 0, H, w * 0.78, d * 0.78);
    plant(-W * 0.38, 0, ph + 0.1, W * 0.12, D * 0.68);
  } else if (type === 'setback') {
    const cut1 = 0.48 + r() * 0.14, cut2 = 0.79 + r() * 0.07;
    const levels = [ph, H * cut1, H * cut2, H];
    for (let k = 0; k < 3; k++) {
      const w = W * (0.85 - k * 0.15), d = D * (0.78 - k * 0.12);
      const dx = k * W * 0.035;
      body(dx, 0, levels[k], w, d, levels[k + 1] - levels[k]);
      fins(dx, 0, levels[k], w, d, levels[k + 1] - levels[k], 3);
      rooftop(dx, 0, levels[k + 1], w, d);
    }
  } else if (type === 'offset') {
    const w = W * 0.45, d = D * 0.64;
    const low = H * (0.68 + r() * 0.16);
    body(-W * 0.20, -D * 0.09, ph, w, d, H - ph);
    body(W * 0.21, D * 0.1, ph, w * 0.85, d, low - ph);
    fins(-W * 0.20, -D * 0.09, ph, w, d, H - ph, 3);
    fins(W * 0.21, D * 0.1, ph, w * 0.85, d, low - ph, 3);
    rooftop(-W * 0.20, -D * 0.09, H, w, d);
    rooftop(W * 0.21, D * 0.1, low, w * 0.85, d);
  } else if (type === 'twins') {
    for (const s of [-1, 1]) {
      const w = W * 0.30, d = D * 0.61, x = s * W * 0.26;
      const h = s < 0 ? H : H * (0.82 + r() * 0.15);
      body(x, 0, ph, w, d, h - ph);
      body(x, 0, ph, w * 0.5, d * 1.15, h - ph, 'concrete');
      for (let y = ph + 6; y < h - 2; y += lot.floorH * 2) {
        for (const z of [-1, 1]) detail(x, z * (d / 2 + 0.7), y, w * 0.94, 1.8, 0.38, pale);
      }
      rooftop(x, 0, h, w, d);
    }
    plant(0, 0, ph + 0.1, W * 0.12, D * 0.75);
  } else if (type === 'slab') {
    const w = W * 0.82, d = D * (0.42 + r() * 0.12);
    body(0, D * 0.10, ph, w, d, H - ph);
    body(0, D * 0.10, ph, Math.min(6, w * 0.2), d * 1.16, H - ph, 'granite');
    for (let y = ph + 3; y < H - 1; y += lot.floorH * 2) {
      for (const s of [-1, 1]) {
        detail(s * w * 0.30, D * 0.10 - d / 2 - 0.5, y, w * 0.31, 1.6, 0.4, pale);
        detail(s * w * 0.30, D * 0.10 - d / 2 - 1.2, y + 0.4, w * 0.31, 0.16, 0.75, dark);
      }
    }
    rooftop(0, D * 0.10, H, w, d);
    plant(0, -D * 0.37, ph + 0.1, W * 0.75, D * 0.12);
  } else if (type === 'courtyard') {
    const bw = W * 0.23, bd = D * 0.24;
    for (const s of [-1, 1]) {
      const h = H * (s < 0 ? 1 : 0.79);
      body(s * (W - bw) / 2, 0, 0, bw, D, h);
      rooftop(s * (W - bw) / 2, 0, h, bw, D);
      body(0, s * (D - bd) / 2, 0, W - bw * 2, bd, H * 0.65);
      cap(0, s * (D - bd) / 2, H * 0.65, W - bw * 2, bd);
    }
    plant(0, 0, lot.spread + 0.6, W * 0.44, D * 0.42);
  } else {
    const w = W * 0.85, d = D * 0.83;
    body(0, 0, ph, w, d, H - ph);
    fins(0, 0, ph, w, d, H - ph, 5);
    for (let y = ph + 9; y < H; y += 13.5) detail(0, -d / 2 - 0.25, y, w, 0.7, 0.5, pale);
    rooftop(0, 0, H, w, d);
  }
  return { type, bodies, details, props, gardens };
}

export function toWorldPart(lot, part) {
  const c = Math.cos(lot.rotY), s = Math.sin(lot.rotY);
  return { ...part, x: lot.x + c * part.dx + s * part.dz,
    z: lot.z - s * part.dx + c * part.dz, y0: lot.base + part.y0, rot: lot.rotY + (part.turn || 0) };
}
