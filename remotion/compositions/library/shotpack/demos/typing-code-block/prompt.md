---
name: typing-code-block
summary: The same syntax-highlighted code shows two reveals side by side — left side line-level stagger with 4f gaps, fading in and rising 8px; right side per-character typing keeping each character's original token color, with a #3a4468 block cursor behind the current character
use: Code/config reveal shots; developer-product "just three lines" demos; a selection-reference shot when comparing two reveal rhythms
duration: ~4.6s (138f@30fps)
energy: Medium (right side continuous typing advance, left side one-shot convergence)
---

## Intent
Code reveals have only two true solutions: **the whole line floats out** (you read the
structure) and **one character at a time** (you read the process). This card puts both
side by side on the same code as a comparison shot for selection: the left side finishes
4 lines in 4 beats, right for "the code isn't the point, the result is"; the right side
needs 138 frames to type 59 characters, right for "watch me write." The key detail is
that the right side **types without losing color** — the common mistake is white text
first, colored later, which degrades into terminal echo instead of a code editor.

## Core Motion
- Token model: each line is `[[text, color], …]` from a 6-color palette (keyword
  #c792ea, identifier #e8eaf0, function #82aaff, string #c3e88d, punctuation #89ddff,
  comment #546e7a)
- **Left line-level stagger**: `seg(t, 0.08+i·0.14, +0.3, E.outCubic)` — 0.14 between
  lines (≈19f), 0.3 single-line window (≈41f), `opacity = k`, `translateY = (1-k)·8`px
- **Right per-character**: `typed = floor(seg(t, 0.08, 0.9) · chars.length)` advancing
  linearly; each character span carries its token color at creation, and typing only
  flips opacity 0→1 — **coloring completes at setup, render never touches color**,
  so a character is correct the moment it appears
- Cursor is a background block, not a vertical bar: the `i === typed` character gets
  `background:#3a4468` with `opacity:1` forced — the next character to be typed is
  pre-occupied by a color block, and the block shifting right IS the cursor moving
- Both panels identical spec (45% width, 72% height, #10121a background + #1c2030
  border, radius 8); top 8px, letter-spacing 2px small labels `LINE FADE-IN` /
  `CHAR TYPING` marking the technique
- Right lines `min-height:1.9em` prop up empty lines — without it, untyped lines have
  height 0 and the panel content grows downward while typing (layout jump)

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Code volume | 4 lines / ~59 characters | Typing speed = character count / 113f; more than 6 lines and the panel must shrink the font; over 100 characters and the right side can't finish typing |
| Line stagger | 0.14 (≈19f), single-line window 0.3 (≈41f) | 19f is the "line by line" readability floor; <8f all four lines light together with no stagger, >28f the last line waits too long |
| Line translation | `(1-k)·8`px rising | 8px is the restraint a code block should have; >20px lines fly in like cards and steal from the code itself |
| Typing window | `seg(t, 0.08, 0.9)` (11f→124f) | The endpoint leaves 14f of stillness to read the full text; pushed to 1.0, it cuts the moment typing ends and nobody reads the last line |
| Cursor block | `#3a4468` background, only the current character | The block cursor is the editor register; swapping to a vertical bar needs an added blink and reads more fragmented inside a code block |
| Panel | 45%×72%, `#10121a` bg, `#1c2030` border, radius 8, 12px/1.9 line height | 1.9 line height is the code-readability floor; both sides must share the same spec — differing sizes read as two shots, not a comparison |
| Empty-line placeholder | right lines `min-height:1.9em` | Without it the panel grows taller while typing and the whole block jumps — the easiest-to-miss spot in this card |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- **Keep the total character count near 59 when swapping in project code**: the right
  side spreads 113f across all characters — doubling the code drops each character
  under 1 frame (blurs into whole-line sweep), halving it makes each character a beat
  that's slow like a stall — changing code volume requires tuning the typing window in
  sync, don't just swap the copy
- Coloring must be written into every span at setup: recoloring at render (white first,
  tint later) demotes "code editor" to "terminal echo" — the most common miss in this
  class of effect
- Left line-level fade and right per-character typing are **asynchronous** (left
  finishes 4 lines in ~68f, right types until 124f) — that's the comparison shot's
  purpose; if production keeps only one side, refill the other's time window across
  the whole film
- The token array is hand-written with no real lexer — swapping code means manually
  re-tokenizing; a wrong color is worse than no color (a keyword tinted as a string
  yanks code-literate viewers right out)
- Production usually **keeps only one side**: the comparison version is a selection
  shot; in the actual film, two panels moving together splits attention — after
  choosing, center one panel enlarged

## Reference Implementation
demos/typography/typing-code-block/
(TypingCodeBlock.tsx)
