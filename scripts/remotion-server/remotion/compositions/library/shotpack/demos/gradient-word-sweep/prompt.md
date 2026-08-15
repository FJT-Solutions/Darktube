---
name: gradient-word-sweep
summary: On a black background, a keyword in a slogan gets "charged" by a gradient color sweep fast left-to-right — the wavefront characters glow brightest then decay backward, and once filled, thin purple-red lightning links between characters while the whole word holds a steady breathing glow
use: Charging a single verb/selling-point word inside a slogan (Supercharged/faster/AI…); text drama at energy peaks; slogan frames in black-field brand films
duration: sweep-charge ~15–20f (must be fast) + steady lightning-breathing 1–2s; total 2.5–3.5s
energy: High (one word bursts; everything around it should yield)
tags: effects
---

## Intent
Within a full line of white text, only the keyword gets "electrified": a gradient color
sweeps fast left-to-right across the characters like energy injection — brightest at the
moment of the sweep (wavefront trail), then decaying to steady state; once filled,
thin linking lightning jumps between characters while the word keeps a breathing glow.
Three linchpins: **fast** (sweep-charge 15–20f, slower reads as a progress bar),
**wavefront brightest** (just-lit characters have the strongest effect; without this
gradient it's a static gradient crop), and **glow restraint** (AE-style multi-layer
bloom but don't blur it into a blob — lightning thin and sparse is the decoration).

## Core Motion
- Gradient fill: keyword set as double-layer text (white / gradient color), the color
  layer revealed by a left-to-right advancing mask; the diagonal mask edge is slightly
  soft (~8% of word width)
- Wavefront trail brightening: a ~34%-word-width bright band follows the mask frontier,
  strongest at the wavefront, decaying backward; after fill completes, fades to steady
  state over ~10f
- Glow: 4 bloom layers (ambient large soft + mid halo + near core + bright core),
  steady-state opacity in the 0.55–0.72 range (measured: the 0.75–0.95 range was cut
  for "glow feels too strong")
- Lightning: after fill, thin linking lightning between characters, purple-red
  three-layer stroke (outer 6 / mid 2.4 / bright core 1.4), mulberry32-seeded random
  jumping and flickering, sparse (not a continuous arc)
- Forbidden: no following moving light dots/stars during the fill (measured case law:
  a following white light dot reads as cheap decoration — removed)

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Sweep-charge duration | 15–20f | Original film "very fast"; >28f reads as a progress bar |
| Wavefront bright band | ~34% word width, brightest at wavefront decaying backward | No gradient = static; band too wide = whole word lights up together with no "injection" feel |
| Steady glow | 4 layers opacity 0.55/0.55/0.62/0.72 | The 0.75+ range was cut as too strong; glow layers <3 reads as flat color |
| Lightning stroke width | outer 6 / mid 2.4 / core 1.4 @1080p | Doubling gets cut as "thick"; hue leans purple-red (magenta 216,60,190 family) |
| Lightning frequency | sparse (≤2 bolts on screen, >8f gaps) | High frequency reads as arc fault; the measured demo is still slightly denser than the original |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- Three case-law rulings (distilled from word-by-word user feedback): ① no following
  light dots during fill; ② lightning must be purple-red and thin; ③ glow should err
  weak rather than strong, let the wavefront gradient carry the impact
- Division of labor with type-rhythm-sync/cel-flash-stomp: those handle beat/stomp;
  this card is a single word's "charge" energy semantics — the word must be the selling
  point word in the sentence
- Body copy outside the keyword stays pure white and still — if the whole sentence
  moves, there's no "only it is electrified" drama

## Reference Implementation
demos/typography/gradient-word-sweep/
(GradientWordSweep.tsx)
Source film: clickup-30.mp4
