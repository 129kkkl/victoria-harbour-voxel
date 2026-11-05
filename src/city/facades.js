// 立面材质系统：用世界尺度 UV 把程序化贴图"贴"到任意大小的体量上。
//
// 关键在于不使用 Three.js 默认的 0..1 盒体 UV —— 那样窗户会随楼体拉伸。
// 改为在 vertex 阶段还原体量的米制局部坐标（配合 instanceMatrix 的列长），
// 于是每面墙的贴图按真实的开间 × 层高重复：玻璃幕墙每 1.5m 一竖梃、
// 唐楼每 3.0m 一层窗，无论楼是 30m 还是 300m 都一致。
//
// 同一段着色器里顺带解决三件事：
//   ① 墙面 / 屋顶按世界法线 y 分支混采样
//   ② 粗糙度与金属度从 MR 图的 G/B 通道读入（玻璃亮、混凝土哑）
//   ③ 夜间窗光由 EM 图掩码 × uNight 驱动
import * as THREE from 'three';
import { facadeTextures, roofTexture, FACADE_FAMILIES, CELLS } from '../materials/proceduralTextures.js';

// 霓虹色相环（M4）：emis.B 0..1 → 品红/青/绿/琥珀/红。
// 两个立面材质共用，保持城市层与地标的霓虹色一致。
const NEON_HUE_GLSL = /* glsl */`
  vec3 vhNeonHue(float h) {
    vec3 c1 = vec3(1.00, 0.16, 0.55);   // 品红
    vec3 c2 = vec3(0.10, 0.85, 1.00);   // 青
    vec3 c3 = vec3(0.30, 1.00, 0.45);   // 绿
    vec3 c4 = vec3(1.00, 0.68, 0.12);   // 琥珀
    vec3 c5 = vec3(1.00, 0.20, 0.20);   // 红
    float t = fract(h) * 5.0;
    float i = floor(t), f = t - i;
    return i < 1.0 ? mix(c1, c2, f) : i < 2.0 ? mix(c2, c3, f)
      : i < 3.0 ? mix(c3, c4, f) : i < 4.0 ? mix(c4, c5, f) : mix(c5, c1, f);
  }
`;

const registry = [];

const VERT_HEAD = /* glsl */`
  attribute vec3 aTint;
  attribute vec4 aStyle;
  varying vec3 vTint;
  varying vec2 vFacadeUv;
  varying vec2 vRoofUv;
  varying float vUp;
  varying float vBaseY;
  varying float vH;
  varying float vEdge;
  varying float vWidth;
  varying vec2 vBuilding;
  uniform vec2 uFacadeScale;
  uniform float uRoofScale;
`;

const VERT_BODY = /* glsl */`
  vTint = aTint;
  vec3 vhScale = vec3(1.0);
  #ifdef USE_INSTANCING
    vhScale = vec3(
      length(instanceMatrix[0].xyz),
      length(instanceMatrix[1].xyz),
      length(instanceMatrix[2].xyz));
  #endif
  vec3 vhLocal = transformed * vhScale;          // 米制局部坐标（未旋转）
  // Sloping crowns use the normal after nonuniform instance scaling.
  // The unit-mesh normal incorrectly classified an entire tall blade as roof.
  vUp = abs(normalize(normal / vhScale).y);
  float vhOff = (abs(normal.x) > 0.5) ? vhScale.z * 0.5 : vhScale.x * 0.5;
  vec2 vhU = (abs(normal.x) > 0.5)
    ? vec2(vhLocal.z + vhOff, vhLocal.y)
    : vec2(vhLocal.x + vhOff, vhLocal.y);
  vhU.y = vhLocal.y + vhScale.y * 0.5 + aStyle.x;
  vFacadeUv = vhU * uFacadeScale;
  vFacadeUv.x *= aStyle.z;
  vBuilding = vec2(aStyle.y, aStyle.w);
  vRoofUv = vhLocal.xz * uRoofScale;
  vBaseY = vhLocal.y + vhScale.y * 0.5;          // 距本段盒体底面的高度（米）
  vH = vhScale.y;
  // 到最近竖直棱线的水平距离：转角压暗让相邻楼体在远距也能"分栋"
  vEdge = abs(normal.x) > 0.5 ? vhLocal.z : vhLocal.x;
  vWidth = abs(normal.x) > 0.5 ? vhScale.z : vhScale.x;
  #ifdef USE_INSTANCING
    // 逐实例整格平移立面贴图：同族同尺寸的楼不再共享同一套窗格/窗光图案
    vec2 vhIP = vec2(aStyle.y, aStyle.y * 0.719);
    vec2 vhHs = fract(sin(vec2(dot(vhIP, vec2(127.1, 311.7)),
                               dot(vhIP, vec2(269.5, 183.3)))) * 43758.5453);
    vFacadeUv += floor(vhHs * ${CELLS}.0) / ${CELLS}.0;
  #endif
`;

