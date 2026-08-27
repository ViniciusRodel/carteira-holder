import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Cotacoes from "./pages/Cotacoes";
import MetaClasses from "./pages/MetaClasses";
import MetaAtivos from "./pages/MetaAtivos";
import PosicaoAtual from "./pages/PosicaoAtual";
import Rebalanceamento from "./pages/Rebalanceamento";
import Proventos from "./pages/Proventos";
import Historico from "./pages/Historico";
import { CarteiraProvider } from "./lib/CarteiraContext";

/**
 * HashRouter (em vez de BrowserRouter) é a escolha certa aqui: o app roda
 * tanto dentro de uma janela Tauri (protocolo tauri://) quanto, no futuro,
 * num navegador comum — HashRouter funciona em ambos sem configuração de
 * servidor adicional. Ao migrar para web com backend próprio, pode-se
 * trocar para BrowserRouter sem alterar nenhuma página.
 */
export default function App() {
  return (
    <CarteiraProvider>
      <HashRouter>
        <div className="app-shell">
          <Sidebar />
          <main className="content-area">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cotacoes" element={<Cotacoes />} />
              <Route path="/meta-classes" element={<MetaClasses />} />
              <Route path="/meta-ativos" element={<MetaAtivos />} />
              <Route path="/posicao-atual" element={<PosicaoAtual />} />
              <Route path="/rebalanceamento" element={<Rebalanceamento />} />
              <Route path="/proventos" element={<Proventos />} />
              <Route path="/historico" element={<Historico />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </CarteiraProvider>
  );
}
