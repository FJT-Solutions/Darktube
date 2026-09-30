---
name: terminal-3d
summary: Three terminal windows scattered through 3D space; the camera flies between windows with a sinusoidal pull-back mid-flight, and at each window a typewriter taps out a command while results slide out line by line — a spatial narrative flow of command execution
use: CLI/workflow demos for developer products: turning "three commands" into a three-stop spatial journey
duration: ~6.0s (180f @ 30fps; three stops of ~1.6s hold + 0.85s flight each)
energy: Medium (flight provides dynamism, typing provides rhythm; overall a steady technical narrative)
---

## Intent
Terminal output is by nature an anti-cinematic language of "flat scrolling"; this card spatializes it: each command occupies a physical window in space, and the camera visits windows one by one like walking through a server room. The pull-back mid-flight lets viewers glimpse "there are more windows" — a sense of the workflow's full picture.

## Core Motion
- Each of the three windows holds a pose (x/y/z/ry); the camera runs the **inverse transform**: `translateZ(300-pull) rotateY(-ry) translate3d(-x,-y,-z)` — write the window pose table and you get the camera path
- Two flight windows STEP `[0.30,0.44][0.64,0.78]` (inOutCubic), with a `sin(π)*210px` sinusoidal pull-back hump mid-flight — backing off at takeoff, closing in at arrival: a "breathing" transition
- Distance focus: each window computes a focus from its x-distance to the camera, `opacity 0.34–1 + blur 0–2.2px + brightness 0.7–1` — out-of-focus windows soften into the background without stealing the show
- Three typewriter elements: the command types character by character (0.09 window), the cursor blinks at two rates (fast 40Hz-based blink while typing / slow 26Hz blink when done), and output lines slide in from the left staggered at `0.022/line` (−7px→0)
- Typing start points TYPE `[0.05,0.47,0.81]` all come after arrival — no typing mid-flight, so attention isn't split

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Pull-back hump | sin(π)×210px | removing it makes the flight a "pan" with no "takeoff/landing"; >300 pokes out of the background gradient bounds |
| Flight/hold ratio | 0.14 / 0.20 | the hold must fit typing 0.09 + output 0.145 + a reading-beat margin |
| Focus falloff | /420px, blur peak 2.2px | the smaller the denominator, the harsher the defocus; the three windows' x-spacing (~640px) should be >1.5× the denominator |
| Typing speed | command at 0.09 normalized (~16 characters) | when swapping in a longer command, keep the character count similar, or back-calculate the window width from the character count |
| Output stagger | 0.022/line, 0.035 each | four output lines total ~0.15; with more lines, compress the interval so they finish within the hold |
| Window pose | ry ±16–32°, z −110~+90 | the angular differences are what create the "spatial scatter"; all facing straight ahead degrades into a flat carousel |

## Known Pitfalls
- The camera is implemented as an inverse transform — **the window's own transform and the camera formula must be strictly inverse**; when editing the pose table, only change the pose data, never touch either transform string
- The command/output copy is a generic toolchain placeholder (git/npm/log); when swapping in real project commands, keep the information structure of "short command, 3–4 output lines"
- The cursor blink runs `floor(t*26/40)`; changing dur shifts the blink frequency, so visually verify that the "fast blink while typing, slow blink at idle" contrast still holds
- The third window starts typing at 0.81, with output running to 0.955 + settle — when shifting the TYPE table later, leave a ≥0.04 tail margin, otherwise the last line gets cut off before the fade to black

## Reference Implementation
demos/camera/terminal-3d/
(Terminal3D.tsx)
