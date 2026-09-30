---
name: edit-hook-moves
summary: logo-sting-button end-of-film hook — after the end logo settles, a 12f easter-egg hard-cut inserts before closing, a trailer-style button ending
use: Film-end closing (≤1 time per film)
duration: ~5s
energy: Low → momentary medium → low
---

## Intent
The library's audio-visual cards all govern "what happens on screen"; this variant governs **the rhetoric of the timeline itself** — the ending's second-guess: fade to black → the logo fades in and settles (the viewer thinks it's over) → suddenly a 12f UI close-up easter egg hard-cuts in → cut back to the logo to close, a trailer-style button ending, leaving one last hook. It plays a joke on the viewer's "it's over" expectation.

## Single-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| B logo-sting-button | Fade to black 6f → logo entrance 10f (opacity+scale 0.96→1) → settle 30f → 12f easter-egg hard-cut → cut back to logo, true stillness ≥60f | Film end; one more hit after the main body closes |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Easter-egg duration | 12f-ish, containing a tick dot that lights only on frames 4–5 (2f, conditionally mounted) | Longer than 20f it stops being a "blink" and becomes a shot |
| Easter-egg composition | Panel translate+scale(2.4) close-up on the button row, the translation pushing the sidebar fully out of frame | Old-composition remnants showing in the easter egg read as a wrong cut |
| Pixel-perfect consistency | All logo-segment interpolations clamped to their end values, both sides of the egg sharing the same branch rendering | A 1px logo jump on the hard cut back reads as jitter |
| Editing style | Hard-cut branch rendering throughout (frame ranges return different subtrees), no cross-dissolves | The rhythm comes from cutting, not fading; any dissolve deflates it |

## Known Pitfalls
- The demo was tuned against grayscale/placeholder assets — parameters are a tuning starting point, not a production lock; first real use must be re-validated on real assets
- At most once per film and only at the end — a mid-film button ending becomes a glitch, with viewers thinking the film broke
- The easter egg must be a new close-up never seen in the film — reusing old footage reads as an editing mistake, not a hook; this is the linchpin

## Reference Implementation
demos/outro/edit-hook-moves/
(LogoStingButton.tsx)
