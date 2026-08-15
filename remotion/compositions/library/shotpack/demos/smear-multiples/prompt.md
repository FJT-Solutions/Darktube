---
name: smear-multiples
summary: Afterimage doppelgangers — while a card moves fast horizontally it drags 4 clearly countable semi-transparent duplicate copies, which collapse and merge at the landing moment; an animation-style alternative to motion blur
use: When a fast-displacement section wants "comic-style speed feel" rather than "photographic blur"; pick one of it or CameraMotionBlur
duration: Element-level technique (move 12f + merge bounce-back 8f, parasitic on the displacement move)
energy: Medium-high
tags: effects
---

## Intent
The library's standard answer for the speed feel of fast displacement is CameraMotionBlur (photographic metaphor: shutter smear, continuous blur). This card gives a second answer, the smear frame tradition of anime staging: afterimages are **discrete, crisp, countable** full copies — viewers can count 4 cards, reading "so fast it leaves doppelgangers" rather than "so fast it blurs". The two temperaments are completely different: blur is live-action-grade texture, doppelgangers are comic-grade fun; pick one per displacement, stacking reads as a rendering error. The doppelganger style also has a practical advantage: content stays recognizable inside the afterimage, suited to scenes where "the moving thing itself is the information".

## Core Motion
- Position written as a pure function `posAt(f)` (e.g. 12f inOut cubic to the overshoot point + 6f bounce-back); the k-th doppelganger just evaluates `posAt(frame − k·2)` — the same interpolation re-evaluated at a shifted frame number, naturally frame-independent and computable (the same pattern as disney delayed-sampling drag layers; the pattern has already sunk into assets/lib/helpers/motion.ts velocityAt/lagged)
- Doppelganger opacity 0.45/0.30/0.18/0.09 decreasing, full element copies (no stretch, no deformation)
- Velocity gate: `v = posAt(f) − posAt(f−1)`, render doppelgangers only when v>25px/f, with linear fade-in over [25,60] to avoid doppelgangers popping out instantly — no afterimage at low speed preserves the semantic integrity of "fast is when doppelgangers appear"
- Landing merge: cv∈[0,1] (3f), doppelganger delay multiplied by (1−cv) shrinking to 0 + opacity pressed to zero — the instant the doppelgangers "catch up" with the body is the landing accent, paired with a 3% overshoot bounce-back

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Doppelganger count/interval | 4 / 2f apart | >5 reads as a parade; interval >3f breaks into skipped frames |
| Move speed | ~900px/12f (peak ~100px/f) | Slow movement doesn't deserve doppelgangers (the gate governs); past ~3f per distance and doppelgangers can't be seen in time |
| Merge window | Dries within 3f before landing | Doppelgangers lingering past landing read as ghosting malfunction |
| Closing | True stillness ≥20f after landing bounce-back | R1 |

## Known Pitfalls
- demo tuned on grayscale/placeholder footage — parameters are a tuning starting point, not a production-final spec; first real usage must re-validate with real footage
- **Mutually exclusive** with CameraMotionBlur for the same displacement; different shots in the same film may each use one (one comic-style and one photographic-style actually adds dimensionality), but unify within the same kind of displacement (P4 consistency)
- Doppelgangers are "crisp full copies" — adding blur, stretching, or deforming slides toward another technique (axial stretch is a separate case in the vocabulary); staying countable is this card's identity
- On dark-background-light-card contrast the doppelganger layers read clearly; on same-hue backgrounds the 0.09 tier disappears, so reduce to 3 doppelgangers reweighted 0.5/0.3/0.15

## Reference Implementation
demos/rhythm/smear-multiples/
(SmearMultiples.tsx)
