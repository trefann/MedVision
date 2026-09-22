/* eslint-disable @typescript-eslint/no-explicit-any */
import { SEG_SIZE, segmentProb } from "@/lib/triage";

export interface ChangeResult {
  ok: boolean;
  reason?: string;
  growthPct: number;
  deltaE: number;
  areaOld: number;
  areaNew: number;
  inliers: number;
  matches: number;
  scale: number;
  warnings: string[];
  thr: number;
  areaFrac: number;
  method: "model" | "colour";
  oldOverlay: string;
  newOverlay: string;
}

// One threshold everywhere. Repeated measurement of an *unchanged* real lesion moved
// by a median of 10% and up to 45% (see ml/out/seg_repeatability.json), so a single
// comparison above this is provisional, not proof of growth.
export const GROWTH_CONCERN_PCT = 30;
// A single-visit jump this large sits far enough outside the measured noise band
// (max observed 45%) that it is treated as urgent without waiting for a second visit.
export const GROWTH_URGENT_PCT = 60;

export type GrowthVerdict = "stable" | "provisional" | "urgent";

/**
 * growthPct: latest visit-to-visit change. priorGrowthPct: the change measured at the
 * previous comparison, if any. Growth above GROWTH_CONCERN_PCT only becomes "urgent"
 * once it repeats across two consecutive visits (or is extreme enough on its own).
 */
export function classifyGrowth(growthPct: number, priorGrowthPct?: number | null): GrowthVerdict {
  if (growthPct > GROWTH_URGENT_PCT) return "urgent";
  if (growthPct > GROWTH_CONCERN_PCT) {
    if (priorGrowthPct != null && priorGrowthPct > GROWTH_CONCERN_PCT) return "urgent";
    return "provisional";
  }
  return "stable";
}

const WORK = 480;

let cvP: Promise<any> | null = null;

export function loadCv(): Promise<any> {
  if (!cvP) {
    cvP = (async () => {
      const w = window as any;
      if (!w.cv) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement("script");
          s.src = "/opencv/opencv.js";
          s.onload = () => res();
          s.onerror = () => rej(new Error("Failed to load OpenCV"));
          document.head.appendChild(s);
        });
      }
      let c = w.cv;
      if (c && typeof c.then === "function") c = await c;
      else if (c && !c.Mat) await new Promise<void>((r) => (c.onRuntimeInitialized = () => r()));
      return c;
    })().catch((e) => {
      cvP = null;
      throw e;
    });
  }
  return cvP;
}

export function imageToCanvas(src: string, max = WORK): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c);
    };
    img.onerror = reject;
    img.src = src;
  });
}

interface Seg {
  area: number;
  meanLab: number[];
  mask: any;
  frame: number;
  thr: number;
  stats: number[][];
}

const THRS = Array.from({ length: 19 }, (_, i) => 4 + i * 2);

