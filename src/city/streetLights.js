// 夜景灯光（M4）：路灯光池 + 楼顶航空障碍灯。
//
// placeLamps / placeBeacons 是纯函数（node 可验收），build* 才碰 THREE：
//   · 路灯落在车道两侧（每个路面四边形一侧交替），地面投一圈暖色光池 —
//     从空中看，街道网变成发光的脉络，这是香港夜景航拍最醒目的特征。
//     灯杆本身在上帝视角下不足一个像素，M5 街景层级再补。
//   · 障碍灯在 >150m 的楼顶 / 地标顶部，红色慢闪（GPU 里按相位错开）。
import * as THREE from 'three';
import { worldToLonLat } from '../geo/projection.js';
import { isLand } from '../geo/coastline.js';

function hashN(i, seed) {
  let n = (i * 374761393 + seed * 668265263) | 0;
  n = (n ^ (n >> 13)) | 0;
  n = Math.imul(n, 1274126177);
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

/**
 * 路灯布点（纯函数）。
 * @param {number[]} roads 路面四边形扁平数组（12 浮点/片：4 角 × xyz）
 * @returns {Array<{x,y,z}>} 灯位（y 为地面高）
 */
export function placeLamps(roads, { minGap = 40, keep = 0.55 } = {}) {
  const lamps = [];
  const taken = new Set();
  const quads = roads.length / 12;
  for (let q = 0; q < quads; q++) {
    if (hashN(q, 17) > keep) continue;   // 约半数路面放灯 → 等效 ~60m 间距
    const b = q * 12;
    // 四边形四角：c0=(b+0..2) c1=(b+3..5) c2=(b+6..8) c3=(b+9..11)，各为 xyz
    const x0 = roads[b], y0 = roads[b + 1], z0 = roads[b + 2];
    const x1 = roads[b + 3], z1 = roads[b + 5];
    const x2 = roads[b + 6], y2 = roads[b + 7], z2 = roads[b + 8];
    const y1 = roads[b + 4], y3 = roads[b + 10];
    // 长边 = 道路走向；短边方向 = 横跨路面
    const e01 = Math.hypot(x1 - x0, z1 - z0);
    const e12 = Math.hypot(x2 - x1, z2 - z1);
    let ax, az, half;
    if (e01 < e12) {          // 沿 c1→c2 走，横跨 = c0→c1
      ax = x1 - x0; az = z1 - z0; half = e01 / 2;
    } else {                  // 沿 c0→c1 走，横跨 = c1→c2
      ax = x2 - x1; az = z2 - z1; half = e12 / 2;
    }
    const al = Math.hypot(ax, az) || 1;
    ax /= al; az /= al;
    const cx = (x0 + x2) / 2, cz = (z0 + z2) / 2;
    const side = hashN(q, 5) > 0.5 ? 1 : -1;
    const lx = cx + ax * (half + 2.2) * side;
    const lz = cz + az * (half + 2.2) * side;

    const { lon, lat } = worldToLonLat(lx, lz);
    if (!isLand(lon, lat)) continue;

    // 去重：跨城区重叠带 / 十字路口的相邻路面可能产出几乎同位的灯
    const key = `${Math.round(lx / minGap)},${Math.round(lz / minGap)}`;
    if (taken.has(key)) continue;
    taken.add(key);

    lamps.push({ x: lx, y: (y0 + y1 + y2 + y3) / 4, z: lz });
  }
  return lamps;
}

/**
 * 航空障碍灯布点（纯函数）：>150m 的街区楼顶 + 地标顶部。
 * landmarks 由调用方先转成 [{x, z, topY}]（投影 + 落地高程在 geo 层完成），
 * 本函数不依赖投影模块，保持 node 可验收。
 */
export function collectBeacons(lots, landmarkTops) {
  const out = [];
  for (const l of lots) {
    if (l.h >= 150) out.push({ x: l.x, y: l.base + l.boxH + 1.5, z: l.z });
  }
  for (const t of landmarkTops) out.push({ x: t.x, y: t.topY + 1.2, z: t.z });
  return out;
}

/** 光池纹理：径向渐变（暖白中心 → 透明边缘）。 */
function poolTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 63);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.28)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * 路灯：地面光池（InstancedMesh，加性混合）+ 灯头亮点（Points）。
 * 各一个 draw call。
 */
