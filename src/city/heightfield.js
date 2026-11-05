// 高度场：山体（太平山 552m / 狮子山 / 飞鹅山 602m 等）+ 城市基座 + 海床。
// 采样 API sampleHeight(x,z) 供地形网格、碰撞、行走判定共用。
import * as THREE from 'three';
import { lonLatToWorld, worldToLonLat } from '../geo/projection.js';
import { isLand, shoreFactor } from '../geo/coastline.js';
import { FAR_RECT } from '../geo/bounds.js';
import { urbanGroundTexture, forestTexture } from '../materials/proceduralTextures.js';
import { yieldToBrowser } from '../core/yield.js';
import { DISTRICTS } from '../geo/districts.js';

// [经度, 纬度, 海拔 m, 半径 m]
// 注意半径：山体是径向钟形衰减，半径给大了会把整座山漫到维港东岸，
// 把鰂鱼涌 / 北角一带的滨水城区抬到 300m 以上 —— M2 的地块坡度过滤会全数丢弃。
const PEAKS_LONLAT = [
  // 香港岛
  [114.1500, 22.2712, 552, 1500],  // 太平山（扯旗山）
  [114.1590, 22.2680, 479, 1100],  // 歌赋山
  [114.1410, 22.2640, 495, 1000],  // 奇力山
  [114.1350, 22.2690, 494, 950],   // 西高山
  [114.2095, 22.2775, 532, 1000],  // 柏架山
  [114.1995, 22.2670, 436, 1400],  // 毕拿山
  [114.1905, 22.2720, 433, 1100],  // 渣甸山
  [114.2045, 22.2800, 210, 800],   // 宝马山
  // 九龙 / 新界山脊 —— 构成“城市峡谷”北墙
  [114.1870, 22.3520, 495, 1500],  // 狮子山
  [114.1695, 22.3460, 457, 1200],  // 笔架山
  [114.2240, 22.3390, 602, 1800],  // 飞鹅山
  [114.2090, 22.3580, 577, 1600],  // 大老山
  [114.2415, 22.2940, 222, 800],   // 魔鬼山（鲤鱼门东岸）
  // 离岛
  [114.1115, 22.2875, 90, 260],    // 青洲
  [114.1125, 22.3185, 60, 300]     // 昂船洲
];

const PEAKS = PEAKS_LONLAT.map(([lon, lat, h, r]) => {
  const { x, z } = lonLatToWorld(lon, lat);
  return { x, z, h, r };
});

const URBAN_AREAS = DISTRICTS.map(d => ({ ...lonLatToWorld(d.lon,d.lat), r:d.r }));
function urbanCoverage(x,z) {
  let value=0;
  for(const a of URBAN_AREAS) value=Math.max(value,Math.min(1,(1.12-Math.hypot(x-a.x,z-a.z)/a.r)/.12));
  return Math.max(0,value);
}

// ---- 确定性噪声（种子化，断网可复现） ----
function hash2(ix, iz) {
  let n = (ix * 374761393 + iz * 668265263) | 0;
  n = (n ^ (n >> 13)) | 0;
  n = Math.imul(n, 1274126177);
  n = (n ^ (n >> 16)) >>> 0;
  return n / 4294967295;
}

function valueNoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return (a + (b - a) * ux) + ((c + (d - c) * ux) - (a + (b - a) * ux)) * uz;
}

export function fbm(x, z, octaves = 4) {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * f, z * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

function ridged(x, z, octaves = 3) {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = valueNoise(x * f, z * f);
    sum += (1 - Math.abs(2 * n - 1)) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.11;
  }
  return sum / norm;
}

export const SEABED = -4;

// 世界坐标高度采样（米）。陆地为正、海为负。
export function sampleHeight(x, z) {
  const { lon, lat } = worldToLonLat(x, z);
  const sf = shoreFactor(lon, lat);

  if (!isLand(lon, lat)) {
    // sf=0 远海 → 海床；sf→1 近岸 → 浅滩（-1.8m，低于波谷 -0.53m，不会露出）
    return SEABED + (-1.8 - SEABED) * sf;
  }

  // 山体叠加
  let hills = 0;
  for (const p of PEAKS) {
    const dx = x - p.x, dz = z - p.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < p.r * p.r) {
      const t = 1 - d2 / (p.r * p.r);
      hills += p.h * t * t;
    }
  }
  const rugged = ridged(x * 0.0016, z * 0.0016) * Math.min(1, hills / 100) * 45;
  const urbanMicro = fbm(x * 0.004, z * 0.004, 3) * 3.0;
  const landH = 3.5 + urbanMicro + hills + rugged;
  return 1.5 + (landH - 1.5) * sf;
}

