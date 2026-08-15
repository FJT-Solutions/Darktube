---
name: odometer-digit-roll
summary: Odometer-style rolling number in giant type — each digit of a full-screen hero metric spins vertically like a slot-machine reel with motion trails, locking in place one by one left to right with an overshoot; the instant all digits lock, the whole number deepens in a pulse
use: Full-screen reveal of a single ace metric ("10x"-/"99.98%"-scale); division of labor with impact-feedback's B variant (damage-number pop) — that's an element-level side dish, this is a full-screen main course
duration: rolling + digit-by-digit lock ~63f + pulse 8f + hold ≥45f, ~5s
energy: Medium-high
tags: typography
---

## Intent
The library's hero-number entrances include the "slam" (score-slam) and the "pop" (damage-number), both translation-based. This card is the **mechanical** family: the number doesn't fly in, it's "computed" — each digit is a 0–9 reel spinning fast, then decelerating digit by digit left to right, overshooting half a cell, and clicking into a lock; the standard grammar of Vercel Ship / Stripe Sessions metric segments. The rolling itself carries suspense (what will it stop on?), and the digit-by-digit locking carries rhythm (tick, tick, tick, tick), adding a full beat of anticipation over just displaying the final value. Difference from VerticalTicker (a backlog candidate): it has a final value and locks per digit, not an endless rolling wall.

## Core Motion
- Each digit gets an overflow:hidden digit box + a 0–9×2 vertical strip, `translateY = −(pos % 10) × row height`, with posAt(f, i) as a pure frame function
- Digit i starts at 20+i×7f, decelerating over 16f with Easing.out(cubic) to target +0.5 rows — **overshooting half a cell** — then bouncing back over 6f to lock on the integer; the lock frame is each digit's "tick"
- While rolling, each digit layers 2 frame-offset trail copies (translateY ±row-height×0.5, opacity 0.25/0.12), gated by inter-frame speed and auto-removed once settled — vertical smearing by the same logic as smear-multiples (countable copies, not blur)
- On the all-locked frame: the whole number pulses darker ink→#000→ink over 8f + a 1.035 micro-scale + the label bar below fades in — the full stop of "total confirmed"
- Non-digit characters like the decimal point and % stay in place the whole time and never roll

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Font size/face | 190px fw800 + fontVariantNumeric: tabular-nums | With non-monospaced digits, the whole line jitters on every cell it rolls (same monospace precedent as scramble) |
| Stagger | 20+i×7f start-stop, left to right | Stopping right to left reads as counting backwards; stopping all at once loses the "tick-tick-tick" |
| Overshoot | +0.5 rows, then 6f bounce back | No overshoot reads as sliding to a stop and halves the mechanical feel |
| Trails | 2 copies at 0.25/0.12, speed-gated | 3+ copies smear into a single streak at high speed (scenes where the row height is smaller than the card) |
| Final-value pulse | Darkening + 1.035 scale over 8f | Darkening alone is imperceptible on 190px black type (real renders need the extra scale) |
| Ending | True stillness ≥45f after the pulse settles to zero | R1 |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- Keep digits ≤6 (including both sides of the decimal point) — each extra digit adds 7f of stagger, and 8 digits finishing the roll takes >2.5s that viewers won't wait for; big numbers become abbreviations (12.4M, not 12,400,000)
- Can coexist with impact-feedback's B (damage numbers) in one film, but the division must be clear: the full-screen main course once (this card), in-card side dishes many times (B) — full-screen at both spots is two main courses
- The rolling digits must be the **actual digits of the true value** — for a final value of 99.98 the reels roll 9/9/9/8; random mid-way numbers get caught by pause-frame viewers as "fake rolling"
- Sound depends strongly on the candidate slot: "tick" ×N for the digit-by-digit locks + one low bass for the final confirmation (sound-design §4.5); a silent version works but loses half the satisfaction

## Reference Implementation
demos/data/odometer-digit-roll/
(OdometerDigitRoll.tsx)
