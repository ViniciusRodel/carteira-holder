import React, { useState, useMemo } from "react";
import { useCarteira } from "../lib/CarteiraContext";
import { useOrdenacao, aplicarOrdenacao } from "../lib/useOrdenacao";
import ClassePill from "../components/ClassePill";
import ThOrdenavel from "../components/ThOrdenavel";
import { formatarMoeda, formatarQuantidade } from "../lib/formato";

function formatarDataHora(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function Historico() {
  const { historico, limparHistorico } = useCarteira();
  const [filtro, setFiltro] = useState("todos");
  const [confirmandoLimpar, setConfirmandoLimpar] = useState(false);
  const { ordenacao, alternarOrdem } = useOrdenacao("data", "desc");

  const filtrados = useMemo(() => {
    const base = filtro === "todos" ? historico : historico.filter((h) => h.tipo === filtro);
    return aplicarOrdenacao(base, ordenacao);
  }, [historico, filtro, ordenacao]);

  const totalCompras = historico.filter((h) => h.tipo === "compra").reduce((acc, h) => acc + h.valor, 0);
  const totalVendas = historico.filter((h) => h.tipo === "venda").reduce((acc, h) => acc + h.valor, 0);

  function handleLimpar() {
    if (!confirmandoLimpar) { setConfirmandoLimpar(true); return; }
    limparHistorico();
    setConfirmandoLimpar(false);
  }

  const th = (campo, label, className = "", tooltip) => (
    <ThOrdenavel campo={campo} ordenacao={ordenacao} onOrdenar={alternarOrdem} className={className} tooltip={tooltip}>
      {label}
    </ThOrdenavel>
  );

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Histórico</h1>
        <p className="page-subtitle">Registro de todas as compras e vendas lançadas no app.</p>
      </header>

      <div className="kpi-linha">
        <div>
          <div className="kpi-bloco-label">Total comprado</div>
          <div className="kpi-bloco-valor num" style={{ fontSize: 24, color: "var(--positive)" }}>
            {formatarMoeda(totalCompras)}
          </div>
        </div>
        <div>
          <div className="kpi-bloco-label">Total vendido</div>
          <div className="kpi-bloco-valor num" style={{ fontSize: 24, color: "var(--negative)" }}>
            {formatarMoeda(totalVendas)}
          </div>
        </div>
        <div>
          <div className="kpi-bloco-label">Operações</div>
          <div className="kpi-bloco-valor num" style={{ fontSize: 24 }}>
            {historico.length}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {confirmandoLimpar && (
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Isso apaga todo o histórico. Confirma?
            </span>
          )}
          {historico.length > 0 && (
            <button
              className={`botao ${confirmandoLimpar ? "botao-perigo-solid" : "botao-secundario"}`}
              onClick={handleLimpar}
              onBlur={() => setTimeout(() => setConfirmandoLimpar(false), 200)}
            >
              {confirmandoLimpar ? "⚠ Confirmar limpeza" : "Limpar histórico"}
            </button>
          )}
        </div>
      </div>

      <div className="abas-linha">
        {[
          { key: "todos", label: "Todos" },
          { key: "compra", label: "Compras" },
          { key: "venda", label: "Vendas" },
        ].map(({ key, label }) => {
          const count = key === "todos" ? historico.length : historico.filter((h) => h.tipo === key).length;
          return (
            <button
              key={key}
              className={`aba-botao${filtro === key ? " aba-botao--ativa" : ""}`}
              onClick={() => setFiltro(key)}
            >
              {label}
              <span className="historico-aba-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="painel">
        {historico.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-titulo">Nenhuma operação registrada</p>
            <p>Use os botões de Comprar ou Vender no Rebalanceamento para registrar operações aqui.</p>
          </div>
        ) : (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  {th("data", "Data / Hora", "", "Data e hora em que a operação foi registrada")}
                  {th("codigo", "Código")}
                  {th("classe", "Classe")}
                  {th("tipo", "Tipo")}
                  {th("quantidade", "Qtd.", "alinhar-direita")}
                  {th("cotacao", "Cotação", "alinhar-direita")}
                  {th("valor", "Valor total", "alinhar-direita")}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((h, i) => (
                  <tr key={i} data-codigo={h.codigo} data-tipo={h.tipo}>
                    <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{formatarDataHora(h.data)}</td>
                    <td className="codigo-ativo">{h.codigo}</td>
                    <td><ClassePill classe={h.classe} /></td>
                    <td>
                      <span className={`historico-tipo-badge historico-tipo-badge--${h.tipo}`}>
                        {h.tipo === "compra" ? "↑ Compra" : "↓ Venda"}
                      </span>
                    </td>
                    <td className="alinhar-direita num">{formatarQuantidade(h.quantidade)}</td>
                    <td className="alinhar-direita num">{formatarMoeda(h.cotacao)}</td>
                    <td className={`alinhar-direita num ${h.tipo === "compra" ? "positivo" : "negativo"}`}>
                      <strong>{formatarMoeda(h.valor)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtrados.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={6}>
                      TOTAL ({filtro === "todos" ? "todas as operações" : filtro === "compra" ? "compras" : "vendas"})
                    </td>
                    <td className="alinhar-direita num">
                      {formatarMoeda(filtrados.reduce((acc, h) => acc + h.valor, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
