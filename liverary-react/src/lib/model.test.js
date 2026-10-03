import test from "node:test";
import assert from "node:assert/strict";
import {
  BASE_SEATS,
  LEGACY_SEATS,
  STORAGE_KEY,
  aggregateFocus,
  computeFloorStats,
  createInitialState,
  getSeatDefinition,
  getSessionElapsed,
  normalizeState,
  persistState,
  readStoredState,
  selectSeat,
  selectSeats,
  startOfKoreaWeek,
  transitionState,
} from "./model.js";
import {
  ARMCHAIR_PAIRS,
  RETIRED_PC_SEATS,
  SMALL_TABLES,
  WE_PLACE,
  WE_PLACE_MAP,
  WE_PLACE_SEATS,
} from "./wePlace.js";

const at = (date) => Date.parse(date);
const minute = 60_000;
const action = (state, name, payload, timestamp) => {
  const result = transitionState(state, name, payload, timestamp);
  assert.equal(result.ok, true, result.error);
  return result.state;
};

test("좌석 이용, 집중, 일시정지, 재개, 종료는 시간과 빈자리를 일치시킨다", () => {
  const start = at("2026-10-02T09:00:00+09:00");
  let state = createInitialState();
  const initialFree = computeFloorStats(state, "1F").free;
  state = action(state, "startSession", "1F-W04", start);
  assert.equal(state.seats["1F-W04"], "mine");
  assert.equal(computeFloorStats(state, "1F").free, initialFree - 1);
  state = action(state, "startFocus", undefined, start + minute);
  state = action(state, "pauseFocus", undefined, start + 11 * minute);
  assert.deepEqual(getSessionElapsed(state.session, start + 15 * minute), {
    seatMs: 15 * minute,
    focusMs: 10 * minute,
  });
  state = action(state, "resumeFocus", undefined, start + 16 * minute);
  const finished = transitionState(
    state,
    "completeSession",
    undefined,
    start + 21 * minute,
  );
  assert.equal(finished.ok, true);
  assert.equal(finished.record.focusMs, 15 * minute);
  assert.equal(finished.record.seatMs, 21 * minute);
  assert.equal(finished.record.pauseCount, 1);
  assert.equal(finished.state.session, null);
  assert.equal(finished.state.seats["1F-W04"], "free");
  assert.equal(computeFloorStats(finished.state, "1F").free, initialFree);
  assert.equal(finished.state.lastSummary.id, finished.record.id);
});

test("새로고침으로 복원된 진행 중 세션은 실제 경과시간을 계속 센다", () => {
  const start = at("2026-10-02T09:00:00+09:00");
  let state = action(createInitialState(), "startSession", "1F-W04", start);
  state = action(state, "startFocus", undefined, start + minute);
  state = action(state, "pauseFocus", undefined, start + 3 * minute);
  state = action(state, "resumeFocus", undefined, start + 4 * minute);
  const storage = new Map();
  const adapter = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
  };
  assert.equal(persistState(state, adapter), true);
  const restored = readStoredState(adapter, start + 7 * minute);
  assert.equal(restored.storageError, false);
  assert.equal(restored.state.session.focusRunning, true);
  assert.deepEqual(
    getSessionElapsed(restored.state.session, start + 7 * minute),
    { seatMs: 7 * minute, focusMs: 5 * minute },
  );
  assert.equal(restored.state.seats["1F-W04"], "mine");
  assert.ok(storage.has(STORAGE_KEY));
});

