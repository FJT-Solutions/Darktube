---
name: scanline-annotate-focus
summary: A bright scanline sweeps top-to-bottom across the page; wherever it passes, a camera viewfinder pops in sequence (1.75× converging + slight overshoot), then a monospace small annotation fires beside it, and the top status line counts in sync 00/06→06/06
use: "AI is reading your page/brand" analysis shots; design-system/brand-guideline breakdown intros; product capability self-explanation segments
duration: ~4.6s (138f@30fps)
energy: medium (mechanical and calm; rhythm driven by the constant-velocity scanline, annotations as beat points)
---

## Intent
Make the abstract act of "analyzing" a visible causal chain: wherever the scanline goes, that block gets framed and named. The viewer reads "the machine's gaze", so the scanline must be constant-velocity and annotations must strictly lag the scanline's crossing — **scan first, then frame pops**; once the order slips it becomes a pre-orchestrated animation.

## Core Motion
- Scanline `t 0.06→0.66` constant velocity (no easing) from y=−30 to 300, fades in 0.04→0.09, out 0.66→0.71
- Trigger time reverse-computed from the target bbox: `ft = 0.06 + ((y+h+30)/330)*0.60` — the instant the scanline crosses the bbox's **bottom edge**; then clamped by y-sorted minimum interval 0.05 (`ft = max(rawT, prev+0.05)`) to avoid two frames popping together
- Viewfinder built from 4 × 9px L corners, `outBack` drives `scale 1.75→1` (completes within 0.13, overshoot then steady), opacity via `min(1, a*1.6)` reaching full brightness early
- In-frame white `fill` layer flashes: 0.07 peak, `ft+0.04→+0.09` up, `+0.09→+0.22` down — like a camera focus-confirm flash
- Annotation `ft+0.05→+0.16 outCubic` fades in + `translateY 4→0`, 6.5px MONO, `letter-spacing:1.5px`, `#b8bdc7`
- Status line live-counts triggered frames (`fired`) showing `SCAN · 0n/06`, switching to `ANALYSIS · COMPLETE` in accent color after `0.74→0.80`

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Scanline | t 0.06→0.66 constant, y −30→300 | **zero easing**: adding ease reads as "someone dragging a progress bar" |
| Trigger conversion | ft = 0.06 + ((y+h+30)/330)·0.60 | denominator 330 = scan travel; changing the scan window requires changing it too, or frames pop before the scanline arrives |
| Minimum interval | prev + 0.05 (≈1.5f) | targets with close y pop simultaneously; clamping makes them individually readable |
| Viewfinder convergence | scale 1.75→1, outBack, 0.13 | 1.75× is the floor for "converging from outside"; 1.2× shows no aiming motion |
| Corner marks | arm 9px, stroke 1.5px | an arm over a third of the target's short side becomes a full border, losing the "framing" semantics |
| Focus flash | fill opacity peak 0.07 | over 0.15 it covers content, reading as "selection highlight" not focus confirm |
| Annotation | starts ft+0.05, completes 0.11, translateY 4→0 | the 0.05 lag is the causality of "named only after the frame steadies"; simultaneous is chaos |
| Counter line | live-counts fired, 7px MONO, 2px letter-spacing | a hard-coded timeline count desyncs when bboxes change; must be live-counted |

## Known Pitfalls
- **The scanline trigger time is tightly bound to target bboxes**: after swapping page content, re-measure each target's `x/y/w/h` and the annotation anchor `lx/ly`, or frames misalign with content
- bboxes are hand-tuned with padding (not auto-measured elements); changing the page template doesn't auto-follow
- Annotations use `white-space:nowrap` + hand-written `lx/ly`; longer words push off-screen — switch right-side targets' annotations to left-placement proactively
- Division of labor with `scanline-assemble-flyin`: that one is "scanned-then-assembled" (page from empty to built); this card is "scanned-then-annotated" (page already exists, analysis only)
- ACCENT (`#9fb6e8`) and `A_RGB` are the same color written two ways; re-skinning changes both sites

## Reference Implementation
demos/effects/scanline-annotate-focus/
(ScanlineAnnotateFocus.tsx)
