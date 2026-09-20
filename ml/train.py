import json, random, re, sys, time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from PIL import Image, ImageOps
from sklearn.metrics import classification_report, confusion_matrix
from torchvision import models
from torchvision.transforms import v2

ROOT = Path(__file__).parent
DATA = ROOT / "data" / "SMART-OM"
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)
SEED, IMG, EPOCHS, BS = 42, 224, int(sys.argv[1]) if len(sys.argv) > 1 else 10, 32
TIERS = ["Benign", "Monitor", "Refer"]
FOLDER_TIER = {"01. Normal": 0, "02. Variation from normal": 1, "03. OPMD": 2, "04. Oral Cancer": 2}

random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)


def patient_key(folder, name):
    m = re.search(r"(SMITA\d+)", name, re.I)
    if m:
        return m.group(1).upper()
    m = re.match(r"\s*(\d+)", name)
    return f"{folder}|{m.group(1)}" if m else f"{folder}|{Path(name).stem}"


def load_index():
    items = []
    for folder, tier in FOLDER_TIER.items():
        for p in (DATA / folder / "01. Unannotated").rglob("*"):
            if p.suffix.lower() in (".jpg", ".jpeg", ".png"):
                items.append((p, tier, patient_key(folder, p.name)))
    return items


def group_split(items):
    from sklearn.model_selection import StratifiedGroupKFold
    y_ = np.array([t for _, t, _ in items]); g_ = np.array([g for _, _, g in items])
    folds = [te for _, te in StratifiedGroupKFold(5, shuffle=True, random_state=SEED).split(y_, y_, g_)]
    te, va = list(folds[0]), list(folds[1])
    tr = [i for f in folds[2:] for i in f]
    return tr, va, te


def load_tensor(p):
    im = ImageOps.exif_transpose(Image.open(p)).convert("RGB").resize((IMG, IMG), Image.BILINEAR)
    return torch.from_numpy(np.asarray(im)).permute(2, 0, 1).contiguous()


def main():
    items = load_index()
    print("images:", len(items), "patients:", len({g for _, _, g in items}))
    tr, va, te = group_split(items)
    for n, s in zip(["train", "val", "test"], [tr, va, te]):
        print(n, len(s), np.bincount([items[i][1] for i in s], minlength=3), "patients", len({items[i][2] for i in s}))
    assert not ({items[i][2] for i in tr} & {items[i][2] for i in te}), "patient leakage"

    t0 = time.time()
    X = {i: load_tensor(items[i][0]) for s in (tr, va, te) for i in s}
    y = {i: items[i][1] for i in X}
    print(f"cached images in {time.time()-t0:.0f}s")

    mean, std = [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]
    aug = v2.Compose([v2.RandomHorizontalFlip(), v2.RandomRotation(15), v2.ColorJitter(0.3, 0.3, 0.3, 0.05),
                      v2.RandomResizedCrop(IMG, scale=(0.7, 1.0), antialias=True)])
    norm = v2.Normalize(mean, std)

    def batch(idx, train):
        xs = torch.stack([aug(X[i]) if train else X[i] for i in idx]).float() / 255
        return norm(xs), torch.tensor([y[i] for i in idx])

    model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.IMAGENET1K_V1)
    model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, 3)

    cnt = np.bincount([y[i] for i in tr], minlength=3).astype(float)
    w = torch.tensor((cnt.sum() / (3 * cnt)) ** 0.75, dtype=torch.float32)
    crit = nn.CrossEntropyLoss(weight=w)
    opt = torch.optim.AdamW([{"params": model.features.parameters(), "lr": 3e-4},
                             {"params": model.classifier.parameters(), "lr": 1e-3}], weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, EPOCHS)

    def predict(idx):
        model.eval(); ps = []
        with torch.no_grad():
            for k in range(0, len(idx), 64):
                xb, _ = batch(idx[k:k + 64], False)
                ps.append(torch.softmax(model(xb), 1))
        return torch.cat(ps).numpy()

    def score(idx):
        p = predict(idx); t = np.array([y[i] for i in idx]); pr = p.argmax(1)
        rec = [(pr[t == c] == c).mean() if (t == c).any() else 0 for c in range(3)]
        return float(np.mean(rec)), rec, p

    best = -1
    for ep in range(EPOCHS):
        model.train(); random.shuffle(tr); tl = 0
        for k in range(0, len(tr), BS):
            xb, yb = batch(tr[k:k + BS], True)
            opt.zero_grad(); loss = crit(model(xb), yb); loss.backward(); opt.step(); tl += loss.item() * len(yb)
        sched.step()
        bal, rec, _ = score(va)
        print(f"epoch {ep+1}/{EPOCHS} loss {tl/len(tr):.3f} val balanced-acc {bal:.3f} recalls {np.round(rec,2)} ({time.time()-t0:.0f}s)", flush=True)
        if bal > best:
            best = bal; torch.save(model.state_dict(), OUT / "best.pt")

    model.load_state_dict(torch.load(OUT / "best.pt"))
    p = predict(te); t = np.array([y[i] for i in te]); pr = p.argmax(1)
    cm = confusion_matrix(t, pr, labels=[0, 1, 2])
    rep = classification_report(t, pr, labels=[0, 1, 2], target_names=TIERS, output_dict=True, zero_division=0)
    print("\nTEST confusion matrix (rows=true, cols=pred)\n", cm)
    print(classification_report(t, pr, labels=[0, 1, 2], target_names=TIERS, zero_division=0))
    # "flag" = Monitor or Refer, i.e. anything that is not sent home as Benign
    flag_true, flag_pred = t > 0, pr > 0
    print("Flagged (Monitor/Refer) sensitivity:", round(float((flag_pred & flag_true).sum() / max(flag_true.sum(), 1)), 3))
    print("Refer sensitivity (Refer or Monitor predicted for true Refer):",
          round(float((pr[t == 2] > 0).mean()) if (t == 2).any() else 0, 3))
    json.dump({"tiers": TIERS, "confusion_matrix": cm.tolist(), "report": rep, "best_val_balanced_acc": best,
               "n_test": len(te)}, open(OUT / "metrics.json", "w"), indent=2)
    torch.save(model.state_dict(), OUT / "mobilenetv3_small_triage.pt")


if __name__ == "__main__":
    main()
