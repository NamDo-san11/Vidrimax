export function calcularDescuento(subtotal, tipo, valor) {
  const monto = Number(valor);
  if (!Number.isFinite(monto) || monto <= 0) return 0;
  if (tipo === "porcentaje") return subtotal * Math.min(monto, 100) / 100;
  return Math.min(monto, subtotal);
}

export function obtenerDescuento(tipo, valor, monto) {
  return monto > 0 ? { tipo, valor: Number(valor), monto } : null;
}

export function descuentoEsInvalido(subtotal, tipo, valor) {
  if (valor === "") return false;
  const numero = Number(valor);
  const maximo = tipo === "porcentaje" ? 100 : subtotal;
  return !Number.isFinite(numero) || numero < 0 || numero > maximo;
}
