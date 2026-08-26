#!/usr/bin/env python3
"""Build the horizontal nav lockup (triangle left, wordmark right).

The clean logo we cut from the hero is a stacked lockup, but Joe's comps put a
horizontal one in the nav bar, so recompose it from the same transparent source.
"""
import pathlib
from PIL import Image

ASSETS = pathlib.Path.home() / "Documents" / "Apex Performance" / "assets"
src = Image.open(ASSETS / "logo_mark-640.png").convert("RGBA")
W, H = src.size  # 640 x ~591

# regions measured off the alpha channel of the stacked mark
tri = src.crop((123, 2, 517, 366))          # triangle
word = src.crop((14, 367, 637, 537))        # APEX + PERFORMANCE & RECOVERY

TARGET_H = 120          # generous master height; downscaled for delivery
GAP = 22

tw = round(tri.width * TARGET_H / tri.height)
tri = tri.resize((tw, TARGET_H), Image.LANCZOS)

ww = round(word.width * TARGET_H / word.height)
word = word.resize((ww, TARGET_H), Image.LANCZOS)

out = Image.new("RGBA", (tw + GAP + ww, TARGET_H), (0, 0, 0, 0))
out.paste(tri, (0, 0), tri)
out.paste(word, (tw + GAP, 0), word)

bbox = out.getbbox()
if bbox:
    out = out.crop(bbox)

w, h = out.size
print(f"lockup {w}x{h}")
for width in (480, 240):
    r = out.resize((width, round(h * width / w)), Image.LANCZOS)
    r.save(ASSETS / f"logo_lockup-{width}.png", optimize=True)
    r.save(ASSETS / f"logo_lockup-{width}.webp", quality=93, method=6)
    print(f"  wrote logo_lockup-{width} ({r.size[0]}x{r.size[1]})")
