import {
  sim, getCells, resetCells, viewport, interaction,
  popHistory, POP_HISTORY_MAX, PATTERNS, GRID_SIZE, setGridSize
} from './state.js';
import { doStep, seedCenter, resizeGrid, cellKey, parseKey } from './simulation.js';
import { zoomIn, zoomOut, fitToContent } from './viewport.js';

let simIntervalId = null;
let seedRate = 0.5;
let seedSizePct = 1 / 3;

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

export function updateSelectInfo() {
  const infoEl = document.getElementById('select-info');
  const hintEl = document.getElementById('select-copy-hint');
  const s = interaction.selectStart;
  const e = interaction.selectEnd;
  if (!s || !e) {
    infoEl.style.display = 'none';
    return;
  }
  hintEl.style.display = interaction.drawing ? 'none' : '';
  infoEl.style.display = '';
}

export function clearSelection() {
  const s = interaction.selectStart;
  const e = interaction.selectEnd;
  if (!s || !e) return;
  const x0 = Math.min(s.x, e.x);
  const y0 = Math.min(s.y, e.y);
  const x1 = Math.max(s.x, e.x);
  const y1 = Math.max(s.y, e.y);
  const liveCells = getCells();
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      liveCells.delete(cellKey(x, y));
    }
  }
  updateInfo();
}

export function copySelection() {
  const s = interaction.selectStart;
  const e = interaction.selectEnd;
  if (!s || !e) return;
  const x0 = Math.min(s.x, e.x);
  const y0 = Math.min(s.y, e.y);
  const x1 = Math.max(s.x, e.x);
  const y1 = Math.max(s.y, e.y);
  const liveCells = getCells();
  const cells = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      if (liveCells.has(cellKey(x, y))) {
        cells.push([x - x0, y - y0]);
      }
    }
  }
  const data = { cells, bounds: { w: x1 - x0 + 1, h: y1 - y0 + 1 } };
  navigator.clipboard.writeText(JSON.stringify(data));
}

export function pasteSelection() {
  const s = interaction.selectStart;
  const e = interaction.selectEnd;
  if (!s || !e) return;
  const x0 = Math.min(s.x, e.x);
  const y0 = Math.min(s.y, e.y);
  const x1 = Math.max(s.x, e.x);
  const y1 = Math.max(s.y, e.y);
  navigator.clipboard.readText().then(text => {
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data.cells)) return;
      const liveCells = getCells();
      // Clear the selection area only if override is enabled
      if (interaction.stampOverride) {
        for (let x = x0; x <= x1; x++) {
          for (let y = y0; y <= y1; y++) {
            liveCells.delete(cellKey(x, y));
          }
        }
      }
      // Place pasted cells at selection origin
      for (const [dx, dy] of data.cells) {
        const x = x0 + dx;
        const y = y0 + dy;
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
          liveCells.add(cellKey(x, y));
        }
      }
      updateInfo();
    } catch (e) { /* ignore non-JSON clipboard */ }
  });
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
      highlightActiveSavedRule();
      persistSettings();
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
// PATTERN SAVING
// ============================================================
function savePatternFromSelection() {
  const s = interaction.selectStart;
  const e = interaction.selectEnd;
  if (!s || !e) return;

  const x0 = Math.min(s.x, e.x);
  const y0 = Math.min(s.y, e.y);
  const x1 = Math.max(s.x, e.x);
  const y1 = Math.max(s.y, e.y);

  const liveCells = getCells();
  const cells = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      if (liveCells.has(cellKey(x, y))) {
        cells.push([x - x0, y - y0]);
      }
    }
  }

  if (cells.length === 0) return;

  const name = prompt('Pattern name:');
  if (!name || !name.trim()) return;
  const key = name.trim();

  if (PATTERNS[key]) {
    if (!confirm(`Pattern "${key}" already exists. Overwrite?`)) return;
  }

  PATTERNS[key] = { cells, bounds: { w: x1 - x0 + 1, h: y1 - y0 + 1 } };
  persistPatterns();
  renderPatternButtons();

  // Clear selection
  interaction.selectStart = null;
  interaction.selectEnd = null;
  document.getElementById('save-pattern-btn').style.display = 'none';
}

function renderPatternButtons() {
  const grid = document.getElementById('pattern-grid');
  grid.innerHTML = '';
  for (const name of Object.keys(PATTERNS)) {
    const btn = document.createElement('button');
    btn.className = 'pattern-btn';
    btn.dataset.pattern = name;
    btn.textContent = name;
    btn.addEventListener('click', () => selectPattern(name));

    const removeBtn = document.createElement('span');
    removeBtn.className = 'remove-rule';
    removeBtn.textContent = '\u00d7';
    removeBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      delete PATTERNS[name];
      persistPatterns();
      if (interaction.stampPattern === name) {
        interaction.stampPattern = null;
        interaction.stampRotation = 0;
        interaction.stampPreviewPos = null;
        document.getElementById('stamp-hint').style.display = 'none';
      }
      renderPatternButtons();
    });

    btn.appendChild(removeBtn);
    grid.appendChild(btn);
  }
}

