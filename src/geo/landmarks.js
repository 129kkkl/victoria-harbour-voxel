// 23 个地标参数表 —— 种子化项目的城市地标单一数据源。
//
// 坐标约定与 coastline.js 一致（[经度, 纬度]）。高度为结构高度（m），非屋面高度。
// 除 ICC（22.30339°N, 114.16017°E，已按公开资料核验）外，其余锚点坐标为
// ±150m 级近似 —— 在 1m 体素 / 6.4km 视距下不影响天际线判读，M3 精建时再收紧。
//
// shape 键由 src/city/landmarkBuilder.js 解释为体量语言（M2 为骨架体量，M3 精建）：
//   tower      矩形退台塔楼      cylinder  圆台
//   boc        贝聿铭三角锥      truss     外露桁架低层体量
//   clocktower 塔身+钟室+尖顶     dome      蛋形屋顶
//   seagull    四尖翼            flat      低矮大跨场馆
//   colonnade  殖民地柱廊         podium    裙房+塔楼
//   wedge      楔形              promenade 铺装步行带
//   terrace    山顶平台

export const LANDMARKS = [
  // ================= 南岸 · 香港岛（西 → 东） =================
  {
    id: 'western-market', name: '西港城', year: 1906, use: '市集 / 活化历史建筑',
    lon: 114.1432, lat: 22.2856, h: 26, w: 110, d: 62, rot: 4,
    shape: 'colonnade', family: 'brick'
  },
  {
    id: 'shun-tak', name: '招商局大厦', year: 1986, use: '甲级写字楼',
    lon: 114.1440, lat: 22.2862, h: 152, w: 42, d: 42, rot: 4,
    shape: 'tower', family: 'glass'
  },
  {
    id: 'lippo', name: '力宝中心', year: 1986, use: '甲级写字楼',
    lon: 114.1655, lat: 22.2790, h: 186, w: 46, d: 46, rot: 0,
    shape: 'tower', family: 'glass'
  },
  {
    id: 'admiralty', name: '海富中心', year: 1980, use: '甲级写字楼',
    lon: 114.1650, lat: 22.2802, h: 216, w: 42, d: 42, rot: 0,
    shape: 'tower', family: 'glass'
  },
  {
    id: 'ifc1', name: '国际金融中心 1 座', year: 2003, use: '甲级写字楼',
    lon: 114.1586, lat: 22.2850, h: 367, w: 48, d: 48, rot: 0,
    shape: 'cylinder', family: 'glass'
  },
  {
    id: 'ifc2', name: '国际金融中心 2 座', year: 2003, use: '甲级写字楼',
    lon: 114.1600, lat: 22.2835, h: 415, w: 52, d: 52, rot: 0,
    shape: 'cylinder', family: 'glass'
  },
  {
    id: 'boc', name: '中银大厦', year: 1990, use: '中国银行总部 · 贝聿铭',
    lon: 114.1613, lat: 22.2793, h: 315, w: 52, d: 52, rot: 0,
    shape: 'boc', family: 'glass'
  },
  {
    id: 'hsbc', name: '汇丰总行', year: 1985, use: '汇丰银行总部 · 贝聿铭',
    lon: 114.1596, lat: 22.2811, h: 60, w: 110, d: 72, rot: 2,
    shape: 'truss', family: 'concrete'
  },
  {
    id: 'star-ferry-clock', name: '中环天星码头钟楼', year: 1915, use: '爱德华时期钟楼',
    lon: 114.1600, lat: 22.2850, h: 40, w: 12, d: 12, rot: 0,
    shape: 'clocktower', family: 'colonial'
  },
  {
    id: 'legco', name: '立法会综合大楼', year: 1998, use: '立法会总部',
    lon: 114.1655, lat: 22.2833, h: 42, w: 96, d: 46, rot: 12,
    shape: 'wedge', family: 'granite'
  },
  {
    id: 'hkcec', name: '香港会议展览中心', year: 2005, use: '展览场馆',
    lon: 114.1731, lat: 22.2830, h: 25, w: 300, d: 170, rot: 12,
    shape: 'flat', family: 'glass'
  },
  {
    id: 'hkcec-tower', name: '香港会议展览中心 洲际酒店', year: 2005, use: '酒店',
    lon: 114.1752, lat: 22.2828, h: 118, w: 40, d: 40, rot: 12,
    shape: 'tower', family: 'glass'
  },
  {
    id: 'hkcc', name: '湾仔香港会议中心', year: 1989, use: '会议中心 · 海鸥顶',
    lon: 114.1736, lat: 22.2825, h: 40, w: 130, d: 70, rot: 12,
    shape: 'seagull', family: 'granite'
  },
  {
    id: 'central-plaza', name: '中环广场', year: 1992, use: '甲级写字楼 · 三棱镜',
    lon: 114.1720, lat: 22.2797, h: 181, w: 44, d: 44, rot: 9,
    shape: 'tower', family: 'glass'
  },
  {
    id: 'times-square', name: '铜锣湾时代广场', year: 1997, use: '甲级写字楼 / 商场',
    lon: 114.1840, lat: 22.2783, h: 216, w: 44, d: 44, rot: 16,
    shape: 'tower', family: 'glass'
  },
  {
    id: 'victoria-peak', name: '太平山顶观景台', year: 1972, use: '观景平台 · 山顶缆车',
    lon: 114.1508, lat: 22.2698, h: 22, w: 46, d: 30, rot: 0,
    shape: 'terrace', family: 'granite', onPeak: true
  },

  // ================= 北岸 · 九龙（西 → 东） =================
  {
    id: 'icc', name: '环球贸易广场 ICC', year: 2010, use: '甲级写字楼 · 香港最高',
    lon: 114.16017, lat: 22.30339, h: 484, w: 54, d: 54, rot: 0,
    shape: 'tower', family: 'glass', verified: true
  },
  {
    id: 'west-kowloon-station', name: '九龙站 / 西九龙站', year: 2018, use: '高铁总站',
    lon: 114.1616, lat: 22.3057, h: 34, w: 420, d: 130, rot: 0,
    shape: 'flat', family: 'metal'
  },
  {
    id: 'wkcd', name: '西九龙文化区 M+ 博物馆', year: 2021, use: '当代艺术博物馆',
    lon: 114.1512, lat: 22.3028, h: 40, w: 180, d: 90, rot: 8,
    shape: 'flat', family: 'concrete'
  },
  {
    id: 'ts-clock-tower', name: '尖沙咀钟楼', year: 1888, use: '维多利亚时期地标',
    lon: 114.1700, lat: 22.2950, h: 51, w: 13, d: 13, rot: 0,
    shape: 'clocktower', family: 'colonial'
  },
  {
    id: 'cultural-centre', name: '香港文化中心', year: 1989, use: '表演场馆 · 蛋形屋顶',
    lon: 114.1702, lat: 22.2952, h: 45, w: 120, d: 80, rot: 3,
    shape: 'dome', family: 'granite'
  },
  {
    id: 'avenue-of-stars', name: '星光大道', year: 2004, use: '海滨步行带',
    lon: 114.1725, lat: 22.2944, h: 6, w: 620, d: 44, rot: 3,
    shape: 'promenade', family: 'granite'
  },
  {
    id: 'peninsula', name: '半岛酒店', year: 1928, use: '奢华酒店 · 殖民地风格',
    lon: 114.1708, lat: 22.2950, h: 100, w: 36, d: 36, rot: 3,
    shape: 'colonnade', family: 'colonial'
  },
  {
    id: 'harbour-city', name: '海港城', year: 1984, use: '购物中心 / 写字楼',
    lon: 114.1717, lat: 22.2946, h: 110, w: 52, d: 52, rot: 3,
    shape: 'podium', family: 'glass'
  },
  {
    id: 'renaissance', name: '擎天半岛酒店', year: 1990, use: '五星级酒店',
    lon: 114.1735, lat: 22.2946, h: 118, w: 36, d: 36, rot: 3,
    shape: 'tower', family: 'glass'
  },
  {
    id: 'new-world-centre', name: '海逸酒店 / 新世界中心', year: 2007, use: '五星级酒店',
    lon: 114.1748, lat: 22.2950, h: 187, w: 38, d: 38, rot: 3,
    shape: 'tower', family: 'glass'
  },
  {
    id: 'wong-won-plaza', name: '永安广场', year: 1987, use: '甲级写字楼',
    lon: 114.1757, lat: 22.2953, h: 187, w: 38, d: 38, rot: 3,
    shape: 'tower', family: 'glass'
  },
  {
    id: 'hang-lung', name: '恒隆广场', year: 1997, use: '甲级写字楼 / 商场',
    lon: 114.1685, lat: 22.3058, h: 213, w: 42, d: 42, rot: 20,
    shape: 'tower', family: 'glass'
  },
  {
    id: 'langham-place', name: '朗豪坊', year: 2004, use: '甲级写字楼 / 酒店',
    lon: 114.1678, lat: 22.3082, h: 148, w: 40, d: 40, rot: 20,
    shape: 'tower', family: 'glass'
  },
  {
    id: 'temple-street', name: '庙街 / 油麻地霓虹区', year: 1980, use: '市井商业带',
    lon: 114.1755, lat: 22.3072, h: 32, w: 620, d: 160, rot: 12,
    shape: 'podium', family: 'tileOld', neonZone: true
  },
  {
    id: 'hung-hom-stadium', name: '红磡体育馆', year: 1999, use: '演唱会场馆',
    lon: 114.1830, lat: 22.3032, h: 40, w: 200, d: 170, rot: 10,
    shape: 'dome', family: 'metal'
  },
  {
    id: 'kai-tak-cruise', name: '启德邮轮码头', year: 2013, use: '邮轮母港',
    lon: 114.1990, lat: 22.3150, h: 65, w: 240, d: 110, rot: 130,
    shape: 'flat', family: 'metal'
  }
];

/** 太平山顶缆车：Garden Road 站 → 山顶站（M2 画索道，M4 再加吊厢运动）。 */
export const PEAK_TRAMWAY = {
  name: '太平山顶缆车',
  from: [114.1462, 22.2845],
  to: [114.1508, 22.2698]
};

export const LANDMARK_INDEX = new Map(LANDMARKS.map(l => [l.id, l]));