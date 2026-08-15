---
name: app-icon-launch-expand
summary: A desktop app icon is tapped by a finger, springs to scale up from its own center to fill the screen, and becomes the app's main screen (the home screen shrinks and dims in sync, app content reveals in a stagger); once settled, the whole device breathes
use: App promo intro / transition into the app itself; emphasizes the "desktop icon → app UI" reveal as one continuous moment
duration: ~6.4s (192f @ 30fps, including ≥30f of stillness after settling)
energy: Medium (the spring expansion at the tap is the only peak, then app content settles in a stagger)
tags: transition
---

## Intent
Shoot "opening the app" as a single shot: the viewer first sees the phone home screen (widgets + icon grid), a finger taps an icon, and the icon scales up from its own center to fill the screen and becomes the app's main screen. The core is "one element transforming" — not a screen cut, but the icon body itself being re-formed into the UI, so "opened from where, opened into what" is instantly clear. The expansion uses a spring for a real launch feel, and the app content fades in with a stagger right as the icon is about to fill the screen, stitching into a continuous "icon → UI" whole.

## Core Motion
- Single hero (phone home screen) full action arc: f4 phone fade in (opacity 0→1) + settle with a slight rise (translateY 60→0, 16f ease-out)
- Home screen layer staggers in: from f16 the widget arrives first, then the icon grid reveals one every 2f (blur replaced by translateY 8→0 + opacity)
- Finger: f52–62 moves from the lower right toward the target icon (ease-out), f64–68 presses (scale 0.7), disappears within 6f after the tap
- Expansion (from f66, spring damping 17 / stiffness 95): target icon scale 1→8.2, transform-origin at its own center; the home screen layer on the same frame goes opacity→0.0 + scale→0.94 (10f linear)
- App main screen staggers in from f96 (each item 5f apart): header → large image card → three-line item cards (opacity + translateY 12→0, 16f ease-out)
- The icon body fades out at f112–128, giving way to the already-revealed app content; after settling, a 1.6s (48f) whole-device micro-breathing holds until f192

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Phone entrance | f4 fade in 0→1 + translateY 60→0 (16f, ease-out) | Too much displacement reads as "bouncy", too little gives no landing point |
| Home screen stagger | From f16, widget first, icons 2f apart (14f ease-out) | Wider stagger gaps read as "queuing", too dense reads as "all at once" |
| Finger | f52–62 moves in, f64–68 presses, f72 disappears | The finger must point at the icon center, otherwise the tap has no direction |
| Icon expansion | From f66 spring (damping 17 / stiffness 95), scale 1→8.2 | Linear only loses the feel; the scale end point must cover the whole screen (≥8) |
| Home screen exit | Within 10f of the tap, opacity→0 + scale→0.94 | The home screen must start exiting on the same frame; it can't wait for the icon to finish expanding |
| App reveal | From f96 each item staggered 5f (16f ease-out) | Reveal start ≈ icon fills 70% of the screen; too early reads as "two screens at once" |
| Breathing | After settling, every 48f scale 1.00→1.008→1.00 | Only whole-device breathing, no local loops |

## Known Pitfalls
- The expansion origin must be the icon's own center (transform-origin: center), not the screen center — otherwise the icon appears to "drift" and expand elsewhere
- The home screen exit and icon expansion must start on the same frame, otherwise you get the double-image of "icon growing while the home screen is still there"
- App content should reveal only after the icon covers most of the screen; revealing too early shows two layers of content stacked
- The finger path must land on the icon center with press feedback at the tap moment (scale 0.7), otherwise it reads as autoplay rather than "tapped open"
- Text under the icon must fade out right after the tap (10f), otherwise it gets smeared along as the icon scales up
- Screen content must be self-drawn vector mockups, no screenshot textures; the app uses a fictional project name (Campaign 02), not pointing at a real product

## Reference Implementation
demos/mobile/app-icon-launch-expand/
(AppIconLaunchExpand.tsx)