test("한국 시간 자정을 넘은 집중은 날짜별로 나누고 이전 주 기록은 제외한다", () => {
  const beforeMidnight = at("2026-09-27T23:50:00+09:00");
  let state = action(
    createInitialState(),
    "startSession",
    "1F-W04",
    beforeMidnight,
  );
  state = action(state, "startFocus", undefined, beforeMidnight);
  state = action(
    state,
    "completeSession",
    undefined,
    at("2026-09-28T00:20:00+09:00"),
  );
  const oldStart = at("2026-09-21T10:00:00+09:00");
  let oldState = action(
    createInitialState(),
    "startSession",
    "1F-W02",
    oldStart,
  );
  oldState = action(oldState, "startFocus", undefined, oldStart);
  oldState = action(
    oldState,
    "completeSession",
    undefined,
    oldStart + 60 * minute,
  );
  state = { ...state, records: [...state.records, ...oldState.records] };
  const totals = aggregateFocus(state, at("2026-09-28T12:00:00+09:00"));
  assert.equal(totals.weekStart, at("2026-09-28T00:00:00+09:00"));
  assert.equal(
    startOfKoreaWeek(at("2026-10-04T23:59:59+09:00")),
    totals.weekStart,
  );
  assert.equal(totals.todayMs, 20 * minute);
  assert.equal(totals.weekMs, 20 * minute);
  assert.deepEqual(totals.weekValues, [20 * minute, 0, 0, 0, 0, 0, 0]);
});

test("자정 이후 진행 중 세션도 어제와 오늘 순공시간을 나눈다", () => {
  const start = at("2026-10-01T23:55:00+09:00");
  let state = action(createInitialState(), "startSession", "1F-W04", start);
  state = action(state, "startFocus", undefined, start);
  const totals = aggregateFocus(state, at("2026-10-02T00:05:00+09:00"));
  assert.equal(totals.todayMs, 5 * minute);
  assert.equal(totals.weekMs, 10 * minute);
  assert.equal(totals.weekValues[3], 5 * minute);
  assert.equal(totals.weekValues[4], 5 * minute);
  assert.equal(totals.todayIndex, 4);
});

test("잘못된 저장값은 보정하고 겹친 집중 구간은 중복 집계하지 않는다", () => {
  const now = at("2026-10-02T12:00:00+09:00");
  const initial = createInitialState();
  const raw = {
    ...initial,
    seats: { ...initial.seats, "1F-W02": "mine", "1F-W14": "not-a-state" },
    session: { seatId: "missing", startedAt: now - minute },
    profile: { nickname: "   ", department: "학교" },
    records: [
      null,
      { seatId: "missing" },
      {
        id: "overlap",
        seatId: "1F-W04",
        startedAt: now - 20 * minute,
        endedAt: now,
        focusIntervals: [
          { startedAt: now - 20 * minute, endedAt: now - 10 * minute },
          { startedAt: now - 15 * minute, endedAt: now - 5 * minute },
          { startedAt: "invalid", endedAt: now },
        ],
        pauseCount: Infinity,
      },
    ],
  };
  const restored = normalizeState(raw, now);
  assert.equal(restored.session, null);
  assert.equal(restored.profile, null);
  assert.equal(restored.seats["1F-W02"], "free");
  assert.equal(restored.seats["1F-W14"], "free");
  assert.equal(restored.records.length, 1);
  assert.equal(restored.records[0].focusMs, 15 * minute);
  assert.equal(restored.records[0].pauseCount, 0);
  assert.equal(aggregateFocus(restored, now).todayMs, 15 * minute);
});

test("다른 좌석의 동시 이용과 집중 중복 시작을 막고 프로필은 로컬 정보로 저장한다", () => {
  const now = at("2026-10-02T09:00:00+09:00");
  let state = action(createInitialState(), "startSession", "1F-W04", now);
  assert.equal(transitionState(state, "startSession", "1F-W02", now).ok, false);
  state = action(state, "startFocus", undefined, now);
  assert.equal(
    transitionState(state, "startFocus", undefined, now + minute).ok,
    false,
  );
  state = action(
    state,
    "setProfile",
    { nickname: " 곰두리 ", department: " 컴퓨터공학과 " },
    now,
  );
  assert.deepEqual(state.profile, {
    nickname: "곰두리",
    department: "컴퓨터공학과",
  });
  state = action(state, "toggleInterest", "study-morning", now);
  assert.deepEqual(state.interests, ["study-morning"]);
  state = action(state, "logout", undefined, now);
  assert.equal(state.profile, null);
  assert.equal(state.session.focusRunning, true);
  assert.equal(
    persistState(state, {
      setItem() {
        throw new Error("quota");
      },
    }),
    false,
  );
});

