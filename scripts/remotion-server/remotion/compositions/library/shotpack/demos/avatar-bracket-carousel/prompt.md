---
name: avatar-bracket-carousel
summary: "Your ___ teammates" placeholder layout — the four-corner focus brackets stay pinned mid-sentence while the avatar queue inside them spring-cycles three times vertically; avatars magnify and sharpen on the way in and shrink, fade and blur by distance on the way out, with the role label swapping in sync; the brackets breathe 7% at each switch
use: enumerating the capability of "one slot, many roles"; the core one-line shot for team/identity/preset/persona-type products
duration: ~5.2s (156f@30fps)
energy: Medium (three evenly spaced switches form a steady metronome; the bracket pulse is the only decorative move)
---

## Intent
Listing "we have designers, support agents, analysts, writers" as four rows is just a checklist. Squeezed into one slot of a single sentence, it becomes one promise plus four proofs: the sentence never moves, only the person in the slot changes. The four-corner focus brackets are the linchpin of this device — they take no part in the cycling, but they pin the viewer's eyes to that 92×92 box, so the four swaps read as "the same position" rather than "four avatars drifting past".

## Core Motion
- The position value `pos` is the accumulation of three springs: `[0.24, 0.46, 0.68].forEach(s0 => pos += seg(t, s0, s0+0.14, k => E.spring(k, 0.25)))` — not an index jump but a continuous value, so at any moment you can compute how far each avatar is from the slot
- Distance drives everything: `d = |k - pos|`, then `scale = max(0.5, 1-d*0.38)`, `opacity = max(0, 1-d*0.62)`, `blur = min(3, d*2.4)`, `translateY = (k-pos)*76` — four properties share one distance source, so entering/exiting changes stay naturally in sync with no separate timing
- The queue is absolutely positioned, stacked on the 0×0 anchor of `slot` (`left:-29px, top:-29px` self-centering), with all vertical movement driven by `(k-pos)*STEP`; avatars outside the frame still render, just hidden by opacity and blur
- The entrance is a separate layer on top of the cycling: `el.style.opacity = op * seg(t, 0.02+k*0.03, 0.12+k*0.03)` — the four avatars establish the queue staggered by 0.03 within the opening 0.15, after which this term stays 1 and the cycling takes over entirely
- The role label is its own track but shares `pos`: `opacity = max(0, 1-|k-pos|*2.2)`, with a decay slope of 2.2 much steeper than the avatar's 0.62 — the label is fully gone past 0.45 slot-distance, so two labels never share the screen
- Bracket breathing: `breath = Σ sin(seg(t, s0, s0+0.1) * π)`, taking `min(1, breath)` multiplied by 0.07 and added to scale; the sine envelope peaks at the exact middle of each switch and settles back to zero

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Switch point | 0.24 / 0.46 / 0.68, spaced 0.22 (≈34f / 1.14s) | The spacing is the time it takes to "read one role"; <0.12 and the viewer can't catch the label, >0.3 and the metronome feel falls apart |
| Switch travel | window 0.14 (≈22f), `E.spring(k, 0.25)` | Travel takes 64% of the spacing → ~12f of dwell; damping 0.25 is exactly one visible bounce-back — lower it and the card shakes twice, interfering with neighboring switches |
| Step distance | STEP=76px (frame 92px, avatar 58px) | The step must exceed the avatar diameter or adjacent avatars will bite edges; 76/92 means the outgoing avatar still shows a sliver, hinting the queue's presence |
| Scale decay | `1 - d*0.38`, floor 0.5 | One slot-distance shrinks to 0.62; a steeper slope makes exits more decisive, but the 0.5 floor is hit sooner and the queue becomes "two fixed sizes" |
| Opacity decay | `1 - d*0.62` | Fully gone beyond 1.6 slot-distances → about 3 avatars always visible; lowering the slope to 0.3 shows all four in a row, weakening the "lock-in" meaning of the viewfinder |
| Blur decay | `d*2.4`, cap 3px | Blur is a depth-of-field cue; the 2.4 slope gives neighbors ~2.4px; >4px and neighbors smear into color blobs — the queue stops reading as avatars |
| Label decay | `1 - d*2.2` | The slope must clearly exceed the avatar's 0.62 — labels are text, and two half-transparent lines overlapping are the hardest to read |
| Bracket pulse | window 0.1, `sin(·π)` × 0.07 | 7% reads as "a latch clicking"; >15% makes the frame itself the star, stealing from the avatar swap |

## Known Pitfalls
- Four avatars vs. three switches: `pos` finally rests at 3, exactly the last slot. Adding a fifth avatar requires a fourth switch (and the final switch must finish before 0.86 to leave dwell time), otherwise the tail of the queue never reaches the frame
- The switch points are a hard-coded array that appears in two places (the `pos` accumulation and the `breath` accumulation). Changing the beat requires changing both; missing one shows "bracket pulse and avatar swap out of sync"
- The entrance stagger is only 0.09 away from the first switch (entrance ends 0.15 → switch at 0.24). Adding avatars pushes the entrance end later (`0.12+k*0.03`); beyond 5 avatars the first switch must move later too
- Avatars are emoji on neutral gray base circles (gray levels only distinguish queue items); the accent color is used only on the four SVG corner marks of the focus frame — keep this division when swapping in real avatars, the avatar itself shouldn't fight for color
- The focus frame SVG's four paths and 92×92 viewBox are hard-coded coordinates (`M4,26 L4,4 L26,4` etc.). Resizing the frame requires re-scaling the whole set; changing only the container width/height distorts the corner marks
- The sentence "Your ___ teammates" is centered with flex + gap:22px, and the slot width is fixed at 92px so the sentence stems don't reflow when avatars change — but with a Chinese sentence, confirm that the character-width changes on both sides of the slot don't push it off the frame center

## Reference Implementation
demos/ui-entrance/avatar-bracket-carousel/
(AvatarBracketCarousel.tsx)
