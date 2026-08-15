---
name: chip-grid-single-select-blackout
summary: Five option chips, arranged 3+2 and centered, fade in one by one; at the selected frame a single gray press frame is inserted, then over a few frames the background flips pure black, the text flips white, and there's a very light 1→1.04→1 bounce-back, while the other chips dim to 18% with their positions locked; the remaining items then go to zero, the black chip lifts and narrows, and a calculation row fades in below
use: Interactive demos of single-select / plan / tier selection; "what happens after you pick this" causal shots; price/parameter settlement-style flows
duration: ~5.0s (150f@30fps)
energy: Medium-low (the only pop is that single gray flash; everything else is pulling back)
---

## Intent
One gray flash plus three frames of inversion-to-black splits the real UI's `:active → :selected` two-level state
into a performance. The viewer sees "finger pressed down" then "system confirms", not one gradient. The other chips
drop to 18% but **never move position**: the moment they reflow, the viewer thinks the page refreshed and the
"single-select" semantics are lost.

## Core Motion
- 5 chips arranged as two centered rows of 3+2 (top 96/136, gap 10, height 30, radius 15),
  fading in one by one with outQuad on `d = 0.05 + i*0.028` (0.04 each)
- **1-frame press gray flash**: `seg(FS, FS+0.006) * (1 − seg(FS+0.006, FS+0.014))`,
  an `rgba(120,120,120,.5)` overlay (FS=0.44, 0.006×5000ms ≈ 1 frame)
- **Invert to black**: `seg(FS+0.008 → FS+0.04, linear)` (≈5 frames) drives
  background `#fff→INK`, border `LINE→INK`, text `TXT→#fff`
- **Press bounce-back**: `sc = 1 + sin(pr·π)*0.04`, `pr` runs FS+0.008→FS+0.075
  — sine guarantees both endpoints land exactly back at 1, no extra keyframes needed
- **Remaining items degrade**: `fade = seg(FS+0.008 → FS+0.075, outQuad)` pushes opacity
  to `lerp(fade, 1, 0.18)` = 18%, `transform` stays `none`
- **Settle**: `lift = seg(FS+0.30 → FS+0.42, inOutCubic)` (≈1.5s after selection)
  remaining items fade to zero, the black chip `translate(cx·lift, −46·lift)` + `scale→0.82`;
  `cx = 220 − (offsetLeft + width/2)` measured only once, so it returns to the centerline while lifting
- Calculation row appears `FS+0.36→FS+0.42`, then deepens word by word to t≈0.98

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Entry | stagger 0.028, 0.04 each, outQuad | The 5 chips finish laying down in the first 0.2, leaving time for the selection segment |
| Selection moment | FS = 0.44 (about mid-film) | Front half reads the question, back half sees the result; an FS before 0.3 means the viewer hasn't finished reading the options |
| Gray flash | 0.006 on + 0.008 off, rgba(120,120,120,.5) | **Exactly one frame**: two frames or more reads as a hover highlight, not a press |
| Invert to black | FS+0.008→FS+0.04 linear (≈5f) | linear is deliberate: an ease would give "turning black" a process feel, too soft |
| Press bounce-back | 1 + sin(pr·π)·0.04 over 0.067 | 0.04 is very light; at 0.1 it becomes a bouncy button stealing the show |
| Remaining items degrade | to 18%, position transform:none | **Locking position is the linchpin**: staying in place at 18% reads as "not selected" rather than "disappeared" |
| Settle moment | from FS+0.30 (≈1.5s after selection), 0.12 inOutCubic | 1.5s is the shortest dwell that lets the viewer register the selected state; cut to 0.5s and it feels rushed |
| Lift and narrow | translateY −46px, scale→0.82, horizontal cx compensation back to centerline | Without the cx compensation it would sit left of center after lifting, reading as "dragged away" |

## Known Pitfalls
- `cx` is measured once via a `measured` flag (the first-frame `offsetWidth` may be 0, so
  guard for null) — re-measuring every frame drifts further off after the chip itself scales
- The other chips' `transform` must be explicitly written as `'none'`; relying on flex auto-reflow will make
  them slide sideways when the remaining items go to zero
- The selected item must translate within the same flex row and not change `position`,
  or you trigger an inline reflow and the other chips' positions shift with it
- Placeholder content: 5 "Option … plan" option names + the calculation row
  "18% off · 42.00 → 34.44"; replace everything on landing; overly long option names will break the single line
  (the third one is already a long-name stress test)
- Division of labor with `chip-lift-to-user-pill`: that card **grows sideways into a new object** after selection,
  this card **lifts and narrows to make room for a result**; don't use both in the same film

## Reference Implementation
demos/interaction/chip-grid-single-select-blackout/
(ChipGridSingleSelectBlackout.tsx)
