import { clamp01, luminance01 } from "../core/image.js";

function degToRad(d) { return (d * Math.PI) / 180; }

export const halftoneEffect = {
  id: "halftone",
  name: "Halftone (Dots)",

  defaultState() {
    return {
      spacing: 10,     // px
      maxDot: 9,       // px
      angle: 15,       // degrees
      contrast: 1.1,   // 0.5..2.0
      invert: 0,       // 0/1
      bg: "#ffffff",
      ink: "#000000",
    };
  },

  controls(state) {
    return [
      {
        key: "spacing",
        type: "range",
        label: "Dot Spacing",
        min: 4, max: 30, step: 1,
        hint: "Larger spacing = fewer dots, more graphic look.",
      },
      {
        key: "maxDot",
        type: "range",
        label: "Max Dot Size",
        min: 1, max: 24, step: 1,
        hint: "How large the darkest dots get.",
      },
      {
        key: "angle",
        type: "range",
        label: "Screen Angle",
        min: 0, max: 90, step: 1,
        format: (v) => `${v}°`,
      },
      {
        key: "contrast",
        type: "range",
        label: "Contrast",
        min: 50, max: 200, step: 1,
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
      { type: "note", text: "Colors are fixed for now (white paper + black ink). Easy to add color pickers next." },
    ];
  },

  render({ srcCtx, srcCanvas, outCtx, outCanvas, state }) {
    const w = srcCanvas.width, h = srcCanvas.height;
    outCanvas.width = w; outCanvas.height = h;

    const img = srcCtx.getImageData(0, 0, w, h);
    const d = img.data;

    // Clear with "paper"
    outCtx.clearRect(0, 0, w, h);
    outCtx.fillStyle = "#ffffff";
    outCtx.fillRect(0, 0, w, h);
    outCtx.fillStyle = "#000000";

    const spacing = Math.max(2, state.spacing);
    const maxDot = Math.max(0.5, state.maxDot);
    const angle = degToRad(state.angle);
    const contrast = state.contrast;
    const invert = !!state.invert;

    // Rotate sampling grid around center
    const cx = w / 2, cy = h / 2;
    const cos = Math.cos(angle), sin = Math.sin(angle);

    // Sample over a bounding square in rotated coordinates
    // We'll step in rotated space then map back.
    const diag = Math.ceil(Math.sqrt(w * w + h * h));
    const half = diag / 2;

    // Slight speed improvement: precompute a function to read luminance at pixel
    function lumAt(x, y) {
      const ix = Math.max(0, Math.min(w - 1, x | 0));
      const iy = Math.max(0, Math.min(h - 1, y | 0));
      const idx = (iy * w + ix) * 4;
      let t = luminance01(d[idx], d[idx + 1], d[idx + 2]);
      // Contrast about mid gray (0.5)
      t = clamp01((t - 0.5) * contrast + 0.5);
      if (invert) t = 1 - t;
      return t;
    }

    for (let ry = -half; ry <= half; ry += spacing) {
      for (let rx = -half; rx <= half; rx += spacing) {
        // Map rotated grid point back to image space
        const x = cx + rx * cos - ry * sin;
        const y = cy + rx * sin + ry * cos;

        if (x < 0 || x >= w || y < 0 || y >= h) continue;

        const t = lumAt(x, y); // 0..1 (light..dark if invert off? Actually luminance)
        // We want darker -> bigger dot
        const darkness = 1 - t;
        const r = darkness * (maxDot / 2);

        if (r <= 0.05) continue;

        outCtx.beginPath();
        outCtx.arc(x, y, r, 0, Math.PI * 2);
        outCtx.fill();
      }
    }
  },
};
