import { amenityText } from "../lib/model.js";
import { Icon } from "./UI.jsx";

export default function AmenityList({ seat }) {
  return (
    <div className="amenities">
      {seat.amenities.length ? (
        seat.amenities.map((name) => (
          <span key={name}>
            <Icon name={name} />
            {amenityText(name)}
          </span>
        ))
      ) : (
        <span>{seat.groupLabel || "일반 자유석"}</span>
      )}
    </div>
  );
}
