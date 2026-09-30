---
name: integration-hub-map
summary: The old page flips 180° in one fast turn (its side edge flashes briefly) landing on a new hub page; five integration app icons pop in on the same frame, then five rainbow light-pipes connect all at once on the same frame, with delivery pulses flowing through the pipes continuously — "turn a new page, the whole ecosystem hooks in at once"
use: integration/ecosystem capability sections (one product connecting everything); version-renewal narratives (old page flips into new); dark neon-toned feature climax
duration: windup ~0.5s + fast flip ~1.2s + icons all at once → pipes connect, two beats ~0.7s + delivery breathing ≥1.5s; whole piece 4.5–5s
energy: Medium-high (the flip is the explosion, the delivery segment is the afterglow)
tags: effects
---

## Intent
The flip is "changing eras": the old document page rotates the full 180° to become the new hub page — it must be a **complete flip, not a partial angle** (judgment); the flip motion is **fast flip + tail deceleration**, done in one continuous breath with no staged pauses (the "uniform" judgment: what the user meant by uniform is no pauses, not literal linear; the version pausing at the 90° side-edge was cut). The side-edge moment only "flashes" (1–3f pulse; the long glow platform was cut). The hook-in is **two-beat**: five icons pop in on the same frame (beat one) → five pipes start drawing and connect on the same frame (beat two) — simultaneous, so it reads "the ecosystem lands in one go"; staggered one-by-one connections read as negotiating one at a time (two rounds cut). After connecting, bright pulses in the pipes loop continuously from icons toward the hub — "delivery feel" is the life of the end state.

## Core Motion
- Flip: rotateY 0→180°, 35f, Easing.out(cubic) (the first 41% of time covers 80% of the angle, long tail deceleration for a soft landing), two-sided card (front old page / back new page)
- Side-edge flash: ~90° moment, 2f pulse bloom (0→1→0.25→0, back to zero within 4f)
- Two-beat hook-in: five icons pop in at tIcon all on the same frame (flip settles +3f); +10f five pipes start drawing at tPipe all together, 9f to full length and brightness
- Delivery pulses: bright dashes along the pipes cycle from icons toward the hub (~4.6px/f, phases offset per pipe); after everything connects, the hub page breathes lightly
- Background: dark purple noise + neon rectangles fading in to stage the scene

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Flip duration | 35f (the 70f version was cut "twice as fast") | <24f can't read both faces; tail deceleration ~60% of time covering 20% of the angle |
| Flip curve | ease-out, monotonic, no pauses | side-edge pauses/staging were cut; strictly linear start/stop felt stiff and was cut — fast flip, soft tail |
| Side-edge flash | 2f pulse, 4f to zero | the long glow platform was cut — "just a flash is enough" |
| Hook-in rhythm | two-beat: icons same frame → +10f pipes same frame | staggered sequential connections were cut twice — "appear at the same time, then connect at the same time"; two-beat spacing <6f reads as one beat |
| Pipe growth | 9f to full length | the 18f version felt slow; pipes have different lengths but arrive at the same frame (normalized by their own len) |
| Delivery pulse | ~4.6px/f loop, phases offset | static lines = no "delivery feel" (judgment); same-phase reads as blinking |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec; first real use must re-verify with real assets
- The timing judgment chain is fully documented: staggered connections ×2 cut → pipes-together/icons-staggered cut → two-beat passed. "Simultaneous" is this card's rhythmic identity
- Division of labor with glow-flyline-moves: that card is the light show of the flylines themselves; this card is the narrative structure of flip + two-beat hook-in + delivery, with the light pipes as mere elements
- Division of labor with canvas-materialize-moves: that card is canvas elements materializing; this card's core is the "old page flips into new" generational-change meaning
- Two-sided card implementation: horizontal/vertical lines with bbox=0 invalidate SVG filters/gradients (the three-pipes-disappearing judgment); pipe gradients use userSpaceOnUse defined independently per pipe

## Reference Implementation
demos/ui-entrance/integration-hub-map/
(IntegrationHubMap.tsx)
Source footage: clickup-30.mp4