// ---- 地形网格构建（分块 + 两级精度） ----
const TILE = 512;
// 正午太阳 2.9 + ACES 1.3 的曝光下，反照率 >0.25 的平地就会被吹成白纸。
// 真实城市肌理从空中看是深色的（沥青 / 屋面 / 阴影），城市基座必须压到 ~0.2。
const URBAN_GREY = [0.20, 0.20, 0.19];
const WET_SEDIMENT = [0.36, 0.42, 0.42];
// 维港两岸全是码头/堤岸而非沙滩：沙色只留给潮间带的极窄一段，且压暗，
// 否则会在楼群脚下刷出一圈刺眼的白边（M3D 湾仔海滨的"白纸地面"）。
const SAND = [0.42, 0.40, 0.35];
const GREEN_A = [0.13, 0.24, 0.12];
const GREEN_B = [0.21, 0.32, 0.16];
const ROCK = [0.34, 0.33, 0.30];
const HIGH_ROCK = [0.38, 0.37, 0.33];   // 太平山顶是林地而非雪顶：只半量混入

function terrainColor(h, ny, x, z, out, i, urban = 1) {
  let r, g, b;
  if (h < 0.3) {
    [r, g, b] = WET_SEDIMENT;       // 水下沉积（即便波谷露出也不读作沙滩）
  } else if (h < 0.9) {
    [r, g, b] = SAND;
  } else if (h < 16) {
    // 城市基座：纯平灰会读成"白纸地面"，叠加低频斑块模拟街区/场地的质感
    [r, g, b] = URBAN_GREY;
    r = GREEN_A[0] + (r - GREEN_A[0]) * urban;
    g = GREEN_A[1] + (g - GREEN_A[1]) * urban;
    b = GREEN_A[2] + (b - GREEN_A[2]) * urban;
    const m = 0.82 + 0.36 * fbm(x * 0.02, z * 0.02, 2);
    r *= m; g *= m; b *= m;
  } else {
    const t = Math.min(1, (h - 16) / 420);
    const n = fbm(x * 0.01, z * 0.01, 3);
    r = GREEN_A[0] + (GREEN_B[0] - GREEN_A[0]) * n;
    g = GREEN_A[1] + (GREEN_B[1] - GREEN_A[1]) * n;
    b = GREEN_A[2] + (GREEN_B[2] - GREEN_A[2]) * n;
    if (ny < 0.82) { // 陡坡露岩
      const k = Math.min(1, (0.82 - ny) / 0.18);
      r += (ROCK[0] - r) * k; g += (ROCK[1] - g) * k; b += (ROCK[2] - b) * k;
    }
    if (h > 380) {
      const k = Math.min(1, (h - 380) / 180) * 0.55;
      r += (HIGH_ROCK[0] - r) * k; g += (HIGH_ROCK[1] - g) * k; b += (HIGH_ROCK[2] - b) * k;
    }
    void t;
  }
  const v = 0.94 + 0.12 * hash2(Math.round(x), Math.round(z));
  out[i] = r * v; out[i + 1] = g * v; out[i + 2] = b * v;
}

function tileHasLand(x0, z0) {
  const checks = [[0, 0], [TILE / 2, 0], [TILE, 0], [0, TILE / 2], [TILE / 2, TILE / 2],
    [TILE, TILE / 2], [0, TILE], [TILE / 2, TILE], [TILE, TILE]];
  for (const [ox, oz] of checks) {
    const { lon, lat } = worldToLonLat(x0 + ox, z0 + oz);
    if (isLand(lon, lat)) return true;
  }
  // 距岸线 200m 内的纯海块也保留，形成浅滩过渡
  for (const [ox, oz] of checks) {
    const sf = shoreFactor(...(() => { const g = worldToLonLat(x0 + ox, z0 + oz); return [g.lon, g.lat]; })());
    if (sf > 0) return true;
  }
  return false;
}

