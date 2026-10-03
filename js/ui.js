import {
  sim, getCells, resetCells, viewport, interaction,
  popHistory, POP_HISTORY_MAX, PATTERNS
} from './state.js';
import { doStep, seedCenter, resizeGrid } from './simulation.js';
import { zoomIn, zoomOut, fitToContent } from './viewport.js';

let simIntervalId = null;

// ============================================================
// SIMULATION CONTROL
// ============================================================
export function startSim() {
  if (simIntervalId) return;
  sim.running = true;
  const btn = document.getElementById('play-btn');
  btn.classList.add('active');
  btn.textContent = '\u23F8 Pause';
  simIntervalId = setInterval(() => {
    doStep();
    updateInfo();
    drawSparkline();
  }, 1000 / sim.speed);
}

export function stopSim() {
  sim.running = false;
  const btn = document.getElementById('play-btn');
  btn.classList.remove('active');
  btn.textContent = '\u25B6 Play';
  if (simIntervalId) {
    clearInterval(simIntervalId);
    simIntervalId = null;
  }
}

export function toggleSim() {
  if (sim.running) stopSim();
  else startSim();
}

function restartSimInterval() {
  if (sim.running) {
    clearInterval(simIntervalId);
    simIntervalId = setInterval(() => {
      doStep();
      updateInfo();
      drawSparkline();
    }, 1000 / sim.speed);
  }
}

export function doSingleStep() {
  if (!sim.running) {
    doStep();
    updateInfo();
    drawSparkline();
  }
}

export function resetAll() {
  stopSim();
  resetCells();
  sim.generation = 0;
  popHistory.length = 0;
  updateInfo();
  drawSparkline();
}

// ============================================================
// INFO DISPLAY
// ============================================================
export function updateInfo() {
  document.getElementById('gen-count').textContent = sim.generation.toLocaleString();
  document.getElementById('pop-count').textContent = getCells().size.toLocaleString();
}

// ============================================================
// SPARKLINE
// ============================================================
let sparkCanvas, sparkCtx;

function initSparkline() {
  sparkCanvas = document.getElementById('sparkline');
  if (!sparkCanvas) return;
  sparkCtx = sparkCanvas.getContext('2d');
}

function drawSparkline() {
  if (!sparkCtx) return;
  const w = sparkCanvas.width;
  const h = sparkCanvas.height;

  sparkCtx.fillStyle = '#12122a';
  sparkCtx.fillRect(0, 0, w, h);

  if (popHistory.length < 2) return;

  const max = Math.max(...popHistory, 1);
  const step = w / (POP_HISTORY_MAX - 1);

  sparkCtx.strokeStyle = '#00ff41';
  sparkCtx.lineWidth = 1.5;
  sparkCtx.beginPath();

  const startIdx = POP_HISTORY_MAX - popHistory.length;
  for (let i = 0; i < popHistory.length; i++) {
    const x = (startIdx + i) * step;
    const y = h - (popHistory[i] / max) * (h - 4) - 2;
    if (i === 0) sparkCtx.moveTo(x, y);
    else sparkCtx.lineTo(x, y);
  }
  sparkCtx.stroke();

  // Fill under the line
  sparkCtx.lineTo((startIdx + popHistory.length - 1) * step, h);
  sparkCtx.lineTo(startIdx * step, h);
  sparkCtx.closePath();
  sparkCtx.fillStyle = 'rgba(0, 255, 65, 0.08)';
  sparkCtx.fill();
}

// ============================================================
// RULE TOGGLES
// ============================================================
function setupRuleToggles(containerId, ruleSet) {
  const container = document.getElementById(containerId);
  container.querySelectorAll('.rule-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.dataset.n, 10);
      if (ruleSet.has(n)) {
        ruleSet.delete(n);
        btn.classList.remove('active');
      } else {
        ruleSet.add(n);
        btn.classList.add('active');
      }
    });
  });
}

