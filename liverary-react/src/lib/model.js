export const STORAGE_KEY = "liverary-react-state-v1";
export const STATE_VERSION = 1;
export const DAY_MS = 24 * 60 * 60 * 1000;
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;

export const BASE_SEATS = [
  {
    id: "1F-A01",
    floor: "1F",
    label: "A01",
    zone: "A구역",
    status: "occupied",
    amenities: ["quiet", "power"],
  },
  {
    id: "1F-A02",
    floor: "1F",
    label: "A02",
    zone: "A구역",
    status: "free",
    amenities: ["quiet", "power"],
  },
  {
    id: "1F-A03",
    floor: "1F",
    label: "A03",
    zone: "A구역",
    status: "free",
    amenities: ["quiet"],
  },
  {
    id: "1F-A04",
    floor: "1F",
    label: "A04",
    zone: "A구역",
    status: "unknown",
    amenities: ["quiet"],
  },
  {
    id: "1F-A05",
    floor: "1F",
    label: "A05",
    zone: "A구역",
    status: "occupied",
    amenities: ["power"],
  },
  {
    id: "1F-A06",
    floor: "1F",
    label: "A06",
    zone: "A구역",
    status: "free",
    amenities: ["power"],
  },
  {
    id: "1F-B01",
    floor: "1F",
    label: "B01",
    zone: "B구역",
    status: "occupied",
    amenities: ["window"],
  },
  {
    id: "1F-B02",
    floor: "1F",
    label: "B02",
    zone: "B구역",
    status: "free",
    amenities: ["window", "power"],
  },
  {
    id: "1F-B03",
    floor: "1F",
    label: "B03",
    zone: "B구역",
    status: "free",
    amenities: ["window"],
  },
  {
    id: "1F-B04",
    floor: "1F",
    label: "B04",
    zone: "B구역",
    status: "unknown",
    amenities: ["window"],
  },
  {
    id: "1F-B05",
    floor: "1F",
    label: "B05",
    zone: "B구역",
    status: "free",
    amenities: [],
  },
  {
    id: "1F-B06",
    floor: "1F",
    label: "B06",
    zone: "B구역",
    status: "free",
    amenities: ["power"],
  },
  {
    id: "2F-A01",
    floor: "2F",
    label: "A01",
    zone: "A구역",
    status: "occupied",
    amenities: ["quiet", "power"],
  },
  {
    id: "2F-A02",
    floor: "2F",
    label: "A02",
    zone: "A구역",
    status: "occupied",
    amenities: ["quiet"],
  },
  {
    id: "2F-A03",
    floor: "2F",
    label: "A03",
    zone: "A구역",
    status: "unknown",
    amenities: ["quiet", "power"],
  },
  {
    id: "2F-A04",
    floor: "2F",
    label: "A04",
    zone: "A구역",
    status: "free",
    amenities: ["quiet", "power"],
  },
  {
    id: "2F-A05",
    floor: "2F",
    label: "A05",
    zone: "A구역",
    status: "free",
    amenities: ["quiet"],
  },
  {
    id: "2F-A06",
    floor: "2F",
    label: "A06",
    zone: "A구역",
    status: "occupied",
    amenities: ["quiet"],
  },
  {
    id: "2F-B01",
    floor: "2F",
    label: "B01",
    zone: "B구역",
    status: "free",
    amenities: ["window"],
  },
  {
    id: "2F-B02",
    floor: "2F",
    label: "B02",
    zone: "B구역",
    status: "occupied",
    amenities: ["window", "power"],
  },
  {
    id: "2F-B03",
    floor: "2F",
    label: "B03",
    zone: "B구역",
    status: "occupied",
    amenities: ["window"],
  },
  {
    id: "2F-B04",
    floor: "2F",
    label: "B04",
    zone: "B구역",
    status: "free",
    amenities: ["window", "power"],
  },
  {
    id: "2F-B05",
    floor: "2F",
    label: "B05",
    zone: "B구역",
    status: "free",
    amenities: ["power"],
  },
  {
    id: "2F-B06",
    floor: "2F",
    label: "B06",
    zone: "B구역",
    status: "occupied",
    amenities: [],
  },
];

export const COMMUNITY_ITEMS = [
  {
    id: "event-focus",
    type: "event",
    visual: "",
    icon: "calendar",
    eyebrow: "공부 이벤트",
    title: "중간고사 50시간 챌린지",
    body: "10.1–10.7 · 목표 50시간",
    meta: "함께 공부해요",
    action: "관심 표시",
  },
  {
    id: "spot-window",
    type: "spot",
    visual: "warm",
    icon: "window",
    eyebrow: "도서관 꿀자리",
    title: "2층 B구역 창가",
    body: "콘센트 · 오후 채광 · 저소음",
    meta: "창가 자리",
    action: "저장하기",
  },
  {
    id: "study-morning",
    type: "study",
    visual: "green",
    icon: "users",
    eyebrow: "스터디 모집",
    title: "미래도서관 아침 공부",
    body: "평일 08:00 · 미래도서관 2층",
    meta: "아침 공부",
    action: "관심 표시",
  },
];

