const STORAGE_KEY = "liverary.mobileFlow.v1";
const MASCOT_URL = "./assets/gomduri.png";
const MAX_HISTORY = 100;
const FOCUS_GOAL_SECONDS = 5 * 60 * 60;
const ALLOWED_STATUS = new Set(["ready", "running", "paused"]);

const DEFAULT_LOCATION = {
  libraryId: "future",
  libraryName: "미래도서관",
  floor: "2층",
  zoneId: "window",
  zoneName: "창가 자유석",
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function validEpoch(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function cleanText(value, fallback, maxLength = 30) {
  const text = String(value || "").replace(/[<>]/g, "").trim();
  return text ? text.slice(0, maxLength) : fallback;
}

function normalizeLocation(value = {}) {
  return {
    libraryId: cleanText(value.libraryId, DEFAULT_LOCATION.libraryId, 24),
    libraryName: cleanText(value.libraryName, DEFAULT_LOCATION.libraryName, 24),
    floor: cleanText(value.floor, DEFAULT_LOCATION.floor, 12),
    zoneId: cleanText(value.zoneId, DEFAULT_LOCATION.zoneId, 24),
    zoneName: cleanText(value.zoneName, DEFAULT_LOCATION.zoneName, 30),
  };
}

function normalizeSegments(value, allowOpen = false) {
  if (!Array.isArray(value)) return [];
  let openFound = false;
  return value
    .map((segment) => {
      const startAt = validEpoch(segment?.startAt);
      const rawEnd = segment?.endAt;
      const endAt = rawEnd == null && allowOpen && !openFound ? null : validEpoch(rawEnd);
      if (endAt == null) openFound = true;
      return { startAt, endAt };
    })
    .filter((segment) => segment.startAt && (segment.endAt == null || segment.endAt >= segment.startAt));
}

function normalizeSession(value) {
  if (!value || typeof value !== "object") return null;
  const checkedInAt = validEpoch(value.checkedInAt);
  const status = ALLOWED_STATUS.has(value.status) ? value.status : null;
  if (!checkedInAt || !status) return null;
  const focusSegments = normalizeSegments(value.focusSegments, status === "running");
  const hasOpen = focusSegments.some((segment) => segment.endAt == null);
  if (status === "running" && !hasOpen) focusSegments.push({ startAt: Date.now(), endAt: null });
  if (status !== "running") {
    focusSegments.forEach((segment) => {
      if (segment.endAt == null) segment.endAt = Date.now();
    });
  }
  return {
    id: typeof value.id === "string" ? value.id : makeId(),
    status,
    location: normalizeLocation(value.location),
    checkedInAt,
    pauseCount: Math.max(0, Number(value.pauseCount) || 0),
    focusSegments,
  };
}

function normalizeRecord(value) {
  if (!value || typeof value !== "object") return null;
  const checkedInAt = validEpoch(value.checkedInAt);
  const endedAt = validEpoch(value.endedAt);
  if (!checkedInAt || !endedAt || endedAt < checkedInAt) return null;
  return {
    id: typeof value.id === "string" ? value.id : makeId(),
    location: normalizeLocation(value.location),
    checkedInAt,
    endedAt,
    pauseCount: Math.max(0, Number(value.pauseCount) || 0),
    focusSegments: normalizeSegments(value.focusSegments, false),
  };
}

function defaultStore() {
  return {
    schemaVersion: 1,
    prefs: { placeVisible: true },
    activeSession: null,
    history: [],
    lastCompletedId: null,
    updatedAt: Date.now(),
  };
}

function normalizeStore(value) {
  const fallback = defaultStore();
  if (!value || typeof value !== "object") return fallback;
  const history = (Array.isArray(value.history) ? value.history : [])
    .map(normalizeRecord)
    .filter(Boolean)
    .slice(0, MAX_HISTORY);
  const lastCompletedId = history.some((record) => record.id === value.lastCompletedId)
    ? value.lastCompletedId
    : history[0]?.id || null;
  return {
    schemaVersion: 1,
    prefs: { placeVisible: value.prefs?.placeVisible !== false },
    activeSession: normalizeSession(value.activeSession),
    history,
    lastCompletedId,
    updatedAt: validEpoch(value.updatedAt, Date.now()),
  };
}

function loadStore() {
  try {
    return normalizeStore(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
  } catch {
    return defaultStore();
  }
}

let store = loadStore();
let uiState = "scanning";
let stateBeforeConfirm = "running";
let timerId = null;
let toastTimer = null;
let endingSession = false;

function commit() {
  store.updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function localDayBounds(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
  return { start, end };
}

function segmentMilliseconds(segments, now = Date.now(), bounds = null) {
  return segments.reduce((total, segment) => {
    const startAt = segment.startAt;
    const endAt = segment.endAt ?? now;
    const clippedStart = bounds ? Math.max(startAt, bounds.start) : startAt;
    const clippedEnd = bounds ? Math.min(endAt, bounds.end) : endAt;
    return total + Math.max(0, clippedEnd - clippedStart);
  }, 0);
}

function sessionFocusSeconds(session = store.activeSession, now = Date.now()) {
  if (!session) return 0;
  return Math.floor(segmentMilliseconds(session.focusSegments, now) / 1000);
}

function sessionSeatSeconds(session = store.activeSession, now = Date.now()) {
  if (!session) return 0;
  const endAt = session.endedAt || now;
  return Math.max(0, Math.floor((endAt - session.checkedInAt) / 1000));
}

function todayRecords(now = Date.now()) {
  const { start, end } = localDayBounds(now);
  return store.history.filter((record) => record.endedAt >= start && record.endedAt < end);
}

function todayFocusSeconds(now = Date.now()) {
  const bounds = localDayBounds(now);
  let milliseconds = store.history.reduce(
    (total, record) => total + segmentMilliseconds(record.focusSegments, now, bounds),
    0,
  );
  if (store.activeSession) milliseconds += segmentMilliseconds(store.activeSession.focusSegments, now, bounds);
  return Math.floor(milliseconds / 1000);
}

function lastCompletedRecord() {
  return store.history.find((record) => record.id === store.lastCompletedId) || store.history[0] || null;
}

function formatClock(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  return [hours, minutes, rest].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  if (safe === 0) return "0초";
  if (safe < 60) return `${safe}초`;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return hours ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}

function formatTimeRange(record) {
  if (!record) return "";
  const formatter = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${formatter.format(record.checkedInAt)}–${formatter.format(record.endedAt)}`;
}

function formatDate(timestamp = Date.now()) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(timestamp);
}

function goalPercent(seconds = todayFocusSeconds()) {
  return Math.min(100, Math.round((seconds / FOCUS_GOAL_SECONDS) * 100));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function mascotMarkup(className = "", alt = "강원대학교 마스코트 곰두리") {
  return `<img class="${className}" src="${MASCOT_URL}" alt="${alt}" />`;
}

function qrMarkup() {
  return `
    <svg class="qr-code" viewBox="0 0 90 90" aria-label="미래도서관 자유석 QR 예시" role="img">
      <rect width="90" height="90" fill="#fff"/>
      <g fill="#171821">
        <path d="M4 4h26v26H4zm5 5v16h16V9zm4 4h8v8h-8zM60 4h26v26H60zm5 5v16h16V9zm4 4h8v8h-8zM4 60h26v26H4zm5 5v16h16V65zm4 4h8v8h-8z" fill-rule="evenodd"/>
        <path d="M36 5h6v6h-6zm12 0h6v12h-6zm-12 12h12v6H36zm0 12h6v6h-6zm12-6h6v12h-6zm12 13h7v7h-7zm13-1h6v13h-6zm-37 7h6v6h-6zm12-1h7v13h-7zm-13 14h13v6H35zm25-6h6v6h-6zm13 5h13v7H73zm-37 13h6v13h-6zm12-7h7v7h-7zm0 14h13v6H48zm18-17h6v13h-6zm8 12h12v7H74z"/>
      </g>
    </svg>`;
}

function scanningScreen() {
  return `
    <section class="scan-screen" aria-labelledby="scan-title">
      <div class="scan-stage">
        <div class="scan-frame">${qrMarkup()}</div>
        <span class="scan-line" aria-hidden="true"></span>
        ${mascotMarkup("scan-mascot", "QR 옆의 곰두리")}
      </div>
      <div class="screen-heading center compact-heading"><h1 id="scan-title">좌석 QR을 스캔하세요</h1></div>
    </section>`;
}

function readyScreen() {
  const session = store.activeSession;
  const currentLocation = session.location;
  return `
    <section aria-labelledby="ready-title">
      <div class="ready-hero clean-hero">
        <span class="state-chip">좌석 이용 중</span>
        <h1 id="ready-title">${escapeHtml(currentLocation.libraryName)} ${escapeHtml(currentLocation.floor)}<br />${escapeHtml(currentLocation.zoneName)}</h1>
        <figure class="mascot-figure">${mascotMarkup("", "좌석 확인을 완료한 곰두리")}</figure>
      </div>
      <article class="card live-metrics">
        <div class="metric-line"><span>좌석 이용시간</span><strong data-seat-time>${formatClock(sessionSeatSeconds())}</strong></div>
        <div class="metric-line"><span>집중시간</span><strong data-focus-time>00:00:00</strong></div>
      </article>
    </section>`;
}

function focusScreen(paused = false) {
  return `
    <section class="timer-view ${paused ? "paused-screen" : ""}" aria-labelledby="focus-title">
      <div class="timer-head">
        <span class="state-chip ${paused ? "paused" : "running"}">${paused ? "일시정지" : "집중 중"}</span>
        <h1 id="focus-title">${paused ? "잠시 쉬는 중" : "집중 중"}</h1>
      </div>
      <div class="timer-ring" aria-label="${paused ? "멈춘" : "진행 중인"} 집중시간">
        <div class="timer-content"><span>순공시간</span><strong data-focus-time>${formatClock(sessionFocusSeconds())}</strong></div>
      </div>
      <article class="card focus-seat-card">
        <div class="focus-mascot">${mascotMarkup("", paused ? "휴식 중인 곰두리" : "집중 중인 곰두리")}</div>
        <div><span>좌석 이용시간</span><strong data-seat-time>${formatClock(sessionSeatSeconds())}</strong></div>
      </article>
    </section>`;
}

function confirmingScreen() {
  return `
    <section aria-label="집중 종료 확인">
      <div class="confirm-context" aria-hidden="true">
        <div class="timer-head"><span class="state-chip running">집중 중</span><h1>집중 중</h1></div>
        <div class="timer-ring"><div class="timer-content"><span>순공시간</span><strong data-focus-time>${formatClock(sessionFocusSeconds())}</strong></div></div>
      </div>
      <div class="sheet-backdrop"></div>
      <div class="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="end-title" aria-describedby="end-copy">
        <div class="sheet-handle"></div>
        <h2 id="end-title">집중을 마칠까요?</h2>
        <p id="end-copy">좌석을 반납하고 오늘 기록을 저장합니다.</p>
        <div class="end-summary">
          <div><span>순공시간</span><strong data-focus-time>${formatClock(sessionFocusSeconds())}</strong></div>
          <div><span>좌석 이용</span><strong data-seat-time>${formatClock(sessionSeatSeconds())}</strong></div>
        </div>
        <div class="sheet-actions">
          <button class="button danger" type="button" data-action="complete">종료하고 기록하기</button>
          <button class="button link-like" type="button" data-action="cancel-end">계속 집중하기</button>
        </div>
      </div>
    </section>`;
}

function summaryScreen() {
  const record = lastCompletedRecord();
  const currentLocation = record?.location || DEFAULT_LOCATION;
  const total = todayFocusSeconds();
  const latestFocus = record ? sessionFocusSeconds(record, record.endedAt) : 0;
  const percent = goalPercent(total);
  return `
    <section aria-labelledby="summary-title">
      <div class="summary-hero clean-hero">
        <div class="confetti" aria-hidden="true"></div>
        <span class="state-chip">기록 완료</span>
        <h1 id="summary-title">오늘 기록<br />저장 완료</h1>
        <figure class="mascot-figure">${mascotMarkup("", "기록 완료를 축하하는 곰두리")}</figure>
      </div>
      <article class="card today-total">
        <span>오늘 총 순공시간</span>
        <strong>${formatDuration(total)}</strong>
        <div class="goal-track" aria-label="오늘 5시간 목표의 ${percent}퍼센트"><i style="width:${percent}%"></i></div>
        <div class="goal-copy"><span>목표 5시간</span><b>${percent}%</b></div>
      </article>
      <article class="card session-row">
        <div class="summary-row">
          <div><strong>${escapeHtml(currentLocation.libraryName)} ${escapeHtml(currentLocation.floor)} · ${escapeHtml(currentLocation.zoneName)}</strong><span>${escapeHtml(formatTimeRange(record))}</span></div>
          <strong>${formatDuration(latestFocus)}</strong>
        </div>
      </article>
    </section>`;
}

function shareData() {
  const record = lastCompletedRecord();
  const currentLocation = record?.location || DEFAULT_LOCATION;
  const total = todayFocusSeconds();
  return {
    total,
    totalLabel: formatDuration(total),
    percent: goalPercent(total),
    sessionCount: todayRecords().length,
    place: `${currentLocation.libraryName} ${currentLocation.floor} · ${currentLocation.zoneName}`,
    date: formatDate(record?.endedAt || Date.now()),
    placeVisible: store.prefs.placeVisible,
  };
}

function shareScreen() {
  return `
    <section class="share-screen" aria-labelledby="share-title">
      <div class="screen-heading center compact-heading"><h1 id="share-title">SNS 카드</h1></div>
      <canvas id="share-card" class="share-card" width="1080" height="1350" aria-label="오늘의 공부 기록 SNS 카드"></canvas>
      <article class="card share-settings">
        <div class="privacy-row">
          <strong>장소 표시</strong>
          <span class="privacy-badge">좌석 번호 비공개</span>
          <button class="toggle" type="button" aria-label="장소 표시" aria-pressed="${store.prefs.placeVisible}" data-action="toggle-place"></button>
        </div>
      </article>
    </section>`;
}

const screens = {
  scanning: scanningScreen,
  ready: readyScreen,
  running: () => focusScreen(false),
  paused: () => focusScreen(true),
  confirming: confirmingScreen,
  summary: summaryScreen,
  share: shareScreen,
};

function actionMarkup() {
  if (uiState === "scanning") return '<button class="button primary" type="button" data-action="scan-complete">QR 인식</button>';
  if (uiState === "ready") return '<button class="button primary" type="button" data-action="start">집중 시작</button>';
  if (uiState === "running") return '<button class="button primary" type="button" data-action="pause">일시정지</button><button class="button" type="button" data-action="request-end">집중 종료</button>';
  if (uiState === "paused") return '<button class="button primary" type="button" data-action="resume">집중 재개</button><button class="button" type="button" data-action="request-end">집중 종료</button>';
  if (uiState === "summary") return '<button class="button primary" type="button" data-action="open-share">SNS 카드</button><button class="button" type="button" data-action="new-scan">새 QR</button>';
  if (uiState === "share") return '<button class="button soft" type="button" data-action="download-card">이미지 저장</button><button class="button primary" type="button" data-action="share-card">공유하기</button>';
  return "";
}

function render({ focus = false } = {}) {
  if (!screens[uiState]) uiState = store.activeSession?.status || "scanning";
  $("#phone").dataset.state = uiState;
  $("#screen").innerHTML = screens[uiState]();
  $("#action-dock").innerHTML = actionMarkup();
  $("#action-dock").classList.toggle("dual", ["running", "paused", "summary", "share"].includes(uiState));
  const titles = { scanning: "QR 스캔", ready: "좌석 이용 중", running: "집중 중", paused: "일시정지", confirming: "종료 확인", summary: "오늘 기록", share: "SNS 카드" };
  document.title = `Liverary · ${titles[uiState]}`;
  history.replaceState(null, "", `${location.pathname}${location.search}#${uiState}`);
  refreshTimers();
  if (uiState === "share") void paintShareCard(shareData());
  if (focus) $("#screen").focus({ preventScroll: true });
}

function refreshTimers() {
  if (!store.activeSession) return;
  const focus = formatClock(sessionFocusSeconds());
  const seat = formatClock(sessionSeatSeconds());
  $$('[data-focus-time]').forEach((element) => (element.textContent = focus));
  $$('[data-seat-time]').forEach((element) => (element.textContent = seat));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function locationFromQuery() {
  const query = new URLSearchParams(location.search);
  return normalizeLocation({
    libraryId: query.get("libraryId"),
    libraryName: query.get("library"),
    floor: query.get("floor"),
    zoneId: query.get("zoneId"),
    zoneName: query.get("zone"),
  });
}

function beginSeatSession(nextLocation = locationFromQuery()) {
  if (store.activeSession) {
    uiState = store.activeSession.status;
    render({ focus: true });
    return;
  }
  store.activeSession = {
    id: makeId(),
    status: "ready",
    location: nextLocation,
    checkedInAt: Date.now(),
    pauseCount: 0,
    focusSegments: [],
  };
  commit();
  uiState = "ready";
  render({ focus: true });
  showToast("좌석 확인 완료");
}

function startFocus() {
  const session = store.activeSession;
  if (!session || session.status !== "ready") return;
  session.status = "running";
  session.focusSegments.push({ startAt: Date.now(), endAt: null });
  commit();
  uiState = "running";
  render({ focus: true });
  showToast("집중 시작");
}

function pauseFocus() {
  const session = store.activeSession;
  if (!session || session.status !== "running") return;
  const openSegment = [...session.focusSegments].reverse().find((segment) => segment.endAt == null);
  if (openSegment) openSegment.endAt = Date.now();
  session.status = "paused";
  session.pauseCount += 1;
  commit();
  uiState = "paused";
  render({ focus: true });
  showToast("일시정지");
}

function resumeFocus() {
  const session = store.activeSession;
  if (!session || session.status !== "paused") return;
  session.status = "running";
  session.focusSegments.push({ startAt: Date.now(), endAt: null });
  commit();
  uiState = "running";
  render({ focus: true });
  showToast("집중 재개");
}

function requestEnd() {
  if (!store.activeSession) return;
  stateBeforeConfirm = store.activeSession.status;
  uiState = "confirming";
  render({ focus: true });
  requestAnimationFrame(() => $('[data-action="complete"]')?.focus());
}

function cancelEnd() {
  if (!store.activeSession) return;
  uiState = store.activeSession.status || stateBeforeConfirm;
  render({ focus: true });
}

function completeSession() {
  if (!store.activeSession || endingSession) return;
  endingSession = true;
  const endedAt = Date.now();
  const session = store.activeSession;
  session.focusSegments.forEach((segment) => {
    if (segment.endAt == null) segment.endAt = endedAt;
  });
  const record = {
    id: session.id,
    location: session.location,
    checkedInAt: session.checkedInAt,
    endedAt,
    pauseCount: session.pauseCount,
    focusSegments: session.focusSegments.map((segment) => ({ ...segment })),
  };
  store.history = [record, ...store.history.filter((item) => item.id !== record.id)].slice(0, MAX_HISTORY);
  store.lastCompletedId = record.id;
  store.activeSession = null;
  commit();
  uiState = "summary";
  render({ focus: true });
  showToast("기록 저장 완료");
  endingSession = false;
}

function newScan() {
  store.activeSession = null;
  commit();
  uiState = "scanning";
  render({ focus: true });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

const mascotPromise = loadImage(MASCOT_URL).catch(() => null);

async function paintShareCard(data) {
  const canvas = $("#share-card");
  if (!canvas) return null;
  await document.fonts?.ready;
  const mascot = await mascotPromise;
  if (!canvas.isConnected) return null;
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#625ce8");
  gradient.addColorStop(1, "#3d37b9");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.fillStyle = "rgba(255,255,255,.10)";
  context.beginPath();
  context.arc(1025, 1130, 350, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(255,255,255,.09)";
  context.lineWidth = 72;
  context.beginPath();
  context.arc(950, 1110, 265, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = "#fff";
  context.beginPath();
  context.roundRect(84, 78, 76, 76, 18);
  context.fill();
  context.fillStyle = "#5650dc";
  context.font = '700 50px Georgia, serif';
  context.fillText("L", 108, 136);
  context.fillStyle = "#fff";
  context.font = '700 43px "Noto Sans KR", Arial, sans-serif';
  context.fillText("Liverary", 186, 136);
  context.fillStyle = "#d8d6ff";
  context.font = '500 42px "Noto Sans KR", Arial, sans-serif';
  context.fillText("오늘의 순공시간", 88, 370);
  context.fillStyle = "#fff";
  context.font = '800 120px "Noto Sans KR", Arial, sans-serif';
  context.fillText(data.totalLabel, 80, 505);

  if (mascot) {
    const mascotHeight = 360;
    const mascotWidth = (mascot.width / mascot.height) * mascotHeight;
    context.drawImage(mascot, 790, height - mascotHeight + 20, mascotWidth, mascotHeight);
  }

  context.fillStyle = "#fff";
  context.font = '700 34px "Noto Sans KR", Arial, sans-serif';
  context.fillText(data.placeVisible ? data.place : "KNU LIBRARY", 88, 1208);
  context.fillStyle = "#d5d3ff";
  context.font = '500 29px "Noto Sans KR", Arial, sans-serif';
  context.fillText(`${data.date} · KNU`, 88, 1254);
  return canvas;
}

async function visibleCardBlob() {
  const canvas = await paintShareCard(shareData());
  if (!canvas) return null;
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

async function downloadShareCard() {
  const blob = await visibleCardBlob();
  if (!blob) return showToast("저장 실패");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `liverary-${new Date().toLocaleDateString("sv-SE")}.png`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("이미지 저장 완료");
}

async function shareCard() {
  try {
    const data = shareData();
    const blob = await visibleCardBlob();
    const file = blob ? new File([blob], "liverary-today.png", { type: "image/png" }) : null;
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: "Liverary 오늘 기록", text: `오늘의 순공시간 ${data.totalLabel}`, files: [file] });
      return;
    }
    if (navigator.share) {
      await navigator.share({ title: "Liverary 오늘 기록", text: `오늘의 순공시간 ${data.totalLabel}` });
      return;
    }
    await downloadShareCard();
  } catch (error) {
    if (error?.name !== "AbortError") showToast("공유 실패");
  }
}

function handleAction(action) {
  if (action === "scan-complete") return beginSeatSession();
  if (action === "start") return startFocus();
  if (action === "pause") return pauseFocus();
  if (action === "resume") return resumeFocus();
  if (action === "request-end") return requestEnd();
  if (action === "cancel-end") return cancelEnd();
  if (action === "complete") return completeSession();
  if (action === "new-scan") return newScan();
  if (action === "open-share") {
    uiState = "share";
    return render({ focus: true });
  }
  if (action === "toggle-place") {
    store.prefs.placeVisible = !store.prefs.placeVisible;
    commit();
    return render();
  }
  if (action === "download-card") return void downloadShareCard();
  if (action === "share-card") return void shareCard();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  event.preventDefault();
  handleAction(target.dataset.action);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && uiState === "confirming") cancelEnd();
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  store = loadStore();
  uiState = store.activeSession?.status || (lastCompletedRecord() ? "summary" : "scanning");
  render();
});

function restoreInitialState() {
  if (store.activeSession) return store.activeSession.status;
  const requested = location.hash.slice(1);
  if (lastCompletedRecord() && requested === "share") return "share";
  if (lastCompletedRecord() && requested === "summary") return "summary";
  return "scanning";
}

uiState = restoreInitialState();
const query = new URLSearchParams(location.search);
const qrSessionKey = `liverary.mobileFlow.qrConsumed:${location.search}`;
if (query.get("qr") === "1" && !store.activeSession && !sessionStorage.getItem(qrSessionKey)) {
  sessionStorage.setItem(qrSessionKey, "1");
  beginSeatSession(locationFromQuery());
} else {
  render();
}

timerId = window.setInterval(refreshTimers, 1000);
