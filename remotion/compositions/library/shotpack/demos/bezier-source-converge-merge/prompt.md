---
name: bezier-source-converge-merge
summary: Four source nodes on the left each have a thin Bézier curve connecting to the same converge point on the right; the curves first draw on from left to right in staggered order, the nodes slide along their own curve toward the converge point with a three-stage accelerating shrink to zero, accent-colored data packets glide along the paths the whole time, and after the merge completes the curves are erased from the left end, leaving only the circular badge
use: core mechanism shot for "multi-source consolidation / unified access / data convergence"; explainer paragraph for integration, aggregation, single-entry products
duration: ~5.6s (168f@30fps)
energy: Medium (long slow steady shot, kept alive by the gliding packets; the merge moment is the only small peak)
---

## Intent
"We've unified four sources" is an abstract statement. This motion turns it into a visible physical process: first establish four independent pathways (draw-on reads as "connected"), then make the four sources actually walk down the pathways into the same point and get sucked in (shrinking to 0 reads as "absorbed"), and finally erase the pathways leaving only the badge ("now there's just one"). Each of the three beats has clear start and end, so the viewer reads the causality without narration.

## Core Motion
- Path geometry: each `d = "M -22,y L 74,y C 186,y 214,120 332,120"` — the start sits off-canvas at -22, 74 is where the source node dwells, then a cubic Bézier curves toward the converge point (332,120). The four only differ in starting y (36/92/148/204), so their curvature is naturally different, and so are their converge angles
- draw-on uses `stroke-dasharray = len` + `dashoffset = len*(1-draw)`, with `seg(t, 0.04+i*0.045, +0.17, E.outQuad)` — the 0.045 stagger makes the four lines light up one after another rather than all at once
- Node positioning uses `getPointAtLength`: in the prime phase a 40-step scan finds the path ratio `f0` where x≈74; at runtime `frac = f0 + (1-f0)*conv`, `conv = seg(t, 0.34, 0.74, E.inOutCubic)` — nodes travel along the **real curve**, not an interpolation between two points
- Three-stage shrink: while `conv < 0.75`, 44→15px (slow slimming); at `conv ≥ 0.75`, 15→0px (the last quarter drops it all) — the size-change rate of the final stretch is over 4× that of the first, which is the acceleration that reads as "being sucked in"; the font follows at `size*0.26`, so the label never detaches from the node
- Data packets: `pkCycle = (seg(t, 0.1, 0.74, E.linear)*2) % 1` walks two integer cycles, each route offset by `i*0.13` phase; opacity uses `1 - |cycle-0.5|*0.6` so a packet is brightest mid-path and fades at both ends — avoiding packets appearing out of nowhere at the start
- Erase: `erase = seg(t, 0.78, 0.9, E.outQuad)` pushes dashoffset negative (`-erase*len`), so the dashes retreat from the **start** direction, opposite to draw-on — reading as "pathway retracted"
- Badge: `seg(t, 0.16, 0.26)` fades in and scales from 0.7 to 1, then does a receive pulse at the merge moment (0.7→0.78 outBack +12%, 0.78→0.86 outQuad back); the `endCap` subtitle fades in after 0.84

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Source count | 4 (y=36/92/148/204, spacing 56) | 4 is the sweet spot where curvature differences stay obvious without tangling; >6 and the middle Béziers nearly coincide, so converge angles become indistinguishable |
| draw-on | start `0.04+i*0.045`, window 0.17, outQuad | The 0.045 stagger is ~7f; at zero the four lines read as brushing out at once, losing the "route-by-route connection" meaning |
| Converge window | 0.34→0.74 (inOutCubic) | Takes 40% of the whole piece — the main section; inOut's slow start reads as "launch" and slow settle as "arrival"; switching to linear instantly becomes a constant-speed conveyor belt |
| Three-stage shrink | 44→15px (first 75%) → 0 (last 25%) | The later the 0.75 inflection, the more sudden the suction; moving it to 0.5 turns it into "gradual shrink all along" and the merge beat disappears |
| Packet period | 2 integer cycles (0.1→0.74 linear) | Must be an integer cycle or the final frame leaves a packet mid-path; densifying to 4 cycles reads as a frantic data stream and collides with nodes more often |
| Packet phase offset | `i*0.13` | Staggers packets across routes so they don't line up and merge simultaneously; 0 shows four packets advancing in a tidy row like a fleet departure |
| Erase | 0.78→0.9, dashoffset negative | Completes in 12f; the erase must happen after all nodes are gone (conv finishes at 0.74, nodes fade out by 0.92), otherwise the lines vanish first and the nodes hang in the air |
| Badge pulse | outBack +12% (0.7→0.78) → settle back (0.78→0.86) | 12% is the "received" magnitude; >25% steals attention from the convergence itself |

## Known Pitfalls
- `getTotalLength` / `getPointAtLength` only work after the SVG is attached to the document and laid out; the code uses a `ready` flag in a first-frame `prime()`. Porting to Remotion, the first frame render may not have the lengths (the fallback writes `|| 380`). The safe approach is computing after `useEffect`/layout, or precomputing a constant table, otherwise there's a one-frame misplacement jump
- `f0` is found by a 40-step linear scan for "x first ≥74", precise only to 1/40. If the curve changes significantly, the node dwell position drifts off 74, looking like it "didn't stop where it should" — after editing paths, increase the scan steps or calibrate explicitly
- Node opacity only starts fading after `conv > 0.92`, while conv reaches 1 at t=0.74, so nodes disappear at size 0 rather than by fading out. This is intentional (being sucked in shouldn't fade), but if you move the three-stage inflection later, you'll see nodes vanish abruptly while still sized
- Nodes are `S1`–`S4` neutral gray placeholder circles (gray levels only distinguish the four routes); swap in real source logos for production. Keep the accent color only for the packets and badge — don't color the nodes, or the converge point loses its visual center
- The converge point (332,120), the 440×240 SVG viewport and `overflow:visible` are a bound coordinate set. Changing the canvas proportion requires re-scaling the whole set; the -22 path start relies on `overflow:visible` to show the segment outside the frame
- The subtitle "Four sources unified" is placeholder copy that appears after 0.84 — if pairing narration, its appearance should align with the narrator's words rather than the animation cue

## Reference Implementation
demos/ui-entrance/bezier-source-converge-merge/
(BezierSourceConvergeMerge.tsx)
