// 湾仔东 + 港岛山顶 + 西九龙（M3）：会展中心洲际酒店 / 湾仔会议中心 /
// 中环广场 / 时代广场 / 太平山顶观景台 / ICC / 九龙站 / M+ 博物馆。
// 形态写法与验收约定见 specs/core.js 头注释。
//
// L.h 是结构高度：尖顶 / 桅杆可以高出它（中环广场的金顶尖、ICC 的塔冠桅杆），
// 其余体量围绕 ±0 起算，地面高程由 groundAt 抬到山脚 / 山顶。
export const B = {
  // ==========================================================================
  // 会展中心洲际酒店（2005）：湾仔天际线东端的弧面酒店塔楼。它靠"12 边弧面
  // 玻璃塔身 + 通高竖鳍 + 两级退台 + 屋顶机房"认出来；西侧一段低矮连接体把
  // 塔楼挂回会展中心的大跨屋顶，形成"大跨屋盖 + 细高塔"的组合。
  // ==========================================================================
  'hkcec-tower': (C, L) => {
    const H = L.h;                       // 118
    C.fact('height', H);
    C.fact('towerSides', 12);
    C.fact('setbacks', 2);
    C.fact('fins', 12);
    C.fact('plantTop', H);

    // 花岗岩基座（12 边弧面）+ 西侧低矮连接体（接回会展裙房）
    C.cyl({ dx: 0, dz: 0, y0: 0, r0: 21, r1: 20.5, h: 12, seg: 12, fam: 'granite', tint: 0.86 });
    C.box({ dx: -27, dz: 4, y0: 0, w: 44, d: 30, h: 11, fam: 'granite', tint: 0.82 });
    C.taper({ dx: -27, dz: 4, y0: 11, w: 42, d: 28, tw: 32, td: 22, h: 4, fam: 'metal', tint: 0.84 });
    C.colonnade({ n: 8, span: 36, dx: -27, dz: 19.5, y0: 0, h: 11, r: 1.2, seg: 8, fam: 'granite', tint: 0.9 });

    // 弧面塔身：12 边玻璃圆柱 + 12 道沿弧面排开的金属竖鳍 + 楼层环带
    C.cyl({ dx: 0, dz: 0, y0: 12, r0: 19.5, r1: 18, h: 76, seg: 12, fam: 'glass', tint: 0.95 });
    for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6 + Math.PI / 12;
      C.fin({
        dx: Math.sin(a) * 18.9, dz: Math.cos(a) * 18.9, y0: 12,
        w: 1.2, d: 2.4, h: 76, yaw: a, fam: 'metal', tint: 0.9
      });
    }
    for (const y of [26, 40, 54, 68]) {
      C.cyl({ dx: 0, dz: 0, y0: y, r0: 19.3, r1: 19.3, h: 1.2, seg: 12, fam: 'metal', tint: 0.88 });
    }

    // 退台一：金属腰线 + 收进的上段弧面
    C.cyl({ dx: 0, dz: 0, y0: 88, r0: 18.6, r1: 18.6, h: 3, seg: 12, fam: 'metal', tint: 0.88 });
    C.cyl({ dx: 0, dz: 0, y0: 91, r0: 16.5, r1: 15.5, h: 17, seg: 12, fam: 'glass', tint: 0.98 });

    // 退台二 + 屋顶机房（结构顶 118）
    C.cyl({ dx: 0, dz: 0, y0: 108, r0: 16, r1: 16, h: 3, seg: 12, fam: 'metal', tint: 0.88 });
    C.box({ dx: 0, dz: 0, y0: 111, w: 20, d: 18, h: 5, fam: 'metal', tint: 0.86 });
    C.box({ dx: -3, dz: 0, y0: 116, w: 10, d: 9, h: 2, fam: 'solid', color: 0x9aa0a6, tint: 1 });
  },

  // ==========================================================================
  // 湾仔会议中心（1989）："海鸥顶"是它的全部辨识度 —— 中央一道三角屋脊隆起，
  // 四片薄板从脊线向外上方张开，四角翘得最高；底下是低矮的花岗岩展馆体量。
  // 从维港看，它像一只正要起飞的海鸥压在会展大屋顶旁边。
  // ==========================================================================
  'hkcc': (C, L) => {
    const H = L.h;                       // 40
    C.fact('height', H);
    C.fact('wings', 4);
    C.fact('roofRise', 14);
    C.fact('ridgeSpan', 80);
    C.fact('columns', 12);

    // 低矮花岗岩展馆体量（大跨、水平）
    C.box({ dx: 0, dz: 0, y0: 0, w: 138, d: 78, h: 4, fam: 'granite', tint: 0.84 });
    C.box({ dx: 0, dz: 0, y0: 4, w: 130, d: 70, h: 18, fam: 'granite', tint: 0.9 });
    C.box({ dx: 0, dz: 0, y0: 22, w: 122, d: 62, h: 4, fam: 'glass', tint: 0.95 });

    // 中央三角屋脊：沿 X 起脊，从檐口 26 隆起到结构顶 40
    C.wedge({ dx: 0, dz: 0, y0: 26, w: 80, d: 24, h: 14, apexT: 0, fam: 'metal', tint: 0.9 });

    // 四片"海鸥翼"薄板：向外上方张开，四角最高（pitch 翘 Z、roll 翘 X）
    const wings = [
      [33, 21, -0.35, 0.18], [33, -21, 0.35, 0.18],
      [-33, 21, -0.35, -0.18], [-33, -21, 0.35, -0.18]
    ];
    for (const [dx, dz, pitch, roll] of wings) {
      C.fin({ dx, dz, y0: 26.8, w: 58, d: 34, h: 2.4, yaw: 0, pitch, roll, fam: 'metal', tint: 0.92 });
    }
    // 翼缘梁：沿每片翼板再压一道深色边梁，让"张开"更利落
    for (const [dx, dz, pitch, roll] of wings) {
      C.fin({ dx, dz, y0: 27.6, w: 60, d: 36, h: 0.9, yaw: 0, pitch, roll, fam: 'metal', tint: 0.78 });
    }

    // 立面竖梃 + 花岗岩柱廊（低矮展馆的水平感）
    for (let i = 0; i < 10; i++) {
      const x = -54 + i * 12;
      C.fin({ dx: x, dz: 31, y0: 4, w: 1.1, d: 1.6, h: 18, fam: 'metal', tint: 0.88 });
      C.fin({ dx: x, dz: -31, y0: 4, w: 1.1, d: 1.6, h: 18, fam: 'metal', tint: 0.88 });
    }
    C.colonnade({ n: 12, span: 112, dx: 0, dz: 36, y0: 0, h: 22, r: 1.3, seg: 8, fam: 'granite', tint: 0.92 });

    // 翼下斜撑 + 屋顶设备 + 入口台阶
    for (const s of [-1, 1]) {
      for (const dx of [-46, -15, 15, 46]) {
        C.link([dx, 22, s * 30], [dx, 30, s * 12], 0.7);
      }
    }
    for (const dx of [-36, 0, 36]) {
      C.box({ dx, dz: -18, y0: 26, w: 10, d: 8, h: 3.5, fam: 'metal', tint: 0.84 });
    }
    C.stairs({ dx: 0, dz: 42, y0: -1, w: 40, d: 8, h: 5, steps: 5, fam: 'granite', tint: 0.88 });
  },

  // ==========================================================================
  // 中环广场（1992）：湾仔的金色坐标。三棱镜塔身逐段收分，顶部扣一个尖锐的
  // 金色锥形塔冠 + 细长避雷针。夜里那个金色尖顶是它唯一的名片 —— 形态必须
  // 锐利，塔身是三角形平面，不能做成圆塔。
  // ==========================================================================
  'central-plaza': (C, L) => {
    const H = L.h;                       // 181（结构）；金顶尖 + 避雷针到 191
    C.fact('height', H);
    C.fact('towerSides', 3);
    C.fact('setbacks', 2);
    C.fact('crownRise', 28);
    C.fact('spireTop', 191);

    // 花岗岩裙房 + 玻璃带
    C.box({ dx: 0, dz: 0, y0: 0, w: 62, d: 62, h: 10, fam: 'granite', tint: 0.85 });
    C.box({ dx: 0, dz: 0, y0: 10, w: 54, d: 54, h: 8, fam: 'glass', tint: 0.92 });
    C.colonnade({ n: 8, span: 48, dx: 0, dz: 31, y0: 0, h: 10, r: 1.5, seg: 8, fam: 'granite', tint: 0.92 });

    // 三棱镜塔身：seg:3 圆柱（三棱柱）逐段收分，段间金属压顶
    const bands = [
      [18, 96, 25.4, 24.2],
      [96, 130, 23.6, 22.6],
      [130, 150, 22, 21]
    ];
    for (const [y0, y1, r0, r1] of bands) {
      C.cyl({ dx: 0, dz: 0, y0, r0, r1, h: y1 - y0, seg: 3, fam: 'glass', tint: 0.97 });
    }
    for (const [y, r] of [[94, 24.6], [128, 23]]) {
      C.cyl({ dx: 0, dz: 0, y0: y, r0: r, r1: r, h: 2.5, seg: 3, fam: 'metal', tint: 0.9 });
    }

    // 三个玻璃面各压 7 道竖梃（三棱面的竖向划分）
    for (let f = 0; f < 3; f++) {
      const a = f * Math.PI * 2 / 3 + Math.PI;   // 三棱面中心方向
      const nx = Math.sin(a), nz = Math.cos(a);
      const tx = Math.cos(a), tz = -Math.sin(a);
      for (let i = -3; i <= 3; i++) {
        C.fin({
          dx: nx * 12.6 + tx * i * 5.4, dz: nz * 12.6 + tz * i * 5.4, y0: 18,
          w: 1.1, d: 1.8, h: 132, yaw: a, fam: 'metal', tint: 0.9
        });
      }
    }

    // 金色尖锥塔冠 + 避雷针（湾仔夜景的标志，必须锐利）
    for (const [y, r] of [[150, 22.6], [152.5, 22.2], [155, 21.8]]) {
      C.cyl({ dx: 0, dz: 0, y0: y, r0: r, r1: r, h: 2, seg: 3, fam: 'metal', tint: 0.9 });
    }
    C.solid({ k: 'cone', dx: 0, dz: 0, y0: 150, r0: 22, h: 28, seg: 3, color: 0xd8b25a, tint: 1 });
    C.solid({ k: 'cyl', dx: 0, dz: 0, y0: 178, r0: 1.0, r1: 0.35, h: 13, seg: 8, color: 0xc9cdd2 });

    // 裙房屋顶设备 + 入口台阶 + 角柱
    for (const [dx, dz] of [[-18, -18], [18, -18], [0, 18]]) {
      C.box({ dx, dz, y0: 18, w: 8, d: 8, h: 3, fam: 'metal', tint: 0.84 });
    }
    C.stairs({ dx: 0, dz: 34, y0: -1, w: 26, d: 8, h: 5, steps: 5, fam: 'granite', tint: 0.88 });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        C.cyl({ dx: sx * 27, dz: sz * 27, y0: 0, r0: 1.8, r1: 1.6, h: 10, seg: 8, fam: 'granite', tint: 0.92 });
      }
    }
  },

  // ==========================================================================
  // 铜锣湾时代广场（1997）：双塔 + 大商场裙房。主塔方正带竖梃、三段退台，
  // 顶部招牌基座 + 桅杆；副塔矮一截站在旁边。裙房要宽而明显 —— 从东边看，
  // "两根方塔戳在一大块商场上"就是它。
  // ==========================================================================
  'times-square': (C, L) => {
    const H = L.h;                       // 216（结构）；桅杆到 224
    C.fact('height', H);
    C.fact('towers', 2);
    C.fact('setbacks', 3);
    C.fact('fins', 22);
    C.fact('mastTop', 224);

    // 商场裙房：宽而明显（两层退进）
    C.box({ dx: 0, dz: 0, y0: 0, w: 124, d: 88, h: 24, fam: 'granite', tint: 0.84 });
    C.box({ dx: 0, dz: 0, y0: 24, w: 106, d: 74, h: 14, fam: 'glass', tint: 0.92 });
    C.colonnade({ n: 10, span: 100, dx: 0, dz: 44, y0: 0, h: 24, r: 1.7, seg: 8, fam: 'granite', tint: 0.92 });
    C.stairs({ dx: 0, dz: 50, y0: -1, w: 48, d: 10, h: 5, steps: 5, fam: 'granite', tint: 0.88 });

    // 主塔：方正塔身 + 三段退台 + 招牌基座 + 桅杆
    const main = [
      [38, 116, 40], [116, 158, 36], [158, 186, 32], [186, 198, 28]
    ];
    for (const [y0, y1, w] of main) {
      C.box({ dx: 14, dz: 0, y0, w, d: w, h: y1 - y0, fam: 'glass', tint: 0.95 });
      C.box({ dx: 14, dz: 0, y0: y1 - 1.6, w: w + 2, d: w + 2, h: 1.8, fam: 'metal', tint: 0.88 });
    }
    C.box({ dx: 14, dz: 0, y0: 198, w: 22, d: 20, h: 12, fam: 'metal', tint: 0.86 });
    C.solid({ k: 'cyl', dx: 14, dz: 0, y0: 210, r0: 1.5, r1: 0.5, h: 14, seg: 8, color: 0xb8bfc4 });

    // 副塔：矮一截，两段退台 + 屋顶机房
    const sub = [[38, 120, 30], [120, 160, 26], [160, 180, 22]];
    for (const [y0, y1, w] of sub) {
      C.box({ dx: -16, dz: 4, y0, w, d: w, h: y1 - y0, fam: 'glass', tint: 0.93 });
      C.box({ dx: -16, dz: 4, y0: y1 - 1.6, w: w + 2, d: w + 2, h: 1.8, fam: 'metal', tint: 0.88 });
    }
    C.box({ dx: -16, dz: 4, y0: 180, w: 14, d: 12, h: 8, fam: 'metal', tint: 0.84 });

    // 竖梃：主塔 8 道、副塔 6 道、裙房 8 道（方塔的竖向划分）
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      for (const [r, y0, h] of [[20.4, 38, 78], [18.4, 116, 42]]) {
        C.fin({
          dx: 14 + Math.sin(a) * r, dz: Math.cos(a) * r, y0,
          w: 1.3, d: 2.2, h, yaw: a, fam: 'metal', tint: 0.9
        });
      }
    }
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + Math.PI / 6;
      C.fin({
        dx: -16 + Math.sin(a) * 15.4, dz: 4 + Math.cos(a) * 15.4, y0: 38,
        w: 1.2, d: 2, h: 82, yaw: a, fam: 'metal', tint: 0.9
      });
    }

    // 裙房幕墙竖梃 + 屋顶设备
    for (let i = 0; i < 8; i++) {
      C.fin({ dx: -42 + i * 12, dz: 37.5, y0: 24, w: 1, d: 1.6, h: 14, fam: 'metal', tint: 0.88 });
    }
    for (const [dx, dz] of [[-40, -24], [40, -24], [-40, 24], [40, 24]]) {
      C.box({ dx, dz, y0: 38, w: 9, d: 8, h: 3, fam: 'metal', tint: 0.84 });
    }
  },

  // ==========================================================================
  // 太平山顶观景台（onPeak）：建在 552m 山顶上的凌空平台。它靠"悬挑的扁平
  // 平台 + 细支撑柱 + 栏杆 + 通信桅杆"认出来 —— 必须是架空的，不能做成实心
  // 盒子；悬挑要明显，柱子要收在平台内侧。
  // ==========================================================================
  'victoria-peak': (C, L) => {
    const H = L.h;                       // 22（平台上部）；桅杆到 28
    C.fact('height', H);
    C.fact('columns', 4);
    C.fact('deckSpan', 46);
    C.fact('braces', 4);
    C.fact('mastTop', 28);

    // 4 根细支撑柱 + 柱脚（柱子收在内侧，让平台挑出去）
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        C.box({ dx: sx * 14, dz: sz * 8, y0: 0, w: 5, d: 5, h: 1.2, fam: 'granite', tint: 0.82 });
        C.cyl({ dx: sx * 14, dz: sz * 8, y0: 1.2, r0: 1.8, r1: 1.5, h: 8.8, seg: 8, fam: 'granite', tint: 0.9 });
        // 柱顶斜撑：柱头 → 平台下缘外角，撑住悬挑
        C.link([sx * 14, 9, sz * 8], [sx * 22, 10.6, sz * 13.5], 0.7);
      }
    }

    // 悬挑平台：扁平板 + 铺装层
    C.box({ dx: 0, dz: 0, y0: 10, w: 46, d: 30, h: 2.2, fam: 'granite', tint: 0.88 });
    C.box({ dx: 0, dz: 0, y0: 12.2, w: 42, d: 26, h: 1, fam: 'metal', tint: 0.86 });

    // 栏杆：压顶 + 密排栏杆柱
    for (const sz of [-1, 1]) {
      C.fin({ dx: 0, dz: sz * 13.2, y0: 13.2, w: 43, d: 0.5, h: 1.6, fam: 'metal', tint: 0.9 });
    }
    for (const sx of [-1, 1]) {
      C.fin({ dx: sx * 21.2, dz: 0, y0: 13.2, w: 0.5, d: 27, h: 1.6, fam: 'metal', tint: 0.9 });
    }
    C.colonnade({ n: 12, span: 40, dx: 0, dz: 13.2, y0: 13.2, h: 1.5, r: 0.22, seg: 6, fam: 'metal', tint: 0.9 });
    C.colonnade({ n: 12, span: 40, dx: 0, dz: -13.2, y0: 13.2, h: 1.5, r: 0.22, seg: 6, fam: 'metal', tint: 0.9 });

    // 观景小亭（半开放）+ 上平台台阶
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        C.cyl({ dx: -12 + sx * 6, dz: sz * 4.5, y0: 13.2, r0: 0.6, r1: 0.6, h: 5.8, seg: 6, fam: 'metal', tint: 0.88 });
      }
    }
    C.box({ dx: -12, dz: 0, y0: 19, w: 15, d: 12, h: 0.9, fam: 'metal', tint: 0.86 });
    C.stairs({ dx: 26, dz: 0, y0: -1, w: 9, d: 8, h: 11, steps: 8, fam: 'granite', tint: 0.86 });

    // 通信桅杆（杂项顶点色）+ 横担 + 拉索
    C.solid({ k: 'cyl', dx: 15, dz: -9, y0: 12.2, r0: 1.1, r1: 0.4, h: 15.8, seg: 8, color: 0xb8bfc4 });
    for (let i = 0; i < 3; i++) {
      C.solid({ dx: 15, dz: -9, y0: 20 + i * 3, w: 5 - i, d: 0.5, h: 0.5, color: 0xb8bfc4, tint: 1 });
    }
    for (const s of [-1, 1]) {
      C.link([15, 22, -9], [15 + s * 12, 13.4, -9 - s * 6], 0.35);
    }
  },

  // ==========================================================================
  // 环球贸易广场 ICC（2010）：香港最高楼，从尖沙咀东望必须压住全场。方形平面
  // 四角倒角，塔身 4 段逐段收分、段间凹进设备层，4 道竖鳍沿倒角通高而上；
  // 顶部是阶梯式收进的塔冠 + 细桅杆 —— 修长、笔直、顶部收得干净。
  // ==========================================================================
  'icc': (C, L) => {
    const H = L.h;                       // 484（结构）；桅杆到 504
    C.fact('height', H);
    C.fact('towerSegs', 4);
    C.fact('mechBands', 3);
    C.fact('fins', 4);
    C.fact('crownSteps', 2);
    C.fact('mastTop', 504);

    // 倒角方形平面 = 中央方柱 + 两侧窄条 + 四角 45° 斜面
    const chamf = (y0, y1, W, c, fam, tint) => {
      const h = y1 - y0;
      C.box({ dx: 0, dz: 0, y0, w: W - 2 * c, d: W, h, fam, tint });
      for (const s of [-1, 1]) {
        C.box({ dx: s * (W / 2 - c / 2), dz: 0, y0, w: c, d: W - 2 * c, h, fam, tint });
      }
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          C.box({
            dx: sx * (W / 2 - c / 2), dz: sz * (W / 2 - c / 2), y0,
            w: c * Math.SQRT2 + 2.4, d: 2.2, h, yaw: sx * sz * Math.PI / 4, fam, tint
          });
        }
      }
    };

    // 圆方裙房（ICC 商场 + 九龙站）
    C.cyl({ dx: 0, dz: 0, y0: 0, r0: 54, r1: 51, h: 20, seg: 12, fam: 'concrete', tint: 0.84 });
    C.cyl({ dx: 0, dz: 0, y0: 20, r0: 47, r1: 44, h: 16, seg: 12, fam: 'glass', tint: 0.92 });
    C.cyl({ dx: 0, dz: 0, y0: 36, r0: 45.5, r1: 45.5, h: 2.5, seg: 12, fam: 'metal', tint: 0.88 });
    C.colonnade({ n: 12, span: 88, dx: 0, dz: 47, y0: 0, h: 18, r: 1.7, seg: 8, fam: 'granite', tint: 0.9 });
    C.stairs({ dx: 0, dz: 58, y0: -1, w: 52, d: 12, h: 5, steps: 5, fam: 'granite', tint: 0.88 });

    // 塔身 4 段收分 + 3 道凹进设备层（金属深槽）
    const segs = [
      [36, 150, 54], [162, 272, 47.5], [284, 380, 41.8], [392, 458, 36.8]
    ];
    for (const [y0, y1, W] of segs) chamf(y0, y1, W, 6, 'glass', 0.97);
    for (const [y0, y1, W] of [[150, 162, 45], [272, 284, 39], [380, 392, 33]]) {
      C.box({ dx: 0, dz: 0, y0, w: W, d: W, h: y1 - y0, fam: 'metal', tint: 0.8 });
    }

    // 4 道通高竖鳍：沿四角倒角棱线，从裙房顶一路收到塔冠
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        C.link([sx * 24, 36, sz * 24], [sx * 15.4, 458, sz * 15.4], 1.3);
      }
    }

    // 阶梯式塔冠（2 级）+ 细桅杆
    chamf(458, 470, 30, 5, 'metal', 0.9);
    C.box({ dx: 0, dz: 0, y0: 470, w: 21, d: 21, h: 14, fam: 'metal', tint: 0.88 });
    C.solid({ k: 'cyl', dx: 0, dz: 0, y0: 484, r0: 1.6, r1: 0.5, h: 20, seg: 8, color: 0xb8bfc4 });

    // 裙房屋顶设备
    for (const [dx, dz] of [[-26, -26], [26, -26], [-26, 26], [26, 26], [0, -38], [0, 38]]) {
      C.box({ dx, dz, y0: 38, w: 10, d: 10, h: 4, fam: 'metal', tint: 0.84 });
    }
  },

  // ==========================================================================
  // 九龙站 / 西九龙站（2018）：420m 的超长低矮流线屋面。它靠"微微起拱的
  // 分段屋面 + 一道道横向肋条 + 站台侧长雨棚"认出来 —— 绝不能做成方盒子墙。
  // 屋面是金属板，7 段楔形拼出起拱，肋条顺屋面断面一道道排开。
  // ==========================================================================
  'west-kowloon-station': (C, L) => {
    const H = L.h;                       // 34
    C.fact('height', H);
    C.fact('roofSegs', 7);
    C.fact('ribs', 14);
    C.fact('roofRise', 20);
    C.fact('length', 420);

    // 站厅基座 + 长向玻璃带
    C.box({ dx: 0, dz: 0, y0: 0, w: 404, d: 104, h: 4, fam: 'granite', tint: 0.84 });
    C.box({ dx: 0, dz: 0, y0: 4, w: 398, d: 100, h: 10, fam: 'glass', tint: 0.93 });

    // 流线屋面：7 段楔形沿 X 拼出起拱，中段最高（脊到 34）
    const segH = [11, 14, 17, 20, 17, 14, 11];
    for (let i = 0; i < 7; i++) {
      C.wedge({
        dx: -180 + i * 60, dz: 0, y0: 14, w: 60, d: 124, h: segH[i],
        apexT: 0, fam: 'metal', tint: 0.9
      });
    }

    // 横向肋条：顺每段屋面断面的薄楔，比屋面板高出一截
    for (let i = 0; i < 7; i++) {
      for (const ox of [-15, 15]) {
        C.wedge({
          dx: -180 + i * 60 + ox, dz: 0, y0: 13.6, w: 2.4, d: 126, h: segH[i] + 1,
          apexT: 0, fam: 'metal', tint: 0.78
        });
      }
    }

    // 站台侧长雨棚 + 细柱
    C.box({ dx: 0, dz: 58, y0: 21, w: 380, d: 12, h: 1.2, fam: 'metal', tint: 0.86 });
    C.colonnade({ n: 14, span: 372, dx: 0, dz: 58, y0: 0, h: 21, r: 1.3, seg: 8, fam: 'metal', tint: 0.86 });

    // 长向幕墙竖梃（两侧各 20 道）+ 屋顶通风塔
    for (let i = 0; i < 20; i++) {
      const x = -190 + i * 20;
      C.fin({ dx: x, dz: 50.5, y0: 4, w: 1.2, d: 2, h: 10, fam: 'metal', tint: 0.88 });
      C.fin({ dx: x, dz: -50.5, y0: 4, w: 1.2, d: 2, h: 10, fam: 'metal', tint: 0.88 });
    }
    for (let i = 0; i < 6; i++) {
      C.box({ dx: -125 + i * 50, dz: 46, y0: 14, w: 12, d: 10, h: 5, fam: 'metal', tint: 0.82 });
    }
    C.stairs({ dx: -170, dz: 58, y0: -1, w: 24, d: 12, h: 6, steps: 5, fam: 'granite', tint: 0.88 });
  },

  // ==========================================================================
  // 西九龙文化区 M+ 博物馆（2021）："横躺的巨型盒子 + 悬挑大板"。宽大的水平
  // 混凝土体量一端挑出巨型展墙 / 观景板（下部完全悬空），另一端是面向维港的
  // 通透玻璃幕墙，屋顶有设备与观景步道 —— 低矮、横向、大悬挑。
  // ==========================================================================
  'wkcd': (C, L) => {
    const H = L.h;                       // 40
    C.fact('height', H);
    C.fact('cantilever', 35);
    C.fact('slabTop', H);
    C.fact('volumes', 3);
    C.fact('mullions', 10);

    // 基座（花岗岩铺地）
    C.box({ dx: -13, dz: 0, y0: 0, w: 138, d: 86, h: 4, fam: 'granite', tint: 0.84 });

    // 横向混凝土主体
    C.box({ dx: -2, dz: 0, y0: 4, w: 96, d: 74, h: 26, fam: 'concrete', tint: 0.9 });

    // 面向维港的玻璃端（通透幕墙 + 底层架空柱廊）
    C.box({ dx: -67, dz: 0, y0: 8, w: 36, d: 74, h: 28, fam: 'glass', tint: 0.97 });
    C.colonnade({ n: 10, span: 32, dx: -67, dz: 37, y0: 4, h: 4, r: 1.1, seg: 8, fam: 'metal', tint: 0.88 });
    for (let i = 0; i < 10; i++) {
      C.fin({ dx: -82 + i * 3.4, dz: 37.5, y0: 8, w: 1, d: 1.4, h: 28, fam: 'metal', tint: 0.88 });
    }

    // 悬挑巨板：巨型展墙 / 观景板，从基座边缘挑出 35m，下部悬空
    C.box({ dx: 69, dz: 0, y0: 10, w: 44, d: 68, h: 30, fam: 'concrete', tint: 0.86 });
    for (let i = 0; i < 6; i++) {
      C.fin({ dx: 69, dz: -25 + i * 10, y0: 10, w: 45, d: 1.1, h: 30, fam: 'metal', tint: 0.82 });
    }
    // 悬挑下的斜拉杆：把"挑出来"这件事画出来
    for (const s of [-1, 1]) {
      C.link([46, 30, s * 26], [88, 12, s * 30], 0.9);
      C.link([46, 30, s * 26], [62, 11, s * 30], 0.9);
    }

    // 屋顶设备 + 观景步道 + 栏杆
    for (const [dx, dz] of [[-36, -22], [-6, -22], [24, -22], [-36, 6], [24, 6]]) {
      C.box({ dx, dz, y0: 30, w: 12, d: 10, h: 5, fam: 'metal', tint: 0.84 });
    }
    C.box({ dx: -8, dz: 22, y0: 30, w: 88, d: 8, h: 1, fam: 'metal', tint: 0.88 });
    C.fin({ dx: -8, dz: 25.8, y0: 31, w: 88, d: 0.5, h: 1.4, fam: 'metal', tint: 0.9 });
    C.fin({ dx: -8, dz: 18.2, y0: 31, w: 88, d: 0.5, h: 1.4, fam: 'metal', tint: 0.9 });
    for (let i = 0; i < 8; i++) {
      C.box({ dx: -46 + i * 11, dz: 22, y0: 31, w: 0.8, d: 9, h: 2.6, fam: 'metal', tint: 0.86 });
    }
    C.stairs({ dx: -46, dz: 42, y0: -1, w: 20, d: 10, h: 5, steps: 5, fam: 'granite', tint: 0.88 });
  }
};
