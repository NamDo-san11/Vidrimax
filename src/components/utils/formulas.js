// utils/formulas.js
export function evaluarFormula(formula, contexto) {
  // Permitir solo caracteres básicos de expresiones matemáticas y variables
  // Variables permitidas: ancho, alto, x, y, z
  const permitido = /^[0-9+\-*/().\sancholtxyz]+$/i;
  if (!permitido.test(formula)) {
    throw new Error("Fórmula contiene caracteres no permitidos");
  }

  // Evitar palabras peligrosas (defensa extra)
  const bloqueadas = ["window", "document", "global", "this", "Function", "eval"];
  for (const w of bloqueadas) {
    if (formula.includes(w)) throw new Error("Fórmula no permitida");
  }

  const fn = new Function(
    "ancho",
    "alto",
    "x",
    "y",
    "z",
    `"use strict"; return (${formula});`
  );

  const res = fn(
    Number(contexto.ancho),
    Number(contexto.alto),
    Number(contexto.x),
    Number(contexto.y),
    Number(contexto.z)
  );

  if (Number.isNaN(res) || !Number.isFinite(res)) {
    throw new Error("Resultado inválido");
  }
  return res;
}
