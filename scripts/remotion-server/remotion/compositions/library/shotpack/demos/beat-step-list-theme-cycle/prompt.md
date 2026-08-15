---
name: beat-step-list-theme-cycle
summary: A three-channel metronome — an adjective list on a dark field steps up one row per beat, a pill fixed at the viewport center "catches" the next word and changes color, the whole field's background swaps on the same beat; row, color, and field channels lock to the same beat point
use: "Same product, multiple moods/multiple themes" showcase sections (modern/playful/expressive-style adjective bursts); the densest-paced stretch of the film; syncing to a music section
duration: Setup 30f + 18f per beat × beat count + closing hold; 3 beats ≈ 3.5s (demo 110f)
energy: High (one beat every 0.6s, all three channels jumping together; density-driven high energy)
tags: typography
---

## Intent
Changing a theme color once is a feature demo; changing every 0.6 seconds, three times in a row, with "selected row + pill color + field background" all jumping on the same frame each time — that becomes a metronome. Using the cheapest variable swaps to produce the film's densest rhythm. Two linchpins: first, **the three channels must lock to the same beat point** — if any channel is half a beat late, the "synchronized jump" degrades into three independent animations; second, **the boundary between jump and slide** — the jump occupies only the first 6f of the beat, the remaining 12f are completely still; beat points must "jump" not "slide", a constant-velocity scrolling list is just a list.

## Core Motion
- The pill is fixed in the viewport-center row and **doesn't move**; the list translateY steps per beat — visually it reads as "the pill jumps to the next row and catches the new word", actually it's the world that moves, not the pill
- Beat length 18f (0.6s @30fps ≈ 100BPM), jump window only the first 6f of the beat: `snap(t) = 1-(1-x)^3.2` (steep ease-out), remaining frames still
- Three channels driven by one source: the same tInBeat feeds the list displacement, the pill/background rgb per-channel cross-mix, and the pill squash — one clock, no separate curves per channel
- Theme pairs swap per beat (demo: gray-white/dark-brown → green → purple → red/dark-navy), the pill color and background are matched light/dark pairs, not independent random colors
- Pill landing squash: scale 1.12→0.97→1 over the 6f beat head
- Selected word in reverse white, unselected 34% white; 300px gradient feather above and below frames the viewport — the feather color must sync with bgColor in real time; hardcoded colors look wrong on theme swap
- 30f static setup before the beats begin — let viewers first see "this is a list", then start drumming

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Beat length | 18f (BEAT_LEN, changing it changes the BPM against the audio track) | <12f viewers can't read the words, only flashing colors; >26f the beat feel disperses into per-item presentations |
| Jump window | First 6f of the beat, ease-out exponent 3.2 | Window >10f or a soft curve turns "jump" into "slide", the metronome collapses into a scrolling list |
| Beat count | 3–4 beats | 5+ beats and viewers adapt to the rhythm and start drifting; 1–2 beats can't establish the "metronome" persona |
| squash | 1.12→0.97→1 | Removing it makes the pill look like a texture swap; >1.2 the bounce steals the color-change show |
| Background spread | Adjacent theme backgrounds must share brightness with different hues (all dark) | A brightness jump (dark→light) reads as screen flashing rather than a theme swap |
| Setup/closing | 30f static before; hold ≥30f after the last beat | Without setup the first beat reads as a bug; cutting right at the last beat has no "settled on the final color" confirmation |

## Known Pitfalls
- demo tuned on grayscale/placeholder footage — parameters are a tuning starting point, not a production-final spec; first real usage must re-validate with real footage
- Division of labor with theme-switch-moves: that card is the ritual of a single theme swap (sweep/ripple, one swap tells one story), this card uses consecutive multiple swaps as the beat — use that card to tell "dark mode feature", use this card to tell "multiple moods/multiple themes volume"
- Like cel-flash-stomp, this is a high-density beat section; pick one of the two in the same film or space them far apart — both are "one hit every 0.6s" techniques; placed adjacent, viewers get beat fatigue
- **Heavily sound-dependent**: beat points align with drum hits (change BEAT_LEN to match BPM); a silent version of the three-channel jump reads as interface malfunction
- Word list length ≥ beat count+2 — the bottom of the list needs unselected words padding it; if the last beat stops at the list's final row, "nothing below" is exposed
- The reverse-white determination follows the integer beat; colors follow the tInBeat fraction (as in the demo) — if both follow the fraction you get halfway white/gray intermediate words

## Reference Implementation
demos/rhythm/beat-step-list-theme-cycle/
(BeatStepListThemeCycle.tsx)
Source: bear-app 22.3–24.6s
