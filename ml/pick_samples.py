import sys, json, shutil
sys.argv = ["x"]
import numpy as np, torch, torch.nn as nn, onnxruntime as ort
from pathlib import Path
from PIL import Image, ImageOps
from torchvision import models
import train
items = train.load_index(); tr, va, te = train.group_split(items)
m = models.mobilenet_v3_small(); m.classifier[-1] = nn.Linear(m.classifier[-1].in_features, 3)
m.load_state_dict(torch.load(train.OUT / "mobilenetv3_small_triage.pt")); m.eval()
sess = ort.InferenceSession("../public/models/triage.onnx")
thr = json.load(open("../public/models/threshold.json"))["benign_threshold"]
mean = np.array([0.485, 0.456, 0.406], np.float32)[:, None, None]; std = np.array([0.229, 0.224, 0.225], np.float32)[:, None, None]
def prep(p):
    im = ImageOps.exif_transpose(Image.open(p)).convert("RGB").resize((224, 224), Image.BILINEAR)
    return ((np.asarray(im, np.float32).transpose(2, 0, 1) / 255 - mean) / std)[None]
def sm(z): e = np.exp(z - z.max()); return e / e.sum()
def tier(p): return 0 if p[0] >= thr else 1 + int(p[1:].argmax())
maxdiff = 0; found = {}
rng = np.random.default_rng(1); order = rng.permutation(te)
for i in order:
    p, t, _ = items[i]; x = prep(p)
    o = sess.run(None, {"input": x})[0][0]
    with torch.no_grad(): r = m(torch.from_numpy(x))[0].numpy()
    maxdiff = max(maxdiff, float(np.abs(o - r).max()))
    if tier(sm(o)) == t and t not in found and p.suffix.lower() in (".jpg", ".jpeg"): found[t] = (p, sm(o))
    if len(found) == 3 and maxdiff > 0 and len(found) == 3: break
print("max |onnx - torch| logit diff:", maxdiff)
dst = Path("../public/samples"); dst.mkdir(exist_ok=True)
for t, name in enumerate(["benign", "monitor", "refer"]):
    p, pr = found[t]
    im = ImageOps.exif_transpose(Image.open(p)).convert("RGB"); im.thumbnail((640, 640)); im.save(dst / f"{name}.jpg", quality=85)
    print(name, p.name, np.round(pr, 3))
