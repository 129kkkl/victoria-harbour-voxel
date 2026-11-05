// M3 截图：puppeteer-core 驱动 Edge headless，跑真实 WebGL2 渲染后出图。
//
//   node tools/shoot.mjs                 全部机位
//   node tools/shoot.mjs M3A M3C         只出指定几张
//   node tools/shoot.mjs --url http://localhost:5173
//
// 需要先起一个静态服务（npm run build && npm run preview，或 npm run dev）。
// 机位用 经纬度 + 距离 + 方位角 + 仰角 描述，便于和 docs 里的构图说明对照。

import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const OUT = resolve(ROOT, 'docs/shots');

const argv = process.argv.slice(2);
const urlArg = argv.indexOf('--url');
const URL_ = urlArg >= 0 ? argv[urlArg + 1] : 'http://localhost:4173';
const only = argv.filter((a, i) => !a.startsWith('--') && !(urlArg >= 0 && i === urlArg + 1));

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

// 方位角 az：0 = 机位在目标正南（+Z）向北望，180 = 机位在正北向南望。
// 仰角 el：0 = 水平，90 = 正俯。
const SHOTS = [
  {
    name: 'M3A_skyline_day', target: [114.1600, 22.2815, 150], dist: 1180, az: 162, el: 9,
    date: '2026-06-22', hour: 10.4, note: '尖沙咀东望港岛天际线 · 白天'
  },
  {
    name: 'M3B_skyline_night', target: [114.1600, 22.2815, 150], dist: 1180, az: 162, el: 9,
    date: '2026-06-22', hour: 21.0, note: '同机位 · 午夜窗光'
  },
  {
    name: 'M3C_central', target: [114.1602, 22.2818, 175], dist: 760, az: 173, el: 11,
    date: '2026-06-22', hour: 17.4, note: '中环近景：IFC 双塔 / 汇丰 / 中银 · 金色时刻'
  },
  {
    name: 'M3D_wanchai', target: [114.1722, 22.2806, 130], dist: 900, az: 168, el: 11,
    date: '2026-06-22', hour: 11.2, note: '湾仔：中环广场 / 会展海鸥顶'
  },
  {
    name: 'M3E_westkowloon', target: [114.1565, 22.3032, 160], dist: 1050, az: 16, el: 12,
    date: '2026-06-22', hour: 9.6, note: '西九龙：ICC / M+ / 西九龙站'
  },
  {
    name: 'M3F_tst', target: [114.1708, 22.2951, 32], dist: 360, az: 12, el: 7,
    date: '2026-06-22', hour: 17.6, note: '尖沙咀海滨：钟楼 / 文化中心 / 半岛酒店 / 星光大道'
  },
  {
    name: 'M3G_mongkok', target: [114.1692, 22.3072, 110], dist: 820, az: 6, el: 14,
    date: '2026-06-22', hour: 15.2, note: '旺角 / 油麻地：恒隆广场 / 朗豪坊 / 庙街霓虹区'
  },
  {
    name: 'M3H_peak', target: [114.1625, 22.2905, 180], dist: 2600, az: 172, el: 27,
    date: '2026-06-22', hour: 12.2, note: '高位俯瞰维港全貌'
  },
  {
    name: 'M3I_kaitak', target: [114.1985, 22.3142, 40], dist: 900, az: 250, el: 11,
    date: '2026-06-22', hour: 16.2, note: '启德邮轮码头 / 红馆'
  },
  // ---- M4 光影 / 夜景 / 霓虹 / 天气 ----
  {
    name: 'M4A_neon_mongkok', target: [114.1750, 22.3072, 8], dist: 240, az: 284, el: 4,
    date: '2026-06-22', hour: 21.4, weather: 'clear', note: 'M4 庙街夜市平视：霓虹招牌 + 路灯光池'
  },
  {
    name: 'M4B_skyline_night', target: [114.1600, 22.2815, 150], dist: 1180, az: 162, el: 9,
    date: '2026-06-22', hour: 21.0, weather: 'clear', note: 'M4 同 M3B 机位 · 泛光夜景'
  },
  {
    name: 'M4C_rain', target: [114.1625, 22.2905, 180], dist: 2600, az: 172, el: 27,
    date: '2026-06-22', hour: 15.0, weather: 'rain', note: 'M4 午后降雨：雨云 + 雨丝 + 湿街'
  },
  {
    name: 'M4D_fog', target: [114.1708, 22.2951, 32], dist: 520, az: 12, el: 6,
    date: '2026-06-22', hour: 8.5, weather: 'fog', note: 'M4 清晨海雾：尖沙咀海滨低能见度'
  },
  {
    name: 'M4E_sunset_cloudy', target: [114.1600, 22.2815, 150], dist: 1180, az: 162, el: 9,
    date: '2026-06-22', hour: 18.5, weather: 'cloudy', note: 'M4 多云日落：云层受光'
  },
  {
    name: 'M4F_temple_canyon', target: [114.1755, 22.3072, 10], dist: 150, az: 282, el: 3,
    date: '2026-06-22', hour: 21.6, weather: 'clear', note: 'M4 庙街街谷内平视：两侧霓虹'
  }
];

