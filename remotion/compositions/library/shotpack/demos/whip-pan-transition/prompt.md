---
name: whip-pan-transition
summary: Whip-pan transition — two pages sweep across the same frame with a large translate left/right/up/down, with speed-stretch and motion blur; the previous page whips out from its entry side, the next page whips in from the same side
use: Scene switches in high-tempo connected sections; action scenes, beat-synced cuts, a "fast-cut accelerator" between product shots; replacing white flash/hard cuts to create momentum
duration: Per variant, prior state ≥20f + whip 24–40f + ending ≥40f, ~4s (120f)
energy: High (the whip segment is the film's speed peak; buffer with low energy before and after)
---

## Intent
The transition library already has several families: geometric wipes (wipe-transitions), medium developing (print-texture-transitions), travel (transition-travel), hidden cuts (shot-transitions). This card adds the **whip-pan family** — two pages translate across the same frame horizontally (or vertically), the cinematic "whipping pan" transition grammar: the camera whips past fast, motion blur streaks between frames, and the cut point hides inside the whip. The difference from the earlier families: it's not a "boundary sweeping across" nor "medium developing" — it's **the whole page moving**, hiding the cut point with speed itself. High-tempo sections (rapid sequences, action, fast cuts) use it to create momentum, more directional than a white flash.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A whip-h | Horizontal: the previous page whips left (translateX 0→−110%), the next page whips in from the right (translateX +110%→0); the overlap segment carries speed-stretch scaleX(1.12) + motion blur | Horizontal motion lines, left/right contrast, fast rhythmic cuts; switching between product features |
| B whip-v | Vertical: the previous page whips up, the next page whips in from below, same stretch + blur | Vertical motion lines, top/bottom layered content, list-to-detail vertical advancement |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Whip speed | 24–40f completes the 0→1 full translate, Easing.bezier(0.7,0,0.2,1) | Slow-fast-slow "whip"; all-linear reads as constant-speed sliding |
| Stretch | scaleX(1+0.12) at the velocity sine peak, back to 1 at both ends | Stretch amount 0.08–0.15; too large reads as deformation, not speed |
| Blur | blur 16–24px at the velocity sine peak, back to 0 at both ends | Blur must rise and fall with the speed; constant blur reads as out of focus |
| Direction | left/right/up/down, four ways; translate 110% (past 100% to guarantee fully off-frame) | Only consistent with the content's motion line does it not feel off |
| Mask removal | After the whip, conditionally unmount the transition structure, the next page full-frame directly | Leftover transform destroys true stillness |
| Ending | True stillness ≥40f after the next page settles | R1 |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- Whips ≤2 per film; stacking with white flash/shake reads as "the camera broke" — one seam, one grammar
- Only for high-tempo sections; a whip in a low-tempo section reads as "moving for the sake of moving"
- Direction must match the content's motion line: left→right page turns use right whip, vertical list advancement uses up whip
- Mask removal and ending must land on the same frame; one frame off is a leftover-transform illusion break

## Reference Implementation
demos/transition/whip-pan-transition/
(WhipPanTransition.tsx)
