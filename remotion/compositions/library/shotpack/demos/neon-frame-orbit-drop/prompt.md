---
name: neon-frame-orbit-drop
summary: After the neon frame sketches its outline first, the camera arcs from the page's left to right, and all page components/text settle down from the air **on the same frame** (same-shape soft shadows converging in sync) — a whole-body-entrance in-frame installation
use: one-shot grand entrance for a single-page UI (vs. tour-style / zone-by-zone reveals); main-visual unveiling for dark neon paragraphs; sibling shot of neon-frame-forerun
duration: frame sketch ~0.5s + rotation & simultaneous settling ~2.5s + settled ~1s; whole piece 4–4.5s
energy: Medium-high (one big one-shot move; still once settled)
tags: effects, camera
---

## Intent
The twin variant of neon-frame-forerun: same frame-first, content-settles-later — but the camera isn't fixed: it arcs continuously from the page's left view to the right view, and while rotating, all components settle from the air. The linchpin is **simultaneous settling**: all components and text take off, descend, and land on the same frame, soft shadows disappearing in sync — this is the grammar of "whole-body entrance" (judgment: the staggered version was cut with "it should be all components and text settling from the air simultaneously"). Staggered settling belongs to tour shots (graze-face-tour/runway); a one-shot reveal of a whole page must land together — don't mix the rhythmic semantics.

## Core Motion
- Neon frame sketch: gradient neon frame races to form in ~14f (same as neon-frame-forerun)
- Viewpoint arc: rotateY +38° → -26° continuous arc (perspective origin 30%→64% following, approximating camera orbit), running through the whole piece
- Simultaneous settling: all elements share one unified LAND moment (normalized ~0.52) — all take off from the ground on the same frame, descend in the air on the same frame, land on the same frame; FloatWrap same-shape soft shadows (blur/offset/opacity by height) converge all in sync
- Background neon tube frame clusters set the scene and yield after the main panel settles

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Settling simultaneity | all elements take off/land on the same frame (zero stagger) | **linchpin**; any stagger reads as tour grammar (see the judgment quote above) |
| Viewpoint arc | rotateY +38°→-26°, perspective origin following | too small an arc reads as jitter; rotating without settling = spinning in place |
| Rotation × settling coupling | settling window centered in the rotation travel | settling only after the rotation finishes = two separate acts; still rotating after settling = can't close out |
| Float height / soft shadow | same as graze-face-tour (100–180px, shadow by height) | imperceptible shadow = not done (accumulated judgments) |
| Frame sketch | ~14f race-to-form | same as neon-frame-forerun |

## Known Pitfalls
- Parameters passed two rounds of tuning on placeholder assets, not a final production spec; first real use must re-verify with real assets
- **Settling-rhythm semantics judgment** (this card and graze-face-tour are each other's counter-example): tour shots = offset starts + overlapping parallel descents; whole-body-entrance shots = all on the same frame. Choosing the wrong grammar gets both cut
- Division of labor with neon-frame-forerun: that card has a fixed camera, staggered settling + page lighting in a three-layer interlock; this card has a rotating camera + same-frame unified landing. Pick one per paragraph, don't use both in sequence (repeated frame language)
- The arc rotation approximates a camera orbit via perspective origin, not a real 3D camera — at extreme angles the frame glow deforms slightly flat; for large-angle orbits in production, consider a real 3D scene

## Reference Implementation
demos/ui-entrance/neon-frame-orbit-drop/
(NeonFrameForerunOrbit.tsx)
Source footage: no corresponding source segment
