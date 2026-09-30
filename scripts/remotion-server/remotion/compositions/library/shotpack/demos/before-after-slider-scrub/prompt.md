---
name: before-after-slider-scrub
summary: Before/after comparison slider — the "before/after" versions stack on top of each other; the divider handle first whips across, then slowly sweeps back, revealing the new version like a photo developing under the bar
use: Effect-comparison segments for AI enhancement/optimization/refactoring features (one shot that makes "before vs after" clear)
duration: 4–5s
energy: Medium (the fast whip is the impact beat; the slow sweep is the reading period)
tags: interaction
---

## Intent
The standard comparison idiom in AI image product launch films: the same frame stacks "before" (low-contrast, grayish) under "after" (the clean version). A vertical divider with a round handle first whips from the left end to 70% (with an overshoot bounce-back), pauses a beat, then slowly sweeps back at about 1/5 the speed so the viewer can read the difference — **the speed contrast between the whip and the sweep is the rhythm**: the whip announces "it changed", the sweep proves "where it changed".

## Action Phases
| Phase | Frame Reference | Content |
|------|------|------|
| 1 Stillness | f0–14 | Handle sits at 8%; the frame is almost entirely "before" |
| 2 Fast whip | 12f | 8%→76% (out cubic) overshoot |
| 3 Bounce-back | 12f | 76%→70% |
| 4 Pause | ~18f | Let the viewer read the after |
| 5 Slow sweep | ~48f | 70%→40%, showing the difference a second time |
| 6 Hold | final ≥40f | True stillness |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Speed ratio | 12f whip vs 48f sweep, ~5:1 | Below 3:1 the rhythm contrast is imperceptible |
| Reveal | The after layer's clip-path inset right edge tracks the handle's x | If the handle and reveal edge drift apart, the illusion breaks |
| Handle | Round handle + slight scaleX stretch driven by velocity difference (peak 1.18), auto-returning to 1 at rest | The stretch gives the handle a sense of mass being "flung" |
| Before treatment | Low-contrast, grayed version | Making before too ugly is self-sabotage; the "worse" must be believable (a real old version / unoptimized state) |
| Badges | BEFORE/AFTER badges sit in the content area | Demo precedent: the first version covered the sidebar/avatar and broke the illusion |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- Both versions must share the same layout and camera position — different layouts read as two separate pages and the comparison fails (the same constraint as theme-switch-moves)
- In production, both before and after use real screenshots (Q1): before is the genuine state with old data injected or the feature turned off, not a hand-made "deliberately ugly" fake
- End the slow sweep at 40% rather than 0% — leave a stretch of after held on screen (the conclusion stays visible)
- Sound: one whoosh for the fast whip + a light tick on the bounce-back; the slow sweep is silent or has an extremely light friction sound (S4)

## Reference Implementation
demos/data/before-after-slider-scrub/
(BeforeAfterSliderScrub.tsx)
