import React, { useMemo } from "react";
import { useCarteira } from "../lib/CarteiraContext";
import { useOrdenacao, aplicarOrdenacao } from "../lib/useOrdenacao";
import ClassePill from "../components/ClassePill";
import ThOrdenavel from "../components/ThOrdenavel";
import { formatarMoeda, formatarNumero, formatarPercentual } from "../lib/formato";

export default function PosicaoAtual() {
  const { posicaoAtual, total, atualizarAtivo } = useCarteira();
  const { ordenacao, alternarOrdem } = useOrdenacao(null, "desc");

  const ordenados = useMemo(
    () => aplicarOrdenacao(posicaoAtual, ordenacao),
    [posicaoAtual, ordenacao]
  );

  const th = (campo, label, className = "") => (
    <ThOrdenavel campo={campo} ordenacao={ordenacao} onOrdenar={alternarOrdem} className={className}>
      {label}
    </ThOrdenavel>
  );

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Posição Atual</h1>
        <p className="page-subtitle">
          Informe a quantidade que você possui de cada ativo. A cotação vem da tela "Cotações".
        </p>
      </header>

      <div className="painel">
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                {th("codigo", "Código")}
                {th("classe", "Classe")}
                {th("quantidade", "Quantidade", "alinhar-direita")}
                {th("cotacao", "Cotação (R$)", "alinhar-direita")}
                {th("valorInvestido", "Valor investido (R$)", "alinhar-direita")}
                {th("pctAtualClasse", "% da classe", "alinhar-direita")}
                {th("pctAtualCarteira", "% da carteira", "alinhar-direita")}
              </tr>
            </thead>
            <tbody>
              {ordenados.map((a) => (
                <tr key={a.codigo}>
                  <td className="codigo-ativo">{a.codigo}</td>
                  <td>
                    <ClassePill classe={a.classe} />
                  </td>
                  <td className="alinhar-direita">
                    <input
                      type="number"
                      step="any"
                      className="input-tabela num"
                      value={a.quantidade}
                      onChange={(e) =>
                        atualizarAtivo(a.codigo, { quantidade: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="alinhar-direita num">{formatarNumero(a.cotacao, 2)}</td>
                  <td className="alinhar-direita num">{formatarMoeda(a.valorInvestido)}</td>
                  <td className="alinhar-direita num">{formatarPercentual(a.pctAtualClasse)}</td>
                  <td className="alinhar-direita num">{formatarPercentual(a.pctAtualCarteira)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>TOTAL INVESTIDO</td>
                <td className="alinhar-direita num">{formatarMoeda(total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
