---
name: floating-glossy-label-pills
summary: Four light-gray dashboard wireframe panels each topped with a glossy highlight capsule label in a row; the track shifts position over three beats to the right (ease-in → mid push → ease-out, first beat slower with a long tail); the centered one magnifies and sharpens, the two sides shrink to 0.62, sink, fade and slightly blur, forming a corridor feel; at the end a black cursor with a white outline slides diagonally from top right to rest at the right end of the last capsule
use: multi-function horizontal enumeration (Feature A–D, one screen each); product overview / feature tour paragraphs, also usable as a looping base for landing-page heroes
duration: ~4.0s (120f@30fps)
energy: Medium (three position shifts form the beat, no explosion; the cursor is the attention hand-off at the end)
---

## Intent
Showing four features one full screen at a time means four cuts, and the viewer re-orients every time. A corridor carousel has only one visual center: the centered panel is the protagonist, while a sliver of each neighbor on either side tells the viewer "there's more, and this is one queue". The cursor at the end is deliberate: it hands the narrative from "the system is auto-playing" back to "a person is operating this", setting up the interactive shot of the next beat.

## Core Motion
- This is a **technique template**: panel content is all generic wireframe placeholders (top bar + left nav + three column cards / line-chart dashboard / list table / form-switch list — four page types), built from only gray bars and color blocks; for production, swap the whole block for real page screenshots
- The track is a three-beat fit measured frame-by-frame, written in `BEATS`: starts 0.200 / 0.483 / 0.688, travel 0.185 / 0.150 / 0.150. The normalized progress fits `inOutCubic` extremely well (ease-in → mid push → ease-out), **not** the usual "fast-in slow-out"
- The first beat carries a long tail, blended from two curves: `0.85*seg(t, b, b+0.185, E.inOutCubic) + 0.15*seg(t, b, b+0.28, E.outCubic)` — the body completes within 0.185, the remaining 15% drags until 0.48, so the first beat reads noticeably softer than the following two
- The opening carries the tail of the previous beat: `trackX = -11 * (1 - seg(t, 0, 0.19, E.outQuart))` — at t=0 the track sits 11px left and returns over 0.19 — entering mid-settle rather than starting from stillness
- Ring track: `wx = ((trackX - i*SP) % RING + RING*1.5) % RING - RING/2` (SP=232, RING=4*232), folding each panel into the ±RING/2 window. On any beat, one neighbor is pressed against each screen edge — the corridor never breaks
- Every property is driven by centrifugal distance `d = min(1, |wx|/SP)`: `scale = lerp(1-d, 0.62, 1)`, `opacity = lerp(min(1, (1-d)*2.4), 0.78, 1)`, `blur = d*1.3px`, `zIndex = (1-d) > 0.5 ? 2 : 1`
- Panel and capsule sink with **different** curves: panel `translateY(d*80)`, capsule `translateY(d*92)` — the capsule sinks more, pressing close to the panel's top edge when centrifugal (measured: center y sinks from 45 to 102)
- The capsule's "gloss" is stacked from three layers: 180° gradient (light→main→dark) + inner shadows white above, dark below (`inset 0 2px 3px rgba(255,255,255,.65)` / `inset 0 -4px 8px rgba(34,39,47,.5)`) + a 76%-wide white gradient shine covering the top 38%
- Cursor: `seg(t, 0.717, 0.90, E.outQuart)`, opacity **snaps in** over 0.717→0.725 (~2f), position decelerates from (403,36) to (281,56), then almost static at the end (<1px/frame)
- Three drifting fog blobs run sin/cos at different periods (`t*2π*0.5` and `t*2π*0.4`) — the only background-activity layer unrelated to the track

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Beat points | 0.200 / 0.483 / 0.688, travel 0.185 / 0.150 / 0.150 | The first beat is 23% slower than the next two (slower still with the tail) — this unevenness is a measured feel; equalizing reads as mechanical playback |
| First-beat long tail | 0.85×main curve + 0.15×`outCubic(0.28)` | 15% weight spread over 1.5× the duration; above 0.3 the tail drags visibly "still moving" |
| Shift curve | `E.inOutCubic` | ease-in/out is the key; switching to outQuad (fast-in slow-out) instantly reads as being flung, and the corridor's composure disappears |
| Opening margin | 11px left, outQuart return within 0.19 | 11px is the "previous beat just ended" hint; at zero the opening is dead, >30px reads as another shift |
| Center spacing | SP=232px (panel W≈252) | SP < W presses neighbors onto the centered panel's edge; SP slightly under W (232 vs 252) is exactly what produces the "sliver showing" |
| Neighbor scale | `lerp(close, 0.62, 1)` | 0.62 is measured; >0.75 loses the primary/secondary distinction, <0.5 makes neighbors read as thumbnails rather than fellow panels |
| Neighbor sink | panel `d*80px` / capsule `d*92px` | The 12px difference between the curves presses the capsule against the panel's top edge when centrifugal; equal values float the capsule above the panel |
| Neighbor opacity/blur | opacity floor 0.78, blur `d*1.3px` | **Neighbors must stay clearly visible** — the original keeps adjacent panel edges showing on both sides; opacity down to 0.4 or blur >3px breaks the corridor |
| Cursor | snaps in at 0.717 (2f), outQuart glide to 0.90 then still | The hard snap reads as "the pointer was already there"; fading it in reads as a UI element appearing. outQuart's strong deceleration is a mouse's physical instinct |
| Content coordinate space | internal 330×255, overall `scale(252/330)` | All wireframe pixel values live in 330×255; changing panel size only changes the CS |

## Known Pitfalls
- The whole card has a single hue source: `ACCENT` and its `ACCENT_LIGHT` / `ACCENT_DEEP` tiers, plus the matching `A_RGB` / `AL_RGB` / `AD_RGB` components (used by gradients and shadows). Rebranding requires editing these 6 variables; missing an RGB component shows "capsule recolored but the haze still old"
- Exception: the table row status color blocks (pale red/green) and the form toggle (on = blue `#2f7de1`) are **reserved functional colors** that don't follow the ACCENT skin — they express semantics, not brand
- The track beats are measured frame-by-frame from the original, not designed integers. Don't "tidy them up" to 0.2/0.5/0.7 — the first beat's long tail and the later beats' crispness are this motion's identifying features
- Three beats only complete 3 of the 4 shifts (0→1→2→3); after 0.838 the last panel stays centered to the end — ~0.16 (19f) of stillness. This dwell is for the cursor to glide into place, not empty
- `phase: i*1.9` is computed in groups but **never used** (track positions are entirely determined by the `wx` ring math). It can be deleted when porting; don't mistake it for participating in phase control
- Panel W/H, SP, PANEL_TOP, capsule top, and the two sink slopes are all measured constants under a 480×270 crop. Changing the canvas proportion requires re-scaling the whole set; changing one breaks the "capsule pressed against panel top edge" coupling
- Capsule labels Feature A–D and wireframe content are placeholders. The skeleton-bar widths from `rand(i)` are deterministic pseudo-random (reproducible renders) — don't replace with `Math.random` when porting
- The cursor endpoint (281,56) targets the last capsule's right end. Changing capsule labels changes capsule width, so the cursor would stop in the wrong place — relabeling requires re-marking the cursor endpoint

## Reference Implementation
demos/ui-entrance/floating-glossy-label-pills/
(FloatingGlossyLabelPills.tsx)