test("We플레이스 자유석 목업 42개는 PC 예약석을 제외하고 기존 번호를 유지한다", () => {
  const state = createInitialState();
  assert.equal(BASE_SEATS, WE_PLACE_SEATS);
  assert.deepEqual(WE_PLACE, {
    id: "1F-04",
    floor: "1F",
    name: "We플레이스",
    section: 4,
    windowSeats: 6,
    loungeSeats: 8,
    tableSeats: 22,
    pcSeats: 0,
    armchairSeats: 6,
  });
  assert.equal(state.floor, "1F");
  assert.equal(BASE_SEATS.length, 42);
  assert.equal(new Set(BASE_SEATS.map((seat) => seat.id)).size, 42);
  assert.deepEqual(
    BASE_SEATS.map((seat) => seat.label),
    Array.from({ length: 51 }, (_, index) => index + 1)
      .filter((number) => number < 15 || number > 23)
      .map((number) => String(number).padStart(2, "0")),
  );
  assert.ok(BASE_SEATS.every((seat) => seat.floor === "1F"));
  assert.ok(BASE_SEATS.every((seat) => seat.zone === "We플레이스"));
  assert.ok(BASE_SEATS.every((seat) => seat.status === "free"));
  assert.equal(BASE_SEATS.filter((seat) => seat.kind === "window").length, 6);
  assert.equal(BASE_SEATS.filter((seat) => seat.kind === "lounge").length, 14);
  assert.equal(BASE_SEATS.filter((seat) => seat.kind === "pc").length, 0);
  assert.equal(BASE_SEATS.filter((seat) => seat.kind === "table").length, 22);
  // Outlet metadata follows the user's observation, not an official live API.
  const windowBar = BASE_SEATS.filter((seat) => seat.groupId === "window-bar");
  assert.equal(windowBar.length, 6);
  for (const seat of windowBar) {
    assert.deepEqual(seat.amenities, ["window", "power"]);
  }
  assert.equal(
    BASE_SEATS.filter((seat) => seat.amenities.includes("power")).length,
    6,
  );
  assert.ok(
    BASE_SEATS.filter((seat) => seat.groupId !== "window-bar").every(
      (seat) => !seat.amenities.includes("power"),
    ),
  );
  assert.ok(BASE_SEATS.slice(6).every((seat) => !seat.amenities.length));
  for (const [groupId, groupLabel, labels] of [
    ["window-bar", "창가 바", ["01", "02", "03", "04", "05", "06"]],
    ["sofa-1", "파란 소파 1", ["07", "08", "09", "10"]],
    ["sofa-2", "파란 소파 2", ["11", "12", "13", "14"]],
    ["small-table-1", "작은 테이블 1", ["24", "25", "26", "27"]],
    ["small-table-2", "작은 테이블 2", ["28", "29", "30", "31"]],
    ["small-table-3", "작은 테이블 3", ["32", "33", "34", "35"]],
    ["small-table-4", "작은 테이블 4", ["36", "37", "38", "39"]],
    ["large-table", "큰 흰 테이블", ["40", "41", "42", "43", "44", "45"]],
    ["armchair-1", "개별 소파 1", ["46", "47"]],
    ["armchair-2", "개별 소파 2", ["48", "49"]],
    ["armchair-3", "개별 소파 3", ["50", "51"]],
  ]) {
    const group = BASE_SEATS.filter((seat) => seat.groupId === groupId);
    assert.deepEqual(
      group.map((seat) => seat.label),
      labels,
    );
    assert.ok(group.every((seat) => seat.groupLabel === groupLabel));
  }
  assert.equal(new Set(BASE_SEATS.map((seat) => seat.groupId)).size, 11);
  assert.equal(selectSeats(state).length, 42);
  assert.equal(selectSeats(state, "2F").length, 0);
  assert.deepEqual(computeFloorStats(state, "1F"), {
    total: 42,
    free: 42,
    used: 0,
    unknown: 0,
    observed: 42,
    usedPercent: 0,
  });
  assert.equal(transitionState(state, "setFloor", "2F").ok, false);
  assert.equal(transitionState(state, "setFilter", "lounge").ok, true);
  assert.equal(transitionState(state, "setFilter", "power").ok, true);
  assert.equal(transitionState(state, "setFilter", "pc").ok, false);
  assert.equal(transitionState(state, "setFilter", "table").ok, true);
  assert.equal(getSeatDefinition("1F-W01").label, "01");
  assert.equal(getSeatDefinition("1F-W51").label, "51");
  assert.equal(getSeatDefinition("missing"), null);
});

