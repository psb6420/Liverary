import { useState } from "react";
import { statusText } from "../lib/model.js";
import { Badge, Heading, Icon } from "../components/UI.jsx";
import WePlaceMap from "../components/WePlaceMap.jsx";

export default function Seats({ app, open }) {
  const [view, setView] = useState("map");
  const [filter, setFilter] = useState("all");
  const stats = app.floorStats("1F");
  const seats = app.seatsForFloor("1F");
  const filters = [
    ["all", "전체"],
    ["window", "창가"],
    ["power", "콘센트"],
    ["lounge", "소파"],
    ["table", "테이블"],
  ];
  const matches = (seat) =>
    filter === "all" || seat.kind === filter || seat.amenities.includes(filter);
  const select = (seat) => open({ type: "seat", seatId: seat.id });

  return (
    <>
      <Heading action={<Badge>DEMO</Badge>}>자리 찾기</Heading>
      <div className="seat-overview we-place-overview">
        <div>
          <span className="we-place-location">미래도서관 1층 · ④</span>
          <h2>We플레이스</h2>
          <span>창가 · 소파 · 테이블</span>
        </div>
        <strong aria-live="polite">
          {stats.free}
          <small>석 가능</small>
        </strong>
      </div>
      <div
        className="floor-tabs seat-view-tabs"
        role="tablist"
        aria-label="좌석 보기 방식"
      >
        {[
          ["map", "좌석배치도"],
          ["list", "좌석목록"],
        ].map(([value, label]) => (
          <button
            key={value}
            id={`seat-tab-${value}`}
            role="tab"
            aria-selected={view === value}
            aria-controls="seat-view-panel"
            className={view === value ? "selected" : ""}
            onClick={() => setView(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="chips we-place-filters" aria-label="좌석 구분">
        {filters.map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? "selected" : ""}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <section
        id="seat-view-panel"
        role="tabpanel"
        aria-labelledby={`seat-tab-${view}`}
      >
        {view === "map" ? (
          <div className="we-place-map-card card">
            <div className="seat-legend we-place-legend">
              <span>
                <i />
                이용 가능
              </span>
              <span>
                <i className="occupied" />
                이용 중
              </span>
              <span>
                <i className="mine" />내 자리
              </span>
              <span className="power-seat-label">
                <Icon name="power" />
                1–6번 콘센트
              </span>
            </div>
            <WePlaceMap seats={seats} matches={matches} onSelect={select} />
          </div>
        ) : (
          <div className="we-place-list card">
            {seats.filter(matches).map((seat) => (
              <button
                key={seat.id}
                className={`we-place-list-row ${seat.status}`}
                onClick={() => select(seat)}
                aria-label={`${seat.label}번 ${seat.groupLabel} ${statusText(seat.status)}`}
              >
                <span className="list-seat-number">{seat.label}</span>
                <span className="list-seat-copy">
                  <strong>{seat.label}번 좌석</strong>
                  <small>
                    {seat.groupLabel}
                    {seat.amenities.includes("power") && " · 콘센트"}
                  </small>
                </span>
                <span className="list-seat-status">
                  {statusText(seat.status)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
