import json, random, re, sys, time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.model_selection import StratifiedGroupKFold
from torchvision import models, tv_tensors
from torchvision.transforms import v2

from seg_data import load_pair
from seg_index import index

ROOT = Path(__file__).parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)
SIZE, BS, SEED = 256, 8, 42
EPOCHS = int(sys.argv[1]) if len(sys.argv) > 1 else 20
SAMPLES_PNG = sys.argv[2] if len(sys.argv) > 2 else None
MEAN, STD = [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]

random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)


def patient_key(folder, name):
    m = re.search(r"(SMITA\d+)", name, re.I)
    if m:
        return m.group(1).upper()
    m = re.match(r"\s*(\d+)", name)
    return f"{folder}|{m.group(1)}" if m else f"{folder}|{Path(name).stem}"


class Seg(nn.Module):
    def __init__(self, backbone_weights=True):
        super().__init__()
        self.net = models.segmentation.lraspp_mobilenet_v3_large(
            weights=None,
            weights_backbone=models.MobileNet_V3_Large_Weights.IMAGENET1K_V1 if backbone_weights else None,
            num_classes=1,
        )

    def forward(self, x):
        return self.net(x)["out"]


def dice_iou(prob, gt, thr=0.5):
    pred = prob > thr
    inter = (pred & gt).sum(); union = (pred | gt).sum()
    return float(2 * inter / (pred.sum() + gt.sum() + 1e-9)), float(inter / (union + 1e-9))


