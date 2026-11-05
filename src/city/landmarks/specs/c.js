// 尖沙咀海滨（M3）：尖沙咀钟楼 / 香港文化中心 / 星光大道 / 半岛酒店 /
// 海港城 / 擎天半岛酒店 / 海逸酒店 / 永安广场。
// 形态写法见 specs/core.js 头注释。
//
// 这一组都在尖沙咀海滨 / 广东道一线，从港岛东望，它们要在一排"玻璃方盒"
// 里被一眼认出来：红砖钟楼的陡尖顶、文化中心的蛋形屋顶、半岛酒店的铜绿
// 金字塔、海港城摊开的超大裙房，是四个锚点；其余四座塔楼靠退台语言区分。
export const C = {
  // ==========================================================================
  // 尖沙咀钟楼（1888，维多利亚式）：花岗岩台基 + 红砖收分塔身 + 三道腰线
  // + 四面钟室 + 挑檐 + 四角小尖塔 + 陡峭中央尖顶 + 避雷针。
  // 它靠"红砖细塔身 + 极陡尖顶"认出来 —— 比中环 star-ferry-clock 更高更细、
  // 红砖更醒目、尖顶更陡（那座是殖民地色方塔 + 平缓四坡顶）。
  // ==========================================================================
  'ts-clock-tower': (C, L) => {
    const H = L.h;                       // 51
    C.fact('height', H);
    C.fact('clockFaces', 4);
    C.fact('turrets', 4);
    C.fact('courses', 3);
    C.fact('spireTop', 68);

    // 花岗岩台基 + 朝南台阶 + 基座腰线
    C.box({ dx: 0, dz: 0, y0: -3, w: 17, d: 17, h: 5, fam: 'granite', tint: 0.88 });
    C.stairs({ dx: 0, dz: 11.2, y0: -3, w: 9, d: 5.4, h: 2.4, steps: 3, fam: 'granite', tint: 0.9 });
    C.box({ dx: 0, dz: 0, y0: 2, w: 15, d: 15, h: 2.2, fam: 'granite', tint: 0.92 });

    // 红砖塔身：13.6 → 11.6 收分，四角壁柱 + 三道花岗岩腰线
    C.taper({ dx: 0, dz: 0, y0: 4.2, w: 13.6, d: 13.6, tw: 11.6, td: 11.6, h: 31.8, fam: 'brick', tint: 1.0 });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        C.box({ dx: sx * 6.05, dz: sz * 6.05, y0: 4.2, w: 1.5, d: 1.5, h: 31.8, fam: 'brick', tint: 0.9 });
      }
    }
    for (const y of [12.4, 21.2, 30.0]) {
      C.box({ dx: 0, dz: 0, y0: y, w: 14.3, d: 14.3, h: 1.1, fam: 'granite', tint: 0.9 });
    }

    // 狭长窗缝（深色凹槽，强调"塔很瘦"）
    for (const [dx, dz, yaw, cy] of [
      [0, 6.6, 0, 11.5], [0, -6.6, 0, 11.5], [6.6, 0, Math.PI / 2, 11.5], [-6.6, 0, Math.PI / 2, 11.5],
      [0, 6.15, 0, 25.5], [0, -6.15, 0, 25.5], [6.15, 0, Math.PI / 2, 25.5], [-6.15, 0, Math.PI / 2, 25.5]
    ]) {
      C.solid({ dx, dz, y0: cy - 3.5, w: 1.0, d: 0.55, h: 7, yaw, color: 0x2c2c30, tint: 1 });
    }

    // 钟室：四面各一个钟盘（顶点色圆盘，竖直安装在四面墙上）
    C.taper({ dx: 0, dz: 0, y0: 36, w: 12.8, d: 12.8, tw: 11.8, td: 11.8, h: 10, fam: 'brick', tint: 1.0 });
    for (const [dx, dz, yaw] of [
      [0, 6.45, 0], [6.45, 0, Math.PI / 2], [0, -6.45, Math.PI], [-6.45, 0, -Math.PI / 2]
    ]) {
      C.solid({
        k: 'cyl', dx, dz, y0: 40.7, r0: 1.95, r1: 1.95, h: 0.5, seg: 12,
        yaw, pitch: Math.PI / 2, color: 0xf2ead8, tint: 1
      });
    }

    // 挑檐 + 檐口
    C.box({ dx: 0, dz: 0, y0: 46, w: 14.8, d: 14.8, h: 1.6, fam: 'granite', tint: 0.88 });
    C.box({ dx: 0, dz: 0, y0: 47.6, w: 13.2, d: 13.2, h: 1.4, fam: 'granite', tint: 0.94 });

    // 四角小尖塔（铅皮色锥顶）
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        C.cyl({ dx: sx * 5.3, dz: sz * 5.3, y0: 48, r0: 1.25, r1: 1.25, h: 3.2, seg: 8, fam: 'granite', tint: 0.92 });
        C.solid({ k: 'cone', dx: sx * 5.3, dz: sz * 5.3, y0: 51.2, r0: 1.5, h: 4.2, seg: 8, color: 0x77828a, tint: 1 });
      }
    }

    // 中央陡尖顶（锥底 10m、19m 高，明显比塔身陡）+ 顶端避雷针
    C.solid({ k: 'cone', dx: 0, dz: 0, y0: 49, r0: 5.0, h: 19, seg: 12, color: 0x77828a, tint: 1 });
    C.solid({ k: 'cyl', dx: 0, dz: 0, y0: 68, r0: 0.16, r1: 0.1, h: 4, seg: 6, color: 0xb9c2c8, tint: 1 });
  },

  // ==========================================================================
  // 香港文化中心（1989）："蛋形/马鞍形屋顶 + 无窗幕墙"是它的全部辨识度。
  // 低矮长条体量上鼓起一枚压扁的蛋壳屋顶，朝海（南）是整片无窗斜面幕墙，
  // 北侧是缓坡入口 + 柱廊，两端屋面下落成马鞍弧线。
  // ==========================================================================
  'cultural-centre': (C, L) => {
    const H = L.h;                       // 45
    C.fact('height', H);
    C.fact('domeRise', 19);
    C.fact('wedges', 5);
    C.fact('ribs', 8);
    C.fact('columns', 6);

    // 无窗主厅：花岗岩实墙长条体量
    C.box({ dx: 0, dz: -2, y0: -4, w: 112, d: 66, h: 28, fam: 'granite', tint: 0.86 });

    // 朝海（南）斜面幕墙：整片无窗斜坡，从屋脊一路落到海侧
    C.wedge({ dx: 0, dz: 28, y0: -2, w: 112, d: 32, h: 30, apexT: -0.5, fam: 'granite', tint: 0.8 });
    // 幕墙竖向分缝（8 道肋，贴着斜面）
    const RIB = [14, 18, 22, 26, 30, 34, 38, 42];
    for (const dz of RIB) {
      const y = 28 - (dz - 12) * (30 / 32);
      C.fin({ dx: (dz % 8) - 4, dz, y0: y - 3.1, w: 1.1, d: 1.2, h: 6.2, pitch: 0.755, fam: 'metal', tint: 0.85 });
    }

    // 北侧入口斜坡 + 柱廊
    C.wedge({ dx: 0, dz: -36, y0: -2, w: 96, d: 24, h: 12, apexT: 0.5, fam: 'concrete', tint: 0.88 });
    C.colonnade({ n: 6, span: 60, dx: 0, dz: -24, y0: 0, h: 11, r: 1.3, seg: 8, fam: 'concrete', tint: 0.9 });

    // 屋顶：中央壳脊 + 压扁蛋形穹顶 + 两端马鞍落坡
    C.wedge({ dx: 0, dz: 0, y0: 22, w: 106, d: 52, h: 12, apexT: 0, fam: 'tileOld', tint: 0.9 });
    C.dome({ dx: 0, dz: 0, y0: 26, rx: 54, ry: 19, rz: 27, seg: 20, rings: 9, fam: 'tileOld', tint: 0.96 });
    for (const s of [-1, 1]) {
      C.wedge({
        dx: s * 54, dz: 0, y0: 20, w: 52, d: 20, h: 11, apexT: -s * 0.5,
        yaw: Math.PI / 2, fam: 'tileOld', tint: 0.92
      });
    }

    // 壳面分缝板（沿屋脊的浅色金属条）
    for (let i = 0; i < 4; i++) {
      C.fin({ dx: -36 + i * 24, dz: 0, y0: 33.4, w: 2.2, d: 26, h: 1.0, fam: 'metal', tint: 0.82 });
    }

    // 门厅体块
    C.box({ dx: 0, dz: -26, y0: -2, w: 34, d: 12, h: 12, fam: 'concrete', tint: 0.92 });
  },

  // ==========================================================================
  // 星光大道（2004）：620m 长的海滨步行带。它不是一栋楼，是一条"贴着岸线
  // 延伸"的铺装带 —— 扁平花岗岩步道 + 几处向海外挑的观景平台 + 一排灯柱
  // + 海侧栏杆 + 座椅与雕塑基座。几何必须很扁（h=6 就是步道自身高度）。
  // ==========================================================================
  'avenue-of-stars': (C, L) => {
    const H = L.h;                       // 6
    C.fact('height', H);
    C.fact('posts', 20);
    C.fact('platforms', 5);
    C.fact('benches', 6);
    C.fact('rails', 2);

    // 花岗岩铺装步道：贴着岸线的一条扁长带
    C.box({ dx: 0, dz: 0, y0: -2, w: 620, d: 44, h: 3, fam: 'granite', tint: 0.9 });
    C.box({ dx: 0, dz: -6, y0: 1, w: 612, d: 14, h: 0.7, fam: 'granite', tint: 0.98 });

    // 5 处向海外挑的观景平台 + 平台栏杆
    for (const dx of [-240, -120, 0, 120, 240]) {
      C.box({ dx, dz: 26, y0: -1.2, w: 24, d: 12, h: 2.4, fam: 'granite', tint: 0.94 });
      for (const s of [-1, 1]) {
        C.fin({ dx: dx + s * 11.6, dz: 26, y0: 1.2, w: 0.3, d: 12, h: 0.28, fam: 'metal', tint: 0.85 });
      }
      C.fin({ dx, dz: 31.8, y0: 1.2, w: 24, d: 0.3, h: 0.28, fam: 'metal', tint: 0.85 });
    }

    // 海侧栏杆：两道横杆 + 立柱
    for (const y of [1.35, 2.15]) {
      C.fin({ dx: 0, dz: 21.6, y0: y, w: 610, d: 0.3, h: 0.22, fam: 'metal', tint: 0.82 });
    }
    for (let i = 0; i <= 30; i++) {
      C.fin({ dx: -300 + i * 20, dz: 21.6, y0: 1, w: 0.26, d: 0.26, h: 1.4, fam: 'metal', tint: 0.82 });
    }

    // 一排灯柱（20 座，细杆 + 挑臂灯头）
    for (let i = 0; i < 20; i++) {
      const dx = -285 + i * 30;
      C.solid({ k: 'cyl', dx, dz: -12, y0: 1, r0: 0.24, r1: 0.18, h: 4.4, seg: 8, color: 0x3c4650, tint: 1 });
      C.solid({ dx, dz: -12, y0: 5.4, w: 1.4, d: 0.5, h: 0.5, color: 0xf2e9c8, tint: 1 });
    }

    // 观景座椅（6 组）
    for (const dx of [-270, -180, -60, 60, 180, 270]) {
      C.box({ dx, dz: 6, y0: 1, w: 3.2, d: 0.8, h: 0.5, fam: 'granite', tint: 0.85 });
      C.box({ dx, dz: 6, y0: 0.2, w: 2.6, d: 0.6, h: 0.8, fam: 'metal', tint: 0.8 });
    }

    // 雕塑基座（3 组）
    for (const dx of [-150, 30, 210]) {
      C.box({ dx, dz: 2, y0: 1, w: 3.4, d: 3.4, h: 1.2, fam: 'granite', tint: 0.88 });
      C.solid({ k: 'cone', dx, dz: 2, y0: 2.2, r0: 1.3, h: 3.4, seg: 8, color: 0x8d949b, tint: 1 });
    }
  },

  // ==========================================================================
  // 半岛酒店（1928，殖民地风格）：底层高大古典柱廊（四面 24 根）+ 花岗岩
  // 檐口 + 逐层收分的殖民地色塔身（五道水平腰线）+ 铜绿色金字塔尖顶 + 旗杆。
  // 它靠"柱廊基座 + 铜绿尖顶"认出来，是尖沙咀最古典的轮廓。
  // ==========================================================================
  'peninsula': (C, L) => {
    const H = L.h;                       // 100
    C.fact('height', H);
    C.fact('columns', 24);
    C.fact('tiers', 3);
    C.fact('bands', 5);
    C.fact('spireTop', 112);

    // 花岗岩台基 + 朝南大台阶
    C.box({ dx: 0, dz: 0, y0: -4, w: 42, d: 42, h: 5, fam: 'granite', tint: 0.86 });
    C.stairs({ dx: 0, dz: 23, y0: -4, w: 16, d: 6, h: 2.6, steps: 4, fam: 'granite', tint: 0.9 });

    // 底层高大柱廊（四面）+ 殖民地色墙体
    C.box({ dx: 0, dz: 0, y0: 1, w: 36, d: 36, h: 14, fam: 'colonial', tint: 0.92 });
    C.colonnade({ n: 8, span: 30, dx: 0, dz: 19, y0: 1, h: 13.4, r: 1.25, seg: 8, fam: 'colonial', tint: 0.96 });
    C.colonnade({ n: 8, span: 30, dx: 0, dz: -19, y0: 1, h: 13.4, r: 1.25, seg: 8, fam: 'colonial', tint: 0.96 });
    C.colonnade({ n: 4, span: 22, dx: 19, dz: 0, y0: 1, h: 13.4, r: 1.25, yaw: Math.PI / 2, seg: 8, fam: 'colonial', tint: 0.96 });
    C.colonnade({ n: 4, span: 22, dx: -19, dz: 0, y0: 1, h: 13.4, r: 1.25, yaw: Math.PI / 2, seg: 8, fam: 'colonial', tint: 0.96 });

    // 檐口 + 三段收分塔身 + 五道水平腰线
    C.box({ dx: 0, dz: 0, y0: 15, w: 40.5, d: 40.5, h: 1.8, fam: 'granite', tint: 0.9 });
    C.box({ dx: 0, dz: 0, y0: 16.8, w: 38.5, d: 38.5, h: 1.4, fam: 'granite', tint: 0.95 });
    C.taper({ dx: 0, dz: 0, y0: 18.2, w: 34, d: 34, tw: 32, td: 32, h: 37.8, fam: 'colonial', tint: 0.94 });
    C.taper({ dx: 0, dz: 0, y0: 56, w: 31, d: 31, tw: 29, td: 29, h: 24, fam: 'colonial', tint: 0.96 });
    for (const y of [28, 38, 48]) {
      C.box({ dx: 0, dz: 0, y0: y, w: 35.4, d: 35.4, h: 0.9, fam: 'granite', tint: 0.88 });
    }
    for (const y of [66, 76]) {
      C.box({ dx: 0, dz: 0, y0: y, w: 32.6, d: 32.6, h: 0.9, fam: 'granite', tint: 0.88 });
    }

    // 塔冠 + 挑檐 + 女儿墙
    C.box({ dx: 0, dz: 0, y0: 80, w: 26, d: 26, h: 12, fam: 'colonial', tint: 0.92 });
    C.box({ dx: 0, dz: 0, y0: 92, w: 29.5, d: 29.5, h: 2, fam: 'granite', tint: 0.9 });
    C.box({ dx: 0, dz: 0, y0: 94, w: 27, d: 27, h: 2, fam: 'granite', tint: 0.96 });

    // 铜绿色金字塔尖顶（氧化铜绿）+ 旗杆
    C.solid({ k: 'cone', dx: 0, dz: 0, y0: 96, r0: 10.6, h: 16, seg: 4, yaw: Math.PI / 4, color: 0x6f8f7a, tint: 1 });
    C.solid({ k: 'cyl', dx: 0, dz: 0, y0: 112, r0: 0.22, r1: 0.14, h: 6, seg: 6, color: 0xb9c2c8, tint: 1 });
  },

  // ==========================================================================
  // 海港城（1984）："超大裙房 + 塔楼"。116×92 的商场裙房比塔身（52）宽一倍
  // 多、三层退台摊开在岸边，上部一座收分写字楼 + 屋顶机房群 + 桅杆。
  // 它靠"裙房摊得很开"认出来。
  // ==========================================================================
  'harbour-city': (C, L) => {
    const H = L.h;                       // 110
    C.fact('height', H);
    C.fact('podiumTiers', 3);
    C.fact('podiumW', 116);
    C.fact('plantUnits', 3);
    C.fact('mastTop', 130);

    // 超大商场裙房：三层退台
    C.box({ dx: 0, dz: 0, y0: -5, w: 116, d: 92, h: 25, fam: 'mosaic', tint: 0.9 });
    C.box({ dx: 0, dz: 0, y0: 20, w: 119, d: 95, h: 1.8, fam: 'metal', tint: 0.84 });
    C.box({ dx: 0, dz: 0, y0: 21.8, w: 100, d: 78, h: 10.4, fam: 'glass', tint: 0.92 });
    C.box({ dx: 0, dz: 0, y0: 32.2, w: 84, d: 64, h: 9, fam: 'mosaic', tint: 0.94 });
    C.box({ dx: 0, dz: 0, y0: 41.2, w: 87, d: 67, h: 1.4, fam: 'metal', tint: 0.86 });

    // 裙房沿街竖梃
    for (let i = 0; i < 12; i++) {
      const x = -52 + i * (104 / 11);
      C.fin({ dx: x, dz: 48.4, y0: -2, w: 1.2, d: 1.4, h: 22, fam: 'concrete', tint: 0.85 });
      C.fin({ dx: x, dz: -48.4, y0: -2, w: 1.2, d: 1.4, h: 22, fam: 'concrete', tint: 0.85 });
    }

    // 塔楼窗带（每 10m 一道，压出水平划分）
    for (const y of [52, 62, 72, 82, 92]) {
      C.box({ dx: 0, dz: 0, y0: y, w: 50.4, d: 50.4, h: 0.7, fam: 'metal', tint: 0.82 });
    }

    // 写字楼塔楼：52 → 46 收分，四角竖梃
    C.taper({ dx: 0, dz: 0, y0: 42.6, w: 52, d: 52, tw: 46, td: 46, h: 61.4, fam: 'glass', tint: 0.97 });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        C.fin({ dx: sx * 25.4, dz: sz * 25.4, y0: 42.6, w: 1.6, d: 1.6, h: 61.4, fam: 'metal', tint: 0.88 });
      }
    }
    C.box({ dx: 0, dz: 0, y0: 104, w: 48, d: 48, h: 3.6, fam: 'metal', tint: 0.85 });

    // 屋顶机房群 + 冷却塔 + 桅杆
    C.box({ dx: -12, dz: 0, y0: 107.6, w: 16, d: 22, h: 8, fam: 'metal', tint: 0.82 });
    C.box({ dx: 8, dz: -8, y0: 107.6, w: 12, d: 14, h: 6, fam: 'industrial', tint: 0.85 });
    C.box({ dx: 11, dz: 10, y0: 107.6, w: 10, d: 10, h: 5, fam: 'industrial', tint: 0.88 });
    for (const s of [-1, 1]) {
      C.solid({ k: 'cyl', dx: s * 22, dz: -14, y0: 107.6, r0: 3, r1: 3, h: 6, seg: 10, color: 0x9aa0a6, tint: 1 });
    }
    C.solid({ k: 'cyl', dx: 0, dz: 0, y0: 115.6, r0: 0.9, r1: 0.3, h: 14.4, seg: 8, color: 0xb8bfc4, tint: 1 });

    // 裙房入口雨棚 + 柱
    C.box({ dx: 0, dz: 52, y0: 8, w: 26, d: 10, h: 1.6, fam: 'metal', tint: 0.86 });
    C.colonnade({ n: 4, span: 20, dx: 0, dz: 55, y0: 0, h: 8, r: 1.1, seg: 8, fam: 'metal', tint: 0.88 });
  },

  // ==========================================================================
  // 擎天半岛酒店（1990）：四段逐层收分的阶梯状塔身（每段一道金属压顶）
  // + 顶部圆形旋转餐厅 / 观景层（明显突出的圆体量）+ 收口 + 桅杆。
  // 它靠"阶梯塔身 + 圆形餐厅"认出来，与旁边挺拔的新世界中心区分开。
  // ==========================================================================
  'renaissance': (C, L) => {
    const H = L.h;                       // 118
    C.fact('height', H);
    C.fact('setbacks', 4);
    C.fact('deckR', 13);
    C.fact('bands', 5);
    C.fact('mastTop', 129);

    // 酒店裙房 + 入口柱廊
    C.box({ dx: 0, dz: 0, y0: -4, w: 46, d: 42, h: 18, fam: 'mosaic', tint: 0.9 });
    C.box({ dx: 0, dz: 0, y0: 14, w: 48.5, d: 44.5, h: 1.8, fam: 'metal', tint: 0.85 });
    C.colonnade({ n: 5, span: 22, dx: 0, dz: 23, y0: 0, h: 13, r: 1.3, seg: 8, fam: 'granite', tint: 0.9 });

    // 阶梯状塔身：4 段逐层收分，每段顶部一道金属压顶
    const TIERS = [[15.8, 48, 36, 34.6], [49.2, 78, 33, 31.6], [79.2, 98, 30, 28.6], [99.2, 110, 26, 26]];
    for (const [y0, y1, w, tw] of TIERS) {
      C.taper({ dx: 0, dz: 0, y0, w, d: w, tw, td: tw, h: y1 - y0, fam: 'glass', tint: 0.95 });
      C.box({ dx: 0, dz: 0, y0: y1 - 1.2, w: w * 1.07, d: w * 1.07, h: 1.4, fam: 'metal', tint: 0.85 });
    }
    // 塔身转角竖梃 + 竖向窗梃
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        C.fin({ dx: sx * 17.4, dz: sz * 17.4, y0: 15.8, w: 1.3, d: 1.3, h: 32, fam: 'metal', tint: 0.88 });
        C.fin({ dx: sx * 15.9, dz: sz * 15.9, y0: 49.2, w: 1.2, d: 1.2, h: 28, fam: 'metal', tint: 0.88 });
      }
    }
    for (const [dx, dz, yaw] of [
      [0, 17.8, 0], [0, -17.8, 0], [17.8, 0, Math.PI / 2], [-17.8, 0, Math.PI / 2],
      [0, 16.3, 0], [0, -16.3, 0], [16.3, 0, Math.PI / 2], [-16.3, 0, Math.PI / 2]
    ]) {
      C.fin({ dx, dz, y0: 15.8, w: 0.9, d: 1.1, h: 32, yaw, fam: 'metal', tint: 0.86 });
    }
    for (const y of [24, 34, 58, 68, 88]) {
      C.box({ dx: 0, dz: 0, y0: y, w: 34, d: 34, h: 0.8, fam: 'metal', tint: 0.8 });
    }

    // 顶部旋转餐厅 / 观景层：圆形突出体量
    C.cyl({ dx: 0, dz: 0, y0: 106, r0: 11, r1: 11, h: 2.2, seg: 16, fam: 'metal', tint: 0.86 });
    C.cyl({ dx: 0, dz: 0, y0: 108.2, r0: 13, r1: 12.6, h: 7.2, seg: 20, fam: 'glass', tint: 1.0 });
    C.cyl({ dx: 0, dz: 0, y0: 115.4, r0: 12.6, r1: 7, h: 2.6, seg: 16, fam: 'metal', tint: 0.84 });
    C.cyl({ dx: 0, dz: 0, y0: 118, r0: 5, r1: 5, h: 2, seg: 12, fam: 'metal', tint: 0.82 });

    // 桅杆
    C.solid({ k: 'cyl', dx: 0, dz: 0, y0: 120, r0: 0.7, r1: 0.25, h: 9, seg: 8, color: 0xb8bfc4, tint: 1 });
  },

  // ==========================================================================
  // 海逸酒店 / 新世界中心（2007）：挺拔的现代玻璃塔 + 裙房，12 道竖向鳍片
  // 通高到底，顶部三段收分（塔冠收坡 + 环形观景层 + 收口）+ 桅杆。
  // 与擎天半岛区分：这座更高更挺拔、竖鳍连续、顶部是收坡不是圆餐厅。
  // ==========================================================================
  'new-world-centre': (C, L) => {
    const H = L.h;                       // 187
    C.fact('height', H);
    C.fact('fins', 12);
    C.fact('setbacks', 3);
    C.fact('deckTop', 178);
    C.fact('mastTop', 199);

    // 裙房
    C.box({ dx: 0, dz: 0, y0: -4, w: 68, d: 56, h: 24, fam: 'mosaic', tint: 0.9 });
    C.box({ dx: 0, dz: 0, y0: 20, w: 71, d: 59, h: 1.8, fam: 'metal', tint: 0.85 });
    C.box({ dx: 0, dz: 0, y0: 21.8, w: 58, d: 48, h: 7.2, fam: 'glass', tint: 0.93 });
    C.box({ dx: 0, dz: 0, y0: 29, w: 61, d: 51, h: 1.5, fam: 'metal', tint: 0.87 });

    // 挺拔玻璃塔身 + 12 道通高竖鳍（每面 3 道）
    C.taper({ dx: 0, dz: 0, y0: 30.5, w: 38, d: 38, tw: 36.5, td: 36.5, h: 119.5, fam: 'glass', tint: 0.97 });
    for (let i = 0; i < 12; i++) {
      const face = i % 4, t = (Math.floor(i / 4) - 1) * 11;
      const o = 19.3;
      const P = [[t, o, 0], [t, -o, 0], [o, t, Math.PI / 2], [-o, t, Math.PI / 2]][face];
      C.fin({ dx: P[0], dz: P[1], y0: 30.5, w: 1.1, d: 2.2, h: 119.5, yaw: P[2], fam: 'metal', tint: 0.9 });
    }

    // 顶部三段收分：塔冠收坡 → 环形观景层 → 收口
    C.taper({ dx: 0, dz: 0, y0: 150, w: 36.5, d: 36.5, tw: 27, td: 27, h: 18, fam: 'glass', tint: 1.0 });
    C.box({ dx: 0, dz: 0, y0: 168, w: 28.5, d: 28.5, h: 2.4, fam: 'metal', tint: 0.86 });
    C.taper({ dx: 0, dz: 0, y0: 170.4, w: 26, d: 26, tw: 21, td: 21, h: 7.6, fam: 'glass', tint: 1.02 });
    C.box({ dx: 0, dz: 0, y0: 178, w: 22, d: 22, h: 1.6, fam: 'metal', tint: 0.84 });
    C.taper({ dx: 0, dz: 0, y0: 179.6, w: 18, d: 18, tw: 11, td: 11, h: 7.4, fam: 'metal', tint: 0.88 });

    // 塔冠竖鳍 + 桅杆
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      C.fin({
        dx: Math.cos(a) * 9, dz: Math.sin(a) * 9, y0: 150, w: 1.1, d: 1.6, h: 37,
        yaw: -a, fam: 'metal', tint: 0.92
      });
    }
    C.solid({ k: 'cyl', dx: 0, dz: 0, y0: 187, r0: 0.9, r1: 0.28, h: 12, seg: 8, color: 0xb8bfc4, tint: 1 });

    // 裙房入口柱廊 + 雨棚
    C.colonnade({ n: 5, span: 26, dx: 0, dz: 27, y0: 0, h: 12, r: 1.2, seg: 8, fam: 'granite', tint: 0.9 });
    C.box({ dx: 0, dz: 24, y0: 12, w: 34, d: 8, h: 1.5, fam: 'metal', tint: 0.86 });
  },

  // ==========================================================================
  // 永安广场（1987）：方正的写字楼塔 —— 三段退台方塔（38 → 33 → 28）
  // + 顶部招牌基座 + 招牌板 + 桅杆，立面竖梃明显（每段 16+8+8 道）。
  // 与新世界中心区分：这座是方正退台 + 硬收口，没有弧面、没有观景圆层。
  // ==========================================================================
  'wong-won-plaza': (C, L) => {
    const H = L.h;                       // 187
    C.fact('height', H);
    C.fact('setbacks', 3);
    C.fact('mullions', 32);
    C.fact('signH', 6);
    C.fact('mastTop', 201);

    // 裙房基座
    C.box({ dx: 0, dz: 0, y0: -4, w: 58, d: 52, h: 24, fam: 'granite', tint: 0.88 });
    C.box({ dx: 0, dz: 0, y0: 20, w: 61, d: 55, h: 1.8, fam: 'metal', tint: 0.85 });
    for (let i = 0; i < 8; i++) {
      const x = -22 + i * (44 / 7);
      C.fin({ dx: x, dz: 27.6, y0: -2, w: 1.1, d: 1.3, h: 22, fam: 'metal', tint: 0.86 });
      C.fin({ dx: x, dz: -27.6, y0: -2, w: 1.1, d: 1.3, h: 22, fam: 'metal', tint: 0.86 });
    }

    // 三段退台方塔（每段顶部一道金属压顶）
    C.box({ dx: 0, dz: 0, y0: 21.8, w: 38, d: 38, h: 76.2, fam: 'glass', tint: 0.95 });
    C.box({ dx: 0, dz: 0, y0: 98, w: 40, d: 40, h: 1.6, fam: 'metal', tint: 0.84 });
    C.box({ dx: 0, dz: 0, y0: 99.6, w: 33, d: 33, h: 50.4, fam: 'glass', tint: 0.97 });
    C.box({ dx: 0, dz: 0, y0: 150, w: 35, d: 35, h: 1.6, fam: 'metal', tint: 0.84 });
    C.box({ dx: 0, dz: 0, y0: 151.6, w: 28, d: 28, h: 27.4, fam: 'glass', tint: 0.99 });
    C.box({ dx: 0, dz: 0, y0: 179, w: 30, d: 30, h: 1.6, fam: 'metal', tint: 0.84 });

    // 立面竖梃：16 + 8 + 8 = 32 道
    for (let i = 0; i < 16; i++) {
      const face = i % 4, t = (Math.floor(i / 4) - 1.5) * 11.4;
      const o = 19.2;
      const P = [[t, o, 0], [t, -o, 0], [o, t, Math.PI / 2], [-o, t, Math.PI / 2]][face];
      C.fin({ dx: P[0], dz: P[1], y0: 21.8, w: 1.0, d: 1.5, h: 76.2, yaw: P[2], fam: 'metal', tint: 0.88 });
    }
    for (let i = 0; i < 8; i++) {
      const face = i % 4, t = (Math.floor(i / 4) - 0.5) * 11;
      const o = 16.7;
      const P = [[t, o, 0], [t, -o, 0], [o, t, Math.PI / 2], [-o, t, Math.PI / 2]][face];
      C.fin({ dx: P[0], dz: P[1], y0: 99.6, w: 1.0, d: 1.4, h: 50.4, yaw: P[2], fam: 'metal', tint: 0.88 });
    }
    for (let i = 0; i < 8; i++) {
      const face = i % 4, t = (Math.floor(i / 4) - 0.5) * 9.4;
      const o = 14.2;
      const P = [[t, o, 0], [t, -o, 0], [o, t, Math.PI / 2], [-o, t, Math.PI / 2]][face];
      C.fin({ dx: P[0], dz: P[1], y0: 151.6, w: 1.0, d: 1.4, h: 27.4, yaw: P[2], fam: 'metal', tint: 0.88 });
    }

    // 顶部招牌基座 + 招牌板 + 桅杆
    C.box({ dx: 0, dz: 0, y0: 180.6, w: 20, d: 20, h: 6.4, fam: 'concrete', tint: 0.9 });
    C.solid({ dx: 0, dz: 0, y0: 187, w: 15, d: 1.2, h: 6, color: 0x2c3a48, tint: 1 });
    C.solid({ k: 'cyl', dx: 0, dz: 6, y0: 187, r0: 0.8, r1: 0.25, h: 14, seg: 8, color: 0xb8bfc4, tint: 1 });

    // 裙房入口柱廊 + 雨棚
    C.colonnade({ n: 4, span: 18, dx: 0, dz: 24, y0: 0, h: 11, r: 1.1, seg: 8, fam: 'granite', tint: 0.9 });
    C.box({ dx: 0, dz: 21, y0: 11, w: 24, d: 8, h: 1.4, fam: 'metal', tint: 0.86 });
  }
};
