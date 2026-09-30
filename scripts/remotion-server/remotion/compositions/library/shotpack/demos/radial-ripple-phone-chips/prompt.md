---
name: radial-ripple-phone-chips
summary: Four concentric circles on a light gray background breathe out of phase like water ripples, a phone mockup at center auto-scrolls its in-screen feed, and white chips on both sides pop in with spring and hover
use: "This is it" freeze-frame shots for mobile products; intro segments listing features on both sides; product panoramas for openings/endings
duration: ~5.6s (168f@30fps)
energy: low (quiet, breathing, kept from going cold by the concentric circles' sustained undulation)
---

## Intent
Center the phone with minimal action and make it "alive": the concentric circles handle ambient breathing, the in-screen auto-scroll proves "there's content running inside", the chips on both sides name the features. Three layers of action, each extremely slow, stacked so the frame doesn't read as still — the standard recipe for product freeze-frames.

## Core Motion
- 4 concentric circles (560/440/320/210px, #d7dbe1→#eef0f3 dark to light) each `scale 1 ± 0.06`, 1.5 sine cycles across the film, adjacent layers 1.7 rad out of phase — out-of-phase is what makes "water ripple" instead of "overall scaling"
- Phone mockup 132×264, 22px radius, `0 24px 50px rgba(58,64,74,.35)` ground shadow, 8 skeleton cards forming the in-screen feed
- Feed `translateY 0→−150px`, window `t 0.08→0.98` **constant velocity, no easing**
- Chip pop: `seg(t0, t0+0.12, outBack)` drives scale 0.8→1, opacity jumps full within the first 0.08; left chip starts 0.22, right chip 0.40
- After the pop, `sin` hover ±3px (2 cycles/full film), eased in by `seg(t0+0.12, t0+0.3)` — not floating from the instant it lands

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Circle count/size | 4 layers 560/440/320/210px | 3 layers can't fill the frame; 5+ clips the outermost into a mere band |
| Breathing amplitude | scale 1±0.06, 1.5 cycles/film | 0.06 is already the ceiling; at 0.1 it reads as "pulse animation", not water |
| Phase offset | adjacent layers 1.7 rad | identical phase = one block scaling; 1.7 gives the illusion of waves spreading from the center |
| Phone shadow | 0 24px 50px rgba(58,64,74,.35) | the shadow is the only evidence the phone "floats on the waves"; removing it flattens everything |
| Auto-scroll | translateY 0→−150px, t 0.08→0.98 constant | adding ease instantly reads as "someone is swiping"; constant velocity reads as autoplay |
| Chip pop | outBack, 0.12 duration, scale 0.8→1 | outBack's overshoot is the entire "pop" texture; outCubic flattens it |
| Chip timing | left 0.22 / right 0.40 (≈0.6s apart) | appearing together reads as two labels; staggering gives the "one at a time" rhythm |
| Chip hover | ±3px, 2 cycles, eases in within 0.18 after pop | over 5px steals the show from the concentric breathing |

## Known Pitfalls
- Chips position with `calc(50% + 86px)` hugging the phone edge; changing the phone width requires changing this 86px, or the chip overlaps the mockup
- The in-screen feed is 8 placeholder skeleton cards; when swapping real screenshots, the total height must exceed "150px + screen height" or the bottom runs white
- The concentric circles are solid stacked fills (not outlined rings); layer order must append large to small, or only the largest is visible
- ACCENT_RGB (default `122,134,153` neutral gray-blue) only affects the in-screen thumbnail gradient; to re-skin to a project brand color, change this one variable

## Reference Implementation
demos/effects/radial-ripple-phone-chips/
(RadialRipplePhoneChips.tsx)
