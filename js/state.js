// ============================================================
// CONSTANTS
// ============================================================
export let GRID_SIZE = 1000;

export function setGridSize(n) {
  GRID_SIZE = n;
}

// ============================================================
// CELL STORAGE
// ============================================================
export let liveCells = new Set();

export function resetCells() {
  liveCells = new Set();
}

export function setCells(newSet) {
  liveCells = newSet;
}

export function getCells() {
  return liveCells;
}

// ============================================================
// VIEWPORT STATE
// ============================================================
export const viewport = {
  x: 500,
  y: 500,
  zoom: 10,
  minZoom: 0.25,
  maxZoom: 80
};

// ============================================================
// SIMULATION STATE
// ============================================================
export const sim = {
  running: false,
  speed: 10,
  birthRule: new Set([3]),
  survivalRule: new Set([2, 3]),
  mutationRate: 0,
  generation: 0
};

// ============================================================
// INTERACTION STATE
// ============================================================
export const interaction = {
  drawing: false,
  drawMode: null,
  panning: false,
  panStartMouse: null,
  panStartViewport: null,
  lastGridPos: null,
  stampPattern: null,
  stampRotation: 0,
  stampPreviewPos: null
};

// ============================================================
// POPULATION HISTORY (for sparkline)
// ============================================================
export const popHistory = [];
export const POP_HISTORY_MAX = 200;

export function recordPopulation() {
  popHistory.push(liveCells.size);
  if (popHistory.length > POP_HISTORY_MAX) {
    popHistory.shift();
  }
}

// ============================================================
// PATTERN LIBRARY
// ============================================================
export const PATTERNS = {};

export function rotatePattern(cells, times) {
  let result = cells.map(c => [...c]);
  for (let t = 0; t < (times % 4); t++) {
    result = result.map(([x, y]) => [-y, x]);
  }
  return result;
}
