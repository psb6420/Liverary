import test from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY,
  aggregateFocus,
  computeFloorStats,
  createInitialState,
  getSessionElapsed,
  normalizeState,
  persistState,
  readStoredState,
  startOfKoreaWeek,
  transitionState,
} from "./model.js";

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
  const initialFree = computeFloorStats(state, "2F").free;
  state = action(state, "startSession", "2F-A04", start);
  assert.equal(state.seats["2F-A04"], "mine");
  assert.equal(computeFloorStats(state, "2F").free, initialFree - 1);
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
  assert.equal(finished.state.seats["2F-A04"], "free");
  assert.equal(computeFloorStats(finished.state, "2F").free, initialFree);
  assert.equal(finished.state.lastSummary.id, finished.record.id);
});

test("새로고침으로 복원된 진행 중 세션은 실제 경과시간을 계속 센다", () => {
  const start = at("2026-10-02T09:00:00+09:00");
  let state = action(createInitialState(), "startSession", "2F-A04", start);
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
  assert.equal(restored.state.seats["2F-A04"], "mine");
  assert.ok(storage.has(STORAGE_KEY));
});

test("한국 시간 자정을 넘은 집중은 날짜별로 나누고 이전 주 기록은 제외한다", () => {
  const beforeMidnight = at("2026-09-27T23:50:00+09:00");
  let state = action(
    createInitialState(),
    "startSession",
    "2F-A04",
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
    "1F-A02",
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
  let state = action(createInitialState(), "startSession", "2F-A04", start);
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
    seats: { ...initial.seats, "1F-A02": "mine", "2F-B04": "not-a-state" },
    session: { seatId: "missing", startedAt: now - minute },
    profile: { nickname: "   ", department: "학교" },
    records: [
      null,
      { seatId: "missing" },
      {
        id: "overlap",
        seatId: "2F-A04",
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
  assert.equal(restored.seats["1F-A02"], "free");
  assert.equal(restored.seats["2F-B04"], "free");
  assert.equal(restored.records.length, 1);
  assert.equal(restored.records[0].focusMs, 15 * minute);
  assert.equal(restored.records[0].pauseCount, 0);
  assert.equal(aggregateFocus(restored, now).todayMs, 15 * minute);
});

test("다른 좌석의 동시 이용과 집중 중복 시작을 막고 프로필은 로컬 정보로 저장한다", () => {
  const now = at("2026-10-02T09:00:00+09:00");
  let state = action(createInitialState(), "startSession", "2F-A04", now);
  assert.equal(transitionState(state, "startSession", "1F-A02", now).ok, false);
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
