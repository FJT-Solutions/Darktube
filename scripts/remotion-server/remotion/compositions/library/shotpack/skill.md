---
name: shotpack-remote
description: Use Shotpack remote Remotion shot recipes via public URLs (no install). Fetch llms.txt → catalog.json → demo.tsx. Use when building product promo shots, Remotion motion, or when the user names a Shotpack shot id.
---

# Shotpack (remote)

This is a **URL-based** skill. Do not expect local `demos/` — always HTTP-fetch.

## Mandatory flow

1. `GET https://getshotpack.com/llms.txt`
2. `GET https://getshotpack.com/api/catalog.json`
3. Pick `shots[i]` where `tier` is `free` (or unlocked).
4. `GET` `card` then `tsx` URLs. Adapt; do not downgrade known pitfalls.
5. If `tier` is `paid` and `tsx` is null — tell the user to unlock the $9.9 core pack.

## Rules

- Reference TSX is the parameter truth (easing, frames, masks).
- Deterministic renders only.
- One motion idea per shot; hold after key information lands.
- Free shots: full card + TSX. Paid: preview only until purchase.

## Origin

https://getshotpack.com
