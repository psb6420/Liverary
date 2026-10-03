import jsQR from "jsqr";

const MAX_QR_TEXT_LENGTH = 2048;
const MAX_IMAGE_PIXELS = 16_777_216;
const SEAT_ID_PATTERN = /^1F-W\d{2}$/;
const INVERSION_ATTEMPTS = new Set([
  "attemptBoth",
  "dontInvert",
  "onlyInvert",
  "invertFirst",
]);

export function resolveQrSeat(text, seats, baseUrl) {
  if (
    typeof text !== "string" ||
    text.length > MAX_QR_TEXT_LENGTH ||
    !Array.isArray(seats)
  )
    return null;

  const value = text.trim();
  if (!value || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
  let seatId = value;
  if (!SEAT_ID_PATTERN.test(value)) {
    const absolute = /^https?:\/\//i.test(value);
    const relative = value.startsWith("?") || value.startsWith("#checkin/");
    if (!absolute && !relative) return null;
    try {
      // URLSearchParams otherwise silently replaces malformed percent encoding.
      decodeURI(value);
      const url = new URL(value, baseUrl);
      if (!["http:", "https:"].includes(url.protocol)) return null;
      if (url.hash.startsWith("#checkin")) {
        if (!url.hash.startsWith("#checkin/")) return null;
        seatId = decodeURIComponent(url.hash.slice(9));
      } else {
        const candidates = url.searchParams.getAll("seat");
        if (candidates.length !== 1) return null;
        [seatId] = candidates;
      }
    } catch {
      return null;
    }
  }
  if (!SEAT_ID_PATTERN.test(seatId)) return null;
  // Never navigate to the scanned host. Resolve only against current seats.
  return seats.find((seat) => seat?.id === seatId) || null;
}

export function decodeQrImage(imageData, options = {}) {
  try {
    const { data, width, height } = imageData || {};
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width * height > MAX_IMAGE_PIXELS ||
      !(data instanceof Uint8ClampedArray) ||
      data.length !== width * height * 4
    )
      return null;
    const inversionAttempts = INVERSION_ATTEMPTS.has(options?.inversionAttempts)
      ? options.inversionAttempts
      : "attemptBoth";
    const code = jsQR(data, width, height, { inversionAttempts });
    return typeof code?.data === "string" && code.data ? code.data : null;
  } catch {
    return null;
  }
}