export async function buildTerrain(onProgress) {
  const group = new THREE.Group();
  group.name = 'terrain';
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.95, metalness: 0.0
  });
  // 城市平原（h<16）叠加世界坐标的街区肌理贴图：纯色平地在正午曝光下会读成白纸。
  // 山体保持顶点色（绿/岩），只把 h<16 的平地区换成地块拼块质感。
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGroundMap = { value: urbanGroundTexture() };
    shader.uniforms.uForestMap = { value: forestTexture() };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;\nattribute float aUrban;\nvarying float vUrban;')
      .replace('#include <project_vertex>',
        '#include <project_vertex>\n  vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vUrban = aUrban;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;\nvarying float vUrban;\nuniform sampler2D uGroundMap;\nuniform sampler2D uForestMap;')
      .replace('#include <map_fragment>', /* glsl */`
        #include <map_fragment>
        float vhUrban = (1.0 - smoothstep(10.0, 18.0, vWorldPos.y)) * vUrban;
        vec3 vhG = texture2D(uGroundMap, vWorldPos.xz * (1.0 / 32.0)).rgb;
        diffuseColor.rgb = mix(diffuseColor.rgb, vhG, vhUrban * 0.92);
        vec3 forest = texture2D(uForestMap, vWorldPos.xz / 110.0).rgb;
        diffuseColor.rgb *= mix(vec3(1.0), forest * 2.4, (1.0 - vhUrban) * 0.72);
      `);
  };

  const x0 = Math.floor(FAR_RECT.xMin / TILE) * TILE;
  const z0 = Math.floor(FAR_RECT.zMin / TILE) * TILE;
  const nx = Math.ceil((FAR_RECT.xMax - x0) / TILE);
  const nz = Math.ceil((FAR_RECT.zMax - z0) / TILE);

  let built = 0, verts = 0;
  const total = nx * nz;
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const tx = x0 + ix * TILE, tz = z0 + iz * TILE;
      if (!tileHasLand(tx, tz)) {
        built++;
        continue;
      }
      // 距核心区近用 8m，远景 16m
      const cx = tx + TILE / 2, cz = tz + TILE / 2;
      const nearCore = Math.abs(cx) < 4600 && cz > -4800 && cz < 2800;
      const step = nearCore ? 16 : 32;
      const n = TILE / step + 1;

      const positions = new Float32Array(n * n * 3);
      const normals = new Float32Array(n * n * 3);
      const colors = new Float32Array(n * n * 3);
      const urban = new Float32Array(n * n);
      // Reuse the four neighbours for normals: the old loop recomputed the same
      // coastline/noise sample five times. The padded grid also preserves seams.
      const hn = n + 2, heights = new Float32Array(hn * hn);
      for (let j = 0; j < hn; j++) for (let i = 0; i < hn; i++) {
        heights[j * hn + i] = sampleHeight(tx + (i - 1) * step, tz + (j - 1) * step);
      }
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const wx = tx + i * step, wz = tz + j * step;
          const hi = (j + 1) * hn + i + 1;
          const h = heights[hi];
          const idx = (j * n + i) * 3;
          positions[idx] = wx; positions[idx + 1] = h; positions[idx + 2] = wz;
          const hx = heights[hi + 1] - heights[hi - 1];
          const hz = heights[hi + hn] - heights[hi - hn];
          const inv = 1 / Math.hypot(hx, 2 * step, hz);
          normals[idx] = -hx * inv; normals[idx + 1] = 2 * step * inv; normals[idx + 2] = -hz * inv;
          urban[j*n+i] = urbanCoverage(wx,wz);
          terrainColor(h, 2 * step * inv, wx, wz, colors, idx, urban[j*n+i]);
        }
      }
      const index = new Uint32Array((n - 1) * (n - 1) * 6);
      let k = 0;
      for (let j = 0; j < n - 1; j++) {
        for (let i = 0; i < n - 1; i++) {
          const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
          index[k++] = a; index[k++] = c; index[k++] = b;
          index[k++] = b; index[k++] = c; index[k++] = d;
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.setAttribute('aUrban', new THREE.BufferAttribute(urban, 1));
      geo.setIndex(new THREE.BufferAttribute(index, 1));
      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      verts += n * n;
      built++;
      if (onProgress && built % 12 === 0) {
        onProgress(built / total);
        await yieldToBrowser();
      }
    }
  }
  return { group, vertexCount: verts, setNight(night) {
    material.color.setRGB(1 - night * .96, 1 - night * .92, 1 - night * .85);
  } };
}
