---
name: ui-to-brand-morph
summary: Two-variant UI-to-brand morph — icon-flip-bloom flattens the icon's Y-axis into a vertical line that blooms into a flower-shaped mark + wordmark settling letter by letter; input-morph-assemble shrinks the input box into a pill with three primitive elements dropping in to assemble into a single logo petal
use: Brand closing / the last beat before an outro; the visual argument that "the UI you use every day is this brand"
duration: A ~4.3s (130f) / B ~4.7s (140f)
energy: Medium-high (closing highlight; one complete transformation tells it all)
---

## Intent
The brand-closing library already has three routes: brand-ink-open draws and stamps in at the opening, morph-from-primitive goes primitive → UI container (the reverse direction), outro-group-photo-launch gathers elements into a group photo (assembled but not transformed). This card adds a fourth: **the product's UI elements transform into the brand symbol themselves** — Variant A flips the icon over to become the logo (same-position entity swap); Variant B has the input box that recurs throughout the film assemble into a single logo petal after the final send (multi-element landing assembly). What the viewer sees isn't "a logo appeared" but "the thing I was just using was it all along" — the causal chain is itself the brand argument.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A icon-flip-bloom | Icon anticipation wiggles twice → Y-axis scaleX flattens into a vertical line (double-layer trails + blur) → entity swap at the thinnest point, spring-blooming into a 5-petal flower mark → mark shifts left to make room, wordmark settles letter by letter | Single-icon products; where the icon and logo differ greatly in form and need the "flip into a new form" magic |
| B input-morph-assemble | Cursor clicks send → text flies away → the input box's five quantities x/y/w/h/r spring-interpolate into a rounded pill → three primitives drop in staggered from off-frame to assemble an abstract single petal → the whole group breathes | Films where rectangular UI like the input box/card is the protagonist; logos decomposable into geometric primitive combos |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A anticipation | Frames 12–34 tilting -12°/+14°/-18°→0°, inOut(sin), transformOrigin pinned 78% from the bottom | Increasing amplitude is what reads as "charging up"; a single wiggle doesn't register as a preparation move |
| A flatten | 12f Easing.in(cubic), scaleX 1→0.04; two trail layers opacity 0.22/0.14 + blur 6px lagging 0.12/0.24 | Accelerating in is what makes the "flick"; constant-speed flipping reads as a card flip. 0.04 is the thinnest point — the entity swap happens on this frame |
| A bloom | spring(damping 11, stiffness 130); the 5 petal ellipses spread from -90° (fully vertical, overlapping) to even distribution, length 20→38 and width 3→15 growing in sync | Only opening from the closed vertical line into petals carries "past the thinnest point"; scaling the whole flower directly breaks the causal chain |
| A wordmark | Mark shifts left −420px over 16f to make room; letters stagger 2.2f, 10f each | **The wordmark settle should follow the source: each letter lands scaling from large to small, blurred while large and crisp at landing (scale+blur linked, letter by letter) — not a horizontal sweep**; the demo's translateX -70→0 + blur 16→0 horizontal sweep is a pending fix |
| B send feedback | Cursor moves in over 22f and presses with scale 0.82 + button flashes white 6f; text accelerates up-right over 12f Easing.in (+700,-380) + rotate -10° + fade out | The fly-away must accelerate — constant-speed flight reads as a pan, not "sent" |
| B morph | From 34f, spring(damping 13, stiffness 90), 860×120 r26 → 300×108 r54 with the five quantities in sync; white outline fills solid with progress | All five quantities must be driven by the same spring; separate interpolation falls apart midway |
| B three-drops | 56/70/84f, staggered 14f, each with its own spring(damping 12) dropping from off-frame −260px into pre-arranged positions | The stagger is the "gathering" rhythm; dropping together reads as rain |
| B settle breathing | From 108f, the whole group scales 1±0.03 sinusoidal (0.18 rad/f), transformOrigin pinned at the petal center | The breathing closes on a "live logo"; without it the settle lands as a dead frame |

## Known Pitfalls
- The demo was tuned against grayscale/placeholder assets — parameters are a tuning starting point, not a production lock; first real use must be re-validated on real assets
- Variant A's entity swap must happen on the thinnest frame at scaleX ≤0.05 — swapping early shows the viewer two shapes' overlapping ghosts and the magic breaks
- After Variant A's wordmark is changed to per-letter scale+blur settling per the table, the stagger interval may need widening (each letter has its own "large to small" move; 2.2f may be unreadable) — after the change, review at normal speed per the perceptibility precedent
- Variant B assembles an abstract single petal (teardrop + pill combo), not the real Slack logo — in production swap in your own logo's primitive decomposition; 3–4 primitives is right, more reads as particles rather than assembly
- Don't stack other animations on top of a morph in progress (same precedent as morph-from-primitive): the morph itself is all the information
- Division with outro-group-photo-launch: that one flies the film's elements in around the wordmark for a group photo (gather); this card has UI elements transform into the brand symbol themselves (transform); pick one for a film's ending
- Sound: A gets a "whoosh" for the flatten and a "tick" for the bloom settling; B gets a send sound, a pop per element landing, and silence during the breathing segment

## Reference Implementation
demos/outro/ui-to-brand-morph/
(IconFlipBloomLogo.tsx / InputMorphsIntoLogo.tsx)
Source film: A perplexity-promo 88–91.5s / B slack-promo 40–41s

Implementation status: both variants have reference implementations and Gallery motion samples.
