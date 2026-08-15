---
name: overhead-camera-moves
summary: Two overhead reveal moves — tilt-reveal rights the frame to reveal, and overhead-tabletop-drop slides across a tabletop card array then plunges in
use: Openings/transitions that tell a story with the tilt angle: single-page establishing shots use A, multi-page surveys choosing one to plunge into use B
duration: A ~4.8s / B ~4.7s
energy: A Medium / B Medium-high
tags: opening, transition
---

## Intent
An overhead angle has long been missing from the library — crane-rise is a "translate + zoom" ascent (the tilt angle never moves), and space-camera's C drone-dive is a one-shot plunge landing; these two make **the tilt angle itself tell the story**: A is revelation — the full page lies flat with rotateX, the opening shows only a thin perspective band at the top edge, the camera "looks up" back to level, and content floods into view row by row, like lifting a blueprint off a table; B is selection — three page cards lie flat in a tabletop array, the camera slides across them overhead (Wes Anderson tabletop), then suddenly plunges onto the target page and rights it to full screen — "surveyed the lot, pick this one." Selection: use A for single-page openings, B for multi-page transitions/openings.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A tilt-reveal | within a perspective container, the full page lies flat at rotateX -80° and rights over ~43f; rotateX/scale/translateY share out-cubic with a light overshoot at the end | establishing openings; single subject |
| B overhead-tabletop-drop | card array lies flat at rotateX 62°; the pan segment moves only translateX to sweep across, and the drop segment runs angle/scale/translate all three channels together to plunge into the final layout | pick one after surveying multiple pages; works for both transitions and openings |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A tilt angle | rotateX keyframes [-80, 2.6, -0.9, 0] (f25→68→72→76), transformOrigin 50% 0% | the first version's -55° was too weak: f0 still shows half the page, losing the "narrow band" suspense (actual-render adjudication) |
| A linked motion | perspective 600→1200, perspectiveOrigin 5%→40% interpolated with progress; scale 3.2→1 + translateY 200→0 | without linked perspective the initial tilt never shows "only the top bar" |
| A ending | all animation ends at f76, leaving 69f of true stillness in 145f | overshoot ≤3°; anything larger reads as a spring, not a camera |
| B pan segment | f0–55 changes only translateX +700→-650 (in-out cubic), angle untouched | moving the angle during pan blurs the two segments' roles (adjudication: pan surveys, drop commits) |
| B drop segment | f55–85 runs three channels together: rotateX 62→-1.8→0.6→0 (out-cubic overshoot), scale 1→2.04→2.0, translateX -650→0 | all three channels must run together; sequenced motion reads as two separate actions |
| B card array | cards 996×560 (exact 16:9), final layout at scale 2.0 filling the frame squarely; transform order translateX→rotateX→scale | wrong order makes the pan trace an arc |
| B floor | light gray grid floor | without a floor reference, the horizontal sweep doesn't read as "camera moving" |
| B ending | all animation ends at f93, leaving 47f of true stillness in 140f | — |

## Known Pitfalls
- The demo was tuned and approved on grayscale/placeholder assets — the parameters are a tuning starting point, not a production spec; re-verify with real assets on first use
- Under steep perspective, cards must have backfaceVisibility hidden + translateZ(4px) as a safety net, otherwise occasional frames show backsides/depth breaking the illusion
- A and crane-rise-reveal are one-or-the-other per video — both are opening reveals, and two "reveal openings" cancel each other out
- Locking the angle during B's pan is the linchpin (two-segment role separation adjudication): surveying stays surveying, plunging stays plunging — mixed motion leaves viewers unsure what the camera intends
- Both variants are "big camera moves" and are mutually exclusive with space-camera/crane-rise in the same segment — only one camera driver per segment

## Reference Implementation
demos/camera/overhead-camera-moves/
(OverheadTabletopDrop.tsx / TiltReveal.tsx)
