// 地标几何原语编译器（M3）。
//
// 与 M2 的根本区别：M2 的立面 UV 是在 vertex shader 里由 instanceMatrix 反推的
// （只对"单位盒体 + 实例缩放"成立）；M3 的地标是任意几何（四棱台 / 三棱柱 /
// 圆台 / 球冠 / 斜杆 / 薄鳍），无法用那套反推。所以这里在**编译期**就把
// 米制 UV 直接写进几何：
//
//   u = 沿该面水平轴的米制长度 + 该体量在地标局部坐标系里的相位
//   v = 距地标±0 的高度（米）
//
// 相位对齐的意义：一栋塔楼由几十个体量拼成，若每段都从 u=0 起算，竖梃会在
// 分段处错位；统一到地标局部相位后，玻璃幕墙的竖梃从裙房一路贯通到塔冠。
//
// 输出是按材质族合并的 BufferGeometry（position / normal / uv / color），
// 每族一个 draw call。桅杆、拉索、钟面、屋顶设备等杂项统一进 `solid` 族，
// 靠顶点色区分——避免"一种颜色一个材质"把 draw call 打爆。
//
// 纯几何，不依赖 DOM / WebGL，可在 Node 里直接跑（scripts/verify-landmarks.mjs
// 就是这样量出真实顶点数据来做断言的）。
//
// 坐标约定：所有原语的 `y` 一律是**底面**高度（局部 y0 → 世界 frame.y + y0）。

import * as THREE from 'three';

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _nm = new THREE.Matrix3();
const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

