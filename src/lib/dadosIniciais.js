/**
 * lib/dadosIniciais.js
 *
 * Dados de exemplo (seed) fictícios, usados apenas para demonstrar as
 * funcionalidades do app. Servem como estado inicial antes do usuário
 * editar/importar os próprios dados reais.
 */

export const CLASSES = ["Ações", "FIIs", "Renda Fixa", "ETFs Brasil", "ETFs USA", "Criptomoedas"];

export const METAS_CLASSE_INICIAIS = {
  "Ações": 30,
  "FIIs": 29,
  "Renda Fixa": 29,
  "ETFs Brasil": 0,
  "ETFs USA": 7,
  "Criptomoedas": 5,
};

// codigo, classe, nota, precoTeto, cotacao, quantidade
export const ATIVOS_INICIAIS = [
  // --- Criptomoedas ---
  { codigo: "BTC",  classe: "Criptomoedas", nota: 100.00, precoTeto: 298450.00, cotacao: 298450.00, quantidade: 0.01542000 },
  { codigo: "ETH",  classe: "Criptomoedas", nota: 12.00,  precoTeto: 8420.00,   cotacao: 8420.00,   quantidade: 0.08650000 },
  { codigo: "AAVE", classe: "Criptomoedas", nota: 4.00,   precoTeto: 398.50,    cotacao: 398.50,    quantidade: 0.42000 },
  { codigo: "SOL",  classe: "Criptomoedas", nota: 5.00,   precoTeto: 372.00,    cotacao: 372.00,    quantidade: 0.95000000 },
  { codigo: "XRP",  classe: "Criptomoedas", nota: 4.00,   precoTeto: 5.40,      cotacao: 5.40,      quantidade: 54.00000000 },

  // --- ETFs USA ---
  { codigo: "IVVB11", classe: "ETFs USA", nota: 100.00, precoTeto: 410.00, cotacao: 410.00, quantidade: 17 },

  // --- ETFs Brasil ---
  { codigo: "BSLV39", classe: "ETFs Brasil", nota: 0.00, precoTeto: 88.00, cotacao: 88.00, quantidade: 0 },
  { codigo: "GOLD11", classe: "ETFs Brasil", nota: 0.00, precoTeto: 19.50, cotacao: 19.50, quantidade: 0 },

  // --- FIIs ---
  { codigo: "KNRI11", classe: "FIIs", nota: 94.50, precoTeto: 148.00, cotacao: 148.00, quantidade: 19 },
  { codigo: "HGRE11", classe: "FIIs", nota: 94.50, precoTeto: 119.50, cotacao: 119.50, quantidade: 24 },
  { codigo: "XPML11", classe: "FIIs", nota: 94.50, precoTeto: 98.00,  cotacao: 98.00,  quantidade: 21 },
  { codigo: "XPLG11", classe: "FIIs", nota: 94.50, precoTeto: 87.00,  cotacao: 87.00,  quantidade: 22 },
  { codigo: "HSML11", classe: "FIIs", nota: 94.50, precoTeto: 81.00,  cotacao: 81.00,  quantidade: 25 },
  { codigo: "PLAG11", classe: "FIIs", nota: 94.50, precoTeto: 58.00,  cotacao: 58.00,  quantidade: 52 },
  { codigo: "BRCR11", classe: "FIIs", nota: 94.50, precoTeto: 39.50,  cotacao: 39.50,  quantidade: 64 },
  { codigo: "MXRF11", classe: "FIIs", nota: 94.50, precoTeto: 9.40,   cotacao: 9.40,   quantidade: 210 },
  { codigo: "BTCI11", classe: "FIIs", nota: 94.50, precoTeto: 8.90,   cotacao: 8.90,   quantidade: 225 },
  { codigo: "BTHF11", classe: "FIIs", nota: 100.00, precoTeto: 8.70,  cotacao: 8.70,   quantidade: 230 },
  { codigo: "RBVA11", classe: "FIIs", nota: 94.50, precoTeto: 8.60,   cotacao: 8.60,   quantidade: 180 },
  { codigo: "SNEL11", classe: "FIIs", nota: 94.50, precoTeto: 8.00,   cotacao: 8.00,   quantidade: 165 },
  { codigo: "RBRX11", classe: "FIIs", nota: 94.50, precoTeto: 7.80,   cotacao: 7.80,   quantidade: 235 },
  { codigo: "HFOF11", classe: "FIIs", nota: 94.50, precoTeto: 6.00,   cotacao: 6.00,   quantidade: 350 },

  // --- Ações ---
  { codigo: "CSMG3", classe: "Ações", nota: 100.00, precoTeto: 58.00, cotacao: 58.00, quantidade: 95 },
  { codigo: "ITUB3", classe: "Ações", nota: 100.00, precoTeto: 42.00, cotacao: 42.00, quantidade: 0 },
  { codigo: "TAEE11", classe: "Ações", nota: 100.00, precoTeto: 38.50, cotacao: 38.50, quantidade: 88 },
  { codigo: "BBSE3", classe: "Ações", nota: 100.00, precoTeto: 36.00, cotacao: 36.00, quantidade: 120 },
  { codigo: "PETR4", classe: "Ações", nota: 20.12,  precoTeto: 35.50, cotacao: 35.50, quantidade: 0 },
  { codigo: "ISAE4", classe: "Ações", nota: 100.00, precoTeto: 25.50, cotacao: 25.50, quantidade: 130 },
  { codigo: "BBAS3", classe: "Ações", nota: 100.00, precoTeto: 18.50, cotacao: 18.50, quantidade: 210 },
  { codigo: "ITSA4", classe: "Ações", nota: 0.00,   precoTeto: 12.80, cotacao: 12.80, quantidade: 0 },
  { codigo: "CMIG4", classe: "Ações", nota: 100.00, precoTeto: 10.20, cotacao: 10.20, quantidade: 310 },
  { codigo: "SAPR4", classe: "Ações", nota: 90.09,  precoTeto: 6.80,  cotacao: 6.80,  quantidade: 420 },
  { codigo: "SOJA3", classe: "Ações", nota: 90.09,  precoTeto: 5.90,  cotacao: 5.90,  quantidade: 350 },

  // --- Renda Fixa ---
  { codigo: "FGTS",                          classe: "Renda Fixa", nota: 0.09,   precoTeto: 18000.00, cotacao: 18000.00, quantidade: 0 },
  { codigo: "CDB BANCO A 118% CDI",          classe: "Renda Fixa", nota: 9.98,   precoTeto: 7200.00,  cotacao: 7200.00,  quantidade: 1 },
  { codigo: "CAIXINHA BANCO A",              classe: "Renda Fixa", nota: 9.98,   precoTeto: 6100.00,  cotacao: 6100.00,  quantidade: 1 },
  { codigo: "TESOURO IPCA+ 2029",            classe: "Renda Fixa", nota: 9.98,   precoTeto: 4900.00,  cotacao: 4900.00,  quantidade: 1 },
  { codigo: "CDB BANCO B GIRO DIÁRIO",       classe: "Renda Fixa", nota: 9.98,   precoTeto: 3400.00,  cotacao: 3400.00,  quantidade: 1 },
  { codigo: "TESOURO IPCA+ 2032",            classe: "Renda Fixa", nota: 100.00, precoTeto: 2950.00,  cotacao: 2950.00,  quantidade: 1 },
  { codigo: "TESOURO IPCA+ 2040",            classe: "Renda Fixa", nota: 9.98,   precoTeto: 2300.00,  cotacao: 2300.00,  quantidade: 1 },
  { codigo: "TESOURO IPCA+ 2035",            classe: "Renda Fixa", nota: 9.98,   precoTeto: 1350.00,  cotacao: 1350.00,  quantidade: 1 },
  { codigo: "CDB BANCO A LIQUIDEZ DIÁRIA",   classe: "Renda Fixa", nota: 9.98,   precoTeto: 1250.00,  cotacao: 1250.00,  quantidade: 1 },
  { codigo: "TESOURO IPCA+ 2026",            classe: "Renda Fixa", nota: 7.97,   precoTeto: 1200.00,  cotacao: 1200.00,  quantidade: 1 },
  { codigo: "TESOURO IPCA+ 2031",            classe: "Renda Fixa", nota: 9.98,   precoTeto: 1150.00,  cotacao: 1150.00,  quantidade: 1 },
  { codigo: "CDB BANCO C 119% CDI 2027",     classe: "Renda Fixa", nota: 7.51,   precoTeto: 890.00,   cotacao: 890.00,   quantidade: 1 },
  { codigo: "CDB BANCO D 121% CDI 2028",     classe: "Renda Fixa", nota: 7.51,   precoTeto: 860.00,   cotacao: 860.00,   quantidade: 1 },
  { codigo: "PREVIDÊNCIA PRIVADA",           classe: "Renda Fixa", nota: 7.51,   precoTeto: 780.00,   cotacao: 780.00,   quantidade: 1 },
  { codigo: "TESOURO PREFIXADO 2026",        classe: "Renda Fixa", nota: 6.96,   precoTeto: 690.00,   cotacao: 690.00,   quantidade: 1 },
  { codigo: "TESOURO PREFIXADO 2031",        classe: "Renda Fixa", nota: 9.98,   precoTeto: 610.00,   cotacao: 610.00,   quantidade: 1 },
  { codigo: "TESOURO IPCA+ 2045",            classe: "Renda Fixa", nota: 9.98,   precoTeto: 590.00,   cotacao: 590.00,   quantidade: 1 },
  { codigo: "TESOURO PREFIXADO 2029",        classe: "Renda Fixa", nota: 6.96,   precoTeto: 410.00,   cotacao: 410.00,   quantidade: 1 },
  { codigo: "CDB BANCO E 115% CDI 2025",     classe: "Renda Fixa", nota: 6.96,   precoTeto: 1.00,     cotacao: 1.00,     quantidade: 0 },
  { codigo: "CDB BANCO E 115% CDI 2026",     classe: "Renda Fixa", nota: 6.96,   precoTeto: 1.00,     cotacao: 1.00,     quantidade: 0 },
  { codigo: "CDB BANCO F 114% CDI 2026",     classe: "Renda Fixa", nota: 6.96,   precoTeto: 1.00,     cotacao: 1.00,     quantidade: 0 },
  { codigo: "TESOURO SELIC 2025",            classe: "Renda Fixa", nota: 0.00,   precoTeto: 1.00,     cotacao: 1.00,     quantidade: 0 },
];
