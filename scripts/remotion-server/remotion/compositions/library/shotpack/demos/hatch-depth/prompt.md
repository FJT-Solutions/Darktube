---
name: hatch-depth
summary: Hatch-pattern placeholder bars wipe-stretch into place one by one; then the hatching fades out, an accent-colored solid layer fades in, values pop up, and the placeholder graphic transforms into a real data bar chart
use: "From draft to real data" narrative beats; introducing dashboard/report features, or segments stressing real-time data
duration: ~4.4s (132f @ 30fps; growth 0–1.7s · transformation 2.2–3.4s · micro-tremor ending)
energy: Medium (information builds progressively, no explosion; the texture swap creates the "it's live" moment)
---

## Intent
Shooting the product moment of "placeholder becomes real data" as a visible material transformation: first, 45° hatch strips sketch the draft feel of "data will live here"; then a solid color layer replaces them in place — the geometry stays completely still, only the skin changes, and what the viewer reads is "the same thing came alive".

## Core Motion
- 5 horizontal bars grow with `0.06 + i*0.05` stagger, each wiping out to its target width over 0.22 with `outCubic` (0.4–0.95 normalized)
- During growth, the hatch layer (`repeating-linear-gradient 45°` + same-color stroke) and the solid layer grow in sync at the same width, but the solid layer stays at opacity=0 — the transformation is just a crossfade sharing the same width curve, guaranteeing zero geometry jumps
- From t=0.5, bars transform one by one on `0.5 + i*0.03` (0.14 duration): the hatching fades out via `1-morph`, the solid fades in via `morph`, and the label shifts from gray to dark gray on the same beat (handing visual weight to the data)
- The value text `w*420 K` hangs at the bar end at `left: calc(w% + 8px)`, fading in with the transformation
- t=0.7–0.85: all bar widths multiply by `1 + sin(t*30 + i*2.1)*0.02` in a micro-tremor — a hint that "live data is breathing"
- The header row METRICS ● LIVE slides in from 30px above during t=0.62–0.78, declaring the transformation complete

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Stagger interval | Growth 0.05/bar, transformation 0.03/bar | Growth interval can go to 0.08 to strengthen "bars lighting up one by one"; the transformation interval must stay ≤0.05, longer reads as glitchy flicker |
| Growth duration | 0.22 (outCubic) | Shrinking to 0.15 is snappier; with the stagger, ensure the last bar finishes by ≤0.5 to leave room for the transformation |
| Transformation window | Starts at 0.5, 0.14 crossfade per bar | This is the sync point — the BGM accent should land on the first bar's transformation (t=0.5) |
| Bar width data | [0.85, 0.55, 0.95, 0.4, 0.7] | Just swap in real data ratios; the longest bar ≥0.9 keeps a full-width anchor in the frame |
| Tremor amplitude | ±2%, t=0.7–0.85 | >4% reads as a jitter bug; if you don't want the "breathing" feel you can zero it, but the ending turns stiff |
| Accent color | `ACCENT='#5B8DEF'` / `ACCENT_HI='#8FB2F7'` | The two constants reskin everything; HI is used for the value text, same family but brighter |

## Known Pitfalls
- The hatch and solid layers must share the same `grow` curve — computing them separately causes a 1–2px width jump at the transformation instant, immediately breaking the "in-place re-skin" illusion
- The labels (SERIES_A etc.) are placeholder words; when swapping in real project metric names, note the fixed-width 70px label column — anything too long gets clipped
- The value `w*420` is a demo mapping; wire in a real number formatter for actual data, but keep the "rolls with grow" reading feel (final value × grow)
- The tremor is driven by global t (`sin(t*30)`); changing the total animation duration dur alters the tremor frequency and needs a fresh visual check

## Reference Implementation
demos/data/hatch-depth/
(HatchDepth.tsx)
