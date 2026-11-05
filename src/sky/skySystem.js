// 天空系统：物理太阳位置驱动的大气散射穹顶、日光/月光、星空、雾。
// 调色板在 JS 侧计算并作为 uniform 同时供天空与海面使用，保证两岸倒影色调一致。
//
// M4 起全场景走统一的 线性→ACES→sRGB 链路（fx/postfx.js 的 OutputPass）。
// skyPalette 仍是"按显示值手写"的调色板，这里用 fx/tonelink.js 的精确逆变换
// 换成线性 HDR 再喂给穹顶 / 海面 / 雾 —— 于是雾中的楼群和背后的天空严格同色。
import * as THREE from 'three';
import { sunPosition, sunDirection } from './astronomy.js';
import { displayToLinearHDR, srgbToLinear } from '../fx/tonelink.js';

const DEG = Math.PI / 180;

function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function mix3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

// 各时段调色板（线性空间 HDR 前的基色）
const PAL_DAY      = { zen: [0.16, 0.34, 0.47], hor: [0.63, 0.76, 0.78] };
const PAL_GOLDEN   = { zen: [0.13, 0.18, 0.45], hor: [1.05, 0.55, 0.22] };
const PAL_TWILIGHT = { zen: [0.04, 0.07, 0.20], hor: [0.40, 0.22, 0.30] };
const PAL_NIGHT    = { zen: [0.01, 0.017, 0.035], hor: [0.035, 0.055, 0.085] };

export function skyPalette(altDeg) {
  let zen, hor;
  if (altDeg >= 18) {
    zen = PAL_DAY.zen; hor = PAL_DAY.hor;
  } else if (altDeg >= 2) {
    const t = smoothstep(2, 18, altDeg);
    zen = mix3(PAL_GOLDEN.zen, PAL_DAY.zen, t);
    hor = mix3(PAL_GOLDEN.hor, PAL_DAY.hor, t);
  } else if (altDeg >= -6) {
    const t = smoothstep(-6, 2, altDeg);
    zen = mix3(PAL_TWILIGHT.zen, PAL_GOLDEN.zen, t);
    hor = mix3(PAL_TWILIGHT.hor, PAL_GOLDEN.hor, t);
  } else {
    const t = smoothstep(-14, -6, altDeg);
    zen = mix3(PAL_NIGHT.zen, PAL_TWILIGHT.zen, t);
    hor = mix3(PAL_NIGHT.hor, PAL_TWILIGHT.hor, t);
  }
  // 太阳本体颜色：低空转橙红
  const warm = 1 - smoothstep(0, 14, altDeg);
  const sun = [1.0, lerp(0.98, 0.38, warm), lerp(0.92, 0.12, warm)];
  return { zen, hor, sun };
}

const SKY_VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_Position.z = gl_Position.w; // 始终贴远平面
  }
