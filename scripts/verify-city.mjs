// 离线数值验收（M2 城市层）：天际线高度序列 / 地标落位 / 街道网格密度 / 城区覆盖。
// 运行：npm run verify:city
//
// 这一层不依赖浏览器：直接跑与运行时完全相同的 src/city/streetGrid.js，
// 因此"生成出来的城市对不对"可以在不开 GPU 的情况下判定。
import { generateCity } from '../src/city/streetGrid.js';
import { LANDMARKS } from '../src/geo/landmarks.js';
import { DISTRICTS } from '../src/geo/districts.js';
import { lonLatToWorld, M_PER_DEG_LAT } from '../src/geo/projection.js';
import { isLand } from '../src/geo/coastline.js';
import { sampleHeight } from '../src/city/heightfield.js';

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS  ${name} ${detail ?? ''}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail ?? ''}`); }
}

const t0 = Date.now();
const city = generateCity();
const genMs = Date.now() - t0;
const s = city.stats;

console.log('== 街道网格 ==');
console.log(`  城区 ${s.districts} 个 · 地块 ${s.count.toLocaleString()} 块 · 车道面 ${s.roadQuads.toLocaleString()} 片` +
  ` · 人行道 ${s.pavementQuads.toLocaleString()} 片 · 生成耗时 ${genMs} ms`);
check('地块总数 > 4000', s.count > 4000, `实测 ${s.count}`);
check('每个城区都生成了地块', DISTRICTS.every(d =>
  city.lots.some(l => l.district === d.id)));
check('车道面片数 > 4000', s.roadQuads > 4000, `实测 ${s.roadQuads}`);
check('地块生成耗时 < 6000ms（首屏预算）', genMs < 6000, `实测 ${genMs}ms`);

console.log('== 天际线高度序列（从尖沙咀东望） ==');
const H = Object.fromEntries(LANDMARKS.map(l => [l.id, l.h]));
const seq = [
  ['icc', 484], ['ifc2', 415], ['boc', 315], ['ifc1', 367],
  ['times-square', 216], ['admiralty', 216], ['hang-lung', 213],
  ['lippo', 186], ['central-plaza', 181], ['hsbc', 60], ['ts-clock-tower', 51]
];
for (const [id, expect] of seq) {
  check(`${id} 高度 ${expect}m`, Math.abs(H[id] - expect) < 0.5, `实测 ${H[id]}m`);
}
check('ICC 484 > IFC 415 > 中银 315 > 中环 181级 > 汇丰 60',
  H.icc > H.ifc2 && H.ifc2 > H.boc && H.boc > H['central-plaza'] && H['central-plaza'] > H.hsbc);
check('IFC 415 / 中银 315 比例 ≈ 1.32',
  Math.abs(H.ifc2 / H.boc - 1.318) < 0.02, `实测 ${(H.ifc2 / H.boc).toFixed(3)}`);
check('山体太平山 552m 高于所有港岛建筑',
  sampleHeight(...Object.values(lonLatToWorld(114.1500, 22.2712))) > Math.max(
    H.ifc2, H.boc, H['times-square'], H.admiralty, H['central-plaza']));

console.log('== 城区高度剖面（防止天际线被削平） ==');
const tallestByDistrict = {};
for (const l of city.lots) {
  if (!tallestByDistrict[l.district] || l.h > tallestByDistrict[l.district]) {
    tallestByDistrict[l.district] = l.h;
  }
}
const profile = ['central', 'wan-chai', 'tsim-sha-tsui', 'mong-kok', 'causeway-bay',
  'yau-ma-tei', 'mid-levels', 'quarry-bay'];
for (const id of profile) {
  const d = DISTRICTS.find(x => x.id === id);
  const h = tallestByDistrict[id];
  console.log(`   ${d.name.padEnd(14, '　')} 最高地块 ${String(h).padStart(4)}m  (设计上限 ${d.cap}m)`);
}
check('中环最高地块 > 180m', tallestByDistrict.central > 180, `实测 ${tallestByDistrict.central}m`);
check('尖沙咀最高地块 > 120m', tallestByDistrict['tsim-sha-tsui'] > 120, `实测 ${tallestByDistrict['tsim-sha-tsui']}m`);
check('旺角最高地块 > 150m', tallestByDistrict['mong-kok'] > 150, `实测 ${tallestByDistrict['mong-kok']}m`);
check('铜锣湾最高地块 > 110m', tallestByDistrict['causeway-bay'] > 110, `实测 ${tallestByDistrict['causeway-bay']}m`);
check('山腰住宅最高地块 < 100m（半山没有摩天楼）',
  tallestByDistrict['mid-levels'] < 100, `实测 ${tallestByDistrict['mid-levels']}m`);
check('旧城（油麻地）最高地块 < 110m',
  tallestByDistrict['yau-ma-tei'] < 110, `实测 ${tallestByDistrict['yau-ma-tei']}m`);

console.log('== 地标落位 ==');
check('地标总数 >= 23', LANDMARKS.length >= 23, `实测 ${LANDMARKS.length}`);
const offLand = [];
for (const l of LANDMARKS) {
  if (l.shape === 'promenade') continue;           // 星光大道本就在岸线上
  if (!isLand(l.lon, l.lat)) offLand.push(l.name);
}
check('除滨海步道外所有地标都落在陆地上', offLand.length === 0,
  offLand.length ? `落水: ${offLand.join(', ')}` : '');

// ICC 是西九龙天际线的支点：核验它贴水而立，且维港在那一断面仍有真实宽度
{
  const kx = lonLatToWorld(114.16017, 22.30339).x;   // ICC
  const kz = lonLatToWorld(114.16017, 22.30339).z;
  check('ICC 位于西九龙填海区内（已补齐 M1 缺失的岸线）',
    isLand(114.16017, 22.30339) && sampleHeight(kx, kz) > 1.5);

  // 沿同一经度在维港断面内扫描，量出水面跨度。
  // 扫描窗限制在 22.275~22.318，否则会把港岛以南的南海与九龙以北的后海湾一并算进来。
  let lo = null, hi = null;
  for (let lat = 22.275; lat <= 22.318; lat += 0.00002) {
    if (!isLand(114.1601, lat)) {
      const { x, z } = lonLatToWorld(114.1601, lat);
      if (sampleHeight(x, z) < -0.5) { if (lo === null) lo = lat; hi = lat; }
    }
  }
  const widthM = lo !== null ? (hi - lo) * M_PER_DEG_LAT : -1;
  console.log(`   维港断面 @114.160°E：水面 ${lo.toFixed(4)}~${hi.toFixed(4)}N，跨度 ${(widthM / 1000).toFixed(2)} km（ICC ↔ IFC2 之间）`);
  check('维港主槽宽度 1.0~3.0 km（真实尺度感）', widthM > 1000 && widthM < 3000,
    `实测 ${(widthM / 1000).toFixed(2)} km`);
}

console.log('== 地块合法性 ==');
let belowWater = 0, floating = 0;
for (const l of city.lots) {
  if (sampleHeight(l.x, l.z) < 1.2) belowWater++;
  if (l.base > sampleHeight(l.x, l.z)) floating++;
}
check('没有地块落在水里', belowWater === 0, `异常 ${belowWater}`);
check('没有地块整体浮空', floating === 0, `异常 ${floating}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);