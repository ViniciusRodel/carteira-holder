import React, { useState, useMemo } from "react";
import { useCarteira } from "../lib/CarteiraContext";
import { useOrdenacao, aplicarOrdenacao } from "../lib/useOrdenacao";
import ClassePill from "../components/ClassePill";
import ThOrdenavel from "../components/ThOrdenavel";
import Toggle from "../components/Toggle";
import { formatarMoeda, formatarNumero, formatarQuantidade, formatarPercentual, formatarPercentualComSinal } from "../lib/formato";
import { useToast } from "../lib/useToast";

const MODAL_VAZIO = { aberto: false, ativo: null, tipo: "comprar", qtd: "" };

export default function Rebalanceamento() {
  const { classes, rebalanceamento, aporte, setAporte, excluidos, alternarExclusao, total, atualizarAtivo, adicionarHistorico } = useCarteira();
  const [classeFiltro, setClasseFiltro] = useState("Todos");
  const [modal, setModal] = useState(MODAL_VAZIO);
  const { ordenacao, alternarOrdem } = useOrdenacao("valorAportar", "desc");
  const { toasts, add: addToast } = useToast();

  const abas = ["Todos", ...classes];

  const filtrados = useMemo(() => {
    const base =
      classeFiltro === "Todos"
        ? rebalanceamento
        : rebalanceamento.filter((r) => r.classe === classeFiltro);
    return aplicarOrdenacao(base, ordenacao);
  }, [rebalanceamento, classeFiltro, ordenacao]);

  const totalAportar = rebalanceamento.reduce((acc, r) => acc + r.valorAportar, 0);

  function comprarSugerido(r) {
    if (r.qtdComprar <= 0) return;
    atualizarAtivo(r.codigo, { quantidade: r.quantidade + r.qtdComprar });
    addToast(`Comprado ${r.qtdComprar} × ${r.codigo} — ${formatarMoeda(r.vlrCompra)}`, "compra");
    adicionarHistorico({ codigo: r.codigo, classe: r.classe, tipo: "compra", quantidade: r.qtdComprar, cotacao: r.cotacao, valor: r.vlrCompra });
  }

  function abrirModal(r) {
    setModal({ aberto: true, ativo: r, tipo: "comprar", qtd: "" });
  }

  function fecharModal() {
    setModal(MODAL_VAZIO);
  }

  function confirmarModal() {
    const qtd = parseInt(modal.qtd, 10);
    if (!qtd || qtd <= 0) return;
    const { ativo, tipo } = modal;
    if (tipo === "vender" && qtd > ativo.quantidade) return;
    const novaQtd =
      tipo === "comprar"
        ? ativo.quantidade + qtd
        : ativo.quantidade - qtd;
    atualizarAtivo(ativo.codigo, { quantidade: novaQtd });
    const valorTotal = qtd * ativo.cotacao;
    const valor = formatarMoeda(valorTotal);
    if (tipo === "comprar") {
      addToast(`Comprado ${qtd} × ${ativo.codigo} — ${valor}`, "compra");
      adicionarHistorico({ codigo: ativo.codigo, classe: ativo.classe, tipo: "compra", quantidade: qtd, cotacao: ativo.cotacao, valor: valorTotal });
    } else {
      addToast(`Vendido ${qtd} × ${ativo.codigo} — ${valor}`, "venda");
      adicionarHistorico({ codigo: ativo.codigo, classe: ativo.classe, tipo: "venda", quantidade: qtd, cotacao: ativo.cotacao, valor: valorTotal });
    }
    fecharModal();
  }

  const th = (campo, label, className = "", tooltip) => (
    <ThOrdenavel campo={campo} ordenacao={ordenacao} onOrdenar={alternarOrdem} className={className} tooltip={tooltip}>
      {label}
    </ThOrdenavel>
  );

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Rebalanceamento</h1>
        <p className="page-subtitle">
          Informe o valor do aporte. A planilha sugere quanto comprar de cada ativo para se aproximar da meta.
        </p>
      </header>

      <div className="painel rebal-config">
        <div className="campo-form" style={{ minWidth: 220 }}>
          <label>Valor do aporte (R$)</label>
          <input
            type="number"
            step="0.01"
            className="input-base input-aporte num"
            value={aporte}
            onChange={(e) => setAporte(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="rebal-resumo">
          <div>
            <span className="kpi-bloco-label">Total investido</span>
            <div className="num rebal-resumo-valor">{formatarMoeda(total)}</div>
          </div>
          <div>
            <span className="kpi-bloco-label">Total a aportar (soma)</span>
            <div className="num rebal-resumo-valor" style={{ color: "var(--accent)" }}>
              {formatarMoeda(totalAportar)}
            </div>
          </div>
        </div>
      </div>

      <div className="abas-linha">
        {abas.map((c) => (
          <button
            key={c}
            className={`aba-botao${classeFiltro === c ? " aba-botao--ativa" : ""}`}
            onClick={() => setClasseFiltro(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="painel">
        <div className="tabela-wrap tabela-wrap--rebal">
          <table className="tabela tabela--rebal">
            <thead>
              <tr>
                {th("codigo", "Código")}
                {th("classe", "Classe")}
                {th("cotacao", "Cotação", "alinhar-direita")}
                {th("quantidade", "Qtd.", "alinhar-direita")}
                {th("valorInvestido", "Investido", "alinhar-direita")}
                {th("pctAtual", "% Atual", "alinhar-direita", "Percentual atual do ativo na carteira total")}
                {th("pctMeta", "% Meta", "alinhar-direita", "Percentual alvo do ativo na carteira total (nota × meta da classe)")}
                {th("pctDiferenca", "% Dif.", "alinhar-direita", "Diferença entre % atual e % meta. Negativo = abaixo da meta (precisa comprar)")}
                <th className="alinhar-centro">Incluir?</th>
                {th("qtdComprar", "Qtd. sug.", "alinhar-direita", "Quantidade sugerida com base na proporção do déficit de cada ativo no aporte")}
                {th("vlrCompra", "Vlr. compra", "alinhar-direita", "Valor total da compra sugerida (qtd sugerida × cotação)")}
                <th className="alinhar-centro col-sticky-right">OP</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r) => {
                const incluido = !excluidos.has(r.codigo);
                return (
                  <tr key={r.codigo} data-codigo={r.codigo} style={{ opacity: incluido ? 1 : 0.45 }}>
                    <td className="codigo-ativo">{r.codigo}</td>
                    <td><ClassePill classe={r.classe} /></td>
                    <td className="alinhar-direita num">{formatarNumero(r.cotacao, 2)}</td>
                    <td className="alinhar-direita num">{formatarQuantidade(r.quantidade)}</td>
                    <td className="alinhar-direita num">{formatarMoeda(r.valorInvestido)}</td>
                    <td className="alinhar-direita num">{formatarPercentual(r.pctAtual)}</td>
                    <td className="alinhar-direita num">{formatarPercentual(r.pctMeta)}</td>
                    <td className={`alinhar-direita num ${r.pctDiferenca < 0 ? "negativo" : "positivo"}`}>
                      {formatarPercentualComSinal(r.pctDiferenca)}
                    </td>
                    <td className="alinhar-centro">
                      <Toggle
                        ligado={incluido}
                        onChange={() => alternarExclusao(r.codigo)}
                        ariaLabel={`Incluir ${r.codigo} no cálculo`}
                      />
                    </td>
                    <td className="alinhar-direita num">
                      {r.qtdComprar > 0
                        ? formatarNumero(r.qtdComprar, 0)
                        : r.valorAportar > 0
                        ? <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{"< 1 und."}</span>
                        : "—"}
                    </td>
                    <td className="alinhar-direita num">
                      {r.vlrCompra > 0 ? (
                        <strong style={{ color: "var(--accent)" }}>{formatarMoeda(r.vlrCompra)}</strong>
                      ) : r.valorAportar > 0 ? (
                        <span style={{ color: "var(--text-tertiary)", fontSize: 11 }} title={`Alocado: ${formatarMoeda(r.valorAportar)} — insuficiente para 1 unidade`}>
                          {formatarMoeda(r.valorAportar)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="alinhar-centro col-sticky-right">
                      <div className="rebal-op-botoes">
                        <button
                          className="rebal-op-btn rebal-op-btn--manual"
                          title="Lançar operação manualmente"
                          onClick={() => abrirModal(r)}
                        >
                          <IconeOperacao />
                        </button>
                        <button
                          className={`rebal-op-btn rebal-op-btn--comprar${r.qtdComprar <= 0 ? " rebal-op-btn--desabilitado" : ""}`}
                          title={r.qtdComprar > 0 ? `Comprar ${r.qtdComprar} und. — ${formatarMoeda(r.vlrCompra)}` : "Aporte insuficiente para 1 unidade"}
                          onClick={() => comprarSugerido(r)}
                          disabled={r.qtdComprar <= 0}
                        >
                          <IconeComprar />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>TOTAL ({classeFiltro})</td>
                <td className="alinhar-direita num">
                  {formatarMoeda(filtrados.reduce((a, r) => a + r.valorInvestido, 0))}
                </td>
                <td colSpan={4} />
                <td className="alinhar-direita num" />
                <td className="alinhar-direita num">
                  {formatarMoeda(filtrados.reduce((a, r) => a + r.vlrCompra, 0))}
                </td>
                <td className="col-sticky-right" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast--${t.tipo}`}>
              {t.tipo === "compra" ? "✓" : "↓"} {t.msg}
            </div>
          ))}
        </div>
      )}

      {modal.aberto && modal.ativo && (
        <ModalOperacao
          ativo={modal.ativo}
          tipo={modal.tipo}
          qtd={modal.qtd}
          onTipo={(t) => setModal((m) => ({ ...m, tipo: t }))}
          onQtd={(v) => setModal((m) => ({ ...m, qtd: v }))}
          onConfirmar={confirmarModal}
          onFechar={fecharModal}
        />
      )}
    </div>
  );
}

function ModalOperacao({ ativo, tipo, qtd, onTipo, onQtd, onConfirmar, onFechar }) {
  const isVenda = tipo === "vender";

  function handleKeyDown(e) {
    if (e.key === "Enter") onConfirmar();
    if (e.key === "Escape") onFechar();
  }

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal-caixa" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="modal-header">
          <span className="modal-titulo">{isVenda ? "Vender" : "Comprar"}: {ativo.codigo}</span>
          <button className="modal-fechar" onClick={onFechar} aria-label="Fechar">×</button>
        </div>

        <div className="modal-corpo">
          <div className="modal-tipo-linha">
            <button
              className={`modal-tipo-btn${!isVenda ? " modal-tipo-btn--ativo" : ""}`}
              onClick={() => onTipo("comprar")}
            >
              (+) Comprar
            </button>
            <button
              className={`modal-tipo-btn modal-tipo-btn--venda${isVenda ? " modal-tipo-btn--ativo-venda" : ""}`}
              onClick={() => onTipo("vender")}
            >
              (−) Vender
            </button>
          </div>

          <div className="campo-form" style={{ marginTop: 20 }}>
            <label>Quantidade</label>
            <input
              type="number"
              min="1"
              step="1"
              className="input-base num"
              value={qtd}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || (Number.isInteger(+v) && +v > 0)) onQtd(v);
              }}
              placeholder="0"
              autoFocus
            />
            {isVenda && qtd > ativo.quantidade && (
              <span style={{ fontSize: 11, color: "#e05555", marginTop: 4, display: "block" }}>
                Você possui apenas {formatarNumero(ativo.quantidade, 0)} unidade(s)
              </span>
            )}
          </div>

          {ativo.cotacao > 0 && qtd > 0 && (
            <div className="modal-preview">
              {isVenda ? "Venda" : "Compra"} estimada:{" "}
              <strong>{formatarMoeda(parseInt(qtd, 10) * ativo.cotacao)}</strong>
            </div>
          )}
        </div>

        <div className="modal-rodape">
          <button className="botao botao-secundario" onClick={onFechar}>Cancelar</button>
          <button
            className={`botao ${isVenda ? "botao-perigo-solid" : "botao-primario"}`}
            onClick={onConfirmar}
            disabled={!qtd || parseInt(qtd, 10) <= 0 || (isVenda && qtd > ativo.quantidade)}
          >
            {isVenda ? "Vender" : "Comprar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function IconeOperacao() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M3 5h7M3 5L5 3M3 5l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 10H5M12 10l-2-2M12 10l-2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconeComprar() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M2 11.5L5.5 8l2.5 2.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 4h3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
