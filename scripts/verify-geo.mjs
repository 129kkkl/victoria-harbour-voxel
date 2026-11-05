// 离线数值验收：投影往返精度 + 夏至日（6月22日）太阳方位角/高度角。
// 运行：npm run verify
import { lonLatToWorld, worldToLonLat, M_PER_DEG_LON, M_PER_DEG_LAT } from '../src/geo/projection.js';
import { sunPosition } from '../src/sky/astronomy.js';

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS  ${name} ${detail ?? ''}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail ?? ''}`); }
}

console.log('== 投影往返 ==');
{
  const p = lonLatToWorld(114.1694, 22.2938); // 尖沙咀钟楼
  const g = worldToLonLat(p.x, p.z);
  check('roundtrip < 1e-9°',
    Math.abs(g.lon - 114.1694) < 1e-9 && Math.abs(g.lat - 22.2938) < 1e-9);
  console.log(`  比例尺: 经度 ${M_PER_DEG_LON.toFixed(0)} m/°, 纬度 ${M_PER_DEG_LAT.toFixed(0)} m/°`);
  check('经度比例 102000~104000 m/°', M_PER_DEG_LON > 102000 && M_PER_DEG_LON < 104000);
  check('纬度比例 110000~111500 m/°', M_PER_DEG_LAT > 110000 && M_PER_DEG_LAT < 111500);
}

console.log('== 2026-06-22 夏至 太阳视运动（香港 22.293°N） ==');
function findCrossing(dateUTCStart, altTarget = -0.833) {
  // 扫描 24h，找高度角穿越 altTarget 的两个时刻（出/没）
  const crosses = [];
  let prevAlt = null;
  for (let min = 0; min <= 24 * 60; min++) {
    const d = new Date(dateUTCStart.getTime() + min * 60000);
    const { altitudeDeg, azimuthDeg } = sunPosition(d);
    if (prevAlt !== null &&
        (prevAlt - altTarget) * (altitudeDeg - altTarget) < 0) {
      crosses.push({ min, azimuthDeg, rising: altitudeDeg > prevAlt });
    }
    prevAlt = altitudeDeg;
  }
  return crosses;
}

{
  // 2026-06-22 全天（UTC 从 6/21 16:00 起 = HKT 6/22 00:00）
  const start = new Date(Date.UTC(2026, 5, 21, 16, 0, 0));
  const crosses = findCrossing(start);
  const rise = crosses.find(c => c.rising);
  const set = crosses.find(c => !c.rising);
  console.log(`   crossings: ${crosses.map(c => `${c.rising ? '升' : '落'}@HKT ${(c.min / 60).toFixed(2)}h az=${c.azimuthDeg.toFixed(1)}°`).join(' | ')}`);
  check('日出方位角 63°~68°（东北偏东）', rise && rise.azimuthDeg > 63 && rise.azimuthDeg < 68,
    rise ? `实测 ${rise.azimuthDeg.toFixed(2)}°` : '未找到');
  check('日落方位角 292°~297°（西北偏西）', set && set.azimuthDeg > 292 && set.azimuthDeg < 297,
    set ? `实测 ${set.azimuthDeg.toFixed(2)}°` : '未找到');

  // 中天扫描：夏至赤纬 23.44° > 香港纬度 22.29°，太阳中天于正北，高度角 ≈ 88.85°
  let maxAlt = -90, culmAz = 0, culmMin = 0;
  for (let min = 11 * 60; min <= 13.5 * 60; min++) {
    const d = new Date(start.getTime() + min * 60000);
    const sp = sunPosition(d);
    if (sp.altitudeDeg > maxAlt) { maxAlt = sp.altitudeDeg; culmAz = sp.azimuthDeg; culmMin = min; }
  }
  console.log(`  中天: HKT ${(culmMin / 60).toFixed(2)}h alt=${maxAlt.toFixed(2)}° az=${culmAz.toFixed(2)}°`);
  check('中天高度角 88.3°~89.3°', maxAlt > 88.3 && maxAlt < 89.3);
  check('中天时刻 HKT 12:10~12:40（经度+均时差偏移）', culmMin > 12 * 60 + 10 && culmMin < 12 * 60 + 40);
  check('中天太阳在北天（az<10° 或 >350°）', culmAz < 10 || culmAz > 350);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
