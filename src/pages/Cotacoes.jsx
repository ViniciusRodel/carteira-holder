import React, { useState, useMemo, useCallback, useRef } from "react";
import { useCarteira } from "../lib/CarteiraContext";
import { useOrdenacao, aplicarOrdenacao } from "../lib/useOrdenacao";
import ClassePill from "../components/ClassePill";
import ThOrdenavel from "../components/ThOrdenavel";
import CampoEdicaoInline from "../components/CampoEdicaoInline";
import { formatarMoeda } from "../lib/formato";
import { useToast } from "../lib/useToast";

const REGEX_B3 = /^[A-Z]{3,5}\d{1,2}$/;

function formatarHora(data) {
  if (!data) return null;
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function Cotacoes() {
  const {
    ativos,
    atualizarAtivo,
    atualizarCotacaoUnica,
    iniciarEdicaoCotacao,
    finalizarEdicaoCotacao,
    statusCotacao,
    brapiToken,
    setBrapiToken,
  } = useCarteira();

  const [busca, setBusca] = useState("");
  const [tokenInput, setTokenInput] = useState(brapiToken);
  const [tokenSalvo, setTokenSalvo] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [carregando, setCarregando] = useState({}); // { [codigo]: true | "ok" | "erro" }
  const [atualizandoTodos, setAtualizandoTodos] = useState(false);
  const [statusManual, setStatusManual] = useState(null); // resultado da última atualização manual
  const canceladoRef = useRef(false);
  const { toasts, add: addToast } = useToast();

  function salvarToken(e) {
    e.preventDefault();
    setBrapiToken(tokenInput.trim());
    setTokenSalvo(true);
    setTimeout(() => setTokenSalvo(false), 2500);
  }

  const { ordenacao, alternarOrdem } = useOrdenacao(null, "desc");

  const filtrados = useMemo(() => {
    const base = ativos.filter((a) => a.codigo.toLowerCase().includes(busca.toLowerCase()));
    return aplicarOrdenacao(base, ordenacao);
  }, [ativos, busca, ordenacao]);

  const th = (campo, label, className = "") => (
    <ThOrdenavel campo={campo} ordenacao={ordenacao} onOrdenar={alternarOrdem} className={className}>
      {label}
    </ThOrdenavel>
  );

  const { atualizando, atualizadoEm, atualizados, erro } = statusCotacao;

  const atualizarUm = useCallback(async (codigo, classe) => {
    setCarregando((prev) => ({ ...prev, [codigo]: true }));
    const resultado = await atualizarCotacaoUnica(codigo, classe);
    setCarregando((prev) => ({ ...prev, [codigo]: resultado.ok ? "ok" : "erro" }));
    setTimeout(() => setCarregando((prev) => ({ ...prev, [codigo]: false })), 3000);
    return resultado;
  }, [atualizarCotacaoUnica]);

  const handleAtualizarTodos = useCallback(async () => {
    if (atualizandoTodos) {
      // Segundo clique durante a execução: pede cancelamento antes do próximo ativo.
      canceladoRef.current = true;
      return;
    }
    canceladoRef.current = false;
    setAtualizandoTodos(true);

    const cripto = ativos.filter((a) => a.classe === "Criptomoedas");
    const b3 = ativos.filter((a) => REGEX_B3.test(a.codigo));
    const total = cripto.length + b3.length;
    let ok = 0;
    let erros = 0;

    setStatusManual({ estado: "atualizando", progresso: 0, total });

    // Cripto em paralelo (CoinGecko não tem limite de lote)
    const resultsCripto = await Promise.all(cripto.map((a) => atualizarUm(a.codigo, a.classe)));
    resultsCripto.forEach((r) => { if (r?.ok) ok++; else erros++; });
    setStatusManual((s) => ({ ...s, progresso: cripto.length }));

    // B3 sequencial — plano gratuito brapi.dev não suporta múltiplos símbolos
    for (const a of b3) {
      if (canceladoRef.current) break;
      const r = await atualizarUm(a.codigo, a.classe);
      if (r?.ok) ok++; else erros++;
      setStatusManual((s) => ({ ...s, progresso: s.progresso + 1 }));
      await new Promise((r) => setTimeout(r, 300));
    }

    const cancelado = canceladoRef.current;
    setStatusManual({ estado: cancelado ? "parcial" : erros === 0 ? "ok" : "parcial", ok, erros, total });
    setAtualizandoTodos(false);
    canceladoRef.current = false;
  }, [ativos, atualizarUm, atualizandoTodos]);

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Cotações</h1>
        <p className="page-subtitle">
          Ações, FIIs, ETFs e criptomoedas atualizam automaticamente a cada 15 min via brapi.dev.
          Renda fixa é sempre manual.
        </p>
      </header>

      <form className="painel cotacoes-token-bar" onSubmit={salvarToken}>
        <div className="cotacoes-token-info">
          <span className="cotacoes-token-label">Token brapi.dev</span>
          <span className="cotacoes-token-hint">
            Gratuito em <strong>brapi.dev</strong> → "Obter Chave de API" → copie o token
          </span>
        </div>
        <div className="cotacoes-token-campo">
          <div style={{ position: "relative", flex: 1 }}>
            <input
              className="input-base cotacoes-token-input cotacoes-token-input--com-olho"
              type={showToken ? "text" : "password"}
              placeholder="Cole seu token aqui..."
              value={tokenInput}
              onChange={(e) => { setTokenInput(e.target.value); setTokenSalvo(false); }}
            />
            <button
              type="button"
              className="cotacoes-token-olho"
              onClick={() => setShowToken((v) => !v)}
              title={showToken ? "Ocultar token" : "Mostrar token"}
              tabIndex={-1}
            >
              {showToken ? <OlhoFechadoIcon /> : <OlhoAbertoIcon />}
            </button>
          </div>
          <button
            type="submit"
            className="botao botao-primario"
            disabled={tokenInput.trim() === brapiToken && brapiToken !== ""}
          >
            {tokenSalvo ? "✓ Salvo!" : "Salvar"}
          </button>
        </div>
      </form>

      <div className="cotacoes-status-bar">
        <div className="cotacoes-status-info">
          {statusManual?.estado === "atualizando" ? (
            <span className="cotacoes-status-badge cotacoes-status-badge--sync">
              <SpinnerIcon /> Atualizando... ({statusManual.progresso}/{statusManual.total})
            </span>
          ) : statusManual?.estado === "ok" ? (
            <span className="cotacoes-status-badge cotacoes-status-badge--ok">
              <CheckIcon /> {statusManual.ok} ativos atualizados com sucesso
            </span>
          ) : statusManual?.estado === "parcial" ? (
            <span className="cotacoes-status-badge cotacoes-status-badge--erro">
              <AlertIcon /> {statusManual.ok} atualizados, {statusManual.erros} com erro
            </span>
          ) : atualizando ? (
            <span className="cotacoes-status-badge cotacoes-status-badge--sync">
              <SpinnerIcon /> Sincronizando em background…
            </span>
          ) : erro ? (
            <span className="cotacoes-status-badge cotacoes-status-badge--erro">
              <AlertIcon /> {erro}
            </span>
          ) : atualizadoEm ? (
            <span className="cotacoes-status-badge cotacoes-status-badge--ok">
              <CheckIcon /> {atualizados} ativo{atualizados !== 1 ? "s" : ""} atualizado{atualizados !== 1 ? "s" : ""} às {formatarHora(atualizadoEm)}
            </span>
          ) : null}
        </div>
        <button
          className="botao botao-secundario"
          onClick={handleAtualizarTodos}
          title={atualizandoTodos ? "Cancelar atualização em lote" : "Atualizar todos os ativos automáticos"}
        >
          {atualizandoTodos ? <SpinnerIcon /> : <RefreshIcon />}
          {atualizandoTodos ? "Cancelar" : "Atualizar todos"}
        </button>
      </div>

      <div className="painel">
        <div className="painel-header">
          <h2 className="painel-titulo">{ativos.length} ativos cadastrados</h2>
          <input
            className="input-base"
            style={{ maxWidth: 220 }}
            placeholder="Buscar código..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                {th("codigo", "Código")}
                {th("classe", "Classe")}
                <th className="alinhar-centro">Fonte</th>
                {th("cotacao", "Cotação (R$)", "alinhar-direita")}
                <th className="alinhar-centro">Atualizar</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((ativo) => {
                const isB3 = REGEX_B3.test(ativo.codigo);
                const isCripto = ativo.classe === "Criptomoedas";
                const autoAtualiza = isB3 || isCripto;
                const estado = carregando[ativo.codigo];
                return (
                  <tr key={ativo.codigo}>
                    <td className="codigo-ativo">{ativo.codigo}</td>
                    <td>
                      <ClassePill classe={ativo.classe} />
                    </td>
                    <td className="alinhar-centro">
                      {autoAtualiza ? (
                        <span className="cotacoes-fonte-badge cotacoes-fonte-badge--auto" title="Atualizado automaticamente via brapi.dev">
                          auto
                        </span>
                      ) : (
                        <span className="cotacoes-fonte-badge cotacoes-fonte-badge--manual" title="Atualização manual">
                          manual
                        </span>
                      )}
                    </td>
                    <td className="alinhar-direita">
                      <CampoEdicaoInline
                        valor={ativo.cotacao}
                        ariaLabel={`Cotação de ${ativo.codigo} em reais`}
                        onEditingChange={(emEdicao) => {
                          if (emEdicao) iniciarEdicaoCotacao(ativo.codigo);
                          else finalizarEdicaoCotacao(ativo.codigo);
                        }}
                        onCommit={(novoValor) => {
                          const anterior = ativo.cotacao;
                          atualizarAtivo(ativo.codigo, { cotacao: novoValor });
                          addToast(
                            `${ativo.codigo}: ${formatarMoeda(anterior)} → ${formatarMoeda(novoValor)}`,
                            "compra"
                          );
                        }}
                      />
                    </td>
                    <td className="alinhar-centro">
                      {autoAtualiza ? (
                        <button
                          className={`cotacoes-btn-atualizar ${estado === "ok" ? "cotacoes-btn-atualizar--ok" : estado === "erro" ? "cotacoes-btn-atualizar--erro" : ""}`}
                          title={`Atualizar cotação de ${ativo.codigo}`}
                          onClick={() => atualizarUm(ativo.codigo, ativo.classe)}
                          disabled={estado === true}
                        >
                          {estado === true ? <SpinnerIcon /> : estado === "ok" ? <CheckIcon /> : estado === "erro" ? <AlertIcon /> : <RefreshIcon />}
                        </button>
                      ) : (
                        <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <p className="empty-state-titulo">Nenhum ativo encontrado</p>
                      <p>Ajuste o termo de busca.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast--${t.tipo}`}>
              ✓ {t.msg}
            </div>
          ))}
        </div>
      )}
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

function OlhoAbertoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M1 7.5C1 7.5 3.5 3 7.5 3s6.5 4.5 6.5 4.5S11.5 12 7.5 12 1 7.5 1 7.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="7.5" cy="7.5" r="1.8" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function OlhoFechadoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M2 2l11 11M6.2 5.4A4.5 4.5 0 0 1 7.5 5c3.5 0 6 4.5 6 4.5a11.5 11.5 0 0 1-2.1 2.8M5.1 5.7A11.5 11.5 0 0 0 1.5 10S4 14 7.5 14c1.2 0 2.3-.4 3.2-1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
