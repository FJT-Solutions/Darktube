---
name: countdown-arc-scatter
summary: A white-background dial with 9 equal-size numbers arranged tangentially along a large arc; the whole dial sweeps 96° then decelerates to a hard stop, "5" halts at the arc's apex and pans into place as the title's first character, the other numbers blur-scatter in place, and the title words blur-fade in one by one with the last word tinted accent
use: Countdown/duration-promise copy ("5 min to install"); a data-reveal beat; short light-background shots needing a "dashboard" vocabulary
duration: ~1.1s (33f@30fps, an extremely short single beat)
energy: High (96° sweep compressed into 17 frames, pure impact)
---

## Intent
Written as a static card, "installs in 5 minutes" convinces no one. The dial-sweep
approach puts the number inside a **range**: 45, 35, 28, 22, 17, 10 sweep past, then stop
at 5 — the viewer sees "dropping from many to few," the number argues for itself.
After the stop, "5" doesn't vanish but **pans into place as the title's first character** —
one element completes the identity switch from gauge to copy, the most valuable move
in this card.

## Core Motion
- Arc layout: 9 numbers hang on a zero-size `pivot` (left 50%/top 58%),
  `ang = (i-6)·24`°, position `x = sin·R0`, `y = -cos·R0` (R0=150),
  each rotated `rotate(position angle)` — **tangential layout**, numbers lean with the
  arc like engravings on a dial face
- Dial sweep: `rot = lerp(seg(t, 0, 0.52, E.outCubic), 96, 0)` (~96°→0° in ~17f);
  outCubic's decelerating hard stop is all the "arrival" force
- Fade at both arc ends: `op = clamp((70 - |pa|)/22)`; past ±70° position angle goes to 0,
  fading in from ±48° — **no mask, opacity computed from angle**, so numbers "rotate into view"
- The "5" at `i=6` is designed to have angle 0 (lands dead on the arc apex after the sweep),
  then `hand = seg(0.52, 0.7, E.inOutCubic)` pans it to the title's left end `(-148, -30)`
  while self-rotating `rSelf·(1-hand)` back to level — landing and straightening share one curve
- The other 8 numbers `out = seg(0.5, 0.7, E.inQuad)`: opacity `·(1-out)`
  + `blur(out·3)`px scattering in place (**no translation** — translation would fight
  "5"'s pan for attention); short tick marks (3×26px dark) hang on `tickRot`, rotating
  along but only at `rot·0.35` — **0.35x differential speed**, two spin rates build the
  "dial face + pointer" hierarchy
- Title words blur-fade in one by one `blur((1-p)·6)` + fade, windows
  `[0.54,0.68] / [0.62,0.78] / [0.7,0.9]` (~0.06 overlap); the last word interpolates
  channel by channel from `#17181c` to ACCENT over `seg(0.84, 0.98)` — continuing the
  library's "final-two-letter accent tint" ending move

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Number sequence | `[45,35,28,22,17,10,5,4,3]`, 24° spacing | Uneven descending steps (45→35→28…) read as a real range; arithmetic steps read as a ruler; "5" must sit at i=6 (first 6 sweep past, last 2 reserved) |
| Arc radius | R0 = 150px, pivot at top 58% | Radius sets curvature: <100 the numbers crowd into a small circle, >220 the arc is nearly straight and the dial feel disappears |
| Sweep | 96° → 0°, window 0.52 (≈17f), outCubic | 96° ≈ sweeping 4 slots; outCubic's hard stop is the only "arrival" signal — switching to inOut becomes a slow stop without the gauge's snap |
| Visibility window | `(70-|pa|)/22` (fully transparent past ±70°) | 22 is the gradient width (~one slot); raised to 40, numbers semi-transparently drift in and out, mushy; set to 0 it's a hard cut-in |
| "5" landing | window 0.52→0.7 (≈6f), target `(-148,-30)`, straightening in sync | Landing window directly follows the sweep stop with no stillness gap — a gap breaks it into two actions; the target point must be exactly the title's first character position |
| Others fade out | window 0.5→0.7 inQuad + `blur(out·3)` | Fade starts **before** "5"'s landing by 0.02, giving way first; blur makes the scatter read as defocus rather than disappearance |
| Tick differential | `rot·0.35`; title word windows overlap ~0.06, `blur (1-p)·6`px | Differential speed is the "dial vs pointer" hierarchy source; 1.0 (same speed) reads as one texture spinning; overlapping word windows read as "one sentence," queuing reads as three separate entrances |
| Last word tint | `seg(0.84, 0.98)` → ACCENT | The film's only color event, landing on the last word is the sentence's endpoint |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- **1.1s (33f) is extreme compression**: sweep is only 17f, "5" lands in 6f, each of the
  three words fades in ~5f — information density far above the readable ceiling. Production
  almost always needs stretching to 60–90f — when stretching, scale all time windows by
  the **same ratio** (the proportions are the tuned part), don't stretch only the sweep
- **When swapping copy, keep character count close to the placeholder (`min` / `to` / `install`)**:
  the title's `left:-124px` and "5"'s landing target `x:-148` are a hard-coded coordinate
  pair — longer copy overflows to the right and the gap between "5" and the first word
  drifts; swapping copy requires recomputing both numbers (and the `margin-right:11px` word gap)
- Numbers must be **equal size and weight** (40px/600): mixed sizes read as data
  visualization, not a dial sweep
- "5"'s angle design (i=6 → ang=0) is the card's foundation: whether changing sequence
  length or which number is the lead, the lead's `ang` must compute to exactly 0,
  otherwise it's not at the arc apex when the sweep stops
- Light-background only: `#fff` background + `#17181c` ink numbers are the card's
  cleanliness; a dark version needs a full rework (and the fade-out blur grays out on dark)
- Sound: the sweep stop and the landing are two tightly coupled rhythm points (only 6f
  apart) — two short hits with different timbres (mechanical halt for the sweep stop,
  light settle for the landing); identical repeated sounds blur into one; layering
  discipline per sound-design.md

## Reference Implementation
demos/typography/countdown-arc-scatter/
(CountdownArcScatter.tsx)
