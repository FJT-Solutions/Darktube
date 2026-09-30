---
name: sakuga-timing-shift
summary: Shooting on 3s becomes shooting on 1s — the element first moves with hand-flip-book staccato in 3-frame steps, at the climax moment it cuts to frame-by-frame silky sprint; the frame-rate quantization shift itself is the spectacle
use: Emphatic displacement of a single element (card entrance, metric crossing the finish line); sections needing a "handmade feel → climax burst" contrast
duration: ~5s
energy: Medium-high
tags: ui-entrance
---

## Intent
The library's timeline manipulation already has speed-ramp's continuous speed change and hit-counter's local freeze-frames. This card is another kind — **what changes is not speed but the frame rate itself**: the staccato segment drives frames q=floor(f/3)*3, the element only moves once every 3 frames (10fps hand-flip-book), from the switch frame on it uses the raw f frame-by-frame driving, silky sprint. Shooting on 3s' dullness and on 1s' smoothness cross-cut on the same screen, Japanese animation's shooting-on-counts performance (shooting on 3s / on 1s). The staccato segment isn't cheap feel, it's handmade feel, and the switch point is the climax marker.

## Core Motion
- Staccato segment: q = Math.floor(f/3)*3 as the driving frame, position linear X 120→1380, each step ≈79px; pose sin(q) rotate ±5°, a different pose each step
- f48 switch: switch to raw f continuous driving, Easing.out(poly(4)) high-initial-speed sprint turning back through the center + overshoot 36px + 3f scaleX 0.9 bounce-back hard stop
- Sprint segment's motion stretch is driven by position differential velocity (scaleX peak ≈1.35 / scaleY 0.88), 2 afterimage layers **conditionally mounted** — removed at low speed, not opacity 0
- Corner label "on 3s"/"on 1s" switches with the segment, popping 1.35× at the switch moment; the label's line-boil uses h() pseudo-random, frozen after f=108
- f108–150 true stillness 42f, no animation of any kind on the whole frame

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Shooting count | Staccato segment floor(f/3) (on 3s) | /2 the staccato is weak, /4 and up reads as the player freezing |
| Per-step displacement | ≈79px (total distance ÷ step count worked backward) | <30px reads as dropped frames rather than staccato — the linchpin |
| Inter-step pose | sin(q) rotate ±5° | Pure displacement staccato without pose changes looks like a bug, not a flip-book |
| Switch frame | f48 (staccato:sprint ≈ 3:2) | The switch must complete in one frame; any tween destroys the "count change" feel |
| Sprint easing | Easing.out(poly(4)) + overshoot 36px + 3f bounce-back | Initial speed must be fierce, maximizing contrast with the staccato segment |
| Closing | True stillness ≥42f, corner label boil frozen simultaneously | Residual boil destroys true stillness (same family as the feTurbulence hood-removal precedent) |

## Known Pitfalls
- demo tuned on grayscale/placeholder footage — parameters are a tuning starting point, not a production-final spec; first real usage must re-validate with real footage
- Single-time-manipulator-per-shot precedent: mutually exclusive with speed-ramp / hit-counter freeze-frames; only one person may move the timeline per shot
- The staccato segment's per-step displacement must be ≥30px to read as "staccato" — micro-step staccato reads as rendering dropped frames; this is this card's linchpin; if the step size isn't enough, shorten the total duration to afford bigger steps
- The switch point must be annotated (corner label "on 3s"→"on 1s" or a beat hit, sound-design §4.5) — without annotation viewers just feel "it got faster" and can't read "the count changed"

## Reference Implementation
demos/rhythm/sakuga-timing-shift/
(SakugaTimingShift.tsx)
