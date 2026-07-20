import React from "react";

export default function ThOrdenavel({ campo, ordenacao, onOrdenar, children, className = "", tooltip }) {
  const ativo = ordenacao.campo === campo;
  const direcao = ativo ? ordenacao.direcao : null;

  return (
    <th
      className={`th-ordenavel${ativo ? " th-ordenavel--ativo" : ""} ${className}`}
      onClick={() => onOrdenar(campo)}
      title={tooltip}
    >
      <span className="th-ordenavel-inner">
        {children}
        <span className="th-seta-icone" aria-hidden="true">
          {direcao === "asc" ? "↑" : direcao === "desc" ? "↓" : "↕"}
        </span>
      </span>
    </th>
  );
}
