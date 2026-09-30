---
name: runway-ground-skim
summary: Under a low-angle ground-skimming camera, a group of UI cards sticks down from the air in a quick rain-like burst (starts offset slightly, descents overlap heavily in parallel, stop the instant they land with zero bounce); once landed, the page stands up and the viewpoint turns head-on to close
use: entrances for dashboard/card-flow interfaces (content "falls from the sky and completes itself"); correcting to head-on after low-angle show-off segments; the "unified landing" heavyweight version of the clickup float-and-settle language
duration: hover display ~0.4s + sticking ~1.2s + stand-up turn ~1.8s; whole piece 4s
energy: High (the falling feel is the centerpiece, the stand-up turn is the closure)
tags: camera
---

## Intent
Shoot the interface like a runway: in a low-angle perspective UI cards hover at different heights, then stick down in a quick rain-like burst in interface-position order (row-first, left→right) — the falling feel = clean and crisp. Three linchpins: **overlapping in parallel** (starts only 1.5f apart, 9f descents ⇒ 5–6 cards always in the air together, "almost together but with a ripple"; serial waiting was cut twice), **zero bounce** (stop on landing; the bounce was cut), **fast** (9f descents; the 15f version was cut with "faster"). After landing, the page stands up from lying flat (rotateX 66°→0°), the lens pulls back to center, and the viewer returns from "watching a show" to "watching the interface".

## Core Motion
- Camera position: low-angle strong perspective (starting at rotateX ~66°), the page lying flat like a runway
- Hover: cards initially float at 560–880px (varying heights), airborne cards get a follow-spot brightening of ~1.35x (judgment: swallowed by the environmental dark bands = hover imperceptible)
- Sticking: start = 6 + i×1.5f + jitter(≤1.2f) (order-preserving), 9f gravity-accelerated descents (distance∝t²), stop the instant they land, zero bounce
- Stand-up: after all land, rotateX 66°→0° + lens pull-back to center (easeRise), ending head-on at the whole page
- Dark bands controlled at ~32%, leaving visibility for the airborne cards

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Start offset | 1.5f/card (jitter ≤1.2f without reordering) | the 3f version was cut with "no need to wait for one to land before starting the next"; 0 offset reads as a switch (that's orbit's same-frame grammar) |
| Descent duration | 9f gravity-accelerated | 15f was cut as slow; <6f can't read the descent direction |
| Bounce | zero (stop on landing) | the 4.5% press version was cut with "remove the bounce" — falling feel = clean and crisp |
| Hover height | 560–880px varied | equal heights read as a parade; >1000px stretches landing time |
| Air brightening | ~1.35x follow-spot | without it the hover is imperceptible (rework judgment) |
| Stand-up segment | rotateX 66→0 + pull-back, ~56f | descending without standing = no closure; standing too fast reads as a springboard |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec; first real use must re-verify with real assets
- Sticking-rhythm semantics (a three-card judgment family): this card = rain-like overlapping stagger; graze-face-tour = tour stagger; neon-frame-orbit-drop = same-frame unified landing. Choose by shot semantics — wrong choice gets cut
- Division of labor with deck-deal-flyin: that card is cards flying into a queue (horizontal motion); this card is a two-segment vertical sticking + page stand-up, with the falling feel as the body
- The stand-up segment has no corresponding source reference (added per the user's verbal request); the final-state layout aligns with the clickup11 head-on view

## Reference Implementation
demos/ui-entrance/runway-ground-skim/
(RunwayGroundSkim.tsx)
Source footage: clickup-30.mp4 ≈46–50s
