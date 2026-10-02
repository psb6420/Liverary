import { useEffect, useRef, useState } from "react";
import { useLiverary } from "./lib/useLiverary.js";
import {
  BASE_SEATS,
  COMMUNITY_ITEMS,
  formatClock,
  statusText,
} from "./lib/model.js";
import { FLOOR_LABEL } from "./lib/viewHelpers.js";
import { Badge, Button, Icon, Sheet } from "./components/UI.jsx";
import { QrSheet, ShareSheet } from "./components/Tools.jsx";
import { EntryForm, ProfileForm } from "./components/Forms.jsx";
import AmenityList from "./components/AmenityList.jsx";
import Home from "./pages/Home.jsx";
import Seats from "./pages/Seats.jsx";
import Community from "./pages/Community.jsx";
import Records from "./pages/Records.jsx";
import My from "./pages/My.jsx";
import { Checkin, Session, Summary } from "./pages/StudyFlow.jsx";
import logo from "./assets/logo.svg";
import atrium from "./assets/future-library-atrium.jpg";
import lounge from "./assets/future-library-knu-lounge.jpg";

const MENU = [
  { id: "seats", label: "자리" },
  { id: "community", label: "소식" },
  { id: "home", label: "홈" },
  { id: "records", label: "기록" },
  { id: "my", label: "MY" },
];

function readRoute() {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith("checkin/")) {
    try {
      const seatId = decodeURIComponent(hash.slice(8));
      if (BASE_SEATS.some((seat) => seat.id === seatId))
        return { page: "checkin", seatId };
    } catch {
      /* Invalid QR links return home. */
    }
  }
  if ([...MENU.map((item) => item.id), "session", "summary"].includes(hash))
    return { page: hash };
  const seatId = new URLSearchParams(window.location.search).get("seat");
  if (!hash && BASE_SEATS.some((seat) => seat.id === seatId))
    return { page: "checkin", seatId };
  return { page: "home" };
}

