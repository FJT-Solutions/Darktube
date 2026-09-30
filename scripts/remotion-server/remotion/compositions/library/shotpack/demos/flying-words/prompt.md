---
name: flying-words
summary: 22 keywords laid out by golden angle on a flattened ellipse cross-section, flying along the z-axis from -1750px past the camera at 800px; opacity follows the [0,1,0.5,0.2,0] life curve, running 2 full loops end-seamlessly
use: Dynamic background for keyword clouds/capability lists; the "information volume" underlay layer for openers and endings; transitions needing depth-through-feel
duration: ~6.0s (180f@30fps, 2 full loops, seamlessly loopable)
energy: High (continuous full-screen 3D translation, not a single still frame)
---

## Intent
The lamest way to list keywords is stacking a static cloud on screen. The word tunnel
**spreads the same set of words across time**: spawned far away, growing, sweeping past
the camera and disappearing — the viewer only ever reads three or five words at once,
yet the subjective impression is "lots of words." It's a background layer, not a hero
layer — the camera doesn't move, elements move, so overlaying a title or UI in the
foreground never fights. Swap the word list for project keywords and nothing in the
motion logic changes.

## Core Motion
- Scene `perspective:1100px` + `preserve-3d`, words push linearly along z from
  **-1750 → 800px** (`lerp(u, -1750, 800)`) — positive values cross the camera plane,
  which is what makes it "sweep past"
- Placement uses the golden angle: `a = i·2.39996 + rand(i·7+1)·0.8`, radius
  `r = 82 + rand·165`, y-radius further ×0.6 flattening into an ellipse — avoids the
  dead center and keeps near words from clumping
- Life curve `OP=[0,1,0.5,0.2,0]` @ `OT=[0,0.25,0.6,0.85,1]`: **first quarter slams to full
  brightness, middle drops to half-transparent, tail trails off** — not a simple fade;
  dimming the middle keeps the foreground visible
- Outward drift `drift = 0.5 + u·1.35`: converging at center far away, throwing wider
  as it approaches, stacking with the z-axis push into real depth
- Near-end blur: `u > 0.86` → `blur((u-0.86)·26)` — words getting close grow uncontrollably
  large; this blur layer is both motion blur and cover-up
- `CYCLES = 2` is an integer loop; t=0 and t=1 are pixel-identical for seamless looping;
  each word's phase `ph = i/N` evenly divided, spawn fully deterministic; a 220px
  blue-purple glow at center `opacity = 0.75 + sin(t·4π)·0.12` breathing twice,
  pinning "tunnel end" as the visual anchor

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Word list | 22 words, font size `20 + rand·16`px (20–36), 800 weight | Word count is bound to phase `i/N`: <12 words the frame looks sparse, >30 the near field blurs together; randomized font size is the layering source, uniform size reads as a sticker |
| Depth travel | z −1750 → +800px, perspective 1100 | Starting farther (−2500+) the words are too small to recognize; not crossing 0 means "fly to my face and stop" instead of "pass through" |
| Drift coefficient | `drift = 0.5 + u·1.35` | Coefficient <1 everything bursts from dead center like an explosion; >2 words fly off-frame early and the tunnel becomes a fountain |
| Life curve | `[0,1,0.5,0.2,0]` @ `[0,0.25,0.6,0.85,1]` | The middle 0.5 yields to the foreground; full brightness throughout steals the hero role, dying early empties the tunnel |
| Loop count | `CYCLES = 2` (must be integer) | Non-integer → t=1 doesn't join t=0, a jump at the loop point; more loops mean faster words-per-frame |
| Near blur | from `u>0.86`, `(u-0.86)·26`px | Threshold at 0.95 makes huge words hard-edged and glaring; coefficient >40 the tail becomes color blotches |
| Palette | `hsl(200+rand·130, …)` blue→purple, glow `rgba(120,150,255,.22)` | Deep background + light glowing text is the ID; using this card on white breaks it outright — a light version needs a full rework |
| Center glow | 220px, blur 6, breathing 2× per film | Without it the tunnel end has no focal point and words look randomly scattered; align breathing frequency with CYCLES or it fights the beat |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- Swapping the word list must **keep word count and character-length scale** (demo: 22
  words, 4–9 letters each): phase is evenly divided as `i/N`, so changing count rescales
  density globally; Chinese words are 2x+ wider than English — switching to Chinese
  keywords requires shrinking the font size in sync or the near field fills the frame
- `CYCLES` must be an integer or the loop seam breaks — this is the only precondition
  for "seamless loop"; tune fly-by speed by adding/subtracting integers, never decimals
- Background layer only: the mid-curve dim to 0.5 exists to yield to the foreground;
  treating it as the hero (max brightness) reads as noise
- Deep-background only: `text-shadow` glow + radial vignette is half the effect; on
  light backgrounds the words blur into dirty specks; the 22 word elements stay in the
  DOM the whole film (never destroyed/rebuilt), only transform/opacity change — keep
  this structure when porting to Remotion, don't switch to per-frame node add/remove

## Reference Implementation
demos/typography/flying-words/
(FlyingWords.tsx)
