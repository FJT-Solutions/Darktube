---
name: stroke-segment-build
summary: Broken strokes make the word — the title splits into a dozen disconnected stroke segments lit up in random order; the first 70% is unreadable, then the moment the last segments land the meaning "snaps" into place
use: Opening suspense-pull reveals of a product name / big number; ≤1 time per film; division with type-assembly/draw-svg-trace: those show "watching the word get assembled/drawn", this card is "meaning revealed late"
duration: 4–5s
energy: Low start, mid peak (suspense type; the landing frame is the energy point)
tags: typography
---

## Intent
The Alien opening-title precedent: the title isn't drawn, it "develops" — split into discrete stroke segments lit in random order, so for the first 70% of the time the viewer only sees mysterious fragments, until the moment the last few segments land and the word suddenly reads. "That moment of recognition" is the hook, and its strength depends on how long the unreadable period holds and how late the key segment is pressed.

## Action Phases
| Phase | Frame Reference | Content |
|------|------|------|
| 1 Dark field | f0–10 | Empty frame settles |
| 2 Random-order lighting | ~f10–105 | Each segment 6f (opacity 0→1 + 12px slide-in along the stroke direction, out cubic), segments staggered 6f apart |
| 3 Landing pulse | Last segment's landing frame | Whole word pulses scale 1→1.06→1 over 8f |
| 4 Freeze | Last ≥30f | True stillness; can follow with a full 1s hold (R1 brand spot) |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Segment granularity | 4 letters ≈16 segments (SVG line with thick square caps, ~44px stroke width) | Too few segments shortens the suspense; too fine reads as noise |
| Random-order table | Hand-arranged: jumps across letters, with the "readability key segment" (e.g. the H crossbar) pressed to the last 2–3 segments | Lighting in order = no suspense; the key segment early = the payoff leaks early |
| Unreadable period | At 60–70% of the total duration the word should still not read | QA picks a mid-frame and asks "can you guess it?" — if you can, reorder |
| Landing pulse | scale 1.06 / 8f | The demo self-rates 6% as too subtle; production can push to 1.10 |
| Unlit segments | Conditionally not rendered (not opacity 0) | The prerequisite for true stillness at the end |

## Known Pitfalls
- The demo was tuned against grayscale/placeholder assets — parameters are a tuning starting point, not a production lock; first real use must be re-validated on real assets
- Auxiliary text on dark bases must use light gray — the demo's first version had a dark-gray top title on a dark base, invisible (caught by the P1 self-check)
- Character cap: 4–6-letter words are best; long words make the unreadable period hard to control and the segment count explodes
- This card lives on the "recognition moment", so the title must be a word the viewer knows (product names / SHIP / LIVE etc.); invented words have nothing to "recognize"
- Sound: sparse light foley or silence as segments light up; one impact on the landing frame + optionally a riser bed

## Reference Implementation
demos/opening/stroke-segment-build/
(StrokeSegmentBuild.tsx)
