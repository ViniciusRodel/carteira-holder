import React from "react";

export default function Toggle({ ligado, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      className="toggle"
      data-on={ligado}
      role="switch"
      aria-checked={ligado}
      aria-label={ariaLabel}
      onClick={() => onChange(!ligado)}
    >
      <span className="toggle-bolinha" />
    </button>
  );
}
