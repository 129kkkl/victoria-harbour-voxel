// 后期链（M4）：EffectComposer = RenderPass → UnrealBloomPass → OutputPass。
//
// 这是全场景色调链路的"收口"：
//   · three r160 渲染到 RenderTarget 时不在材质里做色调映射 / 色彩空间转换，
//     所以 RenderPass 产出的是**线性 HDR**（HalfFloat + MSAA×4）；
//   · UnrealBloomPass 在 HDR 上做阈值泛光 —— 霓虹 / 窗光 / 日照水面高光
//     这些 >1 的自发光才会晕开，白天的混凝土立面不会糊；
//   · OutputPass 最后统一 ACESFilmic + sRGB（读 renderer 的对应设置）。
//
// 天空 / 海面两条自定义 ShaderMaterial 因此不必自己 include tonemapping chunk，
// 只要输出线性 HDR 即可（见 fx/tonelink.js 的调色板换算）。
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export function createPostFX(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const pr = renderer.getPixelRatio();

  const rt = new THREE.WebGLRenderTarget(
    Math.round(size.x * pr), Math.round(size.y * pr),
    { type: THREE.HalfFloatType, samples: 2 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(pr);
  composer.setSize(size.x, size.y);

  composer.addPass(new RenderPass(scene, camera));

  // 泛光阈值 1.0：只有 HDR 超白（自发光窗 / 霓虹 / 日照高光）参与。
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.18, 0.55, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  window.addEventListener('resize', () => {
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  let strength = 0.18;
  return {
    composer,
    setQuality(level) {
      bloom.enabled = level !== 'low';
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(window.innerWidth, window.innerHeight);
    },
    /** 夜间增强泛光；dt 平滑避免时间跳变时闪烁。 */
    update(nightF, dt = 0.016) {
      const target = 0.15 + 0.60 * nightF;
      strength += (target - strength) * Math.min(1, dt * 4);
      bloom.strength = strength;
    },
    render() { composer.render(); }
  };
}