const CSS_HIDE_UI = `
  body > *:not(#app) { display: none !important; }
  #app > *:not(canvas) { display: none !important; }
`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const list = only.length ? SHOTS.filter(s => only.includes(s.name)) : SHOTS;
  if (!list.length) { console.error('没有匹配的机位'); process.exit(1); }

  console.log(`目标 ${URL_}`);
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--window-size=1920,1080',
      '--force-device-scale-factor=1'
    ],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 }
  });

  const page = await browser.newPage();
  page.on('pageerror', e => console.log(`  [页面异常] ${e.message}`));
  page.on('console', m => {
    const t = m.text();
    if (/error|fail|warn/i.test(t)) console.log(`  [console] ${t.slice(0, 200)}`);
  });

  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // 等到调试钩子就绪（= 城市 / 地标 / 海面全部建完）
  await page.waitForFunction('window.__vh && window.__vh.city', { timeout: 120000 });
  await page.addStyleTag({ content: CSS_HIDE_UI });

  const stats = await page.evaluate(() => {
    const s = window.__vh.stats;
    return {
      landmarks: s.landmarks, landmarkParts: s.landmarkParts,
      landmarkTriangles: s.landmarkTriangles, landmarkMeshes: s.landmarkMeshes,
      boxes: s.boxes, triangles: s.triangles, tallest: s.landmarkTallest
    };
  });
  console.log(`  场景就绪：地标 ${stats.landmarks} 座 · 地标原语 ${stats.landmarkParts} · ` +
    `地标三角面 ${stats.landmarkTriangles.toLocaleString()} · 地标网格 ${stats.landmarkMeshes} 个`);
  console.log(`  城市体量 ${stats.boxes.toLocaleString()} 盒 · 总三角面 ${stats.triangles?.toLocaleString?.() ?? '?'} · 最高地标 ${stats.tallest}`);

  for (const s of list) {
    await page.evaluate((shot) => {
      const vh = window.__vh;
      vh.timeState.playing = false;
      vh.timeState.dateStr = shot.date;
      vh.timeState.hours = shot.hour;
      if (shot.weather && vh.weather) vh.weather.set(shot.weather, true);

      const D = Math.PI / 180;
      const { x, z } = (() => {
        // 经纬度 → 世界（与 src/geo/projection.js 同一套参数）
        const LON0 = 114.159, LAT0 = 22.293;
        const mLat = 111132.954 - 559.822 * Math.cos(2 * LAT0 * D) + 1.175 * Math.cos(4 * LAT0 * D);
        const mLon = 111320 * Math.cos(LAT0 * D);
        return { x: (shot.target[0] - LON0) * mLon, z: (LAT0 - shot.target[1]) * mLat };
      })();

      const ty = shot.target[2];
      const el = shot.el * D, az = shot.az * D, d = shot.dist;
      const cam = new vh.THREE.Vector3(
        x + Math.sin(az) * Math.cos(el) * d,
        ty + Math.sin(el) * d,
        z + Math.cos(az) * Math.cos(el) * d
      );
      vh.camera.position.copy(cam);
      vh.orbit.controls.target.set(x, ty, z);
      vh.orbit.controls.update();
      vh.camera.lookAt(x, ty, z);
    }, s);

    // 让天空 / 海面 / 夜景因子跑几帧
    await page.evaluate(() => new Promise(r => {
      let n = 0;
      const step = () => (++n >= 8 ? r() : requestAnimationFrame(step));
      requestAnimationFrame(step);
    }));
    await new Promise(r => setTimeout(r, 700));

    const file = resolve(OUT, `${s.name}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 90 });
    console.log(`  ✓ ${s.name}.jpg  ${s.note}  (az ${s.az}° el ${s.el}° ${s.hour}h)`);
  }

  await browser.close();
  console.log(`\n完成，输出目录：${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
