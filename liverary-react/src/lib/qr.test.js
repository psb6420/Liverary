import test from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import { WE_PLACE_SEATS } from "./wePlace.js";
import { decodeQrImage, resolveQrSeat } from "./qr.js";

const baseUrl = "https://liverary.example/demo/?seat=1F-W01#home";
const seat = (id) => WE_PLACE_SEATS.find((item) => item.id === id);

function createQrBitmap(text, scale = 6) {
  const modules = QRCode.create(text, { errorCorrectionLevel: "M" }).modules;
  const margin = 4;
  const width = (modules.size + margin * 2) * scale;
  const height = width;
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(255);
  for (let row = 0; row < modules.size; row += 1) {
    for (let column = 0; column < modules.size; column += 1) {
      if (!modules.get(row, column)) continue;
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const x = (column + margin) * scale + dx;
          const y = (row + margin) * scale + dy;
          const offset = (y * width + x) * 4;
          data[offset] = data[offset + 1] = data[offset + 2] = 0;
        }
      }
    }
  }
  return { data, width, height };
}

function rotateClockwise(image) {
  const data = new Uint8ClampedArray(image.data.length);
  const width = image.height;
  const height = image.width;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const source = (y * image.width + x) * 4;
      const target = (x * width + image.height - 1 - y) * 4;
      data.set(image.data.subarray(source, source + 4), target);
    }
  }
  return { data, width, height };
}

function invert(image) {
  const data = new Uint8ClampedArray(image.data);
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = 255 - data[offset];
    data[offset + 1] = 255 - data[offset + 1];
    data[offset + 2] = 255 - data[offset + 2];
  }
  return { ...image, data };
}

test("QR의 활성 좌석 ID와 URL은 현재 자유석 객체로만 해석한다", () => {
  for (const text of [
    "1F-W01",
    " 1F-W01\n",
    "https://liverary.example/demo/?seat=1F-W01",
    "http://127.0.0.1:5173/?seat=1F-W01",
    "https://another.example/path?seat=1F-W01",
    "?seat=1F-W01",
    "#checkin/1F-W01",
    "https://liverary.example/#checkin/1F-W01",
    "https://liverary.example/?seat=%31F-W01",
    "https://liverary.example/#checkin/%31F-W01",
  ]) {
    assert.equal(
      resolveQrSeat(text, WE_PLACE_SEATS, baseUrl),
      seat("1F-W01"),
      text,
    );
  }
  assert.equal(
    resolveQrSeat("1F-W51", WE_PLACE_SEATS, baseUrl),
    seat("1F-W51"),
  );
  assert.equal(resolveQrSeat("1F-W01", [{ id: "1F-W51" }], baseUrl), null);
});

test("QR 주소의 checkin hash가 query보다 우선하고 잘못된 hash는 query로 우회하지 않는다", () => {
  assert.equal(
    resolveQrSeat(
      "https://liverary.example/?seat=1F-W01#checkin/1F-W24",
      WE_PLACE_SEATS,
      baseUrl,
    ),
    seat("1F-W24"),
  );
  for (const hash of [
    "#checkin/1F-W15",
    "#checkin/",
    "#checkin",
    "#checkin/not-a-seat",
  ]) {
    assert.equal(
      resolveQrSeat(
        `https://liverary.example/?seat=1F-W01${hash}`,
        WE_PLACE_SEATS,
        baseUrl,
      ),
      null,
      hash,
    );
  }
});

test("숫자·다른 URL·퇴역 PC·잘못된 인코딩·너무 긴 QR 내용은 거부한다", () => {
  for (const text of [
    "01",
    "1",
    "51",
    "1f-w01",
    "1F-W1",
    "1F-W52",
    "2F-A04",
    "1F-W15",
    "1F-W23",
    "",
    "   ",
    "https://liverary.example/",
    "https://liverary.example/?other=1F-W01",
    "https://liverary.example/?seat=51",
    "https://liverary.example/?seat=1F-W15",
    "javascript:alert(1)",
    "data:text/plain,1F-W01",
    "file:///tmp/?seat=1F-W01",
    "ftp://liverary.example/?seat=1F-W01",
    "/demo/?seat=1F-W01",
    "https://liverary.example/?seat=1F-W01&seat=1F-W24",
    "https://liverary.example/?seat=1F-W01%ZZ",
    "https://liverary.example/?seat=1F-W01&bad=%E0%A4%A",
    "https://liverary.example/?seat=1F-W01#checkin/%ZZ",
    "#checkin/%E0%A4%A",
    "?seat=1F-W%2531",
    "https://liverary.example/?seat=1F-W01\u0000",
    `https://liverary.example/?seat=1F-W01&padding=${"x".repeat(2048)}`,
  ]) {
    assert.equal(resolveQrSeat(text, WE_PLACE_SEATS, baseUrl), null, text);
  }
  for (const text of [null, undefined, 1, {}, []]) {
    assert.equal(resolveQrSeat(text, WE_PLACE_SEATS, baseUrl), null);
  }
  assert.equal(resolveQrSeat("1F-W01", null, baseUrl), null);
  assert.equal(
    resolveQrSeat("?seat=1F-W01", WE_PLACE_SEATS, "invalid-base"),
    null,
  );
});

test("실제 QR bitmap에서 URL을 인식하고 현재 좌석으로 연결한다", () => {
  const text = "https://liverary.example/demo/?seat=1F-W24";
  const image = createQrBitmap(text);
  const before = new Uint8ClampedArray(image.data);
  const decoded = decodeQrImage(image);
  assert.equal(decoded, text);
  assert.equal(resolveQrSeat(decoded, WE_PLACE_SEATS, baseUrl), seat("1F-W24"));
  assert.deepEqual(image.data, before);
});

test("90도 회전과 흑백 반전 QR도 인식한다", () => {
  const text = "https://liverary.example/?seat=1F-W51";
  const image = createQrBitmap(text);
  assert.equal(decodeQrImage(rotateClockwise(image)), text);
  assert.equal(decodeQrImage(invert(image)), text);
  assert.equal(
    decodeQrImage(invert(image), { inversionAttempts: "dontInvert" }),
    null,
  );
});

test("인식된 QR가 숫자나 퇴역 PC이면 좌석 접속을 거부한다", () => {
  for (const text of ["51", "https://liverary.example/?seat=1F-W15"]) {
    const decoded = decodeQrImage(createQrBitmap(text));
    assert.equal(decoded, text);
    assert.equal(resolveQrSeat(decoded, WE_PLACE_SEATS, baseUrl), null);
  }
});

test("QR가 없는 이미지와 잘못된 이미지 데이터는 null을 반환한다", () => {
  const blank = {
    width: 120,
    height: 100,
    data: new Uint8ClampedArray(120 * 100 * 4),
  };
  blank.data.fill(255);
  assert.equal(decodeQrImage(blank), null);
  for (const image of [
    null,
    undefined,
    {},
    { width: 0, height: 1, data: new Uint8ClampedArray(0) },
    { width: 1.5, height: 1, data: new Uint8ClampedArray(6) },
    { width: 2, height: 2, data: new Uint8ClampedArray(8) },
    { width: 2, height: 2, data: [255, 255, 255, 255] },
    { width: Infinity, height: 1, data: new Uint8ClampedArray(0) },
    { width: 1_000_000, height: 1_000_000, data: new Uint8ClampedArray(0) },
  ]) {
    assert.equal(decodeQrImage(image), null);
  }
});