function segment(cv: any, rgba: any, sx: number, sy: number, del: any[], fixedThr?: number, ref?: number[][]): Seg {
  const M = () => { const m = new cv.Mat(); del.push(m); return m; };
  const rgb = M(), lab = M();
  cv.cvtColor(rgba, rgb, cv.COLOR_RGBA2RGB);
  cv.cvtColor(rgb, lab, cv.COLOR_RGB2Lab);
  cv.GaussianBlur(lab, lab, new cv.Size(9, 9), 0);
  const w = lab.cols, h = lab.rows, d = lab.data, N = w * h;

  const mu = [0, 0, 0], sd = [0, 0, 0];
  for (let i = 0; i < N; i++) for (let c = 0; c < 3; c++) mu[c] += d[i * 3 + c];
  for (let c = 0; c < 3; c++) mu[c] /= N;
  for (let i = 0; i < N; i++) for (let c = 0; c < 3; c++) sd[c] += (d[i * 3 + c] - mu[c]) ** 2;
  for (let c = 0; c < 3; c++) sd[c] = Math.sqrt(sd[c] / N) || 1;
  if (ref) {
    for (let i = 0; i < N; i++) for (let c = 0; c < 3; c++) {
      d[i * 3 + c] = Math.max(0, Math.min(255, (d[i * 3 + c] - mu[c]) * (ref[1][c] / sd[c]) + ref[0][c]));
    }
  }

  sx = Math.max(6, Math.min(w - 7, Math.round(sx)));
  sy = Math.max(6, Math.min(h - 7, Math.round(sy)));
  const s0 = [0, 0, 0]; let n = 0;
  for (let y = sy - 5; y <= sy + 5; y++) for (let x = sx - 5; x <= sx + 5; x++) {
    const i = (y * w + x) * 3; s0[0] += d[i]; s0[1] += d[i + 1]; s0[2] += d[i + 2]; n++;
  }
  s0[0] /= n; s0[1] /= n; s0[2] /= n;

  const dist = new Float32Array(N);
  const computeDist = (c0: number[]) => {
    for (let i = 0; i < N; i++) {
      dist[i] = Math.sqrt(0.25 * (d[i * 3] - c0[0]) ** 2 + (d[i * 3 + 1] - c0[1]) ** 2 + (d[i * 3 + 2] - c0[2]) ** 2);
    }
  };
  computeDist(s0);
  const k = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3)); del.push(k);

  const component = (thr: number, clean: boolean, wantMask: boolean) => {
    const mask = new cv.Mat(h, w, cv.CV_8UC1, new cv.Scalar(0));
    for (let i = 0; i < N; i++) if (dist[i] < thr) mask.data[i] = 255;
    if (clean) { cv.morphologyEx(mask, mask, cv.MORPH_OPEN, k); cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, k); }
    const labels = new cv.Mat();
    cv.connectedComponents(mask, labels, 8, cv.CV_32S);
    let label = labels.intAt(sy, sx);
    if (!label) {
      outer: for (let r = 1; r <= 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const yy = sy + dy, xx = sx + dx;
        if (yy < 0 || xx < 0 || yy >= h || xx >= w) continue;
        const l = labels.intAt(yy, xx);
        if (l) { label = l; break outer; }
      }
    }
    const ld = labels.data32S;
    const out = wantMask ? new cv.Mat(h, w, cv.CV_8UC1, new cv.Scalar(0)) : null;
    let area = 0, touches = false; const mean = [0, 0, 0];
    if (label) {
      for (let i = 0; i < N; i++) if (ld[i] === label) {
        area++;
        const x = i % w, y = (i / w) | 0;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true;
        if (out) { out.data[i] = 255; mean[0] += d[i * 3]; mean[1] += d[i * 3 + 1]; mean[2] += d[i * 3 + 2]; }
      }
    }
    mask.delete(); labels.delete();
    return { area, out, mean: area ? mean.map((v) => v / area) : mean, touches };
  };

  const choose = () => {
    const scan = THRS.map((t) => component(t, false, false));
    let bestScore = Infinity, best: number | undefined;
    for (let i = 1; i < THRS.length - 1; i++) {
      const c = scan[i];
      if (c.touches || c.area < 40 || c.area > 0.4 * N) continue;
      const score = (scan[i + 1].area - scan[i - 1].area) / c.area;
      if (score < bestScore) { bestScore = score; best = THRS[i]; }
    }
    return best ?? THRS[Math.max(0, scan.findIndex((c) => c.area >= 40))];
  };
  let thr = fixedThr ?? choose();
  let c = component(thr, true, true);
  for (let pass = 0; pass < 2 && c.area; pass++) {
    computeDist(c.mean);
    if (fixedThr === undefined) thr = choose();
    c.out!.delete();
    c = component(thr, true, true);
  }
  del.push(c.out);
  const mean = c.area ? [(c.mean[0]) * 100 / 255, c.mean[1] - 128, c.mean[2] - 128] : [0, 0, 0];
  return { area: c.area, meanLab: mean, mask: c.out, frame: N, thr, stats: [mu, sd] };
}