function randomizeRuleSet(containerId, ruleSet) {
  ruleSet.clear();
  const container = document.getElementById(containerId);
  container.querySelectorAll('.rule-toggle').forEach(btn => {
    const n = parseInt(btn.dataset.n, 10);
    if (Math.random() < 0.5) {
      ruleSet.add(n);
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// ============================================================
// MUTATION SLIDER MAPPING
// ============================================================
function sliderToRate(v) {
  return v / 1000;
}

function formatRate(rate) {
  if (rate === 0) return '0%';
  return (rate * 100).toFixed(1) + '%';
}

// ============================================================
// PATTERN SELECTION
// ============================================================
function selectPattern(name) {
  if (interaction.stampPattern === name) {
    // Deselect
    interaction.stampPattern = null;
    interaction.stampRotation = 0;
    interaction.stampPreviewPos = null;
    document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('stamp-hint').style.display = 'none';
  } else {
    interaction.stampPattern = name;
    interaction.stampRotation = 0;
    document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.pattern-btn[data-pattern="${name}"]`);
    if (btn) btn.classList.add('active');
    document.getElementById('stamp-hint').style.display = 'block';
  }
}

// ============================================================
// SETUP
// ============================================================
export function setupUI() {
  // Playback buttons
  document.getElementById('step-btn').addEventListener('click', doSingleStep);
  document.getElementById('play-btn').addEventListener('click', toggleSim);
  document.getElementById('reset-btn').addEventListener('click', resetAll);

  // Speed slider
  const speedSlider = document.getElementById('speed-slider');
  const speedVal = document.getElementById('speed-val');
  speedSlider.addEventListener('input', () => {
    sim.speed = parseInt(speedSlider.value, 10);
    speedVal.textContent = sim.speed;
    restartSimInterval();
  });

  // Rule toggles
  setupRuleToggles('birth-toggles', sim.birthRule);
  setupRuleToggles('survival-toggles', sim.survivalRule);

  // Randomize rules
  document.getElementById('random-rules-btn').addEventListener('click', () => {
    randomizeRuleSet('birth-toggles', sim.birthRule);
    randomizeRuleSet('survival-toggles', sim.survivalRule);
  });

  // Mutation slider + editable input
  const mutationSlider = document.getElementById('mutation-slider');
  const mutationVal = document.getElementById('mutation-val');

  mutationSlider.addEventListener('input', () => {
    const rate = sliderToRate(parseInt(mutationSlider.value, 10));
    sim.mutationRate = rate;
    mutationVal.value = formatRate(rate);
  });

  mutationVal.addEventListener('change', () => {
    let raw = mutationVal.value.trim().replace(/%$/, '');
    let pct = parseFloat(raw);
    if (isNaN(pct)) pct = 0;
    pct = Math.max(0, Math.min(100, pct));
    const rate = pct / 100;
    sim.mutationRate = rate;
    mutationSlider.value = Math.round(rate * 1000);
    mutationVal.value = formatRate(rate);
  });

  // Seed center slider + button
  const seedSlider = document.getElementById('seed-slider');
  const seedVal = document.getElementById('seed-val');
  let seedRate = 0.5;

  seedSlider.addEventListener('input', () => {
    seedRate = parseInt(seedSlider.value, 10) / 1000;
    seedVal.value = formatRate(seedRate);
  });

  seedVal.addEventListener('change', () => {
    let raw = seedVal.value.trim().replace(/%$/, '');
    let pct = parseFloat(raw);
    if (isNaN(pct)) pct = 0;
    pct = Math.max(0, Math.min(100, pct));
    seedRate = pct / 100;
    seedSlider.value = Math.round(seedRate * 1000);
    seedVal.value = formatRate(seedRate);
  });

  // Seed size slider
  const seedSizeSlider = document.getElementById('seed-size-slider');
  const seedSizeVal = document.getElementById('seed-size-val');
  let seedSize = 334;

  seedSizeSlider.addEventListener('input', () => {
    seedSize = parseInt(seedSizeSlider.value, 10);
    seedSizeVal.value = seedSize;
  });

  seedSizeVal.addEventListener('change', () => {
    let v = parseInt(seedSizeVal.value.trim(), 10);
    if (isNaN(v)) v = 334;
    v = Math.max(1, Math.min(1000, v));
    seedSize = v;
    seedSizeSlider.value = v;
    seedSizeVal.value = v;
  });

  document.getElementById('seed-btn').addEventListener('click', () => {
    seedCenter(seedRate, seedSize);
    updateInfo();
  });

  // Grid size slider + button
  const gridSizeSlider = document.getElementById('grid-size-slider');
  const gridSizeVal = document.getElementById('grid-size-val');
  let pendingGridSize = 1000;

  gridSizeSlider.addEventListener('input', () => {
    pendingGridSize = parseInt(gridSizeSlider.value, 10);
    gridSizeVal.value = pendingGridSize;
  });

  gridSizeVal.addEventListener('change', () => {
    let v = parseInt(gridSizeVal.value.trim(), 10);
    if (isNaN(v)) v = 1000;
    v = Math.max(10, Math.min(5000, v));
    pendingGridSize = v;
    gridSizeSlider.value = v;
    gridSizeVal.value = v;
  });

  document.getElementById('grid-size-btn').addEventListener('click', () => {
    resizeGrid(pendingGridSize);
    seedSizeSlider.max = pendingGridSize;
    if (seedSize > pendingGridSize) {
      seedSize = pendingGridSize;
      seedSizeSlider.value = seedSize;
      seedSizeVal.value = seedSize;
    }
    updateInfo();
  });

  // Collapse toggle
  const controlsEl = document.getElementById('controls');
  const toggleBtn = document.getElementById('toggle-btn');
  toggleBtn.addEventListener('click', () => {
    controlsEl.classList.toggle('collapsed');
    toggleBtn.innerHTML = controlsEl.classList.contains('collapsed') ? '&#x25BC;' : '&#x25B2;';
  });

  // Pattern buttons
  document.querySelectorAll('.pattern-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectPattern(btn.dataset.pattern);
    });
  });

  // Zoom controls
  document.getElementById('zoom-in-btn').addEventListener('click', () => {
    zoomIn();
    document.getElementById('zoom-val').textContent = viewport.zoom.toFixed(1);
  });
  document.getElementById('zoom-out-btn').addEventListener('click', () => {
    zoomOut();
    document.getElementById('zoom-val').textContent = viewport.zoom.toFixed(1);
  });
  document.getElementById('fit-btn').addEventListener('click', () => {
    fitToContent();
    document.getElementById('zoom-val').textContent = viewport.zoom.toFixed(1);
  });

  // Sparkline
  initSparkline();
  drawSparkline();

  // Initial info
  updateInfo();
}
