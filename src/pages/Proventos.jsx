import React, { useCallback, useMemo, useRef, useState } from "react";
import { useCarteira } from "../lib/CarteiraContext";
import { useOrdenacao, aplicarOrdenacao } from "../lib/useOrdenacao";
import ClassePill from "../components/ClassePill";
import ThOrdenavel from "../components/ThOrdenavel";
import { formatarMoeda, formatarQuantidade } from "../lib/formato";
import { TIPO_PROVENTO } from "../lib/proventos";

const REGEX_B3 = /^[A-Z]{3,5}\d{1,2}$/;

const LABEL_TIPO = {
  [TIPO_PROVENTO.DIVIDENDO]: "Dividendo",
  [TIPO_PROVENTO.JCP]: "JCP",
  [TIPO_PROVENTO.BONIFICACAO]: "Bonificação",
  [TIPO_PROVENTO.SUBSCRICAO]: "Subscrição",
  [TIPO_PROVENTO.RENDIMENTO_FII]: "Rendimento FII",
  [TIPO_PROVENTO.OUTRO]: "Outro",
};

const ABAS_TIPO = [
  { key: "todos", label: "Todos" },
  { key: TIPO_PROVENTO.DIVIDENDO, label: "Dividendos" },
  { key: TIPO_PROVENTO.JCP, label: "JCP" },
  { key: TIPO_PROVENTO.RENDIMENTO_FII, label: "Rendimentos FII" },
  { key: "OUTROS", label: "Outros" },
];

const TIPOS_OUTROS = [TIPO_PROVENTO.BONIFICACAO, TIPO_PROVENTO.SUBSCRICAO, TIPO_PROVENTO.OUTRO];

function pertenceAba(provento, key) {
  if (key === "todos") return true;
  if (key === "OUTROS") return TIPOS_OUTROS.includes(provento.tipo);
  return provento.tipo === key;
}

