// 程序化海岸线：真实维港轮廓的锚点折线多边形（种子化项目的单一地理数据源）。
// 坐标为 [经度, 纬度]，按边界顺序排列。包含填海区（西九龙、启德）与离岛（青洲、昂船洲）。
import { FAR } from './bounds.js';
import { worldToLonLat } from './projection.js';

// 香港岛：北岸自西向东精确锚点，南岸粗描闭合
// 注意：北岸坐标取"真实水岸线"，而非渡轮码头坐标 —— 湾仔 / 中环的渡轮码头是
// 伸出海面的栈桥，其纬度比岸线低 200m 以上。直接用码头坐标会把整条岸线画低，
// 连带把会展中心、立法会、中银大厦等一整排滨水地标推进海里去。
const HK_ISLAND = [
  // 北岸（维港）西 → 东：坚尼地城 → 上环 → 中环 → 湾仔 → 铜锣湾
  [114.1280, 22.2860], [114.1330, 22.2872], [114.1380, 22.2880], [114.1430, 22.2880],
  [114.1480, 22.2878], [114.1520, 22.2875], [114.1550, 22.2870], [114.1585, 22.2860],
  [114.1615, 22.2850], [114.1645, 22.2845], [114.1675, 22.2840], [114.1700, 22.2838],
  [114.1731, 22.2836], [114.1760, 22.2832], [114.1800, 22.2830], [114.1840, 22.2836],
  // 北角 → 天后 → 鰂魚涌（海灣內凹）→ 筲箕灣 → 柴灣
  [114.1875, 22.2855], [114.1915, 22.2888], [114.1965, 22.2905], [114.2015, 22.2872],
  [114.2065, 22.2845], [114.2110, 22.2855], [114.2160, 22.2888], [114.2225, 22.2885],
  [114.2285, 22.2870], [114.2340, 22.2838], [114.2395, 22.2812],
  // 南岸（回填闭合）
  [114.2420, 22.2720], [114.2360, 22.2640], [114.2200, 22.2580], [114.2000, 22.2540],
  [114.1800, 22.2515], [114.1600, 22.2505], [114.1450, 22.2540], [114.1340, 22.2620],
  [114.1285, 22.2720]
];

// 九龙半岛：西九龙填海（西九龙文化区 / 九龙站 Union Square / ICC）→ 尖沙咀西岸
// → 佐敦渡轮码头 → 尖东 → 红磡 → 绕行启德跑道基座 → 观塘 → 鲤鱼门
const KOWLOON = [
  [114.1400, 22.3400], [114.1470, 22.3360], [114.1478, 22.3230], [114.1486, 22.3105],
  [114.1494, 22.3060], [114.1512, 22.3022], [114.1545, 22.3028], [114.1580, 22.3030],
  [114.1620, 22.3033], [114.1650, 22.3046], [114.1672, 22.3026], [114.1686, 22.2992],
  [114.1694, 22.2950],
  [114.1722, 22.2942], [114.1750, 22.2948],
  [114.1782, 22.2958], [114.1810, 22.2982], [114.1836, 22.3004], [114.1860, 22.3024],
  [114.1882, 22.3048], [114.1908, 22.3072], [114.1940, 22.3096], [114.1975, 22.3104],
  [114.2010, 22.3092], [114.2060, 22.3105], [114.2120, 22.3120], [114.2180, 22.3110],
  [114.2235, 22.3092], [114.2290, 22.3048], [114.2340, 22.2985],
  [114.2395, 22.2925], [114.2395, 22.3650], [114.1400, 22.3650]
];

// 启德旧跑道填海平台（13/31 跑道，bearing ≈ 130°，长约 3km，退役后 2013 年启用邮轮码头）。
// 现状已不再是细长指廊，而是一片宽约 400m 的长条填地，从九龙城伸向维港东南。
const KAI_TAK = [
  [114.1920, 22.3185], [114.1955, 22.3172], [114.2190, 22.3040], [114.2160, 22.3018]
];

// 青洲（小青洲）—— 维港西口离岛
const greenIsland = (() => {
  const pts = [], cx = 114.1115, cy = 22.2875;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * 0.0011, cy + Math.sin(a) * 0.00085]);
  }
  return pts;
})();

// 昂船洲
const STONECUTTERS = [
  [114.1095, 22.3160], [114.1115, 22.3215], [114.1155, 22.3210], [114.1160, 22.3165]
];

export const LAND_POLYGONS = [
  { id: 'hk-island', pts: HK_ISLAND },
  { id: 'kowloon', pts: KOWLOON },
  { id: 'kai-tak', pts: KAI_TAK },
  { id: 'green-island', pts: greenIsland },
  { id: 'stonecutters', pts: STONECUTTERS }
];

// 包围盒预筛：城市生成阶段 isLand 会被调用十万次以上，
// 先用 O(1) 的矩形排除掉绝大多数查询点，比逐边判定快一个数量级。
for (const p of LAND_POLYGONS) {
  let lo0 = Infinity, lo1 = Infinity, hi0 = -Infinity, hi1 = -Infinity;
  for (const [a, b] of p.pts) {
    if (a < lo0) lo0 = a; if (a > hi0) hi0 = a;
    if (b < lo1) lo1 = b; if (b > hi1) hi1 = b;
  }
  p.bbox = [lo0, lo1, hi0, hi1];
}

function pointInPolygon(lon, lat, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > lat) !== (yj > lat) &&
        lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function isLand(lon, lat) {
  for (const p of LAND_POLYGONS) {
    const b = p.bbox;
    if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
    if (pointInPolygon(lon, lat, p.pts)) return true;
  }
  return false;
}

// 岸线系数：1=内陆深处，0=海。在岸线上平滑过渡（采样半径 ~40m）。
export function shoreFactor(lon, lat) {
  const c = isLand(lon, lat);
  const dLon = 40 / 103000, dLat = 40 / 110734;
  let landCount = c ? 1 : 0;
  let total = 1;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    if (isLand(lon + Math.cos(a) * dLon, lat + Math.sin(a) * dLat)) landCount++;
    total++;
  }
  if (landCount === total) return 1;
  if (landCount === 0) return 0;
  const t = landCount / total;
  return t * t * (3 - 2 * t); // smoothstep
}

// 陆地掩码 Canvas 纹理（供海面泡沫/浅滩着色）。模糊边缘形成岸线渐变带。
export function makeLandMaskCanvas(width = 1024, blurPx = 3) {
  const height = Math.round(width *
    ((FAR.latMax - FAR.latMin) / (FAR.lonMax - FAR.lonMin)));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  const sx = width / (FAR.lonMax - FAR.lonMin);
  const sy = height / (FAR.latMax - FAR.latMin);
  ctx.filter = `blur(${blurPx}px)`;
  ctx.fillStyle = '#fff';
  for (const poly of LAND_POLYGONS) {
    ctx.beginPath();
    poly.pts.forEach(([lon, lat], i) => {
      const px = (lon - FAR.lonMin) * sx;
      const py = (FAR.latMax - lat) * sy; // 北在上
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
  }
  ctx.filter = 'none';
  return canvas;
}

export function worldIsLand(x, z) {
  const { lon, lat } = worldToLonLat(x, z);
  return isLand(lon, lat);
}
