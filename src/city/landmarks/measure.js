// 几何量测（M3 验收用）。
//
// 两个必须避开的坑（都踩过）：
//
// ① 不能用"找靠近该高度的顶点"量跨度。塔楼侧壁是两个跨越 300m 的大三角形，
//    中间根本没有顶点，按顶点邻近采样会量出完全错误的截面。
//    → 改为**用水平面去切几何**，取平面与三角形交线的端点。
//
// ② 单一平面采样会正好落在几何边界上（塔冠顶边、裙房顶边），量到空截面。
//    → 改为**在一小段高度带内取多个平面的最大截面**（widthBand）。
//
// 收分比 taper 定义为「顶部 88% 处 ÷ 塔身中段 35% 处」而不是「÷ 地面」：
// 塔楼常带大裙房，用地面跨度做分母会把裙房宽度算进去，收分比严重失真。
//
// 这一层纯几何、无 DOM，验收脚本与工具共用。

/** 几何最高点（世界 Y）。 */
export function geometryTop(geometries) {
  let top = -Infinity;
  for (const g of geometries.values()) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y > top) top = y;
    }
  }
  return top === -Infinity ? 0 : top;
}

/**
 * 用水平面 y 切几何，返回截面跨度。
 * @returns {{w:number,d:number,cuts:number}|null}
 */
export function widthAtPlane(geometries, y) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, cuts = 0;
  const hit = (x, z) => {
    cuts++;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (z < z0) z0 = z; if (z > z1) z1 = z;
  };

  for (const g of geometries.values()) {
    const arr = g.attributes.position.array;
    const n = arr.length / 9;
    for (let t = 0; t < n; t++) {
      const o = t * 9;
      const ax = arr[o], ay = arr[o + 1], az = arr[o + 2];
      const bx = arr[o + 3], by = arr[o + 4], bz = arr[o + 5];
      const cx = arr[o + 6], cy = arr[o + 7], cz = arr[o + 8];

      const d0 = ay - y, d1 = by - y, d2 = cy - y;
      const lo = Math.min(d0, d1, d2), hi = Math.max(d0, d1, d2);
      if (lo > 0 || hi < 0) continue;               // 全在平面一侧

      if (lo === 0 && hi === 0) { hit(ax, az); hit(bx, bz); hit(cx, cz); continue; }

      const edges = [
        [ax, az, bx, bz, d0, d1], [bx, bz, cx, cz, d1, d2], [cx, cz, ax, az, d2, d0]
      ];
      for (const [x1_, z1_, x2_, z2_, e1, e2] of edges) {
        if (e1 === 0) hit(x1_, z1_);
        if (e1 * e2 < 0) {
          const t = e1 / (e1 - e2);
          hit(x1_ + (x2_ - x1_) * t, z1_ + (z2_ - z1_) * t);
        }
      }
    }
  }
  return cuts ? { w: x1 - x0, d: z1 - z0, cuts } : null;
}

/**
 * 一小段高度带内的最大截面跨度（避开几何边界处量到空截面的问题）。
 * @param {number} y    带中心
 * @param {number} half 半带宽
 */
export function widthBand(geometries, y, half) {
  let best = null;
  for (let k = -2; k <= 2; k++) {
    const r = widthAtPlane(geometries, y + k * half / 2);
    if (r && (!best || Math.max(r.w, r.d) > Math.max(best.w, best.d))) best = r;
  }
  return best;
}

/**
 * 逐座量测。
 * @param {{geometries:Map, parts:Array, facts:Object, world:{x,y,z}}} entry
 */
export function measureLandmark(entry) {
  const geos = entry.geometries;
  const yBase = entry.world.y;
  const yTop = geometryTop(geos);
  const H = yTop - yBase;
  const half = H * 0.022;

  const span = (r) => (r ? Math.max(r.w, r.d) : 0);
  const at = (frac) => widthBand(geos, yBase + H * frac, half);

  const w06 = at(0.06), wMid = at(0.35), wTop = at(0.88);

  // 轮廓台阶：32 级带采样，跨度每下降 8% 记一级（退台 / 收分段）
  const N = 32;
  const prof = new Array(N).fill(0);
  for (let i = 0; i < N; i++) prof[i] = span(widthBand(geos, yBase + H * (i + 0.5) / N, half));
  let steps = 0;
  for (let i = 1; i < N; i++) {
    if (prof[i] > 0 && prof[i - 1] > 0 && prof[i] < prof[i - 1] * 0.92) steps++;
  }

  // 尖顶：从顶往下找"跨度仍有底段 55%"的最高层，其上算尖顶 / 桅杆
  const base = Math.max(prof[0], prof[1], 1e-3);
  let spireBase = yBase;
  for (let i = N - 1; i >= 0; i--) {
    if (prof[i] >= base * 0.55) { spireBase = yBase + H * (i + 1) / N; break; }
  }

  // 最宽处的高度占比：判"上大下小"（飞碟 / 倒锥台）的正确指标。
  // 用 taper（88% ÷ 35%）判会误伤 —— 倒锥台的最宽处在 60~75% 高度，
  // 而 88% 处已经收进屋面，算出来的 taper 反而 < 1。
  let peakAt = 0, peakW = -1;
  for (let i = 0; i < N; i++) {
    if (prof[i] > peakW) { peakW = prof[i]; peakAt = (i + 0.5) / N; }
  }

  // 顶点完整性
  let bad = 0;
  for (const g of geos.values()) {
    const a = g.attributes.position.array;
    for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) { bad++; break; }
  }

  return {
    height: H, yTop, yBase, bad,
    wBase: span(w06), wMid: span(wMid), wTop: span(wTop),
    taper: span(wTop) / Math.max(span(wMid), 1e-3),
    steps, spire: yTop - spireBase,
    peakAt, peakW,
    prof,
    parts: entry.parts,
    triangles: entry.triangles,
    facts: entry.facts
  };
}

/** 计数：满足条件的原语个数。 */
export function countParts(entry, k, pred) {
  return entry.parts.filter(p => p.k === k && (!pred || pred(p))).length;
}
