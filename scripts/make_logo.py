#!/usr/bin/env python3
"""Cut a clean, transparent Apex logo from the 'Become the 1%' hero.

The repo's existing logo_full*.png are opaque crops with the triangle and the
final X clipped — which is what Joe means by "fix the logos". The hero art
carries the full lockup on a dark field, so we crop it tight and derive alpha
from luminance (bright metal stays, dark background drops out).
"""
import pathlib
from PIL import Image, ImageFilter

SRC = pathlib.Path.home() / "Documents" / "Apex Performance" / "assets" / "joe-home-become-one-percent.jpg"
OUT = pathlib.Path.home() / "Documents" / "Apex Performance" / "assets"

# tight box around triangle + APEX + PERFORMANCE & RECOVERY + tagline,
# clear of the archers' arms at either edge
CROP = (480 + 78, 18 + 4, 480 + 563, 18 + 452)

LO, HI = 26.0, 104.0  # luminance ramp for the alpha key

im = Image.open(SRC).convert("RGB").crop(CROP)
w, h = im.size

lum = im.convert("L")
# soften the key slightly so edges don't alias into the nav
lum_soft = lum.filter(ImageFilter.GaussianBlur(0.5))
alpha = lum_soft.point(lambda v: 0 if v <= LO else (255 if v >= HI else int(255 * (v - LO) / (HI - LO))))

# lift the metallic mid-tones back to fully opaque so the wordmark stays solid
alpha = alpha.point(lambda v: min(255, int(v * 1.45)))

# The hero's background energy (blue arcs left, red lens flare right) sits
# outside the lockup and survives the key, so clear it explicitly. Both boxes
# stop well above the "PERFORMANCE & RECOVERY" rule, which spans full width.
for box in ((0, 0, 68, 245), (415, 0, w, 250)):
    alpha.paste(0, box)

logo = im.convert("RGBA")
logo.putalpha(alpha)

# trim fully-transparent margins
bbox = logo.getbbox()
if bbox:
    logo = logo.crop(bbox)

w, h = logo.size
print(f"logo {w}x{h}")

for width in (640, 320):
    r = logo.resize((width, round(h * width / w)), Image.LANCZOS)
    r.save(OUT / f"logo_mark-{width}.png", optimize=True)
    r.save(OUT / f"logo_mark-{width}.webp", quality=92, method=6)
    print(f"  wrote logo_mark-{width} ({r.size[0]}x{r.size[1]})")
