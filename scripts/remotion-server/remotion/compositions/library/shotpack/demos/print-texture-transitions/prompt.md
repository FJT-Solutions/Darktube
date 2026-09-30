---
name: print-texture-transitions
summary: Print-texture transitions — ink-bleed-reveal (ink bleeding through a wispy edge to eat away the old scene)
use: Paper-and-ink aesthetic seams for scene changes; the third family alongside the six handoff variants and the three travel variants — "medium developing" transitions
duration: 4–4.5s (bleed segment 55–80f + stillness ending ≥30f)
energy: Medium (progressive manifestation, no impact beat)
---

## Intent
The transition vocabulary already has handoffs (six shot-transitions variants) and travel (transition-travel), both spatial/optical metaphors. This variant opens a third family: **medium metaphor** — the new image is not "arriving" but "printed/dyed" into being, directly invoking the library's paper-and-ink aesthetic physical imagination: like a drop of ink falling on rice paper and bleeding outward to eat away the old scene — organic, handwriting-feel. It's naturally at home in paper/ink-toned films, and is another "medium-family" seam choice besides light-leak-burn (which emphasizes colored light leaks).

## Single-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| B ink-bleed-reveal | The new page bleeds outward from the ink-drop point through an organic circular mask with wispy edges, swallowing the old scene with uneven speed | Old scene→new scene replacement; handwriting feel, narrative tone |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Wispy edge | SVG mask white circle with `feTurbulence(fractalNoise, baseFrequency 0.02, octaves 3, seed fixed)` + `feDisplacementMap scale 60→160` growing with frames | The filter only distorts the mask shape; the content stays sharp throughout; seed must be hard-coded (determinism) |
| Bleed | Radius [20,98f]→[0,1450px] Easing.out(quad), multiplied by `1+0.08·sin(0.32f)·env` uneven-speed perturbation (env decays to zero over the last 20f) | Constant-speed circular expansion reads as an ordinary iris — the perturbation is "the ink's temperament" |
| Ending mask removal | After fully bled (~frame 100), remove the SVG mask and lay the new scene directly | feTurbulence has sub-pixel jitter; without removal the ending never truly reaches stillness (actual-render ruling from this batch) |
| Ending | True stillness ≥30f after the new scene is in place | R1 |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- One seam one variant, same rule as shot-transitions: medium transitions don't stack with white flashes/shake; this variant and light-leak-burn (both medium family) total ≤2 per film, more makes the film read as a print-shop promo
- Mid-bleed, old-scene content briefly shows through the noise holes in fragments — read as ink-stain texture, an acceptable organic effect; but if the old scene contains highly recognizable elements like faces/logos it reads as glitch, so avoid it
- Slow transition (55–80f action segment); don't use it in high-tempo connected sections — go to variant E's whip there

## Reference Implementation
demos/transition/print-texture-transitions/
(InkBleedReveal.tsx)
