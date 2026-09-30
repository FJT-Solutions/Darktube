---
name: slam-entrance-moves
summary: High-energy slam entrances, three variants — kanada-perspective-snap Kanada-perspective hard stop, score-slam score slam-down, impact-burst-kit landing impact kit (ripples to neighbor cards)
use: Heavyweight entrances for hero/KPI cards; impact-feedback handles post-landing feedback, this card makes the entrance itself the impact
energy: high
duration: single-variant action segment 6–22f + impact aftershock ~16f + hold ≥45f
tags: ui-entrance
---

## Intent
The library's entrance vocabulary's intensity ceiling has always been deck-deal-flyin's "dealing" — fast but not heavy. This card adds the "slam" tier, three flavors: A is directionality — a card swings in hugging the lens with fisheye-level exaggerated perspective and "thwacks" flat, the stylishness of the anime Kanada school; B is weight — a KPI card slams down from 2.5× size in front of the lens, ring + dust + screen-shake triple-burst on the same frame, sports-score-popup heft; C is transmission — on top of B's triple, the shockwave front visibly shoves the neighbor cards aside and springs them back as it sweeps past, "this one shook the neighbors", one thing that tells the power scale. Selection follows narrative need: tell the viewer "it's here" with A, "it's heavy" with B, "it shook the whole room" with C.

## Three-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A kanada-perspective-snap | perspective 300→1500px + rotate3d 58°→0 + scale 1.7→1 swung in over 18f, last 4f overshoot +5° snaps flat, long slanted shadow straightens | one card's stylish reveal; anime/light-hearted tone |
| B score-slam | card slams from scale 2.5/rotate 5° in six frames Easing.in(quad), landing frame ring spread + dust scatter + screen shake on the same frame | KPI/score-type heavyweight number entrances |
| C impact-burst-kit | B's triple + shockwave front passing neighbor-card frames precision-computed by radius/distance; neighbors pushed 30px + rotate ±3° damped bounce back | "whole-room shake" when neighbors already exist on the page |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A swing-in | 18f Easing.out(cubic), translateX −700→0 running with the perspective deformation; blur 2px mid-flight, removed on landing | faster than 12f the fisheye distortion isn't readable; slower than 24f loses punch |
| A settle | rotateY overshoot +5° back to 0 in 4f + 6px screen shake 2f + long slanted shadow settles to normal projection | the "thwack" lives in the overshoot rebound, not at the end of translation |
| B slam | 6f Easing.in(quad) (accelerating slam, not decelerating drop) | ease-out landing is "putting down"; ease-in is "slamming" |
| B triple | ring 80→860px/14f + dust specks 18–30px flying 160–320px + screen shake 18px exponential decay 4f | the original (720px/10px dust/8px shake) was imperceptible across the board; rendered version ×1.5–2 |
| B decoupling linchpin | ring/dust "spread" uses out-cubic, "dissipate" uses linear frame time | both out-cubic makes the early stage run too fast, fading out right after spreading |
| C ripple frame | shockwave front reverse-solved by distance to neighbor card center (460px ≈ 3f after landing); envelope cos(t/2)·e^(−t/8), hard-clamped 0 at 40f | neighbor moving on the same frame as the main card reads as whole-page shake; 3f late is what reads as "rippled" |
| Finish | true stillness ≥45f after all aftershocks zero | heavyweight holds get twice the normal (same precedent as beat-cut B) |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production final; first real use must re-verify with real footage
- All three variants carry screen shake; the shake family (impact-feedback, montage-rhythm A/C) allows only one shake source per shot; the three variants are also one-of-three per shot
- Heavily sound-dependent: A's "thwack" and B/C's sonic booms must pin the same frame (sound-design §4.5); the silent B/C triple reads as "card spasming"
- Variant C's neighbors must have been settled on stage ≥15f before being rippled — a neighbor still mid-entry being shoved breaks the causal chain
- Hold the line against domino-cascade (montage-rhythm C): domino is a chain of "relay entrances" (neighbors enter themselves after being hit); C is "rippled, wobble, back in place" (neighbors were already present) — don't mix them on the same element group
- ≤2 slam entrances per film; three or more all ringing means none ringing (P4)

## Reference Implementation
demos/effects/slam-entrance-moves/
(ImpactBurstKit.tsx / KanadaPerspectiveSnap.tsx / ScoreSlam.tsx)
