---
name: app-signup-flow
summary: The phone springs up from the bottom, a cursor types into the Email field character by character, password dots fill in, a success popup springs out after clicking Sign Up, then the Dashboard stat cards stagger in and the whole device breathes to settle
use: App promo showing a signup/login flow; emphasizes the complete "cursor operation + form feedback + result page" interaction arc
duration: ~6s (180f @ 30fps, including ≥30f of stillness after settling)
energy: Medium (segmented progression: entrance → typing → tap → popup → list, no single impact peak)
tags: interaction
---

## Intent
Shoot an app signup flow as a complete interaction narrative: the viewer sees the phone enter, a cursor fill in the form character by character, the press feedback of the button tap, a success popup, and then the result Dashboard's list staggering into view. The core is "actions have feedback" — every stage has a clear landing point and a bridge into the next stage, rather than everything appearing at once.

## Core Motion
- Single hero (phone + on-screen interaction) full action arc: f4 springs up from the bottom (translateY 150→0, scale 0.85→1, damping 14 mass 1.1), settles at f34
- Cursor moves along waypoints: Email field typing (f42–74, 12 characters appear one by one, with a blinking caret) → password dots fill in (f58–82) → button tap (f94, press scale 0.955 peaking 3f)
- Instant feedback on tap: button press 0→1→0 (3f up, 3f down), f100 success popup springs out (damping 14, stiffness 160) + semi-transparent overlay
- Result page transition: f128 form fades out, Dashboard slides up 26px and fades in; 2×2 stat cards stagger 3f each, activity rows stagger 4f each
- After settling, a whole-device 1.6s (48f) breathing cycle (scale 1.00→1.008→1.00), holding until f180

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Phone entrance | From f4 spring(damping 14, mass 1.1, dur 26), translateY 150→0 + scale 0.85→1 | Higher damping lands "heavier"; the overshoot must not bounce off-screen |
| Typing | Email 12 characters across 32f (f42–74) appearing one by one, caret blink cycle ≈10f | Typing too fast reads as "pasted", too slow drags; the caret only shows during the typing window |
| Tap feedback | Button press scale 0.955, 3f up, 3f down; cursor scales 0.65 at the tap point | Press amplitude ≤5%, larger looks like "hammering the button" |
| Success popup | spring(damping 14, stiffness 160), scale 0→1 + overlay 0.32 black fading in over 8f | Stiffness too high makes the popup overshoot past the overlay |
| Result page transition | From f128, 14f fade in + slide up 26px; cards staggered 3f each, rows staggered 4f each | Stagger >5f reads as "loading"; appearing together loses the "reveal layer by layer" |
| Breathing | After settling, every 48f (1.6s) scale 1.00→1.008→1.00 | Only whole-device breathing, no local loops |
| Cursor | 20px dot + white outline, 7f linear movement between waypoints, fades out after the tap | The cursor is the "operator's viewpoint" and always points at the current focus element |

## Known Pitfalls
- Screen content must be self-drawn vector mockups (grayscale fake UI), no screenshot textures — text blurs under perspective/scaling
- Typing must appear character by character (with a caret); passwords fill in as dots; don't make whole strings pop in instantly
- The button press must be on the same frame as the cursor tap; the press needs a rise and fall, not a constant press
- The success popup must cover the entire form (including the overlay) and only appear after the tap completes, never early
- The Dashboard/form switch uses a crossfade, not a hard cut
- UI uses fictional demo data (user@example.com etc.), not pointing at a real product

## Reference Implementation
demos/mobile/app-signup-flow/
(AppSignupFlow.tsx)
