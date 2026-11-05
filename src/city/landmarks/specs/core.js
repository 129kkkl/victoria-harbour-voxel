// M3 地标精建 · 范例实现（API 参考）。
//
// 这里放三座形态难度最高的：中银大厦（逐层 45° 旋转收分 + X 型支撑）、
// 国际金融中心二座（八角收分塔 + 塔冠鳍片）、汇丰总行（悬挂模块 + 外露桁架）。
// 其余 29 座按同样的写法分散在 a.js / b.js / c.js / d.js。
//
// ── 写法约定 ──────────────────────────────────────────────────────────────
//   builder(C, L)  C = LandmarkContext（见 landmarks/prims.js），L = landmarks.js 里的那条
//   所有 dx / dz / y0 都是**地标局部坐标**：dx 向东、dz 向南、y0 距±0 的高度
//   yaw 是相对地标自身的额外转角（弧度），地标整体朝向由 L.rot 决定
//
//   C.box({dx,dz,y0,w,d,h,yaw,fam,tint})            盒体（fam 见 proceduralTextures）
//   C.taper({dx,dz,y0,w,d,tw,td,h,yaw,fam})         四棱台：底 w×d，顶 tw×td
//   C.wedge({dx,dz,y0,w,d,h,apexT,yaw,fam})         三棱柱（坡屋面；apexT=0.5 单坡）
//   C.cyl({dx,dz,y0,r0,r1,h,seg,yaw,fam})           圆台（r1=0 可用 C.cone）
//   C.dome({dx,dz,y0,rx,ry,rz,seg,fam})             椭球冠
//   C.torus({dx,dz,y0,r,tube,seg,arc,yaw,fam})      圆环
//   C.fin({dx,dz,y0,w,d,h,yaw,pitch,fam})           薄鳍 / 竖梃 / 桁架杆
//   C.colonnade({n,span,dx,dz,y0,h,r,yaw,fam})      一排柱子
//   C.stairs({dx,dz,y0,w,d,h,steps,yaw,fam})        阶梯式基座
//   C.link([dx,dy,dz], [dx,dy,dz], r, opt)          两点间斜杆（桁架 / 拉索）
//   C.solid({dx,dz,y0,w,d,h,k,color,tint})          顶点色杂项（桅杆 / 钟面 / 屋顶设备）
//   C.fact('name', value)                           声明可被数值验收断言的设计事实
//
//   材质族 fam：glass / concrete / tileOld / mosaic / granite / brick /
//               colonial / metal / industrial，杂项用 'solid'（顶点色）
//
// ── 验收约定 ──────────────────────────────────────────────────────────────
//   C.fact 声明的值必须能从**真实生成的几何**量出来（scripts/verify-landmarks.mjs
//   会去量顶点），不是"我说是就是"。所以 fact 要写成几何可验证的形式：
//     height / baseWidth / topWidth / taper / layers / masts / fins / 等计数

