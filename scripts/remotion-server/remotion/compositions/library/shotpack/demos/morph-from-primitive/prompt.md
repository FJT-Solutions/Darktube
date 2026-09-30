---
name: morph-from-primitive
summary: Primitive morph — a circle takes one breathing beat (anticipation), then an SVG path interpolates over 24f into a rounded-card outline, with content fading in
use: entrances for graphic/icon/card-outline subjects; the classic primitive from logo → UI container
duration: ~4.7s (breath 20f + morph 24f + content fade-in 12f)
energy: Medium-low
tags: opening
---

## Intent
The entrance library is all "coming in from outside" — fly-ins, slams, flips — the subject pre-exists off-screen; this card is **growing in place**: a stroked circle at the center of the frame first puffs one breath (scale 1→1.12→1), then its outline continuously morphs into a rounded rectangle card, and content fades in. The primitive pause plus breathing beat IS the anticipation — the graphical translation of Disney's anticipation: the circle "inhales" first, so the viewer knows it's going to change, and the morph itself needs no explanation. Only applies to graphic/icon/card-outline subjects — bitmap screenshots can't morph.

## Core Motion
- **The circle and rounded rectangle are written as isomorphic paths**: M + 8 cubic segments (4 straight edges with each third-split point forming a degenerate cubic + 4 corner segments using the kappa formula k=4/3·tan(Δθ/4)), with per-command numeric lerp generating the d string — fully deterministic, frame-driven
- The circle's anchor points take the same azimuths as the rectangle's, guaranteeing t=0 is a perfect circle with no mid-way self-intersection
- The breath beat scales 1→1.12→1 (spec's 1.06 was invisible; it becomes perceivable after increase — same family as the perceptibility judgment); both breath and morph use Easing.inOut(cubic), with interpolate fully clamped
- Content is HTML layered over the SVG, fading in 12f after the morph completes — no path-embedded content
- Timeline 140f: 0–10 dwell | 10–30 breath | 30–54 morph | 56–68 content fade-in | 68–140 true stillness 72f

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Breath magnitude | 1→1.12→1, 20f inOut cubic | <1.1 can't read "inhale"; >1.2 looks like it's about to explode rather than morph |
| Primitive dwell | 10f dwell + 20f breath, 30f total before morphing | <15f of dwell can't read "anticipation" and the morph feels abrupt |
| Morph duration | 24f | too fast reads as a swap, too slow as melting; 24f is the speed of "growth" |
| Target shape | 520×300 rounded rectangle card (demo value) | larger corner radius → better isomorphism with the circle and a smoother mid-section |
| Content fade-in | starts 2f after morph settles, 12f fade | content entering before the morph finishes = content wiggling along with the outline |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec; first real use must re-verify with real assets
- **Don't stack other animations mid-morph** — the morph itself is the entire message; a simultaneous fly-in/recolor/shake dilutes "growing" into "fidgeting"
- Bitmap screenshots can't morph: this card only works for vector outlines; page screenshots should go back to the entrance library's regular techniques
- Both ends of the path interpolation must be strictly isomorphic (both M+8C); mismatched command counts flash-jump midway — when changing the target shape, align the anchor counts first, then tune parameters
- A "barrel" mid-section during the morph is normal (QA judgment), not an illusion break; self-intersections or spikes are the sign that anchor azimuths aren't aligned

## Reference Implementation
demos/ui-entrance/morph-from-primitive/
(MorphFromPrimitive.tsx)
