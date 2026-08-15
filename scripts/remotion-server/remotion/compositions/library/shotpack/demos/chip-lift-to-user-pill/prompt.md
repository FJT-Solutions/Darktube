---
name: chip-lift-to-user-pill
summary: The target chip in the grid hard-cuts to inverted black-on-white over 3 frames, the other chips fade out and shrink staggered by their Manhattan distance from it; the black chip grows rightward anchored at its left edge into a pill, typing out a name character by character and lighting a green dot, then a 1px connector line pulls over to a circular badge
use: The "pick one out of a crowd and expand it" interaction chain; feature demos for collaboration/contacts/inbox-type products; selected → detail transitions
duration: ~5.0s (150f@30fps)
energy: Medium (the selection moment is the hard hit; everything after is unhurried growth and typing)
---

## Intent
Give "selection" **two completely different textures**: the selection instant is hard (3-frame stepped inversion,
like the real UI's `:active`), and what follows is soft (pill growth, character-by-character typing, the green dot lighting up).
The other chips fading out staggered by distance tells the viewer "attention starts converging here" —
distance ordering matters more than time ordering because it gives spatial causality.

## Core Motion
- 4×3 grid (chip 40×24, spacing 10/9), target at column 2 row 2,
  `appendChild`ed to the top layer before selection
- **Hard-cut inversion**: `a = seg(0.04→0.085, linear)` then stepped into
  `a<0.34 ? 0 : a<0.67 ? 0.5 : 1` — only 3 values, giving a 3-frame hard-cut feel;
  background `#fff→INK`, border `LINE→INK`, text `TXT→#fff` jump in sync
- **Distance-staggered fade-out**: remaining chips by Manhattan distance `|Δcol|+|Δrow|`,
  `d0 = 0.10 + dist*0.022`, each finishing in 0.075 (outQuad),
  opacity 1→0 + `scale 1→0.9`
- **Left-anchored growth**: `g = seg(0.26→0.44, outCubic)` drives width 40→190px,
  `left` unchanged — single growth direction, reads as "expanding" not "moving"
- Name typed character by character: driven by `g` (not t), characters start at `0.18 + i*0.062`,
  each finishing in 0.05, `translateY 2→0`; the original 2-letter label is removed within `g*5`
- Green dot `#35D07F` + `0 0 8px` glow, popping in with outBack over g's 0.85→1 segment,
  `left = w − 15` always hugging the pill's right end
- Connector line `0.47→0.57` outQuad stretching from 0 to 90px → badge `0.56→0.63`
  scale 0.8→1 fade-in → caption `0.6→0.66` appearing and deepening word by word to 0.92

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Inversion duration | t 0.04→0.085, stepped into 3 levels | **Don't ease it**: continuous interpolation reads as "gradient highlight", only stepping reads as pressed |
| Distance stagger | 0.022 / Manhattan distance | Ordering by index also staggers, but only distance gives the "spreading from the selection point" spatial causality |
| Remaining items exit | 0.075 each, opacity→0 + scale→0.9 | Fading out without shrinking looks "erased"; shrinking to 0.9 reads as receding to the back |
| Pill growth | width 40→190px, t 0.26→0.44 outCubic, left-anchored | Two-way growth (expanding from center) reads as a popup, not the same chip growing |
| Character typing | driven by g, stagger 0.062, 0.05 each | Hanging on g rather than t: retiming the growth duration automatically retimes the typing |
| Green dot | 7px + 0 0 8px glow, g's 0.85→1 segment outBack | Must only light at the end of growth: any earlier reads as "already online", not "just connected" |
| Connector line | 0→90px, t 0.47→0.57 outQuad | The line may only start after the pill is fully formed, or the pill looks like it's being dragged |
| Badge | 26px, 0.56→0.63 outCubic, scale 0.8→1 | Overlapping the connector's arrival by 0.01 gives the "object arrives the moment the line does" handoff |

## Known Pitfalls
- The target chip must be moved to the DOM top layer before the animation, or it gets covered by the chip to its right while growing
- The pill's name container `left:13px` is padding tuned for a 24px-tall chip;
  change the chip height and you must change it too, or the text hugs the edge
- The green dot's `left = w − 15` is recomputed every frame — hardcoding coordinates makes it fly out of the pill if PW1 changes
- The connector line and badge coordinates all derive from `PX + PW1` (the pill's final right edge);
  changing the growth end value requires changing both
- Placeholder content: 12 two-letter labels + the name "Casey Doe" + caption
  "Starting with Casey"; replace everything on landing; a different name length changes the total typing time
  (stagger 0.062 × character count must stay within g's 1.0)

## Reference Implementation
demos/interaction/chip-lift-to-user-pill/
(ChipLiftToUserPill.tsx)
