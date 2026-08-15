---
name: icon-performance-moves
summary: Icon performance, two variants — pop-burst-confirm confirmation burst (checkmark builds, pops big, explodes particles + spreading ring) and attention-bounce attention-seeking bounce (icon bounces higher in sequence + landing squash + camera drawn in)
use: Half-screen icon close-up segments; A as the punctuation mark for "complete/success", B for introducing new features
duration: A 3–4s / B 4–5s
energy: A climactic accent / B charging intro
tags: interaction
---

## Intent
The library's first batch in the icon-animation category: an icon is a performer being shot close-up, not a micro-interaction in a UI corner. A is the triple-burst of a confirmation moment — the big checkmark first contracts to 0.6x to build 3f, pops to 1.35x overshoot and settles back, and on the same frame 10 short line particles shoot from the center plus a ring outline spreads to 2.5× diameter and fades — "deploy success" isn't drawn, it's detonated; B is the macOS Dock vocabulary — the app icon hops in place 4 times, each higher (0.5→1.2× icon height), squashing on every landing (width 1.2x height 0.8x) + dust specks, and on the highest hop the camera pushes 8% toward it (drawn in), then a function panel pops open on settling — cutting "user attention" into the narrative.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A pop-burst-confirm | scale build-overshoot-settle spring + N radial line translates + ring scale/opacity, all ~20f, then the label pops | task complete / deploy success / checkmark moments, beat-synced sound |
| B attention-bounce | translateY bounces with increasing ease + landing-frame scaleX/Y squash + dust specks, peak frame camera scale 1.08 push-in, panel card pops on settling | new-feature intro: "look at me"→camera looks→it opens its panel |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Icon size | 400–500px tall (half-screen close-up) | a corner micro-icon performing is invisible — the performer must own the frame |
| A build | contract to 0.6x, hold 3f | anticipation: a pop without build has no "burst" |
| A particles/ring | 10 short lines fly 40–60px + ring spreads 2.5× | the three-piece same-frame volley is what makes the "flower burst" work |
| B escalating bounce | 4 hops 0.5→1.2× icon height | equal-height hops read as loading; escalation is "shouting louder" |
| B landing squash | width 1.2x height 0.8x (1–2f) | no squash = no weight |
| B camera push-in | 8% at the peak frame | the camera move acts out the viewer's "drawn in" perspective |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production final; first real use must re-verify with real footage
- bell-swing-alert (bell swing) was dropped from the same batch without note — hanging-pivot swing icons have dubious performance compatibility; new icon performances should favor bounce/burst types
- A and particle-celebrate-hits are both burst accents; pick one per segment
- B's first version burst out of frame (the final hop's peak poked past the top); calculate bounce height and top whitespace in pixels first
- Sound: A silent build → "pop" on the burst frame + faint particle rattle; B a rising "duk" per landing, a light "ding" on the panel pop

## Reference Implementation
demos/effects/icon-performance-moves/
(AttentionBounce.tsx / PopBurstConfirm.tsx)
