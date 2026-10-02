import { Heading, Icon } from "../components/UI.jsx";
import gomduri from "../assets/gomduri.png";

export default function My({ app, open }) {
  return (
    <>
      <Heading>MY</Heading>
      <section className="profile-card card">
        <div className="profile-avatar">
          <img src={gomduri} alt="곰두리" />
        </div>
        <div className="profile-text">
          <strong>{app.state.profile?.nickname || "게스트"}</strong>
          <span>
            {app.state.profile?.department || "기록은 이 기기에 저장돼요"}
          </span>
        </div>
        <button
          className="icon-button"
          aria-label="내 정보 수정"
          onClick={() => open({ type: "profile" })}
        >
          <Icon name="edit" />
        </button>
      </section>
      <section className="settings-card card">
        <div className="settings-row">
          <span>
            <Icon name="map" />
            이용 도서관
          </span>
          <strong>미래도서관</strong>
        </div>
        <div className="settings-row">
          <span>
            <Icon name="records" />
            기록 저장
          </span>
          <strong>이 기기</strong>
        </div>
        <button
          className="settings-row"
          onClick={() => open({ type: "saved" })}
        >
          <span>
            <Icon name="bookmark" />
            저장한 소식
          </span>
          <strong>
            {app.state.interests.length}
            <Icon name="arrow" />
          </strong>
        </button>
        <button className="settings-row" onClick={() => open({ type: "qr" })}>
          <span>
            <Icon name="qr" />
            좌석 QR
          </span>
          <Icon name="arrow" />
        </button>
      </section>
    </>
  );
}
