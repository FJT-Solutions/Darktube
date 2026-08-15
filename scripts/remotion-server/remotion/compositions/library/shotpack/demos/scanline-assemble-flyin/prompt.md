---
name: scanline-assemble-flyin
summary: A page opens on an empty dark grid; a bright scanline sweeps top-to-bottom; wherever it reaches a block's landing point, that component flies in from off-screen and locks in, with motion blur and a landing edge flash — the page is exactly assembled the moment the scan completes
use: "Page generates itself" openers; core demos for AI site-building/auto-layout products; capability narratives from blank to finished
duration: ~4.6s (138f@30fps)
energy: medium-high (the scanline is steady, but each component fly-in is a burst point, density escalating)
---

## Intent
Give "the page being generated" a credible construction order: the scanline is the construction progress bar, components flying in from off-screen and locking in are the construction actions. The key is **the last block lands exactly when the scan finishes** — the scanline packing up early or components trailing behind both break the "scan drives assembly" causality.

## Core Motion
- The empty page shows only a dark grid (24px bidirectional `repeating-linear-gradient`, `rgba(255,255,255,.025)`, whole layer opacity .5) — the only visible thing before components fly in
- Scanline `t 0.05→0.72` constant velocity y −30→300, fades in 0.03→0.08, out 0.72→0.77
- Trigger time reverse-computed from each component's landing y: `ft = 0.05 + ((y+30)/330)*0.67 − 0.02`, clamped to minimum interval 0.045; the 0.02 early takeoff makes components and scanline arrive **simultaneously**
- 7 components each have their own fly-in plan `from:[dx,dy]` + `rot`: top bar from top (0,−70), logo from left (−160,−30, −6°), module card from right (230,40, 5°), H1 from bottom-left (−260,60, −4°), CTA from bottom (−60,130, 3°), footer/social from both bottom sides
- Fly-in `seg(ft, ft+0.15, outBack)` overshoots into place; during motion `blur(≤2.2px)` motion blur via `1−a`, cleared at `a>0.97`
- Landing instant flashes a thin bright edge: `inset:-3px` 1px accent stroke, `ft+0.11→+0.15` up, `+0.15→+0.26` down
- Status line counts components with `a≥0.99` showing `BUILD · 0n/07`, switching to `ASSEMBLY · COMPLETE` after `0.80→0.86`

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Scanline | t 0.05→0.72 constant, y −30→300 | the wrap-up moment must be slightly later than the last block landing, reading as "scan ends = assembly ends" |
| Trigger conversion | ft = 0.05 + ((y+30)/330)·0.67 − 0.02 | that −0.02 is the early-takeoff amount: removing it makes everything move only "after the sweep passes", half a beat late |
| Minimum interval | prev + 0.045 | footer/social with close y fly in together; clamping gives the "one block at a time" density |
| Fly-in offset | 60–260px from off-screen, per the component's location | under 60px reads as "a jiggle into place", not from off-screen |
| Fly-in rotation | ±3–8° | over 12° reads as "tumbling", not settling flush |
| Fly-in easing | outBack, 0.15 duration | outBack's overshoot is the "magnetic lock-in" feel; outCubic becomes a slide |
| Motion blur | blur ≤2.2px, decays with 1−a, cleared at a>0.97 | not clearing leaves a permanent haze; the threshold needs margin |
| Landing edge flash | inset −3px, 1px accent, 0.04 up / 0.11 down | the flash is the auditory substitute for "click into place"; without it the landing has no weight |

## Known Pitfalls
- **Trigger time is bound to the plan's landing y**: after changing the page template, re-measure every component's y, or components fly in before the scanline arrives
- `filter` and `transform` act on the component node simultaneously; after landing, reset filter to `none` (not `blur(0)`) — a lingering compositing layer keeps consuming GPU
- The edge-flash layer is a child appended inside the component; if the component has `overflow:hidden`, it clips the `inset:-3px` — move it to an outer sibling node
- Shares the same page template and scanline with `scanline-annotate-focus`; the two cards can chain (assemble first, then analyze), but the scanline must change direction or leave a gap, or it reads as repetition
- Page content is a neutral placeholder template; ACCENT (`#9fb6e8`) is replaceable per project

## Reference Implementation
demos/effects/scanline-assemble-flyin/
(ScanlineAssembleFlyin.tsx)
