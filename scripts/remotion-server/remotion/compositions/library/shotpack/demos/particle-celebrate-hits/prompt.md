---
name: particle-celebrate-hits
summary: Two celebration-particle variants — confetti-crossfire (twin cannons fire crossing confetti barrages on the milestone-reveal frame) and counter-tick-sparks (the counter bursts sparks at its top each time it crosses a full thousand)
use: Milestone-number / KPI reveal / achievement segments; A for a one-time big celebration, B for a continuous stream of small hits
duration: A 3–4s / B 4–5s
energy: Climax-embellishment type (the burst must settle back into clean stillness)
tags: effects
---

## Intent
Giving "number reveals" audible, visible hits. A is the full stop of the reveal moment — two cannons in the lower left and right fire on the same frame, hundreds of flipping confetti pieces cross the whole screen on parabolas and fall out of frame, pure celebration semantics. B is the comma in the process — each time the counter jumps past a full thousand, a small spray of sparks bursts at the top of the number with a "ding", falls, and dies out; on the final-value jump it doubles into a big spray plus the number popping 1.1x. Both variants use closed-form ballistics (initial velocity + gravity + decay per-frame formulas) — no physics engine, fully frame-deterministic.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A confetti-crossfire | Two cannons, 50 rectangular confetti each: initial velocity 90–150px/f (with decay 0.9, ~900–1500px total travel so the streams cross the center line), spread 55°, flipping 8–15° per frame; conditionally unloads after ~90f when everything has fallen out of frame | One-time climax for a final-value reveal / launch statement |
| B counter-tick-sparks | Tick frames derive from the counter's own interpolate; each tick sprays 6–10 2px sparks (initial velocity upward 4–6px/f, gravity dying them out in 12–18f); the final-value jump doubles to 20 sparks plus the number popping 1.1x | Rhythmic hits through the count-up climb |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A initial velocity | 90–150px/f | The original vocabulary's 18px/f only travels 180px under decay, imperceptible — for ballistic types, derive the amplitude backward from total displacement |
| A palette | Mostly grayscale + 1/3 accent | All-color reads as off-brand on the B side; all-gray doesn't read as celebration |
| B spark count | 6–10 regular, 20 on the final value | The default is the most understated; if too weak, go 3× for an extreme version |
| Ballistics | Closed-form formulas (seeded pseudo-random initial velocity and angle) | Computable independently per frame; Math.random is forbidden |
| Ending | Conditional unload when particle lifetimes expire | The ending must be true stillness; leftover particles = dirty frames |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- Same-batch combos ring-confetti-blowout (ring × cannon) and lights-out-tick-burst (lights-out × sparks) were both rejected — **explosion × explosion with the same texture stacks into overload**; be careful stacking this card's variants with other explosion-type techniques (slam/impact family) on the same frame
- A is reserved for "worth firing the cannons" moments, once per film; firing repeatedly reads as cheap
- Sound: A's two cannons "boom-boom" staggered 1–2f has more depth; B gets a thin "ding" per tick

## Reference Implementation
demos/data/particle-celebrate-hits/
(ConfettiCrossfire.tsx / CounterTickSparks.tsx)
