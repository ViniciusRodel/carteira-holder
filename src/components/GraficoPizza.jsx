import React from "react";
import { corDaClasse } from "../lib/coresClasse";
import { formatarPercentual } from "../lib/formato";

/**
 * Gráfico de pizza em SVG puro — sem libs externas, para manter o projeto
 * desktop leve (importante no Tauri, onde o bundle final deve ser pequeno).
 */
export default function GraficoPizza({ dados, titulo, chave }) {
  const total = dados.reduce((acc, d) => acc + d[chave], 0);
  let anguloAcumulado = -90; // começa no topo

  const raio = 70;
  const cx = 90;
  const cy = 90;

  const segmentos = dados
    .filter((d) => d[chave] > 0)
    .map((d) => {
      const fracao = total > 0 ? d[chave] / total : 0;
      const anguloInicio = anguloAcumulado;
      const anguloFim = anguloAcumulado + fracao * 360;
      anguloAcumulado = anguloFim;

      const grandeArco = anguloFim - anguloInicio > 180 ? 1 : 0;
      const [x1, y1] = pontoNoCirculo(cx, cy, raio, anguloInicio);
      const [x2, y2] = pontoNoCirculo(cx, cy, raio, anguloFim);

      const path =
        fracao >= 0.9995
          ? `M ${cx} ${cy - raio} A ${raio} ${raio} 0 1 1 ${cx - 0.01} ${cy - raio} Z`
          : `M ${cx} ${cy} L ${x1} ${y1} A ${raio} ${raio} 0 ${grandeArco} 1 ${x2} ${y2} Z`;

      return { path, cor: corDaClasse(d.classe), classe: d.classe, fracao };
    });

  return (
    <div className="grafico-pizza-wrap">
      <p className="grafico-titulo">{titulo}</p>
      <div className="grafico-pizza-corpo">
        <svg width="180" height="180" viewBox="0 0 180 180">
          {segmentos.map((s) => (
            <path key={s.classe} d={s.path} fill={s.cor} stroke="var(--bg-panel)" strokeWidth="1.5" />
          ))}
          <circle cx={cx} cy={cy} r={36} fill="var(--bg-panel)" />
        </svg>
        <ul className="grafico-legenda">
          {dados.map((d) => (
            <li key={d.classe}>
              <span className="grafico-legenda-bolinha" style={{ background: corDaClasse(d.classe) }} />
              <span className="grafico-legenda-nome">{d.classe}</span>
              <span className="grafico-legenda-valor num">
                {formatarPercentual(total > 0 ? d[chave] / total : 0, 1)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function pontoNoCirculo(cx, cy, raio, anguloGraus) {
  const rad = (anguloGraus * Math.PI) / 180;
  return [cx + raio * Math.cos(rad), cy + raio * Math.sin(rad)];
}