/** 颜色 → [r,g,b] */
function rgb(c, tint) {
  let out;
  if (Array.isArray(c)) out = c.slice();
  else if (typeof c === 'number') out = [(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255];
  else out = [1, 1, 1];
  const t = tint == null ? 1 : tint;
  return [out[0] * t, out[1] * t, out[2] * t];
}

// ---------------------------------------------------------------------------
// Scribe：按材质族累加三角面
// ---------------------------------------------------------------------------

export class Scribe {
  constructor() { this.buckets = new Map(); this.tris = 0; }

  bucket(fam) {
    if (!this.buckets.has(fam)) this.buckets.set(fam, { pos: [], nor: [], uv: [], col: [] });
    return this.buckets.get(fam);
  }

  tri(fam, a, b, c, uva, uvb, uvc, col) {
    const k = this.bucket(fam);
    k.pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    k.nor.push(a.n.x, a.n.y, a.n.z, b.n.x, b.n.y, b.n.z, c.n.x, c.n.y, c.n.z);
    k.uv.push(uva[0], uva[1], uvb[0], uvb[1], uvc[0], uvc[1]);
    k.col.push(col[0], col[1], col[2], col[0], col[1], col[2], col[0], col[1], col[2]);
    this.tris++;
  }

  /** p/n/uv 各为 4 元数组（绕序：0-1-2、0-2-3） */
  quad(fam, p, n, uv, col) {
    this.tri(fam, p[0], p[1], p[2], uv[0], uv[1], uv[2], col);
    this.tri(fam, p[0], p[2], p[3], uv[0], uv[2], uv[3], col);
  }

  geometries() {
    const out = new Map();
    for (const [fam, b] of this.buckets) {
      if (!b.pos.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      out.set(fam, g);
    }
    return out;
  }

  get triangleCount() { return this.tris; }
}

// ---------------------------------------------------------------------------
// 变换工具
// ---------------------------------------------------------------------------

/** 把局部坐标 + yaw/pitch/roll 变成世界变换 */
function compose(pos, yaw, pitch, roll) {
  _e.set(pitch || 0, yaw || 0, roll || 0, 'YXZ');
  _q.setFromEuler(_e);
  _p.set(pos.x, pos.y, pos.z);
  _m.compose(_p, _q, _v0.set(1, 1, 1));
  _nm.getNormalMatrix(_m);
  return _m;
}

/** 用变换作用一个点 + 一个法线，返回 scribe 需要的 {x,y,z,n:{x,y,z}} */
function xf(m, x, y, z, nx, ny, nz) {
  _v1.set(x, y, z).applyMatrix4(m);
  _v2.set(nx, ny, nz).applyMatrix3(_nm).normalize();
  return { x: _v1.x, y: _v1.y, z: _v1.z, n: { x: _v2.x, y: _v2.y, z: _v2.z } };
}

/** 四点面（两条边叉积求法线） */
function faceNormal(p) {
  const ax = p[1].x - p[0].x, ay = p[1].y - p[0].y, az = p[1].z - p[0].z;
  const bx = p[3].x - p[0].x, by = p[3].y - p[0].y, bz = p[3].z - p[0].z;
  let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  const L = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / L, y: ny / L, z: nz / L };
}

/** 从 THREE 几何发射三角面（含局部→世界变换），UV 由 uvf(局部x,y,z, u,v) 决定 */
function emitGeometry(S, g, m, fam, col, uvf, nmOverride) {
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  const idx = g.index;
  const nm = nmOverride || _nm;
  const V = (i) => {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    _v1.set(x, y, z).applyMatrix4(m);
    _v2.set(nor.getX(i), nor.getY(i), nor.getZ(i)).applyMatrix3(nm).normalize();
    return {
      x: _v1.x, y: _v1.y, z: _v1.z,
      n: { x: _v2.x, y: _v2.y, z: _v2.z },
      uv: uvf(x, y, z, uv.getX(i), uv.getY(i))
    };
  };
  for (let i = 0; i < idx.count; i += 3) {
    const a = V(idx.getX(i)), b = V(idx.getX(i + 1)), c = V(idx.getX(i + 2));
    S.tri(fam, a, b, c, a.uv, b.uv, c.uv, col);
  }
  g.dispose();
}

// ---------------------------------------------------------------------------
// 原语发射器（o.y 一律为底面高度）
// ---------------------------------------------------------------------------

/**
 * 盒体。UV：X 面用 (局部z,局部y)、Z 面用 (局部x,局部y)、Y 面用 (局部x,局部z)，
 * 再加相位 (u0,v0)，因此窗格按真实开间×层高重复且跨体量对齐。
 */
function emitBox(S, o) {
  const fam = o.fam || 'solid';
  const col = rgb(o.color, o.tint);
  const hw = o.w / 2, hh = o.h / 2, hd = o.d / 2;
  const m = compose({ x: o.x, y: o.y + o.h / 2, z: o.z }, o.yaw, o.pitch, o.roll);
  const u0 = o.u0 || 0, v0 = o.v0 || 0;

  const faces = [
    [[1, 0, 0], [[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]], (x, y, z) => [z + hd + u0, y + hh + v0]],
    [[-1, 0, 0], [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]], (x, y, z) => [z + hd + u0, y + hh + v0]],
    [[0, 0, 1], [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]], (x, y, z) => [x + hw + u0, y + hh + v0]],
    [[0, 0, -1], [[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]], (x, y, z) => [x + hw + u0, y + hh + v0]],
    [[0, 1, 0], [[-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]], (x, y, z) => [x + hw + u0, z + hd + v0]],
    [[0, -1, 0], [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]], (x, y, z) => [x + hw + u0, z + hd + v0]]
  ];
  for (const [n, c, uvf] of faces) {
    const p = c.map(v => xf(m, v[0], v[1], v[2], n[0], n[1], n[2]));
    const uv = c.map(v => uvf(v[0], v[1], v[2]));
    S.quad(fam, p, p.map(q => q.n), uv, col);
  }
}

/**
 * 四棱台（上下底尺寸可不同）—— 塔楼收分 / 塔冠的主要手段。
 * 侧面 UV：u 沿底边周向、v 为高度。
 */
