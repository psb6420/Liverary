import { statusText } from "../lib/model.js";
import { FLOOR_LABEL } from "../lib/viewHelpers.js";
import { Heading, Icon } from "../components/UI.jsx";

export default function Seats({ app, open }) {
  const floor = app.state.floor;
  const stats = app.floorStats(floor);
  const filters = [
    ["all", "전체"],
    ["quiet", "조용한 곳"],
    ["power", "콘센트"],
    ["window", "창가"],
  ];
  return (
    <>
      <Heading>자리 찾기</Heading>
      <div className="floor-tabs" role="tablist" aria-label="층 선택">
        {["1F", "2F"].map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={value === floor}
            className={value === floor ? "selected" : ""}
            onClick={() => app.setFloor(value)}
          >
            {FLOOR_LABEL[value]}
          </button>
        ))}
      </div>
      <div className="seat-overview">
        <div>
          <h2>{FLOOR_LABEL[floor]} 자유석</h2>
          <span>
            전체 {stats.total}석 · 확인 필요 {stats.unknown}석
          </span>
        </div>
        <strong>
          {stats.free}
          <small>석 가능</small>
        </strong>
      </div>
      <div className="chips" aria-label="자리 조건">
        {filters.map(([value, label]) => (
          <button
            key={value}
            className={app.state.filter === value ? "selected" : ""}
            aria-pressed={app.state.filter === value}
            onClick={() => app.setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <section
        className="seat-map card"
        aria-label={`${FLOOR_LABEL[floor]} 자유석 배치`}
      >
        {["A", "B"].map((zone) => (
          <div className="seat-zone" key={zone}>
            <div className="zone-header">
              <strong>{zone}구역</strong>
              <span>{zone === "A" ? "집중 좌석" : "창가 좌석"}</span>
              <Icon name={zone === "A" ? "quiet" : "window"} />
            </div>
            <div className="seat-grid">
              {app
                .seatsForFloor(floor)
                .filter((seat) => seat.label.startsWith(zone))
                .map((seat) => {
                  const match =
                    app.state.filter === "all" ||
                    seat.amenities.includes(app.state.filter);
                  return (
                    <button
                      key={seat.id}
                      className={`seat ${seat.status} ${match ? "" : "dimmed"}`}
                      aria-label={`${seat.label} ${statusText(seat.status)}`}
                      onClick={() => open({ type: "seat", seatId: seat.id })}
                    >
                      <Icon name="seats" />
                      <span>{seat.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
        <div className="map-entrance">
          입구
          <Icon name="arrow" />
        </div>
        <div className="seat-legend">
          <span>
            <i />
            이용 가능
          </span>
          <span>
            <i className="occupied" />
            이용 중
          </span>
          <span>
            <i className="unknown" />
            확인 필요
          </span>
        </div>
      </section>
    </>
  );
}
