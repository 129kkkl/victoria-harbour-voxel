// 临时诊断：默认机位附近的地块密度
import { generateCity } from '../src/city/streetGrid.js';

const c = generateCity();
const cam = { x: 1150, z: -560 };
for (const r of [200, 400, 700, 1200]) {
  const n = c.lots.filter(l => Math.hypot(l.x - cam.x, l.z - cam.z) < r).length;
  console.log(`${r}m 内的地块数: ${n}`);
}
const tst = c.lots.filter(l => l.district === 'tsim-sha-tsui');
console.log(`TST 地块 ${tst.length} 块, z 范围 ${Math.min(...tst.map(l => l.z)).toFixed(0)} ~ ${Math.max(...tst.map(l => l.z)).toFixed(0)}`);
const near = tst.filter(l => l.z < -150).sort((a, b) => b.z - a.z);
console.log(`TST 滨水带 (z < -150) 地块 ${near.length} 块:`);
console.log('  ' + near.slice(0, 24).map(l => `${l.h.toFixed(0)}m@${l.x.toFixed(0)},${l.z.toFixed(0)}`).join('  '));
const byDist = {};
for (const l of c.lots) byDist[l.district] = (byDist[l.district] || 0) + 1;
console.log('\n各城区地块密度 (地块/平方公里):');
for (const [id, n] of Object.entries(byDist)) {
  console.log(`  ${id.padEnd(15)} ${n}`);
}