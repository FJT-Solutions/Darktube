---
name: scroll-brake-moves
summary: Two long-scroll hard-brake variants — changelog-scroll-brake (the basic version: a high-speed long scroll decelerates exponentially to an exact stop + the target row lifts) and brake-reticle-lock (the combo version: reticles bite onto the stop point on the exact same frame as the brake)
use: Changelog / release-history / long-list segments: "we ship constantly, and today's entry is the biggest"; use B when the stop point needs a harder impact
duration: A 4–5s / B 5s
energy: Opens high, lands medium (speed-contrast type)
tags: rhythm
---

## Intent
The Linear changelog video grammar: a whole year of update logs flies past as a long scroll (blurring into a color band), decelerates exponentially into a precise hard brake on the row for this release; that row lifts off the surface highlighted while the rest dim — the density says "we ship constantly", the hard stop says "today's entry is the biggest". B is the combo variation: on the brake frame, **the very same frame**, four L-shaped reticles fly in from off-screen and bite onto the stopped entry — the brake's "clunk" and the reticle's "click" resonate on the same frame (the combo's linchpin: the reticles' launch frame = the list's first stop frame; offset them and it degrades into two juxtaposed tricks).

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A changelog-scroll-brake | translateY sweeps ~2400px (out-exp exponential deceleration over ~50f); blur driven by inter-frame displacement difference (0–6px, auto-clearing to zero); the stop row lifts with scale 1.03 + shadow + 3px outline, the rest dim to opacity 0.38 | Basic version for changelog segments |
| B brake-reticle-lock | Scroll in three phases: sin-in acceleration → cubic-out hard deceleration overshooting +30px → bounce-back to rest; blur = v×0.12 capped at 24px; reticles fly in from ±620/±320 off-screen with Easing.back(2.4) and bite down, the highlight completes within 6f, the label pops with back(2.6) | Highlight segments where the stop needs a stronger impact |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Deceleration curve | A pure out-exp; B adds "overshoot 30px then bounce back" | Uniform-speed rolling reads as a marquee; B's overshoot-bounce is where the "clunk" comes from |
| blur drive | Inter-frame displacement difference `|p(f)-p(f-1)|` × factor | Hand-placed blur keyframes inevitably mismatch the velocity; the difference method is frame-deterministic (the pattern is now sunk into assets/lib/helpers/motion.ts velocityAt) |
| Row-height rhythm | Three tiers at 72/94/116 | Equal-height rows flying past give the color band no rhythm |
| Stop position | The target row stops at the vertical center of the frame | An off-center stop reads as an accident |
| B resonance frame | The reticles' launch frame = the list's first stop frame (strictly the same frame) | The combo's linchpin; 2f+ of drift and it falls apart |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- Division of labor with timeline-travel: this card hard-brakes a vertical list on "latest"; that card travels a horizontal timeline through "history" — when both appear in one film, separate them in time and each appears ≤1 time
- High-speed segment entries don't need real readable text — they blur into color bands anyway, placeholder gray blocks suffice; the stop-point entry must have publication-grade real content (Q10)
- After the stop, dimming the other rows to 0.38 is a composition move: don't go to 0 (the context disappears)
- Sound: a low riser underlays the high-speed segment, one impact on the hard brake; B adds a "click" on the reticle-bite frame (same frame as the impact but a different voice)

## Reference Implementation
demos/data/scroll-brake-moves/
(BrakeReticleLock.tsx / ChangelogScrollBrake.tsx)
