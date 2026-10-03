import { useRef, useState } from "react";
import { statusText } from "../lib/model.js";
import { WE_PLACE_MAP } from "../lib/wePlace.js";
import floorplan from "../assets/floorplans/we-place-background.svg";

export default function WePlaceMap({ seats, matches, onSelect }) {
  const [zoom, setZoom] = useState(1);
  const viewport = useRef(null);
  const changeZoom = (next) => {
    const node = viewport.current;
    const centerX = (node.scrollLeft + node.clientWidth / 2) / zoom;
    const centerY = (node.scrollTop + node.clientHeight / 2) / zoom;
    setZoom(next);
    requestAnimationFrame(() => {
      node.scrollLeft = centerX * next - node.clientWidth / 2;
      node.scrollTop = centerY * next - node.clientHeight / 2;
    });
  };
  return (
    <>
      <div className="map-controls" aria-label="배치도 확대">
        <button
          type="button"
          onClick={() => changeZoom(1)}
          disabled={zoom === 1}
        >
          전체 보기
        </button>
        <div>
          <button
            type="button"
            aria-label="배치도 축소"
            disabled={zoom === 1}
            onClick={() => changeZoom(zoom - 0.5)}
          >
            −
          </button>
          <output aria-live="polite">{zoom * 100}%</output>
          <button
            type="button"
            aria-label="배치도 확대"
            disabled={zoom === 4}
            onClick={() => changeZoom(zoom + 0.5)}
          >
            +
          </button>
        </div>
      </div>
      <div
        ref={viewport}
        className="we-place-map-viewport"
        tabIndex={0}
        aria-label="We플레이스 배치도, 확대 후 스크롤 이동"
      >
        <div
          className="we-place-map"
          style={{ width: `${zoom * 100}%` }}
          aria-label={`We플레이스 ${seats.length}석 배치도`}
        >
          <img
            src={floorplan}
            alt="작은 테이블 네 개와 브라우징 밸리 앞 큰 흰 테이블. 로비의 파란 소파 두 묶음과 창가 바, 개별 소파를 함께 표시한 배치도."
            draggable="false"
          />
          {seats.map((seat) => (
            <button
              key={seat.id}
              type="button"
              className={`plan-seat ${seat.kind} ${seat.status} ${matches(seat) ? "" : "filtered-out"}`}
              data-seat-id={seat.id}
              style={{
                left: `${(seat.map.x / WE_PLACE_MAP.width) * 100}%`,
                top: `${(seat.map.y / WE_PLACE_MAP.height) * 100}%`,
                width: `${(WE_PLACE_MAP.markerSize / WE_PLACE_MAP.width) * 100}%`,
              }}
              aria-label={`${seat.label}번 ${seat.groupLabel} ${statusText(seat.status)}`}
              disabled={!matches(seat)}
              onClick={() => onSelect(seat)}
            >
              <span className="plan-seat-face">{seat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
