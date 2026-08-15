---
name: mosaic-reframe
summary: Twelve tiles continuously morph among a regular grid, a feature mosaic, and a diagonal waterfall — position, width, and height each interpolate independently, with a slight per-tile stagger and holds between segments
use: "Same content, multiple views" showcase transitions: layout-capability demonstrations for portfolio/template-library/gallery products
duration: ~6.0s (180f@30fps; emergence 0–0.6s · A→B 1.6–2.5s · hold · B→C 3.7–4.8s)
energy: Medium (continuous flowing re-arrangement, no burst point, composed temperament)
---

## Intent
Let viewers see "the layout itself thinking": the same 12 pieces of content go from a tidy archival state (grid) to a curated state with hierarchy (feature mosaic) to an opinionated dynamic state (diagonal waterfall). The three layouts are three narrative tones, and the morphing process is itself the product capability.

## Core Motion
- The three layouts are hard-coded as coordinate tables: A=4×3 regular grid; B=6×4 cell mosaic (first tile occupying a 3×2 large slot); C=diagonal waterfall `x=1+i*6.4, y=-7+i*7.6, rot=-15+i*3°` with increasing rotation
- Each tile interpolates its five channels `x/y/w/h/rot` **independently** (`acc` segment lookup + smoothstep), not via an overall transform scale — width/height genuinely change and rounded-corner shadows don't deform
- Segment windows A→B t=0.26–0.42, B→C t=0.62–0.80, with a ≥0.2 hold between them to read the layout
- A slight per-tile stagger `i*0.007` (~2 frames per tile): the re-arrangement sweeps like a wave rather than the whole board flashing
- Opening per-tile emergence: `i*0.012` stagger + scale 0.82→1 + opacity (outCubic), the first tile always keeping a raised zIndex (it's the feature mosaic's hero image)

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Segment window | 0.16–0.18 morph per segment, hold ≥0.2 | The hold is the breathing slot for reading the layout; compressed below 0.1 and all three segments blur into one |
| Micro stagger | 0.007/tile (~2 frames) | 0 = mechanical whole-board flash; >0.02 the wave is too obvious and steals focus from the layout itself |
| Waterfall params | spacing 6.4/7.6%, rot −15°+3°/tile | The increasing rotation is the soul of the "string"; equal angles degrade into an angled grid |
| Mosaic large slot | First tile 3×2 cells | Swapping the slots table re-arranges the hierarchy; ensure at least one ≥2×2 anchor slot |
| Emergence rhythm | 0.012/tile + 0.14 duration | All 12 tiles finish entering in ~0.27 total; when used as a transition, you can cut the emergence and start directly from state A |
| Tile content | Gradient background + dots + two info bars (placeholder) | When swapping in real screenshots/images, keep the overflow:hidden rounded container so the width/height interpolation doesn't crop content |

## Known Pitfalls
- Five-channel independent interpolation means you **cannot** swap in `transform: scale` — width/height animation would trigger child-element re-layout; placeholder content uses percentage positioning and adapts, real images need `object-fit: cover`
- The C-segment tiles intentionally exceed the frame (y from −7% to 91%); the frame cropping is part of the composition — don't "fix" it with padding
- All three coordinate tables are based on a 92% content area + 4% margins; changing the frame aspect ratio requires recomputing the whole table
- With segment windows + stagger stacked, the last tile of B→C finishes at 0.887; adding more segments requires compressing the earlier ones rather than extending (everything must settle before t=1)

## Reference Implementation
demos/transition/mosaic-reframe/
(MosaicReframe.tsx)
