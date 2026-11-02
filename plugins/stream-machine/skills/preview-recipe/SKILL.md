---
name: preview-recipe
description: Preview a Stream Machine Twitch title through the hosted stream-machine server, build and edit a Stream Deck streamer layout with the stream-machine-streamdeck server, and browse, save, and zip the channel's Twitch clips through the hosted server.
---

# Preview and run a selected demo

Read the provider first. Use the account or device returned by that provider, not a guessed identifier.

Use this plugin's hosted `stream-machine` server for Twitch and clips. Keep every Twitch step on that connection. The local `stream-machine-obs` server provides OBS tools and `stream-machine-streamdeck` provides Stream Deck tools. Neither provides a Twitch fallback. If the Stream Machine Site plugin is also installed, keep the whole task on one connection and never replay a mutation through the other.

## Update a Twitch title

1. Call `stream_machine_twitch_channel`.
2. Call `stream_machine_twitch_preview_title` with the exact requested title.
3. Show the returned account and current and proposed titles.
4. Open the returned URL for the user's exact-title approval.
5. After approval, call `stream_machine_twitch_apply_title` with the returned preview ID.
6. Report the read-back result. Do not claim success on an error or an unknown write outcome.

An expired preview needs a new preview. A changed account or current title also needs a new review. Never automatically retry an ambiguous write.

## Build a Stream Deck layout

1. Call `stream_machine_streamdeck_inventory` and select the user's Stream Deck Original (3×5) by serial.
2. Call `stream_machine_streamdeck_layout_preview` with the serial. Optionally pass `scenes` (OBS scene names, in order, up to 5) and `channel` (a Twitch login) to add the chat, activity, and channel buttons. The tool reads OBS and writes nothing to the deck.
3. Show the user the grid: keys 0–4 are scene buttons, 5 MIC, 6 DESK AUDIO, 8 REC, 9 GO LIVE, 10 STREAM MGR, and with a channel also 11 CHAT, 12 ACTIVITY, and 14 MY CHANNEL. The preview expires after five minutes.
4. Warn that GO LIVE toggles streaming and REC toggles recording.
5. Only with the user's authorization, call `stream_machine_streamdeck_layout_apply` with the preview ID. It refuses while the Elgato Stream Deck app runs, replaces the `stream-machine` USB page, and reads each button back.
6. To edit one key, call `stream_machine_streamdeck_button_update` (`key` 0–14, optional `label`, and an `action` of scene, mic, desktop-audio, record, stream, or an HTTP/HTTPS url). To empty a key, call `stream_machine_streamdeck_button_clear`.
7. Call `stream_machine_streamdeck_release` when done. Pass `deleteLayout: true` to also delete the `stream-machine` page.

Button presses only work while the server process keeps running, and OBS actions need OBS WebSocket on `ws://localhost:4455` without a password. Distinguish configuration read-back from a physical press. Ask for one press only when physical proof is still needed.

## Browse, save, and zip clips

Use the hosted server's tools. `stream-machine-streamdeck` does not expose clip tools.

To browse or search clips, call `stream_machine_clips_library`. Pass `startedAt` and `endedAt` (RFC 3339) to filter by date and `first` (1 to 100, default 24) to set the page size. To read more, call it again with the returned `cursor` until `cursor` is `null`. Each item shows whether the clip is saved to the Site in `stored`.

To save all clips ("download all my clips"):

1. Call `stream_machine_clips_archive` with `{}`.
2. While the result has `done: false`, call it again with `{"cursor": nextCursor}`. Each call saves at most `maxClips` new clips (default 3, maximum 5).
3. When `done` is true, report the totals of saved, skipped, and failed clips across all calls. List each failed clip with its reason.

Do not retry a failed clip in the same run. A failure with an unknown outcome needs the user to ask again.

To save one clip the user names or selects, call `stream_machine_clips_archive` with `{"clipId": id}` only. It ignores `cursor` and `maxClips`, checks that the clip belongs to the connected channel, and returns the same result shape.

To download saved clips as ZIP files ("zip my clips"), call `stream_machine_clips_zip`. Present each returned link as one batch, with its clip count and size. Each link expires after 24 hours. Tell the user that only clips already saved to the Site are included, and offer to save the rest first.

## Examples

<example>
user: "Preview changing my title to Ranked grind."
assistant: "I'll read your channel, then show the exact preview and its approval link."
</example>

<example>
user: "Make a button that opens the demo page."
assistant: "I'll identify the deck and preview a button for that URL before applying the authorized setup."
</example>
