// 程序化材质：全部用 Canvas 离屏生成，无任何外部贴图依赖。
//
// 每个立面族产出三张图：
//   map   RGB —— 反照率（墙体 / 窗框 / 玻璃变体 / 楼板线 / 空调机位 / 招牌带）
//   mr    G=粗糙度, B=金属度 —— 玻璃低粗糙+高金属，混凝土高粗糙+零金属
//   emis  R=夜间窗光掩码（逐窗随机点亮）；B=窗光冷暖（上中部楼层）；
//         招牌带处 G=霓虹强度，B=霓虹色相（M4 约定不变）
//
// 三张图的窗洞位置由同一段几何计算绘制，因此法线/金属度/夜间光三者严格对齐。
//
// 细节层级（M5）：贴图升到 512²、6×6 开间 —— 每开间 ~85px，窗框、窗台、
// 楼板线、窗帘/百叶/反光玻璃变体都可分辨；重复周期也从 4 开间拉到 6 开间。

import * as THREE from 'three';

const TEX = 512;      // 贴图边长（px）
export const CELLS = 6;  // 每张贴图 6×6 个开间×楼层，UV 由世界尺度换算

function hash(i, seed) {
  return hash01(i, seed);
}

// 高均匀度哈希（mulberry32 混合）：窗光点亮 / 霓虹色相用。
// 注意：上面的 hash() 对"小步长整数 + 百位种子"的输入组合分布严重偏低
// （16 格窗全员 < 0.5），M2 起窗光点亮率只有设计的零头。albedo 侧沿用旧
// hash 保持昼间观感不变；所有"夜间发光"的判定一律走 hash01。
function hash01(i, seed) {
  let a = (i * 374761393 + seed * 668265263) | 0;
  a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function shade(hex, k) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return `#${c.getHexString()}`;
}

function newCanvas() {
  const cv = document.createElement('canvas');
  cv.width = TEX;
  cv.height = TEX;
  return cv;
}

/**
 * 立面族定义。bay / floor 为开间与层高（米），决定贴图在真实世界中的重复尺度。
 * litP = 夜间窗点亮率；curtainP / blindP = 玻璃变体占比；signH = 招牌带占层高的比例。
 */
