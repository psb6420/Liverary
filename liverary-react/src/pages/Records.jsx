import { formatDuration } from "../lib/model.js";
import { dateLabel, FLOOR_LABEL } from "../lib/viewHelpers.js";
import { Heading, Icon, SectionTitle } from "../components/UI.jsx";
import ActiveSession from "../components/ActiveSession.jsx";

function RecordList({ app, open }) {
  return (
    <section className="section">
      <SectionTitle
        action={
          <span className="count-label">{app.state.records.length}개</span>
        }
      >
        완료한 기록
      </SectionTitle>
      <div className="records-list">
        {app.state.records.length ? (
          app.state.records.map((record) => {
            const seat = app.getSeat(record.seatId);
            return (
              <button
                className="record-row card"
                key={record.id}
                onClick={() => open({ type: "share", record })}
                aria-label={`${dateLabel(record.endedAt)} ${seat.label} 공부 기록`}
              >
                <span className="record-date">{dateLabel(record.endedAt)}</span>
                <span className="record-copy">
                  <strong>
                    {FLOOR_LABEL[seat.floor]} · {seat.label}
                  </strong>
                  <span>좌석 이용 {formatDuration(record.seatMs)}</span>
                </span>
                <strong className="record-duration">
                  {formatDuration(record.focusMs)}
                </strong>
                <Icon name="arrow" />
              </button>
            );
          })
        ) : (
          <div className="empty-state card">
            <Icon name="records" />
            <span>아직 완료한 기록이 없어요.</span>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Records({ app, go, open }) {
  const max = Math.max(30 * 60000, ...app.weekValues);
  const todayIndex = app.todayIndex;
  return (
    <>
      <Heading>공부 기록</Heading>
      <div className="record-totals">
        <div className="card">
          <span>오늘</span>
          <strong>{formatDuration(app.todayMs)}</strong>
        </div>
        <div className="card">
          <span>이번 주</span>
          <strong>{formatDuration(app.weekMs)}</strong>
        </div>
      </div>
      <ActiveSession app={app} go={go} />
      <section className="weekly-chart card">
        <div className="row-between">
          <h2>주간 순공시간</h2>
          <Icon name="calendar" />
        </div>
        <div className="week-bars">
          {app.weekValues.map((ms, index) => (
            <div
              className={`week-bar ${index === todayIndex ? "today" : ""}`}
              key={index}
              aria-label={`${["월", "화", "수", "목", "금", "토", "일"][index]}요일 ${formatDuration(ms)}`}
            >
              <span className="bar-track">
                <span
                  style={{
                    height: ms ? `${Math.max(8, (ms / max) * 100)}%` : "3px",
                  }}
                />
              </span>
              <span>{["월", "화", "수", "목", "금", "토", "일"][index]}</span>
            </div>
          ))}
        </div>
      </section>
      <RecordList app={app} open={open} />
    </>
  );
}