function emitTaper(S, o) {
  const fam = o.fam || 'solid';
  const col = rgb(o.color, o.tint);
  const hw = o.w / 2, hd = o.d / 2;
  const tw = (o.tw ?? o.w) / 2, td = (o.td ?? o.d) / 2;
  const h = o.h;
  const m = compose({ x: o.x, y: o.y, z: o.z }, o.yaw, o.pitch, o.roll);
  const u0 = o.u0 || 0, v0 = o.v0 || 0;

  const B = [[-hw, -hd], [-hw, hd], [hw, hd], [hw, -hd]];
  const Tp = [[-tw, -td], [-tw, td], [tw, td], [tw, -td]];
  const seg = [hd, hw, hd, hw];
  const off = [0, seg[0], seg[0] + seg[1], seg[0] + seg[1] + seg[2]];

  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const p = [
      xf(m, B[i][0], 0, B[i][1], 0, 0, 0),
      xf(m, B[j][0], 0, B[j][1], 0, 0, 0),
      xf(m, Tp[j][0], h, Tp[j][1], 0, 0, 0),
      xf(m, Tp[i][0], h, Tp[i][1], 0, 0, 0)
    ];
    const n = faceNormal(p);
    for (const q of p) q.n = n;
    const u = [off[i], off[i] + seg[i], off[i] + seg[i], off[i]];
    S.quad(fam, p, [n, n, n, n],
      [[u[0] + u0, v0], [u[1] + u0, v0], [u[2] + u0, h + v0], [u[3] + u0, h + v0]], col);
  }

  const top = Tp.map(v => xf(m, v[0], h, v[1], 0, 1, 0));
  for (const q of top) q.n = { x: 0, y: 1, z: 0 };
  S.quad(fam, top, top.map(q => q.n), Tp.map(v => [v[0] + u0 + tw, v[1] + v0 + td]), col);

  const bot = B.map(v => xf(m, v[0], 0, v[1], 0, -1, 0));
  for (const q of bot) q.n = { x: 0, y: -1, z: 0 };
  S.quad(fam, bot, bot.map(q => q.n), B.map(v => [v[0] + u0 + hw, v[1] + v0 + hd]), col);
}

/**
 * 三棱柱（坡屋面 / 楔形体量）。apexT ∈ [-0.5,0.5] 控制屋脊偏移：
 * 0 = 对称双坡，0.5 = 单坡（直角三角形断面）。
 */
function emitWedge(S, o) {
  const fam = o.fam || 'solid';
  const col = rgb(o.color, o.tint);
  const hw = o.w / 2, hd = o.d / 2, h = o.h;
  const az = (o.apexT ?? 0) * o.d;
  const m = compose({ x: o.x, y: o.y, z: o.z }, o.yaw, o.pitch, o.roll);
  const u0 = o.u0 || 0, v0 = o.v0 || 0;

  const A = [-hw, 0, -hd], B = [hw, 0, -hd], C = [hw, 0, hd], D = [-hw, 0, hd];
  const E = [-hw, h, az], F = [hw, h, az];
  const P = (v, n) => xf(m, v[0], v[1], v[2], n[0], n[1], n[2]);
  const DOWN = [0, -1, 0];

  const bot = [P(D, DOWN), P(C, DOWN), P(B, DOWN), P(A, DOWN)];
  for (const p of bot) p.n = { x: 0, y: -1, z: 0 };
  S.quad(fam, bot, bot.map(p => p.n),
    [[-hw + u0, -hd + v0], [hw + u0, -hd + v0], [hw + u0, hd + v0], [-hw + u0, hd + v0]], col);

  const slope1 = [P(A, [0, 0, 0]), P(B, [0, 0, 0]), P(F, [0, 0, 0]), P(E, [0, 0, 0])];
  const slope2 = [P(C, [0, 0, 0]), P(D, [0, 0, 0]), P(E, [0, 0, 0]), P(F, [0, 0, 0])];
  for (const s of [slope1, slope2]) {
    const n = faceNormal(s);
    for (const p of s) p.n = n;
    S.quad(fam, s, s.map(p => p.n),
      [[-hw + u0, v0], [hw + u0, v0], [hw + u0, h + v0], [-hw + u0, h + v0]], col);
  }

  const ends = [[A, E, D, [0, 0, -1]], [B, C, F, [0, 0, 1]]];
  for (const [a, b, c, n] of ends) {
    const t = [P(a, n), P(b, n), P(c, n)];
    for (const p of t) p.n = { x: n[0], y: n[1], z: n[2] };
    S.tri(fam, t[0], t[1], t[2],
      [a[0] + hw + u0, a[1] + v0], [b[0] + hw + u0, b[1] + v0], [c[0] + hw + u0, c[1] + v0], col);
  }
}

