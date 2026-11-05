import { WEATHER_PRESETS, WEATHER_ORDER } from '../fx/weather.js';
import { VIEWS } from '../camera/views.js';
import './hud.css';

const icon=(name)=>{
  const paths={
    waves:'<path d="M2 9c3-5 5 5 9 0s6 5 11 0M2 16c3-5 5 5 9 0s6 5 11 0"/>',
    play:'<path d="m9 5 10 7-10 7Z"/>',
    pause:'<path d="M9 5v14M16 5v14"/>',
    camera:'<path d="M3 7h5l2-3h5l2 3h4v13H3Z"/><circle cx="12" cy="13" r="4"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3v2M12 17h.01"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    arrow:'<path d="m6 9 6 6 6-6"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>'
  };
  return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[name]+'</svg>';
};
export const PRESETS=[
  {id:'sunrise',label:'晨曦',hours:7.15},
  {id:'noon',label:'日间',hours:12.5},
  {id:'golden',label:'金色时刻',hours:16.6},
  {id:'blue',label:'蓝调',hours:18.4},
  {id:'midnight',label:'夜港',hours:21}
];

export function createHUD({timeState,onTimeChange,cityStats,weather,orbit,onQuality,onScreenshot}) {
  const root=document.createElement('div');
  root.className='vh-ui';
  root.innerHTML=`
    <header class="vh-header">
      <div class="vh-brand"><span class="vh-mark">${icon('waves')}</span><div><h1>维多利亚港<span>城 市 图 景</span></h1><p>VICTORIA HARBOUR · AN URBAN PORTRAIT</p></div></div>
      <nav class="vh-toolbar" aria-label="场景工具">
        <label class="vh-quality"><span>画质</span><select id="vh-quality" aria-label="画质"><option value="balanced">均衡</option><option value="high">精细</option><option value="low">流畅</option></select></label>
        <button class="vh-tool" id="vh-tour" aria-label="开始巡游" aria-pressed="false">${icon('play')}<span>巡游</span></button>
        <button class="vh-tool" id="vh-capture" aria-label="保存场景截图">${icon('camera')}<span>截图</span></button>
        <button class="vh-tool vh-square" id="vh-help-toggle" aria-label="操作帮助" aria-expanded="false">${icon('help')}</button>
      </nav>
    </header>
    <nav class="vh-views" aria-label="观景点"><p class="vh-eyebrow">EXPLORE THE CITY <span>06</span></p>${VIEWS.map((v,i)=>`
      <button data-view="${v.id}" class="vh-view${i===0?' active':''}" aria-pressed="${i===0}"><span class="vh-view-index">0${i+1}</span><span><strong>${v.name}</strong><small>${v.en}</small></span><span class="vh-view-arrow">↗</span></button>`).join('')}
    </nav>
    <section class="vh-caption" aria-live="polite"><p id="vh-view-tag" class="vh-eyebrow"></p><h2 id="vh-view-title"></h2><p id="vh-view-description"></p><div class="vh-city-facts"><span><b>${cityStats.count.toLocaleString()}</b> 栋楼宇</span><span><b>${Object.keys(cityStats.byArchetype).length}</b> 种建筑语汇</span><span><b>${cityStats.landmarks}</b> 座地标</span></div></section>
    <section class="vh-environment${window.innerWidth<720?' collapsed':''}" aria-label="光照与天气">
      <button class="vh-env-heading" id="vh-env-toggle" aria-expanded="${window.innerWidth>=720}"><span>${icon('sun')} 光照与天气</span><span class="vh-live"><i></i><span id="vh-weather-name">晴朗</span> ${icon('arrow')}</span></button>
      <div class="vh-env-body">
        <div class="vh-clock-row"><div><strong id="vh-clock">16:36</strong><span>HONG KONG · UTC+8</span></div><button class="vh-round" id="vh-play" aria-label="播放昼夜循环" aria-pressed="false">${icon('play')}</button></div>
        <input id="vh-time" type="range" min="0" max="23.98" step="0.02" aria-label="场景时间" />
        <div class="vh-time-ticks"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
        <div class="vh-presets" aria-label="光照预设">${PRESETS.map(p=>`<button data-preset="${p.id}" aria-pressed="false">${p.label}</button>`).join('')}</div>
        <div class="vh-weather" aria-label="天气预设">${WEATHER_ORDER.map(id=>`<button data-weather="${id}" aria-pressed="${weather.id===id}">${WEATHER_PRESETS[id].label}</button>`).join('')}</div>
        <div class="vh-date-row"><label for="vh-date">场景日期</label><input id="vh-date" type="date" aria-label="场景日期" value="${timeState.dateStr}" /><button id="vh-realtime" title="同步香港当前日期和时间">此刻 ↗</button></div>
      </div>
    </section>
    <div class="vh-status"><span class="vh-status-dot"></span><span id="vh-status-text">拖拽旋转 · 滚轮探索</span><span id="vh-performance"></span></div>
    <section class="vh-help" hidden aria-label="操作说明"><div class="vh-help-title"><h2>自在探索</h2><button id="vh-help-close" aria-label="关闭操作帮助">${icon('close')}</button></div><p>拖动城市，或选择一个观景点。</p><dl><dt>左键拖拽 / 单指</dt><dd>环绕视角</dd><dt>右键拖拽 / 双指</dt><dd>平移视角</dd><dt>滚轮 / 双指缩放</dt><dd>靠近或远离</dd><dt>W A S D · Q E</dt><dd>平移 · 升降</dd><dt>1 – 6</dt><dd>切换观景点</dd><dt>F · C · H</dt><dd>回全景 · 天气 · 帮助</dd></dl><p class="vh-help-note">程序化城市图景 · 地标与地理为示意模型</p></section>
    <div class="vh-toast" role="status" hidden></div>`;
  document.body.append(root);
  const $=s=>root.querySelector(s), $$=s=>[...root.querySelectorAll(s)];
  const slider=$('#vh-time'), clock=$('#vh-clock'), dateInput=$('#vh-date'), play=$('#vh-play');
  const syncTime=()=>{
    const h=Math.floor(timeState.hours),m=Math.floor((timeState.hours-h)*60);
    const stamp=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
    clock.textContent=stamp;slider.value=timeState.hours;slider.setAttribute('aria-valuetext',stamp);
    dateInput.value=timeState.dateStr;
    $$('[data-preset]').forEach(b=>{const active=Math.abs(PRESETS.find(p=>p.id===b.dataset.preset).hours-timeState.hours)<.08;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
    play.innerHTML=icon(timeState.playing?'pause':'play');play.setAttribute('aria-pressed',timeState.playing);play.setAttribute('aria-label',timeState.playing?'暂停昼夜循环':'播放昼夜循环');
  };
  dateInput.addEventListener('change',()=>{if(!dateInput.value){dateInput.value=timeState.dateStr;return;}timeState.dateStr=dateInput.value;onTimeChange();});
  slider.addEventListener('input',()=>{timeState.hours=Number(slider.value);onTimeChange();syncTime();});
  play.addEventListener('click',()=>{timeState.playing=!timeState.playing;syncTime();});
  $$('[data-preset]').forEach(b=>b.addEventListener('click',()=>{timeState.hours=PRESETS.find(p=>p.id===b.dataset.preset).hours;timeState.playing=false;onTimeChange();syncTime();}));
  $('#vh-realtime').addEventListener('click',()=>{
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
    const p=Object.fromEntries(parts.map(v=>[v.type,v.value]));timeState.dateStr=p.year+'-'+p.month+'-'+p.day;timeState.hours=Number(p.hour)+Number(p.minute)/60;timeState.playing=false;syncTime();onTimeChange();
  });
  const syncWeather=()=>{$$('[data-weather]').forEach(b=>{const active=b.dataset.weather===weather.id;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});$('#vh-weather-name').textContent=weather.label;};
  $$('[data-weather]').forEach(b=>b.addEventListener('click',()=>{weather.set(b.dataset.weather);syncWeather();}));
  const syncView=({activeView,touring})=>{
    const view=VIEWS.find(v=>v.id===activeView);
    $('#vh-view-tag').textContent=view.tag;$('#vh-view-title').textContent=view.name;$('#vh-view-description').textContent=view.description;
    $$('[data-view]').forEach(b=>{const active=b.dataset.view===activeView;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
    $('#vh-tour').innerHTML=icon(touring?'pause':'play')+'<span>'+(touring?'暂停':'巡游')+'</span>';$('#vh-tour').classList.toggle('active',touring);
    $('#vh-tour').setAttribute('aria-label',touring?'暂停巡游':'开始巡游');$('#vh-tour').setAttribute('aria-pressed',touring);
    $('#vh-status-text').textContent=touring?'巡游中 · 拖动画面即可接管':'拖拽旋转 · 滚轮探索';
  };
  $$('[data-view]').forEach(b=>b.addEventListener('click',()=>orbit.setView(b.dataset.view)));
  $('#vh-tour').addEventListener('click',()=>orbit.setTour(!orbit.touring));
  orbit.onChange(syncView);syncView({activeView:orbit.activeView,touring:false});
  const help=$('.vh-help');
  const showHelp=value=>{help.hidden=!value;$('#vh-help-toggle').setAttribute('aria-expanded',value);if(value)$('#vh-help-close').focus();else $('#vh-help-toggle').focus();};
  $('#vh-help-toggle').addEventListener('click',()=>showHelp(help.hidden));
  $('#vh-help-close').addEventListener('click',()=>showHelp(false));
  $('#vh-env-toggle').addEventListener('click',()=>{const collapsed=$('.vh-environment').classList.toggle('collapsed');$('#vh-env-toggle').setAttribute('aria-expanded',!collapsed);});
  $('#vh-quality').addEventListener('change',e=>onQuality(e.target.value));
  let toastTimer;
  const toast=message=>{const t=$('.vh-toast');t.textContent=message;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{t.hidden=true;},3200);};
  $('#vh-capture').addEventListener('click',async()=>{try{await onScreenshot();toast('已保存当前场景截图');}catch(e){toast('截图未能保存，请重试');console.error(e);}});
  window.addEventListener('keydown',e=>{
    if(e.code==='Escape'&&!help.hidden)showHelp(false);
    if(e.target?.closest('input,textarea,select,button,[contenteditable=true]')||e.repeat)return;
    if(e.code==='KeyH')showHelp(help.hidden);
    if(e.code==='KeyC'){weather.cycle();syncWeather();}
  });
  syncTime();syncWeather();
  let last=0;
  return {update({fps}){
    const now=performance.now();if(now-last<240)return;last=now;
    syncTime();syncWeather();$('#vh-performance').textContent=Math.round(fps)+' FPS';
  }};
}

