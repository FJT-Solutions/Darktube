---
name: transition-travel
summary: Travel-style transitions, two variants — shared-element morph home and letterform-zoom; the camera dives into real elements in the frame to change scenes
use: Seams where the two shots have an element/container-level spatial relationship (technique card, complementary to the six shot-transitions variants)
duration: n/a (technique card; each variant's action segment 25–60f, surrounding holds counted separately, frames drawn from the adjacent shots' budgets)
energy: n/a (technique card, doesn't occupy an energy slot)
tags: camera
---

## Intent
The six shot-transitions variants are "handoff" type — the prior shot wraps up, the next shot enters, and the seam covers the switch moment with white flash/dark/focus/black-frame/blur-frames/window. This card's two variants are "travel" type — the next scene pre-exists in the foreground frame as a real element (grid slot/letterform hole), the camera makes one continuous spatial move diving into it, and the viewer follows the same object the whole way with no handoff moment. Selection criteria: the next scene can "pre-exist" in the foreground → travel; the two scenes are merely sequential with no spatial nesting → handoff. Within the two variants, split by meaning — A is "putting this card back" (detail→overview, the inverse of F variant's window); C is "the title is the door" (chapter text card and transition combined into one).

## Two-Variant Selection Table

| Variant | Approach | Applicable Seam |
|----|------|----------|
| A shared-element morph | The full-screen close-up card shrinks + translates + grows rounded corners, flying precisely into its dashboard grid slot with a 3% overshoot landing | Detail→overview "return home" semantics; used in a pair with F variant's window (enter/return) |
| C letterform-zoom | The giant title's letterform cavity (SVG mask hole) reveals the new page, an exponential push through the hole, the new scene takes over the instant the hole fills the screen, leftover strokes whip off-frame | Chapter title→body; the high-energy alternative to D variant's black-frame text card |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A morph main curve | 25f bezier(0.4,0,0.2,1) surging to 1.03 overshoot + 10f Easing.out(cubic) bouncing back to 1; position/size/border-radius share the same progress p | Each property on its own curve instantly reads as "morphing" rather than "one object"; overshoot >5% reads as jelly |
| A same-object feel | Content rendered at the slot's size, scaling proportionally with the container (scale 3.66→1, origin top-left); shadow converging from 0/36/110/0.32 to 0/2/8/0.06 with p | Re-laying out the content = swapping the card, the travel feel breaks; shadow that doesn't converge leaves the card perpetually floating and never seated |
| A seating ritual | Background dashboard waits at 0.9 opacity, snapping to 1 over 5f at the seating instant | A fully-bright background throughout means the flight-down has no "home at last" beat; the brightening window straddles the seating frame |
| C main push | The cover panel's SVG mask (white ground + black text, 900 weight) cuts the hole, transform-origin aimed at the cavity center (demo: "DASH" A cavity ≈773,508); scale=28^t, t 60f bezier(0.6,0,0.85,0.5) slow start, steep stop | ZOOM_MAX is set by "the hole fills the frame"; the smaller the letterform cavity, the larger the multiplier; the slow-start segment gives viewers time to see "there's something in the hole" |
| C exit and echo | scale∈[15,24] cover opacity 1→0 (leftover strokes fading while flying out); desired blur 0→16px divided by scale written into blur compensation; the B layer inside the hole micro-dollies 1→1.1, settling back to 1 over 25f after takeover | Blur not divided by scale gets magnified by the transform into a blur wall; B not dolling along makes the hole a dead image, breaking the perception of "entering a living page" |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets; grayscale can't surface texture-level defects (round-A ruling), so on real assets check a still frame first
- C's cavity coordinates are font-metric estimates (em values hand-derived); a different font/word/renderer letter-spacing all drift — after rendering, watch the first frame's push direction and nudge the origin if the hole isn't centered; don't trust the computed numbers
- A's slot coordinates must be pixel-exact (the demo derives 808,590, 524x454, r14 item by item from the fixtures layout) — off by a few pixels and the seat-then-align reads as "fly near then magnetize", losing all the "return home" precision
- The two travel variants and the six handoff variants don't stack on the same seam; one seam one variant; the travel variants already carry high energy, so wrapping them in white flash/shake reads as an illusion break (same rule as shot-transitions)

## Reference Implementation
demos/transition/transition-travel/
(LetterformZoom.tsx / SharedElementMorph.tsx)
