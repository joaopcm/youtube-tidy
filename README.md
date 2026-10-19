# youtube-tidy

Chrome extension that cleans up YouTube for me. everything below is a switch in the popup.

- homepage grid shows 6 videos per row (smaller thumbnails)
- hides Shorts everywhere: shelves, grid items, search results, channel tab. `/shorts/ID` links open as `/watch?v=ID`
- hides the "YouTube Playables" and "Explore more topics" shelves
- hides the topic chips above the homepage grid
- trims the sidebar to Home, You and Watch later, no footer. the collapsed sidebar keeps Home and You
- highlights and skips SponsorBlock segments: sponsors by default, self-promo, like & subscribe reminders, intros and outros if you turn them on

## skip segments

YouTube doesn't expose paid promotion timestamps. the "includes paid promotion" label covers the whole video, with no start or end. so the segments come from [SponsorBlock](https://sponsor.ajay.app), which is crowdsourced. a video nobody submitted yet has no segments.

the lookup sends the first 4 hex chars of `sha256(videoId)`, not the video id, so SponsorBlock can't tell which video you're watching.

each segment is skipped once per video load, and the notice has an undo button. if you seek back into it, it plays. if the SponsorBlock request fails, the player shows the error instead of failing silently.

## install

grab the zip from the latest [release](https://github.com/joaopcm/youtube-tidy/releases), unzip it, then:

1. open `chrome://extensions`
2. turn on developer mode
3. click "load unpacked" and pick the unzipped folder

to update, replace the folder with the new release and hit reload on the extension card. Chrome doesn't auto-update unpacked extensions.

## release

bump `version` in `manifest.json`, then push a matching tag. the release workflow refuses to publish if they differ.

```
git tag v0.2.0 && git push origin v0.2.0
```

## tests

YouTube changes its markup often, and the first sign is usually Shorts coming back. `test/e2e.test.mjs` loads the extension in Chromium against real YouTube pages and fails when a rule stops matching. it runs on every push and every day at 09:00 UTC.

```
npm ci
npx playwright install chromium
xvfb-run -a npm run test:e2e
```

the tests run signed out, so the homepage shelves and chips aren't covered. if YouTube blocks playback on the runner, the sponsor test is reported as skipped with YouTube's message.

## known gaps

- shelf hiding for Playables and "Explore more topics" matches English text, since those shelves have no stable attribute. other languages will still show them
