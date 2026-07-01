# Voxa landing page

The home page for [Voxa](https://github.com/przemekzur/voxa) — a private, local-first,
open-source voice assistant that lives in a small glowing orb on your desktop.

The page is a static site, no build step:

```
index.html      the home page ("Deep Space Terminal" design)
css/style.css   styles
js/main.js      voice previews, orb skin/palette switcher, platform detection
orb/            the REAL orb renderer from the Voxa app (canvas 2D, ES modules)
assets/         images + favicon
designs/        the three original design candidates (prototype format, kept for reference)
```

## Preview locally

The orb and page scripts are ES modules, so serve over HTTP (opening `index.html`
via `file://` won't work):

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

## What's live on the page

- **The hero orb is the real renderer** from the app (`orb/orb.js`), mounted as a
  `<voxa-orb>` web component. Tap it (or focus it and press Enter) to cycle
  idle → listening → speaking, and switch any of the ten skins × eight palettes
  live with the chips beneath it — the same looks the app switches by voice.
- **Soul voice previews** — every persona card's "▶ HEAR IT" button speaks its
  sample line with the browser's speech-synthesis engine as a stand-in for the
  realtime model's shipped voices (Leda, Charon, Aoede, Kore, Fenrir, Puck).
  Each soul is assigned a distinct local voice where the platform offers enough
  of them, tuned with the soul's own pitch and rate. Browsers without speech
  synthesis get a graceful fallback note.

## Design candidates

`designs/` holds the three original candidates — Deep Space Terminal (shipped as
the home page), Editorial Luxury Dark, and Engineered Minimal — in their original
prototype format (`support.js` runtime). Serve the repo and open them directly to
compare.
