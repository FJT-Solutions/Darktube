---
name: avatar-grid-radial-build-colorize
summary: An 8×7 grid of small cards grows ring by ring from the center to fill the screen (content mixes initials / icon / image placeholders), then ~15% of the cards turn red at random moments to flag anomalies, with the title and legend staying put in the center
use: Data narratives where an anomaly/highlight emerges from a crowd: user-group health, monitoring dashboards, bulk status overviews
duration: ~5.6s (168f @ 30fps; fill 0.5–1.7s · coloring emerges 1.7–3.4s)
energy: Medium (the growth phase has rhythm; the coloring phase is a quiet "discovery" moment)
---

## Intent
A two-act structure: Act One "the crowd takes shape" — cards sprout ring by ring from the center, like a colony growing under the lens; Act Two "the anomaly emerges" — once filled, individual cards turn red in sequence, forcing the viewer's eyes to scan the whole field for red dots. It turns "we're watching every item for you" into an experience.

## Core Motion
- Ring-based stagger: each cell computes its ring via `ring = round(hypot((c-3.5), (r-3)/0.85))`, with a delay of `(ring*4 + rand*3)/TOTAL` — plus a 3-frame random jitter within the same ring, so the growth wave feels organic rather than mechanical
- Cards enter with opacity only (0.018 window) + scale 0.8→1 (0.03, outQuad), **no translation** — they "grow in" rather than "fly in"
- Card content mixes three placeholder types (decided by `rand(i*9.1)`): initial pairs (logo slots), geometric icon glyphs (◆▲●✦), gradient blocks (image slots) — swap in real project assets in production (avatars/logos/thumbnails all work)
- The central 3×6 area keeps `visibility:hidden` placeholders instead of being destroyed — grid integrity is preserved, clearing a stage for the title and legend
- Coloring act: 15% of cards (`rand<0.15`) colorize at random times within t=0.30–0.60, each in a 0.036 window — white bg → light red #FDECEC, border → #F6CFCF, status dot green → red, the three channels mixing on the same beat
- The title enters first at 0.02–0.10 (scale 0.98→1); the legend (Active/Pending/Inactive three-color dots) follows at 0.26

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Growth speed | 1 ring per 4 frames + 3-frame jitter, filled in 1.2s | Faster than 3 frames/ring reads as a "flash"; dropping the jitter makes the wavefront line up like a machine |
| Anomaly ratio | 15% | <8% and viewers may miss it; >25% and "anomaly" becomes "the norm", flipping the narrative |
| Coloring window | 0.036 per card, spread across 0.30–0.60 | Coloring everything on the same beat reads as an alarm, not an emergence; the longer the spread, the stronger the "spotting them one by one" feel |
| Status colors | Green #37C46B → red #F0453A (dot), bg #FDECEC | Functional colors don't follow brand; don't tint the background red darker than #F8D8D8, card text must stay legible |
| Grid size | 8×7 − 18 central cells = 38 visible | Larger grids need gap and font size scaled down together; the central clearing scales with title length |
| Content mix | Initials / icons / images at 1/3 each (even rand split) | Using a single type throughout (e.g. all avatars) also works; the mixed version reads more like a "multi-type assets" scene |

## Known Pitfalls
- Use `visibility:hidden` for the central clearing rather than not rendering — removing cells shifts the ring center used by the ring computation and warps the growth wave
- The three coloring channels (bg / border / dot) must be driven by the same cT curve; if separated, you get intermediate states like "dot red, bg still white"
- The image placeholder is a CSS gradient block; when swapping in real images keep `overflow:hidden` and the inherited border-radius, and add a white outline to status dots on dark images
- Title/legend sit above the cards by z-index but have no backing plate; with a denser grid, add a semi-transparent pad behind the central area to keep them legible

## Reference Implementation
demos/data/avatar-grid-radial-build-colorize/
(AvatarGridRadialBuildColorize.tsx)
