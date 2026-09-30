---
name: spotlight-sweep-moves
summary: Dark-field spotlight development, three variants — A wake-sleep sweep (bright where the light is, dark when it leaves), B edge-hugging glow pan (purple light seeps along UI edges + constant-velocity spotlight drifts right), C corner constant-velocity development (radial spotlight expands at constant velocity from a corner, lighting the full screen); "light is narrative" UI showcase in black
use: Introducing UI panels/feature zones one by one in dark-toned brand films; black-field openers where the interface "lights up" to enter; light-based transitions between segments
duration: single variant 3.5–4.5s; A/B can chain into a tour segment
energy: medium-low (restrained, mysterious; the burst point is the "lighting up" instant)
tags: ui-entrance, transition
---

## Intent
In a black field the viewer only sees what light shows them — the spotlight is both lighting and camera move and editing: where the light goes, there it debuts; the light leaves, curtain falls. The three variants share the "edge-hugging purple glow light line" identity element (the light line hugs UI borders/logo/top edge, glow bright and blurry — light "caressing" the interface, not an outline animation). The linchpin is **constant velocity**: the spotlight's movement/expansion is strictly linear — easing gives the light "intent"; constant velocity alone reads as a searchlight's mechanical sweep (C precedent: linear but the final radius too large = saturation in the first quarter, visually not constant either).

## Core Motion
**A wake-sleep sweep** (glow-wake-sleep-panel): a radial development mask follows the light head moving left-to-right at constant velocity, everything outside pitch black; the top-edge purple light line with three glow layers (blur26 wide fuzz + blur9 mid layer + bright core + pink offset layer) travels with the sweep, boxShadow outlining the logo as it passes, a vertical residual light at the right edge; in the tail segment the light leaves and the panel sinks back to darkness — wake and sleep.
**B edge-hugging glow pan** (slide-spotlight-pan): the light line anchors to the panel's edge (first around the top-left vertical edge, then along the top edge after the corner), purple glow seeping into the UI's top interior (light seeping in from the edge); the spotlight head drifts right at constant velocity developing, while the panel slides left at constant velocity = camera-pan-right feel.
**C corner constant-velocity development** (corner-spotlight-reveal): radial spotlight from the top-left corner expands at strictly linear radius, lit where lit, pitch black where not, ending fully bright (light as transition).

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Spotlight move/expand | linear throughout, zero easing | **constant velocity is the linchpin** — zero easing throughout; adding ease reads as the light having subjective intent |
| C final radius | covers the full screen exactly at the end (1300@1080p/100f) | oversize final = premature saturation faking constant velocity: brightness sampling must climb smoothly throughout (measured 8/46/101/…/238) |
| Edge light glow | 3–4 layers (blur26+blur9+bright core+pink offset) | too few layers reads as a thin outline; glow needs enough brightness and blur to be "light" |
| Light anchor | strictly hugging UI edges/top edge/logo | the line floating off the edge loses the "caressing the interface" semantics (A rework precedent: lost positioning, purple light ran to the bottom edge) |
| Development mask | radial gradient, hard edge slightly feathered (feather ~15%) | too hard looks like a circular mask; too fuzzy loses the "lit/unlit" boundary |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production final; first real use must re-verify with real footage
- Division of labor with light-play-moves: that card is gloss play on elements/text (sheen/glow breathing); this card's light is **camera move and editing** (development/curtain/transition) — light decides what the viewer sees
- Three-variant rework precedent: the spotlight sweep must travel with the edge-hugging light line (v1 with only the development mask was cut with "change and re-show" — a bare spotlight has no identity; the edge-hugging purple light is this technique's signature)
- The source film (clickup-30) has a momentary rainbow dispersion at the light line's corner turn; the demo omits it — production can add a 1–2f dispersion layer at the turn frame for extra texture

## Reference Implementation
demos/effects/spotlight-sweep-moves/
(CornerSpotlightReveal.tsx / GlowWakeSleepPanel.tsx / SlideSpotlightPan.tsx)
Source footage: clickup-30.mp4
