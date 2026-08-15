---
name: basic-3d-scene
summary: impress.js-style spatial presentation: cards scattered through 3D space at different positions/rotations/scales, camera flies between stops taking the inverse of each step's pose, final step pulls back to OVERVIEW
use: Spatial storytelling for concepts/roadmaps/three-step methods; replaces flat slides with "a fresh spatial perspective per step"
duration: ~6.0s (180f @ 30fps; four stops, three flights of 0.96s each)
energy: Medium (each transition offers a spatial surprise; hold segments read cards quietly)
---

## Intent
Turn "flipping pages" into "traveling through a space of ideas": each card has not only a position but an orientation (step two turns 40° sideways, step three rotates the whole frame 90°), and when the camera aligns with it, the viewer's world turns along — the spatial change itself becomes the ritual of "entering a new chapter."

## Core Motion
- One-line core recipe: **camera = stepTransform.inverse()**. Each step only writes the card's own pose (x/y/z/rx/ry/rz/s); the camera transform takes the inverse via `scale(1/s) rotateZ(-rz) rotateY(-ry) rotateX(-rx) translate3d(-x,-y,-z)`, with the order strictly reversed
- Each of the four stops has its own dramatic beat: STEP01 frontal view at origin → STEP02 shifted right 520px + ry−40° (world turns left) → STEP03 rz90° (frame laid on its side; the camera rights it) → OVERVIEW s=3.1 (camera pulls back 1/3.1 for the overview)
- Chained flight interpolation: three segments `flyAt=[0.22,0.48,0.76]` of 0.16 each (inOutCubic); cam lerps from its current value toward the next stop — interrupting any segment leaves a valid pose
- enter/exit focus: `af` (accumulated flight progress) plus card-index distance drives `opacity 0.28–1 + blur 0–3.5px`; the OVERVIEW segment forces every card lit (`max(1-d, over)`)
- The OVERVIEW card itself scales up 3.1× but its content is pre-divided by 2.2 — in the overview it reads as a "title placard," not a giant

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Stop pose | at least one new transform dimension per stop | shifting only x/y is a panning slideshow; the rz stop (frame rotation) is the memorable beat — use once per video |
| Flight duration | 0.16 (~0.96s) | segments with rotation shouldn't be faster than 0.12; viewers need time to grasp "the world is turning" |
| Hold interval | 0.10–0.12 | reading beat; when cards have a lot of text, prefer adding hold over cutting flight |
| OVERVIEW scale | s=3.1 (camera pulls back 1/3.1) | larger values read more "high-altitude"; make sure every card is in frame, then leave 10% margin |
| Focus falloff | opacity floor 0.28 + blur peak 3.5px | don't set the floor below 0.2 — out-of-focus cards must stay "present"; pure black loses the sense of space |
| perspective | 1000px | ratio to max \|z\| (520) is about 2:1; deeper z needs a proportionally larger persp to prevent distortion |

## Known Pitfalls
- The inverse transform's rotation order (Z→Y→X, reversing the forward transform's X→Y→Z) must not be shuffled — an out-of-order sequence is invisible on single-axis rotations but tilts multi-axis composite stops
- Card poses are consumed in two places — the card's own transform and the camera formula; to add a stop, only edit the poses table, don't touch either transform string
- At the rz90° stop, text inside the card lies down with it and only becomes readable once the camera rights it — that's the design (the "aha" moment as it rights), but keep that stop's copy short
- There's no return trip after OVERVIEW; it's for closing a segment. To loop back to STEP01, add a fly-back at the end (cam lerps back to poses[0])

## Reference Implementation
demos/camera/basic-3d-scene/
(Basic3DScene.tsx)
