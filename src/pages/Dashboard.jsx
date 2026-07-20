import React, { useState } from "react";
import { useCarteira } from "../lib/CarteiraContext";
import CardClasse from "../components/CardClasse";
import GraficoPizza from "../components/GraficoPizza";
import GraficoBarras from "../components/GraficoBarras";
import { formatarMoeda } from "../lib/formato";

export default function Dashboard() {
  const { resumoClasses, total, resetarParaExemplo } = useCarteira();
  const [confirmando, setConfirmando] = useState(false);

  function handleRedefinir() {
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    resetarParaExemplo();
    setConfirmando(false);
  }

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumo por classe de ativo, com posição atual frente à meta.</p>
      </header>

      <div className="kpi-linha">
        <div>
          <div className="kpi-bloco-label">Valor total investido</div>
          <div className="kpi-bloco-valor num">{formatarMoeda(total)}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {confirmando && (
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Isso vai substituir todos os dados pelos do PDF. Confirma?
            </span>
          )}
          <button
            className={`botao ${confirmando ? "botao-perigo-solid" : "botao-secundario"}`}
            onClick={handleRedefinir}
            onBlur={() => setTimeout(() => setConfirmando(false), 200)}
          >
            {confirmando ? "⚠ Confirmar redefinição" : "↺ Redefinir dados (PDF)"}
          </button>
        </div>
      </div>

      <div className="cards-grid">
        {resumoClasses.map((r) => (
          <CardClasse key={r.classe} {...r} />
        ))}
      </div>

      <div className="graficos-grid">
        <GraficoPizza dados={resumoClasses} chave="pctAtual" titulo="Classe de ativos — Atual" />
        <GraficoPizza dados={resumoClasses} chave="pctMeta" titulo="Classe de ativos — Meta" />
        <GraficoBarras dados={resumoClasses} titulo="Atual vs. Meta por classe" />
      </div>
    </div>
  );
}