test("활성 배치도 좌표는 자유석 가구군을 따르고 원형 마커가 겹치지 않는다", () => {
  assert.deepEqual(WE_PLACE_MAP, {
    width: 1200,
    height: 1500,
    markerSize: 80,
  });
  const window = WE_PLACE_SEATS.filter((seat) => seat.groupId === "window-bar");
  assert.deepEqual(
    window.map((seat) => seat.map),
    [
      { x: 1080, y: 830 },
      { x: 1088, y: 910 },
      { x: 1070, y: 990 },
      { x: 1070, y: 1080 },
      { x: 987, y: 1130 },
      { x: 940, y: 1220 },
    ],
  );
  assert.ok(
    window.every(
      (seat, index) => !index || seat.map.y > window[index - 1].map.y,
    ),
  );
  const [first, second, third] = window.map((seat) => seat.map);
  const crossProduct =
    (second.x - first.x) * (third.y - first.y) -
    (second.y - first.y) * (third.x - first.x);
  assert.notEqual(crossProduct, 0);

  const sofa1 = WE_PLACE_SEATS.filter((seat) => seat.groupId === "sofa-1");
  const sofa2 = WE_PLACE_SEATS.filter((seat) => seat.groupId === "sofa-2");
  assert.deepEqual(
    sofa1.map((seat) => seat.map),
    [
      { x: 880, y: 935 },
      { x: 990, y: 1030 },
      { x: 880, y: 1125 },
      { x: 770, y: 1030 },
    ],
  );
  assert.deepEqual(
    sofa2.map((seat) => seat.map),
    [
      { x: 300, y: 1145 },
      { x: 405, y: 1235 },
      { x: 300, y: 1325 },
      { x: 195, y: 1235 },
    ],
  );
  const center = (seats) => ({
    x: seats.reduce((sum, seat) => sum + seat.map.x, 0) / seats.length,
    y: seats.reduce((sum, seat) => sum + seat.map.y, 0) / seats.length,
  });
  assert.ok(center(sofa1).x > center(sofa2).x);
  assert.ok(center(sofa1).y < center(sofa2).y);

  const pc = RETIRED_PC_SEATS;
  assert.deepEqual(
    pc.map((seat) => seat.map),
    Array.from({ length: 9 }, (_, index) => ({ x: 185, y: 200 + index * 80 })),
  );
  assert.deepEqual(SMALL_TABLES, [
    { x: 405, y: 490 },
    { x: 710, y: 490 },
    { x: 405, y: 750 },
    { x: 710, y: 750 },
  ]);
  for (const [index, table] of SMALL_TABLES.entries()) {
    const group = WE_PLACE_SEATS.filter(
      (seat) => seat.groupId === `small-table-${index + 1}`,
    );
    assert.deepEqual(
      group.map((seat) => seat.map),
      [
        { x: table.x, y: table.y - 90 },
        { x: table.x + 90, y: table.y },
        { x: table.x, y: table.y + 90 },
        { x: table.x - 90, y: table.y },
      ],
    );
    assert.ok(group.every((seat) => seat.map.x > pc[0].map.x));
  }
  assert.deepEqual(
    WE_PLACE_SEATS.filter((seat) => seat.groupId === "large-table").map(
      (seat) => seat.map,
    ),
    [135, 305].flatMap((y) => [525, 645, 765].map((x) => ({ x, y }))),
  );
  assert.deepEqual(ARMCHAIR_PAIRS, [
    { x: 1040, y: 220, angle: 90 },
    { x: 1040, y: 440, angle: 90 },
    { x: 1040, y: 660, angle: 90 },
  ]);
  for (const [index, pair] of ARMCHAIR_PAIRS.entries()) {
    const group = WE_PLACE_SEATS.filter(
      (seat) => seat.groupId === `armchair-${index + 1}`,
    );
    const angle = (pair.angle * Math.PI) / 180;
    assert.deepEqual(
      group.map((seat) => seat.map),
      [-66, 66].map((offset) => ({
        x: Math.round(pair.x + offset * Math.cos(angle)),
        y: Math.round(pair.y + offset * Math.sin(angle)),
      })),
    );
  }

  const radius = WE_PLACE_MAP.markerSize / 2;
  for (const seat of WE_PLACE_SEATS) {
    assert.ok(Number.isFinite(seat.map.x) && Number.isFinite(seat.map.y));
    assert.ok(
      seat.map.x >= radius && seat.map.x <= WE_PLACE_MAP.width - radius,
    );
    assert.ok(
      seat.map.y >= radius && seat.map.y <= WE_PLACE_MAP.height - radius,
    );
  }
  for (let left = 0; left < WE_PLACE_SEATS.length; left += 1) {
    for (let right = left + 1; right < WE_PLACE_SEATS.length; right += 1) {
      const a = WE_PLACE_SEATS[left];
      const b = WE_PLACE_SEATS[right];
      const distance = Math.hypot(a.map.x - b.map.x, a.map.y - b.map.y);
      assert.ok(
        distance + 0.000001 >= WE_PLACE_MAP.markerSize,
        `${a.label}번과 ${b.label}번 원형 마커가 겹칩니다.`,
      );
    }
  }
});

