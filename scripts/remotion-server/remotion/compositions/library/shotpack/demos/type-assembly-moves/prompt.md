---
name: type-assembly-moves
summary: Text assembly, four variants — split-text-stagger per-character split rise, letterform-drift-assembly drift convergence, tracking-expand-reveal letter-spacing breathing, text-on-path flowing in along a line
use: Big title/slogan entrances; with the two type-entrance-moves variants, split-flap-title, and document-typewriter-reveal, all part of the big title-entrance family — ≤2 types per film
duration: single variant 4–5s (action segments A ~56f / B ~104f / C ~58f / D ~99f, all including hold)
energy: A medium / B medium-high / C low-medium / D medium
---

## Intent
Title entrances already have the "in-place transformation" four (scramble decode /
character drop / split flap / typewriter — characters change form in place). This card
adds the "assembly" family: characters **converge into** the title from elsewhere, and
the travel itself is the show. A is piano-key — each character slides up from under an
invisible crop line, crisp and rational, the most broadly applicable; B is opener-style
— characters drift in from all directions with blur, locking in one by one and
deepening, Stranger Things ritual, suited to brand-name reveals; C is breathing — the
letters unfold from a compressed pile with one inhale, the quietest variant, suited to
lyrical segments; D is semantic — characters flow in single-file along a rising curve
then straighten up, and the curve can trace a chart growth line, putting text and data
in the same frame narrating together.

## Four-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A split-text-stagger split rise | each character translateY(115%→0) inside an overflow box with 10% overshoot, delay i×2f, baseline growing in sync | General default; crisp and rational |
| B drift-assembly drift convergence | characters drift in from seed directions ±300px + blur 8px staggered into place, locking frame deepens with a pulse, whole word breathes 1.04 after assembly | Brand-name/opener-grade reveals |
| C tracking-expand letter-spacing breathing | letters expand from −0.42em compressed overlap to 0.14em, blur 10→0 on the same curve | Quiet lyrical segments; subtitles following along |
| D text-on-path flowing along a line | characters slide in single-file along a bezier curve (rotated to tangent angle), straightening to horizontal over 12f on arrival | When the curve has semantics (growth line/flow line) |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A overshoot | 10% (the original 6% was measurable but imperceptible; real rendering added more) | At normal speed the settle-back must be visible |
| B lock pulse | character color deepens to #000 + stroke 0→3px→0 / 8f | On white background, deepen + stroke instead of glow (case law) |
| B drift triple-binding | translation (1−p), blur 8(1−p), opacity 0.35→1 all share one p | Split curves leave characters "arrived but still blurry" |
| C implementation linchpin | letter-spacing stays at its final value; per-character spans only do translateX=(1−p)(i−word-center)(−0.56em) | Animating letter-spacing directly reflows every frame and jitters |
| D straighten | arrival pauses 8f then 12f lerp to horizontal baseline (y flattened, rotate→0) | Without straightening it's forever "hanging on the line" and never reads as a title |
| D curve | evolve (dashoffset) grows in sync with the leading character | Curve drawn before characters move reads as two separate animations |
| Ending | all settled, true stillness ≥30f | R1 |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- The title-entrance family now has eight variants (this card's four + type-entrance-moves'
  two + split-flap-title + document-typewriter-reveal); **≤2 types per film** (P4) stays ironclad
- B and D are both high-attention entrances — don't stack camera moves on top;
  the camera must stay still while characters fly
- C amplitude linchpin: the starting compression must be at least −0.4em-level
  (80px+ travel per gap) to be perceptible; −0.1em-level "micro-expand" is invisible
  at normal speed (perceptibility case law)
- D characters briefly overlap in the curve's low section — part of the single-file
  read; but at font size >80px the overlap area grows into a blob — use a longer curve
  or fewer characters for large type

## Reference Implementation
demos/typography/type-assembly-moves/
(LetterformDriftAssembly.tsx / SplitTextStagger.tsx / TextOnPath.tsx / TrackingExpandReveal.tsx)
