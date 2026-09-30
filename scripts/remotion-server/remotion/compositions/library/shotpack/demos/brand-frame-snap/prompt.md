---
name: brand-frame-snap
summary: Brand-color picture-frame grammar — a thick solid-color frame grows around the full screen before the content, and a recording window drops inside; on mode switch the whole frame hard-flips color on the same frame and the in-window layout swaps on the same frame — one borderColor handles chapter navigation, status cue, and brand exposure
use: Full-film packaging layer for two-mode/two-chapter product films (blue=mode A, green=mode B color coding); brand-wrapping of real screen recordings
duration: Single flip ~4.3s (130f); the frame itself can persist for the whole film
energy: Medium (high at the flip instant; otherwise a quiet packaging layer)
tags: transition
---

## Intent
A real screen recording played full-screen has no brand presence, and a logo watermark feels cheap. This card "frames" the recording with a thick brand-color frame: the frame appears **before the content** (frame first, then the painting — ritual), after which the frame color becomes the film's semantic coding — blue=Design, green=Dev Mode. On chapter switch the whole frame hard-flips color within a single frame, no gradient; the hard color cut is the visual equivalent of a gear-shift sound; the in-window layout switches A→B on the same frame and the corner tag/badge text swaps in sync — three same-frame resonances slam "mode switch" home. Division of labor with theme-switch-moves: that one changes the UI's own skin (has a sweeping boundary); this one changes the "frame" packaging layer (same-frame, boundaryless), with the semantics of mode/chapter switching, not theme switching.

## Core Motion
- The frame uses 4 solid color strips (not the border property), thickness 0→44px growing over 18f ease-out; flip = changing background on the same frame, deterministic
- Recording window spring(damping 16) drops from 560px below + scale 0.82→1 into the frame (from frame 14, mid-growth of the frame — if the window arrives before the frame forms, it reads as the frame chasing the window)
- Flip frame does three things on the same frame: frame color swap + in-window layout hard cut A→B + corner tag/window badge text swap (DESIGN→DEV MODE)
- On the flip instant, stack a 2-frame white-flash pulse (opacity 0.55 start, stepped decay) + frame thickness damped bounce (exp(-0.22t)·cos(0.9t)·10px), giving the "gear shift" impact

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Frame thickness | 44px (1080p) | Too thin reads as an outline, not "framing"; >60px starts eating the content area |
| Frame growth | 18f ease-out, 14f ahead of the window | The frame must come first — content arriving before the frame wraps it reads as remediation |
| Window landing | spring(damping 16, stiffness 110), y 560→0 + scale 0.82→1 | Landing "inside the frame" is the semantic key; the landing point must sit fully inside the strip |
| Flip moment | demo 78f; wait a beat (≥30f after the window settles) before flipping | If you flip before the landing settles, the viewer hasn't built the "blue=current mode" coding |
| White flash pulse | 2–3f, 0.55→0.19 stepped | Helps the eye register "this frame changed"; >4f steals cel-flash's job |
| Thickness bounce | exp decay cos, initial amplitude 10px | A pure hard cut is a bit dry; the bounce is the mechanical feedback of a "gear clicking in" |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production final; first real use must re-verify with real footage
- The flip must be truly same-frame: even a 2f offset between frame, in-window layout, and corner text splits the "gear shift" into three small animations
- Color coding must be honored across the whole film: no green main-UI elements inside a blue-framed segment — once the coding is diluted, flipping is just recoloring
- The frame is a packaging layer, not the lead: flip ≤2 times per film; flipping too often reads as a neon sign (P4 restraint)
- The two modes' brand colors need enough contrast (demo blue #3E7BFA / green #1BC47D); adjacent hues at similar luminance make flipping as good as not flipping
- Sound: pin one crisp mechanical click/gear-shift sound on the flip frame, white flash and sound on the same frame; the frame-growth segment can be silent

## Reference Implementation
demos/effects/brand-frame-snap/
(BrandFrameSnap.tsx)
Source footage: figma-devmode 0:28–0:32 + 0:43–0:47
