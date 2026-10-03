import { GRID_SIZE, getCells, viewport, interaction, PATTERNS, rotatePattern } from './state.js';
import { parseKey } from './simulation.js';

let canvas, ctx;
let dpr = 1;
export let canvasW = 0;
export let canvasH = 0;

export function initCanvas() {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

export function getCanvas() {
  return canvas;
}

export function resizeCanvas() {
  dpr = window.devicePixelRatio || 1;
  canvasW = window.innerWidth;
  canvasH = window.innerHeight;
  canvas.width = canvasW * dpr;
  canvas.height = canvasH * dpr;
  canvas.style.width = canvasW + 'px';
  canvas.style.height = canvasH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function canvasToGrid(px, py) {
  const gx = viewport.x + (px - canvasW / 2) / viewport.zoom;
  const gy = viewport.y + (py - canvasH / 2) / viewport.zoom;
  return [Math.floor(gx), Math.floor(gy)];
}

export function gridToCanvas(gx, gy) {
  const px = (gx - viewport.x) * viewport.zoom + canvasW / 2;
  const py = (gy - viewport.y) * viewport.zoom + canvasH / 2;
  return [px, py];
}

function getVisibleBounds() {
  const z = viewport.zoom;
  const halfW = canvasW / 2 / z;
  const halfH = canvasH / 2 / z;
  return {
    minX: Math.max(0, Math.floor(viewport.x - halfW) - 1),
    maxX: Math.min(GRID_SIZE - 1, Math.ceil(viewport.x + halfW) + 1),
    minY: Math.max(0, Math.floor(viewport.y - halfH) - 1),
    maxY: Math.min(GRID_SIZE - 1, Math.ceil(viewport.y + halfH) + 1)
  };
}

function render() {
  const liveCells = getCells();
  const z = viewport.zoom;
  const { minX, maxX, minY, maxY } = getVisibleBounds();

  // Clear
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Grid lines
  if (z >= 4) {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = minX; x <= maxX + 1; x++) {
      const [px] = gridToCanvas(x, 0);
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvasH);
    }
    for (let y = minY; y <= maxY + 1; y++) {
      const [, py] = gridToCanvas(0, y);
      ctx.moveTo(0, py);
      ctx.lineTo(canvasW, py);
    }
    ctx.stroke();
  }

  // Live cells
  if (z >= 1) {
    ctx.fillStyle = '#00ff41';
    const gap = z >= 4 ? 0.5 : 0;
    for (const key of liveCells) {
      const [x, y] = parseKey(key);
      if (x < minX || x > maxX || y < minY || y > maxY) continue;
      const [px, py] = gridToCanvas(x, y);
      ctx.fillRect(px, py, z - gap, z - gap);
    }
  } else {
    // Sub-pixel rendering with ImageData
    const imgW = Math.ceil(canvasW);
    const imgH = Math.ceil(canvasH);
    const imageData = ctx.createImageData(imgW, imgH);
    const data = imageData.data;

    for (const key of liveCells) {
      const [x, y] = parseKey(key);
      if (x < minX || x > maxX || y < minY || y > maxY) continue;
      const [px, py] = gridToCanvas(x, y);
      const ix = Math.floor(px);
      const iy = Math.floor(py);
      if (ix < 0 || ix >= imgW || iy < 0 || iy >= imgH) continue;
      const idx = (iy * imgW + ix) * 4;
      data[idx] = 0;
      data[idx + 1] = 255;
      data[idx + 2] = 65;
      data[idx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // Grid boundary
  if (z >= 0.5) {
    const [bx0, by0] = gridToCanvas(0, 0);
    const [bx1, by1] = gridToCanvas(GRID_SIZE, GRID_SIZE);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx0, by0, bx1 - bx0, by1 - by0);
  }

  // Stamp preview
  if (interaction.stampPattern && interaction.stampPreviewPos) {
    const pattern = PATTERNS[interaction.stampPattern];
    if (pattern) {
      const cells = rotatePattern(pattern.cells, interaction.stampRotation);
      const [ox, oy] = interaction.stampPreviewPos;
      ctx.fillStyle = 'rgba(0, 255, 65, 0.35)';
      for (const [dx, dy] of cells) {
        const gx = ox + dx;
        const gy = oy + dy;
        if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) continue;
        const [px, py] = gridToCanvas(gx, gy);
        ctx.fillRect(px, py, z, z);
      }
    }
  }

  requestAnimationFrame(render);
}

export function startRenderLoop() {
  requestAnimationFrame(render);
}
