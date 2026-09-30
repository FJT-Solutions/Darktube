---
name: text-as-mask
summary: Text-as-mask video — a slow-moving product shot shows through the inside of an ultra-bold giant title; at the end the glyphs scale up 26× overflowing, and the inside footage takes over full-screen
use: An opening or chapter card fusing the brand word/slogan with product footage; the word is the door, the product is inside the door
duration: 5s (hold 20f + in-glyph drift 80f + scale takeover 30f + stillness 20f)
energy: Medium-high (steady drift segment, one burst at the takeover)
tags: typography
---

## Intent
Title and product footage fighting over the screen is an old problem — word first then picture is slow, picture with word on top is cramped. This variant makes them one body: the glyphs are the mask, the product only shows through the strokes, and the viewer reads the word and the footage texture at once. At the end the glyphs swell past the frame and the product naturally takes over full-screen — "walking from the brand word into the product" told in a single shot, doubling as a chapter transition (same family as transition-travel Variant C's glyph-cavity travel: there the camera dives into the cavity, here the glyphs swell on their own — there the camera moves, here the door moves).

## Core Motion
- Dark base + SVG white-on-black text data-URI fed to CSS `mask-image`, the mask layer clipping the product footage
- In-glyph drift: product layer scale 1.15 + translateX drifting at constant speed ~220px/80f — glyphs still, content flowing; the "there's a world outside the window" illusion is the technique itself
- Scale takeover 30f single segment bezier(0.4,0,0.2,1): mask wrapper `scale(1→26)`, **transform-origin must be pinned inside a solid stroke** (the demo uses 61.5% along the L's vertical stroke) — pinned inside a glyph cavity, the scaled result shows the base color
- Reverse compensation on the content layer: wrap a `scale(1/maskS)` to cancel the mask's magnification so the product footage doesn't distort with the mask geometry (the mirror image of shot-transitions Variant F's "window geometry and window view driven by the same variable")
- Takeover insurance: additionally layer an unmasked full-screen layer sharing the same translateX/scale transform, fading in over the late enlargement (endT 0.25–0.9) — a pure mask enlargement leaves dark-base residue at the glyph seams

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Font size/weight | ≥360px / 900 | The strokes are the viewport — a thin weight is like stuffing the product through a door crack |
| Drift speed | ~2.75px/f constant | Too fast and the in-glyph footage can't be read; pick the axis where the footage is information-dense |
| Scale multiplier | 26× (tuned to the glyph/frame ratio, enough to fill the holes) | Too little and the takeover frame still shows glyph-edge residue |
| Landing | True stillness ≥20f after takeover | R1; at the takeover-complete frame the product should sit in a standard composition |

## Known Pitfalls
- The demo was tuned against grayscale/placeholder assets — parameters are a tuning starting point, not a production lock; first real use must be re-validated on real assets
- The product footage showing through the glyphs is under close scrutiny the whole time — real assets must first pass aesthetic guideline Q2's high-resolution rasterization technique, or low-res captures blur to mush inside the strokes
- After changing the word/font, the hand-tuned origin always breaks — after rendering, check the enlargement direction and nudge the origin if the holes don't align (same pitfall as transition-travel C's cavity-center drift)
- Don't pair with transition-travel Variant C in the same film — both are "a world growing out of the type", and the viewer reads it as the same trick used twice (P4)
- The mask layer and content layer transforms must be driven separately (wrapper magnifies / content compensates inversely); on a single layer, the product swells 26× with the glyphs into a ruined shot

## Reference Implementation
demos/opening/text-as-mask/
(TextAsMask.tsx)
