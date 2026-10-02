import { COMMUNITY_ITEMS, crowdMeta } from "../lib/model.js";
import { FLOOR_LABEL } from "../lib/viewHelpers.js";
import {
  Badge,
  Button,
  Heading,
  Icon,
  SectionTitle,
} from "../components/UI.jsx";
import ActiveSession from "../components/ActiveSession.jsx";
import gomduri from "../assets/gomduri.png";
import atrium from "../assets/future-library-atrium.jpg";

export default function Home({ app, go, open }) {
  const totalFree = app.floorStats("1F").free + app.floorStats("2F").free;
  return (
    <>
      <Heading>
        지금, 어디서
        <br />
        공부할까요?
      </Heading>
      <section className="library-cover">
        <img
          src={atrium}
          alt="미래도서관 내부 계단형 공간"
          fetchPriority="high"
        />
        <div>
          <span>강원대학교</span>
          <h2>미래도서관</h2>
          <span>1·2층 자유석</span>
        </div>
      </section>
      <section className="availability-card card">
        <div className="row-between">
          <span className="overline">이용 가능한 좌석</span>
          <Badge>QR 등록 기준</Badge>
        </div>
        <div className="available-total">
          <strong>{totalFree}</strong>
          <span>석</span>
        </div>
        <div className="floor-cards">
          {["1F", "2F"].map((floor) => {
            const stats = app.floorStats(floor);
            const crowd = crowdMeta(stats);
            return (
              <button
                className="floor-card"
                key={floor}
                onClick={() => {
                  app.setFloor(floor);
                  go("seats");
                }}
                aria-label={`${FLOOR_LABEL[floor]} 자리 보기`}
              >
                <span className="row-between">
                  <b>{FLOOR_LABEL[floor]}</b>
                  <span className={`crowd ${crowd.className}`}>
                    {crowd.label}
                  </span>
                </span>
                <span className="floor-count">
                  <strong>{stats.free}</strong>석 가능
                </span>
                <span
                  className="occupancy-track"
                  role="meter"
                  aria-label={`${FLOOR_LABEL[floor]} 등록 좌석 이용률`}
                  aria-valuenow={stats.usedPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: `${stats.usedPercent}%` }} />
                </span>
              </button>
            );
          })}
        </div>
        <Button tone="primary" onClick={() => go("seats")}>
          자리 보기
          <Icon name="arrow" />
        </Button>
      </section>
      <ActiveSession app={app} go={go} />
      <button
        className="qr-banner card"
        onClick={() =>
          app.state.session ? go("session") : open({ type: "entry" })
        }
      >
        <span className="qr-banner-copy">
          <span className="overline">좌석 QR</span>
          <strong>
            {app.state.session ? "이어서 집중하기" : "바로 이용하기"}
          </strong>
          <span className="text-link">
            {app.state.session ? "이용 화면" : "QR 이용 시작"}
            <Icon name="arrow" />
          </span>
        </span>
        <img src={gomduri} alt="곰두리" width="96" height="126" />
      </button>
      <section className="section">
        <SectionTitle
          action={
            <button className="text-button" onClick={() => go("community")}>
              전체 보기
              <Icon name="arrow" />
            </button>
          }
        >
          공부 소식
        </SectionTitle>
        <div className="preview-list">
          {COMMUNITY_ITEMS.slice(0, 2).map((item) => (
            <button
              className="news-preview card"
              key={item.id}
              onClick={() => {
                app.setCommunityTab(item.type);
                go("community");
              }}
            >
              <span className={`preview-icon ${item.visual}`}>
                <Icon name={item.icon} />
              </span>
              <span className="preview-text">
                <small>{item.eyebrow}</small>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </span>
              <Icon name="arrow" />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
