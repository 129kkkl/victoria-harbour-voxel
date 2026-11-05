// 地理边界：核心区（1m 体素区）与远景 LOD 环。
// 远景环北界延伸至 22.36°N，以容纳狮子山（22.352°N）等山体剪影。
import { lonLatToWorld } from './projection.js';

export const CORE = {
  lonMin: 114.128, lonMax: 114.190,
  latMin: 22.278, latMax: 22.308
};

export const FAR = {
  lonMin: 114.090, lonMax: 114.235,
  latMin: 22.262, latMax: 22.360
};

function rectOf(b) {
  const a = lonLatToWorld(b.lonMin, b.latMax); // 西北角（z 最小）
  const c = lonLatToWorld(b.lonMax, b.latMin); // 东南角（z 最大）
  return { xMin: a.x, zMin: a.z, xMax: c.x, zMax: c.z };
}

export const CORE_RECT = rectOf(CORE);
export const FAR_RECT = rectOf(FAR);

// 轨道相机平移限制区：核心区外扩一圈
export const PAN_RECT = {
  xMin: CORE_RECT.xMin - 600,
  xMax: CORE_RECT.xMax + 900,
  zMin: CORE_RECT.zMin - 900,
  zMax: CORE_RECT.zMax + 700
};

export function clampToPanRect(v) {
  v.x = Math.min(Math.max(v.x, PAN_RECT.xMin), PAN_RECT.xMax);
  v.z = Math.min(Math.max(v.z, PAN_RECT.zMin), PAN_RECT.zMax);
  v.y = Math.min(Math.max(v.y, 0), 1200);
  return v;
}
