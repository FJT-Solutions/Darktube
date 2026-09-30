---
name: canvas-materialize-moves
summary: Content "materializes onto the canvas" in two variants — panel-to-canvas row-flip cards (panel table rows fly out along an arc, morphing across containers into canvas cards) and diagram-cascade cascading tree generation (after the prompt types out, nodes pop in layer by layer, connections growing before their nodes)
use: Narrative passages for AI/collaboration tools where "generated results land on the canvas"; A-variant tells "existing content changes its form of existence", B-variant tells "a structure grows out of a single sentence"
duration: A ~4.3s (130f) / B ~5.3s (160f)
energy: Medium
tags: ui-entrance
---

## Intent
The library's generation narratives so far only cover "streaming write-in inside the panel" (ai-stream-response's evidence rows flowing into the panel)
and "charts coming alive on their own" (chart-live-moves); nothing handles **content leaving its container and
materializing as a new entity on the open canvas**. This card fills that gap: the canvas is the stage, the generated object is the
actor walking on. A-variant's linchpin is the cross-container form migration — the same content goes from "row" to "card",
with position/width/height/border radius/content layout interpolating in sync on one spring, so the viewer reads "it flew over and
became this" rather than "delete one, add another"; B-variant's linchpin is the cascade timing — lines pull out nodes, layers
feed layers, and the structural sense comes from sequence rather than simultaneity.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A panel-to-canvas row-flip cards | Checkboxes auto-check one by one → button press → three rows fly out staggered on an upward arc, the row form and card form cross-fading mid-flight, landing with a random tilt; the panel's row slots collapse into dashed blank space | Batch import / one-click boarding: content migrates from list state to spatial state |
| B diagram-cascade cascading tree | The prompt types out character by character (border darkens to confirm when done) → root (dark) → 2 children → 4 grandchildren pop in layer by layer, the folded corner connections draw in 8f ahead of their nodes, then the whole tree breathes one beat once formed | AI-generated structure/mind-map/ER diagrams: one sentence grows a tree |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A checking | 12/22/32f one by one, spring(damping 10, stiffness 260) pop | Checking is the "preview" — without it the viewer doesn't know which rows will fly; checking all on the same frame reads as a static pre-selected state |
| A takeoff stagger | Button presses at 46f, rows take off at 54/60/66f (6f stagger) | All taking off on the same frame reads as copy-paste; stagger >12f makes the last row look left behind |
| A flight interpolation | spring(damping 16, stiffness 60, 34f); position follows a quadratic bezier with a 170px mid-point rise | A straight flight reads as a translate, not "pouring out"; a mid-point rise <100px kills the arc feel |
| A form migration | row 560×80 → card 480×240, radius 10→18, rowOp fades out before u≈0.45 and cardOp lights up after | The two contents' cross-fade must be offset — both states showing mid-way breaks the illusion |
| A landing tilt | ±2° random (-2/1.5/2) | All positive reads as grid layout; >4° reads as a scattered malfunction |
| B typing | 1.1 characters/frame, prompt bar border G.border→G.ink to confirm when typing finishes | Without a confirm state there's no causal latch between "finished typing" and "started generating" |
| B cascade timing | Root starts at 52f, layer gap 20f, same-layer siblings staggered 6f; nodes spring(damping 11, stiffness 170) | Layer gap <12f reads as everything appearing at once; siblings on the same frame read as duplication |
| B line-first | SVG folded corner path (parent bottom edge → midline → child top edge) draws in 16f ease-out, 8f before its child node | "Lines pulling out nodes" is the source of the causal feel; a line arriving after its node reads as an afterthought |
| B settling breath | Starts +22f after the last node, scale 1→1.035→1 from the tree's heart (sin inOut, 28f) | The breath is the period marking "tree formed"; >1.06 reads as a scaling fault |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec,
  so first real use must re-verify with real assets
- Division of labor with ai-stream-response: that card's content streams into place **inside the panel** (conclusion first,
  evidence follows), this card's content **leaves the panel and lands on the canvas**; they can be chained in one film (stream-generate first → then pour onto canvas),
  and when chained, the A-variant's checkbox segment can be skipped — the streamed completed state already reads as "selected"
- Division of labor with chart-live-moves: that card is the aliveness of a data chart itself (flow lines/dot matrices/axis breaks),
  B-variant is the **birth process** of a structure diagram — a chart being alive ≠ a chart being generated, don't use B-variant to perform an existing chart
- A-variant row slots must collapse into dashed blank space — if the original slot looks untouched after the row flies away, "migration" degrades into
  "duplication" and all meaning is lost
- A-variant's cross-fade window (rowOp dies before u≈0.45, cardOp lights after) is the illusion linchpin;
  the spring overshoots, so u can briefly exceed 1 and every content opacity must be clamped
- B-variant's breath origin must be the tree's visual center of gravity (demo 960,620) rather than the frame center,
  or it reads as a full-screen zoom

## Reference Implementation
demos/interaction/canvas-materialize-moves/
(DiagramCascadeBuild.tsx / PanelToCanvasMaterialize.tsx)
Source film: miro-promo 84–92s (A-variant) / 104–116s (B-variant)
