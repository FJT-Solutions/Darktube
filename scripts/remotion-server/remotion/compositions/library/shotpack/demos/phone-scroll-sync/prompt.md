---
name: phone-scroll-sync
summary: Feed content inside the phone screen scrolls in sync with a finger swiping up (two swipes with a pause in between); the finger is a vector shape and floats slightly during the pause; finally the finger fades out and the whole device breathes to settle
use: App promo showing the "scroll-browse" experience of a content feed; emphasizes the sync between content and gesture
duration: ~6s (180f @ 30fps, including ≥30f of stillness after settling)
energy: Medium (segmented progression: the two scrolls each have their own start/stop, no impact peak)
tags: interaction
---

## Intent
Shoot "scrolling phone content with a finger" — the most everyday app gesture — as a shot: content displacement strictly follows the finger swiping up, with a pause arranged between the two swipes (content still, finger floating slightly), so the viewer can see the "scrolling" itself. The core is a one-to-one sync between gesture and content — how much the content moves is entirely decided by the finger.

## Core Motion
- Single hero (feed inside the phone + finger) full action arc: f4 phone fades in; f26 the finger enters from the right edge of the screen (fade in over 10f, rotated 8° overall)
- Two scrolls: f34–66 finger swipes up 140px (ease-out), content moves up 200px in sync; f86–118 the second swipe uses the same parameters; f66–76 / f118–134 two pauses — content still, finger floating ±3px (sin wave)
- Content structure: dark Discover header at top + 12 grayscale cards (two copies stitched, so the bottom still has cards after both scrolls, no white gap)
- f142 finger fades out (10f) → from f152 the whole device breathes on a 1.6s cycle, holding until f180
- The finger is vector (semi-transparent capsule + fingertip circle + drop-shadow), no Lottie gesture assets

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Scroll displacement | Each swipe: finger up 140px ↔ content up 200px (ratio 1:1.43, ease-out) | Content moving more than the finger creates "content inertia"; too much looks wrong |
| Segment rhythm | Each scroll 32f + pause 10–16f; two segments total 84f | The pause is key to "reading the content"; don't remove it |
| Finger | 36×150px capsule + fingertip circle, rotated 8°, drop-shadow; floats ±3px during pauses | The finger is the "operator's viewpoint" and always points at the content |
| Content volume | 12 cards (two 6-card copies stitched); no white gap at the bottom | Too few cards exposes blank space at the bottom (lesson from previous case) |
| Finger in/out | f26 fade in 10f / f142 fade out 10f | Too fast in/out looks abrupt; after the fade-out the content stays still |
| Breathing | After settling, every 48f (1.6s) scale 1.00→1.008→1.00 | Only whole-device breathing, no local loops |

## Known Pitfalls
- Screen content must be self-drawn vector mockups (grayscale feed), no screenshot textures
- Scroll displacement must sync with the finger, advancing in segments (scroll a bit, pause, scroll); never scroll uniformly forever
- Content must be long enough (two copies stitched), otherwise the bottom blank shows after the two scrolls
- During pauses the finger floats slightly but must not move much, otherwise it reads as "still scrolling"
- Feed copy uses fictional data, not pointing at a real product

## Reference Implementation
demos/mobile/phone-scroll-sync/
(PhoneScrollSync.tsx)
