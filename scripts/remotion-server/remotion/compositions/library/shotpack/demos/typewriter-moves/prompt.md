---
name: typewriter-moves
summary: Typewriter, two variants — terminal-typewriter: the terminal command finishes typing and detonates a scene switch; error-retype: a "rephrase" three-act play of mistyping, deleting, and retyping
use: Developer-product openers (A), slogan/value-prop cards (B); text entrances that inherently carry temporality
duration: A ~5s / B ~5.5s
energy: A medium-high / B medium-low
tags: opening
---

## Intent
Typing is the only text entrance that inherently carries temporality — characters
arriving one by one IS the rhythm, no extra motion needed. A uses typing as a **fuse**:
a dark terminal window types out a command character by character, a block cursor
blinks in square waves, and on the return frame the camera slams in on the command
line, hard-cutting to the product UI — the command line is the scene's detonator, a
developer-product staple; B uses typing as **monologue**: typing out a mediocre word
("just a dashboard") → pause, hesitation → backspace-delete → typing the selling point
faster ("your command center") — a three-act play of hesitation-denial-declaration,
the drama living entirely in the three speed tiers. Difference from scramble-decode:
scramble decoding is the machine guessing; typing is a person speaking.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A terminal-typewriter | 2f/character typing the command, cursor square-wave blink at f%12<6; return frame slams the whole scene in 6f scale 1→3.2 (origin locked on the command line center) + last 2f blur 10px, hard-cut to dashboard settling 1.06→1 | Developer-tool openers; CLI value-prop products |
| B error-retype | type 2f/character → pause 16f with cursor blinking twice → backspace 1.5f/character → retype 1.5f/character without hesitation; cursor stays lit while typing/deleting, blinks only during pauses | "Rephrase" drama for slogan cards; negation-style copy |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Character rhythm | substring(0, floor((f-start)/step)), frame-deterministic with no interpolation | Any eased typing reads as a loading animation |
| A cursor | block, f%12<6 square wave | A fading cursor is a web page, not a terminal |
| A slam-in | f58–64 scale 1→3.2 Easing.in(cubic), origin pinned to the command-line text center | Amplitude below 3x reads as a jitter, not "plunging in" |
| A hard cut | f64 conditional mount swap (terminal subtree fully unmounted, blur lifted with it), settle back to steady in 4f | A crossfade destroys the fuse-explosion causality |
| B three speed tiers | type 2f/character, delete 1.5f, retype 1.5f with zero hesitation | The three tiers must be perceptible — same-speed rephrasing reads as a bug, not drama; the linchpin |
| B cursor three states | lit while typing/deleting = decisive; blinking twice over a 4f half-period pause = hesitant; after completion, blinks twice then conditionally removed | The cursor is the actor's face; blinking at uniform speed all the way leaves no "hesitation" |
| B layout | per-character fixed-width span (58px monospace), left-edge anchored | Variable-width fonts / whole-string measuring reflow and jitter every frame |
| Ending | A stillness ≥77f / B stillness ≥50f | Even a 0.05 opacity cursor remnant breaks true stillness |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- Sound-critical: keystrokes align per character, B's backspace lower in pitch
  (sound-design §4.5) — a silent typewriter is just a subtitle machine
- A's return slam hands off to crash-zoom: hard-cut at the slam's most violent last
  frame, and the new scene must not push again (one baton, one pass)
- B ≤1 per film — a rephrase is a one-off dramatic turn; rephrasing twice is stuttering
- Either a monospace font or per-character spans must be in place, otherwise every
  arriving character reflows the whole line and typing becomes convulsing

## Reference Implementation
demos/typography/typewriter-moves/
(TerminalTypewriter.tsx / TypewriterErrorRetype.tsx)
