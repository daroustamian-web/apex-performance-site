#!/usr/bin/env python3
"""
Slice Joe's full-page design comps into per-section band images.

Joe supplied complete page mockups. Rather than using them as wallpaper behind
scrims, we cut them at their natural section seams and stack the slices as
full-bleed images, dropping live HTML (nav, footer, buttons, FAQ, video
lightboxes) into the gaps. The result is pixel-identical to the comp but works.

Reads:  content/comps.json  (band map)
Writes: assets/comps/<slug>/<band-id>.{webp,jpg} at 1x and 2x
"""
import json
import pathlib
import sys
from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC_DIR = pathlib.Path.home() / "Downloads"
ENHANCED_DIR = ROOT / "assets" / "comp-enhanced"
OUT_ROOT = ROOT / "assets" / "comps"
SPEC = json.loads((ROOT / "content" / "comps.json").read_text(encoding="utf-8"))

# Prefer GPT-Image-2 enhanced full-page comps when present
ENHANCED_SLUGS = {
    "superhuman-protocol-long-island": "superhuman-protocol-long-island.png",
    "whole-body-cryotherapy-long-island": "whole-body-cryotherapy-long-island.png",
    "hyperbaric-oxygen-therapy-long-island": "hyperbaric-oxygen-therapy-long-island.png",
    "red-light-therapy-long-island": "red-light-therapy-long-island.png",
}


def _edge_colour(px, x_from, x_to, y, W):
    """Median-ish sample of a short horizontal run, clamped to the canvas."""
    vals = []
    for x in range(max(0, x_from), min(W, x_to)):
        vals.append(px[x, y])
    if not vals:
        return (0, 0, 0)
    vals.sort(key=lambda c: c[0] + c[1] + c[2])
    return vals[len(vals) // 2]


def erase(im, rects, W, H):
    """Paint out flat CTA buttons so real HTML buttons can sit in their place.

    Every painted button in these comps sits on flat, near-black background, so
    we rebuild each row by interpolating between clean pixels immediately left
    and right of the button. That preserves the local vertical gradient without
    dragging in body copy the way a vertical patch-copy does.
    """
    px = im.load()
    for r in rects:
        x0 = int(W * r["x"] / 100)
        y0 = int(H * r["y"] / 100)
        w = int(W * r["w"] / 100)
        h = int(H * r["h"] / 100)
        x1 = x0 + w
        pad, run = 3, 10

        for y in range(max(0, y0), min(H, y0 + h)):
            left = _edge_colour(px, x0 - pad - run, x0 - pad, y, W)
            right = _edge_colour(px, x1 + pad, x1 + pad + run, y, W)
            for x in range(max(0, x0), min(W, x1)):
                t = (x - x0) / max(1, w)
                px[x, y] = (
                    round(left[0] + (right[0] - left[0]) * t),
                    round(left[1] + (right[1] - left[1]) * t),
                    round(left[2] + (right[2] - left[2]) * t),
                )

        # soften the rebuilt patch and its seams so it reads as background
        box = (max(0, x0 - 4), max(0, y0 - 4), min(W, x1 + 4), min(H, y0 + h + 4))
        region = im.crop(box).filter(ImageFilter.GaussianBlur(2.2))
        im.paste(region, box)
        px = im.load()
    return im


def main():
    if OUT_ROOT.exists():
        for p in sorted(OUT_ROOT.rglob("*")):
            if p.is_file():
                p.unlink()

    manifest = {}
    total = 0

    for slug, cfg in SPEC.items():
        if slug.startswith("_"):
            continue

        enhanced_name = ENHANCED_SLUGS.get(slug)
        enhanced = ENHANCED_DIR / enhanced_name if enhanced_name else None
        if enhanced and enhanced.exists():
            src = enhanced
            print(f"USING ENHANCED: {src.name}")
        else:
            src = SRC_DIR / cfg["source"]
        if not src.exists():
            print(f"MISSING SOURCE: {src}", file=sys.stderr)
            sys.exit(1)

        im = Image.open(src).convert("RGB")
        W, H = im.size
        if (W, H) != (cfg["width"], cfg["height"]):
            print(f"NOTE {slug}: comp is {W}x{H}, spec says "
                  f"{cfg['width']}x{cfg['height']} — using actual", file=sys.stderr)

        # apply every erase rect across the whole page before slicing
        all_erase = [r for b in cfg["bands"] for r in b.get("erase", [])]
        if all_erase:
            im = erase(im, all_erase, W, H)

        out_dir = OUT_ROOT / slug
        out_dir.mkdir(parents=True, exist_ok=True)

        bands = []
        for band in cfg["bands"]:
            if band["type"] not in ("art",):
                bands.append(band)
                continue

            y0 = int(round(H * band["from"] / 100))
            y1 = int(round(H * band["to"] / 100))
            slice_ = im.crop((0, y0, W, y1))
            sw, sh = slice_.size

            base = out_dir / band["id"]
            slice_.save(f"{base}.webp", quality=90, method=6)
            slice_.save(f"{base}.jpg", quality=90, optimize=True, progressive=True)

            big = slice_.resize((sw * 2, sh * 2), Image.LANCZOS)
            big = big.filter(ImageFilter.UnsharpMask(radius=1.4, percent=60, threshold=3))
            big.save(f"{base}@2x.webp", quality=82, method=6)
            big.save(f"{base}@2x.jpg", quality=86, optimize=True, progressive=True)

            out = dict(band)
            out["src"] = f"/assets/comps/{slug}/{band['id']}"
            out["w"] = sw
            out["h"] = sh
            bands.append(out)
            total += 1

        manifest[slug] = {"width": W, "height": H, "bands": bands}

    (ROOT / "content" / "comps.build.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Sliced {total} art bands across {len(manifest)} pages.")


if __name__ == "__main__":
    main()
