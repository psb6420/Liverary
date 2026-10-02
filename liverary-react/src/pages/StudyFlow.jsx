import { formatClock, formatDuration, statusText } from "../lib/model.js";
import { FLOOR_LABEL } from "../lib/viewHelpers.js";
import { Badge, Button, Heading, Icon } from "../components/UI.jsx";
import AmenityList from "../components/AmenityList.jsx";
import gomduri from "../assets/gomduri.png";

export function Checkin({ seat, app, go, start }) {
  const busy = seat.status !== "free";
  return (
    <>
      <Heading>{seat.label} 좌석</Heading>
      <section className="checkin-card card">
        <div className="checkin-visual">
          <Badge tone={busy ? "warm" : "purple"}>
            {statusText(seat.status)}
          </Badge>
          <strong>{seat.label}</strong>
          <span>
            미래도서관 {FLOOR_LABEL[seat.floor]} · {seat.zone}
          </span>
          <img src={gomduri} alt="곰두리" />
        </div>
        <div className="checkin-body">
          <AmenityList seat={seat} />
          <Button
            tone="primary"
            onClick={busy ? () => go("seats") : () => start(seat.id)}
          >
            {busy ? "다른 자리 보기" : "이용 시작"}
          </Button>
          <Button onClick={() => go("home")}>닫기</Button>
        </div>
      </section>
    </>
  );
}

export function Session({ app, go, open }) {
  const { session } = app.state;
  const seat = app.getSeat(session.seatId);
  const status = !session.hasFocused
    ? "집중 전"
    : session.focusRunning
      ? "집중 중"
      : "쉬는 중";
  return (
    <section className="session-page">
      <div className="session-top">
        <span>
          미래도서관 {FLOOR_LABEL[seat.floor]}
          <strong>
            {seat.label} · {seat.zone}
          </strong>
        </span>
        <Badge tone={session.focusRunning ? "purple" : "warm"}>{status}</Badge>
      </div>
      <div className="timer-card">
        <div className="timer-rings" aria-hidden="true" />
        <div className="timer-content">
          <span>순공시간</span>
          <strong className="focus-clock">
            {formatClock(app.elapsed.focusMs)}
          </strong>
        </div>
        <img src={gomduri} alt="곰두리" />
      </div>
      <div className="session-metrics">
        <div className="card">
          <span>좌석 이용시간</span>
          <strong>{formatClock(app.elapsed.seatMs)}</strong>
        </div>
        <div className="card">
          <span>일시정지</span>
          <strong>{session.pauseCount}회</strong>
        </div>
      </div>
      <div className="action-stack">
        <Button
          tone="primary"
          onClick={
            session.focusRunning
              ? app.pauseFocus
              : session.hasFocused
                ? app.resumeFocus
                : app.startFocus
          }
        >
          <Icon name={session.focusRunning ? "pause" : "play"} />
          {session.focusRunning
            ? "일시정지"
            : session.hasFocused
              ? "집중 재개"
              : "집중 시작"}
        </Button>
        <Button onClick={() => open({ type: "end" })}>좌석 이용 종료</Button>
        <button className="text-button" onClick={() => go("home")}>
          홈
        </button>
      </div>
    </section>
  );
}

export function Summary({ app, go, open }) {
  const record = app.state.lastSummary;
  return (
    <>
      <section className="summary-card card">
        <Badge tone="purple">
          <Icon name="check" />
          기록 완료
        </Badge>
        <h1>
          오늘 {formatDuration(app.todayMs)}
          <br />
          집중했어요
        </h1>
        <img src={gomduri} alt="곰두리" />
      </section>
      <div className="summary-metrics">
        <div className="card">
          <span>이번 집중</span>
          <strong>{formatDuration(record.focusMs)}</strong>
        </div>
        <div className="card">
          <span>좌석 이용</span>
          <strong>{formatDuration(record.seatMs)}</strong>
        </div>
        <div className="card">
          <span>일시정지</span>
          <strong>{record.pauseCount}회</strong>
        </div>
      </div>
      <div className="action-stack">
        <Button tone="primary" onClick={() => open({ type: "share", record })}>
          <Icon name="share" />
          공유 카드
        </Button>
        <Button onClick={() => go("records")}>기록 보기</Button>
        <button className="text-button" onClick={() => go("home")}>
          홈
        </button>
      </div>
    </>
  );
}
