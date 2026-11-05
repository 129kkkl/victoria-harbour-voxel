// 街道网格 → 城市地块。
//
// 香港的城市肌理不是一张同心圆衰减的贴图，而是：斜交的街道网把陆地切成地块，
// 地块按地段等级给出高度，再按楼栋分槽、退台、裙房生成体量。
// 因此这里做三件事：
//   ① 在每个城区的旋转坐标系里按街区尺寸 + 路宽切出地块
//   ② 用"离 CBD 距离 + 分段噪声 + 楼层量化"给地块定高（这是天际线的真正来源）
//   ③ 顺带产出路面带（沿地块缝隙），让街道网本身可见
//
// 山腰住宅单独处理：坡地上按等高线方向排布的中层住宅，是香港最具辨识度的地貌之一。

import { lonLatToWorld, worldToLonLat } from '../geo/projection.js';
import { isLand } from '../geo/coastline.js';
import { sampleHeight, fbm } from './heightfield.js';
import { buildDistrictList } from '../geo/districts.js';
import { footprint, overlaps, createSpatialIndex } from './spatial.js';
import { buildLandmarkPlan } from './landmarks/plan.js';

// 各立面族的标准层高（米）—— 高度量化必须按层走，否则天际线会出现 37.3m 这种假高度
const FLOOR_H = {
  glass: 3.9, concrete: 3.1, tileOld: 3.0, mosaic: 3.0,
  granite: 3.4, brick: 3.6, colonial: 3.6, metal: 4.2, industrial: 4.5
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

/** 地标占地 → 排除圆，避免街道网格把楼盖在地标上。 */
let keepOutCache;
export function landmarkKeepOuts() {
  if (keepOutCache) return keepOutCache;
  // Measure the actual rendered geometry. A circular exclusion around a long
  // market/station previously erased several neighbouring streets of buildings.
  keepOutCache = buildLandmarkPlan().entries.map(entry => {
    const rot = -(entry.data.rot || 0) * Math.PI / 180, c = Math.cos(rot), s = Math.sin(rot);
    let u0=Infinity,u1=-Infinity,v0=Infinity,v1=-Infinity;
    for(const geometry of entry.geometries.values()) {
      const p=geometry.attributes.position;
      for(let i=0;i<p.count;i++) {
        const x=p.getX(i)-entry.world.x,z=p.getZ(i)-entry.world.z;
        const u=x*c-z*s,v=x*s+z*c;
        u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v);
      }
      geometry.dispose();
    }
    const u=(u0+u1)/2,v=(v0+v1)/2;
    return {id:entry.id,x:entry.world.x+u*c+v*s,z:entry.world.z-u*s+v*c,w:u1-u0+12,d:v1-v0+12,rotY:rot};
  });
  return keepOutCache;
}

function inKeepOut(x, z, keepOuts) {
  for (const k of keepOuts) {
    const dx = x - k.x, dz = z - k.z, c = Math.cos(k.rotY), s = Math.sin(k.rotY);
    if (Math.abs(dx*c-dz*s)<k.w/2 && Math.abs(dx*s+dz*c)<k.d/2) return true;
  }
  return false;
}

/**
 * 生成全部地块。
 * @returns {{ lots: Array, roads: Array, stats: Object }}
 */
