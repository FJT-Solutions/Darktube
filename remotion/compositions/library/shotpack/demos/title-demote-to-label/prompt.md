---
name: title-demote-to-label
summary: Big title demotes into a section label, two variants — A: the centered big title develops, holds one beat, then continuously shrinks 0.3x and pans to the top-left corner as a small section label while the content area grows beneath it; B: same routine but its entrance carries a text-selection highlight block that sweeps in then withdraws
use: Chapter openers (the title plays the lead first, then yields to content); section handoffs in tutorial/feature-demo films; variant B adds an identity cue for "text/editing" type products
duration: A ~3s (92f) / B ~3.5s (104f); demo plays both variants back-to-back in 196f
energy: Low-mid (layout-transformation type, atmospheric shot)
tags: transition
---

## Intent
The typical fate of a chapter title is "appear → disappear → content arrives," with
title and content strangers to each other. This card has the title **demote without
leaving the stage**: the centered large word holds one beat to declare the theme, then
a single continuous tween shrinks it to 0.3x, flies it to the top-left corner, and it
lands as this section's label — still on screen, just demoted from lead to nameplate.
The viewer gets spatial memory for free: that big word just now is this small word in
the corner now, and this section is about exactly that. The content skeleton starts
growing while the demotion is still in progress, with zero dead air on the handoff.

## Core Motion
- Demotion is a **single continuous tween**, Easing.inOut(cubic) 20f: scale 1→0.3 +
  position (960,480)→(150,110) on the same curve — splitting into two phases
  (shrink then fly) reads as two separate actions
- transform-origin left-center; the centering offset translate(-50%) scales to zero in
  sync with the tween (`translate(${-(1-dem)*50}%, -50%)`) — not zeroing it leaves the
  endpoint off by half a width
- Entrance development: 12f blur 12→0 + fade-in, Easing.out(cubic); after developing,
  it must hold still ≥18f before demoting — shrinking before the hold eats the declaration beat
- Skeleton content grows staggered: each block width 0.35→1 + rises 28px with fade-in,
  blocks offset in t by 0.16; growth starts when the demotion is 12f in
  (GROW = DEMOTE+12) — title still flying while content already grows; this overlap is
  the "handoff with no dead air" source
- Variant B selection highlight: left-edge and width percentages tween separately —
  sweeping in with width 0→100% (covering), withdrawing with left-edge 0→100%
  (clearing from the left); the demotion starts only after the highlight fully withdraws
- The two variants play back-to-back joined by a 4f white flash

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Demotion tween | 20f inOut(cubic), scale→0.3 | <14f reads as the title being flung away; endpoint >0.45 makes the label too big and crushing the content |
| Hold beat | ≥18f stillness after developing | Skipping this beat, the viewer hasn't read the title before it runs — the demotion is wasted |
| Skeleton stagger | 0.16t between blocks, width 0.35→1 | Growing all at once reads as a page refresh, not "growth" |
| Growth start | +12f after demotion starts | Waiting for the title to fully land leaves 8f of dead air |
| Selection highlight | sweep-in 10f / hold ~8f / withdraw 8f, 35% transparent blue | Highlight hold <5f reads as a flicker bug; demoting before it fully clears leaves the blue block flying along, dirty |
| White flash transition | 4f opacity 1→0 | Only for the two-variant sequence; >6f reads as an exposure accident |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- Division of labor with the retired "title pinned into 3D space, perspective-deformed
  by camera" spatial locking shot (spatial type): this card is a continuous demotion in
  the 2D layout hierarchy (layout type) — use that card for "title lives in product
  space," this card for "title becomes a section name," pick one per film
- Nothing else may move along the demotion path — the title flight is the only focus
  on screen; skeleton growth below its landing point doesn't steal (offset starts),
  but popups/cursors entering on the same frame always do
- When chaining multiple sections (one demotion per section), the top-left labels must
  **wrap to a new line, not stack**: the new label lands while the old one moves up to
  yield, or from the second section on the corner becomes a label graveyard
- Variant B's selection highlight is the product cue for "text can be selected" — for
  non-editor/document products the semantics idle; don't add it just to look good
- Title copy ≤3 words — after demoting to 0.3x it must still read as a label; a long
  sentence shrinks into a gray line

## Reference Implementation
demos/typography/title-demote-to-label/
(TitleDemoteToLabel.tsx)
Source films: perplexity-promo 16–18.5s; variant B derived from framer text-selection-title
