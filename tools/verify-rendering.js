// Browser/GPU regression. In the development preview console:
// const { verifyRendering } = await import('/tools/verify-rendering.js');
// await verifyRendering(window.__vh);
import * as THREE from 'three';

function countNonFinite(values) {
  // IEEE 754 binary16: an all-one exponent represents NaN or infinity.
  let count = 0;
  for (const value of values) if ((value & 0x7c00) === 0x7c00) count++;
  return count;
}

export function checkWakeShader(renderer, source, negativeControl = false) {
  const material = source.clone();
  if (negativeControl) {
    // Deliberately reintroduce the original domain error. This must fail on
    // the affected GPU, proving the fixture detects more than compile errors.
    material.fragmentShader = material.fragmentShader.replace(
      'vec2 wakeUv = clamp(vUv, vec2(0.0), vec2(1.0));', 'vec2 wakeUv = vUv;').replace(
      'clamp(trail * (0.16 + foam * 0.18), 0.0, 1.0)', 'trail * (0.16 + foam * 0.18)');
  }
  material.transparent = false;
  material.blending = THREE.NoBlending;
  const geometry = new THREE.PlaneGeometry(2, 2);
  const uv = geometry.attributes.uv;
  // Force the extrapolated range that occurs at subpixel MSAA boundaries.
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.5 - .25, uv.getY(i) * 1.5 - .25);
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geometry, material));
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10);
  camera.position.z = 2;
  const target = new THREE.WebGLRenderTarget(64, 64, { type: THREE.HalfFloatType });
  const pixels = new Uint16Array(64 * 64 * 4);
  const previous = renderer.getRenderTarget();
  try {
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, 64, 64, pixels);
    const nonFinite = countNonFinite(pixels);
    let invalidAlpha = 0, visible = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      const alpha = THREE.DataUtils.fromHalfFloat(pixels[i]);
      if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) invalidAlpha++;
      if (alpha > .01 && alpha <= 1) visible++;
    }
    const glError = renderer.getContext().getError();
    return { pass: nonFinite === 0 && invalidAlpha === 0 && visible > 0 && glError === 0,
      nonFinite, invalidAlpha, visible, glError };
  } finally {
    renderer.setRenderTarget(previous);
    geometry.dispose(); material.dispose(); target.dispose();
  }
}

export async function verifyRendering(v) {
  const c = v.post.composer;
  let wake;
  v.ferries.group.traverse(o => { if (o.material?.isShaderMaterial) wake = o.material; });
  if (!wake) throw new Error('No ferry wake material to test');
  const result = { wake: checkWakeShader(v.renderer, wake), cases: [] };
  const saved = { render:v.post.render, hours:v.timeState.hours, playing:v.timeState.playing,
    quality:v.quality, weather:v.weather.id, view:v.orbit.activeView, tour:v.orbit.touring,
    camera:v.camera.position.clone(), target:v.orbit.controls.target.clone() };
  const cases = [
    { view:'harbour', quality:'balanced', hours:16.6, weather:'clear', frames:48 },
    { view:'aerial', quality:'high', hours:16.6, weather:'clear', frames:48 },
    { view:'central', quality:'balanced', hours:12.5, weather:'clear', frames:24 },
    { view:'oldtown', quality:'low', hours:12.5, weather:'clear', frames:24 },
    { view:'harbour', quality:'balanced', hours:21, weather:'clear', frames:32 },
    { view:'aerial', quality:'high', hours:12.5, weather:'rain', frames:32 }
  ];
  // Keep the real update loop alive, but render manually after assigning each
  // deterministic ferry position. Scan the actual HDR and bloom GPU buffers.
  v.post.render = () => {};
  v.timeState.playing = false;
  v.orbit.setTour(false);
  try {
    for (const test of cases) {
      v.orbit.setView(test.view, true);
      v.setQuality(test.quality);
      v.timeState.hours = test.hours;
      v.weather.set(test.weather, true);
      const targets = [c.renderTarget1, c.renderTarget2, c.passes[1].renderTargetBright,
        ...c.passes[1].renderTargetsHorizontal, ...c.passes[1].renderTargetsVertical];
      const arrays = targets.map(r => new Uint16Array(r.width * r.height * 4));
      let badFrames = 0, maxNonFinite = 0, glErrors = 0;
      for (let frame = 0; frame < test.frames; frame++) {
        await new Promise(requestAnimationFrame);
        // Cover a complete route, not only a few seconds near one position.
        v.ferries.update((frame + .317) / test.frames * 625, v.sky.nightF);
        v.post.update(v.sky.nightF, 1);
        saved.render();
        let bad = 0;
        for (let i = 0; i < targets.length; i++) {
          const r = targets[i];
          v.renderer.readRenderTargetPixels(r, 0, 0, r.width, r.height, arrays[i]);
          bad += countNonFinite(arrays[i]);
        }
        if (bad) badFrames++;
        maxNonFinite = Math.max(maxNonFinite, bad);
        if (v.renderer.getContext().getError() !== 0) glErrors++;
      }
      result.cases.push({ ...test, badFrames, maxNonFinite, glErrors,
        pass:badFrames === 0 && glErrors === 0 });
    }
  } finally {
    v.post.render = saved.render;
    v.timeState.hours = saved.hours; v.timeState.playing = saved.playing;
    v.weather.set(saved.weather, true); v.setQuality(saved.quality);
    v.orbit.setView(saved.view, true);
    v.camera.position.copy(saved.camera); v.orbit.controls.target.copy(saved.target);
    v.orbit.controls.update(); v.orbit.setTour(saved.tour);
  }
  result.pass = result.wake.pass && result.cases.every(c => c.pass);
  return result;
}
