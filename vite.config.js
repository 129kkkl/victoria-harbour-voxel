import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1500 },
  server: {
    watch: {
      // 编辑器与脚本的「原子写入」会在源码树里造出
      //   src/xxx/.file.js.<pid>.<uuid>.tmpdir\file.js.tmp
      // 这类点号临时目录。Vite 的 chokidar 监听器去 watch 它们时，
      // Windows 上会抛 EBUSY 并让整个 dev server 直接退出（已实测复现两次）。
      // 点号目录一律忽略即可根治；node_modules 本来也不该被监听。
      ignored: ['**/node_modules/**', '**/.git/**', '**/.*/**',
        '**/docs/shots/**', '**/dist/**', '**/dist-single/**']
    }
  }
});
