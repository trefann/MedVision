import json, os, collections
from pathlib import Path

ROOT = Path(__file__).parent / "data" / "SMART-OM"
CLASS_DIRS = ["02. Variation from normal", "03. OPMD", "04. Oral Cancer"]


def index():
    """Return list of (image_path, class_dir, patient_key, [polygons as (xs, ys)])."""
    items, shapes, missing = [], collections.Counter(), 0
    for cd in CLASS_DIRS:
        unann = {}
        for p in (ROOT / cd / "01. Unannotated").rglob("*"):
            if p.suffix.lower() in (".jpg", ".jpeg", ".png"):
                unann.setdefault(p.name, []).append(p)
        for jf in (ROOT / cd / "04. Lesion annotation").rglob("*.json"):
            meta = json.load(open(jf, encoding="utf-8")).get("_via_img_metadata", {})
            for entry in meta.values():
                polys = []
                for r in entry.get("regions", []):
                    sa = r.get("shape_attributes", {})
                    shapes[sa.get("name")] += 1
                    if sa.get("name") in ("polygon", "polyline") and len(sa.get("all_points_x", [])) >= 3:
                        polys.append((sa["all_points_x"], sa["all_points_y"]))
                if not polys:
                    continue
                cand = unann.get(entry["filename"])
                if not cand:
                    missing += 1
                    continue
                items.append((cand[0], cd, polys))
    return items, shapes, missing


if __name__ == "__main__":
    items, shapes, missing = index()
    print("annotated images with polygons:", len(items), "| missing image files:", missing)
    print("shape types:", dict(shapes))
    print("per class:", collections.Counter(c for _, c, _ in items))
    print("polygons per image:", collections.Counter(len(p) for _, _, p in items).most_common(6))
