import { clamp01, luminance01, lerp } from "../core/image.js";

const GRADIENTS = {
  "Magma": [
    [0.00, "#000004"],
    [0.20, "#2c115f"],
    [0.45, "#721f81"],
    [0.70, "#b63679"],
    [1.00, "#fbfcbf"],
  ],
  "Ocean": [
    [0.00, "#03045e"],
    [0.35, "#0077b6"],
    [0.65, "#00b4d8"],
    [1.00, "#caf0f8"],
  ],
  "Sunrise": [
    [0.00, "#0b1320"],
    [0.30, "#5b1a5f"],
    [0.60, "#ff4d6d"],
    [1.00, "#ffe66d"],
  ],
  "Neon": [
    [0.00, "#0b0c10"],
    [0.35, "#00f5d4"],
    [0.65, "#7b2cff"],
    [1.00, "#f15bb5"],
  ],
  "Duotone (Indigo→Cream)": [
    [0.00, "#1b1b3a"],
    [1.00, "#f7f3e3"],
  ],
  "Grayscale": [
    [0.00, "#000000"],
    [1.00, "#ffffff"],
  ],
};

function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function sampleGradient(stops, t) {
  if (t <= stops[0][0]) return hexToRgb(stops[0][1]);
  if (t >= stops[stops.length - 1][0]) return hexToRgb(stops[stops.length - 1][1]);

  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const u = (t - t0) / (t1 - t0 || 1e-9);
      const a = hexToRgb(c0);
      const b = hexToRgb(c1);
      return {
        r: Math.round(lerp(a.r, b.r, u)),
        g: Math.round(lerp(a.g, b.g, u)),
        b: Math.round(lerp(a.b, b.b, u)),
      };
    }
  }
  return hexToRgb(stops[stops.length - 1][1]);
}

function posterize01(t, levels) {
  const L = Math.max(2, levels | 0);
  const q = Math.round(t * (L - 1)) / (L - 1);
  return clamp01(q);
}

export const posterizeGradientEffect = {
  id: "posterize-gradient",
  name: "Posterize + Gradient Map",

  defaultState() {
    return {
      levels: 6,
      preset: "Magma",
      mix: 100,     // 0..100
      gamma: 1.0,   // 0.5..2.5
    };
  },

  controls(state) {
    return [
      {
        key: "levels",
        type: "range",
        label: "Posterize Levels",
        min: 2, max: 24, step: 1,
        hint: "Lower = chunkier tones. Higher = smoother.",
        format: (v) => String(v),
      },
      {
        key: "preset",
        type: "select",
        label: "Gradient Preset",
        options: Object.keys(GRADIENTS).map(k => ({ value: k, label: k })),
        hint: "Maps darkest → lightest tones to this gradient.",
      },
      {
        key: "mix",
        type: "range",
        label: "Mix (Original ↔ Effect)",
        min: 0, max: 100, step: 1,
        format: (v) => `${v}%`,
      },
      {
        key: "gamma",
        type: "range",
        label: "Gamma (Tonal Bias)",
        min: 50, max: 250, step: 1,
        valueFromInput: (raw) => parseInt(raw, 10) / 100,
        format: (v) => v.toFixed(2),
        hint: "Below 1 brightens mids; above 1 darkens mids.",
      },
    ];
  },

  render({ srcCtx, srcCanvas, outCtx, outCanvas, state }) {
    const { levels, preset, mix, gamma } = state;
    const m = clamp01(mix / 100);
    const stops = GRADIENTS[preset] ?? GRADIENTS["Magma"];

    const img = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
    const d = img.data;

    const out = outCtx.createImageData(img.width, img.height);
    const o = out.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];

      let t = luminance01(r, g, b);
      t = Math.pow(clamp01(t), gamma);
      t = posterize01(t, levels);

      const mapped = sampleGradient(stops, t);

      o[i]     = Math.round(lerp(r, mapped.r, m));
      o[i + 1] = Math.round(lerp(g, mapped.g, m));
      o[i + 2] = Math.round(lerp(b, mapped.b, m));
      o[i + 3] = a;
    }

    outCanvas.width = img.width;
    outCanvas.height = img.height;
    outCtx.putImageData(out, 0, 0);
  },
};
