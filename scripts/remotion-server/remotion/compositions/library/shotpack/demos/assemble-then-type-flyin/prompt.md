---
name: assemble-then-type-flyin
summary: On an empty dark grid, the text-free component skeleton first flies in from all sides to lock into place; then each letter of the copy spins in through 3D space to land, big title first, small labels last; once everything lands, the page takes shape
use: Page/poster "grows itself" openers; capability showcases for layout-type products; the two-stage narrative from skeleton to finished design
duration: ~5.2s (156f@30fps)
energy: Medium-high (sparse skeleton stage, dense text stage; energy ramps monotonically to the finish)
---

## Intent
Split "page generation" into two semantically clear stages: first erect the skeleton (frames, cards, dividers, color blocks, all without text), then fill in the copy. Letters land with per-character 3D rotation because the skeleton stage is only planar translation — the two stages must differ in motion dimension, or the viewer can't read "this is step two".

## Core Motion
- 6 skeleton pieces (top-bar url pill, right-side short lines, logo dot matrix, module card, CTA pill, social squares) fly in sequentially at `ft` 0.04/0.07/0.10/0.13/0.17/0.20, snapping into place with `seg(ft, ft+0.14, outBack)`, `from` offsets 60–220px + ±8° rotation
- During skeleton motion `blur(≤2px)` motion blur, cleared to `none` at `a>0.97`
- 13 text blocks start sequentially at `start` 0.34→0.76: big title first (0.34/0.40), then logo wordmark and decorative large type, finally the MONO small labels here and there
- Per-character 3D: each character holds a deterministic seed-random `dx ±170px / dy ±130px / dz −120→−420 / rotateX ±170° / rotateY ±190° / rotateZ ±120°`, driven by `perspective(600px) translate3d + rotateX/Y/Z`, landing via `seg(ft, ft+0.13, outCubic)`; at `a>=1` the transform is set directly to `none`
- In-block character spacing adapts: `step = clamp((0.94 − start − 0.13)/charCount, 0.002, 0.012)` — guarantees every block finishes landing by t≈0.95 no matter how long it is
- All randomness comes from `rand(i) = frac(sin(i*127.1 + 311.7) * 43758.5453)`, deterministic and seekable

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Skeleton timing | 6 pieces, ft 0.04→0.20 (gap 0.03–0.04) | Skeleton stage takes the first 35%; compressed into 0.15 it blurs together with the text stage |
| Skeleton fly-in | outBack, 0.14 duration, offsets 60–220px + ±8° | Same technique as `scanline-assemble-flyin`; without scanlines, order is read through timing |
| Skeleton motion blur | blur ≤2px, set to none at a>0.97 | Leave a 3% margin; judging a>=1 directly leaves a layer of fuzz from float residue |
| Text start | Big title 0.34/0.40, small labels 0.58→0.76 | Large type landing first is a readability requirement: if small type lands first, the viewer starts reading the small type |
| Per-character offset | dx ±170 / dy ±130 / dz −120→−420 | dz is the main "coming from far away" driver; only dx/dy reads as a planar scatter |
| Per-character rotation | rotateX/Y/Z ±120°–190° each | Large angles give the "flipping in flight" feel; ±30° only reads as jitter |
| perspective | 600px (written into each character's own transform) | Smaller values exaggerate the perspective; above 1200px the 3D feel basically disappears |
| Character spacing | clamp((0.94−start−0.13)/n, 0.002, 0.012) | The adaptive ceiling 0.012 is the minimum speed at which characters stay individually readable |
| Landing clear | a>=1 → transform:'none' | Without clearing, 13 blocks keep their compositing layers and long films drop frames |

## Known Pitfalls
- Character spans follow normal text flow (`display:inline-block`); animation only touches transform — don't absolutely-position each character, or swapping copy breaks everything
- Space characters must be explicitly set to `' '` (in code `ch === ' ' ? ' ' : ch`), otherwise the inline-block empty span collapses to zero width and word spacing disappears
- `start` is 13 hand-written values; when swapping copy (especially with big character-count changes), re-check that the last block still finishes by t≈0.95; `step` only guarantees within-block, not across blocks
- Content is a neutral placeholder template ("The headline for your product here" / "Acme Studio" etc.); replace everything in production; A_RGB (`159,182,232`) is the accent-color slot
- Difference from `scanline-assemble-flyin` is **no scanline**: that card explains order through scanlines, this one through the two-stage "skeleton then text" structure — don't mix the two

## Reference Implementation
demos/effects/assemble-then-type-flyin/
(AssembleThenTypeFlyin.tsx)
