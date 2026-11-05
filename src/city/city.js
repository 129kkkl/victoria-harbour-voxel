// M2 城市层编排：地块 → 体量 → 地标 → 街道 → 夜景联动。
// 分帧执行，避免长时间阻塞首屏加载。
import * as THREE from 'three';
import { generateCity } from './streetGrid.js';
import { buildCityMesh } from './buildings.js';
import { buildLandmarkMesh } from './landmarkBuilder.js';
import { setCityNight } from './facades.js';
import { buildPublicRealm } from './publicRealm.js';
import { yieldToBrowser } from '../core/yield.js';

const nextFrame = yieldToBrowser;

export async function buildCity(onProgress) {
  onProgress(0.02, '划分城市地块（街道网格）…');
  await nextFrame();

  const data = generateCity();

  onProgress(0.34, `生成建筑体量（${data.stats.count.toLocaleString()} 栋）…`);
  await nextFrame();
  const city = buildCityMesh(data);

  onProgress(0.78, '精建 32 个地标（逐座形态语言）…');
  await nextFrame();
  const lm = buildLandmarkMesh();

  onProgress(0.9, '栽植街树与庭院，铺设街道标线…');
  await nextFrame();
  const realm = buildPublicRealm(data);

  const group = new THREE.Group();
  group.name = 'city-layer';
  group.add(city.group);
  group.add(lm.group);
  group.add(realm.group);

  const tallestLandmark = lm.info.reduce((a, b) => (b.h > a.h ? b : a), lm.info[0]);
  const stats = {
    ...data.stats,
    ...city.stats,
    ...lm.stats,
    ...realm.stats,
    triangles: city.stats.triangles + lm.stats.landmarkTriangles + realm.stats.publicRealmTriangles,
    landmarks: lm.info.length,
    landmarkTallest: tallestLandmark.name,
    landmarkTallestH: tallestLandmark.h
  };

  return { group, landmarks: lm.info, stats, data, detailChunks: [...city.detailChunks,...realm.detailChunks] };
}

/** 每帧调用：把昼夜因子送进立面材质，驱动夜间窗光。 */
export function updateCity(sunInfo) {
  setCityNight(sunInfo.nightF);
}
