# EzyAds — Export Features (Sum Link Video + Playable)

## Overview

The **Sum Link — Video + Playable** template supports two export modes. Both produce a ZIP containing `index.html` + `video.mp4` that can be uploaded directly to Facebook Playable Ads, Meta Ads, or other mobile ad networks.

---

## Export ZIP (Original)

**Button:** Purple — "Export ZIP"

### What it does
1. Takes the user's uploaded lead-in video
2. Merges it with a bundled `game_demo.mp4` (pre-recorded autoplay demo) using FFmpeg.wasm in the browser
3. Outputs a ZIP with:
   - `index.html` — self-contained playable ad (no iframes, fully inlined game HTML)
   - `video.mp4` — merged lead-in + game demo video

### When to use
- Fast export, no screen recording needed
- Game demo is the pre-made recording bundled with the template

### Technical notes
- FFmpeg runs entirely in the browser (no server needed) via WASM
- Requires SharedArrayBuffer → COOP/COEP headers set in `next.config.ts`
- Scale filter normalises both inputs to 1080×1920, 30fps
- Fallback: if audio concat fails (game demo has no audio track), falls back to user video audio only
- CTA uses `FbPlayableAd.onCTAClick()` for Facebook compliance, falls back to MRAID then `window.open`

---

## Export 2 — Live Recording

**Button:** Orange — "Export 2 (Live)"

### What it does
1. Asks for browser tab screen share permission (`getDisplayMedia`)
2. After permission granted, expands the game preview to fill the entire screen (fullscreen mode, 9:16 portrait)
3. Starts screen recording at 60fps
4. Automatically triggers the game's **Auto Play** mode (game plays itself)
5. Recording stops automatically 1.5s after the game's end card appears (or after 60s max fallback)
6. FFmpeg.wasm crops the center 9:16 portrait portion from the landscape tab recording, scales to 1080×1920
7. Merges user video + live recording → `video.mp4`
8. Outputs same ZIP structure as Export ZIP

### When to use
- Want the game demo to be a live, accurate recording of the actual game running
- Don't want to rely on the pre-bundled `game_demo.mp4`

### How to use
1. Upload your lead-in video in the left panel
2. Switch Play Mode to **Auto Play** (so the game plays itself)
3. Click **Export 2 (Live)**
4. Browser asks to share a tab — select this tab
5. The game goes fullscreen and starts playing automatically
6. Wait for it to finish — export downloads automatically

### Technical notes
- Screen permission is requested BEFORE fullscreen to avoid confusing the user
- 300ms delay after fullscreen CSS applies before recording starts (ensures clean first frame)
- FFmpeg crop filter: `crop=min(iw\,ih*9/16):ih:(iw-min(iw\,ih*9/16))/2:0` — works for any screen resolution
- The `videoEnded` autoplay trigger is suppressed during Export 2 to prevent two concurrent `_autoPlay()` loops
- 60s hard timeout fallback if `ezyads:gameEnded` postMessage is never received
- Game sends `ezyads:gameEnded` via `postMessage` when end card appears

---

## Facebook Playable Ads Compliance

- Game HTML is **fully inlined** — no external assets, no iframe `src` loading (Facebook rejects dynamic asset loading)
- CTA button calls `FbPlayableAd.onCTAClick()` first (required for Facebook), then MRAID, then `window.open`
- Store URL: `https://play.google.com/store/apps/details?id=com.ezygamers.sumlinknumbergame&hl=en_IN`
- MRAID-compliant for IronSource, AppLovin, Google UAC

---

## Sound Effects

The game has Web Audio API sound effects:
- **Select** — soft tone when tapping a cell
- **Match** — ascending chord when a pair is matched
- **Wrong** — descending buzz when no match
- **Win** — celebratory arpeggio when all pairs cleared

Audio is unlocked on first user interaction using the silent buffer trick (required for mobile browsers).

---

## Key Files

| File | Purpose |
|------|---------|
| `src/components/AdBuilder.tsx` | Main builder UI — both export functions live here |
| `src/lib/exportAd.ts` | `AdConfig` interface, `generateAdHtml()`, network size limits |
| `public/templates/sumlink_playable.html` | Self-contained game HTML (~1.5MB, includes base64 assets) |
| `public/game_demo.mp4` | Bundled game demo video used by Export ZIP |
| `next.config.ts` | COOP/COEP headers for FFmpeg.wasm SharedArrayBuffer |

---

## Ad Network Size Limits

| Network | Limit |
|---------|-------|
| Meta | 2MB ZIP |
| Google UAC | 5MB ZIP |
| AppLovin | 5MB ZIP |
| IronSource | 2MB single HTML |
