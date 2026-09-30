---
name: carousel-3d
summary: 8 cards arranged via sin/cos into a ring of radius 190px rotating through one full turn at constant speed; each card only orbits around Y and billboards outward on its own; the front and back use the same directional texture with backface-visibility:hidden, guaranteeing every moment stays upright and never flipped; the camera stays pinned at a slight low-angle close-up the entire time
use: looping showcase for portfolios / template libraries / integration lists; background shots or landing-page heroes that need a seamless loop
duration: ~5.6s (168f@30fps)
energy: Medium (uniform speed with no variation — a steady-state motion that can loop forever)
---

## Intent
The cheapest way to show "a set of things" is lining them up and sliding horizontally, but a horizontal row has a start and an end. A ring doesn't — it's naturally cyclical, and the viewer never feels "that's all of it" no matter how long they watch. What this card actually solves is the part of ring carousels most likely to fail: card backsides. The answer is double-sided same-direction texture, so looking from inside or outside the ring shows the same upright card — a full rotation never shows a single mirrored or upside-down frame.

## Core Motion
- The ring placement is a single formula: `transform: rotateY(i*360/N) translateZ(RADIUS)` — rotate to your own azimuth first, then push out the radius along the new Z axis. This one step does both placement and billboarding: card normals naturally point outward
- The whole-ring rotation is done by the parent: `ring.style.transform = rotateY(t*360)`, while each card's own transform is reset to a constant base value every frame. **Cards never rotate around X or Z** — this is the fundamental guarantee of "always upright"
- Double-sided same-direction texture: front and back use the **same faceHtml**, the back additionally gets `rotateY(180deg)`, and both layers set `backface-visibility:hidden`. So the outside sees front, the inside sees back, with identical content orientation — with only one layer, turning to the ring's back side shows mirrored text
- Camera is fixed, not a single frame of movement: `cam.style.transform = translateZ(-90px) rotateX(-8deg) translateY(-10px)` is set in setup and never changed. All motion comes from the ring's rotation; the viewer's viewpoint is steady — this is a "gallery", not a "roller coaster"
- `perspective: 950px` hangs on the scene, `transform-style: preserve-3d` on both cam and ring; the card container also needs preserve-3d so the two faces each take part in 3D sorting
- Floor reflection disc: a 460×460 circle laid flat with `rotateX(90deg)`, radial gradient fading from 14% blue-purple opacity to 0, giving the ring a grounded reference — without it the ring seems to float
- `spin = t*360` is exactly one turn, final frame perfectly coinciding with the first — a natural seamless loop

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Card count | N=8 (azimuth spacing 45°) | 8 cards don't occlude each other front-to-back on a 190px radius; >12 cards crowd and pinch edges, requiring a larger RADIUS too |
| Radius | RADIUS=190px (card 92×124) | Radius/card-width ≈2 is the density sweet spot; below 1.5× the back cards squeeze through the gaps between front cards and the picture gets messy |
| Rotation speed | `t*360` = one full turn per piece | The turn count must be an integer to loop; 2 turns is twice as fast but still seamless, non-integers jump on the final frame |
| Perspective | `perspective: 950px` | 950 relative to a 190 radius is a fairly flat perspective; below 500 the near cards magnify exaggeratedly, reading as fisheye |
| Camera pitch | `rotateX(-8deg)` | -8° is only "slightly downward", just enough to reveal the floor disc; beyond -20° the ring flattens into an ellipse and the upright feel weakens under perspective |
| Camera pull-back | `translateZ(-90px)` | Negative pulls the camera back (ring appears smaller); positive push-in slams near cards out of frame |
| Card size | 92×124 (`left:-46px, top:-62px` self-centering) | Size and negative offsets are a bound pair; changing size without changing offsets makes the whole ring off-center |
| Floor disc | 460×460, `rotateX(90deg)`, 14% opacity | Diameter about 2.4× the radius to contain the whole ring; opacity >30% reads as a solid floor instead of a reflection |

## Known Pitfalls
- Constant speed with no variation is this card's defining trait and also its limitation: **it has no beginning and no end**. Used as a main shot it reads flat — best as a background layer, loop asset, or combined with foreground text / camera motion
- Every frame resets 8 cards' transforms but the values are constant (`rotateY(c.base) translateZ(RADIUS)`) — this makes "the card itself doesn't rotate" explicitly visible in the code, not an oversight. When porting, don't "optimize" it into a one-time setup, or there'll be no hook to add "per-card micro-motion" later
- `backface-visibility:hidden` needs the `-webkit-` prefix in some WebKit builds (the code writes both). Missing the prefix shows both faces at once and card content piles into a blur
- Card faces are geometric glyphs + `CARD 0X` numbers + two skeleton bars as placeholders; hue starting at 200 with +22 per card is demo-only distinguishing. Swap in real screenshots for production, **and front/back must become the same content** — otherwise the double-sided same-direction premise breaks
- When the ring turns to the back side, cards are "front-facing to the audience" (seeing the back layer), so content stays readable — but it also means there's no room for "flip-to-reveal". A flip requires abandoning backface-hidden and building a separate approach
- The dark radial background (`#131120`→`#0a0b10`) plus the cards' inner-shadow highlight are one set; on a white background the `0 12px 34px rgba(0,0,0,.5)` shadow looks dirty and needs reconfiguring

## Reference Implementation
demos/ui-entrance/carousel-3d/
(Carousel3D.tsx)
