/**
 * lib/coresClasse.js
 * Mapeamento centralizado de classe de ativo -> variável CSS de cor.
 * Qualquer componente que precise colorir por classe usa esta função,
 * garantindo que a cor de "Ações" seja sempre a mesma em toda a aplicação.
 */

export const CORES_CLASSE = {
  "Ações": "var(--classe-acoes)",
  "FIIs": "var(--classe-fiis)",
  "Renda Fixa": "var(--classe-renda-fixa)",
  "ETFs Brasil": "var(--classe-etfs-brasil)",
  "ETFs USA": "var(--classe-etfs-usa)",
  "Criptomoedas": "var(--classe-cripto)",
};

export function corDaClasse(classe) {
  return CORES_CLASSE[classe] || "var(--text-secondary)";
}
