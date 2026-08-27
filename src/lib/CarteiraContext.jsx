import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ATIVOS_INICIAIS, METAS_CLASSE_INICIAIS, CLASSES } from "./dadosIniciais";
import { storage } from "./storage";
import {
  valorTotalInvestido,
  resumoPorClasse,
  calcularRebalanceamento,
  tabelaMetaAtivos,
  tabelaPosicaoAtual,
  metasClasseValidas,
} from "./calculos";
import {
  TTL_PROVENTOS_MS,
  mapearRespostaAcao,
  mapearRespostaFii,
  dentroDoEscopoHistorico,
  paraProventoPosicao,
  montarResumo,
} from "./proventos";

const CarteiraContext = createContext(null);

// Identifica tickers negociados na B3: 3-5 letras maiúsculas + 1-2 dígitos (ex: TAEE11, SOJA3, IVVB11)
const REGEX_B3 = /^[A-Z]{3,5}\d{1,2}$/;

// Mapeamento código → ID CoinGecko (API gratuita, sem auth)
const COINGECKO_IDS = {
  BTC: "bitcoin", ETH: "ethereum", XRP: "ripple", SOL: "solana",
  AAVE: "aave", BNB: "binancecoin", ADA: "cardano", DOT: "polkadot",
  MATIC: "matic-network", LINK: "chainlink", UNI: "uniswap",
  DOGE: "dogecoin", AVAX: "avalanche-2", ATOM: "cosmos",
  LTC: "litecoin", BCH: "bitcoin-cash",
};

function coingeckoId(codigo) {
  return COINGECKO_IDS[codigo.toUpperCase()] || codigo.toLowerCase();
}

