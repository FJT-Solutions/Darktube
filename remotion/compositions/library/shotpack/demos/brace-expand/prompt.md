---
name: brace-expand
summary: A pair of curly braces first appears small in the center, then shoots outward to ±148px while scaling up to title size; the text's clip width is strictly bound to the brace spacing, revealing it like a curtain being drawn; after settling, letter-spacing relaxes slightly
use: Developer/technical product title cards; chapter openers; the minimal one-beat reveal of "a single symbol completes the reveal"
duration: ~3.8s (114f@30fps: 7f appear → spring open → letter-spacing relax after settling → hold)
energy: Medium (the single overshoot is the only peak, the rest is still)
---

## Intent
Among title-reveal techniques, this card is the most economical: no mask bars, no
per-character moves, no translation — just a pair of braces walking outward while the
text gets "bracketed out." It carries an inherent code vocabulary (`{}` are curly braces),
so in a technical-product context it reads as "this is the content itself." The linchpin
is that the clip width **must be strictly bound to the brace position**: once the text
fades in or wipes in on its own, the braces degrade into decoration and the curtain feel is lost.

## Core Motion
- Braces appear alone first: `on = t >= 0.07 ? 1 : 0` (~7f, **hard cut, no fade in**),
  still at the original 44px size and pressed together — first establish "these are a pair of braces"
- Spring open `ex = seg(t, 0.13, 0.34, E.outBack)` (~15f→39f, completes in 24f),
  overshooting ~8% then bouncing back
- Synchronized scale `sc = lerp(ex, 0.6, 1)`, final brace half-width `x = HALF · ex · sc`
  (HALF=148) — **translation and scale multiply together**, so the scaling itself also
  pushes the braces apart, reading more like "prying open" than two separate curves
- Text reveal width `clip.width = max(0, x·2 - 34)`: subtracting 34 reserves space for the
  brace strokes themselves — without it the text sits on top of the brace marks
- Text scales in sync `scale(sc)` (38px base × 0.6→1), sharing the same sc as the braces
  (different rates read as two elements moving independently); after settling, letter-spacing
  relaxes `letterSpacing = lerp(seg(t, 0.42, 0.62, E.inOutQuad), 1, 2.6)`px
  (~48f→71f) — the "exhale" detail, the last motion in the whole film
- Layout uses a zero-size `root` center anchor + three absolutely positioned children
  (`translate(-50%,-50%)`), **not flex**: width changes throughout, flex would reflow

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Brace appearance | `t >= 0.07` (≈7f) hard cut | Hard cut is correct (the symbol "pops" into place); fading in loses the 2 frames of "see the braces first" and the spring feels abrupt |
| Spring window | 0.13→0.34 (≈24f), `E.outBack` | outBack's overshoot is the film's only peak; plain outCubic reads as a slide with no "prying" force; window <14f the text reveal is unreadable |
| Half-width | HALF = 148px | Determines how many characters the title can hold; longer copy must increase it in sync, otherwise text gets clipped (clip only crops, never shrinks) |
| Scale | `lerp(ex, 0.6, 1)`, braces 44px / text 38px | 0.6 start is the "small size" amount; start >0.85 the growth is invisible, <0.4 the braces start tiny like punctuation |
| Clip reserve | `x·2 - 34`px | 34 is the empirical brace-stroke width; without it text sits on braces, subtracting too much crops text early and reveals incompletely |
| Letter-spacing relax | `1 → 2.6`px, window 0.42→0.62 inOutQuad | This is the "breath after settling"; >4px the title falls apart, removing it makes the ending slightly stiff but not wrong |
| Layout | zero-size `root` + three absolutely positioned children | Width changes throughout, **absolute positioning is mandatory**; flex lets the braces be pushed along by the clip width (case law) |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- **Copy length must match HALF**: placeholder copy is `Your title` (10 characters);
  clip only crops, never scales — a longer title gets both ends cut off by the braces,
  so HALF must be increased in sync (or the font size reduced); Chinese title characters
  are about twice as wide as English, 6 Chinese characters is near the limit
- Clip width grows from 0, so text **always reveals from the center outward**: the copy's
  visual center of gravity must be central (a centered one-line short phrase is best);
  asymmetric long/short lines reveal awkwardly
- Braces and text must share the same `sc`: writing two separate scale curves (even with
  identical values) causes a few frames of "braces arrived, text still growing" desync
  during the overshoot
- Overshoot happens exactly once: no other motion in the film overshoots — this pins
  attention onto the "prying open" action; stacking more back easings devalues it
- The `overflow:hidden` clip height is hard-coded at 60px — when the font size changes
  significantly, update it in sync or the top/bottom get cut
- Sound: the spring moment deserves one short mechanical/wooden open-close hit, then
  silence after settling; layering discipline per sound-design.md

## Reference Implementation
demos/typography/brace-expand/
(BraceExpand.tsx)
