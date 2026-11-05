// 降雨（M4）：GPU 驱动的实例化雨丝。
//
// 一滴雨 = 一根细长的竖直 quad：宽度轴始终朝相机（绕 Y 轴广告牌），
// 高度轴沿下落方向按风速倾斜。下落 / 回收全在 vertex shader 里用
// fract(相位 + t·速度) 循环，CPU 每帧只喂 4 个 uniform。
//
// 雨柱以相机目标为中心（半径 uRadius、高 uHeight）：上帝视角下是一块
// 随镜头移动的降雨区。街景级（M5）需要更密的近场雨时再加密。
import * as THREE from 'three';

const RAIN_VERT = /* glsl */`
  attribute vec4 aSeed;    // x,z: 柱内水平分布 0..1；y: 下落相位；w: 速度因子
  uniform float uTime;
  uniform vec3 uCenter;    // 雨柱中心（相机目标，地面）
  uniform float uRadius;
  uniform float uHeight;
  uniform vec2 uSlant;     // 整根雨丝的风斜位移
  uniform vec3 uCamRight;  // 相机右向量（Y 轴广告牌）
  varying float vFade;
  void main() {
    float fall = fract(aSeed.y + uTime * (0.55 + aSeed.w * 0.35) * (9.0 / uHeight));
    vec2 base = uCenter.xz + (aSeed.xz * 2.0 - 1.0) * uRadius + uSlant * fall;
    float y = uCenter.y + uHeight * (1.0 - fall);
    // 雨丝：宽度轴朝相机（PlaneGeometry x∈[-0.0225,0.0225]），
    // 长度轴竖直 + 风斜（position.y∈[-0.5,0.5]，0.9m 长，倾斜随风力）
    vec2 lean = uSlant * 0.12;
    vec3 wp = vec3(base.x, y, base.y)
      + uCamRight * position.x
      + vec3(lean.x, 0.9, lean.y) * position.y;
    vFade = smoothstep(0.0, 0.08, fall) * (1.0 - smoothstep(0.90, 1.0, fall));
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }
`;

const RAIN_FRAG = /* glsl */`
  precision mediump float;
  uniform float uIntensity;
  varying float vFade;
  void main() {
    gl_FragColor = vec4(vec3(0.42, 0.50, 0.60), 0.34 * vFade * uIntensity);
  }
`;

export function createRain(count = 2400) {
  const base = new THREE.PlaneGeometry(0.045, 1);

  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.attributes.position = base.attributes.position;
  geo.attributes.uv = base.attributes.uv;

  const seeds = new Float32Array(count * 4);
  let s = 20261010;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = 0; i < count; i++) {
    seeds[i * 4] = rnd();
    seeds[i * 4 + 1] = rnd();
    seeds[i * 4 + 2] = rnd();
    seeds[i * 4 + 3] = rnd();
  }
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  geo.instanceCount = count;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6); // 永不剔除（位置在 shader 里算）

  const uniforms = {
    uTime: { value: 0 },
    uCenter: { value: new THREE.Vector3() },
    uRadius: { value: 90 },
    uHeight: { value: 55 },
    uSlant: { value: new THREE.Vector2(2.2, 1.1) },
    uCamRight: { value: new THREE.Vector3(1, 0, 0) },
    uIntensity: { value: 0 }
  };

  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms,
    vertexShader: RAIN_VERT,
    fragmentShader: RAIN_FRAG,
    transparent: true,
    depthWrite: false,
    fog: false
  }));
  mesh.frustumCulled = false;
  mesh.renderOrder = 20;
  mesh.visible = false;

  const _right = new THREE.Vector3();
  return {
    mesh,
    /**
     * @param {number} t      秒级时间
     * @param {THREE.Camera} camera
     * @param {THREE.Vector3} target  相机目标（雨柱锚点）
     * @param {number} rain   降雨强度 0..1
     * @param {number} wind   风速倍率
     */
    update(t, camera, target, rain, wind) {
      uniforms.uTime.value = t;
      uniforms.uIntensity.value = rain;
      mesh.visible = rain > 0.02;
      if (!mesh.visible) return;
      uniforms.uCenter.value.set(target.x, Math.max(target.y, 2), target.z);
      _right.setFromMatrixColumn(camera.matrixWorld, 0);
      _right.y = 0;
      _right.normalize();
      uniforms.uCamRight.value.copy(_right);
      uniforms.uSlant.value.set(2.2 * wind, 1.1 * wind);
    }
  };
}
