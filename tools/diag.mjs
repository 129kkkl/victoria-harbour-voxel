// 临时诊断：落水地标到最近陆地的距离 + 各城区地块数统计
import { LANDMARKS } from '../src/geo/landmarks.js';
import { isLand } from '../src/geo/coastline.js';
import { generateCity } from '../src/city/streetGrid.js';
import { DISTRICTS } from '../src/geo/districts.js';
import { M_PER_DEG_LAT, M_PER_DEG_LON, lonLatToWorld } from '../src/geo/projection.js';
import { sampleHeight } from '../src/city/heightfield.js';

console.log('=== landmarks in water -> nearest land ===');
for (const l of LANDMARKS) {
  if (isLand(l.lon, l.lat)) continue;
  let found = null;
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0], [0.7, -0.7], [-0.7, -0.7]];
  for (const [dx, dy] of dirs) {
    for (let d = 0.0002; d <= 0.006; d += 0.0002) {
      if (isLand(l.lon + dx * d, l.lat + dy * d)) {
        const m = Math.hypot(dx * d * M_PER_DEG_LON, dy * d * M_PER_DEG_LAT);
        if (!found || m < found.m) found = { m, lon: l.lon + dx * d, lat: l.lat + dy * d };
        break;
      }
    }
  }
  console.log(`  ${l.name} -> ${found ? `${found.lat.toFixed(4)}, ${found.lon.toFixed(4)}  d=${found.m.toFixed(0)}m` : 'none'}`);
}

console.log('\n=== lots per district ===');
const city = generateCity();
const counts = {};
for (const l of city.lots) counts[l.district] = (counts[l.district] || 0) + 1;
for (const d of DISTRICTS) {
  const { x, z } = lonLatToWorld(d.lon, d.lat);
  console.log(`  ${d.id.padEnd(15)} lots=${String(counts[d.id] ?? 0).padStart(5)}  centerLand=${isLand(d.lon, d.lat)}  h=${sampleHeight(x, z).toFixed(1)}`);
}

console.log('\n=== quarry bay profile ===');
for (const [lon, lat] of [[114.2115, 22.2845], [114.2135, 22.2860], [114.2150, 22.2840], [114.2090, 22.2850]]) {
  const { x, z } = lonLatToWorld(lon, lat);
  console.log(`  ${lon}, ${lat}  land=${isLand(lon, lat)}  h=${sampleHeight(x, z).toFixed(1)}`);
}