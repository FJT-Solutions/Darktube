---
name: panel-grid-moves
summary: Three panel-grid rhythm variants — grid-flash-mosaic 3×3 grid flash-cut filling the wall and swallowing the screen, flip-grid-reflow collective grid rearrangement, comic-panel-split comic-style diagonal panels with three camera positions in parallel
use: Using "panels" as the rhythm instrument: per-panel beat-synced reveals (A), collective position swaps on beat points (B), same-subject multi-camera freeze-frames in parallel (C); all three eat beat points
duration: A ~4.7s / B ~4.8s / C ~5s
energy: A High / B Medium / C Medium-high
tags: ui-entrance
---

## Intent
The difference from wall-reveal-moves is this card's positioning anchor: that one is "how a whole wall enters" (a one-time reveal), this one is "how panels act as a rhythm instrument" — paneling, rearrangement, and juxtaposition all happen on the beat, panel changes are the drumbeat. A is fill: the 3×3 grid slams in per-cell in shuffled order following sixteenth notes, fills and holds one beat, the center cell zooms up to swallow the whole screen — the feature matrix reveals everything in one second; B is shift: 6 cards collectively straight-line swap positions at beat points (horizontal row → 3×2 grid), settle in half a second + a deepening pulse to close — the layout rearrangement itself is a drumbeat; C is parallel: the picture clicks into 3 diagonal split panels, one product from three camera positions frozen simultaneously, hold half a beat then one panel's diagonal edge expands to eat the screen — Scott Pilgrim's split-screen language. Pick as needed: multi-feature reveal uses A, layout narrative uses B, single-product multi-view uses C.

## Three-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A grid-flash-mosaic | 3×3 grid, one cell every 2f mounted in h(i) shuffled order with hard entry (entry cell 3f scale 1.18→1 + 2f deepening pulse), the full wall breathes one beat, center cell 14f Easing.in(cubic) zooms 3.28x swallowing the screen | Feature matrix reveals everything in one second; pre-climax layout |
| B flip-grid-reflow | Pre-write two coordinate sets (horizontal row / 3×2 grid), each card delay=i×1.5f, 16f inOut cubic straight-line flight + scale 1→1.28 with 1.02 overshoot; after settling, 6f brightness 0.78 full-frame pulse | Layout narrative: the semantic gear-shift of side-by-side → grouped |
| C comic-panel-split | Each panel is a copy of the full page with a 12° diagonal clip-path + translate/scale to set camera positions (1x/1.9x/2.6x), popping in 2f apart per panel; 18f freeze-frame with each panel gently pushing to stay alive, the last panel's diagonal edge 12f out-cubic expanding to eat the screen | Same subject from multiple viewpoints in parallel; comic-style sections |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A hard entry | Not rendered before the beat point (conditional mounting), zero fade | Per-cell hard entry with no fade — the linchpin; a fade-in isn't a "pop" |
| A border | 3px dark border per cell (border-box) | The reverse of the white-background-invisible precedent: white cards rely on borders to read as panels |
| A screen-swallow | Center cell holds 0.3125x full page, zooms 3.28 (>3.2) pushing the border off-frame | A border left on the final full screen breaks the illusion |
| B coordinates | Two pre-written sets (row y=330 / grid columns 571.6/960/1348.4, rows 416.2/663.8), pure transform | Avoids real FLIP measurement; frame-deterministic with no randomness |
| B interleaving | Even indices to the top row, odd to the bottom; trajectories never cross | Random layout trajectories produce ugly crossings |
| B pulse | f58–64 brightness 0.78, filter conditionally mounted only within the window | Hood-removal precedent; a filter outside the window destroys true stillness |
| C diagonal seams | SVG double line: 16px ink #2f2f2f base + 10px white core, 12° diagonal angle | The white diagonal seams are the comic feel's linchpin; straight seams read as a split-screen tool |
| C keep-alive | 18f freeze-frame, each panel scale gently pushing +3%/+5.5%/+8% | All three static reads as a screenshot collage |
| Closing | A 68f / B 81f / C 93f true stillness (≥40f) | R1; C's hood-removal frame must align with the expansion end value to prevent jumps |

## Known Pitfalls
- demo tuned on grayscale/placeholder footage — parameters are a tuning starting point, not a production-final spec; first real usage must re-validate with real footage
- C's three panels must be **different camera positions of the same subject** — three panels with different content reads as bento layout rather than comic panels, and the semantics scatter
- All three variants eat beat points and are heavily sound-dependent: A one pop per cell, B one hit each for takeoff and pulse, C three clicks per panel (sound-design §4.5); paneling off the beat is just a layout animation
- Same-film panel-system ≤1 section — the panel language is too recognizable; two sections collide
- Don't use A with wall-reveal-moves in the same film (both are "walls", viewers can't tell entrance from rhythm instrument)

## Reference Implementation
demos/rhythm/panel-grid-moves/
(ComicPanelSplit.tsx / FlipGridReflow.tsx / GridFlashMosaic.tsx)
