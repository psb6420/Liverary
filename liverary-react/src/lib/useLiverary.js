import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  STORAGE_KEY,
  aggregateFocus,
  computeFloorStats,
  getSessionElapsed,
  normalizeState,
  persistState,
  readStoredState,
  selectSeat,
  selectSeats,
  transitionState,
} from "./model.js";

function browserStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function useLiverary() {
  const [initial] = useState(() => readStoredState(browserStorage()));
  const [state, setState] = useState(initial.state);
  const [storageError, setStorageError] = useState(initial.storageError);
  const [now, setNow] = useState(Date.now);
  const stateRef = useRef(state);

  const dispatch = useCallback((action, payload) => {
    const timestamp = Date.now();
    const transition = transitionState(
      stateRef.current,
      action,
      payload,
      timestamp,
    );
    const { state: nextState, ...result } = transition;
    if (result.ok && nextState !== stateRef.current) {
      stateRef.current = nextState;
      setStorageError(!persistState(nextState, browserStorage()));
      setState(nextState);
      setNow(timestamp);
    }
    return result;
  }, []);

  useEffect(() => {
    const refreshClock = () => setNow(Date.now());
    const interval = window.setInterval(
      refreshClock,
      state.session ? 1000 : 30000,
    );
    document.addEventListener("visibilitychange", refreshClock);
    window.addEventListener("focus", refreshClock);
    refreshClock();
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshClock);
      window.removeEventListener("focus", refreshClock);
    };
  }, [Boolean(state.session)]);

  useEffect(() => {
    const syncStorage = (event) => {
      if (event.key !== STORAGE_KEY || event.storageArea !== browserStorage())
        return;
      try {
        const nextState = normalizeState(JSON.parse(event.newValue));
        stateRef.current = nextState;
        setState(nextState);
        setNow(Date.now());
        setStorageError(false);
      } catch {
        setStorageError(true);
      }
    };
    window.addEventListener("storage", syncStorage);
    return () => window.removeEventListener("storage", syncStorage);
  }, []);

  const seats = useMemo(() => selectSeats(state), [state.seats]);
  const elapsed = useMemo(
    () => getSessionElapsed(state.session, now),
    [state.session, now],
  );
  const totals = useMemo(
    () => aggregateFocus(state, now),
    [state.records, state.session, now],
  );
  const getSeat = useCallback(
    (seatId) => selectSeat(state, seatId),
    [state.seats],
  );
  const seatsForFloor = useCallback(
    (floor) => selectSeats(state, floor),
    [state.seats],
  );
  const floorStats = useCallback(
    (floor) => computeFloorStats(state, floor),
    [state.seats],
  );

  return {
    state,
    seats,
    now,
    storageError,
    elapsed,
    ...totals,
    getSeat,
    seatsForFloor,
    floorStats,
    startSession: useCallback(
      (seatId) => dispatch("startSession", seatId),
      [dispatch],
    ),
    startFocus: useCallback(() => dispatch("startFocus"), [dispatch]),
    pauseFocus: useCallback(() => dispatch("pauseFocus"), [dispatch]),
    resumeFocus: useCallback(() => dispatch("resumeFocus"), [dispatch]),
    completeSession: useCallback(() => dispatch("completeSession"), [dispatch]),
    toggleInterest: useCallback(
      (id) => dispatch("toggleInterest", id),
      [dispatch],
    ),
    setProfile: useCallback(
      (profile) => dispatch("setProfile", profile),
      [dispatch],
    ),
    logout: useCallback(() => dispatch("logout"), [dispatch]),
    setFloor: useCallback((floor) => dispatch("setFloor", floor), [dispatch]),
    setFilter: useCallback(
      (filter) => dispatch("setFilter", filter),
      [dispatch],
    ),
    setCommunityTab: useCallback(
      (tab) => dispatch("setCommunityTab", tab),
      [dispatch],
    ),
  };
}

export default useLiverary;
