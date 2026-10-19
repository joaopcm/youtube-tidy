const SPONSORBLOCK_API = "https://sponsor.ajay.app/api/skipSegments";

let currentVideoId = null;
let segments = [];
let skippedSegmentIds = new Set();
let enabledCategories = enabledCategoriesFrom(DEFAULT_SETTINGS);
let boundVideo = null;
let highlightLayer = null;
let pendingNotice = null;

function enabledCategoriesFrom(settings) {
  return new Set(Object.keys(SEGMENT_CATEGORIES).filter((category) => settings[SEGMENT_CATEGORIES[category].setting]));
}

function enabledSegments() {
  return segments.filter((segment) => enabledCategories.has(segment.category));
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fetchSegments(videoId) {
  const hashPrefix = (await sha256Hex(videoId)).slice(0, 4);
  const categories = encodeURIComponent(JSON.stringify(Object.keys(SEGMENT_CATEGORIES)));
  const response = await fetch(`${SPONSORBLOCK_API}/${hashPrefix}?categories=${categories}`);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`SponsorBlock responded ${response.status}`);
  const videos = await response.json();
  const video = videos.find((entry) => entry.videoID === videoId);
  if (!video) return [];
  return video.segments
    .filter((entry) => entry.actionType === "skip")
    .map((entry) => ({ id: entry.UUID, category: entry.category, start: entry.segment[0], end: entry.segment[1] }));
}

function mainVideo() {
  return document.querySelector("#movie_player video.html5-main-video");
}

function renderHighlights() {
  highlightLayer?.remove();
  highlightLayer = null;
  const video = mainVideo();
  const progressBar = document.querySelector("#movie_player .ytp-progress-bar");
  const visibleSegments = enabledSegments();
  if (!video || !progressBar || !visibleSegments.length || !Number.isFinite(video.duration)) return;

  const layer = document.createElement("div");
  layer.className = "yt-tidy-segments";
  for (const { category, start, end } of visibleSegments) {
    const mark = document.createElement("div");
    mark.className = "yt-tidy-segment";
    mark.style.left = `${(start / video.duration) * 100}%`;
    mark.style.width = `${((end - start) / video.duration) * 100}%`;
    mark.style.background = SEGMENT_CATEGORIES[category].color;
    layer.append(mark);
  }
  progressBar.append(layer);
  highlightLayer = layer;
}

function formatTime(seconds) {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function showToast(message, action) {
  const player = document.querySelector("#movie_player");
  if (!player) return;
  player.querySelector(".yt-tidy-toast")?.remove();

  const toast = document.createElement("div");
  toast.className = "yt-tidy-toast";
  toast.textContent = message;
  if (action) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      action.run();
      toast.remove();
    });
    toast.append(button);
  }
  player.append(toast);
  setTimeout(() => (toast.style.opacity = "0"), 4000);
  setTimeout(() => toast.remove(), 4300);
}

function skipActiveSegment(video) {
  const active = enabledSegments().find(
    ({ id, start, end }) => !skippedSegmentIds.has(id) && video.currentTime >= start && video.currentTime < end,
  );
  if (!active) return;
  skippedSegmentIds.add(active.id);
  video.currentTime = active.end;
  const { toastLabel } = SEGMENT_CATEGORIES[active.category];
  showToast(`Skipped ${toastLabel} (${formatTime(active.end - active.start)})`, {
    label: "Undo",
    run: () => (video.currentTime = active.start),
  });
}

function onTimeUpdate(event) {
  if (pendingNotice) {
    showToast(pendingNotice);
    pendingNotice = null;
  }
  if (enabledSegments().length && !highlightLayer?.isConnected) renderHighlights();
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
  pendingNotice = null;
  renderHighlights();
  if (!videoId) return;

  try {
    const fetched = await fetchSegments(videoId);
    if (videoId !== currentVideoId) return;
    segments = fetched;
    renderHighlights();
  } catch (error) {
    if (videoId !== currentVideoId) return;
    pendingNotice = `Couldn't load skip segments: ${error.message}`;
  }
}

document.addEventListener("yt-navigate-finish", onNavigate);
onNavigate();

loadSettings().then((settings) => {
  enabledCategories = enabledCategoriesFrom(settings);
  renderHighlights();
});
onSettingsChanged(async () => {
  enabledCategories = enabledCategoriesFrom(await loadSettings());
  renderHighlights();
});
