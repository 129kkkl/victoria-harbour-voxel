// 启动编排：投影 → 岸线掩码 → 高度场地形（分帧构建）→ 海面 → 城市 → 天空 → 相机 → HUD。
import * as THREE from 'three';
import { createRenderer } from './core/renderer.js';
import { createEnvironment } from './core/environment.js';
import { startLoop } from './core/loop.js';
import { createPostFX } from './fx/postfx.js';
import { Weather, applyWetness, applyNightSpill } from './fx/weather.js';
import { createRain } from './fx/rain.js';
import { makeLandMaskCanvas } from './geo/coastline.js';
import { LANDMARKS } from './geo/landmarks.js';
import { lonLatToWorld } from './geo/projection.js';
import { buildTerrain, sampleHeight } from './city/heightfield.js';
import { placeLamps, collectBeacons, buildStreetLights, buildBeaconLights } from './city/streetLights.js';
import { createWater } from './water/harbour.js';
import { createFerries } from './water/ferries.js';
import { buildCity, updateCity } from './city/city.js';
import { SkySystem } from './sky/skySystem.js';
import { createOrbitCamera } from './camera/orbit.js';
import { createHUD } from './ui/hud.js';

const loadingEl = document.getElementById('loading');
const barEl = document.getElementById('loading-bar');
const stepEl = document.getElementById('loading-step');

function setProgress(f, text) {
  barEl.style.width = `${Math.round(f * 100)}%`;
  if (text) stepEl.textContent = text;
}

// 时间状态：HKT（UTC+8）
const now = new Date();
const hktNow = new Date(now.getTime() + (8 * 60 + now.getTimezoneOffset()) * 60000);
const timeState = {
  dateStr: `${hktNow.getFullYear()}-${String(hktNow.getMonth() + 1).padStart(2, '0')}-${String(hktNow.getDate()).padStart(2, '0')}`,
  hours: 16.6,
  playing: false,
  speed: 240 // 播放时 1 秒现实 = 240 秒场景（约 4 分钟一昼夜循环中的白天段）
};

function currentDate() {
  const [y, m, d] = timeState.dateStr.split('-').map(Number);
  // HKT → UTC
  return new Date(Date.UTC(y, m - 1, d) + (timeState.hours - 8) * 3600 * 1000);
}

