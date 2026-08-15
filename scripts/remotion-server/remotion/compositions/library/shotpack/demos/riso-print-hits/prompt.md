---
name: riso-print-hits
summary: Misregistration hits, two variants — riso-misregistration-hit single impact frame (impact-stop splits a two-color print, jitters twice, registers) and riso-beat-pump beat pump (jumps big per beat + escalating misregistration per beat)
use: Hit emphasis for titles/cards, the paper-ink version of "glitch flash"; A single climax, B rhythmic segment volley
duration: A 4s (single); B 4.7s (four beats)
energy: high
tags: typography, rhythm
---

## Intent
The RGB chromatic-aberration glitch flash (part of impact-feedback C) is fluorescent-screen language, clashing with paper-ink tone. These two offer print equivalents: the element splits into two monochrome plates, light gray/deep ink (multiply ink feel rather than screen fluorescent feel), like a risograph whose plates missed registration — a few jitters then "thwack" into register — the same impact, but the medium imagination entirely replaced with ink on paper. A is single-shot: split plates at the impact-stop, decaying oscillation, hard cut into register — stamping one hit; B is its rhythmic version: on every drum beat the whole frame jumps 8% + the title splits, misregistration escalating each beat, hitting harder and harder — the visual bass drum for beat-sync segments. Same technical root (decaying-oscillation two-plate misregistration), pick single or volley.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A misregistration-hit single | title slams in 8f and impact-stops, splits two plates ~32px apart in opposite directions, 44f decaying oscillation then hard-cut to register + scale pulse | 1–2 hit stamps per film; the arrival instant of titles/large type |
| B beat-pump | one beat every 24f: whole frame jumps 1.08 instantly and decays exponentially + title misregistration escalating 8/14/22/32px per beat into register | music beat-sync segments; "hitting harder" charging volleys |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Two plates | light gray plate (G.mid) + deep ink plate (G.ink), `mix-blend-mode: multiply`, opposite offsets | the multiply-stacked ghost grayscale is exactly "ink out of register"; screen instantly reads fluorescent glitch |
| A misregistration envelope | `offset = A·cos(2πt/18)·exp(-t/60)`, A=(16,7)px, plates opposite; frame 72 hard-cut to zero | linchpin: register is a **hard-cut jump**, not a gradual settle — snapping to zero at ~14px residual gives the "thwack"; pure easing doesn't read as a register beat |
| A slam-in | 8f Easing.in(cubic) from off-screen to impact-stop, split plates on the hit frame | splitting must be on the same frame as impact-stop — 2f late reads as two events |
| A register pulse | 4f scale 1.03→1 on the zero frame | the stamping beat; skipping it leaves the register weightless |
| B pump | `scale = 1 + 0.08·exp(-t/3)` (t=0 at full value, one-frame arrival, no fade-in), exact 1 outside a 14f window | the instant jump is the "push" itself — adding a fade-in makes it an ordinary zoom breath |
| B misregistration escalation | AMP 4/7/11/16px per beat (single plate; both plates opposite = 8/14/22/32px total separation), `AMP·cos(2πt/6)·exp(-t/3)` in a 12f window | escalating add-on is the linchpin (same precedent as hit-counter): four equal beats don't read "hitting harder" |
| B scope | scale applies to the whole-frame container, misregistration only to the title | the whole frame splitting reads as glitch, not print |
| B beat reference | bottom beat tick marks, hit flash deep/resident | beat readability in muted preview environments |
| Finish | A ≥40f true stillness after register / B ≥20f after the last beat zeroes | R1 |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production final; first real use must re-verify with real footage
- **Misregistration amplitude perceptibility precedent (rendered in this batch)**: the glossary's original ±5px was nearly invisible to the eye at normal speed on a 1920-wide frame — single plate 16px / 32px total separation is where it starts being perceptible; when in doubt about amplitude, render an extreme version for the user to see (perceptibility first)
- The two variants overlap semantically with impact-feedback C (negative impact frames) — paper-ink films use this card, game/anime tone uses C; don't use both in one film (P4)
- Variant B is heavily sound-dependent: the hit frames must pin the drum beat (sound-design §4.5); without a track, the segment reads as the picture spasming
- Variant A's misregistration mixes one horizontal and one vertical axis (mostly x, a little y) for a more authentic "plates off-register" look; pure horizontal reads as side-to-side wobble
- Variant B must follow the four beats with a solid hold (≥24f) — the volley ends without returning to breath, and the viewer's ear is still waiting for a fifth beat

## Reference Implementation
demos/effects/riso-print-hits/
(RisoBeatPump.tsx / RisoMisregistrationHit.tsx)
