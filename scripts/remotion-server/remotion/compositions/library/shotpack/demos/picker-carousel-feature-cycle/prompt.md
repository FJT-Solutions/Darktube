---
name: picker-carousel-feature-cycle
summary: A mobile-style vertical picker — the focus pill stays put while content flows through it, each item snapping to a halt with pronounced outQuint deceleration then fully resting, opacity/font size/grayscale layered by distance from center, and the pill does a very light scaleY breath on landing
use: List shots that recite feature/scene names one by one; "pick one" interaction demos; picker-type control showcases for mobile products
duration: ~3.6s (108f@30fps)
energy: Medium (every snap is a beat, 5 beats advancing at an even pace)
---

## Intent
Put physicality into "selection": the focus frame is fixed — it's the content that scrolls and gets caught.
Each item must **actually rest for a few frames** after stopping — continuous scrolling reads as a loading animation; a pause is what reads as
"this item is selected". Distance decay (opacity + font size + grayscale decaying on all three channels simultaneously) is the
only way to keep the viewer's eye locked on the center row.

## Core Motion
- Viewport 300×170px (5 rows × rowH 34), focus pill fixed at row 3
  (`top: rowH*2`), white backdrop + 1px `#E3E3E6` border + `0 2px 8px rgba(0,0,0,.06)`
- Throughout, `t 0.05→0.95` split evenly into STEPS=5 steps; in-step displacement
  `outQuint(min(1, local/(1−HOLD)))`, HOLD=5/14 tail fully static
  (each step ≈0.65s = travel ≈0.42s + rest ≈0.23s)
- The list translates as a whole with `translateY(rowH*2 − pos*rowH)` — the content moves, the pill has zero displacement
- Distance decay (`d = |i − pos|`) in three bands: opacity 1→0.55 at `d≤1`,
  0.55→0.18 at `1<d≤2`; fontSize 17→14px (by `d/2`);
  color INK at `d<0.5`, MID at `d<1.5`, `#B9B9BE` further out
- In-row icons opacity `max(0, 1 − d*1.6)` — only the focus row shows an icon
- On landing, the pill breathes `scaleY 1 + sin(min(1, land/0.6)·π)*0.06`
  (`land` is only >0 inside the HOLD segment, i.e. breathes only after the snap completes)
- PAPER→transparent gradient masks at the viewport's top and bottom 26%, letting items in/out fade naturally

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Row height/visible rows | rowH 34px × 5 rows, focus at row 3 | Visible row count must be odd, or the focus row isn't visually centered |
| Step count | STEPS=5, window t 0.05→0.95 even | 5 beats is the comfortable ceiling for 3.6s; at 7 each beat squeezes to 0.46s and gets unreadable |
| HOLD | 5/14 ≈ 0.357 (each step's tail rests ≈0.23s) | **Linchpin**: with HOLD at zero it becomes even scrolling and the "snap" semantics are gone entirely |
| Snap easing | outQuint (applied on local/(1−HOLD)) | outQuint's sharp deceleration is the "caught by a magnet" feel; outCubic is too soft |
| opacity decay | 1 → 0.55 (d≤1) → 0.18 (d≤2) | Keeping neighbors at 0.55 lets viewers sense "there's more above and below"; dropping to 0.3 isolates the row |
| fontSize decay | 17→14px, by min(1, d/2) | The size difference is the second depth cue; opacity alone reads flat |
| Icon visibility | max(0, 1 − d·1.6) | Only the focus row carries an icon — an extra "current item" marker |
| Pill breath | scaleY 1→1.06→1, finishing within 0.6·HOLD after landing | 0.06 is already the ceiling; any bigger reads as the pill moving on its own, stealing the content's scene |

## Known Pitfalls
- The pill must be a **fixed layer with zero `translateY` displacement**, and the `scaleY` breath must not carry
  displacement either, or the focus frame drifts and "content flows through the focus" semantics fail instantly
- Writing the distance decay onto `fontSize` triggers per-frame reflow (fixed row height keeps layout from jumping);
  if row height is changed to auto it will shake; rowH must be hard-coded
- The gradient mask's color must match the PAPER backdrop exactly; off by one step and a boundary band shows
- The 26×22 square AI badge on the outer left is positioned with `margin:-11px 0 0 -186px` relative to frame center;
  changing the viewport width requires changing 186px too
- ITEMS are 7 placeholder feature names ("Data Cleanup" etc.); on landing, real names with different
  lengths affect the centered look — a single line over 300px should shrink the font size rather than wrap

## Reference Implementation
demos/interaction/picker-carousel-feature-cycle/
(PickerCarouselFeatureCycle.tsx)
