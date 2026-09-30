---
name: zoom-blur-transition
summary: Zoom-punch transition — the previous page zooms in and fades out through blur, the next page punches in from magnified blur and resets; both pages moving along the same depth direction hides the cut point
use: Advancing-feel switches in high-tempo sections; product close-up→full view, feature zoom demonstrations, the "advancing cut" at a section's climax; more punch than a whip
duration: Per variant, prior state ≥20f + punch 24–40f + ending ≥40f, ~4s (120f)
energy: High (the punch segment is the advancing peak, low-energy buffer before and after)
---

## Intent
The transition library already has whip-pan (whip-pan-transition) for planar momentum in horizontal/vertical; this card adds the **depth punch family** — both pages move toward the camera's depth: the previous page zooms in + fades out through blur, the next page punches in from magnified blur and resets. The difference from the former: not "translate across" but "punch in and out", the motion direction perpendicular to the frame, reading as "the camera passed through". Suited to product close-ups, feature-zoom demonstrations, and other switches that need an advancing feel, and to the "advancing cut" at section climaxes to create impact.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A zoom-in | Previous page scale 1→1.12 zoom in + blur 0→16px fading out; next page scale 1.12→1 punching in and resetting + blur 16→0 | Close-up→full view; feature-zoom demonstrations; climax advancement |
| B rise-punch | A plus a translateY upward shift of (1−p)×rise px, the previous page rising and fading out, the next page punching in from below | Vertical advancement feel; list-to-detail rising cut |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Punch speed | 24–40f completes 0→1, previous page easing in, next page easing out | Slow-then-fast is what creates the "punch" acceleration |
| Previous page zoom | scale 1→1.12, opacity 1→0 | Zoom 1.08–1.15; too large reads as pulling the camera, not a transition |
| Previous page blur | blur 0→16px rising with progress, fading out before settling | Blur must rise with the zoom; constant blur reads as out of focus |
| Next page zoom | scale 1.12→1 punching in, blur 16→0 resetting | The next page starting from magnified is what creates the "punching in" feel |
| Mask removal | After the punch, conditionally unmount the transition structure, the next page full-frame directly | Leftover transform destroys true stillness |
| Ending | True stillness ≥40f after the next page settles | R1 |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- Depth punches ≤2 per film; stacking with white flash/shake reads as "the camera broke" — one seam, one grammar
- Using it twice in one film alongside whip-pan (depth + planar momentum together) reads as showing off; pick one
- Mask removal and ending must land on the same frame; one frame off is a leftover-transform illusion break
- The next page must start from a magnified-blurred state (not directly at full frame), otherwise it reads as "cut", not "punch"

## Reference Implementation
demos/transition/zoom-blur-transition/
(ZoomBlurTransition.tsx)
