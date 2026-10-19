import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const EXTENSION_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPONSOR_AT_START_VIDEO_ID = "kWuq8TPY58Y";

let profileDir;
let context;
let page;

before(async () => {
  profileDir = await mkdtemp(path.join(tmpdir(), "youtube-tidy-e2e-"));
  context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    viewport: { width: 1600, height: 1000 },
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      "--autoplay-policy=no-user-gesture-required",
      "--mute-audio",
    ],
  });
  page = await context.newPage();
});

after(async () => {
  await context?.close();
  await rm(profileDir, { recursive: true, force: true });
});

async function open(url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
}

function visibleHrefs(selector) {
  return page.evaluate(
    (selector) =>
      [...document.querySelectorAll(selector)]
        .filter((element) => element.offsetParent)
        .map((element) => element.querySelector("a")?.getAttribute("href")),
    selector,
  );
}

async function waitForPlayback() {
  const deadline = Date.now() + 90000;
  let state;
  while (Date.now() < deadline) {
    state = await page.evaluate(() => {
      const visibleText = (selector) => {
        const element = document.querySelector(selector);
        return element?.offsetParent ? element.textContent.replace(/\s+/g, " ").trim() : null;
      };
      const blocked = visibleText(".ytp-error") ?? visibleText("yt-playability-error-supported-renderers");
      const video = document.querySelector("#movie_player video.html5-main-video");
      return {
        blocked,
        playing: Boolean(video?.duration > 0 && video.currentTime > 0 && !document.querySelector(".ad-showing")),
        readyState: video?.readyState,
        paused: video?.paused,
        currentTime: video?.currentTime,
        adShowing: Boolean(document.querySelector(".ad-showing")),
        url: location.href,
      };
    });
    if (state.blocked || state.playing) return state;
    await page.waitForTimeout(1000);
  }
  return state;
}

test("channel grid shows 6 videos per row", async () => {
  await open("https://www.youtube.com/@mkbhd/videos");
  const firstRowCount = await page.evaluate(() => {
    const items = [...document.querySelectorAll("ytd-rich-item-renderer")].filter((item) => item.offsetParent);
    const firstTop = items[0]?.getBoundingClientRect().top;
    return items.filter((item) => Math.abs(item.getBoundingClientRect().top - firstTop) < 2).length;
  });
  assert.equal(firstRowCount, 6);
});

test("channel Shorts tab is hidden", async () => {
  await open("https://www.youtube.com/@mkbhd/videos");
  const tabExists = await page.locator('yt-tab-shape[tab-title="Shorts"]').count();
  assert.ok(tabExists, 'no yt-tab-shape[tab-title="Shorts"] on the page, the selector is stale');
  assert.equal(await page.locator('yt-tab-shape[tab-title="Shorts"]').isVisible(), false);
});

test("search results show no Shorts", async () => {
  await open("https://www.youtube.com/results?search_query=iphone");
  const visibleShorts = await page.evaluate(
    () => [...document.querySelectorAll('a[href^="/shorts/"]')].filter((link) => link.offsetParent).length,
  );
  assert.equal(visibleShorts, 0);
});

test("sidebar keeps only Home, You and Watch later", async () => {
  await open("https://www.youtube.com/");
  const hrefs = await visibleHrefs("ytd-guide-renderer ytd-guide-entry-renderer");
  assert.ok(hrefs.includes("/"), `Home is missing, visible entries: ${hrefs}`);
  for (const href of hrefs) assert.ok(["/", "/feed/you", "/playlist?list=WL"].includes(href), `unexpected sidebar entry ${href}`);
  assert.equal(await page.locator("ytd-guide-renderer #footer").isVisible(), false);
});

test("collapsed sidebar keeps only Home and You", async () => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await open("https://www.youtube.com/");
  const hrefs = await visibleHrefs("ytd-mini-guide-renderer ytd-mini-guide-entry-renderer");
  await page.setViewportSize({ width: 1600, height: 1000 });
  assert.deepEqual(hrefs.sort(), ["/", "/feed/you"]);
});

test("recommendations next to the video use small thumbnails", async () => {
  await open(`https://www.youtube.com/watch?v=${SPONSOR_AT_START_VIDEO_ID}`);
  const widths = await page.evaluate(() =>
    [...document.querySelectorAll("#secondary .ytLockupViewModelHorizontal yt-thumbnail-view-model")]
      .filter((thumbnail) => thumbnail.offsetParent)
      .map((thumbnail) => Math.round(thumbnail.getBoundingClientRect().width)),
  );
  assert.ok(widths.length, "no horizontal lockup thumbnails in #secondary, the selector is stale");
  for (const width of widths) assert.equal(width, 168);
});

test("Shorts links open in the normal player", async () => {
  await open("https://www.youtube.com/@mkbhd/shorts");
  const shortsHref = await page.getAttribute('a[href^="/shorts/"]', "href");
  assert.ok(shortsHref, "no Shorts link found on @mkbhd/shorts to test with");
  const shortsId = shortsHref.split("/")[2];
  await page.goto(`https://www.youtube.com/shorts/${shortsId}`);
  await page.waitForURL(`**/watch?v=${shortsId}`, { timeout: 15000 });
});

test("sponsor at the start of a video is highlighted and skipped", async (t) => {
  const response = await fetch(
    `https://sponsor.ajay.app/api/skipSegments?videoID=${SPONSOR_AT_START_VIDEO_ID}&categories=${encodeURIComponent('["sponsor"]')}`,
  );
  assert.ok(response.ok, `SponsorBlock responded ${response.status} for ${SPONSOR_AT_START_VIDEO_ID}`);
  const [{ segment }] = await response.json();
  const [, sponsorEnd] = segment;

  await page.goto(`https://www.youtube.com/watch?v=${SPONSOR_AT_START_VIDEO_ID}`, { waitUntil: "domcontentloaded" });
  const player = await waitForPlayback();
  if (player.blocked) return t.skip(`YouTube refused playback in this environment: ${player.blocked}`);
  if (!player.playing) {
    await page.screenshot({ path: "test-results/sponsor-timeout.png" });
    assert.fail(`video never started playing within 90s, last player state: ${JSON.stringify(player)}`);
  }

  await page.waitForFunction((end) => document.querySelector("#movie_player video.html5-main-video").currentTime >= end, sponsorEnd, {
    timeout: 15000,
  });
  assert.equal(await page.locator(".yt-tidy-segment").count(), 1);
  assert.match(await page.locator(".yt-tidy-toast").textContent(), /^Skipped sponsor/);
});
