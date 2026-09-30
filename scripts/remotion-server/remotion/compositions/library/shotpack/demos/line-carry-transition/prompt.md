---
name: line-carry-transition
summary: Line-relay lateral transition — scene A's progress bar extends off-frame, the camera follows the line sideways, the line rounds a corner mid-move to frame scene B's card box, with no cut anywhere
use: Between two scenes with graphic kinship (progress bar→card frame, underline→chart axis); a film's signature transition slot, the graphic-relay of the Catch Me If You Can title sequence
duration: ~5.3s (progress bar fills + lateral move 60f + framing + content fade-in + stillness 36f)
energy: Medium
tags: camera
---

## Intent
The three big families of the transition library (travel/hidden-cut/solid-block) all answer "how does the scene change"; this card's answer is **it doesn't change at all — a line walks you over there**. After the progress bar fills, its tip extends into a long line bursting past the card edge; the camera follows the line laterally 1920px into the new world; mid-move the line turns a right angle to trace scene B's card frame; the frame closes, content fades in, and from start to finish the viewer's eye never leaves this line. Graphic continuity is itself the transition. The difference from a match cut: that one aligns shapes across the cut — a cut after all; this one draws continuously — **there is no cut**. The line's identity needs a narrative rationale (the progress bar "finished", so it extends), an unmotivated line is only decoration.

## Core Motion
- A 3840-wide world container translateX acts as the camera, moving 1920px over 34–94f with Easing.inOut(cubic)
- One hand-drawn polyline path (progress bar 560 + burst segment + right angle + 560×330 rectangular frame, total length 3980) evolves dasharray/dashoffset throughout, driving the drawn length in segments
- **Linchpin: during the lateral segment drawn = 1100 + cam, the line's growth and the camera displacement run at the same speed** — the pen tip pins at screen x≈1500 (right of center), never leaving the frame and never falling behind; once it loses sync, viewers losing the line equals losing the transition
- The r=11 ink dot follows the line; after the frame closes, it fades out linearly at 112–118f and is conditionally unmounted (mask-removal ruling); B content finishes fading in before 124f, 124–160f is 36f of true stillness

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Line body | 6px ink solid line | Too thin and it's lost during the lateral move; dashed reads as an unfinished state |
| Lateral ratio | 1920px / 60f (32px/f) | Longer distances scale up the duration proportionally, don't speed up — >40px/f the pen tip starts to smear and be lost |
| Pen tip position | Screen x≈1500 (~78%, right of center) | Centered reads as "the line chasing the camera"; near the edge, one jitter sends it off-frame |
| Corner | Hard right angle, no rounding | Rounded soft corners lose the drafting feel, and the Saul Bass flavor is gone |
| Frame closure | B content fades in only after the closure frame | Content before the frame closes wastes the line's suspense |
| Ending | ≥36f of true stillness after the fade-in | The pen tip ink dot must be conditionally unmounted; residue destroys the stillness |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- Relationship to draw-svg-trace: that one is element-level stroke callouts (the line belongs to the element); this one is scene-level line relay (the line belongs to the camera) — the two can coexist in one film, but the lines' semantics must be consistent: both the same 6px ink hand-drawn feel, or both geometric hard lines; mixing reads as two art styles
- ≤1 time per film — this is a signature transition, not a regular one; the second appearance breaks the magic
- The start must be a natural extension of an existing graphic component (progress bar filling out, underline finishing drawing); starting a line out of nowhere reads as a screensaver
- Sound: one sustained pen-scratch while the line grows, one soft knock at frame closure (sound-design §4.5)

## Reference Implementation
demos/transition/line-carry-transition/
(LineCarryTransition.tsx)
