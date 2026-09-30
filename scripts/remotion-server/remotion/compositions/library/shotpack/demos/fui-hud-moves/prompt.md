---
name: fui-hud-moves
summary: FUI/HUD two variants — line-unfold-panel, a line unfolds into a panel (line→plane CRT grammar), and reticle-lock-on, a reticle locks on (viewfinder flies in and locks the target)
use: Variant A for dark-field/tech panel entrances and exits; variant B for any "look here" target call-out (replaces arrow/red-circle without freezing the frame)
duration: A 3–4s (incl. exit) / B 2–3s
energy: A medium / B medium-high (the lock frame is the hit point)
tags: ui-entrance
---

## Intent
Two neutralizable motifs from sci-fi fictional UIs (Jarvis/Territory). A is a panel's ritual power-on/off: a 1px hairline draws out extremely fast → expands vertically into a panel → content fades in, exit mirrors in reverse (line collapses and extinguishes like an old CRT shutdown); a grayscale hairline works as-is, no tech-blue needed. B is capture in motion: four L-shaped corner brackets charge in from off-screen, overshoot-bounce, and "click" lock onto the target's four corners + a tag pops — division of labor with freeze-annotate: that card freezes the frame to annotate; this card names the target mid-motion.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A line-unfold-panel | scaleX 0→1 (out poly4 quick draw, 5f) then scaleY 3px→full height (out cubic, 9f), content fades in a beat early; exit mirrors in reverse | Dark-field panel entrances/exits; power-on/off ritual |
| B reticle-lock-on | Four L corners = the same rect × four mirrored copies; fly-in (10f out cubic) decoupled from contraction (2.2×→0.94×→1 overshoot bounce); on the lock frame the target dimly brightens + tag pops with back | Target call-out; landing on a sound-effect downbeat |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A two-phase rhythm | draw line 5f fast vs. open panel 9f slow | The rhythm difference is the technique itself; equal lengths flatten it |
| A line body | white glowing strip at 3px level; conditionally switch line/dot phases vs. panel phase | After extinguishing, must conditionally unmount for true stillness |
| B fly-in travel | ≥1000px charge in from off-screen | Short travel reads "corner marks appear", not "pounce over" |
| B overshoot | contract past to 0.94× then bounce back to 1 | No overshoot, no "click" lock feel |
| B lock frame | target white overlay quick flash 0.55→hold 0.28 + tag pops on the same frame | Off-by-a-frame between brighten and tag breaks it apart |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production final; first real use must re-verify with real footage
- Remotion has no `Easing.quart` — use `Easing.poly(4)` (the demo actually hit an "easing is not a function" error — recorded precedent)
- B ≤2 uses per film: chained use reads as a military template; the two locked targets must differ
- A and glow-flyline share the dark-field vocabulary; don't stack light effects back-to-back in adjacent segments (Q4 same-origin)
- Sound: A gets a short whoosh on the line draw and a light pop on the panel opening; B gets a "click" (mechanical click, not a game UI sound, within S1 boundaries) on the lock frame

## Reference Implementation
demos/effects/fui-hud-moves/
(LineUnfoldPanel.tsx / ReticleLockOn.tsx)
