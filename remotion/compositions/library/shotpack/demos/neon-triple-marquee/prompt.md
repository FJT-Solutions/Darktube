---
name: neon-triple-marquee
summary: Three rows of opposite-direction neon marquees recap — BETTER/FASTER/STRONGER in giant hollow-stroke letters stacked top/middle/bottom filling the screen; odd/even rows roll horizontally at constant speed in opposite directions; the three rows light up in turn on a 1/3 phase; the whole group fades out at the end
use: Film-end theme-word repetition segment; an "afterglow" treatment for a triple-word slogan (the notch-lower ending after cel-flash-stomp slams); music-segment passage with no narration
duration: 4–5s (demo 150f: 10f fade-in + loop body + 20f fade-out)
energy: Medium-high (continuous flow + per-row pulses, no instantaneous impact)
tags: typography
---

## Intent
A single marquee row is just a webpage decoration; stack three rows, reverse alternating directions, and let brightness cycle by phase — and it becomes "theme words parading before the viewer's eyes". The linchpin is **bright/dark antiphony**: at any moment only one row is the neon protagonist, the others dimmed into thin-outline background — all three lit is a signboard accident; lighting them in turn is a recap. The opposite-direction rolling creates "encirclement": top and bottom rows roll right, the middle row rolls left, the eye is caught in the middle, words flow past from both sides endlessly — reading as "these three words never run out".

## Core Motion
- Seamless wrap-around: copies absolutely positioned at fixed unitW intervals, translated via `(frame*speed) % unitW` modulo — constant linear speed (the marquee class is the library's linear exemption)
- Hollow-stroke type: `-webkit-text-stroke`, color transparent; the brightness pulse drives three things at once — stroke width 5→8px, opacity 0.35→1, double-layer drop-shadow glow (8→30px + 20→70px) — adjusting only opacity without the glow never reads as "neon powering on"
- Antiphony phase: 45f period, 15f phase offset between rows (period/3), cosine soft envelope with each row lit only in the first 1/3 of the period and zero for the last 2/3 — guaranteeing "one lit, two dark" always holds
- Three-row palette blue/pink/amber (#4d9fff/#ff4dd2/#ffb347) on dark base #050308; the middle row reverses and goes slightly faster (14/17/14 px/f) — same-speed opposite rolling reads as a mirror; this breaks it
- Separator dots (•) after each word prop the word spacing; unitW = estimated width + 1.3× font-size gap

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Font size / leading | 300px, 350px leading filling 1080 | Row gaps >80px read as three banner ads, not a word wall |
| Roll speed | 14/17/14 px/f, middle row reversed | >25 and words become unreadable light bands; all three rows at the same speed and direction reads as a full-page pan |
| Pulse period | 45f, 15f phase offset | Period <30f makes the rows fight in flashes, reading as a glitch; >70f breaks the antiphony feel |
| Brightness range | opacity 0.35→1 + stroke 5→8px | Dark state <0.25 makes the dim rows vanish and loses the "three rows" structure |
| Glow | Double-layer drop-shadow, lit state 30/70px | Single layer or <20px reads as plain outlined type, not neon |
| Fade in/out | In 10f / out 20f on the whole group's opacity | The loop body has no beginning or end; the trim depends entirely on these two ends; hard cutting in/out reads as the asset not filling the frame |

## Known Pitfalls
- The demo was tuned against grayscale/placeholder assets — parameters are a tuning starting point, not a production lock; first real use must be re-validated on real assets
- Division with page-waterfall-wall: that card is a vertical waterfall of page screenshots for "content mass"; this card is horizontal opposite rolling of text rows for "theme-word afterglow" — the material is words, not pages, and it belongs at the film end, not mid-film
- Division with outro-group-photo-launch: the family photo is the peak final shot (element group photo + launch-show close); this card is the recap setup before the final shot or a low-cost alternate final shot — the two can chain (this card → fade out → family photo) but not stack
- Shares the "triple-word slogan" copy with cel-flash-stomp: that card slams word by word (high-energy declaration), this card rolls the group (afterglow repetition) — the same word set can be used at most once each per film, and the slam-then-roll order can't be reversed
- Copy count keeps redundancy per `ceil(1920/unitW)+3` — short words (≤4 characters) have small unitW, and insufficient copies expose a gap on the right at the wrap moment
- Production brand-color version: the three rows can share one brand color distinguished by brightness, but the glow contrast must be ≥ the demo's 0.35→1 swing, or the antiphony won't read

## Reference Implementation
demos/outro/neon-triple-marquee/
(NeonTripleMarquee.tsx)
Source film: clickup-30 61–64.5s
