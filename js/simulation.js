import { GRID_SIZE, getCells, setCells, sim, recordPopulation, setGridSize } from './state.js';

export function cellKey(x, y) {
  return x + ',' + y;
}

export function parseKey(key) {
  const i = key.indexOf(',');
  return [parseInt(key.substring(0, i), 10), parseInt(key.substring(i + 1), 10)];
}

export function step() {
  const liveCells = getCells();
  const neighborCounts = new Map();

  for (const key of liveCells) {
    const [x, y] = parseKey(key);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        const nk = cellKey(nx, ny);
        neighborCounts.set(nk, (neighborCounts.get(nk) || 0) + 1);
      }
    }
  }

  const next = new Set();

  for (const [nk, count] of neighborCounts) {
    if (liveCells.has(nk)) {
      if (sim.survivalRule.has(count)) next.add(nk);
    } else {
      if (sim.birthRule.has(count)) next.add(nk);
    }
  }

  if (sim.survivalRule.has(0)) {
    for (const key of liveCells) {
      if (!neighborCounts.has(key)) {
        next.add(key);
      }
    }
  }

  setCells(next);
  sim.generation++;
}

// Floyd's algorithm: select exactly n distinct indices from [0, N)
function floydSample(N, n) {
  const selected = new Set();
  for (let j = N - n; j < N; j++) {
    const r = Math.floor(Math.random() * (j + 1));
    if (selected.has(r)) selected.add(j);
    else selected.add(r);
  }
  return selected;
}

export function applyMutation() {
  if (sim.mutationRate <= 0) return;
  const liveCells = getCells();
  const totalCells = GRID_SIZE * GRID_SIZE;
  const numToggles = Math.min(Math.round(sim.mutationRate * totalCells), totalCells);
  if (numToggles <= 0) return;

  const indices = floydSample(totalCells, numToggles);
  for (const idx of indices) {
    const x = idx % GRID_SIZE;
    const y = (idx - x) / GRID_SIZE;
    const key = cellKey(x, y);
    if (liveCells.has(key)) liveCells.delete(key);
    else liveCells.add(key);
  }
}

export function seedCenter(rate, size) {
  if (rate <= 0 || size <= 0) return;
  const liveCells = getCells();
  const half = Math.floor(size / 2);
  const center = Math.floor(GRID_SIZE / 2);
  const minC = Math.max(0, center - half);
  const maxC = Math.min(GRID_SIZE, minC + size);
  const span = maxC - minC;
  const regionCells = span * span;
  const numToggles = Math.min(Math.round(rate * regionCells), regionCells);
  if (numToggles <= 0) return;

  const indices = floydSample(regionCells, numToggles);
  for (const idx of indices) {
    const dx = idx % span;
    const dy = (idx - dx) / span;
    const key = cellKey(minC + dx, minC + dy);
    if (liveCells.has(key)) liveCells.delete(key);
    else liveCells.add(key);
  }
}

export function resizeGrid(newSize) {
  setGridSize(newSize);
  const liveCells = getCells();
  const next = new Set();
  for (const key of liveCells) {
    const [x, y] = parseKey(key);
    if (x >= 0 && x < newSize && y >= 0 && y < newSize) {
      next.add(key);
    }
  }
  setCells(next);
}

// Snap a line from start to end to the nearest orthogonal or diagonal direction
export function snapLine(sx, sy, ex, ey) {
  const dx = ex - sx;
  const dy = ey - sy;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  if (adx > ady * 2) {
    return { ex: ex, ey: sy };
  } else if (ady > adx * 2) {
    return { ex: sx, ey: ey };
  } else {
    const dist = Math.max(adx, ady);
    return {
      ex: sx + dist * Math.sign(dx),
      ey: sy + dist * Math.sign(dy)
    };
  }
}

export function doStep() {
  step();
  applyMutation();
  recordPopulation();
}
