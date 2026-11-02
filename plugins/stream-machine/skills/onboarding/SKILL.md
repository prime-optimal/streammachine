---
name: onboarding
description: Route Twitch, OBS, and Stream Deck calls to their respective Stream Machine servers.
---

# Start with Stream Machine

Stream Machine Desktop registers three servers. The hosted `stream-machine` server provides Twitch, clips, and the Stream Machine menu. The local `stream-machine-obs` server provides OBS tools. The local `stream-machine-streamdeck` server provides Stream Deck tools. Use the hosted server for every Twitch call.

For Twitch, call the hosted server's `stream_machine_twitch_preflight`, then `stream_machine_twitch_status`. The first hosted call asks the user to sign in through Sites and connect Twitch. If the sign-in link does not appear, open the [Stream Machine Site](https://stream-machine-oauth-test.tinycocoa22.chatgpt.site). Sites sign-in identifies the caller. Twitch consent connects that caller's channel. Read status after consent to verify the account and scopes.

After status verifies the account, call the hosted `stream_machine_open` to open the Stream Machine menu, then offer the title preview. Use `preview-recipe` for the exact title preview and browser approval. Open the returned connection or approval URL through the host's navigation. Never replay a failed mutation through another provider.

On web and mobile, the local server cannot start. The user installs the Stream Machine Site plugin there and uses its Twitch tools. If the user has both this package and the Site plugin on desktop, the Twitch tool names duplicate. Keep Twitch on the hosted `stream-machine` server for the whole task.

The user lands on Home. Home confirms "Connected to Twitch as <name>", shows a channel snapshot from `stream_machine_twitch_snapshot`, and lists suggestion cards. OBS and Stream Deck controls are not in the hosted menu. Use `stream-machine-obs` for OBS and `stream-machine-streamdeck` for Stream Deck on a desktop host.

## Check the connection

Read before you act:

- OBS: `stream_machine_obs_preflight`.
- Stream Deck: `stream_machine_streamdeck_inventory`.

A missing connection does not block unrelated work. Never substitute mock results for a failed real check. Never request tokens or passwords in chat.

## Use OBS

OBS controls target the running local WebSocket server. Showing an alert selects the Stream Machine demo scene. Never start or stop broadcasting or recording.

## Use Stream Deck

The Stream Deck tools use the original 15-key USB device. Call `stream_machine_streamdeck_layout_preview` to build a streamer layout from the OBS scenes, then show the grid. Apply with `stream_machine_streamdeck_layout_apply` only when the user has authorized the setup. The GO LIVE button toggles streaming, so say so before applying. Keep one USB owner running, and do not run the Elgato Stream Deck app at the same time. Release the deck with `stream_machine_streamdeck_release` before another process claims it. USB pages are separate from Elgato profiles.

## Examples

<example>
user: "Show an OBS alert."
assistant: "I'll check OBS, then show the requested message in the Stream Machine demo scene. Broadcasting and recording stay unchanged."
</example>

<example>
user: "Connect my Twitch account."
assistant: "I'll open the Stream Machine Site connection and verify which account connected. Then I'll open the Stream Machine menu and offer a title preview."
</example>
