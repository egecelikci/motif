#!/usr/bin/env python3
"""WCAG 2.2 SC 1.4.3 (Contrast Minimum, AA) check for the Forgejo theme
fragments sitting next to this script.

Muted/secondary text must reach 4.5:1 against every text-bearing surface it can
appear on. Surfaces are derived from each theme's palette; the text tokens are
read from the fragment files, so editing a fragment value without keeping it
accessible makes this fail.

Run:  python3 check-contrast.py    (exit 0 ok, 1 regression)
"""
import re
import sys
from pathlib import Path

AA = 4.5
HERE = Path(__file__).resolve().parent


def c(s):
    return tuple(int(s[i : i + 2], 16) for i in (0, 2, 4))


def lum(rgb):
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

    r, g, b = rgb
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def mix(a, b, t):
    return tuple(round(x * (1 - t) + y * t) for x, y in zip(a, b))


def tokens(path):
    """Explicit --color-*:#rrggbb values declared in a fragment."""
    out = {}
    for name, val in re.findall(r"--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;", path.read_text()):
        out[name] = c(val[1:])
    return out


def check(fragment, palette, surfaces, keys):
    toks = tokens(HERE / fragment)
    print(f"\n{fragment}  (palette {palette['label']})")
    missing = [k for k in keys if k not in toks]
    if missing:
        print(f"  FAIL: tokens not declared explicitly: {', '.join(missing)}")
        return False
    ok = True
    for name, bg in surfaces.items():
        for key in keys:
            r = contrast(toks[key], bg)
            bad = r < AA
            ok &= not bad
            print(f"  --{key:<19} on {name:<26} {r:5.2f}  {'FAIL' if bad else 'ok'}")
    return ok


def main():
    light = {"surface": c("f3e1d8"), "text": c("172c66"), "label": "ege.celikci.me light"}
    dark = {"bg": c("3a2a55"), "text": c("e8e2f3"), "label": "ege.celikci.me dark"}
    light_surfaces = {
        "body #fef6e4": c("fef6e4"),
        "input #ffffff": c("ffffff"),
        "box-body (zinc50)": mix(light["surface"], light["text"], 0.03),
        "box-header (zinc100)": mix(light["surface"], light["text"], 0.06),
        "box-body-highlight (zinc200)": mix(light["surface"], light["text"], 0.12),
    }
    dark_surfaces = {
        "body (steel800)": dark["bg"],
        "card (steel700)": mix(dark["bg"], dark["text"], 0.14),
        "input (steel650)": mix(dark["bg"], dark["text"], 0.20),
    }
    keys = ["color-text-light", "color-text-light-1", "color-text-light-2", "color-text-light-3"]
    ok = check("motif-light.css", light, light_surfaces, keys)
    ok &= check("motif-dark.css", dark, dark_surfaces, keys)
    print("\nPASS: all muted text tokens >= 4.5:1" if ok else "\nFAIL: WCAG AA regression")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