const FRAG_HEAD = /* glsl */`
  varying vec3 vTint;
  varying vec2 vFacadeUv;
  varying vec2 vRoofUv;
  varying float vUp;
  varying float vBaseY;
  varying float vH;
  varying float vEdge;
  varying float vWidth;
  varying vec2 vBuilding;
  uniform sampler2D uMap;
  uniform sampler2D uMR;
  uniform sampler2D uEmis;
  uniform sampler2D uRoofMap;
  uniform vec2 uFacadeScale;
  uniform float uRoofScale;
  uniform vec2 uRoofMR;
  uniform vec3 uEmisColor;
  uniform float uNight;
  uniform float uNeon;
`;

const MAP_CHUNK = /* glsl */`
  float vhVert = 1.0 - smoothstep(0.55, 0.88, vUp);
  vec4 vhF = texture2D(uMap, vFacadeUv);
  vec4 vhR = texture2D(uRoofMap, vRoofUv);
  diffuseColor *= mix(vhR, vhF, vhVert);
  diffuseColor.rgb *= vTint;
  // 近地压暗：街谷底部光照弱，给楼体一个"落地"的明暗梯度（退台处也形成檐下阴影）
  float vhAO = mix(0.80, 1.0, smoothstep(0.0, min(10.0, vH * 0.25), vBaseY));
  diffuseColor.rgb *= mix(1.0, vhAO, vhVert);
  // 转角棱线压暗：相邻同色系楼体靠这条竖线"分栋"
  float vhEdge = mix(0.75, 1.0, smoothstep(0.0, 1.1, vWidth * 0.5 - abs(vEdge)));
  diffuseColor.rgb *= mix(1.0, vhEdge, vhVert);
  vec4 vhMR = mix(vec4(1.0, uRoofMR.x, uRoofMR.y, 1.0), texture2D(uMR, vFacadeUv), vhVert);
`;

const ROUGH_CHUNK = /* glsl */`
  float roughnessFactor = roughness * vhMR.g;
`;

const METAL_CHUNK = /* glsl */`
  float metalnessFactor = metalness * vhMR.b;
`;

// 窗光走 R 通道；B 通道在招牌带外是窗光冷暖（暖黄 ↔ 冷白荧光），
// 在招牌带内与 G 一起编码霓虹（G=强度，B=色相），HDR 倍增交给泛光晕开
const EMIS_CHUNK = /* glsl */`
  vec3 vhEmis = texture2D(uEmis, vFacadeUv).rgb;
  // Per-building, per-cell occupancy breaks the repeated six-storey light stamp.
  vec2 vhCell = floor(vFacadeUv * ${CELLS}.0);
  float vhOccupancy = fract(sin(dot(vhCell, vec2(12.9898, 78.233)) + vBuilding.x * 0.713) * 43758.5453);
  vhEmis.r *= smoothstep(0.18, 0.8, vhOccupancy);
  vhEmis.g *= vBuilding.y;
  vec3 vhWinCol = mix(uEmisColor, vec3(0.52, 0.66, 0.88), vhEmis.b * 0.65);
  totalEmissiveRadiance += vhWinCol * (vhEmis.r * vhVert) * uNight;
  totalEmissiveRadiance += vhNeonHue(vhEmis.b) * (vhEmis.g * vhVert) * uNight * uNeon;
`;

let _roof = null;
function getRoofTexture() {
  if (!_roof) _roof = roofTexture();
  return _roof;
}

/**
 * 创建一个立面材质。
 * @param {string} family FACADE_FAMILIES 的键
 * @param {number} tint  反照率明度系数（整体色偏）
 */
export function makeFacadeMaterial(family, tint = 1) {
  const { map, mr, emis, spec } = facadeTextures(family);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(tint, tint, tint),
    roughness: 1.0,
    metalness: 1.0,
    envMapIntensity: /glass|curtain/.test(family) ? 0.8 : 0.24
  });
  mat.userData.envStrength = /glass|curtain/.test(family) ? 0.8 : 0.24;
  mat.userData.night = family === 'podium' ? 0.72 : 0.38;

  const uniforms = {
    uMap: { value: map },
    uMR: { value: mr },
    uEmis: { value: emis },
    uRoofMap: { value: getRoofTexture() },
    uFacadeScale: { value: new THREE.Vector2(1 / (CELLS * spec.bay), 1 / (CELLS * spec.floor)) },
    uRoofScale: { value: 1 / 14 },
    uRoofMR: { value: new THREE.Vector2(0.92, 0.02) },
    uEmisColor: { value: new THREE.Color(...(spec.winLight ?? [0.85, 0.72, 0.48])) },
    uNight: { value: 0 },
    uNeon: { value: 1.6 }      // 霓虹 HDR 倍增（让泛光晕开；贴图每 4 层重复，宁弱勿爆）
  };
  mat.userData.uniforms = uniforms;

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERT_HEAD)
      .replace('#include <project_vertex>', '#include <project_vertex>\n' + VERT_BODY);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_HEAD + NEON_HUE_GLSL)
      .replace('#include <map_fragment>', MAP_CHUNK)
      .replace('#include <roughnessmap_fragment>', ROUGH_CHUNK)
      .replace('#include <metalnessmap_fragment>', METAL_CHUNK)
      .replace('#include <emissivemap_fragment>', EMIS_CHUNK);
  };

  registry.push(mat);
  return mat;
}