function formatarData(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatarHora(data) {
  if (!data) return null;
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function Proventos() {
  const {
    ativos,
    proventos,
    resumoProventos,
    statusProventos,
    atualizarProventoUnico,
    cacheProventos,
    brapiToken,
  } = useCarteira();

  const [aba, setAba] = useState("todos");
  const [carregando, setCarregando] = useState({}); // { [codigo]: true | "ok" | "erro" }
  const [erroPorAtivo, setErroPorAtivo] = useState({}); // { [codigo]: mensagem de erro da última busca }
  const [buscandoTodos, setBuscandoTodos] = useState(false);
  const [statusManual, setStatusManual] = useState(null);
  const canceladoRef = useRef(false);

  const { ordenacao: ordenacaoAtivos, alternarOrdem: alternarOrdemAtivos } = useOrdenacao(null, "desc");
  const { ordenacao: ordenacaoEventos, alternarOrdem: alternarOrdemEventos } = useOrdenacao("dataPagamento", "desc");

  const elegiveis = useMemo(
    () => ativos.filter((a) => REGEX_B3.test(a.codigo) && a.classe !== "Criptomoedas"),
    [ativos]
  );

  const ativosOrdenados = useMemo(
    () => aplicarOrdenacao(elegiveis, ordenacaoAtivos),
    [elegiveis, ordenacaoAtivos]
  );

  const filtrados = useMemo(() => {
    const base = proventos.filter((p) => pertenceAba(p, aba));
    return aplicarOrdenacao(base, ordenacaoEventos);
  }, [proventos, aba, ordenacaoEventos]);

  const buscarUm = useCallback(async (codigo, classe) => {
    setCarregando((prev) => ({ ...prev, [codigo]: true }));
    const resultado = await atualizarProventoUnico(codigo, classe);
    setCarregando((prev) => ({ ...prev, [codigo]: resultado.ok ? "ok" : "erro" }));
    setErroPorAtivo((prev) => {
      const next = { ...prev };
      if (resultado.ok) delete next[codigo];
      else next[codigo] = resultado.erro || "erro desconhecido";
      return next;
    });
    setTimeout(() => setCarregando((prev) => ({ ...prev, [codigo]: false })), 3000);
    return resultado;
  }, [atualizarProventoUnico]);

  const handleBuscarTodos = useCallback(async () => {
    if (buscandoTodos) {
      canceladoRef.current = true;
      return;
    }
    canceladoRef.current = false;
    setBuscandoTodos(true);

    const total = elegiveis.length;
    let ok = 0;
    const errosDetalhados = [];
    setStatusManual({ estado: "buscando", progresso: 0, total });

    for (const a of elegiveis) {
      if (canceladoRef.current) break;
      const r = await buscarUm(a.codigo, a.classe);
      if (r?.ok) ok++;
      else errosDetalhados.push(`${a.codigo}: ${r?.erro ?? "erro desconhecido"}`);
      setStatusManual((s) => ({ ...s, progresso: s.progresso + 1 }));
      await new Promise((r) => setTimeout(r, 300));
    }

    const cancelado = canceladoRef.current;
    setStatusManual({
      estado: cancelado ? "parcial" : errosDetalhados.length === 0 ? "ok" : "parcial",
      ok,
      erros: errosDetalhados.length,
      exemploErro: errosDetalhados[0] ?? null,
      total,
    });
    setBuscandoTodos(false);
    canceladoRef.current = false;
  }, [elegiveis, buscarUm, buscandoTodos]);

  const th = (campo, label, className = "", tooltip) => (
    <ThOrdenavel campo={campo} ordenacao={ordenacaoEventos} onOrdenar={alternarOrdemEventos} className={className} tooltip={tooltip}>
      {label}
    </ThOrdenavel>
  );

  const thAtivo = (campo, label, className = "") => (
    <ThOrdenavel campo={campo} ordenacao={ordenacaoAtivos} onOrdenar={alternarOrdemAtivos} className={className}>
      {label}
    </ThOrdenavel>
  );

  const { atualizando, atualizadoEm, erro } = statusProventos;
  const { proximoPagamento } = resumoProventos;

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Proventos</h1>
        <p className="page-subtitle">
          Dividendos, JCP e rendimentos de FIIs dos ativos da carteira, via brapi.dev. Histórico limitado ao ano corrente.
        </p>
      </header>

      <div className="kpi-linha">
        <div>
          <div className="kpi-bloco-label">Total previsto</div>
          <div className="kpi-bloco-valor num" style={{ fontSize: 24, color: "var(--warning)" }}>
            {formatarMoeda(resumoProventos.totalPrevisto)}
          </div>
        </div>
        <div>
          <div className="kpi-bloco-label">Total recebido (ano corrente)</div>
          <div className="kpi-bloco-valor num" style={{ fontSize: 24, color: "var(--positive)" }}>
            {formatarMoeda(resumoProventos.totalRecebido)}
          </div>
        </div>
        <div>
          <div className="kpi-bloco-label">Próximo pagamento</div>
          <div className="kpi-bloco-valor num" style={{ fontSize: 24 }}>
            {proximoPagamento ? (
              <>
                {proximoPagamento.codigo}{" "}
                <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                  {formatarData(proximoPagamento.data)}
                </span>
              </>
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>

      <p className="provento-aviso-aproximacao">
        Valores calculados com a quantidade <strong>atual</strong> de cada ativo — o sistema não guarda a posição
        histórica na data de cada evento, então proventos já pagos também usam a quantidade de hoje, não a de então.
      </p>

      <div className="cotacoes-status-bar">
        <div className="cotacoes-status-info">
          {statusManual?.estado === "buscando" ? (
            <span className="cotacoes-status-badge cotacoes-status-badge--sync">
              <SpinnerIcon /> Buscando... ({statusManual.progresso}/{statusManual.total})
            </span>
          ) : statusManual?.estado === "ok" ? (
            <span className="cotacoes-status-badge cotacoes-status-badge--ok">
              <CheckIcon /> {statusManual.ok} ativo{statusManual.ok !== 1 ? "s" : ""} consultado{statusManual.ok !== 1 ? "s" : ""} com sucesso
            </span>
          ) : statusManual?.estado === "parcial" ? (
            <span className="cotacoes-status-badge cotacoes-status-badge--erro" title={statusManual.exemploErro ?? undefined}>
              <AlertIcon /> {statusManual.ok} ok, {statusManual.erros} com erro
              {statusManual.exemploErro ? ` — ex: ${statusManual.exemploErro}` : ""}
            </span>
          ) : atualizando ? (
            <span className="cotacoes-status-badge cotacoes-status-badge--sync">
              <SpinnerIcon /> Buscando em segundo plano…
            </span>
          ) : erro ? (
            <span className="cotacoes-status-badge cotacoes-status-badge--erro" title={erro}>
              <AlertIcon /> {erro}
            </span>
          ) : atualizadoEm ? (
            <span className="cotacoes-status-badge cotacoes-status-badge--ok">
              <CheckIcon /> Atualizado às {formatarHora(atualizadoEm)}
            </span>
          ) : null}
        </div>
        <button
          className="botao botao-secundario"
          onClick={handleBuscarTodos}
          disabled={!brapiToken || elegiveis.length === 0}
          title={buscandoTodos ? "Cancelar busca em lote" : "Buscar proventos de todos os ativos, um por um"}
        >
          {buscandoTodos ? <SpinnerIcon /> : <RefreshIcon />}
          {buscandoTodos ? "Cancelar" : "Buscar todos"}
        </button>
      </div>

      <div className="painel" style={{ marginBottom: 24 }}>
        <div className="painel-header">
          <h2 className="painel-titulo">Ativos ({elegiveis.length})</h2>
        </div>
        {!brapiToken ? (
          <div className="empty-state">
            <p className="empty-state-titulo">Token brapi.dev não configurado</p>
            <p>Insira seu token gratuito na tela Cotações para buscar proventos.</p>
          </div>
        ) : elegiveis.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-titulo">Nenhum ativo elegível</p>
            <p>Ações, ETFs e FIIs da carteira aparecem aqui — Renda Fixa e Criptomoedas não têm proventos na brapi.dev.</p>
          </div>
        ) : (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  {thAtivo("codigo", "Código")}
                  <th>Classe</th>
                  <th>Proventos encontrados</th>
                  <th className="alinhar-centro">Buscar</th>
                </tr>
              </thead>
              <tbody>
                {ativosOrdenados.map((ativo) => {
                  const estado = carregando[ativo.codigo];
                  const brutos = cacheProventos.porAtivo[ativo.codigo];
                  const erroAtivo = erroPorAtivo[ativo.codigo];
                  return (
                    <tr key={ativo.codigo} data-codigo={ativo.codigo}>
                      <td className="codigo-ativo">{ativo.codigo}</td>
                      <td>
                        <ClassePill classe={ativo.classe} />
                      </td>
                      <td
                        style={{ color: brutos === undefined && erroAtivo ? "var(--negative)" : "var(--text-secondary)" }}
                        title={erroAtivo || undefined}
                      >
                        {brutos !== undefined
                          ? `${brutos.length} encontrado${brutos.length !== 1 ? "s" : ""}`
                          : erroAtivo
                            ? `Erro: ${erroAtivo}`
                            : "— ainda não buscado"}
                      </td>
                      <td className="alinhar-centro">
                        <button
                          className={`cotacoes-btn-atualizar ${estado === "ok" ? "cotacoes-btn-atualizar--ok" : estado === "erro" ? "cotacoes-btn-atualizar--erro" : ""}`}
                          title={erroAtivo ? `${ativo.codigo}: ${erroAtivo}` : `Buscar proventos de ${ativo.codigo}`}
                          onClick={() => buscarUm(ativo.codigo, ativo.classe)}
                          disabled={estado === true || !brapiToken}
                        >
                          {estado === true ? <SpinnerIcon /> : estado === "ok" ? <CheckIcon /> : estado === "erro" ? <AlertIcon /> : <RefreshIcon />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="abas-linha">
        {ABAS_TIPO.map(({ key, label }) => {
          const count = proventos.filter((p) => pertenceAba(p, key)).length;
          return (
            <button
              key={key}
              className={`aba-botao${aba === key ? " aba-botao--ativa" : ""}`}
              onClick={() => setAba(key)}
            >
              {label}
              <span className="historico-aba-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="painel">
        {proventos.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-titulo">Nenhum provento encontrado ainda</p>
            <p>Use os botões "Buscar todos" ou o ↻ por ativo acima para consultar a brapi.dev.</p>
          </div>
        ) : (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  {th("codigo", "Ativo")}
                  <th>Classe</th>
                  {th("tipo", "Tipo")}
                  {th("dataCom", "Data COM", "alinhar-direita")}
                  {th("dataPagamento", "Data Pagamento", "alinhar-direita")}
                  {th("valorPorAtivo", "Valor por ativo", "alinhar-direita")}
                  {th("quantidade", "Quantidade", "alinhar-direita", "Quantidade atual — ver aviso acima")}
                  {th("valorEstimado", "Valor estimado", "alinhar-direita")}
                  <th className="alinhar-centro">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p, i) => (
                  <tr key={`${p.codigo}-${p.tipo}-${p.dataPagamento}-${i}`} data-codigo={p.codigo}>
                    <td className="codigo-ativo">{p.codigo}</td>
                    <td>
                      <ClassePill classe={p.classe} />
                    </td>
                    <td>
                      <span className={`provento-tipo-badge provento-tipo-badge--${p.tipo}`}>
                        {LABEL_TIPO[p.tipo] ?? p.tipo}
                      </span>
                    </td>
                    <td className="alinhar-direita">{formatarData(p.dataCom)}</td>
                    <td className="alinhar-direita">{formatarData(p.dataPagamento)}</td>
                    <td className="alinhar-direita num">{formatarMoeda(p.valorPorAtivo)}</td>
                    <td className="alinhar-direita num">{formatarQuantidade(p.quantidade)}</td>
                    <td className="alinhar-direita num">
                      <strong>{formatarMoeda(p.valorEstimado)}</strong>
                    </td>
                    <td className="alinhar-centro">
                      <span className={`provento-status-badge provento-status-badge--${p.status}`}>
                        {p.status === "PAGO" ? "Pago" : "Previsto"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtrados.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={7}>
                      TOTAL ({aba === "todos" ? "todos os tipos" : LABEL_TIPO[aba] ?? "outros"})
                    </td>
                    <td className="alinhar-direita num">
                      {formatarMoeda(filtrados.reduce((acc, p) => acc + p.valorEstimado, 0))}
                    </td>
                    <td />
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

function SpinnerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true" style={{ animation: "cotacoes-spin 1s linear infinite" }}>
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2.5 7L5 9.5L10.5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M6.5 2L11.5 11H1.5L6.5 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6.5 5.5V7.5M6.5 9h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M11 6.5A4.5 4.5 0 1 1 6.5 2a4.5 4.5 0 0 1 3.18 1.32L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 2v3H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
