import { COMMUNITY_ITEMS } from "../lib/model.js";
import { Badge, Heading, Icon } from "../components/UI.jsx";
import atrium from "../assets/future-library-atrium.jpg";
import lounge from "../assets/future-library-knu-lounge.jpg";

export default function Community({ app, open }) {
  const tabs = [
    ["all", "전체"],
    ["event", "이벤트"],
    ["spot", "꿀자리"],
    ["study", "스터디"],
  ];
  const visible = COMMUNITY_ITEMS.filter(
    (item) =>
      app.state.communityTab === "all" || item.type === app.state.communityTab,
  );
  return (
    <>
      <Heading>공부 소식</Heading>
      <div className="chips" aria-label="공부 소식 분류">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            aria-pressed={id === app.state.communityTab}
            className={id === app.state.communityTab ? "selected" : ""}
            onClick={() => app.setCommunityTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="news-list">
        {visible.map((item) => (
          <article className="news-card card" key={item.id}>
            <button
              className={`news-image ${item.visual}`}
              onClick={() => open({ type: "article", item })}
              aria-label={`${item.title} 보기`}
            >
              {item.type === "spot" ? (
                <img
                  src={lounge}
                  alt="미래도서관 KNU 서가와 벤치 공간"
                  loading="lazy"
                />
              ) : item.type === "study" ? (
                <img src={atrium} alt="미래도서관 내부 공간" loading="lazy" />
              ) : (
                <>
                  <span className="event-kicker">STUDY CHALLENGE</span>
                  <strong>
                    50<small>HOURS</small>
                  </strong>
                  <Icon name="calendar" />
                </>
              )}
            </button>
            <div className="news-body">
              <Badge>{item.eyebrow}</Badge>
              <button
                className="news-title"
                onClick={() => open({ type: "article", item })}
              >
                {item.title}
              </button>
              <p>{item.body}</p>
              <div className="news-meta">
                <span>{item.meta}</span>
                <button
                  className={
                    app.state.interests.includes(item.id) ? "saved" : ""
                  }
                  aria-label={`${item.title} ${app.state.interests.includes(item.id) ? "저장 취소" : "저장"}`}
                  aria-pressed={app.state.interests.includes(item.id)}
                  onClick={() => app.toggleInterest(item.id)}
                >
                  <Icon name="bookmark" />
                  {app.state.interests.includes(item.id) ? "저장됨" : "저장"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
