import React, { useEffect, useState } from "react";

/**
 * Barra de progresso usada nos cards de classe do Dashboard.
 * Representa o "% de atingimento da meta" (atual / meta), limitado
 * visualmente a 150% para não distorcer o layout quando uma classe
 * está bem acima do objetivo. Anima do zero até o valor real ao montar.
 */
const LIMITE_VISUAL = 1.5; // 150%

export default function BarraProgresso({ valor, cor, alturaPx = 8 }) {
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const clamped = Math.min(Math.max(valor, 0), LIMITE_VISUAL);
      setProgresso((clamped / LIMITE_VISUAL) * 100);
    });
    return () => cancelAnimationFrame(id);
  }, [valor]);

  return (
    <div className="barra-progresso-trilho" style={{ height: alturaPx }}>
      <div
        className="barra-progresso-fill"
        style={{ width: `${progresso}%`, background: cor }}
      />
      {/* marcador na posição dos 100% (meta exata) */}
      <div className="barra-progresso-marcador" style={{ left: `${(1 / LIMITE_VISUAL) * 100}%` }} />
    </div>
  );
}
