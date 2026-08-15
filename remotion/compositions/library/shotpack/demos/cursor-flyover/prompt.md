---
name: cursor-flyover
summary: After the full-page overhead view fades in, the camera flies to each of the four corners for zoom-in close-ups, while an SVG cursor syncs in to point and leaves click ripples
use: Feature tour of a single-page product: one continuous shot walks viewers through four feature zones, with the cursor as the "tour-guide finger"
duration: ~6.0s (180f @ 30fps; overhead 0–1.2s · four steps of 0.7s transition + 0.5s hold each)
energy: Medium (steady cruise; rhythm comes from the click ripples)
---

## Intent
A shot-saving alternative to "four features, four cuts": one continuous camera strings the four corners into a single tour path, and the cursor is the viewer's attention proxy — where it goes, what it clicks, the viewer watches. Spatial continuity also lets viewers absorb the positional relationships between features along the way.

## Core Motion
- The camera steps through a lookup table: CAM[0] overhead view (scale 0.8, centered) → four corner close-ups (scale 1.72, tx/ty per corner); the five channels `tx/ty/s/cx/cy` interpolate with `acc` + inOutCubic
- Transform formula `translate(50-tx*s%, 50-ty*s%) scale(s)` — tx/ty are the "camera aim points"; edit the table to change the tour route
- Four segment windows `[0.20,0.32][0.40,0.52][0.60,0.72][0.79,0.91]`: transition 0.12 + hold 0.08; the even rhythm reads like "tour footsteps"
- The cursor (SVG arrow + drop shadow) shares the same table and interpolation as the camera for cx/cy — **camera and cursor are one system**, always arriving simultaneously; the cursor applies `scale(1/s)` to cancel the frame zoom and stay visually constant-size
- The moment each segment lands (0.055 after WIN[i][1] starts), a click ripple fires: a 26px ring expands from 0.3× to 1.9× and fades out, while the cursor tip flashes white on the same beat
- Opening 0–0.14: the full page fades in from blur 5px into focus

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Close-up scale | s=1.72 (overhead 0.8) | >2.2 blurs the placeholder screenshot texture; can push to 2.5 after swapping in real high-res screenshots |
| Step rhythm | transition 0.12 / hold 0.08 | the hold is for reading each feature zone; shorter than 0.05 turns "visiting" into "sweeping past" |
| Click ripple | 0.055 duration, scale 0.3→1.9 | the ripple is the metronome — four clicks land evenly at 0.32/0.52/0.72/0.91; pair with four SFX clicks |
| Cursor compensation | scale(1/s) | dropping it makes the cursor balloon in close-ups; required to keep the "cursor is a UI layer" illusion |
| Tour order | top-left → top-right → bottom-right → bottom-left (reverse Z) | edit the CAM table to change the route; keep neighboring corners visited adjacently — diagonal jumps are disorienting |
| Opening focus | 0–0.14 blur 5px→0 | lands on the same beat as the overhead to establish "this is the full view"; skip it if starting directly at a close-up |

## Known Pitfalls
- The placeholder screenshots (window chrome + sidebar + four-quadrant controls) must be replaced with real product screenshots, and the four cx/cy cursor landings re-targeted to the real control centers
- The camera table's tx/ty are content-relative percentage coordinates; if the screenshot aspect ratio changes (e.g. switching to portrait), the whole table needs re-marking
- Binding cursor and camera to the same interpolation means orchestrations like "cursor flies first, camera catches up" aren't possible — to decouple them, give the cursor its own table with the same structure
- The hold segments are fully static and can look "stuck" on a 1080p large screen — add a ±0.5px breathing offset (deterministic sin) to the world, but keep it under 1px

## Reference Implementation
demos/camera/cursor-flyover/
(CursorFlyover.tsx)