export function CarteiraProvider({ children }) {
  const [ativos, setAtivos] = useState(() => storage.carregarAtivos(ATIVOS_INICIAIS));
  const [metasClasse, setMetasClasse] = useState(() => storage.carregarMetasClasse(METAS_CLASSE_INICIAIS));
  const [aporte, setAporte] = useState(() => storage.carregarAporte(1000));
  const [excluidos, setExcluidos] = useState(() => new Set(storage.carregarExcluidos([])));
  const [brapiToken, setBrapiTokenState] = useState(() => storage.carregarBrapiToken());
  const [historico, setHistorico] = useState(() => storage.carregarHistorico());
  const [statusCotacao, setStatusCotacao] = useState({
    atualizadoEm: null,
    atualizando: false,
    atualizados: 0,
    erro: null,
  });
  const [cacheProventos, setCacheProventos] = useState(() => storage.carregarProventos());
  const [statusProventos, setStatusProventos] = useState({
    atualizadoEm: null,
    atualizando: false,
    erro: null,
  });

  useEffect(() => storage.salvarAtivos(ativos), [ativos]);
  useEffect(() => storage.salvarMetasClasse(metasClasse), [metasClasse]);
  useEffect(() => storage.salvarAporte(aporte), [aporte]);
  useEffect(() => storage.salvarExcluidos(Array.from(excluidos)), [excluidos]);
  useEffect(() => storage.salvarBrapiToken(brapiToken), [brapiToken]);
  useEffect(() => storage.salvarHistorico(historico), [historico]);
  useEffect(() => storage.salvarProventos(cacheProventos), [cacheProventos]);

  const brapiTokenRef = useRef(brapiToken);
  useEffect(() => { brapiTokenRef.current = brapiToken; }, [brapiToken]);

  // Códigos com edição manual de cotação em andamento (campo com foco) — a
  // atualização automática/manual via API ignora esses códigos enquanto o
  // usuário estiver digitando, para não sobrescrever o valor em silêncio.
  const emEdicaoRef = useRef(new Set());
  const iniciarEdicaoCotacao = useCallback((codigo) => {
    emEdicaoRef.current.add(codigo);
  }, []);
  const finalizarEdicaoCotacao = useCallback((codigo) => {
    emEdicaoRef.current.delete(codigo);
  }, []);

  const setBrapiToken = useCallback((token) => {
    setBrapiTokenState(token.trim());
  }, []);

  const adicionarHistorico = useCallback((entrada) => {
    setHistorico((prev) => [{ ...entrada, data: new Date().toISOString() }, ...prev].slice(0, 500));
  }, []);

  const limparHistorico = useCallback(() => setHistorico([]), []);

  // Atualiza cotação de um único ativo (usado no botão por linha)
  const atualizarCotacaoUnica = useCallback(async (codigo, classe) => {
    try {
      if (classe === "Criptomoedas") {
        const id = coingeckoId(codigo);
        const resp = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=brl`
        );
        if (!resp.ok) return { ok: false, erro: `CoinGecko HTTP ${resp.status}` };
        const json = await resp.json();
        const preco = json[id]?.brl;
        if (preco > 0) {
          if (emEdicaoRef.current.has(codigo)) {
            return { ok: false, erro: "Ignorado — cotação está sendo editada manualmente" };
          }
          setAtivos((prev) => prev.map((a) => a.codigo === codigo ? { ...a, cotacao: preco } : a));
          return { ok: true, preco };
        }
        return { ok: false, erro: `Moeda "${codigo}" não encontrada (ID: ${id})` };
      } else {
        const token = brapiTokenRef.current;
        if (!token) return { ok: false, erro: "Token não configurado" };
        const resp = await fetch(
          `https://brapi.dev/api/v2/stocks/quote?symbols=${codigo}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!resp.ok) return { ok: false, erro: `HTTP ${resp.status}` };
        const json = await resp.json();
        const item = json.results?.[0];
        const preco = item?.data?.regularMarketPrice ?? item?.regularMarketPrice;
        if (preco > 0) {
          if (emEdicaoRef.current.has(codigo)) {
            return { ok: false, erro: "Ignorado — cotação está sendo editada manualmente" };
          }
          setAtivos((prev) => prev.map((a) => a.codigo === codigo ? { ...a, cotacao: preco } : a));
          return { ok: true, preco };
        }
        return { ok: false, erro: "Preço não encontrado na resposta" };
      }
    } catch (e) {
      return { ok: false, erro: e.message || "Sem conexão" };
    }
  }, []);

  // Ref para acessar ativos atuais dentro do intervalo sem dependência no useEffect
  const ativosRef = useRef(ativos);
  useEffect(() => { ativosRef.current = ativos; }, [ativos]);

  const atualizarAtivo = useCallback((codigo, patch) => {
    setAtivos((prev) => prev.map((a) => (a.codigo === codigo ? { ...a, ...patch } : a)));
  }, []);

  const adicionarAtivo = useCallback((novoAtivo) => {
    setAtivos((prev) => [...prev, novoAtivo]);
  }, []);

  const removerAtivo = useCallback((codigo) => {
    setAtivos((prev) => prev.filter((a) => a.codigo !== codigo));
    setExcluidos((prev) => {
      const next = new Set(prev);
      next.delete(codigo);
      return next;
    });
  }, []);

  const atualizarMetaClasse = useCallback((classe, valor) => {
    setMetasClasse((prev) => ({ ...prev, [classe]: valor }));
  }, []);

  const alternarExclusao = useCallback((codigo) => {
    setExcluidos((prev) => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });
  }, []);

  const resetarParaExemplo = useCallback(() => {
    setHistorico([]);
    setAtivos(ATIVOS_INICIAIS);
    setMetasClasse(METAS_CLASSE_INICIAIS);
    setAporte(1000);
    setExcluidos(new Set());
  }, []);

  // --- Integração brapi.dev v2 ---
  // Vai ativo por ativo — lote com múltiplos símbolos retorna HTTP 400 no plano gratuito
  const atualizarCotacoes = useCallback(async () => {
    const todos = ativosRef.current;
    const token = brapiTokenRef.current;

    if (!token) {
      setStatusCotacao((s) => ({
        ...s,
        atualizando: false,
        erro: "Token brapi.dev não configurado. Insira seu token gratuito no campo acima.",
      }));
      return;
    }

    const ativosB3 = todos.filter((a) => REGEX_B3.test(a.codigo));
    const ativosCripto = todos.filter((a) => a.classe === "Criptomoedas");

    if (ativosB3.length === 0 && ativosCripto.length === 0) return;

    setStatusCotacao((s) => ({ ...s, atualizando: true, erro: null }));

    const novas = {};
    const erros = [];

    try {
      // Cripto — CoinGecko em lote (API suporta múltiplos IDs)
      if (ativosCripto.length > 0) {
        const ids = ativosCripto.map((a) => coingeckoId(a.codigo)).join(",");
        const resp = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=brl`
        );
        if (resp.ok) {
          const json = await resp.json();
          for (const a of ativosCripto) {
            const preco = json[coingeckoId(a.codigo)]?.brl;
            if (preco > 0) novas[a.codigo] = preco;
          }
        } else {
          erros.push(`Cripto: HTTP ${resp.status}`);
        }
      }

      // B3 — individual e sequencial (lote falha com HTTP 400 no plano gratuito)
      for (const ativo of ativosB3) {
        try {
          const resp = await fetch(
            `https://brapi.dev/api/v2/stocks/quote?symbols=${ativo.codigo}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (resp.ok) {
            const json = await resp.json();
            const item = json.results?.[0];
            const preco = item?.data?.regularMarketPrice ?? item?.regularMarketPrice;
            if (preco > 0) novas[ativo.codigo] = preco;
          } else {
            erros.push(`${ativo.codigo}: HTTP ${resp.status}`);
          }
        } catch (e) {
          erros.push(`${ativo.codigo}: ${e.message}`);
        }
        await new Promise((r) => setTimeout(r, 250));
      }

      const atualizados = Object.keys(novas).length;

      if (atualizados > 0) {
        setAtivos((prev) =>
          prev.map((a) =>
            novas[a.codigo] !== undefined && !emEdicaoRef.current.has(a.codigo)
              ? { ...a, cotacao: novas[a.codigo] }
              : a
          )
        );
      }

      const erro = erros.length > 0
        ? `${atualizados} atualizados — ${erros.length} com erro`
        : null;

      setStatusCotacao({ atualizadoEm: new Date(), atualizando: false, atualizados, erro });
    } catch (e) {
      setStatusCotacao((s) => ({
        ...s,
        atualizando: false,
        erro: `Falha ao buscar cotações: ${e.message || "sem conexão"}`,
      }));
    }
  }, []);

  // Busca imediata ao abrir o app + intervalo de 15 minutos
  useEffect(() => {
    atualizarCotacoes();
    const id = setInterval(atualizarCotacoes, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [atualizarCotacoes]);

  // --- Integração brapi.dev v2 — proventos (dividendos, JCP, rendimentos de FII) ---
  const cacheProventosRef = useRef(cacheProventos);
  useEffect(() => { cacheProventosRef.current = cacheProventos; }, [cacheProventos]);

  // Busca proventos de UM ativo (usado no botão por linha da tela Proventos e
  // no loop sequencial de "Buscar todos"). Mesmo padrão de
  // atualizarCotacaoUnica: uma chamada por ativo, sem tentativa de lote — o
  // endpoint de dividendos em grupo (`symbols=A,B,C`) chegou a ser tentado e
  // falhou por completo em teste real (ver CLAUDE.md), então a estratégia foi
  // simplificada para sempre buscar item a item, como já era feito para cotação.
  const atualizarProventoUnico = useCallback(async (codigo, classe) => {
    const token = brapiTokenRef.current;
    if (!token) return { ok: false, erro: "Token não configurado" };

    const endpointPath = classe === "FIIs" ? "fii/dividends" : "stocks/dividends";
    const mapearItem = classe === "FIIs" ? mapearRespostaFii : mapearRespostaAcao;

    try {
      const resp = await fetch(
        `https://brapi.dev/api/v2/${endpointPath}?symbols=${codigo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!resp.ok) return { ok: false, erro: `HTTP ${resp.status}` };
      const json = await resp.json();
      const item = json.results?.[0];
      const proventosAtivo = item ? mapearItem(codigo, item) : [];

      setCacheProventos((prev) => ({
        buscadoEm: new Date().toISOString(),
        porAtivo: { ...prev.porAtivo, [codigo]: proventosAtivo },
      }));

      return { ok: true, quantidade: proventosAtivo.length };
    } catch (e) {
      return { ok: false, erro: e.message || "Sem conexão" };
    }
  }, []);

  // Busca sequencial de todos os ativos elegíveis (Ações, ETFs e FIIs — não
  // cripto), um de cada vez, com pequeno espaçamento entre chamadas — mesma
  // estratégia de atualizarCotacoes para B3. Só dispara automaticamente
  // quando o cache está ausente/expirado (TTL de 12h) ou quando forçado.
  const atualizarProventos = useCallback(async ({ forcar = false } = {}) => {
    const cacheAtual = cacheProventosRef.current;
    if (!forcar && cacheAtual.buscadoEm) {
      const idade = Date.now() - new Date(cacheAtual.buscadoEm).getTime();
      if (idade < TTL_PROVENTOS_MS) return;
    }

    const token = brapiTokenRef.current;
    if (!token) {
      setStatusProventos((s) => ({
        ...s,
        atualizando: false,
        erro: "Token brapi.dev não configurado. Insira seu token gratuito na tela Cotações.",
      }));
      return;
    }

    const elegiveis = ativosRef.current.filter(
      (a) => REGEX_B3.test(a.codigo) && a.classe !== "Criptomoedas"
    );
    if (elegiveis.length === 0) return;

    setStatusProventos((s) => ({ ...s, atualizando: true, erro: null }));

    let atualizados = 0;
    const erros = [];
    for (const ativo of elegiveis) {
      const resultado = await atualizarProventoUnico(ativo.codigo, ativo.classe);
      if (resultado.ok) atualizados++;
      else erros.push(`${ativo.codigo}: ${resultado.erro}`);
      await new Promise((r) => setTimeout(r, 250));
    }

    setStatusProventos({
      atualizadoEm: new Date(),
      atualizando: false,
      erro: erros.length > 0
        ? `${erros.length}/${elegiveis.length} ativo(s) com erro — ex: ${erros[0]}`
        : null,
    });
  }, [atualizarProventoUnico]);

  // Busca ao abrir o app só se o cache estiver ausente/expirado (TTL de 12h) —
  // sem intervalo automático, diferente de atualizarCotacoes.
  useEffect(() => {
    atualizarProventos();
  }, [atualizarProventos]);

  // --- Derivados ---
  const total = useMemo(() => valorTotalInvestido(ativos), [ativos]);
  const resumoClasses = useMemo(() => resumoPorClasse(ativos, metasClasse), [ativos, metasClasse]);
  const metaAtivos = useMemo(() => tabelaMetaAtivos(ativos, metasClasse), [ativos, metasClasse]);
  const posicaoAtual = useMemo(() => tabelaPosicaoAtual(ativos), [ativos]);
  const rebalanceamento = useMemo(
    () => calcularRebalanceamento(ativos, metasClasse, aporte, excluidos),
    [ativos, metasClasse, aporte, excluidos]
  );
  const metasValidas = useMemo(() => metasClasseValidas(metasClasse), [metasClasse]);

  // Cruza o cache de proventos (bruto, por código) com a quantidade ATUAL de
  // cada ativo — recalcula sozinho sempre que a posição muda, sem precisar de
  // nova busca à API. Ver limitação documentada em paraProventoPosicao.
  const proventos = useMemo(() => {
    const lista = [];
    for (const ativo of ativos) {
      const brutos = cacheProventos.porAtivo[ativo.codigo];
      if (!brutos) continue;
      for (const provento of brutos) {
        if (!dentroDoEscopoHistorico(provento)) continue;
        lista.push({ ...paraProventoPosicao(provento, ativo.quantidade), classe: ativo.classe });
      }
    }
    return lista;
  }, [ativos, cacheProventos]);

  const resumoProventos = useMemo(() => montarResumo(proventos), [proventos]);

  const value = {
    ativos,
    metasClasse,
    aporte,
    excluidos,
    brapiToken,
    historico,
    classes: CLASSES,
    total,
    resumoClasses,
    metaAtivos,
    posicaoAtual,
    rebalanceamento,
    metasValidas,
    statusCotacao,
    proventos,
    resumoProventos,
    statusProventos,
    cacheProventos,
    setAporte,
    setBrapiToken,
    atualizarCotacaoUnica,
    atualizarAtivo,
    iniciarEdicaoCotacao,
    finalizarEdicaoCotacao,
    adicionarAtivo,
    removerAtivo,
    atualizarMetaClasse,
    alternarExclusao,
    resetarParaExemplo,
    atualizarCotacoes,
    atualizarProventos,
    atualizarProventoUnico,
    adicionarHistorico,
    limparHistorico,
  };

  return <CarteiraContext.Provider value={value}>{children}</CarteiraContext.Provider>;
}

export function useCarteira() {
  const ctx = useContext(CarteiraContext);
  if (!ctx) throw new Error("useCarteira deve ser usado dentro de <CarteiraProvider>");
  return ctx;
}
