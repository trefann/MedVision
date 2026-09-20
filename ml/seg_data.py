import numpy as np
from PIL import Image, ImageDraw, ImageOps

from seg_index import index


def load_pair(path, polys, size=None, exif=True):
    im = Image.open(path)
    if exif:
        im = ImageOps.exif_transpose(im)
    im = im.convert("RGB")
    mask = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(mask)
    for xs, ys in polys:
        d.polygon(list(zip(xs, ys)), fill=255)
    if size:
        im = im.resize((size, size), Image.BILINEAR)
        mask = mask.resize((size, size), Image.NEAREST)
    return im, mask


if __name__ == "__main__":
    import os, sys
    items, _, _ = index()
    exif_count = 0
    for p, _, _ in items:
        o = Image.open(p).getexif().get(274, 1)
        exif_count += o != 1
    print("images with EXIF rotation:", exif_count, "of", len(items))
    out = sys.argv[1]
    step = max(1, len(items) // 8)
    tiles = []
    for p, c, polys in items[::step][:8]:
        for exif in (True, False):
            im, m = load_pair(p, polys, 200, exif)
            ov = Image.blend(im, Image.merge("RGB", (m, Image.new("L", m.size, 0), Image.new("L", m.size, 0))), 0.0)
            arr = np.asarray(im).copy()
            mm = np.asarray(m) > 0
            arr[mm] = (0.5 * arr[mm] + 0.5 * np.array([255, 0, 0])).astype(np.uint8)
            tiles.append(Image.fromarray(arr))
    W = 200
    sheet = Image.new("RGB", (W * 4, W * 4))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % 4) * W, (i // 4) * W))
    sheet.save(out)
    print("saved", out)
