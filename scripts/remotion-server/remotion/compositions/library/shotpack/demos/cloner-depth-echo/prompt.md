---
name: cloner-depth-echo
summary: Clone column — the main card instantly "copies" out 7 semi-transparent doppelgangers arranged into a column receding diagonally in depth; after a beat pause, all of them accelerate back, merging into the original with a bounce
use: selling "multi-copy / multi-tenant / scale / batch processing"; telling "one = many" in a single shot
duration: 4–5s
energy: Medium (display-then-gather type)
---

## Intent
The UI translation of the Spline/C4D Cloner vocabulary: one main card "snaps" out 7 clones spaced evenly along the Z axis (120px apart, opacity fading 100%→20%), popping into a column in staggered order; hold ~25f so the viewer can count "there are many"; then all accelerate back in with ease-in to merge into the original, the original bouncing 1.08x as it converges. Division of labor with depth-layer-moves parallax (different content layered): this card is an evenly spaced ghost array of **the same content** — its meaning is scale, not space.

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Diagonal offset | dx=64·idx / dy=−34·idx | **Linchpin**: pure translateZ spreading under a straight-on view has all clones blocked by the original (imperceptible); diagonal offset makes the column visible to the eye |
| Side angle | whole column rotateY 16° | 8° is still near head-on; at 16° the column is clearly legible |
| Clone count / spacing | 7 / 120px | Fewer than 5 can't read as a "column"; more than 9 smears the tail into a blob |
| Opacity decay | 100%→20% linear | Farther = fainter = depth evidence; equal opacity reads as a sticker array |
| Spread / gather | spring staggered 1.6f/each; merge ease-in 10f all in sync | Spread should stagger (copy feel), gather should sync (condensing feel) — the rhythm asymmetry is by design |
| Merge bounce | sin(spring×π) single pulse 1.08x | A gather without bounce reads as fade-out; the bounce is mass evidence |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec; first real use must re-verify with real assets
- Clones must render back-to-front for correct occlusion; unload conditionally at opacity ≤0.005
- Two other candidates from the same 3D pipeline were dropped (thick-slab turntable, corridor pending review) — pure display-type 3D camera moves are questionable here; this card passes the wall on its "spread-gather" narrative move, so in production don't regress into a static column display
- Sound: a series of small staggered "snaps" for the spread, one rising whoosh for the gather, one solid "thud" at the merge

## Reference Implementation
demos/ui-entrance/cloner-depth-echo/
(ClonerDepthEcho.tsx)
