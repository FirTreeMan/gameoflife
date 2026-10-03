import { initCanvas, startRenderLoop } from './renderer.js';
import { setupInputHandlers } from './input.js';
import { setupUI } from './ui.js';

initCanvas();
setupInputHandlers();
setupUI();
startRenderLoop();