export const FACADE_FAMILIES = {
  curtain: {
    bay: 3.0, floor: 4.2, wall: '#698b98', glass: '#759dad',
    winW: 0.97, winH: 0.94, winDY: 0.03, spandrel: '#597f90',
    mullion: 0.014, mullionColor: '#b8d0d4', roughness: [0.16,0.26],
    metalness: 0.42, tint: 0.88, seed: 149, winLight: [0.92,0.77,0.48],
    litP: 0.24, curtainP: 0.03, blindP: 0.06
  },
  // 玻璃幕墙塔楼： IFC / 中银 / ICC / 恒隆 —— 大玻璃、细竖梃、深色窗楣。
  // 玻璃占比刻意压到 0.78（真实幕墙约 0.65~0.75）：窗洞一旦接近满格，
  // 立面在阴影里就会读成一整块黑板，失去"混凝土/玻璃"的可分辨度。
  glass: {
    bay: 2.2, floor: 3.9, wall: '#82949a', glass: '#829fab',
    winW: 0.91, winH: 0.83, winDY: 0.06, spandrel: '#6b858d',
    mullion: 0.025, mullionColor: '#b8c8cb', roughness: [0.18, 0.30],
    metalness: 0.38, tint: 0.80, seed: 11, winLight: [0.88, 0.70, 0.43],
    litP: 0.32, curtainP: 0.05, blindP: 0.12
  },
  // 混凝土住宅 / 办公： 湾仔 / 北角 —— 横向窗带 + 混凝土墙墩
  concrete: {
    bay: 3.0, floor: 3.1, wall: '#a39d92', glass: '#45535c',
    winW: 0.66, winH: 0.44, winDY: 0.16, spandrel: null,
    mullion: 0.04, mullionColor: '#b9b2a5', roughness: [0.72, 0.86],
    metalness: 0.04, tint: 0.80, seed: 23,
    litP: 0.36, curtainP: 0.16, blindP: 0.10
  },
  // 六十年代唐楼： 油麻地 / 旺角 —— 小窗 + 窗台空调机位（港式标志）+ 临街招牌
  tileOld: {
    bay: 2.4, floor: 3.0, wall: '#b6ab99', glass: '#525f6a',
    winW: 0.46, winH: 0.50, winDY: 0.10, spandrel: '#a3978a',
    mullion: 0.05, mullionColor: '#c3bbad', roughness: [0.16, 0.34],
    metalness: 0.08, tint: 0.86, seed: 37, ac: 0.72, tile: 0.34, awning: 0.15,
    litP: 0.46, curtainP: 0.20, blindP: 0.08
  },
  // 马赛克贴面唐楼： 深水埗 / 庙街 —— 细密马赛克网格 + 招牌带
  mosaic: {
    bay: 2.2, floor: 3.0, wall: '#a89e8e', glass: '#4a545e',
    winW: 0.44, winH: 0.46, winDY: 0.10, spandrel: '#968c7c',
    mullion: 0.05, mullionColor: '#b5ab9c', roughness: [0.26, 0.44],
    metalness: 0.06, tint: 0.84, seed: 53, ac: 0.62, tile: 0.55,
    litP: 0.44, curtainP: 0.18, blindP: 0.08
  },
  // 花岗岩 / 石材幕墙： 半山 / 半岛 / 湾仔 —— 中灰石材，切缝规整
  granite: {
    bay: 2.8, floor: 3.4, wall: '#9d9a94', glass: '#3c4750',
    winW: 0.50, winH: 0.52, winDY: 0.12, spandrel: '#8e8b85',
    mullion: 0.05, mullionColor: '#c6c3bc', roughness: [0.40, 0.66],
    metalness: 0.06, tint: 0.74, seed: 67, joints: true,
    litP: 0.30, curtainP: 0.14, blindP: 0.12
  },
  // 殖民地红砖 / 米白墙身： 西港城 / 半岛酒店 —— 窄高窗 + 水平线脚
  brick: {
    bay: 2.6, floor: 3.6, wall: '#a5715a', glass: '#48525a',
    winW: 0.36, winH: 0.56, winDY: 0.10, spandrel: '#956350',
    mullion: 0.06, mullionColor: '#d8cfc2', roughness: [0.66, 0.84],
    metalness: 0.03, tint: 0.70, seed: 89, joints: true, cornice: true,
    litP: 0.28, curtainP: 0.16, blindP: 0.06
  },
  // 爱德华时期殖民地： 钟楼 / 半岛酒店 —— 米白抹灰 + 深色木窗 + 檐口
  colonial: {
    bay: 3.2, floor: 3.8, wall: '#ded3c0', glass: '#4a4238',
    winW: 0.30, winH: 0.62, winDY: 0.08, spandrel: '#cbc0ad',
    mullion: 0.07, mullionColor: '#f0e8da', roughness: [0.62, 0.82],
    metalness: 0.03, tint: 0.66, seed: 101, joints: false, cornice: true,
    litP: 0.26, curtainP: 0.18, blindP: 0.04
  },
  // 金属板 / 场馆屋面： 体育馆 / 高铁站 / 邮轮码头
  metal: {
    bay: 2.0, floor: 4.2, wall: '#9aa3ad', glass: '#58646f',
    winW: 0.86, winH: 0.50, winDY: 0.14, spandrel: '#89929c',
    mullion: 0.05, mullionColor: '#aab2ba', roughness: [0.20, 0.40],
    metalness: 0.72, tint: 0.58, seed: 113, winLight: [0.68, 0.78, 0.88],
    litP: 0.40, curtainP: 0.04, blindP: 0.10
  },
  // 工业 / 仓储： 观塘 —— 大开间、波纹金属、侧窗
  industrial: {
    bay: 6.0, floor: 4.5, wall: '#9aa0a8', glass: '#57626b',
    winW: 0.80, winH: 0.36, winDY: 0.26, spandrel: '#878e97',
    mullion: 0.05, mullionColor: '#a7aeb6', roughness: [0.30, 0.52],
    metalness: 0.50, tint: 0.66, seed: 127, ribs: true, winLight: [0.70, 0.78, 0.82],
    litP: 0.30, curtainP: 0.02, blindP: 0.14
  },
  // 商业裙房： 塔楼下的零售基座 —— 大橱窗 + 厚招牌带（铜锣湾 / 尖沙咀断面）
  podium: {
    bay: 5.0, floor: 4.6, wall: '#8f8a82', glass: '#3d4c59',
    winW: 0.84, winH: 0.64, winDY: 0.08, spandrel: '#7c776f',
    mullion: 0.04, mullionColor: '#b0aca2', roughness: [0.10, 0.30],
    metalness: 0.55, tint: 0.78, seed: 139, sign: 0.85, signH: 0.62,
    litP: 0.55, curtainP: 0.06, blindP: 0.10, winLight: [0.95, 0.80, 0.55]
  }
};

