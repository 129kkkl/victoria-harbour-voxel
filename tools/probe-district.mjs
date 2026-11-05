// 临时诊断：对指定城区逐级统计地块被拒绝的原因
import { DISTRICTS, buildDistrictList } from '../src/geo/districts.js';
import { isLand } from '../src/geo/coastline.js';
import { lonLatToWorld, worldToLonLat } from '../src/geo/projection.js';
import { sampleHeight, fbm } from '../src/city/heightfield.js';
import { LANDMARKS } from '../src/geo/landmarks.js';

const keepOuts = LANDMARKS.filter(l => l.shape !== 'promenade').map(l => {
  const { x, z } = lonLatToWorld(l.lon, l.lat);
  return { name: l.name, x, z, r: Math.max(l.w, l.d) * 0.62 + 26 };
});

function probe(id) {
  const d = buildDistrictList().find(x => x.id === id);
  const { x: cx, z: cz } = lonLatToWorld(d.lon, d.lat);
  const cos = Math.cos(d.rad), sin = Math.sin(d.rad);
  const nu = Math.ceil(d.r / d.blockU) + 1;
  const nv = Math.ceil(d.r / d.blockV) + 1;
  const why = {};
  const bump = k => { why[k] = (why[k] || 0) + 1; };

  for (let i = -nu; i < nu; i++) {
    for (let j = -nv; j < nv; j++) {
      const u0 = i * d.blockU + d.roadU / 2, v0 = j * d.blockV + d.roadV / 2;
      const w = d.blockU - d.roadU, dp = d.blockV - d.roadV;
      const cu = u0 + w / 2, cv = v0 + dp / 2;
      if (cu * cu + cv * cv > d.r * d.r) continue;
      const x = cx + cu * cos - cv * sin, z = cz + cu * sin + cv * cos;

      const { lon, lat } = worldToLonLat(x, z);
      if (!isLand(lon, lat)) { bump('water'); continue; }
      const hs = [sampleHeight(x - w / 2, z - dp / 2), sampleHeight(x + w / 2, z - dp / 2),
        sampleHeight(x - w / 2, z + dp / 2), sampleHeight(x + w / 2, z + dp / 2)];
      const hMin = Math.min(...hs), spread = Math.max(...hs) - hMin;
      if (hMin > 230) { bump('tooHigh'); continue; }
      if (spread > 14) { bump('slope'); continue; }
      if (hMin < 1.2) { bump('low'); continue; }
      let ko = null;
      for (const k of keepOuts) {
        const dx = x - k.x, dz = z - k.z;
        if (dx * dx + dz * dz < k.r * k.r) { ko = k.name; break; }
      }
      if (ko) { bump(`keepout:${ko}`); continue; }
      bump('OK');
    }
  }
  console.log(`${d.name} (${id}):`, JSON.stringify(why));
}

for (const id of ['kowloon-bay', 'quarry-bay', 'tsim-sha-tsui', 'north-point', 'causeway-bay']) {
  probe(id);
}

console.log('\n-- transect at 114.2100E (isLand / h) --');
for (let lat = 22.3000; lat <= 22.3260; lat += 0.0010) {
  const { x, z } = lonLatToWorld(114.21, lat);
  console.log(`  ${lat.toFixed(4)}  land=${isLand(114.21, lat)}  h=${sampleHeight(x, z).toFixed(1)}`);
}
void DISTRICTS;