---
name: card-stack
summary: 8 cards spring in one by one from below the screen, stacking into a pile; once all settle, the whole pile fans out into a 3D spread in one move — each card rotates 8° by index, shifts 34px laterally, and steps one z-layer back
use: product sections that need to convey "we have a set of things"; establishment shot for card walls / template libraries / solution lists, also usable as a beat of build-up before a logo
duration: ~4.2s (126f@30fps)
energy: Medium-high (the entrance is a chain of small bursts; the spread closes as one smooth whole-body move)
---

## Intent
A pile of cards first coalesces into one object, then spreads into a set of objects — order matters: give "the whole" first, then "the individuals". What the viewer registers first is a weighted pile (quantity), and only second does each card read as different (diversity). The spread is held until the very end and done in one shot, so it doesn't fight the entrance beat.

## Core Motion
- Two layers of motion separated and layered: the entrance (each card's own spring) and the fan (a single spread progress shared by all), with the final transform being `translate3d(tx, y, tz) rotate(rot)` composed from each layer's own components
- Entrance: `seg(t, 0.02+i*0.033, +0.3)` then through `E.spring(inT, 0.3)`, `y` rising from 300px to 0 — the start is off-canvas, and stagger 0.033 (~4f) strings the 8 cards into a chain rather than launching together
- Fan: `seg(t, 0.55, 0.8, E.inOutCubic)` is the only spread clock; the fan's final state is a static offset (`k = i-3.5`, `rot = k*8°`, `tx = k*34px`, `tz = -10*|k|`) multiplied by this progress
- `transform-origin: 50% 130%` puts the rotation axis outside the card's bottom edge — the fan's grip is in your hand, the cards swing open around the wrist, not around their own centers
- Opacity uses `min(1, inT*4)` to fill up early: cards are already fully solid in the first quarter of flight, so the viewer sees solid-body motion rather than a fade-in
- `zIndex = 20 - |k*2|`: middle cards sit on top, the fan recedes toward both sides, layering with `tz` to build depth

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Card count | N=8 (hue 222→334, +16° each) | 8 is the comfortable ceiling for a 56° total fan angle; >10 cards requires dropping each angle to 5–6° or the end cards fly out of frame |
| Entrance stagger | 0.033/card (~4f) | 4f is the "chain" feel; ≥8f reads as calling each card by name, ≤2f reads as one lump emerging together |
| Entrance travel | window 0.3 (~38f), y 300→0 | 300px guarantees the start is off-canvas; shrinking the window below 0.15 truncates the spring's bounce-back and the settle gets stiff |
| Spring damping | `E.spring(inT, 0.3)` | 0.3 is one visible but not exaggerated bounce-back; lower it and bounces multiply — cards "shake twice", and grouped shakes interfere with each other |
| Spread window | 0.55→0.8 (inOutCubic) | inOut makes the spread ease in and out like a hand dealing the cards; switching to outBack overshoots into a "fling" that clashes with the earlier spring feel |
| Fan angle | `k*8°`, lateral `k*34px` | Angle and lateral shift must scale together: adding angle without lateral shift makes cards interpenetrate; the 34/8 ratio decides whether the fan reads "sparse" or "stacked" |
| Depth recede | `tz = -10*|k|`, perspective 900px | Only 10px/card — depth is at the hint level; above 40 you must also increase perspective or edge cards suffer perspective distortion |
| Rotation axis | `transform-origin: 50% 130%` | 130% decides how far the "grip" sits from the card; changing to 50% 50% instantly degrades into a pinwheel scatter and loses the handheld feel |

## Known Pitfalls
- The two time windows just touch end-to-end: the last card's entrance ends at `0.02+7*0.033+0.3 = 0.551`, and the spread starts at 0.55. Adding cards or increasing stagger makes the entrance eat into the spread — the "still flying when it starts to rotate" muddle; adding cards means pushing the spread start later too
- With an even card count `k` takes half-integers (±0.5, ±1.5…), and `zIndex = 20-|k*2|` gives the middle two cards the same layer — their stacking order is decided by DOM order; with an odd count a center card owns the top layer, which reads steadier
- Card size 110×150 and `margin:-85px 0 0 -55px` are a bound centering pair; changing size requires changing the margin together
- Card faces are gray skeleton bars + a single geometric glyph placeholder; swap in real page slices for production. The hue ring is a demo-only distinguishing device — real assets should use a single hue family or the asset's primary color
- The spread has no closing move; the final frame rests at the fan's end state. To hand off to the next shot, cut after 0.8 — don't let the fan idle too long

## Reference Implementation
demos/ui-entrance/card-stack/
(CardStack.tsx)