def main():
    items, _, _ = index()
    print("annotated images:", len(items), flush=True)
    y_cls = np.array([{"02": 0, "03": 1, "04": 2}[c[:2]] for _, c, _ in items])
    groups = np.array([patient_key(c, p.name) for p, c, _ in items])
    folds = [te for _, te in StratifiedGroupKFold(5, shuffle=True, random_state=SEED).split(y_cls, y_cls, groups)]
    te, va = list(folds[0]), list(folds[1])
    tr = [i for k in range(2, 5) for i in folds[k]]
    assert not (set(groups[tr]) & set(groups[te])) and not (set(groups[tr]) & set(groups[va]))
    print(f"train {len(tr)}  val {len(va)}  test {len(te)}  test classes {np.bincount(y_cls[te], minlength=3)}", flush=True)

    t0 = time.time()
    X, Y = {}, {}
    for i, (p, c, polys) in enumerate(items):
        im, m = load_pair(p, polys, SIZE)
        X[i] = torch.from_numpy(np.asarray(im)).permute(2, 0, 1).contiguous()
        Y[i] = torch.from_numpy((np.asarray(m) > 0).astype(np.uint8))[None]
    print(f"cached in {time.time()-t0:.0f}s; mean lesion area {np.mean([Y[i].float().mean().item() for i in Y]):.2f}", flush=True)

    aug = v2.Compose([
        v2.RandomHorizontalFlip(),
        v2.RandomRotation(20),
        v2.RandomResizedCrop(SIZE, scale=(0.6, 1.0), ratio=(0.8, 1.25), antialias=True),
        v2.ColorJitter(0.3, 0.3, 0.3, 0.05),
    ])
    norm = v2.Normalize(MEAN, STD)

    def batch(idx, training):
        xs, ys = [], []
        for i in idx:
            x, y = tv_tensors.Image(X[i]), tv_tensors.Mask(Y[i])
            if training:
                x, y = aug(x, y)
            xs.append(torch.as_tensor(x)); ys.append(torch.as_tensor(y))
        return norm(torch.stack(xs).float() / 255), torch.stack(ys).float()

    model = Seg()
    opt = torch.optim.AdamW(model.parameters(), lr=5e-4, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, EPOCHS)

    def loss_fn(logit, y):
        p = torch.sigmoid(logit)
        inter = (p * y).sum((1, 2, 3)); den = p.sum((1, 2, 3)) + y.sum((1, 2, 3))
        return F.binary_cross_entropy_with_logits(logit, y) + (1 - (2 * inter + 1) / (den + 1)).mean()

    def evaluate(idx):
        model.eval(); ds, us, probs = [], [], []
        with torch.no_grad():
            for k in range(0, len(idx), 16):
                xb, yb = batch(idx[k:k + 16], False)
                pb = torch.sigmoid(model(xb))
                for j in range(len(pb)):
                    d, u = dice_iou(pb[j, 0].numpy(), yb[j, 0].numpy() > 0.5)
                    ds.append(d); us.append(u)
                probs.append(pb)
        return np.array(ds), np.array(us), torch.cat(probs)

    best = -1
    for ep in range(EPOCHS):
        model.train(); random.shuffle(tr); tl = 0
        for k in range(0, len(tr), BS):
            xb, yb = batch(tr[k:k + BS], True)
            opt.zero_grad(); loss = loss_fn(model(xb), yb); loss.backward(); opt.step(); tl += loss.item() * len(xb)
        sched.step()
        ds, us, _ = evaluate(va)
        print(f"epoch {ep+1}/{EPOCHS} loss {tl/len(tr):.3f} val dice {ds.mean():.3f} iou {us.mean():.3f} ({time.time()-t0:.0f}s)", flush=True)
        if ds.mean() > best:
            best = float(ds.mean()); torch.save(model.state_dict(), OUT / "seg_best.pt")

    model.load_state_dict(torch.load(OUT / "seg_best.pt"))
    ds, us, probs = evaluate(te)
    names = ["Variation from normal", "OPMD", "Oral cancer"]
    per_class = {n: {"n": int((y_cls[te] == c).sum()), "dice": float(ds[y_cls[te] == c].mean()) if (y_cls[te] == c).any() else None,
                     "iou": float(us[y_cls[te] == c].mean()) if (y_cls[te] == c).any() else None} for c, n in enumerate(names)}
    # area-ratio error: how well does predicted area track true area (what change detection needs)
    gt_area = np.array([Y[i].float().mean().item() for i in te])
    pr_area = (probs[:, 0] > 0.5).float().mean((1, 2)).numpy()
    corr = float(np.corrcoef(gt_area, pr_area)[0, 1])
    res = {"epochs": EPOCHS, "n_test": len(te), "test_dice": float(ds.mean()), "test_iou": float(us.mean()),
           "test_dice_std": float(ds.std()), "area_correlation": corr, "per_class": per_class, "best_val_dice": best}
    json.dump(res, open(OUT / "seg_metrics.json", "w"), indent=2)
    print("\nTEST", json.dumps(res, indent=1))

    if SAMPLES_PNG:
        from PIL import Image
        tiles = []
        for j in list(range(len(te)))[:: max(1, len(te) // 8)][:8]:
            i = te[j]
            img = X[i].permute(1, 2, 0).numpy().copy()
            for arr, col in ((Y[i][0].numpy() > 0, (0, 255, 0)), (probs[j, 0].numpy() > 0.5, (255, 0, 0))):
                edge = (F.max_pool2d(torch.from_numpy(arr.astype(np.float32))[None, None], 5, 1, 2)[0, 0].numpy() > 0) & ~(F.avg_pool2d(torch.from_numpy(arr.astype(np.float32))[None, None], 5, 1, 2)[0, 0].numpy() > 0.99)
                img[edge] = col
            tiles.append(Image.fromarray(img))
        sheet = Image.new("RGB", (SIZE * 4, SIZE * 2))
        for k, t in enumerate(tiles):
            sheet.paste(t, ((k % 4) * SIZE, (k // 4) * SIZE))
        sheet.save(SAMPLES_PNG)

    # ONNX export (sigmoid inside)
    class Wrap(nn.Module):
        def __init__(self, m):
            super().__init__(); self.m = m
        def forward(self, x):
            return torch.sigmoid(self.m(x))
    model.eval()
    dst = ROOT.parent / "public" / "models"; dst.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(Wrap(model), torch.zeros(1, 3, SIZE, SIZE), str(dst / "seg.onnx"), input_names=["input"],
                      output_names=["prob"], dynamic_axes={"input": {0: "batch"}, "prob": {0: "batch"}}, opset_version=17, dynamo=False)
    print("exported", dst / "seg.onnx", flush=True)


if __name__ == "__main__":
    main()