export function buildStreetLights(lamps) {
  const group = new THREE.Group();
  group.name = 'street-lights';

  // ---- 光池 ----
  const poolGeo = new THREE.PlaneGeometry(9.5, 9.5);
  poolGeo.rotateX(-Math.PI / 2);
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolTexture(),
    color: new THREE.Color(1.15, 0.78, 0.42),   // HDR 暖橙（钠灯）
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });
  const pools = new THREE.InstancedMesh(poolGeo, poolMat, lamps.length);
  const m = new THREE.Matrix4();
  for (let i = 0; i < lamps.length; i++) {
    m.makeTranslation(lamps[i].x, lamps[i].y + 0.35, lamps[i].z);
    pools.setMatrixAt(i, m);
  }
  pools.instanceMatrix.needsUpdate = true;
  pools.renderOrder = 3;
  pools.computeBoundingSphere();
  group.add(pools);

  // ---- 灯头亮点 ----
  const pos = new Float32Array(lamps.length * 3);
  for (let i = 0; i < lamps.length; i++) {
    pos[i * 3] = lamps[i].x;
    pos[i * 3 + 1] = lamps[i].y + 7.5;   // 灯头约 7.5m 高
    pos[i * 3 + 2] = lamps[i].z;
  }
  const headGeo = new THREE.BufferGeometry();
  headGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const headMat = new THREE.PointsMaterial({
    color: new THREE.Color(1.9, 1.45, 0.85),
    size: 2.0, sizeAttenuation: false,
    transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false
  });
  const heads = new THREE.Points(headGeo, headMat);
  heads.frustumCulled = false;
  group.add(heads);

  return {
    group,
    count: lamps.length,
    update(nightF, wet = 0) {
      // 雨天湿地反光更强（光池在湿沥青上更亮）
      poolMat.opacity = nightF * (0.30 + 0.14 * wet);
      headMat.opacity = nightF * 0.55;
      group.visible = nightF > 0.02;
    }
  };
}

const BEACON_VERT = /* glsl */`
  attribute float aPhase;
  uniform float uTime;
  varying float vA;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // 2s 周期慢闪，相位错开
    float ph = fract(uTime * 0.5 + aPhase);
    vA = smoothstep(0.0, 0.08, ph) * (1.0 - smoothstep(0.30, 0.55, ph));
    gl_PointSize = 3.0;
  }
`;
const BEACON_FRAG = /* glsl */`
  precision mediump float;
  uniform float uNight;
  varying float vA;
  void main() {
    gl_FragColor = vec4(2.6, 0.22, 0.16, vA * uNight);
  }
`;

/** 航空障碍灯：红色慢闪点（HDR 红，夜间泛光）。 */
export function buildBeaconLights(beacons) {
  const pos = new Float32Array(beacons.length * 3);
  const phase = new Float32Array(beacons.length);
  for (let i = 0; i < beacons.length; i++) {
    pos[i * 3] = beacons[i].x;
    pos[i * 3 + 1] = beacons[i].y;
    pos[i * 3 + 2] = beacons[i].z;
    phase[i] = hashN(i, 71);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

  const uniforms = { uTime: { value: 0 }, uNight: { value: 0 } };
  const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms,
    vertexShader: BEACON_VERT,
    fragmentShader: BEACON_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  pts.frustumCulled = false;
  pts.renderOrder = 21;

  return {
    mesh: pts,
    count: beacons.length,
    update(t, nightF) {
      uniforms.uTime.value = t;
      uniforms.uNight.value = nightF;
      pts.visible = nightF > 0.02;
    }
  };
}
