---
name: mobile-chart-live
summary: A real-time line chart on a phone data page ("Active sessions") grows point by point from the left edge to the right, the current-value counter rolls with the progress, two stat cards on top stagger in, on a light grid backdrop, and finally the whole device breathes to settle
use: App promo showing a data/analytics page; emphasizes the sense of real-time data growth
duration: ~6s (180f @ 30fps, including ≥30f of stillness after settling)
energy: Medium (line growth + counter)
tags: data
---

## Intent
Shoot "the data page refreshing in real time" as a line growing point by point from the left end to the right: the rhythm of the line's growth makes the viewer feel data "flowing in live", the current-value counter in the top right rolls in sync with the growth progress (128→264) giving a quantitative reading, and the two stat cards on top stagger in to show secondary metrics. The core is the sync between "growth" and "counting" — wherever the line draws, the number follows. Vector mockups, pure frame functions, deterministic rendering.

## Core Motion
- Single hero (phone data page) full action arc: f4 phone fades in + moves up 60px to settle (16f ease-out)
- Line growth f22→110: SVG polyline revealed segment by segment by point count (out cubic), 12 data points across 88f appearing point by point, the line head carrying a solid dot marking the "live write point"
- The current-value counter syncs with growth progress: f22→110 rolls from 128 to 264 (out cubic, tabular-nums)
- Stat cards stagger: from f34 two cards 6f apart, 12f fade-in each + 12px rise
- Chart light grid of 4 horizontal lines (#ececf0) as backdrop, staying put with the cards, not animated
- After settling, a whole-device 1.6s (48f) breathing cycle (scale 1.00→1.008→1.00), holding until f180

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Phone entrance | f4 fade in + translateY 60→0 (16f, ease-out) | Moving up too much reads as "bouncy", too little gives no entrance feel |
| Line growth | f22–110, polyline revealed by point count (out cubic), 12 points across 88f | A growth window <60f reads as "instant pop", >140f drags |
| Current value | f22→110 rolls from 128 to 264 (same interpolation as progress) | The counter must sync with the line's growth; it can't arrive early or late |
| Stat card stagger | From f34, 6f apart, 12f fade-in + translateY 12px | Gaps <4f blur together, >10f drags |
| Light grid | 4 horizontal lines #ececf0, staying put with the cards | The grid must be "light"; it can't steal focus from the line |
| Breathing | After settling, every 48f (1.6s) scale 1.00→1.008→1.00 | Only whole-device breathing, no local loops |
| Palette | White background #fff, ink line #18181b, cards #f6f6f4, stage beige-gray #e8e6e1 | The line and stage background must differ in lightness for readability |

## Known Pitfalls
- The line must be revealed by point count (slicing the point array), never clipped along the path length — otherwise the growth feels like "drawing a stroke" rather than "points flowing in"
- The current-value counter must share the same interpolation parameter as progress — wherever the line is, the number is; tabular-nums prevents digit jitter
- The grid stays light gray (#ececf0) and put with the cards, no entrance animation
- The line-head dot is coupled to visibleCount so the line's end is always the write point
- Data and copy use fictional demo values, not pointing at a real product

## Reference Implementation
demos/mobile/mobile-chart-live/
(MobileChartLive.tsx)
