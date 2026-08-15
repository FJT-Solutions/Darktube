---
name: spectrum-morph-ui
summary: Spectrum-ized UI — the title's underline splits into a row of vertical bars dancing to the spectrum for two bars, then converges back into a straight line; music visualization growing on the UI
use: The audio-visual-sync highlight section of films with a soundtrack (BGM chorus start / dense drum section); the underline/divider component of title cards and chapter pages
duration: ~4.7s (split 8f + dancing 64f + converge 12f + static 39f)
energy: Medium
tags: typography
---

## Intent
The audio-visual-sync library already has type-rhythm-sync A (font-weight pulse) — that's "text moving by itself"; this card is "a UI component becoming an equalizer": the underline, the most inconspicuous component, is borrowed by the music for two bars, splits into 28 vertical bars dancing a spectrum, then **converges back, returned intact**. The borrow-return structure is all the elegance — viewers first recognize "this is an underline", then watch it become something else, finally watch it become itself again; if it were spectrum bars from the start, it'd just be yet another music visualization. After dancing it must return to that 8px straight line, not a pixel off.

## Core Motion
- 28 bars' bottom edge locks to the original underline's y and **only grows upward**; when convergence finishes, bar width + gap must exactly reassemble the 720px whole line (gap 0↔6px transitioning in sync; when gap<1, bar width +0.5px to prevent hairline seams)
- The non-dancing segment conditionally mounts back to the whole straight line (hood-removal style) — pixel-level stillness comes from "not rendering the bar group at all", not from bar heights zeroing
- demo is a pseudo-FFT: |sin(i·0.7+f·0.31)| × seed hash jitter changing every 4 frames × low-frequency-high/high-frequency-short envelope × ramp amplitude envelope, frame-deterministic with no randomness
- **Real production swaps in real FFT**: use visualizeAudio() from @remotion/media-utils to map the spectrum to bar heights; the pseudo-FFT is only a beat stand-in for grayscale placeholder

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Bar count/width | 28 bars, ≈20px wide at gap 6px | >40 reads as noise; <16 reads as a bar chart |
| Peak amplitude | AMP=92, measured peak 75–85px | spec 62 measured at only ~55px, not loud enough, already boosted 1.5× (perceptibility precedent) |
| Envelope | Tall on the left, short on the right (low-frequency high / high-frequency short) | Uniform height reads as a fence, not a spectrum |
| Gear-shift beat | seed changes every 4 frames | Per-frame changes read as electrical noise; above 8f reads as slow motion |
| Timeline | Split 8f out-cubic / dancing 64f (two bars) / converge 12f | Dancing <1 bar reads as a glitch flash |
| Closing | True stillness ≥39f after the line returns, pixel-level diff zero | A single move after returning destroys the borrow structure |

## Known Pitfalls
- demo tuned on grayscale/placeholder footage — parameters are a tuning starting point, not a production-final spec; first real usage must re-validate with real footage
- **Heavily sound-dependent**: the dancing segment must genuinely land on the music — a spectrum dance without an audio track reads as a UI malfunction; production must align with the BGM via visualizeAudio(), pseudo-FFT must not go on film
- ≤1 per film, and only one component borrowed — if the title underline is dancing and the card divider is also dancing, the equalizer becomes wallpaper (P4)
- Same audio-visual-sync family as type-rhythm-sync; pick one per section — text pulsing and underline dancing spectrum at once, two audio-visual protagonists undermining each other
- The static segment after the convergence frame is part of the "return ritual"; give it heavily (≥35f), don't cut away in a hurry

## Reference Implementation
demos/rhythm/spectrum-morph-ui/
(SpectrumMorphUi.tsx)