export const CORE = {
  // ==========================================================================
  // 中银大厦（贝聿铭，1990）：四段棱柱逐段旋转 45°，每段各自收分，
  // 形成"水晶簇"般的三角切面；顶部两根桅杆把 315m 拉到 367m。
  // 从尖沙咀东望，它靠"锐利的斜切面 + 双桅"认出来。
  // ==========================================================================
  boc: (C, L) => {
    const H = L.h;                       // 315
    C.fact('height', H);
    C.fact('layers', 4);
    C.fact('masts', 2);
    C.fact('mastTop', H + 52);

    // 花岗岩裙房
    C.taper({ dx: 0, dz: 0, y0: -6, w: 78, d: 78, tw: 66, td: 66, h: 24, fam: 'granite', tint: 0.86 });
    C.box({ dx: 0, dz: 0, y0: 18, w: 60, d: 60, h: 5, fam: 'granite', tint: 0.92 });

    // 4 段收分棱柱，逐段旋转 45°
    const bands = [
      [23, 128, 52, 46, 0],
      [128, 206, 48, 41, 45],
      [206, 266, 42, 33, 0],
      [266, H, 33, 21, 45]
    ];
    for (const [y0, y1, w, tw, yawDeg] of bands) {
      const yaw = yawDeg * Math.PI / 180;
      C.taper({ dx: 0, dz: 0, y0, w, d: w, tw, td: tw, h: y1 - y0, yaw, fam: 'glass', tint: 0.95 });
      // 分段处一圈金属压顶
      C.box({ dx: 0, dz: 0, y0: y1 - 1.4, w: tw * 1.07, d: tw * 1.07, h: 2.0, yaw, fam: 'metal', tint: 0.95 });
    }

    // 四道斜切棱线：从裙房顶一路收进塔冠，是中银"水晶"读法的关键
    for (let k = 0; k < 4; k++) {
      const a = (k * 90 + 45) * Math.PI / 180;
      const r0 = 36.8, r1 = 14.8;
      C.link(
        [Math.cos(a) * r0, 23, Math.sin(a) * r0],
        [Math.cos(a) * r1, H, Math.sin(a) * r1],
        1.1, { color: 0xb9c2c8, tint: 1 }
      );
    }

    // X 型支撑：每段立面 4 组（中银最醒目的立面语言）
    for (const [y0, y1, r] of [[30, 128, 25], [136, 206, 22], [212, 262, 18], [272, H - 4, 12]]) {
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2;
        const px = Math.cos(a), pz = Math.sin(a);
        const tx = -Math.sin(a), tz = Math.cos(a);
        const w = r * 0.62;
        C.link([px * r - tx * w, y0, pz * r - tz * w], [px * r + tx * w, y1, pz * r + tz * w], 0.85);
        C.link([px * r + tx * w, y0, pz * r + tz * w], [px * r - tx * w, y1, pz * r - tz * w], 0.85);
      }
    }

    // 塔冠 + 双桅
    C.taper({ dx: 0, dz: 0, y0: H, w: 21, d: 21, tw: 12, td: 12, h: 12, yaw: 45 * Math.PI / 180, fam: 'glass' });
    for (const s of [-1, 1]) {
      C.solid({ k: 'cyl', dx: s * 6.5, dz: 0, y0: H + 6, r0: 1.7, r1: 0.45, h: 46, seg: 8, color: 0xc2c8cd });
    }
  },

  // ==========================================================================
  // 国际金融中心二座（Cesar Pelli，2003）：415m，八角收分塔身 + 8 道通高竖鳍
  // + "鲨鳍"塔冠。从尖沙咀西望，它是维港最修长的剪影。
  // ==========================================================================
  ifc2: (C, L) => {
    const H = L.h;                       // 415
    C.fact('height', H);
    C.fact('fins', 8);
    C.fact('octSides', 8);
    C.fact('mastTop', H + 33);

    // IFC 商场裙房（连着码头）
    C.taper({ dx: 0, dz: 0, y0: -6, w: 132, d: 96, tw: 118, td: 88, h: 26, fam: 'concrete', tint: 0.82 });
    C.box({ dx: 0, dz: 0, y0: 20, w: 104, d: 78, h: 12, fam: 'glass', tint: 0.92 });
    C.box({ dx: -46, dz: 0, y0: 32, w: 30, d: 62, h: 8, fam: 'metal', tint: 0.86 });

    // 塔身：八角柱，下段近直、上段内收（IFC2 的收分主要发生在塔冠，塔身近乎等截面）
    const OCT = 8, YAW = Math.PI / 8;
    C.cyl({ dx: 0, dz: 0, y0: 30, r0: 30, r1: 28.6, h: 320, seg: OCT, yaw: YAW, fam: 'glass', tint: 0.97 });
    C.cyl({ dx: 0, dz: 0, y0: 350, r0: 28.6, r1: 25, h: 35, seg: OCT, yaw: YAW, fam: 'glass', tint: 0.97 });

    // 8 道竖向肋板（IFC 的竖向划分，也是它的辨识点）。
    // 肋板是**贴在立面上略凸出 1m 的薄板**，不是半径恒定的悬空片 ——
    // 所以半径要按各段塔身的收分取值、并略小于塔身半径，只让外缘露出一点。
    for (let k = 0; k < OCT; k++) {
      const a = YAW + k * Math.PI * 2 / OCT + Math.PI / 8;
      const cx = Math.cos(a), cz = Math.sin(a);
      C.fin({ dx: cx * 28.6, dz: cz * 28.6, y0: 30, w: 1.8, d: 2.2, h: 320, yaw: -a, fam: 'metal', tint: 0.9 });
      C.fin({ dx: cx * 25.2, dz: cz * 25.2, y0: 350, w: 1.8, d: 2.0, h: 35, yaw: -a, fam: 'metal', tint: 0.9 });
    }

    // 塔冠：八角收分 + 8 片鲨鳍 + 桅杆
    C.cyl({ dx: 0, dz: 0, y0: 385, r0: 23, r1: 12, h: 24, seg: OCT, yaw: YAW, fam: 'glass', tint: 1.02 });
    for (let k = 0; k < OCT; k++) {
      const a = YAW + k * Math.PI * 2 / OCT + Math.PI / 8;
      const r = 14.5;
      C.fin({
        dx: Math.cos(a) * r, dz: Math.sin(a) * r, y0: 372,
        w: 1.5, d: 4.2, h: 38, yaw: -a, pitch: -0.10, fam: 'metal', tint: 0.95
      });
    }
    C.solid({ k: 'cyl', dx: 0, dz: 0, y0: 409, r0: 2.2, r1: 0.5, h: 39, seg: 10, color: 0xb8bfc4 });
    // 塔身环箍：TorusGeometry 默认立在 XY 面（竖环），要水平绕塔必须 pitch 90°
    C.torus({ dx: 0, dz: 0, y0: 336, r: 28.2, tube: 0.9, seg: 24, pitch: Math.PI / 2, fam: 'metal', tint: 0.9 });
  },

  // ==========================================================================
  // 汇丰总行（Norman Foster，1985）：5 段悬挂模块吊在 4 根桅杆之间，
  // 外露的两道环梁 + X 型桁架，底层是全开放的公共穿廊。
  // 60m 的低矮体量却靠"结构外露"在天际线里极好认。
  // ==========================================================================
  hsbc: (C, L) => {
    const W = L.w, D = L.d, H = L.h;     // 110 × 72 × 60
    C.fact('height', H);
    C.fact('masts', 4);
    C.fact('modules', 5);
    C.fact('ringBeams', 2);

    // 花岗岩台基 + 全开放穿廊（汇丰最著名的公共空间）
    C.box({ dx: 0, dz: 0, y0: -5, w: W + 22, d: D + 18, h: 6, fam: 'granite', tint: 0.84 });
    C.colonnade({ n: 6, span: W * 0.72, dx: 0, dz: D * 0.5 + 2, y0: 1, h: 13, r: 1.9, fam: 'metal', tint: 0.86 });
    C.colonnade({ n: 6, span: W * 0.72, dx: 0, dz: -D * 0.5 - 2, y0: 1, h: 13, r: 1.9, fam: 'metal', tint: 0.86 });
    C.box({ dx: 0, dz: 0, y0: 14, w: W + 6, d: D + 6, h: 2.2, fam: 'metal', tint: 0.88 });

    // 5 段悬挂模块：越往上越收，段间留出设备层（深色凹槽）
    const mods = 5, mH = (H - 16) / mods;
    for (let i = 0; i < mods; i++) {
      const t = i / (mods - 1);
      const w = W * (1 - 0.10 * t), d = D * (1 - 0.10 * t);
      const y0 = 16 + i * mH;
      C.box({ dx: 0, dz: 0, y0, w, d, h: mH - 3.4, fam: 'glass', tint: 0.95 + 0.02 * i });
      C.box({ dx: 0, dz: 0, y0: y0 + mH - 3.4, w: w * 1.035, d: d * 1.035, h: 3.4, fam: 'metal', tint: 0.8 });
    }

    // 4 根桅杆：穿过整栋楼、高出屋面
    const mx = W * 0.38, mz = D * 0.38;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        C.box({
          dx: sx * mx, dz: sz * mz, y0: -2, w: 3.6, d: 3.6, h: H + 12,
          fam: 'metal', tint: 0.86
        });
      }
    }

    // 两道环梁 + 8 组 X 型桁架（结构外露）
    for (const y of [16 + mH * 1.5, 16 + mH * 3.5]) {
      C.box({ dx: 0, dz: 0, y0: y - 1.8, w: W * 1.02, d: D * 1.02, h: 3.6, fam: 'metal', tint: 0.82 });
    }
    for (const sz of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const x0 = -mx + i * (2 * mx / 2.5), x1 = -mx + (i + 1) * (2 * mx / 2.5);
        const z = sz * (D * 0.5 + 0.9);
        C.link([x0, 20, z], [x1, H - 8, z], 0.9);
        C.link([x1, 20, z], [x0, H - 8, z], 0.9);
      }
    }

    // 屋顶：机房 + 冷却塔 + 擦窗机轨道
    C.box({ dx: 0, dz: 0, y0: H, w: W * 0.34, d: D * 0.42, h: 7, fam: 'metal', tint: 0.84 });
    for (const s of [-1, 1]) {
      C.solid({ dx: s * W * 0.28, dz: 0, y0: H, w: 7, d: 11, h: 5, color: 0x9aa0a6, tint: 1 });
    }
  }
};
