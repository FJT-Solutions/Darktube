---
name: product-card-progressive-assemble
summary: A detail card assembles itself like fields being grabbed one by one — image→title→breadcrumb pills pop in sequence→original price appears then gets crossed-out and demoted, accent new price springs out→body text reveals line by line with a highlight block sweeping left to right→color swatches light up; the whole card pushes forward at a very slow scale the entire time
use: capability showcase for product/item detail pages; main shot for "structured extraction""auto-fill""data grows itself" narratives
duration: ~5.0s (150f@30fps)
energy: Medium (continuous small events densely packed, no single explosion; forward push keeps the momentum)
---

## Intent
A detail card fading in as one piece only shows "there's a card". Field-by-field landing turns the card into a **form being filled**: each field arrives in turn, and the viewer's attention gets walked through the card's information structure once — where the image is, where the title is, where the price is, where the body's emphasis is. The price cross-out demotion is the piece's only semantic event (not "appearing" but "changing"), so it's placed in the middle at the most visible position.

## Core Motion
- The field timeline is written in "recipe frames": `F = f => f/60`, converting 60-denominator frame numbers into t. image f=0, title f=4, three pills f=8/10/12, price row f=16, three body lines f=30/32/34, three color swatches f=40/42/44 — adjacent fields are only 2 frames apart, the density of "grabbing" rather than "presenting one by one"
- Every field shares the same landing curve: `seg(t, t0, t0+0.1, E.outCubic)`, with two landing modes — `rise` is `translateY(6→0)` (image/title/price row/body lines), `pop` is `scale(lerp(E.outBack(k), 0.4, 1))` (pills and swatches); small items pop, large items rise
- The price demotion happens at f=26 (recipe frame), a **hard cut**: `oldP` changes color (`#17181c`→`#9a9da6`), gains `line-through`, and shrinks 21px→15px — three things at once; immediately `seg(t, F(26), +0.12)` springs the accent new price via `E.spring(nk, 0.35)` from 1.15 down to 1
- Marker highlight: each of the two highlight segments has an absolutely-positioned `ACCENT_SOFT` base block with `transform-origin: left center` + `scaleX(0→1)`, window starting at `F(30+li*2+4)` with 0.085 travel (~5f) — faster than the field landing, reading as "one stroke of the pen"
- Whole-card breathing: `seg(t, 0, 0.75, E.outQuad)` drives `scale(1→1.06)`, easing in and out across the first 75% — this layer is unrelated to all fields; its job is keeping the frame advancing between dense small events

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Field timeline | recipe frames 0/4/8/10/12/16/30/32/34/40/42/44 (`F(f)=f/60`) | same-type fields 2 frames apart, cross-type 4–14 — the spacing density IS the information grouping; equal spacing reads as mechanical roll call |
| Per-field travel | 0.1 (~15f) | travel far exceeds the interval → five or six fields moving at once, the frame "flows" rather than "dots"; compressing below 0.04 becomes hard one-by-one flashes |
| rise displacement | 6px | only 6px — fields "settle down a touch"; >20px fights the whole-card forward-push direction |
| pop start scale | 0.4 + `E.outBack` | 0.4 is a clear "from nothing"; pills and swatches are small so overshoot won't hit neighbors — large items using pop reads cheap |
| Price demotion point | recipe frame 26 (t≈0.433) | placed 10 frames after the price row lands (f=16) — must leave time to "see the original price first"; right on the landing reads as "it was always a discounted price" |
| New price spring | `E.spring(nk, 0.35)`, 1.15→1, window 0.12 | the piece's only overshoot-magnitude event; smaller damping shakes twice, fighting the cross-out action for attention |
| Highlight sweep | window 0.085 (~5f), `scaleX` from the left | 5f is marker speed; >0.15 reads as a background gradient rather than a strike-through |
| Whole-card push | `scale 1→1.06`, window 0→0.75, outQuad | 6% over 3.75s is pure breathing; >12% slams the card into the frame, and text inside the 4.5% padding gets pushed out of bounds |

## Known Pitfalls
- The timeline uses 60-denominator "recipe frames" while the actual duration is 5000ms = 150f@30fps. The two frame bases don't reduce together: to lay out events at 30fps frame numbers, convert recipe frames to t first (f=44 → t≈0.733 → 110f@30fps)
- The last field lands at t≈0.733, after which 1.3s only carries the whole-card push (which stops at t=0.75) — the tail has ~1.2s of fully still freeze-frame. This is time for the viewer to read the whole card, don't cut it as a bug
- The three body lines use `white-space: nowrap` hard-coded against wrapping, at 78% card width. Longer copy or Chinese overflows and gets clipped by `overflow` — production must re-pair font size and line length
- All content is placeholder ("Sample Product Title", `$249/$189`, "Placeholder copy for…", three solid color swatches) — the field structure itself is the reusable part. Real product data usually changes field counts, so re-order the timeline spacing for the new field groups
- The highlight block's `t0 = F(30+li*2+4)` is 4 recipe frames later than its row's landing (`F(30+li*2)`) — a coupled offset; moving the row landing requires syncing the highlight, or you get "highlight first, text later"
- `ACCENT` / `ACCENT_SOFT` are the card's only hue sources (new-price text + two highlights); rebranding changes just these two variables — everything else is neutral grayscale

## Reference Implementation
demos/ui-entrance/product-card-progressive-assemble/
(ProductCardProgressiveAssemble.tsx)
