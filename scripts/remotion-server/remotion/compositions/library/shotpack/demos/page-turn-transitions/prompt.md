---
name: page-turn-transitions
summary: Full-page solid-block transitions, two variants — cube-rotate (two pages glued to adjacent cube faces, rotating 90°) and barn-door-split (the old page splits in two and slides apart, the new page meeting it head-on)
use: Chapter-level page turns: the "flip the page" ritual between two parallel major sections; distinct from the shot-transitions family (camera handoff) — that is "the aerial camera moves over there", this is "the page itself is a physical object"
duration: Per variant, previous-state setup 30f + transition 20–38f + ending ≥40f, ~4.4–4.7s
energy: Medium-High
---

## Intent
The six shot-transitions variants and transition-travel/hidden-cut all treat pages as "scenes" — the camera moves between scenes. This card treats the page as a **physical object**: it has thickness, it has weight, it can flip and can split. The solid-block metaphor carries a stronger ritual feel, suited to chapter-level page turns (feature A done→feature B) rather than camera-level handoffs. A cube means "spatially parallel" — the two pages are two faces of a box, implying a sibling relationship; B barn-door means "the old yields" — the old page splits down the middle and slides away while the new page comes up from underneath, implying a replacement relationship. Choose by meaning: parallel page turns use A, old/new succession uses B.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A cube-rotate | Two pages glued to adjacent cube faces (rotateY 0/90° + translateZ W/2), the scene layer rotated −90°; the old face darkens rotating out, the new face brightens rotating in, the two faces pinching a dark edge at 45° | Parallel chapter page turns; switching between two major product areas |
| B barn-door-split | The old page's two 960px overflow containers aligned edge-to-edge, simultaneously sliding off-frame outward with Easing.in(cubic); the crack's inner edges carry a bright line + shadow, the new page scaling 1.06→1 from below to meet it | Old/new succession: before/after redesign, plan A→plan B |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A structure linchpin | Scene layer `translateZ(−W/2) rotateY(θ)` pulls the front face back to z=0 | Without this layer the hold segment's page scale is wrong (pushed away by perspective) |
| A rotation speed | θ 0→−90° / 38f inOut cubic; mid-rotation overlays blur 1.5px, removed on landing | <28f reads no solid-block feel; >50f reads as slowly shuffling |
| A brightness contrast | Old face 1→0.55, new face 0.55→1 + a vertical gradient shadow at the seam sin(pπ) | Without the brightness contrast the two faces read as the same image rotating |
| B foreshadow | A 2px thin line flashes twice at the middle seam before the split (18–22/25–29f) | Splitting immediately leaves viewers not knowing where the split point was |
| B slide-out | Each half translateX ∓980px / 20f Easing.in(cubic) accelerating | Ease-out sliding is "being pushed away"; ease-in is what reads as "yielding" |
| B torn edge | 3px G.ink bright line on the inner edge + 8px shadow | Without the edge line the two halves read as an ordinary left-right wipe |
| Ending | New page settles into true stillness ≥40f | R1 |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- One seam one variant, same rule as shot-transitions; solid-block transitions are heavier than camera handoffs — **≤2 times per film**; two consecutive solid-block seams read as PPT page-flipping
- A variant: the official `@remotion/transitions` cube() is a paid feature — this card is a hand-rolled CSS implementation, and the backlog already has an "evaluate official transition primitives" item; if the official one is adopted, it can be compared against
- B variant's two halves must **align edge-to-edge seamlessly** (right half's inner layer translateX(−960px)) — a visible seam in stillness breaks the illusion; with real screenshots, mind odd-width rounding
- Both pages before/after the transition need ≥30f of stillness setup/ending — if both ends are in motion, the solid-block feel gets drowned by movement

## Reference Implementation
demos/transition/page-turn-transitions/
(BarnDoorSplit.tsx / CubeRotate.tsx)
