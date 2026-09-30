---
name: icon-field-colorize
summary: A grayscale dot-matrix of small icons emerges staggered to fill the screen; a one-beat pause, then several brand-color horizontal bands sweep down across the whole field at extreme speed — an opening/closing card that "lays out the full feature set, then lights it up in brand color in one instant"
use: Opening that lays out the product's capability surface (icons = feature universe) before striking it with brand color; feature-set pages, ecosystem/integration-scale showcases, pad before the title logo
duration: Emergence ~45f staggered + settle ~10f + color flip 12–45f + final settle; 3–4s total
energy: Medium (emergence is setup; the color-flip instant is the only burst)
tags: ui-entrance, outro
---

## Intent
First use grayscale to establish "quantity" — over a hundred small icons emerge staggered and fill the frame; grayscale guarantees they read as background texture without stealing the show. Pause one beat so the viewer registers "it's full", then brand color sweeps the whole field at extreme speed as horizontal band ripples — the gray world lights up in an instant. The linchpin is that **the color flip is not a same-frame hard switch**: frame-by-frame inspection of the source shows several color waves sweeping down in sequence within ~0.5s (blue covers the field first, then orange/green/red cover progressively lower band rows), ending in four layered color bands — the ripple gives "lighting up" direction and speed, while a hard switch only reads as swapping in a new image.

## Core Motion
- Icon field: 150–200 small icons in a grid layout (rows offset by half a cell), grayscale randomized in 3–4 levels; mulberry32 decides grouping/shade/shape
- Emergence: ~10 batches fade in staggered (4f between batches + ≤3f jitter within a batch), each with a 0.55→1.07→1 micro-bounce (ease-out in + 7% overshoot settle)
- One-beat settle (~10f): lets "it's full" register, charging up before the color flip
- Color flip: several color waves advance row by row — ~1.4f row lag + 0.25f column tilt + ≤1.5f jitter per icon (a slanted wave front, not the whole row on one frame); each wave covers downward from its own starting row, later waves covering lower band rows → the multi-color horizontal bands of the final state
- The icon pops 1.22× at the flip instant (sine bump over 3f), giving the wave front a "snap"

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Icon count | 170 (17×10 @1080p, CELL 110px) | Below 100 the "field" doesn't register; above 250 each icon is too small to see the flip pop |
| Emergence total | ~45f (10 batches × 4f + last batch fade-in 8f) | Too fast reads as a flash; >60f and the viewer can't wait for the burst |
| Color-flip total | ~12f to finish the field in the source; demo 45f | Faster is more explosive; only stretch it for teaching/slow-paced contexts |
| Wave count | 4 (matching the final band count) | A single wave as a one-color lighting also works; wave colors = brand palette |
| Row lag | 1.4f/row + 0.25f column tilt | Row lag >3f reads as a line-by-line scanner; 0 = hard switch |
| Flip pop | 1.22× sine over 3f | Without the pop the wave front doesn't read; >1.4× and icons start fighting each other |

## Known Pitfalls
- The demo was tuned against grayscale/placeholder assets — parameters are a tuning starting point, not a production lock; first real use must be re-validated on real assets
- **No same-frame hard color switch** — dense-frame inspection of the source confirms multiple fast ripple sweeps (bear-app 25fps dense frames: blue→orange/green/red completes in ~0.5s); a hard switch reads as an image swap with no "lighting up" feel
- Icons must be recognizable solid simple shapes (heart/star/lightning/check…); abstract color blocks don't carry the "feature universe" semantics
- Division with bubble-swarm-takeover: that one is the kinetic piece of bubbles swarming in to take over the frame; this card's motion is extremely restrained — the show is the instant gray→color flip
- Division with theme-switch-moves: that one switches UI light/dark themes; this card lights a decorative icon field in brand color and carries no interface semantics

## Reference Implementation
demos/opening/icon-field-colorize/
(IconFieldColorize.tsx)
Source film: bear-app.mp4 ≈0.0–3.0s
