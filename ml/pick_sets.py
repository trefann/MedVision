import json, re, sys, collections
sys.argv = ["x"]
import numpy as np, onnxruntime as ort
from PIL import Image, ImageOps
import train

items = train.load_index()
tr, va, te = train.group_split(items)
test = set(te)
sess = ort.InferenceSession("../public/models/triage.onnx")
thr = json.load(open("../public/models/threshold.json"))["benign_threshold"]
mean = np.array([0.485, 0.456, 0.406], np.float32)[:, None, None]; std = np.array([0.229, 0.224, 0.225], np.float32)[:, None, None]

def probs(p):
    im = ImageOps.exif_transpose(Image.open(p)).convert("RGB").resize((224, 224), Image.BILINEAR)
    x = ((np.asarray(im, np.float32).transpose(2, 0, 1) / 255 - mean) / std)[None]
    z = sess.run(None, {"input": x})[0][0]; e = np.exp(z - z.max()); return e / e.sum()

def site(p):
    m = re.search(r"_([A-Z]{2})\.(?:jpe?g|png)$", p.name, re.I)
    return m.group(1).upper() if m else None

rows = collections.defaultdict(list)
for i in te:
    p, tier, g = items[i]
    s = site(p)
    if s:
        rows[g].append((s, tier, p, probs(p)))
print("test patients with site-coded photos:", len(rows))
cnt = collections.Counter(s for g in rows for s, *_ in rows[g])
print("site counts:", dict(cnt))
NEED = ["LB", "RB", "DT", "UA"]
for g, lst in rows.items():
    have = {s for s, *_ in lst}
    if set(NEED) <= have:
        print(g, sorted((s, t) for s, t, *_ in lst))

# ---------- build sets ----------
from pathlib import Path
OUTD = Path("../public/samples"); OUTD.mkdir(exist_ok=True)

def prep(p):
    im = ImageOps.exif_transpose(Image.open(p)).convert("RGB"); im.thumbnail((640, 640)); return im

def quality_ok(im):
    g = np.asarray(im.resize((256, int(256 * im.height / im.width)) if im.width >= im.height else (int(256 * im.width / im.height), 256)).convert("L"), np.float32)
    lap = 4 * g[1:-1, 1:-1] - g[:-2, 1:-1] - g[2:, 1:-1] - g[1:-1, :-2] - g[1:-1, 2:]
    sharp = lap.var(); bright = g.mean()
    return sharp >= 60 and 60 <= bright <= 190, sharp, bright

def pred_tier(p):
    return 0 if p[0] >= thr else 1 + int(p[1:].argmax())

GROUPS = [["LB"], ["RB"], ["DT", "VT"], ["UA", "LA", "UL", "LL"]]

def best(lst, codes, want_label, min_conf):
    c = []
    for s, t, p, pr in lst:
        if s not in codes or t != want_label or pred_tier(pr) != want_label:
            continue
        conf = pr[0] if want_label == 0 else pr[want_label]
        if conf < min_conf:
            continue
        ok, sh, br = quality_ok(prep(p))
        if ok:
            c.append((conf, p, pr, sh, br, s))
    return max(c, key=lambda x: x[0]) if c else None

def best_nl(lst, codes, target):
    c = []
    for s, t, p, pr in lst:
        if s not in codes or t != 0 or pred_tier(pr) > target or pr[2] > 0.1:
            continue
        ok, sh, br = quality_ok(prep(p))
        if ok:
            c.append((float(pr[0]), p, pr, sh, br, s))
    return max(c, key=lambda x: x[0]) if c else None

results = {}
for target in (0, 1, 2):
    chosen = None
    for lc, bc in [(0.85, 0.99), (0.7, 0.97), (0.55, 0.9)]:
        cands = []
        for g, lst in rows.items():
            present = [{s for s, *_ in lst} & set(gr) for gr in GROUPS]
            if not all(present):
                continue
            lesion_groups = [0] if target == 0 else range(4)
            for lg in lesion_groups:
                pick, ok = {}, True
                for gi, codes in enumerate(GROUPS):
                    if target == 0:
                        b = best(lst, codes, 0, bc)
                    elif gi == lg:
                        b = best(lst, codes, target, lc)
                    else:
                        b = best(lst, codes, 0, bc) or (best_nl(lst, codes, target) if target == 1 else None) or best(lst, codes, target, lc)
                    if not b:
                        ok = False; break
                    pick[gi] = b
                if ok:
                    lesions = [pick[k][0] for k in pick if pick[k][2].argmax() == target or target == 0]
                    score = min(v[0] for v in pick.values()) if target == 0 else pick[lg][0]
                    cands.append((score, g, lg, pick))
        if cands:
            cands.sort(key=lambda x: -x[0]); chosen = (lc, bc, cands); break
    name = ["benign", "monitor", "refer"][target]
    if not chosen:
        print(name, ": no set found"); continue
    lc, bc, cands = chosen
    score, g, lg, pick = cands[0]
    print(f"{name}: thresholds lesion>={lc} benign>={bc}; {len(cands)} candidates; patient {g}")
    for gi in range(4):
        conf, p, pr, sh, br, code = pick[gi]
        prep(p).save(OUTD / f"{name}-{gi}.jpg", quality=85)
        print(f"    site {gi} ({code}) {p.name}  probs {np.round(pr, 3)}  sharp {sh:.0f} bright {br:.0f}")
    results[name] = {"patient": g, "files": [str(pick[gi][1].name) for gi in range(4)], "site_codes": [pick[gi][5] for gi in range(4)]}
json.dump(results, open("out/sample_sets.json", "w"), indent=2)
