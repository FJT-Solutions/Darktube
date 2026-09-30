---
name: wall-reveal-moves
summary: Three variants of whole-wall batch entrance — bento cell-by-cell lighting, grid wave flipping, blueprint line-tracing formation; all reveal in place without displacement, complementing deck-deal-flyin's fly-in displacement type into a category matrix
use: whole-wall first appearances for feature walls / card walls / full-page interfaces; paragraphs where content is already in place and must "become visible" rather than "flood in"
duration: each variant ~4.3–5s (A 150f / B 130f / C 150f @30fps, including establishment holds and still endings)
energy: Medium
---

## Intent
"How does a wall of content enter" previously had only one answer in the library — deck-deal-flyin: high energy, displacement type, "things flooding in". But not every wall should flood: brand sections need solemnity, feature walls need lightness, "from design to artifact" needs to show process. These three variants share one trait — **non-displacement batch entrance**: elements reveal in place, the layout holds from frame one, and the viewer watches "a wavefront of state change sweeping across a wall" rather than "objects flying". Ask one question before choosing: should this wall "flood in" or "light up"? The former goes to deck-deal-flyin, the latter comes to this card.

## Three-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A bento-light-up cell-by-cell lighting | dark-field 3×2 bento wall dims on standby, accent light-trail strokes a ring around each cell, content then brightens and floats up; after all lit, lens pushes in slowly to close | solemn content / dark-field brand sections; steady-rhythm feature overviews |
| B grid-wave-flip wave flipping | 3×3 gray-back card wall flips 180° in place via rotateX along a diagonal wavefront, revealing front-side content, with the last card overshoot-bouncing back | light feature walls; fast-rhythm segments that sweep the whole screen in a second |
| C wireframe-draw-on blueprint line-tracing | the interface first draws as grouped SVG thin-line blueprint, then an accent glowing vertical line sweeps left→right, and where it sweeps the wireframe materializes into the real interface | "design to artifact / idea to product" narratives; a product's first whole appearance |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A rhythm | hold 20f → 12f interval per cell activating in sequence (six cells ~96f all lit) → scale 1→1.04 slow push 25f (bezier 0.33,0,0.2,1) → still ending | the 12f cascade is the balance point between "per-cell legibility" and "whole-wall drag"; more cells can compress to 8–10f, but even intervals are themselves this variant's solemnity — don't mimic dealing acceleration |
| A single cell | dark state opacity 0.18 + translateY 20px; SVG rect pathLength=100 + dashoffset stroke 8f (accent #e8b45e 4px + drop-shadow glow); past half-stroke (+6f) content pops via back-out(0.3,1.4,0.5,1) 8f brightening to place; after the stroke, +12f light-trail anneals to a 0.4 constant thin edge | the stroke and the content pop must **relay, not sync** — starting on the same frame reads as a whole-cell flash; mid-light glow pulse uses the parabola lit·(1−lit)·4, peak amplitude varied slightly per cell seed (sine hash, true randomness forbidden) |
| B wavefront | hold 20f → delay=(row+col)*6f diagonal stepping, each card rotateX 0→180° flipping 14f bezier(0.35,0,0.25,1); the last card overruns to 190° then bounces back to 180° in 8f | (row+col) is the soul of the diagonal wave — switching to row- or col-only one-way sweep instantly turns mundane; overshoot only on the last card — every card overshooting reads as a whole-wall jelly |
| B flip structure | shared perspective 1200px container (one vanishing point for the whole wall), each card a two-sided preserve-3d: gray back facing out + front pre-rotated rotateX(180°), both faces backfaceVisibility hidden | perspective goes on the wall container, not individual cards, or nine vanishing points flip each on its own; at the thinnest 90° point, layer a 4px white highlight line (not rotating with the card, pinned to the cell sweeping top-edge to bottom-edge 45°→135° with the angle, opacity=1−|angle−90|/45), shadow rising with sin(angle) then returning |
| C tracing | hold 20f → groups staggered, 30f each to finish: sidebar starts 20f / top bar 30f / 6 cards 40+i*3f / line chart 52f; SVG pathLength=1 + dashoffset 1→0, stroke #8f8f8d 2.5px round | group staggering is what produces "a hand drawing" — all starting on the same frame reads as a printer; in-card placeholder lines get finer +3f micro-stagger with seed-hash length variation |
| C materialization | 88–118f solid layer clip-path inset(0 right% 0 0) unfolding left→right 30f, bezier(0.55,0,0.25,1); the front edge follows a 4px accent vertical line (#ffc46b + two-layer glow boxShadow), 86–92f fade-in, 112–120f fade-out | the line position and the clip front edge must be driven by the same scan value — async reads as an illusion break; leave ~6f breathing room between the tracing and scan segments (82→88f) — sweeping immediately after the wireframe finishes reads as rushed |
| Still ending | true stillness ≥15f after all three variants' actions settle (A counted after the slow push ends, B after the last card's bounce, C after the scan line fades out) | R1 breathing judgment: every property locks during stillness, including glow/shadow/highlight residue |

## Known Pitfalls
- **The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec; first real use must re-verify with real assets**
- A/C's accent strokes/scan lines belong to the "single-point high-quality light effect" category (compliant within Q4's three constraints), but one piece lights a whole wall ≤1 time (P4 technique dedup) — A and C used together in one piece counts as two whole-wall light effects; pick one
- B's post-flip front must carry real screenshots in production: reserve high-definition texture on the backface side (Q2); during the flip the front is seen at oblique angles — low-res screenshots should be pre-processed with Q2's high-resolution rasterization technique per the aesthetics guidelines
- C's wireframe geometry must align pixel-for-pixel with the solid layer's layout (hand-arranged per FakeDashboard A in the demo) — swapping assets requires re-laying the wireframe; misaligned, the moment the scan line sweeps, elements jump — an instant illusion break
- All three variants are "in-place reveals" — don't mix in displacement entrances (e.g., adding a translateY fly-in to B's flip); displacement needs go to deck-deal-flyin, hybrids look like neither
- A's dark-state opacity 0.18 depends on the dark base (#2a2a28); dimming on a light base reads as a fading glitch

## Reference Implementation
demos/ui-entrance/wall-reveal-moves/
(BentoLightUp.tsx / GridWaveFlip.tsx / WireframeDrawOn.tsx)

Implementation status: all three variants have reference implementations and Gallery dynamic samples.