test("기존 v1 기록·프로필·관심 소식을 보존하고 자유석 42개 상태를 추가한다", () => {
  const now = at("2026-10-03T09:00:00+09:00");
  const record = {
    id: "legacy-record",
    seatId: "2F-A04",
    startedAt: now - 30 * minute,
    endedAt: now - 10 * minute,
    focusIntervals: [
      { startedAt: now - 28 * minute, endedAt: now - 13 * minute },
    ],
    pauseCount: 1,
  };
  const previous = {
    ...createInitialState(),
    seats: Object.fromEntries(
      LEGACY_SEATS.map((seat) => [seat.id, seat.status]),
    ),
    floor: "2F",
    profile: { nickname: "곰두리", department: "컴퓨터공학과" },
    interests: ["study-morning", "spot-window"],
    records: [record],
    lastSummary: record,
  };
  const restored = readStoredState(
    {
      getItem: (key) => (key === STORAGE_KEY ? JSON.stringify(previous) : null),
    },
    now,
  );
  assert.equal(restored.storageError, false);
  assert.equal(restored.state.version, 1);
  assert.equal(restored.state.floor, "1F");
  assert.deepEqual(restored.state.profile, previous.profile);
  assert.deepEqual(restored.state.interests, previous.interests);
  assert.equal(restored.state.records.length, 1);
  assert.equal(restored.state.records[0].seatId, "2F-A04");
  assert.equal(restored.state.records[0].focusMs, 15 * minute);
  assert.equal(restored.state.lastSummary.id, "legacy-record");
  assert.equal(aggregateFocus(restored.state, now).todayMs, 15 * minute);
  assert.equal(getSeatDefinition("2F-A04").floor, "2F");
  assert.equal(selectSeat(restored.state, "2F-A04").label, "A04");
  assert.equal(selectSeats(restored.state).length, 42);
  assert.equal(computeFloorStats(restored.state, "1F").free, 42);
  assert.equal(computeFloorStats(restored.state, "2F").total, 0);
  assert.ok(
    BASE_SEATS.every((seat) => restored.state.seats[seat.id] === "free"),
  );
  const roundTrip = normalizeState(restored.state, now);
  assert.deepEqual(roundTrip, restored.state);
});