const SEAT_IDS = new Set(BASE_SEATS.map((seat) => seat.id));
const SEAT_STATUSES = new Set(["free", "occupied", "unknown", "away", "mine"]);
const FILTERS = new Set(["all", "quiet", "power", "window"]);
const COMMUNITY_TABS = new Set(["all", "event", "spot", "study"]);
const finiteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);
const intervalDuration = (interval) =>
  Math.max(0, interval.endedAt - interval.startedAt);
const pauseCount = (value) =>
  Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;

export function createInitialState() {
  return {
    version: STATE_VERSION,
    seats: Object.fromEntries(BASE_SEATS.map((seat) => [seat.id, seat.status])),
    floor: "2F",
    filter: "all",
    communityTab: "all",
    session: null,
    records: [],
    lastSummary: null,
    profile: null,
    interests: [],
  };
}

function normalizeIntervals(value, start, end) {
  if (!Array.isArray(value)) return [];
  const sorted = value
    .filter(
      (interval) =>
        interval &&
        finiteNumber(interval.startedAt) &&
        finiteNumber(interval.endedAt),
    )
    .map((interval) => ({
      startedAt: Math.max(start, interval.startedAt),
      endedAt: Math.min(end, interval.endedAt),
    }))
    .filter((interval) => interval.endedAt > interval.startedAt)
    .sort((a, b) => a.startedAt - b.startedAt);
  const merged = [];
  for (const interval of sorted) {
    const previous = merged.at(-1);
    if (previous && interval.startedAt <= previous.endedAt)
      previous.endedAt = Math.max(previous.endedAt, interval.endedAt);
    else merged.push(interval);
  }
  return merged;
}

function normalizeProfile(value) {
  if (!value || typeof value.nickname !== "string") return null;
  const nickname = value.nickname.trim().slice(0, 20);
  if (!nickname) return null;
  return {
    nickname,
    department:
      typeof value.department === "string"
        ? value.department.trim().slice(0, 40)
        : "",
  };
}

function normalizeRecord(record, now) {
  if (
    !record ||
    !SEAT_IDS.has(record.seatId) ||
    !finiteNumber(record.startedAt) ||
    !finiteNumber(record.endedAt)
  )
    return null;
  if (
    record.startedAt < 0 ||
    record.endedAt < record.startedAt ||
    record.endedAt > now
  )
    return null;
  const focusIntervals = normalizeIntervals(
    record.focusIntervals,
    record.startedAt,
    record.endedAt,
  );
  return {
    id: typeof record.id === "string" ? record.id : `record-${record.endedAt}`,
    seatId: record.seatId,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    seatMs: record.endedAt - record.startedAt,
    focusIntervals,
    focusMs: focusIntervals.reduce(
      (sum, interval) => sum + intervalDuration(interval),
      0,
    ),
    pauseCount: pauseCount(record.pauseCount),
  };
}

export function normalizeState(value, now = Date.now()) {
  const state = createInitialState();
  if (!value || value.version !== STATE_VERSION) return state;
  for (const seat of BASE_SEATS) {
    const saved = value.seats?.[seat.id];
    if (SEAT_STATUSES.has(saved) && saved !== "mine")
      state.seats[seat.id] = saved;
  }
  state.floor = value.floor === "1F" ? "1F" : "2F";
  state.filter = FILTERS.has(value.filter) ? value.filter : "all";
  state.communityTab = COMMUNITY_TABS.has(value.communityTab)
    ? value.communityTab
    : "all";
  state.profile = normalizeProfile(value.profile);
  state.interests = Array.isArray(value.interests)
    ? [...new Set(value.interests.filter((id) => typeof id === "string"))]
    : [];
  state.records = (Array.isArray(value.records) ? value.records : [])
    .map((record) => normalizeRecord(record, now))
    .filter(Boolean)
    .sort((a, b) => b.endedAt - a.endedAt);
  state.lastSummary =
    state.records.find((record) => record.id === value.lastSummary?.id) || null;

  const session = value.session;
  if (
    session &&
    SEAT_IDS.has(session.seatId) &&
    finiteNumber(session.startedAt) &&
    session.startedAt >= 0 &&
    session.startedAt <= now
  ) {
    const focusIntervals = normalizeIntervals(
      session.focusIntervals,
      session.startedAt,
      now,
    );
    const lastEnd = focusIntervals.at(-1)?.endedAt || session.startedAt;
    const focusRunning = Boolean(
      session.focusRunning &&
      finiteNumber(session.focusStartedAt) &&
      session.focusStartedAt >= lastEnd &&
      session.focusStartedAt <= now,
    );
    state.session = {
      id:
        typeof session.id === "string"
          ? session.id
          : `session-${session.startedAt}`,
      seatId: session.seatId,
      startedAt: session.startedAt,
      focusIntervals,
      focusMs: focusIntervals.reduce(
        (sum, interval) => sum + intervalDuration(interval),
        0,
      ),
      focusStartedAt: focusRunning ? session.focusStartedAt : null,
      focusRunning,
      hasFocused: Boolean(
        session.hasFocused || focusRunning || focusIntervals.length,
      ),
      pauseCount: pauseCount(session.pauseCount),
    };
    state.seats[session.seatId] = "mine";
  }
  return state;
}

