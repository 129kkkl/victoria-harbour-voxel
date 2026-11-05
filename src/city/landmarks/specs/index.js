// M3 地标精建 · 规格汇总。
//
// 每座地标一个 builder(C, L)：C 是局部坐标上下文（见 ../prims.js），
// L 是 src/geo/landmarks.js 里的那条数据（提供 h / w / d / rot / family 等）。
// 形态写法与验收约定见 specs/core.js 的头注释。
//
// 分文件是为了控制单文件规模：
//   core.js  中银大厦 / IFC 二座 / 汇丰总行（形态最刁的三座，兼作 API 范例）
//   a.js     港岛西 + 湾仔北（西港城 → 会展中心）
//   b.js     湾仔东 + 港岛山顶 + 西九龙（中环广场 → M+）
//   c.js     尖沙咀海滨（钟楼 → 永安广场）
//   d.js     旺角 / 油麻地 / 红磡 / 启德
import { CORE } from './core.js';
import { A } from './a.js';
import { B } from './b.js';
import { C } from './c.js';
import { D } from './d.js';

export const LANDMARK_BUILDERS = { ...A, ...B, ...C, ...D, ...CORE };
