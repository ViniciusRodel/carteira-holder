import React from "react";

export default function ThOrdenavel({ campo, ordenacao, onOrdenar, children, className = "", tooltip }) {
  const ativo = ordenacao.campo === campo;
  const direcao = ativo ? ordenacao.direcao : null;
  const ariaSort = !ativo ? "none" : direcao === "asc" ? "ascending" : "descending";

  return (
    <th
      className={`th-ordenavel${ativo ? " th-ordenavel--ativo" : ""} ${className}`}
      aria-sort={ariaSort}
    >
      <button type="button" className="th-ordenavel-btn" onClick={() => onOrdenar(campo)} title={tooltip}>
        <span className="th-ordenavel-inner">
          {children}
          <span className="th-seta-icone" aria-hidden="true">
            {direcao === "asc" ? "↑" : direcao === "desc" ? "↓" : "↕"}
          </span>
        </span>
      </button>
    </th>
  );
}
