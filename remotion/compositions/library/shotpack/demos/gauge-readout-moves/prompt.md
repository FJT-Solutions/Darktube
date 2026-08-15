---
name: gauge-readout-moves
summary: Two gauge-reading variants — needle-sweep-selftest (ignition self-check: the needle whips across the full arc, then settles back to the true value) and tape-scroll-fixed-pointer (the needle stays put while the tick-marked tape scrolls past, with a sprint-and-brake)
use: Dashboard opening rituals / performance-metric reveals; A for a multi-gauge boot-up feel, B for a single metric's big jump
duration: A 4–5s / B 4–5s
energy: Medium-high (mechanical ritual type)
---

## Intent
Turning "reporting a value" into a physical gesture of the instrument. A is a car's ignition self-check — the dial needle first "whooshes" across the full 270° arc, then settles back to rest at the true value; multiple gauges stagger into a wave, showing the range first and then the reading, with an opening-declaration feel. B is airplane airspeed-tape grammar — the needle/viewfinder is pinned dead-center of the frame while the tick-marked scale scrolls past as one piece; at a big value jump the tape sprints at 45px/f and ends with a spring brake that swings past and back — "the world moves, the needle doesn't", making the size of a number into a visible distance of travel. Division of labor with odometer-digit-roll: there, digits roll inside windows; here in B, even the tick marks and gridlines translate together.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A needle-sweep-selftest | Needle swings across the full arc in ~12f ease-out on the way out, ~20f on the way back with a 5–8° overshoot swing, settling on the true value; gauges staggered 3–5f; the value below pops in on the same frame the needle lands | Dashboard opening / system-ready ritual |
| B tape-scroll-fixed-pointer | Long tick tape translates: slow crawl → 45px/f sprint for ~25f → spring brake with overshoot swing to a stop; the in-window reading refreshes in sync | A single metric's big jump (performance doubling / quota increase) |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A sweep arc | Full scale 270° | Sweeping only to the true value = no self-check ritual; full arc then settling is what "show the range first" means |
| A overshoot | 5–8° swing on the way back | No overshoot reads like a digital clock; overshoot is the mass of a mechanical needle |
| A stagger | 3–5f per gauge | Sweeping in unison reads as copy-paste; staggering forms a wave |
| B sprint speed | 45px/f (big-jump segment) | Too slow reads as a uniform climb and "the world moves" fails |
| B brake | spring overshoot (swing past, then bounce back to the stop) | The swing-past in the original vocabulary is where the "clunk" comes from; a straight stop wastes it |
| True stillness | ≥30f fully locked after stopping | Needle-type motion most hates tail drift |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- Same-batch ring-close-overfill (ring close with overfill) needs a rework before another review, no addendum — circular-progress types are on the redo list; don't rush to merge it in as a third variant
- A's dial is hand-drawn SVG (arc ticks + needle); in production against a real dashboard, prefer a close-up of an existing gauge component in the page, and only build one if none exists
- Sound: A one "swish" for the needle sweep + a "tick" on landing (staggered, one per gauge); B a low rolling sound through the sprint and one muffled "clunk" on the brake

## Reference Implementation
demos/data/gauge-readout-moves/
(NeedleSweepSelftest.tsx / TapeScrollFixedPointer.tsx)
