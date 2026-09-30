---
name: element-body-moves
summary: Two variants of element body-feel — axial-stretch stretches along the motion axis like taffy, contact-shadow-lift lifts off the plane with a contact shadow
use: adding "the body changes" on top of "the position changes": high-speed fly-ins get a physical body for speed (A), card call-outs get hover evidence (B); A pairs with horizontal slams, B with 2.5D camera moves and per-card call-outs
duration: A ~4.7s / B ~5.3s
energy: A medium-high / B low-medium
---

## Intent
Every motion card in the library manages "the position changes" — fly-ins, slides, bounces; the elements themselves stay rigid bodies. These two variants manage **the body changes**: A gives speed a visible physical body — the faster it flies, the longer it stretches along the motion axis, a piece of taffy; at the landing it squashes, bounces back and straightens — the UI translation of squash & stretch; B gives hovering credible evidence — when a card lifts, the shadow directly beneath grows and lightens in sync, paper leaving the table — the staging principle supplying the physical dialogue underneath a 2.5D camera move. The difference from smear-multiples: that's countable afterimages (discrete ghosts), A is continuous stretching (taffy that never breaks). The difference from CameraMotionBlur: shutter smear is the camera's business, stretching is the body's — don't stack both on the same element.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A axial-stretch | velocity-difference-driven axial scale: v=\|p(f)−p(f−1)\|, no stretch below v<2px/f, full stretch at ≥140px/f (scaleX 2.2 / scaleY 0.72); 8f squash-bounce at landing | high-speed fly-ins / horizontal slams; multi-card staggered fills |
| B contact-shadow-lift | lift 10f out-cubic: card translateY(−28px)+scale(1.08), separate elliptical shadow scale 1→1.72 / opacity 0.55→0.18 on the same progress but reversed; settle back 8f in-cubic + 2f micro-squash | per-card call-out emphasis; lift-off groundwork in 2.5D paragraphs |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A stretch mapping | v∈[2,140]px/f → stretch 0→full (scaleX 2.2/scaleY 0.72) | peak <1.6 imperceptible; >2.6 reads as a glitchy smear |
| A origin / order | transformOrigin at the motion's trailing edge (100% 50% for rightward flight); translate before scale | centered origin reads as scaling not stretching; reversed order scales the displacement too |
| A landing bounce | 8f out-cubic: scaleX overshoots 0.85, scaleY 1.1, then back to 1 | stretching without the bounce reads as "can't stop" |
| A stagger | three cards take off 12f apart, 36f flight | all flying on the same frame can't read each one's own smear |
| B lift magnitude | −28px + scale 1.08 | judgment-locked: <12px is disabled (see Known Pitfalls) |
| B shadow | separate radial-gradient ellipse div; card's own boxShadow: none | box-shadow follows the card and can't give "shadow left on the table" |
| B landing | scale 0.99 micro-squash 2f, then 5f bounce back to 1 | without the micro-squash it reads as floating down, no weight |
| Ending | A true stillness 62f after the last card's bounce / B 35f after all settle back | ending frames must match the rest state pixel-for-pixel |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec; first real use must re-verify with real assets
- B's magnitude-up judgment: the original 8px lift was imperceptible; it only passed at 28px — in production never dial back below 12px; better absent than weak
- A's velocity must be actually computed from position differences, never approximated with easing progress — only differencing guarantees "no stretch below threshold" and automatic straightening at takeoff and landing
- A needs a different vertical-motion axis: vertical flight stretches scaleY and compresses scaleX, origin at the top/bottom edge; copying the horizontal parameters stretches the wrong axis (the original case actually had the axes inverted)
- B lifts only one card at a time — two leaving the table at once and the viewer can't find who's being called out (P4)
- Sound: A a dull thud at landing, B a light suck on lift / light place on settle back (sound-design §4.5)

## Reference Implementation
demos/ui-entrance/element-body-moves/
(AxialStretch.tsx / ContactShadowLift.tsx)
