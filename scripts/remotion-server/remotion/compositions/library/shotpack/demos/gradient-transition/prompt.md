---
name: gradient-transition
summary: Background smoothly transitions among the three CSS gradient types linear, radial, and conic — angle, color stops, center, and radius each interpolate parameter-by-parameter, with short cross-fades between segments when switching types
use: Continuous variations of an ambience/section background color; giving static typography sections a "living" background layer
duration: ~6.0s (180f@30fps; linear 0–2.4s · radial 2–4.2s · conic 4–6s)
energy: Low (pure background motion, yielding to the foreground content)
---

## Intent
A gradient is not a static texture but an animatable parameter set: any parameter inside the same gradient type can interpolate into a silky-smooth change, while cross-type switches are joined by a short cross-fade. Used as a background layer, it gives a section with "no subject motion" one continuous low-speed energy.

## Core Motion
- The three layers each hold one gradient type; only one layer dominates at a time, with a very narrow cross-fade window (0.08)
- Linear segment (t=0–0.4): angle 40°→230°, the two stop sets interpolate across the three channels of HSL space (`mixH` lerps h/s/l separately) — less graying than RGB interpolation
- Radial segment (t=0.33–0.7): center migrates diagonally (28%,66%)→(72%,32%) + radius expands 45%→85%, the dark outer ring near-black, the light spot reading like it's wandering inside the frame
- Conic segment (t=0.66–1): seven-segment rainbow ring, `from` angle 0→300° rotating, first and last the same color (hsl 0 appears twice) for a seamless loop
- A center glass pill label shows the current type in real time (LINEAR/RADIAL/CONIC); demo-only — delete it in production

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Segment window overlap | Adjacent segment starts 0.07 before the previous ends | Overlap guarantees both layers are moving during the fade; without it you see "a moment of stillness at takeover" |
| Cross-fade | 0.30–0.38 / 0.63–0.71, 0.08 each | Widening it shows two gradient structures fighting on one screen; narrow fade + parameters moving together is the key to "changing type without changing breath" |
| HSL interpolation | h/s/l three channels independently lerped | A hue gap >180° takes the long way around (e.g. 340→160); for a short path, add +360 to the start |
| Radial migration | Center moves diagonally + radius roughly doubles | Center still while only the radius grows reads as "breathing", not "wandering" |
| Conic rotation | from 0→300° (less than a full turn) | A full 360° ends on the same frame as the start; use it for looping. For one-shot playback, keep a 60° gap to avoid the "back to origin" feel |
| Stop sets | Two HSL start/end pairs per segment | When swapping in project colors, keep the "bright + dark" pairing structure; the radial outer ring must be dark (it's the premise for the light spot to work) |

## Known Pitfalls
- This is a background card: when the foreground holds typography/UI, delete the label pill and press the whole layer's opacity to 0.6–0.8 or overlay a dark scrim, otherwise the rainbow conic segment eats the foreground contrast
- Rewriting the CSS gradient string every frame triggers repaint rather than composite — large frame sizes + low-end devices need real testing; Remotion server-side rendering has no such concern
- The conic segment's seven-stop rainbow is "showmanship" in nature; for branded scenes, prefer a three-color loop (A→B→C→A)
- The three segments are independently usable: keeping only the linear segment (re-normalize 0–0.4 to 0–1) gives you a minimal "angle sweep" background

## Reference Implementation
demos/transition/gradient-transition/
(GradientTransition.tsx)
