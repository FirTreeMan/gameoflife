// ============================================================
// CONSTANTS
// ============================================================
export const GRID_SIZE = 1000;

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
export const PATTERNS = {
  glider: {
    name: 'Glider',
    cells: [[0,0],[1,0],[2,0],[2,-1],[1,-2]]
  },
  lwss: {
    name: 'LWSS',
    cells: [[0,0],[0,2],[1,3],[2,3],[3,3],[4,3],[4,2],[4,1],[3,0]]
  },
  pulsar: {
    name: 'Pulsar',
    cells: (function() {
      const quarter = [[2,1],[3,1],[4,1],[1,2],[1,3],[1,4],[6,2],[6,3],[6,4],[2,6],[3,6],[4,6]];
      const full = [];
      for (const [x, y] of quarter) {
        full.push([x, y]);
        full.push([-x, y]);
        full.push([x, -y]);
        full.push([-x, -y]);
      }
      // Deduplicate
      const seen = new Set();
      return full.filter(([x, y]) => {
        const k = x + ',' + y;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    })()
  },
  pentadecathlon: {
    name: 'Penta',
    cells: [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0]].map(([x, y]) => {
      // Pentadecathlon: period-15 oscillator
      // Easier to define explicitly
      return [x, y];
    })
  },
  rpentomino: {
    name: 'R-pent',
    cells: [[0,0],[1,0],[1,1],[1,-1],[2,-1]]
  },
  gospergun: {
    name: 'Gun',
    cells: [
      [0,4],[0,5],[1,4],[1,5],
      [10,4],[10,5],[10,6],[11,3],[11,7],[12,2],[12,8],[13,2],[13,8],
      [14,5],[15,3],[15,7],[16,4],[16,5],[16,6],[17,5],
      [20,2],[20,3],[20,4],[21,2],[21,3],[21,4],[22,1],[22,5],
      [24,0],[24,1],[24,5],[24,6],
      [34,2],[34,3],[35,2],[35,3]
    ]
  }
};

// Fix pentadecathlon to proper pattern
PATTERNS.pentadecathlon.cells = [
  [0,0],[1,0],[-1,0],
  [2,1],[2,-1],
  [3,0],[4,0],
  [5,0],[6,0],
  [7,1],[7,-1],
  [8,0],[9,0],[-2,0]
];

export function rotatePattern(cells, times) {
  let result = cells.map(c => [...c]);
  for (let t = 0; t < (times % 4); t++) {
    result = result.map(([x, y]) => [-y, x]);
  }
  return result;
}
