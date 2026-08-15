---
name: text-column-converge
summary: Two words in standoff converge — the left "NEW" and a right feature word stay pinned to equal frame margins on their respective sides with hard-cut cycling and zero shrinkage throughout, and only on the final word does a single ease-in-out slide bring them to the center line, interlocking into a phrase; small text below appears almost as a hard cut; an end-reveal title card
use: Segments where a feature list closes into a product name/slogan ("NEW × a string of features → NEW <product name>" style); keynote-style recaps, version number reveals
duration: cycling 7–16f/word × 8–9 words + converge ~36f + stillness after small text; whole segment ~5–6s
energy: Medium-low (machine rhythm, small-text spec-list temperament, not word stomping)
tags: outro
---

## Intent
Two words occupy left and right like a table of contents standoff; the viewer assumes
it's just cycling captions — until the final word settles and it turns out left and
right were the two halves of one sentence: the single continuous convergence retroactively
makes the whole cycling segment "suspense setup." The linchpin is **pinning**: during
the cycling phase both words stay pixel-immobile with exactly equal frame margins
(measured 412 vs 413@1280 in the original), any gradual shrink would spoil the
convergence early and dilute the reveal into a progress bar. Convergence happens exactly
once, and only after the final word — this is an end reveal, not continuous motion.

## Core Motion
- Left word's left edge and right word's right edge each pin to equal frame margins
  (measured 412/413px @1280 in the original, ×1.5 → 618/1302@1920); the right word
  always right-edge-anchored whether it gets longer or shorter
- Word cycling is pure hard cuts with uneven dwell times (16/12/9/8/7/8/10/12f,
  machine rhythm with a human touch); zero gap shrinkage throughout the cycling
  (case law: a gradual-shrink version was rejected and redone by the user)
- **The one convergence**: ~10f after the final word settles, a ~1.2s (36f) ease-in-out
  (cubic) continuous slide brings both words to center on the screen midline
- Convergence endpoint computed from the monospace font's actual advance (0.6em +
  letterSpacing × character count), the two words interlocking with exactly one space,
  no overlap no gap; no stamp scaling, no secondary compensation move
- ~18f after freeze, the italic small text appears almost as a hard cut (4f quick fade,
  zero translation), sharing the line's left edge and the body font size

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Frame margin | 618px@1920 (**measured in original** 412/413@1280 ×1.5) | Left/right difference >2px reads as misaligned; the margin is this card's identity, don't swap it for golden-section proportions |
| Word dwell | 7–16f uneven | Even dwell reads as a metronome; <7f the word can't be read |
| Convergence trigger | final word settles +10f (measured 32.4→32.7s in original) | Too-short settle period and the viewer hasn't realized "this word won't change" before it starts sliding |
| Convergence duration | 36f ease-in-out cubic (**measured in original** ~1.2s continuous slide) | <24f reads as a bounce into place; >50f reads as dragging |
| Interlock advance | 0.6em + letterSpacing/character, monospace font | Non-monospace fonts have unpredictable advance — overlap or gaps |
| Font size | 42@1080p (**measured in original** character height ~20/720) | This segment has small-text spec-list temperament; scaled to 60+ it becomes word stomping (go use cel-flash-stomp) |
| Small text appear | freeze +18f, 4f quick fade zero translation (appears directly between 34.4→34.6s in original) | Adding a slide-in or long fade steals the convergence's show |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- Overlaps the territory of type-rhythm-sync (character-property beats) and
  beat-cut-moves (hard-cut beats): those two are "the cycling itself is the content";
  this card's linchpin is **pinned positions + a single final convergence** as an end
  reveal, with cycling as mere setup. If the segment has no "convergence reveal,"
  don't use this card
- Convergence happens exactly once — the gradual-shrink-per-word version was falsified
  against the original and deleted; don't resurrect it
- Must be a monospace font (demo uses SF Mono); proportional fonts compute the
  interlock endpoint wrong
- Residual gap vs the original: the original's words carry a 1-frame brightness flicker
  on swap (typewriter line-break feel); the demo is pure hard cut — production may add
  it back, but a flicker >1f reads as a fault

## Reference Implementation
demos/typography/text-column-converge/
(TextColumnConverge.tsx)
Source film: raycast-teams.mp4 28–36s