/** 圆台 / 圆柱 / 圆锥（r1=0 即锥）。UV 用周向 u（保证接缝正确）× 周长。 */
function emitCyl(S, o) {
  const fam = o.fam || 'solid';
  const col = rgb(o.color, o.tint);
  const r0 = o.r0, r1 = o.r1 ?? o.r0, h = o.h, seg = o.seg || 20;
  const g = new THREE.CylinderGeometry(r1, r0, h, seg, 1, o.open === true,
    o.thetaStart ?? 0, o.thetaLength ?? Math.PI * 2);
  const m = compose({ x: o.x, y: o.y + h / 2, z: o.z }, o.yaw, o.pitch, o.roll);
  const v0 = o.v0 || 0;
  const rAvg = (r0 + r1) / 2;
  emitGeometry(S, g, m, fam, col, (x, y, z, u, v) => [u * 2 * Math.PI * rAvg, v * h + v0]);
}

/** 球冠 / 椭球（from,to 为极角，单位弧度；默认上半球）。 */
function emitDome(S, o) {
  const fam = o.fam || 'solid';
  const col = rgb(o.color, o.tint);
  const from = o.from ?? 0, to = o.to ?? Math.PI / 2;
  const g = new THREE.SphereGeometry(1, o.seg || 24, o.rings || 12, 0, Math.PI * 2, from, to - from);
  g.scale(o.rx, o.ry, o.rz);
  const m = compose({ x: o.x, y: o.y, z: o.z }, o.yaw, o.pitch, o.roll);
  const v0 = o.v0 || 0;
  const circ = 2 * Math.PI * (o.rx + o.rz) / 2;
  emitGeometry(S, g, m, fam, col, (x, y, z, u, v) => [u * circ, v * Math.PI * o.ry + v0]);
}

/** 圆环（塔冠环箍 / 观景环 / 拱圈）。 */
function emitTorus(S, o) {
  const fam = o.fam || 'solid';
  const col = rgb(o.color, o.tint);
  const g = new THREE.TorusGeometry(o.r, o.tube, o.rseg || 8, o.seg || 28, o.arc ?? Math.PI * 2);
  const m = compose({ x: o.x, y: o.y + (o.tube || 0), z: o.z }, o.yaw, o.pitch, o.roll);
  emitGeometry(S, g, m, fam, col, (x, y, z, u, v) => [u * 2 * Math.PI * o.r, v * 2 * Math.PI * (o.tube || 1)]);
}

/** 斜杆：世界坐标两点之间的一根圆管（桁架 / 拉索 / 支撑）。 */
function emitTube(S, o) {
  const fam = o.fam || 'solid';
  const col = rgb(o.color, o.tint);
  const a = o.a, b = o.b;
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz) || 1e-3;
  const r = o.r ?? 0.5;
  const g = new THREE.CylinderGeometry(o.r1 ?? r, r, len, o.seg || 6, 1, true);
  const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  const dir = new THREE.Vector3(dx, dy, dz).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1));
  const nm = new THREE.Matrix3().getNormalMatrix(m);
  emitGeometry(S, g, m, fam, col, (x, y, z, u, v) => [u * 2 * Math.PI * r, v * len], nm);
}

// ---------------------------------------------------------------------------
// LandmarkContext：一座地标的局部坐标系 + 原语入口
// ---------------------------------------------------------------------------

const EMIT = {
  box: emitBox,
  taper: emitTaper,
  wedge: emitWedge,
  cyl: emitCyl,
  cone: (S, o) => emitCyl(S, { ...o, r1: 0 }),
  dome: emitDome,
  torus: emitTorus,
  tube: emitTube
};

const PICK = ['w', 'd', 'h', 'r', 'r0', 'r1', 'tw', 'td', 'fam', 'n', 'seg', 'apexT',
  'pitch', 'roll', 'yaw', 'rx', 'ry', 'rz', 'tube', 'color', 'tint', 'open'];

function pick(o, keys) {
  const out = {};
  for (const k of keys) if (o[k] !== undefined) out[k] = o[k];
  return out;
}

