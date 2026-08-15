---
name: magician-card-flourish
summary: On a pure black field a blue star-burst flashes for 0.3s (an X-shaped needle beam rotating 90° + a central glow radiating short spikes), then the card shoots out of the flash point — spinning extremely fast along an arc toward the camera, spin decaying with proximity, a hard freeze near full-frame, then a sheen sweep after the freeze
use: A magical entrance for a single card/poster/cover (opening key visual, product-card reveal); pure-black dark field; a burst that needs "conjured out of nowhere" ritual
duration: Flash 0.3s + flight ~1.7s + freeze showcase + sheen ~2s; 4.2s total
energy: High (a one-shot burst; still after the freeze)
tags: ui-entrance, effects
---

## Intent
A magician flicking a card: a blue star-burst flashes, and the card seems conjured out of the light — it shoots out from extremely far behind frame center (visually a tiny dot), spins at extreme speed along an arc toward the camera, and hard-freezes into a near-full-frame showcase the instant it reaches center. Three linchpins of the magic feel: **flash first** (the light is the "conjuring" ritual, 0.3s short and crisp), **launch rhythm** (slow wind-up on liftoff → sharp acceleration kick-out → decelerating arrival along the arc; slow-in → burst → decelerating arc), **freeze means stillness** (no deceleration tail, no bounce-back; the 13 full rotations guarantee the freeze lands face-on).

## Core Motion
- Opening star-burst (the final form converged across rounds from the user's reference image IMG_2505):
  - X-shaped **diagonal** needle beams (-38°/52° starting angles), rotating **90° dynamically** as a whole during the flash (easeInOut); long axis 840 / short axis 420 (2:1 ratio)
  - Beams pure saturated blue (#3f9bff→#2277f2 across the full length, white segment only the root 5%), each axis in three layers: wide blurred glow envelope + bright main beam + over-exposed thin core
  - Center is **not a white ball**: a tiny bright point (26px) + blue glow halo (140px) + a ring of 10 radiating short spikes alternating in length (slowly counter-rotating to the star-burst)
  - Rhythm: brighten 2.5f → micro-flash → collapse, done in 9f (0.3s)
- Launch flight: starts extremely far at center (scale≈0.06), true-perspective scale=F/(F+z) (z 14000→0); path curve slow-in (first 14% of time covers 6%) → slope-break launch → easeOut(cubic) deceleration; a single sine-arch arc swings out and returns to center
- Spin: 13 full rotations around the card's diagonal axis; the first 40% of travel is near-constant and extremely fast, the last 60% decays angular velocity by a power of 2.4 (the closer to camera, the slower); whole rotations guarantee a face-on freeze
- Freeze: full stop at f=TAKEOFF+50, card height ≈94% of frame height (pressed to the top/bottom bounds)
- Sheen: 8f after the freeze settles, a diagonal sheen band sweeps left→right once (overlay+screen double layer + slight whole-card brightness lift)

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Flash duration | 9f (0.3s, precisely set by the user; squeezed down 1.5s→0.8s→0.5s across rounds) | The light is ritual, not the star; >15f steals the card's scene |
| Star-burst rotation | Rotates 90° dynamically during the flash (precedent: a static angle was rejected with "didn't see the rotation") | Rotation must be visible frame by frame; >120° reads as a propeller |
| Beam color | Pure saturated blue across the full length | White segment too long / decay too fast was rejected as "not faithful enough"; cyan-blue leaning gray was rejected with "make it blue" |
| Center | Tiny bright point + glow + radiating short spikes | **A white ball was rejected** — the center is an optical glow, not a solid sphere |
| Launch curve | slow-in 14% → burst → decelerating arc | Straight constant speed or plain easeOut has no "launch" wind-up feel |
| Spin decay | Power-2.4 deceleration over the last 60% of travel | Constant spin to the end was rejected with "should decay with distance as it approaches the camera"; whole rotations are what guarantee a face-on freeze |
| Freeze size | Card height 94% of frame height | The v1 1.0× was rejected with "closer and bigger, basically against the top/bottom bounds" |
| Hard freeze | Full stop, zero bounce-back | Magic feel = instant stillness; bounce-back reads as a physical toy |

## Known Pitfalls
- The demo was tuned against grayscale/placeholder assets — parameters are a tuning starting point, not a production lock; first real use must be re-validated on real assets
- **Lighting-quality precedent chain** (a global methodology this card contributed): geometric color blocks rejected as "cheap VFX" → redone with optical realism → game-like + real → the user supplied a reference image for one round of convergence. Texture-type feedback loses a lot in words — **proactively ask the user for a reference image**
- Engineering pitfall: the thin needle beams **must not go inside CameraMotionBlur** — the rotation gets sampled by the blur into striped doppelgangers (the hidden source of "cheapness"); render the flash layer outside the motion blur
- Engineering pitfall: the star-burst SVG viewBox must be ≥ beam length + rotation sweep radius, or the endpoints get clipped into straight edges
- Division with card-flip-reveal/deck-deal-flyin: those are multi-card rhythm pieces of flipping/dealing; this card is a single-card "conjured" magic ritual, one card at a time

## Reference Implementation
demos/opening/magician-card-flourish/
(MagicianCardFlourish.tsx)
Source film: none (customized from user description, converged over many rounds)
