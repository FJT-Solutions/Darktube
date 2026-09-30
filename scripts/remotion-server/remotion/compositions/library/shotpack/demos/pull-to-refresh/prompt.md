---
name: pull-to-refresh
summary: A finger pulls the feed down from the top: the list shifts down as a whole, the circular indicator at the top grows and rotates 0→180°; after dragging past the threshold and releasing, the indicator spins loading (360°×3), the list springs back and swaps in new content cards
use: App promo showing pull-to-refresh on a feed/social/timeline page; emphasizes the three-beat feel of "gesture → loading → content refresh"
duration: ~7s (210f @ 30fps, including ≥30f of stillness after settling)
energy: Medium (pull charging → release loading spin → content refresh; the rhythm goes still, to active, then settles)
tags: interaction
---

## Intent
Shoot "pull to refresh" — the high-frequency gesture — as a readable three-beat: (1) pull charging (the list follows the finger down, the indicator grows and rotates, and the rotation amount equals the pull amount); (2) release loading (the indicator spins idle, reading as "requesting new data"); (3) content refresh (the list springs back, new cards slide in staggered). The core is "gesture and state one-to-one" — pull this much, rotate this much; the loading state only starts past the threshold — so the viewer instantly understands the refresh trigger and its result.

## Core Motion
- Phone f4 fade in + translateY 60→0 (16f ease-out); three old content cards stagger in from f14, 4f per card
- Finger moves in from the top from f44 (y 80), drags down to y 220 at f52–94 (ease-out)
- Pull coupling (f52–94): list translateY 0→120 (ease-out); indicator grows by the same amount scale 0.35→1.1 and rotates 0→180°; past the 85% threshold the indicator stroke turns white (armed state)
- Release (f94): finger fades out within 8f; indicator spins idle from f98, rotate 360°×3 (56f ease-out), list stays in the pulled-down position
- Refresh (f150): list springs back to 0 with 22f ease-out; new content cards slide in staggered from f150, 5f per card (translateY 12→0 + opacity)
- After settling, a 1.6s (48f) whole-device micro-breathing holds until f210

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Pull distance | f52–94, list translateY 0→120px (ease-out) | 120px is a "perceivable" pull inside a phone; too little feels weak |
| Indicator growth | scale 0.35→1.1 + rotate 0→180° | The rotation must be linearly tied to the pull distance to read as "progress" |
| Armed threshold | Stroke turns white at 85% pull | Without the armed state, the "about to trigger" cue before release is missing |
| Loading spin | From f98, 360°×3 (56f ease-out) | The idle spin must be continuous, never jerk-stop |
| Spring back | f150–172 ease-out 120→0 | The spring-back swaps content at the same time; don't spring back first and then swap out of nowhere |
| Refresh stagger | From f150, 5f per card (14f ease-out) | New cards differ from old ones in labels, so the viewer can tell "it refreshed" |

## Known Pitfalls
- The indicator rotation angle must derive from the pull distance (0→180°), never fixed rotation — otherwise "pull charging" is invisible
- After release, the loading spin keeps the list in the pulled-down position; it springs back only when loading completes (SNAP); the order can't be reversed
- New content must be clearly different from the old (different titles/thumbnails), otherwise the "refresh" is invisible
- Both pull and spring-back need easing (ease-out); linear displacement looks mechanical
- Screen content must be self-drawn vector mockups, no screenshot textures; cards use fictional demo copy

## Reference Implementation
demos/mobile/pull-to-refresh/
(PullToRefresh.tsx)
