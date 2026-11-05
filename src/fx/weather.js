// 天气系统（M4）：预设参数 + 平滑过渡控制器。
//
// 本文件不 import three，纯数据 + 纯函数，node 可直接跑（scripts/verify-fx.mjs 验收）。
// 每个预设是一组标量乘子，由各处消费：
//   cloud      天空穹顶云层覆盖率 0..1（skySystem 着色器 fbm 阈值）
//   cloudDark  云体压暗系数（雨云接近 0.75，晴天薄云接近 0）
//   fogMul     场景指数雾密度倍率（海雾天直接把维港糊掉）
//   sunMul     直射阳光强度倍率（云层遮挡）
//   rain       降雨强度 0..1（fx/rain.js 粒子量 + 水面涟漪增幅）
//   wet        地面湿润度 0..1（路面变暗、粗糙度下降、反光增强）
//   wind       风速倍率（云漂移 / 雨倾斜）

export const WEATHER_PRESETS = {
  clear:  { id: 'clear',  label: '晴朗', cloud: 0.10, cloudDark: 0.00, fogMul: 1.0, sunMul: 1.00, rain: 0, wet: 0.0, wind: 1.0 },
  cloudy: { id: 'cloudy', label: '多云', cloud: 0.65, cloudDark: 0.35, fogMul: 1.7, sunMul: 0.55, rain: 0, wet: 0.0, wind: 1.5 },
  fog:    { id: 'fog',    label: '海雾', cloud: 0.92, cloudDark: 0.10, fogMul: 18,  sunMul: 0.30, rain: 0, wet: 0.3, wind: 0.4 },
  rain:   { id: 'rain',   label: '降雨', cloud: 0.95, cloudDark: 0.75, fogMul: 2.8, sunMul: 0.22, rain: 1, wet: 1.0, wind: 1.9 }
};

export const WEATHER_ORDER = ['clear', 'cloudy', 'fog', 'rain'];

const NUM_KEYS = ['cloud', 'cloudDark', 'fogMul', 'sunMul', 'rain', 'wet', 'wind'];

export class Weather {
  constructor(id = 'clear') {
    const p = WEATHER_PRESETS[id] ?? WEATHER_PRESETS.clear;
    this.id = p.id;
    this.current = { ...p };
    this.target = p;
  }

  /** 切换天气。instant=true 时立即到位（截图 / 调试用），否则 ~3 秒指数过渡。 */
  set(id, instant = false) {
    const p = WEATHER_PRESETS[id];
    if (!p) return false;
    this.id = p.id;
    this.target = p;
    if (instant) this.current = { ...p };
    return true;
  }

  /** 顺序切换（键盘 C）。 */
  cycle() {
    const i = WEATHER_ORDER.indexOf(this.id);
    this.set(WEATHER_ORDER[(i + 1) % WEATHER_ORDER.length]);
  }

  /** 每帧推进过渡，返回当前参数（可直接喂给 sky.update / water.update / rain）。 */
  update(dt) {
    const k = 1 - Math.exp(-dt / 1.2);
    for (const key of NUM_KEYS) {
      this.current[key] += (this.target[key] - this.current[key]) * k;
    }
    return this.current;
  }

  get label() { return WEATHER_PRESETS[this.id].label; }
}

/**
 * 夜间路面溢光：城市光污染打在路面上的一点暖色底光（霓虹 / 车灯 / 店铺溢光）。
 * 没有它，午夜的路面是纯黑，路灯光池会悬浮在虚空里。
 */
export function applyNightSpill(materials, nightF) {
  for (const m of materials) {
    m.emissive.setRGB(0.055 * nightF, 0.042 * nightF, 0.028 * nightF);
  }
}

/**
 * 地面湿润：直接作用于路面 / 人行道共享材质（MeshStandardMaterial）。
 * 基准值首次调用时存进 userData，之后按 wet 插值 —— 湿路变暗、粗糙度大降，
 * 夜间路灯 / 霓虹会在地面拉出反光。
 */
export function applyWetness(materials, wet) {
  for (const m of materials) {
    if (!m.userData.wetBase) {
      m.userData.wetBase = { roughness: m.roughness, metalness: m.metalness, color: m.color.getHex() };
    }
    const b = m.userData.wetBase;
    m.roughness = b.roughness * (1 - 0.68 * wet);
    m.metalness = b.metalness + 0.10 * wet;
    const d = 1 - 0.26 * wet;
    m.color.setHex(b.color).multiplyScalar(d);
  }
}
