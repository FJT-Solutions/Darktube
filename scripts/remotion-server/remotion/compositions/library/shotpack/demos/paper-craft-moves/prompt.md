---
name: paper-craft-moves
summary: Two paper-craft variants — masking-tape-slap presses a card down with masking tape (a floating micro-wobble gets "slap-slap" pressed dead) and popup-book-rise stands cards up like a pop-up book (cards rising along their bottom edges into a wall, staggered)
use: physical material language for paper-and-ink main visuals: single-card set entrance uses A, full-dashboard opening uses B; naturally cognate with the paper/ink + accent main visual (template is paper/ink/amber)
duration: A 3–4s / B 4–5.5s
energy: A medium (two hitting beats) / B medium-high (the rising wall has depth impact)
---

## Intent
The UI translation of Wes Anderson scrapbook art and pop-up book papercraft. A: after a card drifts lightly into place it hovers with a micro-wobble (unfixed paper); two torn-edge translucent tape strips "slap, slap" onto opposite corners in sequence, and the second slap — **on the same frame** — stops the wobble, thins the shadow, and sinks the whole card — the "pressed dead" moment is the protagonist, and the two "slaps" are natural sound-effect points. B: the whole page lies flat like an open book (top-down view); cards, like paper stuck to the page, rise along their own bottom edges into a wall in staggered order, rebounding from 95° back to 90° at the top of the rise (paper's resilience), with root shadows narrowing as they rise.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A masking-tape-slap | wobble = amplitude envelope × sine (rot ±1.5°/bob ±5px); tape swoops in 6f: scale 1.45→1 + rotate under-16°→overshoot 7°→settle back + a one-frame squash at the landing frame scaleY 0.72; torn edge as a 14-point clipPath zigzag | set entrance for a single card/badge; aligning with copy stress |
| B popup-book-rise | two-layer 3D: scene rotateX 75° top-down (persp 2600), each card rotateX 0→-90° spring (damping 11 overshooting -95°), origin at bottom edge, preserve-3d threaded through; far row first then near row, staggered 7f | full-dashboard opening; "the system being built" |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A press-dead trio | same frame: wobble 2f to zero + shadow 34px→8px + whole card sinks 2px | separating the three across frames kills the "pressed dead" feel; the first tape only decays the envelope to 0.45 (half-dead) |
| A tape texture | translucent + zigzag torn edge + deliberately tilted 2–3° at the landing spot | the tilt is designed hand-made feel; perfectly straight reads as a UI element |
| B rise direction | rotateX 0→**-90°** (rising toward the viewer) | demo judgment: writing the direction reversed makes cards fall into the frame and get clipped by the base |
| B root shadow | blur rectangle doesn't rise with the card; height 104→14px, opacity 0.26→0.1 interpolating with the angle | no shadow = floating paper; shadow rising with the card breaks the illusion |
| B ending | after all stand, scene 75°→68° slight return (in-out cubic) | stopping dead loses a breath |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec; first real use must re-verify with real assets
- A's wobble is the "unfixed" narrative setup, not handheld shake (Q3 boundary): the amplitude envelope must finally reach zero, existing only until the card is pressed dead
- B's division of labor with tilt-reveal: tilt is a **camera** looking up at a static page; this card's camera barely moves while **the pieces themselves** stand up
- After B's wall rises, cards stand at 90° side-on and text isn't readable — the wall rise is a composition move; information belongs to the head-on paragraphs after (Q6 cognate)
- Sound: A two "slaps" (paper-strike foley); B a light paper sound per row rising, staggered-aligned (S2/S4 cognate)

## Reference Implementation
demos/ui-entrance/paper-craft-moves/
(MaskingTapeSlap.tsx / PopupBookRise.tsx)
