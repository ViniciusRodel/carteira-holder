import React, { useState, useMemo } from "react";
import { useCarteira } from "../lib/CarteiraContext";
import { useOrdenacao, aplicarOrdenacao } from "../lib/useOrdenacao";
import ClassePill from "../components/ClassePill";
import ThOrdenavel from "../components/ThOrdenavel";
import CampoEdicaoInline from "../components/CampoEdicaoInline";
import { formatarMoeda, formatarPercentual } from "../lib/formato";

export default function MetaAtivos() {
  const { classes, metaAtivos, atualizarAtivo, removerAtivo, adicionarAtivo } = useCarteira();
  const [classeAtiva, setClasseAtiva] = useState("Todos");
  const [novo, setNovo] = useState({ codigo: "", nota: "", precoTeto: "", classe: classes[0] });
  const { ordenacao, alternarOrdem } = useOrdenacao(null, "desc");

  const abas = ["Todos", ...classes];

  const filtrados = useMemo(() => {
    const base = classeAtiva === "Todos" ? metaAtivos : metaAtivos.filter((a) => a.classe === classeAtiva);
    return aplicarOrdenacao(base, ordenacao);
  }, [metaAtivos, classeAtiva, ordenacao]);

  const th = (campo, label, className = "") => (
    <ThOrdenavel campo={campo} ordenacao={ordenacao} onOrdenar={alternarOrdem} className={className}>
      {label}
    </ThOrdenavel>
  );

  const totalCarteira = filtrados.reduce((acc, a) => acc + a.pctCarteira, 0);

  function handleAdicionar(e) {
    e.preventDefault();
    if (!novo.codigo.trim()) return;
    adicionarAtivo({
      codigo: novo.codigo.trim().toUpperCase(),
      classe: novo.classe,
      nota: parseFloat(novo.nota) || 0,
      precoTeto: parseFloat(novo.precoTeto) || 0,
      cotacao: parseFloat(novo.precoTeto) || 0,
      quantidade: 0,
    });
    setNovo({ codigo: "", nota: "", precoTeto: "", classe: novo.classe });
  }

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Carteira Meta — Ativos</h1>
        <p className="page-subtitle">
          Cadastre cada ativo com sua Nota (peso dentro da classe) e Preço Teto. % Classe e % Carteira são calculados
          automaticamente.
        </p>
      </header>

      <div className="abas-linha">
        {abas.map((c) => (
          <button
            key={c}
            className={`aba-botao${classeAtiva === c ? " aba-botao--ativa" : ""}`}
            onClick={() => setClasseAtiva(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <form className="painel form-novo-ativo" onSubmit={handleAdicionar}>
        <div className="campo-form">
          <label>Código</label>
          <input
            className="input-base"
            value={novo.codigo}
            onChange={(e) => setNovo({ ...novo, codigo: e.target.value })}
            placeholder="Ex: WEGE3"
          />
        </div>
        <div className="campo-form">
          <label>Classe</label>
          <select
            className="input-base"
            value={novo.classe}
            onChange={(e) => setNovo({ ...novo, classe: e.target.value })}
          >
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="campo-form">
          <label>Nota</label>
          <input
            className="input-base"
            type="number"
            value={novo.nota}
            onChange={(e) => setNovo({ ...novo, nota: e.target.value })}
            placeholder="0"
          />
        </div>
        <div className="campo-form">
          <label>Preço teto (R$)</label>
          <input
            className="input-base"
            type="number"
            step="0.01"
            value={novo.precoTeto}
            onChange={(e) => setNovo({ ...novo, precoTeto: e.target.value })}
            placeholder="0,00"
          />
        </div>
        <button type="submit" className="botao botao-primario">
          Adicionar
        </button>
      </form>

      <div className="painel">
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                {th("codigo", "Código")}
                {th("classe", "Classe")}
                {th("nota", "Nota", "alinhar-direita")}
                {th("precoTeto", "Preço teto (R$)", "alinhar-direita")}
                {th("pctClasse", "% da classe", "alinhar-direita")}
                {th("pctMetaClasse", "% meta classe", "alinhar-direita")}
                {th("pctCarteira", "% da carteira", "alinhar-direita")}
                <th className="alinhar-centro">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((a) => (
                <tr key={a.codigo}>
                  <td className="codigo-ativo">{a.codigo}</td>
                  <td>
                    <ClassePill classe={a.classe} />
                  </td>
                  <td className="alinhar-direita">
                    <CampoEdicaoInline
                      valor={a.nota}
                      formato="numero"
                      min={0}
                      step={1}
                      ariaLabel={`Nota de ${a.codigo}`}
                      onCommit={(novoValor) => atualizarAtivo(a.codigo, { nota: novoValor })}
                    />
                  </td>
                  <td className="alinhar-direita">
                    <CampoEdicaoInline
                      valor={a.precoTeto}
                      formato="moeda"
                      ariaLabel={`Preço teto de ${a.codigo} em reais`}
                      onCommit={(novoValor) => atualizarAtivo(a.codigo, { precoTeto: novoValor })}
                    />
                  </td>
                  <td className="alinhar-direita num">{formatarPercentual(a.pctClasse)}</td>
                  <td className="alinhar-direita num">{formatarPercentual(a.pctMetaClasse)}</td>
                  <td className="alinhar-direita num">{formatarPercentual(a.pctCarteira)}</td>
                  <td className="alinhar-centro">
                    <button
                      className="botao botao-icone botao-perigo"
                      onClick={() => removerAtivo(a.codigo)}
                      aria-label={`Remover ${a.codigo}`}
                      title="Remover"
                    >
                      <IconeLixeira />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6}>TOTAL ({classeAtiva})</td>
                <td className="alinhar-direita num">{formatarPercentual(totalCarteira)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function IconeLixeira() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 5h10M6.5 5V3.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1V5M6.5 7.5v4M9.5 7.5v4M4 5l.6 7.5a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9L12 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