`;

const SKY_FRAG = /* glsl */`
  varying vec3 vDir;
  uniform vec3 uZenith, uHorizon, uSunColor, uSunDir;
  uniform float uCloud;        // 覆盖率 0..1（M4 天气）
  uniform float uCloudDark;    // 云体压暗（雨云 0.75）
  uniform float uWind;         // 云漂移速度倍率
  uniform float uTime;
  uniform vec3 uCloudLit;      // 云受光面颜色（线性 HDR）
  uniform vec3 uCloudShadow;   // 云背光 / 底部颜色（线性 HDR）

  float hash2(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash2(i), b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0)), d = hash2(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.13 + 17.7; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, 0.0, 1.0);
    float t = pow(1.0 - h, 1.6);
    vec3 col = mix(uZenith, uHorizon, t);
    float sd = dot(d, uSunDir);
    col += uSunColor * pow(clamp(sd, 0.0, 1.0), 200.0) * 0.9;   // 米氏光晕
    col += uSunColor * pow(clamp(sd, 0.0, 1.0), 8.0) * 0.08;     // 宽域散射
    col += uSunColor * smoothstep(0.99970, 0.99997, sd) * 40.0;  // 日轮
    col = mix(col, uHorizon * 0.55, 1.0 - smoothstep(-0.08, 0.0, d.y)); // 地平线下压暗

    // ---- 云层（M4）：方向投影到水平面做 2D fbm，覆盖率阈值切片 ----
    if (uCloud > 0.005 && d.y > 0.005) {
      vec2 cuv = d.xz / max(d.y, 0.09) * 0.55;
      cuv += uTime * uWind * vec2(0.011, 0.007);
      float f = fbm(cuv) * 0.72 + 0.28 * fbm(cuv * 3.1 + 4.7);
      float th = 1.0 - uCloud * 1.08;
      float cov = smoothstep(th, th + 0.30, f);
      if (cov > 0.0) {
        // 受光：朝阳侧 + 云体内部起伏；雨云整体压暗
        float lit = 0.45 + 0.55 * pow(clamp(sd, 0.0, 1.0), 3.0);
        lit *= 0.72 + 0.28 * clamp((f - th) * 6.0, 0.0, 1.0);
        vec3 cloudCol = mix(uCloudShadow, uCloudLit, lit);
        float horiz = smoothstep(0.015, 0.11, d.y);   // 地平线处云溶进雾色
        col = mix(col, mix(uHorizon, cloudCol, horiz), cov);
      }
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

export class SkySystem {
  constructor(scene) {
    this.scene = scene;

    // 大气穹顶
    this.skyUniforms = {
      uZenith: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSunColor: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uCloud: { value: 0 },
      uCloudDark: { value: 0 },
      uWind: { value: 1 },
      uTime: { value: 0 },
      uCloudLit: { value: new THREE.Color(1, 1, 1) },
      uCloudShadow: { value: new THREE.Color(0.5, 0.5, 0.55) }
    };
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 24),
      new THREE.ShaderMaterial({
        uniforms: this.skyUniforms,
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false
      })
    );
    dome.scale.setScalar(12000);
    dome.frustumCulled = false;
    dome.renderOrder = -100;
    scene.add(dome);
    this.dome = dome;

    // 星空（种子化随机 2500 颗）
    const starCount = 700;
    const pos = new Float32Array(starCount * 3);
    let seed = 1234567;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < starCount; i++) {
      // 上半球均匀分布
      const u = rand(), v = rand();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(1 - v * 0.95);
      const r = 11000;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xcfd8ff, size: 1.2, sizeAttenuation: false,
      transparent: true, opacity: 0, depthWrite: false, fog: false
    }));
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    // 月亮：反日位置的白色圆盘（月相 / 真实月轨未做，留待后续里程碑）
    this.moon = new THREE.Mesh(
      new THREE.CircleGeometry(150, 32),
      new THREE.MeshBasicMaterial({ color: 0xdfe4f2, transparent: true, opacity: 0, fog: false })
    );
    scene.add(this.moon);

    // 太阳平行光（带阴影）
    this.sunLight = new THREE.DirectionalLight(0xffffff, 0);
    this.sunLight.castShadow = true;
    const sc = this.sunLight.shadow.camera;
    // M2 的城市层有 6000+ 栋楼同时投影，阴影相机再摊到 ±1600m 会让 2048 贴图
    // 退化到 1.5m/texel，楼层自阴影把整片城区判成背光 —— 表现为"近处亮、远处全黑"。
    // 收到 ±1200m 并把贴图提到 4096（0.59m/texel）后，楼体自身不再误判阴影。
    sc.left = -1200; sc.right = 1200; sc.top = 1200; sc.bottom = -1200;
    sc.near = 1; sc.far = 9000;
    this.sunLight.shadow.mapSize.set(4096, 4096);
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.normalBias = 0.8;
    scene.add(this.sunLight);
    scene.add(this.sunLight.target);

    // 月光（微弱蓝）
    this.moonLight = new THREE.DirectionalLight(0x8899cc, 0);
    scene.add(this.moonLight);
    scene.add(this.moonLight.target);

    // 半球环境光
    this.hemi = new THREE.HemisphereLight(0xbdd3e8, 0x5a5a52, 0.5);
    scene.add(this.hemi);

    this.palette = { zen: [0, 0, 0], hor: [0, 0, 0], sun: [1, 1, 1] };
    this.nightF = 0;
  }

  /** 每帧更新。wx 为天气参数（fx/weather.js），t 为秒级时间（云漂移）。返回 HUD 与水面需要的太阳信息。 */
  update(date, camTarget, wx = null, t = 0) {
    const sp = sunPosition(date);
    const sd = sunDirection(date);
    const sunDir = new THREE.Vector3(sd.x, sd.y, sd.z);
    const alt = sp.altitudeDeg;
    const weather = wx ?? { cloud: 0, cloudDark: 0, fogMul: 1, sunMul: 1, wind: 1, rain: 0, wet: 0 };

    const pal = skyPalette(alt);
    this.palette = pal;
    // 线性 HDR 版调色板：穹顶 / 海面 / 雾走统一色调链路的输入。
    // 太阳颜色不做 ACES 逆变换（它是光源而非基色，逆变换会把白色太阳推到 12 HDR，
    // 米氏光晕会糊掉半边天）——只做 sRGB→线性，亮度由各项系数控制。
    const palLin = {
      zen: displayToLinearHDR(...pal.zen),
      hor: displayToLinearHDR(...pal.hor),
      // 太阳 glow 项在天黑后要消失（否则午夜地平线上永远挂着一团落日红光）。
      sun: pal.sun.map(srgbToLinear).map(v => v * smoothstep(-13, -6, alt))
    };
    this.paletteLin = palLin;
    this.skyUniforms.uZenith.value.setRGB(...palLin.zen);
    this.skyUniforms.uHorizon.value.setRGB(...palLin.hor);
    this.skyUniforms.uSunColor.value.setRGB(...palLin.sun);
    this.skyUniforms.uSunDir.value.copy(sunDir);

    // 昼夜因子
    const nightF = 1 - smoothstep(-10, 0, alt);
    this.nightF = nightF;
    // 云层遮蔽星空 / 月亮
    this.stars.material.opacity = nightF * 0.27 * (1 - weather.cloud * 0.95);

    // 云层 uniform：颜色由调色板 + 日照因子推导，雨云整体压暗
    const cl = this.skyUniforms;
    cl.uCloud.value = weather.cloud;
    cl.uCloudDark.value = weather.cloudDark;
    cl.uWind.value = weather.wind;
    cl.uTime.value = t;
    const dayF = smoothstep(-2, 12, alt);
    const dk = 1 - weather.cloudDark * 0.55;
    cl.uCloudLit.value.setRGB(
      lerp(0.016, 1.45 * palLin.sun[0], dayF) * dk,
      lerp(0.018, 1.40 * palLin.sun[1], dayF) * dk,
      lerp(0.026, 1.32 * palLin.sun[2], dayF) * dk);
    const shF = (0.55 - 0.30 * weather.cloudDark);
    cl.uCloudShadow.value.setRGB(
      palLin.hor[0] * shF + palLin.zen[0] * 0.18,
      palLin.hor[1] * shF + palLin.zen[1] * 0.18,
      palLin.hor[2] * shF + palLin.zen[2] * 0.18);

    // 月亮：反日
    const moonDir = sunDir.clone().negate();
    this.moon.position.copy(moonDir).multiplyScalar(10800).add(
      new THREE.Vector3(camTarget.x, 0, camTarget.z));
    this.moon.lookAt(camTarget.x, 0, camTarget.z);
    this.moon.material.opacity = nightF * (1 - weather.cloud * 0.9);

    // 穹顶跟随相机目标，避免飞出球外
    this.dome.position.set(camTarget.x, 0, camTarget.z);
    this.stars.position.copy(this.dome.position);

    // 日光（天气 sunMul：云层遮挡直射光）
    const dayI = smoothstep(-2, 12, alt);
    this.sunLight.intensity = 2.9 * dayI * Math.max(0.15, Math.sin(Math.max(alt, 0) * DEG) + 0.12)
      * weather.sunMul;
    this.sunLight.color.setRGB(...pal.sun);
    if (alt > -3) {
      this.sunLight.position.set(
        camTarget.x + sunDir.x * 5000, sunDir.y * 5000 + 200, camTarget.z + sunDir.z * 5000);
      this.sunLight.target.position.set(camTarget.x, 0, camTarget.z);
    }

    // 月光
    this.moonLight.intensity = 0.16 * nightF;
    this.moonLight.position.set(
      camTarget.x + moonDir.x * 4000, Math.max(moonDir.y, 0.3) * 4000, camTarget.z + moonDir.z * 4000);
    this.moonLight.target.position.set(camTarget.x, 0, camTarget.z);

    // 半球光。M2 城市层起来后，背光立面如果只有 0.55 的天光会直接压成黑板，
    // 立面材质（玻璃/混凝土/马赛克）就完全读不出来了。这里把白天天光抬到 0.95。
    // 阴天天光略降（云层漫射仍有相当照度），夜里不变。
    // M4：夜间底光 0.22→0.30 且地面反照偏暖 —— 香港夜晚的街灯/店铺溢光会照亮立面，
    // 纯蓝天光会让夜街变成剪影。
    this.hemi.intensity = lerp(1.08, 0.30, nightF) * (1 - weather.cloud * 0.20);
    this.hemi.color.setRGB(pal.zen[0] + 0.35, pal.zen[1] + 0.35, pal.zen[2] + 0.35);
    this.hemi.groundColor.setRGB(
      lerp(0.34, 0.45, nightF), lerp(0.33, 0.32, nightF), lerp(0.30, 0.20, nightF));

    // 雾：白天薄、夜里海面起雾。雾色用线性 HDR 地平线色 —— 雾中楼群与穹顶同链路同色。
    // 天气 fogMul 直接放大密度（海雾天能见度收到几百米）。
    if (this.scene.fog) {
      this.scene.fog.density = lerp(0.000095, 0.00014, nightF) * weather.fogMul;
      this.scene.fog.color.setRGB(
        palLin.hor[0] * (1 - nightF * 0.6),
        palLin.hor[1] * (1 - nightF * 0.6),
        palLin.hor[2] * (1 - nightF * 0.55));
    }

    return {
      altitudeDeg: alt,
      azimuthDeg: sp.azimuthDeg,
      sunDir,
      nightF,
      palette: pal,        // 显示空间（HUD / 调试用）
      paletteLin: palLin   // 线性 HDR（海面 / 后期链用）
    };
  }
}
