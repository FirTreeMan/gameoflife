# Conway's Game of Life

A browser-based cellular automaton simulator with a 1000x1000 grid, custom rules, pattern library, and random mutation support. Built with vanilla HTML, CSS, and JavaScript ES Modules — no dependencies or build tools.

## Features

- **1000x1000 grid** with sparse storage (only live cells use memory)
- **Pan and zoom** — right-click drag to pan, scroll wheel to zoom, +/- buttons, fit-to-content
- **Draw and erase** — left-click to toggle cells, drag to paint with Bresenham interpolation
- **Step-by-step or automatic** simulation with adjustable speed (1–60 steps/s)
- **Custom rules** — toggle birth/survival neighbor counts (0–8) for any outer-totalistic rule
- **Random mutation** — configurable per-step toggle probability with cubic-mapped slider
- **Pattern library** — Glider, LWSS, Pulsar, R-pentomino, Gosper Glider Gun, Pentadecathlon
- **Stamp mode** — select a pattern, preview on hover, click to place, R to rotate
- **Population sparkline** — live graph of population over the last 200 generations
- **Keyboard shortcuts** — Space (play/pause), N (step), R (reset/rotate), Escape (cancel stamp)

## File Structure

```
index.html      — HTML shell
style.css       — Stylesheet
js/
  main.js       — Entry point
  state.js      — Shared state, constants, pattern data
  simulation.js — Game of Life step logic, mutation
  renderer.js   — Canvas rendering, coordinate conversion
  viewport.js   — Pan, zoom, fit-to-content
  input.js      — Mouse, wheel, keyboard handlers
  ui.js         — Control panel bindings, sparkline
```

## Usage

Open `index.html` in any modern browser. ES Modules require serving over HTTP — use any static server:

```bash
# Python
python3 -m http.server 8000

# Node.js
npx serve .
```

Then open `http://localhost:8000`.

### Controls

| Control | Action |
|---------|--------|
| Left click / drag | Place or remove cells |
| Right click + drag | Pan the viewport |
| Scroll wheel | Zoom in/out (toward cursor) |
| Step / N | Advance one generation |
| Play / Space | Start/stop automatic stepping |
| Reset / R | Clear all cells and reset generation |
| Speed slider | Adjust steps per second (1–60) |
| B / S toggles | Toggle birth/survival rules by clicking digits 0–8 |
| Mutation slider | Set per-step random toggle probability |
| Pattern buttons | Select a pattern to stamp |
| R (in stamp mode) | Rotate pattern 90° clockwise |
| Escape | Cancel stamp mode |
| +/- buttons | Zoom in/out from center |
| Fit button | Auto-zoom to fit all live cells |

### Deploying to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to **Deploy from a branch**, select **main** and **/ (root)**
4. Your site will be live at `https://<username>.github.io/<repo>/`

> **Note:** GitHub Pages serves files over HTTP, so ES Modules work without issues.

## License

MIT
