---
name: tear-streak-transitions
summary: Tear transition — glitch-displace noise tear (hard cut inside 16 horizontal strips misaligning and shaking), strip-level tearing with a digital-glitch meaning
use: High-energy page changes: digital-glitch/break semantics; strip-level tearing that keeps the page's integrity intact while maxing the energy
duration: Prior state ≥40f + tear 17–24f + ending ≥40f, ~4.5s (135–140f)
energy: High
tags: effects
---

## Intent
This card handles **strip-level tearing** — the page is sliced into horizontal strips moving at high speed, but every strip's content stays intact. This is a taste boundary drawn by repeated rulings: the debris-family transitions were all rejected three times (doom-melt's vertical bars falling, pixel-dissolve's squares flipping black, facade-block's bricks tumbling — all eliminated), while the strip family passed. Debris reads as "the page is destroyed"; strips read as "the page is moving at high speed" — integrity intact, energy maxed. Horizontal tear: strips misalign and shake left/right + a light/dark double-ghost, the grayscale dimensionality reduction of digital glitch (RGB split converted into light/dark double-ghost). Suited to system-fault/instant-jump semantics.

## Single-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A glitch-displace | 16 horizontal strips (outer clipping + inner full-page translateY aligned), each strip's translateX driven by the library's h(i*31+f*7) shaking ±70px, with light/dark misaligned double-ghost stacked; hard-cut to page B amid the shake decay at 58f, then shake 4f more to settle | Fault/break semantics; violent page change before a climax |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Shake amplitude | ±70px (spec-bumped tier), a full intact page underneath to prevent exposed gaps | The strip misalignment at the peak frame must be visibly obvious — ±12px-level reads as no tear at all |
| Envelope | 45–48f out-cubic surge → plateau → 56–62f linear decay | Impact ruling: out-cubic for the surge, linear for the decay |
| Double-ghost | ±12px light/dark double-ghost (brightness 0.45 / invert) | The grayscale dimensionality reduction of RGB split; without the ghost it's just shaking, not glitch |
| Mask removal | From 62f, strips, ghost, and filter all conditionally unmount to expose bare B | opacity 0 doesn't count as removal; leftover filters destroy true stillness |
| Ending | True stillness at 73f (≥40f) | R1 |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- **Strips, never debris** — any later technique of the same kind must be made of strips: horizontal strips each intact, never split into squares/bricks/independently falling objects (the three-time-rejected ruling; see Intent)
- A high-energy transition; watch the energy budget when used alongside the whip-pan/crash family in one film — high-energy transitions clustered together dilute each other
- The hard cut hides inside the shake decay (cut at 58f, settle at 62f) — a cut point exposed on a still frame loses the glitch's cover

## Reference Implementation
demos/transition/tear-streak-transitions/
(GlitchDisplace.tsx)
