---
name: color-block-step-wipe
summary: Discrete stepped color-block screen swallow, two variants — A: a small central bar hard-steps 3–5 times to fill the full screen (after takeover a badge pops out in two jumps); B: a color block eats the screen diagonally from a corner in 3 steps while carrying a page card forward one jump per step
use: Brand-color transitions/chapter handoffs; "hard-edged, no easing" pixel-game feel sections; the pure-color field after takeover as the stage for the next section
duration: A ~2.5s (growth 44f + badge + hold) / B ~1.5–2s (3 jumps 30f + hold); demo total 150f
energy: Medium-High (energy comes from the "jump" hitches, not speed)
---

## Intent
Every wipe in the library is a continuous sweep — a boundary pushed across at constant or eased speed. This card inverts that: **zero interpolation, zero easing throughout** — the color block grows like a block in a retro pixel game, every jump is a hard cut, and between jumps is complete stillness. The hitches themselves are the rhythm: three to five "clack, clack, clack" beats announce more than one smooth sweep. Variant B adds one more layer: while the color block advances it carries a content card that steps between discrete positions on the same beat — the card does no tweening, reading as "the whole block being carried in", the block is freight, not decoration.

## Core Motion
- The core is a stepVal frame-threshold lookup: the frame crossing a threshold instantly jumps to the new value, no interpolation — this is the card's grammatical constitution; any easing sneaking in anywhere breaks the whole card's feel
- A variant: width/height step on the two axes separately (demo: w 0→280→820→1340→1920 @ 8f intervals; h first a horizontal bar then vertical completion), bar first then full fill — the two axes being out of sync is what produces the "growth" feel
- A's closing badge also mimics overshoot with steps: scale 0→0.55→1.12→1 in three jumps (52/58/63f) — the same grammar runs to the end; a spring badge would look "from another film"
- B variant: clipPath polygon diagonal advance amount p hard-steps in 3 tiers (0→42→106→200, p=200 full coverage); the carried card steps positions on the same threshold lookups (off-screen→3 stopping points)
- Jump intervals 6–12f, uneven — equal spacing reads as GIF frame-dropping, uneven spacing reads as "beat"

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Step count | A 4–5 jumps / B 3 jumps | ≥7 jumps reads as low-frame-rate scrolling rather than stepping; 2 jumps reads as a flash cut |
| Jump interval | 6–12f | <5f the eye can't track "how many steps"; >16f the mid-run stillness reads as frozen |
| Badge overshoot | 0.55→1.12→1, three hard tiers | Converting to a continuous spring breaks the grammar; overshoot tier >1.2 reads as a bounce animation |
| Carried card | Steps in sync with the color block, rotate −4° fixed angle | If the card tweens/slides, the "whole block carried in" feel is lost; changing angle per jump reads as jitter |
| Diagonal clip | Right-triangle polygon growing from the corner | Rounded corners/feathering on edges breaks the "hard edge" persona |
| Post-takeover hold | ≥30f of pure-color stillness before the next section's content | Content arriving right after full fill means the "screen swallow" beat never finishes breathing |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- Division of labor with wipe-transitions: clock-wipe/blinds are continuous geometric boundary sweeps (smooth family); this card is discrete stepping (hitchy family) — when both families appear in one film, separate the sections; adjacent use makes each look like the other's bug
- Relationship to shot-transitions: this card is a "transition + takeover" composite (the color block stays behind as the new scene's background); for pure handoffs that leave no field behind, use shot-transitions selection instead of forcing a color block just for the transition
- **Strong sound dependency**: one hit per jump (same kick logic as cel-flash-stomp) — an un-sounded stepped transition is easily read by viewers as player stutter
- The stepped "intentionality" works by contrast: other elements in the same section must tween smoothly; if everything steps all over the film, nobody believes it's a design
- Production brand color: use the brand primary for the block; A/B variants can each be used once in one film but with a color swap (demo blue/red); using the same color twice in a row reads as asset reuse

## Reference Implementation
demos/transition/color-block-step-wipe/
(ColorBlockStepWipe.tsx)
Original footage: notion-ai 1.5–3.5s (A center steps) + 26–27s (B diagonal swallow)
