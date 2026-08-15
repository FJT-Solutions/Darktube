---
name: theme-switch-moves
summary: Theme switching in two variants — theme-sweep, a diagonal sweep (the interface reskins in place where the boundary passes), and palette-ripple, the combo piece (the ⌘K palette shrinks to a point and a ripple spreads from that point to reskin)
use: Narrative passages for dark mode/theme features; the same UI "changing color before your eyes" rather than cutting to a new scene
duration: A 3–4s / B 5–6s
energy: A Medium / B Medium-high (the combo piece has a complete causal chain)
---

## Intent
Two ways to shoot a light/dark mode switch. A (the Notion/Figma/Linear staple): a 15° diagonal
boundary with a bright line sweeps from top-left to bottom-right, and the light theme reskins **in place** as the boundary passes,
with both themes coexisting for an instant in the same layout — the viewer sees "the same UI reskinned", not a transition.
B (combo variant): the ⌘K palette types "dark" and presses Enter, the palette shrinks into a single bright point,
and a dark ripple **spreads outward from that point** across the whole UI — the "command causes the reskin" causal chain reads completely.
Combo linchpin: the ripple's center must be the palette's shrink point, and its start frame must be the shrink-completion frame.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A theme-sweep-toggle | dark version clip-path polygon 15° diagonal sweep (out poly3 fast-then-slow ~38f), 4px white bright line + 18px glow at the boundary, fading out 2f after the sweep; dark version scale 1→0.995→1 to sit solid | Directly showcasing a theme feature |
| B palette-theme-ripple | palette back(1.9) drops in → types character by character → Enter shrinks the palette with ease-in to 0 with a white highlight core pinned in place → circular clip radius 12→1250px cubic-out spreading, 5px white ring with two-way glow at the edge | The highlight segment for command palette + theme interplay |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Dark version production | manually map each key of the palette (bg/card/border each get their own dark value) | Filter-inverted dark colors are wrong (images/avatars all invert) |
| A diagonal oversweep | bottom edge overshoots by SLANT+40px | Without the oversweep a light triangle remains in the bottom-right corner |
| A sit-solid | scale 0.995 amplitude is subtle (demo self-assessment) | Production can push to 0.985 |
| B causal pinning | highlight core holds 10f at the shrink point, ripple center = that point's coordinates | A mispositioned/mistimed center breaks the "command → reskin" causality (the combo linchpin) |
| B light layer | conditionally unmounted after the sweep completes | A true-stillness prerequisite |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec,
  so first real use must re-verify with real assets
- The two layouts must match pixel-for-pixel — any layout discrepancy reads as "switched to another page",
  and the technique fails
- Real-page production: take real screenshots of both the light and dark versions (Q1), no fake filter-darkening
- Theme switches ≤1 per film: it's a feature narrative, not a transition; repeated switching reads as a demo accident
- Sound: A-variant sweep gets one long whoosh; B-variant Enter gets a confirm tone + the ripple spreading into a whoosh
  (S4 foley preferred)

## Reference Implementation
demos/interaction/theme-switch-moves/
(PaletteThemeRipple.tsx / ThemeSweepToggle.tsx)
