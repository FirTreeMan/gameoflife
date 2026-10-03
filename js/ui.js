import {
  sim, getCells, resetCells, viewport, interaction,
  popHistory, POP_HISTORY_MAX, PATTERNS
} from './state.js';
import { doStep } from './simulation.js';
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

// ============================================================
// MUTATION SLIDER MAPPING
// ============================================================
function sliderToRate(v) {
  if (v === 0) return 0;
  const normalized = v / 1000;
  return Math.pow(normalized, 3);
}

function formatRate(rate) {
  if (rate === 0) return '0';
  if (rate < 0.0001) return rate.toExponential(1);
  return rate.toFixed(4);
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

  // Mutation slider
  const mutationSlider = document.getElementById('mutation-slider');
  const mutationVal = document.getElementById('mutation-val');
  mutationSlider.addEventListener('input', () => {
    const rate = sliderToRate(parseInt(mutationSlider.value, 10));
    sim.mutationRate = rate;
    mutationVal.textContent = formatRate(rate);
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
