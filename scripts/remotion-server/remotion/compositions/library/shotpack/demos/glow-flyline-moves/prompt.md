---
name: glow-flyline-moves
summary: Dark-field glow orbs and flylines, three variants — glow-orb-ambient ambient orb noise, flyline-arc arc connection, orb-flyline-relay same-frame resonance combo
use: Ambience and data narrative for the film's only dark-field segment: A for laying down noise, B for showing data flow, C when the background should back up the foreground; Linear homepage vibe
duration: A ~5s / B ~4.7s / C ~5.2s
energy: A low (noise-level) / B medium / C medium-high
tags: data
---

## Intent
This is the library's first card that lives entirely in the **dark field**. The "brighten invisible on white" precedent reads backwards as: to play with light, go dark first. A is the breathing of space — three heavily-blurred glow orbs drift organically over a near-black ground, the central card's edges bloom as the nearest orb approaches, the background no longer dead; B is data's verb — a glowing arc "fires" from card A to card B, a bright head leading with a fading light tail, the landing point's outline pulses alight, and the metric link finally has a direction; C is A+B welded together — on the flyline's landing frame the nearby orb swells brighter on the same frame, ambient layer and event layer **resonate on the same frame**, backing each other instead of performing separately (combo linchpin: remove the resonance frame and it degrades into two cards juxtaposed).

## Three-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A glow-orb-ambient | three 500–700px radial orbs + blur(100px), dual-sine drift; card-edge glow driven by orb distance [180,720]px→[1,0] weighted max | laying ambient noise in a dark segment; card breathing |
| B flyline-arc | hand-written bezier, 100-segment sampling, grows 22f out-cubic; bright head conditionally mounted leading; segment opacity fades by distance from the head; landing outline pulses, chainable | data flow / metric links; dashboard narrative |
| C orb-flyline-relay | A+B welded: orb surge and card pulse share the landing frame, brighten 1+1.6×surge, rises in 5f dissipates in 15f | dark-field highlight segment; three-card relay finale |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A orbs | peak opacity 0.32/0.22/0.18; drift amplitude total ≥240px, cross-unequal periods 92–134f | same-period drift reads as whole-frame wobble, not "organic" |
| A card-edge glow | box-shadow 0→28px white 0.25 | without glow, orbs and card don't know each other |
| A settling | 90–120f out-sine settle to freeze (start slope ≈0.94 near-continuous), last 30f true stillness | one-frame hard stop reads as frozen; eased settling is the only true stillness |
| B line body | white line 4.5px + 9px dark underlay; dark-field version may drop the underlay | on a light base an underlay-less white line disappears (demo precedent) |
| B bright head | white dot 9px + halo, conditionally mounted only during growth | opacity 0 isn't unmounting; never truly still |
| B pulse | outline spread out-cubic 6f / dissipation linear 12f | no brightening on white — use a darkening overlay 0.16 instead |
| C resonance | surge starts on the landing frame; card brightens 8f to 1 + residual outline pulse 0.3 | over 2f off and the resonance doesn't read as "backing each other" |
| C timeline | action ends before f98, orbs freeze f120, last 35f true stillness | ambient layer freezes last; event layer closes first |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production final; first real use must re-verify with real footage
- Switching between the dark segment and the paper-ink light main visual is costly — keep dark-field segments ≤1 per film; enter/exit with shot-transitions' hidden-cut family, don't hard-cut light↔dark
- The orb drift's final stretch **must** ease-settle to stillness before freezing — clamping a constant-velocity drift is a visible hard brake (A's out-sine settle precedent)
- Production brand-color version: use a brand color pair (e.g. blue-purple) for orbs; grayscale params only guarantee the lightness relationship — re-tune the hue contrast
- With ≥3 relay lines, switch B to C — pure flyline volleys read as a big-screen template; resonance is where authorship shows
- Sound: B/C get a light beat point on each landing, A is silent (sound-design §4.5)

## Reference Implementation
demos/effects/glow-flyline-moves/
(FlylineArc.tsx / GlowOrbAmbient.tsx / OrbFlylineRelay.tsx)
