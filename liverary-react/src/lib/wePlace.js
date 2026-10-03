export const WE_PLACE = {
  id: "1F-04",
  floor: "1F",
  name: "We플레이스",
  section: 4,
  windowSeats: 6,
  loungeSeats: 8,
  tableSeats: 22,
  pcSeats: 0,
  armchairSeats: 6,
};

export const WE_PLACE_MAP = { width: 1200, height: 1500, markerSize: 80 };

export const SMALL_TABLES = [
  { x: 405, y: 490 },
  { x: 710, y: 490 },
  { x: 405, y: 750 },
  { x: 710, y: 750 },
];
export const ARMCHAIR_PAIRS = [
  { x: 1040, y: 220, angle: 90 },
  { x: 1040, y: 440, angle: 90 },
  { x: 1040, y: 660, angle: 90 },
];

const groups = [
  {
    id: "window-bar",
    label: "창가 바",
    kind: "window",
    amenities: ["window", "power"],
    positions: [
      { x: 1080, y: 830 },
      { x: 1088, y: 910 },
      { x: 1070, y: 990 },
      { x: 1070, y: 1080 },
      { x: 987, y: 1130 },
      { x: 940, y: 1220 },
    ],
  },
  {
    id: "sofa-1",
    label: "파란 소파 1",
    kind: "lounge",
    positions: [
      { x: 880, y: 935 },
      { x: 990, y: 1030 },
      { x: 880, y: 1125 },
      { x: 770, y: 1030 },
    ],
  },
  {
    id: "sofa-2",
    label: "파란 소파 2",
    kind: "lounge",
    positions: [
      { x: 300, y: 1145 },
      { x: 405, y: 1235 },
      { x: 300, y: 1325 },
      { x: 195, y: 1235 },
    ],
  },
  {
    id: "pc-row",
    label: "PC석",
    kind: "pc",
    positions: Array.from({ length: 9 }, (_, index) => ({
      x: 185,
      y: 200 + index * 80,
    })),
  },
  ...SMALL_TABLES.map((table, index) => ({
    id: `small-table-${index + 1}`,
    label: `작은 테이블 ${index + 1}`,
    kind: "table",
    positions: [
      { x: table.x, y: table.y - 90 },
      { x: table.x + 90, y: table.y },
      { x: table.x, y: table.y + 90 },
      { x: table.x - 90, y: table.y },
    ],
  })),
  {
    id: "large-table",
    label: "큰 흰 테이블",
    kind: "table",
    positions: [135, 305].flatMap((y) =>
      [525, 645, 765].map((x) => ({ x, y })),
    ),
  },
  ...ARMCHAIR_PAIRS.map((pair, index) => {
    const angle = (pair.angle * Math.PI) / 180;
    return {
      id: `armchair-${index + 1}`,
      label: `개별 소파 ${index + 1}`,
      kind: "lounge",
      positions: [-66, 66].map((offset) => ({
        x: Math.round(pair.x + offset * Math.cos(angle)),
        y: Math.round(pair.y + offset * Math.sin(angle)),
      })),
    };
  }),
];

// Assign the original IDs before excluding PC reservation seats. Never reuse
// W15–W23: saved records and QR links must not point to a different seat.
const seatDefinitions = groups
  .flatMap((group) =>
    group.positions.map((map) => ({
      groupId: group.id,
      groupLabel: group.label,
      kind: group.kind,
      amenities: group.amenities || [],
      map,
    })),
  )
  .map((seat, index) => {
    const label = String(index + 1).padStart(2, "0");
    return {
      id: `1F-W${label}`,
      floor: WE_PLACE.floor,
      label,
      zone: WE_PLACE.name,
      status: "free",
      ...seat,
    };
  });

// Historical definitions are retained only to display and finish saved activity.
export const RETIRED_PC_SEATS = seatDefinitions.filter(
  (seat) => seat.kind === "pc",
);
export const WE_PLACE_SEATS = seatDefinitions.filter(
  (seat) => seat.kind !== "pc",
);