/**
 * 米制 UV 立面材质（M3 地标用）。
 *
 * 与 makeFacadeMaterial 的区别：那个要靠 vertex shader 从 instanceMatrix 反推
 * 米制坐标，只对"单位盒体 + 实例缩放"成立；地标是四棱台/圆台/球冠/斜杆的混合体，
 * 反推不成立。这里改为假设**几何自带米制 UV**（由 landmarks/prims.js 在编译期写入）。
 *
 * 合并几何里屋面和墙面是混在一起的，所以仍需按法线分支混采样：
 *   墙面 = 立面图（repeat 1/开间×楼层），屋面 = 屋顶图（repeat 1/14m）
 *   粗糙度/金属度读 MR 图 G/B 通道，夜景窗光 = EM 掩码 × uNight
 */
const M_VERT_HEAD = /* glsl */`
  varying vec3 vObjN;
`;
const M_VERT_BODY = /* glsl */`
  vObjN = normal;
`;
const M_FRAG_HEAD = /* glsl */`
  varying vec3 vObjN;
  uniform sampler2D uRoofMap;
  uniform vec2 uRoofFix;
  uniform vec2 uRoofMR;
  uniform vec3 uEmisColor;
  uniform float uNight;
  uniform float uNeon;
`;
const M_MAP = /* glsl */`
  float vhVert = 1.0 - smoothstep(0.55, 0.88, abs(vObjN.y));
  vec4 vhF = texture2D(map, vMapUv);
  vec4 vhR = texture2D(uRoofMap, vMapUv * uRoofFix);
  diffuseColor *= mix(vhR, vhF, vhVert);
  vec4 vhMR = mix(vec4(1.0, uRoofMR.x, uRoofMR.y, 1.0), texture2D(roughnessMap, vRoughnessMapUv), vhVert);
`;
const M_ROUGH = /* glsl */`
  float roughnessFactor = roughness * vhMR.g;
`;
const M_METAL = /* glsl */`
  float metalnessFactor = metalness * vhMR.b;
`;
const M_EMIS = /* glsl */`
  vec3 vhEmis = texture2D(emissiveMap, vEmissiveMapUv).rgb;
  vec2 vhCell = floor(vEmissiveMapUv * ${CELLS}.0);
  float vhRoom = fract(sin(dot(vhCell, vec2(17.17, 41.73))) * 43758.5453);
  vhEmis.r *= smoothstep(0.12, 0.72, vhRoom);
  vec3 vhWinCol = mix(uEmisColor, vec3(0.52, 0.66, 0.88), vhEmis.b * 0.65);
  totalEmissiveRadiance += vhWinCol * (vhEmis.r * vhVert) * uNight;
  totalEmissiveRadiance += vhNeonHue(vhEmis.b) * (vhEmis.g * vhVert) * uNight * uNeon;
`;

export function makeMetricFacadeMaterial(family) {
  const { map, mr, emis, spec } = facadeTextures(family);
  const tileU = CELLS * spec.bay, tileV = CELLS * spec.floor;
  const mk = (t) => {
    const c = t.clone();
    c.needsUpdate = true;
    c.wrapS = c.wrapT = THREE.RepeatWrapping;
    c.repeat.set(1 / tileU, 1 / tileV);   // UV 已是米制，repeat 把它换成块数
    return c;
  };
  const mat = new THREE.MeshStandardMaterial({
    map: mk(map),
    roughnessMap: mk(mr),
    metalnessMap: mk(mr),
    emissiveMap: mk(emis),
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 1,
    vertexColors: true,
    roughness: 1.0,
    metalness: 1.0
  });
  mat.envMapIntensity = 0.65;
  mat.userData.envStrength = 0.65;

  const uniforms = {
    uRoofMap: { value: getRoofTexture() },
    uRoofFix: { value: new THREE.Vector2(tileU / 14, tileV / 14) },
    uRoofMR: { value: new THREE.Vector2(0.92, 0.02) },
    uEmisColor: { value: new THREE.Color(...(spec.winLight ?? [0.85, 0.72, 0.48])) },
    uNight: { value: 0 },
    uNeon: { value: 1.6 }
  };
  mat.userData.uniforms = uniforms;
  mat.userData.night = 0.58;
  mat.userData.nightUniform = true;

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + M_VERT_HEAD)
      .replace('#include <project_vertex>', '#include <project_vertex>\n' + M_VERT_BODY);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + M_FRAG_HEAD + NEON_HUE_GLSL)
      .replace('#include <map_fragment>', M_MAP)
      .replace('#include <roughnessmap_fragment>', M_ROUGH)
      .replace('#include <metalnessmap_fragment>', M_METAL)
      .replace('#include <emissivemap_fragment>', M_EMIS);
  };

  registry.push(mat);
  return mat;
}

