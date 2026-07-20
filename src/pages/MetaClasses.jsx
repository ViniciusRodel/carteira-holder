import React from "react";
import { useCarteira } from "../lib/CarteiraContext";
import { corDaClasse } from "../lib/coresClasse";
import { somaMetasClasse } from "../lib/calculos";
import { formatarMoeda, formatarPercentual, formatarPercentualComSinal } from "../lib/formato";

export default function MetaClasses() {
  const { classes, metasClasse, resumoClasses, atualizarMetaClasse, metasValidas } = useCarteira();
  const soma = somaMetasClasse(metasClasse);

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Carteira Meta — Classes</h1>
        <p className="page-subtitle">Defina o % objetivo de cada classe. A soma deve fechar em 100%.</p>
      </header>

      <div className="painel" style={{ marginBottom: 20 }}>
        <div className="painel-corpo">
          {classes.map((classe) => {
            const cor = corDaClasse(classe);
            return (
              <div key={classe} className="slider-classe-linha">
                <div className="slider-classe-topo">
                  <span className="slider-classe-nome" style={{ color: cor }}>
                    {classe}
                  </span>
                  <span className="num slider-classe-valor">{metasClasse[classe].toFixed(2)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  className="slider-classe"
                  style={{ "--slider-cor": cor }}
                  value={metasClasse[classe]}
                  onChange={(e) => atualizarMetaClasse(classe, parseFloat(e.target.value))}
                />
              </div>
            );
          })}

          <div className="slider-classe-total">
            <span>Soma das metas</span>
            <span className={`badge-status ${metasValidas ? "badge-status--ok" : "badge-status--alerta"}`}>
              {soma.toFixed(2)}% {metasValidas ? "— OK" : "— ajuste para 100%"}
            </span>
          </div>
        </div>
      </div>

      <div className="painel">
        <div className="painel-header">
          <h2 className="painel-titulo">Atual vs. meta por classe</h2>
        </div>
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Classe</th>
                <th className="alinhar-direita">% Meta</th>
                <th className="alinhar-direita">Valor atual</th>
                <th className="alinhar-direita">% Atual</th>
                <th className="alinhar-direita">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {resumoClasses.map((r) => {
                const diff = r.pctAtual - r.pctMeta;
                return (
                  <tr key={r.classe}>
                    <td style={{ color: corDaClasse(r.classe), fontWeight: 600 }}>{r.classe}</td>
                    <td className="alinhar-direita num">{formatarPercentual(r.pctMeta)}</td>
                    <td className="alinhar-direita num">{formatarMoeda(r.valorAtual)}</td>
                    <td className="alinhar-direita num">{formatarPercentual(r.pctAtual)}</td>
                    <td className={`alinhar-direita num ${diff < 0 ? "negativo" : "positivo"}`}>
                      {formatarPercentualComSinal(diff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
