---
name: card-flip-reveal
summary: Feature card 3D flip reveal — a card flips 180° around the Y axis, and at its thinnest side-edge moment a highlight band that moves with the angle sweeps across; the back face reveals a large conclusion number, cards scanning across the whole row one by one with staggered timing
use: Paired "feature→outcome" narratives: a row of feature cards each flips out its own metric/conclusion; an element-level transition card
duration: Single flip 26f, three-card stagger 10f, ~4.9s total (incl. hold)
energy: Medium-High
tags: data
---

## Intent
The library's "flip" family already includes wall-reveal-moves B (a full-wall wave flip, about entrances) and split-flap (character flips, about text). This card is **semantic flipping**: a card's two faces are a causal pair — the front is the feature UI, the back is the numeric conclusion it produces. The flip itself is the answer to "so what?", the standard syntax of Apple bento sections. Sweeping across a row with a 10f stagger per card, three cards and three number beats read as "results delivered in sequence".

## Core Motion
- perspective 1200px + transformStyle preserve-3d; each face has its own backfaceVisibility hidden, the back pre-rotated to rotateY(180°)
- Flip 18f Easing.bezier(0.55,0,0.3,1) surges to 192° (12° overshoot; the original 8° was imperceptible and has been bumped up), then 8f Easing.out(poly(5)) settles back to 180°
- **Side-edge highlight**: the linear-gradient position sweeps from outside the card's left to its right as the angle goes 35°→145°, with a sin envelope peaking at 0.32 darkening gray at 90° (the thinnest moment) — on white backgrounds darken rather than lighten (ruling); the highlight reads as "light sweeping over a rotating face" only when it's driven by the angle
- Stagger delay 10f/card; after all flips, true stillness ≥40f

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Flip duration | 18f + 8f bounce-back | <14f can't see the side-edge moment; >28f reads as slowly turning |
| Overshoot | 192°→180° (12°) | Landing without overshoot reads as an abrupt freeze |
| Highlight peak | 0.32 darkening gray @90° | Peak offset from 90° reads as a texture bug |
| Stagger | 10f/card, ≤4 cards | Flipping simultaneously reads as a full-wall flip (that's wall-reveal B's job) |
| Back content | Large number (90px tier) + one small label line | Stuffing the back with a full UI can't be read — only one beat of attention remains after the flip |
| Ending | Last card settles into true stillness ≥40f | R1 |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- wall-reveal-moves B (grid wave flip) shares the same technical root but a different meaning: that one is an entrance (back grayscale card→front UI), this one is a reveal (front UI→back conclusion) — when both appear in one film, the flip axes must be distinct (entrance rotateX, reveal rotateY)
- The two faces must be a semantic pair (interface→its outcome); flipping out unrelated content makes the flip just a flashy image swap
- With real assets, note the backface rendering cost when the front is a screenshot; split three or more cards across Sequences
- Sound candidate: a soft "pop" on each card's flip-stop frame (sound-design §4.5); three pops in sequence doubles the rhythmic feel

## Reference Implementation
demos/transition/card-flip-reveal/
(CardFlipReveal.tsx)
