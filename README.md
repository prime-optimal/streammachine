# Stream Machine marketplace

This repository is a Codex plugin marketplace for Stream Machine. Install only the parts you need:

| Plugin | What it does | Where it runs |
| --- | --- | --- |
| `stream-machine` | Hosted Twitch tools, clips, and the Stream Machine menu, plus the `onboarding` and `preview-recipe` skills | ChatGPT Sites; nothing runs locally |
| `stream-machine-obs` | Local OBS WebSocket tools for scenes, alerts, and browser sources | Desktop, needs Bun and OBS |
| `stream-machine-streamdeck` | Local Stream Deck layouts for OBS scene, audio, record, and stream buttons | Desktop, needs Bun and a 15-key Stream Deck |
| `stream-machine-hyperframes` | An authoring skill, a bundled build script, and a lower-third template for animated OBS overlays written as HTML | Wherever skills run; the build script needs Node.js 20+ or Bun, no install step |

The Stream Machine plugin source lives in [stream-machine-plugin](https://github.com/prime-optimal/stream-machine-plugin). This repository holds the generated plugin folders and the catalog at `.agents/plugins/marketplace.json`. `stream-machine-hyperframes` is authored here, not generated: its skill, template, live driver, and build script are committed under `plugins/stream-machine-hyperframes/`. To show an overlay on stream, the skill loads the built HTML in OBS with `stream-machine-obs`'s `stream_machine_obs_create_browser_source`. See `plugins/stream-machine-hyperframes/THIRD_PARTY_NOTICES.txt` for the licences of the bundled build script.

## Install

Add the marketplace, then install the plugins you want:

```sh
codex plugin marketplace add prime-optimal/streammachine
codex plugin add stream-machine@stream-machine
codex plugin add stream-machine-obs@stream-machine
codex plugin add stream-machine-streamdeck@stream-machine
codex plugin add stream-machine-hyperframes@stream-machine
```

`codex plugin list --marketplace stream-machine` shows all four plugins. Restart the ChatGPT desktop app after installing. To update, run `codex plugin marketplace upgrade stream-machine`.

## Sync from the plugin source

The local plugins run committed bundles from `plugins/<name>/dist/`, so a Git install can start them without a build. Regenerate the three generated plugin folders and the catalog from a packaged stream-machine-plugin checkout:

```sh
cd ../stream-machine-plugin && mise run package
cd ../streammachine && mise run sync ../stream-machine-plugin/artifacts/package/stream-machine
```

The sync deletes and rewrites only `plugins/stream-machine`, `plugins/stream-machine-obs`, and `plugins/stream-machine-streamdeck`. For `stream-machine-hyperframes` it rewrites only the two manifests and the catalog entry. It prints `Synced 4 plugins from stream-machine <version>.` Commit the regenerated `plugins/` and `.agents/plugins/marketplace.json` together.

## HyperFrames plugin

The build script is bundled from `src/hyperframes/build-overlay.mjs` and its one dependency, `subset-font`, which is pinned in `package.json`. After changing either, rebuild and commit `plugins/stream-machine-hyperframes/dist/`:

```sh
mise run build:hyperframes
```

The result is `dist/build-overlay.mjs` plus the `harfbuzz-subset-*.wasm` it loads. It runs as `node dist/build-overlay.mjs <component-dir> --out <dir>` without `npm install`. The build script and live driver are adapted from our own TwitchCon overlay tooling. The template uses system fonts and ships no font files; GSAP loads from the jsDelivr CDN when OBS opens the overlay.
