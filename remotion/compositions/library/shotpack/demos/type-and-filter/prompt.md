---
name: type-and-filter
summary: On a real UI you type to search, the grid converges into a single card by itself, and a click dives through into the detail page
use: "Operation narrative" segments of feature demos; any interaction chain of search/filter/enter-detail
duration: ~2.5s (118–190f)
energy: Medium (the unhurried beat after the high-energy dealing segment)
---

## Intent
Let the viewer "follow along": see what was typed, how the page responds, where the click landed. This is the film's only shot simulating real human operation, and its pacing must feel like human hands, not a script.

## Core Motion
- Camera moves up to the search box, characters type one by one, caret steady-on → blinking
- After typing, leave a breath, then the non-target cards fade out and sink staggered in reading order, the grid converges
- The target card slides to the first-row slot, floating up and widening its shadow mid-path
- A double-ring accent color (amber in the template film) ripple confirms the click, and the camera pushes through into the detail page, handing off to the transition

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Typing speed | 3f/character (TYPE_START=128, "nano-lab" 8 characters ≈ finishing at 149) | The final value after the first version was sent back for being too fast ("unhurried"); interaction demos follow real human operating speed (R3) |
| Breathing pause | from finishing typing to filter FILTER_START=160, ~11f (0.37s) | Filtering immediately after typing reads as machine automation; the viewer can't keep up with the causality |
| Caret | steady-on while typing, then 8f-cycle blinking; click at 176f, caret gone at 185f | Blinking mid-typing reads as stutter; the steady-on → blinking switch is itself the "finished typing" signal |
| Filter exit | 25 non-target cards staggered at 0.4f intervals in reading order, 5f fade-out + 8px sink each | Disappearing simultaneously reads as a page crash; even a 0.4f stagger is enough |
| Target card slide | 10f to the first-row slot, bezier(0.35,0,0.2,1), sin float z 18px + scale +0.02 + shadow widening with the float mid-path | Endpoint must be a real layout slot (Q9); sliding to hover at frame center reads fake |
| Click confirm | two concentric accent-color ripples (3f offset, 10f each, radius 14→54/78) + 3px border + 40px glow, then camera pushes in over 16f to zoom 2.2 | A single ring ripple is too light to see; the push-in hands off to flash-cut to cover the page swap (component in assets/lib/FlashCut.tsx, usage: from = cut point − 5, straddling 5f on each side of the hard cut) |
| Search box | a page-background patch covers the placeholder baked into the texture (keep the magnifier icon), text layers on top | Laying text directly on the screenshot texture ghost-doubles with the baked-in placeholder |

## Sound
Peg keyboard.mp3 to the typing segment and slice 24f to match the action length exactly (S4); peg click-camera to the click (loudest in the film at vol 0.6, S2 loudness tiers); peg whoosh-fast to the grid flying away.

## Known Pitfalls
- The first version's typing+filter was "too fast" and got sent back (R3) — the first draft of an interaction shot is almost always too fast; start from 3f/character
- If the target card doesn't return to a real slot after filtering and hovers above the grid, it reads fake (Q9; once nearly caused a full rewrite)

## Reference Implementation
template/src/aifl/live/SceneFlyIn.tsx
