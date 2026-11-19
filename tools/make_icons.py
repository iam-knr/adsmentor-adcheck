#!/usr/bin/env python3
"""Generates the AdCheck icon set (yellow tile, big black shield, yellow check). Run: python3 tools/make_icons.py"""
from PIL import Image, ImageDraw
import os

BG, YEL = (11, 11, 11, 255), (255, 210, 31, 255)
M = 2048  # master canvas (2x supersample of a 1024 design)
k = M / 1024

def q(p0, p1, p2, n=40):
    return [((1-t)**2*p0[0] + 2*(1-t)*t*p1[0] + t*t*p2[0], (1-t)**2*p0[1] + 2*(1-t)*t*p1[1] + t*t*p2[1])
            for t in [i/n for i in range(n+1)]]

shield = [(512, 118), (876, 236), (876, 520)]
shield += q((876, 520), (876, 770), (512, 928))[1:]
shield += q((512, 928), (148, 770), (148, 520))[1:]
shield += [(148, 236)]
shield = [(x*k, y*k) for x, y in shield]

img = Image.new("RGBA", (M, M), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([0, 0, M-1, M-1], radius=int(224*k), fill=YEL)
d.polygon(shield, fill=BG)
w = int(100*k)
pts = [(338*k, 524*k), (464*k, 650*k), (694*k, 386*k)]
d.line(pts, fill=YEL, width=w, joint="curve")
for x, y in (pts[0], pts[-1]):
    r = w/2
    d.ellipse([x-r, y-r, x+r, y+r], fill=YEL)

out = os.path.join(os.path.dirname(__file__), "..", "extension", "icons")
for s in (16, 32, 48, 128):
    img.resize((s, s), Image.LANCZOS).save(os.path.join(out, f"icon-{s}.png"))
img.resize((512, 512), Image.LANCZOS).save(os.path.join(out, "..", "..", "docs", "assets", "icon-512.png"))
print("icons written")
