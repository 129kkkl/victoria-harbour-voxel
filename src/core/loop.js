// 主循环：rAF + 帧时间钳制 + FPS 指数滑动平均。
export function startLoop(callback) {
  let last = performance.now();
  let fps = 60;
  let running = true;

  function frame(now) {
    if (!running) return;
    const elapsed = (now - last) / 1000;
    last = now;
    const dt = Math.min(elapsed, 0.1); // Motion is clamped; FPS reports actual elapsed time.
    const inst = elapsed > 0 ? 1 / elapsed : 60;
    fps += (inst - fps) * 0.06;
    callback(dt, now / 1000, fps);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { stop: () => { running = false; }, get fps() { return fps; } };
}
