#!/usr/bin/env python3
"""
Enhance Joe's soft WhatsApp page comps via Wavespeed GPT Image 2 /edit.

Reads local sources from assets/comp-sources/, needs them publicly URL-reachable
(pass --base-url, e.g. https://apex-preview-joe.vercel.app/assets/comp-sources).

Writes:
  assets/comp-enhanced/<slug>.png   (raw model output)
  assets/joe-<slug>-comp.jpg        (1x working copy)
  assets/joe-<slug>-comp@2x.jpg     (resized max 1800w for slice pipeline)

Then re-run:  python3 scripts/slice-comps.py && npm run build
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "assets" / "comp-sources"
OUT_DIR = ROOT / "assets" / "comp-enhanced"
API = "https://api.wavespeed.ai"
PATH = "/api/v3/openai/gpt-image-2/edit"

# map local filename → slice slug + original WhatsApp dimensions
JOBS = [
    {
        "file": "superhuman.jpg",
        "slug": "superhuman-protocol-long-island",
        "comp_prefix": "joe-superhuman-comp",
        "aspect": "9:16",
        "target_w": 1800,
    },
    {
        "file": "cryotherapy.jpg",
        "slug": "whole-body-cryotherapy-long-island",
        "comp_prefix": "joe-cryotherapy-comp",
        "aspect": "2:3",  # 1024x1536 — fall back to 9:16 if API rejects
        "target_w": 2048,
    },
    {
        "file": "hbot.jpg",
        "slug": "hyperbaric-oxygen-therapy-long-island",
        "comp_prefix": "joe-hbot-comp",
        "aspect": "9:16",
        "target_w": 1800,
    },
    {
        "file": "red-light.jpg",
        "slug": "red-light-therapy-long-island",
        "comp_prefix": "joe-red-light-comp",
        "aspect": "9:16",
        "target_w": 1800,
    },
]

PROMPT = (
    "Ultra-sharp high-resolution enhancement of this full-page mobile website "
    "design mockup for a premium wellness / recovery clinic. "
    "CRITICAL: Preserve the EXACT layout, composition, section order, spacing, "
    "colors, gradients, photography placement, icon placement, button shapes, "
    "and EVERY word of text with letter-perfect fidelity. Do not rewrite, "
    "rephrase, redesign, restyle, crop, stretch, or invent new UI elements. "
    "Only improve sharpness, texture detail, edge clarity, and image quality "
    "so the page looks crisp on a large desktop display. Keep dark premium "
    "aesthetic. Output a clean full-page portrait design."
)


def load_key() -> str:
    if os.environ.get("WAVESPEED_API_KEY"):
        return os.environ["WAVESPEED_API_KEY"].strip()
    env = Path.home() / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("WAVESPEED_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("WAVESPEED_API_KEY missing")


KEY = load_key()


def http_json(method: str, url: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
            "User-Agent": "apex-enhance/1.0",
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"HTTP {e.code}: {err[:500]}") from e


def submit(image_url: str, aspect: str) -> str:
    body = {
        "prompt": PROMPT,
        "images": [image_url],
        "aspect_ratio": aspect,
        "resolution": "2k",
        "quality": "high",
    }
    try:
        res = http_json("POST", API + PATH, body)
    except RuntimeError as e:
        # 2:3 not always accepted — retry as 9:16
        if aspect != "9:16" and ("aspect" in str(e).lower() or "400" in str(e)):
            body["aspect_ratio"] = "9:16"
            res = http_json("POST", API + PATH, body)
        else:
            raise
    if res.get("code") not in (200, None) and "data" not in res:
        raise RuntimeError(f"submit failed: {res}")
    data = res.get("data") or res
    get_url = (data.get("urls") or {}).get("get") or data.get("get_url")
    if not get_url:
        raise RuntimeError(f"no poll url in {res}")
    return get_url


def poll(get_url: str, timeout: int = 600) -> str:
    t0 = time.time()
    while time.time() - t0 < timeout:
        res = http_json("GET", get_url)
        data = res.get("data") or res
        status = data.get("status")
        if status in ("completed", "success"):
            outs = data.get("outputs") or []
            if not outs:
                raise RuntimeError(f"completed with no outputs: {data}")
            return outs[0]
        if status in ("failed", "error"):
            raise RuntimeError(f"job failed: {data.get('error') or data}")
        time.sleep(4)
    raise TimeoutError(f"timeout after {timeout}s")


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "apex-enhance/1.0"})
    with urllib.request.urlopen(req, timeout=180) as r:
        dest.write_bytes(r.read())


def export_working_copies(png_path: Path, prefix: str, target_w: int) -> None:
    im = Image.open(png_path).convert("RGB")
    # 1x: keep model output width but cap for web
    w, h = im.size
    # full enhanced as primary high-res
    hi = im
    if w > target_w:
        hi = im.resize((target_w, int(h * target_w / w)), Image.LANCZOS)
    hi_path = ROOT / "assets" / f"{prefix}@2x.jpg"
    hi.save(hi_path, quality=90, optimize=True, progressive=True)
    hi.save(ROOT / "assets" / f"{prefix}@2x.webp", quality=86, method=6)

    # 1x half for srcset
    one = hi.resize((hi.width // 2, hi.height // 2), Image.LANCZOS)
    one.save(ROOT / "assets" / f"{prefix}.jpg", quality=90, optimize=True, progressive=True)
    one.save(ROOT / "assets" / f"{prefix}.webp", quality=86, method=6)

    # also overwrite page-background aliases if present
    bg = prefix.replace("-comp", "-page-background")
    one.save(ROOT / "assets" / f"{bg}.jpg", quality=90, optimize=True, progressive=True)
    one.save(ROOT / "assets" / f"{bg}.webp", quality=86, method=6)
    tiny = one.resize((640, int(one.height * 640 / one.width)), Image.LANCZOS)
    tiny.save(ROOT / "assets" / f"{bg}-640.webp", quality=80, method=6)


def run_one(job: dict, base_url: str, force: bool) -> str:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_png = OUT_DIR / f"{job['slug']}.png"
    if out_png.exists() and not force:
        export_working_copies(out_png, job["comp_prefix"], job["target_w"])
        return f"[skip] {job['slug']} (exists)"

    image_url = f"{base_url.rstrip('/')}/{job['file']}"
    # verify reachable
    try:
        req = urllib.request.Request(image_url, method="HEAD", headers={"User-Agent": "apex-enhance/1.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            if r.status >= 400:
                raise RuntimeError(f"source not public: {image_url} → {r.status}")
    except Exception as e:
        # some hosts block HEAD; try GET range
        try:
            req = urllib.request.Request(image_url, headers={"User-Agent": "apex-enhance/1.0", "Range": "bytes=0-64"})
            with urllib.request.urlopen(req, timeout=30) as r:
                pass
        except Exception:
            raise RuntimeError(f"source not reachable: {image_url} ({e})") from e

    t0 = time.time()
    get_url = submit(image_url, job["aspect"])
    out_url = poll(get_url)
    download(out_url, out_png)
    export_working_copies(out_png, job["comp_prefix"], job["target_w"])
    return f"[ok]   {job['slug']}  {time.time()-t0:5.1f}s  {out_png.stat().st_size//1024}KB → {out_png.name}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", required=True, help="Public base URL for assets/comp-sources")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", nargs="*", help="Limit to filenames e.g. superhuman.jpg")
    ap.add_argument("--workers", type=int, default=2)
    args = ap.parse_args()

    jobs = JOBS
    if args.only:
        allow = set(args.only)
        jobs = [j for j in JOBS if j["file"] in allow or j["slug"] in allow]
    if not jobs:
        print("no jobs", file=sys.stderr)
        return 1

    print(f"Enhancing {len(jobs)} comps via Wavespeed GPT Image 2 edit (~$0.12 each, 2–4 min)")
    print(f"Base URL: {args.base_url}\n")

    results = []
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(run_one, j, args.base_url, args.force): j for j in jobs}
        for fut in as_completed(futs):
            j = futs[fut]
            try:
                msg = fut.result()
            except Exception as e:
                msg = f"[FAIL] {j['slug']}: {e}"
            print(msg, flush=True)
            results.append(msg)

    fails = [r for r in results if r.startswith("[FAIL]")]
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
