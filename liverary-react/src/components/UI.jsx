import { useEffect, useId, useRef } from "react";
import sprite from "../assets/icons.svg";

export function Icon({ name, className = "", ...props }) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <use href={`${sprite}#${name}`} />
    </svg>
  );
}

export function Button({ children, tone = "", className = "", ...props }) {
  return (
    <button type="button" className={`button ${tone} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Heading({ children, action }) {
  return (
    <div className="screen-heading">
      <h1>{children}</h1>
      {action}
    </div>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {action}
    </div>
  );
}

export function Badge({ children, tone = "" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Sheet({ title, onClose, children }) {
  const labelId = useId();
  const sheetRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    sheetRef.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  function handleKey(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
    if (event.key !== "Tab") return;
    const items = [
      ...sheetRef.current.querySelectorAll(
        "button:not(:disabled), input, select, a[href]",
      ),
    ];
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === sheetRef.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        document.activeElement === sheetRef.current)
    ) {
      event.preventDefault();
      first.focus();
    }
  }
  return (
    <div className="sheet-overlay">
      <button
        className="sheet-backdrop"
        aria-label="팝업 닫기"
        onClick={onClose}
        tabIndex={-1}
      />
      <section
        className="bottom-sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
        onKeyDown={handleKey}
      >
        <span className="sheet-grab" aria-hidden="true" />
        <div className="sheet-header">
          <h2 id={labelId}>{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="닫기"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
