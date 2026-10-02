import { formatClock } from "../lib/model.js";
import { FLOOR_LABEL } from "../lib/viewHelpers.js";
import { Badge, Button, Icon } from "./UI.jsx";

export default function ActiveSession({ app, go }) {
  if (!app.state.session) return null;
  const seat = app.getSeat(app.state.session.seatId);
  const status = !app.state.session.hasFocused
    ? "집중 전"
    : app.state.session.focusRunning
      ? "집중 중"
      : "쉬는 중";
  return (
    <section className="active-session card">
      <div className="row-between">
        <span className="live-label">
          <span />
          좌석 이용 중
        </span>
        <Badge>{status}</Badge>
      </div>
      <strong className="active-place">
        {FLOOR_LABEL[seat.floor]} · {seat.label}
      </strong>
      <div className="active-times">
        <span>
          순공시간 <b>{formatClock(app.elapsed.focusMs)}</b>
        </span>
        <span>
          좌석 이용 <b>{formatClock(app.elapsed.seatMs)}</b>
        </span>
      </div>
      <Button tone="soft" onClick={() => go("session")}>
        이용 화면
        <Icon name="arrow" />
      </Button>
    </section>
  );
}
