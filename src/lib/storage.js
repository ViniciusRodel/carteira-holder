/**
 * lib/storage.js
 *
 * Camada de persistência. Hoje usa localStorage (funciona tanto na versão
 * desktop/Tauri quanto numa versão web futura). Centralizar aqui significa
 * que, ao migrar para um backend com banco de dados, só este arquivo muda —
 * nenhum componente de tela precisa ser tocado.
 */

const KEYS = {
  ATIVOS: "carteira:ativos",
  METAS_CLASSE: "carteira:metasClasse",
  APORTE: "carteira:aporte",
  EXCLUIDOS: "carteira:excluidos",
  BRAPI_TOKEN: "carteira:brapiToken",
  HISTORICO: "carteira:historico",
  PROVENTOS: "carteira:proventos",
};

const CACHE_PROVENTOS_VAZIO = { buscadoEm: null, porAtivo: {} };

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Armazenamento indisponível (modo privado, quota excedida, etc.) — falha em silêncio.
  }
}

export const storage = {
  carregarAtivos(fallback) {
    return safeGet(KEYS.ATIVOS, fallback);
  },
  salvarAtivos(ativos) {
    safeSet(KEYS.ATIVOS, ativos);
  },
  carregarMetasClasse(fallback) {
    return safeGet(KEYS.METAS_CLASSE, fallback);
  },
  salvarMetasClasse(metas) {
    safeSet(KEYS.METAS_CLASSE, metas);
  },
  carregarAporte(fallback) {
    return safeGet(KEYS.APORTE, fallback);
  },
  salvarAporte(valor) {
    safeSet(KEYS.APORTE, valor);
  },
  carregarExcluidos(fallback) {
    return safeGet(KEYS.EXCLUIDOS, fallback);
  },
  salvarExcluidos(lista) {
    safeSet(KEYS.EXCLUIDOS, lista);
  },
  carregarBrapiToken() {
    return safeGet(KEYS.BRAPI_TOKEN, "");
  },
  salvarBrapiToken(token) {
    safeSet(KEYS.BRAPI_TOKEN, token);
  },
  carregarHistorico() {
    return safeGet(KEYS.HISTORICO, []);
  },
  salvarHistorico(historico) {
    safeSet(KEYS.HISTORICO, historico);
  },
  carregarProventos() {
    return safeGet(KEYS.PROVENTOS, CACHE_PROVENTOS_VAZIO);
  },
  salvarProventos(cache) {
    safeSet(KEYS.PROVENTOS, cache);
  },
  limparTudo() {
    Object.values(KEYS).forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* noop */
      }
    });
  },
};
