// 地标网格构建器（M3）。
//
// 与 M2 的差别：M2 用 shape 键套固定体量语言（盒体 + 圆台 + 蛋顶），
// 32 座都只是"骨架"；M3 每座都有自己的一套原语组合（见 landmarks/specs/），
// 形态精建到能从尖沙咀东望一眼认出来。
//
// 渲染侧的两个变化：
//   ① 几何自带**米制 UV**（编译期算好，见 landmarks/prims.js），所以材质
//      不必再靠 vertex shader 反推坐标 —— 任意几何都能正确贴窗格。
//   ② 杂项（桅杆 / 拉索 / 钟面 / 屋顶设备）合进一个顶点色材质，
//      全部 32 座地标 + 缆车加起来仍只占 ~11 个 draw call。

import * as THREE from 'three';
import { makeMetricFacadeMaterial, makeVertexColorMaterial, makePlainMaterial, makeNeonSignMaterial } from './facades.js';
import { FACADE_FAMILIES } from '../materials/proceduralTextures.js';
import { buildLandmarkPlan, tramwayEndpoints } from './landmarks/plan.js';

export function buildLandmarkMesh() {
  const { entries, totals } = buildLandmarkPlan();
  const group = new THREE.Group();
  group.name = 'landmarks';

  // ---- 按材质族合并几何，每族一个 draw call ----
  const merged = new Map();      // fam → Scribe 等价的顶点累加
  for (const e of entries) {
    for (const [fam, geo] of e.geometries) {
      if (!merged.has(fam)) merged.set(fam, []);
      merged.get(fam).push(geo);
    }
  }

  let meshCount = 0;
  for (const [fam, geos] of merged) {
    const geo = mergeGeometries(geos);
    if (!geo) continue;
    const mat = fam === 'solid'
      ? makeVertexColorMaterial(0.62, 0.32)
      : fam === 'neon'
        ? makeNeonSignMaterial()
        : makeMetricFacadeMaterial(FACADE_FAMILIES[fam] ? fam : 'concrete');
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `landmark-${fam}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    meshCount++;
    for (const g of geos) g.dispose();
  }

  // ---- 太平山顶缆车索道 ----
  const { a, b } = tramwayEndpoints();
  group.add(makeCable(a, b));

  const info = entries.map(e => ({
    id: e.id,
    name: e.data.name,
    year: e.data.year,
    use: e.data.use,
    lon: e.data.lon,
    lat: e.data.lat,
    h: Math.round(e.height),
    parts: e.parts.length,
    triangles: e.triangles,
    facts: e.facts,
    world: e.world
  }));

  return {
    group,
    info,
    stats: {
      landmarks: entries.length,
      landmarkTriangles: totals.triangles,
      landmarkParts: totals.parts,
      landmarkMeshes: meshCount
    }
  };
}

/** 合并同族几何（position / normal / uv / color 四通道）。 */
function mergeGeometries(geos) {
  if (!geos.length) return null;
  if (geos.length === 1) return geos[0];
  let vTotal = 0;
  for (const g of geos) vTotal += g.attributes.position.count;

  const pos = new Float32Array(vTotal * 3);
  const nor = new Float32Array(vTotal * 3);
  const uv = new Float32Array(vTotal * 2);
  const col = new Float32Array(vTotal * 3);
  let o3 = 0, o2 = 0;
  for (const g of geos) {
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, c = g.attributes.color;
    pos.set(p.array, o3);
    nor.set(n.array, o3);
    col.set(c.array, o3);
    uv.set(u.array, o2);
    o3 += p.count * 3;
    o2 += p.count * 2;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}

/** 太平山顶缆车：Garden Road 站 → 山顶站。 */
function makeCable(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz);
  const geo = new THREE.BoxGeometry(1.4, 1.0, len);
  const mesh = new THREE.Mesh(geo, makePlainMaterial(0x4a4d50, 0.5, 0.6));
  mesh.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + 3, (a.z + b.z) / 2);
  const up = new THREE.Vector3(0, 0, 1);
  const dir = new THREE.Vector3(dx, dy, dz).normalize();
  mesh.quaternion.setFromUnitVectors(up, dir);
  mesh.castShadow = true;
  mesh.name = 'peak-tramway';
  return mesh;
}
