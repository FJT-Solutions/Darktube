---
name: list-reveal
summary: Six items of a vertical menu find their place one by one at 0.09 intervals via scale, settling with a slight outBack overshoot, while the whole list container drifts linearly upward 32px the entire time — per-item entrance and whole-list drift are two unrelated layers of motion
use: entrances for navigation / sidebars / settings panels; any "the interface grows itself" UI paragraph, also good as a low-energy base under narration build-up
duration: ~3.6s (108f@30fps)
energy: Low (steady beat, no peaks; drift keeps the frame alive)
---

## Intent
Per-item fade-in is one of the easiest motions to make stiff: each item finishes and stops, leaving the frame completely still between two items. This card's answer is a slow drift on the container unrelated to the per-item entrances — the local is "finding its place", the whole is "breathing". The viewer reads every item clearly, and the frame never locks for a single frame from start to end.

## Core Motion
- Two layers of motion are fully decoupled: the container `list.style.transform = translateY(lerp(t, 16, -16))` only consumes the global t — a linear drift through the whole piece; each item consumes its own `seg(...)` local window; neither participates in the other's math
- Per-item entrance: `seg(t, 0.06+i*0.09, +0.24, E.outBack)` — stagger 0.09 (~10f) is a notch slower than a typical UI stagger — an interval for "finish reading", not "spread quickly"
- The find-place move is scale-led: `scale(0.78 + p*0.22)` paired with `translateY(14→0)` — only 14px of displacement, so the viewer perceives "growing from small to solid" rather than "flying up from below"
- `E.outBack`'s overshoot carries scale briefly past 1 (a soft overshoot on the order of ~1.002) — small in magnitude, its job is turning that landing frame from "stop" into "click into place"
- Opacity `min(1, p*2.2)`: fully solid by 45% of the travel, keeping translucent list items from smearing into the background card color (`#161a26` + 1px `#262c40` stroke)

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Item count | 6 (Dashboard…Sign out) | last item's window 0.51→0.75, leaving 0.25 of tail stillness for the viewer; >8 items must compress the stagger or the last item eats into the ending |
| stagger | 0.09/item (~10f) | 10f is "readable item by item"; compressing to 0.04 becomes a one-shot spread (a different technique), stretching past 0.15 scatters the beat |
| Per-item travel | window 0.24 (~26f) | travel is 2.6× the stagger → three neighboring items are always moving, the queue stays continuous; equal values become hard one-by-one snaps |
| Start scale | 0.78 | 0.78 is the scale where "you can already recognize it as an entry"; <0.5 reads as popping from zero, confusing it with pop-style techniques |
| Start displacement | 14px | displacement must stay well under the row height (9px gap + ~33px item height) or items interleave |
| Overshoot | `E.outBack` | here the overshoot must be so small it's nearly invisible; switching to spring or a larger back coefficient makes 6 items jitter continuously, reading cheap |
| Container drift | `lerp(t, 16, -16)`, linear throughout | 32px of total displacement over 3.6s (~0.3px/f) — right between "feels alive" and "visibly moving"; >60px approaches the per-item displacement magnitude and the two layers merge into one event |
| Opacity slope | `min(1, p*2.2)` | 2.2 decides how early it becomes solid; dropping to 1 shows translucent items over the background, especially dirty on dark themes |

## Known Pitfalls
- The container drift is linear and runs the whole piece, resting at -16px at t=1 rather than 0 — this motion **doesn't return home on the final frame**. To loop or align position with the next shot, swap the drift for a converging curve outside `seg(t, 0, 1, ...)` or append a reverse ease-out at the tail
- Item count changes require recomputing stagger: last item start `0.06+(n-1)*0.09`; at 10 items the start is already 0.87, the travel gets truncated at t=1, and the final item never arrives
- Copy doesn't set `white-space:nowrap` and the container width is hard-coded at 240px — Chinese or longer English labels wrap, and a changed row height scrambles the whole column rhythm
- The drift direction (up) matches the per-item displacement direction (14px→0, also up). This is intentional (same-direction layering reads smoother), but the magnitudes must stay 2×+ apart or it reads as "everything floating up together" rather than two layers
- Icons are placeholder hue-ring gradient squares (6 hues to distinguish entries); swap in real icons for production; the entry base color `#161a26` belongs to a dark theme — strokes and shadows need retuning on light interfaces

## Reference Implementation
demos/ui-entrance/list-reveal/
(ListReveal.tsx)
