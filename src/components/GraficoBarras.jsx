import React from "react";
import { corDaClasse } from "../lib/coresClasse";
import { formatarPercentual } from "../lib/formato";

/**
 * Gráfico de barras "Atual vs. Meta" por classe, em SVG puro.
 */
export default function GraficoBarras({ dados, titulo }) {
  const maxValor = Math.max(...dados.flatMap((d) => [d.pctAtual, d.pctMeta]), 0.01) * 1.15;
  const alturaArea = 160;
  const larguraGrupo = 56;
  const larguraBarra = 16;
  const gapBarra = 6;

  return (
    <div className="grafico-barras-wrap">
      <p className="grafico-titulo">{titulo}</p>
      <div className="grafico-barras-area" style={{ height: alturaArea + 40 }}>
        <svg width={dados.length * larguraGrupo + 20} height={alturaArea + 36} viewBox={`0 0 ${dados.length * larguraGrupo + 20} ${alturaArea + 36}`}>
          {/* linhas-guia horizontais */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={0}
              x2={dados.length * larguraGrupo + 20}
              y1={alturaArea - f * alturaArea + 10}
              y2={alturaArea - f * alturaArea + 10}
              stroke="var(--border-subtle)"
              strokeWidth="1"
            />
          ))}

          {dados.map((d, i) => {
            const cor = corDaClasse(d.classe);
            const xGrupo = i * larguraGrupo + 14;
            const alturaAtual = (d.pctAtual / maxValor) * alturaArea;
            const alturaMeta = (d.pctMeta / maxValor) * alturaArea;

            return (
              <g key={d.classe}>
                <rect
                  x={xGrupo}
                  y={alturaArea - alturaAtual + 10}
                  width={larguraBarra}
                  height={Math.max(alturaAtual, 1)}
                  fill={cor}
                  rx="2"
                />
                <rect
                  x={xGrupo + larguraBarra + gapBarra}
                  y={alturaArea - alturaMeta + 10}
                  width={larguraBarra}
                  height={Math.max(alturaMeta, 1)}
                  fill={cor}
                  opacity="0.35"
                  rx="2"
                />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="grafico-barras-eixo">
        {dados.map((d) => (
          <span key={d.classe} style={{ width: larguraGrupo }}>
            {d.classe.replace("ETFs ", "ETF ")}
          </span>
        ))}
      </div>
      <div className="grafico-barras-legenda">
        <span><i className="swatch swatch--cheio" /> Atual</span>
        <span><i className="swatch swatch--vazio" /> Meta</span>
      </div>
    </div>
  );
}
