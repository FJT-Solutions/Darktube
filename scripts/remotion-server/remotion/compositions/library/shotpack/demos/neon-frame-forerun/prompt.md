---
name: neon-frame-forerun
summary: A strongly-perspective neon rectangular frame races in from the left edge from both ends to take shape first; the page inside the frame brightens from dark, while components/text inside the frame settle down from 3D space in staggered order with soft same-shape shadows, completing the fit in sync with the page lighting; background neon tube clusters dim at the end to yield the spotlight
use: "entrance ceremony" for UI panels in dark brand films (frame arrives first, content settles after); first appearance of feature zones; opening of neon/cyber-toned paragraphs
duration: frame race-in ~0.6s + lighting & settling ~2s + background dimming ~0.8s; whole piece 4–4.5s
energy: Medium-high (three layers of action stacked, but all serving one same entrance)
tags: effects
---

## Intent
Frame first, fill later: the neon wireframe races in from both ends like runway lights, marking out the position and announcing "something will appear here"; while the page inside the frame brightens from dark, components settle down from the air with shadows — the viewer sees the interface being "installed" into the frame. The three layers (frame race-in / page lighting / component settling) must **interlock in sync**: the settling progress advances in step with the lighting progress, finishing slightly later; the frame's glow eventually merges into the panel's glow. The background neon tube clusters dim at the end, yielding the brightness to the protagonist to close out.

## Core Motion
- Neon frame: a strongly-perspective rectangular frame (trapezoid), racing in from both ends of the left-edge midpoint simultaneously (stroke animation), with a glowing bright tip; after forming, the frame glow gradually merges into the panel glow
- Page lighting: the panel inside the frame develops from dark gray to bright (lit window ~54f)
- Component settling: every element inside the frame is wrapped in FloatWrap (the same pattern as graze-face-tour): initial lift 100–150px, easeFall accelerated settling, same-shape soft shadow converging with height, sidebar top-down / main area top-down staggered settling; the settling window advances in sync with the lighting window, finishing ~20f later
- Background: large neon tube clusters light up first to set the mood, dimming mid-to-tail in the final segment (center first, then both ends)

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Frame race-in | ~18f, both ends racing toward each other | a single-end draw reads as drawing a picture; >30f and the viewer can't wait for the content |
| Float height | 100–150px, shadow converging with height | judgment: too small a height + too early a start = imperceptible shadow (v3 round-1 rework: increased 1.7× and delayed) |
| Settling window | in sync with the lighting window, finishing ~20f later | settling before lighting completes = moving furniture in a dark room; too much lag reads as two separate acts |
| Stagger | offset starts, descending overlaps in parallel | serial waiting was cut (a general judgment for drop rhythm) |
| Background dimming | final segment dims mid-to-tail ~22f | without dimming the protagonist doesn't stand out; all dimming on the same frame reads as a power cut |
| Settling granularity | row/card level (the original was per-UI-card level, finer) | finer granularity costs more; row level is verified readable |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec; first real use must re-verify with real assets
- Float-and-settle = the core signature of the clickup language (a verified taste signal); this card shares the FloatWrap pattern with graze-face-tour — an imperceptible shadow means not done
- Division of labor with brand-frame-snap: that card is the brand frame clicking into place — a beat piece; this card is the frame-first + content-settles entrance ceremony, the frame being only the prologue
- Derivative direction memo: a perspective-rotation variant (lens arcing left→right while settling simultaneously) was cut with "revise and reconsider" (requiring all components to settle at once) — it has converged into the neon-frame-orbit-drop card

## Reference Implementation
demos/ui-entrance/neon-frame-forerun/
(NeonFrameForerun.tsx)
Source footage: clickup-30.mp4
