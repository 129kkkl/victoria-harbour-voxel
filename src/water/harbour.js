// 维多利亚港海面：Gerstner 波（3 层）+ 程序化法线涟漪 + 菲涅尔天空反射
// + 太阳镜面高光 + 岸线泡沫（基于陆地掩码纹理）+ 指数雾。
//
// M4：输出从"直接写显示值"改为线性 HDR —— 全场景经 EffectComposer 的
// OutputPass 统一过 ACES + sRGB（见 fx/postfx.js / fx/tonelink.js）。
// 掠射角"惨白"的真正根因（链路不一致）随之消除，高光自然滚降不再硬切。
import * as THREE from 'three';
import { FAR_RECT } from '../geo/bounds.js';
import { displayToLinearHDR } from '../fx/tonelink.js';

const WATER_VERT = /* glsl */`
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNormal;

  // Gerstner 波
  vec3 gerstner(vec2 p, vec2 dir, float amp, float len, float speed, float steep, float t, inout vec3 n) {
    float k = 6.28318 / len;
    float f = k * (dot(dir, p) - speed * t);
    float a = amp;
    float q = steep;
    n.x -= dir.x * a * k * cos(f);
    n.z -= dir.y * a * k * cos(f);
    n.y -= q * a * k * sin(f);
    return vec3(dir.x * q * a * cos(f), a * sin(f), dir.y * q * a * cos(f));
  }

  void main() {
    vec3 p = position;
    vec3 n = vec3(0.0, 1.0, 0.0);
    vec3 disp = vec3(0.0);
    disp += gerstner(p.xz, normalize(vec2( 0.80,  0.60)), 0.30, 64.0, 9.0, 0.55, uTime, n);
    disp += gerstner(p.xz, normalize(vec2(-0.30,  0.95)), 0.16, 29.0, 6.5, 0.50, uTime, n);
    disp += gerstner(p.xz, normalize(vec2( 0.99, -0.20)), 0.07, 13.0, 4.2, 0.40, uTime, n);
    p += disp;
    vWorld = p;
    vNormal = normalize(n);
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const WATER_FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform vec3 uSunDir, uSunColor, uZenith, uHorizon, uDeep;
  uniform sampler2D uMask;
  uniform vec4 uMaskRect;   // xMin, zMin, 1/w, 1/h
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform vec3 uFoam;
  uniform float uRain;     // 降雨强度（M4）：加密涟漪 + 雨点碎光
  uniform float uNight;    // 夜间因子（M4）：岸边城市灯光倒影
  varying vec3 vWorld;
  varying vec3 vNormal;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  void main() {
    vec3 n = normalize(vNormal);
    // 双层滚动涟漪法线
    float r1 = vnoise(vWorld.xz * 0.11 + uTime * vec2(0.030, 0.021));
    float r2 = vnoise(vWorld.xz * 0.043 - uTime * vec2(0.017, 0.026));
    float r3 = vnoise(vWorld.xz * 0.55 + uTime * vec2(0.09, -0.06));
    // Independent, gentle slopes avoid the former high-contrast foam-like noise.
    n.x += (r1 - 0.5) * 0.045 + (r3 - 0.5) * (0.012 + uRain * 0.09);
    n.z += (r2 - 0.5) * 0.055 + sin(vWorld.x * 0.032 + vWorld.z * 0.06 + uTime * 0.5) * 0.009;
    n = normalize(n);

    vec3 V = normalize(cameraPosition - vWorld);
    vec3 R = reflect(-V, n);
    // 菲涅尔封顶：掠射角下 pow(1-NdotV,5) 会把 fres 推到 0.97，水面被天光反射
    // 刷成一片惨白，维港反而"消失"了。封顶 0.72 后仍保留掠射高光，
    // 但水体本色（深水色 + 泡沫 + 波光）任何角度都读得出来。
    float fres = min(0.06 + 0.56 * pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 4.0), 0.52);
    vec3 skyRef = mix(uHorizon, uZenith, pow(clamp(R.y, 0.0, 1.0), 0.6));
    vec3 col = mix(uDeep, skyRef, fres);

    // 太阳镜面 + 波光
    float s = max(dot(R, uSunDir), 0.0);
    col += uSunColor * (pow(s, 900.0) * 0.8 + pow(s, 60.0) * 0.075);

    // 岸线泡沫带（掩码模糊边缘的窄环带）
    vec2 muv = (vWorld.xz - uMaskRect.xy) * uMaskRect.zw;
    float m = texture2D(uMask, vec2(muv.x, muv.y)).r;
    float band = (1.0 - smoothstep(0.50, 0.56, m)) * smoothstep(0.40, 0.47, m);
    float foamN = vnoise(vWorld.xz * 0.6 + uTime * vec2(0.35, 0.2));
    float foam = band * smoothstep(0.42, 0.75, foamN + 0.18 * sin(uTime * 1.2 + vWorld.x * 0.02));
    col += uFoam * foam;
    // 雨点砸出的碎光（高频细斑，弱振幅 —— 强了会像雪花噪点）
    if (uRain > 0.01) {
      float spk = vnoise(vWorld.xz * 2.6 + uTime * vec2(1.4, 1.1));
      col += vec3(0.030, 0.034, 0.038) * smoothstep(0.86, 0.97, spk) * uRain;
    }
    // 近岸浅水变亮
    col = mix(col, col * 1.15 + vec3(0.002, 0.006, 0.006), band * 0.22);

    // 夜间：岸边城市灯光的倒影（岸线环带向海一侧，竖向拉伸的碎光，
    // 冷暖按岸段交替 —— 住宅暖黄、商厦冷白）。
    if (uNight > 0.01) {
      float shore = (1.0 - smoothstep(0.45, 0.52, m)) * smoothstep(0.30, 0.42, m);
      float st = vnoise(vec2(vWorld.x * 0.85, vWorld.z * 0.05 + uTime * 0.20))
               * vnoise(vec2(vWorld.x * 0.21 + 7.3, vWorld.z * 0.035 - uTime * 0.11));
      st *= st;   // 拉对比：碎光之间留暗缝，否则会连成一条光带
      float warm = step(0.55, vnoise(vec2(floor(vWorld.x * 0.004) + 0.5, 3.3)));
      vec3 glowCol = mix(vec3(0.45, 0.70, 1.00), vec3(1.00, 0.62, 0.28), warm);
      col += glowCol * shore * st * uNight * 0.55;
    }

    // 指数雾（与场景 FogExp2 同式）
    float depth = length(cameraPosition - vWorld);
    float f = 1.0 - exp(-uFogDensity * uFogDensity * depth * depth);
    col = mix(col, uFogColor, clamp(f, 0.0, 1.0));

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createWater(landMaskCanvas) {
  const w = FAR_RECT.xMax - FAR_RECT.xMin;
  const d = FAR_RECT.zMax - FAR_RECT.zMin;
  const cx = (FAR_RECT.xMin + FAR_RECT.xMax) / 2;
  const cz = (FAR_RECT.zMin + FAR_RECT.zMax) / 2;

  // 直接在世界坐标建网格（~100m 顶点间距，波靠顶点位移）
  const segX = 150, segZ = 110;
  const vertCount = (segX + 1) * (segZ + 1);
  const positions = new Float32Array(vertCount * 3);
  let p = 0;
  for (let j = 0; j <= segZ; j++) {
    for (let i = 0; i <= segX; i++) {
      positions[p++] = FAR_RECT.xMin + (i / segX) * w;
      positions[p++] = 0;
      positions[p++] = FAR_RECT.zMin + (j / segZ) * d;
    }
  }
  const index = new Uint32Array(segX * segZ * 6);
  let k = 0;
  for (let j = 0; j < segZ; j++) {
    for (let i = 0; i < segX; i++) {
      const a = j * (segX + 1) + i, b = a + 1, c = a + segX + 1, e = c + 1;
      // 绕序必须让几何法线朝 +Y：(a,b,c) 的叉积是 (0,-1,0)，从上往下看是背面，
      // 会被默认的 FrontSide 整片剔除 —— 海面因此**从未被画出来**，画面上那片
      // "惨白"其实一直是海底地形。M1 一直误判为"菲涅尔反射过强"。
      index[k++] = a; index[k++] = c; index[k++] = b;
      index[k++] = b; index[k++] = c; index[k++] = e;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, 0, cz), Math.hypot(w, d));

  const maskTex = new THREE.CanvasTexture(landMaskCanvas);
  maskTex.wrapS = maskTex.wrapT = THREE.ClampToEdgeWrapping;
  maskTex.minFilter = THREE.LinearFilter;
  maskTex.magFilter = THREE.LinearFilter;
  maskTex.flipY = true; // canvas 北在上 → v=1 为北（zMin）

  const uniforms = {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color(1, 1, 1) },
    uZenith: { value: new THREE.Color(0.1, 0.3, 0.65) },
    uHorizon: { value: new THREE.Color(0.55, 0.7, 0.85) },
    uDeep: { value: new THREE.Color(...displayToLinearHDR(0.08, 0.24, 0.26)) },
    uFoam: { value: new THREE.Color(...displayToLinearHDR(0.32, 0.335, 0.335)) },
    uMask: { value: maskTex },
    // flipY=true 时 v=1 对应 canvas 顶部（北，zMin）：v = (zMax - z)/d
    uMaskRect: { value: new THREE.Vector4(FAR_RECT.xMin, FAR_RECT.zMax, 1 / w, -1 / d) },
    uFogColor: { value: new THREE.Color(0.55, 0.7, 0.85) },
    uFogDensity: { value: 0.000055 },
    uRain: { value: 0 },
    uNight: { value: 0 }
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'harbour-water';
  mesh.frustumCulled = false;

  return {
    mesh,
    update(time, sunInfo, fog, wx = null) {
      uniforms.uTime.value = time;
      uniforms.uSunDir.value.copy(sunInfo.sunDir);
      const pal = sunInfo.paletteLin ?? sunInfo.palette; // 优先线性 HDR（M4 统一链路）
      uniforms.uSunColor.value.setRGB(...pal.sun);
      uniforms.uZenith.value.setRGB(...pal.zen);
      uniforms.uHorizon.value.setRGB(...pal.hor);
      uniforms.uRain.value = wx ? wx.rain : 0;
      uniforms.uNight.value = sunInfo.nightF ?? 0;
      const nf = sunInfo.nightF ?? 0;
      uniforms.uDeep.value.setRGB(...displayToLinearHDR(0.08 * (1 - nf * .675), 0.24 * (1 - nf * .763), 0.26 * (1 - nf * .70)));
      if (fog) {
        uniforms.uFogColor.value.copy(fog.color);
        uniforms.uFogDensity.value = fog.density;
      }
    }
  };
}
