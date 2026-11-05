// 旺角 / 油麻地 / 红磡 / 启德（M3）：恒隆广场 / 朗豪坊 / 庙街霓虹区 /
// 红磡体育馆 / 启德邮轮码头。
// 形态写法见 specs/core.js 头注释。
//
// 这一带的辨识逻辑和港岛相反：旺角两座是"大裙房 + 收分方塔"，庙街是
// "密、乱、矮"的唐楼街块 + 竖挑霓虹，红磡体育馆是"上大下小"的飞碟，
// 启德邮轮码头则是"横向、架空、悬挑"的水平体量。
export const D = {
  // ==========================================================================
  // 恒隆广场（1997）：旺角一线的制高点。方塔三段退台收分 + 通高竖梃，
  // 大型商场裙房（108m ≈ 塔身 2.6 倍宽）三层退台，塔顶收分塔冠 + 桅杆。
  // 从九龙西望，它靠"大裙房托一根带塔冠的方塔 + 塔顶长桅"认出来。
  // ==========================================================================
  'hang-lung': (C, L) => {
    const H = L.h;                       // 213（结构高度）
    const PW = 108, PD = 88;             // 裙房最大宽 / 深
    const MAST = H + 25;                 // 桅杆顶 238
    const BANDS = [                      // 塔身三段退台 [y0, y1, 底宽, 顶宽]
      [26, 124, 42, 40],
      [124, 178, 40, 36],
      [178, 195, 36, 30]
    ];
    const MULL = 5;                      // 每面竖梃数
    C.fact('height', H);
    C.fact('podiumWidth', PW);
    C.fact('layers', BANDS.length);
    C.fact('fins', BANDS.length * 4 * MULL);
    C.fact('masts', 1);
    C.fact('mastTop', MAST);

    // 商场裙房：三层退台，越往上越缩
    C.taper({ dx: 0, dz: 0, y0: 0, w: PW, d: PD, tw: 100, td: 80, h: 12, fam: 'granite', tint: 0.88 });
    C.box({ dx: 0, dz: 0, y0: 12, w: 94, d: 74, h: 8, fam: 'concrete', tint: 0.9 });
    C.box({ dx: 0, dz: 0, y0: 20, w: 78, d: 60, h: 6, fam: 'concrete', tint: 0.94 });
    C.box({ dx: 0, dz: 0, y0: 25.4, w: 82, d: 64, h: 1.6, fam: 'metal', tint: 0.84 });  // 裙房屋顶压顶
    // 裙房入口柱廊 + 台阶
    C.colonnade({ n: 6, span: 64, dx: 0, dz: PD * 0.5 + 3, y0: 0, h: 10, r: 1.7, seg: 8, fam: 'granite', tint: 0.86 });
    C.stairs({ dx: 0, dz: PD * 0.5 + 11, y0: -0.6, w: 44, d: 12, h: 2.4, steps: 4, fam: 'granite', tint: 0.86 });

    // 塔身三段退台收分：42 → 40 → 36 → 30，段间一圈金属压顶
    for (const [y0, y1, w0, w1] of BANDS) {
      C.taper({ dx: 0, dz: 0, y0, w: w0, d: w0, tw: w1, td: w1, h: y1 - y0, fam: 'glass', tint: 0.95 });
      C.box({ dx: 0, dz: 0, y0: y1 - 1.6, w: w1 * 1.08, d: w1 * 1.08, h: 2.2, fam: 'metal', tint: 0.82 });
    }
    // 中段设备层压顶（把三段在立面上缝起来）
    C.box({ dx: 0, dz: 0, y0: 74, w: 43, d: 43, h: 3, fam: 'metal', tint: 0.8 });

    // 塔身竖梃：每段四面各 5 根，从裙房顶一路织到塔冠（共 60 根）
    for (const [y0, y1, w0, w1] of BANDS) {
      const half = (w0 + w1) / 4 + 0.4;
      const h = y1 - y0;
      for (let f = 0; f < 4; f++) {
        const a = f * Math.PI / 2;
        const px = Math.cos(a), pz = Math.sin(a);
        for (let i = 0; i < MULL; i++) {
          const t = (i / (MULL - 1) - 0.5) * w0 * 0.82;
          C.fin({
            dx: px * half - pz * t, dz: pz * half + px * t, y0,
            w: 1.2, d: 1.0, h, yaw: -a, fam: 'metal', tint: 0.8
          });
        }
      }
    }

    // 塔冠：30 → 14 明显收分，顶上一圈金属帽（结构顶 = L.h）
    C.taper({ dx: 0, dz: 0, y0: 195, w: 30, d: 30, tw: 14, td: 14, h: 12, fam: 'glass', tint: 1.02 });
    C.box({ dx: 0, dz: 0, y0: 207, w: 15, d: 15, h: 6, fam: 'metal', tint: 0.86 });
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      C.fin({
        dx: Math.cos(a) * 13, dz: Math.sin(a) * 13, y0: 194,
        w: 1.4, d: 2.2, h: 13, yaw: -a, fam: 'metal', tint: 0.9
      });
    }

    // 屋顶桅杆（明显高出屋面）+ 屋顶设备
    C.solid({ k: 'cyl', dx: 0, dz: 0, y0: 198, r0: 2.0, r1: 0.5, h: MAST - 198, seg: 8, color: 0xc2c8cd });
    C.solid({ dx: -11, dz: 8, y0: 195, w: 7, d: 5, h: 3, color: 0x9aa0a6, tint: 1 });
    C.solid({ dx: 11, dz: -7, y0: 195, w: 5, d: 6, h: 2.6, color: 0x9aa0a6, tint: 1 });
  },

  // ==========================================================================
  // 朗豪坊（2004）：方塔 + **斜切塔冠** + **通天中庭**是它的辨识点。
  // 塔冠是一刀斜切（C.wedge 单坡楔形，屋脊偏在南侧），桅杆从斜面高侧拔起；
  // 塔身东侧一条通高亮玻璃带 + 3 根深色竖肋，就是"通天中庭"的竖向读法。
  // ==========================================================================
  'langham-place': (C, L) => {
    const H = L.h;                       // 148（结构高度 = 斜切屋脊）
    const PW = 96, PD = 80;              // 商场裙房
    const MAST = H + 20;                 // 桅杆顶 168
    const MULL = 5;                      // 每面竖梃数
    C.fact('height', H);
    C.fact('podiumWidth', PW);
    C.fact('mullions', 3 * MULL);
    C.fact('atriumFins', 3);
    C.fact('masts', 1);
    C.fact('mastTop', MAST);

    // 商场裙房：三层退台 + 两侧柱廊
    C.taper({ dx: 0, dz: 0, y0: 0, w: PW, d: PD, tw: 88, td: 72, h: 14, fam: 'granite', tint: 0.88 });
    C.box({ dx: 0, dz: 0, y0: 14, w: 78, d: 62, h: 8, fam: 'concrete', tint: 0.9 });
    C.box({ dx: 0, dz: 0, y0: 22, w: 62, d: 48, h: 4, fam: 'concrete', tint: 0.94 });
    C.box({ dx: 0, dz: 0, y0: 25.4, w: 66, d: 52, h: 1.6, fam: 'metal', tint: 0.84 });
    C.colonnade({ n: 6, span: 56, dx: 0, dz: PD * 0.5 + 3, y0: 0, h: 11, r: 1.7, seg: 8, fam: 'granite', tint: 0.86 });
    C.colonnade({ n: 6, span: 56, dx: 0, dz: -PD * 0.5 - 3, y0: 0, h: 11, r: 1.7, seg: 8, fam: 'granite', tint: 0.86 });
    C.stairs({ dx: 0, dz: PD * 0.5 + 11, y0: -0.6, w: 40, d: 11, h: 2.2, steps: 4, fam: 'granite', tint: 0.86 });

    // 塔身：等宽方塔 40×40，中段设备层压顶
    C.box({ dx: 0, dz: 0, y0: 26, w: 40, d: 40, h: 102, fam: 'glass', tint: 0.95 });
    C.box({ dx: 0, dz: 0, y0: 74, w: 42, d: 42, h: 4, fam: 'metal', tint: 0.8 });

    // 通天中庭：东侧一条通高亮玻璃带 + 3 根深色竖向分隔
    C.box({ dx: 20.2, dz: 0, y0: 26, w: 2.6, d: 14, h: 102, fam: 'glass', tint: 1.18 });
    for (const dz of [-5.4, 0, 5.4]) {
      C.fin({ dx: 21.6, dz, y0: 26, w: 1.4, d: 1.3, h: 102, fam: 'metal', tint: 0.5 });
    }
    // 其余三面竖梃（南 / 西 / 北）
    for (const a of [Math.PI / 2, Math.PI, 3 * Math.PI / 2]) {
      const px = Math.cos(a), pz = Math.sin(a);
      for (let i = 0; i < MULL; i++) {
        const t = (i / (MULL - 1) - 0.5) * 34;
        C.fin({
          dx: px * 20.8 - pz * t, dz: pz * 20.8 + px * t, y0: 26,
          w: 1.2, d: 1.0, h: 102, yaw: -a, fam: 'metal', tint: 0.8
        });
      }
    }
    // 裙房玻璃竖带（商场入口读法）
    for (let i = 0; i < 8; i++) {
      C.fin({
        dx: -30 + i * 8.6, dz: PD * 0.5 - 2.6, y0: 1,
        w: 2.2, d: 1.2, h: 11, fam: 'glass', tint: 1.1
      });
    }

    // 斜切塔冠：单坡楔形，屋脊压在南侧（结构顶 = L.h=148）
    C.wedge({ dx: 0, dz: 0, y0: 128, w: 38, d: 38, h: 20, apexT: 0.5, fam: 'glass', tint: 1.06 });
    C.box({ dx: 0, dz: 18.4, y0: 136.8, w: 39, d: 2.2, h: 1.4, fam: 'metal', tint: 0.86 });  // 屋脊压顶

    // 桅杆：从斜面高侧拔起，明显高出屋面
    C.solid({ k: 'cyl', dx: 0, dz: 12, y0: 142, r0: 1.9, r1: 0.5, h: MAST - 142, seg: 8, color: 0xc2c8cd });

    // 裙房屋顶设备
    C.solid({ dx: -16, dz: 12, y0: 26, w: 8, d: 6, h: 3, color: 0x9aa0a6, tint: 1 });
    C.solid({ dx: 14, dz: -12, y0: 26, w: 6, d: 7, h: 2.6, color: 0x9aa0a6, tint: 1 });
    C.solid({ dx: 22, dz: 14, y0: 26, w: 4, d: 4, h: 2, color: 0x9aa0a6, tint: 1 });
  },

  // ==========================================================================
  // 庙街 / 油麻地霓虹区（neonZone）：620m×160m 的低矮密集旧城带。
  // 辨识点是"密、乱、矮"：四排唐楼彼此紧贴、楼高 18~27m、面宽 12~20m，
  // 屋顶堆满招牌基座 / 水箱 / 天台加建；临街一排**竖挑霓虹招牌板**（薄 fin、
  // 略微前倾、顶点色高饱和）+ 横挑招牌，与港岛的整齐塔楼形成强烈反差。
  // ==========================================================================
  'temple-street': (C, L) => {
    const H = L.h;                       // 32（街区最高一栋 + 屋顶招牌）
    const W = L.w, D = L.d;              // 620 × 160
    // 固定种子的确定性抖动：保证 blocks / signs 等计数可复现、可核对
    const rnd = (i, s) => {
      const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    const NEON = [0xff5a3c, 0x3cf0ff, 0xffd23c, 0xff3ca8, 0x62ff8c];

    // 街块：四排唐楼（临街两排 tileOld，外侧两排 mosaic）
    const rows = [
      { z: -30, d: 32, h0: 22, h1: 27, fam: 'tileOld' },
      { z: 30, d: 32, h0: 22, h1: 27, fam: 'tileOld' },
      { z: -61, d: 28, h0: 18, h1: 23, fam: 'mosaic' },
      { z: 61, d: 28, h0: 18, h1: 23, fam: 'mosaic' }
    ];
    let blocks = 0, tanks = 0, roofAdd = 0, heroX = 0, heroZ = 0;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      let x = -W / 2 + 2, i = 0;
      while (x < W / 2 - 12) {
        const bw = 12 + rnd(i, r) * 8;               // 面宽 12~20m
        const hero = (r === 0 && i === 6);           // 街区最高一栋（27m）
        const h = hero ? 27 : row.h0 + rnd(i, r + 40) * (row.h1 - row.h0);
        blocks++;
        C.box({
          dx: x + bw / 2, dz: row.z, y0: 0, w: bw - 0.8, d: row.d, h,
          fam: row.fam, tint: 0.82 + rnd(i, r + 9) * 0.22
        });
        if (hero) { heroX = x + bw / 2; heroZ = row.z - row.d / 2 + 2.4; }
        // 天台加建（顶点色）
        if (rnd(i, r + 11) > 0.45) {
          roofAdd++;
          C.solid({
            dx: x + bw / 2 + (rnd(i, r + 13) - 0.5) * 4,
            dz: row.z + (rnd(i, r + 17) - 0.5) * 8, y0: h,
            w: 4 + rnd(i, r + 19) * 5, d: 5 + rnd(i, r + 23) * 6,
            h: 2.2 + rnd(i, r + 29) * 2.2, color: 0x8f9aa3, tint: 1
          });
        }
        // 屋顶水箱（顶点色）
        if (rnd(i, r + 31) > 0.55) {
          tanks++;
          const rr = 1.5 + rnd(i, r + 43);
          C.solid({
            k: 'cyl', dx: x + bw / 2 + (rnd(i, r + 37) - 0.5) * 6,
            dz: row.z + (rnd(i, r + 41) - 0.5) * 10, y0: h,
            r0: rr, r1: rr, h: 2.2, seg: 6, color: 0x9aa4ab, tint: 1
          });
        }
        x += bw + 0.6 + rnd(i, r + 47) * 1.6;
        i++;
      }
    }

    // 街区最高点：临街屋顶的巨型招牌板，顶点正好落在 L.h=32（M4：neon 族夜间发光）
    C.solid({ dx: heroX, dz: heroZ, y0: 25.4, w: 13, d: 1.4, h: H - 25.4, color: 0xff5a3c, tint: 1, fam: 'neon' });

    // 沿街竖挑霓虹招牌板：薄 fin、略微前倾、高饱和顶点色（neon 族：夜间发光）
    let signs = 0;
    for (let i = 0; i < 48; i++) {
      const side = i % 2 ? 1 : -1;
      signs++;
      C.fin({
        dx: -W / 2 + 24 + i * 12.2 + rnd(i, 60) * 3,
        dz: side * 11.8, y0: 9 + rnd(i, 62) * 4,
        w: 0.6, d: 4.2, h: 7.5, pitch: side * 0.12,
        fam: 'neon', color: NEON[i % NEON.length], tint: 1
      });
    }
    // 横挑招牌：立面的水平乱线
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1;
      C.fin({
        dx: -W / 2 + 30 + i * 23 + rnd(i, 70) * 4,
        dz: side * 12.8, y0: 15.2 + rnd(i, 72) * 2,
        w: 7 + rnd(i, 74) * 5, d: 1.6, h: 2.4,
        fam: 'neon', color: NEON[(i + 2) % NEON.length], tint: 1
      });
    }
    // 街心夜市摊档：两排低棚
    let stalls = 0;
    for (let i = 0; i < 36; i++) {
      const side = i % 2 ? 1 : -1;
      stalls++;
      C.box({
        dx: -W / 2 + 18 + i * 16.4, dz: side * 5.4, y0: 0,
        w: 7 + rnd(i, 80) * 3, d: 6, h: 3 + rnd(i, 82) * 0.8,
        fam: 'solid', color: NEON[(i + 4) % NEON.length], tint: 0.8
      });
    }

    // 计数事实：与上面循环的实际产出一一对应
    C.fact('height', H);
    C.fact('blocks', blocks);
    C.fact('signs', signs);
    C.fact('tanks', tanks);
    C.fact('stalls', stalls);
  },

  // ==========================================================================
  // 红磡体育馆（1999）：**上大下小的倒锥台飞碟**是它的辨识点。
  // 八角倒锥台（底 52 → 顶 94）由一圈 16 根外露支柱托着，顶上一圈环形屋檐，
  // 屋面向内收、中央是圆形开口环 + 低穹顶；表面 8 根放射肋顺着锥面外倾。
  // ==========================================================================
  'hung-hom-stadium': (C, L) => {
    const H = L.h;                       // 40（结构高度 = 穹顶顶点）
    const SEG = 8, YAW = Math.PI / 8;    // 八角
    const COLS = 16, CR = 78;            // 外露支柱一圈
    C.fact('height', H);
    C.fact('octSides', SEG);
    C.fact('columns', COLS);
    C.fact('rings', 2);
    C.fact('ribs', 8);

    // 低矮台基
    C.cyl({ dx: 0, dz: 0, y0: 0, r0: 96, r1: 98, h: 2, seg: 16, fam: 'granite', tint: 0.86 });
    // 一圈外露支柱：托着上大下小的倒锥台
    for (let i = 0; i < COLS; i++) {
      const a = i * Math.PI * 2 / COLS;
      C.cyl({
        dx: Math.cos(a) * CR, dz: Math.sin(a) * CR, y0: 2,
        r0: 2.8, r1: 2.2, h: 18, seg: 6, fam: 'concrete', tint: 0.84
      });
    }
    // 倒锥台主体：底 52 → 顶 94（r0 < r1，上宽下窄的飞碟）
    C.cyl({ dx: 0, dz: 0, y0: 4, r0: 52, r1: 94, h: 26, seg: SEG, yaw: YAW, fam: 'metal', tint: 0.88 });
    // 8 根放射肋顺着锥面外倾（roll = -锥面倾角）
    for (let k = 0; k < 8; k++) {
      const a = YAW + k * Math.PI / 4 + Math.PI / 8;
      C.fin({
        dx: Math.cos(a) * 78, dz: Math.sin(a) * 78, y0: 12,
        w: 2.2, d: 3.2, h: 18, yaw: -a, roll: -Math.atan2(42, 24),
        fam: 'metal', tint: 0.82
      });
    }
    // 环形屋檐（第一道环；torus 默认立在 XY 面，pitch 转平）
    C.torus({ dx: 0, dz: 0, y0: 28, r: 95, tube: 3, seg: 24, rseg: 6, pitch: Math.PI / 2, fam: 'metal', tint: 0.92 });
    // 屋面向内收 + 中央圆形开口环（第二道环）
    C.cyl({ dx: 0, dz: 0, y0: 30, r0: 92, r1: 58, h: 4, seg: 16, fam: 'metal', tint: 0.86 });
    C.torus({ dx: 0, dz: 0, y0: 33.2, r: 40, tube: 1.4, seg: 24, rseg: 6, pitch: Math.PI / 2, fam: 'metal', tint: 0.8 });
    // 中央低穹顶（顶点 = L.h=40）
    C.dome({ dx: 0, dz: 0, y0: 33, rx: 36, ry: 7, rz: 36, seg: 16, rings: 6, fam: 'metal', tint: 0.95 });
    // 底部门廊雨棚
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      C.box({
        dx: Math.cos(a) * 46, dz: Math.sin(a) * 46, y0: 6.5,
        w: 16, d: 8, h: 1.6, yaw: -a, fam: 'metal', tint: 0.86
      });
    }
  },

  // ==========================================================================
  // 启德邮轮码头（2013）：**横向、架空、悬挑**的水平体量。
  // 长条客运大楼架在两排支柱上，大跨度屋面微微起拱、两端悬挑出大厅；
  // 海侧一排 5 座登船廊桥再挑出去；屋顶是花园平台（跑道 / 花池 / 树）；
  // 西端塔台 + 桅杆拔到 80m，是整段水平线里唯一的竖向标志。
  // ==========================================================================
  'kai-tak-cruise': (C, L) => {
    const H = L.h;                       // 65（结构高度 = 塔台顶部）
    const MAST = H + 15;                 // 桅杆顶 80
    C.fact('height', H);
    C.fact('piers', 16);
    C.fact('gangways', 5);
    C.fact('roofPlates', 5);
    C.fact('masts', 1);
    C.fact('mastTop', MAST);

    // 码头面
    C.box({ dx: 0, dz: 0, y0: 0, w: 240, d: 110, h: 2, fam: 'granite', tint: 0.86 });
    // 架空支柱两排 + 横梁
    C.colonnade({ n: 8, span: 190, dx: 0, dz: -26, y0: 2, h: 16, r: 3, seg: 8, fam: 'concrete', tint: 0.84 });
    C.colonnade({ n: 8, span: 190, dx: 0, dz: 26, y0: 2, h: 16, r: 3, seg: 8, fam: 'concrete', tint: 0.84 });
    C.box({ dx: 0, dz: -26, y0: 5.8, w: 232, d: 3.2, h: 2.4, fam: 'concrete', tint: 0.84 });
    C.box({ dx: 0, dz: 26, y0: 5.8, w: 232, d: 3.2, h: 2.4, fam: 'concrete', tint: 0.84 });

    // 悬空客运大楼：悬挑平台 + 玻璃大厅
    C.box({ dx: 0, dz: 0, y0: 18, w: 236, d: 80, h: 2.5, fam: 'metal', tint: 0.86 });
    C.box({ dx: 0, dz: 0, y0: 20.5, w: 208, d: 62, h: 12, fam: 'glass', tint: 0.95 });
    for (let i = -5; i <= 5; i++) {
      C.fin({ dx: i * 18, dz: 31.4, y0: 20.5, w: 1.2, d: 1.6, h: 12, fam: 'metal', tint: 0.8 });
      C.fin({ dx: i * 18, dz: -31.4, y0: 20.5, w: 1.2, d: 1.6, h: 12, fam: 'metal', tint: 0.8 });
    }

    // 大跨度屋面：5 块板沿进深渐变起拱，两端悬挑出大厅
    const RISE = [0, 1.6, 2.4, 1.6, 0];
    for (let i = 0; i < 5; i++) {
      C.box({
        dx: 0, dz: (i - 2) * 14.6, y0: 32.5 + RISE[i], w: 228, d: 15, h: 1.8,
        fam: 'metal', tint: 0.88 + i * 0.01
      });
    }

    // 登船廊桥：海侧一排 5 座，向海悬挑出去
    for (const dx of [-84, -42, 0, 42, 84]) {
      C.box({ dx, dz: 47, y0: 21.5, w: 7, d: 34, h: 5, fam: 'metal', tint: 0.84 });
      C.box({ dx, dz: 47, y0: 26.5, w: 8.2, d: 34, h: 1.2, fam: 'metal', tint: 0.9 });
    }

    // 屋顶花园平台（启德码头屋顶是公园）：跑道 + 花池 + 树
    C.solid({ dx: 0, dz: 0, y0: 36.7, w: 180, d: 7, h: 0.6, color: 0x8a4a3c, tint: 1 });
    for (let i = 0; i < 8; i++) {
      const dx = -88 + i * 25, dz = i % 2 ? 12 : -12;
      C.solid({ dx, dz, y0: 35.6, w: 12, d: 6, h: 1.4, color: 0x4f7a4a, tint: 1 });
      C.solid({ k: 'cone', dx, dz, y0: 36.4, r0: 2.4, r1: 0, h: 5, seg: 6, color: 0x2f6b3a, tint: 1 });
    }

    // 塔台 + 桅杆：结构顶 65 = L.h，桅杆拔到 80
    C.box({ dx: -100, dz: -18, y0: 18, w: 16, d: 16, h: 40, fam: 'concrete', tint: 0.86 });
    C.box({ dx: -100, dz: -18, y0: 58, w: 13, d: 13, h: 7, fam: 'glass', tint: 1.05 });
    C.box({ dx: -100, dz: -18, y0: 65, w: 15, d: 15, h: 1.4, fam: 'metal', tint: 0.86 });
    C.solid({ k: 'cyl', dx: -100, dz: -18, y0: 66, r0: 1.9, r1: 0.5, h: MAST - 66, seg: 8, color: 0xc2c8cd });
    C.solid({ k: 'cyl', dx: -100, dz: -18, y0: 73, r0: 3.2, r1: 3.2, h: 2, seg: 8, color: 0x9aa0a6, tint: 1 });
  }
};
