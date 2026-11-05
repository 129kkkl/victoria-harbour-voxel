// Oriented footprints and a spatial hash shared by generation and offline validation.
export function footprint(lot, margin = 0) {
  const c = Math.cos(lot.rotY), s = Math.sin(lot.rotY);
  const hw = lot.w / 2 + margin, hd = lot.d / 2 + margin;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([u, v]) =>
    ({ x: lot.x + c * u + s * v, z: lot.z - s * u + c * v }));
}

export function overlaps(a, b, gap = 0) {
  const pa = footprint(a, gap / 2), pb = footprint(b, gap / 2);
  for (const p of [pa, pb]) {
    for (let i = 0; i < 2; i++) {
      const dx = p[i + 1].x - p[i].x, dz = p[i + 1].z - p[i].z;
      const axis = { x: -dz, z: dx };
      const aa = pa.map(v => v.x * axis.x + v.z * axis.z);
      const bb = pb.map(v => v.x * axis.x + v.z * axis.z);
      if (Math.max(...aa) <= Math.min(...bb) || Math.max(...bb) <= Math.min(...aa)) return false;
    }
  }
  return true;
}

export function createSpatialIndex(cellSize = 128) {
  const cells = new Map();
  const keys = lot => {
    const p = footprint(lot, 6);
    const result = [];
    for (let x = Math.floor(Math.min(...p.map(v => v.x)) / cellSize); x <= Math.floor(Math.max(...p.map(v => v.x)) / cellSize); x++) {
      for (let z = Math.floor(Math.min(...p.map(v => v.z)) / cellSize); z <= Math.floor(Math.max(...p.map(v => v.z)) / cellSize); z++) result.push(`${x},${z}`);
    }
    return result;
  };
  return {
    nearby(lot) { return [...new Set(keys(lot).flatMap(k => cells.get(k) || []))]; },
    insert(lot) { for (const k of keys(lot)) { if (!cells.has(k)) cells.set(k, []); cells.get(k).push(lot); } }
  };
}
