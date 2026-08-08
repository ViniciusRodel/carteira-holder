import { useState } from "react";

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, tipo = "compra") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };
  return { toasts, add };
}
