---
name: logo-shrink-wordmark-lockup
summary: A neon-gap giant ring rapidly contracts into a small solid white O in the center with an overshoot brake; the icon shifts left to make room, letters slide in one by one to complete the lockup, an accent-color tagline closes it out
use: Film-end brand settling: from full-screen graphic energy down to the standard "icon + wordmark + tagline" lockup
duration: ~4.4s (132f@30fps; contract 0.1–1.2s · yield 1.5–2.1s · letters 2–2.7s · tagline 3.2–3.7s)
energy: Medium (impactful contraction segment, overall a steady settling rhythm)
---

## Intent
The film-end "stamping" action: the full-screen neon giant ring collapses with energy into a small icon, healing its gap and turning pure white (from performance state to standard state), then settles into place step by step per the brand's lockup spec — the icon yields, the wordmark enters, the tagline lands last. What the viewer sees is the brand "standing still" out of motion.

## Core Motion
- Main contraction curve: scale 5.4→1 (t=0.02–0.28, inOutCubic), with a `sin(π)*0.06` overshoot brake layered on t=0.26–0.37 — it swells 6% at the moment of arrival then settles back, a "hard stop with inertia"
- Gap healing and recoloring ride the same track as the contraction (t=0.10–0.28): the neon glow layer fades out, the stroke crosses halfway from #dfe9ff to #fff, the solid white O fades in — the three layers cross during the shrinking, so by landing it's already a clean white mark
- t=0.34–0.47 the icon translates translateX(−68px) left to make room (inOutCubic), clearing the axis's right side for the wordmark
- Five letters slide in staggered by `0.46 + i*0.035`: opacity 0→1 + translateX 8px→0, each 0.10 long, outCubic
- Tagline (accent `ACCENT`, 13px wide letter-spacing) fades in as a whole line at t=0.72–0.84, not per-letter — one tier below the wordmark's hierarchy

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Contraction scale | scale 5.4→1 | The starting multiplier decides "how full to how small"; <3 lacks impact, >7 blurs the initial state off-frame |
| Brake overshoot | +6%, sin envelope 0.26–0.37 | Cutting it reads as a hard freeze; >10% turns jelly |
| Healing window | 0.10–0.28 (synced with contraction) | Healing must finish before landing — still recoloring after landing reads as "not ready" |
| Leftward yield | −68px, 0.34–0.47 | Nearly seamless with the letters' first entry (0.46); leaving a gap feels like "waiting around" |
| Letter stagger | 0.035 per letter, 0.10 each | 5 letters total ~0.28; with more letters, back-calculate the interval as `(0.7-0.46)/n` to finish by 0.7 |
| Tagline entrance | 0.72–0.84 whole-line fade-in | Deliberately not per-letter: the tagline is a footnote, not the star; swap the `ACCENT` constant for the project color |

## Known Pitfalls
- `WORDMARK` (5 letters) and the tagline `BUILD. SHIP. REPEAT.` (20 characters) are both placeholders; when swapping in a brand word the letter-stagger rhythm depends on character count, and the tagline should keep a similar character count or the wide-spaced layout overflows or gets too sparse
- The icon is an SVG double-arc cut ring (abstract geometric mark); when replacing with the real brand logo, keep the two-layer "performance state → standard state" structure: one layer with effects (glow/color), one clean state, crossed via the same heal curve
- The −68px left shift is coupled to the wordmark width (row positioned at `50%-40px`) — when the character count changes, adjust both together so the lockup stays centered in the frame
- No loop-back is designed after the finish; use it as the outro's final shot; for a loop, append a 1s still frame after t=1

## Reference Implementation
demos/outro/logo-shrink-wordmark-lockup/
(LogoShrinkWordmarkLockup.tsx)
