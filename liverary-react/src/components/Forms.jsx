import { useState } from "react";
import { Button } from "./UI.jsx";

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
