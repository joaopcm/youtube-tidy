const SPONSORBLOCK_API = "https://sponsor.ajay.app/api/skipSegments";

let currentVideoId = null;
let segments = [];
let skippedSegmentIds = new Set();
let skipSponsors = DEFAULT_SETTINGS.skipSponsors;
let boundVideo = null;
let highlightLayer = null;

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fetchSponsorSegments(videoId) {
  const hashPrefix = (await sha256Hex(videoId)).slice(0, 4);
  const categories = encodeURIComponent(JSON.stringify(["sponsor"]));
  const response = await fetch(`${SPONSORBLOCK_API}/${hashPrefix}?categories=${categories}`);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`SponsorBlock responded ${response.status} for ${videoId}`);
  const videos = await response.json();
  const video = videos.find((entry) => entry.videoID === videoId);
  if (!video) return [];
  return video.segments
    .filter((entry) => entry.actionType === "skip")
    .map((entry) => ({ id: entry.UUID, start: entry.segment[0], end: entry.segment[1] }));
}

function mainVideo() {
  return document.querySelector("#movie_player video.html5-main-video");
}

function renderHighlights() {
  highlightLayer?.remove();
  highlightLayer = null;
  const video = mainVideo();
  const progressBar = document.querySelector("#movie_player .ytp-progress-bar");
  if (!video || !progressBar || !segments.length || !Number.isFinite(video.duration)) return;

  const layer = document.createElement("div");
  layer.className = "yt-tidy-segments";
  for (const { start, end } of segments) {
    const mark = document.createElement("div");
    mark.className = "yt-tidy-segment";
    mark.style.left = `${(start / video.duration) * 100}%`;
    mark.style.width = `${((end - start) / video.duration) * 100}%`;
    layer.append(mark);
  }
  progressBar.append(layer);
  highlightLayer = layer;
}

function formatTime(seconds) {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function showToast(message) {
  const player = document.querySelector("#movie_player");
  if (!player) return;
  const toast = document.createElement("div");
  toast.className = "yt-tidy-toast";
  toast.textContent = message;
  player.append(toast);
  setTimeout(() => (toast.style.opacity = "0"), 2500);
  setTimeout(() => toast.remove(), 2800);
}

function skipActiveSegment(video) {
  if (!skipSponsors) return;
  const active = segments.find(
    ({ id, start, end }) => !skippedSegmentIds.has(id) && video.currentTime >= start && video.currentTime < end,
  );
  if (!active) return;
  skippedSegmentIds.add(active.id);
  video.currentTime = active.end;
  showToast(`Skipped sponsor (${formatTime(active.end - active.start)})`);
}

function onTimeUpdate(event) {
  if (segments.length && !highlightLayer?.isConnected) renderHighlights();
  skipActiveSegment(event.target);
}

function bindVideo() {
  const video = mainVideo();
  if (!video || video === boundVideo) return;
  boundVideo = video;
  video.addEventListener("timeupdate", onTimeUpdate);
  video.addEventListener("durationchange", renderHighlights);
}

async function onNavigate() {
  bindVideo();
  const videoId = location.pathname === "/watch" ? new URLSearchParams(location.search).get("v") : null;
  if (videoId === currentVideoId) return;
  currentVideoId = videoId;
  segments = [];
  skippedSegmentIds = new Set();
  renderHighlights();
  if (!videoId) return;

  try {
    const fetched = await fetchSponsorSegments(videoId);
    if (videoId !== currentVideoId) return;
    segments = fetched;
    renderHighlights();
  } catch (error) {
    console.warn("[YouTube Tidy] could not load sponsor segments:", error);
  }
}

document.addEventListener("yt-navigate-finish", onNavigate);
onNavigate();

loadSettings().then((settings) => (skipSponsors = settings.skipSponsors));
chrome.storage.onChanged.addListener((changes) => {
  if (changes.skipSponsors) skipSponsors = changes.skipSponsors.newValue;
});
