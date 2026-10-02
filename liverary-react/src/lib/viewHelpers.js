export const FLOOR_LABEL = { "1F": "1층", "2F": "2층" };

export function dateLabel(time) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
  }).format(time);
}
