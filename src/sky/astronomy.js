// 天文计算（纯函数，无 three 依赖，可在 node 中独立验证）。
// 太阳方位角/高度角按香港纬度 22.293°N 计算，含均时差效应（由完整视位置推导）。

const DEG = Math.PI / 180;

export function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * 太阳视位置
 * @param {Date} date UTC 时间
 * @param {number} lonDeg 东经（度）
 * @param {number} latDeg 北纬（度）
 * @returns {{altitudeDeg:number, azimuthDeg:number, declinationDeg:number}}
 *   azimuthDeg: 自正北顺时针（罗盘方位角）
 */
export function sunPosition(date, lonDeg = 114.159, latDeg = 22.293) {
  const JD = julianDay(date);
  const n = JD - 2451545.0;
  const T = n / 36525;

  const L = ((280.460 + 0.9856474 * n) % 360 + 360) % 360;      // 平黄经
  const g = ((357.528 + 0.9856003 * n) % 360) * DEG;            // 平近点角
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * DEG; // 视黄经
  const eps = (23.439 - 0.0000004 * n) * DEG;                   // 黄赤交角

  const alpha = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)); // 赤经
  const delta = Math.asin(Math.sin(eps) * Math.sin(lambda));                    // 赤纬

  // 格林尼治平恒星时 → 地方恒星时
  const GMST = 280.46061837 + 360.98564736629 * n +
    0.000387933 * T * T - (T * T * T) / 38710000;
  const LST = (GMST + lonDeg) * DEG;

  const H = LST - alpha; // 时角
  const phi = latDeg * DEG;

  const altitude = Math.asin(
    Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(H)
  );
  // 方位角：自正北起算，顺时针（东=90°，南=180°，西=270°）
  let azimuth = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(phi) - Math.tan(delta) * Math.cos(phi)
  ) + Math.PI;
  azimuth = ((azimuth % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  return {
    altitudeDeg: altitude / DEG,
    azimuthDeg: azimuth / DEG,
    declinationDeg: delta / DEG
  };
}

/** 太阳方向单位向量（世界坐标：X 东，Z 南，Y 上） */
export function sunDirection(date, lonDeg, latDeg) {
  const { altitudeDeg, azimuthDeg } = sunPosition(date, lonDeg, latDeg);
  const alt = altitudeDeg * DEG, az = azimuthDeg * DEG;
  return {
    x: Math.sin(az) * Math.cos(alt),
    y: Math.sin(alt),
    z: -Math.cos(az) * Math.cos(alt)  // 北 = -Z
  };
}
