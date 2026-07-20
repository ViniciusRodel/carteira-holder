import React from "react";
import BarraProgresso from "./BarraProgresso";
import { corDaClasse } from "../lib/coresClasse";
import { formatarMoeda, formatarPercentual } from "../lib/formato";

export default function CardClasse({ classe, valorAtual, pctAtual, pctMeta, atingimento }) {
  const cor = corDaClasse(classe);

  return (
    <div className="card-classe" style={{ "--card-cor": cor }}>
      <div className="card-classe-header">
        <span className="card-classe-nome">{classe}</span>
        <span className="card-classe-atingimento num">{formatarPercentual(atingimento, 2)}</span>
      </div>
      <div className="card-classe-valor num">{formatarMoeda(valorAtual)}</div>
      <div className="card-classe-legendas">
        <span>
          Atual <b className="num">{formatarPercentual(pctAtual)}</b>
        </span>
        <span>
          Meta <b className="num">{formatarPercentual(pctMeta)}</b>
        </span>
      </div>
      <BarraProgresso valor={atingimento} cor={cor} />
    </div>
  );
}
