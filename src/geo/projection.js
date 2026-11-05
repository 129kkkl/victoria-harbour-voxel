// 局部平面投影（等距圆柱）—— 世界原点位于维港几何中心（青洲以南）
// X 轴向东，Z 轴向南，Y 轴向上；1 世界单位 = 1 米；忽略地球曲率。

export const LON0 = 114.159;   // 原点经度
export const LAT0 = 22.293;    // 原点纬度

const DEG = Math.PI / 180;

// WGS84 局部纬度每度弧长（米）
export const M_PER_DEG_LAT =
  111132.954 - 559.822 * Math.cos(2 * LAT0 * DEG) + 1.175 * Math.cos(4 * LAT0 * DEG);
// 该纬度下经度每度弧长（米）
export const M_PER_DEG_LON = 111320 * Math.cos(LAT0 * DEG);

export function lonLatToWorld(lon, lat) {
  return {
    x: (lon - LON0) * M_PER_DEG_LON,
    z: (LAT0 - lat) * M_PER_DEG_LAT   // 纬度降低 = 向南 = z 增大
  };
}

export function worldToLonLat(x, z) {
  return {
    lon: LON0 + x / M_PER_DEG_LON,
    lat: LAT0 - z / M_PER_DEG_LAT
  };
}
