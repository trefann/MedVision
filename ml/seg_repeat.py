import json, re, sys
import numpy as np, torch
import torchvision.transforms.functional as TF
from sklearn.model_selection import StratifiedGroupKFold
sys.argv = [sys.argv[0]]
from seg_data import load_pair
from seg_index import index
import train_seg as T

items, _, _ = index()
y_cls = np.array([{"02": 0, "03": 1, "04": 2}[c[:2]] for _, c, _ in items])
groups = np.array([T.patient_key(c, p.name) for p, c, _ in items])
folds = [te for _, te in StratifiedGroupKFold(5, shuffle=True, random_state=T.SEED).split(y_cls, y_cls, groups)]
te = list(folds[0])

model = T.Seg(backbone_weights=False)
model.load_state_dict(torch.load(T.OUT / "seg_best.pt")); model.eval()
S = T.SIZE
norm = T.v2.Normalize(T.MEAN, T.STD)

def prob(img):  # img: float [3,S,S] in 0..1
    with torch.no_grad():
        return torch.sigmoid(model(norm(img)[None]))[0, 0]

def tta(img):
    p = prob(img)
    q = torch.flip(prob(torch.flip(img, [2])), [1])
    return (p + q) / 2

transforms = [  # angle, zoom(scale), brightness
    (10, 1.3, 1.0), (-8, 0.9, 0.7), (0, 1.2, 1.0), (6, 1.1, 0.85), (-5, 1.15, 1.2),
]
res = {"hard": [], "soft": [], "tta_soft": []}
for i in te:
    p, c, polys = items[i]
    im, _ = load_pair(p, polys, S)
    x = torch.from_numpy(np.asarray(im)).permute(2, 0, 1).float() / 255
    base = {"hard": (prob(x) > .5).float(), "soft": prob(x), "tta_soft": tta(x)}
    for ang, sc, br in transforms:
        xt = TF.affine(x, angle=ang, translate=[0, 0], scale=sc, shear=[0.0]).clamp(0, 1) * br
        xt = xt.clamp(0, 1)
        valid = TF.affine(torch.ones(1, S, S), angle=ang, translate=[0, 0], scale=sc, shear=[0.0])[0] > .99
        valid_old = TF.affine(valid[None].float(), angle=-ang, translate=[0, 0], scale=1 / sc, shear=[0.0])[0] > .99  # not exact; use forward valid mapped back
        # bring prediction back to the original frame
        def back(pm):
            return TF.affine(pm[None], angle=-ang, translate=[0, 0], scale=1 / sc, shear=[0.0])[0]
        inv_valid = back(valid.float()) > .99
        newp = {"hard": back((prob(xt) > .5).float()), "soft": back(prob(xt)), "tta_soft": back(tta(xt))}
        for k in res:
            a0 = base[k][inv_valid].sum().item(); a1 = newp[k][inv_valid].sum().item()
            if a0 > 200:
                res[k].append(100 * (a1 - a0) / a0)
out = {}
for k, v in res.items():
    v = np.array(v)
    out[k] = {"n": int(len(v)), "median_abs_change_pct": float(np.median(np.abs(v))), "p90_abs_change_pct": float(np.percentile(np.abs(v), 90)),
              "share_within_15pct": float((np.abs(v) <= 15).mean()), "share_within_25pct": float((np.abs(v) <= 25).mean())}
    print(k, json.dumps(out[k]))
json.dump(out, open(T.OUT / "seg_repeatability.json", "w"), indent=2)
