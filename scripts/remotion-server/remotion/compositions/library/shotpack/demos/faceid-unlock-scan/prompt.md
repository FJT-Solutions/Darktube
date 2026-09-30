---
name: faceid-unlock-scan
summary: A scan beam sweeps up and down across the face wireframe in the center of the lock screen (3 times) while the scanning ring arc fills in sync; when done, a checkmark springs out, the lock screen scales and fades out, and desktop icons reveal in a stagger
use: App promo for security/unlock/identity-verification apps; emphasizes the ritual feel of "scan → verify → unlock"
duration: ~6.7s (200f @ 30fps, including ≥30f of stillness after settling)
energy: Medium (the scan segment has an even rhythm, the checkmark is a small peak, settling after unlock)
tags: screen
---

## Intent
Shoot "face-recognition unlock" as a readable security ritual: the lock screen's large clock is on stage, a beam sweeps up and down across the face wireframe in the center (like "reading" the face), the scanning ring arc fills in sync with the sweep, and the moment it fills the checkmark pops out, the lock screen fades out, and the desktop appears. The core is the clear three-stage progression of "scan → verify → unlock" — the beam sweep and ring arc fill must be in sync so the viewer can see "recognition is in progress, where the progress is".

## Core Motion
- Phone f4 fade in + translateY 60→0 (16f ease-out); lock screen clock/date reveals with ease-out at f14
- Beam (f38–92): a horizontal beam sweeps up and down inside the scanning ring, 18f cycle ×3 (sweep = (f−38)%18)
- Scanning ring (from f44): track circle + progress arc (strokeDashoffset circumference→0, ease-out, f44–102)
- The face is a pure vector wireframe (elliptical head + two dot eyes + arc mouth), no image textures of any kind
- Complete (f104): checkmark (green disc + check path) springs out (damping 11 / stiffness 190), copy Face ID → Unlocked
- Unlock (f128–158): lock screen opacity→0 + scale 1→1.06; desktop clock + 8 icons reveal staggered 3f each
- After settling, a 1.6s (48f) whole-device micro-breathing holds until f200

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Beam | f38–92, 18f cycle ×3, sweeping up/down inside the ring | Too short a cycle reads as "flashing", too long as "slow"; keep in sync with the ring fill |
| Ring arc fill | f44–102, dashoffset circumference→0 (ease-out) | Must be full before the 3rd sweep ends; the two segments can't detach |
| Checkmark | From f104 spring (damping 11 / stiffness 190) | The checkmark must pop on the same frame the ring finishes filling |
| Unlock | f128–158 lock screen scale 1→1.06 + opacity→0 | The lock screen scaling out overlaps the desktop reveal, reading as "entering the home screen" |
| Desktop stagger | From f128, 3f per icon (16f ease-out) | Icons settle while the lock screen is still fading; don't wait for it to fully disappear |
| Breathing | After settling, every 48f scale 1.00→1.008→1.00 | Only whole-device breathing, no local loops |

## Known Pitfalls
- The beam sweep and ring arc fill must be driven from the same source and stay in sync (same scanning window); independent timers visibly detach
- The face must be a vector wireframe, never a face image — only a grayscale wireframe matches the scanning ring's style
- The checkmark pop must land on the same frame the ring finishes filling, and the unlock must follow the checkmark; the order can't be reversed
- On unlock the lock screen scales out (no hard cut), and the desktop icons stagger in (not all at once)
- Screen content must be self-drawn vector mockups, no screenshot textures; lock screen copy is fictional demo data

## Reference Implementation
demos/mobile/faceid-unlock-scan/
(FaceIdUnlockScan.tsx)
