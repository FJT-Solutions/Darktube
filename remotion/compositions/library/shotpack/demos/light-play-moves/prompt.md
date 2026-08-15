---
name: light-play-moves
summary: Light effects, three variants — spotlight-sweep sweeping light over text, sheen single-pass sheen sweep, halation-bloom impact-stop halation bloom
use: Using light as a fourth brushstroke (sweep/wipe/bloom): dark-field title reveal (A), crowning a hero card (B), impact-stop impact (D)
duration: A ~5.3s / B ~4.7s / D ~4.8s
energy: A medium / B low / D high
tags: typography
---

## Intent
The library's "light" has only ever been one point-shot technique, spotlight-hero-card; these three turn light into a system — three brushstrokes, three duties: A is **sweep** — a title nearly invisible in the dark field is lit by a swinging cone of light, bright where the light touches; the difference from spotlight-hero-card is that one lights a card, this one sweeps text; B is **wipe** — a 45° highlight band sweeps once across a deep-ink hero card, clipped by the rounded corners, a silent coronation; D is **bloom** — on a white text impact-stop, a soft glow ring swells violently, blooms, then settles into a resident breathing glow; the difference from B is B moves across, D resides at the highlight edge. All on deep backgrounds or deep heroes — **brightening invisible on white** (precedent) is this whole card's foundation.

## Three-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A spotlight-sweep | two layers of the same text: dim version resident at 0.07, bright version with radial mask following the light spot; cone swings two round trips then full brightness holds | dark-field big-title reveal opener |
| B sheen-sweep | 45° highlight band translates across a deep-ink card once, overflow hidden rounded-corner clip | one coronation on a hero card's still segment |
| D halation-bloom | duplicate text layer under the original with blur+brightness as the glow layer; from the impact-stop frame swells sharply then settles to steady soft glow | impact boost for crash-zoom impact-stop frames |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A contrast | dim 0.07 vs full bright 1.0, white #f5f5f3 on #2a2a28 dark field | contrast is the whole technique; dim >0.15 has no "lighting up" left |
| A light spot | circle 380px (0.95 hard core + soft edge), x = 960+560·sin(2πf/55), two round trips to f110 | f110–125 full bright out-cubic, light effect dissipates linearly (spread/dissipate decoupled precedent) |
| B highlight band | width 1.6× card width, 115° gradient peak rgba(255,255,255,0.32), sweeps once 40–68f inOut cubic | 0.32 is loud enough on deep ink; bidirectional clamp guarantees one pass |
| D glow layer | blur 22px + brightness 1.8; scale 1→1.3 swells in 6f out-cubic, opacity falls 20f linearly to 0.35 then settles 15f slow to 0.22 steady | spread out-cubic/dissipate linear decoupled (precedent); both fast reads as a camera flash |
| Unmounting | all three light layers conditionally mounted, unmounted as soon as sweep/dissipation completes | opacity-0 residue = never truly still (feTurbulence unmount precedent, same family) |
| Finish | A 35f / B 72f / D 89f true stillness | — |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production final; first real use must re-verify with real footage
- **Light effects total ≤2 per film** — light is the fastest-devaluing technique; every card flashing one equals a cheap template
- Variant B passed through a high-standard retry: the old rejection (2026-07-13 precedent) targeted the then-implementation's looks, not the approach itself; four constraints = single-point + hero + rounded-corner clip + exactly one pass; violating any one sends it back to the reject zone
- Deep background is the foundation: all three depend on deep bg/deep hero; skip this card entirely for light effects on white
- D natively couples with crash-zoom-punch's impact-stop (impact-stop = bloom onset); A and spotlight-hero-card are one-of-two in the same film, both "spotlight" vocabulary

## Reference Implementation
demos/effects/light-play-moves/
(HalationBloom.tsx / SheenSweepRetry.tsx / SpotlightSweepReveal.tsx)
