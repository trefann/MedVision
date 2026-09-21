/* eslint-disable @typescript-eslint/no-explicit-any */
export const TIER_LABELS = ["Benign", "Monitor", "Refer"] as const;
export const GRID = 5;

export interface Analysis {
  tier: 0 | 1 | 2;
  probs: number[];
  flagScore: number;
  heat: number[];
  photoIndex: number;
  perPhotoTiers: number[];
}

const SIZE = 224;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

let engine: Promise<{ ort: any; session: any; thr: number }> | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if ((window as any).ort) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

function getEngine() {
  if (!engine) {
    engine = (async () => {
      await loadScript("/ort/ort.wasm.min.js");
      const ort = (window as any).ort;
      ort.env.wasm.wasmPaths = "/ort/";
      ort.env.wasm.numThreads = 1;
      const thr = (await (await fetch("/models/threshold.json")).json()).benign_threshold as number;
      const session = await ort.InferenceSession.create("/models/triage.onnx", { executionProviders: ["wasm"] });
      return { ort, session, thr };
    })().catch((e) => {
      engine = null;
      throw e;
    });
  }
  return engine;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function toTensorData(src: string) {
  const img = await loadImage(src);
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  const px = ctx.getImageData(0, 0, SIZE, SIZE).data;
  const data = new Float32Array(3 * SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    for (let ch = 0; ch < 3; ch++) {
      data[ch * SIZE * SIZE + i] = (px[i * 4 + ch] / 255 - MEAN[ch]) / STD[ch];
    }
  }
  return data;
}

function softmax(z: ArrayLike<number>) {
  const m = Math.max(...Array.from(z));
  const e = Array.from(z).map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

function decide(p: number[], thr: number): 0 | 1 | 2 {
  if (p[0] >= thr) return 0;
  return p[1] >= p[2] ? 1 : 2;
}

async function analyseOne(src: string, withHeat = true) {
  const { ort, session, thr } = await getEngine();
  const base = await toTensorData(src);

  const patch = 64;
  const stride = (SIZE - patch) / (GRID - 1);
  const n = withHeat ? GRID * GRID : 0;
  const batch = new Float32Array((n + 1) * base.length);
  batch.set(base, 0);
  for (let gy = 0; gy < (withHeat ? GRID : 0); gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const off = (1 + gy * GRID + gx) * base.length;
      batch.set(base, off);
      const x0 = Math.round(gx * stride);
      const y0 = Math.round(gy * stride);
      for (let ch = 0; ch < 3; ch++) {
        for (let y = y0; y < y0 + patch; y++) {
          batch.fill(0, off + ch * SIZE * SIZE + y * SIZE + x0, off + ch * SIZE * SIZE + y * SIZE + x0 + patch);
        }
      }
    }
  }
  const out = await session.run({ input: new ort.Tensor("float32", batch, [n + 1, 3, SIZE, SIZE]) });
  const logits = out.logits.data as Float32Array;
  const rows = Array.from({ length: n + 1 }, (_, i) => softmax(logits.slice(i * 3, i * 3 + 3)));
  const probs = rows[0];
  const flagScore = 1 - probs[0];
  const drops = rows.slice(1).map((r) => Math.max(0, flagScore - (1 - r[0])));
  const peak = Math.max(...drops, 1e-6);
  const heat = withHeat ? drops.map((d) => d / peak) : new Array<number>(GRID * GRID).fill(0);
  return { probs, flagScore, tier: decide(probs, thr), heat };
}

export async function analysePhotos(photos: (string | null)[]): Promise<Analysis | null> {
  const results: { i: number; r: Awaited<ReturnType<typeof analyseOne>> }[] = [];
  for (let i = 0; i < photos.length; i++) {
    const src = photos[i];
    if (src) results.push({ i, r: await analyseOne(src, false) });
  }
  if (!results.length) return null;
  const worst = results.reduce((a, b) =>
    b.r.tier > a.r.tier || (b.r.tier === a.r.tier && b.r.flagScore > a.r.flagScore) ? b : a
  );
  worst.r = await analyseOne(photos[worst.i]!, true);
  const perPhotoTiers = photos.map((_, i) => results.find((x) => x.i === i)?.r.tier ?? -1);
  return { ...worst.r, photoIndex: worst.i, perPhotoTiers };
}

export function downscaleFile(file: File, max = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function urlToDataUrl(url: string) {
  const blob = await (await fetch(url)).blob();
  return downscaleFile(new File([blob], "s.jpg", { type: blob.type }));
}

export async function saliencySeed(src: string) {
  const r = await analyseOne(src);
  const k = r.heat.indexOf(Math.max(...r.heat));
  const stride = (SIZE - 64) / (GRID - 1);
  return { x: ((k % GRID) * stride + 32) / SIZE, y: (Math.floor(k / GRID) * stride + 32) / SIZE };
}

let segEngine: Promise<{ ort: any; session: any }> | null = null;

function getSegEngine() {
  if (!segEngine) {
    segEngine = (async () => {
      await loadScript("/ort/ort.wasm.min.js");
      const ort = (window as any).ort;
      ort.env.wasm.wasmPaths = "/ort/";
      ort.env.wasm.numThreads = 1;
      const session = await ort.InferenceSession.create("/models/seg.onnx", { executionProviders: ["wasm"] });
      return { ort, session };
    })().catch((e) => {
      segEngine = null;
      throw e;
    });
  }
  return segEngine;
}

export const SEG_SIZE = 256;

export async function segmentProb(source: HTMLCanvasElement): Promise<Float32Array> {
  const { ort, session } = await getSegEngine();
  const c = document.createElement("canvas");
  c.width = c.height = SEG_SIZE;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(source, 0, 0, SEG_SIZE, SEG_SIZE);
  const px = ctx.getImageData(0, 0, SEG_SIZE, SEG_SIZE).data;
  const n = SEG_SIZE * SEG_SIZE;
  const data = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    for (let ch = 0; ch < 3; ch++) data[ch * n + i] = (px[i * 4 + ch] / 255 - MEAN[ch]) / STD[ch];
  }
  const out = await session.run({ input: new ort.Tensor("float32", data, [1, 3, SEG_SIZE, SEG_SIZE]) });
  return out.prob.data as Float32Array;
}
