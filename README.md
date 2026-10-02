# Liverary

미래도서관 자유석 이용과 공부 기록을 위한 React·JavaScript 모바일 웹 프로젝트입니다.

소스 코드는 [`liverary-react/`](./liverary-react/)에 있습니다.

## 실행

권장 Node.js 버전: **24.19.0**

```bash
cd liverary-react
npm install
npm run dev
```

개발 화면: http://127.0.0.1:5173/

```bash
npm test
npm run build
npm run preview
```

## 기능

- 자리 · 소식 · 홈 · 기록 · MY 메뉴
- 좌석별 QR 접속, 이용 시작·종료와 빈자리 반영
- 집중시간 측정, 일시정지·재개, 새로고침 복원
- 공부 기록과 실제 기록 카드 PNG 저장
- 로컬 프로필·관심 소식 저장

현재는 브라우저 로컬 저장소를 사용하는 프로토타입이며, 학교 API·인증·서버 동기화는 연결하지 않았습니다.

자세한 구조와 실행 방법은 [프로젝트 안내](./liverary-react/README.md), 이미지 원본과 사용 범위는 [자산 출처](./liverary-react/src/assets/SOURCES.md)를 확인하세요.
