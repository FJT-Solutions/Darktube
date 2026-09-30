---
name: input-trigger-moves
summary: Input triggers in two variants — cursor-performance, a cursor performing a click push-in, and keycap-smash-cut, a keycap fuse detonating into a smash cut
use: First-person passages of launch films: demonstrating the core interaction, opening on the climax; the viewer is "using" rather than "watching" the product
duration: A ~5s / C ~5s
energy: A Medium / C High
tags: opening
---

## Intent
The first-person grammar of launch films — the viewer isn't "watching" the product, they're "using" it: the cursor
is a hand, the keycap is a fingertip, the trigger is the narrative. Both variants share: **the interaction action is the trigger, the product
frame is the gunshot**. A is a slow trigger — an oversized cursor slides in with personality to click, the camera pushes in on the click point
then slowly pulls back, going out and coming back (distinct from crash-zoom: slow, anchored to the cursor, returns);
C is a fuse — a fake-3D keycap (⌘K) breathes and floats, 3f of flattening + a bright bottom ring spilling out as the fuse,
the press detonates into 30f of full-screen roar, and the highest-energy frame hard-cuts to a neat still wide shot,
press → burst → verdict. Selection: use A to demo interactions, C to open on the climax.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A cursor-performance | Cursor slides in on a cubic bezier arc with a terminal wrist-flick overshoot, hover brightens, click frame presses the button down + ripple + push-in 1.4x, two beats, slow pull-back | Close-up demo of a core button/interaction |
| C keycap-smash-cut | Keycap breathes and floats → 3f flatten + bright-ring fuse + 30f of cards rushing at the camera with sustained acceleration roar + the most energetic frame hard-cuts to a still wide shot, keycap embedded in the top bar | The whole film's opening verdict; highest energy |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A wrist-flick | bezier t overshoots 1.05 by f24 then curves back over 6f | A straight slide-in with no overshoot has no "personality" |
| A hover brighten | dark backdrop #2f2f2f→#555553 (4f) + scale 1.05 | Brightening is invisible on white (brightening precedent); only works on dark backdrops |
| A ripple | diameter 60→380 out-cubic 22f spread / opacity 0.9→0 linear 26f fade, decoupled; conditional unmount at f66 | Same curve for spread and fade reads as one blob fade-out |
| A push-in | f40–52 scale 1→1.4 (starting the same frame as the click) → 20f hold → 18f inOut pull-back; origin pinned at the click point | Cursor and button must be in the same scale layer, or the push-in drifts |
| C fuse flatten | box-shadow thickness 12→3px over 3f + sink 14px + key surface darkens; bright ring out-cubic 90→560px spread, linear fade, decoupled | The 3f of thickness flattening is the soul — the linchpin; without a thickness change it's just a color shift |
| C roar | 28–58f six objects in two passes (second pass shorter) Easing.in(quad) acceleration + scale 1.5→3 + blur 1→5px speed-gated | Must keep accelerating the whole time; an even-pace roar bleeds its power |
| C smash cut | f58 one-frame return to a static JSX, 44px keycap embedded in the top bar, dead quiet ≥82f | Post-cut frames must carry no per-frame animatable properties |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec,
  so first real use must re-verify with real assets
- Input triggers ≤2 per film — every one should be a paragraph-level switch; tap the keycap three times
  and the viewer knows it's just a transition trick, and the trigger loses its power
- A/C depend heavily on sound: click sample / keypress sample must land on the same frame as the trigger
  (sound-design §4.5); a silent press reads as the frame moving on its own
- After C's smash cut, the keycap must be recovered in the new scene (embedded in the top bar, echoing the fuse) — otherwise
  it's two techniques queued up, not a combination — the combination's linchpin
- C's roar segment shares its source with the smash-cut card (trailer-grammar-moves C-variant), pick one of the two per film

## Reference Implementation
demos/interaction/input-trigger-moves/
(CursorPerformancePunchIn.tsx / KeycapSmashCut.tsx)
