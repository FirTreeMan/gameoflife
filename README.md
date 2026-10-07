# Conway's Game of Life

A browser-based cellular automaton simulator with a configurable toroidal grid, custom rules, brushes, pattern library, clipboard support, and random mutation. Built with vanilla HTML, CSS, and JavaScript ES Modules — no dependencies or build tools. All settings persist across sessions via localStorage.

## Features

### Simulation
- **Configurable grid** (10–5000 cells per side, default 1000) with sparse storage — only live cells use memory
- **Toroidal wrapping** — cells on one edge neighbor cells on the opposite edge
- **Custom rules** — toggle birth/survival neighbor counts (0–8) for any outer-totalistic rule
- **Random mutation** — configurable per-step toggle rate and region size (centered on grid)
- **Seed center** — populate a configurable region with random cells at a given density
- **Rule management** — save, load, copy, paste, and randomize rulesets in B/S notation

### Drawing
- **Brushes** — Default (single cell), Circle (adjustable radius), Line (orthogonal/diagonal snapping), Select (rectangle)
- **Eraser mode** — toggle to remove cells instead of placing them
- **Bresenham interpolation** — smooth drawing at any speed

### Selection & Patterns
- **Select tool** — drag a rectangle to select a region; dimensions shown at the cursor
- **Copy/Paste** — Ctrl+C copies live cells within the selection; Ctrl+V pastes at the selection origin
- **Delete** — press Delete/Backspace to clear all cells in the selection
- **Save as pattern** — save a selection as a reusable named pattern
- **Stamp mode** — select a pattern, preview on hover, click to place, R to rotate
- **Override mode** — when enabled, stamping and pasting clear all cells in the bounding box first

### Viewport
- **Pan** — right-click drag or middle-click drag
- **Zoom** — scroll wheel (toward cursor), +/- buttons, or fit-to-content
- **Population sparkline** — live graph of population over the last 200 generations

### Persistence
All customizable options are saved to localStorage and restored on reload:
- Simulation speed, rules, mutation rate/size, seed center rate/size, grid size
- Brush type, circle brush size, eraser toggle, override toggle
- Saved rulesets and saved patterns

## File Structure

```
index.html      — HTML shell with left control panel and right toolbar
style.css       — Stylesheet
js/
  main.js       — Entry point, wires modules together
  state.js      — Shared state, constants, pattern rotation, bounds helpers
  simulation.js — Step logic, mutation, seed center, Floyd's sampling
  renderer.js   — Canvas rendering, coordinate conversion, previews
  viewport.js   — Pan, zoom, fit-to-content
  input.js      — Mouse, wheel, keyboard event handlers
  ui.js         — Control panel bindings, persistence, sparkline
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / pause simulation |
| N | Advance one generation |
| R | Reset (or rotate pattern in stamp mode) |
| 1 | Default brush |
| 2 | Circle brush |
| 3 | Line brush |
| 4 | Select brush |
| E | Toggle eraser |
| Ctrl+C | Copy selection to clipboard |
| Ctrl+V | Paste clipboard into selection |
| Delete / Backspace | Clear cells in selection |
| Escape | Cancel stamp mode or clear selection |

### Mouse Controls

| Input | Action |
|-------|--------|
| Left click / drag | Draw or erase cells (depends on brush and eraser mode) |
| Right click + drag | Pan the viewport |
| Middle click + drag | Pan the viewport |
| Scroll wheel | Zoom in/out toward cursor |

## License

MIT
