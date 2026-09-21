import re
import sys
from pathlib import Path

import numpy as np
import torch
from scipy.io import wavfile
from transformers import AutoTokenizer, VitsModel

ROOT = Path(__file__).parent.parent
SRC = (ROOT / "lib" / "i18n.ts").read_text(encoding="utf-8")
OUT = ROOT / "public" / "audio"
OUT.mkdir(parents=True, exist_ok=True)
MODELS = {"ta": "facebook/mms-tts-tam", "hi": "facebook/mms-tts-hin"}


def spoken_lines(lang):
    block = re.search(r"\n  %s: \{(.*?)\n  \},\n" % lang, SRC, re.S).group(1)
    arr = re.search(r"spoken: \[(.*?)\n    \],", block, re.S).group(1)
    return re.findall(r'^\s+"(.*)",$', arr, re.M)


def sentences(text):
    parts = re.split(r"(?<=[.।])\s+", text.strip())
    return [p.strip() for p in parts if p.strip()]


torch.manual_seed(0)
for lang, name in MODELS.items():
    tok = AutoTokenizer.from_pretrained(name)
    model = VitsModel.from_pretrained(name).eval()
    print(lang, name, "uroman needed:", getattr(tok, "is_uroman", False), "rate", model.config.sampling_rate, flush=True)
    lines = spoken_lines(lang)
    assert len(lines) == 4, (lang, len(lines))
    only = [int(a) for a in sys.argv[1:]] or [0, 1, 2, 3]
    for tier, text in enumerate(lines):
        if tier not in only:
            continue
        assert not re.search(r"\d", text), "digits in text: " + text
        chunks = []
        for s in sentences(text):
            ids = tok(s, return_tensors="pt")
            with torch.no_grad():
                wav = model(**ids).waveform[0].numpy()
            chunks.append(wav)
            chunks.append(np.zeros(int(0.35 * model.config.sampling_rate), dtype=np.float32))
        audio = np.concatenate(chunks[:-1])
        audio = audio / (np.abs(audio).max() + 1e-9) * 0.89
        rms = float(np.sqrt(np.mean(audio ** 2)))
        path = OUT / f"{lang}-{tier}.wav"
        wavfile.write(path, model.config.sampling_rate, (audio * 32767).astype(np.int16))
        print(f"  {path.name}: {len(audio)/model.config.sampling_rate:.1f}s  rms {rms:.3f}  chars {len(text)}  {path.stat().st_size//1024} KB", flush=True)
