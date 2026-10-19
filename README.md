# youtube-tidy

Chrome extension that cleans up YouTube for me:

- homepage grid shows 6 videos per row (smaller thumbnails), configurable in the popup
- hides Shorts everywhere: shelves, grid items, search results, sidebar, channel tab
- hides the "YouTube Playables" and "Explore more topics" shelves
- hides the topic chips above the homepage grid
- trims the sidebar to Home, You and Watch later, no footer
- highlights sponsor segments on the progress bar in green and skips them

## sponsor segments

YouTube doesn't expose paid promotion timestamps. the "includes paid promotion" label covers the whole video, with no start or end. so the segments come from [SponsorBlock](https://sponsor.ajay.app), which is crowdsourced. only the `sponsor` category with the `skip` action is used.

the lookup sends the first 4 hex chars of `sha256(videoId)`, not the video id, so SponsorBlock can't tell which video you're watching.

each segment is skipped once per video load. if you seek back into it, it plays.

## install

1. open `chrome://extensions`
2. turn on developer mode
3. click "load unpacked" and pick this folder

## known gaps

- shelf hiding for Playables and "Explore more topics" matches English text, since those shelves have no stable attribute. other languages will still show them
- the Shorts sidebar entry is matched by its `title="Shorts"`, also English only
