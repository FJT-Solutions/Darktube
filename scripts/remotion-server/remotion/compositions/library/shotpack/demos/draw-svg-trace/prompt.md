---
name: draw-svg-trace
summary: Stroke-grow circle annotation — an inked stroke with a pen tip traces around the element's outline, "drawing" it; at the moment it closes, a black flash hands off and content fades in; the same trick can draw an underline under titles
use: called-out entrance for a single card/chart/title; element-level technique (the full-page blueprint tracing belongs to wall-reveal-moves variant C)
duration: stroke 40f + black flash hand-off 16f + hold ≥35f, about 3–4s
energy: Medium
tags: typography
---

## Intent
"Drawing it out" is the handiest entrance metaphor in the paper-and-ink aesthetic: the element doesn't fly in or fade in — it's traced on the spot by an invisible pen. In-library wall-reveal-moves variant C already has a full-page blueprint version (full-screen wireframes drawn segment by segment + regions lighting up); this card is its **element-level close-up version** — one line, one subject, one closure, with a visible pen tip and a readable direction, suited to the "let's talk about this next" moment. The second use is title underline growth: an 18f short version of the same trick, giving a key word a hand-drawn emphasis, a natural sibling of the marker aesthetic token.

## Core Motion
- **No perimeter measuring**: SVG rect/path sets `pathLength={1}`, strokeDasharray="1", dashoffset 1→0 (40f Easing.inOut(cubic)) — no getTotalLength needed
- **Pen tip**: the same path gets an extra layer, thicker (4→7px) and short-dashed (dasharray "0.045 0.955"), with dashoffset = pen phase − p, naturally running at the front; without a tip it's just "a border getting longer", with a tip it's "someone drawing"
- Closure flash: 48–50f the stroke snaps to pure black and thickens 4→8px, 50–56f eases back with out quad — on white, darken and thicken rather than glow (judgment)
- Hand-off: 54–64f the stroke layer fades out while the element's own border fades in; content fades in over the same 8f window — closure means "drawn", and content follows "colored in"

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Stroke speed | one full circuit in 40f (inOut cubic breathes at start/end) | <28f can't read as "drawing"; >60f reads as loading |
| Pen tip | 7px, dash length 0.045 | A tip no thicker than the main stroke disappears into it |
| Closure flash | 2f flash to black + thicken, 6f settle back | Without this, "done drawing" has no period |
| Underline version | 18f out cubic one-way growth, stays after finishing | For a single key word; ≥2 per screen reads as decorative rules |
| Ending | true stillness ≥35f after the hand-off completes | R1 |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec; first real use must re-verify with real assets
- Mutually exclusive with wall-reveal-moves variant C (full-page blueprint tracing): pick one per piece; both reads as repeated announcing
- The stroke path must match the element's real outline (same corner radius rx) — if the line draws a 14px rounded corner but the element is 8px, the closure moment mismatches and breaks the illusion
- On real assets, content must not fade in before closure: if content appears before the line finishes, the "drawing" causality snaps
- Draw one subject per call-out; multiple elements queuing for their own circuits on one screen reads as a loading animation

## Reference Implementation
demos/ui-entrance/draw-svg-trace/
(DrawSvgTrace.tsx)
