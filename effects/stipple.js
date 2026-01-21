import { clamp01, luminance01 } from "../core/image.js";

function mulberry32(seed) {
  let t = seed >>> 0;
  return function() {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export const stippleEffect = {
  id: "stipple",
  name: "Stipple (Simple)",

  defaultState() {
    return {
      contrast: 1.2,   // preprocess contrast 0.5..2.0
      dots: 18000,     // number of samples
      dotSize: 2.0,    // base dot radius
      sizeJitter: 0.8, // 0..2
      seed: 1,         // deterministic
      invert: 0,       // 0/1
    };
  },

  controls(state) {
    return [
      {
        key: "contrast",
        type: "range",
        label: "Pre-Contrast",
        min: 50, max: 200, step: 1,
        valueFromInput: (raw) => parseInt(raw, 10) / 100,
        format: (v) => v.toFixed(2),
        hint: "Adjust contrast BEFORE stippling (your requirement).",
      },
      {
        key: "dots",
        type: "range",
        label: "Dot Count",
        min: 1000, max: 50000, step: 500,
        hint: "More dots = richer shadows, but slower.",
      },
      {
        key: "dotSize",
        type: "range",
        label: "Dot Size",
        min: 5, max: 60, step: 1,
        valueFromInput: (raw) => parseInt(raw, 10) / 10,
        format: (v) => `${v.toFixed(1)} px`,
      },
      {
        key: "sizeJitter",
        type: "range",
        label: "Size Jitter",
        min: 0, max: 200, step: 1,
        valueFromInput: (raw) => parseInt(raw, 10) / 100,
        format: (v) => v.toFixed(2),
      },
      {
        key: "invert",
        type: "range",
        label: "Invert",
        min: 0, max: 1, step: 1,
        format: (v) => (v ? "On" : "Off"),
      },
      {
        key: "seed",
        type: "range",
        label: "Seed",
        min: 1, max: 20, step: 1,
        hint: "Changes the dot pattern (useful for exploration).",
      },
      { type: "note", text: "This is a simple weighted-random stipple. Next upgrade: Poisson disk + Web Worker for smoother spacing." },
    ];
  },

  render({ srcCtx, srcCanvas, outCtx, outCanvas, state }) {
    const w = srcCanvas.width, h = srcCanvas.height;
    outCanvas.width = w; outCanvas.height = h;

    const img = srcCtx.getImageData(0, 0, w, h);
    const d = img.data;

    // Clear (paper)
    outCtx.clearRect(0, 0, w, h);
    outCtx.fillStyle = "#ffffff";
    outCtx.fillRect(0, 0, w, h);

    outCtx.fillStyle = "#000000";

    const contrast = state.contrast;
    const invert = !!state.invert;
    const N = Math.max(100, state.dots | 0);
    const baseR = Math.max(0.2, state.dotSize);
    const jitter = Math.max(0, state.sizeJitter);
    const rand = mulberry32(state.seed);

    function darknessAt(ix, iy) {
      const x = Math.max(0, Math.min(w - 1, ix | 0));
      const y = Math.max(0, Math.min(h - 1, iy | 0));
      const idx = (y * w + x) * 4;
      let t = luminance01(d[idx], d[idx + 1], d[idx + 2]); // 0 light .. 1 light?? (luminance)
      // Contrast around 0.5 (preprocess)
      t = clamp01((t - 0.5) * contrast + 0.5);
      if (invert) t = 1 - t;
      return 1 - t; // darkness 0..1
    }

    // Weighted rejection sampling:
    // pick random pixel; accept with probability = darkness
    // draw dot when accepted
    let attempts = 0;
    let placed = 0;
    const maxAttempts = N * 20; // safety

    while (placed < N && attempts < maxAttempts) {
      attempts++;

      const x = rand() * w;
      const y = rand() * h;
      const dark = darknessAt(x, y);

      if (rand() <= dark) {
        const r = baseR * (0.5 + dark) * (1 + (rand() - 0.5) * 2 * jitter);
        const rr = Math.max(0.15, r);

        outCtx.beginPath();
        outCtx.arc(x, y, rr, 0, Math.PI * 2);
        outCtx.fill();
        placed++;
      }
    }

    // If image is very bright, you may not reach N dots. That's expected.
  },
};
