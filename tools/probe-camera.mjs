// 临时诊断：默认机位脚下到底是什么
import { worldToLonLat, lonLatToWorld } from '../src/geo/projection.js';
import { isLand, shoreFactor } from '../src/geo/coastline.js';
import { sampleHeight } from '../src/city/heightfield.js';

const cam = { x: 1150, z: -560 };
const p = worldToLonLat(cam.x, cam.z);
console.log(`camera world (${cam.x}, ${cam.z}) -> lon ${p.lon.toFixed(5)}, lat ${p.lat.toFixed(5)}`);
console.log(`  isLand=${isLand(p.lon, p.lat)}  shoreFactor=${shoreFactor(p.lon, p.lat).toFixed(3)}  h=${sampleHeight(cam.x, cam.z).toFixed(2)}`);

console.log('\n从机位向南（+z，即向海）逐点扫描：');
for (let d = 0; d <= 1200; d += 60) {
  const z = cam.z + d;
  const q = worldToLonLat(cam.x, z);
  console.log(`  ${String(d).padStart(4)}m  lon ${q.lon.toFixed(5)} lat ${q.lat.toFixed(5)}  land=${isLand(q.lon, q.lat) ? 'Y' : 'n'}  h=${sampleHeight(cam.x, z).toFixed(2)}`);
}
void lonLatToWorld;