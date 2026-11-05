// 城区数据表：每个城区的中心、半径、街道网格朝向、地块尺寸、高度带与立面族。
//
// 高度带（hMin/hMax/cap）是"天际线成立"的核心控制量：
//   中环 260m 级 → 湾仔 210m 级 → 尖沙咀/旺角 190/215m 级 → 铜锣湾 130m 级
//   → 油麻地 70m 级（旧楼带）→ 山腰 60m 级 —— 与真实香港的城市剖面一致。
//
// 坐标系：经纬度定义中心点（与 coastline.js / landmarks.js 同一数据源约定），
// rot 为街道主轴相对世界 +X（正东）的角度（度）。香港各区街道网朝向确实不同：
// 中环接近正交，旺角 / 油麻地带 20° 左右的斜网格，观塘一带可达 35°。

export const DISTRICTS = [
  // ================= 香港岛 · 北岸城市带 =================
  {
    id: 'sheung-wan', name: '上环 / 西环', side: 'island',
    lon: 114.1420, lat: 22.2830, r: 750, rot: 4,
    blockU: 105, blockV: 85, roadU: 20, roadV: 14,
    hMin: 24, hMax: 95, cap: 130, falloff: 1.6,
    family: 'granite', family2: 'brick', w2: 0.45, slot: 3
  },
  {
    id: 'central', name: '中环', side: 'island',
    lon: 114.1585, lat: 22.2815, r: 1150, rot: 2,
    blockU: 115, blockV: 90, roadU: 24, roadV: 16,
    hMin: 55, hMax: 260, cap: 300, falloff: 1.9,
    family: 'glass', family2: 'concrete', w2: 0.40, slot: 2
  },
  {
    id: 'wan-chai', name: '湾仔', side: 'island',
    lon: 114.1725, lat: 22.2795, r: 1000, rot: 9,
    blockU: 115, blockV: 85, roadU: 22, roadV: 15,
    hMin: 42, hMax: 210, cap: 240, falloff: 1.8,
    family: 'glass', family2: 'concrete', w2: 0.45, slot: 2
  },
  {
    id: 'causeway-bay', name: '铜锣湾', side: 'island',
    lon: 114.1830, lat: 22.2790, r: 1000, rot: 16,
    blockU: 100, blockV: 80, roadU: 20, roadV: 14,
    hMin: 32, hMax: 130, cap: 175, falloff: 1.7,
    family: 'glass', family2: 'tileOld', w2: 0.50, slot: 3
  },
  {
    id: 'north-point', name: '北角', side: 'island',
    lon: 114.1985, lat: 22.2870, r: 850, rot: 22,
    blockU: 95, blockV: 75, roadU: 18, roadV: 13,
    hMin: 24, hMax: 110, cap: 140, falloff: 1.6,
    family: 'concrete', family2: 'tileOld', w2: 0.50, slot: 3
  },
  {
    id: 'quarry-bay', name: '鰂鱼涌 / 太古', side: 'island',
    lon: 114.2135, lat: 22.2860, r: 760, rot: 28,
    blockU: 100, blockV: 80, roadU: 20, roadV: 14,
    hMin: 28, hMax: 145, cap: 180, falloff: 1.7,
    family: 'glass', family2: 'concrete', w2: 0.45, slot: 2
  },
  {
    id: 'shau-kei-wan', name: '筲箕湾', side: 'island',
    lon: 114.2250, lat: 22.2838, r: 800, rot: 34,
    blockU: 95, blockV: 70, roadU: 18, roadV: 13,
    hMin: 22, hMax: 95, cap: 130, falloff: 1.6,
    family: 'concrete', family2: 'tileOld', w2: 0.55, slot: 3
  },
  // 半山 / 山腰住宅：香港的标志性地貌 —— 山坡上密密麻麻的中层住宅，
  // 与山顶缆车、太平山 552m 共同构成"城市峡谷"的南壁。
  {
    id: 'mid-levels', name: '半山 / 山腰住宅', side: 'island',
    lon: 114.1680, lat: 22.2700, r: 2600, rot: 12,
    blockU: 62, blockV: 48, roadU: 12, roadV: 9,
    hMin: 20, hMax: 62, cap: 92, falloff: 1.2,
    family: 'concrete', family2: 'granite', w2: 0.55, slot: 4,
    hillside: true
  },

  // ================= 九龙 · 北岸城市带 =================
  {
    id: 'west-kowloon', name: '西九龙', side: 'kowloon',
    lon: 114.1580, lat: 22.3050, r: 780, rot: 8,
    blockU: 110, blockV: 85, roadU: 22, roadV: 15,
    hMin: 20, hMax: 140, cap: 180, falloff: 1.7,
    family: 'glass', family2: 'concrete', w2: 0.45, slot: 2
  },
  {
    id: 'tsim-sha-tsui', name: '尖沙咀', side: 'kowloon',
    lon: 114.1715, lat: 22.2960, r: 800, rot: 3,
    blockU: 110, blockV: 85, roadU: 22, roadV: 15,
    hMin: 38, hMax: 190, cap: 215, falloff: 1.7,
    family: 'glass', family2: 'granite', w2: 0.40, slot: 2
  },
  {
    id: 'jordan', name: '佐敦', side: 'kowloon',
    lon: 114.1760, lat: 22.2960, r: 650, rot: 6,
    blockU: 95, blockV: 75, roadU: 18, roadV: 13,
    hMin: 24, hMax: 85, cap: 110, falloff: 1.5,
    family: 'tileOld', family2: 'mosaic', w2: 0.55, slot: 3
  },
  {
    id: 'yau-ma-tei', name: '油麻地', side: 'kowloon',
    lon: 114.1820, lat: 22.3000, r: 700, rot: 12,
    blockU: 85, blockV: 65, roadU: 16, roadV: 12,
    hMin: 18, hMax: 70, cap: 95, falloff: 1.4,
    family: 'mosaic', family2: 'tileOld', w2: 0.55, slot: 4
  },
  {
    id: 'mong-kok', name: '旺角', side: 'kowloon',
    lon: 114.1690, lat: 22.3055, r: 1000, rot: 20,
    blockU: 90, blockV: 70, roadU: 20, roadV: 14,
    hMin: 28, hMax: 215, cap: 235, falloff: 1.8,
    family: 'concrete', family2: 'tileOld', w2: 0.45, slot: 3
  },
  {
    id: 'sham-shui-po', name: '深水埗', side: 'kowloon',
    lon: 114.1620, lat: 22.3170, r: 800, rot: 14,
    blockU: 85, blockV: 65, roadU: 16, roadV: 12,
    hMin: 14, hMax: 60, cap: 80, falloff: 1.4,
    family: 'mosaic', family2: 'tileOld', w2: 0.55, slot: 4
  },
  {
    id: 'hung-hom', name: '红磡', side: 'kowloon',
    lon: 114.1870, lat: 22.3060, r: 800, rot: 10,
    blockU: 105, blockV: 80, roadU: 20, roadV: 14,
    hMin: 18, hMax: 80, cap: 110, falloff: 1.5,
    family: 'concrete', family2: 'mosaic', w2: 0.5, slot: 3
  },
  {
    id: 'kai-tak', name: '启德', side: 'kowloon',
    lon: 114.1930, lat: 22.3130, r: 760, rot: 18,
    blockU: 105, blockV: 80, roadU: 20, roadV: 14,
    hMin: 22, hMax: 95, cap: 130, falloff: 1.6,
    family: 'concrete', family2: 'tileOld', w2: 0.5, slot: 3
  },
  {
    id: 'kowloon-bay', name: '观塘', side: 'kowloon',
    lon: 114.2100, lat: 22.3150, r: 800, rot: 35,
    blockU: 110, blockV: 85, roadU: 20, roadV: 14,
    hMin: 24, hMax: 110, cap: 150, falloff: 1.7,
    family: 'industrial', family2: 'concrete', w2: 0.5, slot: 3
  }
];

/** 返回预计算了世界坐标与朝向弧度的城区表。 */
export function buildDistrictList() {
  return DISTRICTS.map(d => ({
    ...d,
    rad: d.rot * Math.PI / 180,
    cos: Math.cos(d.rot * Math.PI / 180),
    sin: Math.sin(d.rot * Math.PI / 180)
  }));
}