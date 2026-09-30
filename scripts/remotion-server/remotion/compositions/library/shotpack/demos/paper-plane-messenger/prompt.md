---
name: paper-plane-messenger
summary: Paper-plane messenger transition — after clicking "send", the camera pulls back out of window A, the origami plane flies out along a Bézier arc (pitch following the tangent), the camera escorts it through multi-layer parallax props, arrives and settles at window B's door, and B zooms in to take over the full screen
use: Narrative transitions where a "send/invite/share" action connects two characters' or scenes' perspectives; when an abstract action needs a metaphorical entity as the transition vehicle
duration: ~5s (150f: click 12f → pull-back 16–42f → flight 34–104f → B takeover 112–146f)
energy: Medium
tags: camera
---

## Intent
transition-travel dives the camera into an existing element in the frame to change scenes; this card is the reverse — it **releases a semantic messenger** from the action and has the camera fly with it to the next scene. The abstract action "send" is embodied as an origami plane; the spatial relationship between windows A and B is truly measured by the flight path, giving viewers a bodily sense of "where the message went". The linchpin is the 2.5D camera pipeline: all elements hang on one world coordinate system, the camera center goes A→following the plane→B, zooming out then pushing in, parallax props multiplying by their depth against camera displacement — a heavy-3D original degraded into a "fake 3D" that drops the cost an order of magnitude while keeping the depth feel. The plane's pitch following the arc's tangent is the entire difference between "it's flying" and "it's translating".

## Core Motion
- World-coordinate camera: `screen = 960 + (world − camCenter) × zoom × depth`; camera center A(520,560) → following the plane → B(3200,600), zoom 1.55 (face-on to A) → 0.62 (pulled back in escort) → 3.1 (B takeover full screen)
- Plane cubic Bézier: A's send button → high toss control point (y=−80) → press-down control point → B's door; orientation = the atan2 tangent angle between bez(t) and bez(t+0.012)
- Overall flight easing Easing.bezier(0.45,0.05,0.25,1) (accelerating on takeoff, decelerating on landing) 70f; mid-flight scale-up ×1.7 to keep it readable, settling back to ×1.1 on landing
- 16 parallax props (rings/rounded squares, seed random) split into three depth layers 0.45/0.75/1.3, far layer blur3, near layer blur8 bokeh; each with sinusoidal floating
- Plane = SVG of three folded faces (white/light gray/dark gray showing creases) + stroke; enters with Easing.back(1.6) pop, fades opacity out during B takeover leaving no ghosting
- Click pulse: button scale ×1.22 + expanding ring (CLICK 12f start, 3f peak)

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Three zoom stages | 1.55 → 0.62 → 3.1 | Following directly without pulling back first, viewers don't know where B is; the pull-back must go below 0.7 to hold the journey feel |
| Flight duration | 70f, ease-in-out | <45f reads as a catapult; constant speed reads as dragged translation |
| Tangent sampling | dt = 0.012 | Too large lags the angle, too small jitters; the pitch is the linchpin of "flying", removing it instantly becomes texture sliding |
| Mid-flight scale | ×1.7 (0.25–0.75 window), ×1.1 on landing | After the pull-back the plane is only tens of pixels; without scaling up you lose the protagonist |
| Parallax layers | depth 0.45/0.75/1.3, far blur3 near blur8 | All-same depth means no pass-through feel; an in-focus foreground steals the plane's attention |
| B takeover | 112–146f, zoom pushed to 3.1, props/plane fading out in sync | Props that don't fade out become huge blurry blobs sweeping the whole screen as you push in |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- Division of labor with transition-travel: that card dives into an **existing** element/container in the frame to change scenes (the space was already in the composition); this card **releases a new entity** to connect a second scene off-frame — only when A/B have no pre-existing spatial relationship does this card get its turn
- Division of labor with glow-flyline-moves B (flyline-arc): flylines are abstract illustrations of data flows in dark fields (the line is the protagonist); this card is a bright-field narrative journey (the messenger is the protagonist, the camera escorts) — data flows use flylines, person-to-person stories use a messenger
- The messenger entity must come from the action's semantics (send→paper plane, upload→balloon, deploy→rocket); sending an arbitrary mascot for a ride reads as causeless
- At the switch frames of the three camera stages (pull-back/escort/takeover), both center and zoom must be continuous — in the demo zBase/zTake are equal (0.62) at TAKEOVER[0] to avoid frame jumps; when changing the timeline, check this first
- The 2.5D limit: props can only be silhouette-level shapes; realistic props expose "there's no true perspective"; for heavy-3D texture go back to the original's pipeline (one cost tier higher)

## Reference Implementation
demos/transition/paper-plane-messenger/
(PaperPlaneMessenger.tsx)
Original footage: pitch-app 77–82s (a 2.5D downgrade of the heavy-3D original)
