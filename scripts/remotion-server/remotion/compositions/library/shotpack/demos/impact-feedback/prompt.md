---
name: impact-feedback
summary: Hit feedback, two variants — hit-counter combo counting (hit-stop + damage numbers + combo jump text) and anime-impact impact frame (negative + focus lines + chromatic aberration)
use: The "hit instant" of elements landing/colliding — adds game-grade feel to slam-ins and collision stops; pick by intensity ladder
duration: n/a (element-level technique, parasitic on landing moves; frame usage per variant in the parameter table)
energy: high (instantaneous impact)
---

## Intent
An element slams into place but has no "it hit" instant — the landing reads as a PPT fly-in. Game juice (Vlambeer screenshake theory) and anime impact frames give the same answer: grip time on the hit frames so the impulse reaches the viewer's hands. The two variants are an intensity ladder: B uses local hit-stop layered with damage numbers and combo jump text, cutting a feature list into a combo — the most narrative; C is the heaviest punch — a 3-frame negative flash with burst focus lines on impact-stop, maximum emphasis, most stylized.

## Two-Variant Selection Table
| Variant | Approach | Use Case |
|----|------|------|
| B hit-counter combo | three cards slam in back-to-back; each hit = 2f hit-stop + damage number floats up + ×N count jump text escalating | feature volley segments — tell "lots of features" as a combo; strongly gamified |
| C anime-impact | crash-zoom impact-stop with 3f full-frame negative invert + radial focus lines + red-cyan aberration, all removed on the 4th frame | the one climactic punch of the film; maximum emphasis |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| B rhythm | three cards 30f apart, ease-in(quad) slam over 10f before the hit; each hit freezes the whole frame 2f | even intervals make the "combo" beat |
| B damage number | landing scale 1.4→1 + float up 40–60px + 12f fade | fade >16f drags, covering the next hit |
| B counter | pulse peaks 1.3/1.45/1.6, rotate −2/−4/−6°, escalating font size, `exp(−t/2.4)` decay | escalating add-on is the linchpin — three equal sizes don't read "hitting harder" |
| C crash push | crash-zoom 6f ease-in(cubic) pushes to 2.4x, card center converging to frame center | push params follow the crash-zoom-punch card |
| C impact frame | 3f from impact-stop: `invert(1) grayscale(1)` + 30 wedge focus lines (reshaped every 1–2f) + red/cyan negative copies screen-blended with ±8px offset; all removed on the 4th frame | 3f is the sweet spot — from 4f the viewer starts "seeing" the negative and the magic breaks |
| C recovery shake | from the 4th frame 6px exponential decay (τ≈2.2f), dry by ~12f | amplitude must clear the eye's threshold (perceptibility precedent) |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production final; first real use must re-verify with real footage
- Variant B's hit-stop **must be global** — the background scroll freezes too, or it doesn't read as "time gripped", just that card dropping frames. The demo drives every layer with a unified remapped frame df — this is the linchpin; only effects that must happen during the freeze (like the flash-white) run on the real frame f
- Frame remapping shares the same technical root as speed-ramp-freeze; don't stack the two cards on one shot — two remap systems fight each other and the rhythm reads as a glitch
- Variant C's negative frames steal the show hard in paper-ink aesthetic films — limit to one climax, and they must land on the same frame as the impact sound (foley goes through sound-design); a silent negative frame reads as a broken flash
- Variant B is heavily gamified (damage numbers/combo are obvious game tropes) — use sparingly in serious-toned products
- After multiple B hit-stops, real frames exceed animation time by the accumulated freeze frames; budget shots as `real hit frame = animation hit frame + frames frozen so far` (demo HITS_REAL)

## Reference Implementation
demos/effects/impact-feedback/
(AnimeImpact.tsx / HitCounter.tsx)
