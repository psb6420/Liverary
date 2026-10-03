import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { decodeQrImage, resolveQrSeat } from "../lib/qr.js";
import { Button, Icon } from "./UI.jsx";

export default function QrScanner({ app, go, notify }) {
  const [mode, setMode] = useState("camera");
  const [camera, setCamera] = useState("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demoReady, setDemoReady] = useState(false);
  const videoRef = useRef(null);
  const imageInput = useRef(null);
  const demoCanvas = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const generation = useRef(0);
  const mounted = useRef(false);
  const acceptRef = useRef(null);
  const demoSeat = app.seats.find((seat) => seat.status === "free");

  const releaseCamera = useCallback(() => {
    generation.current += 1;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    const pause = () => {
      if (document.visibilityState === "hidden") {
        releaseCamera();
        setCamera("idle");
        setBusy(false);
      }
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      mounted.current = false;
      releaseCamera();
      document.removeEventListener("visibilitychange", pause);
    };
  }, [releaseCamera]);

  function accept(text) {
    const seat = resolveQrSeat(text, app.seats, window.location.href);
    if (!seat) {
      setError("등록된 자유석 QR이 아니에요.");
      return false;
    }
    if (app.state.session) {
      releaseCamera();
      go("session");
      return true;
    }
    if (seat.status !== "free") {
      setError("이용 중인 자리예요. 다른 좌석 QR을 찍어 주세요.");
      return false;
    }
    releaseCamera();
    notify(`${seat.label}번 좌석을 확인했어요.`);
    go("checkin", seat.id);
    return true;
  }
  acceptRef.current = accept;

  async function startCamera() {
    releaseCamera();
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "카메라는 HTTPS에서 사용할 수 있어요. QR 사진이나 예제 QR을 이용해 주세요.",
      );
      return;
    }
    const token = generation.current;
    setCamera("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (!mounted.current || token !== generation.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      if (!mounted.current || token !== generation.current) return;
      setCamera("scanning");
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas unavailable");
      const scan = () => {
        if (!mounted.current || token !== generation.current) return;
        try {
          if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
            const scale = Math.min(
              1,
              720 / Math.max(video.videoWidth, video.videoHeight),
            );
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const text = decodeQrImage(
              context.getImageData(0, 0, canvas.width, canvas.height),
            );
            if (text && acceptRef.current(text)) return;
          }
          timerRef.current = window.setTimeout(scan, 180);
        } catch {
          releaseCamera();
          setCamera("idle");
          setError(
            "카메라 화면을 읽지 못했어요. 다시 켜거나 QR 사진을 이용해 주세요.",
          );
        }
      };
      scan();
    } catch (cause) {
      if (!mounted.current || token !== generation.current) return;
      releaseCamera();
      setCamera("idle");
      setError(
        cause.name === "NotAllowedError" || cause.name === "SecurityError"
          ? "카메라 권한을 허용해 주세요. QR 사진이나 예제 QR로도 체험할 수 있어요."
          : "카메라를 연결하지 못했어요. QR 사진이나 예제 QR을 이용해 주세요.",
      );
    }
  }

  async function readImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    releaseCamera();
    setCamera("idle");
    setError("");
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setError("10MB 이하의 QR 이미지 파일을 선택해 주세요.");
      return;
    }
    const token = generation.current;
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (!mounted.current || token !== generation.current) return;
      const canvas = document.createElement("canvas");
      const scale = Math.min(
        1,
        1600 / Math.max(image.naturalWidth, image.naturalHeight),
      );
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const text = decodeQrImage(
        context.getImageData(0, 0, canvas.width, canvas.height),
      );
      if (text) acceptRef.current(text);
      else
        setError("QR을 찾지 못했어요. QR 전체가 보이는 사진을 선택해 주세요.");
    } catch {
      if (mounted.current && token === generation.current)
        setError(
          "이미지를 읽지 못했어요. PNG 또는 JPG 사진으로 다시 시도해 주세요.",
        );
    } finally {
      URL.revokeObjectURL(url);
      if (mounted.current && token === generation.current) setBusy(false);
    }
  }

  function switchMode(next) {
    releaseCamera();
    setCamera("idle");
    setBusy(false);
    setError("");
    setMode(next);
  }

  useEffect(() => {
    setDemoReady(false);
    if (mode !== "demo" || !demoSeat || !demoCanvas.current) return;
    let current = true;
    const url = new URL(window.location.pathname, window.location.origin);
    url.searchParams.set("seat", demoSeat.id);
    QRCode.toCanvas(demoCanvas.current, url.href, {
      width: 256,
      margin: 3,
      color: { dark: "#272347", light: "#ffffff" },
    })
      .then(() => {
        if (current) setDemoReady(true);
      })
      .catch(() => {
        if (current) setError("예제 QR을 만들지 못했어요.");
      });
    return () => {
      current = false;
    };
  }, [mode, demoSeat?.id]);

  function readDemo() {
    const canvas = demoCanvas.current;
    const text = decodeQrImage(
      canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height),
    );
    if (text) acceptRef.current(text);
    else setError("예제 QR을 읽지 못했어요. 다시 시도해 주세요.");
  }

  return (
    <div className="qr-scanner">
      <div
        className="floor-tabs qr-scan-tabs"
        role="tablist"
        aria-label="QR 이용 방법"
      >
        {[
          ["camera", "QR 스캔"],
          ["demo", "예제 QR"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            id={`qr-tab-${value}`}
            aria-controls="qr-scan-panel"
            className={mode === value ? "selected" : ""}
            onClick={() => switchMode(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id="qr-scan-panel"
        role="tabpanel"
        aria-labelledby={`qr-tab-${mode}`}
      >
        {mode === "camera" ? (
          <>
            <div
              className={`qr-camera-view ${camera === "scanning" ? "running" : ""}`}
            >
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                aria-label="QR 스캔 카메라 화면"
              />
              {camera !== "scanning" && (
                <div className="qr-camera-placeholder">
                  <Icon name="camera" />
                  <span>
                    {camera === "requesting"
                      ? "카메라 연결 중"
                      : "좌석 QR을 비춰 주세요"}
                  </span>
                </div>
              )}
              <div className="qr-scan-frame" aria-hidden="true" />
            </div>
            <Button
              tone="primary"
              disabled={camera === "requesting" || busy}
              onClick={
                camera === "scanning"
                  ? () => {
                      releaseCamera();
                      setCamera("idle");
                    }
                  : startCamera
              }
            >
              <Icon name="camera" />
              {camera === "scanning"
                ? "카메라 끄기"
                : camera === "requesting"
                  ? "연결 중"
                  : "카메라 켜기"}
            </Button>
          </>
        ) : (
          <div className="qr-demo-card">
            <span className="badge purple">체험용 QR</span>
            {demoSeat ? (
              <>
                <strong>
                  {demoSeat.label}번 · {demoSeat.groupLabel}
                </strong>
                <canvas
                  ref={demoCanvas}
                  role="img"
                  aria-label={`${demoSeat.label}번 좌석 체험 QR`}
                />
                <Button
                  tone="primary"
                  disabled={!demoReady || busy}
                  onClick={readDemo}
                >
                  <Icon name="qr" />
                  예제 QR 인식
                </Button>
              </>
            ) : (
              <p className="empty-text">이용 가능한 좌석이 없어요.</p>
            )}
          </div>
        )}
      </div>
      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        aria-label="QR 이미지 파일"
        hidden
        onChange={readImage}
      />
      <Button
        disabled={busy || camera === "requesting"}
        onClick={() => imageInput.current.click()}
      >
        <Icon name="image" />
        {busy ? "QR 읽는 중" : "QR 사진 불러오기"}
      </Button>
      <button className="text-button" onClick={() => go("seats")}>
        <Icon name="map" />
        배치도에서 자리 찾기
      </button>
      {error && (
        <p className="form-error qr-scan-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
