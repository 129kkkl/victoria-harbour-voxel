import * as THREE from 'three';

// A small, offline sky light probe. Broad gradients read as glass reflections,
// while leaving the actual animated sky/water and physical sun independent.
export function createEnvironment(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  for (const [p, c] of [[0, '#42687c'], [.38, '#a5c2c9'], [.5, '#d9d9c8'], [.55, '#6c807e'], [1, '#33413b']]) gradient.addColorStop(p, c);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 32; i++) {
    ctx.fillStyle = i % 3 ? 'rgba(40,58,61,.16)' : 'rgba(223,226,209,.23)';
    ctx.fillRect(i * 32, 260 - (i * 17 % 48), 17, 100);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromEquirectangular(texture);
  texture.dispose(); generator.dispose();
  return target;
}
