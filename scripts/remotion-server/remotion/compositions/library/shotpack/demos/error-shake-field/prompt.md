---
name: error-shake-field
summary: After tapping submit on a login form, validation fails: the whole device shakes horizontally (~8 cycles, amplitude decaying to 0), the email input turns red with a red glow, an inline error message slides up, and after the error state lingers the whole device breathes
use: App promo showing form validation failure / input-error feedback; emphasizes feedback design where "failure also has a clear landing point"
duration: ~5.6s (168f @ 30fps, including ≥30f of stillness after settling)
energy: Medium-high (the shake is the only impact peak, then it quickly decays and settles)
tags: interaction
---

## Intent
Shoot "submit failed" as feedback with clear cause and effect: the finger taps the button → the whole screen shakes once (system-level denial) → the one field that errored turns red and glows (locating the specific error) → an inline message states what went wrong (giving an explanation). The three feedbacks escalate layer by layer: first global (shake), then local (red border), finally semantic (copy). The core is "the shake only alerts, the red border locates, the copy explains" — the three layers can't replace each other.

## Core Motion
- Phone f4 fade in + translateY 60→0 (16f ease-out); four form sections (title/email/password/button) stagger in from f16, 4f apart
- Finger f56–66 moves toward the button, f68–71 presses (scale 0.96), f74–80 fades out
- Whole-device shake (f70–108): translateX = sin((f−70)·0.85)·9·(1−t), ~8 cycles, amplitude decaying 9→0
- Error state (from f74, 14f ease-out): email field border→#d64545 + 3px red glow (alpha 0.22); inline error (warning dot + copy) translateY 8→0 + opacity 0→1 sliding in
- The password field and button stay normal; the error only lands on the failing field; after settling, a 1.6s (48f) whole-device micro-breathing holds until f168

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Shake | f70–108, sin cycle 0.6, amplitude decaying 14→0 | Too much amplitude reads as "broken", too little loses the "rejection" feel; it must decay |
| Shake frequency | ~4 cycles / 38f | Too low a frequency drags, too high reads as choppy |
| Red border | From f74, 14f, border #d64545 + glow alpha 0.22 | Border and glow appear on the same frame; border-then-glow delays the locating |
| Error copy | Same 14f ease-out, translateY 8→0 | The copy must appear after the red border (locate first, then explain) |
| Feedback layers | Global shake → local red → semantic copy | The three layers trigger in order; missing any one makes "clear failure" unreadable |

## Known Pitfalls
- The shake only applies to the whole device transform; never shake a single field — "whole-screen denial" and "field error" are two different signals
- The shake must decay to complete stillness, never loop (a loop reads as "continuously erroring")
- The red border and glow appear on the same frame, the error copy slides in after; scrambled order makes the cause-and-effect unreadable
- The finger tap must land at the button center, with press feedback (scale 0.96) making the tap feel real
- Screen content must be self-drawn vector mockups, no screenshot textures; email is fictional demo data (jane@acme.com)

## Reference Implementation
demos/mobile/error-shake-field/
(ErrorShakeField.tsx)
