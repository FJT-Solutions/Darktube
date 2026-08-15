---
name: beat-cut-moves
summary: Two variants of hard cuts as a rhythmic instrument — an accelerating hard-cut chain (halving intervals closing in on the beat) and a flash-freeze sequence (three white flashes, each cutting to a different crop)
use: Hero/sprint sections where the cut itself is the drumbeat; Variant A for a trailer-style accelerating approach, Variant B for awards-style rapid-fire ceremony
duration: A total ~4.3s (setup 49f + five-cut chain + freeze hold 35f); B total ~4.3s (live footage 30f + three flashes + hold 60f)
energy: High
tags: transition
---

## Intent
The library's rhythm vocabulary so far only governs the rate *within* a single motion (speed-ramp is speed variation inside one take) and how long to hold after settling (R-series breathing precedents) — no term governs **how cut points between shots are arranged**. This card fills that gap: hard cuts make no transition at all, the interval between cut points is the score itself — decreasing intervals read as an accelerating approach (A), equally spaced triple flashes read as a shutter burst (B). No conflict with the R series: R governs the hold after settling, this card governs cut-point layout, and a cut chain must end with a generous hold to give the breathing back. Note this is a deliberate exception — the rhythm preference precedent is one-way "slow down", so the harder the hard-cut chain cuts, the longer the hold after it must be than usual.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A beat-cut-accelerando Accelerating hard-cut chain | Six views hard-cut full-screen at halved intervals 16→12→8→6→4f, accelerating approach, the final cut stops abruptly on a gentle slow push on the main view | Sprinting-approach feel: trailer-style buildup, feature mash driving toward a conclusion |
| B paparazzi-flash Flash-freeze sequence | Three white flashes, each hard-cutting to a different crop of the same footage (full shot → card close-up → number close-up), shutter afterglow settles, the third flash stops on the number | Ceremony feel for highlight moments: awards rapid-fire shots, crowning a key number |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A cut-point frames | 0/49/65/77/85/91/95 (setup 49f, intervals 16→12→8→6→4f) | Intervals shrink by a "halving rule"; equal arithmetic shrinkage doesn't read as acceleration; final interval <4f the eye can't track |
| A view pool | 6 = two FakeDashboard × scale 1/1.8/2.6 + focus point, transformOrigin pinned to the focus then translated to center | Views must be different compositions of the same product (semantic continuity); six unrelated images read as a glitch |
| A cut-frame shutter feel | Cut frame 1f brightness 1.05 + 6% opacity white overlay | Flashes only at the cut frame — a "click", not a flashgun; any thicker steals B's job |
| A ending settle | Freeze back on main view hold 35f, scale 1→1.06 ease-out slow push 20f then static | Abrupt stop is this variant's period — no cuts allowed after the final cut |
| B three-flash cut points | 30/52/70 (intervals 22f→18f tightening), 30f slow push on "live footage" before the flash sets up the post-flash freeze | Must be live before the flash; a whole clip of dead footage makes the three flashes read as no "freeze" |
| B white flash layer | Each flash opacity 0.95→0 over 4f ease-out decay; flash frame ±2px seed hash full-screen jitter | 0.95 start gives the flashgun burst; decay >6f becomes a soft-light transition, losing the shutter feel |
| B shutter afterglow | Cut-in view scale 1.03→1 over 6f ease-out settle + −16px settle to zero | The afterglow is "jolted by being photographed"; without it the three flashes read as a slide deck |
| B three crops | Same Footage, swap scale/transformOrigin: 1.0 full / 2.3 card / 4.0 number | Layered approach has narrative direction; out of order (close-up→full→close-up) reads as a bad edit |
| B ending settle | After the third flash, number close-up hold 60f static | The three flashes are a heavy hit; hold must be at least twice the normal length |

## Known Pitfalls
- **demo tuned on grayscale/placeholder footage — parameters are a tuning starting point, not a production-final spec; first real usage must re-validate with real footage**
- Both variants are **heavily sound-dependent**: cut points must land on the audio track's beat, each cut a tick (A) / shutter click (B); a silent version is just the picture jumping around; pin frames via sound-design.md §4.5 relative to the shot start, not absolute frames
- Variant A's six views must be "different compositions of the same product", not six unrelated frames — viewers must always recognize who this is through the acceleration; don't use this variant with cross-product/cross-scene footage
- Cut chains ≤1 per film (P4 restraint principle): this is the loudest hit in the film; a second occurrence wastes the first
- The rhythm preference precedent is one-way "slow down"; this card is a deliberate exception — the post-cut hold (A 35f / B 60f) is a floor, not a suggestion; err on the side of longer
- A true hard cut = render the corresponding view at the frame in the interval, no transition frames; accidentally adding a 2f crossfade makes it not a hard cut and the beat feel blurs immediately

## Reference Implementation
demos/rhythm/beat-cut-moves/
(BeatCutAccelerando.tsx / PaparazziFlash.tsx)
