---
name: pill-slot-cycle
summary: In-sentence slot cycling — the fixed sentence stem stays pinned rock-still, the trailing pill badge rolls one slot-machine tick every ~0.7s (the old one flies up with accelerating fade-out, the new one slides in from below with blur), and after cycling through N feature words the complete sentence settles as the closer
use: The most elegant solution for "feature list" copy (faster than line-by-line lists, more semantic than scramble decoding); one-line value props with multiple verb phrases
duration: entrance 12f + 21f per tick × word count + closer 14f + hold; 6 words ≈ 5.8s (demo 175f)
energy: Medium (steady metronome, no peaks)
---

## Intent
Listing six features takes six list rows, or six fade-in beats filling the screen.
Slot cycling packs them into **one slot in one sentence**: the stem "One AI tool to ___"
is the promise, each pill rolling through the slot is evidence, and when the final pill
flies away and "do it all." settles in — evidence enumerated, conclusion stamped.
The structure is inherently three acts: promise → enumerate → close. The linchpin is
that the sentence stem **never moves**: the viewer's eyes stay pinned on the slot, and
if the stem shifts, the enumeration feel dissolves.

## Core Motion
- Stem absolutely positioned, anchored at the left end — **flex centering is forbidden**:
  pill width changes would reflow the stem (a pitfall hit in round one, now case law)
- Each tick 21f (~0.7s): first 8f complete the swap, last 13f still — the stillness is
  for the viewer to read the word; a beat you can't finish reading is a swap that
  didn't happen
- Entrance: translateY 120→0 + blur 14→4→0, Easing.out(cubic);
  exit: translateY 0→-130 + blur 0→10, Easing.in(cubic) accelerating away
  — the new one decelerates in, the old one accelerates out; direction reads as
  "flipping up the page"
- An invisible placeholder pill (visibility hidden) props the slot width, with old and
  new pills absolutely stacked on top — slot width follows the current word naturally
  without jitter
- Closer beat: final pill flies up (7f ease-in), "do it all." rises from 90px below
  with Easing.back(1.4) overshooting into place — the film's only overshoot, reserved
  for the conclusion

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Beat length | 21f/word, 5–7 words | <16f the phrase can't be read; >28f the metronome feel dissolves; 8+ words the viewer starts counting |
| Swap window | first 8f of the beat | Stretched to 12f+ old and new share the screen too long, reading as two pills fighting |
| Flight distance | in +120 / out -130px | <80px reads as an in-place flash-swap; asymmetric in/out (out slightly farther) makes the exit more decisive |
| Motion blur | in 14→0 / out 0→10px blur | Removing blur makes the swap read as a hard pop; >20px mid-frames blur into color blocks |
| Closer overshoot | Easing.back(1.4), 14f | >2 the conclusion lands like a cartoon; no overshoot and the conclusion has no tier difference from the enumeration |
| Tail hold | complete sentence still ≥45f | This sentence is the whole point of the segment; not holding it means the enumeration was wasted |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- Division of labor with odometer-digit-roll / split-flap-title: those two are
  character/digit-level mechanical rolling (no semantics); this card is whole-word pill
  cycling embedded in a live sentence — use it only when the copy is "stem + verb
  phrase" structure; don't force it on pure numbers or pure title words
- Division of labor with typewriter-moves: the typewriter "builds a sentence one
  character at a time," this card "builds the sentence then swaps its parts" — they
  can coexist in one film but not back-to-back on the same sentence
- Division of labor with type-rhythm-sync: that one changes existing text's properties
  with the track (no content change), this card changes content — when bound to a track,
  just line up the ticks to the drum hits, don't stack a weight-pulse on top
- Pill phrase lengths should stay close (demo longest "Draft an agenda") — variance
  >2x makes the slot width jump violently and the sentence's center of gravity swings
- The closer sentence and the stem must share the exact same font size/weight (demo both
  96px/800) — a "do it all." bigger than the stem reads as a new title, not a completed
  sentence

## Reference Implementation
demos/typography/pill-slot-cycle/
(PillSlotCycle.tsx)
Source film: notion-ai 4.5–8.5s
