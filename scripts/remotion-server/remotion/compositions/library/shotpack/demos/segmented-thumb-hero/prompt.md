---
name: segmented-thumb-hero
summary: A segmented control's thumb displacement takes the hero close-up — an oversized capsule segmented control springs in, an outlined-arrow cursor slides in from off-frame and presses, the white thumb slides to the other segment in 8f ease-out, and at the moment it lands a new icon springs out while the old icon retracts
use: Announcement shots for "mode switch / pick one of two" features (Ask→Computer, Chat→Agent style); a close-up style where one UI micro-interaction carries an entire shot
duration: ~3.5s (demo 110f: float-in 18f + cursor 24f + click + 8f slide + icon pop + hold)
energy: Medium (micro-interaction close-up, refined rather than explosive)
---

## Intent
The usual way to shoot a product switching to a new mode is replacing the whole interface. This card does the opposite: blow the segmented
control up to 1080px wide in close-up, and **those 8 frames of thumb displacement are themselves the narrative** —
"we moved from A to B". No page context at all; the control is the stage. The causal chain is complete:
cursor slides in (someone arrived) → press + ripple (a decision was made) → thumb slides (the world responds)
→ new icon pops out (a new identity is established). All four beats are indispensable: without the cursor, the UI moves on its own;
without the icon pop, the switch has no reward.

## Core Motion
- Control close-up size 1080×220, springing in from 200px below
  (spring damping 14 / stiffness 120), big shadow shrinking as it settles (24→12px)
- The cursor is an oversized outlined arrow (130px, ink outline on white): 24f Easing.out(cubic)
  from bottom-right off-frame onto the target segment; press scale 1→0.86→1 (3f down, 4f back)
- **Thumb strictly 8f** Easing.out(cubic) (demo 52→60f) — reproducing the original film's feel;
  those 8f are the heartbeat of the shot, and every beat around them serves them
- At the landing moment, two actions start on the same frame: the new icon springs out with spring(damping 10, stiffness 220)
  overshoot; the old icon collapses over 6f Easing.in with width going to zero in sync so text flows back naturally
- Click ripple: a 4px-bordered ring spreads from the click point over 12f and fades (Easing.out(quad))
  — the ripple confirms the "press" happened; without it the click reads as the cursor passing by

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Control size | 1080×220, thumb inset 16px | Below <600px wide it's no longer a close-up and the thumb displacement carries no weight |
| Thumb duration | 8f Easing.out(cubic) | >14f reads as a slow-motion demo video; <5f reads as teleporting, the "slide" is gone |
| Cursor slide-in | 24f from off-frame, ease-out | linear or <14f reads as the cursor being thrown in; start point must be off-frame |
| Press | scale 0.86 + 12f ripple | Sliding the thumb without a press breaks the causal chain and reads as autoplay |
| Icon pop | spring damping 10/stiffness 220 | damping <8 bounces three times and steals the thumb's scene; an unretracted old icon squeezes text out of the control |
| Ending hold | new state rests ≥30f | Cutting away right after the switch means the "new mode" was never registered |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec,
  so first real use must re-verify with real assets
- Division of labor with input-trigger-moves: cursor-performance is a cursor clicking and pushing in across a full page (has context), this card is the control detached from the page as a background-less close-up — both can coexist in one film,
  but don't shoot the same click both as a page version and a close-up version
- Icon collapse uses width going to zero rather than scale alone — scale alone leaves an empty slot, text doesn't flow back,
  and a "ghost gap" appears inside the control (demo drives width and scale in sync)
- Be cautious with controls of 3+ segments: an 8f thumb sliding across multiple segments is too fast to read the docking,
  and stretching it breaks the feel — this card works best with "pick one of two"
- The ripple ring must sit above the thumb in zIndex with its center pinned to the click point — following the thumb
  turns it into the thumb's trail and the semantics go wrong
- Replacing assets for production: swap segment labels/icons for real feature names, but the "new segment icon with personality"
  (demo's smiley laptop) is half the reward; a pure line icon reads noticeably flatter

## Reference Implementation
demos/interaction/segmented-thumb-hero/
(SegmentedThumbHero.tsx)
Source film: perplexity-promo 2.3–5s
