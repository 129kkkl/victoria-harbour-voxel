// 色调链路桥接（M4）：把"按显示值手写"的调色板换算成线性 HDR，
// 使天空 / 海面与地形 / 建筑走同一条 线性→ACES→sRGB 链路。
//
// 背景：M1~M3 里 sky / water 是自定义 ShaderMaterial，绕过了色调映射，
// 调色板直接按最终显示值写出去；而城市层一直在线性空间里过 ACES。
// M4 全量切换到 EffectComposer（场景渲到 HalfFloat RT，OutputPass 统一
// 做 ACES + sRGB），所以天空 / 海面的基色必须先换算成"经 ACES 后仍显示为
// 原色"的线性 HDR 值 —— 这就是 displayToLinearHDR 做的事（精确逆变换）。
//
// 逆的是 three.js r160 的 ACESFilmicToneMapping（见 three ShaderChunk）：
//   color *= toneMappingExposure / 0.6
//   color = ACESInputMat * color          （列主序，见下）
//   color = RRTAndODTFit(color)           （逐通道有理曲线）
//   color = ACESOutputMat * color
//   return saturate(color)
//
// 本文件不 import three，纯数值，node 可直接跑（scripts/verify-fx.mjs 验收）。

export const TONE_EXPOSURE = 1.3; // 与 core/renderer.js 的 toneMappingExposure 一致

// GLSL mat3 构造为列主序：每三个代表一列。
const ACES_IN = [
  [0.59719, 0.07600, 0.02840],
  [0.35458, 0.90834, 0.13383],
  [0.04823, 0.01566, 0.83777]
];
const ACES_OUT = [
  [1.60475, -0.10208, -0.00327],
  [-0.53108, 1.10813, -0.07276],
  [-0.07367, -0.00605, 1.07602]
];

function inv3(m) {
  const [a, b, c] = m;
  const cross = (u, v) => [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0]
  ];
  const det = a[0] * cross(b, c)[0] + a[1] * cross(b, c)[1] + a[2] * cross(b, c)[2];
  const bc = cross(b, c), ca = cross(c, a), ab = cross(a, b);
  // 伴随矩阵的行 = 列向量的叉积
  return [
    [bc[0] / det, ca[0] / det, ab[0] / det],
    [bc[1] / det, ca[1] / det, ab[1] / det],
    [bc[2] / det, ca[2] / det, ab[2] / det]
  ];
}

const ACES_IN_INV = inv3(ACES_IN);
const ACES_OUT_INV = inv3(ACES_OUT);

const mul3 = (m, v) => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
];

// RRTAndODTFit 单通道正变换
function rrtFit(x) {
  return (x * (x + 0.0245786) - 0.000090537) / (x * (0.983729 * x + 0.4329510) + 0.238081);
}

// RRTAndODTFit 单通道逆变换：解 (0.983729v−1)x² + (0.432951v−0.0245786)x + (0.238081v+0.000090537) = 0。
// v∈[0,1] 时 A<0、C>0，两根异号，取正根 (−B−√D)/(2A)。
function rrtFitInv(v) {
  const A = 0.983729 * v - 1;
  const B = 0.432951 * v - 0.0245786;
  const C = 0.238081 * v + 0.000090537;
  const D = Math.max(0, B * B - 4 * A * C);
  return (-B - Math.sqrt(D)) / (2 * A);
}

/** sRGB 显示值 → 线性显示值（精确分段式，逐通道）。 */
export function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** 线性显示值 → sRGB 显示值（srgbToLinear 的逆，验收做往返用）。 */
export function linearToSrgb(c) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/**
 * ACESFilmic 正变换（与 three r160 逐行对应，输入线性 HDR，输出线性显示值）。
 * 仅用于验收往返测试。
 */
export function applyACES([r, g, b], exposure = TONE_EXPOSURE) {
  const k = exposure / 0.6;
  const v = mul3(ACES_IN, [r * k, g * k, b * k]).map(rrtFit);
  return mul3(ACES_OUT, v).map(x => Math.min(1, Math.max(0, x)));
}

/**
 * 显示 sRGB 颜色 → 线性 HDR 颜色：经 ACES+sRGB@exposure 链路后显示为原色。
 *
 * 输入通道允许 >1（作者调色板里的"超白"，如金色时刻地平线 1.05）：
 * 0.97 以内走精确逆变换，超出部分按比例外推（ACES 渐近白点无法精确逆）。
 */
export function displayToLinearHDR(r, g, b, exposure = TONE_EXPOSURE) {
  const k = 0.6 / exposure;
  // 注意：逆变换是矩阵混通道的，必须三分量一起做，不能逐通道。
  const y = [r, g, b].map(c => srgbToLinear(Math.min(Math.max(c, 0), 0.97)));
  const x = mul3(ACES_IN_INV, mul3(ACES_OUT_INV, y).map(rrtFitInv));
  let hdr = x.map(v => Math.max(0, v * k));
  // 病态守卫：近白中性色会撞上 ACES 的 saturate 边界（逆矩阵产生负/巨量通道），
  // 退化为"线性显示值 × 曝光补偿"——调色板里没有这类颜色，这只是保险。
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (hdr.some(v => v > 8) || (Math.max(...hdr) - Math.min(...hdr)) > 2 * (lum + 0.05)) {
    hdr = y.map(v => v * 2.2); // 经验增益：ACES(2.2x·2.17)≈0.99，落回近白
  }
  // 超白外推
  const src = [r, g, b];
  for (let i = 0; i < 3; i++) {
    if (src[i] > 0.97) hdr[i] *= src[i] / 0.97;
  }
  return hdr;
}
