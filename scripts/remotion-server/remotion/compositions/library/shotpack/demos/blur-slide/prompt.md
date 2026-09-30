---
name: blur-slide
summary: Title words enter one by one — y 40→0 + blur 10→0 + opacity 0→1, all three channels converging on the same outCubic easing with word gaps of ~3.5f; the subtitle follows with a stagger before the title finishes settling
use: Almost any title/subtitle pairing; product-page hero copy, chapter subheadings; the default text reveal that reads "professional but not showy"
duration: ~3.8s (114f@30fps)
energy: Low (one-shot settle, no peaks, no loops)
---

## Intent
This is the **default solution** for text reveals — no spectacle, no machinery, just words
softly settling into place one at a time. Its professionalism comes from a single thing:
the y, blur, and opacity channels all share the same progress `p` and the same easing,
so words "emerge from soft focus" rather than "slide in with a fade tacked on."
When a film already carries heavier moves (scramble/flip/roll), the title should use
this card and give the floor to the main act.

## Core Motion
- Per-word progress `p = seg(t0, i·gap, i·gap+0.32, E.outCubic)`, all three channels bound to the same p:
  `opacity = p`, `translateY = lerp(p, dy, 0)`, `blur = (1-p)·10`px
- Title window `seg(t, 0.06, 0.62)` internally remapped (~7f→71f, span 64f):
  word `gap = 0.055` (≈3.5f), per-word entrance window `0.32` (≈20f), `dy = 40`px
- Subtitle window `seg(t, 0.34, 0.9)` (~39f→103f): `gap = 0.04` (≈2.5f),
  `dy = 26`px — tighter gaps, smaller movement; **hierarchy comes from amplitude, not duration**
- Stagger rather than queue: the subtitle starts at 39f, the title doesn't finish until 71f,
  a 32f overlap — a queue reads as two beats, an overlap reads as one sentence
- Split words, not letters: `text.split(' ')` then one span per word; the `line` uses `gap:0.32em`
  to space words (not spaces) — per-character entrance is too fragmented, word-level
  keeps the feel of "spoken aloud"
- Font size contrast 34px/800 vs 14px/400, colors #eef1fa vs #7d86a3

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Word stagger | main 0.055 (≈3.5f) / subtitle 0.04 (≈2.5f) | 3–4f is the "word by word" sweet spot; <2f the whole line lands together with no stagger, >8f the viewer starts counting words |
| Word entrance window | 0.32 (≈20f), `E.outCubic` | <10f reads as a hard pop; >30f every word floats in slowly and the sentence drags |
| y offset | main 40px / subtitle 26px | Unequal main/subtitle amplitude is the source of hierarchy; <20px the move is imperceptible, >60px words fly in from off-frame and it becomes a slide-in |
| blur channel | `(1-p)·10`px | This channel is the "professionalism" — removing it degrades to a plain fade-up; >18px mid-frames blur into color blocks |
| Main/subtitle stagger | main 0.06–0.62 / subtitle 0.34–0.90 | A 32f overlap reads as "one sentence"; pushing the subtitle start past 0.62 makes it read as two beats |
| Font size and weight | 34px/800 vs 14px/400 | A 2x+ difference is needed for a main/sub relationship; subtitle at 600+ weight fights the main title |
| End hold | subtitle finishes at 103f, ~11f of stillness at the tail | Stillness <8f and the viewer hasn't finished reading before the cut; this is the only static frame in the whole film |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- **Placeholder copy is 4 words main / 5 words subtitle — keep word counts close when
  swapping in project copy**: total stagger = `gap × word count`; if the word count
  doubles, the last word's start shifts back by twice the amount, and its entrance gets
  pushed to the window edge or even collides with the end hold — past 8 words, drop
  the gap to 0.035 in sync
- All three channels must share the same `p`: writing three separate easings (even with
  identical curves) produces "translated but still blurry" desync and the softness collapses
- Word-level splitting needs manual handling for Chinese copy: `split(' ')` yields one
  block on Chinese text — segment it into 3–5 spans by meaning, don't degrade to per-character
- Layout uses a `flex` centered column + `gap:16px`; main/sub line-height changes will
  reflow the whole block — fine for this card (one-shot entrance), but don't add
  width-changing elements to this structure
- This is a **low-energy default card**: it serves a different function than the scramble/
  flip/roll cards in this family — within one film it can and should coexist
  (main act uses the heavy move, every other title uses this card)

## Reference Implementation
demos/typography/blur-slide/
(BlurSlide.tsx)
