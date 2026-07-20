import React from "react";
import { corDaClasse } from "../lib/coresClasse";

export default function ClassePill({ classe }) {
  const cor = corDaClasse(classe);
  return (
    <span
      className="classe-pill"
      style={{
        color: cor,
        background: `color-mix(in srgb, ${cor} 16%, transparent)`,
        border: `1px solid color-mix(in srgb, ${cor} 35%, transparent)`,
      }}
    >
      {classe}
    </span>
  );
}