test("기존 v1 진행 세션은 이어서 종료할 수 있고 We플레이스 통계에는 섞이지 않는다", () => {
  const start = at("2026-10-03T09:00:00+09:00");
  const previous = {
    ...createInitialState(),
    seats: { "2F-A04": "mine" },
    floor: "2F",
    session: {
      id: "legacy-session",
      seatId: "2F-A04",
      startedAt: start,
      focusIntervals: [
        { startedAt: start + minute, endedAt: start + 3 * minute },
      ],
      focusStartedAt: start + 4 * minute,
      focusRunning: true,
      hasFocused: true,
      pauseCount: 1,
    },
  };
  let state = normalizeState(previous, start + 7 * minute);
  assert.equal(state.session.seatId, "2F-A04");
  assert.equal(selectSeat(state, "2F-A04").status, "mine");
  assert.equal(selectSeats(state).length, 42);
  assert.equal(computeFloorStats(state, "1F").free, 42);
  assert.deepEqual(getSessionElapsed(state.session, start + 7 * minute), {
    seatMs: 7 * minute,
    focusMs: 5 * minute,
  });
  const continuation = transitionState(
    state,
    "startSession",
    "2F-A04",
    start + 7 * minute,
  );
  assert.equal(continuation.ok, true);
  assert.equal(continuation.state, state);
  assert.equal(
    transitionState(state, "startSession", "1F-W01", start + 7 * minute).ok,
    false,
  );
  state = action(state, "pauseFocus", undefined, start + 8 * minute);
  state = action(state, "resumeFocus", undefined, start + 9 * minute);
  state = action(state, "completeSession", undefined, start + 12 * minute);
  assert.equal(state.session, null);
  assert.equal(state.records[0].seatId, "2F-A04");
  assert.equal(state.records[0].focusMs, 9 * minute);
  assert.equal(state.records[0].seatMs, 12 * minute);
  assert.equal(state.records[0].pauseCount, 2);
  assert.equal(computeFloorStats(state, "1F").free, 42);
  const restored = normalizeState(state, start + 13 * minute);
  assert.equal(restored.records[0].seatId, "2F-A04");
  assert.equal(restored.records[0].focusMs, 9 * minute);
  state = action(restored, "startSession", "1F-W01", start + 14 * minute);
  assert.equal(state.session.seatId, "1F-W01");
  assert.equal(computeFloorStats(state, "1F").free, 41);
});

test("기존 좌석은 기록 조회만 가능하고 새 이용은 시작할 수 없다", () => {
  const state = createInitialState();
  assert.equal(LEGACY_SEATS.length, 24);
  for (const seat of LEGACY_SEATS) {
    assert.equal(getSeatDefinition(seat.id), seat);
    assert.notEqual(selectSeat(state, seat.id), null);
    assert.equal(transitionState(state, "startSession", seat.id).ok, false);
  }
  assert.equal(transitionState(state, "startSession", "1F-W01").ok, true);
  assert.equal(transitionState(state, "startSession", "missing").ok, false);
});

