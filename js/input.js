import { GRID_SIZE, getCells, interaction, viewport, PATTERNS, rotatePattern, getPatternBounds } from './state.js';
import { cellKey, snapLine } from './simulation.js';
import { getCanvas, canvasToGrid } from './renderer.js';
import { panStart, panMove, panEnd, applyZoom } from './viewport.js';
import { toggleSim, doSingleStep, resetAll, updateInfo, updateSelectInfo, copySelection, pasteSelection, clearSelection } from './ui.js';

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

function drawBatch(gx, gy, drawMode) {
  const liveCells = getCells();
  const r = Math.floor(interaction.batchSize / 2);
  const r2 = r * r;
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = -r; dy <= r; dy++) {
      if (dx * dx + dy * dy > r2) continue;
      const x = gx + dx;
      const y = gy + dy;
      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
        const key = cellKey(x, y);
        if (drawMode === 'add') liveCells.add(key);
        else liveCells.delete(key);
      }
    }
  }
}

function placeStamp(gx, gy) {
  const pattern = PATTERNS[interaction.stampPattern];
  if (!pattern) return;
  const liveCells = getCells();
  const cells = rotatePattern(pattern.cells, interaction.stampRotation);

  if (interaction.stampOverride) {
    const { minX, minY, maxX, maxY } = getPatternBounds(pattern, interaction.stampRotation);
    // Clear all cells in the bounding box
    for (let dx = minX; dx <= maxX; dx++) {
      for (let dy = minY; dy <= maxY; dy++) {
        const x = gx + dx;
        const y = gy + dy;
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
          liveCells.delete(cellKey(x, y));
        }
      }
    }
  }

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

      // Select brush
      if (interaction.brush === 'select') {
        interaction.selectStart = { x: gx, y: gy };
        interaction.selectEnd = { x: gx, y: gy };
        interaction.drawing = true;
        updateSelectInfo();
        return;
      }

      // Drawing with brushes
      if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return;
      const liveCells = getCells();
      const key = cellKey(gx, gy);

      // Determine add/remove mode
      if (interaction.eraser) {
        interaction.drawMode = 'remove';
      } else if (liveCells.has(key)) {
        interaction.drawMode = 'remove';
      } else {
        interaction.drawMode = 'add';
      }

      if (interaction.brush === 'line') {
        // Line brush: record start, don't draw yet
        interaction.lineStart = { x: gx, y: gy };
        interaction.linePreview = [gx, gy];
        interaction.drawing = true;
      } else if (interaction.brush === 'batch') {
        drawBatch(gx, gy, interaction.drawMode);
        interaction.drawing = true;
        interaction.lastGridPos = { x: gx, y: gy };
        updateInfo();
      } else {
        // Default brush
        if (interaction.drawMode === 'add') liveCells.add(key);
        else liveCells.delete(key);
        interaction.drawing = true;
        interaction.lastGridPos = { x: gx, y: gy };
        updateInfo();
      }
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
      if (interaction.brush === 'select') {
        interaction.selectEnd = { x: gx, y: gy };
        updateSelectInfo();
        return;
      }

      if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return;

      if (interaction.brush === 'line') {
        // Just update preview, don't draw yet
        interaction.linePreview = [gx, gy];
      } else if (interaction.brush === 'batch') {
        bresenham(interaction.lastGridPos.x, interaction.lastGridPos.y, gx, gy, (cx, cy) => {
          drawBatch(cx, cy, interaction.drawMode);
        });
        interaction.lastGridPos = { x: gx, y: gy };
        updateInfo();
      } else {
        // Default brush
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
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (interaction.drawing && interaction.brush === 'select' && interaction.selectStart) {
      const [gx, gy] = canvasToGrid(e.clientX, e.clientY);
      interaction.selectEnd = { x: gx, y: gy };
      interaction.drawing = false;
      // Show save button if selection has area
      const sx = interaction.selectStart, se = interaction.selectEnd;
      const w = Math.abs(se.x - sx.x) + 1;
      const h = Math.abs(se.y - sx.y) + 1;
      const saveBtn = document.getElementById('save-pattern-btn');
      saveBtn.style.display = (w > 0 && h > 0) ? '' : 'none';
      updateSelectInfo();
      return;
    }

    if (interaction.drawing && interaction.brush === 'line' && interaction.lineStart) {
      const [gx, gy] = canvasToGrid(e.clientX, e.clientY);
      const s = interaction.lineStart;
      const snapped = snapLine(s.x, s.y, gx, gy);
      const liveCells = getCells();
      bresenham(s.x, s.y, snapped.ex, snapped.ey, (cx, cy) => {
        if (cx >= 0 && cx < GRID_SIZE && cy >= 0 && cy < GRID_SIZE) {
          const k = cellKey(cx, cy);
          if (interaction.drawMode === 'add') liveCells.add(k);
          else liveCells.delete(k);
        }
      });
      interaction.lineStart = null;
      interaction.linePreview = null;
      updateInfo();
    }
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
    } else if (e.code === 'Digit1') {
      document.querySelector('.brush-btn[data-brush="default"]').click();
    } else if (e.code === 'Digit2') {
      document.querySelector('.brush-btn[data-brush="batch"]').click();
    } else if (e.code === 'Digit3') {
      document.querySelector('.brush-btn[data-brush="line"]').click();
    } else if (e.code === 'Digit4') {
      document.querySelector('.brush-btn[data-brush="select"]').click();
    } else if (e.code === 'KeyE') {
      document.getElementById('eraser-btn').click();
    } else if (e.code === 'KeyC' && (e.ctrlKey || e.metaKey)) {
      if (interaction.selectStart && interaction.selectEnd && !interaction.drawing) {
        e.preventDefault();
        copySelection();
      }
    } else if (e.code === 'KeyV' && (e.ctrlKey || e.metaKey)) {
      if (interaction.selectStart && interaction.selectEnd && !interaction.drawing) {
        e.preventDefault();
        pasteSelection();
      }
    } else if ((e.code === 'Delete' || e.code === 'Backspace') && !e.ctrlKey && !e.metaKey) {
      if (interaction.selectStart && interaction.selectEnd && !interaction.drawing) {
        e.preventDefault();
        clearSelection();
      }
    } else if (e.code === 'Escape') {
      // Clear selection
      if (interaction.selectStart) {
        interaction.selectStart = null;
        interaction.selectEnd = null;
        document.getElementById('save-pattern-btn').style.display = 'none';
        updateSelectInfo();
      }
      if (interaction.stampPattern) {
        interaction.stampPattern = null;
        interaction.stampRotation = 0;
        interaction.stampPreviewPos = null;
        document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('stamp-hint').style.display = 'none';
      }
    }
  });
}
