// 离线单 HTML 构建（M4 后追加）：把 vite 产物打包成**一个双击就能跑**的 html 文件。
//
//   node tools/build-single.mjs          # 先 npm run build
//   npm run build:single                 # 一条命令
//
// 可行性基础：项目全部资产都是程序化生成的（贴图 = Canvas 离屏、几何 = 种子化
// 参数、无任何 fetch / 外链字体 / 外链贴图），vite 产物只有一个自包含 JS chunk。
// 所以单文件化 = 把 JS 内联进 <script type="module">。file:// 下 WebGL2 /
// Canvas / 模块脚本均不受 CORS 影响。
//
// 输出：dist-single/victoria-harbour.html
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const OUT_DIR = resolve(ROOT, 'dist-single');
const OUT = resolve(OUT_DIR, 'victoria-harbour.html');

const html = readFileSync(resolve(DIST, 'index.html'), 'utf8');
const assets = readdirSync(resolve(DIST, 'assets')).filter(f => f.endsWith('.js'));
if (assets.length !== 1) {
  console.error(`预期单个 JS chunk，实际 ${assets.length} 个：${assets.join(', ')}`);
  process.exit(1);
}
const js = readFileSync(resolve(DIST, 'assets', assets[0]), 'utf8');

// 内联脚本的安全检查：这两个序列会提前终结 script / 制造 HTML 注释歧义。
// JS 字符串里出现 `</script>` 的合法解法是写成 `<\/script>`，本项目当前不含。
for (const bad of ['</script', '<!--']) {
  if (js.includes(bad)) {
    console.error(`打包中断：JS 里出现 "${bad}"，需要先转义后再内联`);
    process.exit(1);
  }
}

const tagRe = /<script type="module" crossorigin src="\.\/assets\/[^"]+"><\/script>/;
if (!tagRe.test(html)) {
  console.error('打包中断：index.html 里没找到预期的 module script 标签（vite 产物结构变了？）');
  process.exit(1);
}

let single = html.replace(tagRe,
  () => `<script type="module">\n// ==== 内联打包：three.js r160 + 全部场景源码（vite 单 chunk 产物） ====\n${js}\n</script>`);

// Vite extracts the HUD stylesheet; bundle it too so file:// stays self-contained.
single = single.replace(/<link rel="stylesheet" crossorigin href="\.\/assets\/([^"]+)">/g,
  (_, file) => `<style>${readFileSync(resolve(DIST, 'assets', file), 'utf8')}</style>`);
if (/(?:src|href)="\.\/assets\//.test(single)) throw new Error('单文件仍引用外部资源');

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, single);
console.log(`✓ ${OUT}`);
console.log(`  大小 ${(single.length / 1024 / 1024).toFixed(2)} MB（HTML ${(html.length / 1024).toFixed(1)} KB + JS ${(js.length / 1024).toFixed(0)} KB）`);
console.log('  双击或拖进浏览器即可离线运行（file:// 协议）');
