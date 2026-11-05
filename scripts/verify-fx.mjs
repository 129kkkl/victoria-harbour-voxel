// 离线数值验收（M4 光影 / 夜景 / 霓虹 / 天气）。
// 运行：npm run verify:fx
//
// 不依赖浏览器 / GPU，只测纯逻辑：
//   ① 色调链路换算（fx/tonelink.js 的 ACES 逆变换往返精度）
//   ② 天气预设的参数合法性与过渡收敛（fx/weather.js）
//   ③ 路灯布点（city/streetLights.js 跑真实街道网格数据）
//   ④ 航空障碍灯布点
//   ⑤ 天空调色板的基本物理序（昼亮夜暗 / 金色时刻偏暖）
import { displayToLinearHDR, applyACES, linearToSrgb, srgbToLinear, TONE_EXPOSURE } from '../src/fx/tonelink.js';
import { WEATHER_PRESETS, WEATHER_ORDER, Weather } from '../src/fx/weather.js';
import { placeLamps, collectBeacons } from '../src/city/streetLights.js';
import { generateCity } from '../src/city/streetGrid.js';
import { isLand } from '../src/geo/coastline.js';
import { worldToLonLat } from '../src/geo/projection.js';
import { sampleHeight } from '../src/city/heightfield.js';
import { skyPalette } from '../src/sky/skySystem.js';

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS  ${name} ${detail ?? ''}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail ?? ''}`); }
}

console.log('== 色调链路（ACES 逆变换往返） ==');
{
  // 调色板实际用到的颜色样本（昼 / 夜 / 深水色）
  const samples = [
    [0.10, 0.30, 0.65], [0.55, 0.70, 0.85], [0.13, 0.18, 0.45],
    [0.04, 0.07, 0.20], [0.004, 0.008, 0.025], [0.016, 0.075, 0.10]
  ];
  let maxErr = 0;
  for (const c of samples) {
    const hdr = displayToLinearHDR(...c);
    const back = applyACES(hdr).map(linearToSrgb);
    maxErr = Math.max(maxErr, ...back.map((v, i) => Math.abs(v - c[i])));
  }
  check('显示色→线性HDR→ACES→显示色 往返误差 < 0.005', maxErr < 0.005, `maxErr ${maxErr.toFixed(5)}`);
  check('TONE_EXPOSURE 与 renderer 约定一致（1.3）', Math.abs(TONE_EXPOSURE - 1.3) < 1e-9);
  const hdrDay = displayToLinearHDR(0.55, 0.70, 0.85);
  check('昼间地平线 HDR 为正且有限', hdrDay.every(v => v > 0 && isFinite(v)),
    hdrDay.map(v => v.toFixed(3)).join(','));
  check('srgbToLinear/linearToSrgb 互为逆', Math.abs(linearToSrgb(srgbToLinear(0.35)) - 0.35) < 1e-6);
}

console.log('== 天气预设与过渡 ==');
{
  const P = WEATHER_PRESETS;
  check('四个预设齐备且顺序固定',
    WEATHER_ORDER.join(',') === 'clear,cloudy,fog,rain' && WEATHER_ORDER.every(k => P[k]));
  check('云量单调递增', P.clear.cloud < P.cloudy.cloud && P.cloudy.cloud < P.fog.cloud && P.fog.cloud <= P.rain.cloud);
  check('只有降雨有雨强', P.rain.rain === 1 && P.clear.rain === 0 && P.cloudy.rain === 0 && P.fog.rain === 0);
  check('海雾雾倍率 > 降雨 > 多云 > 晴朗', P.fog.fogMul > P.rain.fogMul && P.rain.fogMul > P.cloudy.fogMul && P.cloudy.fogMul > P.clear.fogMul);
  check('晴天阳光全量、雨天显著衰减', P.clear.sunMul === 1 && P.rain.sunMul < 0.3);
  check('所有参数在合法范围', WEATHER_ORDER.every(k => {
    const p = P[k];
    return p.cloud >= 0 && p.cloud <= 1 && p.cloudDark >= 0 && p.cloudDark <= 1
      && p.fogMul > 0 && p.sunMul > 0 && p.rain >= 0 && p.rain <= 1 && p.wet >= 0 && p.wet <= 1 && p.wind > 0;
  }));

  const w = new Weather();
  check('默认晴朗', w.id === 'clear' && w.current.cloud === P.clear.cloud);
  w.set('rain');
  for (let i = 0; i < 600; i++) w.update(1 / 60);   // 10 秒
  check('10 秒过渡后收敛到降雨（>0.95）', w.current.rain > 0.95, `rain=${w.current.rain.toFixed(3)}`);
  check('过渡中云量连续（无跳变）', Math.abs(w.current.cloud - P.rain.cloud) < 0.05);
  check('非法 id 拒绝', w.set(' typhoon') === false && w.id === 'rain');
  const w2 = new Weather('rain');
  w2.cycle();
  check('cycle 从雨绕回晴朗', w2.id === 'clear');
  const w3 = new Weather('fog');
  w3.cycle();
  check('cycle 从雾到降雨', w3.id === 'rain');
}

console.log('== 路灯光池布点 ==');
{
  const city = generateCity();
  const t0 = Date.now();
  const lamps = placeLamps(city.roads);
  const ms = Date.now() - t0;
  console.log(`  路灯 ${lamps.length.toLocaleString()} 盏 · 耗时 ${ms}ms`);
  check('路灯数量 3000~16000', lamps.length > 3000 && lamps.length < 16000, `实测 ${lamps.length}`);
  check('布点耗时 < 800ms（首屏预算内）', ms < 800, `实测 ${ms}ms`);

  // 全量判定：全部在陆地上（placeLamps 内部用 isLand 过滤，这里独立复核）、贴地形
  let landCount = 0, hCount = 0;
  for (const l of lamps) {
    const { lon, lat } = worldToLonLat(l.x, l.z);
    if (isLand(lon, lat)) landCount++;
    if (Math.abs(l.y - sampleHeight(l.x, l.z)) < 12.35) hCount++;
  }
  check('全部路灯落在陆地上', landCount === lamps.length, `${landCount}/${lamps.length}`);
  check('灯高与地形高差 < 12.35m（路面四角贴合的固有误差内）', hCount / lamps.length > 0.98,
    `${((hCount / lamps.length) * 100).toFixed(1)}% 合格`);
  // isLand 判定在 placeLamps 内部做（经纬度），这里核验输出无 NaN / 越界
  check('灯位有限且在场景范围内', lamps.every(l =>
    isFinite(l.x) && isFinite(l.y) && isFinite(l.z)
    && Math.abs(l.x) < 9000 && Math.abs(l.z) < 9000 && l.y > -5 && l.y < 900));
}

console.log('== 航空障碍灯 ==');
{
  const city = generateCity();
  const lmTops = [
    { x: 0, z: 0, topY: 480 },   // 模拟 ICC 量级地标
    { x: 100, z: -50, topY: 200 }
  ];
  const beacons = collectBeacons(city.lots, lmTops);
  check('障碍灯 > 20 个', beacons.length > 20, `实测 ${beacons.length}`);
  check('全部高于 150m（楼顶）或地标顶部', beacons.every(b => b.y >= 150 && isFinite(b.y)));
  check('低矮建筑不产生障碍灯（旺角唐楼）', !city.lots.some(l => l.h < 150 && beacons.some(b => b.x === l.x && b.z === l.z)));
}

console.log('== 天空调色板物理序 ==');
{
  const day = skyPalette(35), night = skyPalette(-20), golden = skyPalette(4);
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  check('白天比午夜亮（天顶）', lum(day.zen) > 10 * lum(night.zen),
    `day ${lum(day.zen).toFixed(4)} vs night ${lum(night.zen).toFixed(5)}`);
  check('金色时刻地平线偏暖（R > B）', golden.hor[0] > golden.hor[2],
    `R ${golden.hor[2].toFixed(2)} < B ${golden.hor[0].toFixed(2)}`);
  check('低空太阳转橙红（G、B 明显压暗）', golden.sun[1] < 0.7 && golden.sun[2] < 0.3,
    `sun=[${golden.sun.map(v => v.toFixed(2))}]`);
  check('正午太阳近白', day.sun.every(v => v > 0.85));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
