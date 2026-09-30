---
name: value-stagger-gradient
summary: 16 bars' entrance delay is temporal staggering, while height/hue/displacement/blur each lay out a numerical gradient from first to last; a second beat switches the stagger origin to the center, re-spreading with the pulse amplitude largest at the center
use: technique demonstration and parametrization-capability showcase; also directly usable as the entrance for data/spectrum/equalizer-type interfaces
duration: ~5.0s (150f@30fps)
energy: Medium-high (the first beat is a continuous spread; the second beat's center pulse is a clear single peak)
---

## Intent
Stagger is usually only used to offset time. This card's point is that it can also offset **values** — the same index decides both "when it moves" and "how far it moves". The two beats are a controlled comparison: the first beat's origin sits at the first position (gradient spread monotonically left to right), the second beat's origin moves to the center (gradient spread symmetrically from the middle). The viewer sees not two animations but one recipe with one parameter changed. The on-screen code caption swaps to the corresponding stagger call in sync, saying this explicitly.

## Core Motion
- The core tool is an 8-line `staggerVal(i, n, a, b, ease)`: normalizes the index to `k = i/(n-1)` then `lerp(k, a, b)` — equivalent to anime.js's `stagger([a, b])` value mode, with an optional ease for non-linear gradients
- Static gradients (written in setup, computed once): hue `staggerVal(i,N,200,320)`, max height `staggerVal(i,N,92,32)` — the 16 bars are born as a blue-to-purple, tall-to-short slope
- Dynamic gradients (computed per frame): displacement `staggerVal(i,N,46,14)`, blur `staggerVal(i,N,8,2)` — the first bar travels 46px and blurs 8px, the last only 14px and 2px. **Every bar's travel is different within one entrance**
- First beat temporal stagger: `d = i*0.02`, `e = seg(t, 0.06+d, 0.28+d, E.outCubic)` — starting from the first position, 16 bars spread over a 0.3 window; `opacity = e`, `filter = blur((1-e)*b0)`, `transform = translateY((1-e)*y0) scaleY(e)` — all three driven by the same e
- Second beat origin switch: `distC = |i - 7.5| / 7.5` is the normalized distance to the center, `w = seg(t, 0.56 + distC*0.13, +0.18)` — center bars move first, waves spread to both ends; this is `from:'center'`
- The second beat's amplitude is also a gradient: `amp = lerp(1-distC, 0.06, 0.42)` — center bars pulse 42%, ends only 6%; `pulse = sin(w*π)` is a pure pulse stacked into `scaleY(e*(1+pulse*amp))` and `brightness(1+pulse*0.55)`
- The caption hard-cuts its copy at t=0.52, from `scale: stagger([1, 0.35])  hue: stagger([200, 320])` to `pulse: stagger([.06, .42], { from: 'center' })` — landing exactly between the two beats

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Bar count | N=16 (`left: 8+i*5.4%`, width 3.4%) | 16 bars give the gradient enough bands; <8 and the gradient reads as "each bar is different" rather than one slope, >24 requires recomputing spacing |
| Temporal stagger | `d = i*0.02` (~3f/bar, 0.3 total) | 3f is a continuous spread; >0.05 becomes per-bar roll call and the gradient's "wholeness" is lost |
| Per-bar travel | window 0.22 (~33f, outCubic) | travel is 0.73× the total stagger → a dozen bars are usually moving at once; travel < total stagger becomes one-after-another |
| Height gradient | `stagger([92, 32])`px | the 2.9× first-to-last difference is a clear slope; ratio <1.5 can't read the gradient, >4 makes the tail bars invisible |
| Hue gradient | `stagger([200, 320])` | 120° span (blue→purple); span <40° wastes the hue, >200° wraps back to red and the slope reads as a ring |
| Displacement/blur gradient | `stagger([46,14])`px / `stagger([8,2])`px | these two are this card's "value stagger" main evidence — make them constants and the motion instantly degrades into a plain stagger entrance |
| Second-beat origin | `from:'center'`, `distC*0.13` | 0.13 is the propagation delay from center to ends (~4f); at zero the whole row pulses at once and the `from` parameter loses its meaning |
| Pulse amplitude gradient | `lerp(1-distC, 0.06, 0.42)` | center 42% / ends 6% is a 7× difference — a clear waveform; giving the ends large amplitudes reads as the whole row bulging together and the center origin disappears |
| Brightness pulse | `brightness(1 + pulse*0.55)` | 55% brightening keeps the pulse readable on the dark base; this one deliberately has no gradient (all bars equal amplitude) — too many stacked gradients and the viewer can't tell which is the protagonist |

## Known Pitfalls
- The first and second beats run end-to-end: the last bar's entrance ends at `0.28+15*0.02 = 0.58`, while the center bar's pulse starts at 0.56. Adding bars or increasing temporal stagger lets the entrance eat into the pulse segment, blurring the two beats into one — adding bars requires pushing 0.56 later
- The end bars' second-beat window is `0.69→0.87`, after which ~0.13 (20f) of full stillness runs to t=1. This is time for the viewer to see the "final gradient" state, not blank
- `distC`'s denominator `C=(N-1)/2` divides by zero at N=1; `staggerVal` guards with `n<=1 ? 0`, but `distC` doesn't — changing the bar count to 1 yields NaN
- Bar positions `left: 8+i*5.4%` and width `3.4%` are hand-fitted for N=16 (last bar's right edge 8+15*5.4+3.4 = 92.4%). Changing bar count requires recomputing both percentages or bars overflow or crowd the left half
- The caption is an anime.js API call string — essentially **technique documentation** rather than content. In a real piece, either replace it with a meaningful title or remove it — otherwise the viewer reads code
- The 16 small dots at the bottom (`bottom:17%`, opacity .35) are static decoration, taking part in no animation; their `left` offset `+1.2%` is hand-paired centering with the 3.4% bar width — change the bar width and change this together
- Dark base (`#0a0b10`) + high-saturation bars (85%/66%) + 12px glow are one set; on light themes the glow and brightness pulse both die — switch to saturate or shadows to express the pulse

## Reference Implementation
demos/ui-entrance/value-stagger-gradient/
(ValueStaggerGradient.tsx)
