import { useState } from "react";
import { Button } from "./UI.jsx";

export function EntryForm({ app, go, close, notify }) {
  const [floor, setFloor] = useState(app.state.floor);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  function submit(event) {
    event.preventDefault();
    const id = `${floor}-${code.trim().toUpperCase()}`;
    const seat = app.getSeat(id);
    if (!seat) {
      setError("A01–A06 또는 B01–B06을 입력해 주세요.");
      return;
    }
    if (app.state.session) {
      close();
      go("session");
      return;
    }
    if (seat.status !== "free") {
      setError("현재 이용할 수 없는 자리예요.");
      return;
    }
    notify("좌석을 확인했어요.");
    close();
    go("checkin", id);
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <label>
        층
        <select
          value={floor}
          onChange={(event) => setFloor(event.target.value)}
        >
          <option value="1F">1층</option>
          <option value="2F">2층</option>
        </select>
      </label>
      <label>
        좌석 번호
        <input
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="A04"
          maxLength={3}
          value={code}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase());
            setError("");
          }}
          required
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" tone="primary">
        좌석 확인
      </Button>
    </form>
  );
}

export function ProfileForm({ app, close, notify }) {
  const [nickname, setNickname] = useState(app.state.profile?.nickname || "");
  const [department, setDepartment] = useState(
    app.state.profile?.department || "",
  );
  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        event.preventDefault();
        const result = app.setProfile({ nickname, department });
        if (result.ok) {
          notify("내 정보를 저장했어요.");
          close();
        } else notify(result.error);
      }}
    >
      <label>
        닉네임
        <input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          maxLength={20}
          placeholder="곰두리"
          required
        />
      </label>
      <label>
        학과
        <input
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
          maxLength={40}
          placeholder="선택"
        />
      </label>
      <Button type="submit" tone="primary">
        저장
      </Button>
    </form>
  );
}