test("이전 14석 목업 저장값을 자유석 42개로 확장해도 상태·기록·진행 세션 ID를 유지한다", () => {
  const now = at("2026-10-04T09:00:00+09:00");
  const record = {
    id: "record-from-14-seat-preview",
    seatId: "1F-W07",
    startedAt: now - 40 * minute,
    endedAt: now - 20 * minute,
    focusIntervals: [
      { startedAt: now - 35 * minute, endedAt: now - 20 * minute },
    ],
    pauseCount: 0,
  };
  const previous = {
    ...createInitialState(),
    seats: {
      ...Object.fromEntries(
        BASE_SEATS.slice(0, 14).map((seat) => [seat.id, "free"]),
      ),
      "1F-W03": "occupied",
      "1F-W04": "unknown",
      "1F-W14": "mine",
    },
    profile: { nickname: "곰두리", department: "컴퓨터공학과" },
    interests: ["spot-window"],
    records: [record],
    lastSummary: record,
    session: {
      id: "session-from-14-seat-preview",
      seatId: "1F-W14",
      startedAt: now - 10 * minute,
      focusIntervals: [],
      focusStartedAt: now - 9 * minute,
      focusRunning: true,
      hasFocused: true,
      pauseCount: 0,
    },
  };
  assert.equal(Object.keys(previous.seats).length, 14);
  let saved = JSON.stringify(previous);
  const storage = {
    getItem: (key) => (key === STORAGE_KEY ? saved : null),
    setItem: (key, value) => {
      assert.equal(key, STORAGE_KEY);
      saved = value;
    },
  };
  let state = readStoredState(storage, now).state;
  assert.equal(Object.keys(state.seats).length, 42);
  assert.equal(state.seats["1F-W03"], "occupied");
  assert.equal(state.seats["1F-W04"], "unknown");
  assert.equal(state.seats["1F-W14"], "mine");
  assert.ok(
    BASE_SEATS.slice(14).every((seat) => state.seats[seat.id] === "free"),
  );
  assert.deepEqual(state.profile, previous.profile);
  assert.deepEqual(state.interests, previous.interests);
  assert.equal(state.records[0].seatId, "1F-W07");
  assert.equal(state.records[0].focusMs, 15 * minute);
  assert.equal(state.lastSummary.id, record.id);
  assert.equal(state.session.id, previous.session.id);
  assert.equal(state.session.seatId, "1F-W14");
  assert.equal(selectSeat(state, "1F-W07").groupId, "sofa-1");
  assert.equal(selectSeat(state, "1F-W14").groupId, "sofa-2");
  assert.equal(getSessionElapsed(state.session, now).focusMs, 9 * minute);
  assert.equal(computeFloorStats(state, "1F").free, 39);
  state = action(state, "completeSession", undefined, now + minute);
  assert.equal(state.records.length, 2);
  assert.equal(state.records[0].seatId, "1F-W14");
  assert.equal(state.records[0].focusMs, 10 * minute);
  assert.equal(state.records[1].seatId, "1F-W07");
  assert.equal(computeFloorStats(state, "1F").free, 40);
  assert.equal(persistState(state, storage), true);
  state = readStoredState(storage, now + 2 * minute).state;
  assert.equal(state.records.length, 2);
  assert.equal(state.seats["1F-W14"], "free");
  state = action(state, "startSession", "1F-W51", now + 3 * minute);
  assert.equal(state.session.seatId, "1F-W51");
  assert.equal(computeFloorStats(state, "1F").free, 39);
  assert.equal(
    transitionState(createInitialState(), "startSession", "1F-W52").ok,
    false,
  );
});

test("PC 예약석 9개는 이력 조회만 가능하고 선택·신규 이용·자유석 집계에서 제외한다", () => {
  const state = createInitialState();
  assert.equal(RETIRED_PC_SEATS.length, 9);
  assert.deepEqual(
    RETIRED_PC_SEATS.map((seat) => seat.id),
    Array.from({ length: 9 }, (_, index) => `1F-W${index + 15}`),
  );
  assert.ok(RETIRED_PC_SEATS.every((seat) => seat.kind === "pc"));
  const currentIds = new Set(selectSeats(state).map((seat) => seat.id));
  for (const seat of RETIRED_PC_SEATS) {
    assert.equal(getSeatDefinition(seat.id).groupId, "pc-row");
    assert.equal(selectSeat(state, seat.id).label, seat.label);
    assert.equal(currentIds.has(seat.id), false);
    assert.equal(Object.hasOwn(state.seats, seat.id), false);
    assert.equal(transitionState(state, "startSession", seat.id).ok, false);
  }
  assert.equal(computeFloorStats(state, "1F").total, 42);
  assert.equal(computeFloorStats(state, "1F").free, 42);
  const restoredFilter = normalizeState({ ...state, filter: "pc" });
  assert.equal(restoredFilter.filter, "all");
});

