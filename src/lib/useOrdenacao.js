import { useState, useCallback } from "react";

export function useOrdenacao(padraoColuna = null, padraoDir = "desc") {
  const [ordenacao, setOrdenacao] = useState({ campo: padraoColuna, direcao: padraoDir });

  const alternarOrdem = useCallback((campo) => {
    setOrdenacao((prev) => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === "desc" ? "asc" : "desc",
    }));
  }, []);

  return { ordenacao, alternarOrdem };
}

export function aplicarOrdenacao(lista, { campo, direcao }) {
  if (!campo) return lista;
  return [...lista].sort((a, b) => {
    const va = a[campo];
    const vb = b[campo];
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp = typeof va === "string" ? va.localeCompare(vb, "pt-BR") : va - vb;
    return direcao === "asc" ? cmp : -cmp;
  });
}
