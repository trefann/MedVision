import json, torch, torch.nn as nn
from pathlib import Path
from torchvision import models
OUT = Path(__file__).parent / "out"
m = models.mobilenet_v3_small(); m.classifier[-1] = nn.Linear(m.classifier[-1].in_features, 3)
m.load_state_dict(torch.load(OUT / "mobilenetv3_small_triage.pt")); m.eval()
dst = Path(__file__).parent.parent / "public" / "models"; dst.mkdir(parents=True, exist_ok=True)
torch.onnx.export(m, torch.zeros(1, 3, 224, 224), str(dst / "triage.onnx"), input_names=["input"], output_names=["logits"],
                  dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}}, opset_version=17, dynamo=False)
json.dump(json.load(open(OUT / "threshold.json")), open(dst / "threshold.json", "w"))
print("ok")
