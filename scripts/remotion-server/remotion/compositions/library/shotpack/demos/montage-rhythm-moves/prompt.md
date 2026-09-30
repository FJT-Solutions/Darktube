---
name: montage-rhythm-moves
summary: Three montage rhythm variants — drop-blackout-slam blackout buildup to burst, wright-triple-cut triple click close-ups, domino-cascade domino chain entrance
use: Section-level rhythm design: buildup-burst (A), process sketch (B), opening chain (C); complements beat-cut-moves (cut-point layout) — these three govern "the breathing shape of a section"
duration: A 4.3s / B 4.3s / C 5s
energy: High
---

## Intent
beat-cut-moves governs how cut-point intervals are arranged; these three govern the larger rhythm narrative: A is "silence is buildup" — one beat before the drop, cut to full black dead silence for a full beat, so the burst hits loud enough (EDM show blackout convention), for the one second before the film's biggest climax; B is "process triple" — three ultra-close-up clicks click-click-click in a row (press/toggle/flip), the third sound whips back to the full shot showing the result, Edgar Wright-style cutting "the operation is simple" into muscle memory; C is "momentum transfer" — the title slams down and shakes up cards, a card lands and bumps into the sidebar, each element's entrance triggered by the previous one's impact, Rube Goldberg-style telling a page of content's entrance as a chain reaction.

## Three-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A drop-blackout-slam Blackout buildup | One frame into normal playback, cut to pure black dead silence for 12f, then the hero visual slams in with screen shake + bright ring | The beat before the film's one biggest climax; the reveal of a slogan/big text |
| B wright-triple-cut Triple close-up | Three 10f ultra-close-ups hard-cut in a row (each "static 4-motion 3-static 3"), the third sound whips back to the full shot showing the result | "Process flow" sketch: three-step setup, one-click-done narratives |
| C domino-cascade Chain entrance | Title slams down → shockwave pops up a column of cards → last card bumps the sidebar sliding in, momentum direction passed level by level | A narrativized version of a full-page opening entrance; replaces flat sequential fade-ins |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A setup | Foreground slight scale breathing 1.0↔1.02 + a beat flash every 12f | "The film is playing normally" must be perceptible first, so the blackout has contrast |
| A blackout | One frame straight-cut to pure black (#0c0c0c), 12f **completely empty** | Linchpin: anything in the blackout (logo/faint light) releases the pressure — dead silence is the buildup |
| A burst-in | Hero scale 1.35→1.0 (5f out cubic) + 10px screen shake exp(-t/2.5) drying over 12f + bright ring 80→900px dispersing over 16f | All three burst on the same frame; screen shake forced to zero at t≥14 to guarantee true stillness |
| B close-up structure | Each 10f: static 4f + motion 3f + static 3f; motion uses p<0.5 binary jump to stay crisp | 3f of motion is the physical length of a "click"; stretched to 6f it's an ordinary interaction animation |
| B composition consistency | Three close-ups share magnification feel, subject centered in the frame | Composition jumping around reads as three clips crudely stitched; the chain-cut rhythm falls apart |
| B whip-back | 6f whip (Easing.poly(5) out) + 2 stagger-frame copies (opacity 0.35/0.18) simulating blur | The "result" at the whip landing point must be brightened with glow — the answer to the triple clicks must be lit |
| C momentum chain | Each level startFrame = the previous level's impact frame; initial velocity direction inherits the previous impact's direction | Linchpin: vertical slam → vertical pop → (last card tilted 3° providing the horizontal) → horizontal slide; if the direction has no source, the "chain" reads as coincidence |
| C impact shake | 4f decay sequence [A,-0.6A,0.3A,-0.12A,0], two amplitudes 10/6px decreasing | Decreasing amplitude conveys energy loss; equal-amplitude double shakes read as a replay |
| C card bounce | Each pops 60px parabola over 12f, offset 5f apart | 40px/3f intervals read as untrackable transfer at normal speed (this batch's real renders boosted) |
| Closing | ≥50f true stillness after A's burst-in / ≥45f after B's whip-back / ≥50f after C's full chain settles | All three are heavy punches; give hold at twice the normal (same precedent as beat-cut B) |

## Known Pitfalls
- demo tuned on grayscale/placeholder footage — parameters are a tuning starting point, not a production-final spec; first real usage must re-validate with real footage
- Variant A ≤1 per film and must pair with sound design: the blackout's same-frame audio cuts to silence too, the burst's same-frame sound blast (sound-design §4.5) — a silent version of the blackout reads as the player froze for 12 frames
- A's screen shake and impact-feedback, C's shake and the domino's internal shakes all belong to the shake family; a single shot can only have one shake source
- Variant B's three close-ups at 10f each is intentionally fast (verified readable), but if the close-up content becomes real UI with complex operations (not one-glance actions), stretch to 12–14f
- Variant B's whip-back shares its technical root with shot-transitions E-variant whip; B's whip is an intra-shot closing move, not a transition — don't follow B with an E-variant (double whips read as dizziness)
- Variant C's chain maxes at three levels (title→card→sidebar); four levels and up viewers can't track the causality chain, later entrances degrade back into ordinary staggering

## Reference Implementation
demos/rhythm/montage-rhythm-moves/
(DominoCascade.tsx / DropBlackoutSlam.tsx / WrightTripleCut.tsx)
