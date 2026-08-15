---
name: scan-bracket-sweep
summary: A skeleton document pops to center, L-shaped viewfinder brackets drop at the four corners, and a 2.5px solid line with a gradient tail sweeps back and forth across the document 5 passes — the document stays still throughout; only light reads it
use: "Parsing/validating this content" process shots; document-product capability demos; the middle of an upload→analysis chain
duration: ~5.0s (150f@30fps)
energy: medium-low (mechanical, restrained; the rhythm lives in the reciprocating sweep's breathing)
---

## Intent
Make the viewer understand "this thing is being read line by line by a machine". The viewfinder brackets first frame the target (announcing the inspection object), then the scanning light band completes the whole pass back and forth (announcing the inspection process). The linchpin is **the document itself fully still**: once the document moves too, the viewer can't tell "being inspected" from "loading".

## Core Motion
- Document `seg(0→0.11, outCubic)` pops from scale 0.86 to 1, opacity via `dp*3` reaching full brightness early, settling before scaling — "present" before "steady"
- Four 34px L brackets land in `i*0.022` stagger, each completing in 0.055, converging along the inner/outer diagonal with 8px displacement (`(1-p)*8*dx/dy`)
- Scan window `t 0.17→0.95` strictly linear, cut into 5 passes, within-pass `inOutSine` slow-fast-slow, last 12% full pause (`local=(raw-pi)/0.88`)
- Tail 82px, `rgba(20,20,22,.5)→0`, direction flips with `dir`: hangs above the band on the way down (`top:-82px`), below on the way up (`top:2.5px`), gradient flips in sync
- The whole band is clipped in an `overflow:hidden` layer sharing the document's 10px radius, fading in `0.16→0.20`, out `0.93→0.99`

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Document pop | scale 0.86→1, t 0→0.11 outCubic | starting below 0.8 becomes "flying in from far away"; the pop must be small to read as UI |
| Viewfinder brackets | arm 34px, stroke 2px, offset −7px; stagger 0.022 / 0.055 each | all four corners appearing at once reads as a static border; 0.022 is enough to read "landing one by one" |
| Pass count | PASSES=5, window t 0.17→0.95 linear | 3 passes don't read as "back and forth"; above 7, each pass is too fast within 5s |
| Within-pass easing | inOutSine + 12% end pause | the pause is the breath where "this pass is done"; removing it makes a constant-speed pendulum |
| Light band | 2.5px solid + 82px tail rgba(20,20,22,.5)→0 | too thick (>4px) reads as a mask edge, not light |
| Tail direction | down: top:−82px / up: top:2.5px, gradient flips together | flipping only one puts the tail ahead of the motion, reading as "light sucking backwards" |
| Clip layer | overflow:hidden, same 10px radius as the document | leaking outside the document reads as "sweeping the screen", not "sweeping the document" |

## Known Pitfalls
- The band must be clipped inside the document's bbox with the same radius — any leak loses the "scanning this document" semantics
- The tail's `top` and gradient direction are two separate code sites; changing the scan direction requires changing both, or you get the anti-physical "trail ahead" look
- The bracket's 34px arm and −7px offset are tuned for a 300×178 document; recalculate for real screenshots, and if the arm exceeds a quarter of the short side it presses on content
- INK is the only color variable (brackets + band + tail share it); re-skinning changes only it

## Reference Implementation
demos/effects/scan-bracket-sweep/
(ScanBracketSweep.tsx)
