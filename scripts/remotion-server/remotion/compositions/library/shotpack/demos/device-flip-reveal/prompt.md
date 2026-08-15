---
name: device-flip-reveal
summary: The phone body flips from its back side in 2.5D toward the camera; at the moment the front settles, the screen lights up and the app's main UI layers reveal in a stagger, then the whole device breathes to settle
use: App promo opening / transition into the app itself; emphasizes a double reveal of "hardware body + screen content"
duration: ~4s (120f, including ≥30f of stillness after settling)
energy: Low → the flip accelerates into medium-high → lighting-up peak → low breathing after settling
tags: hardware
---

## Intent
Shoot the phone hardware body as the single hero: the viewer first sees the phone's "back", realizes through the 2.5D flip that this is a device, the screen lights up on the same frame the front settles, the app UI reveals with elements staggered, and finally the whole device breathes to settle — hardware and content unveiled at once.

## Core Motion
- Single hero full action arc: the phone flips from the back side (rotateY≈−110°, entering back-first) to the front; f4–60 easeOutCubic turning upright, f60–66 overshoot band (peak +3°), f66 settles at 0°; the flip settle and the screen lighting up trigger on the same frame — an offset reads as "lands first, then boots"
- Screen-off → lighting up: main UI → feed cards → bottom tab bar reveal in a stagger, no per-element glowing
- After lighting up, the whole device holds ≥30f; once all elements settle (from f90), a 1.6s breathing cycle (scale 1.00→1.015→1.00)
- 2.5D perspective uses CSS perspective + transform (rotateY/rotateX), no three.js; screen content is vector mockups (avoids blurred textures under the Q2 perspective)

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Device body | Screen 390×844 CSS px logical coordinates, ratio ≈9:19.5, corner radius 46px | The aspect ratio determines the "slab" feel when flipping; don't use a square body |
| Flip | Entrance f0–4 back side at −110° still → f4–60 easeOutCubic turning upright → f60–66 overshoot ≤3° → f66 settles at 0° | The overshoot band is where the "settle" feel comes from (pure keyframes, no spring); peak ≤3°, don't overshoot back to the rear |
| Lighting up | Triggers on the same frame as the front settle (f66); screen opacity 0→1 (6f) + inner glow (8f) | Lighting up must land exactly on frame f66; early or late reads as "boots before the reveal" |
| Reveal | Header f68–72 → feed cards staggered 3f each (f72–84) → tab bar 4 items staggered 2f each (f78–88), all settled before f88 | Elements ordered by visual hierarchy, no per-icon glowing; 2–3f stagger per layer; dragging it out reads as "loading" |
| Breathing | After settling (from f90), every 48f (1.6s) cycle scale 1.00→1.015→1.00 | Only whole-device breathing, no local loops (R1) |
| Camera | Front view 1920×1080, body centered slightly low, f36–62 slight push-in zoom 1.0→1.04 (ends before settling) | The slight push-in strengthens the "reveal"; don't move the camera throughout and steal focus from the hero |

## Sound
A soft `whoosh` at the start of the flip; an `impact` (light version) at the lighting-up peak; a light `sparkle` fade after the UI reveal completes. Pin frames once the shot locks.

## Known Pitfalls
- Screen text must stay sharp under 2.5D perspective: self-drawn vector mockups, never texture-map screenshots onto the screen
- The flip is a single complete arc, no back-and-forth jitter
- Lighting up must be on the same frame as the front settle
- UI uses fictional demo data (greeting / feed card copy not pointing at a real product)

## Reference Implementation
demos/mobile/device-flip-reveal/
(DeviceFlipReveal.tsx)
