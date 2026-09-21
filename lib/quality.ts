export interface Quality {
  ok: boolean;
  issue: "blurry" | "dark" | "bright" | null;
  sharpness: number;
  brightness: number;
}

export const MIN_SHARPNESS = 60;
export const MIN_BRIGHTNESS = 60;
export const MAX_BRIGHTNESS = 190;
const SIDE = 256;

export function measureQuality(src: string): Promise<Quality> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = SIDE / Math.max(img.width, img.height);
      const w = Math.round(img.width * k), h = Math.round(img.height * k);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      const px = ctx.getImageData(0, 0, w, h).data;
      const g = new Float32Array(w * h);
      let sum = 0;
      for (let i = 0; i < w * h; i++) {
        g[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
        sum += g[i];
      }
      const brightness = sum / (w * h);
      let n = 0, s1 = 0, s2 = 0;
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const lap = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
        s1 += lap; s2 += lap * lap; n++;
      }
      const sharpness = s2 / n - (s1 / n) ** 2;
      const issue = brightness < MIN_BRIGHTNESS ? "dark" : brightness > MAX_BRIGHTNESS ? "bright" : sharpness < MIN_SHARPNESS ? "blurry" : null;
      resolve({ ok: issue === null, issue, sharpness, brightness });
    };
    img.onerror = reject;
    img.src = src;
  });
}

export const QUALITY_MESSAGE: Record<string, string> = {
  blurry: "Too blurry. Hold steady and retake",
  dark: "Too dark. Move to better light",
  bright: "Too bright. Avoid direct glare",
};

export type BadKind = "blurry" | "dark" | "bright";

const FILTERS: Record<BadKind, string> = {
  blurry: "blur(6px)",
  dark: "brightness(0.3)",
  bright: "brightness(2.4)",
};

export function degradePhoto(src: string, kind: BadKind): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.filter = FILTERS[kind];
      ctx.drawImage(img, 0, 0);
      resolve(c.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = reject;
    img.src = src;
  });
}
