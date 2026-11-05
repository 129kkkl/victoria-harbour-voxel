// 一次性诊断：海面为什么发白？
// 做法：把场景渲到一张 32×18 的离屏 RenderTarget，读回像素网格，
// 再逐项替换 uDeep / 太阳方向 / 天空反射色，看哪些像素跟着变 —— 从而定位主导项。
import puppeteer from 'puppeteer-core';

const URL_ = process.argv[2] || 'http://localhost:4173';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const browser = await puppeteer.launch({
  executablePath: EDGE, headless: 'new',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
    '--window-size=1280,720', '--hide-scrollbars']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction('window.__vh && window.__vh.water && window.__vh.renderer', { timeout: 120000 });

// 把相机摆到 HOME 构图（尖沙咀东望中环），便于对照
await page.evaluate(() => {
  const vh = window.__vh;
  vh.camera.position.set(620, 300, -60);
  vh.orbit.controls.target.set(260, 120, 1020);
  vh.orbit.controls.update();
});

const grid = await page.evaluate(async () => {
  const vh = window.__vh;
  const { scene, camera, renderer, THREE, water } = vh;
  const W = 32, H = 18;

  const shot = () => {
    const rt = new THREE.WebGLRenderTarget(W, H);
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    const buf = new Uint8Array(W * H * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    renderer.setRenderTarget(prev);
    rt.dispose();
    const rows = [];
    for (let j = H - 1; j >= 0; j--) {
      const cells = [];
      for (let i = 0; i < W; i++) {
        const o = (j * W + i) * 4;
        cells.push(`${buf[o]},${buf[o + 1]},${buf[o + 2]}`);
      }
      rows.push(cells.join(' '));
    }
    return rows;
  };

  const mesh = water.mesh;
  const facts = {
    visible: mesh.visible,
    parent: mesh.parent ? (mesh.parent.name || mesh.parent.type) : null,
    side: mesh.material.side,
    frustumCulled: mesh.frustumCulled,
    boundingSphere: mesh.geometry.boundingSphere
      ? { c: mesh.geometry.boundingSphere.center.toArray(), r: mesh.geometry.boundingSphere.radius }
      : null,
    position: mesh.position.toArray(),
    renderOrder: mesh.renderOrder,
    depthWrite: mesh.material.depthWrite,
    transparent: mesh.material.transparent,
    cameraFar: camera.far, cameraNear: camera.near, cameraFov: camera.fov,
    vertexCount: mesh.geometry.attributes.position.count,
    indexCount: mesh.geometry.index ? mesh.geometry.index.count : 0,
    drawRange: mesh.geometry.drawRange
  };

  // 三角形计数：隐藏前后各渲一次
  const triCount = (visible) => {
    mesh.visible = visible;
    renderer.info.reset();
    renderer.render(scene, camera);
    return renderer.info.render.triangles;
  };
  facts.trisWaterOn = triCount(true);
  facts.trisWaterOff = triCount(false);
  mesh.visible = true;

  // 直接问射线：从相机穿过画面底部若干像素，看打到什么
  const ray = new THREE.Raycaster();
  const hits = [];
  for (const [nx, ny] of [[0, -0.95], [0, -0.7], [0, -0.4], [0, -0.1]]) {
    ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
    const hs = ray.intersectObjects(scene.children, true);
    hits.push({ ndc: [nx, ny], first: hs.length ? (hs[0].object.name || hs[0].object.type) : 'none',
      y: hs.length ? +hs[0].point.y.toFixed(1) : null, n: hs.length });
  }
  facts.rays = hits;

  const u = mesh.material.uniforms;
  const out = { facts };
  out.baseline = shot();

  // ① uDeep 染纯红
  u.uDeep.value.setRGB(1, 0, 0);
  out.deepRed = shot();
  u.uDeep.value.setRGB(0.016, 0.075, 0.10);

  // ② 天空反射染纯绿（uHorizon/uZenith）
  const hz = u.uHorizon.value.clone(), zn = u.uZenith.value.clone();
  u.uHorizon.value.setRGB(0, 1, 0); u.uZenith.value.setRGB(0, 1, 0);
  out.skyGreen = shot();
  u.uHorizon.value.copy(hz); u.uZenith.value.copy(zn);

  // ③ 雾染纯蓝
  const fc = u.uFogColor.value.clone();
  u.uFogColor.value.setRGB(0, 0, 1);
  out.fogBlue = shot();
  u.uFogColor.value.copy(fc);

  // ④ 隐藏水面，看剩下的那片到底是不是陆地
  mesh.visible = false;
  out.noWater = shot();
  mesh.visible = true;

  out.uniforms = {
    uSunDir: u.uSunDir.value.toArray(),
    uSunColor: u.uSunColor.value.toArray(),
    uDeep: u.uDeep.value.toArray(),
    uFogDensity: u.uFogDensity.value,
    camera: camera.position.toArray()
  };
  return out;
});

console.log('facts:', JSON.stringify(grid.facts, null, 1));
console.log('uniforms:', JSON.stringify(grid.uniforms));

const diff = (a, b) => {
  const A = a.split(' ').map(Number), B = b.split(' ').map(Number);
  let n = 0, max = 0;
  for (let i = 0; i < A.length; i += 3) {
    const d = Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
    if (d > 12) n++;
    if (d > max) max = d;
  }
  return { cells: n, max };
};

console.log('uniforms:', JSON.stringify(grid.uniforms));
console.log('\n与 baseline 差异（32×18 = 576 格）：');
for (const k of ['deepRed', 'skyGreen', 'fogBlue', 'noWater']) {
  let cells = 0, max = 0;
  for (let r = 0; r < grid.baseline.length; r++) {
    const d = diff(grid.baseline[r], grid[k][r]);
    cells += d.cells; if (d.max > max) max = d.max;
  }
  console.log(`  ${k.padEnd(10)} 变化格数 ${String(cells).padStart(4)}  最大变化 ${max}`);
}

console.log('\nbaseline 像素网格（行 0 = 画面顶部，每格 "r,g,b"）：');
grid.baseline.forEach((r, i) => console.log(`  ${String(i).padStart(2)} ${r}`));

console.log('\ndeepRed 像素网格：');
grid.deepRed.forEach((r, i) => console.log(`  ${String(i).padStart(2)} ${r}`));

await browser.close();