async function boot() {
  const bootStarted = performance.now();
  const timings = {};
  setProgress(0.02, '初始化渲染器…');
  const container = document.getElementById('app');
  const { renderer, scene, camera } = createRenderer(container);
  const environment = createEnvironment(renderer);
  scene.environment = environment.texture;

  setProgress(0.05, '生成陆地掩码…');
  const landMask = makeLandMaskCanvas();

  setProgress(0.08, '构建地形高度场（太平山 / 狮子山 / 飞鹅山）…');
  const terrain = await buildTerrain(f => setProgress(0.08 + f * 0.42, '构建地形高度场…'));
  scene.add(terrain.group);
  timings.terrain = Math.round(performance.now() - bootStarted);

  const city = await buildCity((f, text) => setProgress(0.50 + f * 0.30, text));
  scene.add(city.group);
  timings.city = Math.round(performance.now() - bootStarted) - timings.terrain;
  // 调试开关：?nocity 隐藏城市层，?nolandmark 隐藏地标体量，?noprops 隐藏屋顶设备（验收 / 排查用）
  if (location.search.includes('nocity')) city.group.visible = false;
  if (location.search.includes('noprops')) {
    city.group.traverse(o => { if (o.name === 'city-roofprops') o.visible = false; });
  }

  setProgress(0.82, '布置夜景灯光（路灯 / 航空障碍灯）…');
  const lamps = placeLamps(city.data.roads);
  const lights = buildStreetLights(lamps);
  scene.add(lights.group);
  const lmTops = LANDMARKS.filter(l => l.h >= 140).map(l => {
    const { x, z } = lonLatToWorld(l.lon, l.lat);
    return { x, z, topY: Math.max(sampleHeight(x, z), 2.5) + l.h };
  });
  const beacons = buildBeaconLights(collectBeacons(city.data.lots, lmTops));
  scene.add(beacons.mesh);

  setProgress(0.86, '生成海面（Gerstner 波）…');
  const water = createWater(landMask);
  scene.add(water.mesh);
  const ferries = createFerries();
  scene.add(ferries.group);

  setProgress(0.90, '初始化天空与天文系统…');
  const sky = new SkySystem(scene);

  setProgress(0.94, '初始化相机与 HUD…');
  const orbit = createOrbitCamera(camera, renderer.domElement);
  const weather = new Weather();
  // 调试开关：?weather=rain / fog / cloudy（截图与排查用）
  const wMatch = location.search.match(/weather=(\w+)/);
  if (wMatch) weather.set(wMatch[1], true);
  const post = createPostFX(renderer, scene, camera);
  let quality = 'balanced';
  const setQuality = level => {
    quality = level;
    const ratio = {low:1, balanced:1.25, high:1.75}[level] ?? 1.25;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, ratio));
    renderer.shadowMap.enabled = level !== 'low';
    const size = level === 'high' ? 4096 : 2048;
    if (sky.sunLight.shadow.mapSize.x !== size) {
      sky.sunLight.shadow.mapSize.set(size,size);
      sky.sunLight.shadow.map?.dispose(); sky.sunLight.shadow.map = null;
    }
    post.setQuality(level);
  };
  setQuality('balanced');
  const hud = createHUD({ timeState, onTimeChange: () => {}, cityStats: city.stats, weather, orbit,
    onQuality: setQuality,
    onScreenshot: () => new Promise((resolve,reject) => {
      post.render();
      renderer.domElement.toBlob(blob => {
        if (!blob) { reject(new Error('截图编码失败')); return; }
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob); link.download = `victoria-harbour-${orbit.activeView}-${timeState.dateStr}.png`;
        link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 5000); resolve();
      }, 'image/png');
    })
  });
  const rain = createRain();
  scene.add(rain.mesh);
  // 湿路面作用的共享材质（车道 / 人行道）
  const wetMats = [];
  city.group.traverse(o => {
    if ((o.name === 'city-roads' || o.name === 'city-pavements') && o.material) wetMats.push(o.material);
  });

  // Details are spatially batched; update their visibility four times per second.
  let detailClock = 1;
  orbit.onChange(() => { detailClock = 1; });

  setProgress(1, '完成');
  loadingEl.classList.add('done');
  loadingEl.setAttribute('aria-hidden','true');
  setTimeout(() => { loadingEl.hidden = true; }, 650);

  startLoop((dt, t, fps) => {
    renderer.info.reset();
    if (timeState.playing) {
      timeState.hours = (timeState.hours + dt * timeState.speed / 3600) % 24;
      const slider = document.querySelector('#vh-time');
      if (slider) slider.value = timeState.hours;
    }

    const date = currentDate();
    orbit.update(dt);
    const wx = weather.update(dt);
    const sunInfo = sky.update(date, orbit.controls.target, wx, t);
    terrain.setNight(sunInfo.nightF);
    ferries.update(t, sunInfo.nightF);
    water.update(t, sunInfo, scene.fog, wx);
    updateCity(sunInfo);
    applyWetness(wetMats, wx.wet);
    applyNightSpill(wetMats, sunInfo.nightF);
    lights.update(sunInfo.nightF, wx.wet);
    beacons.update(t, sunInfo.nightF);
    rain.update(t, camera, orbit.controls.target, wx.rain, wx.wind);

    detailClock += dt;
    if (detailClock > .25) {
      detailClock = 0;
      const distance = quality === 'high' ? 2800 : quality === 'low' ? 1050 : 1900;
      for (const chunk of city.detailChunks) {
        const p = chunk.userData.center;
        chunk.visible = Math.hypot(camera.position.x - p.x, camera.position.z - p.z) < distance;
      }
    }

    hud.update({ fps, camera, sunInfo, date });
    post.update(sunInfo.nightF, dt);
    post.render();
  });

  // 调试钩子（验收 / 排查用）
  window.__vh = {
    sampleHeight, timeState, currentDate, scene, camera, orbit, renderer, THREE,
    city, landmarks: city.landmarks, stats: city.stats,
    water, sky, terrain, post, weather, rain, lights, beacons, ferries, setQuality,
    get quality() { return quality; },
    timings: { ...timings, boot: Math.round(performance.now() - bootStarted) }
  };
}

boot().catch(err => {
  stepEl.textContent = `加载失败：${err.message}`;
  console.error(err);
});
