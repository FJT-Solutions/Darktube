---
name: speed-ramp-freeze
summary: Two rhythm techniques built on nonlinear frame-number remap — speed-ramp (fast → 0.2x gaze → fast) and freeze-annotate (flowing → freeze with circle annotation → thaw)
use: In a card flow / long horizontal pan, "slowing down / stopping" one focal point to show the viewer; freeze-annotate for teaching/explanation contexts
duration: Speed-ramp total 4–5s (slow window ≥40f); freeze-annotate total 4–5s (freeze segment ≥45f)
energy: Medium-high (the speed contrast itself is the energy beat)
---

## Intent
A constant-speed flow reads as a PPT (R2), a fully fast flow loses the focal point (R3). Speed-ramp makes "sprint-gaze-sprint" within a single motion; freeze-annotate goes further — stop completely, circle the focal point with a marker, then move on. Both share the same technical root (frame remap), with different semantics: speed-ramp is "take one more look as you pass by", freeze is "stop class to highlight the key point".

## Core Motion
- The source animation is constant speed; output frames remap nonlinearly against source frames: `src = interpolate(frame, [0,40,85,135], [0,88,97,207])` (the slope is the rate)
- Speed-ramp variant: fast segment slope ≥2, slow window slope ≈0.2 (only perceptible with ≥10x contrast); **blur linked to the rate toggle** — fast segment wrapped in CameraMotionBlur, slow window rendered bare, the "fast-blur / slow-sharp" contrast is half of what makes the technique work
- Freeze-annotate variant: freeze segment slope =0 (instantaneous switch, no ease-in — a freeze must be abrupt); during the freeze an accent-color marker SVG ellipse draws in 8f (stroke-dashoffset) circling the target + an arrow 6f to point it out, feTurbulence (scale≈7) giving a hand-drawn jitter; the thaw segment slope >1 compensating the duration, the annotation fades out over 8f
- The target card uses a high-res texture and is aligned to screen center (the gaze/annotation subject must be sharp and centered)

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Slow window/freeze duration | ≥40f / ≥45f | Too short and the gaze doesn't hold (R3: rather slow than fast) |
| Fast/slow slope contrast | ≥10x | Insufficient contrast and "it slowed down" isn't readable |
| Annotation stroke | 8f to draw + jitter scale 7 | Too slow reads as a loading animation; no jitter reads as mechanical annotation |

## Known Pitfalls
- The speed-ramp segment's SFX pin frames follow the **output frames**, not the source frames (picture action happens on the output timeline); sound-effects slot: the freeze-annotate variant gets a marker scratch sound (S4); this card wasn't scored on promotion — add it in production
- Freeze-annotate ≤2 per 30s film (same restraint principle as the D-variant)
- Parameters tuned on placeholder footage and promoted, not a production-final spec — re-validate after first real usage

## Reference Implementation
demos/rhythm/speed-ramp-freeze/
(FreezeAnnotateReal.tsx / SpeedRampReal.tsx)