// ============================================================
// SAVED RULESETS
// ============================================================
function parseRuleString(str) {
  const m = str.trim().toUpperCase().match(/^B([1-8]*)\/S([1-8]*)$/);
  if (!m) return null;
  const birth = new Set([...m[1]].map(Number));
  const survival = new Set([...m[2]].map(Number));
  return { birth, survival };
}

const STORAGE_KEY = 'gol-saved-rulesets';
const savedRulesets = [];

function persistRulesets() {
  const data = savedRulesets.map(r => r.label);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadPersistedRulesets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const labels = JSON.parse(raw);
    if (!Array.isArray(labels)) return;
    for (const label of labels) {
      const parsed = parseRuleString(label);
      if (!parsed) continue;
      const l = rulesetLabel(parsed.birth, parsed.survival);
      if (savedRulesets.some(r => r.label === l)) continue;
      savedRulesets.push({ birth: parsed.birth, survival: parsed.survival, label: l });
    }
  } catch (e) { /* ignore corrupt data */ }
}

// ============================================================
// GENERAL SETTINGS PERSISTENCE
// ============================================================
const SETTINGS_KEY = 'gol-settings';
const PATTERNS_KEY = 'gol-patterns';

function persistSettings() {
  const data = {
    speed: sim.speed,
    birthRule: [...sim.birthRule],
    survivalRule: [...sim.survivalRule],
    mutationRate: sim.mutationRate,
    gridSize: GRID_SIZE,
    brush: interaction.brush,
    batchSize: interaction.batchSize,
    eraser: interaction.eraser,
    stampOverride: interaction.stampOverride,
    seedRate: seedRate,
    seedSizePct: seedSizePct,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
}

function persistPatterns() {
  const data = {};
  for (const [name, pat] of Object.entries(PATTERNS)) {
    data[name] = { cells: pat.cells, bounds: pat.bounds || null };
  }
  localStorage.setItem(PATTERNS_KEY, JSON.stringify(data));
}

function loadPersistedSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function loadPersistedPatterns() {
  try {
    const raw = localStorage.getItem(PATTERNS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    for (const [name, pat] of Object.entries(data)) {
      PATTERNS[name] = { cells: pat.cells, bounds: pat.bounds || null };
    }
  } catch (e) { /* ignore corrupt data */ }
}

function rulesetLabel(birthRule, survivalRule) {
  const b = [...birthRule].sort().join('');
  const s = [...survivalRule].sort().join('');
  return `B${b}/S${s}`;
}

function highlightActiveSavedRule() {
  const currentLabel = rulesetLabel(sim.birthRule, sim.survivalRule);
  document.querySelectorAll('.saved-rule-btn').forEach(btn => {
    const label = btn.childNodes[0].textContent;
    if (label === currentLabel) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

function renderSavedRules() {
  const container = document.getElementById('saved-rules');
  container.innerHTML = '';
  savedRulesets.forEach((entry, idx) => {
    const btn = document.createElement('button');
    btn.className = 'saved-rule-btn';
    btn.textContent = entry.label;
    btn.title = 'Load ' + entry.label;
    btn.addEventListener('click', () => loadRuleset(entry));

    const removeBtn = document.createElement('span');
    removeBtn.className = 'remove-rule';
    removeBtn.textContent = '\u00d7';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      savedRulesets.splice(idx, 1);
      persistRulesets();
      renderSavedRules();
    });

    btn.appendChild(removeBtn);
    container.appendChild(btn);
  });
  highlightActiveSavedRule();
}

function saveCurrentRuleset() {
  const birth = new Set(sim.birthRule);
  const survival = new Set(sim.survivalRule);
  const label = rulesetLabel(birth, survival);
  // Don't save duplicates
  if (savedRulesets.some(r => r.label === label)) return;
  savedRulesets.push({ birth, survival, label });
  persistRulesets();
  renderSavedRules();
}

function addRuleFromString(str) {
  const parsed = parseRuleString(str);
  if (!parsed) return false;
  const label = rulesetLabel(parsed.birth, parsed.survival);
  if (savedRulesets.some(r => r.label === label)) return true; // duplicate, still "success"
  savedRulesets.push({ birth: parsed.birth, survival: parsed.survival, label });
  persistRulesets();
  renderSavedRules();
  return true;
}

function loadRuleset(entry) {
  sim.birthRule.clear();
  entry.birth.forEach(n => sim.birthRule.add(n));
  sim.survivalRule.clear();
  entry.survival.forEach(n => sim.survivalRule.add(n));
  syncToggleUI('birth-toggles', sim.birthRule);
  syncToggleUI('survival-toggles', sim.survivalRule);
  highlightActiveSavedRule();
  persistSettings();
}

function syncToggleUI(containerId, ruleSet) {
  const container = document.getElementById(containerId);
  container.querySelectorAll('.rule-toggle').forEach(btn => {
    const n = parseInt(btn.dataset.n, 10);
    if (ruleSet.has(n)) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

// ============================================================
// SETUP
// ============================================================
export function setupUI() {
  // Load persisted patterns
  loadPersistedPatterns();

  // Load persisted settings and apply to state + DOM
  const saved = loadPersistedSettings();
  if (saved) {
    if (saved.speed != null) sim.speed = saved.speed;
    if (saved.birthRule) { sim.birthRule.clear(); saved.birthRule.forEach(n => sim.birthRule.add(n)); }
    if (saved.survivalRule) { sim.survivalRule.clear(); saved.survivalRule.forEach(n => sim.survivalRule.add(n)); }
    if (saved.mutationRate != null) sim.mutationRate = saved.mutationRate;
    if (saved.gridSize != null) { setGridSize(saved.gridSize); }
    if (saved.brush) interaction.brush = saved.brush;
    if (saved.batchSize != null) interaction.batchSize = saved.batchSize;
    if (saved.eraser != null) interaction.eraser = saved.eraser;
    if (saved.stampOverride != null) interaction.stampOverride = saved.stampOverride;
    if (saved.seedRate != null) seedRate = saved.seedRate;
    if (saved.seedSizePct != null) seedSizePct = saved.seedSizePct;
  }

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
    persistSettings();
  });

  // Brush selection
  const batchSizeRow = document.getElementById('batch-size-row');
  const batchSizeSlider = document.getElementById('batch-size-slider');
  const batchSizeVal = document.getElementById('batch-size-val');

  document.querySelectorAll('.brush-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      interaction.brush = btn.dataset.brush;
      document.querySelectorAll('.brush-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      batchSizeRow.style.display = interaction.brush === 'batch' ? '' : 'none';
      // Clear selection when switching away from select brush
      if (interaction.brush !== 'select' && interaction.selectStart) {
        interaction.selectStart = null;
        interaction.selectEnd = null;
        document.getElementById('save-pattern-btn').style.display = 'none';
        updateSelectInfo();
      }
      persistSettings();
    });
  });

  // Eraser toggle
  const eraserBtn = document.getElementById('eraser-btn');
  eraserBtn.addEventListener('click', () => {
    interaction.eraser = !interaction.eraser;
    eraserBtn.classList.toggle('active', interaction.eraser);
    persistSettings();
  });

  batchSizeSlider.addEventListener('input', () => {
    let v = parseInt(batchSizeSlider.value, 10);
    if (v % 2 === 0) v++;  // ensure odd
    interaction.batchSize = v;
    batchSizeVal.value = v;
    persistSettings();
  });

  batchSizeVal.addEventListener('change', () => {
    let v = parseInt(batchSizeVal.value.trim(), 10);
    if (isNaN(v)) v = 3;
    v = Math.max(1, Math.min(51, v));
    if (v % 2 === 0) v++;  // ensure odd
    interaction.batchSize = v;
    batchSizeSlider.value = v;
    batchSizeVal.value = v;
    persistSettings();
  });

  // Rule toggles
  setupRuleToggles('birth-toggles', sim.birthRule);
  setupRuleToggles('survival-toggles', sim.survivalRule);

  // Randomize rules
  document.getElementById('random-rules-btn').addEventListener('click', () => {
    randomizeRuleSet('birth-toggles', sim.birthRule);
    randomizeRuleSet('survival-toggles', sim.survivalRule);
    highlightActiveSavedRule();
    persistSettings();
  });

  // Copy rules to clipboard
  const copyBtn = document.getElementById('copy-rules-btn');
  copyBtn.addEventListener('click', () => {
    const label = rulesetLabel(sim.birthRule, sim.survivalRule);
    navigator.clipboard.writeText(label).then(() => {
      const orig = copyBtn.textContent;
      copyBtn.textContent = 'Copied';
      setTimeout(() => { copyBtn.textContent = orig; }, 1000);
    });
  });

  // Save rules
  document.getElementById('save-rules-btn').addEventListener('click', saveCurrentRuleset);

  // Load persisted rulesets from localStorage
  loadPersistedRulesets();
  renderSavedRules();

  // Rule input (type + Enter, or paste)
  const ruleInput = document.getElementById('rule-input');
  ruleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (addRuleFromString(ruleInput.value)) {
        ruleInput.value = '';
      }
    }
  });
  ruleInput.addEventListener('paste', (e) => {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (addRuleFromString(text)) {
      e.preventDefault();
      ruleInput.value = '';
    }
  });

  // Mutation slider + editable input
  const mutationSlider = document.getElementById('mutation-slider');
  const mutationVal = document.getElementById('mutation-val');

  mutationSlider.addEventListener('input', () => {
    const rate = sliderToRate(parseInt(mutationSlider.value, 10));
    sim.mutationRate = rate;
    mutationVal.value = formatRate(rate);
    persistSettings();
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
    persistSettings();
  });

  // Seed center slider + button
  const seedSlider = document.getElementById('seed-slider');
  const seedVal = document.getElementById('seed-val');

  seedSlider.addEventListener('input', () => {
    seedRate = parseInt(seedSlider.value, 10) / 1000;
    seedVal.value = formatRate(seedRate);
    persistSettings();
  });

  seedVal.addEventListener('change', () => {
    let raw = seedVal.value.trim().replace(/%$/, '');
    let pct = parseFloat(raw);
    if (isNaN(pct)) pct = 0;
    pct = Math.max(0, Math.min(100, pct));
    seedRate = pct / 100;
    seedSlider.value = Math.round(seedRate * 1000);
    seedVal.value = formatRate(seedRate);
    persistSettings();
  });

  // Seed size slider (percentage of grid)
  const seedSizeSlider = document.getElementById('seed-size-slider');
  const seedSizeVal = document.getElementById('seed-size-val');

  seedSizeSlider.addEventListener('input', () => {
    seedSizePct = parseInt(seedSizeSlider.value, 10) / 1000;
    seedSizeVal.value = formatRate(seedSizePct);
    persistSettings();
  });

  seedSizeVal.addEventListener('change', () => {
    let raw = seedSizeVal.value.trim().replace(/%$/, '');
    let pct = parseFloat(raw);
    if (isNaN(pct)) pct = 33.3;
    pct = Math.max(0, Math.min(100, pct));
    seedSizePct = pct / 100;
    seedSizeSlider.value = Math.round(seedSizePct * 1000);
    seedSizeVal.value = formatRate(seedSizePct);
    persistSettings();
  });

  document.getElementById('seed-btn').addEventListener('click', () => {
    const size = Math.max(1, Math.round(seedSizePct * GRID_SIZE));
    seedCenter(seedRate, size);
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
    updateInfo();
    persistSettings();
  });

  // Collapse toggle
  const controlsEl = document.getElementById('controls');
  const toggleBtn = document.getElementById('toggle-btn');
  toggleBtn.addEventListener('click', () => {
    controlsEl.classList.toggle('collapsed');
    toggleBtn.innerHTML = controlsEl.classList.contains('collapsed') ? '&#x25BC;' : '&#x25B2;';
  });

  // Pattern buttons
  renderPatternButtons();

  // Save pattern from selection
  document.getElementById('save-pattern-btn').addEventListener('click', savePatternFromSelection);

  // Stamp override toggle
  const overrideBtn = document.getElementById('stamp-override-btn');
  overrideBtn.addEventListener('click', () => {
    interaction.stampOverride = !interaction.stampOverride;
    overrideBtn.classList.toggle('active', interaction.stampOverride);
    persistSettings();
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

  // Sync DOM to loaded state
  speedSlider.value = sim.speed;
  speedVal.textContent = sim.speed;
  syncToggleUI('birth-toggles', sim.birthRule);
  syncToggleUI('survival-toggles', sim.survivalRule);
  mutationSlider.value = Math.round(sim.mutationRate * 1000);
  mutationVal.value = formatRate(sim.mutationRate);
  seedSlider.value = Math.round(seedRate * 1000);
  seedVal.value = formatRate(seedRate);
  seedSizeSlider.value = Math.round(seedSizePct * 1000);
  seedSizeVal.value = formatRate(seedSizePct);
  gridSizeSlider.value = GRID_SIZE;
  gridSizeVal.value = GRID_SIZE;
  pendingGridSize = GRID_SIZE;
  batchSizeSlider.value = interaction.batchSize;
  batchSizeVal.value = interaction.batchSize;
  batchSizeRow.style.display = interaction.brush === 'batch' ? '' : 'none';
  document.querySelectorAll('.brush-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.brush === interaction.brush);
  });
  eraserBtn.classList.toggle('active', interaction.eraser);
  overrideBtn.classList.toggle('active', interaction.stampOverride);

  // Initial info
  updateInfo();
}