export function readStoredState(storage, now = Date.now()) {
  if (!storage) return { state: createInitialState(), storageError: true };
  try {
    return {
      state: normalizeState(JSON.parse(storage.getItem(STORAGE_KEY)), now),
      storageError: false,
    };
  } catch {
    return { state: createInitialState(), storageError: true };
  }
}

export function persistState(state, storage) {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function selectSeats(state, floor = null) {
  return BASE_SEATS.filter((seat) => !floor || seat.floor === floor).map(
    (seat) => ({ ...seat, status: state.seats[seat.id] || seat.status }),
  );
}

export function selectSeat(state, id) {
  const seat = BASE_SEATS.find((item) => item.id === id);
  return seat ? { ...seat, status: state.seats[id] || seat.status } : null;
}

export function computeFloorStats(state, floor) {
  const seats = selectSeats(state, floor);
  const free = seats.filter((seat) => seat.status === "free").length;
  const used = seats.filter((seat) =>
    ["occupied", "away", "mine"].includes(seat.status),
  ).length;
  const unknown = seats.filter((seat) => seat.status === "unknown").length;
  const observed = free + used;
  return {
    total: seats.length,
    free,
    used,
    unknown,
    observed,
    usedPercent: observed ? Math.round((used / observed) * 100) : 0,
  };
}

export function getSessionElapsed(session, now = Date.now()) {
  if (!session) return { seatMs: 0, focusMs: 0 };
  const completedMs = session.focusIntervals.reduce(
    (sum, interval) => sum + intervalDuration(interval),
    0,
  );
  const liveMs = session.focusRunning
    ? Math.max(0, now - session.focusStartedAt)
    : 0;
  return {
    seatMs: Math.max(0, now - session.startedAt),
    focusMs: completedMs + liveMs,
  };
}

export function startOfKoreaDay(timestamp) {
  return (
    Math.floor((timestamp + KOREA_OFFSET_MS) / DAY_MS) * DAY_MS -
    KOREA_OFFSET_MS
  );
}

export function startOfKoreaWeek(timestamp) {
  const today = startOfKoreaDay(timestamp);
  const weekday = new Date(today + KOREA_OFFSET_MS).getUTCDay();
  return today - ((weekday + 6) % 7) * DAY_MS;
}

function rangeOverlap(interval, start, end) {
  return Math.max(
    0,
    Math.min(interval.endedAt, end) - Math.max(interval.startedAt, start),
  );
}

export function aggregateFocus(state, now = Date.now()) {
  const todayStart = startOfKoreaDay(now);
  const weekStart = startOfKoreaWeek(now);
  const intervals = state.records.flatMap((record) => record.focusIntervals);
  if (state.session) {
    intervals.push(...state.session.focusIntervals);
    if (state.session.focusRunning)
      intervals.push({
        startedAt: state.session.focusStartedAt,
        endedAt: Math.max(state.session.focusStartedAt, now),
      });
  }
  const todayMs = intervals.reduce(
    (sum, interval) =>
      sum + rangeOverlap(interval, todayStart, todayStart + DAY_MS),
    0,
  );
  const weekValues = Array.from({ length: 7 }, (_, day) => {
    const start = weekStart + day * DAY_MS;
    return intervals.reduce(
      (sum, interval) => sum + rangeOverlap(interval, start, start + DAY_MS),
      0,
    );
  });
  return {
    todayMs,
    weekMs: weekValues.reduce((sum, value) => sum + value, 0),
    weekValues,
    weekStart,
    todayIndex: Math.floor((todayStart - weekStart) / DAY_MS),
  };
}

function closeFocus(session, now) {
  if (!session.focusRunning) return session;
  const endedAt = Math.max(session.focusStartedAt, now);
  const interval = { startedAt: session.focusStartedAt, endedAt };
  const focusIntervals =
    endedAt > interval.startedAt
      ? [...session.focusIntervals, interval]
      : session.focusIntervals;
  return {
    ...session,
    focusIntervals,
    focusMs: focusIntervals.reduce(
      (sum, item) => sum + intervalDuration(item),
      0,
    ),
    focusStartedAt: null,
    focusRunning: false,
  };
}

const reject = (state, error) => ({ state, ok: false, error });

export function transitionState(state, action, payload, now = Date.now()) {
  if (action === "startSession") {
    const seat = selectSeat(state, payload);
    if (state.session)
      return state.session.seatId === payload
        ? { state, ok: true, session: state.session }
        : reject(state, "이용 중인 좌석을 먼저 종료해 주세요.");
    if (!seat || seat.status !== "free")
      return reject(state, "현재 이용할 수 없는 좌석이에요.");
    const session = {
      id: `session-${now}-${state.records.length}`,
      seatId: seat.id,
      startedAt: now,
      focusIntervals: [],
      focusMs: 0,
      focusStartedAt: null,
      focusRunning: false,
      hasFocused: false,
      pauseCount: 0,
    };
    return {
      state: {
        ...state,
        seats: { ...state.seats, [seat.id]: "mine" },
        floor: seat.floor,
        session,
      },
      ok: true,
      session,
    };
  }
  if (
    ["startFocus", "resumeFocus", "pauseFocus", "completeSession"].includes(
      action,
    )
  ) {
    if (!state.session) return reject(state, "먼저 좌석 이용을 시작해 주세요.");
    const current = state.session;
    const latest = Math.max(
      current.startedAt,
      current.focusStartedAt || 0,
      current.focusIntervals.at(-1)?.endedAt || 0,
    );
    const timestamp = Math.max(latest, now);
    if (action === "startFocus" || action === "resumeFocus") {
      if (current.focusRunning)
        return reject(state, "이미 집중시간을 기록하고 있어요.");
      const session = {
        ...current,
        focusStartedAt: timestamp,
        focusRunning: true,
        hasFocused: true,
      };
      return { state: { ...state, session }, ok: true, session };
    }
    if (action === "pauseFocus") {
      if (!current.focusRunning)
        return reject(state, "집중시간이 이미 멈춰 있어요.");
      const session = {
        ...closeFocus(current, timestamp),
        pauseCount: current.pauseCount + 1,
      };
      return { state: { ...state, session }, ok: true, session };
    }
    const session = closeFocus(current, timestamp);
    const record = {
      id: `record-${current.id}`,
      seatId: current.seatId,
      startedAt: current.startedAt,
      endedAt: timestamp,
      seatMs: timestamp - current.startedAt,
      focusIntervals: session.focusIntervals,
      focusMs: session.focusMs,
      pauseCount: current.pauseCount,
    };
    return {
      state: {
        ...state,
        seats: { ...state.seats, [current.seatId]: "free" },
        session: null,
        records: [record, ...state.records],
        lastSummary: record,
      },
      ok: true,
      record,
    };
  }
  if (action === "toggleInterest") {
    if (typeof payload !== "string" || !payload)
      return reject(state, "소식을 다시 확인해 주세요.");
    const selected = !state.interests.includes(payload);
    const interests = selected
      ? [...state.interests, payload]
      : state.interests.filter((id) => id !== payload);
    return { state: { ...state, interests }, ok: true, selected };
  }
  if (action === "setProfile") {
    const profile = normalizeProfile(payload);
    if (!profile) return reject(state, "닉네임을 입력해 주세요.");
    return { state: { ...state, profile }, ok: true, profile };
  }
  if (action === "logout")
    return { state: { ...state, profile: null }, ok: true };
  if (action === "setFloor" && ["1F", "2F"].includes(payload))
    return { state: { ...state, floor: payload }, ok: true };
  if (action === "setFilter" && FILTERS.has(payload))
    return { state: { ...state, filter: payload }, ok: true };
  if (action === "setCommunityTab" && COMMUNITY_TABS.has(payload))
    return { state: { ...state, communityTab: payload }, ok: true };
  return reject(state, "선택한 내용을 다시 확인해 주세요.");
}

export function formatClock(ms) {
  const seconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const hours = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  return `${hours}:${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function formatDuration(ms) {
  const minutes = Math.max(0, Math.floor((Number(ms) || 0) / 60000));
  if (!minutes) return ms > 0 ? "1분 미만" : "0분";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}시간 ${rest}분` : `${rest}분`;
}

export function amenityText(name) {
  return (
    { quiet: "조용한 구역", power: "콘센트", window: "창가" }[name] || name
  );
}

export function statusText(status) {
  return (
    {
      free: "이용 가능",
      occupied: "이용 중",
      unknown: "확인 안 됨",
      away: "이석 중",
      mine: "내가 이용 중",
    }[status] || status
  );
}

export function crowdMeta(stats) {
  if (stats.usedPercent < 45) return { label: "여유", className: "calm" };
  if (stats.usedPercent < 72) return { label: "보통", className: "normal" };
  return { label: "혼잡", className: "busy" };
}