export function generateCity(seed = 20240622) {
  const rnd = mulberry32(seed);
  const districts = buildDistrictList().map(d => {
    const { x, z } = lonLatToWorld(d.lon, d.lat);
    return { ...d, cx: x, cz: z, rad: d.rot * Math.PI / 180 };
  });
  const keepOuts = landmarkKeepOuts();

  const lots = [];
  const roads = [];
  const pavements = [];
  const parks = [];
  const occupied = createSpatialIndex();
  // Weighted district ownership prevents several differently rotated grids being
  // drawn on the same block. Hillside housing fills the land beyond urban centres.
  const owner = (x, z) => {
    let best = null, score = Infinity;
    for (const d of districts) {
      const dist = Math.hypot(x - d.cx, z - d.cz) / d.r;
      if (dist > 1) continue;
      const weight = dist + (d.hillside ? 0.85 : 0);
      if (weight < score) { score = weight; best = d.id; }
    }
    return best;
  };
  const addLot = (lot, district) => {
    // Keep the full buildable parcel clear, including its future podium/details.
    const corners = footprint(lot);
    if ([{ x: lot.x, z: lot.z }, ...corners].some(p => {
      const ll = worldToLonLat(p.x, p.z);
      return !isLand(ll.lon, ll.lat) || owner(p.x, p.z) !== district.id;
    })) return;
    if (keepOuts.some(k => Math.hypot(lot.x - k.x, lot.z - k.z) < (Math.hypot(lot.w,lot.d)+Math.hypot(k.w,k.d))/2 + 8 && overlaps(lot,k,4))) return;
    if (occupied.nearby(lot).some(other => overlaps(lot, other, 3))) return;
    const heights = corners.map(p => sampleHeight(p.x, p.z));
    const lo = Math.min(sampleHeight(lot.x, lot.z), ...heights), hi = Math.max(...heights);
    if (lo < 1.2 || hi - lo > (district.hillside ? 30 : 14)) return;
    lot.base = lo - 0.5;
    lot.spread = hi - lo;
    lot.boxH = lot.h + lot.spread + 1;
    lot.seed = ((Math.round(lot.x * 10) * 73856093) ^ (Math.round(lot.z * 10) * 19349663) ^ seed) >>> 0;
    occupied.insert(lot);
    if (rnd() < (district.hillside ? 0.06 : 0.055) && lot.w > 20 && lot.d > 20) parks.push(lot);
    else lots.push(lot);
  };

  for (const d of districts) {
    const nu = Math.ceil(d.r / d.blockU) + 1;
    const nv = Math.ceil(d.r / d.blockV) + 1;
    const dSeed = d.lon * 1000 + d.lat;

    // ---------- 街道带（沿每条网格线）：人行道在下、车道在上 ----------
    emitRoadStrips(d, nu, nv, pavements, roads, owner);

    // ---------- 地块 ----------
    for (let i = -nu; i < nu; i++) {
      for (let j = -nv; j < nv; j++) {
        const u0 = i * d.blockU + d.roadU / 2;
        const v0 = j * d.blockV + d.roadV / 2;
        const w = d.blockU - d.roadU;
        const dp = d.blockV - d.roadV;
        if (w < 18 || dp < 18) continue;

        const cu = u0 + w / 2, cv = v0 + dp / 2;
        if (cu * cu + cv * cv > d.r * d.r) continue;

        // 局部 → 世界
        const cos = Math.cos(d.rad), sin = Math.sin(d.rad);
        const x = d.cx + cu * cos - cv * sin;
        const z = d.cz + cu * sin + cv * cos;
        if (owner(x, z) !== d.id) continue;

        // 陆海判定：中心 + 四角
        const { lon, lat } = worldToLonLat(x, z);
        if (!isLand(lon, lat)) continue;

        const hs = [
          sampleHeight(x - w / 2, z - dp / 2), sampleHeight(x + w / 2, z - dp / 2),
          sampleHeight(x - w / 2, z + dp / 2), sampleHeight(x + w / 2, z + dp / 2)
        ];
        const hMin = Math.min(...hs), hMax = Math.max(...hs);
        const spread = hMax - hMin;

        // 山顶不建房；坡地上可建但要限幅 —— 香港大量住宅本身就落在 10°~20° 的坡上
        if (hMin > 230) continue;
        const maxSpread = d.hillside ? 30 : 14;
        if (spread > maxSpread) continue;
        if (hMin < 1.2) continue;                 // 潮间带 / 尚未填成陆地的边缘
        if (inKeepOut(x, z, keepOuts)) continue;

        // 立面族
        const fam = rnd() < d.w2 ? d.family2 : d.family;
        const fh = FLOOR_H[fam] || 3.2;

        // ---------- 高度 ----------
        const dist = Math.hypot(x - d.cx, z - d.cz);
        const t = clamp01(1 - dist / d.r);
        let h = d.hMin + (d.hMax - d.hMin) * Math.pow(t, d.falloff);
        // 分段噪声：把同心圆打碎，形成真实的起伏天际线
        h *= 0.68 + 0.62 * fbm(x * 0.0017 + dSeed, z * 0.0017 - dSeed, 3);
        // 临海地块溢价（维港两岸的景观地块更高）
        const sf = sampleHeight(x, z);
        if (sf < 8) h *= 1.10;
        h = Math.min(h, d.cap);
        // 楼层量化
        h = Math.max(fh * 2, Math.round(h / fh) * fh);
        h = Math.min(h, d.cap);
        // 逐地块抖动，避免整片同高
        h = Math.min(d.cap, Math.max(fh * 2, Math.round((h * (0.88 + 0.24 * rnd())) / fh) * fh));
        // Street architecture follows its own storey range: an old tiled shop
        // house must not inherit the surrounding CBD's 180 m tower envelope.
        if (/tileOld|mosaic|brick/.test(fam)) {
          const floors = (fam === 'brick' ? 5 : 7) + Math.floor(fbm(x*.017+7,z*.017-11,2)*10);
          h = Math.min(h, floors * fh);
        }

        // ---------- 分槽 ----------
        const oldTown = /tileOld|mosaic|brick/.test(fam);
        const parts = oldTown ? Math.max(2, Math.min(d.slot, Math.floor(w / 18)))
          : w > 75 && rnd() < 0.56 ? 2 : 1;

        if (parts === 1) {
          addLot(makeLot(x, z, w - 12, dp - 12, d.rad, h, fam, fh, hMin, spread, d.id), d);
        } else {
          // 沿长边二分，中间留 4m 消防通道
          const alongU = oldTown || w >= dp;
          const seg = (alongU ? w : dp) / parts;
          for (let k = 0; k < parts; k++) {
            const off = (k - (parts - 1) / 2) * seg;
            const su = alongU ? cu + off : cu;
            const sv = alongU ? cv : cv + off;
            const lx = d.cx + su * cos - sv * sin;
            const lz = d.cz + su * sin + sv * cos;
            if (inKeepOut(lx, lz, keepOuts)) continue;
            const lw = alongU ? seg - 7 : w - 12;
            const ld = alongU ? dp - 12 : seg - 7;
            if (lw < 14 || ld < 14) continue;
            const lh = Math.min(d.cap, Math.round((h * (0.64 + 0.52 * rnd())) / fh) * fh);
            addLot(makeLot(lx, lz, lw, ld, d.rad, Math.max(fh * 2, lh), fam, fh, hMin, spread, d.id), d);
          }
        }
      }
    }
  }

  // Cull orphan roads on empty slopes and roads through landmark grounds.
  const filterRoads = flat => {
    const kept=[];
    for(let i=0;i<flat.length;i+=12){
      const x=(flat[i]+flat[i+6])/2,z=(flat[i+2]+flat[i+8])/2;
      if(inKeepOut(x,z,keepOuts))continue;
      const near=occupied.nearby({x,z,w:100,d:100,rotY:0});
      if(!near.some(l=>Math.hypot(x-l.x,z-l.z)<Math.hypot(l.w,l.d)/2+55))continue;
      kept.push(...flat.slice(i,i+12));
    }
    flat.length=0; for(const n of kept) flat.push(n);
  };
  filterRoads(roads);filterRoads(pavements);

  // ---------- 统计 ----------
  const byFamily = {};
  let tallest = null, maxH = -1;
  for (const l of lots) {
    byFamily[l.family] = (byFamily[l.family] || 0) + 1;
    if (l.h > maxH) { maxH = l.h; tallest = l; }
  }

  return {
    lots,
    roads,
    pavements,
    parks,
    stats: {
      count: lots.length,
      maxHeight: maxH,
      tallestDistrict: tallest ? tallest.district : null,
      byFamily,
      districts: districts.length,
      roadQuads: roads.length / 12,
      pavementQuads: pavements.length / 12,
      parks: parks.length
    }
  };
}