/** 顶点色纯色材质（桅杆 / 拉索 / 钟面 / 屋顶设备）：一个材质吃掉所有杂项。 */
export function makeVertexColorMaterial(roughness = 0.62, metalness = 0.32) {
  return new THREE.MeshStandardMaterial({
    vertexColors: true, roughness, metalness
  });
}

/**
 * 霓虹顶点色材质（M4，庙街竖挑招牌板 / 横挑招牌用）。
 * 顶点色在白天照旧是招牌的油漆色；夜间按顶点色发光（×2.6 HDR 让泛光晕开）。
 * 与"一种颜色一个材质"相比，整片霓虹区仍只占 1 个 draw call。
 */
export function makeNeonSignMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.45, metalness: 0.08
  });
  const uniforms = { uNight: { value: 0 } };
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight;')
      .replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vColor.rgb * uNight * 2.4;');
  };
  registry.push(mat);
  return mat;
}

/** 简单材质（招牌底板、缆车索道等），夜景不发光。 */
export function makePlainMaterial(color, roughness = 0.85, metalness = 0.05) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color), roughness, metalness
  });
  registry.push(mat);
  return mat;
}

/**
 * 读取 aTint 的实例化纯色材质（屋顶设备用）。
 * 屋顶设备是 InstancedMesh，普通材质不读 aTint，实例色偏会丢失，
 * 白天全渲成材质本色的亮白块 —— 必须像立面材质一样把 aTint 乘进去。
 */
export function makeTintedPlainMaterial(color, roughness = 0.85, metalness = 0.05) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color), roughness, metalness
  });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aTint;\nvarying vec3 vTint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTint;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= vTint;');
  };
  registry.push(mat);
  return mat;
}

/** Street-level vertical signs: a local atlas, one instanced material. */
export function makeStreetSignMaterial(wide = false) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1024;
  const ctx = cv.getContext('2d');
  const labels = ['港灣茶室','永安商行','海景飯店','上海理髮','金記茶餐','南洋冰室','中華書局','美都餐室',
    '九龍旅館','香港照相','華興電器','德記海味','萬利洋服','新城戲院','翠華酒家','東方百貨'];
  const colors = ['#b64e35','#3b8175','#b39447','#466e86'];
  labels.forEach((text,i) => {
    const x = i % 4 * 256, y = Math.floor(i / 4) * 256;
    ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(x,y,256,256);
    ctx.strokeStyle = '#f1ddae'; ctx.lineWidth = 4; ctx.strokeRect(x+12,y+8,232,240);
    ctx.fillStyle = '#fff0ce'; ctx.font = 'bold 54px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if(wide){
      ctx.font='bold 46px "Microsoft YaHei",sans-serif';
      [...text].forEach((char,j)=>ctx.fillText(char,x+39+j*59,y+116));
      ctx.font='15px sans-serif';ctx.fillText('HONG KONG · SINCE '+(1952+i*3),x+128,y+164);
    }else [...text].forEach((char,j) => ctx.fillText(char,x+128,y+36+j*61));
  });
  const texture = new THREE.CanvasTexture(cv); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map:texture, roughness:.55, metalness:0 });
  const uniforms = { uNight:{value:0} }; mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 aStyle; varying float vSign;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvSign = mod(aStyle.y,16.0);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vSign; uniform float uNight;')
      .replace('#include <map_fragment>', 'vec2 atlasUv=(vMapUv+vec2(mod(vSign,4.0),3.0-floor(vSign/4.0)))/4.0; vec4 signColor=texture2D(map,atlasUv); diffuseColor*=signColor;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += signColor.rgb * uNight * 1.7;');
  };
  registry.push(mat); return mat;
}

/** 夜景强度联动：0 = 白天，1 = 午夜。 */
export function setCityNight(nightF) {
  for (const m of registry) {
    const u = m.userData.uniforms;
    if (u && u.uNight) u.uNight.value = nightF * (m.userData.night ?? 1.0);
    if (m.userData.envStrength) m.envMapIntensity = m.userData.envStrength * (1 - nightF * 0.92);
  }
}

export { FACADE_FAMILIES };
