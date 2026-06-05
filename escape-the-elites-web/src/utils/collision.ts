export type AABB = {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
};

export function entityToAABB(
  pos: { x: number; y: number; z: number },
  scale: { x: number; y: number; z: number }
): AABB {
  const hx = scale.x / 2;
  const hy = scale.y / 2;
  const hz = scale.z / 2;
  return {
    minX: pos.x - hx, maxX: pos.x + hx,
    minY: pos.y - hy, maxY: pos.y + hy,
    minZ: pos.z - hz, maxZ: pos.z + hz,
  };
}

export function intersectsAABB(a: AABB, b: AABB): boolean {
  return (
    a.maxX > b.minX && a.minX < b.maxX &&
    a.maxY > b.minY && a.minY < b.maxY &&
    a.maxZ > b.minZ && a.minZ < b.maxZ
  );
}

export function resolveCircleAABB(
  cx: number, cz: number, radius: number,
  walls: AABB[],
  velX: number, velZ: number
): [number, number] {
  let nx = cx + velX;
  let nz = cz + velZ;
  const playerMinY = 0;
  const playerMaxY = 2.5;

  for (const w of walls) {
    if (w.maxY < playerMinY || w.minY > playerMaxY) continue;

    const closestX = Math.max(w.minX, Math.min(nx, w.maxX));
    const closestZ = Math.max(w.minZ, Math.min(nz, w.maxZ));
    const dx = nx - closestX;
    const dz = nz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const overlap = radius - dist;
      const ndx = dx / dist;
      const ndz = dz / dist;
      nx += ndx * overlap;
      nz += ndz * overlap;
    }
  }

  return [nx, nz];
}
