import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../database/firebaseconfig";

export const TASA_USD_PREDETERMINADA = 36.78;

const tasaRef = doc(db, "configuracion", "tasaUSD");

export async function obtenerTasaUSD() {
  const snapshot = await getDoc(tasaRef);
  const tasa = Number(snapshot.data()?.valor);
  return Number.isFinite(tasa) && tasa > 0 ? tasa : TASA_USD_PREDETERMINADA;
}

export async function guardarTasaUSD(valor) {
  const tasa = Number(valor);
  if (!Number.isFinite(tasa) || tasa <= 0) {
    throw new Error("Ingresa una tasa USD válida.");
  }

  await setDoc(tasaRef, {
    valor: tasa,
    actualizadoEn: serverTimestamp(),
  }, { merge: true });
}