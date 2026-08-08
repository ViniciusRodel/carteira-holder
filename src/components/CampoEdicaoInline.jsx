import React, { useEffect, useRef, useState } from "react";
import { formatarMoeda, formatarNumero } from "../lib/formato";

/**
 * Célula de edição inline para valores numéricos em tabela (estilo planilha).
 * Clique único foca e seleciona o valor inteiro; Enter confirma, Esc cancela,
 * blur confirma. Scroll do mouse nunca altera o valor. Estados visuais:
 * normal → hover → editando/alterado → salvando → sucesso/erro.
 */
export default function CampoEdicaoInline({
  valor,
  onCommit,
  ariaLabel,
  formato = "moeda",
  min = 0.01,
  step = 0.01,
  onEditingChange,
  mensagemErro = "Valor inválido — mantido o anterior",
}) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState(null); // { tipo: "sucesso" | "erro", msg? }

  const canceladoRef = useRef(false);
  const feedbackTimerRef = useRef(null);
  const salvarTimerRef = useRef(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(feedbackTimerRef.current);
      clearTimeout(salvarTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (editando && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editando]);

  function agendarLimpezaFeedback(ms) {
    clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), ms);
  }

  function confirmar() {
    setEditando(false);
    const parsed = parseFloat(rascunho);
    const invalido = !Number.isFinite(parsed) || parsed < min;

    if (invalido) {
      setFeedback({ tipo: "erro", msg: mensagemErro });
      agendarLimpezaFeedback(1800);
      return;
    }
    if (parsed === valor) return;

    setSalvando(true);
    salvarTimerRef.current = setTimeout(() => {
      setSalvando(false);
      onCommit(parsed);
      setFeedback({ tipo: "sucesso" });
      agendarLimpezaFeedback(1200);
    }, 120);
  }

  function handleFocus() {
    setFeedback(null);
    setRascunho(Number.isFinite(valor) ? String(valor) : "");
    setEditando(true);
    onEditingChange?.(true);
  }

  function handleBlur() {
    onEditingChange?.(false);
    if (canceladoRef.current) {
      canceladoRef.current = false;
      setEditando(false);
      return;
    }
    confirmar();
  }

  function handleChange(e) {
    setFeedback(null);
    setRascunho(e.target.value);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      canceladoRef.current = true;
      e.currentTarget.blur();
    }
  }

  function handleWheel(e) {
    e.currentTarget.blur();
  }

  const sujo = editando && rascunho !== "" && parseFloat(rascunho) !== valor;

  let estado = "normal";
  if (salvando) estado = "salvando";
  else if (feedback?.tipo === "sucesso") estado = "sucesso";
  else if (feedback?.tipo === "erro") estado = "erro";
  else if (editando && sujo) estado = "alterado";
  else if (editando) estado = "editando";

  const exibicao = formato === "moeda" ? formatarMoeda(valor) : formatarNumero(valor);

  return (
    <span className="campo-edicao-inline" data-estado={estado}>
      {editando ? (
        <input
          ref={editInputRef}
          type="number"
          step={step}
          className="campo-edicao-inline-input num"
          value={rascunho}
          aria-label={ariaLabel}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onWheel={handleWheel}
        />
      ) : (
        <input
          type="text"
          readOnly
          className="campo-edicao-inline-input campo-edicao-inline-input--exibicao num"
          value={exibicao}
          aria-label={ariaLabel}
          onFocus={handleFocus}
          onWheel={handleWheel}
        />
      )}

      <span className="campo-edicao-inline-lapis" aria-hidden="true">✎</span>
      {estado === "alterado" && <span className="campo-edicao-inline-dot" aria-hidden="true" />}
      {estado === "salvando" && <span className="campo-edicao-inline-spinner" aria-hidden="true" />}
      {estado === "sucesso" && <span className="campo-edicao-inline-check" aria-hidden="true">✓</span>}
      {estado === "erro" && (
        <span className="campo-edicao-inline-warn" role="alert">{feedback.msg}</span>
      )}
    </span>
  );
}