function makeLot(x, z, w, d, rot, h, family, floorH, hMin, spread, district) {
  // 体量下沉到地形以下，避免在斜坡上悬空或露缝。
  // rot 是城区的街道主轴角（局部 u 轴指向世界 (cosθ, sinθ)）；
  // 换算成 three.js 的 Y 轴旋转角为 -θ（见 buildings.js 的矩阵组装）。
  const base = hMin - 0.5;
  return {
    x, z, w, d,
    rotY: -rot,
    family,
    floorH,
    h,                                  // 目标可见高度
    base,                               // 盒体底面
    boxH: h + spread + 3.5,            // 盒体实际高度（含埋入坡体部分）
    spread,
    district
  };
}

/**
 * 沿城区网格线发出路面带。每个带按 SEG 段切分并逐角贴合地形高度，
 * 避免在山坡上穿地或悬空。
 * 路面带的坐标存在 roads[] 里，渲染时展开为扁平三角面。
 */
function emitRoadStrips(d, nu, nv, pavements, roads, owner) {
  const SEG = 30;
  const cos = Math.cos(d.rad), sin = Math.sin(d.rad);
  const wx = (u, v) => d.cx + u * cos - v * sin;
  const wz = (u, v) => d.cz + u * sin + v * cos;
  const hAt = (u, v) => sampleHeight(wx(u, v), wz(u, v));
  // 每个带输出两圈：外圈人行道（抬高 0.10m），内圈车道（0.22m）——
  // 从空中看下去，"路 + 人行道"的明暗分层正是街道网格可读的关键。
  //
  // 陡坡段直接丢弃：路面只按四角采样地形，坡度过大时长条面片会切进山体，
  // 在半山住宅区表现为一层层横切的白色条纹，比没有路更难看。
  const MAX_DROP = 8;
  const quad = (arr, lift, u0, v0, u1, v1) => {
    const points = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    if (points.some(([u, v]) => {
      const x = wx(u, v), z = wz(u, v), ll = worldToLonLat(x, z);
      return !isLand(ll.lon, ll.lat) || owner(x, z) !== d.id;
    })) return false;
    const y00 = hAt(u0, v0), y01 = hAt(u0, v1), y10 = hAt(u1, v0), y11 = hAt(u1, v1);
    if (Math.min(y00, y01, y10, y11) < 1.2) return false;
    if (Math.max(y00, y01, y10, y11) > 190) return false;
    if (Math.max(y00, y01, y10, y11) - Math.min(y00, y01, y10, y11) > MAX_DROP) return false;
    const L = lift;
    arr.push(
      wx(u0, v0), y00 + L, wz(u0, v0),
      wx(u1, v0), y10 + L, wz(u1, v0),
      wx(u1, v1), y11 + L, wz(u1, v1),
      wx(u0, v1), y01 + L, wz(u0, v1)
    );
    return true;
  };
  const strip = (u, v, v1, hw, hwOut) => {
    quad(pavements, 0.10, u - hwOut, v, u + hwOut, v1);
    quad(roads, 0.22, u - hw, v, u + hw, v1);
  };

  // 南北向街道带（沿 v 延伸）
  for (let i = -nu; i <= nu; i++) {
    const u = i * d.blockU;
    const half = Math.sqrt(Math.max(0, d.r * d.r - u * u));
    if (half < 20) continue;
    const hw = d.roadU / 2;
    for (let v = -half; v < half - 1; v += SEG) {
      strip(u, v, Math.min(v + SEG, half), hw, hw + 5.5);
    }
  }

  // 东西向街道带（沿 u 延伸）
  for (let j = -nv; j <= nv; j++) {
    const v = j * d.blockV;
    const half = Math.sqrt(Math.max(0, d.r * d.r - v * v));
    if (half < 20) continue;
    const hw = d.roadV / 2;
    for (let u = -half; u < half - 1; u += SEG) {
      const u1 = Math.min(u + SEG, half);
      quad(pavements, 0.10, u, v - hw - 4.5, u1, v + hw + 4.5);
      quad(roads, 0.22, u, v - hw, u1, v + hw);
    }
  }
}
