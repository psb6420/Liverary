import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { toBlob } from "html-to-image";
import { Button, Icon, Sheet } from "./UI.jsx";
import { formatClock, formatDuration } from "../lib/model.js";
import logo from "../assets/logo.svg";
import gomduri from "../assets/gomduri.png";

function downloadFile(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function QrSheet({ seats, onClose, notify }) {
  const [seatId, setSeatId] = useState("2F-A04");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const seat = seats.find((item) => item.id === seatId);
  const url = new URL(window.location.pathname, window.location.origin);
  url.searchParams.set("seat", seatId);
  const seatUrl = url.href;
  useEffect(() => {
    let current = true;
    setSvg("");
    setError("");
    QRCode.toString(seatUrl, {
      type: "svg",
      margin: 2,
      width: 240,
      color: { dark: "#272347", light: "#ffffff" },
    })
      .then((value) => {
        if (current) setSvg(value);
      })
      .catch(() => {
        if (current) setError("QR을 만들 수 없어요.");
      });
    return () => {
      current = false;
    };
  }, [seatUrl]);
  return (
    <Sheet title="좌석 QR" onClose={onClose}>
      <label className="field-label">
        좌석
        <select
          value={seatId}
          onChange={(event) => setSeatId(event.target.value)}
        >
          {seats.map((item) => (
            <option key={item.id} value={item.id}>
              {item.floor.replace("F", "층")} · {item.label}
            </option>
          ))}
        </select>
      </label>
      <div className="qr-print-card">
        <img className="qr-brand" src={logo} alt="Liverary" />
        <strong>미래도서관 {seat.floor.replace("F", "층")}</strong>
        <span>{seat.label}</span>
        {svg ? (
          <img
            className="qr-code-image"
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
            alt={`${seat.label} 좌석 이용 QR 코드`}
            width="220"
            height="220"
          />
        ) : (
          <p>{error || "QR 준비 중"}</p>
        )}
      </div>
      <div className="action-stack">
        <Button
          tone="primary"
          disabled={!svg}
          onClick={() =>
            downloadFile(
              new Blob([svg], { type: "image/svg+xml" }),
              `Liverary-${seatId}-QR.svg`,
            )
          }
        >
          <Icon name="download" />
          QR 저장
        </Button>
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(seatUrl);
              notify("좌석 주소를 복사했어요.");
            } catch {
              notify("주소를 복사할 수 없어요.");
            }
          }}
        >
          <Icon name="link" />
          주소 복사
        </Button>
      </div>
    </Sheet>
  );
}

export function ShareSheet({ record, profile, onClose, notify }) {
  const cardRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const date = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(record.endedAt);
  async function exportCard(share) {
    if (busy) return;
    setBusy(true);
    try {
      await document.fonts.ready;
      const images = [...cardRef.current.querySelectorAll("img")];
      await Promise.all(images.map((image) => image.decode()));
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 3,
        backgroundColor: "#f3f1ff",
        cacheBust: false,
      });
      if (!blob) throw new Error("No image");
      const fileDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(record.endedAt);
      const file = new File([blob], `Liverary-${fileDate}.png`, {
        type: "image/png",
      });
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Liverary 공부 기록" });
      } else {
        downloadFile(blob, file.name);
        notify("공유 카드를 저장했어요.");
      }
    } catch (error) {
      if (error.name !== "AbortError") notify("공유 카드를 저장할 수 없어요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet title="공유 카드" onClose={onClose}>
      <div className="study-card" ref={cardRef}>
        <div className="study-card-brand">
          <img src={logo} alt="" />
          <strong>Liverary</strong>
        </div>
        <span className="study-card-date">{date}</span>
        <span className="study-card-label">
          {profile?.nickname
            ? `${profile.nickname}의 순공시간`
            : "나의 순공시간"}
        </span>
        <strong className="study-card-time">
          {formatClock(record.focusMs)}
        </strong>
        <span className="study-card-duration">
          {formatDuration(record.focusMs)} 집중 완료
        </span>
        <img className="study-card-mascot" src={gomduri} alt="곰두리" />
        <div className="study-card-bottom">
          <span>
            미래도서관 {record.seatId.slice(0, 2).replace("F", "층")} ·{" "}
            {record.seatId.slice(3)}
          </span>
          <strong>오늘도 한 걸음</strong>
        </div>
      </div>
      <div className="action-stack">
        <Button
          tone="primary"
          disabled={busy}
          onClick={() => exportCard(false)}
        >
          <Icon name="download" />
          {busy ? "저장 중" : "이미지 저장"}
        </Button>
        <Button disabled={busy} onClick={() => exportCard(true)}>
          <Icon name="share" />
          공유
        </Button>
      </div>
    </Sheet>
  );
}