/**
 * 绘制一个立面族 → { map, mr, emis }。
 */
function paintFacade(f) {
  const alb = newCanvas().getContext('2d');
  const mr = newCanvas().getContext('2d');
  const em = newCanvas().getContext('2d');
  const a = alb.canvas;

  const C = TEX / CELLS;

  // ---- 底色（MR 全图先铺墙体粗糙度）----
  alb.fillStyle = f.wall;
  alb.fillRect(0, 0, TEX, TEX);
  mr.fillStyle = `rgb(255,${Math.round(f.roughness[1] * 255)},0)`;
  mr.fillRect(0, 0, TEX, TEX);
  em.fillStyle = '#000';
  em.fillRect(0, 0, TEX, TEX);

  // 马赛克 / 瓷砖网格
  if (f.tile) {
    const g = Math.round(14); // 14px 一格 → 36×36 马赛克
    alb.save();
    alb.globalAlpha = 0.5;
    for (let y = 0; y < TEX; y += g) {
      for (let x = 0; x < TEX; x += g) {
        const k = 0.86 + 0.28 * hash(x * 31 + y * 7, f.seed);
        alb.fillStyle = shade(f.wall, k);
        alb.fillRect(x, y, g - 1, g - 1);
      }
    }
    alb.restore();
    // 砖缝
    alb.fillStyle = 'rgba(0,0,0,0.14)';
    for (let x = 0; x < TEX; x += g) alb.fillRect(x, 0, 1, TEX);
    for (let y = 0; y < TEX; y += g) alb.fillRect(0, y, TEX, 1);
  }

  // 石材水平切缝
  if (f.joints) {
    alb.fillStyle = 'rgba(0,0,0,0.13)';
    for (let y = 0; y <= TEX; y += C) alb.fillRect(0, y, TEX, 2);
    // 竖向错缝（石材板块）
    alb.fillStyle = 'rgba(0,0,0,0.08)';
    for (let ry = 0; ry < CELLS; ry++) {
      const off = (ry % 2) * C * 0.5;
      for (let x = 0; x < TEX; x += C) alb.fillRect((x + off) % TEX, ry * C, 1, C);
    }
  }

  // 波纹金属（工业）
  if (f.ribs) {
    for (let x = 0; x < TEX; x += 11) {
      alb.fillStyle = 'rgba(255,255,255,0.05)';
      alb.fillRect(x, 0, 5, TEX);
      alb.fillStyle = 'rgba(0,0,0,0.07)';
      alb.fillRect(x + 5, 0, 6, TEX);
    }
  }

  // ---- 逐开间逐楼层：楼板线 + 窗洞（框/玻璃变体/窗台）+ 空调机 + 遮阳篷 ----
  let cell = 0;
  for (let ry = 0; ry < CELLS; ry++) {
    for (let rx = 0; rx < CELLS; rx++, cell++) {
      // 逐开间墙面明度微差（打破大墙面的平板感；幅度收敛，远了不读成噪点）
      alb.fillStyle = shade(f.wall, 0.96 + 0.07 * hash(cell * 5 + 2, f.seed + 151));
      alb.fillRect(rx * C, ry * C, C, C);

      // 楼板线：每格顶部一道影 + 一道亮边（楼层的水平节奏；幕墙族靠窗楣带表达，从简）
      alb.fillStyle = 'rgba(0,0,0,0.10)';
      alb.fillRect(rx * C, ry * C, C, 3);
      if (!f.spandrel) {
        alb.fillStyle = shade(f.wall, 1.07);
        alb.fillRect(rx * C, ry * C + 3, C, 2);
      }

      const cx = rx * C + C / 2;
      const cy = ry * C + C / 2;
      const w = C * f.winW;
      const h = C * f.winH;
      const x0 = cx - w / 2;
      const y0 = cy - h / 2 + C * f.winDY;

      // 窗楣带
      if (f.spandrel) {
        alb.fillStyle = f.spandrel;
        alb.fillRect(rx * C, ry * C + C * (0.5 + f.winDY + f.winH / 2) - 3, C, C * 0.16);
        alb.fillStyle = 'rgba(0,0,0,0.18)';
        alb.fillRect(rx * C, ry * C + C * (0.5 + f.winDY + f.winH / 2) - 3, C, 2);
      }

      // 窗框（外圈深色压边 → 凹进感）
      alb.fillStyle = shade(f.mullionColor, 0.42);
      alb.fillRect(x0 - 3, y0 - 3, w + 6, h + 6);
      alb.fillStyle = 'rgba(0,0,0,0.42)';
      alb.fillRect(x0 - 1, y0 - 1, w + 2, h + 2);

      // ---- 玻璃变体：反光玻璃 / 窗帘 / 百叶 ----
      const variant = hash01(cell * 11 + 5, f.seed + 7);
      const isCurtain = variant < (f.curtainP ?? 0.12);
      const isBlind = !isCurtain && variant < (f.curtainP ?? 0.12) + (f.blindP ?? 0.08);
      // MR：玻璃低粗糙 + 高金属；窗帘/百叶按织物/塑料回到高粗糙
      if (isCurtain) {
        const ck = 0.82 + 0.36 * hash01(cell * 3, f.seed + 61);
        alb.fillStyle = shade('#bfae8e', ck);
        alb.fillRect(x0, y0, w, h);
        // 窗帘竖褶
        alb.fillStyle = 'rgba(60,50,38,0.20)';
        for (let fx = x0 + 3; fx < x0 + w - 2; fx += 5) alb.fillRect(fx, y0, 2, h);
        mr.fillStyle = 'rgb(255,196,8)';
        mr.fillRect(x0, y0, w, h);
      } else if (isBlind) {
        alb.fillStyle = shade(f.glass, 0.72);
        alb.fillRect(x0, y0, w, h);
        for (let fy = y0 + 1; fy < y0 + h - 1; fy += 4) {
          alb.fillStyle = 'rgba(210,214,210,0.55)';
          alb.fillRect(x0, fy, w, 2);
          alb.fillStyle = 'rgba(0,0,0,0.30)';
          alb.fillRect(x0, fy + 2, w, 2);
        }
        mr.fillStyle = 'rgb(255,170,10)';
        mr.fillRect(x0, y0, w, h);
      } else {
        const gk = 0.90 + 0.20 * hash(cell, f.seed + 5);
        alb.fillStyle = shade(f.glass, gk);
        alb.fillRect(x0, y0, w, h);
        // 玻璃渐变（上部反天光）；极少数窗整面反光更亮，形成鳞次的光斑
        const bright = hash01(cell * 17 + 9, f.seed + 29);
        const grad = alb.createLinearGradient(0, y0, 0, y0 + h);
        if (bright > 0.965) {
          grad.addColorStop(0, 'rgba(200,220,240,0.40)');
          grad.addColorStop(0.6, 'rgba(150,175,205,0.14)');
          grad.addColorStop(1, 'rgba(0,0,0,0.10)');
        } else {
          grad.addColorStop(0, 'rgba(180,205,230,0.42)');
          grad.addColorStop(0.55, 'rgba(120,150,180,0.08)');
          grad.addColorStop(1, 'rgba(8,18,28,0.12)');
        }
        alb.fillStyle = grad;
        alb.fillRect(x0, y0, w, h);
        // MR：逐窗粗糙度微差 → 玻璃反光的参差感
        const rg = f.roughness[0] + 0.14 * hash01(cell * 7 + 1, f.seed + 83);
        mr.fillStyle = `rgb(255,${Math.round(rg * 255)},${Math.round(f.metalness * 255)})`;
        mr.fillRect(x0, y0, w, h);
      }

      // 竖梃 / 横档 / 窗框亮边
      alb.fillStyle = shade(f.mullionColor, 0.85);
      const mw = Math.max(2, Math.round(C * f.mullion));
      alb.fillRect(cx - mw / 2, y0, mw, h);
      alb.fillRect(x0, y0 - mw / 2, w, mw);
      if (f.winH > 0.5 && f.seed !== 11) alb.fillRect(x0, y0 + h * 0.38, w, Math.max(1, mw - 1));
      if (f.cornice) alb.fillRect(x0 - mw, y0 + h, w + mw * 2, mw * 2);

      // 窗台：下方一道亮线 + 投影
      alb.fillStyle = shade(f.wall, 1.18);
      alb.fillRect(x0 - 2, y0 + h + 2, w + 4, 2);
      alb.fillStyle = 'rgba(0,0,0,0.22)';
      alb.fillRect(x0 - 2, y0 + h + 4, w + 4, 2);

      // ---- 夜间窗光：逐族点亮率、亮度 0.30~0.98 拉开层次 ----
      // R=强度（暖色 ×uEmisColor）；B=冷暖（0=暖黄 → 1=冷白荧光灯，招牌带外生效）
      // （全亮+同亮度会把夜空刷成圣诞树 —— 真实楼宇的窗光本来就是稀疏参差的）
      const lit = hash01(cell * 7 + 3, f.seed + 91);
      if (lit > 1 - (f.litP ?? 0.38)) {
        const warm = 0.30 + 0.68 * hash01(cell * 13, f.seed + 17);
        const cool = hash01(cell * 19 + 7, f.seed + 43) < 0.34
          ? 0.55 + 0.45 * hash01(cell * 23 + 1, f.seed + 47) : 0;
        const v = Math.round(warm * 255);
        em.fillStyle = `rgb(${v},0,${Math.round(cool * 255)})`;
        em.fillRect(x0, y0, w, h);
      }

      // ---- 空调机位（港式窗台外挂机的标志） ----
      if (f.ac && hash(cell * 3 + 1, f.seed + 41) < f.ac) {
        const aw = w * 0.46, ah = h * 0.30;
        const ax = cx + w * (hash(cell, f.seed + 3) > 0.5 ? 0.16 : -0.16) - aw / 2;
        const ay = y0 + h - ah;
        alb.fillStyle = '#b6b8b4';
        alb.fillRect(ax, ay, aw, ah);
        alb.fillStyle = 'rgba(0,0,0,0.30)';
        alb.fillRect(ax, ay + ah - 2, aw, 2);
        // 散热格栅
        alb.fillStyle = 'rgba(40,42,40,0.45)';
        for (let gx = ax + 2; gx < ax + aw - 2; gx += 4) alb.fillRect(gx, ay + 2, 2, ah - 5);
        mr.fillStyle = `rgb(255,${Math.round(0.55 * 255)},${Math.round(0.35 * 255)})`;
        mr.fillRect(ax, ay, aw, ah);
      }

      // ---- 窗台遮阳篷 ----
      if (f.awning && hash(cell * 5 + 2, f.seed + 61) < f.awning) {
        alb.fillStyle = 'rgba(190,80,60,0.75)';
        alb.fillRect(x0 - 3, y0 + h + 6, w + 6, 7);
        alb.fillStyle = 'rgba(0,0,0,0.25)';
        alb.fillRect(x0 - 3, y0 + h + 13, w + 6, 3);
      }
    }
  }

  // ---- 底部招牌带 + 竖挑霓虹（M4 霓虹通道约定）----
  // emis 贴图三通道分工：R=窗光掩码（暖色，×uEmisColor）、G=霓虹强度、B=霓虹色相 0..1
  // （着色器里映射到 品红/青/绿/琥珀/红 色环）。白天霓虹不亮，albedo 画的是
  // 熄灯招牌的暗色底板。
  if (f.sign) {
    const bh = Math.round(C * (f.signH ?? 0.34));
    for (let x = 0; x < TEX; x += 28) {
      const h1 = hash(x, f.seed + 71);
      const cols = ['#c0392b', '#d4761f', '#2c7fb8', '#8e44ad', '#16a085'];
      alb.fillStyle = shade(cols[Math.floor(h1 * cols.length) % cols.length], 0.72 + 0.5 * h1);
      alb.fillRect(x, TEX - bh, 26, bh);
      alb.fillStyle = 'rgba(255,255,255,0.16)';   // 招牌描边/字样的亮斑
      alb.fillRect(x + 3, TEX - bh + 3, 20, 3);
      if (hash01(x, f.seed + 71) > 0.5) {
        // 霓虹：G 亮度 + B 色相（每块招牌一个随机色相）。强度刻意压低：
        // 贴图每 6 层重复一次，满亮度会把整栋楼刷成灯板。
        const hue = Math.round(40 + hash01(x, f.seed + 77) * 215);
        em.fillStyle = `rgb(0,${Math.round(160 + h1 * 70)},${hue})`;
        em.fillRect(x + 3, TEX - bh + 4, 20, bh - 8);
      }
    }
    alb.fillStyle = 'rgba(0,0,0,0.35)';
    alb.fillRect(0, TEX - bh - 4, TEX, 4);
  }

  // ---- 全图竖向污渍（雨水痕，香港外墙的质感来源） ----
  for (let i = 0; i < (f.seed === 11 ? 8 : 45); i++) {
    const x = Math.floor(hash(i, f.seed + 131) * TEX);
    const w = 1 + Math.floor(hash(i, f.seed + 137) * 8);
    alb.fillStyle = `rgba(30,28,24,${0.03 + 0.06 * hash(i, f.seed + 149)})`;
    alb.fillRect(x, 0, w, TEX);
  }

  const mk = (canvas, srgb) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    // 远景时立面贴图每 6m 就要重复一次，各向异性不足会把窗格糊成一片灰，
    // 直接影响天际线判读，这里给到 8x。
    t.anisotropy = 8;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.needsUpdate = true;
    return t;
  };
  return { map: mk(a, true), mr: mk(mr.canvas, false), emis: mk(em.canvas, false), spec: f };
}

