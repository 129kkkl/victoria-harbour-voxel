// 港岛西 + 湾仔北（M3）：西港城 / 招商局大厦 / 力宝中心 / 海富中心 /
// 国际金融中心一座 / 中环天星码头钟楼 / 立法会综合大楼 / 香港会议展览中心。
// 形态写法见 specs/core.js 头注释。
//
// 这一批从上环老城（红砖市集、爱德华钟楼）一路排到金钟/湾仔的现代塔群，
// 再落到会展的大跨屋面。"矮而有特征"的比"高而方"的更难做，所以每座
// 先想清楚它在天际线里靠什么被认出来，再决定原语组合。
//
// 尺寸口径：L.h 是权威总高，本批几何一律从 y0=0 起、最高点收到 L.h，
// 保证包围盒总高与 L.h 一致；L.w / L.d 作为体量进深的参考。
export const A = {
  // ==========================================================================
  // 西港城（1906，爱德华式）：花岗岩台基上的红砖市集，正中三角山花 +
  // 前后拱券柱廊 + 四角锥顶小塔楼。在上环一片方盒子里，它靠
  // "红砖墙身 + 三角山花 + 四角尖塔"一眼认出来。
  // ==========================================================================
  'western-market': (C, L) => {
    const H = L.h;                       // 26
    C.fact('height', H);
    C.fact('turrets', 4);
    C.fact('columns', 14);
    C.fact('pediments', 1);
    C.fact('ridgeTop', 25.5);
    C.fact('finialTop', 28);

    // 花岗岩台基 + 压顶
    C.box({ dx: 0, dz: 0, y0: 0, w: 112, d: 64, h: 4, fam: 'granite', tint: 0.82 });
    C.box({ dx: 0, dz: 0, y0: 4, w: 115, d: 67, h: 1, fam: 'granite', tint: 0.92 });

    // 红砖墙身 + 壁柱（竖向划分）
    C.box({ dx: 0, dz: 0, y0: 5, w: 104, d: 56, h: 12, fam: 'brick', tint: 0.95 });
    for (const sz of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        C.fin({ dx: -42 + i * 21, dz: sz * 28.6, y0: 5, w: 2.4, d: 1.8, h: 12, fam: 'brick', tint: 0.86 });
      }
    }

    // 拱券柱廊（前后两排）+ 楣梁
    for (const sz of [-1, 1]) {
      C.colonnade({ n: 7, span: 88, dx: 0, dz: sz * 31, y0: 5, h: 8, r: 1.35, seg: 8, fam: 'granite', tint: 0.9 });
      C.box({ dx: 0, dz: sz * 31, y0: 13, w: 98, d: 4.2, h: 2, fam: 'granite', tint: 0.93 });
    }

    // 正中三角山花（面向海湾，三角面朝 ±z 故旋转 90°）
    C.wedge({ dx: 0, dz: 30.5, y0: 15, w: 9, d: 28, h: 7, apexT: 0, yaw: Math.PI / 2, fam: 'granite', tint: 0.96 });

    // 四角小塔楼：砖柱身收分 + 花岗岩腰线 + 六角锥顶（尖 = H）
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        C.cyl({ dx: sx * 47, dz: sz * 25, y0: 0, r0: 3.9, r1: 3.2, h: 20, seg: 6, fam: 'brick', tint: 0.92 });
        C.cyl({ dx: sx * 47, dz: sz * 25, y0: 20, r0: 3.7, r1: 3.7, h: 1, seg: 6, fam: 'granite', tint: 0.95 });
        C.cone({ dx: sx * 47, dz: sz * 25, y0: 21, r0: 4.3, h: 5, seg: 6, fam: 'tileOld', tint: 0.8 });
        C.solid({ k: 'cyl', dx: sx * 47, dz: sz * 25, y0: 26, r0: 0.45, r1: 0.15, h: 2, seg: 6, color: 0xb8bfc4 });
      }
    }

    // 四坡屋面（四棱台）+ 正脊 + 屋顶气窗
    C.taper({ dx: 0, dz: 0, y0: 17, w: 106, d: 58, tw: 56, td: 16, h: 6, fam: 'tileOld', tint: 0.82 });
    C.wedge({ dx: 0, dz: 0, y0: 23, w: 56, d: 16, h: 2.5, apexT: 0, fam: 'tileOld', tint: 0.86 });
    for (const s of [-1, 1]) {
      C.box({ dx: s * 26, dz: 0, y0: 22, w: 6, d: 8, h: 2.4, fam: 'brick', tint: 0.88 });
    }
  },

  // ==========================================================================
  // 招商局大厦（1986）：双塔并列、中间留缝，脚下是宽而扁的客运码头裙房，
  // 向海一侧伸出登船平台与雨棚。它靠"双塔 + 码头裙房 + 屋顶桅杆"认出来。
  // ==========================================================================
  'shun-tak': (C, L) => {
    const H = L.h;                       // 152
    C.fact('height', H);
    C.fact('towers', 2);
    C.fact('fins', 16);
    C.fact('masts', 2);
    C.fact('mastTop', 156);
    C.fact('podiumTop', 15);

    // 客运码头裙房：宽而扁，向海一侧（+dz）伸出
    C.box({ dx: 0, dz: 6, y0: 0, w: 74, d: 44, h: 15, fam: 'concrete', tint: 0.84 });
    C.box({ dx: 0, dz: 6, y0: 15, w: 77, d: 47, h: 1.6, fam: 'metal', tint: 0.86 });
    C.box({ dx: 0, dz: 34, y0: 0, w: 64, d: 24, h: 3.5, fam: 'granite', tint: 0.85 });
    C.box({ dx: 0, dz: 35, y0: 3.5, w: 58, d: 20, h: 1.6, fam: 'metal', tint: 0.8 });
    C.colonnade({ n: 8, span: 56, dx: 0, dz: 46, y0: 0, h: 3.5, r: 1.1, seg: 8, fam: 'granite', tint: 0.88 });

    // 裙房壁柱（竖向划分，把 74m 长的裙房打散）
    for (let i = 0; i < 8; i++) {
      C.fin({ dx: -36 + i * 10.3, dz: 28.4, y0: 0, w: 2, d: 1.6, h: 15, fam: 'concrete', tint: 0.8 });
    }

    // 双塔：中间留缝，玻璃幕墙 + 竖向鳍片（每塔 8 根）
    for (const s of [-1, 1]) {
      const dx = s * 11.5;
      C.box({ dx, dz: -2, y0: 15, w: 18, d: 24, h: 126, fam: 'glass', tint: 0.95 });
      for (const f of [-1, 1]) {
        C.fin({ dx: dx + f * 9.4, dz: -2, y0: 15, w: 1.1, d: 21, h: 126, fam: 'metal', tint: 0.85 });
      }
      for (let i = -1; i <= 1; i++) {
        C.fin({ dx: dx + i * 5, dz: 10.4, y0: 15, w: 1.1, d: 1.1, h: 126, fam: 'metal', tint: 0.85 });
        C.fin({ dx: dx + i * 5, dz: -14.4, y0: 15, w: 1.1, d: 1.1, h: 126, fam: 'metal', tint: 0.85 });
      }
    }

    // 设备层腰线（塔身的水平划分）
    for (const y of [74, 108]) {
      C.box({ dx: 0, dz: -2, y0: y, w: 44, d: 27, h: 2, fam: 'metal', tint: 0.82 });
    }

    // 塔顶：檐口 + 收分段 + 机房 + 桽杆（杆顶 = H）
    for (const s of [-1, 1]) {
      const dx = s * 11.5;
      C.box({ dx, dz: -2, y0: 141, w: 20, d: 26, h: 2.2, fam: 'metal', tint: 0.88 });
      C.taper({ dx, dz: -2, y0: 143, w: 16, d: 20, tw: 11, td: 13, h: 4, fam: 'glass', tint: 0.9 });
      C.box({ dx, dz: -2, y0: 147, w: 11, d: 13, h: 2.5, fam: 'industrial', tint: 0.8 });
      C.solid({ k: 'cyl', dx, dz: -2, y0: 149.5, r0: 0.9, r1: 0.3, h: 6.5, seg: 8, color: 0xb8bfc4 });
    }

    // 码头设备：登船桥 + 吊机框
    for (const s of [-1, 1]) {
      C.solid({ dx: s * 22, dz: 24, y0: 16.6, w: 9, d: 6, h: 4.5, color: 0x9aa0a6 });
    }
    C.solid({ dx: 0, dz: 30, y0: 16.6, w: 26, d: 4, h: 3.5, color: 0x8b9298 });
  },

  // ==========================================================================
  // 力宝中心（Paul Rudolph，1986）：两座塔，每座是"十字形核心 + 8 个错层
  // 悬挑盒"，悬挑盒逐层转 90°、同层两盒再错开 4m，像一摞爬在核心上的方块。
  // 认它靠的就是这凹凸错落的剪影——绝不是普通方塔。
  // ==========================================================================
  'lippo': (C, L) => {
    const H = L.h;                       // 186
    C.fact('height', H);
    C.fact('towers', 2);
    C.fact('cantilevers', 16);
    C.fact('blockLevels', 4);
    C.fact('coreTop', 172);
    C.fact('spireTop', H);

    for (const [tx, tz] of [[-19, -11], [19, 11]]) {
      // 十字形核心：两根方柱交叉，172m 以下通高（上下两段便于量高度）
      for (const [w, d] of [[20, 9], [9, 20]]) {
        C.box({ dx: tx, dz: tz, y0: 0, w, d, h: 93, fam: 'glass', tint: 0.93 });
        C.box({ dx: tx, dz: tz, y0: 93, w, d, h: 79, fam: 'glass', tint: 0.96 });
      }
      // 核心四端竖梃
      for (const [ex, ez] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
        C.fin({ dx: tx + ex, dz: tz + ez, y0: 0, w: 1.5, d: 1.5, h: 172, fam: 'metal', tint: 0.85 });
      }
      // 核心腰线（跟着悬挑盒顶走）
      for (const y of [38, 80, 122, 164]) {
        C.box({ dx: tx, dz: tz, y0: y, w: 21, d: 21, h: 1.2, fam: 'metal', tint: 0.82 });
      }

      // 8 个错层悬挑盒：4 层 × 2 盒，逐层转 90°，同层错开 4m
      const levels = [17, 59, 101, 143];
      for (let i = 0; i < 4; i++) {
        const axisX = i % 2 === 0;
        for (let j = 0; j < 2; j++) {
          const s = j === 0 ? -1 : 1;
          const y0 = levels[i] + (j === 1 ? 4 : 0);
          const dx = axisX ? s * 11.5 : 0;
          const dz = axisX ? 0 : s * 11.5;
          C.box({
            dx: tx + dx, dz: tz + dz, y0,
            w: axisX ? 24 : 18, d: axisX ? 18 : 24, h: 22,
            fam: 'glass', tint: 0.9 + 0.03 * i
          });
          // 悬挑盒檐口压条
          C.box({
            dx: tx + dx, dz: tz + dz, y0: y0 + 20.6,
            w: axisX ? 25 : 19, d: axisX ? 19 : 25, h: 1.4,
            fam: 'metal', tint: 0.85
          });
          // 悬挑斜撑（结构外露的小读法）
          const bx = axisX ? s * 4 : 0, bz = axisX ? 0 : s * 4;
          C.link([tx + bx, y0 - 2, tz + bz], [tx + dx, y0 + 1, tz + dz], 0.7);
        }
      }

      // 屋顶机房 + 桅杆（杆顶 = H）
      C.box({ dx: tx, dz: tz, y0: 172, w: 13, d: 13, h: 10, fam: 'industrial', tint: 0.82 });
      C.solid({ k: 'cyl', dx: tx, dz: tz, y0: 182, r0: 1.3, r1: 0.35, h: 4, seg: 8, color: 0xb8bfc4 });
    }
  },

  // ==========================================================================
  // 海富中心（1980）：双塔 + 大裙房（商场），塔身方正带竖梃，
  // 顶部两步收分 + 屋顶机房 + 桅杆。靠"方塔双子 + 大商场底盘"站在金钟。
  // ==========================================================================
  'admiralty': (C, L) => {
    const H = L.h;                       // 216
    C.fact('height', H);
    C.fact('towers', 2);
    C.fact('fins', 24);
    C.fact('crownSteps', 2);
    C.fact('mastTop', H);

    // 大裙房（商场）+ 柱廊
    C.box({ dx: 0, dz: 0, y0: 0, w: 80, d: 60, h: 20, fam: 'concrete', tint: 0.84 });
    C.box({ dx: 0, dz: 0, y0: 20, w: 84, d: 64, h: 2, fam: 'granite', tint: 0.92 });
    for (const sz of [-1, 1]) {
      C.colonnade({ n: 8, span: 62, dx: 0, dz: sz * 33, y0: 0, h: 11, r: 1.6, seg: 8, fam: 'granite', tint: 0.88 });
      C.box({ dx: 0, dz: sz * 33, y0: 11, w: 74, d: 5, h: 2.4, fam: 'granite', tint: 0.92 });
    }

    // 双塔 + 竖梃（每塔 12 根）
    for (const s of [-1, 1]) {
      const dx = s * 11.5;
      C.box({ dx, dz: 0, y0: 22, w: 20, d: 26, h: 176, fam: 'glass', tint: 0.95 });
      for (const f of [-1, 1]) {
        C.fin({ dx: dx + f * 10.3, dz: 0, y0: 22, w: 1.1, d: 23, h: 176, fam: 'metal', tint: 0.85 });
      }
      for (let i = -2; i <= 2; i++) {
        C.fin({ dx: dx + i * 4, dz: 13.3, y0: 22, w: 1.1, d: 1.1, h: 176, fam: 'metal', tint: 0.85 });
        C.fin({ dx: dx + i * 4, dz: -13.3, y0: 22, w: 1.1, d: 1.1, h: 176, fam: 'metal', tint: 0.85 });
      }
    }

    // 设备层腰线
    for (const y of [70, 106, 150]) {
      C.box({ dx: 0, dz: 0, y0: y, w: 46, d: 29, h: 2, fam: 'metal', tint: 0.82 });
    }

    // 顶部两步收分 + 机房 + 桅杆（杆顶 = H）
    for (const s of [-1, 1]) {
      const dx = s * 11.5;
      C.taper({ dx, dz: 0, y0: 198, w: 20, d: 26, tw: 17.5, td: 23, h: 6, fam: 'glass', tint: 0.92 });
      C.taper({ dx, dz: 0, y0: 204, w: 17.5, d: 23, tw: 14, td: 19, h: 5, fam: 'glass', tint: 0.9 });
      C.box({ dx, dz: 0, y0: 209, w: 12, d: 14, h: 4, fam: 'industrial', tint: 0.8 });
      C.solid({ k: 'cyl', dx, dz: 0, y0: 213, r0: 0.8, r1: 0.25, h: 3, seg: 8, color: 0xb8bfc4 });
    }
  },

  // ==========================================================================
  // 国际金融中心一座（Cesar Pelli，2003）：与 ifc2 同族但矮而宽，
  // 八角收分塔身 + 16 道竖鳍，塔冠是 3 级平台式退台（不是鲨鳍），桅杆收顶。
  // 认它靠"敦实 + 阶梯塔冠"，与 ifc2 的修长鲨鳍形成一对。
  // ==========================================================================
  'ifc1': (C, L) => {
    const H = L.h;                       // 367
    C.fact('height', H);
    C.fact('crownSteps', 3);
    C.fact('octSides', 8);
    C.fact('fins', 16);
    C.fact('mastTop', H);

    // 商场裙房（矮而宽，与 ifc2 的裙房呼应）
    C.box({ dx: 0, dz: 0, y0: 0, w: 92, d: 76, h: 24, fam: 'concrete', tint: 0.82 });
    C.box({ dx: 0, dz: 0, y0: 24, w: 96, d: 80, h: 2.5, fam: 'granite', tint: 0.9 });
    C.box({ dx: 0, dz: 0, y0: 26.5, w: 84, d: 68, h: 9.5, fam: 'glass', tint: 0.92 });
    C.colonnade({ n: 8, span: 68, dx: 0, dz: 38, y0: 0, h: 12, r: 1.6, seg: 8, fam: 'granite', tint: 0.88 });
    for (let i = 0; i < 6; i++) {
      C.fin({ dx: -34 + i * 13.6, dz: 42.4, y0: 0, w: 2, d: 1.8, h: 24, fam: 'concrete', tint: 0.8 });
    }

    // 塔身：八角柱上下两段收分
    const OCT = 8, YAW = Math.PI / 8;
    C.cyl({ dx: 0, dz: 0, y0: 36, r0: 25, r1: 23, h: 147.5, seg: OCT, yaw: YAW, fam: 'glass', tint: 0.96 });
    C.cyl({ dx: 0, dz: 0, y0: 183.5, r0: 23, r1: 21, h: 144.5, seg: OCT, yaw: YAW, fam: 'glass', tint: 0.98 });

    // 16 道竖鳍：8 道通高 + 8 道上段（ifc 族的竖向划分）
    for (let k = 0; k < OCT; k++) {
      const a = YAW + k * Math.PI / 4 + Math.PI / 8;
      C.fin({
        dx: Math.cos(a) * 24.6, dz: Math.sin(a) * 24.6, y0: 36,
        w: 1.6, d: 5, h: 292, yaw: -a, fam: 'metal', tint: 0.88
      });
      C.fin({
        dx: Math.cos(a) * 22.6, dz: Math.sin(a) * 22.6, y0: 183.5,
        w: 1.4, d: 4.2, h: 144.5, yaw: -a, fam: 'metal', tint: 0.9
      });
    }

    // 阶梯式退台塔冠：3 级平台（这是它与 ifc2 鲨鳍塔冠的分野）
    C.cyl({ dx: 0, dz: 0, y0: 328, r0: 21.5, r1: 19.5, h: 10, seg: OCT, yaw: YAW, fam: 'glass', tint: 1.0 });
    C.cyl({ dx: 0, dz: 0, y0: 338, r0: 19.5, r1: 16.5, h: 8, seg: OCT, yaw: YAW, fam: 'metal', tint: 0.95 });
    C.cyl({ dx: 0, dz: 0, y0: 346, r0: 16.5, r1: 13, h: 7, seg: OCT, yaw: YAW, fam: 'metal', tint: 0.92 });

    // 屋顶平台 + 桅杆（杆顶 = H）
    C.box({ dx: 0, dz: 0, y0: 353, w: 18, d: 18, h: 3, fam: 'industrial', tint: 0.82 });
    C.solid({ k: 'cyl', dx: 0, dz: 0, y0: 353, r0: 1.8, r1: 0.5, h: 14, seg: 10, color: 0xb8bfc4 });
  },

  // ==========================================================================
  // 中环天星码头钟楼（1915，爱德华式）：花岗岩塔身两段收分 + 两道腰线，
  // 钟室四面各一个钟面（顶点色圆盘），挑檐下带齿饰，四坡尖顶 + 避雷针。
  // 40m 的它靠"钟面 + 尖顶"在海边站了一百年。
  // ==========================================================================
  'star-ferry-clock': (C, L) => {
    const H = L.h;                       // 40
    C.fact('height', H);
    C.fact('clockFaces', 4);
    C.fact('spireTop', 38.8);
    C.fact('rodTop', H);
    C.fact('stringCourses', 2);

    // 花岗岩台基与阶台
    C.box({ dx: 0, dz: 0, y0: 0, w: 17, d: 17, h: 1.5, fam: 'granite', tint: 0.82 });
    C.box({ dx: 0, dz: 0, y0: 1.5, w: 15, d: 15, h: 2.5, fam: 'granite', tint: 0.88 });

    // 塔身下段收分 + 四角壁柱
    C.taper({ dx: 0, dz: 0, y0: 4, w: 13.5, d: 13.5, tw: 11.5, td: 11.5, h: 15, fam: 'granite', tint: 0.92 });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        C.fin({ dx: sx * 5.85, dz: sz * 5.85, y0: 4, w: 1.7, d: 1.7, h: 23, fam: 'granite', tint: 0.86 });
      }
    }

    // 两道腰线 + 塔身上段
    C.box({ dx: 0, dz: 0, y0: 19, w: 13, d: 13, h: 2, fam: 'granite', tint: 0.95 });
    C.taper({ dx: 0, dz: 0, y0: 21, w: 11.5, d: 11.5, tw: 10.8, td: 10.8, h: 6, fam: 'granite', tint: 0.92 });
    C.box({ dx: 0, dz: 0, y0: 27, w: 12.2, d: 12.2, h: 1.2, fam: 'granite', tint: 0.95 });

    // 钟室：四面各一个钟面（顶点色圆盘 + 钟圈）+ 角柱
    C.box({ dx: 0, dz: 0, y0: 28.2, w: 12, d: 12, h: 5.8, fam: 'colonial', tint: 0.9 });
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2;
      C.solid({
        k: 'cyl', dx: Math.sin(a) * 6.35, dz: Math.cos(a) * 6.35, y0: 31.15,
        r0: 2.35, r1: 2.35, h: 0.5, seg: 10, pitch: Math.PI / 2, yaw: a,
        color: 0xece4cd
      });
      C.solid({
        k: 'cyl', dx: Math.sin(a) * 6.15, dz: Math.cos(a) * 6.15, y0: 30.7,
        r0: 2.95, r1: 2.95, h: 0.35, seg: 10, pitch: Math.PI / 2, yaw: a,
        color: 0x8c8474
      });
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        C.fin({ dx: sx * 5.9, dz: sz * 5.9, y0: 28.2, w: 1.6, d: 1.6, h: 5.8, fam: 'granite', tint: 0.86 });
      }
    }

    // 挑檐 + 齿饰
    C.box({ dx: 0, dz: 0, y0: 34, w: 14, d: 14, h: 2.2, fam: 'granite', tint: 0.95 });
    for (let i = 0; i < 8; i++) {
      const t = (i / 7 - 0.5) * 11.5;
      C.box({ dx: t, dz: 6.9, y0: 33, w: 1.1, d: 1.4, h: 1.2, fam: 'granite', tint: 0.88 });
      C.box({ dx: t, dz: -6.9, y0: 33, w: 1.1, d: 1.4, h: 1.2, fam: 'granite', tint: 0.88 });
    }

    // 四坡尖顶（四棱锥）+ 避雷针（杆顶 = H）
    C.cone({
      dx: 0, dz: 0, y0: 36.2, r0: 9.55, h: 2.6, seg: 4, thetaStart: Math.PI / 4,
      fam: 'tileOld', tint: 0.82
    });
    C.solid({ k: 'cyl', dx: 0, dz: 0, y0: 38.8, r0: 0.38, r1: 0.12, h: 1.2, seg: 8, color: 0xb8bfc4 });
  },

  // ==========================================================================
  // 立法会综合大楼（1998）：低矮横向展开，花岗岩柱廊 + 双坡斜屋面 +
  // 沿正脊的天窗带 + 顶部采光罩，面向海的平台带台阶。新古典柱式配现代
  // 屋面——靠"横向长条 + 坡顶天窗"认出来，而不是靠高度。
  // ==========================================================================
  'legco': (C, L) => {
    const H = L.h;                       // 42
    C.fact('height', H);
    C.fact('columns', 16);
    C.fact('ridgeTop', 36);
    C.fact('skylightTop', 38);
    C.fact('lanternTop', H);

    // 面向海的花岗岩平台 + 下行台阶
    C.box({ dx: 0, dz: 0, y0: 0, w: 104, d: 54, h: 5, fam: 'granite', tint: 0.84 });
    C.stairs({ dx: 0, dz: 33, y0: -0.8, w: 60, d: 16, h: 4, steps: 5, fam: 'granite', tint: 0.88 });

    // 横向主楼 + 壁柱
    C.box({ dx: 0, dz: 0, y0: 5, w: 96, d: 46, h: 22, fam: 'granite', tint: 0.9 });
    for (let i = 0; i < 6; i++) {
      for (const sz of [-1, 1]) {
        C.fin({ dx: -36 + i * 14.4, dz: sz * 23.4, y0: 5, w: 2.2, d: 1.8, h: 22, fam: 'granite', tint: 0.84 });
      }
    }

    // 花岗岩柱廊（前后两排）+ 楣梁
    for (const sz of [-1, 1]) {
      C.colonnade({ n: 8, span: 78, dx: 0, dz: sz * 25, y0: 5, h: 15, r: 1.7, seg: 8, fam: 'granite', tint: 0.92 });
      C.box({ dx: 0, dz: sz * 25, y0: 20, w: 88, d: 5, h: 2.2, fam: 'granite', tint: 0.95 });
    }

    // 斜坡屋顶（双坡，正脊沿 X 走到 36m）
    C.wedge({ dx: 0, dz: 0, y0: 27, w: 98, d: 48, h: 9, apexT: 0, fam: 'tileOld', tint: 0.85 });

    // 沿正脊的天窗带 + 中央采光罩（罩顶 = H）
    C.box({ dx: 0, dz: 0, y0: 29, w: 76, d: 7, h: 9, fam: 'metal', tint: 0.88 });
    C.box({ dx: 0, dz: 0, y0: 30, w: 26, d: 8, h: 12, fam: 'glass', tint: 0.95 });

    // 平台旗杆（立在海侧平台角上）
    for (const s of [-1, 1]) {
      C.solid({ k: 'cyl', dx: s * 44, dz: 22, y0: 5, r0: 0.35, r1: 0.12, h: 26, seg: 6, color: 0xb8bfc4 });
    }
  },

  // ==========================================================================
  // 香港会议展览中心（2005 扩建）：低矮大跨、扁而宽，屋面是"海鸥展翅"——
  // 三段桶形坡屋面拼出起伏（两翼高、中段低），正脊压铝板条，向海一侧
  // 悬挑雨棚探出填海平台。300m 的体量靠波浪屋面认，绝不是一堵盒墙。
  // ==========================================================================
  'hkcec': (C, L) => {
    const H = L.h;                       // 25
    C.fact('height', H);
    C.fact('roofWaves', 3);
    C.fact('crestTop', H);
    C.fact('deckWidth', 320);
    C.fact('fins', 30);

    // 填海平台（向海一侧 +dz 悬挑）+ 压边
    C.box({ dx: 0, dz: 18, y0: 0, w: 320, d: 190, h: 3.5, fam: 'granite', tint: 0.84 });
    C.box({ dx: 0, dz: 18, y0: 3.5, w: 320, d: 190, h: 1, fam: 'granite', tint: 0.9 });

    // 展厅体量：玻璃盒子两段 + 金属腰线
    C.box({ dx: 0, dz: -6, y0: 3.5, w: 292, d: 150, h: 9, fam: 'glass', tint: 0.9 });
    C.box({ dx: 0, dz: -6, y0: 12.5, w: 292, d: 150, h: 3.5, fam: 'glass', tint: 0.95 });
    C.box({ dx: 0, dz: -6, y0: 12.5, w: 296, d: 154, h: 1.2, fam: 'metal', tint: 0.86 });

    // 海鸥展翅屋面：三段桶形坡屋面（ridge 沿 z），两翼高中段低
    const barrels = [[-104, 8.6], [0, 6.5], [104, 8.6]];
    for (const [dx, h] of barrels) {
      C.wedge({ dx, dz: -6, y0: 16, w: 170, d: 104, h, apexT: 0, yaw: Math.PI / 2, fam: 'metal', tint: 0.88 });
      // 正脊铝板压条（翼脊条顶 = H）
      C.box({ dx, dz: -6, y0: 15 + h, w: 3, d: 168, h: 1.4, fam: 'metal', tint: 0.8 });
    }

    // 屋面檐口长向压条
    for (const sx of [-1, 1]) {
      C.box({ dx: sx * 156, dz: -6, y0: 15, w: 2, d: 172, h: 1.6, fam: 'metal', tint: 0.82 });
    }

    // 向海一侧的悬挑雨棚 + 柱廊
    C.box({ dx: 0, dz: 74, y0: 11, w: 250, d: 22, h: 1.5, fam: 'metal', tint: 0.85 });
    C.colonnade({ n: 9, span: 210, dx: 0, dz: 82, y0: 3.5, h: 7.5, r: 1.25, seg: 8, fam: 'metal', tint: 0.87 });

    // 玻璃幕墙竖梃（海侧 + 城侧各 15 根）
    for (let i = 0; i < 15; i++) {
      const t = (i / 14 - 0.5) * 284;
      C.fin({ dx: t, dz: 69.4, y0: 3.5, w: 1, d: 1, h: 12.5, fam: 'metal', tint: 0.83 });
      C.fin({ dx: t, dz: -81.4, y0: 3.5, w: 1, d: 1, h: 12.5, fam: 'metal', tint: 0.83 });
    }

    // 屋面设备
    for (const s of [-1, 1]) {
      C.solid({ dx: s * 70, dz: -40, y0: 16, w: 14, d: 10, h: 3, color: 0x9aa0a6 });
    }
  }
};
