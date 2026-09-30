---
name: crane-rise-reveal
summary: Crane-rise reveal — opens tight on a single row of data, the camera decelerates as it rises and pulls back, rows flood in until the full dashboard fills the frame
use: "Detail-to-whole" establishing opening; the mirror image of drone-dive-landing (whole → single-point dive)
duration: 5s (close-up hold 20f + rise 100f + full-frame stillness 30f)
energy: Medium-high (sustained one-directional motion, no impact beat)
tags: camera, data
---

## Intent
The establishing library already has drone-dive-landing — slamming from a god's-eye view into a hero close-up, "whole → focus". This card is its mirror: "focus → whole" — first tight on a single row of real data so the viewer sees "what this is", then a crane-style rise and pull-back as row after row of content floods in, until the whole product fills the frame — "the row you're looking at is just one tile on this wall". Suited to openings that sell product scale/content richness; when both cards appear in one film, use only one direction.

## Core Motion
- transform-origin pinned top-left, linked by the formula `translate = screen center − anchor×scale`; the anchor travels along (bottom-row center)→(page center) **sharing the same Easing.out(quad) progress** as scale 3.2→1.0 — one p = one camera maneuver (same precedent as Variant C)
- The decelerating curve (fast first, slow at the end) is the crane feel: punchy at liftoff, easing to a stop near the apex
- Per-row pulse: when the camera's visible top edge `visTop = fy − 540/s` first crosses a row's top edge, that row pulses dark-gray for one beat (4f rise, 18f fall, G.ink overlay opacity 0→0.22→0) — the source of the "flooding in" readability; trigger frames are solved frame by frame, strictly synced to the camera move
- On a white base "brightening" is invisible, **darkening is what reads** (rendered precedent from this batch: a brightness lift on a white card is a no-op; switched to a dark overlay pulse)

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Starting close-up | scale 3.2, anchored on the bottom row (one row fills the frame) | hold ≥20f so "this is one row of data" registers before liftoff |
| Rise | 100f Easing.out(quad), scale 3.2→1.0 | Faster than 80f and the row pulses can't keep up; slower than 130f and the middle drags |
| Row pulse | Cross-line triggered, 0→0.22→0 dark overlay over 22f | If the pulse lags the camera (fixed-interval trigger) it breaks the illusion instantly |
| Landing | True stillness ≥30f after full frame | R1; the full-frame frame is the standard composition, no extra push |

## Known Pitfalls
- The demo was tuned against grayscale/placeholder assets — parameters are a tuning starting point, not a production lock; first real use must be re-validated on real assets
- The starting close-up = one row magnified 3.2× under close scrutiny; real assets must first pass aesthetic guideline Q2's high-resolution rasterization technique, or low-res captures blur from the first frame
- The fast rise segment can be wrapped in CameraMotionBlur (see the motion-blur row in deck-deal-flyin), but only the first half's fast stretch — wrapping the slow apex approach smears the text soft (round #8 precedent)
- Don't pair with drone-dive-landing in the same film (one rises, one dives, mirror images the viewer reads as the same trick); tilt-reveal, the crane's closest semantic neighbor, is not in the library — don't conflate the names

## Reference Implementation
demos/opening/crane-rise-reveal/
(CraneRiseReveal.tsx)