function labStats(cv: any, rgba: any, del: any[]) {
  const rgb = new cv.Mat(), lab = new cv.Mat();
  del.push(rgb, lab);
  cv.cvtColor(rgba, rgb, cv.COLOR_RGBA2RGB);
  cv.cvtColor(rgb, lab, cv.COLOR_RGB2Lab);
  const N = lab.rows * lab.cols, d = lab.data;
  const mu = [0, 0, 0], sd = [0, 0, 0];
  for (let i = 0; i < N; i++) for (let c = 0; c < 3; c++) mu[c] += d[i * 3 + c];
  for (let c = 0; c < 3; c++) mu[c] /= N;
  for (let i = 0; i < N; i++) for (let c = 0; c < 3; c++) sd[c] += (d[i * 3 + c] - mu[c]) ** 2;
  for (let c = 0; c < 3; c++) sd[c] = Math.sqrt(sd[c] / N) || 1;
  return [mu, sd];
}

function matchColour(cv: any, rgba: any, ref: number[][], del: any[]) {
  const rgb = new cv.Mat(), lab = new cv.Mat(), out = new cv.Mat();
  del.push(rgb, lab, out);
  cv.cvtColor(rgba, rgb, cv.COLOR_RGBA2RGB);
  cv.cvtColor(rgb, lab, cv.COLOR_RGB2Lab);
  const [mu, sd] = labStats(cv, rgba, del);
  const d = lab.data, N = lab.rows * lab.cols;
  for (let i = 0; i < N; i++) for (let c = 0; c < 3; c++) {
    d[i * 3 + c] = Math.max(0, Math.min(255, (d[i * 3 + c] - mu[c]) * (ref[1][c] / sd[c]) + ref[0][c]));
  }
  cv.cvtColor(lab, rgb, cv.COLOR_Lab2RGB);
  cv.cvtColor(rgb, out, cv.COLOR_RGB2RGBA);
  return out;
}

async function segmentByModel(cv: any, rgba: any, sx: number, sy: number, del: any[]): Promise<Seg> {
  const w = rgba.cols, h = rgba.rows, N = w * h;
  const cnv = document.createElement("canvas");
  cv.imshow(cnv, rgba);
  const prob = await segmentProb(cnv);
  const small = cv.matFromArray(SEG_SIZE, SEG_SIZE, cv.CV_32F, Array.from(prob));
  const big = new cv.Mat();
  del.push(small, big);
  cv.resize(small, big, new cv.Size(w, h), 0, 0, cv.INTER_LINEAR);
  const mask = new cv.Mat(h, w, cv.CV_8UC1, new cv.Scalar(0));
  const pd = big.data32F;
  for (let i = 0; i < N; i++) if (pd[i] > 0.5) mask.data[i] = 255;
  const k = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
  cv.morphologyEx(mask, mask, cv.MORPH_OPEN, k);
  cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, k);
  k.delete();

  const labels = new cv.Mat();
  const count = cv.connectedComponents(mask, labels, 8, cv.CV_32S);
  const ld = labels.data32S;
  const sizes = new Array(count).fill(0);
  for (let i = 0; i < N; i++) sizes[ld[i]]++;
  sx = Math.max(0, Math.min(w - 1, Math.round(sx)));
  sy = Math.max(0, Math.min(h - 1, Math.round(sy)));
  let label = ld[sy * w + sx];
  if (!label) {
    outer: for (let r = 1; r <= 20; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const yy = sy + dy, xx = sx + dx;
      if (yy < 0 || xx < 0 || yy >= h || xx >= w) continue;
      const l = ld[yy * w + xx];
      if (l) { label = l; break outer; }
    }
  }
  if (!label) for (let l = 1; l < count; l++) if (!label || sizes[l] > sizes[label]) label = l;

  const comp = new cv.Mat(h, w, cv.CV_8UC1, new cv.Scalar(0));
  const rgb = new cv.Mat(), lab = new cv.Mat();
  cv.cvtColor(rgba, rgb, cv.COLOR_RGBA2RGB);
  cv.cvtColor(rgb, lab, cv.COLOR_RGB2Lab);
  const d = lab.data;
  let area = 0; const mean = [0, 0, 0];
  if (label) for (let i = 0; i < N; i++) if (ld[i] === label) {
    comp.data[i] = 255; area++;
    mean[0] += d[i * 3]; mean[1] += d[i * 3 + 1]; mean[2] += d[i * 3 + 2];
  }
  mask.delete(); labels.delete(); rgb.delete(); lab.delete();
  del.push(comp);
  const meanLab = area ? [(mean[0] / area) * 100 / 255, mean[1] / area - 128, mean[2] / area - 128] : [0, 0, 0];
  return { area, meanLab, mask: comp, frame: N, thr: 0.5, stats: [] };
}

