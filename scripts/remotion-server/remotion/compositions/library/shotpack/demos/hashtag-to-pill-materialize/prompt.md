---
name: hashtag-to-pill-materialize
summary: A topic word types itself into being — "#word" types out centered (red solid caret steady-on), hard-cuts in 1 frame into a wide pill tag, holds, then shrinks and shifts left to land in the page's tag slot, then hard-cuts in 1 frame to reveal the finished page; a "two hard cuts sandwiching one slide" rhythm skeleton
use: Demo segments for tag/category/keyword features (note apps tagging, topic aggregation); the three-beat narrative of "input → becomes a UI entity → settles into the finished product"
duration: typing ~40f + hard-cut pill hold ~18f + shrink-shift ~14f + stillness after hard-cut reveal; whole segment ~3.5s (original film 18–21.5s)
energy: Medium (crisp; powered by hard cuts, not bounces)
tags: typography
---

## Intent
The usual way to turn text into an object is gradient/morph/expand; frame-by-frame teardown of the original film proves Bear does the
opposite: **materialization is a 1-frame hard cut** — one frame still shows text + caret, the next shows the complete
pill, no expand, no cross-fade, no bounce. A hard cut delivers the certainty of "snap, it's done";
any gradient softens the "object" into an "effect". The whole segment's skeleton is **two hard cuts sandwiching one
slide**: hard-cut materialize → smooth shrink-shift home → hard-cut reveal of the finished page. The only continuous
motion (the shrink-shift) is framed by two hard cuts, which is what makes it read both fast and steady. This rhythm skeleton is the linchpin —
change the nature of any one of the three segments (turn a hard cut into a gradient, a slide into a hard cut) and the card collapses.

## Core Motion
- Typing field: geometric sans (Futura character) types "#word" centered, **red solid caret
  steady-on, no blink** (measured from the original film; don't add blink); human pacing 4–6f/character with deterministic jitter
- **Materialize = 1-frame hard cut**: the text + caret layer disappears entirely, and the same frame presents an
  un-bordered light gray pill + icon + word (same font size, same spot at same scale, # replaced by the icon); only a
  3f 1.03→1 micro-settle is allowed to avoid stiffness
- Pill holds ~0.6s → a bezier easeInOut shrink-shift (~0.55x, ~14f) lands it in the page's tag slot,
  position/scale sharing the same curve and endpoints, no mid-way split
- After landing, **one more 1-frame hard cut** reveals the finished page: backdrop/title/body/pill colors all change
  on the same frame, then true stillness to finish
- Implementation note: draw the pill at large font size and scale the whole thing via transform, with
  transformOrigin must be 0 0 and translate applied first, or the landing center drifts

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Typing pace | 4–6f/character (original film ~6 chars/s), mulberry32 jitter | Even spacing reads as machine typing; the caret must stay steady-on (**measured from the original film**, it doesn't blink) |
| Materialize | **1-frame hard cut** (frame-level measured, no transition of any kind) + 3f 1.03→1 micro-settle | Adding a fade-in/expand instantly degrades it into a generic morph; micro-settle >4f reads as a bounce |
| Pill geometry | 740×236@1920 (**measured from the original film** 493×157@720p ×1.5), no border | The pill must be "over-generously wide" to feel solid; adding a border reads as a button |
| Hold | ~18f (0.6s, **measured from the original film**) | <12f and the viewer hasn't registered what the pill looks like before it flies off |
| Shrink-shift | ~0.55x (**measured from the original film** 273/493), 14f, bezier(0.5,0,0.25,1) | Scale and displacement must share the same curve; tuning them separately reads as two animations |
| Reveal | 1-frame hard cut of the whole page, +3f after landing | If the reveal is done as a transition, the second hard cut disappears and the skeleton loses half its shape |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec,
  so first real use must re-verify with real assets
- Overlaps with typewriter-moves/ai-stream-response (typing presentation) and morph-from-primitive (primitives morphing into shape): this card's linchpin is **hard-cut materialization, not gradient morphing** — if you want to add a transition, go use those cards instead of editing this one
- An early version fabricated a "pill flies in and slides into a note card" segment; the original film disproved it and it was cut —
  don't resurrect the flying segment
- Default transformOrigin 50% 50% makes the scaled landing center drift by (1−s)×half-width,
  so must use origin 0 0 + translate to the target center, then scale (see comment in demo)
- Residual gaps vs the original film: hand-drawn SVG curves on the note icon, Futura fallback weight, reveal-frame
  body spacing deviations at the ~10px level; pacing and hard-cut timing are frame-aligned tightly

## Reference Implementation
demos/interaction/hashtag-to-pill-materialize/
(HashtagToPillMaterialize.tsx)
Source film: bear-app.mp4 18–21.5s
