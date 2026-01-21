export function fitSize(w, h, maxSide = 1400) {
  const scale = Math.min(1, maxSide / Math.max(w, h));
  return { w: Math.round(w * scale), h: Math.round(h * scale), scale };
}

export function loadImageToSourceCanvas(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };
    img.src = url;
  });
}

// Common helpers
export function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

export function luminance01(r, g, b) {
  // sRGB-ish luminance
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