function overlay(cv: any, rgba: any, mask: any, del: any[]) {
  const out = rgba.clone(); del.push(out);
  const contours = new cv.MatVector(), hier = new cv.Mat();
  cv.findContours(mask, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
  cv.drawContours(out, contours, -1, new cv.Scalar(0, 255, 120, 255), 2);
  contours.delete(); hier.delete();
  const c = document.createElement("canvas");
  cv.imshow(c, out);
  return c.toDataURL("image/jpeg", 0.85);
}

export async function compareVisits(
  oldSrc: string,
  newSrc: string,
  seed: { x: number; y: number },
  opts: { method?: "model" | "colour" } = {}
): Promise<ChangeResult> {
  const cv = await loadCv();
  const del: any[] = [];
  const M = () => { const m = new cv.Mat(); del.push(m); return m; };
  const fail = (reason: string): ChangeResult => ({
    ok: false, reason, growthPct: 0, deltaE: 0, areaOld: 0, areaNew: 0, inliers: 0, matches: 0, scale: 1,
    warnings: [], thr: 0, areaFrac: 0, method: "model", oldOverlay: "", newOverlay: "",
  });
  try {
    const [oc, nc] = await Promise.all([imageToCanvas(oldSrc), imageToCanvas(newSrc)]);
    const a = cv.imread(oc); del.push(a);
    const b = cv.imread(nc); del.push(b);
    const gA = M(), gB = M();
    cv.cvtColor(a, gA, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(b, gB, cv.COLOR_RGBA2GRAY);
    cv.equalizeHist(gA, gA); cv.equalizeHist(gB, gB);

    const orb = new cv.ORB(2000); del.push(orb);
    const kpA = new cv.KeyPointVector(), kpB = new cv.KeyPointVector(); del.push(kpA, kpB);
    const dA = M(), dB = M();
    orb.detectAndCompute(gA, M(), kpA, dA);
    orb.detectAndCompute(gB, M(), kpB, dB);
    if (dA.rows < 10 || dB.rows < 10) return fail("Too few image features to align. Retake with better lighting or focus.");

    const bf = new cv.BFMatcher(cv.NORM_HAMMING, false); del.push(bf);
    const knn = new cv.DMatchVectorVector(); del.push(knn);
    bf.knnMatch(dB, dA, knn, 2);
    const pa: number[] = [], pb: number[] = [];
    for (let i = 0; i < knn.size(); i++) {
      const m = knn.get(i);
      if (m.size() < 2) continue;
      const m1 = m.get(0), m2 = m.get(1);
      if (m1.distance < 0.8 * m2.distance) {
        const q = kpB.get(m1.queryIdx).pt, t = kpA.get(m1.trainIdx).pt;
        pb.push(q.x, q.y); pa.push(t.x, t.y);
      }
    }
    const nm = pa.length / 2;
    if (nm < 12) return fail("Photos do not seem to show the same site (too few matching points).");

    const ptsB = cv.matFromArray(nm, 1, cv.CV_32FC2, pb); del.push(ptsB);
    const ptsA = cv.matFromArray(nm, 1, cv.CV_32FC2, pa); del.push(ptsA);
    const inl = M();
    const H = cv.findHomography(ptsB, ptsA, cv.RANSAC, 4, inl); del.push(H);
    let inliers = 0;
    for (let i = 0; i < inl.rows; i++) if (inl.data[i]) inliers++;
    if (H.empty() || inliers < 12) return fail("Could not align the two photos reliably. Retake from a similar angle.");

    const hd = H.data64F;
    const scale = Math.sqrt(Math.abs((hd[0] * hd[4] - hd[1] * hd[3]) / (hd[8] * hd[8])));
    const warped = M();
    cv.warpPerspective(b, warped, H, new cv.Size(a.cols, a.rows), cv.INTER_LINEAR, cv.BORDER_REPLICATE, new cv.Scalar());

    const sx = seed.x * a.cols, sy = seed.y * a.rows;
    let sO: Seg, sN: Seg, method: "model" | "colour" = "model";
    let warpedForOverlay = warped;
    try {
      if (opts.method === "colour") throw new Error("colour requested");
      const matched = matchColour(cv, warped, labStats(cv, a, del), del);
      warpedForOverlay = matched;
      sO = await segmentByModel(cv, a, sx, sy, del);
      sN = await segmentByModel(cv, matched, sx, sy, del);
    } catch {
      method = "colour";
      warpedForOverlay = warped;
      sO = segment(cv, a, sx, sy, del);
      sN = segment(cv, warped, sx, sy, del, sO.thr, sO.stats);
    }
    const warnings: string[] = [];
    if (inliers / nm < 0.4) warnings.push("Alignment is weak. Retake from a similar angle.");
    if (sO.area < 40 || sN.area < 40) return fail("Could not outline the lesion. Tap directly on it and retry.");
    if (sO.area > 0.35 * sO.frame || sN.area > 0.35 * sN.frame) warnings.push("Outline may be too large. Tap the centre of the lesion.");

    const growthPct = ((sN.area - sO.area) / sO.area) * 100;
    const deltaE = Math.sqrt(sO.meanLab.reduce((s, v, i) => s + (v - sN.meanLab[i]) ** 2, 0));
    return {
      ok: true, growthPct, deltaE, areaOld: sO.area, areaNew: sN.area, inliers, matches: nm, scale, warnings, thr: sO.thr, areaFrac: sO.area / (a.cols * a.rows), method,
      oldOverlay: overlay(cv, a, sO.mask, del),
      newOverlay: overlay(cv, warpedForOverlay, sN.mask, del),
    };
  } finally {
    del.forEach((m) => { try { m.delete(); } catch { /* already freed */ } });
  }
}

export interface CameraShift { rotDeg: number; zoom: number; brightness: number; dx?: number; dy?: number }

export function cameraShift(src: HTMLCanvasElement, s: CameraShift): string {
  const c = document.createElement("canvas");
  c.width = src.width; c.height = src.height;
  const ctx = c.getContext("2d")!;
  ctx.filter = `brightness(${s.brightness})`;
  ctx.translate(c.width / 2 + (s.dx ?? 0), c.height / 2 + (s.dy ?? 0));
  ctx.rotate((s.rotDeg * Math.PI) / 180);
  ctx.scale(s.zoom, s.zoom);
  ctx.drawImage(src, -c.width / 2, -c.height / 2);
  return c.toDataURL("image/jpeg", 0.9);
}

export function paintLesion(
  src: HTMLCanvasElement,
  seed: { x: number; y: number },
  areaFrac: number
): { src: string; truePx: number } {
  const w = src.width, h = src.height;
  const area = areaFrac * w * h;
  const A = Math.sqrt((area * 1.3) / Math.PI), B = A / 1.3;
  const path = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    for (let t = 0; t <= 64; t++) {
      const th = (t / 64) * Math.PI * 2;
      const wob = 1 + 0.08 * Math.sin(3 * th + 1) + 0.05 * Math.sin(5 * th + 2);
      const x = A * wob * Math.cos(th), y = B * wob * Math.sin(th);
      const c = Math.cos(0.35), sn = Math.sin(0.35);
      const px = seed.x * w + x * c - y * sn, py = seed.y * h + x * sn + y * c;
      if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };
  const mc = document.createElement("canvas");
  mc.width = w; mc.height = h;
  const mctx = mc.getContext("2d")!;
  mctx.fillStyle = "#fff"; path(mctx); mctx.fill();
  const md = mctx.getImageData(0, 0, w, h).data;
  let truePx = 0;
  for (let i = 0; i < w * h; i++) if (md[i * 4] > 127) truePx++;

  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  ctx.fillStyle = "rgba(176,52,64,0.88)"; path(ctx); ctx.fill();
  return { src: out.toDataURL("image/jpeg", 0.92), truePx };
}
