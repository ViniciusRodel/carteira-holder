import React from "react";
import { NavLink } from "react-router-dom";

const ITENS = [
  { to: "/", label: "Dashboard", icone: IconeDashboard },
  { to: "/cotacoes", label: "Cotações", icone: IconeCotacoes },
  { to: "/meta-classes", label: "Meta — Classes", icone: IconeMetaClasses },
  { to: "/meta-ativos", label: "Meta — Ativos", icone: IconeMetaAtivos },
  { to: "/posicao-atual", label: "Posição Atual", icone: IconePosicao },
  { to: "/rebalanceamento", label: "Rebalanceamento", icone: IconeRebalanceamento },
  { to: "/proventos", label: "Proventos", icone: IconeProventos },
  { to: "/historico", label: "Histórico", icone: IconeHistorico },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">CH</div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-title">Carteira</span>
          <span className="sidebar-brand-subtitle">Holder</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {ITENS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `sidebar-link${isActive ? " sidebar-link--active" : ""}`}
          >
            <item.icone />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-dot" />
        Dados salvos neste dispositivo
      </div>
    </aside>
  );
}

/* Ícones inline (sem dependência externa, traço único de 1.6px, 18x18) */
function IconeDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="6" height="7" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="2" width="6" height="4" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="8" width="6" height="8" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="11" width="6" height="5" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function IconeCotacoes() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2.5 13.5L7 9l3 3 5.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 6h3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconeMetaClasses() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 2.5A6.5 6.5 0 0 1 15.5 9H9V2.5z" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
function IconeMetaAtivos() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 1.5l1.9 4 4.4.6-3.2 3.1.8 4.3L9 11.4l-3.9 2.1.8-4.3-3.2-3.1 4.4-.6L9 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
function IconePosicao() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 7h14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 10.5h3M5.5 12.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function IconeRebalanceamento() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 6h7.5M4 6L6.2 3.8M4 6l2.2 2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 12H6.5M14 12l-2.2 2.2M14 12l-2.2-2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconeProventos() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 5v2.2M9 10.8V13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11 7.3c0-.9-.9-1.6-2-1.6s-2 .6-2 1.5c0 .9.9 1.2 2 1.4 1.1.2 2 .6 2 1.5S10.1 11.6 9 11.6s-2-.7-2-1.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconeHistorico() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 5.5V9l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
