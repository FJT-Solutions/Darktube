---
name: crash-zoom-punch
summary: One-beat crash zoom from a wide shot to a target close-up (6f), with two landing options — overshoot bounce-back (springy) or hard-stop screen shake (weighty)
use: "Call-out" shots for feature segments — one beat slams the viewer's eye onto a target card/module; use the hard-stop for extra emphasis
duration: ~0.5s of motion + holds before/after (motion 6–11f, pre-hold ≥30f to establish the wide shot, post-hold ≥45f to read the close-up)
energy: High (instant impact, not sustained high energy)
tags: effects
---

## Intent
A slow push-in (spotlight-hero-card) says "look at this"; a crash zoom says "LOOK AT THIS!" — within a single beat it slams from a wide shot to a close-up, leaving the eye no choice. The landing feel comes in two variants: bounce-back is springy ("look at this"), hard-stop shake is weighty ("this is the one") — pick by emphasis level.

## Core Motion
- zoom 6f ease-in fast acceleration (e.g. 1→2.6); cx/cy converge to the target center with a matching ease-in
- Bounce-back variant: after overshooting, zoom settles back 3–6% over 5f (2.6→2.45)
- Hard-stop variant: from the landing frame the camera jitters at high frequency with exponential decay (amp 14px, τ≈1.8f, drying up in 6f) — no bounce-back
- Wrap `<CameraMotionBlur shutterAngle={200} samples={20}>` **around the crash zoom segment only** (the hard-stop shake segment stays as crisp jitter); sample count is tuned so "echo spacing ≤ glyph height" (round A adjudication)

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Crash duration | 6f (4–8f) | >10f reads as an ordinary push-in; the impact disappears |
| Target zoom | 2.4–2.8 | frame the end state so the target card fills 60–75% of the frame |
| Bounce-back amount | 3–6% of zoom | too large reads as a spring toy |
| Shake envelope | 14px·e^(−t/1.8) | amplitude must clear the naked-eye threshold (perceptibility adjudication); >20px reads as a glitch |

## Known Pitfalls
- The end target must be a high-res texture slot (card4-hires level) — after the crash zoom the rest of the shot stays focused on it, and low-res screenshots blur the text (Q2); treat the target with Q2's high-resolution rasterization technique first
- Don't mix the two variants: shake after a bounce-back breaks the illusion; use ≤2 crash zooms per video (per P4's technique-dedup spirit)
- Parameters were tuned and signed off on placeholder assets, not finalized for production — re-verify after the first real use

## Reference Implementation
demos/camera/crash-zoom-punch/
(CrashImpactReal.tsx / CrashZoomReal.tsx)
