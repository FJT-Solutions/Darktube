---
name: bottom-push-stack-wipe
summary: Bottom-edge push chapter switch — the new scene, background color included, is pushed in as a full-screen block from the bottom edge, physically shoving the old scene off-screen. Consecutive chapters each carry a saturated background color, with content pinned to each chapter's own color coordinate system and moving with it
use: Chapter-switch backbone for multi-chapter product films (one selling point and one background color per chapter); section switches that need a "page-flip rhythm" running through the whole film
duration: Single push 30f + in-chapter hold ~1s; demo triple push 140f (~4.7s)
energy: Medium
---

## Intent
wipe-transitions sweeps a boundary across while both old and new pages stay still; page-turn flips a cube. This card is a third material property: **the new chapter shoves the old chapter out** — two screens make rigid contact and displace at the same speed and direction, like a vending machine stacking items. The linchpin is "the whole screen moves with its background color": background + window card + accent bars are welded into one solid block pushed in from the bottom edge, so viewers read "a world changed" rather than "a card changed". Heavy ease-out (fast in, slow stop) gives the push a solid "thunk" landing feel; the 40px seam shadow at the top edge is evidence of the physical contact between the two screens. Pushing three chapters with saturated background colors makes chapter switching itself the film's metronome — the slack original builds its entire skeleton on this one move.

## Core Motion
- One full-screen layer per chapter: `translateY` pushes from +1080 to 0 while the old chapter is simultaneously shoved to −1080 — the two layers' displacement stays strictly synchronized with identical easing; any speed difference reads as "sliding through each other"
- Push easing = heavy ease-out `cubic-bezier(0.12, 0.9, 0.2, 1)` (fast in, slow stop), completed in 30f; chapter i's y = (1−its own push progress)×H − the next chapter's push progress×H — one formula governs both entry and exit
- The new chapter's top edge carries a 40px gradient seam shadow (black 0.30→transparent, pressed over the old chapter), returning to zero once settled — the physical-contact feel of "shoving out" relies entirely on it
- Three chapter background colors green #2bac76 / blue #36c5f0 / pink #e01e5a (demo uses slack-style saturated colors); a grayscale window card is pinned at each chapter's center + white semi-transparent accent bars
- Hold ~1s between pushes (demo starts pushes at 18/55/92f); layers that exit the frame are unmounted promptly

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Push duration | 30f, heavy ease-out | <20f reads as a flash cut; linear constant speed reads as a rolling shutter door, losing all "thunk" |
| Between-chapter hold | ~37f (~1.2s) | The chapter body is the content performance zone; <25f viewers get shoved away before they can see it |
| Seam shadow | Top edge 40px, black 0.30 gradient | Without it the two screens look like ghosted sliding layers; >80px reads as the new chapter having its own black border |
| Background color | One saturated color per chapter, neighboring chapters spaced in hue | Neighboring chapters in the same hue family read as a "tweak" instead of a "chapter switch"; a grayscale chapter only works as chapter 0 |
| Content pinned | Window card/accent bars use absolute coordinates within the chapter | Content positioned relative to the viewport will "float" on the push animation and break the illusion |
| Consecutive pushes | 2–4 chapters | One push is not a rhythm; >4 viewers start counting the colors and get fatigued |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- Division of labor with wipe-transitions: that card keeps both pages still and sweeps a geometric boundary across the seam (neutral, usable anywhere); this card moves both pages with a rigid shove (has materiality, carries its own chapter rhythm) — use that card for single seams, this card for the film-wide skeleton
- Selected at the same layer as the six shot-transitions variants: this card is mid-energy with a fixed upward direction — seams needing a large energy drop (such as into the outro) should yield to whiteout/black frames
- Uniform direction is the source of the skeleton feel: every chapter in the film pushes from the bottom; switching mid-way to left/top pushes scatters the metronome — if you need to change direction, don't use it as the skeleton
- During the push both chapters share the screen as full-frame layers — in-chapter animation (card entrances, etc.) should avoid the 30f push window, otherwise both chapters are moving and the eye has no anchor
- In production use the saturated tier of the brand palette; if the background saturation is too weak, the window card's "pinned to its background" dependency is unreadable and it degrades into "cards each swapping their own background"

## Reference Implementation
demos/transition/bottom-push-stack-wipe/
(BottomPushStackWipe.tsx)
Original footage: slack-promo 22–27s
