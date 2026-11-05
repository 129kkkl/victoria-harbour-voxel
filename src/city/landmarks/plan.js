// 地标几何规划层（M3）。
//
// 这一层刻意**不依赖 DOM / 材质**：只做"地标数据 → 局部坐标上下文 → 几何"。
// 运行时（landmarkBuilder.js）和离线验收（scripts/verify-landmarks.mjs）
// 共用它，保证验收量到的就是浏览器里画出来的那套顶点，不会两边算岔。

import { lonLatToWorld } from '../../geo/projection.js';
import { sampleHeight } from '../heightfield.js';
import { LANDMARKS, PEAK_TRAMWAY } from '../../geo/landmarks.js';
import { makeContext, compile } from './prims.js';
import { LANDMARK_BUILDERS } from './specs/index.js';

const DEG = Math.PI / 180;

/** 落地高程：滨海步道压到岸线，其余从±0 起算（与 M2 一致）。 */
export function groundYFor(L) {
  const { x, z } = lonLatToWorld(L.lon, L.lat);
  return {
    x, z,
    y: Math.max(sampleHeight(x, z), L.shape === 'promenade' ? 4.5 : 2.5)
  };
}

/**
 * 逐座生成几何。
 * @returns {{ entries: Array, totals: Object }}
 */
export function buildLandmarkPlan() {
  const entries = [];
  let triangles = 0, parts = 0;

  for (const L of LANDMARKS) {
    const g = groundYFor(L);
    const C = makeContext({ x: g.x, y: g.y, z: g.z, yaw: -(L.rot || 0) * DEG });
    const build = LANDMARK_BUILDERS[L.id];
    if (build) {
      build(C, L);
    } else {
      // 兜底：没有精建规格的地标退回 M2 的骨架体量，保证不会凭空消失
      C.box({ dx: 0, dz: 0, y0: -4, w: L.w, d: L.d, h: L.h + 4, fam: 'concrete' });
    }
    const out = compile(C);
    triangles += out.triangles;
    parts += out.parts.length;

    entries.push({
      id: L.id,
      data: L,
      world: { x: g.x, y: g.y, z: g.z },
      geometries: out.geometries,
      triangles: out.triangles,
      parts: out.parts,
      facts: out.facts,
      height: out.triangles ? geometryTop(out.geometries) - g.y : L.h
    });
  }

  return { entries, totals: { triangles, parts } };
}

/** 几何最高点（世界 Y） */
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

/** 太平山顶缆车索道两端（世界坐标）。 */
export function tramwayEndpoints() {
  const a = groundYFor({ lon: PEAK_TRAMWAY.from[0], lat: PEAK_TRAMWAY.from[1], shape: '' });
  const b = groundYFor({ lon: PEAK_TRAMWAY.to[0], lat: PEAK_TRAMWAY.to[1], shape: '' });
  return {
    a: { x: a.x, y: a.y, z: a.z },
    b: { x: b.x, y: b.y, z: b.z }
  };
}

export { LANDMARKS, PEAK_TRAMWAY };
