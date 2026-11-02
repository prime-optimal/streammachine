---
name: overlay-authoring
description: Use when the user wants an animated stream overlay (lower third, alert, call to action, banner) for OBS. Covers writing a HyperFrames-style HTML composition, building it into one self-contained HTML file with this plugin's bundled build script, and showing it in OBS through the stream-machine-obs plugin.
---

# Stream overlay authoring

An overlay here is one HTML file with one paused GSAP timeline. The bundled build script turns a component folder into a single self-contained file that an OBS Browser source plays on a loop with a transparent background. Nothing in this plugin runs a server; it ships files and a build script.

## Paths

`<plugin>` is the folder two levels above this `SKILL.md` (it holds `dist/`, `live/` and `components/`). It can be a read-only plugin cache, so never write into it. Author in the user's own workspace, for example `<workspace>/overlays/<name>/`. Use an absolute path for the output folder, because OBS needs one.

| File | Purpose |
| --- | --- |
| `<plugin>/components/lower-third/` | The template: `index.html`, `hyperframes.json`, `meta.json`. Copy this folder to start. |
| `<plugin>/dist/build-overlay.mjs` | The build script, bundled with its font subsetter (`harfbuzz-subset-*.wasm` beside it). Runs on Node 20+ or Bun with no `npm install`. |
| `<plugin>/live/driver.js` | The live driver. The build injects it into every output file. |

## Work loop

1. Copy `<plugin>/components/lower-third/` to `<workspace>/overlays/<name>/`. The folder name must be lowercase letters, digits and dashes.
2. Edit `index.html` following the rules below.
3. Build:

   ```sh
   node <plugin>/dist/build-overlay.mjs <workspace>/overlays/<name> --out <workspace>/overlays/dist
   ```

   The result is `<workspace>/overlays/dist/<name>.html`. The script prints the path and size, and one line per inlined font. It fails with a plain message when a rule is broken.
4. Look at it before OBS: open the file in a browser, or take a headless screenshot. Pause the timeline at a visible moment, for example `overlay.timeline.pause(1.5)` in the console, to inspect a frame.
5. Optional validation with the HyperFrames CLI (needs network and its own install, not part of this plugin): `npx hyperframes lint <folder>`. The HyperFrames `class="clip"` rules do not apply here; see Authoring rules.

## Authoring rules

- One root `<div data-composition-id="<id>" data-width="1920" data-height="1080" data-start="0" data-duration="<seconds>">`. `html` and `body` stay transparent.
- Build one `gsap.timeline({ paused: true })` and register it after its tweens: `window.__timelines["<id>"] = tl`. No `repeat: -1` on the timeline, no `Date.now()`, no unseeded `Math.random()`, no timers, no fetches. Everything visible is a function of timeline time. The driver sets the looping.
- Declare every editable value in `data-composition-variables` (single-quoted JSON) on `<html>`: `id`, `type` (`string`, `color`, `number`, `boolean`, `enum`), `label`, `default`, plus `maxLength` or `options` where they apply. Bind text with `data-var-text="<id>"` and colours with `var(--<id>, <default>)`. Do not write your own variable handler.
- GSAP comes from `https://cdn.jsdelivr.net/npm/gsap@<x.y.z>/dist/gsap.min.js`. It is the only remote URL the build accepts, so the overlay needs internet when OBS loads it.
- Fonts: use a system font stack, as the template does, or put a font file with its licence in `<name>/fonts/` and reference it with a relative `url()` in `@font-face`. The build subsets it to Latin, Latin-1, common punctuation, euro and trademark signs, plus every non-ASCII character that appears in `index.html`, then inlines it as woff2. Only ship fonts whose licence allows it, such as OFL fonts, and keep the licence file beside the font. A system font stack looks different on another operating system.
- Not supported, and rejected by the build: nested compositions (`data-composition-src`), timed clips (`class="clip"`), and any local file other than fonts (no images or media yet). Animate children of the one root timeline.
- Use `autoAlpha`, `x`, `y`, `scale`, and `opacity`; do not animate `left`, `top`, `width` or `height`.

## Variables

The driver reads `data-composition-variables`, then applies values as `--<id>` CSS properties, `data-var-text` text, and `data-var-src` images. It coerces values by type and drops invalid ones. Values come from, in increasing priority:

1. The declared `default`.
2. A value baked in at build time: `--set <id>=<value>`, repeatable, with `--as <file-name>` to keep variants side by side.

   ```sh
   node <plugin>/dist/build-overlay.mjs <folder> --out <dist> --as lower-third-ann --set name="Ann Lee" --set accent=#00ff88
   ```

3. A URL parameter named after the id, such as `?name=Ann%20Lee&accent=%2300ff88`. `?loop=0` plays once and holds the last frame.

The browser console exposes `overlay.update({ name: "Ben" })`, `overlay.variables()`, `overlay.replay()`, `overlay.play()` and `overlay.pause()`.

## Show it in OBS

Use the `stream-machine-obs` plugin; this plugin has no OBS tools. Its tool `stream_machine_obs_create_browser_source` takes `sceneName`, `inputName`, `width`, `height`, and exactly one of `localFile` or `url`.

- **Local file** (no server): call it with `localFile` set to the absolute path of the built `.html` file, `width: 1920`, `height: 1080`. OBS stores a file path, and the tool does not accept a query string there. Pass variables by building a variant with `--set`, as above, and use one file per variant.
- **URL parameters**: the tool accepts only `http` or `https` URLs. To use `?name=...`, serve the dist folder, for example `cd <dist> && python3 -m http.server 8765`, and pass `url: "http://127.0.0.1:8765/<name>.html?name=Ann%20Lee"`. Keep the server running while OBS needs the source. Do not start a server without saying so.
- Leave OBS custom CSS empty. The page is already transparent.
- To remove the source later, use `stream_machine_obs_remove_browser_source` with the same `sceneName` and `inputName`.

Adding a source to the program scene changes what viewers see. Ask which scene to use, prefer a scene that is not live, and never switch scenes, start or stop streaming or recording, or edit the user's existing scenes. To test, create a throwaway scene with `stream_machine_obs_create_scene`, add the source there, and remove both afterwards. Check `stream_machine_obs_list_scenes` first; if OBS is not running or the tool fails, report that and stop.

## Limits

- No live update from OBS. A change means a rebuild (or editing the URL) and refreshing the source.
- OBS plays the file in its own browser engine, and some OBS builds render browser sources only in the program scene. Confirm the result in OBS before going live.
