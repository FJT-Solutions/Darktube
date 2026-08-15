---
name: command-palette-summon
summary: The command palette descends — the whole screen dims with blur, the ⌘K palette drops in with overshoot, candidate rows surface staggered, and typing narrows the list in real time
use: Efficiency products' "the whole product in one input box" narrative; the iconic debut of command palette/search/shortcut features
duration: 4–5s
energy: Medium (ritual style; the drop-in frame and the narrowing are the two small beats)
tags: ui-entrance
---

## Intent
The signature ritual of Raycast/Linear launch films: one soft click, the whole UI world dims
to make way, the ⌘K palette drops in from above center, the candidate list surfaces staggered; type two letters and the
list narrows in real time — "everything you need lives in this input box". Simulated interaction runs at
human operating speed (R3), and the narrowing's "squeeze" comes from row-height collapse, not fade-out.

## Action Phases
| Phase | Frame Reference | Content |
|------|------|------|
| 1 Rest | f0–12 | dashboard initial state |
| 2 Make way | f12–22 | background dims to 45% + blur 10px |
| 3 Descent | f18–33 | panel drops from −20px, overshoots +8px back to rest (riding over the dim) |
| 4 Candidates surface | f32–56 | 5 rows float up staggered every 4f |
| 5 Type to narrow | ~f62–90 | two keypress characters appear, row height collapses narrowing 5→2 (conditionally unmounted after collapse) |
| 6 Selected freeze | final ≥40f | first row highlighted (backdrop + left border), caret becomes steady-on, true stillness |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Dim | brightness 45% + blur 10px, 10f | Not enough dim and the panel doesn't pop; pure black loses context |
| Drop-in | starts 20px above, overshoots one beat back to rest | No overshoot reads as a fade-in, and the ritual feel is gone |
| Candidate stagger | 4f/row | Same-frame appearance reads as a texture |
| Narrow | height→0 + overflow hidden collapse | A fade-out narrowing has no "squeeze"; must unmount after the collapse |
| Caret | blink cycle 16f; forced steady-on after freeze | Blinking through to the end means it never truly rests (demo precedent) |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec,
  so first real use must re-verify with real assets
- Input pacing follows real human typing speed (R3 precedent), key intervals ≥12f
- Combo variant: see theme-switch-moves B-variant (palette shrinking into a dot triggering a theme ripple)
- In production, put real feature names in the candidate rows — this is a natural showcase for the feature list (P4 mapping)
- Sound: one soft click on summon (non-gamey), two keycap foley sounds for the keypresses,
  one light pop for the highlight (S1/S4 same source)

## Reference Implementation
demos/interaction/command-palette-summon/
(CommandPaletteSummon.tsx)
