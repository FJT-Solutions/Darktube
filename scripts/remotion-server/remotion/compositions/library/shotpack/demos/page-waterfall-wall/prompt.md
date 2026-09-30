---
name: page-waterfall-wall
summary: Page waterfall wall — real page screenshots cut into 3–4 columns scrolling infinitely on a 3D reclined wall at differential speeds in opposite directions, with parallax + a slow lens push-in making a "so much content it never runs out" overview
use: "many pages / many features / many templates" volume paragraphs; montage mid-section exposition or post-intro product-breadth shots
duration: 4–6s (infinite loop; length cut to the paragraph's needs)
energy: Medium (flowing display type)
---

## Intent
A flowing overview: let the viewer "see lots of pages flow by" in a few seconds, reading volume rather than detail. Division of labor with outro-group-photo-launch: that's a **gathering** overview (elements fly in around the wordmark and freeze into a group photo — the meaning is "belongs to the same product"); this card is a **flowing** overview (content keeps flowing and never freezes — the meaning is "there's still much more we haven't shown you"). Division of labor with odometer-digit-roll: that's a mechanical roller with a terminal value (each digit settles and reads a number); this card has no terminal value and loops infinitely. Division of labor with wall-reveal-moves: that's the wall's **entrance action**; this card is the wall's **ongoing state** — its entrance card can hand off to this card to continue the flow.

## Core Motion
- lib component `assets/lib/VerticalTicker.tsx`: parent layer perspective(1000px) rotateX(20°) scale(1.2) reclines into a wall; each column [...items,...items] doubled + progress modulo translateY 0→-50% seamless loop; vertical gradient masks to tidy the edges
- Differential-speed opposite directions are the parallax linchpin: 3 columns with staggered loop durations (e.g. 12/9/14s), the middle column reversed — equal-speed same-direction reads as one big image scrolling; differential + reversed is what reads "independent columns"
- The slow lens push-in parasitizes the outer layer (scale 1→1.06 linear across the whole shot); the wall loops itself while the lens goes one-way — two motion sources in different directions don't fight
- Assets: real page screenshot slices (desensitized per Q1); card-level cuts beat full-page long images — during a full-page slice scroll the viewer can't read, while card blocks have complete outlines to recognize

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Column count | 3 (1080p) / 4 (ultra-wide) | 2 columns can't read as a "wall"; at 5 each column is too narrow and the texture blurs |
| Loop duration | adjacent columns differ ≥25% (12/9/14s) | too little differential and parallax can't be read; the fastest column <7s starts reading as "screen refresh" |
| Direction | middle column reversed (-1,1,-1 or alternating) | all same-direction = one big image; the reversed column is the strongest evidence of "independent columns" |
| Tilt / perspective | rotateX 20° / perspective 1000px | >25° smears the top-row text under perspective (Q2); <12° can't read the wall reclining |
| scale | 1.2 base + slow push to ~1.26 | 1.2 is the baseline compensating perspective contraction; below it the four corners expose the base |
| Mask height | 200px | too short and rows hard-enter and hard-exit; too tall and fewer than 2 rows stay in the visible area |
| Loop cycle | -50% displacement must exactly equal one copy cycle (content height+n·gap) | the lib already guarantees this with marginBottom; hand-rolled implementations using flex gap jump by gap/2 |

## Known Pitfalls
- **Parameters borrow from an external implementation (remotion-3d-ticker), not a final production spec; first real use must re-verify with real assets**
- Each column's total items height must be ≥ the viewport's effective height (otherwise the same slice appears twice on screen, breaking the illusion); don't reuse the same image across columns — the same image in two columns simultaneously reads as asset poverty
- This card is an atmosphere/exposition shot, not an information shot: slice text only needs to read as "recognizably a real page", not fully readable; to have the viewer read a specific block, hand off to spotlight-hero-card as a single protagonist
- P4 deduplication: coexisting with the outro group photo in the same piece is fine (one flowing, one gathering), but the waterfall wall appears only once per piece — a second appearance reads as padding runtime

## Reference Implementation
assets/lib/VerticalTicker.tsx (core component);
demo at demos/ui-entrance/page-waterfall-wall/ (PageWaterfallWall.tsx / VerticalTicker.tsx).
