# Stream Machine marketplace

This repository is a Codex plugin marketplace for Stream Machine. Install only the parts you need:

| Plugin | What it does | Where it runs |
| --- | --- | --- |
| `stream-machine` | Hosted Twitch tools, clips, and the Stream Machine menu, plus the `onboarding` and `preview-recipe` skills | ChatGPT Sites; nothing runs locally |
| `stream-machine-obs` | Local OBS WebSocket tools for scenes, alerts, and browser sources | Desktop, needs Bun and OBS |
| `stream-machine-streamdeck` | Local Stream Deck layouts for OBS scene, audio, record, and stream buttons | Desktop, needs Bun and a 15-key Stream Deck |
| `hyperframes` | HeyGen's official HyperFrames skills for writing HTML compositions and rendering them to video | Wherever skills run; rendering needs Node.js 22+ and FFmpeg |

The Stream Machine plugin source lives in [stream-machine-plugin](https://github.com/prime-optimal/stream-machine-plugin). This repository holds the generated plugin folders and the catalog at `.agents/plugins/marketplace.json`. The `hyperframes` entry installs [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) at tag `v0.9.6` straight from GitHub. To show a HyperFrames composition on stream, load its HTML in OBS with `stream-machine-obs`'s `stream_machine_obs_create_browser_source`.

## Install

Add the marketplace, then install the plugins you want:

```sh
codex plugin marketplace add prime-optimal/streammachine
codex plugin add stream-machine@stream-machine
codex plugin add stream-machine-obs@stream-machine
codex plugin add stream-machine-streamdeck@stream-machine
codex plugin add hyperframes@stream-machine
```

`codex plugin list --marketplace stream-machine` shows all four plugins. Restart the ChatGPT desktop app after installing. To update, run `codex plugin marketplace upgrade stream-machine`. To move HyperFrames to a newer release, change its `ref` in `scripts/sync.ts` and rerun the sync.

## Sync from the plugin source

The local plugins run committed bundles from `plugins/<name>/dist/`, so a Git install can start them without a build. Regenerate every plugin folder and the catalog from a packaged stream-machine-plugin checkout:

```sh
cd ../stream-machine-plugin && mise run package
cd ../streammachine && mise run sync ../stream-machine-plugin/artifacts/package/stream-machine
```

The sync prints `Synced 3 plugins from stream-machine <version>.` Commit the regenerated `plugins/` and `.agents/plugins/marketplace.json` together.
