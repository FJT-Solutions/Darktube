---
name: brand-ink-open
summary: Ink crosshair draws in → wordmark stamps in letter by letter → typewriter kicker → a full second of stillness, then float up and dissolve
use: Brand opening; any title sequence that "establishes the name before entering the product"
duration: ~2.8s (83f)
energy: Low (opening slot, leaves climbing room for later shots)
tags: typography
---

## Intent
The first beat plants the brand memory point: before any product imagery appears, the viewer sees and remembers the name. Quiet, ink-on-paper texture, with one complete moment of stillness.

## Core Motion
- SVG crosshair strokes draw on (pathLength dashoffset), vertical first then horizontal, fading out once drawn
- Wordmark letterpress per letter: scale presses down from large to 1 + blur→0, with a short glint streak in the accent color under the glyph (amber in the template film)
- kicker subtitle appears typewriter-style character by character, accent-color block cursor blinking on a cycle
- lockup holds completely still for a full 1 second, then the whole thing floats up + shrinks + fades out, handing off to the dashboard

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Crosshair draw-on | Vertical 0→9f, horizontal 8→18f, fade out 24→34f | Must fade out after drawing; a leftover crosshair fights the wordmark for focus |
| Wordmark per-letter | Letter i delay=10+i·3, 12f; scale 1.6→1 (origin center bottom) + blur 6px→0 | "opacity + translate/scale + blur→0" is the film-wide entrance three-piece formula; dropping blur reads as harsh |
| kicker typewriter | 0.7f/char (starts ~28, done ~43.4), cursor blinks on a 2f cycle, stops at 74f | 0.7f/char is only for decorative small type; interactive body-text typing needs 3f/char (per type-and-filter, users flagged it as too fast and it was redone) |
| Brand hold | Frames 46→76, a full 1 second | Hard floor: users twice called out "hold for 1 second after appearing" (R1); under 1s guarantees a rework |
| Exit | 7f float up 40px + shrink 12% + fade out | Exit must outpace entrance — the viewer has finished reading; dragging it out deflates the moment |

## Sound
Brand settle pinned to transition-soft (pinned at f12 in the template film), brand→dashboard camera move pinned to whoosh-fast (f78). SFX are pinned frame-by-frame to beats and managed declaratively in a table (S2); the palette speaks cinematic vocabulary, not game UI taps (S1).

## Known Pitfalls
- The hold belongs to the wordmark settling moment, not a plain text/content card (R1) — the hold was once mistakenly added to a plain content card and quickly rolled back; for ambiguous "hold" feedback, confirm the target before acting (P3)
- Opening energy must start low: the film-wide energy curve is low open → mid buildup → outro peak; showing off in the opening crushes the climb that follows (see Q8's energy-curve requirement)

## Reference Implementation
template/src/aifl/live/SceneOpen.tsx (frames 0–83)