export default function App() {
  const app = useLiverary();
  const [route, setRoute] = useState(readRoute);
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState("");
  const scrollRef = useRef(null);
  const toastTimer = useRef(null);
  useEffect(() => {
    const sync = () => {
      setRoute(readRoute());
      setSheet(null);
    };
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      clearTimeout(toastTimer.current);
    };
  }, []);
  function go(page, seatId) {
    const hash =
      page === "checkin"
        ? `#checkin/${encodeURIComponent(seatId)}`
        : `#${page}`;
    setSheet(null);
    setRoute({ page, seatId });
    if (window.location.hash !== hash) window.location.hash = hash;
  }
  function notify(message) {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2500);
  }
  let page = route.page;
  if (page === "checkin" && app.state.session) page = "session";
  if (page === "session" && !app.state.session) page = "records";
  if (page === "summary" && !app.state.lastSummary) page = "records";
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [page]);
  const taskPage = ["checkin", "session", "summary"].includes(page);
  function start(seatId) {
    const result = app.startSession(seatId);
    if (result.ok) {
      go("session");
    } else notify(result.error);
  }
  function end() {
    const result = app.completeSession();
    if (result.ok) {
      go("summary");
      notify("좌석을 반납하고 기록을 저장했어요.");
    } else notify(result.error);
  }
  const selectedSeat = sheet?.seatId ? app.getSeat(sheet.seatId) : null;
  const props = { app, go, open: setSheet };
  const title =
    sheet?.type === "seat"
      ? `${selectedSeat.label} 좌석`
      : sheet?.type === "entry"
        ? "좌석 번호 입력"
        : sheet?.type === "profile"
          ? "내 정보"
          : sheet?.type === "end"
            ? "이용을 마칠까요?"
            : sheet?.type === "article"
              ? "공부 소식"
              : sheet?.type === "saved"
                ? "저장한 소식"
                : "";
  return (
    <div className="app-stage">
      <div className="app-window">
        <div className="app-frame" inert={sheet ? true : undefined}>
          <header className="app-header">
            <button
              className="brand"
              onClick={() => go("home")}
              aria-label="Liverary 홈"
            >
              <img src={logo} alt="" width="36" height="36" />
              <span>
                <strong>Liverary</strong>
                <small>KANGWON NATIONAL UNIVERSITY</small>
              </span>
            </button>
            <div className="header-right">
              <span className="library-label">
                <Icon name="map" />
                미래도서관
              </span>
              <button
                className="avatar"
                aria-label="내 정보"
                onClick={() => go("my")}
              >
                {app.state.profile?.nickname.slice(0, 1) || "G"}
              </button>
            </div>
          </header>
          <main
            className={`page-scroll ${taskPage ? "task-page" : ""}`}
            ref={scrollRef}
          >
            {app.storageError && (
              <p className="storage-error" role="alert">
                기록을 저장할 수 없어요. 브라우저 저장 공간을 확인해 주세요.
              </p>
            )}
            {page === "home" && <Home {...props} />}
            {page === "seats" && <Seats {...props} />}
            {page === "community" && <Community {...props} />}
            {page === "records" && <Records {...props} />}
            {page === "my" && <My {...props} />}
            {page === "checkin" && (
              <Checkin
                {...props}
                seat={app.getSeat(route.seatId)}
                start={start}
              />
            )}
            {page === "session" && <Session {...props} />}
            {page === "summary" && <Summary {...props} />}
          </main>
          {!taskPage && (
            <nav className="bottom-nav" aria-label="주요 메뉴">
              {MENU.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${item.id === "home" ? "nav-home" : ""} ${item.id === page ? "active" : ""}`}
                  aria-current={item.id === page ? "page" : undefined}
                  onClick={() => go(item.id)}
                >
                  <span className="nav-icon">
                    <Icon name={item.id} />
                  </span>
                  <span>{item.label}</span>
                  {item.id === "records" && app.state.session && (
                    <i className="nav-dot" />
                  )}
                </button>
              ))}
            </nav>
          )}
        </div>
        {sheet && !["share", "qr"].includes(sheet.type) && (
          <Sheet title={title} onClose={() => setSheet(null)}>
            {sheet.type === "seat" && (
              <>
                <div className="seat-detail">
                  <Badge
                    tone={selectedSeat.status === "free" ? "purple" : "warm"}
                  >
                    {statusText(selectedSeat.status)}
                  </Badge>
                  <p>
                    미래도서관 {FLOOR_LABEL[selectedSeat.floor]} ·{" "}
                    {selectedSeat.zone}
                  </p>
                  <AmenityList seat={selectedSeat} />
                </div>
                <div className="action-stack">
                  {selectedSeat.status === "free" && (
                    <Button
                      tone="primary"
                      onClick={() => go("checkin", selectedSeat.id)}
                    >
                      QR 이용 시작
                    </Button>
                  )}
                  {selectedSeat.status === "mine" && (
                    <Button tone="primary" onClick={() => go("session")}>
                      이용 화면
                    </Button>
                  )}
                  <Button onClick={() => setSheet(null)}>닫기</Button>
                </div>
              </>
            )}
            {sheet.type === "entry" && (
              <EntryForm
                app={app}
                go={go}
                close={() => setSheet(null)}
                notify={notify}
              />
            )}
            {sheet.type === "profile" && (
              <ProfileForm
                app={app}
                close={() => setSheet(null)}
                notify={notify}
              />
            )}
            {sheet.type === "end" && (
              <>
                <div className="end-metrics">
                  <div>
                    <span>좌석 이용</span>
                    <strong>{formatClock(app.elapsed.seatMs)}</strong>
                  </div>
                  <div>
                    <span>순공시간</span>
                    <strong>{formatClock(app.elapsed.focusMs)}</strong>
                  </div>
                </div>
                <div className="action-stack">
                  <Button tone="danger" onClick={end}>
                    종료하고 기록하기
                  </Button>
                  <Button onClick={() => setSheet(null)}>계속 이용하기</Button>
                </div>
              </>
            )}
            {sheet.type === "article" && (
              <>
                <Badge>{sheet.item.eyebrow}</Badge>
                <h3 className="article-title">{sheet.item.title}</h3>
                <p className="article-details">{sheet.item.body}</p>
                {sheet.item.type !== "event" && (
                  <img
                    className="article-photo"
                    src={sheet.item.type === "spot" ? lounge : atrium}
                    alt="미래도서관 내부 공간"
                  />
                )}
                <Button
                  tone="soft"
                  onClick={() => app.toggleInterest(sheet.item.id)}
                >
                  <Icon name="bookmark" />
                  {app.state.interests.includes(sheet.item.id)
                    ? "저장 취소"
                    : "저장"}
                </Button>
              </>
            )}
            {sheet.type === "saved" && (
              <div className="saved-list">
                {COMMUNITY_ITEMS.filter((item) =>
                  app.state.interests.includes(item.id),
                ).map((item) => (
                  <button
                    key={item.id}
                    className="saved-row"
                    onClick={() => setSheet({ type: "article", item })}
                  >
                    <Icon name={item.icon} />
                    <span>{item.title}</span>
                    <Icon name="arrow" />
                  </button>
                ))}
                {!app.state.interests.length && (
                  <p className="empty-text">저장한 소식이 없어요.</p>
                )}
              </div>
            )}
          </Sheet>
        )}
        {sheet?.type === "qr" && (
          <QrSheet
            seats={app.seats}
            onClose={() => setSheet(null)}
            notify={notify}
          />
        )}
        {sheet?.type === "share" && (
          <ShareSheet
            record={sheet.record}
            profile={app.state.profile}
            onClose={() => setSheet(null)}
            notify={notify}
          />
        )}
        <div
          className={`toast ${toast ? "visible" : ""}`}
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      </div>
    </div>
  );
}