test("기존 PC 기록·진행 세션은 보존하고 종료할 수 있지만 자유석 42개에는 반영하지 않는다", () => {
  const now = at("2026-10-04T09:00:00+09:00");
  const record = {
    id: "previous-pc-record",
    seatId: "1F-W23",
    startedAt: now - 40 * minute,
    endedAt: now - 20 * minute,
    focusIntervals: [
      { startedAt: now - 35 * minute, endedAt: now - 20 * minute },
    ],
    pauseCount: 0,
  };
  const previous = {
    ...createInitialState(),
    seats: {
      ...Object.fromEntries(
        [...BASE_SEATS, ...RETIRED_PC_SEATS].map((seat) => [seat.id, "free"]),
      ),
      "1F-W15": "mine",
    },
    filter: "pc",
    records: [record],
    lastSummary: record,
    session: {
      id: "previous-pc-session",
      seatId: "1F-W15",
      startedAt: now - 10 * minute,
      focusIntervals: [],
      focusStartedAt: now - 9 * minute,
      focusRunning: true,
      hasFocused: true,
      pauseCount: 0,
    },
  };
  assert.equal(Object.keys(previous.seats).length, 51);
  let saved = JSON.stringify(previous);
  const storage = {
    getItem: (key) => (key === STORAGE_KEY ? saved : null),
    setItem: (key, value) => {
      assert.equal(key, STORAGE_KEY);
      saved = value;
    },
  };
  let state = readStoredState(storage, now).state;
  assert.equal(state.filter, "all");
  assert.equal(state.records.length, 1);
  assert.equal(state.records[0].seatId, "1F-W23");
  assert.equal(state.records[0].focusMs, 15 * minute);
  assert.equal(state.lastSummary.id, record.id);
  assert.equal(state.session.id, previous.session.id);
  assert.equal(state.session.seatId, "1F-W15");
  assert.equal(selectSeat(state, "1F-W15").status, "mine");
  assert.deepEqual(getSessionElapsed(state.session, now), {
    seatMs: 10 * minute,
    focusMs: 9 * minute,
  });
  assert.equal(selectSeats(state).length, 42);
  assert.equal(computeFloorStats(state, "1F").free, 42);
  assert.equal(computeFloorStats(state, "1F").used, 0);
  const continuation = transitionState(state, "startSession", "1F-W15", now);
  assert.equal(continuation.ok, true);
  assert.equal(continuation.state, state);
  assert.equal(transitionState(state, "startSession", "1F-W24", now).ok, false);
  state = action(state, "completeSession", undefined, now + minute);
  assert.equal(state.session, null);
  assert.equal(state.records.length, 2);
  assert.equal(state.records[0].seatId, "1F-W15");
  assert.equal(state.records[0].focusMs, 10 * minute);
  assert.equal(state.records[1].seatId, "1F-W23");
  assert.equal(aggregateFocus(state, now + minute).todayMs, 25 * minute);
  assert.equal(computeFloorStats(state, "1F").free, 42);
  assert.equal(
    transitionState(state, "startSession", "1F-W15", now + minute).ok,
    false,
  );
  assert.equal(persistState(state, storage), true);
  state = readStoredState(storage, now + 2 * minute).state;
  assert.equal(Object.keys(state.seats).length, 42);
  assert.deepEqual(
    state.records.map((item) => item.seatId),
    ["1F-W15", "1F-W23"],
  );
  state = action(state, "startSession", "1F-W24", now + 3 * minute);
  assert.equal(state.session.seatId, "1F-W24");
  assert.equal(computeFloorStats(state, "1F").free, 41);
});
