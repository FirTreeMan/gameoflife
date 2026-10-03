import { viewport, interaction, getCells } from './state.js';
import { canvasW, canvasH } from './renderer.js';
import { parseKey } from './simulation.js';

export function panStart(mouseX, mouseY) {
  interaction.panning = true;
  interaction.panStartMouse = { x: mouseX, y: mouseY };
  interaction.panStartViewport = { x: viewport.x, y: viewport.y };
}

export function panMove(mouseX, mouseY) {
  if (!interaction.panning) return;
  const dx = (mouseX - interaction.panStartMouse.x) / viewport.zoom;
  const dy = (mouseY - interaction.panStartMouse.y) / viewport.zoom;
  viewport.x = interaction.panStartViewport.x - dx;
  viewport.y = interaction.panStartViewport.y - dy;
}

export function panEnd() {
  interaction.panning = false;
}

export function applyZoom(mouseX, mouseY, deltaY) {
  const gxBefore = viewport.x + (mouseX - canvasW / 2) / viewport.zoom;
  const gyBefore = viewport.y + (mouseY - canvasH / 2) / viewport.zoom;

  const factor = deltaY > 0 ? 0.9 : 1 / 0.9;
  viewport.zoom = Math.max(viewport.minZoom, Math.min(viewport.maxZoom, viewport.zoom * factor));

  viewport.x = gxBefore - (mouseX - canvasW / 2) / viewport.zoom;
  viewport.y = gyBefore - (mouseY - canvasH / 2) / viewport.zoom;
}

export function zoomIn() {
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  applyZoom(cx, cy, -1);
}

export function zoomOut() {
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  applyZoom(cx, cy, 1);
}

export function fitToContent() {
  const liveCells = getCells();
  if (liveCells.size === 0) {
    viewport.x = 500;
    viewport.y = 500;
    viewport.zoom = 10;
    return;
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const key of liveCells) {
    const [x, y] = parseKey(key);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const padding = 5;
  minX -= padding;
  maxX += padding;
  minY -= padding;
  maxY += padding;

  viewport.x = (minX + maxX) / 2;
  viewport.y = (minY + maxY) / 2;

  const spanX = maxX - minX + 1;
  const spanY = maxY - minY + 1;
  const zoomX = canvasW / spanX;
  const zoomY = canvasH / spanY;
  viewport.zoom = Math.max(viewport.minZoom, Math.min(viewport.maxZoom, Math.min(zoomX, zoomY)));
}