const facadeCache = new Map();

/** 取（并缓存）某个立面族的三张贴图。 */
export function facadeTextures(name) {
  if (!facadeCache.has(name)) {
    const spec = FACADE_FAMILIES[name];
    if (!spec) throw new Error(`未知立面族: ${name}`);
    facadeCache.set(name, paintFacade(spec));
  }
  return facadeCache.get(name);
}

/** 屋顶：混凝土灰 + 分格缝 + 设备污渍。
 *  注意 three 的 ACES 自带 ×1/0.6 增益：正午顶光下 sRGB>0.45 的屋面就会读成白板。 */
export function roofTexture() {
  const cv = newCanvas();
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#3f403b';
  ctx.fillRect(0, 0, TEX, TEX);
  for (let y = 0; y < TEX; y += 7) {
    for (let x = 0; x < TEX; x += 7) {
      const k = 0.84 + 0.32 * hash(x * 13 + y * 29, 211);
      ctx.fillStyle = shade('#3f403b', k);
      ctx.fillRect(x, y, 7, 7);
    }
  }
  // 屋面分格缝（混凝土保护层的伸缩缝）
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let x = 0; x < TEX; x += 64) ctx.fillRect(x, 0, 2, TEX);
  for (let y = 0; y < TEX; y += 64) ctx.fillRect(0, y, TEX, 2);
  for (let i = 0; i < 40; i++) {           // 水渍 / 锈迹
    const x = hash(i, 233) * TEX, y = hash(i, 239) * TEX;
    ctx.fillStyle = `rgba(48,44,40,${0.10 + 0.14 * hash(i, 241)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 16 + 50 * hash(i, 251), 12 + 34 * hash(i, 257), hash(i, 263) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 沥青路面：骨料噪声 + 轮胎磨光带。 */
export function asphaltTexture() {
  const cv = newCanvas();
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#33363a';
  ctx.fillRect(0, 0, TEX, TEX);
  for (let i = 0; i < 10000; i++) {
    const x = hash(i, 307) * TEX, y = hash(i, 311) * TEX;
    const k = 0.55 + 0.9 * hash(i, 313);
    ctx.fillStyle = `rgba(${Math.round(90 * k)},${Math.round(92 * k)},${Math.round(96 * k)},0.5)`;
    ctx.fillRect(x, y, 1 + hash(i, 317) * 3, 1 + hash(i, 331) * 3);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** 人行道 / 铺装：花岗岩砖缝。基色刻意压暗 —— 铺装是自上而下大面积受光的
 *  平面，亮度一旦接近墙面就会把整个前景糊成一片白。 */
export function pavementTexture() {
  const cv = newCanvas();
  const ctx = cv.getContext('2d');
  const BASE = '#57554d';
  ctx.fillStyle = BASE;
  ctx.fillRect(0, 0, TEX, TEX);
  const g = 56;
  for (let y = 0; y < TEX; y += g) {
    for (let x = 0; x < TEX; x += g) {
      const off = ((y / g) % 2) * (g / 2);
      ctx.fillStyle = shade(BASE, 0.84 + 0.30 * hash(x * 7 + y * 13, 401));
      ctx.fillRect((x + off) % TEX, y, g - 3, g - 3);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * 城市地表肌理（给地形网格的城市平原来的 —— 那里没有 UV，按世界坐标 1/32 采样）。
 * 纯色平地在大太阳 + ACES 下会读成"白纸"；真实建成区从空中看是
 * 屋面 / 天井 / 场地 / 小块绿化的深浅拼块，8m 左右的颗粒度恰好和楼群同频。
 */
export function urbanGroundTexture() {
  const cv = newCanvas();
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#2e3032';            // 沥青底色（地块缝隙 = 街巷）
  ctx.fillRect(0, 0, TEX, TEX);
  const G = 8;                          // 8×8 拼块 / 512px → 每块 64px ≈ 8m（32m 一循环）
  const P = TEX / G;
  for (let gy = 0; gy < G; gy++) {
    for (let gx = 0; gx < G; gx++) {
      const i = gy * G + gx;
      const r = hash(i, 701);
      let col;
      if (r < 0.10) col = shade('#3d4a33', 0.8 + 0.5 * hash(i, 703));        // 小块绿化/球场
      else if (r < 0.42) col = shade('#585a58', 0.8 + 0.5 * hash(i, 705));   // 混凝土场地/屋面
      else if (r < 0.75) col = shade('#43464a', 0.8 + 0.5 * hash(i, 707));   // 沥青/深屋面
      else col = shade('#6a675f', 0.85 + 0.4 * hash(i, 709));                // 浅灰屋面
      const inset = 3 + hash(i, 711) * 6;
      ctx.fillStyle = col;
      ctx.fillRect(gx * P + inset, gy * P + inset, P - inset * 2, P - inset * 2);
      // 拼块内部噪点（设备/阴影/树冠的碎感）
      for (let k = 0; k < 26; k++) {
        const x = gx * P + hash(i * 31 + k, 713) * P;
        const y = gy * P + hash(i * 17 + k, 717) * P;
        ctx.fillStyle = `rgba(0,0,0,${0.05 + 0.10 * hash(i + k, 719)})`;
        ctx.fillRect(x, y, 2 + hash(k, 721) * 5, 2 + hash(k, 723) * 5);
      }
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

let forestCache;
export function forestTexture() {
  if (forestCache) return forestCache;
  const cv = newCanvas(), ctx = cv.getContext('2d');
  ctx.fillStyle = '#67735b'; ctx.fillRect(0, 0, TEX, TEX);
  for (let i = 0; i < 1800; i++) {
    const x = hash01(i, 903) * TEX, y = hash01(i, 907) * TEX;
    const radius = 3 + hash01(i, 911) * 11;
    const k = 0.7 + hash01(i, 919) * 0.55;
    // Repeat across texture boundaries to avoid visible square seams.
    for (const dx of [-TEX, 0, TEX]) for (const dy of [-TEX, 0, TEX]) {
      ctx.fillStyle = 'rgba(24,38,23,.17)'; ctx.beginPath(); ctx.arc(x+dx+2, y+dy+3, radius+1, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = shade('#7a8568', k); ctx.beginPath(); ctx.arc(x+dx, y+dy, radius, 0, Math.PI*2); ctx.fill();
    }
  }
  forestCache = new THREE.CanvasTexture(cv);
  forestCache.colorSpace = THREE.SRGBColorSpace;
  forestCache.wrapS = forestCache.wrapT = THREE.RepeatWrapping;
  forestCache.anisotropy = 8;
  return forestCache;
}