/**
 * @param {{x:number,y:number,z:number,yaw:number}} frame 世界定位（y 为±0 高程）
 */
export function makeContext(frame) {
  const S = new Scribe();
  const parts = [];
  const facts = {};
  const cy = Math.cos(frame.yaw), sy = Math.sin(frame.yaw);

  const ctx = {
    scribe: S,
    frame,
    parts,
    facts,

    /** 记录一条"设计事实"，供数值验收断言（如 C.fact('layers', 4)）。 */
    fact(k, v) { facts[k] = v; return ctx; },

    /** 世界坐标点（局部 dx,dy,dz）→ 世界，桁架/拉索用。 */
    pt(dx, dy, dz) {
      return {
        x: frame.x + dx * cy + dz * sy,
        y: frame.y + dy,
        z: frame.z - dx * sy + dz * cy
      };
    },

    /** 原语入口：dx/dz/y0 为地标局部坐标，yaw 为相对地标的额外转角。 */
    add(kind, o) {
      const dx = o.dx || 0, dz = o.dz || 0, y0 = o.y0 || 0;
      const rel = o.yaw || 0;
      // 相位：把体量中心投到它自己的 u 轴上，使同一地标内竖梃/楼层对齐
      const resolved = {
        ...o,
        x: frame.x + dx * cy + dz * sy,
        y: frame.y + y0,
        z: frame.z - dx * sy + dz * cy,
        yaw: frame.yaw + rel,
        u0: o.u0 ?? dx * Math.sin(rel) + dz * Math.cos(rel),
        v0: o.v0 ?? y0
      };
      const fn = EMIT[kind];
      if (!fn) throw new Error(`未知地标原语: ${kind}`);
      fn(S, resolved);
      parts.push({ k: kind, dx, dz, y0, x: resolved.x, y: resolved.y, z: resolved.z, ...pick(o, PICK) });
      return ctx;
    }
  };

  for (const k of Object.keys(EMIT)) ctx[k] = (o) => ctx.add(k, o);

  /** 杂项（顶点色）：桅杆 / 钟面 / 屋顶设备。 */
  ctx.solid = (o) => ctx.add(o.k || 'box', { fam: 'solid', ...o });

  /** 世界两点之间的斜杆（局部坐标）。 */
  ctx.link = (a, b, r, o = {}) => ctx.add('tube', {
    fam: 'solid', a: ctx.pt(a[0], a[1], a[2]), b: ctx.pt(b[0], b[1], b[2]), r, ...o
  });

  /** 柱廊：沿 X 轴排 n 根柱子。 */
  ctx.colonnade = (o) => {
    const n = o.n, span = o.span ?? o.w;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * span;
      ctx.add('cyl', {
        fam: o.fam || 'solid', color: o.color, tint: o.tint,
        dx: (o.dx || 0) + t * Math.cos(o.yaw || 0), dz: (o.dz || 0) - t * Math.sin(o.yaw || 0),
        y0: o.y0, h: o.h, r0: o.r, r1: o.r1 ?? o.r, yaw: o.yaw,
        seg: o.seg || 10
      });
    }
    return ctx;
  };

  /** 台阶 / 阶梯式基座（沿 Z 轴逐级抬升）。 */
  ctx.stairs = (o) => {
    const n = o.steps;
    for (let i = 0; i < n; i++) {
      ctx.add('box', {
        fam: o.fam || 'solid', color: o.color, tint: o.tint,
        dx: o.dx, dz: (o.dz || 0) + (i - (n - 1) / 2) * (o.d / n),
        y0: (o.y0 || 0) + (i + 1) * (o.h / n), w: o.w, h: o.h / n, d: o.d / n, yaw: o.yaw
      });
    }
    return ctx;
  };

  /** 薄鳍 / 幕墙竖梃 / 桁架杆：薄盒体的别名。 */
  ctx.fin = (o) => ctx.add('box', { fam: o.fam || 'solid', ...o });

  return ctx;
}

/** 汇总：几何 + 三角面数 */
export function compile(ctx) {
  return {
    geometries: ctx.scribe.geometries(),
    triangles: ctx.scribe.triangleCount,
    parts: ctx.parts,
    facts: ctx.facts
  };
}
