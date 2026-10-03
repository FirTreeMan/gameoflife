import { GRID_SIZE, getCells, interaction, viewport, PATTERNS, rotatePattern } from './state.js';
import { cellKey } from './simulation.js';
import { getCanvas, canvasToGrid } from './renderer.js';
import { panStart, panMove, panEnd, applyZoom } from './viewport.js';
import { toggleSim, doSingleStep, resetAll, updateInfo } from './ui.js';

function bresenham(x0, y0, x1, y1, callback) {
  const adx = Math.abs(x1 - x0);
  const ady = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = adx - ady;
  let cx = x0, cy = y0;
  while (true) {
    callback(cx, cy);
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -ady) { err -= ady; cx += sx; }
    if (e2 < adx) { err += adx; cy += sy; }
  }
}

function placeStamp(gx, gy) {
  const pattern = PATTERNS[interaction.stampPattern];
  if (!pattern) return;
  const liveCells = getCells();
  const cells = rotatePattern(pattern.cells, interaction.stampRotation);
  for (const [dx, dy] of cells) {
    const x = gx + dx;
    const y = gy + dy;
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      liveCells.add(cellKey(x, y));
    }
  }
  updateInfo();
}

export function setupInputHandlers() {
  const canvas = getCanvas();

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1 || e.button === 2) {
      panStart(e.clientX, e.clientY);
      e.preventDefault();
      return;
    }

    if (e.button === 0) {
      const [gx, gy] = canvasToGrid(e.clientX, e.clientY);

      // Stamp mode
      if (interaction.stampPattern) {
        if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
          placeStamp(gx, gy);
        }
        return;
      }

      // Normal drawing
      if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return;
      const liveCells = getCells();
      const key = cellKey(gx, gy);
      if (liveCells.has(key)) {
        liveCells.delete(key);
        interaction.drawMode = 'remove';
      } else {
        liveCells.add(key);
        interaction.drawMode = 'add';
      }
      interaction.drawing = true;
      interaction.lastGridPos = { x: gx, y: gy };
      updateInfo();
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const [gx, gy] = canvasToGrid(e.clientX, e.clientY);

    // Update cursor pos display
    const posEl = document.getElementById('cursor-pos');
    if (posEl) {
      posEl.textContent = (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE)
        ? gx + ',' + gy : '-';
    }

    // Stamp preview
    if (interaction.stampPattern) {
      interaction.stampPreviewPos = [gx, gy];
    }

    if (interaction.panning) {
      panMove(e.clientX, e.clientY);
      return;
    }

    if (interaction.drawing) {
      if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return;
      const liveCells = getCells();
      bresenham(interaction.lastGridPos.x, interaction.lastGridPos.y, gx, gy, (cx, cy) => {
        if (cx >= 0 && cx < GRID_SIZE && cy >= 0 && cy < GRID_SIZE) {
          const k = cellKey(cx, cy);
          if (interaction.drawMode === 'add') liveCells.add(k);
          else liveCells.delete(k);
        }
      });
      interaction.lastGridPos = { x: gx, y: gy };
      updateInfo();
    }
  });

  window.addEventListener('mouseup', () => {
    interaction.drawing = false;
    interaction.drawMode = null;
    panEnd();
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    applyZoom(e.clientX, e.clientY, e.deltaY);
    const zoomEl = document.getElementById('zoom-val');
    if (zoomEl) zoomEl.textContent = viewport.zoom.toFixed(1);
  }, { passive: false });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    if (e.code === 'Space') {
      e.preventDefault();
      toggleSim();
    } else if (e.code === 'KeyN') {
      doSingleStep();
    } else if (e.code === 'KeyR' && !interaction.stampPattern) {
      resetAll();
    } else if (e.code === 'KeyR' && interaction.stampPattern) {
      // Rotate stamp
      interaction.stampRotation = (interaction.stampRotation + 1) % 4;
    } else if (e.code === 'Escape') {
      if (interaction.stampPattern) {
        interaction.stampPattern = null;
        interaction.stampRotation = 0;
        interaction.stampPreviewPos = null;
        // Deactivate all pattern buttons
        document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('stamp-hint').style.display = 'none';
      }
    }
  });
}
