// 离线数值验收（M3 地标精建）：逐座从**真实生成的几何**量出高度、截面收分、
// 轮廓台阶、尖顶长度与原语构成，再与形态断言比对。
//
// 运行：npm run verify:landmarks
//
// 关键点：这里量的是 landmarks/plan.js 产出的同一份 BufferGeometry（浏览器里
// 画的就是它），不是回读 landmarks.js 的设计表 —— 所以"断言通过"意味着
// builder 真的把楼建成了那个形状。
//
// ── 高度语义 ──────────────────────────────────────────────────────────────
//   L.h 是**结构高度**（与 landmarks.js 的约定一致）。桅杆 / 避雷针 / 尖顶
//   允许超出：中银结构 315m、双桅到 367m；IFC2 结构 415m、塔冠桅杆到 448m。
//   所以断言是 L.h - 6 ≤ 实测总高 ≤ L.h + 70，而不是硬性等于。
//
// ── 量测词汇（landmarks/measure.js）────────────────────────────────────────
//   height  几何最高点 − ±0（含尖顶 / 桅杆）
//   w@x%    距±0 x% 高度处的水平截面跨度（水平面切几何，带内取最大截面）
//   taper   顶部 88% 跨度 ÷ 塔身中段 35% 跨度（<1 = 收分，>1 = 上大下小）
//           分母用塔身中段而非地面：塔楼常带大裙房，用地面跨度会严重失真
//   steps   从下往上量，跨度每下降 8% 记一级（退台 / 收分段数）
//   spire   最高点高出"仍有 55% 底宽"那一层的高度（尖顶 / 桅杆长度）
//   peakAt  最宽处的高度占比（>0.45 = 上大下小的飞碟 / 倒锥台）
import { buildLandmarkPlan } from '../src/city/landmarks/plan.js';
import { measureLandmark, countParts } from '../src/city/landmarks/measure.js';
import { LANDMARKS } from '../src/geo/landmarks.js';
import { isLand } from '../src/geo/coastline.js';

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS  ${name} ${detail ?? ''}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail ?? ''}`); }
}

console.log('== M3 地标精建 ==');
const t0 = Date.now();
const { entries, totals } = buildLandmarkPlan();
const ms = Date.now() - t0;

const byId = new Map(entries.map(e => [e.id, e]));
const M = new Map(entries.map(e => [e.id, measureLandmark(e)]));

check('32 座地标全部有精建规格（原语 > 1）', entries.every(e => e.parts.length > 1),
  `原语总数 ${totals.parts}`);
check('地标几何生成耗时 < 4000ms（首屏预算）', ms < 4000, `实测 ${ms}ms`);
check('地标三角面 < 140k', totals.triangles < 140000, `实测 ${totals.triangles.toLocaleString()}`);
check('没有 NaN / Infinity 顶点', entries.every(e => M.get(e.id).bad === 0),
  `异常 ${entries.reduce((a, e) => a + M.get(e.id).bad, 0)}`);

// draw call 估算：材质族数 + 缆车
const fams = new Set();
for (const e of entries) for (const f of e.geometries.keys()) fams.add(f);
check('地标 draw call ≤ 14', fams.size + 1 <= 14,
  `族: ${[...fams].sort().join(' / ')} + 缆车 = ${fams.size + 1}`);

// ---------------------------------------------------------------------------
console.log('== 逐座结构高度（实测总高 = 结构高度 + 尖顶/桅杆） ==');
const H = {};                       // 结构高度（数据表）
const HT = {};                      // 实测总高（含尖顶）
for (const L of LANDMARKS) {
  const m = M.get(L.id);
  H[L.id] = L.h;
  HT[L.id] = m.height;
  check(`${L.id} 建到 ${L.h}m`, m.height >= L.h - 6 && m.height <= L.h + 70,
    `实测总高 ${m.height.toFixed(1)}m`);
}

console.log('== 天际线高度序列（从尖沙咀东望） ==');
const seq = [['icc', 484], ['ifc2', 415], ['boc', 315], ['times-square', 216],
  ['admiralty', 216], ['hang-lung', 213], ['lippo', 186], ['central-plaza', 181], ['hsbc', 60]];
for (const [id, expect] of seq) {
  check(`${id} 结构高度 ${expect}m`, Math.abs(H[id] - expect) < 0.5, `实测 ${H[id]}m`);
}
check('ICC 484 > IFC2 415 > 中银 315 > 中环广场 181 级 > 汇丰 60',
  H.icc > H.ifc2 && H.ifc2 > H.boc && H.boc > H['central-plaza'] && H['central-plaza'] > H.hsbc);
check('IFC2 / 中银 比例 ≈ 1.32',
  Math.abs(H.ifc2 / H.boc - 1.318) < 0.02, `实测 ${(H.ifc2 / H.boc).toFixed(3)}`);
check('几何实测总高排序：ICC > IFC2 > 中银 > 中环广场 > 汇丰',
  HT.icc > HT.ifc2 && HT.ifc2 > HT.boc && HT.boc > HT['central-plaza'] && HT['central-plaza'] > HT.hsbc,
  `ICC ${HT.icc.toFixed(0)} / IFC2 ${HT.ifc2.toFixed(0)} / 中银 ${HT.boc.toFixed(0)} / 汇丰 ${HT.hsbc.toFixed(0)}`);

// ---------------------------------------------------------------------------
console.log('== 地标落位 ==');
const offLand = [];
for (const L of LANDMARKS) {
  if (L.shape === 'promenade') continue;
  if (!isLand(L.lon, L.lat)) offLand.push(L.name);
}
check('除滨海步道外所有地标都落在陆地上', offLand.length === 0,
  offLand.length ? `落水: ${offLand.join(', ')}` : '');

// ---------------------------------------------------------------------------
console.log('== 逐座形态（几何实测） ==');
function form(id, name, fn) {
  const m = M.get(id), e = byId.get(id);
  if (!m) { check(`${id} ${name}`, false, '没有几何'); return; }
  const [ok, detail] = fn(m, e);
  check(`${id} ${name}`, ok, detail);
}

// —— 天际线主角 ——
form('icc', 'ICC 修长收分 + ≥4 级退台', (m) => [
  m.taper > 0.55 && m.taper <= 1.00 && m.steps >= 4,
  `收分 ${m.taper.toFixed(3)} · 台阶 ${m.steps}`]);
form('icc', 'ICC 塔冠有尖顶/桅杆 > 8m', (m) => [m.spire > 8, `尖顶 ${m.spire.toFixed(1)}m`]);

form('ifc2', 'IFC2 八角塔身', (m, e) => [
  e.parts.some(p => p.k === 'cyl' && p.seg === 8), '']);
form('ifc2', 'IFC2 塔身明显收分', (m) => [
  m.taper > 0.30 && m.taper < 0.95, `收分 ${m.taper.toFixed(3)}`]);
form('ifc2', 'IFC2 8 道通高竖鳍', (m, e) => [
  countParts(e, 'box', p => p.h > 300) >= 8, `通高竖梃 ${countParts(e, 'box', p => p.h > 300)}`]);

form('boc', '中银 ≥3 级逐层 45° 收分', (m) => [
  m.steps >= 3 && m.taper < 0.55, `台阶 ${m.steps} · 收分 ${m.taper.toFixed(3)}`]);
form('boc', '中银双桅顶到 ~367m', (m, e) => {
  const mastTop = Math.max(0, ...e.parts
    .filter(p => p.k === 'cyl' && p.fam === 'solid').map(p => p.y0 + p.h));
  return [mastTop > 350 && mastTop < 380, `桅杆顶 ${mastTop.toFixed(0)}m`];
});
form('boc', '中银外露 X 型支撑 ≥ 16 根', (m, e) => [
  countParts(e, 'tube') >= 16, `斜杆 ${countParts(e, 'tube')}`]);

form('hsbc', '汇丰 5 段悬挂模块', (m, e) => [
  countParts(e, 'box', p => p.fam === 'glass' && p.w > 80 && p.h > 5) >= 5,
  `模块 ${countParts(e, 'box', p => p.fam === 'glass' && p.w > 80 && p.h > 5)}`]);
form('hsbc', '汇丰 4 根桅杆高出屋面', (m, e) => [
  countParts(e, 'box', p => p.h > 70 && p.w < 6) >= 4,
  `桅杆 ${countParts(e, 'box', p => p.h > 70 && p.w < 6)}`]);
form('hsbc', '汇丰外露环梁 + 模块分层带', (m, e) => [
  countParts(e, 'box', p => p.fam === 'metal' && p.w > 100 && p.h < 6) >= 5,
  `水平带 ${countParts(e, 'box', p => p.fam === 'metal' && p.w > 100 && p.h < 6)}`]);
form('hsbc', '汇丰外露 X 型桁架', (m, e) => [
  countParts(e, 'tube') >= 8, `斜杆 ${countParts(e, 'tube')}`]);

// —— 形态方向性 ——
form('central-plaza', '中环广场有尖锐塔冠', (m) => [m.spire > 12, `尖顶 ${m.spire.toFixed(1)}m`]);
form('hung-hom-stadium', '红馆上大下小（飞碟）', (m) => [
  m.peakAt > 0.45 && m.peakW > m.wBase * 0.85,
  `最宽处 ${m.peakW.toFixed(0)}m 在 ${(m.peakAt * 100).toFixed(0)}% 高度（底部 ${m.wBase.toFixed(0)}m）`]);
form('west-kowloon-station', '西九龙站长条形', (m, e) => [
  Math.max(e.data.w, e.data.d) / Math.min(e.data.w, e.data.d) > 3, `${e.data.w}×${e.data.d}`]);
form('west-kowloon-station', '西九龙站长条低矮', (m) => [m.height < 45, `总高 ${m.height.toFixed(1)}m`]);
form('avenue-of-stars', '星光大道贴岸线延伸（扁 + 长）', (m, e) => [
  m.height < 14 && Math.max(e.data.w, e.data.d) / Math.min(e.data.w, e.data.d) > 8,
  `总高 ${m.height.toFixed(1)}m · ${e.data.w}×${e.data.d}`]);
form('avenue-of-stars', '星光大道有灯柱', (m, e) => [
  countParts(e, 'cyl', p => p.fam === 'solid') >= 8, `灯柱 ${countParts(e, 'cyl', p => p.fam === 'solid')}`]);
form('temple-street', '庙街是密集低层街区', (m, e) => [
  m.parts.length > 30 && m.height < 45, `原语 ${m.parts.length} · 总高 ${m.height.toFixed(1)}m`]);
form('temple-street', '庙街有霓虹招牌 / 屋顶构筑物', (m, e) => [
  e.parts.filter(p => p.fam === 'solid').length >= 10,
  `杂项 ${e.parts.filter(p => p.fam === 'solid').length}`]);

// —— 认得出的局部特征 ——
form('ts-clock-tower', '尖沙咀钟楼有尖顶', (m) => [m.spire > 8, `尖顶 ${m.spire.toFixed(1)}m`]);
form('ts-clock-tower', '尖沙咀钟楼有钟盘 / 塔饰', (m, e) => [
  e.facts.clockFaces === 4 || e.parts.filter(p => p.fam === 'solid').length >= 4,
  `clockFaces=${e.facts.clockFaces ?? '—'} · 杂项 ${e.parts.filter(p => p.fam === 'solid').length}`]);
form('peninsula', '半岛酒店有尖顶', (m) => [m.spire > 6, `尖顶 ${m.spire.toFixed(1)}m`]);
form('peninsula', '半岛酒店有柱廊', (m, e) => [
  countParts(e, 'cyl') >= 6, `柱 ${countParts(e, 'cyl')}`]);
form('western-market', '西港城有柱廊 + 坡屋面', (m, e) => [
  countParts(e, 'cyl') >= 6 && countParts(e, 'wedge') >= 1,
  `柱 ${countParts(e, 'cyl')} · 坡面 ${countParts(e, 'wedge')}`]);
form('lippo', '力宝中心有悬挑方块', (m, e) => [
  m.parts.length > 12 && m.steps >= 2, `原语 ${m.parts.length} · 台阶 ${m.steps}`]);
form('hkcc', '湾仔会议中心海鸥顶张开', (m) => [
  m.wTop > m.wMid * 0.5, `w@35% ${m.wMid.toFixed(0)} → w@88% ${m.wTop.toFixed(0)}`]);
form('cultural-centre', '文化中心是大跨低矮体量', (m, e) => [
  m.height < 70 && e.data.w / e.data.d > 1.2, `总高 ${m.height.toFixed(1)}m · ${e.data.w}×${e.data.d}`]);
form('kai-tak-cruise', '启德邮轮码头横向大悬挑', (m, e) => [
  m.height < 90 && Math.max(e.data.w, e.data.d) > 200,
  `总高 ${m.height.toFixed(1)}m · ${e.data.w}×${e.data.d}`]);
form('victoria-peak', '太平山观景台是架空平台', (m) => [m.height < 80, `总高 ${m.height.toFixed(1)}m`]);

// —— 全场收分合理性：塔楼不允许塔尖比塔基宽 ——
const towerIds = ['icc', 'ifc2', 'ifc1', 'boc', 'hsbc', 'central-plaza', 'times-square',
  'hang-lung', 'langham-place', 'lippo', 'admiralty', 'shun-tak', 'renaissance',
  'new-world-centre', 'wong-won-plaza', 'peninsula', 'harbour-city', 'hkcec-tower'];
const fatTowers = towerIds.filter(id => M.has(id) && M.get(id).taper > 1.12);
check('塔楼不出现"塔尖比塔基宽"', fatTowers.length === 0,
  fatTowers.length ? `异常: ${fatTowers.map(id => `${id}=${M.get(id).taper.toFixed(2)}`).join(', ')}` : '');

// —— 声明的事实与几何一致 ——
const factBad = [];
for (const e of entries) {
  const m = M.get(e.id);
  if (typeof e.facts.height === 'number' && e.facts.height !== e.data.h) {
    factBad.push(`${e.id}: facts.height=${e.facts.height} ≠ L.h=${e.data.h}`);
  }
  for (const key of ['mastTop', 'spireTop', 'antennaTop']) {
    const v = e.facts[key];
    if (typeof v === 'number' && Math.abs(m.height - v) > 8) {
      factBad.push(`${e.id}: ${key}=${v} 实测顶 ${m.height.toFixed(1)}`);
    }
  }
}
check('声明的 height / 尖顶事实与几何一致', factBad.length === 0, factBad.join(' | '));

// ---------------------------------------------------------------------------
console.log('\n== 一览 ==');
const pad = (s, n) => String(s).padStart(n);
console.log('  ' + '地标'.padEnd(22) + pad('总高', 7) + pad('收分', 8) + pad('台阶', 6) +
  pad('尖顶', 7) + pad('原语', 7) + pad('三角面', 9));
for (const L of LANDMARKS) {
  const m = M.get(L.id);
  console.log('  ' + L.id.padEnd(22) +
    pad(m.height.toFixed(1), 7) + pad(m.taper.toFixed(3), 8) + pad(m.steps, 6) +
    pad(m.spire.toFixed(1), 7) + pad(m.parts.length, 7) + pad(m.triangles.toLocaleString(), 9));
}
console.log('  ' + '合计'.padEnd(22) + pad('', 7) + pad('', 8) + pad('', 6) + pad('', 7) +
  pad(totals.parts.toLocaleString(), 7) + pad(totals.triangles.toLocaleString(), 9));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
