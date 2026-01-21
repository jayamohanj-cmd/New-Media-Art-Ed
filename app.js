import { loadImageToSourceCanvas, fitSize } from "./core/image.js";
import { buildEffectUI } from "./core/ui.js";

import { posterizeGradientEffect } from "./effects/posterizeGradient.js";
import { halftoneEffect } from "./effects/halftone.js";
import { stippleEffect } from "./effects/stipple.js";

// --------------------
// Effect registry
// --------------------
const effects = [
  posterizeGradientEffect,
  halftoneEffect,
  stippleEffect,
];

// --------------------
// DOM references
// --------------------
const fileEl = document.getElementById("file");
const effectSelect = document.getElementById("effectSelect");
const controlsRoot = document.getElementById("controls");
const resetBtn = document.getElementById("reset");
const exportBtn = document.getElementById("export");

const statusEl = document.getElementById("status");
const dimsEl = document.getElementById("dims");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

// Offscreen source canvas (keeps original image)
const srcCanvas = document.createElement("canvas");
const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });

let currentEffect = effects[0];
let state = currentEffect.defaultState();
let hasImage = false;

// --------------------
// Helpers
// --------------------
function setCanvasSize(w, h) {
  canvas.width = w;
  canvas.height = h;
  srcCanvas.width = w;
  srcCanvas.height = h;
}

function populateEffectSelect() {
  effectSelect.innerHTML = effects
    .map((e) => `<option value="${e.id}">${e.name}</option>`)
    .join("");
  effectSelect.value = currentEffect.id;
}

function render() {
  if (!hasImage) return;

  currentEffect.render({
    srcCtx,
    srcCanvas,
    outCtx: ctx,
    outCanvas: canvas,
    state,
  });
}

function rebuildControls() {
  controlsRoot.innerHTML = "";
  buildEffectUI({
    root: controlsRoot,
    effect: currentEffect,
    state,
    onChange: (next) => {
      state = next;
      render();
    },
  });
}

// --------------------
// Image loading
// --------------------
async function handleFile(file) {
  statusEl.textContent = `Loading: ${file.name}…`;

  const img = await loadImageToSourceCanvas(file);
  const fitted = fitSize(img.width, img.height, 1400);

  setCanvasSize(fitted.w, fitted.h);

  srcCtx.clearRect(0, 0, fitted.w, fitted.h);
  srcCtx.drawImage(img, 0, 0, fitted.w, fitted.h);

  hasImage = true;
  statusEl.textContent = `Loaded: ${file.name}`;
  dimsEl.textContent = `${fitted.w}×${fitted.h} (scaled ${(fitted.scale * 100).toFixed(0)}%)`;

  render();
}

// --------------------
// Event listeners
// --------------------
fileEl.addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;

  handleFile(f).catch((err) => {
    console.error(err);
    statusEl.textContent = "Failed to load image. Check Console.";
  });
});

effectSelect.addEventListener("change", () => {
  const next = effects.find((e) => e.id === effectSelect.value);
  if (!next) return;

  currentEffect = next;
  state = currentEffect.defaultState();
  rebuildControls();
  render();
});

resetBtn.addEventListener("click", () => {
  state = currentEffect.defaultState();
  rebuildControls();
  render();
});

exportBtn.addEventListener("click", () => {
  if (!hasImage) return;

  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${currentEffect.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, "image/png");
});

// --------------------
// Init
// --------------------
populateEffectSelect();
rebuildControls();
