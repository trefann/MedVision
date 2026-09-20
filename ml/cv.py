import json, random, sys, time

sys.argv = [sys.argv[0]] + sys.argv[1:2]
import numpy as np
import torch
import torch.nn as nn
from sklearn.model_selection import StratifiedGroupKFold
from torchvision import models

import train
from train import IMG, OUT, SEED, TIERS, load_index, load_tensor, v2

EPOCHS = int(sys.argv[1]) if len(sys.argv) > 1 else 8
BS = 32
MEAN, STD = [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]
aug = v2.Compose([v2.RandomHorizontalFlip(), v2.RandomRotation(15), v2.ColorJitter(0.3, 0.3, 0.3, 0.05),
                  v2.RandomResizedCrop(IMG, scale=(0.7, 1.0), antialias=True)])
norm = v2.Normalize(MEAN, STD)


def decide(p, thr):
    pred = p.argmax(1).copy()
    ben = pred == 0
    flag = ben & (p[:, 0] < thr)
    pred[flag] = 1 + p[flag][:, 1:].argmax(1)
    return pred


def main():
    items = load_index()
    y_all = np.array([t for _, t, _ in items]); g_all = np.array([g for _, _, g in items])
    folds = [te for _, te in StratifiedGroupKFold(5, shuffle=True, random_state=SEED).split(y_all, y_all, g_all)]
    t0 = time.time()
    X = {i: load_tensor(items[i][0]) for i in range(len(items))}
    print(f"cached {len(X)} images in {time.time()-t0:.0f}s", flush=True)

    def batch(idx, training):
        xs = torch.stack([aug(X[i]) if training else X[i] for i in idx]).float() / 255
        return norm(xs), torch.tensor([y_all[i] for i in idx])

    rows, pooled_true, pooled_pred = [], [], []
    for f in range(5):
        te, va = list(folds[f]), list(folds[(f + 1) % 5])
        tr = [i for k in range(5) if k not in (f, (f + 1) % 5) for i in folds[k]]
        assert not ({g_all[i] for i in tr} & {g_all[i] for i in te}) and not ({g_all[i] for i in tr} & {g_all[i] for i in va})
        print(f"\n=== fold {f+1}/5  train {len(tr)}  val {len(va)}  test {len(te)}  test classes {np.bincount(y_all[te], minlength=3)}", flush=True)
        torch.manual_seed(SEED + f); random.seed(SEED + f)

        model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.IMAGENET1K_V1)
        model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, 3)
        cnt = np.bincount(y_all[tr], minlength=3).astype(float)
        crit = nn.CrossEntropyLoss(weight=torch.tensor((cnt.sum() / (3 * cnt)) ** 0.75, dtype=torch.float32))
        opt = torch.optim.AdamW([{"params": model.features.parameters(), "lr": 3e-4},
                                 {"params": model.classifier.parameters(), "lr": 1e-3}], weight_decay=1e-4)
        sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, EPOCHS)

        def predict(idx):
            model.eval(); ps = []
            with torch.no_grad():
                for k in range(0, len(idx), 64):
                    ps.append(torch.softmax(model(batch(idx[k:k + 64], False)[0]), 1))
            return torch.cat(ps).numpy()

        best, best_state = -1, None
        for ep in range(EPOCHS):
            model.train(); random.shuffle(tr)
            for k in range(0, len(tr), BS):
                xb, yb = batch(tr[k:k + BS], True)
                opt.zero_grad(); crit(model(xb), yb).backward(); opt.step()
            sched.step()
            pv = predict(va); yv = y_all[va]; pr = pv.argmax(1)
            bal = float(np.mean([(pr[yv == c] == c).mean() if (yv == c).any() else 0 for c in range(3)]))
            print(f"  fold {f+1} epoch {ep+1}/{EPOCHS} val balanced-acc {bal:.3f} ({time.time()-t0:.0f}s)", flush=True)
            if bal > best:
                best = bal; best_state = {k: v.clone() for k, v in model.state_dict().items()}
        model.load_state_dict(best_state)

        pv, yv = predict(va), y_all[va]
        thr_best = None
        for thr in np.arange(0.5, 0.99, 0.01):
            pr = decide(pv, thr)
            if (pr[yv == 0] == 0).mean() >= 0.75:
                s = (pr[yv > 0] > 0).mean()
                if thr_best is None or s > thr_best[1]:
                    thr_best = (float(thr), float(s))
        thr = thr_best[0] if thr_best else 0.9

        pt, yt = predict(te), y_all[te]
        pr = decide(pt, thr)
        r = {"fold": f + 1, "n_test": len(te), "thr": thr,
             "flagged_sensitivity": float((pr[yt > 0] > 0).mean()),
             "refer_caught": float((pr[yt == 2] > 0).mean()),
             "refer_exact": float((pr[yt == 2] == 2).mean()),
             "benign_cleared": float((pr[yt == 0] == 0).mean()),
             "balanced_acc": float(np.mean([(pr[yt == c] == c).mean() for c in range(3)]))}
        rows.append(r); pooled_true += yt.tolist(); pooled_pred += pr.tolist()
        print("  RESULT", json.dumps(r), flush=True)

    keys = ["flagged_sensitivity", "refer_caught", "refer_exact", "benign_cleared", "balanced_acc"]
    summary = {k: {"mean": float(np.mean([r[k] for r in rows])), "std": float(np.std([r[k] for r in rows], ddof=1))} for k in keys}
    from sklearn.metrics import confusion_matrix
    cm = confusion_matrix(pooled_true, pooled_pred, labels=[0, 1, 2]).tolist()
    json.dump({"epochs": EPOCHS, "folds": rows, "summary": summary, "pooled_confusion_matrix": cm,
               "tiers": TIERS}, open(OUT / "cv_metrics.json", "w"), indent=2)
    print("\nSUMMARY (mean ± sd over 5 folds)")
    for k in keys:
        print(f"  {k}: {summary[k]['mean']*100:.1f}% ± {summary[k]['std']*100:.1f}")
    print("pooled confusion matrix (rows=true, cols=pred):", cm)
    print(f"total time {(time.time()-t0)/60:.0f} min")


if __name__ == "__main__":
    main()
