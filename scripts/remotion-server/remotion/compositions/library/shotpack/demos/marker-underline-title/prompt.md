---
name: marker-underline-title
summary: After the big title settles, a marker underline quickly draws left-to-right beneath the keyword — tapered stroke, rough edges, slight upward tilt following the italic letterform, hugging the text baseline
use: Emphasizing a single keyword in a title (new/free/AI…); handwritten/human brand tones; body-copy-style emphasis
duration: title settles + stroke starts 4~8f later, draw 8–12f, total 1–1.5s
energy: Low (one stroke of punctuation, doesn't steal the title's show)
---

## Intent
A hand-drawn marker stroke suddenly appears inside a printed title, using the material
contrast to lift one word out of the typography — like a person circling a highlight
on a poster. Three linchpins: **fast** (one 8–12f continuous stroke; slower reads as a
loading bar), **close** (hugging the text baseline; further away reads as a divider
line, not emphasis), and **follow the letterform** (the stroke under an italic word must
tilt slightly up-left-low-right-high — drawing the tilt backwards is the easiest mistake
to make and instantly fake; see case law in Known Pitfalls).

## Core Motion
- SVG path draw (strokeDashoffset or clip window), left-to-right in 8–12f,
  slight ease-out tail (fast start, slightly slower finish = hand force)
- Stroke shape: path widens in the middle (widest mid-stroke), edges rough (light
  noise perturbation / rough brush texture), slightly thinner at both ends = stroke
  start and finish
- Position: hugging the text baseline (bottom offset ≈ -0.1em), mid-axis tilts
  slightly upward following the italic letterform
- Timing: stroke starts +4~8f after the title fully settles — the underline is
  "emphasis after reading the title"; moving with the title steals the show

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Stroke duration | 10f (measured rhythm of the original; the 14f version was cut as too slow) | >14f reads as a progress bar; <6f the stroke direction is invisible |
| Baseline distance | ≈-0.1em (tightened from -40 to -20@1080p to hug the letterform) | Far away reads as a divider; touching descenders gets messy |
| Tilt | slight left-low-right-high upward (following italic) | **Drawing it backwards (left-high-right-low) is instantly fake** — a rework case |
| Stroke width | mid ~0.12em, ends ~0.6x | Uniform width reads as a machine line; difference >2x reads as calligraphy |
| Roughness | light noise at edges | Too rough reads as glitch; fully smooth reads as a CSS border |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- Overlaps draw-svg-trace's territory (deliberately kept as two cards): that one is
  generic SVG drawing (icons/illustration/any line work); this card is the **text
  emphasis** marker texture (widening + rough + following the letterform) — use that
  card for shape drawing
- Tilt case law: v1's left-high-right-low was caught in comparison review — stroke tilt
  must follow the letterform; upright text gets a slight horizontal wobble instead
- Residual gap: the original (notion-ai) has finer brush fly-away speckle; production
  can add finer brush noise

## Reference Implementation
demos/typography/marker-underline-title/
(MarkerUnderlineTitle.tsx)
Source film: notion-ai.mp4
