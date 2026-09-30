---
name: cel-flash-stomp
summary: Background-flash word stomp — large words slam full-screen slightly tilted like stamps, and at each word's landing frame the background layer strobes between two solid colors for a few frames while the text stays rock-still; a UI translation of anime finisher-attack title cards
use: High-energy sections with slogans/triple-word lines ("SHIP / FASTER / TODAY" style); a text-rhythm card, complementary to type-rhythm-sync (that one moves text properties, this one stomps words + flashes the background)
duration: ~30f per word × word count + ≥45f ending; three words ≈ 4.8s
energy: High
tags: rhythm
---

## Intent
Word stomping (stomp typography) alone has only weight; background color flashing
(anime background flash — the alternating color strobe when a finisher name appears)
alone is just a flash. Welded together they complement each other: the word's landing
frame is the flash's detonation frame — **subject stable, background flashing** — the
viewer stares at the text while the whole world shudders in their peripheral vision;
impact comes from the surrounding field, not from shaking the subject. This is the
exact opposite of a screen shake: shake moves the subject, this card shakes the world.
Three words escalate beat by beat, the last word doubles the flash plus a label bar
closes out — one slogan cut into three stamp strikes.

## Core Motion
- Each word ~30f hard cut with no transition; 6f entrance scale 1.18→0.98→1
  (`Easing.out(poly(5))`, 2% overshoot) + rotating alternately +2.5°/−2.5°/0°
  — the tilt is half of the "stamp" read; all-straight reads as slides
- **Background flash layered under text is the linchpin**: from the landing frame the
  background alternates every 2f between G.bg(#ececea) and darker gray #cfcfca for
  6f total, while the text sits on its own top layer, utterly still
  — on white, flash the darker gray, never flash white (case law)
- Last word doubles up: 8f flash + dark tone pulled to #c4c4c0 + bottom label bar
  fades in over 14f on the same frame — the final strike must hit harder than the first two
- Zero crossfade between words; the whole piece is frame-deterministic

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Word duration | ~30f/word, 3–4 words | <22f the word can't be read; 5+ words reads as rap subtitles (go use karaoke) |
| Stomp | 6f scale 1.18→1 + 2% overshoot | Amplitude >1.3 reads "shrink animation" before it reads "stomp" |
| Tilt | ±2.5° alternating, last word back to 0° | Consecutive same-direction tilts read as a layout error |
| Background flash | 2f alternation × 6f; last word 8f + bigger contrast | Flash >10f reads as background glitch; 1f alternation is unreadable at 30fps |
| Label bar | 14f fade-in starting on the frame the last flash ends | Appearing before the final flash, it gets flashed away |
| Ending | true stillness ≥45f after the last word lands | R1; double hold for heavy punches |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- **Sound-critical**: one kick per word slam, background flash aligned to drum hits
  (sound-design §4.5) — the silent version reads as fast PPT flipping; this card is
  written for music sections
- The flash layer must not contain any content elements (no logo, no texture) — what
  flashes must be "air"; something flashing becomes a content glitch
  (same case law as drop-blackout's "black field with nothing in it")
- Difference from using background-cel-flash alone (keyword parked, only the background
  flashes): here the words change and the beat advances; the parked emphasis version
  is its static subset, not a separate card
- Same energy tier as beat-cut-moves A (escalating hard-cut chain) and both are
  "cut + beat" — pick one per film; this card appears ≤1 segment per film (P4)
- Production brand-color version: use a brand color pair for the flash (e.g. accent ×
  deep ink); contrast must be ≥ the demo's #ececea/#cfcfca gray difference or it flashes white

## Reference Implementation
demos/typography/cel-flash-stomp/
(CelFlashStomp.tsx)
