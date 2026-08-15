---
name: scramble
summary: A monospace whole line of characters first scrambles rapidly every 2 frames, then locks into the real characters one by one left-to-right; each lock frame flashes a blue-white highlight — a seed-driven reproducible decryption feel
use: Tech-style opening titles; version/codename reveals; machine-voiced beats like "system ready" or "data unlocked"
duration: ~3.2s (96f@30fps)
energy: Medium-high (continuous high-frequency character noise, no single impact point)
---

## Intent
Among the three "character-forming" moves for the same title, the typewriter is a person
writing, the flip is a machine announcing, and scramble-lock is **a machine computing** —
first full-screen noise meaning "not solved yet," then biting down the real characters
one by one left-to-right. It carries a native hacker/decryption register, suited to tech
product openers; but it's also the pickiest about copy: characters get individually
called out, so character count IS beat count.

## Core Motion
- All characters scramble simultaneously from a pool of 47 uppercase letters + digits +
  symbols; **characters swap every 2 frames** (`bucket = floor(frame/2)`, ~48 re-rolls
  across the 96f film)
- Lock points spread linearly in character order: `lockAt = 0.25 + (i/n)·0.6 + rand(i·7)·0.06`
  — first character locks at frame 24, last at frame 82, each with ≤6f random jitter
  breaking the mechanical evenness
- Lock-frame flash: `flash = 1 - seg(t, lockAt, lockAt+0.1)`; when flash>0.4 the character
  color lifts from #e8eaf0 to #dff3ff with a `0 0 flash·18px` blue-white halo,
  decaying within ~3f
- First 6f fully blank (`t < 0.06` outputs spaces) — one beat of empty screen first,
  so the noise reads as "computing begins," not "always flickering"
- Scramble characters and flash jitter all run on the seed hash `rand(seed)`,
  **Math.random forbidden** — the same frame number always renders the same picture
- Unlocked characters stay dim at #3d4560 (near background), brightening only after
  locking — the brightness differential itself is a progress bar

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Placeholder copy | `TEMPLATE MOTION DEMO`, 20 characters | Character count directly sets the stagger density: <10 characters lock too fast to read "one by one," >30 makes the last character wait until the film's end |
| Lock window | global 0.25→0.85 (24f→82f) | Start before 0.2 leaves the noise segment too short to establish; end after 0.9 leaves no still ending |
| Lock jitter | `rand(i·7)·0.06` (≤6f) | Removing it gives perfect evenness, reading as a progress bar instead of "biting down one by one"; >0.12 scrambles the order |
| Swap frequency | every 2 frames (15/sec) | Every frame blurs into a gray band; 4+ frames reads as "slowly flipping," not high-speed computing |
| Lock flash | window 0.1 (~3f), halo 18px peak | This flash is the visual body of "biting down" — removing it leaves only character swaps; >30px adjacent halos merge |
| Font and spacing | SF Mono/Menlo 34px, `letter-spacing:2px`, slot `min-width:0.62em` | Monospace + fixed slot width is mandatory; proportional fonts jitter the whole line with every scramble character width |
| Opening blank | `t < 0.06` (first 6f) | Opening straight into noise reads as a fault flicker; >12f of blank becomes a black gap in the edit |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- **Keep the character count near 20 when swapping in project copy**: lockAt spreads by
  `i/n` normalization, so changing the count rescales lock intervals — an 8-character
  title fully locks within half a second (no decryption process to read), a 40-character
  title makes the last character wait until 82f (earlier locks have already "gone cold")
- Must be a monospace font: slot width is hard-coded `0.62em`; under proportional fonts
  `#`/`W`/`I` differ in width and the whole line twitches with every re-roll
- Space characters are explicitly skipped (never part of the scramble), so word gaps
  persist throughout — space positions in the copy are the rhythm's breathing points;
  splitting a long title into 3–4 words reads better than one long string
- Division of labor with split-flap-title / typewriter cards: those form characters
  **mechanically/artificially**, this card solves them **algorithmically**; in one film,
  each "character-forming" move appears only once — repetition devalues it

## Reference Implementation
demos/typography/scramble/
(Scramble.tsx)
