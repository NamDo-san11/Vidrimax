import { collection, getDocs, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../database/firebaseconfig";

export async function obtenerInventarioActivo() {
const snap = await getDocs(collection(db, "inventario"));


return snap.docs
.map(d => ({ id: d.id, ...d.data() }))
.filter(p => p.activo)
.map(p => ({
...p,
existencia: p.stock_total - p.vendidos
}));
}


export async function registrarVenta(items) {
if (items.length === 0) throw new Error("Venta vacía");


let total = items.reduce((acc, i) => acc + i.subtotal, 0);


// Guardar venta
await addDoc(collection(db, "ventas"), {
fecha: serverTimestamp(),
total,
items
});


// Descontar inventario
for (const item of items) {
const ref = doc(db, "inventario", item.productoId);
await updateDoc(ref, {
vendidos: item.vendidosActualizados
});
}
}