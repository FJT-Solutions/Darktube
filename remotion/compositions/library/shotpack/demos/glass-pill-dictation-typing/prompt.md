---
name: glass-pill-dictation-typing
summary: On pure black, a fixed-width glass pill pops in at about 1.25× then settles down softly; inside, an accent light sweeps in from dark-on-the-left to bright-on-the-right; the caret leads, then a placeholder sentence types out, the light gradually dies as typing progresses, ending as a neutral dark glass bar
use: Voice/AI input field entrances; "talk to it" interaction hint shots; a quiet transition beat between high-energy segments
duration: ~1.7s (50f@30fps)
energy: Low (the quietest beat in the film; only the light recedes)
---

## Intent
Use "light dying with input" to tell one very small thing: on standby it glows (waiting for you to speak); the moment you open
your mouth it hands the light over to the text. In 1.7s only three things happen — pop in, type, light recedes. Any extra motion
(bouncing, color change, icon animation) would stop this beat from being a rest mark.

## Core Motion
- Pill height 46px, radius 23px, `padding: 0 8px 0 16px`, **fixed width**
  `PW = measured text width + 168px` (≈2× the sentence width), no scaling with typing
- Entry `scale 1.25→1`, `seg(0→0.22, outCubic)` (≈0.36s);
  opacity jumps to full within the first 0.025 — "it exists" first, then settles
- The embedded accent light is a `linear-gradient(90deg, α0 → α.35 @42% → α.95 @100%)`
  dark-left to bright-right gradient (the light lives **inside** the pill, not an outer glow)
- Typing: caret appears first at t≈0.025, characters spread evenly over `seg(0.06→0.73)` to fill 18 characters,
  holding through the tail; caret removed over `0.75→0.8`
- Light death `g = 1 − seg(0.08→0.76, inOutQuad)`, same window as typing progress;
  `g` drives three shadow layers converging together: inner border `0.16+0.1g`, inner top light
  `0.03+0.04g`, outer bloom `26g px / 0.28g`
- 5 vertical bars inside the 30px rounded square at the right end, base heights `[13,7,10,6,9]`
  (high-left low-right), with `±1.6·sin(t·18 + i·1.7)` very light breathing

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Fixed pill width | measured text width + 168px (≈2× sentence width) | **Fixed width is the key**: scaling with characters reads as a chip, not an input bar |
| Entry scale | scale 1.25→1, t 0→0.22 outCubic | 1.25× is "settling back from in front of the viewer"; 1.5× becomes a pop popup |
| opacity timing | full within first 0.025 (earlier than the scale settling) | A synced fade-in makes it look like it's "gradually appearing", losing that slight instant solidity |
| Embedded light | 90deg, 0 → .35@42% → .95@100% | The light must live inside the pill; as an outer glow it becomes "notification" rather than "ready for input" |
| Typing | 18 characters, t 0.06→0.73 even | Even ≈ 3f/character; adding ease reads as "someone hesitating" |
| Light death | 1 → 0, t 0.08→0.76 inOutQuad | Sharing the typing window is the film's only causality: the light yields to the text |
| Shadow convergence | inner border 0.16+0.1g / inner top light 0.03+0.04g / outer bloom 26g px | All three layers hang on the same g, so the ending naturally lands on "neutral dark glass bar" |
| Wave bars | 5 bars, base [13,7,10,6,9], ±1.6px, frequency 18 | Amplitude at 4px becomes an "actively recording" state, contradicting "standby" |
| Caret | appears first at t≈0.025, removed 0.75→0.8 | The caret leading the text is the "input field ready" signal |

## Known Pitfalls
- The fixed width relies on a `visibility:hidden` measuring node for `offsetWidth`; the font must be **exactly identical**
  to the real text (`400 21px` + `letter-spacing:.3px`), off by one step and the width is wrong
- The wave bars breathe continuously (not gated by t segments), so their heights differ at the first and last frames —
  when using as a loop asset, set frequency 18 to an integer multiple of 2π
- Typing progress `floor(seg(…)*len + 1e-6)` — that epsilon prevents the final character from failing to appear at
  exactly t=0.73 due to floating-point error; don't delete it
- ACCENT_RGB (default purple `146,126,212`) is shared by the embedded light and the outer bloom;
  swapping a project's brand color only requires changing this one variable
- Placeholder sentence "Speak or type here" (18 characters); when replacing, keep the character count close,
  or both the even typing pace and the fixed-width ratio need retuning

## Reference Implementation
demos/interaction/glass-pill-dictation-typing/
(GlassPillDictationTyping.tsx)
