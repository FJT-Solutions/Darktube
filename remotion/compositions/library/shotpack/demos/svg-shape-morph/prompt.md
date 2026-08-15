---
name: svg-shape-morph
summary: One 140-point closed outline smoothly morphs into another shape and back; the two shapes are first resampled in polar coordinates to the same point count, per-point radius interpolation with inOutCubic; mid-morph layers a slight scale breathing, slow self-rotation, and hue drifting from 185° to 305°
use: "shape transition / adaptation / organic growth" expressions for abstract concepts; an atmospheric beat before an opening logo, or transition shapes between chapters
duration: ~5.2s (156f@30fps)
energy: Low (continuous flow with no explosion — good as narration base or breathing beat)
---

## Intent
"Shapes change" can't be conveyed by crossfading two images — the viewer sees two things overlapping. A real morph must make the viewer believe this has always been **the same thing** changing its shape. Equal-point resampling plus per-point interpolation is the technical guarantee of that "sameness": no points created or destroyed, only radii changing. Morphing back closes the loop — seeing it go and return, the viewer knows this is a reversible capability, not a one-time transformation.

## Core Motion
- Both shapes are defined by polar-coordinate functions, not path strings:
  `rA(θ) = 76*(1 + 0.30*cos(3θ) + 0.05*sin(7θ+0.8))`,
  `rB(θ) = 76*(1 + 0.26*sin(5θ+1.2) + 0.06*cos(2θ))` — a three-lobe and a five-lobe shape, each with a layer of high-frequency perturbation for "organic" detail
- Resampling: both shapes sample at `i/140 * 2π` into `radA/radB` arrays, natively equal point counts with a one-to-one correspondence — exactly the point alignment morphTo needs, obtained for free in polar coordinates
- Interpolation happens only on radii: `r = lerp(m, radA[i], radB[i])`, angles constant. This guarantees any mid-interpolation state is a closed curve without self-intersection — no path-interpolation knotting
- The round trip uses two windows subtracted: `m1 = seg(t, 0.08, 0.42, E.inOutCubic)` (A→B), `m2 = seg(t, 0.58, 0.92, E.inOutCubic)` (B→A), `m = m1 - m2` — 0 is A, 1 is B, and the 0.42→0.58 gap is the dwell on shape B (~25f)
- Breathing and self-rotation are a second stacked layer: `breath = 1 + 0.045*(sin(m1*π) + sin(m2*π))` bulges the scale once at the **middle** of each morph (bulging most when the shape is most unstable); `rot = sin(t*2π)*4°` walks one integer cycle, returning to zero on the final frame
- Hue binds to the form: `hue = lerp(m, 185, 305)`, driving the stroke `hsl(hue,90%,66%)`, the fill `hsla(hue,80%,58%,.14)` and the `drop-shadow` glow — color is a reading of the form, not independent decoration
- The caption switches `morphTo(shapeB)` / `morphTo(shapeA)` when `m > 0.5`, with opacity `0.4 + 0.6*|m-0.5|*2` brightest when the form is most "pure" and faintest mid-morph

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Sample points | N=140 | 140 points are smooth enough on 480×270 (`L` line segments are invisible to the eye); <60 points shows polygonal corners, >300 is pure waste |
| Base radius | BASE=76, center (240,138) | 76 against a 270 height is ~56% — leaving margin for the glow; enlarging requires checking whether the 0.30 bulge pushes past the viewBox |
| Shape A | `1 + 0.30cos(3θ) + 0.05sin(7θ+0.8)` | 3θ sets the lobe count, 0.30 sets the bulge depth; depth >0.5 drives the recess radius toward 0 and pinches sharp corners |
| Shape B | `1 + 0.26sin(5θ+1.2) + 0.06cos(2θ)` | differing lobe count from A (5 vs 3) is what creates morph tension; same lobe count just looks like the shape "turned" |
| Morph window | 0.08→0.42 / 0.58→0.92, both inOutCubic | travel 0.34 (~53f); inOut's easing in and out is the key to "organic" — linear instantly reads as mechanical interpolation |
| Mid dwell | 0.42→0.58 (~25f) | the time for the viewer to register shape B; cutting it reads as one back-and-forth swing rather than A→B→A |
| Breath magnitude | 0.045 × `sin(m*π)` | 4.5% breathing peaks mid-morph; >10% reads as a scale animation rather than a deformation |
| Self-rotation | `sin(t*2π)*4°` (1 integer cycle) | 4° is a hint-level drift, returning to zero on the final frame for looping; >15° shows as whole-body rotation fighting the deformation for attention |
| Hue range | 185°→305° (cyan→purple) | the 120° span gives the two forms distinct identities; a span <40° makes the color change unreadable and the hue pointless |

## Known Pitfalls
- Polar-coordinate definitions can only express "one radius per angle seen from the center" — stars, petals, drops all work, but **any concave self-occluding shape (C-shapes, rings, holes) is inexpressible**. Morphing a real logo outline requires switching to path resampling; this card's technical route doesn't apply
- The path uses `L` line segments rather than curves, masked by point density. Under heavy magnification (>2×) or extremely thick strokes, corners show — raise N or switch to `C` segments for magnified scenes
- Every frame rebuilds the entire `d` string (140-point string concatenation × 2 paths). No pressure at 480×270, but multiple instances on screen or point counts up to 500 should consider caching interpolation results
- The two shape functions are hard-coded in setup, not parameterized. Changing shapes means editing function bodies rather than passing args — when porting, recommend extracting `rA/rB` as inputs, otherwise every variant duplicates a setup copy
- The caption `morphTo(shapeB)` is self-explanatory placeholder copy for the anime.js API — replace with meaningful text or remove it in final output
- Background hard-coded `#0a0b10`; the whole palette (90% saturated stroke + 8px glow) depends on the dark base. On white the glow dies and the 0.14 fill opacity is nearly invisible — light themes need reworked saturation and stroke width

## Reference Implementation
demos/ui-entrance/svg-shape-morph/
(SvgShapeMorph.tsx)
