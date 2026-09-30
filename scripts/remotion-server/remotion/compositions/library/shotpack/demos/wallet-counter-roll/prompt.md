---
name: wallet-counter-roll
summary: The balance in a phone wallet rolls through a 4-digit odometer at high speed, then each digit decelerates in turn with an overshoot and locks onto 8,492; the transaction list below staggers in, and finally the whole device breathes to settle
use: App promo showing wallet/finance data; emphasizes the mechanical feel of digits rolling
duration: ~6s (180f @ 30fps, including ≥30f of stillness after settling)
energy: Medium (high speed during the roll → each digit locks in turn)
tags: data
---

## Intent
Shoot a balance update with the mechanical feel of an odometer roll: the four digits roll at high speed creating the momentum of "data changing fast", then decelerate digit by digit, overshoot half a stop, and spring back to lock onto the target balance 8,492 — the digits coming to rest itself carries a sense of "done deal". The transaction list below staggers in to account for where the money went, letting the viewer read "the balance changed + where the money came from". The core is the readability of the digit roll and the certainty of the stop: every frame is pure frame-function math, no randomness.

## Core Motion
- Single hero (phone wallet UI) full action arc: f4 phone fades in + moves up 60px to settle (16f ease-out)
- The wallet card is on stage from the first frame; the odometer roll starts at f14: 4 digits roll at 0.85 rows/frame
- Digit-by-digit deceleration: digit i starts at s = SPIN+i*7 (f14/21/28/35), decelerates for 16f (out cubic) then 6f of overshoot rebound, locking at s+22 (f36/43/50/57), the digits freeze at [8,4,9,2] (balance 8,492); SETTLE at f84 closes out to guarantee all digits lock
- Transaction list staggers in row by row from f74 (6f per row, 12f fade in + 12px rise)
- After settling, a whole-device 1.6s (48f) breathing cycle (scale 1.00→1.008→1.00), holding until f180

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Phone entrance | f4 fade in + translateY 60→0 (16f, ease-out) | Moving up too much reads as "bouncy", too little gives no entrance feel |
| High-speed roll | From f14, all 4 digits at 0.85 rows/frame | Below 0.7 rows/frame reads as "slowly flipping", losing the mechanical feel |
| Digit-by-digit deceleration | Digit i starts at f14+i*7, 16f deceleration (out cubic) + 6f overshoot rebound | The 7f stagger makes the lock read like dominoes settling in sequence; too-short deceleration frames read as a "hard cut" |
| Locked digits | [8,4,9,2] (balance 8,492), all digits locked by ≤ f57, SETTLE closes at f84 | To change the balance, only edit the DIGITS array; the T values recompute automatically from the formula |
| List reveal | From f74, 6f per row, 12f fade in + translateY 12px | Gaps <4f blur together, >10f drags |
| Breathing | After settling, every 48f (1.6s) scale 1.00→1.008→1.00 | Only whole-device breathing, no local loops |
| Palette | #f4f4f2 background, #26262b wallet card + white digits, transaction green #0f7e5a / black #18181b, stage beige-gray #e8e6e1 | The digit card and stage background differ in lightness so digits stay readable while rolling |

## Known Pitfalls
- The $ symbol and `.00` stay static on stage; they must not participate in the roll
- The digit strip must contain a full 0–9 column, and the translateY must be modulo-10 (`-(posAt % 10) * ROW`), otherwise once the locked position passes row 9 the whole strip slides out of the visible frame and the digits disappear
- The deceleration frames must be fully deterministic (pure frame function posAt, no Math.random/Date.now)
- Every digit must be locked before SETTLE; no digit may be left unsettled
- List amounts use fictional demo data, not pointing at a real product

## Reference Implementation
demos/mobile/wallet-counter-roll/
(WalletCounterRoll.tsx)
