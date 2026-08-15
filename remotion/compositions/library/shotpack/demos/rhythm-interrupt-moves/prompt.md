---
name: rhythm-interrupt-moves
summary: Two rhythm-interrupting variants — jump-cut-punch-in three-step jump-cut push-in, strobe-black-frames strobe black frames
use: Using "interrupting continuity" itself as the rhythm instrument: staccato push-in (B), suffocating approach (C); complements beat-cut-moves (cut-point layout) and montage-rhythm (section breathing)
duration: B ~4.5s / C ~4.5s
energy: B Medium / C High
---

## Intent
The library's rhythm cards govern "how to cut, how dense to cut"; these two govern **how to interrupt** — viewers expect continuity, you deliberately interrupt, the way you interrupt is the expression: B is spatial interruption — the same composition jumps three big steps with zero tween (1x→1.6x→2.6x), Godard's jump-cut staccato, more commanding than a continuous push-in with that "look here, closer, that's it" instruction feel; C is existential interruption — the picture strobes between itself and pure black with tightening intervals, the suffocating countdown before the climax. Selection: forced focus on a metric uses B, pressure-building before the climax uses C.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| B jump-cut-punch-in | transform-origin pinned to the target center, three scale steps jump-cut (zero tween), each jump 2f deepening pulse as the tick | Approaching a core metric step by step; documentary-style stare |
| C strobe-black-frames | Full-screen black frames flash per a hardcoded frame-number table (2f each, intervals converging 8f→3f), the last flash rips open into a hard-cut zoom to settle | The countdown pressure-building before the film's biggest climax |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| B steps | 1.0→1.6→2.6, each hold ≥35f | Step difference <1.5× reads as the picture jittering |
| B tick | From the jump frame, 2f brightness 0.92 full-frame pulse | A jump-cut without a tick reads as dropped frames |
| C frame-number table | [40,48,55,61,66,70,73,76,79] 2f pure black each | Intervals must converge; equally spaced strobe is just flashing with no "approach" |
| C hammer drop | The last flash rips open one frame to scale 1.35 + 2f deepening pulse | If it stays in the original composition after ripping open, the strobe was held in vain |
| Closing | B last step ≥45f / C after the hard cut ≥50f true stillness | Interruption-family holds err on the heavy side |

## Known Pitfalls
- demo tuned on grayscale/placeholder footage — parameters are a tuning starting point, not a production-final spec; first real usage must re-validate with real footage
- Both variants and speed-ramp-freeze move the "timeline"; a single shot can only have one time manipulator
- Variant C carries a **photosensitivity warning**: strobe footage needs a photosensitive-epilepsy viewer warning; and it must sync with a music crescendo (a silent strobe reads as signal failure), ≤1 per film
- Variant B's three steps must share the same composition and origin (pinned to the target center) — re-composing per step makes three separate shots, not jump cuts
- Heavily sound-dependent: B a tick per jump, C a beat hit per flash (sound-design §4.5)

## Reference Implementation
demos/rhythm/rhythm-interrupt-moves/
(JumpCutPunchIn.tsx / StrobeBlackFrames.tsx)
