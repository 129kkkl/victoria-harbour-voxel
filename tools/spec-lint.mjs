// 地标规格自检（M3）：把 builder 真正跑一遍，报告三角面 / 原语数 / 事实表 /
// 关键截面宽度，抓出语法错误、运行时异常、以及"塔尖比塔基还宽"这类明显错形。
//
//   node tools/spec-lint.mjs            全部
//   node tools/spec-lint.mjs a          只跑 specs/a.js（与 core.js 合并）
//   node tools/spec-lint.mjs b boc      只跑 specs/b.js 里的 boc
import { LANDMARKS } from '../src/geo/landmarks.js';
import { makeContext, compile } from '../src/city/landmarks/prims.js';
import { widthBand } from '../src/city/landmarks/measure.js';
import { CORE } from '../src/city/landmarks/specs/core.js';
import { lonLatToWorld } from '../src/geo/projection.js';
import { sampleHeight } from '../src/city/heightfield.js';

const DEG = Math.PI / 180;
const batch = process.argv[2];
const onlyId = process.argv[3];

let builders = { ...CORE };
if (batch) {
  const mod = await import(`../src/city/landmarks/specs/${batch}.js`);
  builders = { ...mod[Object.keys(mod)[0]], ...CORE };
} else {
  const mod = await import('../src/city/landmarks/specs/index.js');
  builders = mod.LANDMARK_BUILDERS;
}

/** 用水平面切几何求截面跨度（带内取最大，避开几何边界量到空截面）。 */
function widthsAt(geos, yLevels, half) {
  const out = {};
  for (const y of yLevels) {
    const r = widthBand(geos, y, half);
    out[y] = r ? { w: +Math.max(r.w, r.d).toFixed(1), d: +Math.min(r.w, r.d).toFixed(1) } : null;
  }
  return out;
}

let bad = 0, totalTris = 0, totalParts = 0;
const missing = [];

for (const L of LANDMARKS) {
  if (onlyId && L.id !== onlyId) continue;
  const build = builders[L.id];
  if (!build) { missing.push(L.id); continue; }

  const { x, z } = lonLatToWorld(L.lon, L.lat);
  const frameY = Math.max(sampleHeight(x, z), L.shape === 'promenade' ? 4.5 : 2.5);
  const C = makeContext({ x, z, y: frameY, yaw: -(L.rot || 0) * DEG });

  let out = null, err = null;
  try { build(C, L); out = compile(C); } catch (e) { err = e; }

  if (err) {
    bad++;
    console.log(`  FAIL  ${L.id.padEnd(22)} ${err.message}`);
    console.log(`${err.stack.split('\n').slice(1, 4).join('\n')}`);
    continue;
  }

  // 包围盒
  let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const g of out.geometries.values()) {
    g.computeBoundingBox();
    const b = g.boundingBox;
    y0 = Math.min(y0, b.min.y); y1 = Math.max(y1, b.max.y);
    x0 = Math.min(x0, b.min.x); x1 = Math.max(x1, b.max.x);
    z0 = Math.min(z0, b.min.z); z1 = Math.max(z1, b.max.z);
  }
  // 总高 = 几何最高点 − ±0（含尖顶 / 桅杆）；L.h 是结构高度，尖顶可超出
  const H = y1 - frameY;
  const half = H * 0.022;
  const FR = [0.06, 0.35, 0.88];
  const w = widthsAt(out.geometries, FR.map(f => frameY + H * f), half);
  const kinds = {};
  for (const p of out.parts) kinds[p.k] = (kinds[p.k] || 0) + 1;

  totalTris += out.triangles;
  totalParts += out.parts.length;

  const wStr = FR.map(f => {
    const r = w[frameY + H * f];
    return r ? `${r.w}×${r.d}` : '—';
  }).join(' | ');

  // 收分方向提示：塔楼上宽下窄通常是错的
  const rMid = w[frameY + H * 0.35], rTop = w[frameY + H * 0.88];
  const taper = rMid && rTop ? rTop.w / Math.max(rMid.w, 1e-3) : 1;
  const flag = (H < L.h - 6 || H > L.h + 70) ? '  ⚠总高超出 L.h -6~+70（尖顶/桅杆可超出 L.h）' : '';
  const fat = (taper > 1.12 && L.shape !== 'dome' && L.h > 50) ? '  ⚠塔顶比塔身中段宽' : '';

  console.log(`  ok    ${L.id.padEnd(22)} 总高 ${String(Math.round(H)).padStart(4)}m (L.h ${String(L.h).padStart(4)})  ` +
    `宽@6/35/88% ${wStr.padEnd(26)} 原语 ${String(out.parts.length).padStart(3)}  ` +
    `面 ${String(out.triangles).padStart(5)}  ${Object.entries(kinds).map(([k, v]) => `${k}:${v}`).join(' ')}${flag}${fat}`);
  if (out.facts && Object.keys(out.facts).length) {
    console.log(`        facts: ${Object.entries(out.facts).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  }
  if (flag || fat) bad++;
}

if (missing.length) {
  console.log(`\n  未实现的地标 builder: ${missing.join(', ')}`);
  bad += missing.length;
}
console.log(`\n合计：三角面 ${totalTris.toLocaleString()} · 原语 ${totalParts.toLocaleString()} · 问题 ${bad}`);
process.exit(bad > 0 ? 1 : 0);
