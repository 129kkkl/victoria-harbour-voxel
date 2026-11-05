// 渲染器：WebGL2 + ACES Filmic + 软阴影 + 指数雾。
// 色调映射最终在 fx/postfx.js 的 OutputPass 里统一执行（M4 已挂载）：
// 场景渲进 HalfFloat RT 时 three 不做 tonemapping，全部线性 HDR 到最后一步。
import * as THREE from 'three';
import { TONE_EXPOSURE } from '../fx/tonelink.js';

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
  renderer.info.autoReset = false;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // M2 城市层加入后，大量立面只吃到 40%~50% 的直射光（多数朝向背光），
  // 1.0 曝光下整座城市会压成深灰。1.3 让背光立面仍然读得出材质。
  // 该值同时是 fx/tonelink.js 逆变换的曝光基准（单一来源 TONE_EXPOSURE）。
  renderer.toneMappingExposure = TONE_EXPOSURE;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', '维港三维场景：拖拽旋转，滚轮缩放，WASD 平移，数字 1 至 6 切换观景点');

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x8cb0cc, 0.000055);

  const camera = new THREE.PerspectiveCamera(
    55, window.innerWidth / window.innerHeight, 0.5, 30000);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera };
}
