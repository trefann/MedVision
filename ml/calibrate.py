import json, sys
sys.argv = ["x"]
import numpy as np, torch, torch.nn as nn
from torchvision import models
import train

items = train.load_index(); tr, va, te = train.group_split(items)
mean, std = [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]
norm = train.v2.Normalize(mean, std)
m = models.mobilenet_v3_small(); m.classifier[-1] = nn.Linear(m.classifier[-1].in_features, 3)
m.load_state_dict(torch.load(train.OUT / "best.pt")); m.eval()

def probs(idx):
    out = []
    with torch.no_grad():
        for k in range(0, len(idx), 64):
            xs = torch.stack([train.load_tensor(items[i][0]) for i in idx[k:k+64]]).float() / 255
            out.append(torch.softmax(m(norm(xs)), 1))
    return torch.cat(out).numpy(), np.array([items[i][1] for i in idx])

pv, yv = probs(va); pt, yt = probs(te)
def decide(p, thr):
    pred = p.argmax(1).copy()
    flag = p[:, 0] < thr
    pred[flag & (pred == 0)] = 1 + p[flag & (pred == 0)][:, 1:].argmax(1)
    return pred
def flag_sens(y, pr): return float((pr[y > 0] > 0).mean())
def spec(y, pr): return float((pr[y == 0] == 0).mean())

best = None
for thr in np.arange(0.5, 0.99, 0.01):
    pr = decide(pv, thr)
    if spec(yv, pr) >= 0.75 and (best is None or flag_sens(yv, pr) > best[1]): best = (float(thr), flag_sens(yv, pr))
thr = best[0]
print("threshold chosen on val (keep >=75% of Benign correct):", round(thr, 2), "val flagged sensitivity", round(best[1], 3))
pr = decide(pt, thr)
from sklearn.metrics import confusion_matrix
print(confusion_matrix(yt, pr, labels=[0, 1, 2]))
print("TEST flagged (Monitor/Refer) sensitivity:", round(flag_sens(yt, pr), 3), " Benign correctly cleared:", round(spec(yt, pr), 3))
print("TEST Refer caught (flagged):", round(float((pr[yt == 2] > 0).mean()), 3), " Refer exactly right:", round(float((pr[yt == 2] == 2).mean()), 3))
json.dump({"benign_threshold": thr}, open(train.OUT / "threshold.json", "w"))
