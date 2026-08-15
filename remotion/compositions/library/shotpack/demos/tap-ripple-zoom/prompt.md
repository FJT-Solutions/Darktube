---
name: tap-ripple-zoom
summary: In a phone chat UI, a touch point taps an AI bubble, a two-ring water ripple spreads, the bubble scales down under the press, and the whole device focus-zooms into the bubble (spring damping 15 / stiffness 80 / mass 1, scale 1→2.75); after settling, the whole device breathes
use: App promo showing the "tap → focus" interaction feedback; emphasizes haptic feedback and focus guidance
duration: ~5s (150f @ 30fps, including ≥30f of stillness after settling)
energy: Medium-low (a small peak at the tap moment, then the zoom settles slowly)
tags: interaction
---

## Intent
Shoot "tapping the AI bubble gets a response" as a haptic-feedback shot: the touch point presses, the ripple spreads, and the whole device zoom-focuses onto the bubble. The core is the tap's instant feedback — the ripple and press trigger on the same frame, and the zoom settles slowly with a spring, so the viewer first reads the physical feedback of "pressing down", then follows the camera into focus on the tapped content.

## Core Motion
- Single hero (phone chat UI) full action arc: f4 phone fades in + moves up 60px to settle; 2 history messages in the message area (a user line + an AI line) sit still, and the target AI bubble sits at the bottom, becoming the visual focus after the zoom
- Touch point: f30–44 a small white dot (24px, cyan 3px outer ring) moves from below the message area (200,290) toward the AI bubble, f44 lands at the bubble center (163,220) into press standby, f52 taps, then f62–68 fades out
- Tap feedback (same frame as f52): bubble scales down under press (press 0→1→0 across 8f, scale 1→0.96→1, the bubble gains a cyan outline while pressed); two ripple rings spread simultaneously — inner ring r 0→70px/22f, outer ring r 0→90px/30f, opacity 0.7/0.5→0, both 2px cyan (rgba(45,212,191,…)) outlines
- Whole-device focus zoom: after the tap a spring (damping 15 / mass 1 / stiffness 80) starts, scale 1→2.75 + translateY 0→+189 (drifting down, bringing the target bubble near the top of the screen into focus), settling in ~68f
- After settling, a whole-device 1.6s (48f) breathing cycle (scale 1.00→1.008→1.00), holding until f150

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Phone entrance | f4 fade in + translateY 60→0 (16f, ease-out) | Moving up too much reads as "bouncy", too little gives no entrance feel |
| Touch point move-in | f30–44 from (200,290) to the bubble center (163,220), 6f fade in | Moving too fast makes the "pointing" unreadable; the landing must align with the bubble |
| Tap timing | f52; press 0→1→0 across 8f (0–3 press down, 5–8 spring back) | The press and the ripple must be on the same frame, otherwise the "tap feel" breaks |
| Ripple | Two rings: r 0→70px/22f + r 0→90px/30f, opacity 0.7/0.5→0 | Spreading too fast reads as a "flash"; the outer ring slightly slower builds layers |
| Zoom | spring damping 15 / stiffness 80 / mass 1, scale 1→2.75 + translateY 0→+189 (≈68f) | Must be a spring; linear looks mechanical; the drift direction depends on the bubble's position in the screen — if the bubble is toward the top, drift down to bring it into focus |
| Breathing | After settling, every 48f (1.6s) scale 1.00→1.008→1.00 | Only whole-device breathing, no local loops |
| Palette | Dark theme: #0a0a15 background, #1c1c28 bubbles, #00d9ff primary, ripple teal rgba(45,212,191,…) | The touch point and ripple use teal to stand apart from the chat primary, strengthening the focus feel |

## Known Pitfalls
- The ripple must trigger on the same frame as the tap, never delayed until after the press — broken feedback makes the "tap" lose its realness
- The zoom must use a spring (never linear): a linear pull-in looks mechanical; the spring's overshoot is what sells "physical focus"
- Screen content must be self-drawn vector mockups, no screenshot textures — bitmaps blur after zooming to 2.75x
- The touch point must land inside the target bubble, and the zoom's translateY offset must keep the focus on the bubble, not the input bar
- The input bar is a pure placeholder (no input content drawn), so it doesn't block the focus after the zoom
- The bubble's press-down scaling must stay restrained (4%); the ripple is the lead, the press is the supporting act

## Reference Implementation
demos/mobile/tap-ripple-zoom/
(TapRippleZoom.tsx)
