import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../../database/firebaseconfig";

export function pagoDocId(empleadoId, periodo) {
  return `${empleadoId}_${periodo}`;
}

export async function marcarComoPagado({ empleadoId, periodo, monto }) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No hay sesión activa.");

  const ref = doc(db, "pagos", pagoDocId(empleadoId, periodo));

  await setDoc(ref, {
    empleadoId,
    periodo,
    monto: Number(monto),
    estado: "pagado",
    fechaPago: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: uid,
  });
}

export async function borrarPago({ empleadoId, periodo }) {
  const ref = doc(db, "pagos", pagoDocId(empleadoId, periodo));
  await deleteDoc(ref);
}

export function escucharPagosPorPeriodo(periodo, callback) {
  const q = query(collection(db, "pagos"), where("periodo", "==", periodo));

  return onSnapshot(q, (snap) => {
    const pagos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(pagos);
  });
}

export function escucharEmpleados(callback) {
  return onSnapshot(collection(db, "empleados"), (snap) => {
    const empleados = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(empleados);
  });
}

export async function existePago(empleadoId, periodo) {
  const q = query(
    collection(db, "pagos"),
    where("empleadoId", "==", empleadoId),
    where("periodo", "==", periodo)
  );

  const snap = await getDocs(q);
  return !snap.empty;
}
