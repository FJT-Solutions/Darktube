---
name: line-boil
summary: Line boil — during a hold, text/outline contours jitter slightly every 3 frames, like hand-drawn frame-by-frame redrawing, keeping still frames "alive" with breathing
use: Long hold segments of title cards/outlined elements (first choice for upgrading black-field title cards); texture-layer technique, parasitic on other shots
duration: parasitic — boil segment follows the host's hold length, no duration of its own
energy: low (noise-level)
tags: typography
---

## Intent
The library's R-series precedents demand "true stillness" after settling, but a long title card (3s+ black-field card, end credits) fully frozen reads as "the film hung". This card offers a third state: **alive stillness** — the contour gets "redrawn" every 3 frames, position and content utterly motionless, only the line edges breathing ever so slightly; the hundred-year convention of hand-drawn animation hold frames. The difference from noise-drift (rejected) is exactly perceptibility: drift is a whole-body 1–3px shift (invisible to the eye); boil is contour deformation + stepped jumps (every seed change is a visible "redraw"). In paper-ink aesthetics this is the direct source of the "handmade feel".

## Core Motion
- SVG filter: feTurbulence(fractalNoise, baseFrequency 0.015, numOctaves 2) + feDisplacementMap **scale=8** (original 3–6 imperceptible, bumped up) applied to text/outline layers
- **seed = Math.floor(f/3) stepped** — jumps to a new deformation every 3 frames, a 10fps flip-book texture; frame-by-frame seed change reads as video noise, not hand-drawn
- **Unmounting linchpin** (feTurbulence precedent): outside the boil segment the filter and SVG defs aren't rendered at all (conditionally mounted), not opacity-0 — otherwise never truly still
- Structure via contrast: the demo proves perceptibility with still 35f → boil 70f → unmounted still 35f; in production the boil segment simply fills the host's hold

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| displacement scale | 8 (large titles); small text/thin lines 5–6 | >12 reads as glitch distortion; <4 imperceptible |
| seed beat | floor(f/3), i.e. redraw every 3 frames | /2 too twitchy, /4+ reads as stutter frame-drops |
| baseFrequency | 0.015 (deformation scale ≈ character height) | 0.05+ becomes fuzzy edge noise, not "redraw" |
| Applicable targets | big titles, outlined frames, hand-drawn circle annotations | solid small elements (icons/avatars) boiling reads as blur |
| Relation to R-series | boil segment counts as a legal hold; if the host shot's ending needs absolute stillness, unmount ≥15f early | the unmount instant where the contour returns is itself a closure |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production final; first real use must re-verify with real footage
- ≤1 element group boiling at once per film — title boiling and card frame boiling leaves the viewer unsure what to look at (P4)
- Related to but distinct from speed-lines/focus-lines "boil" (impact-feedback C reshapes every 2 frames): that's high-energy boil on impact frames, this is noise-level boil on hold frames, two energy tiers apart — don't swap params
- SVG filters carry render cost on large layers; a full-1920 text layer is acceptable, but boiling a whole-page screenshot doubles render time and is semantically wrong (a page isn't a hand-drawn object)
- paper-title-card/black-field title card (shot-transitions D) is this card's preferred host; when combined, start the boil after the card's typewriter/stamp entry finishes

## Reference Implementation
demos/effects/line-boil/
(LineBoil.tsx)
