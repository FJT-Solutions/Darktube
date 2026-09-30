---
name: dataviz-landscape-open
summary: Dark-field river-of-lines landscape opening — multiple streams merge into a main trunk, fictional ID labels float on the lines, the camera flies over at low speed with deep depth of field
use: Brand-level abstract opening ("data universe" metaphor), into a bright product segment or wordmark; division of labor with glow-flyline-moves: that card is line-connection narration between cards within a segment, this card is a full-frame landscape reserved for openings
duration: 5–8s (opening atmosphere segment, ≤1 time per film)
energy: Low start, slow climb (opening slot, leaves room for the later ramp)
tags: data, camera
---

## Intent
A brand-level opening category proven in the Linear Releases launch film: the data world behind the product is shot as a **dark-field landscape** — tributary line streams converge from deep in the frame into one main trunk (the metaphor of "countless workflows converging into one product"). The realism comes from three things: ① fictional issue/task ID labels floating on the lines (the viewer recognizes "this is the kind of thing I see every day"); ② deep depth of field — the near foreground sweeps past heavily blurred, midground labels are crisp and readable, the background fades out, three layers of depth making a flat SVG read as space; ③ a low-speed, steady, even camera flyover — this is an atmosphere segment, not a showpiece; the sense of speed is left to later shots. Hand-rolled UI compliance basis: this is not a replicated scene (no such image exists on the page), so under core principle 1 (revised) it passes through the quality + expressive-clarity bar.

## Action Phases
| Phase | Frame Reference (@30fps) | Content |
|------|------|------|
| 1 Growth | f0–45 | Streams draw on from the far end toward the confluence (out-cubic); main trunk first, tributaries stagger in behind |
| 2 Flyover | f30–150 | Camera tracks slowly along the trunk's direction (overlapping the growth phase); labels emerge staggered at uneven intervals |
| 3 Hand-off | Last 30–45f | Leave a bright zone at the confluence to guide the eye, hand off via shot-transitions hidden cuts / Variant B through a dark field, or decelerate to a stop into the wordmark |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Line-field scale | 8–14 tributaries merging into 1 main trunk; layered near 2–3 / mid 5–8 / far 4–6 | Past ~16 lines it reads as a screensaver/tech template; the trunk must be unique (the landscape version of the single-protagonist rule) |
| Confluence topology | Tributaries merge tangentially into the trunk via bezier (tangent-continuous), confluence point offset to one third of the frame | Perpendicular intersections read as a circuit board, not a water system; a centered confluence makes a stiff composition |
| Three depth layers | Near: blur 10–16px + line width 6–10px + brightness 0.15–0.25; mid: crisp 2–3px, brightness 0.5–0.8; far: 1–1.5px, brightness 0.2–0.35 | No near-field defocus and the three layers collapse into one flat drawing; an over-bright background steals the midground |
| Camera flyover | World canvas ≥2× viewport, lateral speed 2–5px/f steady + parallax (near 1.4×/mid 1×/far 0.6×), optionally a very slow zoom 1.0→1.06 | Too fast becomes a chase shot (that's crash-zoom's job); without parallax it instantly breaks as flat scrolling |
| Parallax visibility | Near/far lines must angle against the motion direction (obvious slope) or carry in-frame visible feature points (endpoints/intersections/node markers crossing the frame) | **Lines parallel to the motion direction slide along themselves when moving sideways — no matter how correct the parallax math, it stays invisible** (L2 review precedent: 0.6×/1×/1.4× all correct, yet only the midground moved at normal playback) |
| Flow feel | After draw-on completes, lines stay "alive": along-line brightness pulses / dashed-phase drift slowly toward the confluence (1–2px/f, opacity ≤0.3 overlay) | No flowing element after the growth phase and the back half degrades into a "route-map flyover", not a "data stream" |
| Labels | 5–9 in the midground layer: square pins + monospace IDs (e.g. APP-1843), staggered 6–10f fade-in + slight drift along the line | IDs must always be fictional (compliance floor); labels on the near/far layers become unreadable from defocus/darkness; pin squares must sit on the line (a pin separated from the line reads as floating dust, not an anchor) |
| Growth rhythm | Main trunk goes first over 30–40f out-cubic, each tributary staggered 3–6f | Everything growing on the same frame reads as a loading animation |
| Landing | ≥15f before the hand-off frame, labels stop appearing, camera slope stays continuous (no hard brake) | A hard brake in the atmosphere segment is a visible jolt (same source as the glow-orb convergence precedent) |

## Known Pitfalls
- Reference source: Linear Releases opening (evolution round #3, breakdown #7), a single-sample case — parameters are given as ranges, not dogma; first real use must be re-validated on real assets
- Don't mix with glow-flyline-moves in adjacent segments: both cards are "glowing dark-field lines"; back-to-back they read as the film having only one trick; when a film needs both, space them with ≥2 bright-field shots
- Dark-field entry/exit carries the same cost as the glow card: pad the cut to bright product segments with the shot-transitions hidden-cut family, never hard-cut between light and dark
- Pure-white fully-lit lines smear into a spiderweb — spread brightness by layer (see parameter table); the midground is the hero layer; give the trunk/tributaries a 1–2px soft glow to press out the "glowing line" atmosphere, and zero glow reads as a wireframe diagram (within Q4's single-point light-effect allowance)
- Label font size must be ≥18px equivalent at the target frame size, or "readable" degenerates into decorative noise (same source as Q6)
- Sound: lay a riser / low-frequency pad bed; label emergence gets no per-item hits (batch items don't each sound, same source as S2); one whoosh/impact at the hand-off frame is handed to the next shot

## Reference Implementation
demos/opening/dataviz-landscape-open/
(DatavizLandscapeOpen.tsx)
